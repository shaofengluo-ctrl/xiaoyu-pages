const API_BASE = 'http://127.0.0.1:5097';
const REFRESH_MS = 90000;
let allEvents = [];
let topNodes = [];
let selectedNodeId = null;
let selectedEventId = null;

function bubbleColor(d) {
  const h = d.heat_score || 0;
  const b = Math.min(d.insight_resonance_boost || 0, 2) / 2;
  if (h > 0.7 && b < 0.3) return '#f97316';
  if (b > 0.7 && h < 0.5) return '#38bdf8';
  return '#e879f9';
}

function bubbleRadius(d) {
  const intensity = d.combined_intensity || ((d.heat_score || 0.1) * (1 + (d.insight_resonance_boost || 0.1)));
  return Math.max(5, Math.min(32, 6 + intensity * 14));
}

function shortLabel(label, max = 16) {
  if (!label) return '?';
  const l = String(label);
  return l.length > max ? l.slice(0, max) + '\u2026' : l;
}

function fmtTime(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T'));
  if (isNaN(d)) return ts;
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtFull(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T'));
  if (isNaN(d)) return ts;
  return d.toLocaleString('zh-CN', {hour12: false});
}

async function loadData() {
  try {
    const resp = await fetch(`${API_BASE}/resonance-timeline?limit=200`);
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();
    allEvents = data.events || [];
    topNodes = data.top_nodes || [];
    return true;
  } catch(e) {
    console.error('Failed to load timeline:', e);
    return false;
  }
}

async function loadHeatmap() {
  try {
    const resp = await fetch(`${API_BASE}/cognitive-heatmap`);
    if (!resp.ok) throw new Error(resp.status);
    return await resp.json();
  } catch(e) {
    return null;
  }
}

function updateStats() {
  document.getElementById('stat-total').textContent = allEvents.length;
  document.getElementById('stat-nodes').textContent = new Set(allEvents.map(e => e.node_id)).size;
  if (allEvents.length > 0) {
    document.getElementById('stat-heat').textContent = (allEvents.reduce((s,e) => s+(e.heat_score||0), 0)/allEvents.length).toFixed(2);
    document.getElementById('stat-boost').textContent = (allEvents.reduce((s,e) => s+(e.insight_resonance_boost||0), 0)/allEvents.length).toFixed(2);
    document.getElementById('stat-last').textContent = fmtTime(allEvents[0].timestamp);
  } else {
    ['stat-heat','stat-boost'].forEach(id => document.getElementById(id).textContent = '\u2014');
    document.getElementById('stat-last').textContent = 'never';
  }
}

function renderSidebar() {
  const container = document.getElementById('rank-list');
  container.innerHTML = '';
  if (!topNodes.length) {
    container.innerHTML = '<div style="padding:10px 14px;font-size:0.7rem;color:#3a3a6a">\u6682\u65e0\u6570\u636e</div>';
    return;
  }
  topNodes.forEach((node, i) => {
    const div = document.createElement('div');
    div.className = 'rank-item' + (node.node_id === selectedNodeId ? ' active' : '');
    div.innerHTML = `<span class="rank-num">${i+1}</span><span class="rank-label" title="${node.node_id}">${shortLabel(node.label||node.node_id, 18)}</span><span class="rank-count">\xd7${node.count}</span>`;
    div.addEventListener('click', () => {
      selectedNodeId = selectedNodeId === node.node_id ? null : node.node_id;
      renderSidebar();
      renderTimeline();
    });
    container.appendChild(div);
  });
}

function renderDetail(events) {
  const container = document.getElementById('detail-content');
  if (!events || !events.length) {
    container.innerHTML = '<div class="detail-placeholder">\u70b9\u51fb\u65f6\u95f4\u8f74\u4e0a\u7684\u6c14\u6ce1<br>\u67e5\u770b\u4e8b\u4ef6\u8be6\u60c5</div>';
    return;
  }
  container.innerHTML = events.slice(0, 20).map((e, i) => `
    <div class="event-card ${e._id === selectedEventId ? 'selected' : ''}" data-id="${e._id||i}">
      <div class="ec-node" title="${e.label||e.node_id}">${shortLabel(e.label||e.node_id, 22)}</div>
      <div class="ec-time">${fmtFull(e.timestamp)}</div>
      <div class="ec-metrics">
        <span class="ec-metric heat">\ud83d\udd25 ${(e.heat_score||0).toFixed(2)}</span>
        <span class="ec-metric boost">\u26a1 ${(e.insight_resonance_boost||0).toFixed(2)}</span>
        <span class="ec-metric intensity">\u25c8 ${(e.combined_intensity||0).toFixed(2)}</span>
      </div>
    </div>`).join('');
}

function renderTimeline() {
  const svg = d3.select('#timeline-svg');
  svg.selectAll('*').remove();
  const svgEl = document.getElementById('timeline-svg');
  const W = svgEl.clientWidth || 800;
  const H = svgEl.clientHeight || 500;

  if (!allEvents.length) {
    document.getElementById('empty-state').style.display = 'flex';
    svgEl.style.display = 'none';
    return;
  }
  document.getElementById('empty-state').style.display = 'none';
  svgEl.style.display = 'block';

  const filtered = selectedNodeId ? allEvents.filter(e => e.node_id === selectedNodeId) : allEvents;
  if (!filtered.length) {
    svg.append('text').attr('x', W/2).attr('y', H/2).attr('text-anchor','middle').attr('fill','#3a3a6a').attr('font-size','0.82rem').text('\u8be5\u8282\u70b9\u6682\u65e0\u4e8b\u4ef6\u8bb0\u5f55');
    return;
  }

  const margin = {top:30, right:40, bottom:50, left:60};
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const parseTime = ts => new Date(ts.includes('T') ? ts : ts.replace(' ','T'));
  const times = filtered.map(e => parseTime(e.timestamp));
  let [tMin, tMax] = d3.extent(times);
  if (!tMin || tMin.getTime() === tMax.getTime()) {
    tMin = new Date(tMin.getTime() - 86400000);
    tMax = new Date(tMax.getTime() + 86400000);
  } else {
    const pad = (tMax - tMin) * 0.08;
    tMin = new Date(tMin - pad);
    tMax = new Date(tMax + pad);
  }

  const xScale = d3.scaleTime().domain([tMin, tMax]).range([0, w]);
  const nodeIds = [...new Set(filtered.map(e => e.node_id))];
  const yScale = d3.scalePoint().domain(nodeIds).range([0, h]).padding(0.5);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').selectAll('line').data(xScale.ticks(5)).join('line')
    .attr('x1', d=>xScale(d)).attr('x2', d=>xScale(d)).attr('y1',0).attr('y2',h)
    .attr('stroke','#1a1a3a').attr('stroke-width',1);

  g.append('g').selectAll('line').data(nodeIds).join('line')
    .attr('x1',0).attr('x2',w).attr('y1',d=>yScale(d)).attr('y2',d=>yScale(d))
    .attr('stroke','#12122a').attr('stroke-width',1);

  g.append('g').attr('transform',`translate(0,${h})`)
    .call(d3.axisBottom(xScale).ticks(Math.min(6, w/100)).tickFormat(d3.timeFormat('%m-%d %H:%M')))
    .selectAll('text').attr('fill','#4a4a7a').attr('font-size','0.62rem').attr('transform','rotate(-30)').style('text-anchor','end');

  g.append('g').call(d3.axisLeft(yScale).tickFormat(d => shortLabel(d, 14)))
    .selectAll('text').attr('fill','#5a5a8a').attr('font-size','0.62rem');

  ['.domain', '.tick line'].forEach(sel => g.selectAll(sel).attr('stroke','#2a2a4a'));

  const tooltip = document.getElementById('tooltip');
  filtered.forEach(d => {
    if (d._id !== selectedEventId) return;
    const x = xScale(parseTime(d.timestamp)), y = yScale(d.node_id), r = bubbleRadius(d), col = bubbleColor(d);
    for (let ring = 0; ring < 3; ring++) {
      g.append('circle').attr('cx',x).attr('cy',y).attr('r',r).attr('fill','none')
        .attr('stroke',col).attr('stroke-width',1.5).attr('opacity',0.6)
        .style('animation',`pulse-ring ${1.5+ring*0.4}s ease-out ${ring*0.4}s infinite`);
    }
  });

  g.selectAll('.bubble').data(filtered).join('circle').attr('class','bubble')
    .attr('cx', d => xScale(parseTime(d.timestamp)))
    .attr('cy', d => yScale(d.node_id))
    .attr('r', d => bubbleRadius(d))
    .attr('fill', d => bubbleColor(d))
    .attr('fill-opacity', d => d._id === selectedEventId ? 0.9 : 0.55)
    .attr('stroke', d => bubbleColor(d)).attr('stroke-width', d => d._id === selectedEventId ? 2 : 1).attr('stroke-opacity', 0.8)
    .style('cursor','pointer')
    .style('filter', d => `drop-shadow(0 0 ${bubbleRadius(d)*0.5}px ${bubbleColor(d)}88)`)
    .on('mouseenter', function(evt, d) {
      d3.select(this).attr('fill-opacity',0.9).attr('r', bubbleRadius(d)*1.2);
      tooltip.style.display = 'block';
      tooltip.innerHTML = `<div class="tt-node">${d.label||d.node_id}</div><div>\ud83d\udd50 ${fmtFull(d.timestamp)}</div><div>\ud83d\udd25 Heat: <b style="color:#f97316">${(d.heat_score||0).toFixed(3)}</b></div><div>\u26a1 Boost: <b style="color:#38bdf8">${(d.insight_resonance_boost||0).toFixed(3)}</b></div><div>\u25c8 Intensity: <b style="color:#e879f9">${(d.combined_intensity||0).toFixed(3)}</b></div>`;
    })
    .on('mousemove', evt => { tooltip.style.left=(evt.clientX+14)+'px'; tooltip.style.top=(evt.clientY-10)+'px'; })
    .on('mouseleave', function(evt, d) {
      d3.select(this).attr('fill-opacity', d._id===selectedEventId?0.9:0.55).attr('r', bubbleRadius(d));
      tooltip.style.display = 'none';
    })
    .on('click', function(evt, d) {
      selectedEventId = d._id;
      renderTimeline();
      renderDetail(filtered.filter(e => e.node_id === d.node_id));
    });

  if (filtered.length > 1) {
    const tData = filtered.slice(0, 50).reverse();
    const maxI = Math.max(...tData.map(e=>e.combined_intensity||0), 0.1);
    const barH = Math.min(60, h*0.3), barX = w+10, barW = Math.min(20, 3*tData.length);
    const barG = g.append('g').attr('transform',`translate(${barX},${h-barH-4})`);
    barG.append('text').attr('x',0).attr('y',-4).attr('fill','#3a3a6a').attr('font-size','0.6rem').text('Intensity \u2191');
    tData.forEach((e,i) => {
      const bh = (e.combined_intensity||0.01)/maxI*barH;
      barG.append('rect').attr('x',(i/tData.length)*barW).attr('y',barH-bh)
        .attr('width',Math.max(1,barW/tData.length-0.5)).attr('height',bh)
        .attr('fill',bubbleColor(e)).attr('opacity',0.7);
    });
  }
}

async function showEmptyState() {
  const heatData = await loadHeatmap();
  const hint = document.getElementById('candidate-hint');
  if (!heatData) { hint.textContent = '\u5185\u5b58\u670d\u52a1\u5668\u672a\u8fd0\u884c\uff0c\u65e0\u6cd5\u83b7\u53d6\u5019\u9009\u8282\u70b9\u3002'; return; }
  const topHeat = (heatData.top_nodes || []).slice(0, 5);
  const dualNodes = heatData.dual_resonance_nodes || [];
  if (dualNodes.length) {
    hint.innerHTML = `<b style="color:#e879f9">\u26a1 ${dualNodes.length} \u4e2a\u53cc\u91cd\u5171\u9e23\u5019\u9009</b>\uff0c\u7b49\u5f85\u88ab\u8bb0\u5f55\uff1a<br>${dualNodes.slice(0,3).map(n=>`<span style="color:#c084fc">${shortLabel(n.label||n.id, 20)}</span>`).join(' \xb7 ')}<br><br><span style="color:#3a3a6a;font-size:0.65rem">\u7b49\u5f85 dual_resonance_alert.py \u8fd0\u884c\u540e\u81ea\u52a8\u6ce8\u5165</span>`;
  } else if (topHeat.length) {
    hint.innerHTML = `\u5f53\u524d\u70ed\u56fe Top \u8282\u70b9\uff08\u5c1a\u672a\u8fbe\u5230\u53cc\u91cd\u5171\u9e23\u9598\u5024\uff09\uff1a<br>${topHeat.map(n=>`<span style="color:#f97316">${shortLabel(n.label||n.id,18)}</span> <span style="color:#3a3a6a">heat=${n.score?.toFixed(2)}</span>`).join('<br>')}<br><br><span style="color:#2a2a5a;font-size:0.65rem">\u9700\u540c\u65f6\u6ee1\u8db3 heat \u2265 0.4 \u4e14 insight_resonance_boost > 0</span>`;
  } else {
    hint.innerHTML = '\u7cfb\u7edf\u5c1a\u65e0\u70ed\u56fe\u6570\u636e\u3002\u8fd0\u884c dual_resonance_alert.py \u89e6\u53d1\u9996\u6b21\u4e8b\u4ef6\u3002';
  }
}

async function render() {
  await loadData();
  updateStats();
  renderSidebar();
  if (!allEvents.length) {
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('timeline-svg').style.display = 'none';
    showEmptyState();
  } else {
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('timeline-svg').style.display = 'block';
    renderTimeline();
    renderDetail(allEvents.slice(0, 10));
  }
}

let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderTimeline, 200); });
render();
setInterval(render, REFRESH_MS);
