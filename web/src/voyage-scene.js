/* Independent scale-space renderer. All layers share one floating origin and
   one logarithmic metre/unit scale; no camera teleport or black transition. */
export function createVoyage({THREE,C,scene,groups,earth,atmosphere,moon,moonOrbit,solarSun,solarPlanets,solarOrbits,companion,m87,addLabel,rng}){
 const s=C.smooth,universe=groups[6],neighborhood=groups[3];
 const galaxyRadius=15*C.KPC_M,solarOffset=8.2*C.KPC_M;
 // Curved regional ground fills the otherwise empty street-to-globe scale gap.
 const region=new THREE.PlaneGeometry(600000,600000,96,96),p=region.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getY(i),h=Math.sqrt(C.EARTH_M**2-x*x-z*z)-C.EARTH_M-.5;
  p.setXYZ(i,x,h,z);
  const field=Math.sin(x*.00015)*Math.sin(z*.00011),ridge=Math.sin(x*.000025+Math.sin(z*.00003));
  const c=new THREE.Color(ridge>.25?0x7e976e:field>.2?0x9baa7a:0x879b77);c.multiplyScalar(.94+rng()*.08);colors.push(c.r,c.g,c.b);
 }
 region.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));region.computeVertexNormals();
 const terrain=new THREE.Mesh(region,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));groups[0].add(terrain);
 // Quiet regional road grid, not geographic or survey data.
 for(let n=-5;n<=5;n++){
  const pts=[];for(let j=-36;j<=36;j++){const x=n*12500,z=j*4000;pts.push(new THREE.Vector3(x,Math.sqrt(C.EARTH_M**2-x*x-z*z)-C.EARTH_M+.2,z));}
  const road=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xb7baa0,transparent:true,opacity:.35}));groups[0].add(road);
 }
 function cloud(parent,count,radius,web=false){
  const pos=[],color=[],nodes=Array.from({length:70},()=>new THREE.Vector3((rng()-.5)*radius*1.3,(rng()-.5)*radius*.85,(rng()-.5)*radius*1.3));
  for(let i=0;i<count;i++){
   let v;
   if(web){const a=nodes[i%nodes.length],near=nodes.filter(n=>n!==a).sort((b,c)=>a.distanceToSquared(b)-a.distanceToSquared(c)),b=near[i%3],t=rng();v=a.clone().lerp(b,t);v.y+=Math.sin(t*Math.PI)*radius*.045*Math.sin(i%70);const scatter=radius*.035*(rng()+.2);v.add(new THREE.Vector3((rng()-.5)*scatter,(rng()-.5)*scatter,(rng()-.5)*scatter));}
   else{const r=radius*Math.cbrt(rng()),a=rng()*Math.PI*2,y=rng()*2-1;v=new THREE.Vector3(Math.sqrt(1-y*y)*Math.cos(a)*r,y*r,Math.sqrt(1-y*y)*Math.sin(a)*r);}
   if(v.length()<radius*.003)v.x+=radius*.02;
   pos.push(v.x,v.y,v.z);const c=new THREE.Color().lerpColors(new THREE.Color(0x8bb5e5),new THREE.Color(0xffd6ac),rng());c.multiplyScalar(.55+rng()*.65);color.push(c.r,c.g,c.b);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,uniforms:{uLayerAlpha:{value:1}},vertexShader:`varying vec3 c;void main(){c=color;vec4 v=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(42./max(1.,-v.z),1.4,5.);}`,fragmentShader:`uniform float uLayerAlpha;varying vec3 c;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(c,exp(-r*r*3.5)*uLayerAlpha);}`});
  const points=new THREE.Points(geo,material);points.frustumCulled=false;parent.add(points);return points;
 }
 // These are explicitly illustrative populations, not a star/galaxy catalogue.
 cloud(neighborhood,7500,220*C.LY_M);
 cloud(neighborhood,130,12*C.LY_M);
 const local=cloud(universe,1800,50e3*C.KPC_M),superclusters=cloud(universe,9000,1500e3*C.KPC_M,true),cosmicWeb=cloud(universe,16000,11000e3*C.KPC_M,true);
 companion.position.set(-700,-40,-250);companion.scale.setScalar(.9);
 m87.position.set(16000,1500,-4000);
 const beaconMaterial=new THREE.MeshBasicMaterial({color:0xf6d296,transparent:true,depthWrite:false});
 const sunBeacon=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),beaconMaterial);scene.add(sunBeacon);addLabel('太阳系 · 已缩成一个点',sunBeacon,3,'sun');
 const home=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshBasicMaterial({color:0x9cdaed,transparent:true,depthWrite:false}));scene.add(home);addLabel('银河系 · 我们在这里',home,5,'earth');
 // Cache base opacity once. Only LOD overlaps fade; positions never reset.
 const caches=groups.map((g,index)=>{
  if(index===5)return[];const result=[];g.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(m.userData.voyageCached)continue;m.userData.voyageCached=true;
   const base=m.opacity??1;m.transparent=true;
   if(m.isShaderMaterial&&!m.uniforms.uLayerAlpha){m.uniforms.uLayerAlpha={value:1};m.fragmentShader='uniform float uLayerAlpha;\n'+m.fragmentShader.replace(/}\s*$/,'gl_FragColor.a*=uLayerAlpha;}');}
   result.push({material:m,base});
  }});return result;
 });
 let opacityCache=[];
 function fade(index,alpha){
  groups[index].visible=alpha>.002;
  if(Math.abs((opacityCache[index]??-1)-alpha)<.0001)return;opacityCache[index]=alpha;
  for(const {material:m,base} of caches[index]){if(m.uniforms?.uLayerAlpha)m.uniforms.uLayerAlpha.value=alpha;else m.opacity=base*alpha;}
 }
 let model=C.zoomModel(0),lastScale=1;
 function update(q,days,blend=0){
  model=C.zoomModel(q);const u=model.unitMeters;
  // Gradual orbit separation keeps the inner planets legible. Both ends of each
  // Earth/Sun anchor use exactly the same warp, so there is no LOD hand-off jump.
  const orbitPosition=i=>{const v=C.physicalPlanetPosition(i,days),p=C.PLANETS[i],factor=THREE.MathUtils.lerp(1,C.displayOrbit(p.au)/C.displayOrbit(1)*12/p.au,s(1.5,1.95,q));return new THREE.Vector3(v.x*factor,0,v.z*factor);};
  const earthOrbit=orbitPosition(2),sunPhysical=earthOrbit.clone().negate();
  const shift=sunPhysical.clone().multiplyScalar(-model.solarFocus/u);shift.x+=solarOffset/u*model.galaxyFocus;shift.y=-C.EARTH_M/u*model.surfaceFocus;
  const sunPosition=sunPhysical.clone().divideScalar(u).add(shift),galaxyPosition=sunPosition.clone().add(new THREE.Vector3(-solarOffset/u,0,0));
  groups[0].scale.setScalar(1/u);groups[0].position.copy(shift).add(new THREE.Vector3(0,C.EARTH_M/u,0));
  groups[1].position.copy(shift);groups[1].scale.setScalar(1);
  const earthR=Math.max(C.EARTH_M/u,.09*model.marker);earth.scale.setScalar(earthR/2.3);atmosphere.scale.copy(earth.scale);
  const a=1.6;moon.position.set(Math.cos(a)*384400000/u,Math.sin(a)*.02*384400000/u,Math.sin(a)*384400000/u);moon.scale.setScalar(1737400/u/.627);moonOrbit.scale.setScalar(384400000/u/12);
  groups[2].position.copy(sunPosition);groups[2].scale.setScalar(1);
  solarSun.scale.setScalar(Math.max(695700000/u,.3*model.marker)/1.25);
  C.PLANETS.forEach((p,i)=>{const v=orbitPosition(i);solarPlanets[i].position.copy(v).divideScalar(u);solarPlanets[i].scale.setScalar(Math.max(p.radiusKm*1000/u,p.size*.28*model.marker)/p.size);solarPlanets[i].visible=i!==2;solarOrbits[i].scale.setScalar(v.length()/u/C.displayOrbit(p.au));});
  groups[3].position.copy(sunPosition);groups[3].scale.setScalar(1/u);
  groups[4].position.copy(galaxyPosition);groups[4].scale.setScalar(galaxyRadius/15/u);
  groups[6].position.copy(galaxyPosition);groups[6].scale.setScalar(1/u);
  // LOD layers overlap in the same frame, including the intermediate star field.
  const alphas=[model.layers.city,model.layers.earth,model.layers.solar,model.layers.stellar,model.layers.galaxy,0,model.layers.universe];
  alphas.forEach((alpha,i)=>{if(i!==5)fade(i,alpha*(1-blend));});
  local.material.uniforms.uLayerAlpha.value=model.layers.universe*(1-s(4.4,4.8,q))*(1-blend)*.65;
  superclusters.material.uniforms.uLayerAlpha.value=model.layers.universe*(1-s(4.65,5,q))*(1-blend)*.65;
  cosmicWeb.material.uniforms.uLayerAlpha.value=model.layers.universe*(1-blend)*.65;
  // Terrain's large, featureless perimeter dissolves into the same Earth sphere.
  terrain.material.opacity=(1-s(.68,.92,q))*(1-blend);terrain.visible=terrain.material.opacity>.002;
  sunBeacon.position.copy(sunPosition);sunBeacon.visible=q>2.4&&q<3.9&&blend<.95;beaconMaterial.opacity=s(2.4,2.75,q)*(1-s(3.65,3.9,q))*(1-blend);
  home.position.copy(galaxyPosition);home.visible=q>4.4&&blend<.95;home.material.opacity=s(4.4,4.8,q)*(1-blend);
  lastScale=u;return model;
 }
 function distanceLabel(){const d=model.distanceMeters;if(d<1e3)return d.toFixed(0)+' m';if(d<1e10)return(d/1000).toLocaleString('zh-CN',{maximumFractionDigits:0})+' km';if(d<.1*C.LY_M)return(d/(C.AU_KM*1000)).toFixed(d<1e12?2:0)+' AU';if(d<1e6*C.LY_M)return(d/C.LY_M).toLocaleString('zh-CN',{maximumFractionDigits:1})+' 光年';return(d/C.LY_M/1e6).toLocaleString('zh-CN',{maximumFractionDigits:0})+' 百万光年';}
 return{update,distanceLabel,snapshot:()=>({unitMeters:lastScale,logDistance:model.logDistance,layers:{...model.layers},distanceMeters:model.distanceMeters,origin:'shared-floating-origin',galaxies:26800})};
}
