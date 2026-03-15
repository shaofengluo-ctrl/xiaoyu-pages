document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the dreams page
    const playerContainer = document.querySelector('.dream-player-container');
    if (!playerContainer) return;

    if (typeof dreamPlaylist === 'undefined' || !dreamPlaylist || dreamPlaylist.length === 0) {
        document.getElementById('now-playing-title').innerText = "暂无潜意识信号";
        return;
    }

    let currentIndex = 0;
    let isPlaying = false;
    let isRandom = false;
    let isLoopAll = true; // Auto-play next by default

    const audio = document.getElementById('dream-audio-element');
    const titleEl = document.getElementById('now-playing-title');
    const dateEl = document.getElementById('now-playing-date');
    const playPauseBtn = document.getElementById('btn-play-pause');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const randomBtn = document.getElementById('btn-random');
    const loopBtn = document.getElementById('btn-loop');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const playlistContainer = document.getElementById('playlist-container');

    // Visualizer Setup
    const canvas = document.getElementById('audio-visualizer');
    const ctx = canvas.getContext('2d');
    let audioCtx, analyser, source, dataArray, bufferLength;
    let visualizerInitialized = false;
    let animationId;

    // Build playlist UI
    function renderPlaylist() {
        playlistContainer.innerHTML = '';
        dreamPlaylist.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'playlist-item';
            if (index === currentIndex) el.classList.add('playing');
            
            el.innerHTML = `
                <div class="item-icon">🔊</div>
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-date">${item.date}</div>
                </div>
            `;
            el.addEventListener('click', () => {
                loadTrack(index);
                playTrack();
            });
            playlistContainer.appendChild(el);
        });
    }

    function initVisualizer() {
        if (visualizerInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            analyser.fftSize = 128;
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            visualizerInitialized = true;
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            drawVisualizer();
        } catch (e) {
            console.error("Audio visualizer failed to init", e);
        }
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    function drawVisualizer() {
        animationId = requestAnimationFrame(drawVisualizer);
        if (!visualizerInitialized || !isPlaying) return;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 255.0;
            const barHeight = v * canvas.height;

            // Cyberpunk color gradient (cyan to purple)
            const r = Math.floor(v * 138); // 0 -> 138
            const g = Math.floor(v * 43 + 200); // cyan/greenish
            const b = 255;
            
            ctx.fillStyle = `rgba(0, 255, 255, ${v + 0.1})`; // fallback
            if (i % 2 === 0) {
                 ctx.fillStyle = `rgba(188, 19, 254, ${v + 0.1})`; // purple
            }

            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function loadTrack(index) {
        currentIndex = index;
        const track = dreamPlaylist[currentIndex];
        audio.src = track.file;
        titleEl.innerText = track.title;
        dateEl.innerText = track.date;
        
        // Update playlist UI
        const items = playlistContainer.querySelectorAll('.playlist-item');
        items.forEach(el => el.classList.remove('playing'));
        if(items[currentIndex]) items[currentIndex].classList.add('playing');
        
        // Reset progress
        progressBar.style.width = '0%';
        timeCurrent.innerText = "00:00";
        timeTotal.innerText = "00:00";
    }

    function playTrack() {
        if (!visualizerInitialized) initVisualizer();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        audio.play().then(() => {
            isPlaying = true;
            playPauseBtn.innerText = "⏸";
        }).catch(e => {
            console.error("Playback failed:", e);
        });
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        playPauseBtn.innerText = "▶";
    }

    function togglePlay() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function playNext() {
        if (isRandom) {
            currentIndex = Math.floor(Math.random() * dreamPlaylist.length);
        } else {
            currentIndex = (currentIndex + 1) % dreamPlaylist.length;
        }
        loadTrack(currentIndex);
        playTrack();
    }

    function playPrev() {
        if (isRandom) {
            currentIndex = Math.floor(Math.random() * dreamPlaylist.length);
        } else {
            currentIndex = (currentIndex - 1 + dreamPlaylist.length) % dreamPlaylist.length;
        }
        loadTrack(currentIndex);
        playTrack();
    }

    // Events
    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    randomBtn.addEventListener('click', () => {
        isRandom = !isRandom;
        randomBtn.classList.toggle('active', isRandom);
    });

    loopBtn.addEventListener('click', () => {
        isLoopAll = !isLoopAll;
        loopBtn.classList.toggle('active', isLoopAll);
    });

    audio.addEventListener('timeupdate', () => {
        const p = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${p}%`;
        timeCurrent.innerText = formatTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        timeTotal.innerText = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if (isLoopAll) {
            playNext();
        } else {
            isPlaying = false;
            playPauseBtn.innerText = "▶";
        }
    });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    });

    // Init
    renderPlaylist();
    loadTrack(0);
});
