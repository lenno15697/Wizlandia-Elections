'use strict';
const assert=require('node:assert/strict'),D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js'),snapshot=require('../analysis/university_shift_before.json');
const major=D.types.find(t=>t.id===8),regional=D.types.find(t=>t.id===28);
assert.equal(major.x,regional.x);assert.equal(major.x,-.05);assert.equal(major.y,-3.976810123046975);assert.equal(major.count,6);
for(const [key,value] of Object.entries(snapshot.beforeData))if(key!=='types')assert.deepEqual(D[key],value,'Only the university type centre may change model constants');
assert.deepEqual(major,{...snapshot.beforeData.types.find(t=>t.id===8),x:regional.x});
assert.deepEqual(regional,snapshot.beforeData.types.find(t=>t.id===28));
const base=E.evaluate(),byId=new Map(H.districts.map(d=>[d.id,d]));
for(const old of snapshot.oldDistricts){
 const row=byId.get(old.id);assert.deepEqual({...row,x:old.x},old,'Every university district must retain culture, identity, type, population and geography');
 assert.ok(Math.abs(row.x-old.x-1.89)<1e-12);assert.equal(row.y,old.y);assert.equal(base.rows.find(d=>d.id===old.id).winner,4);
 for(const variance of [.5,1,2]){
  const row=E.evaluate(.17,-.12,variance).rows.find(d=>d.id===old.id);
  const priorX=D.center[0]+.17+Math.sqrt(variance)*(old.x-D.center[0]);
  assert.ok(Math.abs(row.x-priorX-1.89*Math.sqrt(variance))<1e-12);
 }
}
assert.deepEqual(base.districtSeats,snapshot.beforeData.baseline);
assert.deepEqual(base.prSeats,snapshot.beforeData.baselinePr);
assert.deepEqual(base.combinedSeats,snapshot.beforeData.baselineCombined);
assert.equal(E.evaluate(0,.5,1).rows.filter(d=>d.type===8&&d.winner===4).length,6);
console.log('University-position checks passed: exact regional economic centre, six horizontal moves, unchanged cultural offsets, PR distribution, baseline, party positions and variance-scaled distance.');
