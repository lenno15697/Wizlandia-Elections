'use strict';
const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),fixture=require('./python-reference.json');
const base=E.evaluate();
assert.deepEqual(base.seats,D.baseline);
assert.equal(base.rows.length,400);
assert.equal(new Set(base.rows.map(d=>`${d.x},${d.y}`)).size,400);
for(const spread of [0,.01,.05,.10,.15,.20])assert.deepEqual(E.evaluate(0,0,1,spread).seats,D.baseline);
for(const t of D.types){
  const rows=base.rows.filter(d=>d.type===t.id);
  assert.equal(rows.length,t.count);
  assert.ok(Math.abs(rows.reduce((s,d)=>s+d.x,0)/t.count-t.x)<1e-12);
  assert.ok(Math.abs(rows.reduce((s,d)=>s+d.y,0)/t.count-t.y)<1e-12);
  assert.ok(rows.every(d=>Math.hypot(d.x-t.x,d.y-t.y)<=D.spread+1e-12));
}
let maxCoordError=0,maxVoteError=0;
E.districts().forEach((d,i)=>{maxCoordError=Math.max(maxCoordError,Math.abs(d.x-fixture.centres[i][0]),Math.abs(d.y-fixture.centres[i][1]));});
assert.ok(maxCoordError<1e-12);
for(const expected of fixture.scenarios){
  const got=E.evaluate(expected.economic,expected.cultural,expected.variance);
  assert.deepEqual(got.seats,expected.seats,JSON.stringify(expected));
  assert.equal(got.seats.reduce((a,b)=>a+b,0),400);
  assert.ok(Math.abs(got.votes.reduce((a,b)=>a+b,0)-1)<1e-12);
  got.votes.forEach((v,i)=>{maxVoteError=Math.max(maxVoteError,Math.abs(v-expected.votes[i]));});
}
assert.ok(maxVoteError<1e-6,`Share probability error ${maxVoteError}`);
const rng=new E.Mulberry32(20261014);
for(const expected of fixture.shocks){const got=E.drawShocks(rng);assert.equal(got.economic,expected.economic);assert.equal(got.cultural,expected.cultural);assert.ok(Math.abs(got.variance-expected.variance)<1e-14);}
const counts=new Set();
for(let i=0;i<=100;i++)counts.add(E.evaluate(0,i/100,1).seats[4]);
assert.deepEqual([...counts].sort((a,b)=>a-b),[0,1,2,3,4,5,6]);
const zeroSpreadCounts=new Set();for(let i=0;i<=100;i++)zeroSpreadCounts.add(E.evaluate(0,i/100,1,0).seats[4]);
assert.deepEqual([...zeroSpreadCounts].sort((a,b)=>a-b),[0,6]);
assert.deepEqual(E.evaluate(0,.5,1).seats,[183,162,21,31,3,0,0,0,0]);
assert.throws(()=>E.evaluate(NaN,0,1));assert.throws(()=>E.evaluate(0,0,0));assert.throws(()=>E.evaluate(0,0,1,-1));
const duplicates=D.parties.map(p=>({...p}));duplicates[0].x=duplicates[1].x;duplicates[0].y=duplicates[1].y;
assert.throws(()=>E.evaluate(0,0,1,.1,duplicates));
const modified=D.parties.map(p=>({...p}));modified[0].x=3.9;const result=E.evaluate(.2,-.3,1.5,.1,modified);
assert.equal(result.seats.reduce((a,b)=>a+b,0),400);
assert.ok(Math.abs(result.votes.reduce((a,b)=>a+b,0)-1)<1e-12);
const pdf=v=>Math.exp(-.5*((Math.log(v)-.04)/.20)**2)/v;
for(const v of [.5,.6,.8,1,1.2,1.8,2])assert.ok(Math.abs(pdf(v)-pdf(1/v))<1e-13);
console.log(`Model checks passed. ${fixture.scenarios.length} Python reference scenarios; maximum vote-share error ${(maxVoteError*100).toExponential(2)} percentage points. Green seat counts: ${[...counts].sort((a,b)=>a-b).join(', ')}.`);
