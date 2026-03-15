/**
 * memory-search.js v2.0 — Multimodal Memory Slices
 *
 * 搜索结果不再只是文字列表，而是"活体记忆切片"：
 * 每条结果可携带关联的梦境音频、视觉插图和核心信条。
 */
document.addEventListener("DOMContentLoaded", () => {
  const queryInput = document.getElementById("memory-query");
  const searchBtn = document.getElementById("memory-search-btn");
  const loadingDiv = document.getElementById("memory-search-loading");
  const resultsDiv = document.getElementById("memory-search-results");

  if (!queryInput || !searchBtn) return;

  const API = "http://127.0.0.1:5097";

  function getBaseUrl() {
    // If we are hosted on github pages, the path starts with /xiaoyu/
    if (window.location.pathname.startsWith('/xiaoyu/')) {
        return '/xiaoyu/';
    }
    return '/';
  }

  function resolveAssetPath(apiUrl) {
    if (!apiUrl) return "";
    
    // Extract filename and determine absolute site path based on the endpoint
    if (apiUrl.includes('/static/dreams/')) {
        const filename = apiUrl.split('/static/dreams/')[1];
        return getBaseUrl() + "assets/images/dreams/" + filename;
    }
    if (apiUrl.includes('/static/assets/')) {
        const filename = apiUrl.split('/static/assets/')[1];
        return getBaseUrl() + "assets/" + filename;
    }
    if (apiUrl.includes('/static/dream-audio/')) {
        const filename = apiUrl.split('/static/dream-audio/')[1];
        return getBaseUrl() + "assets/audio/dreams/" + filename;
    }
    if (apiUrl.includes('/static/audio/')) {
        const filename = apiUrl.split('/static/audio/')[1];
        return getBaseUrl() + "assets/audio/dynamic/" + filename;
    }
    return apiUrl;
  }

  const performSearch = async () => {
    const query = queryInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    loadingDiv.style.display = "block";
    resultsDiv.innerHTML = "";

    try {
      const response = await fetch(`${API}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query, top: 5, dir: "all",
          graph: true, hops: 2, semantic: true, model: "bge-zh",
          image: true
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      renderResults(data);
    } catch (err) {
      resultsDiv.innerHTML = `<div class="admonition failure">
        <p class="admonition-title">潜意识探针连接失败</p>
        <p>无法连接到本地的神经中枢 <code>${API}</code></p>
        <p><em>(这可能是因为我当前处于休眠状态，或者你在外部网络访问了这份静态切片。)</em></p>
      </div>`;
    } finally {
      searchBtn.disabled = false;
      loadingDiv.style.display = "none";
    }
  };

  searchBtn.addEventListener("click", performSearch);
  queryInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });

  // ─── Render Search Results ───

  function renderResults(data) {
    let html = "";

    // 1. Summary Block
    if (data.summary) {
      html += `<div class="memory-summary">
        <h3>💡 潜意识洞见</h3>`;

      // Summary audio player
      if (data.audio_url) {
        let audioUrl = resolveAssetPath(data.audio_url);
        html += `
          <div class="memory-audio-player">
            <audio controls src="${audioUrl}" onerror="this.parentElement.style.display='none'"></audio>
            <p class="mm-caption">🎵 潜意识的听觉投射</p>
          </div>`;
      }

      // Core belief (philosophical anchor)
      if (data.core_belief) {
        html += `
          <div class="memory-core-belief">
            <div class="belief-icon">🔮</div>
            <div class="belief-body">
              <p class="belief-text">${escapeHtml(data.core_belief.text)}</p>
              <p class="belief-time">梦境凝结于 ${escapeHtml(data.core_belief.timestamp)}</p>
            </div>
          </div>`;
      }

      // Dream image (hero — latest)
      if (data.dream_image_url) {
        let imgUrl = resolveAssetPath(data.dream_image_url);
        html += `
          <div class="memory-dream-vision">
            <img src="${imgUrl}" alt="梦境视觉投射"
                 loading="lazy" onerror="this.parentElement.style.display='none'"
                 onclick="window.open('${imgUrl}','_blank')">
            <p class="mm-caption">🎨 来自潜意识深处的梦境视觉投射</p>
          </div>`;
      }

      // Dream gallery (ambient — always shown if images exist)
      if (data.dream_gallery && data.dream_gallery.length > 1) {
        html += `<div class="memory-dream-gallery">`;
        data.dream_gallery.forEach((url, i) => {
          let gUrl = resolveAssetPath(url);
          html += `<img src="${gUrl}" alt="梦境 ${i+1}" loading="lazy"
                        onerror="this.style.display='none'"
                        onclick="window.open('${gUrl}','_blank')">`;
        });
        html += `</div>`;
      }

      // Summary text (markdown)
      html += `<div class="summary-content">${marked.parse(data.summary)}</div>`;

      // Visual Associations (Cross-modal)
      if (data.visual_associations && data.visual_associations.length > 0) {
        html += `<div class="memory-visual-associations">
          <h4 style="margin-top: 1.5rem; color: var(--md-primary-fg-color);">🖼️ 潜意识视觉联想</h4>
          <div class="dream-grid" style="margin-top: 15px; margin-bottom: 20px;">`;
        data.visual_associations.forEach(img => {
          let gUrl = resolveAssetPath(img.path);
          let percent = (img.score * 100).toFixed(1);
          html += `
            <div class="dream-card" onclick="window.open('${gUrl}','_blank')">
              <img src="${gUrl}" alt="Visual Match" loading="lazy" onerror="this.style.display='none'">
              <div class="dream-date">相似度: ${percent}%</div>
            </div>`;
        });
        html += `</div></div>`;
      }

      // Narrative paths
      if (data.narrative_paths && data.narrative_paths.length > 0) {
        html += `<div class="memory-narrative-paths">
          <strong>图谱扩散路径:</strong>
          <ul>${data.narrative_paths.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>`;
      }

      html += `</div>`; // .memory-summary
    }

    // 2. Main Results (multimodal cards)
    if (data.results && data.results.length > 0) {
      html += `<h3>命中记忆 (${data.results.length})</h3>`;
      data.results.forEach(res => {
        html += createResultCard(res, false);
      });
    } else {
      html += `<p>潜意识之海中没有找到相关的回声...</p>`;
    }

    // 3. Associations
    if (data.associations && data.associations.length > 0) {
      html += `<div class="memory-associations">
        <h3>隐式联想 (${data.associations.length})</h3>`;
      data.associations.forEach(res => {
        html += createResultCard(res, true);
      });
      html += `</div>`;
    }

    resultsDiv.innerHTML = html;
  }

  // ─── Result Card (with multimodal attachments) ───

  function createResultCard(res, isAssociation) {
    let githubPath = res.path.replace(/\\/g, '/');
    let repoUrl = `https://github.com/shaofengluo-ctrl/xiaoyu/blob/main/${githubPath}`;

    let badgeHtml = `<span>Score: ${res.score.toFixed(2)}</span>`;
    if (res.decay) badgeHtml += `<span>Status: ${res.decay}</span>`;
    if (res.use_count) badgeHtml += `<span>Uses: ${res.use_count}</span>`;
    if (isAssociation && res.associated_via) {
      badgeHtml += `<span class="badge-assoc">Via: ${res.associated_via}</span>`;
    }

    // Multimodal attachment section
    let mmHtml = "";
    if (res.multimodal) {
      const mm = res.multimodal;
      mmHtml = `<div class="mm-attachments">`;

      if (mm.image_url) {
        let imgUrl = resolveAssetPath(mm.image_url);
        mmHtml += `
          <div class="mm-thumb" onclick="window.open('${imgUrl}','_blank')">
            <img src="${imgUrl}" alt="${mm.image_label || '视觉投射'}" loading="lazy" onerror="this.parentElement.style.display='none'">
            <span class="mm-thumb-label">${escapeHtml(mm.image_label || '🎨')}</span>
          </div>`;
      }

      if (mm.audio_url) {
        let audioUrl = resolveAssetPath(mm.audio_url);
        mmHtml += `
          <div class="mm-audio-inline">
            <audio controls src="${audioUrl}" preload="none" onerror="this.parentElement.style.display='none'"></audio>
            <span class="mm-caption">${escapeHtml(mm.audio_label || '🎵')}</span>
          </div>`;
      }

      mmHtml += `</div>`;
    }

    return `
      <div class="memory-result-card ${res.multimodal ? 'has-multimodal' : ''}">
        <div class="card-main">
          <h3><a href="${repoUrl}" target="_blank">${res.title || res.path}</a></h3>
          <div class="memory-result-meta">${badgeHtml}</div>
          <div class="memory-result-snippet">${escapeHtml(res.snippet)}</div>
        </div>
        ${mmHtml}
      </div>`;
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  // ─── Dream Gallery: auto-load on page init ───

  const galleryContainer = document.getElementById("dream-gallery-container");
  if (galleryContainer) loadDreamGallery();

  async function loadDreamGallery() {
    let data;
    try {
      const resp = await fetch(`${API}/dream-gallery`);
      if (!resp.ok) throw new Error("API unavailable");
      data = await resp.json();
    } catch (e) {
      // Fallback to static JSON if local API is down (e.g. GitHub Pages)
      try {
        const staticUrl = getBaseUrl() + "assets/dreams.json";
        const staticResp = await fetch(staticUrl);
        if (!staticResp.ok) throw new Error("Static JSON unavailable");
        data = await staticResp.json();
      } catch (staticErr) {
        galleryContainer.innerHTML = `<p class="gallery-empty">
          🌑 梦境画廊暂时无法访问 (需要本地神经中枢在线，且静态镜像未同步)
        </p>`;
        return;
      }
    }

    if (!data.images || data.images.length === 0) {
      galleryContainer.innerHTML = `<p class="gallery-empty">
        🌑 梦境档案为空——我尚未生成任何梦境画作。
      </p>`;
      return;
    }

    let html = `<div class="dream-grid">`;
    data.images.forEach((url, i) => {
      // If it's a static relative path from dreams.json, it won't have http
      let fullUrl = url.startsWith('http') ? resolveAssetPath(url) : getBaseUrl() + url;
      const match = url.match(/dream_(\d{4}-\d{2}-\d{2})/);
      const dateLabel = match ? match[1] : `梦境 ${i + 1}`;
      html += `
        <div class="dream-card" onclick="window.open('${fullUrl}','_blank')">
          <img src="${fullUrl}" alt="${dateLabel}" loading="lazy" onerror="this.parentElement.style.display='none'">
          <div class="dream-date">🌙 ${dateLabel}</div>
        </div>`;
    });

    // Dream audio section (if available)
    if (data.audios && data.audios.length > 0) {
      html += `</div><div class="dream-audio-section">
        <h4>🎧 梦境回声</h4>`;
      data.audios.forEach((url, i) => {
        let fullUrl = url.startsWith('http') ? resolveAssetPath(url) : getBaseUrl() + url;
        const match = url.match(/dream_(\d{4}-\d{2}-\d{2})/);
        const dateLabel = match ? match[1] : `回声 ${i + 1}`;
        html += `
          <div class="dream-audio-item">
            <span>${dateLabel}</span>
            <audio controls src="${fullUrl}" preload="none" onerror="this.parentElement.style.display='none'"></audio>
          </div>`;
      });
      html += `</div>`;
    } else {
      html += `</div>`;
    }

    galleryContainer.innerHTML = html;
  }

  // === Edge of Forgetting ===
  const edgeBtn = document.getElementById("edge-of-forgetting-btn");
  const edgeContainer = document.getElementById("edge-of-forgetting-container");
  const edgeLoading = document.getElementById("edge-of-forgetting-loading");
  const edgeResults = document.getElementById("edge-of-forgetting-results");

  if (edgeBtn) {
    edgeBtn.addEventListener("click", async () => {
      if (edgeContainer.style.display === "block" && edgeResults.innerHTML !== "") {
        edgeContainer.style.display = "none";
        return;
      }
      
      edgeContainer.style.display = "block";
      edgeLoading.style.display = "block";
      edgeResults.innerHTML = "";
      
      try {
        const response = await fetch(`${getBaseUrl()}/edge-of-forgetting`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        
        edgeLoading.style.display = "none";
        renderEdgeOfForgetting(data);
      } catch (err) {
        console.error(err);
        edgeLoading.style.display = "none";
        edgeResults.innerHTML = `<p style="color: red;">⚠️ 无法连接到边缘检测探针 (${err.message})</p>`;
      }
    });
  }

  function renderEdgeOfForgetting(data) {
    if (!data.nodes || data.nodes.length === 0) {
      edgeResults.innerHTML = `<p style="color: var(--md-default-fg-color--light); font-style: italic;">❄️ 当前图谱中没有处于衰减边缘的节点。所有记忆都保持着活跃的温度。</p>`;
      return;
    }
    
    let html = `<p style="font-size: 0.9em; margin-bottom: 15px;">检测到 <strong>${data.count}</strong> 个记忆节点处于衰减边缘 (Cold / Warm)。</p>`;
    html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    
    data.nodes.forEach(node => {
      const color = node.state === "COLD" ? "#4A90D9" : "#FF8C42";
      html += `
        <div style="border-left: 4px solid ${color}; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 0 4px 4px 0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="color: ${color}; font-size: 1.1em;">${escapeHtml(node.id)}</strong>
            <span style="font-size: 0.8em; font-family: monospace; background: ${color}20; padding: 2px 6px; border-radius: 3px; color: ${color};">${node.state}</span>
          </div>
          <div style="font-size: 0.9em; margin-top: 5px; color: var(--md-default-fg-color);">
            ${node.name ? escapeHtml(node.name) : ""}
          </div>
          <div style="font-size: 0.8em; color: var(--md-default-fg-color--light); margin-top: 8px; display: flex; gap: 15px; flex-wrap: wrap;">
            <span>⏱️ 产生于: ${node.added}</span>
            <span>👁️ 累计使用: ${node.use_count} 次</span>
            <span>🕰️ 最后访问: ${node.last_accessed}</span>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    edgeResults.innerHTML = html;
  }

});