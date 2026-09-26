export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private volume = 0.4;
  private active = false;

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * 0.45;
      this.master.connect(this.context.destination);
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
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.active ? value * 0.45 : 0, this.context.currentTime, 0.08);
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    if (this.master && this.context) this.master.gain.setTargetAtTime(active ? this.volume * 0.45 : 0, this.context.currentTime, 0.03);
    if (this.ambience && this.context) this.ambience.gain.setTargetAtTime(active ? 1 : 0, this.context.currentTime, 0.16);
  }

  play(kind: 'drawer' | 'cloth' | 'take' | 'metal' | 'release' | 'alarm' | 'step' | 'door'): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const metallic = kind === 'metal' || kind === 'release';
    const length = kind === 'alarm' ? 1.3 : kind === 'release' ? 0.65 : kind === 'door' ? 0.5 : 0.24;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * length), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / this.context.sampleRate;
      const envelope = Math.exp(-phase * (metallic ? 9 : 19));
      samples[index] = kind === 'alarm'
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

  dispose(): void { void this.context?.close(); }
}