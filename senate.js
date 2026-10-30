/* Senate elections and the two-year election calendar. No DOM or Assembly model changes. */
(function(root){
'use strict';
const local=typeof module!=='undefined'&&module.exports;
const D=local?require('./data.js'):root.WizlandiaData;
const E=local?require('./engine.js'):root.WizlandiaEngine;
const H=local?require('./district-geography.js'):root.WizlandiaGeography;
const years=Array.from({length:10},(_,i)=>-2*i);
const median=values=>{const a=values.slice().sort((x,y)=>x-y),n=a.length;if(!n)throw new Error('A state needs district medians.');return(a[Math.floor((n-1)/2)]+a[Math.floor(n/2)])/2;};
function election(result){
  return H.states.map(s=>{
    const rows=result.rows.filter(d=>d.stateCode===s.code),x=median(rows.map(d=>d.x)),y=median(rows.map(d=>d.y));
    const order=D.displayOrder.slice().sort((a,b)=>((result.parties[a].x-x)**2+(result.parties[a].y-y)**2)-((result.parties[b].x-x)**2+(result.parties[b].y-y)**2)||D.displayOrder.indexOf(a)-D.displayOrder.indexOf(b));
    return{code:s.code,name:s.name,x,y,winner:order[0]};
  });
}
const settings=r=>({economic:r.economic,cultural:r.cultural,variance:r.variance,parties:r.parties.map(({code,x,y})=>({code,x,y}))});
const cohort=(r,source)=>({winners:Object.fromEntries(election(r).map(s=>[s.code,s.winner])),settings:settings(r),source});
const copyCohorts=cs=>cs.map(c=>({...c,winners:{...c.winners}}));
// Fictional common nationwide swings, newest to oldest (years -2 to -18).
// Modest multi-election waves retain state strongholds and produce a 60/50/10
// starting Senate with the unchanged year-0 baseline. Future random draws
// still use the independent shock distributions in engine.js.
const pastShocks=[[-.30,-.05,.96],[-.22,-.08,.98],[.08,.08,1.02],[.30,.25,1.18],[.12,.02,1.04],[-.10,-.22,.90],[-.32,-.08,.98],[-.28,.08,1.00],[-.10,.08,1.04]];
function create(result=E.evaluate()){
  return{counter:1,assemblyCounter:1,assembly:result,outgoing:null,cohorts:[cohort(result,'baseline'),...pastShocks.map(s=>cohort(E.evaluate(...s),'default'))]};
}
function preview(session,result){
  const both=session.counter%2===0;
  return{...session,assembly:both?result:session.assembly,assemblyCounter:both?session.counter:session.assemblyCounter,cohorts:[cohort(result,'simulated'),...copyCohorts(session.cohorts.slice(1))]};
}
function advance(session,result){
  const counter=session.counter+1,both=counter%2===0;
  return{counter,assemblyCounter:both?counter:session.assemblyCounter,assembly:both?result:session.assembly,outgoing:{...session.cohorts[9].winners},cohorts:[cohort(result,'simulated'),...copyCohorts(session.cohorts.slice(0,9))]};
}
function edit(session,index,code,winner){
  if(!Number.isInteger(index)||index<0||index>9||!H.states.some(s=>s.code===code)||!Number.isInteger(winner)||winner<0||winner>=D.parties.length)throw new Error('Invalid Senate history winner.');
  const cohorts=copyCohorts(session.cohorts);cohorts[index].winners[code]=winner;cohorts[index].source='manual';return{...session,cohorts};
}
function seats(session,latestOnly=false){
  const counts=Array(D.parties.length).fill(0);
  for(const c of latestOnly?session.cohorts.slice(0,1):session.cohorts)for(const s of H.states)counts[c.winners[s.code]]++;
  return counts;
}
function component(session,key='senate'){
  const latest=key==='senate-election';
  return{key,label:latest?'Senate election':key==='senators'?'Senators by state':'Senate',noun:latest?'new Senate':'Senate',total:latest?12:120,majority:latest?7:61,seats:seats(session,latest),description:latest?'12 statewide winners · one new senator per state':'120 senators · 10 per state · 20-year terms'};
}
function changes(session){
  if(!session.outgoing)return null;
  const counts=seats(session,true);
  for(const s of H.states)counts[session.outgoing[s.code]]--;
  return counts;
}
function serialize(session){return{counter:session.counter,assemblyCounter:session.assemblyCounter,assembly:settings(session.assembly),outgoing:session.outgoing?{...session.outgoing}:null,cohorts:copyCohorts(session.cohorts)};}
function restore(value){
  if(!value||!Number.isSafeInteger(value.counter)||value.counter<1||!Number.isInteger(value.assemblyCounter)||value.assemblyCounter!==(value.counter===1?1:value.counter-value.counter%2)||!Array.isArray(value.cohorts)||value.cohorts.length!==10)throw new Error('Invalid election calendar.');
  const a=value.assembly;
  if(!a||!Array.isArray(a.parties)||a.parties.length!==9||a.parties.some((p,i)=>p.code!==D.parties[i].code))throw new Error('Invalid saved Assembly.');
  const parties=D.parties.map((p,i)=>({...p,x:a.parties[i].x,y:a.parties[i].y}));
  const assembly=E.evaluate(a.economic,a.cultural,a.variance,D.spread,parties);
  for(const c of value.cohorts)if(!c||!c.winners||H.states.some(s=>!Number.isInteger(c.winners[s.code])||c.winners[s.code]<0||c.winners[s.code]>=9))throw new Error('Every Senate year must have exactly one winner per state.');
  if(value.outgoing!=null&&H.states.some(s=>!Number.isInteger(value.outgoing[s.code])||value.outgoing[s.code]<0||value.outgoing[s.code]>=9))throw new Error('Invalid outgoing Senate cohort.');
  return{counter:value.counter,assemblyCounter:value.assemblyCounter,assembly,outgoing:value.outgoing?{...value.outgoing}:null,cohorts:copyCohorts(value.cohorts)};
}
function stateOutlines(){
  return H.states.map(s=>{
    const edges=H.stateBorders.filter(e=>e.states.includes(s.code)),unused=new Set(edges.map((_,i)=>i));
    const key=p=>p.map(n=>n.toFixed(5)).join(','),joins=new Map();
    edges.forEach((e,i)=>[e.a,e.b].forEach(p=>{const k=key(p);if(!joins.has(k))joins.set(k,[]);joins.get(k).push(i);}));
    const loops=[];
    while(unused.size){
      const first=unused.values().next().value,start=edges[first].a;let point=start;const points=[start];let next=first;
      do{unused.delete(next);const e=edges[next];point=key(e.a)===key(point)?e.b:e.a;points.push(point);if(key(point)===key(start))break;next=(joins.get(key(point))||[]).find(i=>unused.has(i));if(next===undefined)throw new Error('State outline is not closed.');}while(unused.size);
      if(key(point)!==key(start))throw new Error('State outline is not closed.');loops.push(points);
    }
    return{code:s.code,loops,path:loops.map(points=>'M'+points.map(p=>p.join(',')).join('L')+'Z').join('')};
  });
}
const API={years,median,election,create,preview,advance,edit,seats,changes,component,serialize,restore,stateOutlines,pastShocks};
if(local)module.exports=API;else root.WizlandiaSenate=API;
})(typeof window!=='undefined'?window:globalThis);
