(function(){
  'use strict';
  const catalog=window.EXPERIMENT_CATALOG,frame=document.getElementById('experimentFrame'),list=document.getElementById('experimentList');
  let active=null;
  const art={
    cosmos:`<svg viewBox="0 0 200 110" aria-hidden="true"><defs><radialGradient id="cg"><stop stop-color="#ffe6a2"/><stop offset=".45" stop-color="#bc7b62"/><stop offset="1" stop-color="#12182b"/></radialGradient></defs><rect width="200" height="110" fill="#101728"/><g fill="#c6d4ed" opacity=".7"><circle cx="18" cy="22" r=".8"/><circle cx="165" cy="20" r="1"/><circle cx="44" cy="69" r=".8"/><circle cx="179" cy="85" r=".7"/><circle cx="85" cy="17" r=".8"/></g><ellipse cx="110" cy="58" rx="65" ry="13" fill="none" stroke="#9d735a" stroke-width="8" opacity=".4"/><ellipse cx="110" cy="58" rx="59" ry="8" fill="none" stroke="#e0b982" stroke-width="3"/><circle cx="110" cy="56" r="23" fill="url(#cg)"/><circle cx="110" cy="56" r="15" fill="#090d18"/><path d="M87 57a23 23 0 0 1 46 0" fill="none" stroke="#e1bd8b" stroke-width="3"/><circle cx="37" cy="89" r="12" fill="#5e8fae"/><path d="M29 82l6-3 4 8-4 7-7-5" fill="#99b5a5"/></svg>`,
    mechanics:`<svg viewBox="0 0 200 110" aria-hidden="true"><rect width="200" height="110" fill="#e2f1ef"/><path d="M0 94H200V110H0Z" fill="#d7e0c9"/><g fill="none" stroke="#bd925d" stroke-width="7" stroke-linecap="round"><path d="M45 20L27 94M45 20L61 94M160 20L143 94M160 20L179 94M36 20H170"/></g><circle cx="109" cy="41" r="15" fill="#eef4ed" stroke="#819ca6" stroke-width="3"/><path d="M94 41V63M124 41V72" stroke="#a98e61" stroke-width="2"/><path d="M78 81L81 66L96 59L109 70L108 82Z" fill="#d9b756"/><path d="M115 74H134L131 88H118Z" fill="#cda66d"/><path d="M76 80L94 62L110 81Q94 89 76 80Z" fill="none" stroke="#a78c53"/><circle cx="44" cy="20" r="2" fill="#826742"/></svg>`,
    light:`<svg viewBox="0 0 200 110" aria-hidden="true"><rect width="200" height="110" fill="#e9edf9"/><path d="M0 90L142 44L200 65V110H0Z" fill="#d3deec"/><path d="M20 110L160 56M65 110L181 65M112 110L200 78M0 98L165 98M41 81L193 91" stroke="#bdccdd" fill="none"/><path d="M50 26L109 98M50 26L152 84M50 26L135 67" stroke="#efd18b" opacity=".7" fill="none"/><ellipse cx="128" cy="89" rx="30" ry="9" fill="#65728c" opacity=".28"/><path d="M111 89L106 82L109 78L115 81L113 70Q115 66 118 70L121 79L121 65Q124 60 126 65L126 78L129 66Q133 64 134 69L132 80L137 73Q141 72 141 76L135 89Z" fill="#34405a" opacity=".55"/><g transform="translate(-1 -24)"><path d="M102 89L97 82L100 78L106 81L104 70Q106 66 109 70L112 79L112 65Q115 60 117 65L117 78L120 66Q124 64 125 69L123 80L128 73Q132 72 132 76L126 89Z" fill="#edbb9d" stroke="#d9a386"/></g><circle cx="50" cy="26" r="13" fill="#f8e7b1" opacity=".5"/><circle cx="50" cy="26" r="7" fill="#fff4cb" stroke="#dbb85a"/><path d="M50 10V6M34 26H29M62 14L66 10M65 26H70" stroke="#c5ac64" stroke-width="1.5"/></svg>`
  };
  function openExperiment(id){
    const experiment=catalog.find(e=>e.id===id);if(!experiment)return false;
    if(active===id)return true;
    frame.contentWindow?.postMessage({type:'lab:leave'},'*');active=id;
    document.getElementById('frameLoading').hidden=false;
    frame.src=experiment.entry+'?embed=1';frame.title=experiment.title+'互动实验';
    document.getElementById('currentExperimentTitle').textContent=experiment.title;
    document.title='童话实验室 · '+experiment.title;
    document.querySelectorAll('[data-open-experiment]').forEach(b=>{const yes=b.dataset.openExperiment===id;b.classList.toggle('active',yes);b.setAttribute('aria-current',yes?'page':'false');b.querySelector('.current').textContent=yes?'正在探索':'可开始';});
    try{localStorage.setItem('fairytale-lab.active.v2',id);}catch{}
    return true;
  }
  catalog.forEach((e,i)=>{const b=document.createElement('button');b.className='experiment-entry';b.dataset.openExperiment=e.id;b.innerHTML=`<span class="thumbnail">${art[e.theme]||art.light}</span><span class="entry-info"><small>实验 ${String(i+1).padStart(2,'0')}<span class="current"></span></small><b></b><span class="entry-subtitle"></span></span>`;b.querySelector('b').textContent=e.title;b.querySelector('.entry-subtitle').textContent=e.subtitle;b.addEventListener('click',()=>openExperiment(e.id));list.appendChild(b);});
  document.getElementById('experimentTotal').textContent=catalog.length;
  frame.addEventListener('load',()=>document.getElementById('frameLoading').hidden=true);
  window.addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;if(e.data?.type==='lab:navigate')openExperiment(e.data.id);});
  document.getElementById('shellHelp').addEventListener('click',()=>frame.contentWindow.postMessage({type:'lab:help'},'*'));
  document.getElementById('shellFullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
  const query=new URLSearchParams(location.search).get('experiment');let previous=null;try{previous=localStorage.getItem('fairytale-lab.active.v2');}catch{}
  openExperiment(catalog.some(e=>e.id===query)?query:catalog.some(e=>e.id===previous)?previous:'cosmic-voyage');
  window.LabShell={version:'3.1.0',openExperiment,snapshot:()=>({active,experiments:catalog.map(e=>({id:e.id,title:e.title}))})};
})();
