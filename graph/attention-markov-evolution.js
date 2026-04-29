const API = 'http://127.0.0.1:5097';
const colors = {
  ATTRACTOR: '#38bdf8', TRIAD: '#c084fc', DIFFUSE: '#f59e0b',
  FLOWING: '#34d399', COLD_START: '#64748b'
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function el(id) { return document.getElementById(id); }

function renderSummary(data) {
  el('s-days').textContent = data.total_days || 0;
  el('s-pattern').textContent = data.current_pattern || '—';
  el('s-pattern').style.color = colors[data.current_pattern] || '#e0f2fe';
  el('s-switches').textContent = data.pattern_switches || 0;
  el('s-attractors').textContent = data.attractor_switches || 0;
  el('trend-line').textContent = `entropy ${data.entropy_trend || '—'} · concentration ${data.concentration_trend || '—'}`;
  el('summary').innerHTML = [
    `Current attractor: <span style="color:#7dd3fc">${data.current_attractor || '—'}</span>`,
    `Active days: ${data.active_days || 0}`,
    `Pattern mix: ${Object.entries(data.pattern_counts || {}).map(([k,v]) => `${k}×${v}`).join(' / ') || '—'}`,
  ].join('<br>');
}

function renderTrendChart(timeline) {
  const svg = el('trend-chart');
  if (!timeline.length) { svg.innerHTML = ''; return; }
  const W = 760, H = 240, M = 26;
  const active = timeline.filter(d => d.pattern !== 'COLD_START');
  const ent = active.map(d => d.avg_entropy || 0);
  const conc = active.map(d => d.top_share || 0);
  const maxEnt = Math.max(1, ...ent);
  const maxConc = Math.max(0.2, ...conc);
  const pts = (arr, max) => arr.map((v, i) => {
    const x = M + (active.length <= 1 ? 0 : (W - 2 * M) * i / (active.length - 1));
    const y = H - M - ((H - 2 * M) * v / max);
    return [x, y];
  });
  const line = (pairs) => pairs.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const entPts = pts(ent, maxEnt), concPts = pts(conc, maxConc);
  svg.innerHTML = `
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"></rect>
    <line x1="${M}" y1="${H-M}" x2="${W-M}" y2="${H-M}" stroke="rgba(255,255,255,.15)" />
    <line x1="${M}" y1="${M}" x2="${M}" y2="${H-M}" stroke="rgba(255,255,255,.15)" />
    <path d="${line(entPts)}" fill="none" stroke="#38bdf8" stroke-width="3" />
    <path d="${line(concPts)}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="6 4" />
    ${entPts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#38bdf8" />`).join('')}
    ${concPts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#f59e0b" />`).join('')}
    ${active.map((d, i) => {
      const x = entPts[i][0];
      return `<text x="${x}" y="${H-8}" font-size="10" text-anchor="middle" fill="rgba(220,240,255,.45)">${d.date.slice(5)}</text>`;
    }).join('')}`;
}

function renderTimeline(timeline, onPick) {
  const html = timeline.slice().reverse().map(d => `
    <div class="day" data-date="${d.date}">
      <div class="row">
        <strong style="color:${d.color || colors[d.pattern] || '#e0f2fe'}">${d.pattern}</strong>
        <span class="pill" style="border-color:${d.color || '#334155'}55;color:${d.color || '#94a3b8'}">${d.date}</span>
      </div>
      <div class="mini">⚓ ${d.attractor || '—'} · H=${(d.avg_entropy || 0).toFixed(2)} · C=${Math.round((d.top_share || 0) * 100)}%</div>
    </div>`).join('');
  el('timeline').innerHTML = html;
  el('days').innerHTML = html;
  document.querySelectorAll('.day').forEach(node => {
    node.onclick = () => {
      document.querySelectorAll('.day').forEach(n => n.classList.remove('active'));
      document.querySelectorAll(`.day[data-date="${node.dataset.date}"]`).forEach(n => n.classList.add('active'));
      onPick(node.dataset.date);
    };
  });
}

function renderDetail(d) {
  const topFlows = (d.top_flows || []).slice(0, 5).map(f => `→ ${f.source} → ${f.target} (${Math.round((f.probability || 0) * 100)}%)`).join('<br>') || '—';
  const topStat = (d.top_stationary || []).map(s => `${s.node} ${Math.round((s.weight || 0) * 100)}%`).join(' / ') || '—';
  const selfLoop = (d.self_loop_focus || []).map(s => `${s.node} ${Math.round((s.probability || 0) * 100)}%`).join(' / ') || '—';
  el('detail').innerHTML = `
    <div class="card">
      <div class="row"><strong style="color:${colors[d.flow_pattern?.type] || '#e0f2fe'}">${d.date}</strong><span class="pill">${d.flow_pattern?.type || d.status}</span></div>
      <div class="mini" style="margin-top:8px;">${d.flow_pattern?.description || '—'}</div>
    </div>
    <div class="card" style="margin-top:10px;">
      <div class="mini">Snapshots: ${d.snapshot_count || 0}</div>
      <div class="mini">Unique nodes: ${d.unique_nodes || 0}</div>
      <div class="mini">Transitions: ${d.total_transitions || 0}</div>
      <div class="mini">Avg entropy: ${(d.avg_entropy || 0).toFixed(4)}</div>
      <div class="mini">Top share: ${Math.round((d.top_share || 0) * 100)}%</div>
    </div>
    <div class="card" style="margin-top:10px;"><strong>Stationary</strong><div class="mini" style="margin-top:6px;">${topStat}</div></div>
    <div class="card" style="margin-top:10px;"><strong>Top Flows</strong><div class="mini" style="margin-top:6px;">${topFlows}</div></div>
    <div class="card" style="margin-top:10px;"><strong>Self Loops</strong><div class="mini" style="margin-top:6px;">${selfLoop}</div></div>`;
}

async function load(date) {
  const data = await fetchJson(`${API}/attention-markov-evolution`);
  renderSummary(data);
  renderTrendChart(data.timeline || []);
  renderTimeline(data.recent_records || data.timeline || [], async picked => {
    const detail = await fetchJson(`${API}/attention-markov-history/${picked}`);
    renderDetail(detail);
  });
  const first = date || (data.recent_records?.[data.recent_records.length - 1]?.date) || (data.timeline?.[0]?.date);
  if (first) renderDetail(await fetchJson(`${API}/attention-markov-history/${first}`));
}

load().catch(err => {
  el('summary').textContent = `API unavailable: ${err.message}`;
  console.error(err);
});
