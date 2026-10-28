'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../data.js'),E=require('../engine.js'),fixture=require('./python-reference.json');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8'),html=fs.readFileSync(require.resolve('../index.html'),'utf8');
assert.match(html,/<th data-combined-only>Result<\/th><th>Most Viable Coalition<\/th><th[^>]*>Electoral Districts<\/th><th[^>]*>PR List<\/th><th[^>]*>Combined<\/th>/);
const helper=source.match(/^const largestPartiesFirst=.*$/m)[0];
const ranking=source.slice(source.indexOf('function coalitionTier('),source.indexOf('function renderSummary('));
const summary=source.slice(source.indexOf('function renderSummary(){'),source.indexOf('\nfunction renderParliament(){'));
const historyRenderer=source.slice(source.indexOf('function renderHistory(){'),source.indexOf('\nfunction showTab('));
const base=E.evaluate(),runs=fixture.scenarios.map((s,i)=>({id:i+1,label:'Run '+(i+1),result:E.evaluate(s.economic,s.cultural,s.variance)}));
// Include a lower-tier majority, equal-size tie breaks, a solo majority and no eligible majority.
for(const seats of [[316,195,60,56,73,35,43,14,8],[300,70,70,110,115,5,120,5,5],[410,190,80,50,20,20,10,10,10],[100,80,60,50,40,300,30,70,70]]){const districtSeats=E.allocatePR(seats,400),prSeats=seats.map((n,i)=>n-districtSeats[i]);runs.push({id:runs.length+1,label:'Special '+runs.length,result:{...base,districtSeats,prSeats,combinedSeats:seats}});}
let checked=0;
for(const view of ['combined','district','pr']){
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}});return nodes.get(id);};
  const c={view,current:base,history:runs,batchStats:null,selected:new Set([5,7,8]),displayOrder:D.displayOrder,$,esc:String,swatch:p=>`<span class="swatch" style="background:${p.color}"></span>`,signed:x=>String(x),pct:String,E,D};
  c.shown=(r=c.current)=>E.component(r,c.view);
  vm.createContext(c);vm.runInContext(helper+'\n'+ranking+'\n'+summary+'\n'+historyRenderer+'\nrenderHistory();',c);
  const historyRows=[...$('history-body').innerHTML.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  assert.equal(historyRows.length,runs.length);
  for(const row of historyRows){
    const id=Number(row[1].match(/data-history="(\d+)"/)[1]),run=runs.find(r=>r.id===id);
    const cells=[...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
    const shownSeats=E.component(run.result,view).seats,leader=shownSeats.indexOf(Math.max(...shownSeats));
    assert.equal(cells.length,view==='combined'?13:12);
    for(const [j,key] of ['districtSeats','prSeats','combinedSeats'].entries())assert.equal(cells[5+j],String(run.result[key][leader]));
    const coalitionColumn=view==='combined'?9:8;
    if(view==='combined')assert.equal(cells[8],shownSeats[leader]>=401?'Majority':'No overall majority');
    assert.equal(cells[4],D.parties[leader].code);
    // Compare with the actual summary's first rendered option for this saved run,
    // even though the History table was drawn while another run was current.
    c.current=run.result;c.view='combined';vm.runInContext('renderSummary()',c);
    const first=$('summary-paths').innerHTML.match(/data-coalition="([\d,]+)"[\s\S]*?<strong>(\d+)<\/strong>/);
    const expected=first?first[1].split(',').map(i=>run.result.parties[Number(i)].code).join(' + '):'No viable coalition';
    assert.equal(cells[coalitionColumn],expected,'History must match the saved run’s top Combined coalition in '+view+' view');
    const coalitionHtml=[...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)][coalitionColumn][1];
    const colors=[...coalitionHtml.matchAll(/style="background:([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(colors,first?first[1].split(',').map(i=>run.result.parties[Number(i)].color):[],'Coalition dots must match its parties in display order');
    const coalitionTotals=cells.slice(coalitionColumn+1);
    if(first){
      const members=first[1].split(',').map(Number);
      const expectedTotals=['districtSeats','prSeats','combinedSeats'].map(key=>members.reduce((n,i)=>n+run.result[key][i],0));
      assert.deepEqual(coalitionTotals,expectedTotals.map(String));
      assert.equal(Number(coalitionTotals[2]),Number(first[2]));
      assert.equal(Number(coalitionTotals[2]),Number(coalitionTotals[0])+Number(coalitionTotals[1]));
    }else assert.deepEqual(coalitionTotals,['—','—','—']);
    checked++;
  }
  assert.ok($('history-body').innerHTML.includes('No viable coalition'));
  assert.ok($('history-body').innerHTML.includes('LDP</td><td>205</td><td>205</td><td>410</td>'));
}
console.log(`History checks passed: ${checked} saved-run coalitions match the first Ways to reach 401 option across all three views, with matching district/PR/Combined coalition totals, party dots, solo and absent majorities.`);
