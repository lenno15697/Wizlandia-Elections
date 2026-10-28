'use strict';
// Matched before/after elections: replay the same shocks and PR allocation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const D=require('../data.js'),E=require('../engine.js'),snapshot=require('../analysis/university_shift_before.json');
const samples=Number(process.argv[2]||snapshot.samples),seed=Number(process.argv[3]||snapshot.seed);
assert.ok(Number.isInteger(samples)&&samples>0);assert.ok(Number.isInteger(seed)&&seed>=0&&seed<=4294967295);
const codes=D.parties.map(p=>p.code),positions=E.districts(),indexById=new Map(positions.map((d,i)=>[d.id,i]));
const university=positions.filter(d=>d.type===8),oldById=new Map(snapshot.oldDistricts.map(d=>[d.id,d]));
assert.equal(university.length,6);
for(const d of university){const expected=snapshot.newDistricts.find(r=>r.id===d.id);assert.equal(d.x,expected.x);assert.equal(d.y,expected.y);}
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),coalitionSource=app.slice(app.indexOf('function coalitionTier('),app.indexOf('function renderSummary('));
const coalitionContext={displayOrder:D.displayOrder,largestPartiesFirst:(indices,seats)=>indices.slice().sort((a,b)=>seats[b]-seats[a]||D.displayOrder.indexOf(a)-D.displayOrder.indexOf(b))};
vm.runInNewContext(coalitionSource,coalitionContext);
const groups=[];
for(let mask=1;mask<512;mask++){
 const members=codes.map((_,i)=>i).filter(i=>mask&(1<<i)),tier=coalitionContext.coalitionTier(members.map(i=>codes[i]));
 if(tier<7)groups.push({mask,members,tier});
}
function topCoalition(seats){
 let best=null;
 for(const group of groups){
  const total=group.members.reduce((s,i)=>s+seats[i],0);
  if(total<401||group.members.some(i=>total-seats[i]>=401))continue;
  if(!best||group.tier<best.tier||group.tier===best.tier&&(group.members.length<best.members.length||group.members.length===best.members.length&&total>best.total))best={...group,total};
 }
 return best?best.mask:0;
}
const coalitionName=mask=>mask?codes.filter((_,i)=>mask&(1<<i)).join(' + '):'No viable coalition';
function previousResult(result){
 const districtSeats=result.districtSeats.slice(),oldUniversity=Array(9).fill(0),newUniversity=Array(9).fill(0),flips=[];
 for(const district of university){
  const old=oldById.get(district.id),scale=Math.sqrt(result.variance);
  const x=D.center[0]+result.economic+scale*(old.x-D.center[0]),y=D.center[1]+result.cultural+scale*(old.y-D.center[1]);
  const distances=D.parties.map(p=>(x-p.x)**2+(y-p.y)**2),minimum=Math.min(...distances);
  const tied=distances.map((d,i)=>Math.abs(d-minimum)<1e-9?i:-1).filter(i=>i>=0);
  const previous=tied[indexById.get(district.id)%tied.length],next=result.rows[indexById.get(district.id)].winner;
  districtSeats[next]--;districtSeats[previous]++;oldUniversity[previous]++;newUniversity[next]++;
  if(previous!==next)flips.push({id:district.id,previous,next});
 }
 return{districtSeats,combinedSeats:districtSeats.map((n,i)=>n+result.prSeats[i]),oldUniversity,newUniversity,flips};
}
function totals(){return{district:Array(9).fill(0),combined:Array(9).fill(0),university:Array(9).fill(0),combinedMajority:Array(9).fill(0),districtMajority:Array(9).fill(0),largestCombined:Array(9).fill(0),noCombinedMajority:0,coalitions:{}};}
const before=totals(),after=totals(),sumPR=Array(9).fill(0),flipHistogram=Array(7).fill(0),transitions={};
const individual=Object.fromEntries(university.map(d=>[d.id,{locality:d.locality,before:Array(9).fill(0),after:Array(9).fill(0),changed:0}]));
const categories={variance:[[.8,'<0.8'],[1,'0.8–1.0'],[1.2,'1.0–1.2'],[Infinity,'≥1.2']],economic:[[-.35,'<−0.35'],[.35,'−0.35–0.35'],[Infinity,'≥0.35']],cultural:[[-.25,'<−0.25'],[.25,'−0.25–0.25'],[Infinity,'≥0.25']]};
const bins=Object.fromEntries(Object.entries(categories).map(([key,values])=>[key,Object.fromEntries(values.map(([,label])=>[label,{samples:0,changed:0,universityFlips:0}]))]));
let changed=0,largestChanged=0,coalitionChanged=0,majorityStatusChanged=0;const coalitionExamples=[];
function add(target,district,combined,uni,coalition){
 for(let i=0;i<9;i++){target.district[i]+=district[i];target.combined[i]+=combined[i];target.university[i]+=uni[i];if(combined[i]>=401)target.combinedMajority[i]++;if(district[i]>=201)target.districtMajority[i]++;}
 target.largestCombined[combined.indexOf(Math.max(...combined))]++;
 if(Math.max(...combined)<401)target.noCombinedMajority++;
 const key=coalitionName(coalition);target.coalitions[key]=(target.coalitions[key]||0)+1;
}
const rng=new E.Mulberry32(seed);
for(let run=0;run<samples;run++){
 const shock=E.drawShocks(rng),next=E.evaluate(shock.economic,shock.cultural,shock.variance),previous=previousResult(next),n=previous.flips.length;
 const beforeCoalition=topCoalition(previous.combinedSeats),afterCoalition=n?topCoalition(next.combinedSeats):beforeCoalition;
 if(run<1000){
  for(const [seats,mask] of [[previous.combinedSeats,beforeCoalition],[next.combinedSeats,afterCoalition]]){
   const first=coalitionContext.rankedCoalitions(D.parties,seats,401)[0],expected=first?first.members.reduce((s,i)=>s|(1<<i),0):0;assert.equal(mask,expected);
  }
 }
 flipHistogram[n]++;if(n)changed++;
 if(previous.combinedSeats.indexOf(Math.max(...previous.combinedSeats))!==next.combinedSeats.indexOf(Math.max(...next.combinedSeats)))largestChanged++;
 if((Math.max(...previous.combinedSeats)>=401)!==(Math.max(...next.combinedSeats)>=401))majorityStatusChanged++;
 if(beforeCoalition!==afterCoalition){coalitionChanged++;if(coalitionExamples.length<5)coalitionExamples.push({shock,before:previous.combinedSeats,after:next.combinedSeats,beforeCoalition:coalitionName(beforeCoalition),afterCoalition:coalitionName(afterCoalition)});}
 for(const [key,values] of Object.entries(categories)){const label=values.find(([limit])=>shock[key]<limit)[1],bin=bins[key][label];bin.samples++;if(n)bin.changed++;bin.universityFlips+=n;}
 for(const district of university){
  const nextWinner=next.rows[indexById.get(district.id)].winner,flip=previous.flips.find(f=>f.id===district.id),oldWinner=flip?flip.previous:nextWinner;
  individual[district.id].before[oldWinner]++;individual[district.id].after[nextWinner]++;if(flip)individual[district.id].changed++;
  const transition=codes[oldWinner]+' → '+codes[nextWinner];transitions[transition]=(transitions[transition]||0)+1;
 }
 for(let i=0;i<9;i++)sumPR[i]+=next.prSeats[i];
 add(before,previous.districtSeats,previous.combinedSeats,previous.oldUniversity,beforeCoalition);add(after,next.districtSeats,next.combinedSeats,previous.newUniversity,afterCoalition);
 if((run+1)%20000===0)console.log(`${run+1}/${samples} paired elections`);
}
const examples=[[0,0,1],[0,.5,1],[0,0,.8],[0,.5,.8],[-.5,0,1],[.5,0,1],[0,0,1.5],[0,1,1]].map(([economic,cultural,variance])=>{
 const next=E.evaluate(economic,cultural,variance),old=previousResult(next);return{economic,cultural,variance,beforeDistrict:old.districtSeats,afterDistrict:next.districtSeats,beforeUniversity:old.oldUniversity,afterUniversity:old.newUniversity};
});
const results={samples,seed,codes,before,after,sumPR,changed,flipHistogram,transitions,individual,bins,largestChanged,coalitionChanged,majorityStatusChanged,coalitionExamples,examples};
const output=path.join(__dirname,'../analysis/university_shift_results.json'),stage=output+'.partial';fs.writeFileSync(stage,JSON.stringify(results,null,2)+'\n');fs.renameSync(stage,output);
console.log(JSON.stringify({samples,changed,largestChanged,coalitionChanged,majorityStatusChanged,meanDistrictBefore:before.district.map(n=>n/samples),meanDistrictAfter:after.district.map(n=>n/samples),meanUniversityBefore:before.university.map(n=>n/samples),meanUniversityAfter:after.university.map(n=>n/samples)}));
