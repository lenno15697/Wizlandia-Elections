'use strict';
const assert=require('node:assert/strict'),E=require('../engine'),S=require('../senate'),D=require('../data'),harness=require('./dom-harness');
const plain=x=>JSON.parse(JSON.stringify(x));
const target=dataset=>({target:{closest:()=>({dataset})}});
const load=async(h,c)=>{h.get('load-config').files=[{size:JSON.stringify(c).length,text:async()=>JSON.stringify(c)}];await h.get('load-config').onchange({target:h.get('load-config')});assert.equal(h.get('notice').textContent,'Configuration loaded.');};
function expectDelta(h,expected){
 const rows=[...h.get('overview-body').innerHTML.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([,row])=>{const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];assert.equal(cells.length,10);return[row.match(/<strong>([A-Z]+)<\/strong>/)[1],cells.at(-1)[1]];});
 assert.equal(rows.length,9);
 for(const [code,label] of rows){const n=expected?.[D.parties.findIndex(p=>p.code===code)];assert.equal(label,expected?(n>0?'+'+n:n<0?'−'+Math.abs(n):'0'):'—');}
 assert.equal(h.get('senate-delta-total').textContent,expected?'0':'—');
}
(async()=>{
 const h=harness(),get=h.get;get('manual-mode').onclick();get('view-senate').onclick();expectDelta(h,null);
 assert.equal(get('run-assembly').textContent,'Next Assembly election (+2y)');
 assert.match(get('next-election-note').textContent,/Next: election 2, both chambers/);
 assert.ok(!get('assembly-lock-note').textContent.includes('Next:'));
 // Manual shortcuts preserve the chosen settings and save every intervening election.
 get('economic').value='.7';get('economic').listeners.input();
 let before=await h.config();get('run-assembly').onclick();let c=await h.config();
 assert.equal(c.calendar.counter,2);assert.equal(c.calendar.assemblyCounter,2);assert.equal(c.economic,.7);assert.equal(get('run-assembly').textContent,'Next Assembly election (+4y)');
 assert.equal(c.randomState,before.randomState,'Manual shortcuts do not consume random draws');
 assert.deepEqual(c.calendar.outgoing,before.calendar.cohorts[9].winners);
 expectDelta(h,S.changes(S.restore(c.calendar)));
 before=c;get('run-assembly').onclick();c=await h.config();
 assert.equal(c.calendar.counter,4);assert.equal(c.calendar.assemblyCounter,4);
 assert.equal(get('history-count').textContent,4,'Baseline and each of elections 2, 3 and 4 remain in History');
 assert.deepEqual(c.calendar.outgoing,before.calendar.cohorts[8].winners);
 assert.equal(c.randomState,before.randomState);expectDelta(h,S.changes(S.restore(c.calendar)));
 // History restores the correct outgoing cohort and delta, then branches cleanly.
 get('tab-history').onclick();const ids=[...get('history-body').innerHTML.matchAll(/data-history="(\d+)"/g)].map(m=>m[1]);
 get('history-body').onclick(target({history:ids[2]}));c=await h.config();assert.equal(c.calendar.counter,2);expectDelta(h,S.changes(S.restore(c.calendar)));
 // Random shortcuts match two separate draws, including the Senate-only one.
 const random=harness(),g=random.get;g('seed').value='20261030';g('seed').listeners.change();g('random-mode').onclick();
 assert.equal(g('run-assembly').textContent,'Draw next Assembly (+2y)');
 const rng=new E.Mulberry32(20261030);let expected=S.create();
 for(const n of [1,2,2]){
  for(let i=0;i<n;i++){const a=E.drawShocks(rng);expected=S.advance(expected,E.evaluate(a.economic,a.cultural,a.variance));}
  g('run-assembly').onclick();c=await random.config();
  assert.deepEqual(c.calendar,plain(S.serialize(expected)));assert.equal(c.randomState,rng.seed);
  assert.equal(c.calendar.counter%2,0);assert.equal(c.calendar.counter,c.calendar.assemblyCounter);assert.equal(g('run-assembly').textContent,'Draw next Assembly (+4y)');
 }
 // From an odd Senate-only year, the next Assembly requires only one draw.
 g('run').onclick();assert.equal(g('run-assembly').textContent,'Draw next Assembly (+2y)');let a=E.drawShocks(rng);expected=S.advance(expected,E.evaluate(a.economic,a.cultural,a.variance));
 a=E.drawShocks(rng);expected=S.advance(expected,E.evaluate(a.economic,a.cultural,a.variance));g('run-assembly').onclick();c=await random.config();
 assert.deepEqual(c.calendar,plain(S.serialize(expected)));assert.equal(c.randomState,rng.seed);
 g('view-senate').onclick();expectDelta(random,S.changes(expected));
 // Outgoing winners survive save/load, previews and latest-cohort checkmark edits.
 const restored=harness();await load(restored,c);restored.get('view-senate').onclick();expectDelta(restored,S.changes(expected));
 const outgoing={...c.calendar.outgoing};restored.get('economic').value='-.4';restored.get('economic').listeners.input();
 let changed=await restored.config();assert.deepEqual(changed.calendar.outgoing,outgoing);expectDelta(restored,S.changes(S.restore(changed.calendar)));
 restored.get('tab-senate-history').onclick();restored.get('senate-history-body').onchange(target({senateState:'NX',senateWinner:'8'}));
 changed=await restored.config();expectDelta(restored,S.changes(S.restore(changed.calendar)));
 const old=plain(c);delete old.calendar.outgoing;await load(restored,old);restored.get('view-senate').onclick();expectDelta(restored,null);
 restored.get('run-assembly').onclick();expectDelta(restored,S.changes(S.restore((await restored.config()).calendar)));
 // A bad seed cannot advance the random shortcut.
 g('seed').value='-1';const counter=c.calendar.counter;g('run-assembly').onclick();assert.equal(g('election-counter').textContent,'Election '+counter);
 console.log('Assembly shortcut and Senate delta checks passed: one/two-election manual and random advances, exact RNG continuation, complete History, outgoing-cohort retention, previews, edits, saved and legacy configurations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
