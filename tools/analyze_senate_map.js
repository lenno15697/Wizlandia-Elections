/* Read-only analysis: node tools/analyze_senate_map.js [main=10000000] [comparisons=1000000]
 * Main draws use seed 20261030; shortlisted swaps use independent seed 20261031.
 */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const D=require('../data'),E=require('../engine'),S=require('../senate'),H=require('../district-geography');
const root=__dirname+'/../',N=Number(process.argv[2]||10000000),M=Number(process.argv[3]||1000000),P=D.parties.length,cx=D.center[0],cy=D.center[1];
assert.ok(Number.isSafeInteger(N)&&N>0&&N%10===0);assert.ok(Number.isSafeInteger(M)&&M>0&&M%10===0);
const rows=E.districts(),points=S.election(E.evaluate()),politicalFields=['type','typeName','family','legacyId','x','y','baselineWinner'];
function winner(x,y,parties=D.parties){let w=-1,best=Infinity;for(const k of D.displayOrder){const p=parties[k],d=(x-p.x)**2+(y-p.y)**2;if(d<best){best=d;w=k;}}return w;}
function countSeats(points,a,out,stateCounts){out.fill(0);const z=Math.sqrt(a.variance);points.forEach((s,j)=>{const w=winner(cx+a.economic+z*(s.x-cx),cy+a.cultural+z*(s.y-cy));out[w]++;if(stateCounts)stateCounts[j][w]++;});return out;}
function swap(pairs){const a=rows.map(d=>({...d}));for(const [l,r]of pairs){const x=a.find(d=>d.id===l),y=a.find(d=>d.id===r);for(const key of ['type','name','legacyId','x','y']){const v=x[key];x[key]=y[key];y[key]=v;}}
 return S.election({rows:a,parties:D.parties});}
const oldPoints=swap([['LQ-13','EW-24']]);
function hist(){return{n:0,parties:Array.from({length:P},()=>Array(121).fill(0)),gap:Array(241).fill(0)};}
function record(h,seats){h.n++;for(let k=0;k<P;k++)h.parties[k][seats[k]]++;h.gap[seats[1]-seats[0]+120]++;}
function quantile(h,p){const n=h.reduce((a,b)=>a+b,0);let t=0;for(let j=0;j<h.length;j++){t+=h[j];if(t>=p*n)return j;}}
function summary(h){return{fullSenates:h.n,parties:D.parties.map((p,k)=>{const a=h.parties[k],mean=a.reduce((s,c,j)=>s+c*j,0)/h.n,v=a.reduce((s,c,j)=>s+c*(j-mean)**2,0)/(h.n-1),se=Math.sqrt(v/h.n);return{party:p.code,mean,sd:Math.sqrt(v),meanMCSE:se,mean95CI:[mean-1.96*se,mean+1.96*se],central95Range:[quantile(a,.025),quantile(a,.975)],majorityProbability:a.slice(61).reduce((x,y)=>x+y,0)/h.n};}),caMinusLdpMean:h.gap.reduce((s,c,j)=>s+c*(j-120),0)/h.n,caAheadProbability:h.gap.slice(121).reduce((a,b)=>a+b,0)/h.n,ldpAheadProbability:h.gap.slice(0,120).reduce((a,b)=>a+b,0)/h.n,tieProbability:h.gap[120]/h.n};}
// Check the exact affine-median optimization against the full official model.
const verify=new E.Mulberry32(20261032);let maxCoordinateError=0;
for(let i=0;i<1000;i++){
 const a=i===0?{economic:0,cultural:0,variance:1}:E.drawShocks(verify),r=S.election(E.evaluate(a.economic,a.cultural,a.variance));
 points.forEach((s,j)=>{const z=Math.sqrt(a.variance),x=cx+a.economic+z*(s.x-cx),y=cy+a.cultural+z*(s.y-cy);maxCoordinateError=Math.max(maxCoordinateError,Math.abs(x-r[j].x),Math.abs(y-r[j].y));assert.ok(Math.abs(x-r[j].x)<1e-12&&Math.abs(y-r[j].y)<1e-12);assert.equal(winner(x,y),r[j].winner);});
}
const currentHist=hist(),beforeHist=hist(),initialHist=hist(),stateCounts=points.map(()=>new Uint32Array(P)),rng=new E.Mulberry32(20261030),current=new Uint8Array(P),before=new Uint8Array(P),baseCounts=new Uint8Array(P);points.forEach(s=>baseCounts[s.winner]++);
for(let b=0;b<N/10;b++){
 const currentTotal=new Uint8Array(P),oldTotal=new Uint8Array(P),initial=Uint8Array.from(baseCounts);
 for(let t=0;t<10;t++){
  const a=E.drawShocks(rng);countSeats(points,a,current,stateCounts);countSeats(oldPoints,a,before);
  for(let p=0;p<P;p++){currentTotal[p]+=current[p];oldTotal[p]+=before[p];if(t<9)initial[p]+=current[p];}
 }
 record(currentHist,currentTotal);record(beforeHist,oldTotal);record(initialHist,initial);
}
console.log('Main: '+N.toLocaleString()+' matched cohorts before/after; '+(N/10).toLocaleString()+' full Senates each.');
const options=[
 {id:'current',label:'Current map: LQ-13/EW-24 already applied',pairs:[]},
 {id:'tiny_same_type',label:'Additional NX-43 / AX-49',pairs:[['NX-43','AX-49']]},
 {id:'moderate_suburban',label:'Additional NX-95 / ET-32',pairs:[['NX-95','ET-32']]},
 {id:'previous_suggestion',label:'Additional NX-95 / EW-53',pairs:[['NX-95','EW-53']]},
 {id:'competitive_quelor',label:'Additional QL-10 / WT-10',pairs:[['QL-10','WT-10']]}
];
const engineCode=fs.readFileSync(root+'engine.js','utf8');
let nationalChecks=0;
for(const option of options){
 option.points=option.pairs.length?swap(option.pairs):points;
 const g=JSON.parse(JSON.stringify(H));
 for(const [l,r]of option.pairs){const a=g.districts.find(d=>d.id===l),b=g.districts.find(d=>d.id===r);for(const key of politicalFields){const v=a[key];a[key]=b[key];b[key]=v;}}
 // Each candidate must keep geographic suitability constraints, baseline
 // statewide winners and original national profile generation order intact.
 assert.ok(option.points.every((s,i)=>s.winner===points[i].winner));
 const universities=g.districts.filter(d=>d.type===8);assert.deepEqual(universities.map(d=>d.locality).sort(),['Lorenvia','Wizlandia City','Akropolis','Southport','Ravenna','Erewenton'].sort());
 const farms=g.districts.filter(d=>[33,34,35,36,37,42].includes(d.type));farms.forEach(d=>{assert.ok(d.centroidY>=285&&d.coldNorthShare<=.35&&d.metroShare<=.45001);if(d.type===35)assert.ok(d.centroidY>=315);});
 const publicRows=g.districts.filter(d=>d.type===7);assert.equal(publicRows.filter(d=>d.locality==='Lorenvia').length,2);assert.equal(publicRows.filter(d=>d.locality==='Westhaven').length,1);
 for(const name of new Set(publicRows.map(d=>d.locality)))if(name!=='Lorenvia')assert.ok(publicRows.filter(d=>d.locality===name).length<=1);
 const sandbox={module:{exports:{}},require:n=>n==='./data.js'?D:n==='./district-geography.js'?g:null};vm.runInNewContext(engineCode,sandbox);const alternative=sandbox.module.exports;
 const project=e=>Array.from(e.districts(),d=>[d.legacyId,d.type,d.x,d.y]);assert.equal(JSON.stringify(project(alternative)),JSON.stringify(project(E)));
 const checkRng=new E.Mulberry32(20261033);
 for(let k=0;k<100;k++){
  const a=E.drawShocks(checkRng),parties=D.parties.map((p,j)=>({...p,x:p.x+(k>=50?.1*Math.sin(k+j):0),y:p.y+(k>=50?.1*Math.cos(k+j):0)}));
  const r=E.evaluate(a.economic,a.cultural,a.variance,D.spread,parties),t=alternative.evaluate(a.economic,a.cultural,a.variance,D.spread,parties);
  for(const key of ['seats','prSeats','combinedSeats','votes'])assert.equal(JSON.stringify(r[key]),JSON.stringify(t[key]));nationalChecks++;
 }
 option.audit=option.pairs.map(([l,r])=>[l,r].map(id=>{const old=H.districts.find(d=>d.id===id),now=g.districts.find(d=>d.id===id);return{id,locality:old.locality,state:old.stateCode,before:Object.fromEntries(politicalFields.map(k=>[k,old[k]])),after:Object.fromEntries(politicalFields.map(k=>[k,now[k]]))};}));
 option.histogram=hist();option.changedStateMedians=option.points.flatMap((s,i)=>Math.abs(s.x-points[i].x)+Math.abs(s.y-points[i].y)>1e-12?[{state:s.code,before:[points[i].x,points[i].y],after:[s.x,s.y]}]:[]);
}
// Independent confirmation sample, so the 20,000-draw candidate screen does
// not also serve as the final estimate for the selected alternatives.
const confirmationRng=new E.Mulberry32(20261031),tmp=new Uint8Array(P);
for(let b=0;b<M/10;b++){
 const totals=options.map(()=>new Uint8Array(P));
 for(let k=0;k<10;k++){
  const a=E.drawShocks(confirmationRng);
  options.forEach((o,j)=>{countSeats(o.points,a,tmp);for(let p=0;p<P;p++)totals[j][p]+=tmp[p];});
 }
 options.forEach((o,j)=>record(o.histogram,totals[j]));
}
const results={metadata:{date:'2026-10-29',mainSeed:20261030,comparisonSeed:20261031,mainCohorts:N,comparisonCohorts:M,independentFullSenates:N/10,mapPermutationVersion:H.compassPermutationVersion,implementedPermutation:[['LQ-13','EW-24']],partyOrder:D.parties.map(p=>p.code),shockDistributions:{economic:'N(0,0.35^2), rejected outside [-1,1], rounded to 0.01',cultural:'N(0,0.25^2), rejected outside [-1,1], rounded to 0.01',variance:'exp(N(0.04,0.20^2)), rejected outside [0.5,2], unrounded',independence:'National economic, cultural and variance shocks independent; different years independent; all states share each election’s national shocks.'},validation:{officialMedianChecks:1000,maxCoordinateError,nationalFullModelChecks:nationalChecks,includingChangedPartyPositions:nationalChecks/2},sourceHashes:Object.fromEntries(['data.js','district-geography.js','engine.js','senate.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(root+n)).digest('hex')]))},before:summary(beforeHist),current:summary(currentHist),baselineFixedInitialization:summary(initialHist),fixedInitialSeats:S.seats(S.create()),stateProbabilities:points.map((s,j)=>({code:s.code,name:s.name,x:s.x,y:s.y,baselineWinner:D.parties[s.winner].code,probabilities:Array.from(stateCounts[j],c=>c/N)})),alternatives:options.map(o=>({id:o.id,label:o.label,pairs:o.pairs,summary:summary(o.histogram),audit:o.audit,changedStateMedians:o.changedStateMedians,histogram:o.histogram})),histograms:{before:beforeHist,current:currentHist,baselineFixedInitialization:initialHist}};
fs.writeFileSync(root+'analysis/senate_map_results.json',JSON.stringify(results,null,2)+'\n');
const csv=(name,header,a)=>fs.writeFileSync(root+'analysis/'+name,[header,...a].map(r=>r.map(v=>JSON.stringify(v)).join(',')).join('\n')+'\n');
csv('senate_map_party_summary.csv',['map','party','mean_senate_seats','sd','mean_mcse','mean95low','mean95high','seat2.5','seat97.5','majority_probability'],[['before',results.before],['current',results.current],['baseline_fixed',results.baselineFixedInitialization]].flatMap(([id,s])=>s.parties.map(p=>[id,p.party,p.mean,p.sd,p.meanMCSE,...p.mean95CI,...p.central95Range,p.majorityProbability])));
csv('senate_map_state_probabilities.csv',['state','state_name','economic_median','cultural_median',...D.parties.map(p=>p.code)],results.stateProbabilities.map(s=>[s.code,s.name,s.x,s.y,...s.probabilities]));
csv('senate_map_alternatives.csv',['option','pairs',...D.parties.map(p=>p.code),'CA_minus_LDP','P_CA_ahead','P_LDP_ahead'],results.alternatives.map(o=>[o.id,o.pairs.map(p=>p.join(' / ')).join('; '),...o.summary.parties.map(p=>p.mean),o.summary.caMinusLdpMean,o.summary.caAheadProbability,o.summary.ldpAheadProbability]));
console.log(JSON.stringify({before:results.before,current:results.current,initial:results.baselineFixedInitialization,alternatives:results.alternatives.map(o=>({id:o.id,means:o.summary.parties.map(p=>p.mean),gap:o.summary.caMinusLdpMean}))},null,2));
