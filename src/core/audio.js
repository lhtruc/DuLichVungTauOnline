/**
 * Procedural Web Audio API sound engine + Vietnamese Web Speech API Tour Guide.
 * Zero external audio assets required: synthesizes 4-stroke scooter engine,
 * dual-tone horn, ocean surf waves, and sea breeze dynamically.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.speaking = false;
    this.engineGain = null;
    this.engineOsc = null;
    this.subOsc = null;
    this.seaGain = null;
    this.windGain = null;
    this.windFilter = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    // 1. Scooter engine: sawtooth + triangle sub-oscillator through lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    this.engineFilter = filter;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 34;

    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.value = 68;

    this.engineOsc.connect(filter);
    this.subOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.subOsc.start();

    // 2. White noise buffer for ocean waves & wind
    const bufSize = this.ctx.sampleRate * 3;
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    // Ocean surf (bandpass modulated)
    const seaSrc = this.ctx.createBufferSource();
    seaSrc.buffer = noiseBuf;
    seaSrc.loop = true;
    const seaFilter = this.ctx.createBiquadFilter();
    seaFilter.type = 'bandpass';
    seaFilter.frequency.value = 320;
    seaFilter.Q.value = 0.7;
    this.seaFilter = seaFilter;
    this.seaGain = this.ctx.createGain();
    this.seaGain.gain.value = 0;
    seaSrc.connect(seaFilter);
    seaFilter.connect(this.seaGain);
    this.seaGain.connect(this.ctx.destination);
    seaSrc.start();

    // Wind rush (increases with riding speed)
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = noiseBuf;
    windSrc.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 1.2;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    windSrc.start();

    this.enabled = true;
  }

  toggle() {
    if (!this.ctx) {
      this.init();
      return this.enabled;
    }
    this.enabled = !this.enabled;
    if (!this.enabled) {
      const now = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.seaGain.gain.setTargetAtTime(0, now, 0.08);
      this.windGain.gain.setTargetAtTime(0, now, 0.08);
      this.stopSpeak();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.enabled;
  }

  update(kmh, timeSec, flyMode = false) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const spdRatio = Math.min(1, kmh / 85);

    // Engine pitch & volume
    const baseFreq = 28 + spdRatio * 88 + Math.sin(timeSec * 28) * 1.4;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.subOsc.frequency.setTargetAtTime(baseFreq * 2, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(150 + spdRatio * 650, now, 0.06);
    const engVol = flyMode ? 0.005 : (0.025 + spdRatio * 0.065);
    this.engineGain.gain.setTargetAtTime(engVol, now, 0.08);

    // Ocean wave ebb and flow
    const waveCycle = 0.5 + 0.5 * Math.sin(timeSec * 0.85);
    this.seaFilter.frequency.setTargetAtTime(220 + waveCycle * 260, now, 0.15);
    this.seaGain.gain.setTargetAtTime(0.018 + waveCycle * 0.024, now, 0.15);

    // Wind noise proportional to speed
    this.windFilter.frequency.setTargetAtTime(400 + spdRatio * 900, now, 0.08);
    this.windGain.gain.setTargetAtTime(spdRatio * spdRatio * 0.055, now, 0.08);
  }

  /** Classic Vietnamese scooter dual-tone horn ("Bíp bíp!"). */
  horn() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o1.type = 'sawtooth';
    o2.type = 'square';
    o1.frequency.value = 440;
    o2.frequency.value = 554.37;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950;

    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.11, now + 0.015);
    g.gain.setValueAtTime(0.11, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    o1.connect(filter);
    o2.connect(filter);
    filter.connect(g);
    g.connect(this.ctx.destination);
    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.23);
    o2.stop(now + 0.23);
  }

  /** Speaks POI introduction in Vietnamese using Web Speech API. */
  speakPoi(poi, onEnd) {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const content = `${poi.name}. ${poi.text}. Điểm nổi bật: ${(poi.facts || []).join('. ')}.`;
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = 'vi-VN';
    utter.rate = 1.02;
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang && v.lang.toLowerCase().includes('vi'));
    if (viVoice) utter.voice = viVoice;
    this.speaking = true;
    utter.onend = () => { this.speaking = false; if (onEnd) onEnd(); };
    utter.onerror = () => { this.speaking = false; if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utter);
    return true;
  }

  stopSpeak() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.speaking = false;
  }
}
