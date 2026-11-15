import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id), C=window.ShadowCore, KEY='fairytale-lab.hand-shadow.v2';
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
function fatal(message){const box=$('renderStatus');box.hidden=false;box.replaceChildren();const b=document.createElement('b');b.textContent=message;const note=document.createElement('small');note.textContent='需要支持 WebGL 2 的显卡驱动 / Edge WebView2；可继续使用左侧的其他实验。';const retry=document.createElement('button');retry.textContent='重新载入 3D 实验';retry.onclick=()=>location.reload();box.append(b,note,retry);document.querySelectorAll('.object-label').forEach(x=>x.hidden=true);}

function init(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY));}catch{}
  let state=C.sanitize(saved)||C.fresh(),reference=saved?.reference?C.sanitize(saved.reference):null,mode='move',activeDrag=null;
  let dirty=true,saveTimer,storageWarning=false,contextLost=false;
  const viewport=$('viewport');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.localClippingEnabled=true;
  renderer.domElement.setAttribute('aria-label','可拖动光源与小手的三维光影实验场景');renderer.domElement.tabIndex=0;
  viewport.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.05,100);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.13;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=25;controls.minPolarAngle=.015;controls.maxPolarAngle=Math.PI/2-.045;
  controls.target.set(.4,1.2,-.2);camera.position.set(6.5,7.2,9.5);controls.update();
  controls.mouseButtons.LEFT=null;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;controls.mouseButtons.MIDDLE=THREE.MOUSE.DOLLY;
  controls.touches.ONE=null;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
  controls.addEventListener('change',()=>dirty=true);
  const hemi=new THREE.HemisphereLight(0xf1f5ff,0xb9b8b0,1.8);scene.add(hemi);
  const fill=new THREE.DirectionalLight(0xffffff,1.8);fill.position.set(4,8,3);scene.add(fill);
  const point=new THREE.PointLight(0xffedc7,24,0,2);scene.add(point);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(18,18),new THREE.MeshStandardMaterial({color:0xe4edf4,roughness:.95,metalness:0}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(18,.16,18),new THREE.MeshStandardMaterial({color:0xbecdda,roughness:.9}));slab.position.y=-.09;scene.add(slab);
  const grid=new THREE.GridHelper(18,18,0xafbfcd,0xbecbd7);grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.36;grid.material.depthWrite=false;scene.add(grid);
  const floorBorder=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9,.008,-9),new THREE.Vector3(9,.008,-9),new THREE.Vector3(9,.008,9),new THREE.Vector3(-9,.008,9)]),new THREE.LineBasicMaterial({color:0xc0cfda}));scene.add(floorBorder);
  function line(points,color,opacity=1){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));}
  const axisX=line([new THREE.Vector3(-3,.011,0),new THREE.Vector3(3,.011,0)],0xc99f9b,.65),axisZ=line([new THREE.Vector3(0,.012,-3),new THREE.Vector3(0,.012,3)],0x94acbe,.65);scene.add(axisX,axisZ);

  // A single continuous, rounded five-finger silhouette, not five disconnected blocks.
  const shape=new THREE.Shape();shape.moveTo(-.27,-.9);
  shape.bezierCurveTo(-.1,-.94,.15,-.94,.28,-.9);shape.lineTo(.31,-.55);
  shape.bezierCurveTo(.5,-.33,.53,-.02,.52,.3);
  shape.lineTo(.7,.83);shape.bezierCurveTo(.76,1.02,.58,1.1,.51,.92);shape.lineTo(.37,.48);
  shape.lineTo(.35,1.28);shape.bezierCurveTo(.35,1.47,.12,1.49,.11,1.29);shape.lineTo(.05,.52);
  shape.lineTo(-.02,1.48);shape.bezierCurveTo(-.03,1.68,-.27,1.66,-.27,1.46);shape.lineTo(-.29,.51);
  shape.lineTo(-.4,1.24);shape.bezierCurveTo(-.43,1.45,-.66,1.39,-.63,1.19);shape.lineTo(-.55,.23);
  shape.bezierCurveTo(-.64,.25,-.76,.49,-.9,.58);shape.bezierCurveTo(-1.1,.69,-1.22,.46,-1.04,.32);
  shape.lineTo(-.68,-.17);shape.bezierCurveTo(-.51,-.36,-.33,-.4,-.3,-.6);shape.closePath();
  const hand=new THREE.Group();scene.add(hand);
  const handGeometry=new THREE.ExtrudeGeometry(shape,{depth:.115,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:3,steps:1,curveSegments:12});
  handGeometry.translate(0,0,-.0575);handGeometry.rotateX(-Math.PI/2);handGeometry.scale(.8,1,.8);
  const skin=new THREE.MeshPhysicalMaterial({color:0xdfaa8b,roughness:.68,metalness:0,clearcoat:.12,clearcoatRoughness:.65});
  const handMesh=new THREE.Mesh(handGeometry,skin);hand.add(handMesh);handMesh.userData.kind='hand';
  const creaseMaterial=new THREE.LineBasicMaterial({color:0xba846d,transparent:true,opacity:.28});
  for(const points of [[[-.45,.03],[-.19,-.06],[.12,-.04],[.35,.04]],[[-.42,-.02],[-.3,-.2],[-.28,-.44]],[[-.2,-.32],[.02,-.26],[.29,-.12]],[[-.54,.82],[-.48,.8]],[[-.22,1.06],[-.06,1.06]],[[.15,.99],[.3,.99]],[[.51,.75],[.62,.72]],[[-.25,-.65],[.25,-.65]]]){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0]*.8,.103,-p[1]*.8)));
    hand.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)),creaseMaterial));
  }
  const flatGeometry=new THREE.ShapeGeometry(shape,16);flatGeometry.rotateX(-Math.PI/2);flatGeometry.scale(.8,1,.8);
  const flatPositions=flatGeometry.getAttribute('position').array.slice();
  const outline=shape.getPoints(18).map(p=>({x:p.x*.8,z:-p.y*.8}));
  const clipping=[new THREE.Plane(new THREE.Vector3(1,0,0),9),new THREE.Plane(new THREE.Vector3(-1,0,0),9),new THREE.Plane(new THREE.Vector3(0,0,1),9),new THREE.Plane(new THREE.Vector3(0,0,-1),9)];
  const shadowGeometry=flatGeometry.clone();
  const shadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({color:0x29364e,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,clippingPlanes:clipping}));shadow.renderOrder=2;scene.add(shadow);
  const referenceLine=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x6a9bc0,dashSize:.12,gapSize:.07,transparent:true,opacity:.85,clippingPlanes:clipping}));referenceLine.renderOrder=3;scene.add(referenceLine);
  const lightObject=new THREE.Group();scene.add(lightObject);
  const globe=new THREE.Mesh(new THREE.SphereGeometry(.21,28,20),new THREE.MeshBasicMaterial({color:0xffedb3}));lightObject.add(globe);globe.userData.kind='light';
  const socket=new THREE.Mesh(new THREE.CylinderGeometry(.10,.13,.16,20),new THREE.MeshStandardMaterial({color:0x9aa6b2,roughness:.55}));socket.position.y=.23;lightObject.add(socket);socket.userData.kind='light';
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.12,20,14),new THREE.MeshStandardMaterial({color:0xb5c2cd,roughness:.5}));cap.position.y=.32;cap.scale.y=.5;lightObject.add(cap);cap.userData.kind='light';
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const g=glowCanvas.getContext('2d'),gradient=g.createRadialGradient(64,64,1,64,64,64);gradient.addColorStop(0,'rgba(255,233,159,.65)');gradient.addColorStop(.27,'rgba(255,224,139,.3)');gradient.addColorStop(1,'rgba(255,224,139,0)');g.fillStyle=gradient;g.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false}));glow.scale.set(1.6,1.6,1);lightObject.add(glow);
  const guideMaterial=new THREE.LineDashedMaterial({color:0xbcae88,dashSize:.075,gapSize:.07,transparent:true,opacity:.65});
  const lightGuide=new THREE.Line(new THREE.BufferGeometry(),guideMaterial),handGuide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xa999bd,dashSize:.075,gapSize:.07,transparent:true,opacity:.6}));scene.add(lightGuide,handGuide);
  const lightRing=new THREE.Mesh(new THREE.RingGeometry(.21,.24,40),new THREE.MeshBasicMaterial({color:0xcdbb83,transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));lightRing.rotation.x=-Math.PI/2;scene.add(lightRing);
  const handRing=lightRing.clone();handRing.material=new THREE.MeshBasicMaterial({color:0xa79abc,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});scene.add(handRing);
  const selectedRing=new THREE.Mesh(new THREE.RingGeometry(.7,.72,64),new THREE.MeshBasicMaterial({color:0xc2b6da,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));selectedRing.rotation.x=-Math.PI/2;scene.add(selectedRing);
  const rays=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xd4b464,transparent:true,opacity:.28,depthWrite:false,clippingPlanes:clipping}));scene.add(rays);
  let measurements=C.metrics(state,outline);
  function saveNow(){try{localStorage.setItem(KEY,JSON.stringify({...state,version:2,reference:reference?{...reference,version:2}:null}));}catch{if(!storageWarning){storageWarning=true;$('saveStatus').textContent='此环境不能保存；仍可正常探索。';}}}
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,150);}
  function setLineGeometry(object,points){object.geometry.dispose();object.geometry=new THREE.BufferGeometry().setFromPoints(points);if(object.isLine&&object.material.isLineDashedMaterial)object.computeLineDistances();}
  function updateReference(){
    const m=reference?C.metrics(reference,outline):null;referenceLine.visible=!!m?.valid;$('referenceInfo').hidden=!m?.valid;
    if(m?.valid){setLineGeometry(referenceLine,outline.map(p=>{const q=C.project(C.worldPoint(p,reference),reference.light);return new THREE.Vector3(q.x,.032,q.z);}));$('referenceText').textContent=`上次放大 ${m.magnification.toFixed(2)} 倍；手高 ${(reference.hand.y*10).toFixed(0)} cm，光源高 ${(reference.light.y*10).toFixed(0)} cm。`;}
  }
  function syncScene(){
    hand.position.set(state.hand.x,state.hand.y,state.hand.z);hand.rotation.y=state.yaw;lightObject.position.set(state.light.x,state.light.y,state.light.z);point.position.copy(lightObject.position);
    hand.updateMatrixWorld(true);lightObject.updateMatrixWorld(true);
    measurements=C.metrics(state,outline);shadow.visible=measurements.valid;
    if(measurements.valid){const pos=shadowGeometry.getAttribute('position');for(let i=0;i<pos.count;i++){const world=C.worldPoint({x:flatPositions[i*3],z:flatPositions[i*3+2]},state),q=C.project(world,state.light);pos.setXYZ(i,q.x,.019,q.z);}pos.needsUpdate=true;shadowGeometry.computeBoundingSphere();}
    setLineGeometry(lightGuide,[new THREE.Vector3(state.light.x,.025,state.light.z),lightObject.position.clone()]);setLineGeometry(handGuide,[new THREE.Vector3(state.hand.x,.027,state.hand.z),hand.position.clone()]);
    lightRing.position.set(state.light.x,.013,state.light.z);handRing.position.set(state.hand.x,.014,state.hand.z);selectedRing.position.set(state[state.selected].x,.015,state[state.selected].z);
    const rayPoints=[];if(measurements.valid){for(const index of [0,Math.floor(outline.length*.22),Math.floor(outline.length*.45),Math.floor(outline.length*.7)]){const p=C.worldPoint(outline[index],state),q=C.project(p,state.light);rayPoints.push(lightObject.position.clone(),new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(q.x,.02,q.z));}}
    setLineGeometry(rays,rayPoints);rays.visible=state.rays&&measurements.valid;grid.visible=state.grid;axisX.visible=axisZ.visible=state.grid;
    dirty=true;syncUI();scheduleSave();
  }
  const cm=n=>(n*10).toFixed(0);
  function syncUI(){
    document.querySelectorAll('[data-select]').forEach(b=>b.classList.toggle('active',b.dataset.select===state.selected));$('lightLabel').classList.toggle('active',state.selected==='light');$('handLabel').classList.toggle('active',state.selected==='hand');
    const object=state[state.selected];$('heightSlider').max=state.selected==='light'?80:70;$('heightSlider').value=object.y*10;$('heightOutput').innerHTML=cm(object.y)+' <small>cm</small>';
    $('xSlider').value=object.x*10;$('zSlider').value=object.z*10;$('xOutput').textContent=cm(object.x)+' cm';$('zOutput').textContent=cm(object.z)+' cm';$('yawSlider').value=state.yaw*180/Math.PI;$('yawOutput').textContent=Math.round(state.yaw*180/Math.PI)+'°';
    $('lightLabelHeight').textContent=cm(state.light.y)+' cm';$('handLabelHeight').textContent=cm(state.hand.y)+' cm';$('lightHeightValue').textContent=cm(state.light.y)+' cm';$('handHeightValue').textContent=cm(state.hand.y)+' cm';
    const m=measurements;$('magnificationValue').textContent=m.valid?(m.magnification<100?m.magnification.toFixed(2):m.magnification.toFixed(0)):'—';
    $('shadowSizeValue').textContent=m.valid?`${m.widthCm.toFixed(1)} × ${m.lengthCm.toFixed(1)} cm`:'无地面投影';$('offsetValue').textContent=m.valid?m.offsetCm.toFixed(1)+' cm':'—';
    $('captureBtn').disabled=!m.valid;$('sceneWarning').hidden=m.valid&&!m.clipped;
    $('sceneWarning').textContent=!m.valid?'光源不高于小手，地面接不到手影。把光源升高试试。':m.clipped?'影子的一部分超出了观察地面。让手靠近地面，或升高光源。':'';
    $('observationText').textContent=!m.valid?'光源要高于手，光线才能越过手照向地面。':m.magnification>3?'离光源更近了，影子明显变大！':m.magnification<1.25?'小手贴近地面，影子接近手的大小。':'移动光源到侧上方，观察影子往相反方向偏移。';
    $('raysToggle').checked=state.rays;$('gridToggle').checked=state.grid;
  }
  function select(kind){state.selected=kind;syncUI();selectedRing.position.set(state[kind].x,.015,state[kind].z);dirty=true;scheduleSave();}
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.select)));
  for(const [id,axis] of [['heightSlider','y'],['xSlider','x'],['zSlider','z']])$(id).addEventListener('input',e=>{state[state.selected][axis]=Number(e.target.value)/10;syncScene();});
  $('yawSlider').addEventListener('input',e=>{state.yaw=Number(e.target.value)*Math.PI/180;syncScene();});
  $('raysToggle').addEventListener('change',e=>{state.rays=e.target.checked;syncScene();});$('gridToggle').addEventListener('change',e=>{state.grid=e.target.checked;syncScene();});
  function setMode(next){mode=next;controls.mouseButtons.LEFT=mode==='orbit'?THREE.MOUSE.ROTATE:null;controls.touches.ONE=mode==='orbit'?THREE.TOUCH.ROTATE:null;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('interactionHint').innerHTML=mode==='orbit'?'<b>换个角度</b> 拖空白处旋转，滚轮缩放。':'<b>试试看</b> 拖动小手或光源；拖 ↕ 调高度。';renderer.domElement.style.cursor=mode==='orbit'?'grab':'default';}
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  function setView(view){if(view==='top'){camera.position.set(.4,13,.001);controls.target.set(.4,0,0);}else if(view==='side'){camera.position.set(9,3.1,10);controls.target.set(.4,1.5,0);}else{camera.position.set(6.5,7.2,9.5);controls.target.set(.4,1.2,-.2);}controls.update();dirty=true;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));$('viewReset').addEventListener('click',()=>setView('perspective'));
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function setRay(event){const r=renderer.domElement.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);}
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(mode!=='move'||e.button!==0||activeDrag)return;setRay(e);
    const hits=raycaster.intersectObjects([handMesh,globe,socket,cap],false);if(!hits.length)return;
    const kind=hits[0].object.userData.kind;select(kind);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-state[kind].y),hit=new THREE.Vector3();
    if(!raycaster.ray.intersectPlane(plane,hit))return;
    activeDrag={kind,plane,offset:hit.sub(new THREE.Vector3(state[kind].x,state[kind].y,state[kind].z)),pointerId:e.pointerId,element:renderer.domElement,type:'plane'};
    controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';e.preventDefault();
  });
  function toScreen(vector){const r=viewport.getBoundingClientRect(),p=vector.clone().project(camera);return {x:(p.x*.5+.5)*r.width,y:(-p.y*.5+.5)*r.height,z:p.z};}
  document.querySelectorAll('[data-height]').forEach(handle=>{
    handle.addEventListener('pointerdown',e=>{if(e.button!==0||activeDrag)return;const kind=handle.dataset.height;select(kind);const o=state[kind],a=toScreen(new THREE.Vector3(o.x,o.y,o.z)),b=toScreen(new THREE.Vector3(o.x,o.y+1,o.z));let axis={x:b.x-a.x,y:b.y-a.y};if(Math.hypot(axis.x,axis.y)<12)axis={x:0,y:-45};activeDrag={kind,type:'height',startX:e.clientX,startY:e.clientY,startYWorld:o.y,axis,pointerId:e.pointerId,element:handle};controls.enabled=false;handle.setPointerCapture(e.pointerId);e.preventDefault();});
    handle.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const kind=handle.dataset.height;state[kind].y=Math.max(.2,Math.min(kind==='light'?8:7,state[kind].y+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?.5:.1)));select(kind);syncScene();});
  });
  document.addEventListener('pointermove',e=>{
    if(!activeDrag||e.pointerId!==activeDrag.pointerId)return;const d=activeDrag;
    if(d.type==='height'){const scalar=((e.clientX-d.startX)*d.axis.x+(e.clientY-d.startY)*d.axis.y)/(d.axis.x*d.axis.x+d.axis.y*d.axis.y);state[d.kind].y=Math.max(.2,Math.min(d.kind==='light'?8:7,d.startYWorld+scalar));}
    else{setRay(e);const p=new THREE.Vector3();if(!raycaster.ray.intersectPlane(d.plane,p))return;p.sub(d.offset);state[d.kind].x=Math.max(-4,Math.min(4,p.x));state[d.kind].z=Math.max(-4,Math.min(4,p.z));}
    syncScene();e.preventDefault();
  });
  function endDrag(e){if(!activeDrag||(e.pointerId!==undefined&&activeDrag.pointerId!==e.pointerId))return;const d=activeDrag;if(d.element.hasPointerCapture?.(d.pointerId))d.element.releasePointerCapture(d.pointerId);activeDrag=null;controls.enabled=true;renderer.domElement.style.cursor=mode==='orbit'?'grab':'default';saveNow();}
  document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);window.addEventListener('blur',()=>endDrag({}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')endDrag({});});
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  function preset(name){
    state.hand={...C.DEFAULT.hand};state.light={...C.DEFAULT.light};state.yaw=0;state.selected='hand';
    if(name==='near-light')state.hand.y=4;
    if(name==='near-ground')state.hand.y=.45;
    if(name==='side-light')state.light={x:-4,y:4.8,z:1.4};
    syncScene();toast(name==='near-light'?'小手靠近光源了。再对比一下靠近地面的影子。':name==='near-ground'?'小手靠近地面了，影子更接近手的大小。':'光从左侧上方照来，影子偏向另一侧。');
  }
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));
  $('captureBtn').addEventListener('click',()=>{if(!measurements.valid)return;reference=JSON.parse(JSON.stringify(state));updateReference();dirty=true;saveNow();toast('蓝色轮廓留下来了。移动小手或光源，和它比一比。');});
  $('clearReference').addEventListener('click',()=>{reference=null;updateReference();dirty=true;saveNow();});
  $('resetExperiment').addEventListener('click',()=>{endDrag({});state=C.fresh();reference=null;setMode('move');setView('perspective');updateReference();syncScene();saveNow();toast('光源、小手和视角都回到了初始位置。');});
  function help(){$('helpDialog').showModal();}$('helpBtn').addEventListener('click',help);$('closeHelp').addEventListener('click',()=>$('helpDialog').close());$('startExplore').addEventListener('click',()=>$('helpDialog').close());
  window.addEventListener('message',e=>{if(e.source!==window.parent)return;if(e.data?.type==='lab:help')help();if(e.data?.type==='lab:leave'){endDrag({});saveNow();}});
  window.addEventListener('pagehide',saveNow);
  function positionLabels(){
    for(const kind of ['light','hand']){const o=state[kind],v=toScreen(new THREE.Vector3(o.x,o.y+(kind==='light'?.48:.26),o.z)),label=$(kind+'Label');label.hidden=v.z>1||v.z<-1;const width=label.offsetWidth||150;label.style.left=(kind==='light'?Math.max(width+9,Math.min(viewport.clientWidth-10,v.x-22)):Math.max(10,Math.min(viewport.clientWidth-width-9,v.x+55)))+'px';label.style.top=Math.max(82,Math.min(viewport.clientHeight-50,v.y-12))+'px';label.style.transform=kind==='light'?'translate(-100%,-100%)':'translate(0,-100%)';}
    $('shadowLabel').hidden=!measurements.valid||measurements.clipped;
    if(measurements.valid){const p=measurements.center,v=toScreen(new THREE.Vector3(p.x,.03,p.z));$('shadowLabel').style.left=Math.max(65,Math.min(viewport.clientWidth-65,v.x))+'px';$('shadowLabel').style.top=Math.min(viewport.clientHeight-50,v.y+27)+'px';$('shadowLabel').style.transform='translateX(-50%)';}
  }
  const observer=new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(w>0&&h>0){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);dirty=true;}});observer.observe(viewport);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;fatal('3D 绘图上下文已中断，请重新载入。');});
  function draw(){if(contextLost)return;const moved=controls.update();if(dirty||moved){renderer.render(scene,camera);positionLabels();dirty=false;}requestAnimationFrame(draw);}
  updateReference();syncScene();$('renderStatus').hidden=true;setMode('move');draw();
  window.ShadowLab={version:'2.0.0',snapshot:()=>({version:2,...JSON.parse(JSON.stringify(state)),mode,reference:reference?JSON.parse(JSON.stringify(reference)):null,metrics:JSON.parse(JSON.stringify(measurements)),camera:camera.position.toArray(),renderer:{framework:'Three.js',revision:THREE.REVISION,webgl2:true,ready:!contextLost,triangles:renderer.info.render.triangles}}),screenPoint:kind=>{if(!['hand','light'].includes(kind))return null;const o=state[kind],p=toScreen(new THREE.Vector3(o.x,o.y,o.z)),r=viewport.getBoundingClientRect();return {x:p.x+r.left,y:p.y+r.top};}};
}
try{init();}catch(error){console.error('3D initialization failed',error);fatal('当前环境无法启动 3D 光影实验。');}
