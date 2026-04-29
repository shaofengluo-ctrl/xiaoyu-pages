const API = 'http://127.0.0.1:5097';
const FEATS = ['frequency','anchor','drift','topology','recency','markov','habitual','regime'];
const PERSONAS = ['DEEP_DIVER','STEADY_EXPLORER','CURIOUS_WANDERER','QUANTUM_LEAPER'];
const COLORS = ['#60a5fa','#f59e0b','#34d399','#f472b6','#f87171','#22d3ee','#a78bfa','#fde047'];
const labelMap = {
  frequency:'FREQ',anchor:'ANCHOR',drift:'DRIFT',topology:'TOPO',recency:'RECENCY',markov:'MARKOV',habitual:'HABIT',regime:'REGIME',
  DEEP_DIVER:'DEEP DIVER',STEADY_EXPLORER:'STEADY EXPLORER',CURIOUS_WANDERER:'CURIOUS WANDERER',QUANTUM_LEAPER:'QUANTUM LEAPER'
};

const featureChart = echarts.init(document.getElementById('feature-chart'), 'dark');
const weightChart = echarts.init(document.getElementById('weight-chart'), 'dark');
const personaChart = echarts.init(document.getElementById('persona-chart'), 'dark');
const migrationChart = echarts.init(document.getElementById('migration-chart'), 'dark');
const regimeChart = echarts.init(document.getElementById('regime-chart'), 'dark');
const alertChart = echarts.init(document.getElementById('alert-chart'), 'dark');
const accuracyChart = echarts.init(document.getElementById('accuracy-chart'), 'dark');

function statCard(k, v, color = '#e9d5ff') {
  return `<div class="card"><div class="k">${k}</div><div class="v" style="color:${color}">${v}</div></div>`;
}

function lineOption(title, dates, series) {
  return {
    backgroundColor: 'transparent',
    animationDuration: 400,
    title: {text: title, left: 4, top: 0, textStyle: {color: '#94a3b8', fontSize: 12}},
    tooltip: {trigger: 'axis'},
    legend: {top: 24, textStyle: {color: '#94a3b8', fontSize: 10}},
    grid: {left: 44, right: 16, top: 56, bottom: 32},
    xAxis: {type: 'category', data: dates, axisLabel: {color: '#64748b'}},
    yAxis: {type: 'value', axisLabel: {color: '#64748b'}, splitLine: {lineStyle: {color: 'rgba(148,163,184,.08)'}}},
    series,
  };
}

function multiSeries(rows, keys) {
  return keys.map((key, idx) => ({
    name: labelMap[key] || key,
    type: 'line',
    smooth: true,
    symbolSize: 7,
    data: rows.map(r => Number(r[key] || 0)),
    lineStyle: {width: 2, color: COLORS[idx % COLORS.length]},
    itemStyle: {color: COLORS[idx % COLORS.length]},
  }));
}

function renderStats(data) {
  const cur = data.current || {};
  const reg = cur.regime || {};
  const personaCtx = cur.persona_context || {};
  const sum = data.summary || {};
  const acc = data.accuracy_summary || {};
  document.getElementById('stats').innerHTML = [
    statCard('TOTAL DAYS', data.total_days || 0, '#c4b5fd'),
    statCard('PERSONA', sum.latest_persona || '—', '#f5d0fe'),
    statCard('BASE PERSONA', sum.latest_base_persona || '—', '#d8b4fe'),
    statCard('PERSONA MODE', sum.latest_persona_mode || '—', '#93c5fd'),
    statCard('PERSONA CONF', sum.latest_persona_confidence || '—', '#a5b4fc'),
    statCard('MIGRATION', sum.latest_migration_state || 'LOCKED_BASE', sum.latest_migration_state === 'MIGRATED' ? '#4ade80' : sum.latest_migration_state === 'HOLDING_MIGRATED' ? '#f59e0b' : sum.latest_migration_state === 'REVERTED' ? '#f87171' : '#a5b4fc'),
    statCard('CANDIDATE', sum.latest_candidate_persona || '—', '#e9d5ff'),
    statCard('CAND MARGIN', (sum.latest_candidate_margin || 0).toFixed(4), '#ddd6fe'),
    statCard('MIGRATED D', sum.migrated_days || 0, '#86efac'),
    statCard('HOLDING D', sum.holding_days || 0, '#fde68a'),
    statCard('REVERTED D', sum.reverted_days || 0, '#fca5a5'),
    statCard('LOCKED D', sum.locked_days || 0, '#cbd5e1'),
    statCard('PATTERN', sum.latest_pattern || '—', '#7dd3fc'),
    statCard('PATTERN SCOPE', sum.latest_pattern_scope || '—', '#67e8f9'),
    statCard('REGIME ALERTS', sum.total_alerts || 0, '#fda4af'),
    statCard('NEW ALERTS', sum.new_alerts || 0, '#fb7185'),
    statCard('LATEST PRECISION', `${((sum.latest_precision || 0) * 100).toFixed(1)}%`, '#4ade80'),
    statCard('VALIDATIONS', sum.validation_count || 0, '#86efac'),
    statCard('ALERT DAYS', sum.high_alert_days || 0, '#fca5a5'),
    statCard('DIVERGENT DAYS', sum.divergent_days || 0, '#fb7185'),
    statCard('ADJUSTMENTS', sum.adjustment_count || 0, '#f59e0b'),
    statCard('AVG SIGNAL', (sum.avg_signal || 0).toFixed(3), '#38bdf8'),
    statCard('ACC TREND', acc.trend || 'STABLE', '#fde68a'),
  ].join('');
  document.getElementById('current').innerHTML = `
    <strong style="color:#c4b5fd">CURRENT SNAPSHOT</strong><br>
    日期: ${cur.date || '—'}<br>
    persona: <span style="color:#f5d0fe">${cur.persona || '—'}</span><br>
    base persona: <span style="color:#c084fc">${personaCtx.base_persona || cur.persona || '—'}</span><br>
    mode: <span style="color:#93c5fd">${personaCtx.selection_mode || 'continuity_fallback'}</span> · confidence ${personaCtx.confidence || 'LOW'}<br>
    evidence: ${personaCtx.evidence_count || 0} · margin vs base ${(personaCtx.margin_vs_base || 0).toFixed(4)} · avg precision ${((personaCtx.avg_precision || 0) * 100).toFixed(1)}%<br>
    migration: <span style="color:${personaCtx.migration_state === 'MIGRATED' ? '#4ade80' : personaCtx.migration_state === 'HOLDING_MIGRATED' ? '#f59e0b' : personaCtx.migration_state === 'REVERTED' ? '#f87171' : '#a5b4fc'}">${personaCtx.migration_state || 'LOCKED_BASE'}</span> · candidate <span style="color:#e9d5ff">${personaCtx.candidate_persona || '—'}</span> (margin ${(personaCtx.candidate_margin_vs_base || 0).toFixed(4)})<br>
    policy: enter≥${(personaCtx.migration_policy?.enter_margin_threshold || 0.08).toFixed(2)} · hold≥${(personaCtx.migration_policy?.hold_margin_threshold || 0.04).toFixed(2)} · validations≥${personaCtx.migration_policy?.min_validations_for_migration || 3} · precision≥${(personaCtx.migration_policy?.precision_floor || 0.5).toFixed(2)}<br>
    prediction: <span style="color:#c4b5fd">${cur.prediction_type || '—'}</span><br>
    top leader: <span style="color:#7dd3fc">${cur.leader?.node_id || '—'}</span> (${(cur.leader?.score || 0).toFixed(3)})<br>
    regime: <span style="color:#38bdf8">${reg.pattern || '—'}</span> · attractor ${reg.attractor || '—'}<br>
    baseline: <span style="color:#67e8f9">${reg.baseline_pattern || reg.pattern || '—'}</span> · scope ${reg.pattern_scope || 'global_markov'}<br>
    season: <span style="color:#86efac">${reg.season || '—'}</span> · signal ${(reg.signal_strength || 0).toFixed(3)}
  `;
  document.getElementById('status').innerHTML = `
    <strong style="color:#a7f3d0">PIPELINE STATUS</strong><br>
    generated: ${data.generated_at || '—'}<br>
    accuracy evals: ${acc.total_evaluations || 0}, recent5 ${(acc.recent_5_avg || 0).toFixed(3)}<br>
    validation trend: ${(data.validation_summary || {}).trend || 'no_data'}<br>
    regime bias: season× ${(reg.season_modifier || 0).toFixed(3)}, trend ${(reg.trend_bias || 0).toFixed(3)}, stability ${(reg.stability || 0).toFixed(3)}<br>
    refresh: ${data.refresh?.written ? `archived ${data.refresh.date}` : `no new archive (${data.refresh?.date || '—'})`}<br>
    source: ${data._source || 'unknown'}
  `;
}

function renderCharts(data) {
  const features = data.feature_timeline || [];
  const weights = data.weight_timeline || [];
  const personas = data.persona_score_timeline || [];
  const regimes = data.regime_timeline || [];
  const acc = data.accuracy_history || [];
  const alerts = (data.regime_alerts || {}).timeline || [];
  featureChart.setOption(lineOption('8-source average contribution in top predictions', features.map(r => r.date), multiSeries(features, FEATS)));
  weightChart.setOption(lineOption('persona/validator weight curves', weights.map(r => r.date), multiSeries(weights, FEATS)));
  const migrationMarks = personas.filter(r => r.migration_state && r.migration_state !== 'LOCKED_BASE').map(r => ({
    xAxis: r.date,
    label: {formatter: r.migration_state === 'MIGRATED' ? '⚡' : r.migration_state === 'HOLDING_MIGRATED' ? '⏳' : r.migration_state === 'REVERTED' ? '↩' : '🔒', color: '#e2e8f0'},
    lineStyle: {color: r.migration_state === 'MIGRATED' ? '#4ade80' : r.migration_state === 'REVERTED' ? '#f87171' : '#f59e0b', type: 'dashed'},
  }));
  const personaSeries = multiSeries(personas, PERSONAS).map(series => ({
    ...series,
    smooth: false,
    lineStyle: {...series.lineStyle, width: 3},
    areaStyle: {opacity: 0.06},
  }));
  if (migrationMarks.length && personaSeries.length) {
    personaSeries[0].markLine = {silent: true, symbol: 'none', data: migrationMarks};
  }
  personaChart.setOption(lineOption('adaptive persona scores by day', personas.map(r => r.date), personaSeries));
  // --- Migration State Timeline (Phase 154) ---
  const MIG_STATES = ['LOCKED_BASE','MIGRATED','HOLDING_MIGRATED','REVERTED'];
  const MIG_COLORS = {LOCKED_BASE:'#94a3b8', MIGRATED:'#4ade80', HOLDING_MIGRATED:'#f59e0b', REVERTED:'#f87171'};
  const MIG_LABELS = {LOCKED_BASE:'🔒 Locked', MIGRATED:'⚡ Migrated', HOLDING_MIGRATED:'⏳ Holding', REVERTED:'↩ Reverted'};
  const migDates = personas.map(r => r.date);
  const migStateNumeric = personas.map(r => MIG_STATES.indexOf(r.migration_state || 'LOCKED_BASE'));
  const migMarginData = personas.map(r => Number(r.candidate_margin_vs_base || 0));
  const migEvidenceData = personas.map(r => Number(r.evidence_count || 0));
  const migStateColorData = personas.map(r => MIG_COLORS[r.migration_state || 'LOCKED_BASE'] || '#94a3b8');
  migrationChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 400,
    title: {text: 'persona migration state + candidate margin + evidence accumulation', left: 4, top: 0, textStyle: {color: '#94a3b8', fontSize: 12}},
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const idx = params[0].dataIndex;
        const state = MIG_LABELS[personas[idx]?.migration_state || 'LOCKED_BASE'] || personas[idx]?.migration_state;
        const cand = personas[idx]?.candidate_persona || '—';
        const margin = (personas[idx]?.candidate_margin_vs_base || 0).toFixed(4);
        const ev = personas[idx]?.evidence_count || 0;
        return `<b>${params[0].axisValue}</b><br/>State: ${state}<br/>Candidate: ${cand}<br/>Margin: ${margin}<br/>Evidence: ${ev}`;
      }
    },
    legend: {top: 24, textStyle: {color: '#94a3b8', fontSize: 10}, data: ['MARGIN','EVIDENCE','STATE']},
    grid: {left: 44, right: 44, top: 56, bottom: 32},
    xAxis: {type: 'category', data: migDates, axisLabel: {color: '#64748b'}},
    yAxis: [
      {type: 'value', name: 'margin', nameTextStyle: {color: '#64748b'}, axisLabel: {color: '#64748b'}, splitLine: {lineStyle: {color: 'rgba(148,163,184,.08)'}}},
      {type: 'value', name: 'evidence', nameTextStyle: {color: '#64748b'}, axisLabel: {color: '#64748b'}, splitLine: {show: false}},
    ],
    series: [
      {
        name: 'MARGIN',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: migMarginData,
        lineStyle: {width: 3, color: '#c084fc'},
        itemStyle: {color: '#c084fc'},
        areaStyle: {opacity: 0.08, color: '#c084fc'},
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {yAxis: 0.08, lineStyle: {color: '#4ade80', type: 'dashed', width: 1}, label: {formatter: 'ENTER ≥ 0.08', color: '#4ade80', fontSize: 10}},
            {yAxis: 0.04, lineStyle: {color: '#f59e0b', type: 'dotted', width: 1}, label: {formatter: 'HOLD ≥ 0.04', color: '#f59e0b', fontSize: 10}},
          ]
        }
      },
      {
        name: 'EVIDENCE',
        type: 'bar',
        yAxisIndex: 1,
        data: migEvidenceData,
        itemStyle: {color: 'rgba(96,165,250,0.4)', borderColor: '#60a5fa', borderWidth: 1},
        barMaxWidth: 24,
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {yAxis: 3, lineStyle: {color: '#86efac', type: 'dashed', width: 1}, label: {formatter: 'MIN_VAL ≥ 3', color: '#86efac', fontSize: 10, position: 'end'}},
          ]
        }
      },
      {
        name: 'STATE',
        type: 'scatter',
        symbolSize: 14,
        data: migStateNumeric.map((v, i) => ({value: migMarginData[i], itemStyle: {color: migStateColorData[i]}})),
        tooltip: {show: false},
      },
    ],
  });
  regimeChart.setOption(lineOption('signal / season modifier / trend bias / stability', regimes.map(r => r.date), [
    {name:'SIGNAL', type:'line', smooth:true, data: regimes.map(r => Number(r.signal_strength || 0)), lineStyle:{width:3,color:'#38bdf8'}, itemStyle:{color:'#38bdf8'}},
    {name:'SEASON_MOD', type:'line', smooth:true, data: regimes.map(r => Number(r.season_modifier || 0)), lineStyle:{width:2,color:'#86efac'}, itemStyle:{color:'#86efac'}},
    {name:'TREND_BIAS', type:'line', smooth:true, data: regimes.map(r => Number(r.trend_bias || 0)), lineStyle:{width:2,color:'#f59e0b'}, itemStyle:{color:'#f59e0b'}},
    {name:'STABILITY', type:'line', smooth:true, data: regimes.map(r => Number(r.stability || 0)), lineStyle:{width:2,color:'#c084fc'}, itemStyle:{color:'#c084fc'}},
  ]));
  const patternScopeBox = document.getElementById('status');
  if (regimes.length) {
    const latest = regimes[regimes.length - 1];
    patternScopeBox.innerHTML += `<br>pattern scope: ${(latest.pattern_scope || 'global_markov')} · baseline ${(latest.baseline_pattern || latest.pattern || '—')}`;
  }
  accuracyChart.setOption(lineOption('precision / recall evaluation history', acc.map(r => (r.prediction_time || '').slice(5, 16)), [
    {name:'PRECISION', type:'line', smooth:true, data: acc.map(r => Number(r.precision || 0)), lineStyle:{width:3,color:'#4ade80'}, itemStyle:{color:'#4ade80'}},
    {name:'RECALL', type:'line', smooth:true, data: acc.map(r => Number(r.recall || 0)), lineStyle:{width:2,color:'#60a5fa'}, itemStyle:{color:'#60a5fa'}},
  ]));
  alertChart.setOption({
    backgroundColor: 'transparent',
    animationDuration: 400,
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
    legend: {top: 4, textStyle: {color: '#94a3b8', fontSize: 10}},
    grid: {left: 44, right: 16, top: 36, bottom: 32},
    xAxis: {type: 'category', data: alerts.map(r => r.date), axisLabel: {color: '#64748b'}},
    yAxis: {type: 'value', axisLabel: {color: '#64748b'}, splitLine: {lineStyle: {color: 'rgba(148,163,184,.08)'}}},
    series: [
      {name:'HIGH', type:'bar', stack:'alerts', data: alerts.map(r => Number(r.high || 0)), itemStyle:{color:'#ef4444'}},
      {name:'MODERATE', type:'bar', stack:'alerts', data: alerts.map(r => Number(r.moderate || 0)), itemStyle:{color:'#f59e0b'}},
      {name:'LOW', type:'bar', stack:'alerts', data: alerts.map(r => Number(r.low || 0)), itemStyle:{color:'#60a5fa'}},
    ],
  });
}

function renderAdjustments(data) {
  const box = document.getElementById('adjustments');
  const items = data.weight_adjustments || [];
  if (!items.length) {
    box.innerHTML = '<div class="item" style="color:#64748b">No weight adjustments yet — validator still accumulating evidence.</div>';
    return;
  }
  box.innerHTML = items.slice().reverse().map(item => {
    const before = item.before || {};
    const after = item.after || {};
    const deltas = FEATS.map(k => {
      const d = Number((after[k] || 0) - (before[k] || 0));
      if (Math.abs(d) < 0.0001) return null;
      const color = d > 0 ? '#4ade80' : '#f87171';
      const sign = d > 0 ? '+' : '';
      return `<span style="color:${color}">${labelMap[k]} ${sign}${d.toFixed(3)}</span>`;
    }).filter(Boolean).join(' · ');
    return `<div class="item"><div style="color:#fde68a">${item.date} · ${item.reason}</div><div style="color:#94a3b8;margin:4px 0">${item.trigger}</div><div>${deltas || '<span style="color:#64748b">no delta</span>'}</div></div>`;
  }).join('');
}

function renderAlerts(data) {
  const box = document.getElementById('alerts');
  const cur = (data.regime_alerts || {}).current_state || {};
  const items = ((data.regime_alerts || {}).recent_history || []).slice().reverse();
  if (!items.length) {
    box.innerHTML = `<div class="item" style="color:#64748b">No regime alerts yet — current ${cur.pattern || '—'} / attractor ${cur.attractor || '—'} / signal ${(cur.signal_strength || 0).toFixed(3)}</div>`;
    return;
  }
  const colors = {HIGH:'#f87171', MODERATE:'#f59e0b', LOW:'#60a5fa'};
  box.innerHTML = items.map(item => {
    const detail = item.detail || {};
    const extra = detail.from_pattern && detail.to_pattern
      ? `${detail.from_pattern} → ${detail.to_pattern}`
      : detail.from_direction && detail.to_direction
        ? `${detail.from_direction} → ${detail.to_direction}`
        : detail.previous_signal !== undefined && detail.current_signal !== undefined
          ? `${Number(detail.previous_signal).toFixed(2)} → ${Number(detail.current_signal).toFixed(2)}`
          : (detail.pattern || cur.pattern || '—');
    return `<div class="item"><div style="color:${colors[item.severity] || '#cbd5e1'}">${item.date} · ${item.type}</div><div style="margin:4px 0;color:#e2e8f0">${item.message}</div><div style="color:#64748b">${extra}</div></div>`;
  }).join('');
}

async function load() {
  try {
    let data;
    try {
      const res = await fetch(`${API}/attention-prediction-dashboard`);
      if (!res.ok) throw new Error(`api ${res.status}`);
      data = await res.json();
      data._source = 'live-api';
    } catch (_) {
      const res = await fetch('../assets/data/attention_prediction_dashboard.json');
      data = await res.json();
      data._source = 'static-fallback';
    }
    if (data.status === 'no_data') {
      document.getElementById('status').innerHTML = 'No dashboard data yet. Run predictive_attention.py first.';
      return;
    }
    renderStats(data);
    renderCharts(data);
    renderAdjustments(data);
    renderAlerts(data);
  } catch (err) {
    document.getElementById('status').innerHTML = 'Dashboard data unavailable (API + static fallback both failed)';
    console.warn('attention-prediction-dashboard load failed', err);
  }
}

window.addEventListener('resize', () => [featureChart, weightChart, personaChart, migrationChart, regimeChart, alertChart, accuracyChart].forEach(c => c.resize()));
load();
setInterval(load, 120000);
