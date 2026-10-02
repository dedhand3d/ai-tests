import { MidiPlayer } from './midi';
import type { Sound } from './state';

// How the music bus sounds: straight (the dance), a cheap boombox (Dale's radio), or blown out and
// clipping while you are high on the bulb.
export type MusicMode = 'clean' | 'radio' | 'fried';
// The TV bus level, relative to the volume slider (dialogue sits at 0.8).
const TV_BUS = 0.8;
const MUSIC_MODES: Record<MusicMode, { drive: number; curve: number; low: number; high: number; out: number }> = {
  clean: { drive: 1, curve: 0, low: 20000, high: 10, out: 1 },
  radio: { drive: 1.2, curve: 1.6, low: 4200, high: 150, out: 0.85 },
  fried: { drive: 6, curve: 30, low: 6500, high: 80, out: 1.6 },
};
function shaperCurve(hardness: number): Float32Array | null {
  if (hardness <= 0) return null;
  const curve = new Float32Array(2048);
  for (let index = 0; index < curve.length; index++) {
    const sample = index * 2 / (curve.length - 1) - 1;
    curve[index] = Math.tanh(sample * hardness) / Math.tanh(hardness);
  }
  return curve;
}

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
      // The TV gets its own bus at dialogue level: on the effects bus it was buried 20 dB under the voices.
      // Like the effects, it goes quiet whenever the game is not running.
      this.tvBus = this.context.createGain();
      this.tvBus.gain.value = 0;
      this.tvBus.connect(this.context.destination);
      if (import.meta.env.DEV) {
        this.voiceMeter = this.meter(this.voiceMaster);
        this.tvMeter = this.meter(this.tvBus);
      }
      this.musicMaster = this.context.createGain();
      this.musicMaster.gain.value = this.volume * 0.9;
      this.musicMaster.connect(this.context.destination);
      // Song -> drive -> shaper -> tone -> level -> volume. setMusicMode reshapes it.
      this.musicDrive = this.context.createGain();
      this.musicShaper = this.context.createWaveShaper();
      this.musicShaper.oversample = '2x';
      this.musicLow = this.context.createBiquadFilter();
      this.musicLow.type = 'lowpass';
      this.musicHigh = this.context.createBiquadFilter();
      this.musicHigh.type = 'highpass';
      this.musicOut = this.context.createGain();
      this.musicDrive.connect(this.musicShaper).connect(this.musicHigh).connect(this.musicLow).connect(this.musicOut).connect(this.musicMaster);
      this.music = new MidiPlayer(this.context, this.musicDrive);
      this.applyMusicMode(true);
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
    if (this.tvBus && this.context) this.tvBus.gain.setTargetAtTime(this.active ? value * TV_BUS : 0, this.context.currentTime, 0.08);
    if (this.musicMaster && this.context) this.musicMaster.gain.setTargetAtTime(value * 0.9, this.context.currentTime, 0.05);
  }

  // Dev only: an analyser hanging off a bus, so headless checks can read real output levels.
  private meter(node: AudioNode): AnalyserNode {
    const context = this.context!;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const sink = context.createGain();
    sink.gain.value = 0;
    node.connect(analyser).connect(sink).connect(context.destination);
    return analyser;
  }

  private static rms(analyser: AnalyserNode | null): number {
    if (!analyser) return -1;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  }

  // Dev only: RMS of what the TV and the voices are putting out right now, after volume.
  levels(): { tv: number; voice: number } { return { tv: AudioEngine.rms(this.tvMeter), voice: AudioEngine.rms(this.voiceMeter) }; }

  private tvBus: GainNode | null = null;
  private tvMeter: AnalyserNode | null = null;
  private voiceMeter: AnalyserNode | null = null;

  // The TV's sound, as a cheap little set across a small room:
  //   the airing clip's WAV + static hiss -> a boxy, crunchy 3-inch speaker -> volume/mute
  //     -> a 3D panner at the set (louder and clearer as you get closer, placed left/right as you look around)
  //     -> plus a send into a short, dull trailer-room echo that is there wherever you sit.
  // Its own bus at dialogue level; follows the volume slider and goes quiet with the game when paused.
  // The sound is a separate WAV per clip, never the video's own track: some browsers (VS Code's built-in one)
  // play an MP4's picture but cannot decode its AAC sound. WAV decodes everywhere, like the voices.
  attachTelevision(): void {
    if (!this.context || !this.master || this.tvGain) return;
    const context = this.context;
    try {
      const input = context.createGain();
      this.tvInput = input;
      // Snow: a looped bed of hiss, faded in while the set shows static.
      const hiss = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = hiss.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * 0.5;
      const hissSource = context.createBufferSource();
      hissSource.buffer = hiss;
      hissSource.loop = true;
      this.tvStatic = context.createGain();
      this.tvStatic.gain.value = 0;
      hissSource.connect(this.tvStatic).connect(input);
      hissSource.start();
      // The speaker: no bass, no air, a honk around 1.4 kHz, a little crunch when it is pushed.
      const lowCut = context.createBiquadFilter();
      lowCut.type = 'highpass'; lowCut.frequency.value = 320; lowCut.Q.value = 0.9;
      const highCut = context.createBiquadFilter();
      highCut.type = 'lowpass'; highCut.frequency.value = 4300; highCut.Q.value = 0.8;
      const honk = context.createBiquadFilter();
      honk.type = 'peaking'; honk.frequency.value = 1400; honk.Q.value = 1.1; honk.gain.value = 6;
      const crunch = context.createWaveShaper();
      crunch.curve = shaperCurve(1.8);
      this.tvGain = context.createGain();
      this.tvGain.gain.value = 0;
      input.connect(lowCut).connect(highCut).connect(honk).connect(crunch).connect(this.tvGain);
      // Where it is in the room. HRTF so it sits out there in front of (or beside) you, not in your head.
      this.tvPanner = context.createPanner();
      this.tvPanner.panningModel = 'HRTF';
      this.tvPanner.distanceModel = 'inverse';
      this.tvPanner.refDistance = 0.7;
      this.tvPanner.rolloffFactor = 2.2;
      this.tvPanner.maxDistance = 30;
      const bus = this.tvBus!;
      this.tvGain.connect(this.tvPanner).connect(bus);
      // The trailer: a short, dull, boxy echo off paneling and trash bags.
      const room = context.createConvolver();
      room.buffer = this.roomResponse(0.45);
      const send = context.createGain();
      send.gain.value = 0.11;
      this.tvGain.connect(send).connect(room).connect(bus);
      this.placeTelevision(this.tvAt[0], this.tvAt[1], this.tvAt[2]);
    } catch (error) { console.warn('TV sound unavailable.', error); }
  }

  // A stereo impulse response for a small, cluttered room: a few early slaps, then a quick dark decay.
  private roomResponse(seconds: number): AudioBuffer {
    const context = this.context!;
    const length = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let dark = 0;
      for (let index = 0; index < length; index++) {
        const time = index / context.sampleRate;
        dark = dark * 0.82 + (Math.random() * 2 - 1) * 0.18;
        data[index] = dark * Math.exp(-time * 9);
      }
      for (const [at, size] of [[0.007, 0.6], [0.013, 0.45], [0.021, 0.35], [0.034, 0.25]]) {
        data[Math.floor((at + channel * 0.0017) * context.sampleRate)] += size;
      }
    }
    return buffer;
  }

  // Where the set is (world coordinates). Kept so it can be applied once the audio graph exists.
  placeTelevision(x: number, y: number, z: number): void {
    this.tvAt = [x, y, z];
    const panner = this.tvPanner;
    if (!panner) return;
    if (panner.positionX) { panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z; } else panner.setPosition(x, y, z);
  }

  // Your ears: the camera's position, which way it faces and which way is up. Called every frame.
  setListener(position: [number, number, number], forward: [number, number, number], up: [number, number, number]): void {
    if (!this.context) return;
    const listener = this.context.listener;
    const at = this.context.currentTime;
    if (listener.positionX) {
      const glide = (param: AudioParam, value: number) => param.setTargetAtTime(value, at, 0.04);
      glide(listener.positionX, position[0]); glide(listener.positionY, position[1]); glide(listener.positionZ, position[2]);
      glide(listener.forwardX, forward[0]); glide(listener.forwardY, forward[1]); glide(listener.forwardZ, forward[2]);
      glide(listener.upX, up[0]); glide(listener.upY, up[1]); glide(listener.upZ, up[2]);
    } else {
      listener.setPosition(...position);
      listener.setOrientation(...forward, ...up);
    }
  }

  setTelevisionLevel(level: number): void {
    // Tuned against a voice line at the output: about as loud as dialogue from your seat, louder up close.
    if (this.tvGain && this.context) this.tvGain.gain.setTargetAtTime(level * 2.3, this.context.currentTime, 0.08);
  }

  setTelevisionStatic(level: number): void {
    if (this.tvStatic && this.context) this.tvStatic.gain.setTargetAtTime(level * 0.35, this.context.currentTime, 0.03);
  }

  // Keep the speaker playing what the set is showing, where the picture is. Called every frame with the set's
  // sound cue (or null for nothing: off, a card, snow) and whether the game is running.
  syncTelevision(cue: { src: string; time: number; next: string | null } | null, running: boolean): void {
    if (!this.context || !this.tvInput) return;
    if (cue?.next) void this.televisionSound(cue.next);
    const playing = this.tvVoice;
    if (!cue || !running) { if (playing) this.stopTelevisionSound(); return; }
    const buffer = this.tvSounds.get(cue.src);
    if (!buffer) { void this.televisionSound(cue.src); if (playing && playing.src !== cue.src) this.stopTelevisionSound(); return; }
    const at = this.context.currentTime;
    // Already playing this clip, close enough to the picture: leave it alone.
    if (playing && playing.src === cue.src && Math.abs(playing.from + (at - playing.started) - cue.time) < 0.2) return;
    this.stopTelevisionSound();
    if (cue.time >= buffer.duration - 0.05) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    // A few milliseconds of fade so a cut or a resync never clicks.
    const fade = this.context.createGain();
    fade.gain.setValueAtTime(0, at);
    fade.gain.linearRampToValueAtTime(1, at + 0.015);
    source.connect(fade).connect(this.tvInput);
    source.start(at, Math.max(0, cue.time));
    source.onended = () => { source.disconnect(); fade.disconnect(); if (this.tvVoice?.source === source) this.tvVoice = null; };
    this.tvVoice = { src: cue.src, source, fade, from: Math.max(0, cue.time), started: at };
  }

  private stopTelevisionSound(): void {
    const playing = this.tvVoice;
    if (!playing || !this.context) return;
    this.tvVoice = null;
    const at = this.context.currentTime;
    playing.fade.gain.cancelScheduledValues(at);
    playing.fade.gain.setValueAtTime(playing.fade.gain.value, at);
    playing.fade.gain.linearRampToValueAtTime(0, at + 0.015);
    try { playing.source.stop(at + 0.02); } catch { /* Already stopped. */ }
  }

  // Fetch and decode a clip's sound once; later calls get the same buffer.
  private televisionSound(src: string): Promise<AudioBuffer | null> {
    let pending = this.tvLoading.get(src);
    if (!pending) {
      pending = (async () => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}${src}.wav`);
          if (!response.ok) throw new Error(`TV sound unavailable (${response.status})`);
          const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
          this.tvSounds.set(src, buffer);
          return buffer;
        } catch (error) { console.warn('TV sound unavailable.', src, error); return null; }
      })();
      this.tvLoading.set(src, pending);
    }
    return pending;
  }

  // Dev diagnostics: what the TV speaker is doing.
  televisionReport(): Record<string, unknown> {
    const playing = this.tvVoice;
    return {
      loaded: [...this.tvSounds.keys()],
      playing: playing && this.context ? `${playing.src}@${(playing.from + this.context.currentTime - playing.started).toFixed(2)}` : null,
      attached: Boolean(this.tvInput),
    };
  }

  private tvInput: GainNode | null = null;
  private tvVoice: { src: string; source: AudioBufferSourceNode; fade: GainNode; from: number; started: number } | null = null;
  private readonly tvSounds = new Map<string, AudioBuffer>();
  private readonly tvLoading = new Map<string, Promise<AudioBuffer | null>>();
  private tvGain: GainNode | null = null;
  private tvStatic: GainNode | null = null;
  private tvPanner: PannerNode | null = null;
  private tvAt: [number, number, number] = [0, 0, 0];
  private fireGain: GainNode | null = null;

  // A fire in the trailer: a looped bed of roar and random wet pops, louder as it grows.
  setFireLevel(level: number): void {
    if (!this.context || !this.master) return;
    if (!this.fireGain) {
      if (level <= 0) return;
      const context = this.context;
      const length = context.sampleRate * 4;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let rumble = 0;
      for (let index = 0; index < length; index++) {
        rumble = rumble * 0.985 + (Math.random() * 2 - 1) * 0.015;
        samples[index] = rumble * 3.5 + (Math.random() * 2 - 1) * 0.04;
      }
      // Pops and crackles: short sharp bursts scattered through the loop.
      for (let pop = 0; pop < 90; pop++) {
        const start = Math.floor(Math.random() * (length - 2000));
        const size = 0.2 + Math.random() * 0.6;
        const decay = 150 + Math.random() * 900;
        for (let offset = 0; offset < 1200; offset++) samples[start + offset] += (Math.random() * 2 - 1) * size * Math.exp(-offset / decay * 6);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3200;
      this.fireGain = context.createGain();
      this.fireGain.gain.value = 0;
      source.connect(filter).connect(this.fireGain).connect(this.master);
      source.start();
    }
    this.fireGain.gain.setTargetAtTime(level * 0.9, this.context.currentTime, level > 0 ? 0.4 : 0.08);
  }

  // Render a one-shot from a per-sample function and send it through an optional filter, level and pan.
  private oneShot(length: number, sample: (time: number) => number, options: { low?: number; high?: number; gain?: number; pan?: number } = {}): void {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = sample(index / context.sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const low = context.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = options.low ?? 20000;
    const high = context.createBiquadFilter();
    high.type = 'highpass'; high.frequency.value = options.high ?? 10;
    const gain = context.createGain();
    gain.gain.value = options.gain ?? 1;
    const panner = context.createStereoPanner();
    panner.pan.value = options.pan ?? 0;
    source.connect(low).connect(high).connect(gain).connect(panner).connect(this.master!);
    source.start();
    source.onended = () => { for (const node of [source, low, high, gain, panner]) node.disconnect(); };
  }

  // A butane torch: the click of the igniter, then a steady jet hiss.
  private torch(): void {
    this.oneShot(1.6, time => {
      const click = time < 0.02 ? (Math.random() * 2 - 1) * (1 - time / 0.02) : 0;
      const jet = time > 0.05 ? (Math.random() * 2 - 1) * 0.35 * Math.min(1, (time - 0.05) * 8) * Math.min(1, (1.6 - time) * 3) : 0;
      return click + jet;
    }, { high: 2200, low: 9000, gain: 0.8 });
  }

  // A smoker's cough: three ragged barks with a wet rattle under them.
  private cough(): void {
    this.oneShot(1.5, time => {
      let out = 0;
      for (const at of [0, 0.38, 0.7]) {
        const local = time - at;
        if (local < 0 || local > 0.3) continue;
        const bark = Math.exp(-local * 14) * (Math.random() * 2 - 1);
        const chest = Math.sin(2 * Math.PI * (130 - local * 120) * local) * Math.exp(-local * 18);
        out += bark * 0.7 + chest * 0.6;
      }
      return out;
    }, { low: 2400, high: 90, gain: 1.1, pan: -0.15 });
  }

  // Pulling on the bulb: a rising draw with the crackle of something cooking in the glass.
  private inhale(): void {
    this.oneShot(1.8, time => {
      const draw = (Math.random() * 2 - 1) * 0.3 * Math.min(1, time / 1.2) * (time < 1.6 ? 1 : (1.8 - time) * 5);
      const crackle = Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.9 : 0;
      return draw + crackle;
    }, { high: 600, low: 5000, gain: 0.9 });
  }

  // A shadow person in your face: a detuned screech through a blown speaker, and your own scream under it.
  private shriek(): void {
    let phaseA = 0;
    let phaseB = 0;
    const rate = this.context!.sampleRate;
    this.oneShot(1.4, time => {
      phaseA += (900 + Math.sin(time * 40) * 300 + time * 600) / rate;
      phaseB += (1340 - time * 400) / rate;
      const screech = Math.sign(Math.sin(phaseA * Math.PI * 2)) * 0.35 + Math.sin(phaseB * Math.PI * 2) * 0.3;
      const noise = (Math.random() * 2 - 1) * 0.4;
      const envelope = Math.min(1, time * 30) * Math.exp(-time * 1.8);
      return Math.tanh((screech + noise) * envelope * 3);
    }, { low: 7000, high: 200, gain: 1.4 });
  }

  // A shadow person staring back and coming apart: a reversed rush that cuts off dead.
  private banish(): void {
    this.oneShot(0.55, time => (Math.random() * 2 - 1) * Math.pow(time / 0.55, 3) * 0.6, { high: 900, low: 6000, gain: 0.8, pan: (Math.random() - 0.5) * 0.8 });
  }

  // Something whispering just behind you: breathy syllables through a moving vowel filter.
  whisper(pan: number): void {
    if (!this.context || !this.master) return;
    const context = this.context;
    const length = 1.4;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const time = index / context.sampleRate;
      const syllable = Math.max(0, Math.sin(time * Math.PI * 5.5)) ** 2;
      samples[index] = (Math.random() * 2 - 1) * syllable * Math.min(1, time * 6) * Math.min(1, (length - time) * 4);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const vowel = context.createBiquadFilter();
    vowel.type = 'bandpass'; vowel.Q.value = 4;
    vowel.frequency.setValueAtTime(900, context.currentTime);
    vowel.frequency.linearRampToValueAtTime(2400, context.currentTime + 0.5);
    vowel.frequency.linearRampToValueAtTime(700, context.currentTime + length);
    const gain = context.createGain();
    gain.gain.value = 0.7;
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(vowel).connect(gain).connect(panner).connect(this.master);
    source.start();
    source.onended = () => { for (const node of [source, vowel, gain, panner]) node.disconnect(); };
  }

  // Your heart, louder and faster the closer you are to losing it.
  heartbeat(level: number): void {
    if (!this.context || !this.master) return;
    this.oneShot(0.5, time => {
      const thump = (at: number, size: number) => { const local = time - at; return local < 0 ? 0 : Math.sin(2 * Math.PI * 52 * local) * Math.exp(-local * 22) * size; };
      return thump(0, 1) + thump(0.18, 0.7);
    }, { low: 160, gain: 0.5 + level * 1.1 });
  }

  // Thumb on the wheel, a spark, then the whoomph of something catching.
  private ignite(): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = 1.3;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let whoosh = 0;
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      const flick = phase < 0.06 ? (Math.random() * 2 - 1) * Math.exp(-phase * 90) * 0.7 : 0;
      whoosh = whoosh * 0.97 + (Math.random() * 2 - 1) * 0.03;
      const swell = phase > 0.25 ? Math.sin(Math.PI * Math.min(1, (phase - 0.25) / 1.05)) : 0;
      samples[index] = flick + whoosh * swell * 6 + Math.sin(2 * Math.PI * 55 * phase) * swell * 0.25;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master!);
    source.start(now);
    source.onended = () => source.disconnect();
  }

  // A bucket of dishwater hitting fire: the slap, the splatter, and a long angry hiss of steam.
  private splash(): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = 2.4;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      const slap = (Math.random() * 2 - 1) * Math.exp(-phase * 11) + Math.sin(2 * Math.PI * (80 - phase * 30) * phase) * Math.exp(-phase * 9) * 0.8;
      const drip = Math.random() < 0.002 ? (Math.random() * 2 - 1) * Math.exp(-phase * 2) : 0;
      samples[index] = slap * 0.9 + drip;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const low = context.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 2600;
    source.connect(low).connect(this.master!);
    source.start(now);
    // Steam: bright filtered noise that swells and dies away.
    const hiss = context.createBufferSource();
    const hissBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2.6), context.sampleRate);
    const hissSamples = hissBuffer.getChannelData(0);
    for (let index = 0; index < hissSamples.length; index++) hissSamples[index] = Math.random() * 2 - 1;
    hiss.buffer = hissBuffer;
    const high = context.createBiquadFilter();
    high.type = 'highpass'; high.frequency.value = 3800;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.5, now + 0.12);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    hiss.connect(high).connect(envelope).connect(this.master!);
    hiss.start(now);
    hiss.onended = () => { source.disconnect(); low.disconnect(); hiss.disconnect(); high.disconnect(); envelope.disconnect(); };
  }

  // Fingernails through a trash bag: stretchy plastic squeals and ragged tearing.
  private rip(): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = 0.6;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      const tear = Math.sin(phase * 140) > 0.2 ? 1 : 0.25;
      samples[index] = (Math.random() * 2 - 1) * tear * Math.exp(-phase * 3.5) * 0.7 + Math.sin(2 * Math.PI * (900 + phase * 1800) * phase) * Math.exp(-phase * 9) * 0.12;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const band = context.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 2400; band.Q.value = 0.7;
    source.connect(band).connect(this.master!);
    source.start(now);
    source.onended = () => { source.disconnect(); band.disconnect(); };
  }

  get contextState(): string { return this.context?.state ?? 'not started'; }

  get musicPlaying(): boolean { return this.musicPending || (this.music?.playing ?? false); }
  // Which song is on (or loading), so the radio and the dance can tell whose turn it is.
  get musicSong(): string { return this.musicPlaying ? this.musicUrl : ''; }

  async playMusic(url: string, from: number, duration: number, voicing?: Parameters<MidiPlayer['play']>[3]): Promise<void> {
    if (!this.music || duration <= 0.2 || this.musicPending) return;
    this.musicPending = true;
    this.musicUrl = url;
    try {
      await this.music.load(url);
      if (this.musicPending) this.music.play(url, from, duration, voicing);
    } catch { console.warn('Music unavailable.', url); }
    this.musicPending = false;
  }

  stopMusic(): void { this.musicPending = false; this.music?.stop(); }

  setMusicMode(mode: MusicMode): void {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    this.applyMusicMode(false);
  }

  private applyMusicMode(instant: boolean): void {
    if (!this.context || !this.musicDrive || !this.musicShaper || !this.musicLow || !this.musicHigh || !this.musicOut) return;
    const spec = MUSIC_MODES[this.musicMode];
    const at = this.context.currentTime;
    const glide = instant ? 0.001 : 0.25;
    this.musicShaper.curve = shaperCurve(spec.curve);
    this.musicDrive.gain.setTargetAtTime(spec.drive, at, glide);
    this.musicLow.frequency.setTargetAtTime(spec.low, at, glide);
    this.musicHigh.frequency.setTargetAtTime(spec.high, at, glide);
    this.musicOut.gain.setTargetAtTime(spec.out, at, glide);
  }

  private musicUrl = '';
  private musicMode: MusicMode = 'clean';
  private musicDrive: GainNode | null = null;
  private musicShaper: WaveShaperNode | null = null;
  private musicLow: BiquadFilterNode | null = null;
  private musicHigh: BiquadFilterNode | null = null;
  private musicOut: GainNode | null = null;

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

  // scream: shrieking delivery for rampages and attacks — pitched up, clipped hard, louder.
  async speak(text: string, speaker = 'Cletus', outside = false, scream = false): Promise<void> {
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
      source.playbackRate.value = (speaker === 'Darlene' ? 1.04 : speaker === 'Ray' ? 0.77 : speaker === 'Dale' ? 0.92 : 0.84) * (scream ? 1.16 : 1);
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = outside ? 1050 : scream ? 1900 : 1450; filter.Q.value = 0.55;
      const distortion = this.context.createWaveShaper();
      const curve = new Float32Array(2048);
      const drive = scream ? 7 : 2.7;
      for (let index = 0; index < curve.length; index++) {
        const sample = index * 2 / (curve.length - 1) - 1;
        curve[index] = Math.tanh(sample * drive) / Math.tanh(drive);
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
      const gain = this.context.createGain(); gain.gain.value = outside ? 0.65 : scream ? 1.25 : 0.9;
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

  // CRT noises: the power-on thunk with its high whine and a hiss of static, the collapse-to-a-dot zap, a button.
  private crt(kind: 'tvon' | 'tvoff' | 'click'): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = kind === 'click' ? 0.05 : kind === 'tvon' ? 0.9 : 0.35;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      if (kind === 'click') { samples[index] = (Math.random() * 2 - 1) * Math.exp(-phase * 180) * 0.6; continue; }
      if (kind === 'tvon') {
        const thunk = Math.sin(2 * Math.PI * 58 * phase) * Math.exp(-phase * 16) * 0.8;
        const hiss = (Math.random() * 2 - 1) * Math.exp(-phase * 3.5) * 0.25;
        samples[index] = thunk + hiss;
      } else {
        samples[index] = Math.sin(2 * Math.PI * (900 - phase * 2400) * phase) * Math.exp(-phase * 9) * 0.35 + (Math.random() * 2 - 1) * Math.exp(-phase * 20) * 0.2;
      }
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master!);
    source.start(now);
    source.onended = () => source.disconnect();
    if (kind !== 'tvon') return;
    // The flyback whine every CRT makes when it wakes up.
    const whine = context.createOscillator();
    const gain = context.createGain();
    whine.frequency.value = 15700;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    whine.connect(gain).connect(this.master!);
    whine.start(now); whine.stop(now + 2.3);
  }

  // A fist landing on you: a low body thud and a wet crack. The killing blow adds a shrieking string cluster.
  private punch(fatal: boolean): void {
    const context = this.context!;
    const now = context.currentTime;
    const length = fatal ? 1.4 : 0.45;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const phase = index / context.sampleRate;
      const thud = Math.sin(2 * Math.PI * (95 - phase * 120) * phase) * Math.exp(-phase * 14);
      const crack = (Math.random() * 2 - 1) * Math.exp(-phase * 45);
      const ring = fatal ? Math.sin(2 * Math.PI * 3100 * phase) * Math.exp(-phase * 2.2) * 0.12 : 0;
      samples[index] = thud * 1.1 + crack * 0.6 + ring;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = fatal ? 1.6 : 1.3;
    source.connect(gain).connect(this.master!);
    source.start(now);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    if (!fatal) return;
    for (const frequency of [587, 622, 659, 698, 1244]) {
      const shriek = context.createOscillator();
      const envelope = context.createGain();
      shriek.type = 'sawtooth';
      shriek.frequency.setValueAtTime(frequency, now);
      shriek.frequency.linearRampToValueAtTime(frequency * 1.06, now + 1.2);
      envelope.gain.setValueAtTime(0.05, now);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      shriek.connect(envelope).connect(this.master!);
      shriek.start(now); shriek.stop(now + 1.35);
    }
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
    if (this.tvBus && this.context) this.tvBus.gain.setTargetAtTime(active ? this.volume * TV_BUS : 0, this.context.currentTime, 0.03);
    if (this.ambience && this.context) this.ambience.gain.setTargetAtTime(active ? 1 : 0, this.context.currentTime, 0.16);
  }

  play(kind: Sound): void {
    if (!this.context || !this.master) return;
    if (kind === 'alarm' || kind === 'whoop') { this.groan(kind === 'whoop'); return; }
    if (kind === 'slam') { this.slam(); return; }
    if (kind === 'hit' || kind === 'kill') { this.punch(kind === 'kill'); return; }
    if (kind === 'tvon' || kind === 'tvoff' || kind === 'click') { this.crt(kind); return; }
    if (kind === 'ignite') { this.ignite(); return; }
    if (kind === 'splash') { this.splash(); return; }
    if (kind === 'rip') { this.rip(); return; }
    if (kind === 'torch') { this.torch(); return; }
    if (kind === 'cough') { this.cough(); return; }
    if (kind === 'inhale') { this.inhale(); return; }
    if (kind === 'shriek') { this.shriek(); return; }
    if (kind === 'banish') { this.banish(); return; }
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