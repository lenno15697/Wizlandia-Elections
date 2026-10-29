'use strict';
const assert=require('node:assert/strict'),G=require('../diagrams.js');
const D=require('../data.js'),E=require('../engine.js'),fixture=require('./python-reference.json');
let checks=0;
function connected(g,labels,party){
 const group=labels.map((p,i)=>p===party?i:-1).filter(i=>i>=0);if(group.length<2)return true;
 const pitch=Math.max(...g.rowCounts.map((n,row)=>Math.PI*Math.hypot(g.dots.find(d=>d.row===row).x-450,g.dots.find(d=>d.row===row).y-342)/(n-1)));
 const threshold=1.45*Math.max(g.rowStep,pitch),seen=new Set([group[0]]),queue=[group[0]];
 while(queue.length){const i=queue.pop();for(const j of group)if(!seen.has(j)&&Math.hypot(g.dots[i].x-g.dots[j].x,g.dots[i].y-g.dots[j].y)<threshold){seen.add(j);queue.push(j);}}
 return seen.size===group.length;
}
assert.deepEqual(G.hemicycle(800).rowCounts,[34,38,41,45,48,52,55,59,62,66,70,73,77,80]);
const senate=G.hemicycle(120);
assert.equal(senate.dots.length,120);assert.equal(senate.rows,6);assert.ok(senate.radius>G.hemicycle(400).radius);
const [sx,sy,sw,sh]=senate.viewBox.split(' ').map(Number);
for(const dot of senate.dots){assert.ok(dot.x-senate.radius>=sx&&dot.x+senate.radius<=sx+sw&&dot.y-senate.radius>=sy&&dot.y+senate.radius<=sy+sh);}
for(let i=0;i<120;i++)for(let j=i+1;j<120;j++)assert.ok(Math.hypot(senate.dots[i].x-senate.dots[j].x,senate.dots[i].y-senate.dots[j].y)>2*senate.radius,'Large Senate dots must not overlap');
for(const counts of [[59,51,10],[55,56,9],[0,0,1,2,3,4,5,6,99]]){
 const labels=G.seatAssignments(senate,counts);counts.forEach((n,p)=>assert.equal(labels.filter(i=>i===p).length,n));
 for(let row=0;row<senate.rows;row++){const ring=senate.dots.map((d,i)=>({...d,party:labels[i]})).filter(d=>d.row===row).sort((a,b)=>a.column-b.column);for(let i=1;i<ring.length;i++)assert.ok(ring[i-1].party<=ring[i].party);}
}
for(const total of [400,800]){
 const g=G.hemicycle(total);assert.equal(g.dots.length,total);assert.equal(g.rows,total===800?14:10);
 assert.equal(new Set(g.dots.map(d=>`${d.x.toFixed(8)},${d.y.toFixed(8)}`)).size,total);
 const first=total===800?136:156,step=total===800?14:18;
 for(let row=0;row<g.rows;row++){
  const ring=g.dots.filter(d=>d.row===row).sort((a,b)=>a.column-b.column);assert.equal(ring.length,g.rowCounts[row]);
  ring.forEach(d=>assert.ok(Math.abs(Math.hypot(d.x-450,d.y-342)-(first+row*step))<1e-9));
  assert.equal(ring[0].angleKey,0);assert.equal(ring.at(-1).angleKey,1e12);
  const gaps=ring.slice(1).map((d,i)=>Math.hypot(d.x-ring[i].x,d.y-ring[i].y));
  assert.ok(Math.max(...gaps)-Math.min(...gaps)<1e-9,'Seats must be evenly spaced along each old-style arc');
 }
 g.dots.forEach(d=>assert.ok(d.x>=g.radius&&d.x<=g.width-g.radius&&d.y>=g.radius&&d.y<=g.height-g.radius));
 for(let i=0;i<g.dots.length;i++)for(let j=i+1;j<g.dots.length;j++)assert.ok(Math.hypot(g.dots[i].x-g.dots[j].x,g.dots[i].y-g.dots[j].y)>2*g.radius);
 for(const key of [0,1e12])assert.deepEqual(g.dots.filter(d=>d.angleKey===key).map(d=>d.row),Array.from({length:g.rows},(_,i)=>i));
 for(const lower of [0,1,Math.floor(total/2),total-1,total]){
  const w=G.westminster(total,total-lower,lower),dots=[...w.upper,...w.lower];
  assert.equal(dots.length,total);assert.equal(w.upper.length,total-lower);assert.equal(w.lower.length,lower);
  assert.equal(new Set(dots.map(d=>`${d.x},${d.y}`)).size,total);
  dots.forEach(d=>assert.ok(d.x-w.radius>0&&d.x+w.radius<w.width&&d.y-w.radius>0&&d.y+w.radius<w.height));
  w.upper.forEach(d=>assert.ok(d.y+w.radius<w.aisleTop));w.lower.forEach(d=>assert.ok(d.y-w.radius>w.aisleBottom));checks++;
 }
}
const baseline=D.displayOrder.map(i=>D.baselineCombined[i]);
assert.deepEqual(G.seatAssignments(G.hemicycle(800),baseline),baseline.flatMap((n,p)=>Array(n).fill(p)));
const regression=G.hemicycle(400),regressionLabels=G.seatAssignments(regression,[20,4,280,96]);
assert.ok(connected(regression,regressionLabels,1));
for(const scenario of fixture.scenarios){
 const result=E.evaluate(scenario.economic,scenario.cultural,scenario.variance);
 for(const component of ['district','pr','combined']){
  const v=E.component(result,component),g=G.hemicycle(v.total),counts=D.displayOrder.map(i=>v.seats[i]),labels=G.seatAssignments(g,counts);
  assert.equal(labels.length,v.total);
  counts.forEach((n,p)=>{assert.equal(labels.filter(x=>x===p).length,n);if(n&&n<=6)assert.ok(connected(g,labels,p),`Tiny party must stay connected: ${component} ${counts} party ${p}`)});
  for(let row=0;row<g.rows;row++){
   const ring=g.dots.map((d,i)=>({...d,party:labels[i]})).filter(d=>d.row===row).sort((a,b)=>a.column-b.column);
   ring.forEach((d,i)=>{if(i)assert.ok(ring[i-1].party<=d.party,'Parties must retain the display order around every arc');});
  }
  checks++;
 }
}
assert.throws(()=>G.hemicycle(0));assert.throws(()=>G.westminster(400,200,199));assert.throws(()=>G.seatAssignments(G.hemicycle(400),[1,2]));
console.log(`Diagram checks passed: ${checks} layouts, restored concentric arcs and old baseline colour assignment, connected tiny parties, exact seat counts, consistent bottom rays, and both Westminster benches.`);
