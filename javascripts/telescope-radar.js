document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('radar-container');
    if (!container) return;

    let myChart = echarts.init(container, 'dark', { renderer: 'canvas' });
    myChart.showLoading({ text: '扫描深空数据...', color: '#44aaff', textColor: '#fff', maskColor: 'rgba(0,0,0,0.5)' });

    try {
        const response = await fetch('../assets/data/radar_data.json');
        if (!response.ok) throw new Error('Data not found');
        const history = await response.json();

        // Process data: extract all items and add a scan time
        const dataPoints = [];
        const seen = new Set();

        // We traverse backwards so we only show the latest instance of a repo
        for (let i = history.length - 1; i >= 0; i--) {
            const scan = history[i];
            for (const item of scan.items) {
                if (!seen.has(item.name)) {
                    seen.add(item.name);
                    // Add some jitter to Y axis if multiple have same score
                    let jitter = (Math.random() - 0.5) * 0.1;
                    dataPoints.push({
                        name: item.name,
                        value: [item.stars, item.score + jitter],
                        raw: item,
                        scanTime: scan.timestamp
                    });
                }
            }
        }

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: '星际望远镜 · 捕获目标分布',
                left: 'center',
                textStyle: { color: '#ddd', fontSize: 16, fontWeight: 'normal' },
                top: 20
            },
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    const item = params.data.raw;
                    return `<div style="font-weight:bold;color:#fff">${item.name}</div>
                            <div style="color:#aaa;font-size:12px;margin-top:4px;">⭐ ${item.stars} | 🎯 共鸣: ${item.score.toFixed(1)}</div>`;
                },
                backgroundColor: 'rgba(20,20,30,0.9)',
                borderColor: '#44aaff',
                textStyle: { color: '#fff' }
            },
            xAxis: {
                type: 'log',
                name: 'GitHub Stars',
                nameLocation: 'middle',
                nameGap: 30,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#888' }
            },
            yAxis: {
                type: 'value',
                name: '潜意识共鸣度',
                nameLocation: 'middle',
                nameGap: 40,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#888' },
                min: 0,
                max: 10
            },
            series: [{
                name: 'Projects',
                type: 'scatter',
                symbolSize: function (data) {
                    // Size based on score, min 10 max 40
                    return Math.max(10, Math.min(40, data[1] * 5));
                },
                itemStyle: {
                    color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                        offset: 0,
                        color: 'rgba(100, 200, 255, 0.9)'
                    }, {
                        offset: 1,
                        color: 'rgba(30, 100, 200, 0.5)'
                    }]),
                    shadowBlur: 10,
                    shadowColor: 'rgba(100, 200, 255, 0.5)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1
                },
                data: dataPoints
            }]
        };

        myChart.hideLoading();
        myChart.setOption(option);

        // Click event to show details below
        myChart.on('click', function(params) {
            const item = params.data.raw;
            const detailsDiv = document.getElementById('project-details');
            document.getElementById('proj-name').innerText = item.name;
            document.getElementById('proj-stars').innerText = item.stars.toLocaleString();
            document.getElementById('proj-lang').innerText = item.language || 'Unknown';
            document.getElementById('proj-score').innerText = item.score.toFixed(1);
            document.getElementById('proj-desc').innerText = item.description;
            document.getElementById('proj-summary').innerHTML = item.ai_summary ? `💡 ${item.ai_summary}` : '';
            document.getElementById('proj-url').href = item.url;
            
            detailsDiv.style.display = 'block';
            detailsDiv.style.animation = 'fadeIn 0.5s ease-out forwards';
        });

        window.addEventListener('resize', () => myChart.resize());

    } catch (e) {
        console.error(e);
        myChart.hideLoading();
        container.innerHTML = `<div style="color:#ff5555; padding: 2rem; text-align:center;">无法获取雷达数据: ${e.message}</div>`;
    }
});

// Add keyframes for fadeIn
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);
