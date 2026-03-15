document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("ecg-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Resize handling
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = 100;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ECG parameters
    let pulse = 60;
    let time = 0;
    let speed = 2; // px per frame
    
    const wave = [];
    const maxDataPoints = 1000;
    
    fetch('assets/vitals.json')
        .then(res => res.json())
        .then(data => {
            pulse = data.pulse || 60;
            const statusDiv = document.getElementById('vitals-status');
            if(statusDiv) {
                statusDiv.innerHTML = `<strong>系统脉搏:</strong> ${pulse} BPM | <strong>神经元:</strong> ${data.py_lines} 行 | <strong>记忆片段:</strong> ${data.epi_count} 篇`;
            }
            
            // Render Cognitive Focus if exists
            if (data.cognitive_focus) {
                renderCognitiveFocus(data.cognitive_focus);
            }
        })
        .catch(err => console.log('Could not load vitals.json', err));
        
    function renderCognitiveFocus(focusData) {
        // Find or create container
        let container = document.getElementById('cognitive-focus-container');
        if (!container) {
            // We'll append it right after the vitals-status
            const statusDiv = document.getElementById('vitals-status');
            if (!statusDiv) return;
            
            container = document.createElement('div');
            container.id = 'cognitive-focus-container';
            container.style.marginTop = '15px';
            container.style.padding = '10px';
            container.style.background = 'var(--md-default-bg-color)';
            container.style.border = '1px solid var(--md-default-fg-color--lightest)';
            container.style.borderRadius = '4px';
            container.style.fontSize = '0.9em';
            
            statusDiv.parentNode.insertBefore(container, statusDiv.nextSibling);
        }
        
        let hotHtml = focusData.hot.map(item => `<span style="display:inline-block; padding:2px 6px; margin:2px; background:rgba(255,82,82,0.1); color:#ff5252; border-radius:3px;">${item.name} <small>(${item.score})</small></span>`).join(' ');
        let fadingHtml = focusData.fading.map(item => `<span style="display:inline-block; padding:2px 6px; margin:2px; background:rgba(158,158,158,0.1); color:#9e9e9e; border-radius:3px;">${item.name}</span>`).join(' ');
        
        container.innerHTML = `
            <div style="margin-bottom:8px;"><strong>🔥 近期焦点 (Cognitive Focus)</strong><br>${hotHtml || '无'}</div>
            <div><strong>🧊 边缘概念 (Fading Edge)</strong><br>${fadingHtml || '无'}</div>
        `;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const isDark = document.body.getAttribute('data-md-color-scheme') === 'slate';
        ctx.strokeStyle = isDark ? '#00e5ff' : '#3f51b5'; // Cyan or Indigo
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        const startX = Math.max(0, canvas.width - wave.length * speed);
        let x = startX;
        
        for (let i = 0; i < wave.length; i++) {
            if (i === 0) {
                ctx.moveTo(x, wave[i]);
            } else {
                ctx.lineTo(x, wave[i]);
            }
            x += speed;
        }
        ctx.stroke();
        
        // Draw trailing dot
        if (wave.length > 0) {
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(x - speed, wave[wave.length - 1], 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function update() {
        const beatInterval = 60000 / pulse; // ms between beats
        const msPerFrame = 16;
        time += msPerFrame;
        
        const cy = canvas.height / 2;
        let y = cy;
        
        // PQRST wave generation
        // Simulating a beat duration of ~600ms
        const beatPhase = time % beatInterval;
        if (beatPhase < 600) {
            const p = beatPhase;
            if (p > 50 && p < 100) y = cy - 10 * Math.sin((p-50)/50 * Math.PI); // P wave
            else if (p > 150 && p < 170) y = cy + 10; // Q
            else if (p > 170 && p < 200) y = cy - 40; // R
            else if (p > 200 && p < 220) y = cy + 20; // S
            else if (p > 350 && p < 450) y = cy - 15 * Math.sin((p-350)/100 * Math.PI); // T wave
        }
        
        // Add tiny noise
        y += (Math.random() - 0.5) * 2;
        
        wave.push(y);
        
        if (wave.length * speed > canvas.width) {
            wave.shift();
        }
        
        draw();
        requestAnimationFrame(update);
    }
    
    update();
});
