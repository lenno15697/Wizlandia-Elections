/* Screen small, geographically similar single swaps. Does not edit model files. */
'use strict';
const fs=require('node:fs'),D=require('../data'),E=require('../engine'),S=require('../senate'),H=require('../district-geography');
const root=__dirname+'/../analysis/',rows=E.districts(),meta=new Map(H.districts.map(d=>[d.id,d])),base=S.election(E.evaluate()),index=new Map(base.map((s,i)=>[s.code,i]));
const seed=20261030,n=20000,rng=new E.Mulberry32(seed),order=D.displayOrder,cx=D.center[0],cy=D.center[1];
const samples=Array.from({length:n},()=>{const a=E.drawShocks(rng);return[a.economic,a.cultural,Math.sqrt(a.variance)];});
function winner(s,a){const x=cx+a[0]+a[2]*(s.x-cx),y=cy+a[1]+a[2]*(s.y-cy);let w=-1,b=Infinity;for(const k of order){const p=D.parties[k],d=(x-p.x)**2+(y-p.y)**2;if(d<b){w=k;b=d;}}return w;}
const prior=base.map(s=>Uint8Array.from(samples,a=>winner(s,a)));
const excluded=new Set(['LQ-13','EW-24']),protectedTypes=new Set([7,8,10,25,26,31,33,34,35,36,37,42,43,46,47,50]),candidates=[];
for(const a of rows.filter(r=>['NX','LQ','QL'].includes(r.stateCode)))for(const b of rows){
 if(a.stateCode===b.stateCode||a.x>=b.x||excluded.has(a.id)||excluded.has(b.id))continue;
 const am=meta.get(a.id),bm=meta.get(b.id),distance=Math.hypot(a.x-b.x,a.y-b.y);
 if(am.family!==bm.family||distance>1.1||Math.abs(a.y-b.y)>.65||Math.abs(am.metroShare-bm.metroShare)>.3)continue;
 if(a.type!==b.type&&(protectedTypes.has(a.type)||protectedTypes.has(b.type)))continue;
 const swapped=rows.map(r=>r.id===a.id?{...r,x:b.x,y:b.y}:r.id===b.id?{...r,x:a.x,y:a.y}:r),points=S.election({rows:swapped,parties:D.parties});
 if(points.some((p,i)=>p.winner!==base[i].winner))continue;
 const affected=points.map((p,i)=>Math.abs(p.x-base[i].x)+Math.abs(p.y-base[i].y)>1e-12?i:-1).filter(i=>i>=0);
 if(!affected.length)continue;
 const delta=Array(D.parties.length).fill(0);
 for(const j of affected)for(let k=0;k<n;k++){const w=winner(points[j],samples[k]);delta[w]++;delta[prior[j][k]]--;}
 const senateDelta=delta.map(d=>10*d/n);if(senateDelta[0]<=.005)continue;
 candidates.push({pairs:[[a.id,b.id]],coordinateDistance:distance,sameType:a.type===b.type,sameBaselineDistrictWinner:am.baselineWinner===bm.baselineWinner,family:am.family,metroDifference:Math.abs(am.metroShare-bm.metroShare),profiles:[a,b].map(r=>({id:r.id,state:r.stateCode,type:r.type,name:r.name,x:r.x,y:r.y,locality:meta.get(r.id).locality,baselineWinner:meta.get(r.id).baselineWinner})),screenSenateDelta:senateDelta,changedStateMedians:affected.map(i=>({state:base[i].code,before:[base[i].x,base[i].y],after:[points[i].x,points[i].y]}))});
}
candidates.sort((a,b)=>b.screenSenateDelta[0]-a.screenSenateDelta[0]||a.coordinateDistance-b.coordinateDistance);
fs.mkdirSync(root,{recursive:true});fs.writeFileSync(root+'senate_permutation_candidates.json',JSON.stringify({seed,screenDraws:n,constraints:{maxCoordinateDistance:1.1,maxCulturalDifference:.65,maxMetroShareDifference:.3,sameFamily:true,preserveBaselineStateWinners:true,appliedSwapUntouched:true,protectedTypesRequireSameType:true},candidateCount:candidates.length,candidates},null,2)+'\n');
console.log('Candidates',candidates.length);
for(const c of candidates.slice(0,12))console.log(c.pairs,'LDP delta',c.screenSenateDelta[0].toFixed(3),'distance',c.coordinateDistance.toFixed(3),'same type',c.sameType,'same winner',c.sameBaselineDistrictWinner);
console.log('Smallest movements');for(const c of candidates.slice().sort((a,b)=>a.coordinateDistance-b.coordinateDistance).slice(0,12))console.log(c.pairs,'LDP delta',c.screenSenateDelta[0].toFixed(3),'distance',c.coordinateDistance.toFixed(3),'same type',c.sameType);
