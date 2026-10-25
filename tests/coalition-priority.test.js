'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../data.js'),E=require('../engine.js');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
const priority=source.slice(source.indexOf('function coalitionTier('),source.indexOf('function renderSummary('));
const helper=source.match(/^const largestPartiesFirst=.*$/m)[0];
const summary=source.slice(source.indexOf('function renderSummary(){'),source.indexOf('\nfunction renderParliament(){'));
const policy={};vm.createContext(policy);vm.runInContext(priority,policy);
const mainstream=['LDP','CA','SDP','CON','GRN','LIB'];
const specified=[
  [2,['LDP','CON']],[2,['LDP','GRN']],[2,['LDP','LIB']],
  [2,['CA','SDP']],[2,['CA','GRN']],[2,['CA','CON']],
  [3,['LDP','CON','LIB']],[3,['LDP','GRN','LIB']],
  [3,['CA','SDP','GRN']],[3,['CA','SDP','CON']],
  [4,['LDP','CA']],[4,['LDP','CON','GRN']],[4,['CA','CON','GRN']]
];
const expected=new Map(specified.map(([tier,codes])=>[codes.slice().sort().join('+'),tier]));
for(let mask=1;mask<(1<<mainstream.length);mask++){
  const codes=mainstream.filter((_,i)=>mask&(1<<i));
  const tier=codes.length===1?1:expected.get(codes.slice().sort().join('+'))||5;
  assert.equal(policy.coalitionTier(codes),tier);assert.equal(policy.coalitionTier(codes.slice().reverse()),tier);
}
for(const code of ['NF','UPL','SWP']){
  assert.equal(policy.coalitionTier([code]),6);
  for(let mask=0;mask<(1<<mainstream.length);mask++)assert.equal(policy.coalitionTier([code,...mainstream.filter((_,i)=>mask&(1<<i))]),6);
}
function suggestions(seats,selection=[]){
  assert.equal(seats.reduce((a,b)=>a+b,0),800);
  const current={parties:D.parties,combinedSeats:seats,votes:D.parties.map(()=>1/9)},nodes=new Map();
  const $=id=>{if(!nodes.has(id))nodes.set(id,{style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}});return nodes.get(id)};
  const c={view:'combined',shown:()=>({...E.component(E.evaluate(),'combined'),seats}),current,selected:new Set(selection),displayOrder:D.displayOrder,$,esc:String,pct:String,swatch:()=>''};
  vm.runInNewContext(helper+'\n'+priority+'\n'+summary+'\nrenderSummary();',c);
  const paths=[...$('summary-paths').innerHTML.matchAll(/data-coalition="([\d,]+)" data-tier="(\d)"[\s\S]*?<strong>(\d+)<\/strong>/g)].map(m=>({codes:m[1].split(',').map(i=>D.parties[Number(i)].code),tier:Number(m[2]),total:Number(m[3])}));
  return{paths,empty:$('summary-paths-empty').hidden===false,sectionHidden:$('summary-paths-section').hidden};
}
const baseline=E.evaluate().combinedSeats;
assert.deepEqual(suggestions(baseline).paths.map(p=>p.tier),[4,4,5,5]);
assert.deepEqual(suggestions([250,240,150,70,40,10,20,10,10],[1]).paths.map(p=>p.tier),[3,3,4,5]);
assert.deepEqual(suggestions([350,190,100,55,50,5,40,5,5],[0]).paths.map(p=>p.tier),[2,3,4,5]);
const ties=suggestions([300,70,70,110,115,5,120,5,5],[0]).paths;
assert.deepEqual(ties.map(p=>p.tier),[2,2,2,5]);
assert.deepEqual(new Set(ties.slice(0,3).map(p=>p.codes.slice().sort().join('+'))),new Set(['CON+LDP','GRN+LDP','LDP+LIB']));
for(const selected of [[5],[7],[8],[0,5]]){
  const r=suggestions(baseline,selected);assert.equal(r.paths.length,0);assert.ok(r.empty);
}
// Even with no permitted majority, tier 6 cannot fill the four suggestion slots.
const none=suggestions([100,80,60,50,40,300,30,70,70],[0]);
assert.equal(none.paths.length,0);assert.ok(none.empty);
const solo=suggestions([410,190,80,50,20,20,10,10,10]);
assert.ok(solo.sectionHidden);assert.equal(solo.paths.length,0);
console.log('Coalition priorities passed: all six tiers, no preference within tiers, cordon exclusion, majority threshold, top four, and empty state.');
