'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../data.js'),E=require('../engine.js'),fixture=require('./python-reference.json');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const helper=source.match(/^const largestPartiesFirst=.*$/m)[0];
const summary=source.slice(source.indexOf('function renderSummary(){'),source.indexOf('\nfunction renderParliament(){'));
const selections=[[],[0],[1],[2],[0,1],[0,2],[5,6],D.displayOrder];
let checked=0;
for(const scenario of fixture.scenarios){
  const current=E.evaluate(scenario.economic,scenario.cultural,scenario.variance);
  for(const view of ['combined','district','pr'])for(const members of selections){
    const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}});return nodes.get(id)};
    const v=E.component(current,view),c={shown:()=>v,current,view,selected:new Set(members),displayOrder:D.displayOrder,$,esc:String,pct:n=>(n*100).toFixed(1)+'%',swatch:()=>''};
    vm.runInNewContext(helper+'\n'+summary+'\nrenderSummary();',c);
    const count=members.length?members.reduce((n,i)=>n+v.seats[i],0):Math.max(...v.seats);
    assert.equal($('summary-clear').hidden,!members.length);
    assert.ok(!/NaN|Infinity/.test($('summary-badge-face').style.background));
    if(members.length===1){assert.equal($('summary-badge-code').textContent,current.parties[members[0]].code);assert.equal($('summary-badge-seats').textContent,`${count} seats`);assert.ok($('verdict-title').textContent.includes(current.parties[members[0]].name));}
    if(members.length>1)assert.equal($('summary-badge-code').textContent,count);
    if(view!=='combined'){
      assert.ok(!/majority|leads|short/i.test($('verdict-title').textContent+' '+$('verdict-detail').textContent));
      assert.ok($('summary-paths-section').hidden);assert.equal($('summary-paths').innerHTML,'');
    }else if(count<v.majority){
      assert.ok($('verdict-title').textContent.includes(`${v.majority-count} seats short`));
      assert.equal($('summary-paths-section').hidden,false);
      const paths=[...$('summary-paths').innerHTML.matchAll(/data-coalition="([\d,]+)"[\s\S]*?<strong>(\d+)<\/strong>/g)];
      assert.ok(paths.length>0&&paths.length<=4);
      for(const match of paths){
        const group=match[1].split(',').map(Number),total=group.reduce((n,i)=>n+v.seats[i],0);
        members.forEach(i=>assert.ok(group.includes(i)));
        assert.equal(total,Number(match[2]));assert.ok(total>=v.majority);
        group.forEach((i,j)=>{if(j)assert.ok(v.seats[group[j-1]]>=v.seats[i]);});
      }
    }else{
      assert.ok($('verdict-title').textContent.includes('majority'));
      assert.ok($('summary-paths-section').hidden);assert.equal($('summary-paths').innerHTML,'');
    }
    checked++;
  }
}
console.log(`Selection checks passed: ${checked} summaries, selected-party counts, coalition suggestions, zero-seat parties, and Combined-only majority information.`);
