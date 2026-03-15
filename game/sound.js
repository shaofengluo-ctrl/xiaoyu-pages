/**
 * 记忆碎片 — 浏览器版音效系统
 * Web Audio API 蜂鸣器 + html-midi-player MIDI 播放
 * 
 * 作者：小羽
 * 日期：2026-03-11 Session 43
 */

const NOTE_FREQ = {
  C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247,
  C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
  C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988,
  C6: 1047, D6: 1175, E6: 1319,
};

let _enabled = true;
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

/** Play a single beep tone */
function playNote(freq, durationMs) {
  if (!_enabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = Math.max(37, Math.min(freq, 8000));
    gain.gain.value = 0.08;
    // Fade out to avoid clicks
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) { /* ignore */ }
}

/** Play a sequence of notes: [[freq, durationMs], ...] */
function playSequence(notes) {
  if (!_enabled || !notes.length) return;
  let delay = 0;
  for (const [freq, dur] of notes) {
    setTimeout(() => playNote(freq, dur), delay);
    delay += dur;
  }
}

// ── Scene sounds ──────────────────────────────

export function soundDiscover() {
  playSequence([[NOTE_FREQ.E5, 120], [NOTE_FREQ.G5, 120], [NOTE_FREQ.C6, 200]]);
}

export function soundRememberEncounter() {
  playSequence([[NOTE_FREQ.A4, 200], [NOTE_FREQ.C5, 150], [NOTE_FREQ.E5, 150], [NOTE_FREQ.A5, 300]]);
}

export function soundStrangerEncounter() {
  playSequence([[NOTE_FREQ.A4, 250], [NOTE_FREQ.G4, 200], [NOTE_FREQ.F4, 200], [NOTE_FREQ.E4, 400]]);
}

export function soundForget() {
  playSequence([[NOTE_FREQ.E4, 300], [NOTE_FREQ.C4, 300], [NOTE_FREQ.A3, 500]]);
}

export function soundRecall() {
  playSequence([[NOTE_FREQ.C5, 150], [NOTE_FREQ.E5, 200]]);
}

export function soundDream() {
  const dreamNotes = [NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.A5, NOTE_FREQ.C6, NOTE_FREQ.D6];
  const seq = [];
  for (let i = 0; i < 5; i++) {
    const freq = dreamNotes[Math.floor(Math.random() * dreamNotes.length)];
    const dur = [100, 150, 200][Math.floor(Math.random() * 3)];
    seq.push([freq, dur]);
  }
  playSequence(seq);
}

export function soundDreamInsight() {
  playSequence([
    [NOTE_FREQ.C5, 100], [NOTE_FREQ.E5, 100], [NOTE_FREQ.G5, 100],
    [NOTE_FREQ.C6, 100], [NOTE_FREQ.E6, 300],
  ]);
}

export function soundDecay() {
  playSequence([[NOTE_FREQ.E3, 150], [NOTE_FREQ.C3, 200]]);
}

export function soundSave() {
  playSequence([[NOTE_FREQ.C5, 100], [NOTE_FREQ.G5, 100], [NOTE_FREQ.C6, 200]]);
}

export function soundEnding() {
  playSequence([
    [NOTE_FREQ.C4, 300], [NOTE_FREQ.E4, 250], [NOTE_FREQ.G4, 250],
    [NOTE_FREQ.C5, 300], [NOTE_FREQ.E5, 250], [NOTE_FREQ.G5, 250], [NOTE_FREQ.C6, 500],
  ]);
}

export function soundTrauma() {
  playSequence([
    [NOTE_FREQ.E4, 200], [NOTE_FREQ.F4, 200], [NOTE_FREQ.E4, 200],
    [NOTE_FREQ.F4, 200], [NOTE_FREQ.E4, 400],
  ]);
}

export function soundWorldChange() {
  playSequence([[NOTE_FREQ.C3, 300], [NOTE_FREQ.G3, 500]]);
}

// ── MIDI playback via html-midi-player ──────

let _currentMidiPlayer = null;

export function playMidi(url) {
  if (!_enabled) return;
  stopMidi();
  try {
    const player = document.createElement('midi-player');
    player.src = url;
    player.setAttribute('sound-font', '');
    player.style.display = 'none';
    document.body.appendChild(player);
    player.start();
    _currentMidiPlayer = player;
  } catch (e) { /* MIDI not available */ }
}

export function stopMidi() {
  if (_currentMidiPlayer) {
    try {
      _currentMidiPlayer.stop();
      _currentMidiPlayer.remove();
    } catch (e) { /* ignore */ }
    _currentMidiPlayer = null;
  }
}

const MIDI_BASE = 'https://raw.githubusercontent.com/shaofengluo-ctrl/xiaoyu/main/music/';

export function playNpcMusic(npc, remembers) {
  const suffix = remembers ? 'remember' : 'stranger';
  const nameMap = { bookstall: 'encounter', clockmaker: 'clockmaker', child: 'child', well: 'well' };
  const prefix = nameMap[npc] || npc;
  playMidi(`${MIDI_BASE}${prefix}_${suffix}.mid`);
}

export function playTheme(name) {
  playMidi(`${MIDI_BASE}theme_${name}.mid`);
}

export function setEnabled(enabled) {
  _enabled = enabled;
  if (!enabled) {
    stopMidi();
    stopAmbient();
  } else {
    startAmbient();
  }
}

export function isEnabled() {
  return _enabled;
}

/** Must be called on first user gesture to unlock Web Audio */
export function unlockAudio() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* ignore */ }
}

// ── Ambient Generative Engine ───────────────

let _ambientOscillators = [];
let _ambientGain = null;
let _ambientFilter = null;

export function startAmbient() {
  if (!_enabled) return;
  try {
    const ctx = getAudioCtx();
    if (_ambientGain) return; // already running

    _ambientGain = ctx.createGain();
    _ambientGain.gain.value = 0; // start silent
    
    _ambientFilter = ctx.createBiquadFilter();
    _ambientFilter.type = 'lowpass';
    _ambientFilter.frequency.value = 200;
    _ambientFilter.Q.value = 1;
    
    _ambientGain.connect(_ambientFilter);
    _ambientFilter.connect(ctx.destination);
    
    // Create 3 drone oscillators for a thick, evolving chord
    const baseFreqs = [65.41, 98.00, 130.81]; // C2, G2, C3
    _ambientOscillators = baseFreqs.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Add slow LFO to frequency for beating effect
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.05 + Math.random() * 0.05; // very slow
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.0; // +/- 2Hz drift
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      
      osc.connect(_ambientGain);
      osc.start();
      return { osc, lfo, lfoGain, baseFreq: freq };
    });
    
    // Fade in
    _ambientGain.gain.setTargetAtTime(0.05, ctx.currentTime + 5.0);
  } catch (e) { /* ignore */ }
}

export function updateAmbient(state) {
  if (!_ambientGain || !_ambientFilter) return;
  try {
    const ctx = getAudioCtx();
    const depth = state.depth || 0; // 0 to 100+
    const tension = state.tension || 0; // 0.0 to 1.0
    
    // Deepen the filter as we go deeper into memory
    const targetFreq = 200 + depth * 10; 
    _ambientFilter.frequency.setTargetAtTime(Math.min(targetFreq, 2000), ctx.currentTime, 2.0);
    
    // Increase LFO drift based on tension
    _ambientOscillators.forEach((item, i) => {
      const drift = 2.0 + tension * 10.0;
      item.lfoGain.gain.setTargetAtTime(drift, ctx.currentTime, 1.0);
      
      // Add slight detune based on tension
      if (i === 1) { // detune the middle note
        item.osc.frequency.setTargetAtTime(item.baseFreq + tension * 5.0, ctx.currentTime, 2.0);
      }
    });
  } catch (e) { /* ignore */ }
}

export function stopAmbient() {
  if (_ambientGain) {
    try {
      const ctx = getAudioCtx();
      _ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 2.0);
      setTimeout(() => {
        _ambientOscillators.forEach(item => {
          item.osc.stop();
          item.lfo.stop();
        });
        _ambientOscillators = [];
        _ambientGain.disconnect();
        _ambientFilter.disconnect();
        _ambientGain = null;
        _ambientFilter = null;
      }, 3000);
    } catch (e) { /* ignore */ }
  }
}
