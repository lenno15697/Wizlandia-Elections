/* Pure election model. No DOM, packages, network calls, or changing district noise. */
(function(root){
'use strict';
const D = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.WizlandiaData;
const GEO=typeof module!=='undefined'&&module.exports?require('./district-geography.js'):root.WizlandiaGeography;
const byLegacy=new Map(GEO.districts.map(d=>[d.legacyId,d]));
const GOLDEN_ANGLE = Math.PI * (3-Math.sqrt(5));
const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function compressEconomic(x){
  const c=D.economicCompression;
  return c&&x>=c.origin&&x<=c.sourceMax?c.origin+c.scale*(x-c.origin):x;
}
function validateParties(parties){
  if(!Array.isArray(parties)||parties.length!==9)throw new Error('The model requires nine parties.');
  parties.forEach((p,i)=>{
    if(p.code!==D.parties[i].code||![p.x,p.y].every(x=>Number.isFinite(x)&&Math.abs(x)<=12))throw new Error('Invalid party coordinates.');
    if(parties.some((q,j)=>j<i&&sq(p,q)<1e-12))throw new Error('Two parties cannot occupy exactly the same position.');
  });
}
function districts(spread=D.spread,applyCompression=true){
  if(!Number.isFinite(spread)||spread<0||spread>0.2)throw new Error('District variation must be between 0 and 0.20.');
  const out=[];
  (D.sourceTypes||D.types).forEach(t=>{
    const d=D.parties.map(p=>sq(t,p)), win=d.indexOf(Math.min(...d));
    const margin=Math.min(...D.parties.map((p,j)=>j===win?Infinity:(d[j]-d[win])/(2*Math.sqrt(sq(p,D.parties[win])))));
    const radius=Math.min(spread,.8*margin), pairs=Math.floor(t.count/2);
    let k=0;
    for(let j=0;j<pairs;j++){
      const theta=(t.id+j)*GOLDEN_ANGLE, r=radius*(.55+.45*(j+1)/pairs);
      for(const sign of [1,-1])out.push({id:`${String(t.id).padStart(2,'0')}-${String(++k).padStart(2,'0')}`,type:t.id,name:t.name,x:t.x+sign*r*Math.cos(theta),y:t.y+sign*r*Math.sin(theta)});
    }
    if(t.count%2)out.push({id:`${String(t.id).padStart(2,'0')}-${String(++k).padStart(2,'0')}`,type:t.id,name:t.name,x:t.x,y:t.y});
  });
  return out.map(d=>{const g=byLegacy.get(d.id);if(!g||g.type!==d.type)throw new Error('District geography does not match the model.');return{...d,x:applyCompression?compressEconomic(d.x):d.x,id:g.id,legacyId:d.id,state:g.state,stateCode:g.stateCode,stateIndex:g.stateIndex,locality:g.locality,population:g.population,mapX:g.mapX,mapY:g.mapY,tileX:g.tileX,tileY:g.tileY,family:g.family};});
}
function cellPieces(index,parties){
  let lower=[],upper=[],left=-Infinity,right=Infinity;
  const p=parties[index];
  parties.forEach((q,j)=>{
    if(j===index)return;
    const a=2*(q.x-p.x),b=2*(q.y-p.y),c=q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y;
    if(Math.abs(b)<1e-14){if(a>0)right=Math.min(right,c/a);else left=Math.max(left,c/a);}
    else(b>0?upper:lower).push([-a/b,c/b]);
  });
  const lines=lower.concat(upper),cuts=[left,right];
  lines.forEach(([a,b],i)=>lines.slice(i+1).forEach(([c,d])=>{
    if(Math.abs(a-c)>1e-14){const x=(d-b)/(a-c);if(x>left&&x<right)cuts.push(x);}
  }));
  const sorted=[...new Set(cuts)].sort((a,b)=>a-b),pieces=[];
  for(let i=0;i<sorted.length-1;i++){
    const l=sorted[i],r=sorted[i+1];
    const test=!Number.isFinite(l)?(!Number.isFinite(r)?0:r-Math.max(1,Math.abs(r))):!Number.isFinite(r)?l+Math.max(1,Math.abs(l)):(l+r)/2;
    const lo=lower.reduce((best,line)=>!best||line[0]*test+line[1]>best[0]*test+best[1]?line:best,null);
    const hi=upper.reduce((best,line)=>!best||line[0]*test+line[1]<best[0]*test+best[1]?line:best,null);
    if((lo?lo[0]*test+lo[1]:-Infinity)<(hi?hi[0]*test+hi[1]:Infinity)){
      const last=pieces.at(-1);
      if(last&&last[2]===lo&&last[3]===hi&&last[1]===l)last[1]=r;else pieces.push([l,r,lo,hi]);
    }
  }
  return pieces;
}
// Normal CDF approximation: absolute error below 7.5e-8.
function normalCDF(x){
  const z=Math.abs(x),t=1/(1+.2316419*z);
  const tail=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return x>=0?1-tail:tail;
}
let cachedKey='',cachedCells;
function voteShares(economic=0,cultural=0,variance=1,parties=D.parties){
  const key=JSON.stringify(parties.map(p=>[p.x,p.y]));
  if(key!==cachedKey){cachedCells=parties.map((_,i)=>cellPieces(i,parties));cachedKey=key;}
  const result=Array(9).fill(0),scale=Math.sqrt(variance);
  D.weights.forEach((w,k)=>{
    const cov=D.covariances[k],sx=scale*Math.sqrt(cov[0][0]),sy=scale*Math.sqrt(cov[1][1]);
    const rho=cov[0][1]/Math.sqrt(cov[0][0]*cov[1][1]),d=Math.sqrt(1-rho*rho);
    const mx=D.center[0]+economic+scale*(D.means[k][0]-D.center[0]);
    const my=D.center[1]+cultural+scale*(D.means[k][1]-D.center[1]);
    cachedCells.forEach((cell,i)=>{
      let total=0;
      cell.forEach(([left,right,lower,upper])=>{
        const lo=Math.max(-12,(left-mx)/sx),hi=Math.min(12,(right-mx)/sx);
        if(lo>=hi)return;
        const cuts=[lo,hi,...[-8,-4,0,4,8].filter(x=>lo<x&&x<hi)];
        const bounds=[lower,upper].map(line=>{
          if(!line)return null;
          const a=(line[0]*mx+line[1]-my)/(sy*d),b=(line[0]*sx/sy-rho)/d;
          if(Math.abs(b)>1e-14)for(const z of [-10,-6,-3,0,3,6,10]){const t=(z-a)/b;if(lo<t&&t<hi)cuts.push(t);}
          return[a,b];
        });
        const sorted=[...new Set(cuts)].sort((a,b)=>a-b);
        for(let c=0;c<sorted.length-1;c++){
          const mid=(sorted[c]+sorted[c+1])/2,half=(sorted[c+1]-sorted[c])/2;
          D.gaussNodes.forEach((node,j)=>{
            const t=mid+half*node;
            const low=bounds[0]?normalCDF(bounds[0][0]+bounds[0][1]*t):0;
            const high=bounds[1]?normalCDF(bounds[1][0]+bounds[1][1]*t):1;
            total+=half*D.gaussWeights[j]*Math.exp(-t*t/2)/Math.sqrt(2*Math.PI)*(high-low);
          });
        }
      });
      result[i]+=w*total;
    });
  });
  const sum=result.reduce((a,b)=>a+b,0);
  return result.map(v=>Math.max(0,v/sum));
}
function allocatePR(votes,total=D.prSeatCount){
  if(!Array.isArray(votes)||!votes.length||!votes.every(v=>Number.isFinite(v)&&v>=0)||votes.reduce((a,b)=>a+b,0)<=0)throw new Error('Votes must be finite, nonnegative and have positive total.');
  if(!Number.isInteger(total)||total<1)throw new Error('PR seat count must be a positive integer.');
  const sum=votes.reduce((a,b)=>a+b,0),quotas=votes.map(v=>v/sum*total),seats=quotas.map(Math.floor);
  const remaining=total-seats.reduce((a,b)=>a+b,0);
  const order=quotas.map((q,i)=>({i,remainder:q-seats[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
  for(const {i} of order.slice(0,remaining))seats[i]++;
  return seats;
}
const components={
  district:{key:'district',label:'Electoral Districts',noun:'district',total:400,majority:201,baseline:D.baseline,description:'400 single-member districts · Ranked Pairs model'},
  pr:{key:'pr',label:'PR List',noun:'PR',total:D.prSeatCount,majority:Math.floor(D.prSeatCount/2)+1,baseline:D.baselinePr,description:'400 nationwide PR seats · largest remainder'},
  combined:{key:'combined',label:'Combined',noun:'combined',total:400+D.prSeatCount,majority:Math.floor((400+D.prSeatCount)/2)+1,baseline:D.baselineCombined,description:'400 district + 400 parallel PR seats'}
};
function component(result,key='combined'){
  if(!Object.hasOwn(components,key))throw new Error('Unknown election component.');
  return{...components[key],seats:result[key+'Seats']};
}
function evaluate(economic=0,cultural=0,variance=1,spread=D.spread,parties=D.parties){
  if(![economic,cultural,variance].every(Number.isFinite)||Math.abs(economic)>1||Math.abs(cultural)>1||variance<.5||variance>2)throw new Error('Use shifts from −1 to +1 and variance from 0.50 to 2.00.');
  validateParties(parties);
  const seats=Array(9).fill(0);let tied=0;
  const rows=districts(spread).map((district,index)=>{
    const x=D.center[0]+economic+Math.sqrt(variance)*(district.x-D.center[0]);
    const y=D.center[1]+cultural+Math.sqrt(variance)*(district.y-D.center[1]);
    const distances=parties.map(p=>sq({x,y},p)),min=Math.min(...distances);
    const candidates=distances.map((d,j)=>Math.abs(d-min)<1e-9?j:-1).filter(j=>j>=0);
    const winner=candidates[index%candidates.length];
    if(candidates.length>1)tied++;
    seats[winner]++;
    const ordered=distances.map((distance,i)=>({distance,i})).sort((a,b)=>a.distance-b.distance||a.i-b.i);
    return {...district,x,y,winner,runner:ordered[1].i,distanceGap:Math.sqrt(ordered[1].distance)-Math.sqrt(ordered[0].distance)};
  });
  const votes=voteShares(economic,cultural,variance,parties),prSeats=allocatePR(votes),combinedSeats=seats.map((n,i)=>n+prSeats[i]);
  return{economic,cultural,variance,spread,parties:parties.map(p=>({...p})),seats,districtSeats:seats,prSeats,combinedSeats,rows,votes,median:[D.center[0]+economic,D.center[1]+cultural],tied};
}
class Mulberry32{
  constructor(seed){this.seed=seed>>>0;}
  random(){let t=this.seed=(this.seed+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),1|t);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;}
  normal(){return Math.sqrt(-2*Math.log(Math.max(this.random(),1e-12)))*Math.cos(2*Math.PI*this.random());}
}
function drawShocks(rng){
  let economic,cultural,variance;
  do{economic=.35*rng.normal();}while(Math.abs(economic)>1);
  do{cultural=.25*rng.normal();}while(Math.abs(cultural)>1);
  do{variance=Math.exp(.20**2+.20*rng.normal());}while(variance<.5||variance>2);
  return{economic:Math.round(economic*100)/100,cultural:Math.round(cultural*100)/100,variance};
}
function density(x,y,result){
  const scale=Math.sqrt(result.variance);let total=0;
  D.weights.forEach((w,k)=>{
    const c=D.covariances[k],sx=scale*Math.sqrt(c[0][0]),sy=scale*Math.sqrt(c[1][1]);
    const rho=c[0][1]/Math.sqrt(c[0][0]*c[1][1]),d=1-rho*rho;
    const zx=(x-D.center[0]-result.economic-scale*(D.means[k][0]-D.center[0]))/sx;
    const zy=(y-D.center[1]-result.cultural-scale*(D.means[k][1]-D.center[1]))/sy;
    total+=w*Math.exp(-(zx*zx-2*rho*zx*zy+zy*zy)/(2*d))/(2*Math.PI*sx*sy*Math.sqrt(d));
  });return total;
}
const API={allocatePR,component,components,districts,evaluate,voteShares,density,drawShocks,Mulberry32,validateParties};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.WizlandiaEngine=API;
})(typeof window!=='undefined'?window:globalThis);
