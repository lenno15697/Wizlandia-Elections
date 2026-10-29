'use strict';
const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js'),S=require('../senate.js');
const base=E.evaluate(),session=S.create(base);
assert.equal(S.median([9,1,3]),3);assert.equal(S.median([10,-4,2,4]),3);
assert.throws(()=>S.median([]));
assert.deepEqual(S.election(base).map(s=>D.parties[s.winner].code),['LDP','LDP','CA','CA','LDP','LDP','CA','LDP','CA','LDP','CA','CON']);
assert.equal(session.counter,1);assert.equal(session.cohorts.length,10);
assert.deepEqual(S.seats(session),[47,63,0,10,0,0,0,0,0]);
const random=new E.Mulberry32(20261029);
for(let i=0;i<100;i++){
  const s=E.drawShocks(random),r=E.evaluate(s.economic,s.cultural,s.variance);
  for(const state of S.election(r)){
    const rows=r.rows.filter(d=>d.stateCode===state.code),sorted=k=>rows.map(d=>d[k]).sort((a,b)=>a-b),middle=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;
    assert.equal(state.x,middle(sorted('x')));assert.equal(state.y,middle(sorted('y')));
    const d=r.parties.map(p=>(p.x-state.x)**2+(p.y-state.y)**2);
    assert.ok(d[state.winner]<=Math.min(...d)+1e-12);
  }
}
// A statewide electorate uses coordinate medians, not the mean or population weights.
const synthetic={...base,rows:H.states.flatMap(s=>[{stateCode:s.code,x:1,y:5,population:1e9},{stateCode:s.code,x:2,y:3,population:1},{stateCode:s.code,x:99,y:1,population:1}])};
for(const r of S.election(synthetic)){assert.equal(r.x,2);assert.equal(r.y,3);}
const tie={...base,parties:D.parties.map((p,i)=>({...p,x:i===0?1:i===1?-1:20+i,y:0})),rows:H.states.map(s=>({stateCode:s.code,x:0,y:0}))};
assert.ok(S.election(tie).every(s=>s.winner===1),'Exact nearest-party ties follow the fixed display order (CA before LDP)');
let t=S.edit(session,9,'NX',8);
assert.notEqual(session.cohorts[9].winners.NX,8,'Editing must not mutate the default or saved timeline');
const shock=E.evaluate(.8,-.4,1.5);
const preview=S.preview(t,shock);assert.equal(preview.assembly,base);assert.equal(preview.cohorts[9].winners.NX,8);
const q=[...t.cohorts.map(c=>({...c.winners}))];
for(let i=0;i<25;i++){
  const old=t,sh=E.drawShocks(random),r=E.evaluate(sh.economic,sh.cultural,sh.variance);
  t=S.advance(t,r);q.unshift(Object.fromEntries(S.election(r).map(s=>[s.code,s.winner])));q.length=10;
  assert.equal(t.counter,i+2);assert.deepEqual(t.cohorts.map(c=>c.winners),q);
  assert.equal(S.seats(t).reduce((a,b)=>a+b),120);assert.equal(S.seats(t,true).reduce((a,b)=>a+b),12);
  if(t.counter%2){assert.equal(t.assembly,old.assembly);assert.equal(t.assemblyCounter,old.assemblyCounter);}
  else{assert.equal(t.assembly,r);assert.equal(t.assemblyCounter,t.counter);}
  const p=S.preview(t,shock);
  assert.equal(p.assembly,t.counter%2?t.assembly:shock);
  for(let j=1;j<10;j++)assert.deepEqual(p.cohorts[j].winners,t.cohorts[j].winners);
  const saved=S.serialize(t),restored=S.restore(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(S.serialize(restored),saved);assert.deepEqual(restored.assembly.combinedSeats,t.assembly.combinedSeats);
}
for(const invalid of [null,{...S.serialize(t),counter:0},{...S.serialize(t),cohorts:[]},{...S.serialize(t),assemblyCounter:1}])assert.throws(()=>S.restore(invalid));
const invalid=S.serialize(t);delete invalid.cohorts[0].winners.NX;assert.throws(()=>S.restore(invalid));
// State fills follow exactly the original state boundary edges, including Kroana's island.
const point=p=>p.join(','),edge=(a,b)=>[point(a),point(b)].sort().join('|');
for(const shape of S.stateOutlines()){
  const actual=shape.loops.flatMap(loop=>{assert.deepEqual(loop[0],loop.at(-1));return loop.slice(1).map((p,i)=>edge(loop[i],p));});
  const expected=H.stateBorders.filter(e=>e.states.includes(shape.code)).map(e=>edge(e.a,e.b));
  assert.deepEqual(actual.sort(),expected.sort());
}
console.log('Senate checks passed: independent state medians in 100 scenarios, baseline winners, tie rule, 25 cohort rollovers, Assembly freezing, editable winners, configuration round trips and exact state outlines.');
