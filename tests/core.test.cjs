'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../web/core.js');
function assembled(settings){const s=C.fresh(settings);s.installed=C.SLOTS.map(x=>x.id);s.leverDone=true;return s;}
function advance(s,seconds){for(let i=0;i<seconds*240;i++)C.tick(s,1/240);}
test('inventory contains exactly 5 frame timbers and 11 attachable pieces',()=>{assert.equal(C.PARTS.find(p=>p.kind==='leg').count,4);assert.equal(C.PARTS.find(p=>p.kind==='beam').count,1);assert.equal(C.SLOTS.length,11);});
test('dependencies prevent unsupported beam, pulley, rope and lever',()=>{const s=C.fresh();for(const id of ['beam','pulley','rope','lever'])assert.equal(C.canInstall(s,C.SLOTS.find(x=>x.id===id)),false);s.installed.push('fulcrum');assert.equal(C.canInstall(s,C.SLOTS.find(x=>x.id==='lever')),true);});
test('rope requires rock already loaded into net',()=>{const s=assembled();s.installed=s.installed.filter(x=>x!=='rope');s.leverDone=false;assert.equal(C.canInstall(s,C.SLOTS.find(x=>x.id==='rope')),false);s.leverDone=true;assert.equal(C.canInstall(s,C.SLOTS.find(x=>x.id==='rope')),true);});
test('not assembled means no motion, even if running was requested',()=>{const s=C.fresh();s.running=true;s.count=30;advance(s,4);assert.equal(s.height,0);});
test('lighter basket cannot lift rock from the ground',()=>{const s=assembled();s.running=true;s.count=9;advance(s,4);assert.equal(C.balance(s),'lighter');assert.equal(s.height,0);assert.equal(s.everGold,false);});
test('equal mass stays balanced and never turns to gold',()=>{const s=assembled();s.running=true;s.count=10;advance(s,5);assert.equal(C.balance(s),'balanced');assert.equal(s.height,0);assert.equal(s.everGold,false);});
test('11 pebbles lift rock and cross the exact 10cm magic threshold',()=>{const s=assembled();s.running=true;s.count=11;advance(s,1);assert.equal(C.balance(s),'heavier');assert.ok(s.height>=10);assert.equal(s.everGold,true);assert.ok(s.height<=20);});
test('gold is not awarded at 9.99cm',()=>{const s=assembled();s.height=9.99;s.count=10;s.running=true;C.tick(s,1/240);assert.equal(s.everGold,false);s.height=10;C.tick(s,1/240);assert.equal(s.everGold,true);});
test('pause locks the load, travel stays within 0..20cm',()=>{const s=assembled();s.count=80;s.running=true;advance(s,10);assert.equal(s.height,20);s.running=false;advance(s,10);assert.equal(s.height,20);s.running=true;s.count=0;advance(s,10);assert.equal(s.height,0);assert.equal(s.everGold,true);});
test('acceleration follows ideal Atwood equation',()=>{const s=assembled();s.running=true;s.count=11;C.tick(s,.01);const a=9.8*(5.5-5)/(5.5+5)*100;assert.ok(Math.abs(s.velocity-a*.01)<1e-10);});
test('restored progress is paused and orphaned assemblies are rejected',()=>{const s=assembled();s.running=true;s.count=11;s.height=12;const r=C.restored(JSON.stringify(s));assert.equal(r.running,false);assert.equal(r.count,11);assert.equal(r.height,12);assert.equal(C.restored('{broken'),null);s.installed=['pulley'];assert.equal(C.restored(JSON.stringify(s)),null);});
test('custom masses change balancing count',()=>{const s=assembled({stoneMass:4,pebbleMass:1});s.count=4;assert.equal(C.balance(s),'balanced');s.count=5;s.running=true;advance(s,1);assert.equal(s.everGold,true);});
test('all allowed mass settings can win within pebble capacity',()=>{assert.ok(C.MAX_PEBBLES>20/.1);const s=assembled({stoneMass:20,pebbleMass:.1});s.count=201;s.running=true;advance(s,3);assert.equal(s.everGold,true);});
