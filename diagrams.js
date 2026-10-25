(function(root){
'use strict';
function validateTotal(total){
  if(!Number.isInteger(total)||total<1)throw new Error('Seat total must be a positive integer.');
}
function hemicycle(total){
  validateTotal(total);
  const large=total>400,radii=Array.from({length:large?14:10},(_,i)=>large?136+i*14:145+i*18);
  const sum=radii.reduce((a,b)=>a+b,0),quotas=radii.map(r=>total*r/sum),counts=quotas.map(Math.floor);
  const remainder=total-counts.reduce((a,b)=>a+b,0);
  quotas.map((q,row)=>({row,remainder:q-counts[row]})).sort((a,b)=>b.remainder-a.remainder||a.row-b.row).slice(0,remainder).forEach(({row})=>counts[row]++);
  const dots=[];
  radii.forEach((radius,row)=>{
    for(let column=0;column<counts[row];column++){
      const fraction=counts[row]>1?column/(counts[row]-1):.5;
      const angle=fraction===0?0:fraction===1?Math.PI:fraction*Math.PI;
      // Quantize equal rays before sorting: floating-point differences must not
      // change the inner-to-outer order at either endpoint or shared angles.
      const angleKey=Math.round(fraction*1e12);
      dots.push({x:450-radius*Math.cos(angle),y:342-radius*Math.sin(angle),row,column,angleKey});
    }
  });
  dots.sort((a,b)=>a.angleKey-b.angleKey||a.row-b.row);
  return{width:900,height:365,radius:large?4.6:6.1,dots};
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
const API={hemicycle,westminster};
if(typeof module==='object'&&module.exports)module.exports=API;
if(root)root.WizlandiaDiagrams=API;
})(typeof window==='undefined'?null:window);
