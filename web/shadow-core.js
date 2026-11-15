/* Point-source projection onto fixed ground y=0. World unit = 10 cm.
   The hand is modeled as a horizontal opaque thin sheet for its shadow. */
(function(root){
  'use strict';
  const UNIT_CM=10, LIMIT=9;
  const DEFAULT={light:{x:-1,y:5.2,z:.4},hand:{x:0,y:2.2,z:0},yaw:0,selected:'hand',rays:true,grid:true};
  function fresh(){return JSON.parse(JSON.stringify(DEFAULT));}
  function project(point,light){
    const gap=light.y-point.y;
    if(gap<=0||point.y<0)return null;
    const t=light.y/gap;
    return {x:light.x+t*(point.x-light.x),y:0,z:light.z+t*(point.z-light.z)};
  }
  function magnification(state){const gap=state.light.y-state.hand.y;return gap>0?state.light.y/gap:null;}
  function worldPoint(point,state){const c=Math.cos(state.yaw),s=Math.sin(state.yaw);return{x:state.hand.x+point.x*c+point.z*s,y:state.hand.y,z:state.hand.z-point.x*s+point.z*c};}
  function metrics(state,outline){
    const m=magnification(state),center=project(state.hand,state.light);
    if(!center)return {valid:false,magnification:null,widthCm:0,lengthCm:0,offsetCm:0,clipped:false};
    const points=outline.map(p=>project(worldPoint(p,state),state.light));
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
    return {valid:true,magnification:m,center,widthCm:(Math.max(...xs)-Math.min(...xs))*UNIT_CM,lengthCm:(Math.max(...zs)-Math.min(...zs))*UNIT_CM,offsetCm:Math.hypot(center.x-state.hand.x,center.z-state.hand.z)*UNIT_CM,clipped:points.some(p=>Math.abs(p.x)>LIMIT||Math.abs(p.z)>LIMIT)};
  }
  function sanitize(raw){
    try{
      const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||s.version!==2)return null;
      const out=fresh();
      for(const kind of ['light','hand'])for(const axis of ['x','y','z']){
        const n=s[kind]?.[axis];if(typeof n!=='number'||!Number.isFinite(n))return null;
        out[kind][axis]=Math.max(axis==='y'?.2:-4,Math.min(axis==='y'?(kind==='light'?8:7):4,n));
      }
      out.yaw=Number.isFinite(s.yaw)?s.yaw%(Math.PI*2):0;
      out.selected=s.selected==='light'?'light':'hand';out.rays=s.rays!==false;out.grid=s.grid!==false;return out;
    }catch{return null;}
  }
  const API={UNIT_CM,LIMIT,DEFAULT,fresh,project,magnification,worldPoint,metrics,sanitize};
  if(typeof module!=='undefined')module.exports=API;root.ShadowCore=API;
})(typeof globalThis!=='undefined'?globalThis:window);
