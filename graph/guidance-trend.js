/* guidance-trend.js — Phase 166-A Guidance Trend Dashboard */
(async function () {
  const API = 'http://localhost:5097';
  const STRAT_COLORS = {
    EXPLORE: '#34d399', DEEPEN: '#60a5fa',
    CONSOLIDATE: '#fbbf24', REST: '#a78bfa', UNKNOWN: '#64748b'
  };
  const STRAT_ICONS = {
    EXPLORE: '🔭', DEEPEN: '🔬', CONSOLIDATE: '🔗', REST: '🌙'
  };
  const DIM_COLORS = {
    focus: '#34d399', avoid: '#f87171', explore: '#60a5fa', alignment: '#a78bfa'
  };
  const WEIGHT_KEYS = ['regime', 'accuracy', 'weather', 'season', 'homeostasis', 'drift'];
  const WEIGHT_COLORS = {
    regime: '#f87171', accuracy: '#34d399', weather: '#60a5fa',
    season: '#fbbf24', homeostasis: '#a78bfa', drift: '#fb923c'
  };

  let D;
  try {
    const r = await fetch(API + '/guidance-trend');
    D = await r.json();
  } catch (e) {
    document.querySelector('.wrap').innerHTML =
      '<div style="text-align:center;padding:60px;color:#f87171">' +
      '<div style="font-size:48px">🧭</div>' +
      '<h2>Cannot reach memory-server</h2>' +
      '<p>Start memory_server.py on port 5097, then reload.</p></div>';
    return;
  }

  const S = D.summary || {};
  const range = D.data_range || {};
  const stl = D.strategy_timeline || [];
  const atl = D.accuracy_timeline || [];
  const wevo = D.weight_evolution || [];
  const wadj = D.weight_adjustments || [];
  const corr = D.context_correlations || {};
  const dist = D.strategy_distribution || {};

  function renderStats() {
    const cards = [
      { k: 'CURRENT STRATEGY', v: (STRAT_ICONS[S.current_strategy] || '?') + ' ' + (S.current_strategy || '-') },
      { k: 'DOMINANT', v: S.dominant_strategy || '-' },
      { k: 'AVG ACCURACY', v: S.avg_accuracy != null ? S.avg_accuracy : '-' },
      { k: 'LATEST ACCURACY', v: S.latest_accuracy != null ? S.latest_accuracy : '-' },
      { k: 'GUIDANCE DAYS', v: range.total_guidance_days || 0 },
      { k: 'ACCURACY EVALS', v: range.total_accuracy_evals || 0 },
      { k: 'WEIGHT ADJUSTMENTS', v: S.weight_adjustments_count || 0 },
      { k: 'WEIGHTS SOURCE', v: S.weights_source || 'default' },
    ];
    document.getElementById('stats').innerHTML = cards.map(c =>
      '<div class="card"><div class="k">' + c.k + '</div><div class="v">' + c.v + '</div></div>'
    ).join('');
  }

  function renderCurrent() {
    if (!stl.length) {
      document.getElementById('current').innerHTML = '<div style="color:#64748b">No guidance data yet</div>';
      return;
    }
    const latest = stl[stl.length - 1];
    const icon = STRAT_ICONS[latest.strategy] || '?';
    let html = '<div style="text-align:center;margin-bottom:12px">' +
      '<span class="strat-icon">' + icon + '</span>' +
      '<div style="font-size:18px;color:' + (STRAT_COLORS[latest.strategy] || '#fff') + ';margin-top:6px">' +
      latest.strategy + '</div></div>';
    html += '<div style="font-size:11px;color:#94a3b8">';
    html += 'Confidence: ' + latest.confidence + ' | Margin: ' + latest.margin + '<br>';
    html += 'Focus: ' + latest.focus_count + ' | Avoid: ' + latest.avoid_count + '<br>';
    html += 'Budget: ' + latest.exploration_budget + '/10<br>';
    html += 'Regime: ' + latest.regime + ' | Persona: ' + latest.persona + '<br>';
    html += 'Season: ' + latest.season + ' | Weather: ' + latest.weather + '<br>';
    html += 'Health: ' + latest.health_score + '</div>';
    document.getElementById('current').innerHTML = html;
  }

  function renderDistribution() {
    const pcts = dist.percentages || {};
    const counts = dist.counts || {};
    let html = '<div style="text-align:center;margin-bottom:8px;font-size:11px;color:#64748b">' +
      'STRATEGY DISTRIBUTION (' + (dist.total_days || 0) + ' days)</div>';
    for (const s of ['EXPLORE', 'DEEPEN', 'CONSOLIDATE', 'REST']) {
      const p = pcts[s] || 0;
      const c = counts[s] || 0;
      const col = STRAT_COLORS[s];
      html += '<div style="margin:6px 0">' +
        '<div style="display:flex;justify-content:space-between;font-size:11px">' +
        '<span>' + (STRAT_ICONS[s] || '') + ' ' + s + '</span>' +
        '<span>' + c + 'd (' + p + '%)</span></div>' +
        '<div style="background:#1e293b;border-radius:4px;height:8px;margin-top:3px">' +
        '<div style="background:' + col + ';width:' + Math.min(p, 100) + '%;height:100%;border-radius:4px;transition:width 0.5s"></div>' +
        '</div></div>';
    }
    document.getElementById('distribution').innerHTML = html;
  }

  function renderStrategyChart() {
    if (!stl.length) return;
    const el = document.getElementById('strategy-chart');
    const chart = echarts.init(el);
    const dates = stl.map(d => d.date);
    const stratMap = { EXPLORE: 3, DEEPEN: 2, CONSOLIDATE: 1, REST: 0 };
    const stratData = stl.map(d => ({
      value: stratMap[d.strategy] != null ? stratMap[d.strategy] : -1,
      itemStyle: { color: STRAT_COLORS[d.strategy] || '#64748b' }
    }));
    const confData = stl.map(d => d.confidence);
    const budgetData = stl.map(d => d.exploration_budget);

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0b1120', borderColor: '#334155',
        textStyle: { color: '#dbeafe', fontSize: 11 },
        formatter: function (params) {
          const idx = params[0].dataIndex;
          const d = stl[idx];
          return d.date + '<br>' +
            (STRAT_ICONS[d.strategy] || '') + ' ' + d.strategy +
            ' (conf=' + d.confidence + ')<br>' +
            'Budget: ' + d.exploration_budget + '/10<br>' +
            d.regime + ' / ' + d.weather + ' / ' + d.season;
        }
      },
      legend: { data: ['Strategy', 'Confidence', 'Budget'], textStyle: { color: '#94a3b8', fontSize: 10 }, top: 0 },
      grid: { top: 30, bottom: 20, left: 50, right: 20 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: [
        {
          type: 'value', min: -0.5, max: 3.5,
          axisLabel: {
            color: '#64748b', fontSize: 10,
            formatter: function (v) { return ['REST', 'CONSOLIDATE', 'DEEPEN', 'EXPLORE'][Math.round(v)] || ''; }
          },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,.08)' } }
        },
        {
          type: 'value', min: 0, max: 1,
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      series: [
        { name: 'Strategy', type: 'scatter', data: stratData, symbolSize: 18, yAxisIndex: 0 },
        { name: 'Confidence', type: 'line', data: confData, smooth: true, yAxisIndex: 1, lineStyle: { color: '#fbbf24', width: 1.5 }, itemStyle: { color: '#fbbf24' }, symbol: 'circle', symbolSize: 4 },
        { name: 'Budget', type: 'bar', data: budgetData, yAxisIndex: 1, barWidth: 6, itemStyle: { color: 'rgba(96,165,250,.3)' } },
      ]
    });
    window.addEventListener('resize', () => chart.resize());
  }

  function renderAccuracyChart() {
    if (!atl.length) {
      document.getElementById('accuracy-chart').innerHTML =
        '<div style="text-align:center;padding:80px 0;color:#64748b">No accuracy evaluations yet<br>Data appears after 2+ days of guidance</div>';
      return;
    }
    const el = document.getElementById('accuracy-chart');
    const chart = echarts.init(el);
    const dates = atl.map(d => d.date);

    chart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#0b1120', borderColor: '#334155', textStyle: { color: '#dbeafe', fontSize: 11 } },
      legend: { data: ['Overall', 'Focus', 'Avoid', 'Explore', 'Alignment'], textStyle: { color: '#94a3b8', fontSize: 10 }, top: 0 },
      grid: { top: 30, bottom: 20, left: 40, right: 20 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.08)' } } },
      series: [
        { name: 'Overall', type: 'line', data: atl.map(d => d.overall_score), smooth: true, lineStyle: { color: '#e2e8f0', width: 2.5 }, itemStyle: { color: '#e2e8f0' }, areaStyle: { color: 'rgba(226,232,240,.06)' } },
        { name: 'Focus', type: 'line', data: atl.map(d => d.focus_adherence), smooth: true, lineStyle: { color: DIM_COLORS.focus, width: 1.2 }, itemStyle: { color: DIM_COLORS.focus } },
        { name: 'Avoid', type: 'line', data: atl.map(d => d.avoid_adherence), smooth: true, lineStyle: { color: DIM_COLORS.avoid, width: 1.2 }, itemStyle: { color: DIM_COLORS.avoid } },
        { name: 'Explore', type: 'line', data: atl.map(d => d.exploration_match), smooth: true, lineStyle: { color: DIM_COLORS.explore, width: 1.2 }, itemStyle: { color: DIM_COLORS.explore } },
        { name: 'Alignment', type: 'line', data: atl.map(d => d.strategy_alignment), smooth: true, lineStyle: { color: DIM_COLORS.alignment, width: 1.2 }, itemStyle: { color: DIM_COLORS.alignment } },
      ]
    });
    window.addEventListener('resize', () => chart.resize());
  }

  function renderWeightChart() {
    if (!wevo.length) {
      document.getElementById('weight-chart').innerHTML =
        '<div style="text-align:center;padding:80px 0;color:#64748b">Weight evolution appears after 2+ days</div>';
      return;
    }
    const el = document.getElementById('weight-chart');
    const chart = echarts.init(el);
    const dates = wevo.map(d => d.date);

    chart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#0b1120', borderColor: '#334155', textStyle: { color: '#dbeafe', fontSize: 11 } },
      legend: { data: WEIGHT_KEYS, textStyle: { color: '#94a3b8', fontSize: 10 }, top: 0 },
      grid: { top: 30, bottom: 20, left: 40, right: 20 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: 0.4, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.08)' } } },
      series: WEIGHT_KEYS.map(k => ({
        name: k, type: 'line', data: wevo.map(d => d[k] || 0),
        smooth: true, lineStyle: { color: WEIGHT_COLORS[k], width: 1.5 },
        itemStyle: { color: WEIGHT_COLORS[k] }, areaStyle: { color: WEIGHT_COLORS[k].replace(')', ',.06)').replace('rgb', 'rgba') },
      }))
    });
    window.addEventListener('resize', () => chart.resize());
  }

  function renderBudgetChart() {
    if (!stl.length) return;
    const el = document.getElementById('budget-chart');
    const chart = echarts.init(el);
    chart.setOption({
      tooltip: { trigger: 'axis', backgroundColor: '#0b1120', borderColor: '#334155', textStyle: { color: '#dbeafe', fontSize: 11 } },
      grid: { top: 10, bottom: 20, left: 40, right: 20 },
      xAxis: { type: 'category', data: stl.map(d => d.date), axisLabel: { color: '#64748b', fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: 10, axisLabel: { color: '#64748b', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,.08)' } } },
      series: [{
        type: 'bar', data: stl.map(d => ({
          value: d.exploration_budget,
          itemStyle: { color: STRAT_COLORS[d.strategy] || '#64748b' }
        })),
        barWidth: '60%'
      }]
    });
    window.addEventListener('resize', () => chart.resize());
  }

  function renderCorrelations() {
    const el = document.getElementById('correlations');
    if (corr.insufficient_data) {
      el.innerHTML = '<div class="item" style="color:#64748b">Insufficient data for correlations.<br>Need 2+ days with accuracy evaluations.</div>';
      return;
    }
    let html = '';
    const se = corr.strategy_effectiveness || {};
    if (Object.keys(se).length) {
      html += '<div class="item"><div style="font-size:11px;color:#64748b;margin-bottom:4px">STRATEGY EFFECTIVENESS</div>';
      for (const [s, v] of Object.entries(se)) {
        html += '<div style="display:flex;justify-content:space-between;font-size:12px">' +
          '<span>' + (STRAT_ICONS[s] || '') + ' ' + s + '</span>' +
          '<span style="color:' + (v >= 60 ? '#34d399' : v >= 40 ? '#fbbf24' : '#f87171') + '">' + v + '</span></div>';
      }
      html += '</div>';
    }
    const wi = corr.weather_impact || {};
    if (Object.keys(wi).length) {
      html += '<div class="item"><div style="font-size:11px;color:#64748b;margin-bottom:4px">WEATHER IMPACT</div>';
      for (const [w, v] of Object.entries(wi)) {
        html += '<div style="display:flex;justify-content:space-between;font-size:12px">' +
          '<span>' + w + '</span>' +
          '<span style="color:' + (v >= 60 ? '#34d399' : v >= 40 ? '#fbbf24' : '#f87171') + '">' + v + '</span></div>';
      }
      html += '</div>';
    }
    html += '<div class="item" style="font-size:10px;color:#475569">Based on ' + (corr.data_points || 0) + ' data points</div>';
    el.innerHTML = html;
  }

  function renderAdjustments() {
    const el = document.getElementById('adjustments');
    if (!wadj.length) {
      el.innerHTML = '<div class="item" style="color:#64748b">No weight adjustments yet. Adjustments trigger when avg accuracy &lt; 50 or trend is declining.</div>';
      return;
    }
    el.innerHTML = wadj.slice(-10).reverse().map(a =>
      '<div class="item">' +
      '<div style="font-size:10px;color:#64748b">' + (a.date || a.timestamp || '') + '</div>' +
      '<div style="font-size:12px;margin-top:2px">Trigger: <span style="color:#fbbf24">' + (a.trigger || '-') + '</span></div>' +
      '<div style="font-size:11px;color:#94a3b8">Weakest: ' + (a.weakest_dimension || '-') + '</div>' +
      '</div>'
    ).join('');
  }

  renderStats();
  renderCurrent();
  renderDistribution();
  renderStrategyChart();
  renderAccuracyChart();
  renderWeightChart();
  renderBudgetChart();
  renderCorrelations();
  renderAdjustments();
})();
