'use strict';
const assert=require('node:assert/strict'),E=require('../engine'),S=require('../senate'),D=require('../data');
const harness=require('./dom-harness');
const seed=20261029;
const setSeed=(h,value)=>{h.get('seed').value=String(value);h.get('seed').listeners.change();};
const batch=async(h,n)=>{h.get('runs').value=String(n);await h.get('batch').onclick();return h.config();};
const load=async(h,c)=>{h.get('load-config').files=[{size:JSON.stringify(c).length,text:async()=>JSON.stringify(c)}];await h.get('load-config').onchange({target:h.get('load-config')});assert.equal(h.get('notice').textContent,'Configuration loaded.');};
function reference(calendar,generator,n){let t=calendar,last;for(let i=0;i<n;i++){const a=E.drawShocks(generator);last=E.evaluate(a.economic,a.cultural,a.variance);t=S.advance(t,last);}return{timeline:t,last};}
function check(c,expected,generator){
 assert.deepEqual(c.calendar,JSON.parse(JSON.stringify(S.serialize(expected.timeline))),'Every saved Senate cohort and held Assembly must follow the uninterrupted draw sequence');
 assert.equal(c.randomState,generator.seed,'Saved generator state must advance with every draw');
 for(const key of ['economic','cultural','variance'])assert.equal(c[key],expected.last[key]);
 assert.equal(S.seats(S.restore(c.calendar)).reduce((a,b)=>a+b,0),120);
 assert.equal(c.seed,seed,'Drawing must keep the visible seed unchanged');
}
(async()=>{
 const h=harness();setSeed(h,seed);const generator=new E.Mulberry32(seed);let expected={timeline:S.create()},first,second;const outputs=[];
 for(let i=0;i<3;i++){
  expected=reference(expected.timeline,generator,20);const c=await batch(h,20);check(c,expected,generator);
  assert.equal(c.calendar.counter,1+20*(i+1));if(i===0)first=c;if(i===1)second=c;
  outputs.push({batch:i+1,election:c.calendar.counter,randomState:c.randomState,senate:Object.fromEntries(S.seats(S.restore(c.calendar)).map((n,j)=>[D.parties[j].code,n]).filter(p=>p[1]))});
 }
 assert.notEqual(first.randomState,second.randomState);
 assert.notDeepEqual(first.calendar.cohorts,second.calendar.cohorts,'A second batch must not replay the first batch');
 // Batch size is only a UI grouping: 20 + 20 and one 40-draw batch agree exactly.
 const grouped=harness();setSeed(grouped,seed);const forty=await batch(grouped,40);
 assert.deepEqual(forty.calendar,second.calendar);assert.equal(forty.randomState,second.randomState);
 // A single draw between batches consumes the next draw rather than resetting.
 h.get('random-mode').onclick();h.get('run').onclick();expected=reference(expected.timeline,generator,1);check(await h.config(),expected,generator);
 expected=reference(expected.timeline,generator,20);const afterMixed=await batch(h,20);check(afterMixed,expected,generator);
 // Reloading an exported configuration must preserve the batch continuation.
 const restored=harness();await load(restored,afterMixed);
 const restoredGenerator=new E.Mulberry32(afterMixed.randomState),restoredExpected=reference(S.restore(afterMixed.calendar),restoredGenerator,20);
 const afterRestore=await batch(restored,20);check(afterRestore,restoredExpected,restoredGenerator);
 const uninterrupted=await batch(h,20);assert.deepEqual(afterRestore.calendar,uninterrupted.calendar);assert.equal(afterRestore.randomState,uninterrupted.randomState);
 // Explicitly setting a seed still restarts its reproducible sequence.
 setSeed(h,seed);const replayGenerator=new E.Mulberry32(seed),replayExpected=reference(S.restore(uninterrupted.calendar),replayGenerator,20),replayed=await batch(h,20);
 check(replayed,replayExpected,replayGenerator);assert.deepEqual(replayed.calendar.cohorts,first.calendar.cohorts);
 console.log('Batch sequence checks passed: repeated 20-draw batches, 20+20 versus 40, single/batch interleaving, exact Senate rollover and Assembly freezing, saved-state continuation, and explicit seed replay.');
 console.log(JSON.stringify(outputs));
})().catch(e=>{console.error(e);process.exitCode=1;});
