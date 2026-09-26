export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private volume = 0.4;
  private active = false;
  private voiceMaster: GainNode | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;
  private voiceOscillator: OscillatorNode | null = null;
  private voiceGeneration = 0;
  private voiceEnabled = true;
  private voicePaused = false;
  private voiceManifest: Record<string, string> = {};
  private readonly voiceBuffers = new Map<string, AudioBuffer>();
  private manifestLoaded = false;

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * 0.45;
      this.master.connect(this.context.destination);
      this.voiceMaster = this.context.createGain();
      this.voiceMaster.gain.value = this.volume * 0.8;
      this.voiceMaster.connect(this.context.destination);
      this.ambience = this.context.createGain();
      this.ambience.gain.value = 0;
      this.ambience.connect(this.master);
      for (const frequency of [49, 98, 151]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = frequency === 49 ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.value = frequency === 49 ? 0.11 : 0.015;
        oscillator.connect(gain).connect(this.ambience);
        oscillator.start();
      }
      const noise = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * 0.13;
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      source.buffer = noise;
      source.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      source.connect(filter).connect(this.ambience);
      source.start();
    }
    await this.context.resume();
    if (!this.manifestLoaded) {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}voices/manifest.json`);
        if (!response.ok) throw new Error('Voice manifest unavailable');
        this.voiceManifest = await response.json();
        this.manifestLoaded = true;
      } catch { console.warn('Voice clips unavailable; captions remain enabled.'); }
    }
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.voiceMaster && this.context) this.voiceMaster.gain.setTargetAtTime(this.voiceEnabled && !this.voicePaused ? value * 0.8 : 0, this.context.currentTime, 0.03);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.active ? value * 0.45 : 0, this.context.currentTime, 0.08);
  }

  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (!enabled) this.stopVoice();
    this.setVolume(this.volume);
  }

  pauseVoices(paused: boolean): void {
    if (this.voicePaused === paused) return;
    this.voicePaused = paused;
    if (paused) this.stopVoice();
    this.setVolume(this.volume);
  }

  stopVoice(): void {
    this.voiceGeneration++;
    try { this.voiceSource?.stop(); this.voiceOscillator?.stop(); } catch { /* Already ended. */ }
    this.voiceSource = null;
    this.voiceOscillator = null;
  }

  async speak(text: string, speaker = 'Cletus', outside = false): Promise<void> {
    if (!this.context || !this.voiceMaster || !this.voiceEnabled || this.voicePaused) return;
    const quoted = text.match(/"([^"]+)"/);
    const line = quoted ? quoted[1] : text;
    const path = this.voiceManifest[line];
    if (!path) return;
    this.stopVoice();
    const generation = this.voiceGeneration;
    try {
      let buffer = this.voiceBuffers.get(path);
      if (!buffer) {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
        if (!response.ok) throw new Error('Voice clip unavailable');
        buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.voiceBuffers.set(path, buffer);
      }
      if (generation !== this.voiceGeneration || this.voicePaused || !this.voiceEnabled) return;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speaker === 'Darlene' ? 1.04 : speaker === 'Ray' ? 0.77 : speaker === 'Dale' ? 0.92 : 0.84;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = outside ? 1050 : 1450; filter.Q.value = 0.55;
      const distortion = this.context.createWaveShaper();
      const curve = new Float32Array(2048);
      for (let index = 0; index < curve.length; index++) {
        const sample = index * 2 / (curve.length - 1) - 1;
        curve[index] = Math.tanh(sample * 2.7) / Math.tanh(2.7);
      }
      distortion.curve = curve;
      const robotic = this.context.createGain();
      robotic.gain.value = 0.7;
      const oscillator = this.context.createOscillator();
      oscillator.frequency.value = speaker === 'Cletus' ? 39 : 29;
      const modulation = this.context.createGain(); modulation.gain.value = 0.3;
      oscillator.connect(modulation).connect(robotic.gain);
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -20; compressor.ratio.value = 5;
      const panner = this.context.createStereoPanner();
      panner.pan.value = outside ? speaker === 'Dale' ? -0.65 : 0.6 : 0.1;
      const gain = this.context.createGain(); gain.gain.value = outside ? 0.65 : 0.9;
      source.connect(filter).connect(distortion).connect(robotic).connect(compressor).connect(panner).connect(gain).connect(this.voiceMaster);
      this.voiceSource = source; this.voiceOscillator = oscillator;
      oscillator.start(); source.start();
      source.onended = () => {
        try { oscillator.stop(); } catch { /* Already stopped. */ }
        for (const node of [source, filter, distortion, robotic, compressor, panner, gain, oscillator, modulation]) node.disconnect();
        if (this.voiceSource === source) { this.voiceSource = null; this.voiceOscillator = null; }
      };
    } catch { console.warn('Voice playback failed; dialogue remains captioned.'); }
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    if (this.master && this.context) this.master.gain.setTargetAtTime(active ? this.volume * 0.45 : 0, this.context.currentTime, 0.03);
    if (this.ambience && this.context) this.ambience.gain.setTargetAtTime(active ? 1 : 0, this.context.currentTime, 0.16);
  }

  play(kind: 'drawer' | 'cloth' | 'take' | 'metal' | 'release' | 'alarm' | 'step' | 'door' | 'kiss'): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const metallic = kind === 'metal' || kind === 'release';
    const length = kind === 'alarm' ? 1.3 : kind === 'release' ? 0.65 : kind === 'door' ? 0.5 : 0.24;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * length), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / this.context.sampleRate;
      const envelope = Math.exp(-phase * (metallic ? 9 : 19));
      samples[index] = kind === 'kiss'
        ? ((Math.random() * 2 - 1) * 0.1 + Math.sin(phase * 1600 - phase * phase * 1800) * 0.2) * Math.exp(-phase * 27)
        : kind === 'alarm'
        ? Math.sin(phase * 2300 + Math.sin(phase * 28) * 13) * Math.sin(Math.PI * phase / length) * 0.19
        : ((Math.random() * 2 - 1) * 0.18 + (metallic ? Math.sin(phase * 3900) * Math.sin(phase * 1630) * 0.2 : 0)) * envelope;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = metallic ? 4700 : kind === 'step' ? 180 : kind === 'door' ? 650 : kind === 'cloth' ? 480 : 1900;
    const panner = this.context.createStereoPanner();
    panner.pan.value = kind === 'step' || kind === 'door' ? 0.65 : kind === 'alarm' ? -0.3 : 0;
    source.connect(filter).connect(panner).connect(this.master);
    source.start(now);
    source.onended = () => { source.disconnect(); filter.disconnect(); panner.disconnect(); };
  }

  dispose(): void { this.stopVoice(); void this.context?.close(); }
}