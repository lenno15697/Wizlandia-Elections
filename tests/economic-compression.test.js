'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js'),snapshot=require('../analysis/economic_compression_before.json');
const c=D.economicCompression;assert.deepEqual(c,{origin:2.15,sourceMax:5.75,targetMax:4.75,scale:13/18});
assert.deepEqual(D.sourceTypes,snapshot.beforeData.types);
for(const [key,value] of Object.entries(snapshot.beforeData))if(key!=='types')assert.deepEqual(D[key],value,'Only baseline district economic positions may change');
const current=E.districts(),source=E.districts(D.spread,false),byId=new Map(H.districts.map(d=>[d.id,d]));let changed=0;
for(let i=0;i<400;i++){
 const old=snapshot.beforePoints[i],next=current[i],raw=source[i];
 assert.equal(raw.x,old.x);assert.equal(raw.y,old.y);assert.equal(next.id,old.id);assert.equal(next.legacyId,old.legacyId);assert.equal(next.type,old.type);assert.equal(next.y,old.y);
 const selected=old.x>=c.origin&&old.x<=c.sourceMax,expected=selected?c.origin+c.scale*(old.x-c.origin):old.x;
 assert.equal(next.x,expected);assert.equal(byId.get(old.id).x,expected);assert.equal(byId.get(old.id).y,old.y);
 if(selected){changed++;assert.ok(next.x>=c.origin&&next.x<=c.targetMax);assert.ok(next.x<=old.x);}else assert.equal(next.x,old.x);
}
assert.equal(changed,180);assert.equal(snapshot.selectedDistricts.length,180);
function digest(rows,keys){
 const hash=crypto.createHash('sha256');
 for(const row of rows.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0))for(const key of keys){const value=row[key];if(typeof value==='number'){const b=Buffer.alloc(9);b[0]=110;b.writeDoubleBE(value,1);hash.update(b);}else hash.update('s'+value+'\0');}
 return hash.digest('hex');
}
assert.equal(digest(H.districts,snapshot.identityFields),snapshot.identityHash,'Culture, all district identities, population, geometry and baseline winners must remain unchanged');
const publicRows=current.filter(d=>d.type===7),publicCentre=D.types.find(t=>t.id===7);
assert.ok(Math.abs(publicRows.reduce((s,d)=>s+d.x,0)/publicRows.length-publicCentre.x)<1e-12,'The partly selected type must publish its actual post-compression mean');
const dairy=D.types.find(t=>t.id===36),dairyRows=current.filter(d=>d.type===36);
assert.ok(Math.abs(Math.max(...dairyRows.map(d=>Math.hypot(d.x-dairy.x,d.y-dairy.y)))-.2)<1e-12,'The requested dairy radius remains 0.20');
assert.deepEqual(E.evaluate().districtSeats,D.baseline);assert.deepEqual(E.evaluate().prSeats,D.baselinePr);
assert.equal(E.evaluate(1,-1,2).districtSeats[6],24);
console.log('Economic-compression checks passed: exact 13/18 shrink about 2.15, 180 selected points, 220 untouched points, fixed culture and identities, source spread, actual type means, dairy radius, baseline and 24-seat extreme LIB result.');
