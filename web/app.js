(function () {
  'use strict';
  const C = window.LabCore, $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'fairytale-lab.mouse-strongman.v1';
  let stored = null;
  try { stored = C.restored(localStorage.getItem(STORAGE_KEY)); } catch { /* Storage is optional. */ }
  let state = stored || C.fresh(), selected = null, filter = 'all', busy = false, leverProgress = 0;
  let drag = null, looseID = 0, toastTimer, saveTime = 0, dismissedSuccess = !!stored?.everGold;
  let lastGold = state.everGold, lastFrame = performance.now(), saveWarning = false;
  const steps = [
    ['先放网兜、支点石和木棒', '先铺好网兜，再把支点石和木棒放到石头旁边'],
    ['装好 4 根支腿，再装横梁与滑轮', '两两成 A 字，先有支腿，再有横梁和定滑轮'],
    ['放好竹篮，再把粗绳接到滑轮上', '粗绳绕过定滑轮，一端系网兜，一端系竹篮'],
    ['开始实验，再往竹篮里加石子', '看看要加多少颗小石子，大石头才会离开地面？']
  ];
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3300); }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { if (!saveWarning) { saveWarning = true; toast('当前环境不能自动保存；你仍可导出实验记录。'); } }
  }
  function fmt(n) { return Number(n).toFixed(1); }
  function el(tag, attrs = {}, text) { const node = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs)) node.setAttribute(k,v); if (text !== undefined) node.textContent = text; return node; }
  function woodLine(x1,y1,x2,y2,w=18) {
    return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#7c5b36" stroke-width="${w+3}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="url(#wood)" stroke-width="${w}" stroke-linecap="round"/><path d="M${x1-2} ${y1+2}L${x2-2} ${y2-6}" stroke="#e6c28b" stroke-opacity=".5" stroke-width="2"/>`;
  }
  const legEndpoints = {leg1:[347,145,259,497],leg2:[347,145,414,497],leg3:[879,145,798,497],leg4:[879,145,973,497]};
  function framePart(id) {
    if (legEndpoints[id]) { const a=legEndpoints[id]; return woodLine(...a,18)+`<circle cx="${a[0]}" cy="${a[1]+12}" r="4" fill="#7b6546"/>`; }
    if(id==='beam')return `<path d="M296 117L909 117L925 130L925 149H296Z" fill="#986e40" stroke="#835d37" stroke-width="2"/><path d="M296 117H909L925 130H310Z" fill="#dab887"/><path d="M310 130H925V149H310Z" fill="url(#wood)"/><path d="M330 137Q470 143 558 137T882 139" fill="none" stroke="#e4c391" stroke-width="2" opacity=".6"/><circle cx="347" cy="138" r="4" fill="#78603c"/><circle cx="880" cy="138" r="4" fill="#78603c"/>`;
    return '';
  }
  function wheel(height=0) {
    return `<path d="M620 143V155" stroke="#6b8290" stroke-width="9"/><path d="M610 152Q620 144 630 152L632 169H608Z" fill="#6e8995"/><circle cx="620" cy="215" r="65" fill="#d0dfe1" stroke="#657e8c" stroke-width="6"/><circle cx="620" cy="215" r="56" fill="#edf2eb" stroke="#a5babd" stroke-width="3"/><g transform="rotate(${height*8/65*180/Math.PI} 620 215)" stroke="#acbfc2" stroke-width="9"><path d="M620 161V269M566 215H674M582 177L658 253M582 253L658 177"/></g><circle cx="620" cy="215" r="15" fill="#7c949d" stroke="#526e7a" stroke-width="3"/><circle cx="620" cy="215" r="5" fill="#e9f0ed"/>`;
  }
  function rock(cx, bottom, gold=false) {
    return `<g transform="translate(${cx} ${bottom})"><ellipse cx="0" cy="3" rx="68" ry="6" fill="#6b8592" opacity=".14"/><path d="M-65-22L-57-63L-27-85L15-90L51-66L66-31L51-5L-20 0L-55-7Z" fill="url(#${gold?'gold':'rock'})" stroke="${gold?'#bd912d':'#6f8795'}" stroke-width="2"/><path d="M-57-63L-17-54L15-90M-17-54L-22-9M-17-54L29-40L51-66M29-40L51-5" stroke="${gold?'#ffe8a0':'#c2cdd3'}" stroke-width="2" fill="none" opacity=".6"/><path d="M-41-39l12-5m52 21 13-6" stroke="${gold?'#bd922b':'#6b8492'}" stroke-width="2" stroke-linecap="round" opacity=".6"/></g>`;
  }
  function net(cx, bottom, loaded) {
    if (!loaded) return `<g transform="translate(${cx} ${bottom})" stroke="#a18c62" fill="none" stroke-width="2"><ellipse rx="77" ry="12"/><path d="M-70-5L44 8M-44-9L68 5M-15-11L76 0M-73 3L34-9M-53 9L65-4M-20 12L76 2"/><path d="M-77 0l-20-4m174 4 20-4"/></g>`;
    let s=`<path d="M${cx} ${bottom-118}L${cx-75} ${bottom-18}Q${cx} ${bottom+17} ${cx+75} ${bottom-18}Z" fill="none" stroke="#9a8255" stroke-width="3"/>`;
    for(let i=-2;i<=2;i++)s+=`<path d="M${cx+i*22} ${bottom-62+Math.abs(i)*12}L${cx-i*18} ${bottom+1-Math.abs(i)*4}" fill="none" stroke="#b19a6d" stroke-width="2"/>`;
    s+=`<path d="M${cx-68} ${bottom-28}Q${cx} ${bottom-3} ${cx+68} ${bottom-28}M${cx-52} ${bottom-49}Q${cx} ${bottom-25} ${cx+52} ${bottom-49}" fill="none" stroke="#bba47a" stroke-width="2"/><circle cx="${cx}" cy="${bottom-118}" r="5" fill="#967d53"/>`;
    return s;
  }
  function basket(bottom, count=0, cx=685) {
    let pebbles='';
    const n=Math.min(26,count);
    for(let i=0;i<n;i++) { const x=cx-30+(i%5)*14,y=bottom-50-Math.floor(i/5)*7; pebbles+=`<path d="M${x-8} ${y}l2-9 8-4 8 7-3 8Z" fill="${['#90a4af','#b1c0c7','#7f97a4'][i%3]}" stroke="#718b97" stroke-width="1"/>`; }
    return `<g><path d="M${cx} ${bottom-96}Q${cx-34} ${bottom-90} ${cx-42} ${bottom-59}M${cx} ${bottom-96}Q${cx+34} ${bottom-90} ${cx+42} ${bottom-59}" fill="none" stroke="#a07d47" stroke-width="3"/><ellipse cx="${cx}" cy="${bottom-58}" rx="48" ry="11" fill="#9c7b4e"/>${pebbles}<path d="M${cx-48} ${bottom-58}L${cx-38} ${bottom-5}Q${cx} ${bottom+7} ${cx+38} ${bottom-5}L${cx+48} ${bottom-58}Q${cx} ${bottom-43} ${cx-48} ${bottom-58}Z" fill="url(#basket)" stroke="#9e7846" stroke-width="2"/><path d="M${cx-48} ${bottom-58}L${cx-38} ${bottom-5}Q${cx} ${bottom+7} ${cx+38} ${bottom-5}L${cx+48} ${bottom-58}Q${cx} ${bottom-43} ${cx-48} ${bottom-58}Z" fill="url(#weave)"/><path d="M${cx-46} ${bottom-52}Q${cx} ${bottom-38} ${cx+46} ${bottom-52}M${cx-43} ${bottom-39}Q${cx} ${bottom-27} ${cx+43} ${bottom-39}M${cx-41} ${bottom-25}Q${cx} ${bottom-13} ${cx+41} ${bottom-25}" fill="none" stroke="#e3c491" stroke-width="2"/>${count>0?`<text x="${cx}" y="${bottom-17}" text-anchor="middle" font-size="17" font-family="Segoe UI" font-weight="700" fill="#715533">${count}</text>`:''}</g>`;
  }
  function icon(kind) {
    const icons={
      leg:'<path d="M33 51L59 12" stroke="#82603d" stroke-width="12" stroke-linecap="round"/><path d="M33 50L59 12" stroke="#c79b65" stroke-width="9" stroke-linecap="round"/><path d="M34 46L54 14" stroke="#e4c18e" stroke-width="1.4"/>',
      beam:'<path d="M13 34L81 23L86 32L17 44Z" fill="#c39965" stroke="#91693e" stroke-width="1.4"/><path d="M17 38L80 28M29 38L65 32" stroke="#e6c492" stroke-width="1.5"/>',
      lever:'<path d="M9 43L86 24" stroke="#8c673d" stroke-width="7" stroke-linecap="round"/><path d="M10 41L86 22" stroke="#cba46f" stroke-width="5" stroke-linecap="round"/>',
      fulcrum:'<path d="M24 49L31 30L47 21L65 29L74 47L57 53Z" fill="#a1b1ba" stroke="#7f97a5" stroke-width="1.5"/><path d="M31 30L50 38L47 21M50 38L57 53" stroke="#c3cfd5" fill="none" stroke-width="1.5"/>',
      net:'<g fill="none" stroke="#ac966f" stroke-width="1.7"><path d="M17 46L48 13L79 46Q48 61 17 46ZM48 13L40 53M48 13L57 53M26 36Q48 48 70 36M20 43Q48 56 76 43"/><circle cx="48" cy="12" r="3"/></g>',
      pulley:'<path d="M48 5V14" stroke="#8199a4" stroke-width="4"/><circle cx="48" cy="35" r="22" fill="#dee7e5" stroke="#7894a0" stroke-width="3"/><path d="M28 35H68M48 15V55M34 20L62 50M34 50L62 20" stroke="#a7bcbf" stroke-width="3"/><circle cx="48" cy="35" r="6" fill="#7b959e"/>',
      rope:'<g fill="none" stroke="#aa8d60" stroke-width="3.4" stroke-linecap="round"><path d="M22 48Q9 29 27 16Q44 8 56 24Q68 44 50 50Q35 55 30 41Q23 24 42 23Q58 24 59 40Q57 54 76 51"/><path d="M19 51L10 49M76 51L84 46"/></g>',
      basket:'<path d="M26 27Q48-4 70 27" fill="none" stroke="#aa8750" stroke-width="3"/><ellipse cx="48" cy="30" rx="26" ry="6" fill="#b28e57"/><path d="M22 30L28 53Q48 61 68 53L74 30Q48 40 22 30Z" fill="#d0ab70" stroke="#a5824a" stroke-width="2"/><path d="M25 39Q48 47 71 39M27 46Q48 54 69 46M37 35L39 56M49 36V57M61 34L59 56" stroke="#a5824a" fill="none" stroke-width="1.2"/>',
      pebble:'<path d="M23 46L27 25L48 14L67 20L77 43L61 54L36 53Z" fill="#a9bac3" stroke="#7e98a6" stroke-width="2"/><path d="M27 25L46 35L48 14M46 35L61 54" fill="none" stroke="#d2dce0" stroke-width="2"/>'
    };
    return `<svg viewBox="0 0 96 64" aria-hidden="true">${icons[kind]||''}</svg>`;
  }
  function available(kind) {
    const part=C.PARTS.find(p=>p.kind===kind);
    return part.count-state.installed.filter(id=>C.SLOTS.find(s=>s.id===id).kind===kind).length-state.loose.filter(p=>p.kind===kind).length;
  }
  function renderParts() {
    $('partsList').innerHTML=C.PARTS.filter(p=>filter==='all'||p.category===filter).map(p=>{
      const qty=available(p.kind), used=qty===0;
      return `<button class="part-card ${used?'used':''} ${selected===p.kind?'selected':''}" data-kind="${p.kind}" aria-label="${p.label}，剩余 ${qty} 个。${p.note}" aria-pressed="${selected===p.kind}" ${used||busy?'disabled':''}><span class="part-qty ${used?'installed-mark':''}">${used?'✓':'×'+qty}</span>${icon(p.kind)}<strong>${p.label}</strong></button>`;
    }).join('');
    $('partCount').textContent=`${state.installed.length} / 11 已安装`;
  }
  function ghostShape(slot) {
    const cls='class="ghost-stroke"';
    if(legEndpoints[slot.id]) {const a=legEndpoints[slot.id];return `<path d="M${a[0]} ${a[1]}L${a[2]} ${a[3]}" ${cls} stroke-linecap="round" style="stroke-width:16"/>`;}
    if(slot.id==='beam')return `<rect x="296" y="119" width="629" height="30" rx="4" ${cls}/>`;
    if(slot.id==='pulley')return `<path d="M620 149V153" ${cls}/><circle cx="620" cy="215" r="65" ${cls}/>`;
    if(slot.id==='net')return `<ellipse cx="555" cy="490" rx="77" ry="15" ${cls}/>`;
    if(slot.id==='lever')return `<path d="M231 440L507 494" ${cls} style="stroke-width:10;fill:none"/>`;
    if(slot.id==='fulcrum')return `<path d="M367 498L377 475L392 470L412 498Z" ${cls}/>`;
    if(slot.id==='basket')return `<path d="M640 282L648 334Q685 348 722 334L730 282M643 281Q685 265 727 281M652 279Q685 217 718 279" ${cls}/>`;
    return `<path d="M555 382V215A65 65 0 0 1 685 215V244" ${cls} style="fill:none;stroke-width:4"/><rect x="593" y="339" width="54" height="42" rx="8" ${cls}/><path d="M605 350L635 368M635 350L605 368" stroke="#91b7ba" stroke-width="2"/>`;
  }
  function renderGhosts() {
    const show=$('guidesToggle').checked;
    $('ghostLayer').innerHTML='';
    for(const slot of C.SLOTS) {
      if(state.installed.includes(slot.id))continue;
      const matching=selected===slot.kind, can=C.canInstall(state,slot);
      const inStage=(C.stage(state)===0?['net','fulcrum','lever'].includes(slot.id):C.stage(state)===1?['leg','beam','pulley'].includes(slot.kind):['basket','rope'].includes(slot.id));
      if(!show&&!matching)continue;
      const g=el('g', {class:`slot ${can?'available':'locked'} ${matching?'selected-target':''}`, 'data-slot':slot.id, role:'button',tabindex:'0','aria-label':`吸附位置：${slot.label}${can?'':'，请先安装关联零件'}`,opacity:matching?1:inStage?.85:.23});
      g.innerHTML=`<title>${slot.label} · ${can?'拖入对应零件':dependencyMessage(slot)}</title>${ghostShape(slot)}`;
      if(matching||inStage) {
        const y=slot.id==='net'?525:slot.id==='fulcrum'?522:slot.id==='lever'?425:slot.id==='beam'?103:slot.id==='pulley'?219:slot.id==='rope'?395:slot.y;
        const text=el('text',{x:slot.x,y,'text-anchor':'middle','pointer-events':'none'},slot.kind==='leg'?'支腿':slot.label);g.appendChild(text);
      }
      // A generous transparent target supports mouse, touch and keyboard assembly.
      g.appendChild(el('circle',{cx:slot.x,cy:slot.y,r:slot.kind==='leg'?35:slot.id==='beam'?40:28,fill:'transparent'}));
      $('ghostLayer').appendChild(g);
    }
  }
  function renderFrame() {
    $('frameLayer').innerHTML=['leg1','leg3','leg2','leg4','beam'].filter(id=>state.installed.includes(id)).map(id=>`<g class="installed-part">${framePart(id)}</g>`).join('');
  }
  function renderLoads() {
    const h=state.height*8, progress=state.leverDone?1:leverProgress;
    const stoneX=455+100*progress, stoneBottom=500-h-Math.sin(progress*Math.PI)*48;
    let lever='';
    if(state.installed.includes('fulcrum'))lever+=`<path d="M367 498L377 475L392 470L412 498Z" fill="url(#rock)" stroke="#7c929e" stroke-width="2"/><path d="M377 475L390 485L412 498" stroke="#becad1" fill="none" stroke-width="2"/>`;
    if(state.installed.includes('lever'))lever+=`<g transform="rotate(${-20*progress} 390 479)" opacity="${state.leverDone?.72:1}">${woodLine(231,448,507,500,9)}</g>`;
    $('leverLayer').innerHTML=lever;
    const netPlaced=state.installed.includes('net');
    let load=netPlaced&&!state.leverDone?net(555,500,false):'';
    if(state.everGold)load+=`<ellipse cx="${stoneX}" cy="${stoneBottom-43}" rx="80" ry="65" fill="#f4d36b" opacity=".35" filter="url(#goldGlow)"/>`;
    load+=`<g id="bigStone"><title>大石头，${fmt(state.settings.stoneMass)} kg</title>${rock(stoneX,stoneBottom,state.everGold)}</g>`;
    if(netPlaced&&state.leverDone)load+=net(555,500-h,true);
    if(state.installed.includes('basket'))load+=`<g id="basketLoad" data-basket="true" role="button" tabindex="0" aria-label="竹篮，${state.count} 颗小石子，点击加入一颗">${basket(340+h,state.count)}</g>`;
    $('loadLayer').innerHTML=load;
    let rope='';
    if(state.installed.includes('pulley'))rope+=wheel(state.height);
    if(state.installed.includes('rope'))rope+=`<path d="M555 ${382-h}V215A65 65 0 0 1 685 215V${244+h}" fill="none" stroke="#92794e" stroke-width="5" stroke-linecap="round"/><path d="M555 ${382-h}V215A65 65 0 0 1 685 215V${244+h}" fill="none" stroke="#cfb47d" stroke-width="2" stroke-linecap="round"/><circle cx="685" cy="${244+h}" r="4" fill="#94794d"/>`;
    $('ropeLayer').innerHTML=rope;
    $('heightMarker').setAttribute('transform',`translate(0 ${-h})`);
    $('sparkles').setAttribute('visibility',state.everGold?'visible':'hidden');
    $('sparkles').setAttribute('transform',`translate(0 ${80-h})`);
  }
  function renderLoose() {
    $('looseLayer').innerHTML=state.loose.map(p=>`<g class="loose-part" data-loose="${p.id}" role="button" tabindex="0" aria-label="未安装的${C.PARTS.find(x=>x.kind===p.kind).label}，可继续拖动" transform="translate(${p.x-48} ${p.y-32})">${icon(p.kind).replace('<svg ','<svg width="96" height="64" ')}</g>`).join('');
  }
  function renderMetrics() {
    $('heightValue').textContent=fmt(state.height);$('heightFill').style.width=`${state.height/20*100}%`;
    $('basketMass').textContent=fmt(C.mass(state));$('stoneMass').textContent=fmt(state.settings.stoneMass);
    $('pebbleMassLabel').textContent=`每颗 ${fmt(state.settings.pebbleMass)} kg`;$('pebbleCount').textContent=state.count;
    const bal=C.balance(state), ready=C.ready(state), status=$('balanceStatus');status.className=`balance-status ${ready?bal:''}`;
    status.textContent=!ready?'等待组装完成':bal==='balanced'?'两边一样重 · 平衡':bal==='heavier'?'篮中更重 · 大石头可上升':'篮中更轻 · 大石头不能被拉起';
    $('addBtn').disabled=!ready||busy||state.count>=C.MAX_PEBBLES;$('removeBtn').disabled=!ready||busy||state.count===0;$('pebbleSource').disabled=!ready||busy||state.count>=C.MAX_PEBBLES;
    $('successBanner').hidden=!state.everGold||dismissedSuccess;
  }
  function renderUI() {
    const stage=C.stage(state), ready=C.ready(state);
    document.querySelectorAll('[data-step]').forEach(btn=>{const n=+btn.dataset.step;btn.parentElement.className=n<stage?'complete':n===stage?'current':'';btn.querySelector('.step-num').textContent=n<stage?'✓':n+1;btn.setAttribute('aria-current',n===stage?'step':'false');});
    $('taskText').textContent=steps[stage][0];$('sceneMessageText').textContent=steps[stage][1];
    const bubble=state.everGold?['“不是力气大，','是办法好！”']:stage===0?['“给我一个支点，','我们一起试试看！”']:stage===1?['“用四根短木头，','搭个稳稳的架子！”']:stage===2?['“绳子两端系牢，','准备加小石子！”']:['“大家一起加石子，','看看石头会动吗？”'];
    $('mouseBubble').querySelectorAll('text').forEach((text,i)=>text.textContent=bubble[i]);
    $('selectionHint').hidden=!selected;
    if(selected)$('selectionHint').textContent=`已选 ${C.PARTS.find(p=>p.kind===selected).label} · 点虚线位置，或直接拖动`;
    const action=$('mainAction');
    action.disabled=busy||(!ready&&!(stage===0&&C.leverReady(state)));
    action.innerHTML=busy?'正在搭建…':ready?state.running?'暂停观察 <span>Ⅱ</span>':state.height>0||state.count>0?'继续实验 <span>▶</span>':'开始实验 <span>▶</span>':stage===0?'压下木棒 <span>↓</span>':stage===1?'继续搭好架子 <span>↗</span>':'连接绳与竹篮 <span>↗</span>';
    $('quickBuildBtn').disabled=busy||ready;$('quickBuildBtn').textContent=ready?'装置已就绪 ✓':'快速搭建 ↗';
    $('undoBtn').disabled=busy||state.running||state.count>0||!undoCandidate();
    $('resetBtn').disabled=busy;$('settingsBtn').disabled=busy;
    if(stage===0){$('scienceTitle').textContent='聪明的第一步';$('scienceText').textContent='支点靠近大石头，压下木棒较长的一端，撬动石头更省力。';}
    else{$('scienceTitle').textContent='定滑轮不省力';$('scienceText').textContent='它改变用力方向。篮中石子比大石头更重时，大石头才能从静止开始上升。';}
    $('bottomHint').innerHTML=stage===0?'<span>小提示</span> 支点越靠近大石头，木棒的长端越省力。':stage===1?'<span>小提示</span> 4 根短支腿两两组成 A 字，长横梁连接两端，轮子固定在横梁上。':stage===2?'<span>小提示</span> 粗绳绕过滑轮后，会自动系好网兜和竹篮两端。':state.running?'<span>正在运行</span> 点击 ＋ 或拖石子入篮。两端运动距离相同、方向相反。':'<span>已锁止</span> 可以先加石子作预测，再点击开始 / 继续实验。';
    renderParts();renderGhosts();renderMetrics();
  }
  function renderAll() {renderFrame();renderLoads();renderLoose();renderUI();}
  function dependencyMessage(slot) {
    const missing=slot.requires.filter(id=>!state.installed.includes(id)).map(id=>C.SLOTS.find(s=>s.id===id).label);
    if(missing.length)return '请先安装'+missing.join('、');
    if(slot.id==='rope'&&!state.leverDone)return '请先压下木棒，把大石头翻进网兜';
    return '把对应零件拖到这里';
  }
  function install(slot, loose=null, silent=false) {
    if(!C.canInstall(state,slot)) { if(!silent)toast(dependencyMessage(slot));return false; }
    state.installed.push(slot.id);
    if(loose)state.loose=state.loose.filter(p=>p.id!==loose.id);
    selected=available(slot.kind)>0?slot.kind:null;
    renderAll();save();if(!silent)toast(`${slot.label}吸附成功${C.ready(state)?'，可以开始实验了！':' ✓'}`);return true;
  }
  function select(kind) {if(busy||available(kind)<=0)return;selected=selected===kind?null:kind;renderUI();}
  function svgPoint(clientX,clientY) {const pt=$('scene').createSVGPoint();pt.x=clientX;pt.y=clientY;return pt.matrixTransform($('scene').getScreenCTM().inverse());}
  function nearest(kind,p) {return C.SLOTS.filter(s=>s.kind===kind&&!state.installed.includes(s.id)).map(s=>({slot:s,d:Math.hypot(s.x-p.x,s.y-p.y)})).sort((a,b)=>a.d-b.d)[0];}
  function beginDrag(event,kind,loose=null) {
    if(busy||event.button>0||(kind==='pebble'?!C.ready(state):!loose&&available(kind)<=0))return;
    event.preventDefault();drag={kind,loose,startX:event.clientX,startY:event.clientY,moved:false};
  }
  document.addEventListener('pointermove',event=>{
    if(!drag)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5)return;
    drag.moved=true;
    const preview=$('dragPreview');preview.hidden=false;preview.style.left=event.clientX+'px';preview.style.top=event.clientY+'px';preview.innerHTML=icon(drag.kind);
    const p=svgPoint(event.clientX,event.clientY), near=nearest(drag.kind,p);
    document.querySelectorAll('.slot').forEach(s=>s.classList.toggle('focused',!!near&&near.slot.id===s.dataset.slot&&near.d<95));
  });
  document.addEventListener('pointerup',event=>{
    if(!drag)return;const d=drag;drag=null;$('dragPreview').hidden=true;
    document.querySelectorAll('.slot.focused').forEach(s=>s.classList.remove('focused'));
    if(!d.moved){if(d.kind==='pebble')changeCount(1);else if(d.loose)toast('继续拖动这个零件到虚线吸附位置。');else select(d.kind);return;}
    const p=svgPoint(event.clientX,event.clientY), inside=p.x>=0&&p.x<=1100&&p.y>=0&&p.y<=600;
    if(d.kind==='pebble') {
      if(inside&&Math.hypot(p.x-685,p.y-(300+state.height*8))<100)changeCount(1);
      else toast('把小石子拖进右边的竹篮里。');return;
    }
    if(!inside){toast('零件已放回原处；拖进实验场景即可。');return;}
    const near=nearest(d.kind,p);
    if(near&&near.d<95&&install(near.slot,d.loose))return;
    if(d.loose){d.loose.x=p.x;d.loose.y=p.y;}
    else state.loose.push({id:++looseID,kind:d.kind,x:Math.max(48,Math.min(1052,p.x)),y:Math.max(32,Math.min(535,p.y))});
    selected=null;renderAll();save();toast('零件暂放在这里，继续拖到对应虚线处就能吸附。');
  });
  document.addEventListener('pointercancel',()=>{drag=null;$('dragPreview').hidden=true;document.querySelectorAll('.slot.focused').forEach(s=>s.classList.remove('focused'));});
  $('partsList').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-kind]');if(b)beginDrag(e,b.dataset.kind);});
  $('partsList').addEventListener('click',e=>{if(e.detail===0){const b=e.target.closest('[data-kind]');if(b)select(b.dataset.kind);}});
  $('pebbleSource').addEventListener('pointerdown',e=>beginDrag(e,'pebble'));
  $('pebbleSource').addEventListener('click',e=>{if(e.detail===0)changeCount(1);});
  $('scene').addEventListener('pointerdown',e=>{const loose=e.target.closest('[data-loose]');if(loose){const p=state.loose.find(x=>x.id===+loose.dataset.loose);beginDrag(e,p.kind,p);}});
  function activateSlot(node) {
    if(busy)return;const slot=C.SLOTS.find(s=>s.id===node.dataset.slot);
    if(!selected){toast(`这里放${slot.label}。请先从零件盒点选或拖动零件。`);return;}
    if(selected!==slot.kind){toast(`这里需要${slot.label}，不是${C.PARTS.find(p=>p.kind===selected).label}。`);return;}
    const loose=state.loose.find(p=>p.kind===selected);install(slot,loose);
  }
  $('scene').addEventListener('click',e=>{const slot=e.target.closest('[data-slot]');if(slot)activateSlot(slot);else if(e.target.closest('[data-basket]'))changeCount(1);else if(e.target.closest('#bigStone'))toast('石头太重了！用木棒和支点把它撬进网兜吧。');});
  $('scene').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const slot=e.target.closest('[data-slot]');if(slot){e.preventDefault();activateSlot(slot);}else if(e.target.closest('[data-basket]')){e.preventDefault();changeCount(1);}else if(e.target.closest('[data-loose]')){e.preventDefault();const p=state.loose.find(p=>p.id===+e.target.closest('[data-loose]').dataset.loose);selected=p.kind;renderUI();toast('已选暂放零件，点击对应的虚线位置安装。');}}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;drag=null;$('dragPreview').hidden=true;renderUI();}});
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  async function pressLever(internal=false) {
    if((busy&&!internal)||state.leverDone||!C.leverReady(state))return;
    busy=true;selected=null;renderUI();
    const start=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?150:1000;
    await new Promise(resolve=>{function animate(now){leverProgress=Math.min(1,(now-start)/duration);leverProgress=1-Math.pow(1-leverProgress,3);renderLoads();if(now-start<duration)requestAnimationFrame(animate);else resolve();}requestAnimationFrame(animate);});
    state.leverDone=true;leverProgress=0;busy=internal;renderAll();save();if(!internal)toast('大石头翻进网兜了！接着搭好架子。');
  }
  async function quickBuild() {
    if(busy||C.ready(state))return;busy=true;selected=null;renderUI();
    const add=async id=>{if(state.installed.includes(id))return;const slot=C.SLOTS.find(s=>s.id===id);install(slot,state.loose.find(p=>p.kind===slot.kind),true);await wait(170);};
    for(const id of ['net','fulcrum','lever'])await add(id);
    if(!state.leverDone)await pressLever(true);
    for(const id of ['leg1','leg2','leg3','leg4','beam','pulley','basket','rope'])await add(id);
    busy=false;renderAll();save();toast('装置搭好了！点击开始实验，再往竹篮里加石子。');
  }
  function record(operation) {
    state.records.push({operation,count:state.count,mass:C.mass(state),height:+state.height.toFixed(2),stoneMass:state.settings.stoneMass,pebbleMass:state.settings.pebbleMass,time:new Date().toISOString()});
    if(state.records.length>200)state.records.shift();
  }
  function changeCount(delta) {
    if(busy||!C.ready(state))return;
    const n=Math.max(0,Math.min(C.MAX_PEBBLES,state.count+delta));if(n===state.count)return;
    state.count=n;record(delta>0?'加入一颗':'取出一颗');renderUI();renderLoads();save();
    if(!state.running&&delta>0&&state.count===1)toast('已放入 1 颗。点击“继续实验”，解除锁止后观察运动。');
  }
  function undoCandidate() {
    if(state.loose.length)return {loose:state.loose.at(-1)};
    const id=state.installed.at(-1);if(!id)return null;
    if(state.leverDone&&['net','fulcrum','lever'].includes(id))return null;
    if(C.SLOTS.some(s=>state.installed.includes(s.id)&&s.requires.includes(id)))return null;
    return {id};
  }
  function clearLoad() {
    state.count=0;state.height=0;state.velocity=0;state.running=false;state.everGold=false;lastGold=false;dismissedSuccess=false;record('清空并复位');renderAll();save();
  }
  $('undoBtn').addEventListener('click',()=>{const item=undoCandidate();if(!item||busy||state.running||state.count)return;if(item.loose)state.loose=state.loose.filter(p=>p!==item.loose);else state.installed=state.installed.filter(id=>id!==item.id);selected=null;state.height=0;state.velocity=0;renderAll();save();toast('已撤销上一次放置。');});
  $('mainAction').addEventListener('click',()=>{if(busy)return;if(!state.leverDone)pressLever();else if(C.ready(state)){state.running=!state.running;if(!state.running)state.velocity=0;record(state.running?'开始 / 继续':'暂停锁止');renderUI();save();}});
  $('addBtn').addEventListener('click',()=>changeCount(1));$('removeBtn').addEventListener('click',()=>changeCount(-1));$('quickBuildBtn').addEventListener('click',quickBuild);
  $('guidesToggle').addEventListener('change',renderGhosts);
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));renderParts();}));
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>toast(steps[+b.dataset.step][1])));
  $('successClose').addEventListener('click',()=>{dismissedSuccess=true;renderMetrics();});
  function openDialog(id) {if(state.running){state.running=false;state.velocity=0;record('打开面板，暂停锁止');renderUI();save();}$(id).showModal();}
  $('helpBtn').addEventListener('click',()=>openDialog('helpDialog'));
  $('libraryBtn').addEventListener('click',()=>openDialog('libraryDialog'));
  // The catalog is data-driven, not a row of nonfunctional future-experiment cards.
  const catalog=window.EXPERIMENT_CATALOG;
  const catalogParent=$('openCurrent').parentElement;
  const template=$('openCurrent');
  catalog.forEach((experiment,i)=>{
    const button=template.cloneNode(true);button.removeAttribute('id');button.dataset.experiment=experiment.id;
    button.querySelector('.experiment-number').textContent=String(i+1).padStart(2,'0');
    button.querySelector('h3').textContent=experiment.title;button.querySelector('p').textContent=experiment.subtitle;
    button.querySelector('span:last-child').textContent=experiment.id===state.experiment?'继续实验 →':'打开实验 →';
    button.addEventListener('click',()=>{if(experiment.id===state.experiment)$('libraryDialog').close();else if(window.parent!==window)window.parent.postMessage({type:'lab:navigate',id:experiment.id},'*');else window.location.href=experiment.entry;});
    catalogParent.insertBefore(button,template);
  });
  template.remove();document.querySelector('.tiny-count').textContent=catalog.length;
  $('workbenchNav').addEventListener('click',()=>$('sceneWrap').scrollIntoView({block:'center',behavior:'smooth'}));
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();openDialog('libraryDialog');});
  $('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口不支持网页全屏，可以最大化桌面窗口。');}});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('settingsBtn').addEventListener('click',()=>{const form=$('settingsForm');form.elements.stoneMass.value=state.settings.stoneMass;form.elements.pebbleMass.value=state.settings.pebbleMass;openDialog('settingsDialog');});
  $('settingsForm').addEventListener('submit',e=>{e.preventDefault();const f=e.target;if(!f.reportValidity())return;state.settings.stoneMass=+f.elements.stoneMass.value;state.settings.pebbleMass=+f.elements.pebbleMass.value;state.records=[];clearLoad();$('settingsDialog').close();toast('质量设置已应用，石子和高度已复位。');});
  $('resetBtn').addEventListener('click',()=>openDialog('resetDialog'));
  $('confirmResetBtn').addEventListener('click',()=>{state=C.fresh(state.settings);selected=null;leverProgress=0;lastGold=false;dismissedSuccess=false;$('resetDialog').close();renderAll();save();toast('零件已归位，一起来重新组装吧。');});
  function renderNotes() {
    $('reportSummary').innerHTML=`<span>大石头 ${fmt(state.settings.stoneMass)} kg</span><span>每颗 ${fmt(state.settings.pebbleMass)} kg</span><span>当前 ${state.count} 颗</span><span>${state.everGold?'✦ 已达到 10 cm':'尚未达到 10 cm'}</span>`;
    $('noteInput').value=state.note;
    $('recordRows').innerHTML=state.records.length?state.records.slice().reverse().map(r=>`<tr><td>${({'加入一颗':'加入一颗','取出一颗':'取出一颗','首次达到 10 cm':'首次达到 10 cm','清空并复位':'清空并复位','开始 / 继续':'开始 / 继续','暂停锁止':'暂停锁止','打开面板，暂停锁止':'打开面板，暂停锁止'})[r.operation]||'观察记录'}</td><td>${r.count}</td><td>${fmt(r.mass)} kg</td><td>${fmt(r.height)} cm</td></tr>`).join(''):'<tr><td colspan="4">还没有记录。组装装置并加石子，操作会自动记录在这里。</td></tr>';
  }
  $('notesBtn').addEventListener('click',()=>{openDialog('notesDialog');renderNotes();});
  $('noteInput').addEventListener('input',e=>{state.note=e.target.value;save();});
  $('clearLoadBtn').addEventListener('click',()=>{clearLoad();renderNotes();toast('石子已清空，装置保留，可以再试一次。');});
  $('downloadReportBtn').addEventListener('click',()=>{
    const report={title:'鼠国大力士 · 实验记录',exportedAt:new Date().toISOString(),settings:state.settings,current:{pebbles:state.count,basketMass:C.mass(state),heightCm:state.height,reachedGold:state.everGold},observations:state.note,records:state.records,model:'理想定滑轮；忽略摩擦和空篮、网兜、绳的质量；a = g × (篮中质量 − 大石头质量) / (两侧质量之和)。金石是故事设定。'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`鼠国大力士-实验记录-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已发起下载实验记录（JSON）。');
  });
  for(let cm=0;cm<=20;cm++){const y=160-cm*8;$('rulerTicks').appendChild(el('path',{d:`M8 ${y}H${cm%5===0?23:16}`,stroke:'#93aab1','stroke-width':cm%5===0?1.5:1}));if(cm%5===0)$('rulerTicks').appendChild(el('text',{x:30,y:y+4,'font-family':'Segoe UI','font-size':12,fill:cm===10?'#b58c2c':'#7f969f'},cm));}
  function animate(now) {
    let remaining=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
    const moving=state.running;
    while(remaining>0){const dt=Math.min(1/120,remaining);C.tick(state,dt);remaining-=dt;}
    if(moving){renderLoads();renderMetrics();}
    if(state.everGold&&!lastGold){lastGold=true;dismissedSuccess=false;record('首次达到 10 cm');renderUI();save();}
    if(moving&&now-saveTime>1000){saveTime=now;save();}
    requestAnimationFrame(animate);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running){state.running=false;state.velocity=0;renderUI();save();}});
  window.addEventListener('pagehide',save);
  window.addEventListener('message',e=>{if(e.source!==window.parent)return;if(e.data?.type==='lab:help')openDialog('helpDialog');if(e.data?.type==='lab:leave'){state.running=false;state.velocity=0;save();}});
  renderAll();requestAnimationFrame(animate);
  if(stored)setTimeout(()=>toast('已恢复上次实验。装置处于锁止状态，点击继续即可运行。'),600);
  // Read-only snapshots are useful for diagnostics and extension tests.
  window.FairytaleLab={snapshot:()=>JSON.parse(JSON.stringify(state)),version:'1.0.0',experiments:catalog};
})();
