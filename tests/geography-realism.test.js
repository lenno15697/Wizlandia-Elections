'use strict';
const assert=require('node:assert/strict'),H=require('../district-geography.js'),D=require('../data.js'),E=require('../engine.js');
const universities=H.districts.filter(d=>d.type===8);
assert.equal(universities.length,6);
assert.deepEqual(universities.map(d=>d.locality).sort(),['Lorenvia','Wizlandia City','Akropolis','Southport','Ravenna','Erewenton'].sort());
for(const d of universities)assert.ok(d.metroShare>=.3);
assert.equal(D.types.find(t=>t.id===26).name,'Manufacturing towns');
for(const d of H.districts.filter(d=>[25,26].includes(d.type))){
 assert.ok(d.coastDistance<=14,'Manufacturing must lie in coastal population belts');
 assert.ok(!['Sierra Vista','Zyoto','Laxford','Alpinton','Lux Aeterna','Westhaven'].includes(d.locality));
 if(d.type===26)assert.equal(d.typeName,'Manufacturing towns');
}
const farms=H.districts.filter(d=>[33,34,35,36,37,42].includes(d.type));assert.equal(farms.length,48);
for(const d of farms){assert.ok(d.centroidY>=285);assert.ok(d.coldNorthShare<=.35);assert.ok(d.metroShare<=.45001);if(d.type===35)assert.ok(d.centroidY>=315);}
const dairy=H.districts.filter(d=>d.type===36);assert.equal(dairy.length,8);
assert.equal(dairy.filter(d=>d.stateCode==='LX'&&d.locality==='Laxburg hinterland').length,5);
for(const name of ['Sierra Vista','Zyoto']){
 const rows=H.districts.filter(d=>d.locality===name);
 for(const t of [40,46,47])assert.ok(rows.some(d=>d.type===t),`${name} requires explicit tourism, hospitality and scenic districts`);
 assert.ok(rows.every(d=>![10,25,26,31].includes(d.type)));
}
const laxford=H.districts.filter(d=>d.locality==='Laxford');assert.deepEqual(laxford.map(d=>d.type).sort((a,b)=>a-b),[24,29]);
for(const t of D.types)assert.equal(H.districts.filter(d=>d.type===t.id).length,t.count);
assert.equal(new Set(H.districts.map(d=>d.legacyId)).size,400);
assert.deepEqual(E.evaluate().districtSeats,D.baseline);
const capitals=['Lorenvia','Westhaven','Erewenton','Ravenna','Avondale','Lyanna','Kroana City','Queloria','Akropolis','Luqur Bay','Illixia','Queenstown','Wittan'];
const publicRows=H.districts.filter(d=>d.type===7);assert.equal(publicRows.length,8);
for(const city of capitals.filter(c=>c!=='Lorenvia'))assert.ok(publicRows.filter(d=>d.locality===city).length<=1,`${city} can have at most one public-employment district`);
assert.ok(publicRows.every(d=>capitals.includes(d.locality)));
assert.equal(publicRows.filter(d=>d.locality==='Lorenvia').length,3);
const alpinton=H.districts.filter(d=>d.locality==='Alpinton'),lux=H.districts.filter(d=>d.locality==='Lux Aeterna');
assert.equal(alpinton.length,1);assert.equal(alpinton[0].type,46);
assert.equal(lux.length,1);assert.equal(lux[0].type,40);
const westhaven=H.districts.filter(d=>d.locality==='Westhaven');
for(const type of [11,12,13,30])assert.ok(westhaven.some(d=>d.type===type));
assert.ok(westhaven.every(d=>![10,25,26,31].includes(d.type)));
console.log('Geographic realism checks passed: Ravenna university, ski and Northern Lights tourism, wealthy business Westhaven, capital public-employment cap, and all preceding manufacturing/farming/dairy rules.');
