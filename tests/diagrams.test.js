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
    if(i){
      const prev=layout.dots[i-1];
      assert.ok(prev.angleKey<=d.angleKey);
      assert.ok((prev.column===d.column&&Math.abs(prev.row-d.row)===1)||
        (d.column===prev.column+1&&prev.row===d.row),'Consecutive assignments must be adjacent seats');
      assert.ok(Math.hypot(prev.x-d.x,prev.y-d.y)<27,'No distant jumps between assigned seats');
    }
  });
  for(let i=0;i<layout.dots.length;i++)for(let j=i+1;j<layout.dots.length;j++){
    assert.ok(Math.hypot(layout.dots[i].x-layout.dots[j].x,layout.dots[i].y-layout.dots[j].y)>2*layout.radius);
  }
  for(const side of [0,1]){
    const ray=layout.dots.filter(d=>d.angleKey===side*1e12);
    assert.equal(ray.length,layout.rows);
    const column=side?layout.columns-1:0;
    assert.deepEqual(ray.map(d=>d.row),Array.from({length:ray.length},(_,i)=>column%2?ray.length-1-i:i));
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
// Every contiguous seat block follows neighboring seats. Check all possible
// boundaries, including tiny parties split across two radial columns.
for(const total of [400,800]){
  const g=G.hemicycle(total);
  for(let start=0;start<total;start++)for(const count of [1,2,3,4,5,6,16,38]){
    const block=g.dots.slice(start,start+count),seen=new Set([0]),queue=[0];
    while(queue.length){
      const a=block[queue.shift()];
      block.forEach((b,i)=>{
        if(!seen.has(i)&&Math.abs(a.row-b.row)+Math.abs(a.column-b.column)===1){seen.add(i);queue.push(i);}
      });
    }
    assert.equal(seen.size,block.length,'A party block must stay connected');
  }
}
// Screenshot regression: SDP 20, Greens 4, CA 280, LDP 96. The four Greens
// must occupy adjoining seats instead of three outer seats and one inner seat.
const greens=G.hemicycle(400).dots.slice(20,24);
assert.equal(new Set(greens.map(d=>d.column)).size,1);
assert.deepEqual(greens.map(d=>d.row),[0,1,2,3]);
// Party ranks follow left-to-right order on every ring. Each column may run
// inward or outward, but a colour cannot be split by a different party.
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
console.log(`Diagram checks passed: ${checks} layouts, connected party blocks at every boundary, screenshot regression, exact seat counts, ordered colour blocks, both Westminster benches, and no overlaps or clipping.`);
