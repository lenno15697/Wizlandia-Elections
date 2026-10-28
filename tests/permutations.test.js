'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js'),audit=require('../district_permutations.json');
const byId=new Map(H.districts.map(d=>[d.id,d])),before=new Map(audit.changes.map(c=>[c.district,c.before]));
assert.equal(audit.version,7);assert.equal(H.compassPermutationVersion,7);
assert.equal(audit.changes.length,35);assert.equal(Object.keys(audit.effectiveReceives).length,35);
assert.equal(new Set(Object.values(audit.effectiveReceives)).size,35);
const expectedReceives={
 'NX-59':'NX-42','NX-42':'NX-06','NX-06':'NX-59','AX-18':'ET-01','ET-01':'AX-15','AX-15':'AX-18','QL-05':'QL-12','QL-12':'QL-05',
 'WT-11':'LQ-16','LQ-16':'WT-11','LX-21':'KR-18','KR-18':'LX-21','ET-21':'NX-77','NX-77':'ET-21',
 'WT-09':'WT-12','WT-12':'WT-09','WT-15':'WT-02','WT-02':'WT-15','KR-01':'KR-16','KR-16':'KR-01',
 'KR-22':'EW-04','EW-06':'KR-22','EW-04':'EW-06',
 'NX-51':'NX-53','NX-53':'NX-44','NX-44':'NX-51',
 'NX-52':'NX-35','NX-41':'NX-52','NX-35':'NX-41',
 'EX-11':'ET-23','ET-23':'EX-11','AX-49':'KR-14','KR-14':'KR-12','KR-12':'KR-13','KR-13':'AX-49'
};
assert.deepEqual(audit.effectiveReceives,expectedReceives);
assert.deepEqual(audit.latestPermutation.orderedSwaps,[['EX-11','ET-23'],['AX-49','KR-14'],['KR-14','KR-12'],['KR-13','KR-12']]);
const latestReceives={'EX-11':'ET-23','ET-23':'EX-11','AX-49':'KR-14','KR-14':'KR-12','KR-12':'KR-13','KR-13':'AX-49'};
assert.deepEqual(audit.latestPermutation.simultaneousReceives,latestReceives);
const sequentialSources=Object.fromEntries(Object.keys(latestReceives).map(id=>[id,id]));
for(const [a,b] of audit.latestPermutation.orderedSwaps)[sequentialSources[a],sequentialSources[b]]=[sequentialSources[b],sequentialSources[a]];
assert.deepEqual(sequentialSources,latestReceives,'Overlapping swaps must be applied in the requested order');
for(const change of audit.latestPermutation.changes){
 const source=audit.latestPermutation.changes.find(c=>c.district===change.receivesFrom);
 assert.deepEqual(change.after,source.before,'Each district must receive the complete profile selected by the ordered swaps');
}
assert.ok(!audit.orderedSwaps.some(pair=>pair.includes('LQ-18')),'LQ-18 must keep its original profile');
assert.ok(audit.orderedSwaps.some(pair=>pair[0]==='WT-11'&&pair[1]==='LQ-16'),'The earlier WT-11/LQ-16 swap remains');
for(const change of audit.changes){
 assert.equal(change.receivesFrom,expectedReceives[change.district]);
 assert.deepEqual(change.after,before.get(change.receivesFrom));
 assert.deepEqual(Object.fromEntries(audit.politicalFields.map(k=>[k,byId.get(change.district)[k]])),change.after);
}
function digest(rows,keys){
 const hash=crypto.createHash('sha256');
 for(const row of rows.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))for(const key of keys){
   const v=row[key];
   if(typeof v==='number'){const buffer=Buffer.alloc(9);buffer[0]=110;buffer.writeDoubleBE(v,1);hash.update(buffer);}
   else hash.update('s'+v+'\0');
 }
 return hash.digest('hex');
}
assert.equal(digest(H.districts,audit.identityFields),audit.identityHash,'Every district’s geography and identity must remain unchanged');
assert.equal(digest(H.districts.filter(r=>!Object.hasOwn(expectedReceives,r.id)),['id',...audit.politicalFields]),audit.unaffectedPoliticalHash,'The other 365 political profiles, including LQ-18, must be unchanged');
assert.equal(new Set(H.districts.map(d=>d.legacyId)).size,400);
for(const t of D.types){assert.equal(H.districts.filter(d=>d.type===t.id).length,t.count);assert.equal(audit.typeCountsBefore[t.id],t.count);}
const model=E.districts(),modelById=new Map(model.map(d=>[d.id,d]));
for(const d of H.districts){
 const got=modelById.get(d.id);assert.equal(got.type,d.type);assert.equal(got.name,d.typeName);assert.equal(got.legacyId,d.legacyId);
 assert.ok(Math.abs(got.x-d.x)<1e-12&&Math.abs(got.y-d.y)<1e-12,d.id+' must receive both exact model coordinates');
}
assert.deepEqual(JSON.parse(fs.readFileSync(require.resolve('../district-geography.json'),'utf8')),H);
console.log('Permutation checks passed: 35 retained transfers, four latest swaps applied in supplied order, LQ-16/LQ-18 reversal, retained WT-11/LQ-16 swap, exact types and points, 50 type counts, unchanged geography and 365 untouched profiles.');
