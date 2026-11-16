import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { holeVertex,holeFragment } from './blackhole-shader.js';
import { createVoyage } from './voyage-scene.js';

const $=id=>document.getElementById(id),C=window.CosmosCore,KEY='fairytale-lab.cosmic-voyage.v3';
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function fail(error){console.error('Cosmos initialization failed',error);const box=$('renderStatus');box.hidden=false;box.replaceChildren();const b=document.createElement('b');b.textContent='当前环境无法绘制 3D 宇宙。';const small=document.createElement('small');small.textContent='需要 WebGL 2 / Edge WebView2；可以切换到左侧其他实验。';const btn=document.createElement('button');btn.textContent='重新载入';btn.onclick=()=>location.reload();box.append(b,small,btn);}

function init(){
 let state;try{state=C.restore(localStorage.getItem(KEY))||C.fresh();}catch{state=C.fresh();}
 let stage=-1,flight=false,elapsed=0,days=0,last=performance.now(),dirty=true,sceneLost=false,drag=null,bodyID=0,captured=0,selectedPlanet='earth',selectedBody=null;
 let storageTimer,manualCamera=false,labelClock=0,bodyClock=0,renderJourney=Math.min(5,state.journey),holeBlend=0;
 state.journey=Math.min(5,state.journey);state.mode=state.mode==='hole'?'hole':'voyage';
 const viewport=$('viewport'),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.setClearColor(0x080c19);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','从地面到星系与黑洞的三维宇宙实验');viewport.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(47,1,.02,3000),controls=new OrbitControls(camera,renderer.domElement);
 controls.enableZoom=false;controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;controls.minPolarAngle=.02;controls.maxPolarAngle=Math.PI-.02;
 controls.addEventListener('start',()=>{manualCamera=true;flight=false;syncFlight();});controls.addEventListener('change',()=>dirty=true);
 const hemi=new THREE.HemisphereLight(0xe5efff,0x404c46,1.7),sunlight=new THREE.DirectionalLight(0xfff0d3,2.4);sunlight.position.set(40,70,30);sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-65;sunlight.shadow.camera.right=65;sunlight.shadow.camera.top=65;sunlight.shadow.camera.bottom=-65;sunlight.shadow.camera.far=220;sunlight.shadow.bias=-.0008;sunlight.shadow.normalBias=.05;scene.add(hemi,sunlight);
 const pointLight=new THREE.PointLight(0xffe8bc,70,0,2);scene.add(pointLight);
 const groups=Array.from({length:7},()=>new THREE.Group());groups.forEach(g=>scene.add(g));
 const labels=[],pickables=[],bodies=[];
 const rng=(function(){let s=3428121;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};})();
 function mat(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness,metalness:0});}
 function mesh(geo,material,parent=scene,position=[0,0,0]){const m=new THREE.Mesh(geo,material);m.position.set(...position);parent.add(m);return m;}
 function box(w,h,d,color,parent,p){return mesh(new THREE.BoxGeometry(w,h,d),mat(color),parent,p);}
 function line(points,color=0x56637d,opacity=.4,parent=scene){const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(object);return object;}
 function circle(radius,parent,color=0x61708e,opacity=.25){return line(Array.from({length:161},(_,i)=>new THREE.Vector3(Math.cos(i/160*Math.PI*2)*radius,0,Math.sin(i/160*Math.PI*2)*radius)),color,opacity,parent);}
 function addLabel(text,object,chapter,cls='',action=null){const button=document.createElement('button');button.className='body-label '+cls;button.textContent=text;button.hidden=true;button.tabIndex=action?0:-1;if(action)button.addEventListener('click',action);else button.style.pointerEvents='none';$('objectLabels').append(button);labels.push({button,object,chapter,offset:new THREE.Vector3(0,(object.geometry?.parameters?.radius||.2)*1.1+.25,0)});return button;}
 const loader=new THREE.TextureLoader();
 const earthMap=loader.load('assets/cosmos/earth-nasa.jpg',()=>dirty=true,undefined,()=>toast('地球纹理未加载，将使用蓝色球体示意。'));
 const moonMap=loader.load('assets/cosmos/moon-nasa.jpg',()=>dirty=true,undefined,()=>toast('月球纹理未加载，将使用灰色球体示意。'));earthMap.colorSpace=moonMap.colorSpace=THREE.SRGBColorSpace;
 function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,248,220,1)');r.addColorStop(.2,'rgba(255,211,133,.7)');r.addColorStop(.5,'rgba(224,139,80,.15)');r.addColorStop(1,'rgba(200,120,80,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
 const glowMap=glowTexture();
 function glow(parent,size,color=0xffbb72,opacity=.6){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.set(size,size,1);parent.add(s);return s;}
 function makeSun(radius,parent){const s=mesh(new THREE.SphereGeometry(radius,48,32),new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uFade:{value:1}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform float uTime;uniform float uFade;void main(){float n=sin(vP.x*31.+sin(vP.z*23.+uTime*.2))*sin(vP.y*37.+sin(vP.x*17.));vec3 c=mix(vec3(1.,.29,.025),vec3(1.,.77,.28),.52+n*.25);c=mix(vec3(.8,.09,.025),c,uFade);gl_FragColor=vec4(c*1.1,uFade);}'}),parent);glow(s,radius*6,0xffbc78,.52);return s;}
 function planetTexture(index){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const g=canvas.getContext('2d'),p=C.PLANETS[index];g.fillStyle=p.color;g.fillRect(0,0,512,256);
  for(let y=0;y<256;y++){const k=Math.sin(y*(index>3?.12:.04))+Math.sin(y*.57)*.3,alpha=index>3?.16:.045;g.fillStyle=k>0?`rgba(255,235,215,${Math.abs(k)*alpha})`:`rgba(45,35,40,${Math.abs(k)*alpha})`;g.fillRect(0,y,512,1);}
  for(let i=0;i<500;i++){const x=rng()*512,y=rng()*256,r=rng()*6+.5;g.fillStyle=index<4?'rgba(50,43,36,.11)':'rgba(255,235,204,.035)';g.beginPath();g.ellipse(x,y,r*2,r,0,0,Math.PI*2);g.fill();}
  if(index===4){g.fillStyle='#b77658';g.beginPath();g.ellipse(360,162,35,10,.1,0,Math.PI*2);g.fill();}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const planetMaps=C.PLANETS.map((_,i)=>i===2?earthMap:planetTexture(i));
 function makePlanet(index,radius,parent){const p=C.PLANETS[index],s=mesh(new THREE.SphereGeometry(radius,40,26),new THREE.MeshStandardMaterial({map:planetMaps[index],roughness:index===2?.75:.95,metalness:0}),parent);s.userData.planet=p.id;
  if(index===5){const ringGeo=new THREE.RingGeometry(radius*1.3,radius*2.15,96),ring=mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xbfae8b,side:THREE.DoubleSide,transparent:true,opacity:.65}),s);ring.rotation.x=Math.PI*.43;const lines=new THREE.Group();s.add(lines);for(let r=radius*1.3;r<radius*2.15;r+=radius*.07){const c=circle(r,lines,0xe0cda0,.18);c.rotation.z=.22;}}
  return s;}
 function starField(parent,count,radius,seedOffset=0){const positions=new Float32Array(count*3),colors=new Float32Array(count*3);for(let i=0;i<count;i++){const z=rng()*2-1,a=rng()*Math.PI*2,rad=radius*(.8+rng()*.2),s=Math.sqrt(1-z*z);positions.set([Math.cos(a)*s*rad,z*rad,Math.sin(a)*s*rad],i*3);const v=.35+rng()*.55;colors.set([v*.88,v*.92,v],i*3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const stars=new THREE.Points(geo,new THREE.PointsMaterial({size:radius*.0014,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,sizeAttenuation:true}));parent.add(stars);return stars;}
 const backdrop=starField(scene,2400,180);
 // 0: eye-height street. All architecture is procedural, not a real address.
 const city=groups[0];mesh(new THREE.PlaneGeometry(750,750),mat(0x9ba98a),city).rotation.x=-Math.PI/2;
 const road=mesh(new THREE.PlaneGeometry(12,360),mat(0x586370),city,[0,.015,0]);road.rotation.x=-Math.PI/2;
 for(const x of [-8,8])box(3.5,.17,360,0xc4c3bc,city,[x,.08,0]);
 for(let z=-170;z<170;z+=12)box(.13,.022,4.5,0xebdfb2,city,[0,.034,z]);
 for(let i=0;i<9;i++)box(10,.018,.7,0xedece0,city,[0,.045,7+i*1.25]);
 function facadeTexture(tone){const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');g.fillStyle=tone;g.fillRect(0,0,128,256);for(let y=13;y<256;y+=31)for(let x=10;x<128;x+=29){g.fillStyle=rng()>.25?'#6f8d9f':'#b7bfc1';g.fillRect(x,y,17,21);g.fillStyle='#d7d6ce';g.fillRect(x,y+10,17,1);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const facades=['#d8b89c','#b2bec7','#c6c3b2','#bdab9f'].map(facadeTexture);
 for(let side of [-1,1])for(let n=0;n<15;n++){const h=10+rng()*28,w=8+rng()*8,d=9+rng()*6;const b=mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({map:facades[n%4],roughness:.9}),city,[side*(18+rng()*6),h/2,n*21-150]);box(w+.3,.5,d+.3,0xa9a8a3,b,[0,h/2+.1,0]);}
 for(let side of [-1,1])for(let n=0;n<15;n++){const z=n*21-145,x=side*10.5;mesh(new THREE.CylinderGeometry(.18,.24,3.4,8),mat(0x796c59),city,[x,1.7,z]);mesh(new THREE.IcosahedronGeometry(1.9,1),mat(n%2?0x708b65:0x7e966b),city,[x,4.1,z]);const pole=mesh(new THREE.CylinderGeometry(.07,.1,5.8,8),mat(0x71797d),city,[side*7.3,2.9,z+6]);box(.8,.2,.35,0xd6d0bd,pole,[side*.3,2.8,0]);}
 for(let i=0;i<10;i++){const car=new THREE.Group();city.add(car);car.position.set(i%2?-3:3,.5,i*27-105);box(1.7,.7,3.2,[0x8eabb7,0xd7c6ad,0xaf7070,0xb1b6bb][i%4],car,[0,0,0]);box(1.5,.65,1.7,0x78909e,car,[0,.6,.1]);for(const x of [-.86,.86])for(const z of [-1,1]){const wheel=mesh(new THREE.CylinderGeometry(.34,.34,.17,12),mat(0x30383e),car,[x,-.15,z]);wheel.rotation.z=Math.PI/2;}}
 // 1: Earth + Moon, independently scaled to keep both visible.
 city.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const earth=makePlanet(2,2.3,groups[1]);earth.rotation.z=.409;
 const atmosphere=mesh(new THREE.SphereGeometry(2.36,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.18,.48,.95,a*.5);}'}),groups[1]);
 const moon=mesh(new THREE.SphereGeometry(.627,40,28),new THREE.MeshStandardMaterial({map:moonMap,roughness:1}),groups[1]);const moonOrbit=circle(12,groups[1],0x63738a,.27);
 addLabel('地球 · 我们的家',earth,1,'earth');addLabel('月球',moon,1);
 // 2: eight circular, period-correct teaching orbits, compressed spatially.
 const solarSun=makeSun(1.25,groups[2]),solarPlanets=[],solarOrbits=[];
 addLabel('太阳 · 恒星',solarSun,2,'sun');
 C.PLANETS.forEach((p,i)=>{const orbit=circle(C.displayOrbit(p.au),groups[2],0x50647f,.26);solarOrbits.push(orbit);const body=makePlanet(i,p.size,groups[2]);solarPlanets.push(body);pickables.push({object:body,chapter:2,id:p.id});addLabel(p.name,i===2?earth:body,2,p.id==='earth'?'earth':'',()=>choosePlanet(p.id));});
 // 3: surrounding stars are built by the shared-scale voyage renderer.
 // 4: stylized barred spiral galaxy. Stars are not catalog coordinates.
 function makeGalaxy(parent,count=35000){const pos=new Float32Array(count*3),colors=new Float32Array(count*3);for(let i=0;i<count;i++){const core=i<count*.2,r=core?Math.pow(rng(),1.8)*3:Math.pow(rng(),.82)*15,a=i%4===0?rng()*Math.PI*2:(i%4)*Math.PI*.5+Math.log(r+.55)*1.45+(rng()-.5)*(.9/(r*.1+1)),thickness=(rng()-.5)*(.25+2.2*Math.exp(-r*.5));pos.set([Math.cos(a)*r,thickness,Math.sin(a)*r],i*3);const c=new THREE.Color().lerpColors(new THREE.Color(0xf2d3a6),new THREE.Color(0x9cbae6),Math.min(1,r/10));c.multiplyScalar(.4+rng()*.8);colors.set([c.r,c.g,c.b],i*3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 c;void main(){c=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(40./(-p.z),.7,2.6);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 c;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*3.);if(r>1.)discard;gl_FragColor=vec4(c,a*.4);}'});const stars=new THREE.Points(geo,material);parent.add(stars);glow(parent,9,0xffd49c,.3);return stars;}
 const galaxy=makeGalaxy(groups[4]),galaxySun=mesh(new THREE.SphereGeometry(.085,12,8),new THREE.MeshBasicMaterial({color:0x91cce7}),groups[4],[8.2,.1,0]);glow(galaxySun,.7,0x79beec,.6);
 const galaxyCenter=new THREE.Object3D();groups[4].add(galaxyCenter);addLabel('Sgr A* · 银河中心',galaxyCenter,4,'marker',()=>goHole('sgr'));addLabel('太阳系 · 位置标记',galaxySun,4,'earth');
 const companion=new THREE.Group();companion.position.set(-25,-1,-19);companion.scale.setScalar(.43);companion.rotation.z=.27;groups[4].add(companion);makeGalaxy(companion,4500);addLabel('邻近星系 · 结构示意',companion,4,'marker');
 const m87=new THREE.Group();m87.position.set(24,2,-15);groups[4].add(m87);glow(m87,6,0xffd8a1,.37);starField(m87,500,2.5);addLabel('M87* · 点击前往',m87,4,'marker',()=>goHole('m87'));
 // 5: ray-bent emissive disk in a camera-facing world-space plane.
 const holeUniforms={uCamera:{value:new THREE.Vector3()},uTime:{value:0},uLens:{value:1},uDisk:{value:1},uSteps:{value:112},uBlend:{value:0}};
 const holeMaterial=new THREE.ShaderMaterial({uniforms:holeUniforms,vertexShader:holeVertex,fragmentShader:holeFragment,depthWrite:false,depthTest:false,toneMapped:false});
 const holeScreen=mesh(new THREE.PlaneGeometry(80,80),holeMaterial,groups[5]);holeScreen.renderOrder=-1;
 const origin=new THREE.Object3D();groups[5].add(origin);
 const voyage=createVoyage({THREE,C,scene,groups,earth,atmosphere,moon,moonOrbit,solarSun,solarPlanets,solarOrbits,companion,m87,addLabel,rng});
 // A separate local inspection lens; entering it never overwrites voyage zoom.
 const skyGround=new THREE.Color(0xabc6dd),skySpace=new THREE.Color(0x070c19);
 const homeDirection=new THREE.Vector3(6,1.65,18).normalize();
 camera.position.copy(homeDirection).multiplyScalar(20);controls.target.set(0,0,0);controls.update();
 // Flight and scene controls.
 const corners=['EARTH · HOME','EARTH & MOON','OUR SOLAR SYSTEM','OUR STELLAR NEIGHBORHOOD','THE MILKY WAY','A UNIVERSE OF GALAXIES','BEYOND THE HORIZON'];
 function save(){clearTimeout(storageTimer);storageTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}},180);}
 function saveNow(){clearTimeout(storageTimer);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}
 function setChapter(index){if(index===stage)return;stage=index;syncUI();dirty=true;}
 function setFlightCamera(){
  if(state.mode==='hole'){camera.position.set(0,3.2,22);controls.target.set(0,0,0);}
  else{const q=renderJourney,elevation=.083+C.smooth(0,1,q)*.49+C.smooth(1.4,2.05,q)*.19;
   camera.position.set(Math.sin(.322)*Math.cos(elevation)*20,Math.sin(elevation)*20,Math.cos(.322)*Math.cos(elevation)*20);controls.target.set(0,0,0);}
  controls.update();dirty=true;
 }
 function navigate(value){flight=false;state.mode=value>=6?'hole':'voyage';if(value<6)state.journey=Math.max(0,Math.min(5,value));setChapter(state.mode==='hole'?6:C.chapterAt(renderJourney));syncUI();save();}
 function goHole(id){if(state.bh!==id){state.bh=id;clearBodies(false);}navigate(6);}
 function applyVoyage(dt){
  const difference=state.journey-renderJourney;
  renderJourney+=Math.sign(difference)*Math.min(Math.abs(difference),Math.max(.001,Math.min(Math.abs(difference)*5,1.15))*dt);
  if(Math.abs(difference)<.00003)renderJourney=state.journey;
  const desired=state.mode==='hole'?1:0;holeBlend=THREE.MathUtils.damp(holeBlend,desired,4,dt);if(Math.abs(holeBlend-desired)<.001)holeBlend=desired;
  const zoom=voyage.update(renderJourney,days,holeBlend);
  const hole=state.mode==='hole';setChapter(hole?6:C.chapterAt(renderJourney));
  groups[5].visible=holeBlend>.002;
  holeMaterial.transparent=true;holeUniforms.uBlend.value=holeBlend;
  backdrop.material.opacity=(1-holeBlend)*C.smooth(.45,.95,renderJourney)*(1-C.smooth(3.6,4.45,renderJourney))*.75;
  backdrop.visible=backdrop.material.opacity>.001;
  scene.background=skyGround.clone().lerp(skySpace,zoom.sky);scene.fog=null;
  hemi.intensity=THREE.MathUtils.lerp(2.2,.75,zoom.sky);sunlight.intensity=THREE.MathUtils.lerp(2.5,1.5,zoom.sky);sunlight.castShadow=renderJourney<.22&&!hole;pointLight.visible=false;
  controls.minDistance=hole?14:20;controls.maxDistance=hole?32:20;controls.enableZoom=hole;
  controls.maxPolarAngle=renderJourney<.15&&!hole?Math.PI*.51:Math.PI-.02;
  camera.near=.015;camera.far=20000;camera.updateProjectionMatrix();
  if(!manualCamera){
   const e=.083+C.smooth(0,1,renderJourney)*.49+C.smooth(1.4,2.05,renderJourney)*.19;
   const outer=new THREE.Vector3(Math.sin(.322)*Math.cos(e)*20,Math.sin(e)*20,Math.cos(.322)*Math.cos(e)*20);
   camera.position.copy(outer.lerp(new THREE.Vector3(0,3.2,22),holeBlend));controls.target.set(0,0,0);
  }
  $('distanceReadout').textContent=hole?'黑洞近景 · '+C.BLACK_HOLES[state.bh].name:voyage.distanceLabel();
  $('distanceCaption').textContent=hole?'局部观察窗口 / Rs 归一化':'镜头尺度 · 连续对数缩放';
  $('journeySlider').value=state.journey*1000;
  $('journeySlider').setAttribute('aria-valuetext',hole?'黑洞近景':voyage.distanceLabel());
 }
 function syncFlight(){const button=$('flightBtn');button.textContent=flight?'■ 停止远航':stage===6?'↗ 返回远航':state.journey>=4.99?'↓ 返回地球':state.journey<.02?'↑ 开始升空':'↑ 继续远航';$('pauseBtn').textContent=state.paused?'▶':'Ⅱ';$('pauseBtn').setAttribute('aria-label',state.paused?'继续天体运动':'暂停天体运动');$('flightStatus').textContent=flight?'正在跨尺度远航':state.paused?'已暂停运动':stage===6?'拖入样本，探索引力':'自由观察';$('nextBtn').disabled=stage===5;$('nextBtn').textContent=stage===6?'↗ 返回远航':'下一尺度 →';}
 function syncUI(){const ch=C.CHAPTERS[stage];$('chapterTitle').textContent=ch.name;$('scaleLabel').textContent=ch.scale;$('sceneBadge').textContent=ch.badge;$('visualBadge').hidden=stage!==6;$('chapterNumber').textContent=stage===6?'LAB / Rs':String(stage+1).padStart(2,'0')+' / 06';$('chapterCorner').textContent=corners[stage];$('chapterQuestion').textContent=ch.question;$('chapterFact').textContent=ch.fact;$('journeySlider').value=Math.min(5000,state.journey*1000);
  document.querySelectorAll('[data-chapter]').forEach(b=>b.classList.toggle('active',+b.dataset.chapter===stage));
  $('discoveryPanel').hidden=stage===6;$('planetPanel').hidden=stage!==2;$('framePanel').hidden=true;$('galaxyPanel').hidden=stage<4||stage===6;$('returnVoyage').hidden=stage!==6;$('blackHoleShortcut').hidden=stage===6;$('blackHolePanel').hidden=stage!==6;
  $('inspectorTitle').textContent=stage===6?'黑洞互动实验':'这一站，发现什么';$('inspectorTag').textContent=stage===6?'样本投放':'观察任务';
  const cards=[['从熟悉的地方开始','1.65 <em>米</em>','初始人类视角'],['地球与月球的平均间距','38.44 <em>万千米</em>','距离近似按比例，小天体有可见性放大'],['一颗恒星，八大行星','8 <em>颗行星</em>','太阳系中的行星不是恒星'],['太阳也是一颗恒星','恒星邻域','太阳系没有离开，只是缩得太小了'],['我们的家园','银河系','太阳系位于银河盘中'],['星系组成的大尺度结构','宇宙网','亮点代表星系；分布是结构示意'],['','','']][stage];$('scaleCaption').textContent=cards[0];$('discoveryValue').innerHTML=cards[1];$('discoverySub').textContent=cards[2];
  const hints=[['先看看脚下，再抬头','按“开始升空”，街道和楼房会随着视角升高而变小。'],['月球并不自己发光','它反射太阳光。地月间距和光照几何做了便于观察的简化。'],['从太阳向外数','水星、金星、地球、火星、木星、土星、天王星、海王星。'],['一个亮点，也是一整个太阳系','继续拉远，恒星邻域会融进银河。太阳系并没有突然被换掉。'],['黑洞标记不是一个大洞','在星系尺度下看不见它的实际轮廓。点击 Sgr A* 或 M87*，进入近景实验。'],['我们仍在同一个宇宙里','蓝色标记一直指向银河系。滚轮向前可沿原路返回地球。'],['吸积盘发光，不是黑洞发光','如果给样本侧向速度，它可以环绕；零初速度放开则会向内落。']][stage];$('factBox').querySelector('b').textContent=hints[0];$('factBox').querySelector('p').textContent=hints[1];$('scienceTitle').textContent=hints[0];$('scienceText').textContent=stage===6?'外部观察者看到的是越来越暗、越来越红；这里的越界计数使用模拟时间。':ch.fact;
  $('labelsBtn').classList.toggle('on',state.labels);$('labelsBtn').setAttribute('aria-pressed',String(state.labels));$('orbitsBtn').classList.toggle('on',state.orbits);$('orbitsBtn').setAttribute('aria-pressed',String(state.orbits));
  $('holeSelect').value=state.bh;$('launchSelect').value=state.launch;$('lensToggle').checked=state.lens;$('diskToggle').checked=state.disk;$('speedSelect').value=String(state.speed);
  const bh=C.BLACK_HOLES[state.bh];$('holeMass').textContent=state.bh==='sgr'?'约 400 万 M☉':'约 65 亿 M☉';const r=C.schwarzschildKm(bh.massSolar);$('holeRadius').textContent=r>1e8?(r/1e8).toFixed(1)+' 亿 km':(r/1e4).toFixed(0)+' 万 km';
  document.querySelectorAll('[data-frame]').forEach(b=>b.classList.toggle('active',b.dataset.frame===state.frame));
  $('canvasHint').textContent=stage===6?'拖入天体样本 · 拖空白处转动 · 滚轮缩放':'滚轮向下：拉远到宇宙 · 向上：返回地球 · 拖动：转动';syncFlight();
 }
 C.CHAPTERS.forEach((ch,i)=>{const button=document.createElement('button');button.dataset.chapter=i;button.innerHTML='<span>'+String(i+1).padStart(2,'0')+'</span>';button.append(document.createTextNode(ch.short));button.addEventListener('click',()=>navigate(i===6?6:C.ZOOM_STOPS[i]));$('chapterNav').append(button);});
 function choosePlanet(id){selectedPlanet=id;const p=C.PLANETS.find(p=>p.id===id);$('planetInfo').innerHTML=`<b>${p.name}</b>平均日距约 ${p.au} AU<br>公转约 ${p.years} 地球年<br>半径约 ${Math.round(p.radiusKm).toLocaleString()} km`;document.querySelectorAll('[data-planet]').forEach(b=>b.classList.toggle('active',b.dataset.planet===id));}
 C.PLANETS.forEach(p=>{const b=document.createElement('button');b.dataset.planet=p.id;b.innerHTML=`<i style="background:${p.color}"></i>`;b.append(document.createTextNode(p.name));b.addEventListener('click',()=>choosePlanet(p.id));$('planetList').append(b);});choosePlanet('earth');
 $('flightBtn').addEventListener('click',()=>{if(stage===6){navigate(state.journey);return;}if(state.journey>=4.99){navigate(0);return;}flight=!flight;state.paused=false;manualCamera=false;syncFlight();});$('nextBtn').addEventListener('click',()=>navigate(stage===6?state.journey:C.ZOOM_STOPS[Math.min(5,stage+1)]));$('pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;if(state.paused)flight=false;syncFlight();save();});
 $('journeySlider').addEventListener('input',e=>navigate(Number(e.target.value)/1000));$('speedSelect').addEventListener('change',e=>{state.speed=Number(e.target.value);save();});
 $('viewReset').addEventListener('click',()=>{manualCamera=false;setFlightCamera();});$('labelsBtn').addEventListener('click',()=>{state.labels=!state.labels;syncUI();dirty=true;save();});$('orbitsBtn').addEventListener('click',()=>{state.orbits=!state.orbits;syncUI();dirty=true;save();});
 $('restartBtn').addEventListener('click',()=>{state.paused=false;navigate(0);});
 $('returnVoyage').addEventListener('click',()=>navigate(state.journey));$('blackHoleShortcut').addEventListener('click',()=>goHole(state.bh));document.querySelectorAll('[data-hole]').forEach(b=>b.addEventListener('click',()=>goHole(b.dataset.hole)));
 $('holeSelect').addEventListener('change',e=>{state.bh=e.target.value;clearBodies(false);syncUI();save();});$('launchSelect').addEventListener('change',e=>{state.launch=e.target.value;save();});$('lensToggle').addEventListener('change',e=>{state.lens=e.target.checked;dirty=true;save();});$('diskToggle').addEventListener('change',e=>{state.disk=e.target.checked;dirty=true;save();});
 renderer.domElement.addEventListener('wheel',e=>{if(state.mode==='hole')return;e.preventDefault();e.stopImmediatePropagation();flight=false;state.journey=THREE.MathUtils.clamp(state.journey+Math.max(-.16,Math.min(.16,e.deltaY*(e.deltaMode===1?.018:.00065))),0,5);save();syncFlight();},{passive:false,capture:true});
 renderer.domElement.addEventListener('keydown',e=>{if(e.target!==renderer.domElement||state.mode==='hole')return;if(['ArrowDown','PageDown','ArrowUp','PageUp','Home','End'].includes(e.key)){e.preventDefault();navigate(e.key==='Home'?0:e.key==='End'?5:state.journey+(['ArrowDown','PageDown'].includes(e.key)?.2:-.2));}});
 // Sample placement and conservative velocity-Verlet motion.
 function bodyVisual(model){const p=C.SAMPLES[model.kind],group=new THREE.Group();groups[5].add(group);let object;if(model.kind==='star')object=makeSun(p.size,group);else object=makePlanet(model.kind==='rock'?2:4,p.size,group);object.material=object.material.clone();object.material.transparent=true;const trail=line([],model.kind==='star'?0xe3b97f:0x7baac3,.35,groups[5]);const particlesGeo=new THREE.BufferGeometry();particlesGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(90*3),3));const particles=new THREE.Points(particlesGeo,new THREE.PointsMaterial({color:p.color,size:.045,transparent:true,opacity:.7,depthWrite:false}));groups[5].add(particles);return{model,group,object,trail,particles,trailPoints:[]};}
 function spawn(kind,position,mode=state.launch){if(stage!==6||bodies.filter(b=>!b.model.captured).length>=8){toast('最多同时观察 8 个样本，请先清空一些。');return null;}const normal=camera.getWorldDirection(new THREE.Vector3()),model=C.spawn(++bodyID,kind,position,mode,state.bh,normal);if(!model){toast('请把样本放在黑洞外侧约 1.2–24 Rs 的区域。');return null;}const visual=bodyVisual(model);bodies.push(visual);selectedBody=visual;state.paused=false;syncFlight();syncBodyUI();dirty=true;return visual;}
 function defaultPoint(radius=6){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);return right.multiplyScalar(radius);}
 function clearBodies(notify=true){for(const b of bodies){groups[5].remove(b.group,b.trail,b.particles);b.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});b.trail.geometry.dispose();b.trail.material.dispose();b.particles.geometry.dispose();b.particles.material.dispose();}bodies.length=0;selectedBody=null;captured=0;syncBodyUI();dirty=true;if(notify)toast('样本已清空，黑洞和视角保持不变。');}
 function syncBodyUI(){const b=selectedBody?.model;let text='拖一个样本进来试试';if(b){const distance=C.magnitude(b.p);text=b.captured?'样本已越过视界（模拟坐标时间）':b.status==='tidal'?`潮汐拉伸示意 · 距中心 ${distance.toFixed(2)} Rs`:`${C.SAMPLES[b.kind].name} · 距中心 ${distance.toFixed(2)} Rs`;} $('bodyStatus').textContent=text;$('captureCount').textContent=`模拟越界 ${captured} 次`;}
 function showEvent(message){$('eventText').textContent=message;$('eventStrip').hidden=false;setTimeout(()=>$('eventStrip').hidden=true,5000);}
 $('clearBodies').addEventListener('click',()=>clearBodies());$('demoDrop').addEventListener('click',()=>{clearBodies(false);spawn('star',defaultPoint(5.4),'drop');showEvent('零初速度放开：观察向内下落、潮汐和变暗。');});$('demoOrbit').addEventListener('click',()=>{clearBodies(false);spawn('rock',defaultPoint(6),'orbit');showEvent('有足够侧向速度：样本可以环绕，不会自动被吸进去。');});
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function setRay(e){const r=viewport.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);}
 function placement(e){setRay(e);const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),new THREE.Vector3());const hit=new THREE.Vector3();return raycaster.ray.intersectPlane(plane,hit)?hit:null;}
 document.querySelectorAll('[data-sample]').forEach(button=>{button.addEventListener('pointerdown',e=>{if(stage!==6||e.button!==0)return;e.preventDefault();drag={type:'sample',kind:button.dataset.sample,startX:e.clientX,startY:e.clientY,moved:false,id:e.pointerId};});button.addEventListener('click',e=>{if(e.detail===0)spawn(button.dataset.sample,defaultPoint(6));});});
 renderer.domElement.addEventListener('pointerdown',e=>{if(stage!==6||e.button!==0)return;setRay(e);const active=bodies.filter(b=>!b.model.captured),hits=raycaster.intersectObjects(active.map(b=>b.object),false);if(!hits.length)return;const body=active.find(b=>b.object===hits[0].object);selectedBody=body;flight=false;drag={type:'body',body,id:e.pointerId,moved:false};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);syncBodyUI();});
 document.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(drag.type==='sample'){if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5)return;drag.moved=true;$('dragPreview').hidden=false;$('dragPreview').textContent=drag.kind==='star'?'☀':'●';$('dragPreview').style.left=e.clientX+'px';$('dragPreview').style.top=e.clientY+'px';}else{const p=placement(e);if(p&&C.magnitude(p)>1.15&&C.magnitude(p)<24){drag.body.model.p={x:p.x,y:p.y,z:p.z};drag.body.group.position.copy(p);dirty=true;}}e.preventDefault();});
 function endDrag(e,cancel=false){if(!drag||e.pointerId!==undefined&&drag.id!==e.pointerId)return;const d=drag;drag=null;$('dragPreview').hidden=true;controls.enabled=true;
  if(d.type==='sample'){if(cancel)return;if(!d.moved){spawn(d.kind,defaultPoint(6));return;}const r=viewport.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;const p=placement(e);if(p)spawn(d.kind,p);}
  else{if(renderer.domElement.hasPointerCapture(d.id))renderer.domElement.releasePointerCapture(d.id);const m=C.spawn(d.body.model.id,d.body.model.kind,d.body.model.p,state.launch,state.bh,camera.getWorldDirection(new THREE.Vector3()));if(m){d.body.model=m;d.body.trailPoints=[];}dirty=true;}
 }
 document.addEventListener('pointerup',e=>endDrag(e));document.addEventListener('pointercancel',e=>endDrag(e,true));window.addEventListener('blur',()=>endDrag({},true));document.addEventListener('keydown',e=>{if(e.key==='Escape')endDrag({},true);});
 renderer.domElement.addEventListener('click',e=>{if(stage!==2)return;setRay(e);const hit=raycaster.intersectObjects(solarPlanets,false)[0];if(hit)choosePlanet(hit.object.userData.planet);});
 function open(id){flight=false;syncFlight();$(id).showModal();} $('helpBtn').addEventListener('click',()=>open('helpDialog'));$('factsBtn').addEventListener('click',()=>open('factsDialog'));document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 window.addEventListener('message',e=>{if(e.source!==window.parent)return;if(e.data?.type==='lab:help')open('helpDialog');if(e.data?.type==='lab:leave'){flight=false;state.paused=true;saveNow();}});window.addEventListener('pagehide',saveNow);document.addEventListener('visibilitychange',()=>{if(document.hidden){flight=false;syncFlight();saveNow();}});
 function updateLabels(){
  camera.updateMatrixWorld();const occupied=[];
  for(const l of labels){
   l.button.hidden=!state.labels||l.chapter!==stage||holeBlend>.25&&stage!==6;if(l.button.hidden)continue;
   const p=l.object.localToWorld(l.offset.clone()).project(camera),x=(p.x*.5+.5)*viewport.clientWidth,y=(-p.y*.5+.5)*viewport.clientHeight;
   l.button.hidden=p.z>1||p.z<-1||x<20||x>viewport.clientWidth-20||y<35||y>viewport.clientHeight-20;if(l.button.hidden)continue;
   const w=l.button.offsetWidth||65,h=l.button.offsetHeight||18;let found=false;
   for(const dy of [0,-22,22,-44,44,-66,66]){const rect={x:x-w/2,y:y+dy-h/2,w,h};if(rect.y<38||rect.y+h>viewport.clientHeight-25||occupied.some(a=>rect.x<a.x+a.w+4&&rect.x+rect.w>a.x-4&&rect.y<a.y+a.h+3&&rect.y+rect.h>a.y-3))continue;
    occupied.push(rect);l.button.style.left=x+'px';l.button.style.top=(y+dy)+'px';found=true;break;}
   l.button.hidden=!found;
  }
 }
 const up=new THREE.Vector3(0,1,0),temp=new THREE.Vector3();
 function updateBodies(dt){for(const b of bodies){const m=b.model;if(m.captured){b.group.visible=false;b.particles.visible=false;continue;}const was=m.captured;if(!state.paused&&drag?.body!==b){let remaining=dt;while(remaining>0){const step=Math.min(remaining,1/240);C.tickBody(m,step);remaining-=step;}}if(!was&&m.captured){captured++;showEvent('样本越过事件视界（模拟时间）。外部看来会变红、变暗。');syncBodyUI();}
   b.group.position.set(m.p.x,m.p.y,m.p.z);const r=C.magnitude(m.p),tidal=m.tidal/r;const stretch=m.tidal>1.05?1+Math.min(4,Math.max(0,tidal*tidal-1)*.65):1;b.object.quaternion.setFromUnitVectors(up,temp.copy(b.group.position).normalize());b.object.scale.set(1/Math.sqrt(stretch),stretch,1/Math.sqrt(stretch));const fade=THREE.MathUtils.smoothstep(r,1,1.8);b.object.material.opacity=fade;if(b.object.material.color)b.object.material.color.set(0xffffff).lerp(new THREE.Color(0xd45c4b),1-fade);if(b.object.material.uniforms?.uFade){b.object.material.uniforms.uFade.value=fade;b.object.material.uniforms.uTime.value=elapsed;b.object.children.forEach(o=>{if(o.isSprite)o.material.opacity=.52*fade;});}
   b.trailPoints.push(b.group.position.clone());if(b.trailPoints.length>200)b.trailPoints.shift();if(bodyClock%3===0){b.trail.geometry.dispose();b.trail.geometry=new THREE.BufferGeometry().setFromPoints(b.trailPoints);}
   b.particles.visible=m.status==='tidal'&&r>1&&m.tidal>1.05;const pa=b.particles.geometry.attributes.position;if(b.particles.visible){const radial=temp.copy(b.group.position).normalize(),side=new THREE.Vector3().crossVectors(radial,new THREE.Vector3(0,0,1)).normalize();for(let i=0;i<pa.count;i++){const f=i/pa.count-.5,offset=f*Math.min(4,stretch)*.5,swirl=Math.sin(i*1.7+elapsed*2)*.08;pa.setXYZ(i,m.p.x+radial.x*offset+side.x*swirl,m.p.y+radial.y*offset+side.y*swirl,m.p.z+radial.z*offset+side.z*swirl);}pa.needsUpdate=true;}
  }bodyClock++;if(bodyClock%8===0)syncBodyUI();}
 function simulation(dt){if(!state.paused){elapsed+=dt;days+=dt*20;}
  // Keep the surface anchor steady. Periods remain a teaching circular model.
  solarSun.material.uniforms.uTime.value=elapsed;
  solarPlanets.forEach((p,i)=>{p.rotation.y=elapsed*.04;solarOrbits[i].visible=state.orbits;});moonOrbit.visible=state.orbits;
  if(holeBlend>.002){holeScreen.quaternion.copy(camera.quaternion);holeUniforms.uCamera.value.copy(camera.position);holeUniforms.uTime.value=elapsed;holeUniforms.uLens.value=state.lens?1:0;holeUniforms.uDisk.value=state.disk?1:0;holeUniforms.uSteps.value=state.quality==='high'?144:112;if(state.mode==='hole')updateBodies(dt);}else bodyClock++;
 }
 new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}}).observe(viewport);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();sceneLost=true;fail(new Error('WebGL context lost'));});
 function animate(now){if(sceneLost)return;let dt=Math.min(.055,Math.max(0,(now-last)/1000));last=now;const sdt=dt*state.speed;
  if(flight&&!state.paused){state.journey=Math.min(5,state.journey+sdt*.072);if(state.journey>=5){flight=false;syncFlight();}save();}
  applyVoyage(dt);simulation(state.paused?0:sdt);const moved=controls.update();
  if(!document.hidden){renderer.render(scene,camera);if(now-labelClock>70||moved||dirty){updateLabels();labelClock=now;}dirty=false;}
  requestAnimationFrame(animate);
 }
 setChapter(state.mode==='hole'?6:C.chapterAt(state.journey));applyVoyage(0);setFlightCamera();$('renderStatus').hidden=true;requestAnimationFrame(animate);
 window.CosmosLab={version:'3.1.0',snapshot:()=>({version:'3.1.0',state:JSON.parse(JSON.stringify(state)),chapter:stage,chapterName:C.CHAPTERS[stage].name,flight,renderJourney,zoom: voyage.snapshot(),holeBlend,days,planets:C.PLANETS.map(p=>p.name),bodies:bodies.map(b=>({id:b.model.id,kind:b.model.kind,p:{...b.model.p},v:{...b.model.v},captured:b.model.captured,status:b.model.status,tidal:b.model.tidal})),captured,camera:camera.position.toArray(),renderer:{ready:!sceneLost,framework:'Three.js',revision:THREE.REVISION,webgl2:true,triangles:renderer.info.render.triangles},textures:{earth:!!earthMap.image,moon:!!moonMap.image}}),screenPoint:id=>{const body=bodies.find(b=>b.model.id===id);const p=(body?body.group.position:new THREE.Vector3()).clone().project(camera),r=viewport.getBoundingClientRect();return{x:r.left+(p.x*.5+.5)*r.width,y:r.top+(-p.y*.5+.5)*r.height};}};
}
try{init();}catch(error){fail(error);}
