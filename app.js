(function(){
'use strict';
const D=window.WizlandiaData,E=window.WizlandiaEngine,G=window.WizlandiaDiagrams,H=window.WizlandiaGeography,$=id=>document.getElementById(id);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=(v,n=2)=>(v>=0?'+':'')+v.toFixed(n),pct=v=>(100*v).toFixed(1)+'%';
const swatch=p=>`<span class="swatch" style="background:${p.color}"></span>`;
let state={economic:0,cultural:0,variance:1,spread:D.spread,parties:D.parties.map(p=>({...p}))};
let current=E.evaluate(),history=[],nextRun=1,selected=new Set(),mode='manual',activeTab='overview',rng=new E.Mulberry32(20261014),batchStats=null,busy=false;
let noticeTimer,frame,compassDots=[],view='combined',inspectedDistrict=null;
const displayOrder=D.displayOrder;
const largestPartiesFirst=(indices,seats)=>indices.slice().sort((a,b)=>seats[b]-seats[a]||displayOrder.indexOf(a)-displayOrder.indexOf(b));
const shown=(result=current)=>E.component(result,view);
function notice(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4000);}
function syncControls(){
  for(const k of ['economic','cultural','variance'])$(k).value=state[k];
  $('economic-value').textContent=signed(state.economic);$('cultural-value').textContent=signed(state.cultural);
  $('variance-value').textContent=state.variance.toFixed(2)+'×';
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
  $('ticker').textContent=isCombined?`${v.label} · ${p.code} ${lead.n} · ${current.parties[second.i].code} ${second.n} · ${majority?'Majority':'No overall majority'}`:`${v.label} · ${v.total} seats`;
  $('party-list').innerHTML=displayOrder.map(i=>{const p=current.parties[i],muted=selected.size&&!selected.has(i);return`<button type="button" class="party-line${muted?' is-muted':''}" style="--party:${p.color}" data-party="${i}" aria-pressed="${selected.has(i)}" aria-label="${esc(p.name)}, ${seats[i]} ${v.noun} seats. Select party." title="${esc(p.name)}: ${esc(p.description)}">${swatch(p)}<strong>${p.code}</strong><span class="line-name">${esc(p.name)}</span><span class="line-vote">${pct(current.votes[i])}</span></button>`;}).join('');
  $('party-cards').innerHTML=displayOrder.map(i=>{const p=current.parties[i],share=seats[i]/v.total*100;return`<button class="party-card${selected.size&&!selected.has(i)?' is-muted':''}" style="--party:${p.color}" data-party="${i}" aria-pressed="${selected.has(i)}" title="${esc(p.name)} · ${current.districtSeats[i]} district + ${current.prSeats[i]} PR = ${current.combinedSeats[i]} combined seats. Click to select." aria-label="${esc(p.name)}, ${seats[i]} ${v.noun} seats; ${current.districtSeats[i]} district plus ${current.prSeats[i]} PR equals ${current.combinedSeats[i]} combined. ${pct(current.votes[i])} votes. Select for coalition."><span class="code">${p.code}</span><span class="seat">${seats[i]}</span><span class="seat-share">${share.toFixed(1)}% seats</span><span class="vote">${pct(current.votes[i])} vote</span><span class="card-bar" aria-hidden="true"><span style="width:${share}%;background:${p.color}"></span></span></button>`;}).join('');
  $('share-header').textContent=`${v.label} share`;$('change-header').textContent=`${v.label} Δ`;
  $('overview-body').innerHTML=displayOrder.map(i=>{
    const p=current.parties[i],n=seats[i],change=n-v.baseline[i],share=n/v.total*100;
    return`<tr><td>${swatch(p)}<strong>${p.code}</strong><span class="party-name">${esc(p.name)}</span></td><td>${pct(current.votes[i])}</td><td class="${view==='district'?'selected-column':''}">${current.districtSeats[i]}</td><td class="${view==='pr'?'selected-column':''}">${current.prSeats[i]}</td><td class="${view==='combined'?'selected-column':''}">${current.combinedSeats[i]}</td><td>${share.toFixed(1)}%</td><td>${change===0?'—':signed(change,0)}</td><td><span class="representation" aria-label="Vote ${pct(current.votes[i])}, ${v.label} seat share ${share.toFixed(1)} percent"><span class="votes" style="width:${current.votes[i]*100}%;background:${p.color}"></span><span class="seats" style="width:${share}%;background:${p.color}"></span></span></td></tr>`;
  }).join('');
  $('coalition-kicker').textContent=isCombined?`${v.label} · The road to ${v.majority}`:v.label;
  $('coalition-copy').textContent=isCombined?`Each combination reaches ${v.majority} of ${v.total} ${v.noun} seats and loses its majority if any member leaves. These are arithmetic possibilities, without political compatibility restrictions.`:'';
  $('history-context').textContent=(isCombined?`Largest party and majority status use the Combined view (${v.total} seats; majority ${v.majority}).`:`Largest party uses the ${v.label} view (${v.total} seats).`)+` Most viable coalition uses each run’s Combined seats and the 401-seat majority. Select a run to restore it. History is kept in this tab until the page is closed or refreshed.`;
  $('assembly-panel').hidden=view!=='combined';$('panel-cartogram').hidden=view!=='district';$('panel-votes').hidden=view!=='pr';
  renderSummary();if(view==='district')renderCartogram();else if(view==='pr')renderVoteShare();else renderParliament();renderHistory();
  if(activeTab==='districts')renderDistricts();if(activeTab==='compass')renderPartyCompass();if(activeTab==='medians')drawDistrictMedians();if(activeTab==='coalitions')renderCoalitions();
}
function coalitionTier(codes){
  const mainstream=['LDP','CA','SDP','CON','GRN','LIB'];
  if(!codes.length||codes.some(code=>!mainstream.includes(code)))return 7;
  if(codes.length===1)return 1;
  const key=codes.slice().sort().join('+');
  const tiers={
    2:['CON+LDP','GRN+LDP','LDP+LIB','CA+SDP','CA+GRN','CA+CON'],
    3:['CON+LDP+LIB','GRN+LDP+LIB','CA+GRN+SDP','CA+CON+SDP'],
    4:['CA+LDP','CON+GRN+LDP','CA+CON+GRN']
  };
  for(const tier of [2,3,4])if(tiers[tier].includes(key))return tier;
  const tensions=[['LDP','SDP'],['LIB','SDP'],['CA','LIB']];
  return tensions.some(pair=>pair.every(code=>codes.includes(code)))?6:5;
}
function rankedCoalitions(parties,seats,majority){
  const paths=[];
  for(let mask=1;mask<(1<<parties.length);mask++){
    const group=largestPartiesFirst(displayOrder.filter(i=>mask&(1<<i)),seats),sum=group.reduce((n,i)=>n+seats[i],0),tier=coalitionTier(group.map(i=>parties[i].code));
    if(tier<7&&sum>=majority&&group.every(i=>sum-seats[i]<majority))paths.push({members:group,total:sum,tier});
  }
  // Prefer viability tiers, then fewer parties, then larger seat totals.
  // Stable mask enumeration breaks ties when all three criteria are equal.
  return paths.sort((a,b)=>a.tier-b.tier||a.members.length-b.members.length||b.total-a.total);
}
function renderSummary(){
  const v=shown(),seats=v.seats,isCombined=view==='combined';
  const ranked=largestPartiesFirst(displayOrder,seats),members=selected.size?largestPartiesFirst([...selected],seats):[ranked[0]],multi=members.length>1;
  const focus=current.parties[members[0]],total=members.reduce((n,i)=>n+seats[i],0),votes=members.reduce((n,i)=>n+current.votes[i],0),majority=total>=v.majority;
  const codes=members.map(i=>current.parties[i].code).join(' + '),name=multi?codes:focus.name;
  $('selection-summary').style.setProperty('--summary-color',focus.color);
  $('verdict-kicker').textContent=`${v.label} · ${selected.size?(multi?'Selected coalition':'Selected party'):(isCombined?'Largest party':'Party results')}`;
  $('verdict-title').textContent=!isCombined?name:multi?`${codes} ${majority?'have a majority.':`are ${v.majority-total} seats short of a majority.`}`:majority?`${focus.name} wins a majority.`:selected.size?`${focus.name} is ${v.majority-total} seats short of a majority.`:`${focus.name} leads. ${v.majority-total} seats short.`;
  const detail=multi?`Together they hold ${total} of ${v.total} ${v.noun} seats on ${pct(votes)} of the vote.`:`${focus.code} takes ${total} of ${v.total} ${v.noun} seats on ${pct(votes)} of the vote.`;
  $('verdict-detail').textContent=detail+(isCombined&&majority?` ${total-v.majority} seats above the majority threshold.`:'');
  $('summary-badge-code').textContent=multi?total:focus.code;
  $('summary-badge-seats').textContent=multi?'seats':`${total} seats`;
  let offset=0;
  const stops=members.map(i=>{const start=offset;offset+=total?seats[i]/total*100:100/members.length;return`${current.parties[i].color} ${start}% ${offset}%`;});
  $('summary-badge-face').style.background=multi?`linear-gradient(90deg,${stops.join(',')})`:focus.color;
  const hex=focus.color.replace('#',''),brightness=parseInt(hex.slice(0,2),16)*.299+parseInt(hex.slice(2,4),16)*.587+parseInt(hex.slice(4,6),16)*.114;
  $('summary-badge-face').style.color=multi||brightness<155?'#fff':'#202535';
  $('summary-badge-face').classList.toggle('coalition-badge',multi);
  $('majority-track').setAttribute('aria-label',`${name}: ${total} of ${v.total} seats`);
  $('majority-track').classList.toggle('without-majority',!isCombined);
  $('majority-track').style.setProperty('--majority-position',`${v.majority/v.total*100}%`);
  $('majority-track').innerHTML=members.filter(i=>seats[i]).map(i=>`<span style="width:${seats[i]/v.total*100}%;background:${current.parties[i].color}" title="${current.parties[i].code}: ${seats[i]}"></span>`).join('');
  $('track-majority').textContent=`majority ${v.majority}`;$('track-total').textContent=v.total;
  $('summary-clear').hidden=!selected.size;
  $('summary-clear').textContent=members.length>1?'× Clear selection':'× Back to the largest party';
  $('summary-paths-label').textContent=`Ways to reach ${v.majority} (sorted by coalition viability)`;
  $('summary-paths-section').hidden=!isCombined;
  if(!isCombined){$('summary-paths').innerHTML='';$('summary-paths-empty').hidden=true;return;}
  // Majority options do not depend on the selected or largest party.
  const paths=rankedCoalitions(current.parties,seats,v.majority);
  $('summary-paths-empty').hidden=paths.length>0;
  $('summary-paths').innerHTML=paths.slice(0,4).map(c=>`<button class="summary-path" data-coalition="${c.members.join(',')}" data-tier="${c.tier}" aria-label="Select ${c.members.map(i=>current.parties[i].name).join(' plus ')}, ${c.total} seats"><span class="path-swatches" aria-hidden="true">${c.members.map(i=>swatch(current.parties[i])).join('')}</span><span>${c.members.map(i=>current.parties[i].code).join(' + ')}</span><strong>${c.total}</strong></button>`).join('');
}

function renderParliament(){
  const v=shown(),seats=v.seats,isCombined=view==='combined',westminster=$('diagram-layout').value==='westminster';
  $('seat-order').hidden=westminster;$('seat-order-label').hidden=westminster;
  let order=displayOrder.slice();
  if(westminster||$('seat-order').value==='size')order=largestPartiesFirst(order,seats);
  const selectedMembers=largestPartiesFirst(displayOrder.filter(i=>selected.has(i)),seats),coalition=selectedMembers.reduce((s,i)=>s+seats[i],0);
  $('coalition-label').textContent=selected.size?`${selectedMembers.map(i=>current.parties[i].code).join(' + ')} · ${coalition} ${v.noun} seats${isCombined?` · ${coalition>=v.majority?`${coalition-v.majority} above the majority threshold`:`${v.majority-coalition} short of a majority`}`:''}`:'Select parties below to build a coalition.';
  $('clear-coalition').hidden=!selected.size;
  const style=getComputedStyle(document.body),ink=style.getPropertyValue('--text').trim(),muted=style.getPropertyValue('--muted').trim(),border=style.getPropertyValue('--border').trim(),accent=style.getPropertyValue('--accent').trim();
  const text=(x,y,label,size=12,color=muted,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" fill="${color}">${esc(label)}</text>`;
  const circle=(dot,i,radius)=>{const p=current.parties[i],opacity=!westminster&&selected.size&&!selected.has(i)?.17:1;return`<circle data-party="${p.code}" cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${p.color}" opacity="${opacity}"><title>${esc(p.name)} · ${seats[i]} ${v.noun} seats</title></circle>`;};
  let geometry,artwork='';
  if(westminster){
    const upper=order.filter(i=>!selected.has(i)),lower=order.filter(i=>selected.has(i)),otherSeats=v.total-coalition;
    geometry=G.westminster(v.total,otherSeats,coalition);
    const upperParties=upper.flatMap(i=>Array(seats[i]).fill(i)),lowerParties=lower.flatMap(i=>Array(seats[i]).fill(i));
    artwork+=text(450,22,isCombined?`Government ${coalition} · Opposition ${otherSeats} · Majority ${v.majority}`:`Selected parties ${coalition} · Other parties ${otherSeats}`,13,ink);
    artwork+=`<rect x="30" y="181" width="24" height="28" rx="4" fill="${accent}"><title>Speaker</title></rect><rect x="76" y="188" width="90" height="14" rx="3" fill="${border}"/>`;
    artwork+=text(42,226,'SPEAKER',8);
    artwork+=geometry.upper.map((dot,i)=>circle(dot,upperParties[i],geometry.radius)).join('');
    artwork+=geometry.lower.map((dot,i)=>circle(dot,lowerParties[i],geometry.radius)).join('');
    artwork+=text(geometry.left,geometry.topLabel,`${isCombined?'OPPOSITION':'OTHER PARTIES'} · ${otherSeats}`,11,muted,'start');
    artwork+=text(geometry.left,geometry.bottomLabel,`${isCombined?'GOVERNMENT':'SELECTED PARTIES'} · ${coalition}`,11,muted,'start');
    if(!coalition)artwork+=text(470,270,isCombined?'Select parties below to fill the government benches.':'Select parties below to move seats across the aisle.',13);
    const status=isCombined&&selected.size?(coalition>=v.majority?'Majority reached':'Majority not reached'):v.description;
    artwork+=text(450,392,status,11);
    $('diagram-hint').textContent=(isCombined?'Two facing benches. Select party cards to move parties between government and opposition.':'Two facing benches. Select party cards to move parties across the aisle.')+' Parties are ordered largest first within each bench.';
  }else{
    geometry=G.hemicycle(v.total);
    const assignment=G.seatAssignments(geometry,order.map(i=>seats[i])).map(rank=>order[rank]);
    artwork+=geometry.dots.map((dot,i)=>circle(dot,assignment[i],geometry.radius)).join('');
    if(selected.size||isCombined){
      artwork+=`<text x="450" y="272" text-anchor="middle" font-family="Georgia,serif" font-size="46" fill="${ink}">${selected.size?coalition:v.majority}</text>`;
      artwork+=text(450,298,selected.size?(selected.size===1?'PARTY SEATS':'COALITION SEATS'):'SEATS FOR A MAJORITY',11);
    }
    const caption=selected.size?(isCombined?(coalition>=v.majority?'Majority reached':'Majority not reached'):'Selected parties'):v.description;
    artwork+=text(450,325,caption,10);
    $('diagram-hint').textContent='Each dot represents one seat. Parties follow the selected seat order; select party cards to highlight a coalition.';
  }
  const layout=westminster?'Westminster':'Hemicycle';
  $('hemicycle').innerHTML=`<svg id="parliament-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${westminster?`0 0 ${geometry.width} ${geometry.height}`:`120 0 660 ${geometry.height}`}" role="img" aria-label="${v.label} ${layout} Assembly diagram with ${v.total} seats" aria-describedby="diagram-hint"><title>Wizlandia ${v.label} Assembly · ${layout} · ${order.map(i=>`${current.parties[i].code} ${seats[i]}`).join(', ')}</title>${artwork}</svg>`;
}
function renderVoteShare(){
  const style=getComputedStyle(document.body),ink=style.getPropertyValue('--text').trim(),muted=style.getPropertyValue('--muted').trim(),border=style.getPropertyValue('--border').trim(),surface=style.getPropertyValue('--surface').trim();
  const width=960,height=450,left=96,right=24,top=34,bottom=66,plotWidth=width-left-right,plotHeight=height-top-bottom,baseline=height-bottom;
  const shares=current.votes.map(v=>v*100),maximum=Math.max(...shares),step=maximum<=20?5:maximum<=45?10:20;
  const ceiling=Math.min(100,Math.max(step,Math.ceil(maximum*1.15/step)*step));
  const label=(x,y,text,size=14,color=muted,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="system-ui,sans-serif" font-size="${size}" fill="${color}">${esc(text)}</text>`;
  let artwork=`<rect width="${width}" height="${height}" fill="${surface}"/>`;
  for(let value=0;value<=ceiling;value+=step){
    const y=baseline-value/ceiling*plotHeight;
    artwork+=`<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="${border}" stroke-width="1"/>`+label(left-14,y+5,`${value}%`,14,muted,'end');
  }
  artwork+=`<text transform="translate(24 ${top+plotHeight/2}) rotate(-90)" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="${ink}">Percentage of the vote</text>`;
  const slot=plotWidth/displayOrder.length,barWidth=slot*.64;
  for(const [rank,i] of displayOrder.entries()){
    const p=current.parties[i],share=shares[i],barHeight=share/ceiling*plotHeight,x=left+rank*slot+(slot-barWidth)/2,y=baseline-barHeight;
    const faded=selected.size&&!selected.has(i),text=`${p.name}: ${share.toFixed(1)}% of the vote`;
    artwork+=`<g data-vote-party="${p.code}" data-share="${share}" opacity="${faded?.3:1}"><title>${esc(text)}</title><rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${p.color}" rx="2"/>${label(x+barWidth/2,Math.max(top-8,y-10),`${share.toFixed(1)}%`,16,ink)}${label(x+barWidth/2,baseline+28,p.code,16,ink)}</g>`;
  }
  $('vote-share-chart').innerHTML=`<svg id="vote-share-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="National vote share by party, ordered left to right" aria-describedby="vote-share-description"><title>Wizlandia PR List vote share</title><desc id="vote-share-description">${displayOrder.map(i=>`${current.parties[i].name}: ${shares[i].toFixed(1)}%`).join('; ')}</desc>${artwork}</svg>`;
}
function renderCartogram(){
  const mode=$('cartogram-color').value,stateFilter=$('cartogram-state').value;
  const familyKey=$('cartogram-family-key');familyKey.hidden=mode!=='family';
  familyKey.innerHTML=mode==='family'?'<strong>District type family</strong>'+Object.entries(H.familyColors).map(([name,color])=>`<span><i class="family-key-swatch" style="background:${color}" aria-hidden="true"></i>${esc(name)}</span>`).join(''):'';
  const rows=current.rows.filter(d=>stateFilter==='all'||d.stateCode===stateFilter),states=H.states.filter(s=>stateFilter==='all'||s.code===stateFilter);
  const xs=rows.map(d=>d.tileX),ys=rows.map(d=>d.tileY),x0=Math.min(...xs)-2,y0=Math.min(...ys)-2,w=Math.max(...xs)-x0+2,h=Math.max(...ys)-y0+2;
  const dark=document.body.classList.contains('dark'),surface=dark?'#232836':'#f7f7f4';
  let artwork=`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${surface}"/>`;
  for(const d of rows){
    const state=H.states.find(s=>s.code===d.stateCode),party=current.parties[d.winner];
    const color=mode==='winner'?party.color:mode==='family'?H.familyColors[d.family]:state.color;
    const points=Array.from({length:6},(_,i)=>{const a=Math.PI/2+i*Math.PI/3;return`${d.tileX+Math.cos(a)},${d.tileY+Math.sin(a)}`;}).join(' ');
    const description=`${d.id}, ${d.state}, ${d.locality}, ${d.name}. Select to inspect district.`;
    const faded=selected.size&&!selected.has(d.winner)&&mode==='winner';
    artwork+=`<g class="cartogram-tile" data-district="${d.id}" role="button" tabindex="0" aria-label="${esc(description)}" aria-pressed="${inspectedDistrict===d.id}" opacity="${faded?.3:1}"><polygon points="${points}" fill="${color}" stroke="${inspectedDistrict===d.id?'#e1b63d':'#d5d7d6'}" stroke-width="${inspectedDistrict===d.id?.17:.04}"/></g>`;
  }
  const borders=H.stateBorders.filter(e=>stateFilter==='all'||e.states.includes(stateFilter));
  artwork+=`<path data-state-borders="true" d="${borders.map(e=>`M${e.a[0]},${e.a[1]}L${e.b[0]},${e.b[1]}`).join('')}" fill="none" stroke="#000000" stroke-width=".19" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
  for(const s of H.stateLabels.filter(s=>stateFilter==='all'||s.code===stateFilter))artwork+=`<text x="${s.x}" y="${s.y}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size=".84" font-weight="700" fill="#111111" stroke="#ffffff" stroke-width=".20" paint-order="stroke" pointer-events="none">${s.code}</text>`;
  $('cartogram').innerHTML=`<svg id="cartogram-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" role="group" aria-label="Wizlandia 400 electoral district cartogram"><title>Wizlandia electoral districts · ${mode} · ${stateFilter==='all'?'All states':stateFilter}</title>${artwork}</svg>`;
  document.querySelector('.cartogram-scroll').classList.toggle('is-focused',stateFilter!=='all');
  $('cartogram-layout').classList.toggle('is-focused',stateFilter!=='all');
  const results=$('cartogram-state-results');results.hidden=false;
  const counts=current.parties.map((_,i)=>rows.filter(d=>d.winner===i).length);
  const winners=largestPartiesFirst(displayOrder.filter(i=>counts[i]>0),counts);
  const heading=stateFilter==='all'?'Nationwide':states[0].name;
  results.innerHTML=`<div class="state-results-heading"><strong>${esc(heading)}</strong><span>${rows.length} district seats</span></div><div class="state-party-results">${winners.map(i=>{const p=current.parties[i];return`<div class="state-party-result" style="--party:${p.color}">${swatch(p)}<span>${esc(p.name)}</span><strong>${counts[i]}</strong></div>`;}).join('')}</div>`;
  const d=rows.find(d=>d.id===inspectedDistrict);
  $('cartogram-detail').hidden=!d;
  if(d){const p=current.parties[d.winner];$('cartogram-detail').innerHTML=`<button type="button" class="text-button district-detail-close" data-close-district aria-label="Close district details">×</button><strong>${d.id} · ${esc(d.locality)}</strong><p class="district-type-name">${esc(d.name)}</p><p>${esc(d.state)} · ${d.population.toLocaleString()} estimated residents</p><p>${swatch(p)} ${esc(p.name)}</p>`;}
  else $('cartogram-detail').innerHTML='';
}

function renderDistricts(){
  const q=$('district-search').value.toLowerCase().trim(),party=$('district-party').value;
  let rows=current.rows.filter(d=>(!q||`${d.id} ${d.legacyId} ${d.state} ${d.locality} T${String(d.type).padStart(2,'0')} ${d.name}`.toLowerCase().includes(q))&&(party==='all'||d.winner===Number(party))&&($('district-state').value==='all'||d.stateCode===$('district-state').value));
  rows.sort((a,b)=>a.stateIndex-b.stateIndex||a.id.localeCompare(b.id));
  if($('district-sort').value==='close')rows.sort((a,b)=>a.distanceGap-b.distanceGap||a.id.localeCompare(b.id));
  $('district-count').textContent=`${rows.length} of 400`;
  $('district-body').innerHTML=rows.map(d=>`<tr><td><strong>${d.id}</strong></td><td>${esc(d.state)}<br><small>${esc(d.locality)}</small></td><td>${d.population.toLocaleString()}</td><td title="${esc(d.name)}">${esc(d.name)}</td><td>${swatch(current.parties[d.winner])} ${current.parties[d.winner].code}</td><td>${current.parties[d.runner].code}</td></tr>`).join('');
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
    const top=rankedCoalitions(r.parties,r.combinedSeats,E.component(r,'combined').majority)[0];
    const coalition=top?`<span class="history-coalition-swatches" aria-hidden="true">${top.members.map(i=>swatch(r.parties[i])).join('')}</span>${esc(top.members.map(i=>r.parties[i].code).join(' + '))}`:'No viable coalition';
    const coalitionTotals=top?['districtSeats','prSeats','combinedSeats'].map(key=>top.members.reduce((total,j)=>total+r[key][j],0)):['—','—','—'];
    return`<tr><td><button class="history-link" data-history="${h.id}">${esc(h.label)}</button></td><td>${signed(r.economic)}</td><td>${signed(r.cultural)}</td><td>${r.variance.toFixed(3)}×</td><td>${swatch(r.parties[i])} ${r.parties[i].code}</td><td>${r.districtSeats[i]}</td><td>${r.prSeats[i]}</td><td>${r.combinedSeats[i]}</td>${view==='combined'?`<td>${seats[i]>=v.majority?'Majority':'No overall majority'}</td>`:''}<td>${coalition}</td>${coalitionTotals.map(n=>`<td>${n}</td>`).join('')}</tr>`;
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
  if(name==='compass')renderPartyCompass();if(name==='medians')drawDistrictMedians();if(name==='districts')renderDistricts();if(name==='coalitions')renderCoalitions();
}
function renderPartyCompass(){
  const v=shown(),seats=v.seats,style=getComputedStyle(document.body),dark=document.body.classList.contains('dark');
  const ink=style.getPropertyValue('--text').trim(),muted=style.getPropertyValue('--muted').trim(),border=style.getPropertyValue('--border').trim(),surface=style.getPropertyValue('--surface').trim(),soft=style.getPropertyValue('--soft').trim();
  const left=90,top=40,size=800,bound=10;
  const px=x=>left+(x+bound)*size/(2*bound),py=y=>top+(bound-y)*size/(2*bound);
  const label=(x,y,text,anchor='middle',weight=400,font=18)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="system-ui,sans-serif" font-size="${font}" font-weight="${weight}" fill="${muted}">${esc(text)}</text>`;
  let artwork=`<rect width="980" height="940" fill="${surface}"/><rect x="${left}" y="${top}" width="${size}" height="${size}" rx="18" fill="${soft}" stroke="${border}" stroke-width="2"/>`;
  for(let n=-bound+2;n<bound;n+=2){
    if(n===0)continue;
    artwork+=`<path d="M${px(n)},${top}V${top+size}M${left},${py(n)}H${left+size}" fill="none" stroke="${border}" stroke-width="1" opacity=".65"/>`;
  }
  artwork+=`<path d="M${px(0)},${top}V${top+size}M${left},${py(0)}H${left+size}" fill="none" stroke="${border}" stroke-width="3"/>`;
  for(const n of [-bound,0,bound])artwork+=label(px(n),top+size+30,n)+label(left-18,py(n)+6,n,'end');
  artwork+=label(left+14,py(0)-15,'Interventionist','start',650,19)+label(left+size-14,py(0)-15,'Liberal','end',650,19);
  artwork+=label(px(0)+15,top+32,'Traditional','start',650,20)+label(px(0)+15,top+size-18,'Progressive','start',650,20);
  artwork+=label(left+size/2,910,'Economic position');
  artwork+=`<text transform="translate(26 ${top+size/2}) rotate(-90)" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="${muted}">Cultural position</text>`;
  // Presentation-only coordinates: never pass these to the election model or median plot.
  const displayPositions={CA:{x:0,y:0},NF:{x:-.5,y:8},SWP:{x:-9,y:-7.5},SDP:{x:-4,y:-1.5}};
  const nodes=current.parties.map((party,i)=>{
    const p={...party,...displayPositions[party.code]};
    return{p,i,x:px(p.x),y:py(p.y),r:seats[i]>0?3*Math.sqrt(seats[i]):6};
  });
  const ordered=displayOrder.slice().sort((a,b)=>seats[b]-seats[a]||displayOrder.indexOf(a)-displayOrder.indexOf(b)),placed=[];
  const labelPositions=new Map();
  for(const i of ordered){
    const node=nodes[i],{p,x,y,r}=node,w=(p.code.length+1+String(seats[i]).length)*11.2,h=22,gap=11;
    const candidates=[{x:x+r+gap,y:y+6,anchor:'start'},{x:x-r-gap,y:y+6,anchor:'end'},{x,y:y-r-gap,anchor:'middle'},{x,y:y+r+gap+h-5,anchor:'middle'},{x:x+r*.7+gap,y:y-r*.7-gap,anchor:'start'},{x:x-r*.7-gap,y:y-r*.7-gap,anchor:'end'},{x:x+r*.7+gap,y:y+r*.7+gap+h-5,anchor:'start'},{x:x-r*.7-gap,y:y+r*.7+gap+h-5,anchor:'end'}];
    let best=null;
    candidates.forEach((c,rank)=>{
      const box={x:c.x-(c.anchor==='middle'?w/2:c.anchor==='end'?w:0),y:c.y-h+3,w,h};
      let score=rank+1000*(Math.max(0,left+4-box.x)+Math.max(0,box.x+w-left-size+4)+Math.max(0,top+4-box.y)+Math.max(0,box.y+h-top-size+4));
      for(const other of nodes){const nearX=Math.max(box.x,Math.min(other.x,box.x+w)),nearY=Math.max(box.y,Math.min(other.y,box.y+h));if(Math.hypot(nearX-other.x,nearY-other.y)<other.r+5)score+=10000;}
      for(const other of placed)score+=Math.max(0,Math.min(box.x+w,other.x+other.w)-Math.max(box.x,other.x))*Math.max(0,Math.min(box.y+h,other.y+other.h)-Math.max(box.y,other.y))*10;
      if(!best||score<best.score)best={...c,box,score};
    });
    placed.push(best.box);labelPositions.set(i,best);
  }
  // Large bubbles are painted first so smaller and zero-seat markers stay usable.
  for(const i of ordered){
    const {p,x,y,r}=nodes[i],chosen=selected.has(i),faded=selected.size&&!chosen,pos=labelPositions.get(i);
    const description=`${p.name}, ${seats[i]} ${v.noun} seats. Economy ${p.x.toFixed(2)}, culture ${p.y.toFixed(2)}. Select party.`;
    artwork+=`<g class="party-compass-node" data-party="${i}" data-compass-code="${p.code}" data-seats="${seats[i]}" data-radius="${r}" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="${esc(description)}" opacity="${faded?.24:1}"><title>${esc(description)}</title><circle cx="${x}" cy="${y}" r="${Math.max(12,r)}" fill="transparent"/>`;
    if(chosen)artwork+=`<circle class="party-compass-halo" cx="${x}" cy="${y}" r="${r+10}" fill="${p.color}" fill-opacity=".18" stroke="${p.color}" stroke-width="2"/>`;
    artwork+=`<circle class="party-compass-dot" cx="${x}" cy="${y}" r="${r}" fill="${seats[i]>0?p.color:soft}" stroke="${seats[i]>0?(dark?'#e9e9ed':'#ffffff'):p.color}" stroke-width="${seats[i]>0?3:3.5}"/><text x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}" font-family="ui-monospace,monospace" font-size="18" fill="${ink}"><tspan font-weight="750">${p.code}</tspan><tspan fill="${muted}"> ${seats[i]}</tspan></text></g>`;
  }
  $('party-compass').innerHTML=`<svg id="party-compass-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 940" role="group" aria-label="Party compass showing ${v.label} seats"><title>Wizlandia party compass · ${v.label} seats</title>${artwork}</svg>`;
  $('party-compass-note').textContent=`${v.label} seats · Circle radius scales with the square root of seats. Hollow dots indicate zero seats. Select dots or seat cards to highlight parties.`;
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
function drawDistrictMedians(){
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
  c.textAlign='center';c.font='12px sans-serif';c.fillText('Economy · Interventionist ↔ Liberal',x0+w/2,y0+h+49);
  c.save();c.translate(20,y0+h/2);c.rotate(-Math.PI/2);c.fillText('Culture · Progressive ↔ Traditional',0,0);c.restore();
}
function recompute(){try{current=E.evaluate(state.economic,state.cultural,state.variance,state.spread,state.parties);render();}catch(error){notice(error.message);}}
function restore(result){state={economic:result.economic,cultural:result.cultural,variance:result.variance,spread:D.spread,parties:result.parties.map(p=>({...p}))};current=result;render();}
function getSeed(){const n=Number($('seed').value);if(!Number.isInteger(n)||n<0||n>4294967295)throw new Error('Enter an integer seed between 0 and 4294967295.');return n;}
function setMode(value){mode=value;$('manual-mode').classList.toggle('active',value==='manual');$('random-mode').classList.toggle('active',value==='random');$('run').textContent=value==='manual'?'▶ Run election':'⚄ Draw election';$('mode-hint').textContent=value==='manual'?'Sliders update the preview. Run saves it to history.':'Draw a new seeded shock around the same baseline.';}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function csv(rows){return rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';}
function resultRows(results){return [['run','economic_shift','cultural_shift','variance_multiplier','district_spread',...D.parties.map(p=>p.code+'_district_seats'),...D.parties.map(p=>p.code+'_pr_seats'),...D.parties.map(p=>p.code+'_combined_seats'),...D.parties.map(p=>p.code+'_vote_percent')],...results.map((h,i)=>{const r=h.result||h;return[h.label||i+1,r.economic,r.cultural,r.variance,r.spread,...r.districtSeats,...r.prSeats,...r.combinedSeats,...r.votes.map(v=>v*100)];})];}
for(const button of document.querySelectorAll('[data-component]'))button.onclick=()=>{view=button.dataset.component;render();};
for(const k of ['economic','cultural','variance'])$(k).addEventListener('input',()=>{state[k]=Number($(k).value);setMode('manual');cancelAnimationFrame(frame);frame=requestAnimationFrame(recompute);});
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
function toggleParty(event){const card=event.target.closest('[data-party]');if(!card)return;const i=Number(card.dataset.party),source=event.currentTarget.id,restoreFocus=document.activeElement===card;selected.has(i)?selected.delete(i):selected.add(i);render();if(restoreFocus)$(source).querySelector(`[data-party="${i}"]`)?.focus({preventScroll:true});}
$('party-cards').onclick=toggleParty;$('party-list').onclick=toggleParty;$('party-compass').onclick=toggleParty;
$('party-compass').onkeydown=event=>{if(['Enter',' '].includes(event.key)&&event.target.closest('[data-party]')){event.preventDefault();toggleParty(event);}else if(event.key==='Escape')clearSelection();};
function clearSelection(){selected.clear();render();}
$('clear-coalition').onclick=clearSelection;$('summary-clear').onclick=clearSelection;$('seat-order').onchange=renderParliament;$('diagram-layout').onchange=renderParliament;
for(const button of document.querySelectorAll('[data-tab]')){
  button.onclick=()=>showTab(button.dataset.tab);
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')].filter(tab=>!tab.hidden),i=tabs.indexOf(button);const j=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;showTab(tabs[j].dataset.tab);tabs[j].focus();};
}
for(const id of ['district-search','district-party','district-sort','district-state'])$(id).addEventListener('input',renderDistricts);
$('district-party').innerHTML='<option value="all">All parties</option>'+displayOrder.map(i=>`<option value="${i}">${D.parties[i].code}</option>`).join('');
function chooseCoalition(event){const b=event.target.closest('[data-coalition]');if(!b)return;selected=new Set(b.dataset.coalition.split(',').map(Number));render();}
$('coalition-options').onclick=chooseCoalition;$('summary-paths').onclick=chooseCoalition;
$('history-body').onclick=event=>{const b=event.target.closest('[data-history]');if(b){const h=history.find(h=>h.id===Number(b.dataset.history));if(h){setMode('manual');restore(h.result);notice(`${h.label} restored.`);}}};
for(const id of ['show-density','show-districts'])$(id).onchange=drawDistrictMedians;
$('compass').addEventListener('mousemove',event=>{
  const rect=$('compass').getBoundingClientRect(),x=(event.clientX-rect.left)*900/rect.width,y=(event.clientY-rect.top)*760/rect.height;
  let best=null,distance=12;
  for(const dot of compassDots){const d=Math.hypot(dot.x-x,dot.y-y);if(d<distance){distance=d;best=dot;}}
  const tip=$('tooltip');if(!best){tip.hidden=true;return;}
  const d=best.d;tip.textContent=`${d.id} · ${d.name} · ${current.parties[d.winner].code} · (${d.x.toFixed(3)}, ${d.y.toFixed(3)})`;tip.hidden=false;
  tip.style.left=Math.max(0,Math.min(event.clientX-rect.left+12,rect.width-245))+'px';tip.style.top=Math.max(0,event.clientY-rect.top-65)+'px';
});$('compass').onmouseleave=()=>$('tooltip').hidden=true;
$('export-svg').onclick=()=>download(`wizlandia-${view}-${$('diagram-layout').value}.svg`,new XMLSerializer().serializeToString($('parliament-svg')),'image/svg+xml');
$('export-party-compass').onclick=()=>download('wizlandia-party-compass.svg',new XMLSerializer().serializeToString($('party-compass-svg')),'image/svg+xml');
$('export-votes').onclick=()=>download('wizlandia-pr-vote-share.svg',new XMLSerializer().serializeToString($('vote-share-svg')),'image/svg+xml');
$('export-results').onclick=()=>download('wizlandia-results.csv',csv(resultRows([current])),'text/csv;charset=utf-8');
$('export-history').onclick=()=>download('wizlandia-election-history.csv',csv(resultRows(history)),'text/csv;charset=utf-8');
$('export-districts').onclick=()=>download('wizlandia-districts.csv',csv([['district_id','state','locality','population','legacy_id','type_id','district_type','economic_x','cultural_y','winner','runner_up','distance_gap'],...current.rows.map(d=>[d.id,d.state,d.locality,d.population,d.legacyId,d.type,d.name,d.x,d.y,current.parties[d.winner].code,current.parties[d.runner].code,d.distanceGap])]),'text/csv;charset=utf-8');
$('save-config').onclick=()=>{try{download('wizlandia-config.json',JSON.stringify({version:1,view,diagramLayout:$('diagram-layout').value,seatOrder:$('seat-order').value,economic:state.economic,cultural:state.cultural,variance:state.variance,spread:state.spread,seed:getSeed(),runs:Number($('runs').value),parties:state.parties.map(({code,x,y})=>({code,x,y}))},null,2),'application/json');}catch(e){notice(e.message);}};
$('load-config-button').onclick=()=>$('load-config').click();
$('load-config').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>100000)throw new Error('Configuration file is too large.');
    const c=JSON.parse(await file.text());if(c.version!==1||!Array.isArray(c.parties)||c.parties.length!==9)throw new Error('Unsupported Wizlandia configuration.');
    if(!Number.isInteger(c.seed)||c.seed<0||c.seed>4294967295||!Number.isInteger(c.runs)||c.runs<1||c.runs>100)throw new Error('Invalid seed or batch size.');
    const parties=D.parties.map((p,i)=>{const q=c.parties[i];if(q.code!==p.code)throw new Error('Party codes must match the Wizlandia model.');return{...p,x:q.x,y:q.y};});
    if(c.view!==undefined&&!Object.hasOwn(E.components,c.view))throw new Error('Invalid seat view.');
    if(c.diagramLayout!==undefined&&!['hemicycle','westminster'].includes(c.diagramLayout))throw new Error('Invalid diagram layout.');
    if(c.seatOrder!==undefined&&!['political','size'].includes(c.seatOrder))throw new Error('Invalid seat order.');
    const result=E.evaluate(c.economic,c.cultural,c.variance,D.spread,parties);
    $('diagram-layout').value=c.diagramLayout||'hemicycle';$('seat-order').value=c.seatOrder||'political';
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
function applyTheme(dark){document.body.classList.toggle('dark',dark);$('theme').textContent=dark?'☀ Light':'◐ Dark';if(view==='district')renderCartogram();else if(view==='pr')renderVoteShare();else renderParliament();if(activeTab==='compass')renderPartyCompass();if(activeTab==='medians')drawDistrictMedians();}
let initialDark=false;try{initialDark=localStorage.getItem('wizlandia-theme')==='dark';}catch(e){}
$('theme').onclick=()=>{const dark=!document.body.classList.contains('dark');try{localStorage.setItem('wizlandia-theme',dark?'dark':'light');}catch(e){}applyTheme(dark);};
for(const id of ['cartogram-state','district-state'])$(id).innerHTML='<option value="all">All states</option>'+H.states.map(s=>`<option value="${s.code}">${esc(s.name)} (${s.districts})</option>`).join('');
for(const id of ['cartogram-color','cartogram-state'])$(id).addEventListener('change',()=>{if(id==='cartogram-state')inspectedDistrict=null;renderCartogram();});
function inspectTile(event){const tile=event.target.closest('[data-district]');if(tile){inspectedDistrict=tile.dataset.district;renderCartogram();}}
$('cartogram').onclick=event=>{const tile=event.target.closest('[data-district]');if(tile)inspectTile(event);else{inspectedDistrict=null;renderCartogram();}};
$('cartogram-detail').onclick=event=>{if(event.target.closest('[data-close-district]')){inspectedDistrict=null;renderCartogram();}};
$('cartogram').onkeydown=event=>{if(event.key==='Escape'){inspectedDistrict=null;renderCartogram();return;}if(['Enter',' '].includes(event.key)){event.preventDefault();inspectTile(event);}};
$('export-cartogram').onclick=()=>download('wizlandia-district-cartogram.svg',new XMLSerializer().serializeToString($('cartogram-svg')),'image/svg+xml');
addHistory(current,'Baseline');render();applyTheme(initialDark);
})();
