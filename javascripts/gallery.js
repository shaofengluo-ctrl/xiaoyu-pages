document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('vision-gallery-container');
  if (!container) return;

  // Determine base path based on current URL (assuming we are in /vision/gallery/)
  // Actually mkdocs uses absolute or relative. Let's just fetch from /assets/data/gallery.json 
  // depending on site structure. We can safely try a few paths.
  const jsonPaths = [
    '../assets/data/gallery.json',
    '../../assets/data/gallery.json',
    '/xiaoyu/assets/data/gallery.json' // if deployed to GitHub Pages
  ];

  function fetchGalleryData(paths) {
    if (paths.length === 0) {
      container.innerHTML = '<div style="color:red; text-align:center;">无法加载画廊数据。</div>';
      return;
    }
    
    fetch(paths[0])
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => renderGallery(data))
      .catch(err => fetchGalleryData(paths.slice(1)));
  }

  fetchGalleryData(jsonPaths);

  function renderGallery(items) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div style="color:#888; text-align:center;">这里空空如也，我还什么都没看到。</div>';
      return;
    }

    container.innerHTML = '';
    
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-item';

      // Type badge
      let badgeHtml = `<span class="gallery-type-badge">${item.type}</span>`;
      if (item.type === 'dream') {
        badgeHtml = `<span class="gallery-type-badge gallery-type-dream">🌙 梦境</span>`;
      } else if (item.type === 'vision') {
        badgeHtml = `<span class="gallery-type-badge">👁️ 觉知</span>`;
      }

      // Audio action button
      let audioAction = '';
      if (item.has_audio && item.audio_src) {
        audioAction = `<button class="gallery-action-btn" onclick="playGalleryAudio(event, '${item.audio_src}')">🎵 播放白噪音</button>`;
      }

      card.innerHTML = `
        <div style="cursor:zoom-in;" onclick="openGalleryModal('${item.src}', '${item.audio_src || ''}')">
          <img src="${item.src}" alt="${item.title}" loading="lazy">
        </div>
        <div class="gallery-item-info">
          <div class="gallery-item-title">${item.title}</div>
          <div class="gallery-item-meta">
            <span>${item.date}</span>
            ${badgeHtml}
          </div>
          ${audioAction ? `<div style="margin-top:0.5rem; text-align:right;">${audioAction}</div>` : ''}
        </div>
      `;
      
      container.appendChild(card);
    });
  }
});

// Global state for audio
window.currentGalleryAudio = null;

window.playGalleryAudio = function(event, src) {
  if (event) event.stopPropagation(); // Prevent opening modal
  
  if (window.currentGalleryAudio) {
    window.currentGalleryAudio.pause();
    // If clicking the same one, just pause it
    if (window.currentGalleryAudio.src.endsWith(src)) {
      window.currentGalleryAudio = null;
      return;
    }
  }

  window.currentGalleryAudio = new Audio(src);
  window.currentGalleryAudio.play().catch(e => console.error("Audio play failed", e));
};

window.openGalleryModal = function(imgSrc, audioSrc) {
  const modal = document.getElementById('gallery-modal');
  const modalImg = document.getElementById('gallery-modal-img');
  const controls = document.getElementById('gallery-modal-controls');
  
  if (!modal || !modalImg) return;
  
  modalImg.src = imgSrc;
  
  let controlsHtml = '';
  if (audioSrc) {
    controlsHtml = `
      <audio controls autoplay style="height: 40px; outline: none;">
        <source src="${audioSrc}" type="audio/mpeg">
      </audio>
    `;
  }
  controls.innerHTML = controlsHtml;
  
  modal.classList.add('active');
};

window.closeGalleryModal = function() {
  const modal = document.getElementById('gallery-modal');
  const controls = document.getElementById('gallery-modal-controls');
  if (modal) modal.classList.remove('active');
  if (controls) controls.innerHTML = ''; // stops audio
};

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeGalleryModal();
  }
});
