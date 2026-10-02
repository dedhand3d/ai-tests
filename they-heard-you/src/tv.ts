import * as THREE from 'three';
import { canvasTexture } from './textures';
import { TV_STATIC_SECONDS, tuned, type Card, type ClipId, type OnAir } from './channels';

// The dinette CRT. It shows whatever the dialed station is airing on the broadcast clock: a video
// (shows and commercials), a drawn card (bumpers, the test pattern), or snow (dead channels, and for a
// moment whenever it warms up or changes channel). Dead cracked glass when it is off.
//
// Two video decks: while one airs, the next clip loads silently in the other, so a cut from the news into
// a commercial is clean. The game state is the authority on what is on and how far in; the decks follow
// it, and get nudged back if the picture drifts. Follows the game's pause.
interface Deck { video: HTMLVideoElement; texture: THREE.VideoTexture; clip: ClipId | null; synced: number; waiting: number; }
type Format = 'webm' | 'mp4';

const DRIFT = 0.75;
const PRELOAD = 4;
// Seconds of play time a clip that is meant to be playing may go without a picture before it counts as failed.
const STALL_SECONDS = 6;
const probe = document.createElement('video');
const CAN_PLAY = { webm: probe.canPlayType('video/webm; codecs="vp9, opus"'), mp4: probe.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') };

export class Television {
  private readonly decks: Deck[];
  private live = 0;
  private readonly snowCanvas = document.createElement('canvas');
  private readonly snowTexture: THREE.CanvasTexture;
  private readonly offTexture: THREE.CanvasTexture;
  private readonly cards = new Map<ClipId, THREE.CanvasTexture>();
  private on = false;
  private dial = -1;
  private clock = 0;
  private snow = 0;
  private airing: OnAir | null = null;
  // The picture only: the sound is a separate WAV the audio engine plays in step with it (see soundCue).
  // MP4 first (VS Code's built-in browser cannot even open WebM); if a format fails to play here, switch to the
  // other; if both fail, the set shows snow (bad reception) instead of a dead black screen.
  private format: Format = CAN_PLAY.mp4 ? 'mp4' : 'webm';
  private readonly failed = new Set<Format>();
  private playError = '';
  private readonly events: string[] = [];

  constructor() {
    this.decks = [0, 1].map(() => {
      const video = document.createElement('video');
      // Always muted: the sound comes from the clip's WAV (and a muted video is never blocked by autoplay rules).
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      const deck: Deck = { video, texture, clip: null, synced: 0, waiting: 0 };
      video.addEventListener('error', () => this.fail(deck, `error ${video.error?.code ?? '?'} ${video.error?.message ?? ''}`.trim()));
      return deck;
    });
    this.snowCanvas.width = 96;
    this.snowCanvas.height = 72;
    this.snowTexture = canvasTexture(this.snowCanvas);
    const glass = document.createElement('canvas');
    glass.width = glass.height = 64;
    const context = glass.getContext('2d')!;
    const sheen = context.createLinearGradient(0, 0, 64, 64);
    sheen.addColorStop(0, '#2a302c');
    sheen.addColorStop(0.45, '#101412');
    sheen.addColorStop(1, '#070908');
    context.fillStyle = sheen;
    context.fillRect(0, 0, 64, 64);
    context.strokeStyle = '#4a524a';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(8, 50); context.lineTo(24, 38); context.lineTo(30, 42); context.lineTo(52, 18);
    context.stroke();
    this.offTexture = canvasTexture(glass);
  }

  // Both decks, for dev checks.
  get videos(): HTMLVideoElement[] { return this.decks.map(deck => deck.video); }

  // What the speaker should be playing: the airing clip's sound, at the picture's own position when the picture
  // is rolling (so lips match), otherwise at the broadcast position. Plus the next clip, to load its sound early.
  get soundCue(): { src: string; time: number; next: string | null } | null {
    const airing = this.airing;
    if (!this.on || !airing?.clip.src || this.broken) return null;
    const deck = this.decks[this.live];
    const rolling = deck.clip === airing.id && deck.video.readyState >= 2 && !deck.video.paused && !deck.video.seeking;
    const next = tuned(this.dial, this.clock + (airing.clip.seconds - airing.offset) + 0.05);
    return { src: airing.clip.src, time: rolling ? deck.video.currentTime : airing.offset, next: next?.clip.src ?? null };
  }

  // Mirror the game state onto the set. Warming up or changing channel starts with a burst of snow.
  set(on: boolean, dial: number, clock: number): void {
    if (dial !== this.dial || (on && !this.on)) this.snow = TV_STATIC_SECONDS;
    this.dial = dial;
    this.on = on;
    this.clock = clock;
  }

  // Each frame: work out what is on, keep the live deck on it, cue up what comes next.
  frame(delta: number, running: boolean): void {
    this.snow = Math.max(0, this.snow - delta);
    this.airing = this.on ? tuned(this.dial, this.clock) : null;
    const airing = this.airing;
    const src = airing?.clip.src;
    if (src && airing) {
      let deck = this.decks[this.live];
      if (deck.clip !== airing.id) {
        // Cut to the other deck if it already has this clip loaded; otherwise load it there.
        const other = this.decks[1 - this.live];
        if (other.clip !== airing.id) this.load(other, airing.id, src, airing.offset);
        deck.video.pause();
        this.live = 1 - this.live;
        deck = other;
      }
      // Nudge it back on schedule only once it is actually playing, and not too often: every seek makes it
      // buffer again, and a slow machine that keeps getting re-seeked would never get going.
      const now = performance.now();
      if (deck.video.readyState >= 3 && !deck.video.seeking && Math.abs(deck.video.currentTime - airing.offset) > DRIFT && now - deck.synced > 2000) {
        deck.video.currentTime = airing.offset;
        deck.synced = now;
      }
      if (running && deck.video.paused && !this.broken) {
        void deck.video.play().then(() => { this.playError = ''; }).catch((error: Error) => {
          // Autoplay can wait for the next frame; remember why, for the dev report.
          if (this.playError !== error.name) this.note(`play() refused: ${error.name}`);
          this.playError = error.name;
        });
      }
      if (!running && !deck.video.paused) deck.video.pause();
      // Meant to be playing, still no picture after a good while of play time: this format is not working here.
      deck.waiting = running && deck.video.readyState < 2 ? deck.waiting + delta : 0;
      if (!this.broken && deck.waiting > STALL_SECONDS) this.fail(deck, `stalled at readyState ${deck.video.readyState}`);
    } else {
      for (const deck of this.decks) if (!deck.video.paused) deck.video.pause();
    }
    // Load the next clip into the idle deck a few seconds early, parked at its first frame.
    const next = airing ? tuned(this.dial, this.clock + (airing.clip.seconds - airing.offset) + 0.05) : null;
    if (airing && next && next.clip.src && airing.clip.seconds - airing.offset < PRELOAD) {
      const idle = this.decks[airing.clip.src ? 1 - this.live : this.live];
      if (idle.clip !== next.id) this.load(idle, next.id, next.clip.src, 0);
    }
    if (this.showingSnow) this.drawSnow();
  }

  private load(deck: Deck, id: ClipId, src: string, at: number): void {
    deck.clip = id;
    deck.synced = performance.now();
    deck.waiting = 0;
    deck.video.pause();
    deck.video.src = `${import.meta.env.BASE_URL}${src}.${this.format}`;
    deck.video.currentTime = at;
  }

  // A deck could not play its clip in the current format: try the other one, or give up and show snow.
  private fail(deck: Deck, why: string): void {
    if (!deck.clip || !deck.video.getAttribute('src')) return;
    this.note(`${deck.video.getAttribute('src')}: ${why}`);
    this.failed.add(this.format);
    const other: Format = this.format === 'webm' ? 'mp4' : 'webm';
    if (this.failed.has(other)) { deck.waiting = 0; return; }
    this.format = other;
    this.note(`switching to ${other}`);
    for (const each of this.decks) {
      const clip = each.clip;
      const src = clip && each.video.getAttribute('src');
      if (!clip || !src) continue;
      const at = this.airing && this.airing.id === clip ? this.airing.offset : 0;
      this.load(each, clip, src.replace(import.meta.env.BASE_URL, '').replace(/\.(webm|mp4)$/, ''), at);
    }
  }

  private note(event: string): void {
    this.events.push(`${(performance.now() / 1000).toFixed(1)}s ${event}`);
    if (this.events.length > 20) this.events.shift();
    console.warn(`TV: ${event}`);
  }

  // Neither format will play in this browser.
  private get broken(): boolean { return this.failed.size >= 2; }

  // Dev diagnostics: what this browser can play and what the decks are doing.
  report(): Record<string, unknown> {
    return {
      canPlay: CAN_PLAY, format: this.format, failed: [...this.failed], broken: this.broken, playError: this.playError,
      on: this.on, dial: this.dial, airing: this.airing ? `${this.airing.id}@${this.airing.offset.toFixed(1)}` : null, live: this.live,
      decks: this.decks.map(deck => ({
        clip: deck.clip, src: deck.video.getAttribute('src'), readyState: deck.video.readyState, networkState: deck.video.networkState,
        paused: deck.video.paused, muted: deck.video.muted, time: +deck.video.currentTime.toFixed(2), error: deck.video.error?.code ?? null,
        size: `${deck.video.videoWidth}x${deck.video.videoHeight}`,
      })),
      events: [...this.events],
    };
  }

  get isOn(): boolean { return this.on; }
  // Snow on screen: the warm-up and channel-change burst, a channel with nothing on it, or a set that cannot play video.
  get showingSnow(): boolean { return this.on && (this.snow > 0 || !this.airing || (this.broken && Boolean(this.airing.clip.src))); }
  // How much static hiss the speaker should be making (0 to 1).
  get staticLevel(): number { return !this.on ? 0 : !this.airing || (this.broken && this.airing.clip.src) ? 1 : this.snow > 0 ? 0.8 : 0; }
  // What is airing right now, for the Look text.
  get nowShowing(): OnAir | null { return this.airing; }

  get texture(): THREE.Texture {
    if (!this.on) return this.offTexture;
    if (this.showingSnow || !this.airing) return this.snowTexture;
    if (this.airing.clip.card) return this.cardTexture(this.airing.id, this.airing.clip.card);
    return this.decks[this.live].texture;
  }

  // A station card, drawn once: a bumper on a flat color, or color bars with a caption box.
  private cardTexture(id: ClipId, card: Card): THREE.CanvasTexture {
    const cached = this.cards.get(id);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const context = canvas.getContext('2d')!;
    context.fillStyle = card.background;
    context.fillRect(0, 0, 256, 192);
    if (card.style === 'bars') {
      const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      bars.forEach((color, index) => { context.fillStyle = color; context.fillRect(index * 256 / 7, 0, 256 / 7 + 1, 128); });
      ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'].forEach((color, index) => { context.fillStyle = color; context.fillRect(index * 256 / 7, 128, 256 / 7 + 1, 16); });
      context.fillStyle = '#000000';
      context.fillRect(28, 66, 200, 56);
    } else {
      // A cheap station bumper: a band of stripes and a drop-shadowed title.
      for (let stripe = 0; stripe < 5; stripe++) {
        context.fillStyle = stripe % 2 ? '#c8202a' : '#f2e6b0';
        context.fillRect(0, 150 + stripe * 6, 256, 6);
      }
    }
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const top = card.style === 'bars' ? 94 - (card.lines.length - 1) * 11 : 72 - (card.lines.length - 1) * 16;
    card.lines.forEach((line, index) => {
      const size = card.style === 'bars' ? 20 : index === 0 ? 20 : 30;
      context.font = `bold ${size}px Impact, Arial Black, sans-serif`;
      const y = top + index * (card.style === 'bars' ? 22 : 34);
      context.fillStyle = '#00000099';
      context.fillText(line, 130, y + 2, 230);
      context.fillStyle = card.ink;
      context.fillText(line, 128, y, 230);
    });
    const texture = canvasTexture(canvas);
    this.cards.set(id, texture);
    return texture;
  }

  private drawSnow(): void {
    const context = this.snowCanvas.getContext('2d')!;
    const image = context.createImageData(this.snowCanvas.width, this.snowCanvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const value = Math.random() * 255;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value * 1.05;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    this.snowTexture.needsUpdate = true;
  }

  dispose(): void {
    for (const deck of this.decks) {
      deck.video.pause();
      deck.video.removeAttribute('src');
      deck.video.load();
      deck.texture.dispose();
    }
    for (const texture of this.cards.values()) texture.dispose();
    this.snowTexture.dispose();
    this.offTexture.dispose();
  }
}
