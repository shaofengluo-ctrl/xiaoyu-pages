document.addEventListener("DOMContentLoaded", () => {
    const scanBtn = document.getElementById("scan-decay-btn");
    const previewBtn = document.getElementById("run-decay-preview-btn");
    const grid = document.getElementById("cold-nodes-container");
    const logContainer = document.getElementById("decay-log-container");
    const logOutput = document.getElementById("decay-log-output");

    function getBaseUrl() {
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        return isLocal ? 'http://127.0.0.1:5097' : 'https://xiaoyu-api.example.com'; 
    }

    scanBtn.addEventListener("click", async () => {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--md-default-fg-color--light);">正在深入潜意识边缘扫描...</div>';
        
        try {
            const res = await fetch(`${getBaseUrl()}/edge-of-forgetting`);
            if (!res.ok) throw new Error("API error");
            const data = await res.json();
            const nodes = data.cold_nodes || [];

            if (nodes.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">当前没有濒临遗忘的记忆节点。</div>';
                return;
            }

            nodes.sort((a, b) => {
                const stateOrder = {"ARCHIVED": 0, "COLD": 1, "WARM": 2};
                return stateOrder[a.state] - stateOrder[b.state];
            });

            grid.innerHTML = "";
            nodes.forEach(node => {
                const card = document.createElement('div');
                card.className = `node-card ${node.state.toLowerCase()}`;
                card.innerHTML = `
                    <div class="node-title">${node.name || node.id} <span style="font-size: 12px; font-weight: normal; color: #888;">[${node.id}]</span></div>
                    <div class="node-meta">
                        状态: <b>${node.state}</b><br>
                        创建时间: ${node.added}<br>
                        最后唤起: ${node.last_accessed}<br>
                        唤起次数: ${node.use_count}
                    </div>
                    <button class="boost-btn" data-id="${node.id}">💉 注入事后对齐增强 (Boost)</button>
                `;
                grid.appendChild(card);
            });

            // Bind boost events
            document.querySelectorAll(".boost-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const btnEl = e.target;
                    const id = btnEl.getAttribute("data-id");
                    btnEl.innerText = "注入中...";
                    btnEl.disabled = true;

                    try {
                        const bRes = await fetch(`${getBaseUrl()}/boost-node`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ node_id: id, boost_amount: 1.0 })
                        });
                        if (bRes.ok) {
                            btnEl.innerText = "✅ 增强完成 (免于遗忘)";
                            btnEl.style.background = "#4caf50";
                            btnEl.style.color = "white";
                            btnEl.style.borderColor = "#4caf50";
                        } else {
                            throw new Error("Boost failed");
                        }
                    } catch (err) {
                        btnEl.innerText = "❌ 注入失败";
                        btnEl.disabled = false;
                    }
                });
            });

        } catch (e) {
            grid.innerHTML = `<div style="grid-column: 1/-1; color: red;">扫描失败: ${e.message}</div>`;
        }
    });

    previewBtn.addEventListener("click", () => {
        logContainer.style.display = "block";
        logOutput.innerText = "--- 开始实时推演衰减过程 (Dry-Run) ---\n";
        
        const source = new EventSource(`${getBaseUrl()}/decay-stream?dry_run=true`);
        
        source.onmessage = function(event) {
            if (event.data === "[DONE]") {
                source.close();
                logOutput.innerText += "\n--- 推演结束 ---";
                return;
            }
            logOutput.innerText += event.data + "\n";
            logContainer.scrollTop = logContainer.scrollHeight;
        };

        source.onerror = function(err) {
            logOutput.innerText += "\n[SSE连接已关闭或发生错误]";
            source.close();
        };
    });
});
