'use strict';
const assert=require('node:assert/strict'),G=require('../diagrams.js');
const D=require('../data.js'),E=require('../engine.js'),fixture=require('./python-reference.json');
let checks=0;
for(const total of [400,800]){
  const layout=G.hemicycle(total);
  assert.equal(layout.dots.length,total);
  assert.equal(new Set(layout.dots.map(d=>`${d.x.toFixed(8)},${d.y.toFixed(8)}`)).size,total);
  layout.dots.forEach((d,i)=>{
    assert.ok(d.x>=layout.radius&&d.x<=layout.width-layout.radius);
    assert.ok(d.y>=layout.radius&&d.y<=layout.height-layout.radius);
    if(i){const prev=layout.dots[i-1];assert.ok(prev.angleKey<d.angleKey||(prev.angleKey===d.angleKey&&prev.row<d.row));}
  });
  for(let i=0;i<layout.dots.length;i++)for(let j=i+1;j<layout.dots.length;j++){
    assert.ok(Math.hypot(layout.dots[i].x-layout.dots[j].x,layout.dots[i].y-layout.dots[j].y)>2*layout.radius);
  }
  for(const side of [0,1]){
    const ray=layout.dots.filter(d=>d.angleKey===side*1e12);
    assert.equal(ray.length,total===800?14:10);
    assert.deepEqual(ray.map(d=>d.row),Array.from({length:ray.length},(_,i)=>i));
  }
  for(const lower of [0,1,Math.floor(total/2),total-1,total]){
    const w=G.westminster(total,total-lower,lower),dots=[...w.upper,...w.lower];
    assert.equal(dots.length,total);
    assert.equal(w.upper.length,total-lower);assert.equal(w.lower.length,lower);
    assert.equal(new Set(dots.map(d=>`${d.x},${d.y}`)).size,total);
    dots.forEach(d=>assert.ok(d.x-w.radius>0&&d.x+w.radius<w.width&&d.y-w.radius>0&&d.y+w.radius<w.height));
    w.upper.forEach(d=>assert.ok(d.y+w.radius<w.aisleTop));
    w.lower.forEach(d=>assert.ok(d.y-w.radius>w.aisleBottom));
    checks++;
  }
}
// Party ranks must remain monotone on every ring and every shared ray,
// including the bottom endpoints where the old renderer split colour blocks.
for(const scenario of fixture.scenarios){
  const result=E.evaluate(scenario.economic,scenario.cultural,scenario.variance);
  for(const component of ['district','pr','combined']){
    const v=E.component(result,component),g=G.hemicycle(v.total);
    const ranks=D.displayOrder.flatMap((party,rank)=>Array(v.seats[party]).fill(rank));
    const dots=g.dots.map((d,i)=>({...d,rank:ranks[i]}));
    const groups=new Map();
    for(const d of dots){
      for(const key of [`row:${d.row}`,`ray:${d.angleKey}`]){
        if(!groups.has(key))groups.set(key,[]);groups.get(key).push(d.rank);
      }
    }
    for(const group of groups.values())group.forEach((rank,i)=>{if(i)assert.ok(group[i-1]<=rank);});
    assert.equal(ranks.length,v.total);checks++;
  }
}
assert.throws(()=>G.hemicycle(0));assert.throws(()=>G.westminster(400,200,199));
console.log(`Diagram checks passed: ${checks} layouts, exact seat counts, ordered colour blocks, both Westminster benches, and no overlaps or clipping.`);
