(function(){
'use strict';
const D=window.WizlandiaData,E=window.WizlandiaEngine,$=id=>document.getElementById(id);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=(v,n=2)=>(v>=0?'+':'')+v.toFixed(n),pct=v=>(100*v).toFixed(1)+'%';
const swatch=p=>`<span class="swatch" style="background:${p.color}"></span>`;
let state={economic:0,cultural:0,variance:1,spread:D.spread,parties:D.parties.map(p=>({...p}))};
let current=E.evaluate(),history=[],nextRun=1,selected=new Set(),mode='manual',activeTab='overview',rng=new E.Mulberry32(20261014),batchStats=null,busy=false;
let noticeTimer,frame,compassDots=[],view='combined';
const displayOrder=D.displayOrder;
const largestPartiesFirst=(indices,seats)=>indices.slice().sort((a,b)=>seats[b]-seats[a]||displayOrder.indexOf(a)-displayOrder.indexOf(b));
const shown=(result=current)=>E.component(result,view);
function notice(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4000);}
function syncControls(){
  for(const k of ['economic','cultural','variance','spread'])$(k).value=state[k];
  $('economic-value').textContent=signed(state.economic);$('cultural-value').textContent=signed(state.cultural);
  $('variance-value').textContent=state.variance.toFixed(2)+'×';$('spread-value').textContent=state.spread.toFixed(2);
}
function addHistory(result,label){history.push({id:nextRun++,label,result});if(history.length>200)history.shift();}
function render(){
  syncControls();
  const v=shown(),seats=v.seats,ranked=seats.map((n,i)=>({n,i})).sort((a,b)=>b.n-a.n||a.i-b.i),lead=ranked[0],second=ranked[1];
  const p=current.parties[lead.i],majority=lead.n>=v.majority,isCombined=view==='combined';
  for(const element of document.querySelectorAll('[data-combined-only]'))element.hidden=!isCombined;
  if(!isCombined&&activeTab==='coalitions')showTab('overview');
  for(const button of document.querySelectorAll('[data-component]')){const active=button.dataset.component===view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  $('component-note').textContent=v.description;
  $('verdict-kicker').textContent=`${v.label} · ${majority?'Overall majority':'Largest party'}`;
  $('verdict-title').textContent=majority?`${p.name} wins a majority.`:`${p.name} leads. ${v.majority-lead.n} seats short.`;
  $('verdict-detail').textContent=`${p.code} takes ${lead.n} of ${v.total} ${v.noun} seats on ${pct(current.votes[lead.i])} of the national vote. ${current.parties[second.i].code} follows with ${second.n} seats.`;
  $('median').textContent=`(${current.median[0].toFixed(2)}, ${current.median[1].toFixed(2)})`;
  $('ticker').textContent=isCombined?`${v.label} · ${p.code} ${lead.n} · ${current.parties[second.i].code} ${second.n} · ${majority?'Majority':'No overall majority'}`:`${v.label} · ${v.total} seats`;
  $('majority-track').setAttribute('aria-label',`Distribution of ${v.total} ${v.noun} seats`);
  $('majority-track').classList.toggle('without-majority',!isCombined);
  $('majority-track').style.setProperty('--majority-position',`${v.majority/v.total*100}%`);
  $('majority-track').innerHTML=displayOrder.filter(i=>seats[i]).map(i=>`<span style="width:${seats[i]/v.total*100}%;background:${current.parties[i].color}" title="${current.parties[i].code}: ${seats[i]}"></span>`).join('');
  $('track-majority').textContent=`${v.majority} · majority`;$('track-total').textContent=v.total;
  $('party-list').innerHTML=displayOrder.map(i=>{const p=current.parties[i];return`<div class="party-line" title="${esc(p.name)}: ${esc(p.description)}">${swatch(p)}<strong>${p.code}</strong><span class="line-name">${esc(p.name)}</span><span class="line-vote">${pct(current.votes[i])}</span></div>`;}).join('');
  $('party-cards').innerHTML=displayOrder.map(i=>{const p=current.parties[i];return`<button class="party-card" style="--party:${p.color}" data-party="${i}" aria-pressed="${selected.has(i)}" aria-label="${esc(p.name)}, ${seats[i]} ${v.noun} seats; ${current.districtSeats[i]} district plus ${current.prSeats[i]} PR equals ${current.combinedSeats[i]} combined. ${pct(current.votes[i])} votes. Select for coalition."><span class="code">${p.code}</span><span class="seat">${seats[i]}</span><span class="vote">${pct(current.votes[i])} vote</span><span class="seat-share">${(seats[i]/v.total*100).toFixed(1)}% seats</span><span class="seat-breakdown">${view==='combined'?`${current.districtSeats[i]} D + ${current.prSeats[i]} PR`:`${current.combinedSeats[i]} combined`}</span></button>`;}).join('');
  $('share-header').textContent=`${v.label} share`;$('change-header').textContent=`${v.label} Δ`;
  $('overview-body').innerHTML=displayOrder.map(i=>{
    const p=current.parties[i],n=seats[i],change=n-v.baseline[i],share=n/v.total*100;
    return`<tr><td>${swatch(p)}<strong>${p.code}</strong><span class="party-name">${esc(p.name)}</span></td><td>${pct(current.votes[i])}</td><td class="${view==='district'?'selected-column':''}">${current.districtSeats[i]}</td><td class="${view==='pr'?'selected-column':''}">${current.prSeats[i]}</td><td class="${view==='combined'?'selected-column':''}">${current.combinedSeats[i]}</td><td>${share.toFixed(1)}%</td><td>${change===0?'—':signed(change,0)}</td><td><span class="representation" aria-label="Vote ${pct(current.votes[i])}, ${v.label} seat share ${share.toFixed(1)} percent"><span class="votes" style="width:${current.votes[i]*100}%;background:${p.color}"></span><span class="seats" style="width:${share}%;background:${p.color}"></span></span></td></tr>`;
  }).join('');
  $('coalition-kicker').textContent=isCombined?`${v.label} · The road to ${v.majority}`:v.label;
  $('coalition-copy').textContent=isCombined?`Each combination reaches ${v.majority} of ${v.total} ${v.noun} seats and loses its majority if any member leaves. These are arithmetic possibilities, without political compatibility restrictions.`:'';
  $('history-context').textContent=(isCombined?`Largest party and majority status use the Combined view (${v.total} seats; majority ${v.majority}).`:`Largest party uses the ${v.label} view (${v.total} seats).`)+` Select a run to restore it. History is kept in this tab until the page is closed or refreshed.`;
  renderParliament();renderHistory();
  if(activeTab==='districts')renderDistricts();if(activeTab==='compass')drawCompass();if(activeTab==='coalitions')renderCoalitions();
}
function renderParliament(){
  const v=shown(),seats=v.seats,isCombined=view==='combined';
  let order=displayOrder.slice();
  if($('seat-order').value==='listed')order=current.parties.map((_,i)=>i);
  if($('seat-order').value==='size')order.sort((a,b)=>seats[b]-seats[a]||displayOrder.indexOf(a)-displayOrder.indexOf(b));
  const radii=Array.from({length:v.total>400?14:10},(_,i)=>v.total>400?136+i*14:145+i*18),sum=radii.reduce((a,b)=>a+b,0);
  const allocations=radii.map(r=>v.total*r/sum),counts=allocations.map(Math.floor);
  const remainder=v.total-counts.reduce((a,b)=>a+b,0);
  allocations.map((n,i)=>({i,r:n-counts[i]})).sort((a,b)=>b.r-a.r).slice(0,remainder).forEach(x=>counts[x.i]++);
  const dots=[];
  radii.forEach((r,row)=>{for(let i=0;i<counts[row];i++){const angle=Math.PI-i*Math.PI/(counts[row]-1);dots.push({x:450+r*Math.cos(angle),y:342-r*Math.sin(angle),angle,row});}});
  dots.sort((a,b)=>b.angle-a.angle||a.row-b.row);
  const assignment=order.flatMap(i=>Array(seats[i]).fill(i));
  const circles=dots.map((dot,i)=>{
    const p=current.parties[assignment[i]],opacity=selected.size&&!selected.has(assignment[i])?.17:1;
    return`<circle data-party="${p.code}" cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${v.total>400?4.6:6.1}" fill="${p.color}" opacity="${opacity}"><title>${esc(p.name)} · ${seats[assignment[i]]} ${v.noun} seats</title></circle>`;
  }).join('');
  const selectedMembers=largestPartiesFirst(displayOrder.filter(i=>selected.has(i)),seats),coalition=selectedMembers.reduce((s,i)=>s+seats[i],0);
  $('coalition-label').textContent=selected.size?`${selectedMembers.map(i=>current.parties[i].code).join(' + ')} · ${coalition} ${v.noun} seats${isCombined?` · ${coalition>=v.majority?`${coalition-v.majority} above the majority threshold`:`${v.majority-coalition} short of a majority`}`:''}`:'Select parties below to build a coalition.';
  $('clear-coalition').hidden=!selected.size;
  const ink=getComputedStyle(document.body).getPropertyValue('--text').trim();
  const muted=getComputedStyle(document.body).getPropertyValue('--muted').trim();
  const centre=selected.size||isCombined?`<text x="450" y="272" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="${ink}">${selected.size?coalition:v.majority}</text><text x="450" y="298" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="2" fill="${muted}">${selected.size?'COALITION SEATS':'SEATS FOR A MAJORITY'}</text>`:'';
  const caption=selected.size?(isCombined?(coalition>=v.majority?'Majority reached':'Majority not reached'):'Selected parties'):v.description;
  $('hemicycle').innerHTML=`<svg id="parliament-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 365" role="img" aria-label="${v.label} parliament with ${v.total} seats"><title>Wizlandia ${v.noun} parliament · ${order.map(i=>`${current.parties[i].code} ${seats[i]}`).join(', ')}</title>${circles}${centre}<text x="450" y="325" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${muted}">${caption}</text></svg>`;
}
function renderDistricts(){
  const q=$('district-search').value.toLowerCase().trim(),party=$('district-party').value;
  let rows=current.rows.filter(d=>(!q||`${d.id} ${d.name}`.toLowerCase().includes(q))&&(party==='all'||d.winner===Number(party)));
  if($('district-sort').value==='close')rows.sort((a,b)=>a.distanceGap-b.distanceGap||a.id.localeCompare(b.id));
  $('district-count').textContent=`${rows.length} of 400`;
  $('district-body').innerHTML=rows.map(d=>`<tr><td><strong>${d.id}</strong></td><td title="${esc(d.name)}">${esc(d.name)}</td><td>${d.x.toFixed(3)}</td><td>${d.y.toFixed(3)}</td><td>${swatch(current.parties[d.winner])} ${current.parties[d.winner].code}</td><td>${current.parties[d.runner].code}</td><td>${d.distanceGap.toFixed(4)}</td></tr>`).join('');
}
function renderCoalitions(){
  if(view!=='combined'){$('coalition-options').innerHTML='';return;}
  const v=shown(),seats=v.seats,combos=[];
  for(let mask=1;mask<(1<<9);mask++){
    const members=largestPartiesFirst(displayOrder.filter(i=>mask&(1<<i)),seats),total=members.reduce((s,i)=>s+seats[i],0);
    if(total>=v.majority&&members.every(i=>total-seats[i]<v.majority))combos.push({members,total});
  }
  combos.sort((a,b)=>b.total-a.total||a.members.length-b.members.length);
  $('coalition-options').innerHTML=combos.map(c=>`<button class="coalition-option" data-coalition="${c.members.join(',')}"><span>${c.members.map(i=>`${swatch(current.parties[i])} ${current.parties[i].code}`).join(' + ')}<span class="hint">${c.total-v.majority} above ${v.majority} · Select coalition</span></span><strong>${c.total}</strong></button>`).join('');
}
function renderHistory(){
  const v=shown();
  $('history-count').textContent=history.length;
  $('history-body').innerHTML=history.slice().reverse().map(h=>{
    const r=h.result,seats=shown(r).seats,i=seats.indexOf(Math.max(...seats));
    return`<tr><td><button class="history-link" data-history="${h.id}">${esc(h.label)}</button></td><td>${signed(r.economic)}</td><td>${signed(r.cultural)}</td><td>${r.variance.toFixed(3)}×</td><td>${swatch(r.parties[i])} ${r.parties[i].code}</td><td>${r.districtSeats[i]}</td><td>${r.prSeats[i]}</td><td>${r.combinedSeats[i]}</td>${view==='combined'?`<td>${seats[i]>=v.majority?'Majority':'No overall majority'}</td>`:''}</tr>`;
  }).join('');
  if(!batchStats){$('batch-summary').innerHTML='';return;}
  const runs=batchStats.results,n=runs.length,ldp=runs.filter(r=>shown(r).seats[0]>=v.majority).length,ca=runs.filter(r=>shown(r).seats[1]>=v.majority).length,hung=runs.filter(r=>Math.max(...shown(r).seats)<v.majority).length;
  const majorityCards=view==='combined'?`<div class="batch-cards"><div class="batch-card">LDP majorities<strong>${ldp} / ${n}</strong>${(ldp/n*100).toFixed(1)}% of draws</div><div class="batch-card">CA majorities<strong>${ca} / ${n}</strong>${(ca/n*100).toFixed(1)}% of draws</div><div class="batch-card">No overall majority<strong>${hung} / ${n}</strong>${(hung/n*100).toFixed(1)}% of draws</div></div>`:'';
  $('batch-summary').innerHTML=`<p class="hint">Last batch · ${n} elections · seed ${batchStats.seed} · ${v.label} view</p>${majorityCards}<div class="batch-ranges">${displayOrder.map(i=>{const p=D.parties[i],a=runs.map(r=>shown(r).seats[i]);return`<span>${swatch(p)} ${p.code}: ${Math.min(...a)}–${Math.max(...a)} seats</span>`;}).join('')}</div>`;
}
function showTab(name){
  if(name==='coalitions'&&view!=='combined')name='overview';
  activeTab=name;
  for(const tab of document.querySelectorAll('[data-tab]')){const active=tab.dataset.tab===name;tab.setAttribute('aria-selected',active);tab.tabIndex=active?0:-1;$('panel-'+tab.dataset.tab).hidden=!active;}
  if(name==='compass')drawCompass();if(name==='districts')renderDistricts();if(name==='coalitions')renderCoalitions();
}
function clippedRegion(index){
  let polygon=[[-12,-10],[12,-10],[12,10],[-12,10]];const p=current.parties[index];
  current.parties.forEach((q,j)=>{
    if(j===index||!polygon.length)return;
    const nx=2*(q.x-p.x),ny=2*(q.y-p.y),c=q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y,out=[];
    polygon.forEach((a,k)=>{
      const b=polygon[(k+1)%polygon.length],da=nx*a[0]+ny*a[1]-c,db=nx*b[0]+ny*b[1]-c;
      if(da<=1e-10)out.push(a);
      if((da<=1e-10)!==(db<=1e-10))out.push([a[0]+da/(da-db)*(b[0]-a[0]),a[1]+da/(da-db)*(b[1]-a[1])]);
    });polygon=out;
  });return polygon;
}
function drawCompass(){
  const canvas=$('compass'),c=canvas.getContext('2d'),dark=document.body.classList.contains('dark');
  const x0=65,y0=28,w=780,h=650,px=x=>x0+(x+12)*w/24,py=y=>y0+(10-y)*h/20;
  const ink=getComputedStyle(document.body).getPropertyValue('--text').trim(),muted=getComputedStyle(document.body).getPropertyValue('--muted').trim();
  c.clearRect(0,0,900,760);c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();
  current.parties.forEach((p,i)=>{
    const poly=clippedRegion(i);if(!poly.length)return;
    c.beginPath();poly.forEach(([x,y],j)=>j?c.lineTo(px(x),py(y)):c.moveTo(px(x),py(y)));c.closePath();c.fillStyle=p.color;c.globalAlpha=dark?.10:.055;c.fill();
    c.globalAlpha=dark?.18:.12;c.lineWidth=.8;c.strokeStyle=p.color;c.stroke();c.globalAlpha=1;
  });
  if($('show-density').checked){
    const nx=96,ny=80,grid=[],dx=w/nx,dy=h/ny;let max=0;
    for(let j=0;j<=ny;j++){grid[j]=[];for(let i=0;i<=nx;i++){const v=E.density(-12+24*i/nx,10-20*j/ny,current);grid[j][i]=v;max=Math.max(max,v);}}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      c.fillStyle=`rgba(${dark?'139,167,226':'50,108,173'},${Math.pow(grid[j][i]/max,.65)*.17})`;c.fillRect(x0+i*dx,y0+j*dy,dx+.5,dy+.5);
    }
    c.strokeStyle=dark?'#7a97c3':'#7799bf';c.globalAlpha=.65;c.lineWidth=.75;
    for(const f of [.06,.16,.30,.47,.66,.84]){
      const level=max*f;c.beginPath();
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        const values=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],cross=[];
        for(let k=0;k<4;k++){const next=(k+1)%4,a=values[k],b=values[next];if((a>=level)!==(b>=level)){const t=(level-a)/(b-a);cross.push([x0+(corners[k][0]+t*(corners[next][0]-corners[k][0]))*dx,y0+(corners[k][1]+t*(corners[next][1]-corners[k][1]))*dy]);}}
        for(let k=0;k<cross.length-1;k+=2){c.moveTo(...cross[k]);c.lineTo(...cross[k+1]);}
      }c.stroke();
    }c.globalAlpha=1;
  }
  c.strokeStyle=dark?'#ffffff10':'#1f253512';c.lineWidth=.6;
  for(let x=-10;x<=10;x+=2){c.beginPath();c.moveTo(px(x),y0);c.lineTo(px(x),y0+h);c.stroke();}
  for(let y=-8;y<=8;y+=2){c.beginPath();c.moveTo(x0,py(y));c.lineTo(x0+w,py(y));c.stroke();}
  c.strokeStyle=dark?'#ffffff50':'#1f25354a';c.lineWidth=1;c.beginPath();c.moveTo(px(0),y0);c.lineTo(px(0),y0+h);c.moveTo(x0,py(0));c.lineTo(x0+w,py(0));c.stroke();
  compassDots=[];
  if($('show-districts').checked)current.rows.forEach(d=>{
    const x=px(d.x),y=py(d.y);c.beginPath();c.arc(x,y,2.5,0,Math.PI*2);c.fillStyle=current.parties[d.winner].color;c.globalAlpha=.75;c.fill();c.globalAlpha=1;compassDots.push({x,y,d});
  });
  c.font='600 12px sans-serif';c.textAlign='left';c.textBaseline='middle';
  const offsets={LDP:[9,-7],CA:[9,-7],SDP:[-32,14],CON:[9,-8],GRN:[9,10],NF:[9,-8],LIB:[9,-6],UPL:[-32,-10],SWP:[-32,14]};
  current.parties.forEach(p=>{
    const x=px(p.x),y=py(p.y);c.strokeStyle=ink;c.lineWidth=1.3;c.beginPath();c.moveTo(x-4,y-4);c.lineTo(x+4,y+4);c.moveTo(x-4,y+4);c.lineTo(x+4,y-4);c.stroke();
    const off=offsets[p.code];c.strokeStyle=dark?'#1b1f2c':'#fff';c.lineWidth=3;c.strokeText(p.code,x+off[0],y+off[1]);c.fillStyle=ink;c.fillText(p.code,x+off[0],y+off[1]);
  });
  const mx=px(current.median[0]),my=py(current.median[1]);c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3.5:8;const x=mx+r*Math.cos(a),y=my+r*Math.sin(a);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle=ink;c.fill();c.restore();
  c.strokeStyle=dark?'#ffffff33':'#1f253533';c.lineWidth=1;c.strokeRect(x0,y0,w,h);c.fillStyle=muted;c.font='11px sans-serif';c.textAlign='center';
  for(let x=-10;x<=10;x+=2)c.fillText(String(x),px(x),y0+h+20);
  c.textAlign='right';for(let y=-8;y<=8;y+=2)c.fillText(String(y),x0-12,py(y)+4);
  c.textAlign='center';c.font='12px sans-serif';c.fillText('Economy · market liberal →',x0+w/2,y0+h+49);
  c.save();c.translate(20,y0+h/2);c.rotate(-Math.PI/2);c.fillText('Culture · traditional →',0,0);c.restore();
}
function recompute(){try{current=E.evaluate(state.economic,state.cultural,state.variance,state.spread,state.parties);render();}catch(error){notice(error.message);}}
function restore(result){state={economic:result.economic,cultural:result.cultural,variance:result.variance,spread:result.spread,parties:result.parties.map(p=>({...p}))};current=result;render();}
function getSeed(){const n=Number($('seed').value);if(!Number.isInteger(n)||n<0||n>4294967295)throw new Error('Enter an integer seed between 0 and 4294967295.');return n;}
function setMode(value){mode=value;$('manual-mode').classList.toggle('active',value==='manual');$('random-mode').classList.toggle('active',value==='random');$('run').textContent=value==='manual'?'▶ Run election':'⚄ Draw election';$('mode-hint').textContent=value==='manual'?'Sliders update the preview. Run saves it to history.':'Draw a new seeded shock around the same baseline.';}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function csv(rows){return rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';}
function resultRows(results){return [['run','economic_shift','cultural_shift','variance_multiplier','district_spread',...D.parties.map(p=>p.code+'_district_seats'),...D.parties.map(p=>p.code+'_pr_seats'),...D.parties.map(p=>p.code+'_combined_seats'),...D.parties.map(p=>p.code+'_vote_percent')],...results.map((h,i)=>{const r=h.result||h;return[h.label||i+1,r.economic,r.cultural,r.variance,r.spread,...r.districtSeats,...r.prSeats,...r.combinedSeats,...r.votes.map(v=>v*100)];})];}
for(const button of document.querySelectorAll('[data-component]'))button.onclick=()=>{view=button.dataset.component;render();};
for(const k of ['economic','cultural','variance','spread'])$(k).addEventListener('input',()=>{state[k]=Number($(k).value);setMode('manual');cancelAnimationFrame(frame);frame=requestAnimationFrame(recompute);});
$('manual-mode').onclick=()=>setMode('manual');$('random-mode').onclick=()=>setMode('random');
$('run').onclick=()=>{
  if(mode==='random'){try{getSeed();Object.assign(state,E.drawShocks(rng));}catch(e){notice(e.message);return;}}
  recompute();addHistory(current,`Run ${nextRun}`);renderHistory();notice('Election saved to history.');
};
$('baseline').onclick=()=>{setMode('manual');state={economic:0,cultural:0,variance:1,spread:D.spread,parties:D.parties.map(p=>({...p}))};selected.clear();recompute();};
$('seed').addEventListener('change',()=>{try{rng=new E.Mulberry32(getSeed());}catch(e){notice(e.message);}});
$('runs').addEventListener('input',()=>$('batch').textContent=`Draw ${$('runs').value||'N'} elections`);
$('batch').onclick=async()=>{
  if(busy)return;let seed,n;
  try{seed=getSeed();n=Number($('runs').value);if(!Number.isInteger(n)||n<1||n>100)throw new Error('Choose between 1 and 100 elections.');}catch(e){notice(e.message);return;}
  busy=true;$('batch').disabled=$('run').disabled=true;
  const generator=new E.Mulberry32(seed),results=[],spread=state.spread,parties=state.parties.map(p=>({...p}));
  try{
    for(let i=0;i<n;i++){
      const s=E.drawShocks(generator),r=E.evaluate(s.economic,s.cultural,s.variance,spread,parties);results.push(r);addHistory(r,`Batch ${i+1} · seed ${seed}`);
      if(i%5===0){$('batch').textContent=`Drawing ${i+1} / ${n}…`;await new Promise(resolve=>setTimeout(resolve,0));}
    }
    batchStats={seed,results};restore(results.at(-1));showTab('history');notice(`${n} elections drawn. Select a run to inspect it.`);
  }catch(e){notice(e.message);}finally{busy=false;$('batch').disabled=$('run').disabled=false;$('batch').textContent=`Draw ${n} elections`;}
};
$('party-cards').onclick=event=>{const card=event.target.closest('[data-party]');if(!card)return;const i=Number(card.dataset.party);selected.has(i)?selected.delete(i):selected.add(i);render();};
$('clear-coalition').onclick=()=>{selected.clear();render();};$('seat-order').onchange=renderParliament;
for(const button of document.querySelectorAll('[data-tab]')){
  button.onclick=()=>showTab(button.dataset.tab);
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')].filter(tab=>!tab.hidden),i=tabs.indexOf(button);const j=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;showTab(tabs[j].dataset.tab);tabs[j].focus();};
}
for(const id of ['district-search','district-party','district-sort'])$(id).addEventListener('input',renderDistricts);
$('district-party').innerHTML='<option value="all">All parties</option>'+displayOrder.map(i=>`<option value="${i}">${D.parties[i].code}</option>`).join('');
$('coalition-options').onclick=event=>{const b=event.target.closest('[data-coalition]');if(!b)return;selected=new Set(b.dataset.coalition.split(',').map(Number));render();};
$('history-body').onclick=event=>{const b=event.target.closest('[data-history]');if(b){const h=history.find(h=>h.id===Number(b.dataset.history));if(h){setMode('manual');restore(h.result);notice(`${h.label} restored.`);}}};
for(const id of ['show-density','show-districts'])$(id).onchange=drawCompass;
$('compass').addEventListener('mousemove',event=>{
  const rect=$('compass').getBoundingClientRect(),x=(event.clientX-rect.left)*900/rect.width,y=(event.clientY-rect.top)*760/rect.height;
  let best=null,distance=12;
  for(const dot of compassDots){const d=Math.hypot(dot.x-x,dot.y-y);if(d<distance){distance=d;best=dot;}}
  const tip=$('tooltip');if(!best){tip.hidden=true;return;}
  const d=best.d;tip.textContent=`${d.id} · ${d.name} · ${current.parties[d.winner].code} · (${d.x.toFixed(3)}, ${d.y.toFixed(3)})`;tip.hidden=false;
  tip.style.left=Math.max(0,Math.min(event.clientX-rect.left+12,rect.width-245))+'px';tip.style.top=Math.max(0,event.clientY-rect.top-65)+'px';
});$('compass').onmouseleave=()=>$('tooltip').hidden=true;
$('export-svg').onclick=()=>download(`wizlandia-${view}-parliament.svg`,new XMLSerializer().serializeToString($('parliament-svg')),'image/svg+xml');
$('export-results').onclick=()=>download('wizlandia-results.csv',csv(resultRows([current])),'text/csv;charset=utf-8');
$('export-history').onclick=()=>download('wizlandia-election-history.csv',csv(resultRows(history)),'text/csv;charset=utf-8');
$('export-districts').onclick=()=>download('wizlandia-districts.csv',csv([['district_id','type_id','district_type','economic_x','cultural_y','winner','runner_up','distance_gap'],...current.rows.map(d=>[d.id,d.type,d.name,d.x,d.y,current.parties[d.winner].code,current.parties[d.runner].code,d.distanceGap])]),'text/csv;charset=utf-8');
$('save-config').onclick=()=>{try{download('wizlandia-config.json',JSON.stringify({version:1,view,economic:state.economic,cultural:state.cultural,variance:state.variance,spread:state.spread,seed:getSeed(),runs:Number($('runs').value),parties:state.parties.map(({code,x,y})=>({code,x,y}))},null,2),'application/json');}catch(e){notice(e.message);}};
$('load-config-button').onclick=()=>$('load-config').click();
$('load-config').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Configuration file is too large.');
    const c=JSON.parse(await file.text());if(c.version!==1||!Array.isArray(c.parties)||c.parties.length!==9)throw new Error('Unsupported Wizlandia configuration.');
    if(!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!Number.isInteger(c.runs)||c.runs<1||c.runs>100)throw new Error('Invalid seed or batch size.');
    const parties=D.parties.map((p,i)=>{const q=c.parties[i];if(q.code!==p.code)throw new Error('Party codes must match the Wizlandia model.');return{...p,x:q.x,y:q.y};});
    if(c.view!==undefined&&!Object.hasOwn(E.components,c.view))throw new Error('Invalid seat view.');
    const result=E.evaluate(c.economic,c.cultural,c.variance,c.spread,parties);
    $('seed').value=c.seed;$('runs').value=c.runs;$('batch').textContent=`Draw ${c.runs} elections`;rng=new E.Mulberry32(c.seed);view=c.view||'combined';setMode('manual');restore(result);notice('Configuration loaded.');
  }catch(e){notice('Could not load configuration: '+e.message);}finally{event.target.value='';}
};
$('guide').onclick=()=>$('guide-dialog').showModal();
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
function fillPartyEditor(parties){$('party-editor').innerHTML=displayOrder.map(i=>{const p=parties[i];return`<div class="editor-row"><div>${swatch(p)} <strong>${p.code} · ${esc(p.name)}</strong><p>${esc(p.description)}</p></div><label for="party-x-${i}">Economy X<input id="party-x-${i}" type="number" min="-12" max="12" step=".01" value="${p.x}" required></label><label for="party-y-${i}">Culture Y<input id="party-y-${i}" type="number" min="-12" max="12" step=".01" value="${p.y}" required></label></div>`;}).join('');$('party-error').textContent='';}
$('edit-parties').onclick=()=>{fillPartyEditor(state.parties);$('parties-dialog').showModal();};
$('restore-parties').onclick=()=>fillPartyEditor(D.parties);
$('party-form').onsubmit=event=>{event.preventDefault();try{
  const parties=state.parties.map((p,i)=>({...p,x:Number($('party-x-'+i).value),y:Number($('party-y-'+i).value)}));E.validateParties(parties);
  const result=E.evaluate(state.economic,state.cultural,state.variance,state.spread,parties);restore(result);$('parties-dialog').close();notice('Party positions updated.');
}catch(e){$('party-error').textContent=e.message;}};
function applyTheme(dark){document.body.classList.toggle('dark',dark);$('theme').textContent=dark?'☀ Light':'◐ Dark';renderParliament();if(activeTab==='compass')drawCompass();}
let initialDark=false;try{initialDark=localStorage.getItem('wizlandia-theme')==='dark';}catch(e){}
$('theme').onclick=()=>{const dark=!document.body.classList.contains('dark');try{localStorage.setItem('wizlandia-theme',dark?'dark':'light');}catch(e){}applyTheme(dark);};
addHistory(current,'Baseline');render();applyTheme(initialDark);
})();
