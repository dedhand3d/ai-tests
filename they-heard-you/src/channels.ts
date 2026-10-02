// Local antenna TV. A few stations come in on the dial; everything between them is snow.
//
// Every station runs on one shared broadcast clock (GameState.tvClock), so it keeps airing whether the
// set is on or not: turn it on or flip to it and you land in the middle of whatever is on, like real TV.
// A station's schedule is built from its shows and its ads: each show, then a commercial break (an
// optional bumper card, then the next few ads in rotation), looping forever.
//
// To add a commercial: drop the video in tv/ and run scripts/encode-tv.ps1 -Source "tv\<file>" -Name <name>,
// which writes public/tv/<name>.mp4, .webm and .wav and prints the length. Add a clip to CLIPS (kind 'commercial',
// src 'tv/<name>' with no extension, that length, and what you see when you Look at the TV), and add its id
// to a station's `ads`. Shows work the same way with kind 'show' and the station's `shows`. A station with
// nothing to air shows its `filler`.

export type ClipKind = 'show' | 'commercial' | 'card';
export interface Card {
  lines: string[];
  // bumper: a station card ("WE'LL BE RIGHT BACK"). bars: an SMPTE-style test card ("PLEASE STAND BY").
  style: 'bumper' | 'bars';
  background: string;
  ink: string;
}
export interface Clip {
  kind: ClipKind;
  title: string;
  seconds: number;
  // A clip in public/tv/, without extension: the picture is <src>.mp4 (or <src>.webm where MP4 will not play)
  // and the sound is <src>.wav. Or a card drawn on the set. Cards are silent.
  src?: string;
  card?: Card;
  // What you see when you Look at the TV while this is on.
  look: string;
}

export const CLIPS = {
  'news-local-man': {
    kind: 'show', title: 'LOCAL MAN STILL MISSING', seconds: 20.1, src: 'tv/news-1',
    look: 'COUNTY NEWS 4: LOCAL MAN STILL MISSING. The anchor looks carved out of a potato. Last seen in Red Creek County. They used the photo you hated. You would give anything to complain about it in person.',
  },
  'news-break': {
    kind: 'card', title: 'WE\'LL BE RIGHT BACK', seconds: 2.5,
    card: { lines: ['COUNTY NEWS 4', 'WE\'LL BE', 'RIGHT BACK'], style: 'bumper', background: '#14306b', ink: '#f2e6b0' },
    look: 'COUNTY NEWS 4 / WE\'LL BE RIGHT BACK. They will. You will not.',
  },
  'zwinkys': {
    kind: 'commercial', title: 'ZWINKYS MALT LIQUOR', seconds: 23.6, src: 'tv/zwinkys',
    look: 'A commercial. A cartoon showgirl in a red feather headdress shimmies on a blue stage beside a bottle of ZWINKYS MALT LIQUOR the size of a refrigerator. The bottle sparkles. You would sell a kidney for it. You may already have.',
  },
  'krud-standby': {
    kind: 'card', title: 'PLEASE STAND BY', seconds: 30,
    card: { lines: ['KRUD 11', 'PLEASE STAND BY'], style: 'bars', background: '#000000', ink: '#ffffff' },
    look: 'KRUD 11: color bars and PLEASE STAND BY. Your home for reruns, once somebody finds the tapes.',
  },
} satisfies Record<string, Clip>;
export type ClipId = keyof typeof CLIPS;
const clip = (id: ClipId): Clip => CLIPS[id];

export interface Station {
  id: string;
  call: string;
  shows: ClipId[];
  ads: ClipId[];
  adsPerBreak: number;
  // Shown before each commercial break, if the station has one.
  bumper?: ClipId;
  // Airs when the station has nothing else.
  filler: ClipId;
  // Where this station's schedule sits on the shared clock, so stations are not all in lockstep.
  offset: number;
}

export const STATIONS = {
  news: { id: 'news', call: 'COUNTY NEWS 4', shows: ['news-local-man'], ads: ['zwinkys'], adsPerBreak: 1, bumper: 'news-break', filler: 'news-break', offset: 0 },
  // Daytime court shows and nighttime teen dramas, eventually.
  krud: { id: 'krud', call: 'KRUD 11', shows: [], ads: [], adsPerBreak: 2, filler: 'krud-standby', offset: 7 },
} satisfies Record<string, Station>;

// The dial, in the order the remote flips through it. A stop with no station is nothing but snow.
export interface DialStop { number: number; station: Station | null; }
export const TV_DIAL: DialStop[] = [
  { number: 4, station: STATIONS.news },
  { number: 11, station: STATIONS.krud },
  { number: 13, station: null },
];

// How long the snow lasts when the set turns on or changes channel.
export const TV_STATIC_SECONDS = 0.6;

// Each show, then its break: the bumper, then the next ads in rotation. Long enough that every ad airs.
export function lineup(station: Station): ClipId[] {
  if (!station.shows.length && !station.ads.length) return [station.filler];
  const perBreak = Math.max(1, station.adsPerBreak);
  const blocks = Math.max(station.shows.length, Math.ceil(station.ads.length / perBreak), 1);
  const order: ClipId[] = [];
  for (let block = 0; block < blocks; block++) {
    if (station.shows.length) order.push(station.shows[block % station.shows.length]);
    if (!station.ads.length) continue;
    if (station.bumper) order.push(station.bumper);
    for (let slot = 0; slot < perBreak; slot++) order.push(station.ads[(block * perBreak + slot) % station.ads.length]);
  }
  return order;
}

export const lineupSeconds = (station: Station): number => lineup(station).reduce((total, id) => total + clip(id).seconds, 0);

export interface OnAir { id: ClipId; clip: Clip; offset: number; next: ClipId; }

// What a station is airing at a moment on the shared clock, and how far into it.
export function onAir(station: Station, clock: number): OnAir {
  const order = lineup(station);
  const length = lineupSeconds(station);
  let time = (((clock + station.offset) % length) + length) % length;
  for (let index = 0; index < order.length; index++) {
    const id = order[index];
    if (time < clip(id).seconds || index === order.length - 1) return { id, clip: clip(id), offset: Math.min(time, clip(id).seconds), next: order[(index + 1) % order.length] };
    time -= clip(id).seconds;
  }
  return { id: order[0], clip: clip(order[0]), offset: 0, next: order[0] };
}

// What is on at a dial stop right now, or null for snow.
export const tuned = (dial: number, clock: number): OnAir | null => {
  const station = TV_DIAL[dial]?.station;
  return station ? onAir(station, clock) : null;
};

// A clock reading (never negative) at which a station starts airing a clip, so a scene can cue it up.
export function cue(station: Station, id: ClipId): number {
  const length = lineupSeconds(station);
  let start = 0;
  for (const entry of lineup(station)) {
    if (entry === id) break;
    start += clip(entry).seconds;
  }
  return (((start - station.offset) % length) + length) % length;
}

export const dialLabel = (dial: number): string => {
  const stop = TV_DIAL[dial];
  return stop.station ? stop.station.call : `CHANNEL ${stop.number}`;
};
