/* Independent teaching models. Not an ephemeris or a general-relativistic solver. */
(function(root){
  'use strict';
  const G=6.67430e-11,C=299792458,MSUN=1.98847e30,AU_KM=149597870.7;
  const PLANETS=[
    {id:'mercury',name:'水星',au:.387,years:.241,radiusKm:2439.7,color:'#b2aaa0',size:.22},
    {id:'venus',name:'金星',au:.723,years:.615,radiusKm:6051.8,color:'#ddbf81',size:.34},
    {id:'earth',name:'地球',au:1,years:1,radiusKm:6371,color:'#68acdf',size:.36},
    {id:'mars',name:'火星',au:1.524,years:1.881,radiusKm:3389.5,color:'#cf7d57',size:.28},
    {id:'jupiter',name:'木星',au:5.203,years:11.86,radiusKm:69911,color:'#c6a68a',size:.86},
    {id:'saturn',name:'土星',au:9.537,years:29.45,radiusKm:58232,color:'#dec798',size:.71},
    {id:'uranus',name:'天王星',au:19.19,years:84.02,radiusKm:25362,color:'#96dce2',size:.5},
    {id:'neptune',name:'海王星',au:30.07,years:164.8,radiusKm:24622,color:'#507cdb',size:.48}
  ];
  const CHAPTERS=[
    {id:'street',name:'脚下的街道',short:'地面',scale:'米',question:'如果我们慢慢升高，熟悉的街道会变成什么样？',fact:'从约 1.65 米高的人类视角出发。这是一条自建的示意街道，不是实时街景。',badge:'地面视角 · 街景示意'},
    {id:'earth-moon',name:'地球和月球',short:'地月',scale:'千米',question:'再拉远一点，找到月球：它和地球究竟相隔多远？',fact:'地月平均距离约 384,400 千米。位置采用平均间距，微小天体会放大成可见标记；月球不是自己发光。',badge:'地月系统 · 连续缩放'},
    {id:'solar',name:'太阳和八大行星',short:'太阳系',scale:'天文单位 AU',question:'找到我们的地球，数一数太阳旁边有几颗行星。',fact:'太阳是一颗恒星，八大行星围绕它公转。冥王星属于矮行星。轨道是加速的圆轨道示意，不是今日星历。',badge:'轨道分离增强 · 天体标记放大'},
    {id:'stellar',name:'太阳也是一颗星',short:'恒星邻域',scale:'光年',question:'拉远以后，太阳和其他恒星有什么不同？',fact:'太阳系缩成一个小亮点，周围还有许许多多恒星。这里的邻近恒星为程序生成的位置示意，不是真实星表。',badge:'恒星邻域 · 结构示意'},
    {id:'galaxy',name:'我们的银河系',short:'银河系',scale:'光年',question:'太阳系只是一个小亮点。银河中心藏着什么？',fact:'太阳绕银河中心一周约需 2.3 亿年。这里是银河结构的艺术示意，不是精确星表；黑洞标记不按真实大小绘制。',badge:'星系结构示意 · 位置标记'},
    {id:'universe',name:'星系之外，还有星系',short:'宇宙',scale:'百万光年',question:'每一个亮点都是一个星系，我们的银河在哪里？',fact:'许多星系组成星系群、星系团和更大的网状结构。这里用程序生成的星系与纤维说明层次，不是真实巡天数据，也不是宇宙的边界。',badge:'宇宙大尺度结构 · 非真实星图'},
    {id:'black-hole',name:'靠近黑洞',short:'黑洞实验',scale:'史瓦西半径 Rs',question:'把一颗天体样本放到黑洞附近，观察它的轨迹。',fact:'黑洞不是宇宙吸尘器。远处的天体可以绕行；近处会出现强烈潮汐。吸积盘发光，黑洞本身不发光。',badge:'近似透镜 · 非观测影像'}
  ];
  const BLACK_HOLES={sgr:{name:'银河中心 · Sgr A*',massSolar:4e6,galaxy:'银河系',imageYear:2022},m87:{name:'M87 星系 · M87*',massSolar:6.5e9,galaxy:'M87',imageYear:2019}};
  const SAMPLES={rock:{name:'岩石行星样本',massSolar:3.003e-6,radiusKm:6371,color:'#69b5db',size:.3},gas:{name:'气态巨行星样本',massSolar:.0009546,radiusKm:69911,color:'#cfa77c',size:.44},star:{name:'太阳型恒星样本',massSolar:1,radiusKm:695700,color:'#ffd085',size:.38}};
  function schwarzschildKm(massSolar){return 2*G*massSolar*MSUN/(C*C)/1000;}
  function tidalRadiusRs(kind,bh='sgr'){const sample=SAMPLES[kind],hole=BLACK_HOLES[bh];return sample.radiusKm/schwarzschildKm(hole.massSolar)*Math.cbrt(hole.massSolar/sample.massSolar);}
  function displayOrbit(au){return 1.5+6.1*Math.log1p(au);}
  function planetPosition(index,days=0){const p=PLANETS[index],angle=index*.87+days/365.25/p.years*Math.PI*2,r=displayOrbit(p.au);return{x:Math.cos(angle)*r,y:0,z:Math.sin(angle)*r};}
  // One shared floating-origin frame: every physical coordinate is divided by the
  // same smoothly changing metre/unit ratio. No scene-specific camera resets.
  const LY_M=9.4607304725808e15,KPC_M=3.085677581491367e19,EARTH_M=6371000;
  const ZOOM_STOPS=[0,1.02,2.01,3.01,4.01,5];
  const ZOOM_KEYS=[[0,Math.log10(20)],[.4,3.2],[1,7.3],[1.4,9.3],[2,13.1],[2.5,15.5],[3,18],[3.55,19.6],[4,21.0],[4.5,23.5],[5,26.5]];
  function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
  function chapterAt(value){return Math.max(0,Math.min(6,Math.floor(Number(value)||0)));}
  function zoomModel(value){
    const q=Math.max(0,Math.min(5,Number(value)||0));let i=0;while(i<ZOOM_KEYS.length-2&&q>ZOOM_KEYS[i+1][0])i++;
    const [a,la]=ZOOM_KEYS[i],[b,lb]=ZOOM_KEYS[i+1];
    // Cubic Hermite interpolation of log distance, using shared positive slopes.
    const slope=j=>j===0?(ZOOM_KEYS[1][1]-ZOOM_KEYS[0][1])/(ZOOM_KEYS[1][0]-ZOOM_KEYS[0][0]):j===ZOOM_KEYS.length-1?(ZOOM_KEYS[j][1]-ZOOM_KEYS[j-1][1])/(ZOOM_KEYS[j][0]-ZOOM_KEYS[j-1][0]):(ZOOM_KEYS[j+1][1]-ZOOM_KEYS[j-1][1])/(ZOOM_KEYS[j+1][0]-ZOOM_KEYS[j-1][0]);
    const t=(q-a)/(b-a),t2=t*t,t3=t2*t,log=(2*t3-3*t2+1)*la+(t3-2*t2+t)*(b-a)*slope(i)+(-2*t3+3*t2)*lb+(t3-t2)*(b-a)*slope(i+1);
    const distanceMeters=10**log,unitMeters=distanceMeters/20;
    return{q,logDistance:log,distanceMeters,unitMeters,
      surfaceFocus:1-smooth(.92,1.16,q),solarFocus:smooth(1.4,2.05,q),galaxyFocus:smooth(3.45,4.2,q),
      sky:smooth(.3,.95,q),
      layers:{city:1-smooth(.8,1.05,q),earth:1-smooth(2.65,3.05,q),solar:smooth(1.3,1.75,q)*(1-smooth(2.65,3.05,q)),stellar:smooth(2.2,2.65,q)*(1-smooth(3.65,4.1,q)),galaxy:smooth(3.1,3.75,q)*(1-smooth(4.5,4.85,q)),universe:smooth(3.95,4.3,q)},
      marker:smooth(1.65,2.05,q)*(1-smooth(2.45,2.9,q))};
  }
  function physicalPlanetPosition(index,days=0){const p=PLANETS[index],angle=index*.87+days/365.25/p.years*Math.PI*2,r=p.au*AU_KM*1000;return{x:Math.cos(angle)*r,y:0,z:Math.sin(angle)*r};}
  function fresh(){return{version:3,journey:0,mode:'voyage',speed:1,paused:false,labels:true,orbits:true,rays:true,bh:'sgr',launch:'drop',frame:'galactic',lens:true,disk:true,quality:'balanced'};}
  function restore(raw){try{const x=typeof raw==='string'?JSON.parse(raw):raw;if(!x||x.version!==3)return null;const s=fresh();for(const k of ['journey','speed']){if(typeof x[k]!=='number'||!Number.isFinite(x[k]))return null;s[k]=Math.max(k==='journey'?0:.25,Math.min(k==='journey'?5:4,x[k]));}for(const k of ['labels','orbits','rays','lens','disk'])s[k]=x[k]!==false;s.mode=x.mode==='hole'?'hole':'voyage';s.paused=x.paused===true;s.bh=x.bh==='m87'?'m87':'sgr';s.launch=x.launch==='orbit'?'orbit':'drop';s.frame=x.frame==='sun'?'sun':'galactic';s.quality=x.quality==='high'?'high':'balanced';return s;}catch{return null;}}
  function magnitude(v){return Math.hypot(v.x,v.y,v.z);}
  const MU=12;
  function spawn(id,kind,position,mode='drop',bh='sgr',normal={x:0,y:1,z:0}){
    const p={...position},r=magnitude(p);if(!SAMPLES[kind]||r<1.15||r>24)return null;
    let v={x:0,y:0,z:0};
    if(mode==='orbit'){
      const t={x:normal.y*p.z-normal.z*p.y,y:normal.z*p.x-normal.x*p.z,z:normal.x*p.y-normal.y*p.x};let len=magnitude(t);
      if(len<1e-6){t.x=-p.z;t.y=0;t.z=p.x;len=magnitude(t);}
      if(len<1e-6){t.x=1;t.y=0;t.z=0;len=1;}
      const vel=Math.sqrt(MU/r);v={x:t.x/len*vel,y:t.y/len*vel,z:t.z/len*vel};
    }
    return{id,kind,p,v,status:'free',age:0,tidal:tidalRadiusRs(kind,bh),history:[],captured:false};
  }
  function acceleration(p){const r=Math.max(magnitude(p),.95),s=-MU/(r*r*r);return{x:p.x*s,y:p.y*s,z:p.z*s};}
  function tickBody(body,dt){
    if(body.captured)return;
    const a=acceleration(body.p),next={x:body.p.x+body.v.x*dt+.5*a.x*dt*dt,y:body.p.y+body.v.y*dt+.5*a.y*dt*dt,z:body.p.z+body.v.z*dt+.5*a.z*dt*dt};
    const b=acceleration(next);for(const k of ['x','y','z']){body.v[k]+=.5*(a[k]+b[k])*dt;body.p[k]=next[k];}
    body.age+=dt;const r=magnitude(body.p);body.status=r<body.tidal?'tidal':'free';
    if(r<=1){body.captured=true;body.status='horizon';}
  }
  function energy(body){return .5*magnitude(body.v)**2-MU/magnitude(body.p);}
  const API={PLANETS,CHAPTERS,BLACK_HOLES,SAMPLES,AU_KM,LY_M,KPC_M,EARTH_M,ZOOM_STOPS,MU,smooth,zoomModel,physicalPlanetPosition,schwarzschildKm,tidalRadiusRs,displayOrbit,planetPosition,chapterAt,fresh,restore,magnitude,spawn,tickBody,energy};
  if(typeof module!=='undefined')module.exports=API;root.CosmosCore=API;
})(typeof globalThis!=='undefined'?globalThis:window);
