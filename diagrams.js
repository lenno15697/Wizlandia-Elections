(function(root){
'use strict';
function validateTotal(total){
  if(!Number.isInteger(total)||total<1)throw new Error('Seat total must be a positive integer.');
}
function hemicycle(total){
  validateTotal(total);
  const senate=total===120,large=total>400,rows=Math.min(total,senate?6:large?14:10);
  const innerRadius=senate?100:large?136:156,rowStep=senate?26:large?14:18;
  const radii=Array.from({length:rows},(_,row)=>innerRadius+row*rowStep);
  const sum=radii.reduce((a,b)=>a+b,0),quotas=radii.map(r=>total*r/sum),rowCounts=quotas.map(Math.floor);
  const remaining=total-rowCounts.reduce((a,b)=>a+b,0);
  quotas.map((q,row)=>({row,remainder:q-rowCounts[row]})).sort((a,b)=>b.remainder-a.remainder||a.row-b.row).slice(0,remaining).forEach(d=>rowCounts[d.row]++);
  const dots=[];
  for(let row=0;row<rows;row++){
    const count=rowCounts[row],radius=radii[row];
    for(let column=0;column<count;column++){
      const fraction=count>1?column/(count-1):.5,angle=fraction*Math.PI;
      // Round the angle key so both bottom rays have a consistent inner-to-
      // outer order despite floating-point sin(pi) and atan2 differences.
      dots.push({x:450-radius*Math.cos(angle),y:342-radius*Math.sin(angle),row,column,angleKey:Math.round(fraction*1e12)});
    }
  }
  dots.sort((a,b)=>a.angleKey-b.angleKey||a.row-b.row);
  return{width:900,height:senate?386:365,radius:senate?10.8:large?4.6:6.1,rows,rowCounts,rowStep,dots,...(senate?{viewBox:'200 92 500 294'}:{})};
}
function seatAssignments(layout,counts){
  if(counts.some(n=>!Number.isInteger(n)||n<0)||counts.reduce((a,b)=>a+b,0)!==layout.dots.length)throw new Error('Party seats must match the diagram total.');
  const dots=layout.dots,labels=counts.flatMap((n,i)=>Array(n).fill(i));
  const rings=Array.from({length:layout.rows},(_,row)=>dots.map((d,i)=>d.row===row?i:-1).filter(i=>i>=0).sort((a,b)=>dots[a].column-dots[b].column));
  const pitch=Math.max(...layout.rowCounts.map((n,row)=>n>1?Math.PI*(Math.hypot(dots[rings[row][0]].x-450,dots[rings[row][0]].y-342))/(n-1):0));
  const threshold=1.45*Math.max(layout.rowStep,pitch);
  const connected=(a,party)=>{
    const group=a.map((p,i)=>p===party?i:-1).filter(i=>i>=0);
    if(group.length<2)return true;
    const seen=new Set([group[0]]),queue=[group[0]];
    while(queue.length){const i=queue.pop();for(const j of group)if(!seen.has(j)&&Math.hypot(dots[i].x-dots[j].x,dots[i].y-dots[j].y)<threshold){seen.add(j);queue.push(j);}}
    return seen.size===group.length;
  };
  // Preserve the restored arc geometry and normal angular assignment. For a
  // tiny disconnected party only, transfer seats between neighbouring rings;
  // every ring remains in party order and all party totals remain exact.
  const small=counts.map((n,i)=>n>0&&n<=6?i:-1).filter(i=>i>=0);
  for(const party of small){
    if(connected(labels,party))continue;
    const n=counts[party],original=labels.slice(),ideal=original.reduce((s,p,i)=>s+(p===party?dots[i].angleKey:0),0)/n;
    const matrix=rings.map(r=>counts.map((_,p)=>r.filter(i=>original[i]===p).length));
    let best=null;
    for(let first=0;first<layout.rows;first++)for(let second=first;second<=Math.min(layout.rows-1,first+1);second++)for(let split=second===first?n:1;split<=(second===first?n:n-1);split++){
      const desired=Array(layout.rows).fill(0);desired[first]=split;if(second!==first)desired[second]=n-split;
      const m=matrix.map(r=>r.slice()),free=[],donors=[];let valid=true;
      for(let row=0;row<layout.rows;row++){
        const remove=Math.max(0,m[row][party]-desired[row]);m[row][party]-=remove;
        for(let k=0;k<remove;k++)free.push(row);
      }
      for(let row=0;row<layout.rows&&valid;row++){
        while(m[row][party]<desired[row]){
          let offset=0,choice=null;
          for(let p=0;p<counts.length;p++){
            if(p!==party&&counts[p]>6&&m[row][p])for(let k=0;k<m[row][p];k++){
              const index=rings[row][offset+k],cost=Math.abs(dots[index].angleKey-ideal);
              if(!choice||cost<choice.cost)choice={p,cost};
            }
            offset+=m[row][p];
          }
          if(!choice){valid=false;break;}m[row][choice.p]--;m[row][party]++;donors.push(choice.p);
        }
      }
      if(!valid||donors.length!==free.length)continue;
      free.forEach((row,i)=>m[row][donors[i]]++);
      const candidate=original.slice();
      rings.forEach((ring,row)=>{const values=m[row].flatMap((count,p)=>Array(count).fill(p));ring.forEach((index,k)=>candidate[index]=values[k]);});
      if(!connected(candidate,party)||small.some(p=>p!==party&&connected(original,p)&&!connected(candidate,p)))continue;
      const score=candidate.reduce((sum,p,i)=>sum+(p!==original[i]?1+Math.abs(dots[i].angleKey-ideal)/1e11:0),0);
      if(!best||score<best.score)best={candidate,score};
    }
    if(best)labels.splice(0,labels.length,...best.candidate);
  }
  return labels;
}
function westminster(total,upperCount,lowerCount){
  validateTotal(total);
  if(![upperCount,lowerCount].every(n=>Number.isInteger(n)&&n>=0)||upperCount+lowerCount!==total)throw new Error('Bench counts must add to the seat total.');
  const left=76,right=864,aisleTop=176,aisleBottom=214,benchHeight=112;
  let pitch=22;
  while(Math.floor((right-left)/pitch)*Math.floor(benchHeight/pitch)<total)pitch-=.25;
  const columns=Math.floor((right-left)/pitch),rows=Math.max(1,Math.ceil(total/columns));
  const slots=(count,upper)=>Array.from({length:count},(_,i)=>({
    x:left+pitch/2+Math.floor(i/rows)*pitch,
    y:upper?aisleTop-pitch/2-(i%rows)*pitch:aisleBottom+pitch/2+(i%rows)*pitch,
    column:Math.floor(i/rows),row:i%rows
  }));
  return{width:900,height:410,radius:pitch*.38,pitch,rows,left,aisleTop,aisleBottom,
    topLabel:aisleTop-rows*pitch-13,bottomLabel:aisleBottom+rows*pitch+23,
    upper:slots(upperCount,true),lower:slots(lowerCount,false)};
}
const API={hemicycle,seatAssignments,westminster};
if(typeof module==='object'&&module.exports)module.exports=API;
if(root)root.WizlandiaDiagrams=API;
})(typeof window==='undefined'?null:window);
