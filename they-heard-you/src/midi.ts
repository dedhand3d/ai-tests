// Minimal Standard MIDI File reader and oscillator synth. Local only: no CDN, no soundfonts.
export interface MidiNote { time: number; duration: number; channel: number; note: number; velocity: number; }

export function parseMidi(data: ArrayBuffer): MidiNote[] {
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'MThd') throw new Error('Not a MIDI file');
  const tracks = view.getUint16(10);
  const division = view.getUint16(12);
  let offset = 8 + view.getUint32(4);
  const tempos: [number, number][] = [];
  const raw: { tick: number; end: number; channel: number; note: number; velocity: number }[] = [];
  for (let track = 0; track < tracks && offset < bytes.length; track++) {
    const length = view.getUint32(offset + 4);
    let position = offset + 8;
    const end = position + length;
    let tick = 0;
    let status = 0;
    const open = new Map<number, { tick: number; velocity: number }[]>();
    const readLength = () => { let value = 0, byte = 0; do { byte = bytes[position++]; value = (value << 7) | (byte & 0x7f); } while (byte & 0x80); return value; };
    while (position < end) {
      tick += readLength();
      if (bytes[position] & 0x80) status = bytes[position++];
      const type = status & 0xf0;
      const channel = status & 0x0f;
      if (status === 0xff) {
        const meta = bytes[position++];
        const size = readLength();
        if (meta === 0x51) tempos.push([tick, (bytes[position] << 16) | (bytes[position + 1] << 8) | bytes[position + 2]]);
        position += size;
      } else if (status === 0xf0 || status === 0xf7) {
        position += readLength();
      } else if (type === 0x90 || type === 0x80) {
        const note = bytes[position++];
        const velocity = bytes[position++];
        const key = channel * 128 + note;
        if (type === 0x90 && velocity > 0) {
          if (!open.has(key)) open.set(key, []);
          open.get(key)!.push({ tick, velocity });
        } else {
          const start = open.get(key)?.shift();
          if (start) raw.push({ tick: start.tick, end: tick, channel, note, velocity: start.velocity });
        }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) position += 2;
      else if (type === 0xc0 || type === 0xd0) position += 1;
      else break;
    }
    offset = end;
  }
  tempos.sort((a, b) => a[0] - b[0]);
  const seconds = (tick: number) => {
    let time = 0, last = 0, tempo = 500000;
    for (const [at, value] of tempos) {
      if (at >= tick) break;
      time += (at - last) / division * tempo / 1e6;
      last = at; tempo = value;
    }
    return time + (tick - last) / division * tempo / 1e6;
  };
  return raw.map(note => ({ time: seconds(note.tick), duration: Math.max(0.03, seconds(note.end) - seconds(note.tick)), channel: note.channel, note: note.note, velocity: note.velocity }))
    .sort((a, b) => a.time - b.time);
}

// Per-channel voicing for this arrangement: bass, pad lead, pluck, sci-fi, guitar; channel 10 drums.
const VOICES: Record<number, { wave: OscillatorType; gain: number; cutoff: number; release: number; detune?: number }> = {
  0: { wave: 'sawtooth', gain: 0.2, cutoff: 700, release: 0.08 },
  1: { wave: 'sawtooth', gain: 0.075, cutoff: 2400, release: 0.12, detune: 9 },
  2: { wave: 'square', gain: 0.06, cutoff: 3200, release: 0.05 },
  3: { wave: 'sine', gain: 0.07, cutoff: 5000, release: 0.3 },
  4: { wave: 'triangle', gain: 0.08, cutoff: 2600, release: 0.1 },
};

export class MidiPlayer {
  private notes: MidiNote[] = [];
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private bus: GainNode | null = null;
  private cursor = 0;

  constructor(private readonly context: AudioContext, private readonly destination: AudioNode) {}

  async load(url: string): Promise<void> {
    if (this.notes.length) return;
    const response = await fetch(url);
    if (!response.ok) throw new Error('MIDI unavailable');
    this.notes = parseMidi(await response.arrayBuffer());
  }

  get playing(): boolean { return this.bus !== null; }

  // Plays `duration` seconds of the song starting at `from` seconds, fading out at the end.
  play(from: number, duration: number): void {
    this.stop(0);
    const context = this.context;
    const bus = context.createGain();
    const start = context.currentTime + 0.05;
    bus.gain.setValueAtTime(0.0001, start);
    bus.gain.exponentialRampToValueAtTime(1, start + 0.4);
    bus.gain.setValueAtTime(1, start + Math.max(0.5, duration - 1.8));
    bus.gain.linearRampToValueAtTime(0, start + duration);
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -16; compressor.ratio.value = 4;
    bus.connect(compressor).connect(this.destination);
    this.bus = bus;
    this.cursor = this.notes.findIndex(note => note.time >= from);
    if (this.cursor < 0) this.cursor = this.notes.length;
    const until = from + duration;
    const schedule = () => {
      if (this.bus !== bus) return;
      const horizon = context.currentTime - start + from + 0.6;
      while (this.cursor < this.notes.length && this.notes[this.cursor].time < Math.min(horizon, until)) {
        const note = this.notes[this.cursor++];
        this.voice(note, start + note.time - from, bus);
      }
      if (context.currentTime > start + duration + 0.3) this.stop(0);
    };
    schedule();
    this.timer = window.setInterval(schedule, 120);
  }

  stop(fade = 0.25): void {
    window.clearInterval(this.timer);
    const bus = this.bus;
    this.bus = null;
    if (!bus) return;
    const now = this.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + fade + 0.01);
    window.setTimeout(() => bus.disconnect(), (fade + 0.1) * 1000);
  }

  private voice(note: MidiNote, at: number, bus: GainNode): void {
    const context = this.context;
    const velocity = note.velocity / 127;
    if (note.channel === 9) { this.drum(note.note, at, velocity, bus); return; }
    const spec = VOICES[note.channel] ?? VOICES[4];
    const frequency = 440 * Math.pow(2, (note.note - 69) / 12);
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = spec.cutoff; filter.Q.value = 2;
    const end = at + note.duration;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(spec.gain * velocity + 0.0001, at + 0.012);
    envelope.gain.setValueAtTime(spec.gain * velocity + 0.0001, end);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end + spec.release);
    filter.connect(envelope).connect(bus);
    const oscillators = [spec.detune ? -spec.detune : 0, ...(spec.detune ? [spec.detune] : [])].map(detune => {
      const oscillator = context.createOscillator();
      oscillator.type = spec.wave;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(filter);
      oscillator.start(at);
      oscillator.stop(end + spec.release + 0.02);
      return oscillator;
    });
    oscillators[0].onended = () => { oscillators.forEach(oscillator => oscillator.disconnect()); filter.disconnect(); envelope.disconnect(); };
  }

  private drum(note: number, at: number, velocity: number, bus: GainNode): void {
    const context = this.context;
    if (!this.noise) {
      this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    }
    const envelope = context.createGain();
    envelope.connect(bus);
    if (note === 35 || note === 36) {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(140, at);
      oscillator.frequency.exponentialRampToValueAtTime(42, at + 0.12);
      envelope.gain.setValueAtTime(0.55 * velocity, at);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      oscillator.connect(envelope);
      oscillator.start(at); oscillator.stop(at + 0.32);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
      return;
    }
    const hat = note === 42 || note === 44 || note === 46 || (note >= 49 && note <= 59);
    const length = note === 46 ? 0.22 : note >= 49 ? 0.7 : hat ? 0.05 : 0.16;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = hat ? 'highpass' : 'bandpass';
    filter.frequency.value = hat ? 7000 : note === 38 || note === 40 ? 1800 : 400 + (note % 12) * 60;
    envelope.gain.setValueAtTime((hat ? 0.12 : 0.3) * velocity, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(envelope);
    source.start(at, Math.random() * 0.5, length + 0.02);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
}

// Goodbye Horses, bar 88: the full-band return after the breakdown. 125 BPM, 1.92 s per bar.
export const DANCE_SONG_START = 88 * 1.92;
