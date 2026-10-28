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
 getComputedStyle:()=>({getPropertyValue:key=>({'--text':'#202535','--muted':'#727581','--border':'#e1e1dc','--accent':'#9b7d37'}[key]||'#202535')}),localStorage:{getItem(){return null},setItem(){}},
 setTimeout:()=>1,clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame:f=>{f();return 1},
 URL:{createObjectURL(blob){lastBlob=blob;return 'blob:test'},revokeObjectURL(){}},Blob,console};
vm.runInNewContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
if(process.env.WIZLANDIA_PREVIEW_SVG)fs.writeFileSync(process.env.WIZLANDIA_PREVIEW_SVG,nodes.get('hemicycle').innerHTML);
(async()=>{
 const get=id=>nodes.get(id);
 assert.match(get('ticker').textContent,/Combined/);
 assert.equal(get('runs').value,'20');assert.ok(!nodes.has('tab-cartogram'));assert.ok(!nodes.has('cartogram-legend'));
 assert.equal(get('assembly-panel').hidden,false);assert.equal(get('panel-cartogram').hidden,true);assert.equal(get('panel-votes').hidden,true);
 assert.ok(html.indexOf('id="tab-medians"')>html.indexOf('id="tab-history"'));assert.match(html,/id="panel-medians"[\s\S]*?<canvas id="compass"/);
 const checkCompass=seats=>{const svg=get('party-compass').innerHTML,bubbles=[...svg.matchAll(/data-party="(\d+)" data-compass-code="([^"]+)" data-seats="(\d+)" data-radius="([^"]+)"/g)];assert.equal(bubbles.length,9);for(const [,index,code,count,radius] of bubbles){const i=Number(index),n=Number(count),r=Number(radius);assert.equal(code,D.parties[i].code);assert.equal(n,seats[i]);if(n)assert.ok(Math.abs(r*r-289*Math.log1p(n))<1e-9,'Bubble area must be proportional to log(1 + seats)');else assert.equal(r,6);}return svg;};
 get('tab-compass').onclick();checkCompass(E.evaluate().combinedSeats);assert.equal(get('panel-medians').hidden,true);
 const partyEvent=(container,i)=>({target:{closest:()=>({dataset:{party:String(i)}})},currentTarget:get(container)});
 get('party-compass').onclick(partyEvent('party-compass',0));assert.match(get('party-cards').innerHTML,/data-party="0" aria-pressed="true"/);assert.match(get('party-compass').innerHTML,/data-party="0"[^>]*aria-pressed="true"/);
 get('party-cards').onclick(partyEvent('party-cards',0));assert.match(get('party-compass').innerHTML,/data-party="0"[^>]*aria-pressed="false"/);
 get('party-compass').onkeydown({...partyEvent('party-compass',4),key:'Enter',preventDefault(){}});assert.match(get('party-cards').innerHTML,/data-party="4" aria-pressed="true"/);get('clear-coalition').onclick();
 get('view-district').onclick();assert.equal(get('assembly-panel').hidden,true);assert.equal(get('panel-cartogram').hidden,false);assert.equal(get('cartogram-detail').hidden,true);assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,400);
 checkCompass(E.evaluate().districtSeats);assert.equal(get('cartogram-state-results').hidden,false);assert.match(get('cartogram-state-results').innerHTML,/Nationwide/);assert.match(get('cartogram-state-results').innerHTML,/400 district seats/);
 get('cartogram-state').value='AK';get('cartogram-state').listeners.change();assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,15);
 assert.ok(get('cartogram-layout').classList.contains('is-focused'));
 assert.match(get('cartogram-state-results').innerHTML,/Akro/);assert.match(get('cartogram-state-results').innerHTML,/15 district seats/);
 get('cartogram').onclick({target:{closest:()=>({dataset:{district:'AK-01'}})}});assert.match(get('cartogram-detail').innerHTML,/AK-01/);assert.equal(get('cartogram-detail').hidden,false);assert.ok(!/T[0-9]{2}\s*[·<]/.test(get('cartogram-detail').innerHTML));
 get('cartogram-detail').onclick({target:{closest:()=>({})}});assert.equal(get('cartogram-detail').hidden,true);
 get('cartogram-state').value='all';get('cartogram-state').listeners.change();assert.ok(!get('cartogram-layout').classList.contains('is-focused'));
 get('economic').value='.30';get('economic').listeners.input();
 const expected=E.evaluate(.3,0,1),chunk=get('cartogram').innerHTML;
 for(const r of expected.rows){assert.ok(chunk.split(`data-district="${r.id}"`)[1].split('</g>')[0].includes(`fill="${D.parties[r.winner].color}"`));}
 get('view-pr').onclick();assert.equal(get('assembly-panel').hidden,true);assert.equal(get('panel-cartogram').hidden,true);assert.equal(get('panel-votes').hidden,false);assert.ok(all.filter(n=>Object.hasOwn(n.attributes,'data-combined-only')).every(n=>n.hidden));
 checkCompass(expected.prSeats);
 const svg=get('vote-share-chart').innerHTML,bars=[...svg.matchAll(/data-vote-party="([^"]+)" data-share="([^"]+)"/g)];
 assert.equal(bars.length,9);assert.ok(svg.includes('Percentage of the vote'));assert.ok(!svg.includes('<circle'));
 assert.deepEqual(bars.map(m=>m[1]),D.displayOrder.map(i=>D.parties[i].code));
 bars.forEach((m,rank)=>assert.ok(Math.abs(Number(m[2])-100*expected.votes[D.displayOrder[rank]])<1e-10,'PR chart must show actual vote shares rather than rounded seat shares'));
 get('theme').onclick();assert.equal((get('vote-share-chart').innerHTML.match(/data-vote-party=/g)||[]).length,9);
 get('view-combined').onclick();assert.equal(get('assembly-panel').hidden,false);assert.equal(get('panel-votes').hidden,true);
 get('tab-districts').onclick();get('district-state').value='IL';get('district-state').listeners.input();assert.equal((get('district-body').innerHTML.match(/<tr>/g)||[]).length,9);
 get('export-districts').onclick();assert.equal((await lastBlob.text()).trim().split('\n').length,401);
 const config={version:1,economic:.1,cultural:.2,variance:1,spread:0,seed:1,runs:3,parties:D.parties.map(({code,x,y})=>({code,x,y}))};
 get('load-config').files=[{size:1000,text:async()=>JSON.stringify(config)}];await get('load-config').onchange({target:get('load-config')});
 assert.equal(get('notice').textContent,'Configuration loaded.');get('save-config').onclick();assert.equal(JSON.parse(await lastBlob.text()).spread,.2);
 get('theme').onclick();get('view-district').onclick();assert.equal((get('cartogram').innerHTML.match(/data-district=/g)||[]).length,400);
 console.log('Interface event checks passed: full app startup, fixed variation, logarithmic party compass, two-way mouse and keyboard selection, relocated medians tab, live vote-share chart, political party order, map, tile inspection, state zoom/filter, Combined-only majority, 400-row export, old config normalization and theme switch.');
})().catch(e=>{console.error(e);process.exitCode=1});
