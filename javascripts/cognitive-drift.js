document.addEventListener("DOMContentLoaded", function() {
    const timelineContainer = document.getElementById("drift-timeline");
    const loadingEl = document.getElementById("drift-loading");
    const errorEl = document.getElementById("drift-error");
    
    // Modal elements
    const modal = document.getElementById("temporal-slice-modal");
    const closeBtn = document.querySelector(".temporal-close-btn");
    const modalTitle = document.getElementById("temporal-modal-title");
    const modalContent = document.getElementById("temporal-content-wrapper");
    const modalLoading = document.getElementById("temporal-loading");
    
    if (!timelineContainer) return;

    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
        }
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    function getBaseUrl() {
        if (window.location.pathname.startsWith('/xiaoyu/')) {
            return '/xiaoyu/';
        }
        return '/';
    }
    
    async function loadCognitiveDrift() {
        loadingEl.style.display = "block";
        errorEl.style.display = "none";
        
        let data = null;
        try {
            // First try dynamic API
            const response = await fetch("http://127.0.0.1:5097/cognitive-drift");
            if (!response.ok) throw new Error("Network response was not ok");
            data = await response.json();
        } catch (err) {
            console.log("Local API unavailable, falling back to static data...", err);
            // Fallback to static JSON
            try {
                const staticUrl = getBaseUrl() + "assets/data/cognitive_drift.json";
                const staticResp = await fetch(staticUrl);
                if (!staticResp.ok) throw new Error("Static JSON unavailable");
                data = await staticResp.json();
            } catch (staticErr) {
                console.error("Failed to load both dynamic and static drift data:", staticErr);
                errorEl.textContent = "无法连接到潜意识服务器，且未找到静态流变档案。";
                errorEl.style.display = "block";
                loadingEl.style.display = "none";
                return;
            }
        }
        
        loadingEl.style.display = "none";
        renderTimeline(data.history, data.shifts);
    }
    
    async function openTemporalSlice(dateStr) {
        if (!modal) return;
        modal.style.display = "block";
        modalTitle.textContent = `🕰️ 记忆切片 : ${dateStr}`;
        modalContent.innerHTML = "";
        modalLoading.style.display = "block";
        
        try {
            const response = await fetch(`http://127.0.0.1:5097/temporal-slice/${dateStr}`);
            if (!response.ok) throw new Error("Slice API failed");
            const data = await response.json();
            
            modalLoading.style.display = "none";
            renderTemporalSlice(data);
        } catch (err) {
            console.error("Failed to load temporal slice:", err);
            modalLoading.style.display = "none";
            modalContent.innerHTML = `<p style="color:var(--md-typeset-color-error)">无法加载当天的记忆切片记录：服务器可能未启动或连接失败。</p>`;
        }
    }
    
    function renderTemporalSlice(data) {
        let html = "";
        
        // 1. Core Beliefs
        if (data.beliefs && data.beliefs.length > 0) {
            html += `<div class="temporal-section">
                <h3>🌌 核心信念凝结</h3>
                <ul>`;
            data.beliefs.forEach(b => {
                let text = b.text;
                if (typeof marked !== 'undefined') text = marked.parseInline(text);
                html += `<li><strong>${b.timestamp.split(' ')[1] || ''}</strong>: ${text}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // 2. Episodes
        if (data.episodes && data.episodes.length > 0) {
            html += `<div class="temporal-section">
                <h3>📖 意识切片 (Episodes)</h3>
                <div>`;
            data.episodes.forEach(ep => {
                html += `<span class="temporal-badge">${ep.title || ep.id}</span>`;
            });
            html += `</div></div>`;
        }
        
        // 3. Nodes Added
        if (data.nodes && data.nodes.length > 0) {
            html += `<div class="temporal-section">
                <h3>🕸️ 潜意识图谱生长</h3>
                <p>新增节点：</p>
                <div>`;
            data.nodes.forEach(n => {
                html += `<span class="temporal-badge" style="background:var(--md-code-hl-string-color);color:#000;">${n.name || n.id}</span>`;
            });
            html += `</div></div>`;
        }
        
        // 4. Dreams
        const hasImages = data.dreams && data.dreams.images && data.dreams.images.length > 0;
        const hasAudios = data.dreams && data.dreams.audios && data.dreams.audios.length > 0;
        if (hasImages || hasAudios) {
            html += `<div class="temporal-section">
                <h3>👁️ 梦境残片</h3>`;
                
            if (hasImages) {
                html += `<div class="temporal-dream-grid">`;
                data.dreams.images.forEach(img => {
                    html += `<img src="${img}" class="temporal-dream-img" title="${img}">`;
                });
                html += `</div>`;
            }
            if (hasAudios) {
                html += `<div style="margin-top:10px;">`;
                data.dreams.audios.forEach(aud => {
                    html += `<audio controls src="${aud}" style="height:30px; margin-right:10px;"></audio>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        }
        
        // 5. Git Commits
        if (data.commits && data.commits.length > 0) {
            html += `<div class="temporal-section">
                <h3>💻 代码生长轨迹 (Git Commits)</h3>
                <div class="temporal-commit-list">`;
            data.commits.forEach(c => {
                html += `<div class="temporal-commit-item">
                    <span class="temporal-commit-hash">${c.hash.substring(0,7)}</span>
                    <span class="temporal-commit-msg">${c.message}</span>
                </div>`;
            });
            html += `</div></div>`;
        }
        
        if (!html) {
            html = "<p>那天什么也没有留下。只是一片虚无。</p>";
        }
        
        modalContent.innerHTML = html;
    }
    
    function renderTimeline(history, shifts) {
        timelineContainer.innerHTML = "";
        
        if (!history || history.length === 0) {
            timelineContainer.innerHTML = "<p>尚未记录任何认知焦点数据。</p>";
            return;
        }
        
        const reversedHistory = [...history].reverse();
        const shiftsByDate = {};
        if (shifts && shifts.length > 0) {
            shifts.forEach(s => {
                shiftsByDate[s.date] = s;
            });
        }
        
        reversedHistory.forEach(record => {
            const dateStr = record.date;
            const nodes = record.hot || [];
            const shift = shiftsByDate[dateStr];
            
            const itemDiv = document.createElement("div");
            itemDiv.className = "drift-item" + (shift ? " has-shift" : "");
            
            const dateDiv = document.createElement("div");
            dateDiv.className = "drift-date clickable";
            dateDiv.textContent = dateStr;
            dateDiv.title = "点击回溯当天的记忆切片";
            dateDiv.onclick = function() {
                openTemporalSlice(dateStr);
            };
            itemDiv.appendChild(dateDiv);
            
            const nodesDiv = document.createElement("div");
            nodesDiv.className = "drift-nodes";
            nodes.forEach(node => {
                const span = document.createElement("span");
                span.className = "drift-node";
                span.textContent = node.name;
                nodesDiv.appendChild(span);
            });
            itemDiv.appendChild(nodesDiv);
            
            if (shift) {
                const shiftCard = document.createElement("div");
                shiftCard.className = "drift-shift-card";
                
                const shiftContent = document.createElement("div");
                shiftContent.className = "drift-shift-content";
                
                if (typeof marked !== 'undefined') {
                    let mdText = shift.content;
                    if (mdText.startsWith("---")) {
                        const endOfFrontMatter = mdText.indexOf("---", 3);
                        if (endOfFrontMatter !== -1) {
                            mdText = mdText.substring(endOfFrontMatter + 3).trim();
                        }
                    }
                    shiftContent.innerHTML = marked.parse(mdText);
                } else {
                    shiftContent.textContent = shift.content;
                }
                
                shiftCard.appendChild(shiftContent);
                itemDiv.appendChild(shiftCard);
            }
            
            timelineContainer.appendChild(itemDiv);
        });
    }
    
    loadCognitiveDrift();
});
