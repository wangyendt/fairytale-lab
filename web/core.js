/* Pure, independently testable teaching model. Units: kg, cm, seconds. */
(function (root) {
  'use strict';
  const DEFAULTS = Object.freeze({ stoneMass: 5, pebbleMass: 0.5, gravity: 9.8, maxHeight: 20, goldHeight: 10 });
  const MAX_PEBBLES = 250;
  const SLOTS = [
    { id: 'net', kind: 'net', x: 555, y: 490, label: '网兜', requires: [] },
    { id: 'fulcrum', kind: 'fulcrum', x: 390, y: 485, label: '支点石', requires: [] },
    { id: 'lever', kind: 'lever', x: 346, y: 464, label: '杠杆木棒', requires: ['fulcrum'] },
    { id: 'leg1', kind: 'leg', x: 303, y: 315, label: '左侧后支腿', requires: [] },
    { id: 'leg2', kind: 'leg', x: 386, y: 315, label: '左侧前支腿', requires: [] },
    { id: 'leg3', kind: 'leg', x: 838, y: 315, label: '右侧后支腿', requires: [] },
    { id: 'leg4', kind: 'leg', x: 922, y: 315, label: '右侧前支腿', requires: [] },
    { id: 'beam', kind: 'beam', x: 610, y: 133, label: '长横梁', requires: ['leg1', 'leg2', 'leg3', 'leg4'] },
    { id: 'pulley', kind: 'pulley', x: 620, y: 215, label: '定滑轮', requires: ['beam'] },
    { id: 'basket', kind: 'basket', x: 685, y: 302, label: '竹篮', requires: [] },
    { id: 'rope', kind: 'rope', x: 620, y: 360, label: '粗绳', requires: ['pulley', 'net', 'basket'] }
  ];
  const PARTS = [
    { kind: 'leg', label: '短支腿', count: 4, category: 'wood', note: '两两组成 A 字支架' },
    { kind: 'beam', label: '长横梁', count: 1, category: 'wood', note: '连接两侧支架' },
    { kind: 'lever', label: '杠杆木棒', count: 1, category: 'wood', note: '长力臂，撬动大石头' },
    { kind: 'fulcrum', label: '支点石', count: 1, category: 'machine', note: '放在木棒下方' },
    { kind: 'net', label: '网兜', count: 1, category: 'machine', note: '接住并兜牢大石头' },
    { kind: 'pulley', label: '定滑轮', count: 1, category: 'machine', note: '挂在横梁上' },
    { kind: 'rope', label: '粗绳', count: 1, category: 'machine', note: '绕过轮子，连接两端' },
    { kind: 'basket', label: '竹篮', count: 1, category: 'machine', note: '装入小石子作配重' }
  ];
  function fresh(settings) {
    return { version: 1, experiment: 'mouse-strongman', settings: { ...DEFAULTS, ...settings }, installed: [], loose: [], leverDone: false, count: 0, height: 0, velocity: 0, running: false, everGold: false, records: [], note: '' };
  }
  function canInstall(state, slot) {
    if (!slot || state.installed.includes(slot.id)) return false;
    if (!slot.requires.every(id => state.installed.includes(id))) return false;
    if (slot.id === 'rope' && !state.leverDone) return false;
    return true;
  }
  function ready(state) { return state.leverDone && SLOTS.every(s => state.installed.includes(s.id)); }
  function leverReady(state) { return ['net', 'fulcrum', 'lever'].every(id => state.installed.includes(id)); }
  function stage(state) {
    if (!state.leverDone) return 0;
    if (!['leg1', 'leg2', 'leg3', 'leg4', 'beam', 'pulley'].every(id => state.installed.includes(id))) return 1;
    if (!ready(state)) return 2;
    return 3;
  }
  function mass(state) { return state.count * state.settings.pebbleMass; }
  function balance(state) {
    const delta = mass(state) - state.settings.stoneMass;
    return Math.abs(delta) < 1e-8 ? 'balanced' : delta > 0 ? 'heavier' : 'lighter';
  }
  function tick(state, dt) {
    if (!state.running || !ready(state)) return;
    const mL = state.settings.stoneMass, mR = mass(state);
    // Ideal Atwood machine. 100 converts m/s² to cm/s². No artificial lift per pebble.
    const acceleration = state.settings.gravity * (mR - mL) / (mR + mL) * 100;
    state.velocity += acceleration * dt;
    state.height += state.velocity * dt;
    if (state.height <= 0) { state.height = 0; state.velocity = 0; }
    if (state.height >= state.settings.maxHeight) { state.height = state.settings.maxHeight; state.velocity = 0; }
    if (state.height >= state.settings.goldHeight) state.everGold = true;
  }
  function restored(raw) {
    try {
      const v = JSON.parse(raw);
      if (!v || v.version !== 1 || v.experiment !== 'mouse-strongman') return null;
      const s = fresh();
      for (const key of ['stoneMass', 'pebbleMass']) {
        const value = Number(v.settings?.[key]);
        if (!Number.isFinite(value) || value < (key === 'stoneMass' ? 1 : 0.1) || value > (key === 'stoneMass' ? 20 : 2)) return null;
        s.settings[key] = value;
      }
      s.installed = [...new Set((Array.isArray(v.installed) ? v.installed : []).filter(id => SLOTS.some(slot => slot.id === id)))];
      s.leverDone = !!v.leverDone && leverReady(s);
      // Reject orphaned assemblies rather than silently presenting an impossible apparatus.
      if (s.installed.some(id => !SLOTS.find(slot => slot.id === id).requires.every(dep => s.installed.includes(dep)))) return null;
      if (s.installed.includes('rope') && !s.leverDone) return null;
      s.count = Math.max(0, Math.min(MAX_PEBBLES, Math.floor(Number(v.count) || 0)));
      s.height = Math.max(0, Math.min(20, Number(v.height) || 0));
      if (!ready(s)) { s.count = 0; s.height = 0; }
      s.everGold = !!v.everGold;
      s.note = typeof v.note === 'string' ? v.note.slice(0, 4000) : '';
      s.records = Array.isArray(v.records) ? v.records.slice(-200).filter(r => r && Number.isFinite(r.count) && Number.isFinite(r.height)) : [];
      // Loose pieces are deliberately returned to the tray on reopening.
      return s;
    } catch { return null; }
  }
  const API = { DEFAULTS, MAX_PEBBLES, SLOTS, PARTS, fresh, canInstall, ready, leverReady, stage, mass, balance, tick, restored };
  if (typeof module !== 'undefined') module.exports = API;
  root.LabCore = API;
})(typeof globalThis !== 'undefined' ? globalThis : window);
