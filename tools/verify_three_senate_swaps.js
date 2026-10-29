/* Validate the applied map, recalculate all historical checkmarks, and reproduce
 * the long-run mean: node tools/verify_three_senate_swaps.js [draws=10000000]. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const D=require('../data'),E=require('../engine'),S=require('../senate'),H=require('../district-geography'),audit=require('../district_permutations.json');
const root=__dirname+'/../',N=Number(process.argv[2]||10000000),seed=314159265;
assert.equal(H.compassPermutationVersion,11);assert.ok(Number.isSafeInteger(N)&&N>0&&N%10===0);
const before=JSON.parse(fs.readFileSync(root+'analysis/senate_history_before_three.json','utf8'));
// Preserve the original settings for this historical geographic comparison;
// the current starting history was subsequently rebalanced to 60/50/10.
const history={...S.create(),cohorts:before.defaultHistory.cohorts.map(c=>({...c,winners:Object.fromEntries(S.election(E.evaluate(c.settings.economic,c.settings.cultural,c.settings.variance)).map(s=>[s.code,s.winner]))}))},changes=[];
for(let i=0;i<10;i++){
 const c=history.cohorts[i],old=before.defaultHistory.cohorts[i];assert.deepEqual(c.settings,old.settings);
 const r=E.evaluate(c.settings.economic,c.settings.cultural,c.settings.variance);
 const expected=Object.fromEntries(S.election(r).map(s=>[s.code,s.winner]));assert.deepEqual(c.winners,expected);
 for(const s of H.states)if(c.winners[s.code]!==old.winners[s.code])changes.push({year:-2*i,state:s.code,before:D.parties[old.winners[s.code]].code,after:D.parties[c.winners[s.code]].code});
}
assert.equal(changes.length,5);assert.ok(changes.every(c=>c.before==='CA'&&c.after==='LDP'));
const oldGeography=JSON.parse(JSON.stringify(H));
for(const c of audit.latestPermutation.changes)Object.assign(oldGeography.districts.find(d=>d.id===c.district),c.before);
const sandbox={module:{exports:{}},require:n=>n==='./data.js'?D:n==='./district-geography.js'?oldGeography:null};
vm.runInNewContext(fs.readFileSync(root+'engine.js','utf8'),sandbox);const oldEngine=sandbox.module.exports;
const project=e=>Array.from(e.districts(),d=>[d.legacyId,d.type,d.x,d.y]);assert.equal(JSON.stringify(project(oldEngine)),JSON.stringify(project(E)));
const check=new E.Mulberry32(20261034);
for(let k=0;k<100;k++){
 const a=E.drawShocks(check),old=oldEngine.evaluate(a.economic,a.cultural,a.variance),now=E.evaluate(a.economic,a.cultural,a.variance);
 for(const key of ['seats','votes','prSeats','combinedSeats'])assert.equal(JSON.stringify(old[key]),JSON.stringify(now[key]));
}
const rows=E.districts(),points=S.election({rows,parties:D.parties});
assert.equal(points.find(s=>s.code==='NX').x,2.244163656930292);assert.equal(points.find(s=>s.code==='QL').x,1.9688095641951184);
assert.deepEqual(points.map(s=>s.winner),before.stateMedians.map(s=>s.winner));
const order=D.displayOrder,P=D.parties.length,cx=D.center[0],cy=D.center[1],rng=new E.Mulberry32(seed),hist=Array.from({length:P},()=>Array(121).fill(0));let ahead=0,behind=0,ties=0;
for(let block=0;block<N/10;block++){
 const seats=new Uint8Array(P);
 for(let t=0;t<10;t++){
  const a=E.drawShocks(rng),z=Math.sqrt(a.variance);
  for(const s of points){const x=cx+a.economic+z*(s.x-cx),y=cy+a.cultural+z*(s.y-cy);let w=-1,b=Infinity;for(const k of order){const p=D.parties[k],d=(x-p.x)**2+(y-p.y)**2;if(d<b){b=d;w=k;}}seats[w]++;}
 }
 for(let p=0;p<P;p++)hist[p][seats[p]]++;
 if(seats[0]>seats[1])ahead++;else if(seats[0]<seats[1])behind++;else ties++;
}
const count=N/10,parties=D.parties.map((p,i)=>{const h=hist[i],mean=h.reduce((s,v,j)=>s+v*j,0)/count,variance=h.reduce((s,v,j)=>s+v*(j-mean)**2,0)/(count-1),se=Math.sqrt(variance/count);return{party:p.code,mean,mean95CI:[mean-1.96*se,mean+1.96*se],majorityProbability:h.slice(61).reduce((a,b)=>a+b,0)/count};});
const result={date:'2026-10-29',permutationVersion:11,cohortDraws:N,independentFullSenates:count,seed,appliedSwaps:audit.latestPermutation.orderedSwaps,initialSeatCounts:S.seats(history),historicalSettingsPreserved:true,historicalCheckmarkChanges:changes,parties,ldpAhead:ahead/count,caAhead:behind/count,tie:ties/count,stateMedians:points,cohorts:history.cohorts,validation:{nationalModelOrderUnchanged:true,nationalScenariosChecked:100,all120HistoricalCheckmarksRecomputed:true},sourceHashes:Object.fromEntries(['data.js','engine.js','senate.js','district-geography.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(root+n)).digest('hex')]))};
fs.writeFileSync(root+'analysis/senate_three_swaps_results.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(root+'analysis/senate_history_after_three.csv',[['year',...H.states.map(s=>s.code)],...history.cohorts.map((c,i)=>[-2*i,...H.states.map(s=>D.parties[c.winners[s.code]].code)])].map(row=>row.join(',')).join('\n')+'\n');
console.log(JSON.stringify({cohortDraws:N,initialSeatCounts:result.initialSeatCounts,changes,parties,ldpAhead:result.ldpAhead},null,2));
