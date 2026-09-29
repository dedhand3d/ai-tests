import { MidiPlayer } from './midi';
import type { Sound } from './state';

export class AudioEngine {
  private context: AudioContext | null = null;
  private music: MidiPlayer | null = null;
  private musicMaster: GainNode | null = null;
  private musicPending = false;
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
      this.musicMaster = this.context.createGain();
      this.musicMaster.gain.value = this.volume * 0.9;
      this.musicMaster.connect(this.context.destination);
      this.music = new MidiPlayer(this.context, this.musicMaster);
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
    await this.loadManifest();
  }

  private async loadManifest(): Promise<void> {
    if (this.manifestLoaded) return;
    try {
      // Revalidate every time: regenerating voices renumbers the clips, and a stale cached manifest mutes them.
      const response = await fetch(`${import.meta.env.BASE_URL}voices/manifest.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Voice manifest unavailable (${response.status})`);
      this.voiceManifest = await response.json();
      this.manifestLoaded = true;
    } catch (error) { console.warn('Voice clips unavailable; captions remain enabled.', error); }
  }

  setVolume(value: number): void {
    this.volume = value;
    if (this.voiceMaster && this.context) this.voiceMaster.gain.setTargetAtTime(this.voiceEnabled && !this.voicePaused ? value * 0.8 : 0, this.context.currentTime, 0.03);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.active ? value * 0.45 : 0, this.context.currentTime, 0.08);
    if (this.musicMaster && this.context) this.musicMaster.gain.setTargetAtTime(value * 0.9, this.context.currentTime, 0.05);
  }

  get musicPlaying(): boolean { return this.musicPending || (this.music?.playing ?? false); }

  async playMusic(url: string, from: number, duration: number): Promise<void> {
    if (!this.music || duration <= 0.2 || this.musicPending) return;
    this.musicPending = true;
    try {
      await this.music.load(url);
      if (this.musicPending) this.music.play(from, duration);
    } catch { console.warn('Dance music unavailable.'); }
    this.musicPending = false;
  }

  stopMusic(): void { this.musicPending = false; this.music?.stop(); }

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
    await this.loadManifest();
    const path = this.voiceManifest[line];
    if (!path) return;
    this.stopVoice();
    const generation = this.voiceGeneration;
    try {
      let buffer = this.voiceBuffers.get(path);
      if (!buffer) {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`, { cache: 'no-cache' });
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
    } catch (error) { console.warn('Voice playback failed; dialogue remains captioned.', path, error); }
  }

  // Ronnie's alarm: no words, just a frightened, strangled groan run through the same harsh vocoder chain.
  private groan(excited: boolean): void {
    const context = this.context!;
    const now = context.currentTime;
    const out = context.createGain();
    out.gain.value = 0.55;
    const panner = context.createStereoPanner();
    panner.pan.value = -0.35;
    out.connect(panner).connect(this.master!);
    const cries = excited ? [[0, 0.5, 150, 240], [0.55, 0.55, 170, 280]] : [[0, 0.75, 128, 96], [0.8, 0.9, 110, 185], [1.75, 0.8, 175, 90]];
    for (const [start, length, from, to] of cries) {
      const at = now + start;
      const voice = context.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(from, at);
      voice.frequency.linearRampToValueAtTime((from + to) / 2 + 25, at + length * 0.45);
      voice.frequency.linearRampToValueAtTime(to, at + length);
      const vibrato = context.createOscillator();
      const depth = context.createGain();
      vibrato.frequency.value = 6.5; depth.gain.value = 7;
      vibrato.connect(depth).connect(voice.frequency);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(1, at + 0.07);
      envelope.gain.setValueAtTime(1, at + length * 0.7);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
      // Two formants sliding from "uh" to "aah", like a mouth opening on the cry.
      const mix = context.createGain();
      for (const [f0, f1, q] of [[520, 780, 6], [950, 1250, 8]]) {
        const formant = context.createBiquadFilter();
        formant.type = 'bandpass';
        formant.Q.value = q;
        formant.frequency.setValueAtTime(f0, at);
        formant.frequency.linearRampToValueAtTime(f1, at + length * 0.5);
        formant.frequency.linearRampToValueAtTime(f0, at + length);
        voice.connect(formant).connect(mix);
      }
      const crush = context.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let index = 0; index < curve.length; index++) curve[index] = Math.tanh((index / 511.5 - 1) * 4);
      crush.curve = curve;
      const ring = context.createGain();
      ring.gain.value = 0.6;
      const carrier = context.createOscillator();
      carrier.frequency.value = 33;
      const carrierDepth = context.createGain();
      carrierDepth.gain.value = 0.4;
      carrier.connect(carrierDepth).connect(ring.gain);
      mix.connect(envelope).connect(crush).connect(ring).connect(out);
      for (const oscillator of [voice, vibrato, carrier]) { oscillator.start(at); oscillator.stop(at + length + 0.05); }
    }
    // The buzzer underneath.
    for (let beep = 0; beep < (excited ? 3 : 4); beep++) {
      const at = now + 0.2 + beep * 0.45;
      const buzzer = context.createOscillator();
      const gain = context.createGain();
      buzzer.type = 'square';
      buzzer.frequency.value = 610;
      gain.gain.setValueAtTime(0.05, at);
      gain.gain.setValueAtTime(0, at + 0.18);
      buzzer.connect(gain).connect(out);
      buzzer.start(at); buzzer.stop(at + 0.2);
    }
    window.setTimeout(() => { out.disconnect(); panner.disconnect(); }, 3500);
  }

  // Door banging off the wall, plus a dissonant stab so it lands as a scare.
  private slam(): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = 0.7;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      const boom = Math.sin(2 * Math.PI * (70 - phase * 40) * phase) * Math.exp(-phase * 7);
      const crack = (Math.random() * 2 - 1) * Math.exp(-phase * 30);
      const rattle = (Math.random() * 2 - 1) * Math.exp(-phase * 5) * (Math.sin(phase * 190) > 0.6 ? 0.5 : 0.05);
      samples[index] = boom * 0.9 + crack * 0.8 + rattle * 0.35;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = 1.3;
    const panner = context.createStereoPanner();
    panner.pan.value = 0.45;
    source.connect(gain).connect(panner).connect(this.master!);
    source.start(now);
    for (const frequency of [311, 329.6, 466]) {
      const stab = context.createOscillator();
      const envelope = context.createGain();
      stab.type = 'sawtooth';
      stab.frequency.value = frequency;
      envelope.gain.setValueAtTime(0.045, now);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      stab.connect(envelope).connect(this.master!);
      stab.start(now); stab.stop(now + 0.95);
    }
    source.onended = () => { source.disconnect(); gain.disconnect(); panner.disconnect(); };
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    if (this.master && this.context) this.master.gain.setTargetAtTime(active ? this.volume * 0.45 : 0, this.context.currentTime, 0.03);
    if (this.ambience && this.context) this.ambience.gain.setTargetAtTime(active ? 1 : 0, this.context.currentTime, 0.16);
  }

  play(kind: Sound): void {
    if (!this.context || !this.master) return;
    if (kind === 'alarm' || kind === 'whoop') { this.groan(kind === 'whoop'); return; }
    if (kind === 'slam') { this.slam(); return; }
    const now = this.context.currentTime;
    const metallic = kind === 'metal' || kind === 'release';
    const length = kind === 'vomit' ? 2.2 : kind === 'chop' ? 0.45 : kind === 'release' ? 0.65 : kind === 'door' ? 0.5 : 0.24;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * length), this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let wobble = 0;
    for (let index = 0; index < samples.length; index++) {
      const phase = index / this.context.sampleRate;
      const envelope = Math.exp(-phase * (metallic ? 9 : 19));
      if (kind === 'vomit') {
        // Two dry heaves, then the splatter.
        const heave = (start: number) => phase > start && phase < start + 0.35 ? Math.sin(Math.PI * (phase - start) / 0.35) : 0;
        wobble += (95 + Math.sin(phase * 31) * 40) / this.context.sampleRate;
        const throat = Math.sin(wobble * Math.PI * 2) * 0.5 + (Math.random() * 2 - 1) * 0.35;
        const splash = phase > 1.05 ? (Math.random() * 2 - 1) * Math.exp(-(phase - 1.05) * 2.4) * (0.6 + Math.sin(phase * 60) * 0.3) : 0;
        samples[index] = throat * (heave(0.05) + heave(0.5) * 0.8 + heave(0.95) * 1.2) * 0.3 + splash * 0.3;
        continue;
      }
      samples[index] = kind === 'kiss'
        ? ((Math.random() * 2 - 1) * 0.1 + Math.sin(phase * 1600 - phase * phase * 1800) * 0.2) * Math.exp(-phase * 27)
        : kind === 'chop'
        ? ((Math.random() * 2 - 1) * 0.5 + Math.sin(phase * 520) * 0.4) * Math.exp(-phase * 14)
        :((Math.random() * 2 - 1) * 0.18 + (metallic ? Math.sin(phase * 3900) * Math.sin(phase * 1630) * 0.2 : 0)) * envelope;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = metallic ? 4700 : kind === 'vomit' ? 1400 : kind === 'chop' ? 1100 : kind === 'step' ? 180 : kind === 'door' ? 650 : kind === 'cloth' ? 480 : 1900;
    const panner = this.context.createStereoPanner();
    panner.pan.value = kind === 'step' || kind === 'door' || kind === 'chop' ? 0.65 : 0;
    source.connect(filter).connect(panner).connect(this.master);
    source.start(now);
    source.onended = () => { source.disconnect(); filter.disconnect(); panner.disconnect(); };
  }

  dispose(): void { this.stopVoice(); this.stopMusic(); void this.context?.close(); }
}