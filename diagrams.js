(function(root){
'use strict';
function validateTotal(total){
  if(!Number.isInteger(total)||total<1)throw new Error('Seat total must be a positive integer.');
}
function hemicycle(total){
  validateTotal(total);
  const large=total>400,rows=Math.min(total,large?16:10),columns=Math.ceil(total/rows);
  const innerRadius=large?146:156,rowStep=large?12:18;
  const dots=[];
  // Aligned radial columns let the assignment follow neighboring seats.
  // Alternate direction at each column so even a small party crossing a
  // column boundary remains one connected block instead of jumping rings.
  for(let column=0;column<columns;column++){
    const fraction=columns>1?column/(columns-1):.5;
    const angle=fraction===0?0:fraction===1?Math.PI:fraction*Math.PI;
    const angleKey=Math.round(fraction*1e12),count=Math.min(rows,total-dots.length);
    for(let offset=0;offset<count;offset++){
      const row=column%2?rows-1-offset:offset,radius=innerRadius+row*rowStep;
      dots.push({x:450-radius*Math.cos(angle),y:342-radius*Math.sin(angle),row,column,angleKey});
    }
  }
  return{width:900,height:365,radius:large?4.6:6.1,rows,columns,dots};
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
