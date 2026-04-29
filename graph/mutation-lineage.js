const API = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
    ? 'http://127.0.0.1:5097' : '';
const COLORS = {
    ORIGIN: '#a855f7',
    KEEP: '#34d399',
    REVERT: '#f87171',
    ACTIVE: '#fb923c',
    DEFAULT: '#888',
};
const WEIGHT_COLORS = ['#a855f7','#60a5fa','#34d399','#fb923c','#f87171','#c084fc'];

async function loadData() {
    try {
        const r = await fetch(API + '/mutation-lineage');
        if (!r.ok) throw new Error('API ' + r.status);
        return await r.json();
    } catch (e) {
        try {
            const r2 = await fetch('../assets/data/mutation_lineage.json');
            return await r2.json();
        } catch (e2) {
            return null;
        }
    }
}

function updateStats(stats) {
    document.getElementById('s-gen').textContent = 'G' + (stats.max_generation || 0);
    document.getElementById('s-exp').textContent = stats.total_experiments || 0;
    document.getElementById('s-drift').textContent = stats.total_drift_from_origin ? stats.total_drift_from_origin.toFixed(4) : '0';
    document.getElementById('s-vel').textContent = stats.evolution_velocity ? stats.evolution_velocity.toFixed(4) : '0';
}

function buildWeightBar(weights) {
    if (!weights || Object.keys(weights).length === 0) return '';
    var keys = Object.keys(weights).sort();
    var html = '<div class="weight-bar">';
    keys.forEach(function(k, i) {
        var pct = (weights[k] * 100).toFixed(1);
        html += '<div style="width:' + pct + '%;background:' + WEIGHT_COLORS[i % WEIGHT_COLORS.length] + '" title="' + k + ': ' + pct + '%"></div>';
    });
    html += '</div>';
    html += '<div style="font-size:0.75em;color:#666;display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">';
    keys.forEach(function(k, i) {
        html += '<span style="color:' + WEIGHT_COLORS[i % WEIGHT_COLORS.length] + '">' + k + '</span>';
    });
    html += '</div>';
    return html;
}

function renderSidebar(nodes) {
    var list = document.getElementById('node-list');
    if (!nodes || nodes.length <= 1) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🧬</div>No mutations yet.<br>The engine is dormant, waiting for guidance accuracy data to accumulate.</div>';
        return;
    }
    var html = '';
    nodes.slice().reverse().forEach(function(n) {
        var color = COLORS[n.verdict] || COLORS[n.status] || COLORS.DEFAULT;
        var verdictClass = n.verdict === 'KEEP' ? 'verdict-keep' : (n.verdict === 'REVERT' ? 'verdict-revert' : 'verdict-active');
        var icon = n.id === 'ORIGIN' ? '🏠' : (n.verdict === 'KEEP' ? '✓' : (n.verdict === 'REVERT' ? '✗' : '⟳'));
        html += '<div class="node-card" style="border-color:' + color + '30">';
        html += '<div class="label" style="color:' + color + '">' + icon + ' ' + n.label + ' <span style="color:#666;font-weight:normal">G' + n.generation + '</span></div>';
        html += '<div class="meta">';
        if (n.verdict) html += 'Verdict: <span class="' + verdictClass + '">' + n.verdict + '</span><br>';
        if (n.improvement != null) html += 'Improvement: ' + (n.improvement > 0 ? '+' : '') + n.improvement + ' pts<br>';
        if (n.distance_from_parent) html += 'Step distance: ' + n.distance_from_parent.toFixed(4) + '<br>';
        if (n.distance_from_origin) html += 'Drift from origin: ' + n.distance_from_origin.toFixed(4) + '<br>';
        if (n.trigger_weakest) html += 'Weakness: ' + n.trigger_weakest + '<br>';
        if (n.max_shift && n.max_shift.dimension) html += 'Max shift: ' + n.max_shift.dimension + ' (' + n.max_shift.delta.toFixed(4) + ')<br>';
        if (n.weights) html += buildWeightBar(n.weights);
        if (n.created_at) html += '<span style="color:#555">' + new Date(n.created_at).toLocaleString() + '</span>';
        html += '</div></div>';
    });
    list.innerHTML = html;
}

function renderTree(container, data) {
    var tree = data.tree || {};
    var nodes = tree.nodes || [];
    var edges = tree.edges || [];

    if (nodes.length <= 1) {
        container.innerHTML = '<div class="empty-state"><div class="icon">🌳</div><p>No evolution yet.</p><p style="color:#555;margin-top:8px">When the strategy mutation engine triggers experiments, their genealogy will appear here as a tree.</p></div>';
        return;
    }

    var width = container.offsetWidth - 340;
    var height = container.offsetHeight;
    var svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    var g = svg.append('g');

    var zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', function(event) {
        g.attr('transform', event.transform);
    });
    svg.call(zoom);

    var nodeMap = {};
    nodes.forEach(function(n) { nodeMap[n.id] = n; });

    var levelWidth = Math.max(120, (width - 100) / (nodes.length));
    nodes.forEach(function(n, i) {
        n.x = 80 + i * levelWidth;
        n.y = height / 2;
    });

    g.selectAll('.edge')
        .data(edges)
        .enter().append('line')
        .attr('class', 'edge')
        .attr('x1', function(e) { var s = nodeMap[e.source]; return s ? s.x : 0; })
        .attr('y1', function(e) { var s = nodeMap[e.source]; return s ? s.y : 0; })
        .attr('x2', function(e) { var t = nodeMap[e.target]; return t ? t.x : 0; })
        .attr('y2', function(e) { var t = nodeMap[e.target]; return t ? t.y : 0; })
        .attr('stroke', function(e) { return COLORS[e.verdict] || '#444'; })
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', function(e) { return e.verdict === 'REVERT' ? '6,4' : 'none'; })
        .attr('opacity', 0.6);

    var nodeGroups = g.selectAll('.node')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', function(n) { return 'translate(' + n.x + ',' + n.y + ')'; })
        .style('cursor', 'pointer');

    nodeGroups.append('circle')
        .attr('r', function(n) { return n.id === 'ORIGIN' ? 20 : 14; })
        .attr('fill', function(n) { return (COLORS[n.verdict] || COLORS[n.status] || COLORS.DEFAULT) + '33'; })
        .attr('stroke', function(n) { return COLORS[n.verdict] || COLORS[n.status] || COLORS.DEFAULT; })
        .attr('stroke-width', 2);

    nodeGroups.append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', function(n) { return COLORS[n.verdict] || COLORS[n.status] || COLORS.DEFAULT; })
        .attr('font-size', function(n) { return n.id === 'ORIGIN' ? '11px' : '9px'; })
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(function(n) {
            if (n.id === 'ORIGIN') return 'ORIGIN';
            return n.verdict === 'KEEP' ? '✓' : (n.verdict === 'REVERT' ? '✗' : '⟳');
        });

    nodeGroups.append('text')
        .attr('dy', '-22')
        .attr('text-anchor', 'middle')
        .attr('fill', '#888')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(function(n) { return 'G' + n.generation; });

    if (nodes.length > 1) {
        nodeGroups.append('text')
            .attr('dy', '30')
            .attr('text-anchor', 'middle')
            .attr('fill', '#555')
            .attr('font-size', '8px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text(function(n) {
                if (n.id === 'ORIGIN') return '';
                return n.distance_from_parent ? 'd=' + n.distance_from_parent.toFixed(3) : '';
            });
    }

    svg.call(zoom.transform, d3.zoomIdentity.translate(20, 0));
}

async function init() {
    var data = await loadData();
    if (!data) {
        document.getElementById('tree-container').innerHTML = '<div class="empty-state"><div class="icon">⚠️</div>Could not load lineage data.</div>';
        return;
    }
    updateStats(data.stats || {});
    renderSidebar((data.tree || {}).nodes || []);
    renderTree(document.getElementById('tree-container'), data);
}

init();
