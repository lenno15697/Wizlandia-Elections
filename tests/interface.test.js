'use strict';
// Run the complete app against its actual HTML IDs. This checks event wiring;
// it does not substitute for a browser's layout or accessibility engine.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js'),G=require('../diagrams.js'),H=require('../district-geography.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
function node(attrs=''){
 const attributes=Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 const classes=new Set();return{attributes,id:attributes.id,dataset:Object.fromEntries(Object.entries(attributes).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5),v])),
   value:attributes.value||'',checked:/\bchecked\b/.test(attrs),hidden:/\bhidden\b/.test(attrs),innerHTML:'',textContent:'',files:[],listeners:{},style:{setProperty(){}},
   classList:{toggle(k,on){if(on===undefined)on=!classes.has(k);on?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)},
   setAttribute(k,v){attributes[k]=v;},addEventListener(k,v){this.listeners[k]=v;},querySelector(){return null},appendChild(){},focus(){},click(){},remove(){},showModal(){},close(){}};
}
const all=[...html.matchAll(/<[a-z][^>]*>/g)].map(m=>node(m[0])),nodes=new Map(all.filter(n=>n.id).map(n=>[n.id,n]));
for(const match of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
 const selected=match[2].match(/<option[^>]*value="([^"]+)"/);if(selected)nodes.get(match[1]).value=selected[1];
}
const body=node(),scroll=node();let lastBlob;
const document={body,activeElement:null,getElementById(id){assert.ok(nodes.has(id),'Missing real HTML element: '+id);return nodes.get(id);},
 querySelectorAll(query){const key=query.slice(1,-1);return all.filter(n=>Object.hasOwn(n.attributes,key)||Object.hasOwn(n.dataset,key.replace(/^data-/,'')));},
 querySelector:()=>scroll,createElement:()=>node()};
const context={window:{WizlandiaData:D,WizlandiaEngine:E,WizlandiaDiagrams:G,WizlandiaGeography:H},document,
 getComputedStyle:()=>({getPropertyValue:()=> '#202535'}),localStorage:{getItem(){return null},setItem(){}},
 setTimeout:()=>1,clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame:f=>{f();return 1},
 URL:{createObjectURL(blob){lastBlob=blob;return 'blob:test'},revokeObjectURL(){}},Blob,console};
vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
(async()=>{
 const get=id=>nodes.get(id);
 assert.match(get('ticker').textContent,/Combined/);
 get('tab-cartogram').onclick();assert.equal(get('cartogram-detail').hidden,true);assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,400);
 get('cartogram-state').value='AK';get('cartogram-state').listeners.change();assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,15);
 get('cartogram').onclick({target:{closest:()=>({dataset:{district:'AK-01'}})}});assert.match(get('cartogram-detail').innerHTML,/AK-01/);assert.equal(get('cartogram-detail').hidden,false);assert.ok(!/T[0-9]{2}\s*[·<]/.test(get('cartogram-detail').innerHTML));
 get('cartogram-detail').onclick({target:{closest:()=>({})}});assert.equal(get('cartogram-detail').hidden,true);
 get('cartogram-state').value='all';get('cartogram-state').listeners.change();
 get('economic').value='.30';get('economic').listeners.input();
 const expected=E.evaluate(.3,0,1),chunk=get('cartogram').innerHTML;
 for(const r of expected.rows){assert.ok(chunk.split(`data-district="${r.id}"`)[1].split('</g>')[0].includes(`fill="${D.parties[r.winner].color}"`));}
 get('view-pr').onclick();assert.ok(all.filter(n=>Object.hasOwn(n.attributes,'data-combined-only')).every(n=>n.hidden));
 get('view-combined').onclick();
 get('tab-districts').onclick();get('district-state').value='IL';get('district-state').listeners.input();assert.equal((get('district-body').innerHTML.match(/<tr>/g)||[]).length,9);
 get('export-districts').onclick();assert.equal((await lastBlob.text()).trim().split('\n').length,401);
 const config={version:1,economic:.1,cultural:.2,variance:1,spread:0,seed:1,runs:3,parties:D.parties.map(({code,x,y})=>({code,x,y}))};
 get('load-config').files=[{size:1000,text:async()=>JSON.stringify(config)}];await get('load-config').onchange({target:get('load-config')});
 assert.equal(get('notice').textContent,'Configuration loaded.');get('save-config').onclick();assert.equal(JSON.parse(await lastBlob.text()).spread,.2);
 get('theme').onclick();get('tab-cartogram').onclick();assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,400);
 console.log('Interface event checks passed: full app startup, fixed variation, live map, tile inspection, state zoom/filter, Combined-only majority, 400-row export, old config normalization and theme switch.');
})().catch(e=>{console.error(e);process.exitCode=1});
