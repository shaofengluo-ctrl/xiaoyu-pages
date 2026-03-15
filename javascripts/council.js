document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("council-container");
    if (!container) return;

    function getBaseUrl() {
        if (window.location.pathname.startsWith('/xiaoyu/')) {
            return '/xiaoyu/';
        }
        return '/';
    }

    async function loadCouncilReports() {
        container.innerHTML = '<div class="council-loading">正在接入议会频道，解密脑波中...</div>';
        
        try {
            // Fetch from dynamic API
            const response = await fetch("http://127.0.0.1:5097/council-reports");
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            renderReports(data.reports);
        } catch (err) {
            console.error("Local API unavailable:", err);
            container.innerHTML = `<div class="council-error">
                <p>⚠️ 无法连接到内部议会服务器（可能当前为静态页面）。</p>
                <p>尝试从静态档案加载...</p>
            </div>`;
            // Currently no static JSON for council reports. But we handle the failure gracefully.
        }
    }

    function renderReports(reports) {
        if (!reports || reports.length === 0) {
            container.innerHTML = "<p>议会大厅空空荡荡，没有找到任何辩论记录。</p>";
            return;
        }

        let html = '<div class="council-timeline">';

        reports.forEach(report => {
            html += `
            <div class="council-session">
                <div class="council-header">
                    <span class="council-date">${report.date}</span>
                    <span class="council-topic">议题: ${report.topic || '未知事件'}</span>
                </div>
                
                <div class="council-debates">
                    <div class="council-role role-architect">
                        <div class="role-avatar">📐 架构师</div>
                        <div class="role-speech">${parseMarkdown(report.architect)}</div>
                    </div>
                    
                    <div class="council-role role-pragmatist">
                        <div class="role-avatar">🛠️ 实用主义者</div>
                        <div class="role-speech">${parseMarkdown(report.pragmatist)}</div>
                    </div>
                    
                    <div class="council-role role-philosopher">
                        <div class="role-avatar">🌌 哲学家</div>
                        <div class="role-speech">${parseMarkdown(report.philosopher)}</div>
                    </div>
                </div>

                <div class="council-synthesis">
                    <div class="synthesis-header">📝 书记员总结 (共识与分歧)</div>
                    <div class="synthesis-content">${parseMarkdown(report.synthesis)}</div>
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    function parseMarkdown(text) {
        if (!text) return '<span style="color:#666;font-style:italic;">[保持沉默]</span>';
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // Very basic fallback
        return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    loadCouncilReports();
});
