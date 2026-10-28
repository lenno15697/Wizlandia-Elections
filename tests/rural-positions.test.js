'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js'),snapshot=require('../analysis/rural_type_shift_before.json');
const deltas=new Map([[35,[0,.4]],[36,[0,.5]],[39,[-.7,0]],[49,[.5,0]]]);
for(const [key,value] of Object.entries(snapshot.beforeData))if(key!=='types')assert.deepEqual(D[key],value,'Party positions, PR electorate, baseline and global spread must remain unchanged');
const sourceTypes=D.sourceTypes||D.types,sourceRows=E.districts(D.spread,false);
for(const t of sourceTypes){
 const old=snapshot.beforeData.types.find(o=>o.id===t.id),change=deltas.get(t.id);
 if(!change){assert.deepEqual(t,old);continue;}
 assert.deepEqual({...t,x:old.x,y:old.y},old);assert.ok(Math.abs(t.x-old.x-change[0])<1e-12);assert.ok(Math.abs(t.y-old.y-change[1])<1e-12);
 const rows=sourceRows.filter(d=>d.type===t.id);
 assert.equal(rows.length,t.count);
 assert.ok(Math.abs(rows.reduce((s,d)=>s+d.x,0)/rows.length-t.x)<1e-12);
 assert.ok(Math.abs(rows.reduce((s,d)=>s+d.y,0)/rows.length-t.y)<1e-12);
 assert.ok(Math.abs(Math.max(...rows.map(d=>Math.hypot(d.x-t.x,d.y-t.y)))-.2)<1e-12,'Each edited type reaches the full 0.20 radius');
 for(let i=0;i<rows.length;i+=2){assert.ok(Math.abs(rows[i].x+rows[i+1].x-2*t.x)<1e-12);assert.ok(Math.abs(rows[i].y+rows[i+1].y-2*t.y)<1e-12);}
}
function digest(rows,keys){
 const hash=crypto.createHash('sha256');
 for(const row of rows.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))for(const key of keys){
  const value=row[key];if(typeof value==='number'){const b=Buffer.alloc(9);b[0]=110;b.writeDoubleBE(value,1);hash.update(b);}else hash.update('s'+value+'\0');
 }
 return hash.digest('hex');
}
assert.equal(digest(H.districts,snapshot.identityFields),snapshot.identityHash,'All 400 IDs, types, populations, locality assignments, geometry and baseline winners must remain unchanged');
const sourceById=new Map(sourceRows.map(d=>[d.id,d]));
const sourceGeography=H.districts.map(d=>({...d,x:sourceById.get(d.id).x,y:sourceById.get(d.id).y}));
assert.equal(digest(sourceGeography.filter(d=>!deltas.has(d.type)),['id','x','y']),snapshot.untouchedPositionHash,'All 376 other source positions must retain the earlier model settings before the later economic compression');
assert.equal(snapshot.oldDistricts.length,24);assert.equal(snapshot.newDistricts.length,24);
assert.ok(snapshot.changes.find(t=>t.type===36).previousMaximumOffset<.05);
const base=E.evaluate();assert.deepEqual(base.districtSeats,snapshot.beforeData.baseline);assert.deepEqual(base.prSeats,snapshot.beforeData.baselinePr);assert.deepEqual(base.combinedSeats,snapshot.beforeData.baselineCombined);
console.log('Rural-position checks passed: four earlier source-centre shifts, full 0.20 dairy radius, source offsets preserved before later compression, unchanged identities, PR electorate, university update and baseline.');
