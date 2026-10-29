/* Check and export the deliberately selected 60/50/10 default Senate history. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),D=require('../data'),E=require('../engine'),S=require('../senate'),H=require('../district-geography');
const session=S.create(),totals=S.seats(session),rows=[];
assert.deepEqual(totals,[60,50,0,10,0,0,0,0,0]);
assert.deepEqual(S.seats(session,true),[6,5,0,1,0,0,0,0,0]);
for(let i=0;i<session.cohorts.length;i++){
 const c=session.cohorts[i],a=c.settings,expected=S.election(E.evaluate(a.economic,a.cultural,a.variance)),counts=Array(9).fill(0);
 assert.equal(Object.keys(c.winners).length,12);
 for(const s of expected){assert.equal(c.winners[s.code],s.winner);counts[s.winner]++;}
 rows.push({year:-2*i,economic:a.economic,cultural:a.cultural,variance:a.variance,seats:Object.fromEntries(D.parties.map((p,j)=>[p.code,counts[j]])),winners:Object.fromEntries(H.states.map(s=>[s.code,D.parties[c.winners[s.code]].code]))});
}
const result={description:'Chosen fictional default history, calculated from coherent moderate national swings and current state medians.',defaultOnly:true,baselineUnchanged:true,futureShockDistributionUnchanged:true,partyOrder:D.parties.map(p=>p.code),totals:Object.fromEntries(D.parties.map((p,j)=>[p.code,totals[j]])),elections:rows};
fs.writeFileSync(__dirname+'/../analysis/senate_history_initialization.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(__dirname+'/../analysis/senate_history_initialization.csv',[['year','economic_shift','cultural_shift','variance','LDP','CA','CON',...H.states.map(s=>s.code)],...rows.map(r=>[r.year,r.economic,r.cultural,r.variance,r.seats.LDP,r.seats.CA,r.seats.CON,...H.states.map(s=>r.winners[s.code])])].map(r=>r.join(',')).join('\n')+'\n');
console.log(JSON.stringify({totals:result.totals,elections:rows.map(({year,economic,cultural,variance,seats})=>({year,economic,cultural,variance,seats}))},null,2));
