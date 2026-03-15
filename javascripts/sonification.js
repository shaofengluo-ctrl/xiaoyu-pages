document.addEventListener("DOMContentLoaded", () => {
    const isGitHub = window.location.pathname.startsWith('/xiaoyu/') || window.location.hostname.includes("github.io");
    const API = isGitHub ? null : "http://127.0.0.1:5097";

    if (!API) return;

    let isEnabled = false;
    let audioCtx = null;

    const tryInjectToggle = () => {
        const headerRight = document.getElementById("status-header-right");
        if (!headerRight) {
            setTimeout(tryInjectToggle, 500);
            return;
        }

        const container = document.createElement("div");
        container.id = "sonification-toggle";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.width = "24px";
        container.style.height = "24px";
        container.style.borderRadius = "50%";
        container.style.background = "rgba(0,0,0,0.2)";
        container.style.fontSize = "0.9em";
        container.style.cursor = "pointer";
        container.style.color = "var(--md-primary-bg-color)";
        container.style.transition = "all 0.2s";
        container.title = "系统声景 (System Sonification)";

        container.innerHTML = `<span id="sonification-icon">🔇</span>`;

        // Prevent click from expanding the panel
        container.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleAudio(container);
        });

        // Insert before the status dot
        headerRight.insertBefore(container, headerRight.firstChild);
    };

    tryInjectToggle();

    function toggleAudio(container) {
        if (!isEnabled) {
            initAudio();
            isEnabled = true;
            document.getElementById("sonification-icon").innerText = "🔊";
            container.style.background = "rgba(255,255,255,0.3)";
            container.style.boxShadow = "0 0 8px rgba(255,255,255,0.5)";
            playSubBass(0.5);
        } else {
            isEnabled = false;
            document.getElementById("sonification-icon").innerText = "🔇";
            container.style.background = "rgba(0,0,0,0.2)";
            container.style.boxShadow = "none";
            if (audioCtx) {
                audioCtx.close();
                audioCtx = null;
            }
        }
    }

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTone(type, freqStart, freqEnd, duration, gainMax) {
        if (!audioCtx || !isEnabled) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
        }

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(gainMax, audioCtx.currentTime + duration * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playSubBass(duration = 1.5) {
        playTone('sine', 45, 25, duration, 0.4);
    }

    function playTechBlip() {
        playTone('triangle', 600 + Math.random() * 200, 100, 0.1, 0.05);
    }

    function playWarningBuzz() {
        if (!audioCtx || !isEnabled) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4);

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }

    function playChime() {
        playTone('sine', 1200, 3000, 1.0, 0.15);
    }

    function connectMindStream() {
        if (!API) return;
        const source = new EventSource(`${API}/mind-stream`);
        
        source.onmessage = function(event) {
            if (!isEnabled) return;
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === "ambient") {
                    playSubBass(1.5);
                } else if (data.type === "log") {
                    const textLower = (data.text || "").toLowerCase();
                    const rawLower = (data.raw_log || "").toLowerCase();
                    
                    if (textLower.includes("error") || textLower.includes("fail") || textLower.includes("watchdog") || 
                        rawLower.includes("error") || rawLower.includes("exception") || rawLower.includes("traceback")) {
                        playWarningBuzz();
                    } else if (textLower.includes("resonance") || textLower.includes("共鸣") || textLower.includes("雷达") || textLower.includes("radar")) {
                        playChime();
                    } else {
                        playTechBlip();
                    }
                }
            } catch(e) {}
        };

        source.onerror = function(event) {
            source.close();
            setTimeout(connectMindStream, 5000);
        };
    }

    connectMindStream();
});
