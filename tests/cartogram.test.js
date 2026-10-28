'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../data.js'),E=require('../engine.js'),H=require('../district-geography.js');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8'),html=fs.readFileSync(require.resolve('../index.html'),'utf8');
assert.equal(D.spread,.2);assert.ok(!html.includes('id="spread"'));assert.ok(!html.includes('id="cartogram-labels"'));assert.ok(!source.includes("$('spread')"));
assert.ok(source.includes('E.evaluate(c.economic,c.cultural,c.variance,D.spread,parties)'));
const expectedAdjacencies=['AX+ET','AX+NX','ET+KR','ET+NX','EW+EX','IL+LQ','IL+LX','IL+WT','KR+QL','LQ+LX','LX+WT'];
assert.deepEqual([...new Set(H.stateBorders.filter(e=>!e.coast).map(e=>e.states.join('+')))].sort(),expectedAdjacencies);
assert.equal(H.landmasses.length,5);assert.equal(H.landmasses.reduce((n,m)=>n+m.districts,0),400);
const original=require('./geography-reference.json');
const base=E.evaluate(),byId=new Map(H.districts.map(d=>[d.id,d]));
const at=(q,r)=>H.districts.find(d=>d.tileColumn===q&&d.tileRow===r);
for(const [q,r] of [[7,6],[6,7],[7,7],[6,8],[7,8]])assert.equal(at(q,r).stateCode,'EX');
for(const [q,r] of [[5,9],[5,10],[3,14],[3,15],[3,16]])assert.equal(at(q,r).stateCode,'EW');
for(const city of new Set(H.districts.map(d=>d.locality).filter(c=>!c.includes('hinterland')))){
  const rows=H.districts.filter(d=>d.locality===city),seen=new Set([0]);let previous=-1;
  while(previous!==seen.size){previous=seen.size;for(const i of [...seen])rows.forEach((d,j)=>{if(Math.hypot(d.tileX-rows[i].tileX,d.tileY-rows[i].tileY)<1.733)seen.add(j)});}
  assert.equal(seen.size,rows.length,city+' must form one connected group');
}
assert.equal(byId.get('KR-22').locality,'Davenport');
assert.equal(byId.size,400);assert.equal(new Set(base.rows.map(d=>d.id)).size,400);
assert.equal(H.districts.reduce((n,d)=>n+d.population,0),212000000);
for(const s of H.states){
  const rows=H.districts.filter(d=>d.stateCode===s.code);
  assert.equal(rows.length,s.districts);assert.equal(rows.reduce((n,d)=>n+d.population,0),s.population);
  assert.ok(rows.every(d=>d.id.startsWith(s.code+'-')));
  for(const landmass of new Set(rows.map(d=>d.landmass))){
    const part=rows.filter(d=>d.landmass===landmass),seen=new Set([0]);let previous=-1;
    while(previous!==seen.size){previous=seen.size;for(const i of [...seen])part.forEach((d,j)=>{if(Math.hypot(d.tileX-part[i].tileX,d.tileY-part[i].tileY)<1.733)seen.add(j)});}
    assert.equal(seen.size,part.length,'Each state part must stay connected on its source landmass');
  }

}
for(const t of D.types){
 const rows=base.rows.filter(d=>d.type===t.id);assert.equal(rows.length,t.count);
 assert.ok(Math.abs(rows.reduce((n,d)=>n+d.x,0)/rows.length-t.x)<1e-12);
 assert.ok(Math.abs(rows.reduce((n,d)=>n+d.y,0)/rows.length-t.y)<1e-12);
}
for(let i=0;i<base.rows.length;i++){
 const a=base.rows[i],b=original.districts[i];assert.equal(a.legacyId,b.id);assert.equal(a.type,b.type);assert.ok(Math.abs(a.x-b.x)<1e-12&&Math.abs(a.y-b.y)<1e-12);
}
const cartogram=source.slice(source.indexOf('function renderCartogram(){'),source.indexOf('\nfunction renderDistricts(){'));
const districts=source.slice(source.indexOf('function renderDistricts(){'),source.indexOf('\nfunction renderCoalitions(){'));
let rendered=0;
for(const shifts of [[0,0,1],[.3,-.25,1],[-1,1,2],[1,-1,.5]])for(const color of ['winner','family','state'])for(const state of ['all',...H.states.map(s=>s.code)]){
 const current=E.evaluate(...shifts),nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{value:'all',checked:true,innerHTML:'',classList:{toggle(){}}});return nodes.get(id);};
 $('cartogram-color').value=color;$('cartogram-state').value=state;
 const c={current,H,displayOrder:D.displayOrder,largestPartiesFirst:(indices,seats)=>indices.slice().sort((a,b)=>seats[b]-seats[a]||a-b),selected:new Set(),inspectedDistrict:'NX-01',$,esc:String,swatch:()=>'',document:{body:{classList:{contains:()=>false}},querySelector:()=>({classList:{toggle(){}}})}};
 vm.runInNewContext(cartogram+'\nrenderCartogram()',c);
 const out=$('cartogram').innerHTML;
 assert.ok(out.includes('data-state-borders="true"'));assert.ok(out.includes('stroke="#000000"'));
 assert.ok(!out.includes('>NX-01</text>'));assert.ok(!out.includes('>T01</text>'));
 assert.equal($('cartogram-detail').hidden,state!=='all'&&state!=='NX');
 if(!$('cartogram-detail').hidden){assert.ok(!/T[0-9]{2}\s*[·<]/.test($('cartogram-detail').innerHTML));assert.ok($('cartogram-detail').innerHTML.includes(byId.get('NX-01').typeName));}const expected=state==='all'?400:H.states.find(s=>s.code===state).districts;
 assert.equal((out.match(/data-district=/g)||[]).length,expected);
 assert.ok(!/NaN|undefined|Infinity/.test(out));
 assert.equal($('cartogram-family-key').hidden,color!=='family');
 if(color==='family')for(const [name,fill] of Object.entries(H.familyColors)){assert.ok($('cartogram-family-key').innerHTML.includes(name));assert.ok($('cartogram-family-key').innerHTML.includes(fill));}
 else assert.equal($('cartogram-family-key').innerHTML,'');
 assert.equal($('cartogram-state-results').hidden,false);
 {
   const result=$('cartogram-state-results').innerHTML;
   const subset=current.rows.filter(d=>state==='all'||d.stateCode===state);
   assert.ok(result.includes(state==='all'?'<strong>Nationwide</strong>':`<strong>${H.states.find(s=>s.code===state).name}</strong>`));
   for(let i=0;i<current.parties.length;i++){
     const n=subset.filter(d=>d.winner===i).length,p=current.parties[i];
     if(n)assert.ok(result.includes(`<span>${p.name}</span><strong>${n}</strong>`));
     else assert.ok(!result.includes(`<span>${p.name}</span>`));
   }
 }

 for(const row of current.rows.filter(d=>state==='all'||d.stateCode===state)){
   const chunk=out.split(`data-district="${row.id}"`)[1].split('</g>')[0];
   assert.ok(!chunk.includes('<text')&&!chunk.includes('<title>'),'District names and types must not appear on tiles or hover');
   if(color==='winner')assert.ok(chunk.includes(`fill="${current.parties[row.winner].color}"`));
 }
 rendered++;
}
const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{value:'all',innerHTML:''});return nodes.get(id)};
$('district-search').value='';$('district-state').value='IL';$('district-sort').value='id';
vm.runInNewContext(districts+'\nrenderDistricts()',{current:base,$,esc:String,swatch:()=>''});
assert.equal(($('district-body').innerHTML.match(/<tr>/g)||[]).length,9);
$('district-state').value='all';$('district-search').value='NX-01';
vm.runInNewContext(districts+'\nrenderDistricts()',{current:base,$,esc:String,swatch:()=>''});
assert.equal(($('district-body').innerHTML.match(/<tr>/g)||[]).length,1);
console.log(`Cartogram checks passed: ${rendered} renders, state zoom, current-winner colours, type and state modes, geographic IDs, connected state parts on their original landmasses, black state borders, click-only full-text details, fixed variation, preserved model indices and district filters.`);
