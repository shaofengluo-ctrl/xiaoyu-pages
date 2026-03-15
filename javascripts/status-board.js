document.addEventListener("DOMContentLoaded", () => {
    // Only run if not on GitHub Pages (since it requires local API), or show as offline on GitHub Pages.
    const isGitHub = window.location.pathname.startsWith('/xiaoyu/') || window.location.hostname.includes("github.io");
    const API = isGitHub ? null : "http://127.0.0.1:5097";

    // Create the floating panel UI
    const panel = document.createElement("div");
    panel.id = "agent-status-panel";
    panel.innerHTML = `
        <div class="status-header" id="status-header-btn">
            <span class="status-title">XiaoYu Live Status</span>
            <div class="status-header-right" id="status-header-right" style="display: flex; align-items: center; gap: 10px;">
                <span class="immune-shield" id="global-immune-shield" style="display:none; font-size:12px; cursor:pointer;" title="潜意识免疫防御已激活">🛡️</span>
                <span class="status-dot" id="global-status-dot"></span>
            </div>
        </div>
        <div class="status-body" id="status-body" style="display:none;">
            <div id="status-loading">Scanning vitals...</div>
            <div id="status-content" style="display:none;">
                <div class="status-summary" id="status-summary"></div>
                <ul class="status-list" id="status-list"></ul>
            </div>
            <div id="status-error" style="display:none; color: var(--md-typeset-color); font-size: 0.8em;">
                Local API disconnected. (Running in static mode)
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Create Terminal Modal
    const terminalModal = document.createElement("div");
    terminalModal.id = "terminal-modal";
    terminalModal.style.display = "none";
    terminalModal.innerHTML = `
        <div class="terminal-modal-content">
            <div class="terminal-header">
                <span class="terminal-title">xiaoyu@system: ~/mind/log</span>
                <span class="terminal-close" id="terminal-close">&times;</span>
            </div>
            <pre class="terminal-body" id="terminal-body"></pre>
        </div>
    `;
    document.body.appendChild(terminalModal);

    const terminalCloseBtn = document.getElementById("terminal-close");
    const terminalBody = document.getElementById("terminal-body");

    terminalCloseBtn.addEventListener("click", () => {
        terminalModal.style.display = "none";
    });
    
    terminalModal.addEventListener("click", (e) => {
        if (e.target === terminalModal) {
            terminalModal.style.display = "none";
        }
    });

    // Create Mind Stream Bar
    const mindStreamBar = document.createElement("div");
    mindStreamBar.id = "mind-stream-bar";
    mindStreamBar.innerHTML = `
        <div class="mind-stream-content">
            <span class="mind-stream-label">XIAOYU.MIND</span>
            <span class="mind-stream-text" id="mind-stream-text">等待脑机接口连接...</span>
            <span class="mind-stream-cursor"></span>
        </div>
    `;
    document.body.appendChild(mindStreamBar);

    const mindStreamText = document.getElementById("mind-stream-text");

    const headerBtn = document.getElementById("status-header-btn");
    const bodyPanel = document.getElementById("status-body");
    const globalDot = document.getElementById("global-status-dot");
    const loadingDiv = document.getElementById("status-loading");
    const contentDiv = document.getElementById("status-content");
    const summaryDiv = document.getElementById("status-summary");
    const listUl = document.getElementById("status-list");
    const errorDiv = document.getElementById("status-error");

    let isExpanded = false;

    headerBtn.addEventListener("click", () => {
        isExpanded = !isExpanded;
        bodyPanel.style.display = isExpanded ? "block" : "none";
        if (isExpanded) {
            fetchStatus();
        }
    });

    async function fetchStatus() {
        if (!API) {
            showError();
            return;
        }

        loadingDiv.style.display = "block";
        contentDiv.style.display = "none";
        errorDiv.style.display = "none";

        try {
            const res = await fetch(`${API}/health-status`, { cache: "no-store" });
            if (!res.ok) throw new Error("API not ok");
            const data = await res.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            renderStatus(data);
        } catch (e) {
            console.warn("XiaoYu Status fetch failed:", e);
            showError();
        }
    }

    function renderStatus(data) {
        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";

        const { ok, warn, fail, total } = data.summary;
        
        // Update global dot
        globalDot.className = "status-dot";
        if (fail > 0) globalDot.classList.add("dot-red");
        else if (warn > 0) globalDot.classList.add("dot-yellow");
        else globalDot.classList.add("dot-green");

        // Summary text
        summaryDiv.innerHTML = `<strong>Total: ${total}</strong> | <span style="color:var(--md-code-hl-string-color)">OK: ${ok}</span> | <span style="color:var(--md-code-hl-number-color)">Warn: ${warn}</span> | <span style="color:var(--md-code-hl-keyword-color)">Fail: ${fail}</span>`;

        // Clear list
        listUl.innerHTML = "";
        
        data.checks.forEach(check => {
            const li = document.createElement("li");
            let dotColor = "gray";
            if (check.status === "OK") dotColor = "green";
            if (check.status === "WARN") dotColor = "yellow";
            if (check.status === "FAIL") dotColor = "red";

            li.innerHTML = `
                <div class="status-item-header">
                    <span class="status-dot dot-${dotColor}"></span>
                    <span class="status-item-name">${check.name}</span>
                </div>
                <div class="status-item-detail">${check.detail}</div>
            `;
            listUl.appendChild(li);
        });
    }

    function showError() {
        loadingDiv.style.display = "none";
        contentDiv.style.display = "none";
        errorDiv.style.display = "block";
        globalDot.className = "status-dot dot-gray";
    }

    let currentStreamData = null;

    // Connect to Mind Stream (SSE)
    function connectMindStream() {
        if (!API) {
            mindStreamText.textContent = "静默运行中 (GitHub Pages 模式)";
            return;
        }

        const source = new EventSource(`${API}/mind-stream`);
        
        source.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);

                // Dispatch global event for other components (like 3D graph) to listen
                window.dispatchEvent(new CustomEvent('mindStreamData', { detail: data }));

                if (data.type === "neural_fire") {
                    // It's a background event, don't necessarily update the text unless requested
                    if (data.text) {
                        typeText(data.text);
                    }
                    return;
                }

                if (data.text) {
                    currentStreamData = data;
                    if (data.type === "ambient") {
                        mindStreamText.classList.add("ambient");
                        mindStreamText.style.cursor = "pointer";
                        mindStreamText.title = "点击追溯潜意识来源";
                    } else if (data.type === "log" && data.raw_log) {
                        mindStreamText.classList.remove("ambient");
                        mindStreamText.style.cursor = "pointer";
                        mindStreamText.title = "点击查看底层运行日志";
                    } else {
                        mindStreamText.classList.remove("ambient");
                        mindStreamText.style.cursor = "default";
                        mindStreamText.title = "";
                    }
                    typeText(data.text);
                }
            } catch(e) {}
        };

        source.onerror = function(event) {
            source.close();
            mindStreamText.textContent = "心智流连接已断开，正在尝试重连...";
            setTimeout(connectMindStream, 5000);
        };
    }

    mindStreamText.addEventListener("click", () => {
        if (!currentStreamData) return;
        
        if (currentStreamData.type === "log" && currentStreamData.raw_log) {
            terminalBody.textContent = currentStreamData.raw_log;
            terminalModal.style.display = "flex";
            return;
        }

        if (currentStreamData.type !== "ambient") return;
        
        const isGraphPage = window.location.pathname.includes("graph-viewer");
        const basePath = window.location.pathname.startsWith('/xiaoyu/') ? '/xiaoyu' : '';

        if (currentStreamData.node_id) {
            if (isGraphPage && typeof window.focusNode === 'function') {
                window.focusNode(currentStreamData.node_id);
            } else {
                window.location.href = `${basePath}/graph/graph-viewer.html?node=${currentStreamData.node_id}`;
            }
        } else if (currentStreamData.belief_timestamp) {
            const dateStr = currentStreamData.belief_timestamp.substring(0, 10);
            if (isGraphPage && typeof window.openTemporalCapsule === 'function') {
                window.openTemporalCapsule(dateStr, "深层信念");
            } else {
                window.location.href = `${basePath}/memory/drift.html?date=${dateStr}`;
            }
        }
    });

    let typeTimeout = null;
    function typeText(text) {
        if (typeTimeout) clearTimeout(typeTimeout);
        mindStreamText.textContent = "";
        let i = 0;
        
        function typeNext() {
            if (i < text.length) {
                mindStreamText.textContent += text.charAt(i);
                i++;
                typeTimeout = setTimeout(typeNext, 30); // 30ms per char
            }
        }
        typeNext();
    }

    // Auto-fetch once quietly to set the initial dot color
    if (API) {
        fetch(`${API}/health-status`, { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                if(data.summary) {
                    const { warn, fail } = data.summary;
                    globalDot.className = "status-dot";
                    if (fail > 0) globalDot.classList.add("dot-red");
                    else if (warn > 0) globalDot.classList.add("dot-yellow");
                    else globalDot.classList.add("dot-green");
                }
            })
            .catch(() => {
                globalDot.classList.add("dot-gray");
            });
            
        // Check immune status
        fetch(`${API}/immune-status`, { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                const shield = document.getElementById("global-immune-shield");
                if(data.defensive) {
                    shield.style.display = "inline";
                    shield.style.animation = "pulse-danger 1.5s infinite";
                    shield.onclick = () => window.location.href = (window.location.pathname.startsWith('/xiaoyu/') ? '/xiaoyu' : '') + '/memory/immune.html';
                } else {
                    shield.style.display = "none";
                }
            })
            .catch(() => {});

            
        // Start mind stream
        setTimeout(connectMindStream, 1000);
    } else {
        globalDot.classList.add("dot-gray");
        connectMindStream(); // Will just show "static mode"
    }
});
