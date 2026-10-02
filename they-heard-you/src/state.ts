import { STATIONS, TV_DIAL, cue, dialLabel } from './channels.js';
import { BULB_INHALE_AT, BULB_SECONDS, BULB_TRIP_AT, DALE_AT, DALE_HIT_AT, HANGOUT_SECONDS, OFFER_SECONDS, RADIO_LOOP, RADIO_ON_AT, ROTATION, TORCH_AT } from './encounters.js';
import { INTRO_APPROACH_SECONDS, INTRO_OUTCOME, KEY_DROP_AT, KEY_MISSED, KEY_SNATCHED } from './encounters.js';
import { DOUSE_HIT, DOUSE_SECONDS, FIRE_SMELL_LINE, PUKE_EVIDENCE, TV_ON_AT, TVSHOW_SECONDS, APPROACH_SECONDS, DANCE_SECONDS, ENTER_SECONDS, GRAB_HITS, GRAB_SECONDS, KILL_HIT, KILL_SECONDS, LEAVE_SECONDS, RAMPAGE_EVENTS, RAMPAGE_SECONDS, VISITOR_IDS, VISITORS, type Haul, encounterDefaults, patrolDepth, PHASES, PURPOSES, visitorIndex, type Encounter, type ResponseId, type VisitorId } from './encounters.js';

export const SAVE_KEY = 'they-heard-you:first-pass:v1';
export const VIEW_IDS = ['seat', 'kitchen', 'bracket', 'dinette', 'rear'] as const;
export type ViewId = typeof VIEW_IDS[number];
export type ItemId = 'spoon' | 'rag' | 'screwdriver' | 'brassKey' | 'finalKey' | 'magnet' | 'beenie' | 'lotto' | 'choke' | 'dildo' | 'zwinkys' | 'butt' | 'bobbyPins' | 'usedNeedles' | 'axe' | 'lighter' | 'remote';
export type TvCommand = 'power' | 'next' | 'prev' | 'mute';
export type Verb = 'look' | 'take' | 'use' | 'talk' | 'put-back';
export type RummageId = 'pizza' | 'trash' | 'floorPapers' | 'cans';
export type CabinetId = 'k1' | 'k2' | 'k3' | 'u1' | 'u2' | 'u3';
export const RUMMAGE_IDS: RummageId[] = ['pizza', 'trash', 'floorPapers', 'cans'];
export const CABINET_IDS: CabinetId[] = ['k1', 'k2', 'k3', 'u1', 'u2', 'u3'];
export type HotspotId = 'drawer' | 'cushion' | 'spoon' | 'rag' | 'screwdriver' | 'brassKey' | 'finalKey' | 'magnet' | 'beenie' | 'lotto' | 'choke' | 'belongings' | 'bracket' | 'cuff' | 'seat' | 'tv' | 'door' | 'hatch' | 'ashtray' | 'notice' | 'pizza' | 'pizzaRear' | 'trash' | 'floorPapers' | 'cans' | 'cab-k1' | 'cab-k2' | 'cab-k3' | 'cab-u1' | 'cab-u2' | 'cab-u3' | 'rearCab' | 'needles' | 'dildo' | 'axe' | 'lighter' | 'wall1' | 'wall2' | 'wall3' | 'ronnie' | 'puddle' | 'blinds' | 'radio';
export type WrappableId = 'spoon' | 'screwdriver' | 'axe';
export type ThrowableId = 'beenie' | 'magnet' | 'zwinkys' | 'choke';
// Things Darlene's lighter can set on fire. Each burns once and leaves a scorch.
export type FireSpot = 'floorPapers' | 'trash' | 'pizza' | 'pizzaRear';
export const FIRE_SPOTS: FireSpot[] = ['floorPapers', 'trash', 'pizza', 'pizzaRear'];
export const isFireSpot = (id: string): id is FireSpot => (FIRE_SPOTS as string[]).includes(id);
// Seconds of burning before somebody outside smells it, and before it is as big as it gets.
export const FIRE_NOTICE = 3.5;
export const FIRE_FULL = 7;
// One hit off Dale's bulb: two minutes of tweaker strength and shadow people. Hitting it again stacks, to a point.
export const TRIP_SECONDS = 120;
export const TRIP_MAX = 240;
// Paranoia creeps up on its own while you are high; a shadow person reaching you spikes it; at 100 you lose it.
export const PARANOIA_RATE = 0.45;
export const FREAKOUT_NOISE = 45;
export const FREAKOUT_PARANOIA = 20;
export const BANISH_RELIEF = 10;

// The door is plywood over steel bracing: only tweaker strength gets through it, two chops' worth per swing.
export const DOOR_CHOPS = 6;
export const RONNIE_CALM = 150;
// Anything louder than this and somebody outside comes to see what the fuck that was.
export const NOISE_LIMIT = 70;
export const STEADY_SECONDS = 60;
export const STAB_WINDOW = 0.9;
export const READ_ALOUD_SECONDS = 70;
// How long a thrown item keeps them busy outside, and how loud the throw is.
export const THROWS: Record<ThrowableId, { delay: number; noise: number }> = {
  beenie: { delay: 30, noise: 5 }, magnet: { delay: 45, noise: 30 }, zwinkys: { delay: 25, noise: 15 }, choke: { delay: READ_ALOUD_SECONDS, noise: 5 },
};

export interface GameState {
  version: 12;
  encounter: Encounter;
  seed: number;
  elapsed: number;
  view: ViewId;
  drawerOpen: boolean;
  cushionRaised: boolean;
  spoon: 'cushion' | 'inventory' | 'confiscated' | 'stash';
  rag: 'drawer' | 'inventory' | 'stash' | 'wrapped';
  screwdriver: 'hidden' | 'drawer' | 'inventory' | 'stash';
  brassKey: 'pizza' | 'inventory' | 'stash';
  // The cuff key lives on a shoelace around Cletus's neck until it falls off during his dance.
  finalKey: 'cletus' | 'floor' | 'inventory' | 'stash';
  magnet: 'cab-k1' | 'inventory' | 'stash' | 'outside';
  beenie: 'cab-u2' | 'inventory' | 'stash' | 'outside';
  lotto: 'floor' | 'inventory' | 'stash';
  choke: 'cabinet' | 'inventory' | 'stash' | 'outside';
  dildo: 'counter' | 'inventory' | 'stash' | 'ronnie' | 'darlene';
  zwinkys: 'counter' | 'inventory' | 'stash' | 'darlene' | 'outside';
  lighter: 'darlene' | 'floor' | 'inventory' | 'stash';
  butt: 'ashtray' | 'inventory' | 'stash' | 'gone';
  bobbyPins: 'ashtray' | 'inventory' | 'stash';
  usedNeedles: 'pizzaRear' | 'inventory' | 'stash' | 'gone';
  axe: 'cabinet' | 'inventory' | 'stash';
  // The rag, wrapped around a tool to muffle it.
  wrapped: WrappableId | null;
  ragSoiled: boolean;
  puddle: boolean;
  steady: number;
  outsideReading: number;
  // The dinette CRT. Off until Cletus turns it on to show you yourself on the news.
  tvOn: boolean;
  // Which stop on the dial (channels.ts TV_DIAL), and the broadcast clock every station airs on.
  tvChannel: number;
  tvClock: number;
  tvMuted: boolean;
  tvShown: boolean;
  // Nobody has handed you the remote yet. When they do, it drives the set from anywhere.
  remote: 'hidden' | 'inventory' | 'stash';
  // Seconds the current fire has been burning; 0 when nothing is. fireSpot is the last thing lit.
  fire: number;
  fireSpot: FireSpot | null;
  burnt: Record<FireSpot, boolean>;
  // When Dale is next due, and what he left behind: a radio on the floor by the couch, looping Fine Again.
  daleAt: number;
  radio: 'none' | 'floor';
  radioOn: boolean;
  radioClock: number;
  // Seconds of high left, and how close you are to losing it.
  trip: number;
  paranoia: number;
  // The story: has Cletus made his first visit, has the spoon bent, and the earliest game time the next
  // story beat (storyBeat) may come through the door.
  introDone: boolean;
  spoonBent: boolean;
  storyAt: number;
  cabinets: Record<CabinetId, boolean>;
  pizzaOpened: boolean;
  rummaged: Record<RummageId, boolean>;
  cabinetUnlocked: boolean;
  cuffOpen: boolean;
  doorChops: number;
  escaped: boolean;
  danced: boolean;
  ronnieCalm: number;
  nextVisit: number;
  nextVisitor?: VisitorId;
  chainStrikes: number;
  knockouts: number;
  layout: number;
  bracketWork: number;
  bracketConcealed: boolean;
  noise: number;
  journal: string[];
}

export type Action =
  | { type: 'view'; view: ViewId }
  | { type: 'drawer' }
  | { type: 'cushion' }
  | { type: 'cabinet'; cabinet: CabinetId }
  | { type: 'rummage'; spot: RummageId }
  | { type: 'unlock-cabinet'; item: ItemId | null }
  | { type: 'unlock-cuff'; item: ItemId | null }
  | { type: 'take'; item: ItemId }
  | { type: 'take-ashtray' }
  | { type: 'return'; item: ItemId }
  | { type: 'work'; item: ItemId | null }
  | { type: 'drink' }
  | { type: 'wrap'; item: WrappableId }
  | { type: 'unwrap' }
  | { type: 'wipe' }
  | { type: 'throw'; item: ItemId }
  | { type: 'smoke' }
  | { type: 'chew' }
  | { type: 'read' }
  | { type: 'stab' }
  | { type: 'tv'; command: TvCommand }
  | { type: 'ignite'; spot: FireSpot }
  | { type: 'bulb'; take: boolean }
  | { type: 'radio' }
  | { type: 'freakout' }
  | { type: 'banish' }
  | { type: 'snatch' }
  | { type: 'give-ronnie'; item: ItemId }
  | { type: 'chop'; item: ItemId | null }
  | { type: 'conceal' }
  | { type: 'recover' }
  | { type: 'wake' }
  | { type: 'skip-kiss' }
  | { type: 'rattle' }
  | { type: 'respond'; response: ResponseId }
  | { type: 'tick'; seconds: number }
  | { type: 'note'; text: string };

export type Sound = 'drawer' | 'cloth' | 'take' | 'metal' | 'release' | 'alarm' | 'step' | 'door' | 'kiss' | 'vomit' | 'whoop' | 'chop' | 'slam' | 'hit' | 'kill' | 'tvon' | 'tvoff' | 'click' | 'ignite' | 'splash' | 'rip' | 'torch' | 'cough' | 'inhale' | 'shriek' | 'banish';
export interface Result { state: GameState; message?: string; sound?: Sound; vomit?: boolean; slop?: boolean; }

export function freshState(): GameState {
  return {
    version: 12, encounter: encounterDefaults(), tvClock: 0, introDone: false, spoonBent: false, storyAt: INTRO_FALLBACK,
    wrapped: null, ragSoiled: false, puddle: false, steady: 0, outsideReading: 0,
    fire: 0, fireSpot: null, burnt: { floorPapers: false, trash: false, pizza: false, pizzaRear: false },
    daleAt: DALE_AT, radio: 'none', radioOn: false, radioClock: 0, trip: 0, paranoia: 0,
    tvOn: false, tvChannel: 0, tvMuted: false, tvShown: false, remote: 'hidden', seed: 731904, elapsed: 0, view: 'seat', drawerOpen: false,
    screwdriver: 'hidden', chainStrikes: 0, knockouts: 0, layout: 0,
    cushionRaised: false, spoon: 'cushion', rag: 'drawer', bracketWork: 0,
    brassKey: 'pizza', finalKey: 'cletus', magnet: 'cab-k1', beenie: 'cab-u2', lotto: 'floor', choke: 'cabinet',
    dildo: 'counter', zwinkys: 'counter', butt: 'ashtray', bobbyPins: 'ashtray', usedNeedles: 'pizzaRear', axe: 'cabinet', lighter: 'darlene',
    cabinets: { k1: false, k2: false, k3: false, u1: false, u2: false, u3: false },
    pizzaOpened: false, rummaged: { pizza: false, trash: false, floorPapers: false, cans: false },
    cabinetUnlocked: false, cuffOpen: false, doorChops: 0, escaped: false, danced: false, ronnieCalm: 0,
    // No routine visits until Cletus has made his first appearance.
    nextVisit: NO_VISIT,
    bracketConcealed: false, noise: 0,
    journal: ['A cuff, a chain, a floor bracket. Somebody spent more on the padlock than the floor.'],
    nextVisitor: undefined,
  };
}

export function isFree(state: GameState): boolean { return state.bracketWork === 3; }
export function canVisit(state: GameState, view: ViewId): boolean {
  return isFree(state) || view === 'seat' || view === 'kitchen' || view === 'bracket';
}
const ITEM_LIST: ItemId[] = ['spoon', 'rag', 'screwdriver', 'brassKey', 'finalKey', 'magnet', 'beenie', 'lotto', 'choke', 'dildo', 'zwinkys', 'butt', 'bobbyPins', 'usedNeedles', 'axe', 'lighter', 'remote'];
export function inventory(state: GameState): ItemId[] {
  return ITEM_LIST.filter(item => state[item] === 'inventory');
}
const ITEM_SET = new Set<string>(ITEM_LIST);
export function isItemId(value: string): value is ItemId { return ITEM_SET.has(value); }
const stashable = (state: GameState): ItemId[] => ITEM_LIST.filter(item => state[item] === 'stash');
export function hasStash(state: GameState): boolean { return stashable(state).length > 0; }
const nearCounter = (state: GameState) => state.view === 'seat' || state.view === 'kitchen';
const nearCouch = (state: GameState) => state.view === 'seat' || state.view === 'kitchen' || state.view === 'bracket';
export const isThrowable = (item: ItemId): item is ThrowableId => item in THROWS;
export const isWrappable = (item: ItemId): item is WrappableId => item === 'spoon' || item === 'screwdriver' || item === 'axe';
// Why you cannot set this on fire right now, or null if you can.
export function fireRefusal(state: GameState, spot: FireSpot): string | null {
  if (state.lighter !== 'inventory') return 'You have nothing to light it with.';
  if (state.fire > 0) return 'Something is already on fire. That is plenty.';
  if (state.burnt[spot]) return 'Already burnt down to wet black ash. Nothing left in there to burn.';
  if (state.encounter.phase !== 'idle') return 'Not now. Somebody is already coming.';
  if (spot === 'floorPapers' && !nearCouch(state)) return 'The papers are on the floor by the couch.';
  if (spot === 'trash' && !isFree(state)) return 'The chain stops you a foot short of the trash bags. The papers by the couch are closer.';
  if (spot === 'trash' && state.view === 'rear') return 'The trash bags are up by the kitchen.';
  if (spot === 'pizza' && state.view !== 'dinette') return 'The pizza box is on the dinette table.';
  if (spot === 'pizzaRear' && state.view !== 'rear') return 'That pizza box is back by the bunk.';
  return null;
}
// ---------------------------------------------------------------------------------------------
// The escape is a line, and each tweaker hands you a link of it:
//   0 chained      spoon bends on the fitting -> Cletus's first visit leaves his screwdriver -> free of the floor
//   1 free         Darlene's rampage drops her lighter -> smoke for steady hands -> pick the footlocker
//   2 footlocker   axe inside, and a note: the key stays on Cletus -> TV night, he shows you the key
//   3 need the key the dance: the shoelace snaps, grab the key -> unlock the cuff
//   4 cuff off     the braced door will not give sober -> Dale's bulb
//   5 high         chop out
// Story beats come when you reach a stage, not on a timer; routine visits keep the pressure on in between.
export const NO_VISIT = 1e9;
// If you never touch the fitting, Cletus comes in anyway at this point to get things moving.
export const INTRO_FALLBACK = 90;
// How long after you reach a stage its visitor turns up, and the gap after any visit before the next beat.
export const STORY_DELAY = { free: 30, footlocker: 25, cuff: 25, spacing: 30, retry: 75 } as const;
const routineGap = (state: GameState) => 70 + (state.seed % 41);

export type Stage = 0 | 1 | 2 | 3 | 4 | 5;
export function stage(state: GameState): Stage {
  if (state.cuffOpen) return state.trip > 0 ? 5 : 4;
  if (!isFree(state) && !state.cabinetUnlocked) return 0;
  if (!state.cabinetUnlocked) return 1;
  return state.tvShown ? 3 : 2;
}

// The visit the story needs next, if any (it comes once game time reaches storyAt).
export function storyBeat(state: GameState): { visitor: VisitorId; purpose?: Encounter['nextPurpose'] } | null {
  if (state.escaped) return null;
  if (!state.introDone) return { visitor: 'cletus', purpose: 'intro' };
  const at = stage(state);
  if (at === 1 && state.lighter === 'darlene') return { visitor: 'darlene' };
  if (at === 2) return { visitor: 'cletus', purpose: 'tv' };
  if (at === 3 && state.finalKey === 'cletus') return { visitor: 'cletus', purpose: 'dance' };
  if (at === 4) return { visitor: 'dale' };
  return null;
}

// When the next visit of any kind is due, and who it will be: peeking through the blinds tells you.
export const nextVisitAt = (state: GameState): number => Math.min(state.nextVisit, storyBeat(state) ? state.storyAt : NO_VISIT);
export function upcomingVisitor(state: GameState): VisitorId {
  const beat = storyBeat(state);
  if (beat && state.storyAt <= state.nextVisit) return beat.visitor;
  return state.nextVisitor ?? ROTATION[state.seed % ROTATION.length];
}
// How hard the bulb is hitting right now, 0 to 1: it fades in at the end and out at the end.
export const tripLevel = (state: GameState): number => Math.min(1, state.trip / 15);

export function transition(current: GameState, action: Action): Result {
  const state: GameState = { ...current, encounter: { ...current.encounter }, journal: [...current.journal], cabinets: { ...current.cabinets }, rummaged: { ...current.rummaged } };
  const encounter = state.encounter;
  const result = (message?: string, sound?: Result['sound']): Result => ({ state, message, sound });
  const note = (text: string) => { if (!state.journal.includes(text)) state.journal.push(text); };
  if (state.escaped || encounter.phase === 'dead') return result();
  if (encounter.phase === 'blackout' && action.type !== 'wake') return result();
  if (encounter.phase === 'kiss' && action.type !== 'tick' && action.type !== 'skip-kiss') return result();
  if ((encounter.phase === 'dance' || encounter.phase === 'tvshow') && action.type !== 'tick' && action.type !== 'note' && action.type !== 'snatch') return result('You have to watch.');
  if ((encounter.phase === 'grab' || encounter.phase === 'kill' || encounter.phase === 'douse') && action.type !== 'tick' && action.type !== 'stab') return result();
  if ((encounter.phase === 'hangout' || encounter.phase === 'bulb') && action.type !== 'tick' && action.type !== 'note') return result('Dale is going through something. Let him.');
  if (encounter.phase === 'offer' && action.type !== 'tick' && action.type !== 'note' && action.type !== 'bulb') return result('Dale is holding the bulb out to you. Hit it, or pass.');
  // Dale walks out: visit counted, radio left playing on the floor.
  const daleLeaves = (outcome: string) => {
    encounter.phase = 'leaving';
    encounter.remaining = LEAVE_SECONDS;
    encounter.visits += 1;
    encounter.outcome = outcome;
    state.radio = 'floor';
    if (state.trip <= 0) state.storyAt = state.elapsed + STORY_DELAY.retry;
    note('Dale leaves his radio playing on the floor by the couch. It covers the sound of work.');
  };
  // One hit off the bulb: the high stacks, the paranoia starts.
  const getHigh = () => {
    state.trip = Math.min(TRIP_MAX, state.trip + TRIP_SECONDS);
    state.paranoia = Math.max(state.paranoia, 10);
    note('Shadow people come with the bulb. Stare them down: click them before they reach me, or I scream.');
  };
  const startApproach = (visitor: VisitorId, purpose?: Encounter['nextPurpose']) => {
    encounter.phase = 'approach';
    // Cletus's first visit gives you a long, loud warning, so you learn to get back on the couch in time.
    encounter.remaining = purpose === 'intro' ? INTRO_APPROACH_SECONDS : APPROACH_SECONDS;
    encounter.nextVisitor = visitor;
    encounter.nextPurpose = purpose;
    encounter.origin = patrolDepth(encounter.patrol, visitorIndex(visitor));
  };
  const agitate = (amount: number) => {
    if (encounter.phase !== 'idle' || encounter.cooldown > 0 || state.ronnieCalm > 0) return;
    encounter.agitation = Math.min(100, encounter.agitation + amount);
    if (encounter.agitation >= 85) {
      encounter.phase = 'alarm';
      encounter.remaining = 2;
      encounter.nextVisitor = 'cletus';
      encounter.origin = patrolDepth(encounter.patrol, visitorIndex('cletus'));
      note('Ronnie reaches for his buzzer when frightened. His cry brings footsteps to the door.');
    }
  };
  // The rag comes off whatever it was muffling and goes back in your pocket.
  const unwrap = () => {
    if (!state.wrapped) return;
    state.wrapped = null;
    state.rag = 'inventory';
  };
  // Beaten unconscious: chained back to the couch, pockets emptied into a bundle in the drawer, ninety seconds gone.
  const knockOut = () => {
    state.chainStrikes += 1;
    state.knockouts += 1;
    state.elapsed += 90;
    state.layout += 1;
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    state.bracketWork = 0;
    state.bracketConcealed = false;
    state.view = 'seat';
    state.cushionRaised = false;
    unwrap();
    for (const item of inventory(state)) state[item] = 'stash';
    if (state.screwdriver === 'hidden') state.screwdriver = 'drawer';
    // Even a beating counts as meeting Cletus: the routine visits start, and the screwdriver is in the drawer.
    if (!state.introDone) { state.introDone = true; state.nextVisit = state.elapsed + routineGap(state); }
    if (state.dildo === 'ronnie') state.dildo = 'counter';
    state.drawerOpen = true;
    encounter.phase = 'blackout';
    encounter.remaining = 0;
    note('Woke up chained to the couch again. Empty pockets. My gear is bundled in the kitchen drawer. If they catch me off this couch again, they will kill me.');
  };
  // On her way out Darlene finds the lighter in her own fist and flings it on the floor by the couch.
  // Without it, she drops something else she is holding or steals something off the counter. Never from your pockets.
  const rampageHaul = (): Haul => {
    if (state.lighter === 'darlene') {
      state.lighter = 'floor';
      note('Darlene threw her lighter on the floor by the couch. It was in her hand the whole time. It works.');
      return 'drop-lighter';
    }
    const held = (['zwinkys', 'dildo'] as const).filter(item => state[item] === 'darlene');
    const takeable = (['zwinkys', 'dildo'] as const).filter(item => state[item] === 'counter');
    if (held.length && (encounter.visits % 2 === 0 || !takeable.length)) {
      const item = held[0];
      state[item] = 'counter';
      return `drop-${item}`;
    }
    if (takeable.length) {
      state[takeable[0]] = 'darlene';
      return `take-${takeable[0]}`;
    }
    return 'nothing';
  };
  if (encounter.phase === 'dialogue' && action.type !== 'respond' && action.type !== 'note') return result();
  if (encounter.phase === 'entering' && action.type !== 'tick' && action.type !== 'note') return result('Too late to hide the evidence. He is already in the doorway.');
  if (encounter.phase === 'search' && action.type !== 'tick' && action.type !== 'note') return result('She is between you and everything. Do not move.');
  switch (action.type) {
    case 'view':
      if (!canVisit(state, action.view)) return result('The chain stops short. The floor fitting needs to come loose first.');
      if (state.view === action.view) return result();
      if (state.view === 'rear' || action.view === 'rear') {
        agitate(state.elapsed - encounter.lastMove < 2.5 ? 38 : 9);
        encounter.lastMove = state.elapsed;
      }
      state.view = action.view;
      if (action.view !== 'seat') state.bracketConcealed = false;
      return result();
    case 'drawer':
      if (state.view !== 'kitchen' && state.view !== 'seat') return result('Get closer to the kitchenette.');
      state.drawerOpen = !state.drawerOpen;
      return result(state.drawerOpen ? 'It smells like wet matches. A rag, bottle caps, and somebody else\'s rules.' : 'Shut. As required by the household constitution.', 'drawer');
    case 'cushion':
      if (state.view !== 'seat' && state.view !== 'bracket') return result('Go back to the Stinky Pee Couch.');
      state.cushionRaised = !state.cushionRaised;
      return result(state.cushionRaised ? 'The cushion comes up reluctantly. Something has been living better than you under here.' : 'Back down. The stain is a permanent resident.', 'cloth');
    case 'cabinet': {
      const open = state.cabinets[action.cabinet];
      state.cabinets[action.cabinet] = !open;
      return result(open ? 'Cabinet shut. Something inside shifted and settled.' : 'The cabinet door swings out with a sticky crack.', 'drawer');
    }
    case 'rummage': {
      if (isFireSpot(action.spot) && state.burnt[action.spot]) return result('Nothing in there now but wet black ash and a smell that will outlive you.');
      if (state.rummaged[action.spot]) return result('You already dug through that. Nothing left but regret.');
      state.rummaged[action.spot] = true;
      state.noise = Math.min(100, state.noise + 7);
      if (action.spot === 'floorPapers') return result('Overdue notices, threats, and a losing scratch ticket that smells like pee. You leave it where it lies.');
      if (action.spot === 'trash') return result('You dig to the bottom. Coffee grounds, a gooey paper towel, a taco wrapper from 2019. Nothing worth pocketing.');
      return result('Nothing in there you want. Nothing in there anybody should want.');
    }
    case 'unlock-cabinet': {
      if (state.view !== 'rear') return result('The padlocked footlocker is in the back room, at the foot of the bunk.');
      if (state.cabinetUnlocked) return result('The footlocker is already open. The lid is propped against the wall.');
      const pins = action.item === 'bobbyPins' && state.bobbyPins === 'inventory';
      // Only saves from before the redesign can hold the old brass key.
      const key = action.item === 'brassKey' && state.brassKey === 'inventory';
      if (!pins && !key) return result('A cheap padlock. Something thin and springy could pick it. The emergency ashtray on the dinette is full of junk like that.');
      if (pins && state.steady <= 0) {
        note('My hands shake too hard to pick the footlocker. I need something to steady them. A smoke would do it, if I had a light.');
        return result('You get a bobby pin into the lock and your hands shake so hard it rattles like a maraca. Tweaked-out hostage hands. You need something to steady them first. A smoke, maybe.');
      }
      state.cabinetUnlocked = true;
      state.noise = Math.min(100, state.noise + 12);
      state.storyAt = state.elapsed + STORY_DELAY.footlocker;
      note('The footlocker is open: an axe, a paperback, and a note. The cuff key stays on Cletus. Always.');
      return result('Steady as a surgeon, you rake the padlock until it gives. Click. The lid comes up: an axe, a purple paperback, and a note in marker: KEY STAYS ON CLETUS. ALWAYS.', 'metal');
    }
    case 'unlock-cuff': {
      if (state.cuffOpen) return result('The cuff is already open. You are one decision from gone.');
      if (action.item !== 'finalKey' || state.finalKey !== 'inventory') return result(state.finalKey === 'cletus' ? 'The cuff lock is heavy and old. Its key hangs on a shoelace around Cletus\'s neck.' : 'The cuff lock is heavy and old. A big key, not a spoon.');
      state.cuffOpen = true;
      state.storyAt = state.elapsed + STORY_DELAY.cuff;
      note('The cuff is open. The front door is plywood over steel bracing. I am not strong enough to chop through it. Not like this.');
      return result('The cuff springs open. Your wrist is your own for the first time in two days.', 'release');
    }
    case 'chop': {
      if (action.item !== 'axe' || state.axe !== 'inventory') return result('Locked from outside. You would need something heavy to get through it.');
      if (!state.cuffOpen) return result('The cuff yanks your arm back mid-swing. Get the cuff off first.');
      if (state.view !== 'seat' && state.view !== 'kitchen') return result('Get to the entry door first.');
      // Muffled with the rag and covered by Dale's radio, a swing is barely a thud; bare, it carries.
      const thud = state.wrapped === 'axe' ? (state.radioOn ? 11 : 22) : (state.radioOn ? 35 : 60);
      state.noise = Math.min(100, state.noise + thud);
      // Sober, the steel bracing behind the plywood just rings. High, you swing like a man possessed.
      if (state.trip <= 0) {
        note('The door has steel bracing behind the plywood. Sober, I cannot get through it. I need to be a lot stronger. Or a lot higher.');
        return result('CLANG. The axe bounces off steel bracing behind the plywood and your arms go numb to the shoulder. You are not strong enough. Not like this.', 'metal');
      }
      state.doorChops += 2;
      if (state.doorChops >= DOOR_CHOPS) {
        state.escaped = true;
        return result('The door splits down the middle and you go through it shoulder first.', 'door');
      }
      return result(state.doorChops <= 2 ? 'THUNK-THUNK. Two swings in one breath. Your arms are not your arms. The bracing groans.' : 'THUNK-THUNK. Daylight through the crack. The bracing is hanging by one bolt. ONE MORE.', 'chop');
    }
    case 'take': {
      const item = action.item;
      if (state[item] === 'inventory') return result('Already in your pocket.');
      if (state[item] === 'stash') return result('Your things are bundled in the kitchen drawer. Open the bundle.');
      if (item === 'spoon') {
        if (state.spoon === 'confiscated') return result('Cletus took the spoon. The screwdriver he left in the kitchen drawer will fit.');
        if ((state.view !== 'seat' && state.view !== 'bracket') || !state.cushionRaised) return result('I wonder what\'s under the cushions');
        state.spoon = 'inventory';
        note('Found a spoon under the cushion. Flat handle. The floor fitting has a broad slot.');
        return result('A bent spoon. Finally, somebody left the good silver out.', 'take');
      }
      if (item === 'rag' || item === 'screwdriver') {
        if (state[item] !== 'drawer' || !state.drawerOpen || (state.view !== 'seat' && state.view !== 'kitchen')) return result(item === 'rag' ? 'Open the kitchen drawer first.' : 'The screwdriver is not exposed here.');
        state[item] = 'inventory';
        if (item === 'screwdriver') note('Cletus left his screwdriver in the kitchen drawer. It fits the floor fitting.');
        return result(item === 'rag' ? 'Pocketed the rag. Calling it a rag is being generous.' : 'A flat screwdriver. He used it on the fitting and left it in the drawer. His mistake.', item === 'rag' ? 'cloth' : 'take');
      }
      if (state[item] === 'darlene') return result(item === 'lighter' ? 'Darlene has it. She is screaming about it somewhere, probably while holding it.' : 'Darlene took it. It lives somewhere on Darlene now. Let it go.');
      if (item === 'lighter') {
        if (state.view === 'dinette' || state.view === 'rear') return result('Her lighter is on the floor up by the couch.');
        state.lighter = 'inventory';
        return result('You scoop up Darlene\'s lighter. It is warm, sticky and shaped like a naked lady. You do not want to know why it is warm.', 'take');
      }
      if (item === 'dildo') {
        if (state.dildo === 'ronnie') return result('Ronnie has it in a death grip. You are not wrestling him for it.');
        if (!nearCounter(state)) return result('It is on the kitchen counter.');
        state.dildo = 'inventory';
        return result('I place the dildo up my butt for safe keeping surely no one will notice', 'cloth');
      }
      if (item === 'zwinkys') {
        if (state.view === 'bracket' || state.view === 'rear') return result('The Zwinkys is on the counter.');
        state.zwinkys = 'inventory';
        return result('You put the Zwinkys in your pocket', 'take');
      }
      if (item === 'butt' || item === 'bobbyPins') return transition(current, { type: 'take-ashtray' });
      if (item === 'usedNeedles') {
        if (state.view !== 'rear') return result('That pizza box is back by the bunk.');
        state.usedNeedles = 'inventory';
        return result('You pinch the used needles out of the pizza box by their very tips and pocket them. Your whole body clenches.', 'take');
      }
      if (item === 'brassKey') return result('The brass key is not somewhere you can reach.');
      if (item === 'lotto') return result('I’m not going to touch that it smells like pee');
      if (item === 'finalKey') return result(state.finalKey === 'cletus' ? 'The cuff key hangs on a greasy shoelace around Cletus\'s neck. It never comes off. Supposedly.' : 'Grab it while he is not looking!');
      if (item === 'choke' || item === 'axe') {
        if (state.view !== 'rear') return result('That is in the footlocker in the back room, at the foot of the bunk.');
        if (!state.cabinetUnlocked) return result('The footlocker is padlocked.');
        if (state[item] !== 'cabinet') return result('Already taken.');
        state[item] = 'inventory';
        if (item === 'axe') note('Got the axe. The front door is plywood. The cuff has to come off first.');
        return result(item === 'axe' ? 'An axe. Short handle, heavy head, hair on the blade. It goes down the back of your trousers, next to the other thing.' : 'A purple paperback: CHOKE ON MY LOVE. The cover is doing something illegal in fourteen states. Pocketed.', 'take');
      }
      if (item === 'magnet' || item === 'beenie') {
        const spot: CabinetId = item === 'magnet' ? 'k1' : 'u2';
        if (!state.cabinets[spot]) return result('Open the cabinet first.');
        if (state[item] !== `cab-${spot}`) return result('Already taken.');
        state[item] = 'inventory';
        return result(item === 'magnet' ? 'A MELT-IN-YOUR-MOUTH-MABEL\'S fridge magnet, laminated and unforgivable. Pocketed.' : 'A single beaded baby shoe. There is no baby. There has never been a baby. Pocketed.', 'take');
      }
      return result('You cannot pocket that. Not with these trousers.');
    }
    case 'take-ashtray': {
      if (state.view !== 'dinette') return result('I can’t reach that its too far');
      // There is always another butt in the emergency ashtray.
      if (state.butt === 'gone') state.butt = 'ashtray';
      if (state.butt !== 'ashtray' && state.bobbyPins !== 'ashtray') return result('Nothing left in there but ash and regret.');
      if (state.butt === 'ashtray') state.butt = 'inventory';
      if (state.bobbyPins === 'ashtray') state.bobbyPins = 'inventory';
      note('Got bobby pins out of the emergency ashtray. Thin and springy. Lock-shaped, if you squint.');
      return result('Cigarette butt. And tangled under it, a couple of bobby pins.', 'take');
    }
    case 'return': {
      const item = action.item;
      if (state[item] !== 'inventory') return result('It is already where you found it.');
      if (state.wrapped === item) unwrap();
      if (item === 'spoon') {
        if ((state.view !== 'seat' && state.view !== 'bracket') || !state.cushionRaised) return result('Go to the couch and lift the cushion to put it back.');
        state.spoon = 'cushion';
        return result('Spoon back under the cushion. Your inheritance, restored.', 'take');
      }
      if (item === 'rag' || item === 'screwdriver') {
        if ((state.view !== 'kitchen' && state.view !== 'seat') || !state.drawerOpen) return result('Open the kitchen drawer to put it back.');
        state[item] = 'drawer';
        return result(item === 'rag' ? 'Rag back in the drawer.' : 'Screwdriver back in the drawer.', item === 'rag' ? 'cloth' : 'take');
      }
      if (item === 'lighter') {
        if (state.view === 'dinette' || state.view === 'rear') return result('It goes back on the floor where she threw it.');
        state.lighter = 'floor';
        return result('You drop the lighter back where she threw it. Evidence of nothing.', 'cloth');
      }
      if (item === 'dildo' || item === 'zwinkys') {
        if (!nearCounter(state) && !(item === 'zwinkys' && state.view === 'dinette')) return result('It goes back on the kitchen counter.');
        state[item] = 'counter';
        return result(item === 'dildo' ? 'You extract it and set it back by the sink. Nobody will ever know. The sink knows.' : 'The Zwinkys goes back on the counter with the other crimes.', 'cloth');
      }
      if (item === 'butt' || item === 'bobbyPins') {
        if (state.view !== 'dinette') return result('It came from the emergency ashtray on the dinette.');
        state[item] = 'ashtray';
        return result('Back in the emergency ashtray. Crisis averted.', 'cloth');
      }
      if (item === 'usedNeedles') {
        if (state.view !== 'rear') return result('They came from the pizza box by the bunk.');
        state.usedNeedles = 'pizzaRear';
        return result('The needles go back in the pizza box. You will be washing your hands in your dreams.', 'cloth');
      }
      if (item === 'brassKey') return result('Better keep it.');
      if (item === 'lotto') {
        state.lotto = 'floor';
        return result('The losing ticket goes back on the floor, where losing things live.', 'cloth');
      }
      if (item === 'finalKey') return result('You are not giving that back. Not to anyone. Not ever.');
      if (item === 'choke' || item === 'axe') {
        if (state.view !== 'rear' || !state.cabinetUnlocked) return result('It goes back in the footlocker in the back room.');
        state[item] = 'cabinet';
        return result(item === 'axe' ? 'The axe goes back in the footlocker, blade down.' : 'The novel goes back in the footlocker. The footlocker seems relieved.', 'cloth');
      }
      if (item === 'magnet' || item === 'beenie') {
        const spot: CabinetId = item === 'magnet' ? 'k1' : 'u2';
        if (!state.cabinets[spot]) return result('Open the cabinet first.');
        if (item === 'magnet') state.magnet = 'cab-k1'; else state.beenie = 'cab-u2';
        return result(item === 'magnet' ? 'Magnet back on its little shelf of shame.' : 'The tiny shoe goes back to watch the dark.', 'cloth');
      }
      return result('It is already where you found it.');
    }
    case 'drink': {
      const reachable = state.zwinkys === 'inventory' || (state.zwinkys === 'counter' && state.view !== 'bracket' && state.view !== 'rear');
      if (!reachable) return result(state.zwinkys === 'darlene' ? 'Darlene took the Zwinkys. You mourn it.' : 'The Zwinkys is on the counter.');
      state.noise = Math.min(100, state.noise + 22);
      if (state.view === 'rear') agitate(30);
      state.puddle = true;
      return { state, message: 'Aahh refreshing', sound: 'vomit', vomit: true };
    }
    case 'wrap': {
      if (state.rag !== 'inventory') return result(state.wrapped ? 'The rag is already wrapped around something.' : 'You need the rag in your pocket.');
      if (state[action.item] !== 'inventory') return result('You are not holding that.');
      state.rag = 'wrapped';
      state.wrapped = action.item;
      return result(`You bind the ${state.ragSoiled ? 'puke rag' : 'filthy rag'} tight around the ${action.item === 'axe' ? 'axe head' : action.item}. It is quieter now. It also smells like everything.`, 'cloth');
    }
    case 'unwrap':
      if (!state.wrapped) return result('Nothing is wrapped.');
      unwrap();
      return result('You peel the rag back off. It has taken the shape of the tool, which is upsetting.', 'cloth');
    case 'wipe': {
      if (!state.puddle) return result('There is nothing to wipe. For once.');
      if (state.rag !== 'inventory') return result(state.wrapped ? 'Unwrap the rag first.' : 'You need something to wipe it with.');
      if (!nearCouch(state)) return result('The puddle is by the couch.');
      state.puddle = false;
      state.ragSoiled = true;
      state.noise = Math.min(100, state.noise + 4);
      return result('You mop your own puke off the floor with the rag and wring it out behind the couch. The rag is a puke rag now. It was always going to be.', 'cloth');
    }
    case 'throw': {
      const item = action.item;
      if (!isThrowable(item) || state[item] !== 'inventory') return result('You cannot throw that out of a window. Not usefully.');
      if (!isFree(state)) return result('The chain stops you a foot short of the window.');
      if (state.view !== 'dinette' && state.view !== 'rear') return result('Get to a window first.');
      if (encounter.phase !== 'idle') return result('Too late for that. Somebody is already coming.');
      const { delay, noise } = THROWS[item];
      state[item] = 'outside';
      state.nextVisit += delay;
      state.noise = Math.min(100, state.noise + noise);
      if (item === 'choke') state.outsideReading = READ_ALOUD_SECONDS;
      note('Throwing things out the window makes them go look. It buys time.');
      return result({
        beenie: 'The baby shoe sails through the gap in the blinds and lands in the weeds. Outside, Darlene stops. She stares at it for a long, long time. Nobody is coming in for a while.',
        magnet: 'The magnet clanks off a propane tank like a church bell. Everybody outside goes to find out what did that. Loud, but they are busy.',
        zwinkys: 'The Zwinkys can clatters across the gravel. Somebody runs after it on reflex. Nobody lets a Zwinkys go.',
        choke: 'CHOKE ON MY LOVE flutters out into the yard. Cletus picks it up. He sits down in the weeds. He licks his finger. He starts reading it OUT LOUD.',
      }[item], 'cloth');
    }
    case 'smoke': {
      if (state.butt !== 'inventory') return result('You have nothing to smoke.');
      if (state.lighter !== 'inventory') return result('Nothing to light it with. Darlene\'s lighter is out there somewhere, being screamed about.');
      state.butt = 'gone';
      state.steady = STEADY_SECONDS;
      state.noise = Math.min(100, state.noise + 8);
      note('A smoke steadies my hands. For a minute, I can work without a sound.');
      return result('You light the chewed butt with the naked-lady lighter and take one long, filthy drag. You cough until you see stars. Then your hands stop shaking. Everything is very clear and very quiet. You could pick a lock in church.', 'take');
    }
    case 'chew': {
      if (state.butt !== 'inventory') return result('You have nothing to chew. Thank God.');
      state.butt = 'gone';
      state.puddle = true;
      return { state, message: 'You chew the cigarette butt. You do not know why. Your body knows why. Your body rejects it immediately and all over the floor.', sound: 'vomit', vomit: true };
    }
    case 'read':
      if (state.choke !== 'inventory') return result('You have nothing to read.');
      state.noise = Math.max(0, state.noise - 30);
      encounter.agitation = Math.max(0, encounter.agitation - 30);
      return result(READINGS[Math.floor(state.elapsed * 7 + state.seed) % READINGS.length], 'cloth');
    case 'tv': {
      // Up at the set, the power button and the volume rocker on its side still work. The channel knob snapped off.
      const byHand = state.remote !== 'inventory' && state.view === 'dinette' && (action.command === 'power' || action.command === 'mute');
      if (state.remote !== 'inventory' && !byHand) return result(state.view === 'dinette' ? 'The channel knob snapped off years ago. You would need the remote.' : 'The set is over by the dinette, and the knobs snapped off years ago. Get up to it, or find the remote.');
      if (byHand && action.command === 'power') {
        state.tvOn = !state.tvOn;
        return result(state.tvOn ? 'You jab the power button on the side of the set. It thunks, whines, and the picture blooms back up.' : 'You jab the power button on the side of the set. The picture shrinks to a white dot and dies. The trailer gets very quiet.', state.tvOn ? 'tvon' : 'tvoff');
      }
      if (byHand) {
        if (!state.tvOn) return result('The TV is off. It is already as quiet as it gets.');
        state.tvMuted = !state.tvMuted;
        return result(state.tvMuted ? 'You hold the volume rocker down until the anchor is just a mouth moving.' : 'You hold the volume rocker up until it is loud enough to hear yourself be missing.', 'click');
      }
      const count = TV_DIAL.length;
      const tunedTo = () => TV_DIAL[state.tvChannel].station ? `Channel ${TV_DIAL[state.tvChannel].number}: ${dialLabel(state.tvChannel)}.` : `Channel ${TV_DIAL[state.tvChannel].number}: nothing but snow. The antenna is doing its best.`;
      if (action.command === 'power') {
        state.tvOn = !state.tvOn;
        return result(state.tvOn ? `Click. The screen blooms. ${tunedTo()}` : 'Click. The picture shrinks to a white dot and dies.', state.tvOn ? 'tvon' : 'tvoff');
      }
      if (action.command === 'mute') {
        if (!state.tvOn) return result('The TV is off. It is already as quiet as it gets.');
        state.tvMuted = !state.tvMuted;
        return result(state.tvMuted ? 'Muted. The anchor keeps mouthing at you.' : 'The sound comes back, too loud, the way they like it.', 'click');
      }
      state.tvChannel = (state.tvChannel + (action.command === 'next' ? 1 : count - 1)) % count;
      const wasOff = !state.tvOn;
      state.tvOn = true;
      return result(tunedTo(), wasOff ? 'tvon' : 'click');
    }
    case 'bulb':
      if (encounter.phase !== 'offer') return result();
      if (action.take) {
        encounter.phase = 'bulb';
        encounter.remaining = BULB_SECONDS;
        return result(undefined, 'torch');
      }
      daleLeaves('Dale: "Respect. Respect, bro. More for me." He hits the bulb again himself, leaves the radio playing on the floor and shuffles out, crying a little.');
      return result(encounter.outcome, 'cough');
    case 'radio':
      if (state.radio !== 'floor') return result();
      if (!nearCouch(state)) return result('Dale\'s radio is on the floor by the couch.');
      state.radioOn = !state.radioOn;
      return result(state.radioOn ? 'You poke the radio back on. Fine Again, right where it left off. It is always Fine Again.' : 'You smack the radio off. The silence is worse. Somewhere, Dale feels it.', 'click');
    case 'freakout':
      if (state.trip <= 0) return result();
      state.noise = Math.min(100, state.noise + FREAKOUT_NOISE);
      state.paranoia = Math.min(100, state.paranoia + FREAKOUT_PARANOIA);
      note('If a shadow person reaches me, I scream. Screaming is loud.');
      return result('It is IN YOUR FACE. No eyes, just a hole where a face goes. You scream before you can stop yourself.', 'shriek');
    case 'banish':
      if (state.trip <= 0) return result();
      state.paranoia = Math.max(0, state.paranoia - BANISH_RELIEF);
      return result(undefined, 'banish');
    case 'ignite': {
      const refusal = fireRefusal(state, action.spot);
      if (refusal) return result(refusal);
      state.fire = 0.001;
      state.fireSpot = action.spot;
      note('Darlene\'s lighter works. Things in here burn.');
      return result({
        floorPapers: 'You thumb the naked-lady lighter and hold it to the FINAL NOTICE on top. It catches. PAST DUE catches. Everything you owe goes up at once, right by your feet. That is a lot of fire.',
        trash: 'You hold the lighter to the trash bag until the plastic drips and catches. It smells like a burning taco from 2019. Thick black smoke rolls along the ceiling.',
        pizza: 'The PIZZA REGRETS box goes up like it has been waiting its whole life for this. Two-month-old cheese bubbles and spits.',
        pizzaRear: 'You light the grease-soaked pizza box by the bunk. It burns blue, then orange, then everywhere. Ronnie\'s eyes go very wide.',
      }[action.spot], 'ignite');
    }
    case 'stab': {
      if (encounter.phase !== 'grab' && encounter.phase !== 'kill') return result();
      const total = encounter.phase === 'grab' ? GRAB_SECONDS : KILL_SECONDS;
      if (state.usedNeedles !== 'inventory' || total - encounter.remaining > STAB_WINDOW) return result();
      state.usedNeedles = 'gone';
      encounter.phase = 'leaving';
      encounter.remaining = LEAVE_SECONDS;
      encounter.visits += 1;
      encounter.cooldown = 0;
      encounter.outcome = VISITORS[encounter.visitor].stabLine;
      note('I stabbed one of them with a used needle. It worked. I do not have any more.');
      return result(encounter.outcome, 'hit');
    }
    case 'give-ronnie': {
      if (state.view !== 'rear') return result('Ronnie is on the couch at the rear.');
      if (action.item === 'usedNeedles') return result('No. Whatever else happens in this trailer, you are not doing that to him.');
      if (action.item !== 'dildo' || state.dildo !== 'inventory') return result('Ronnie does not want that. Ronnie does not seem to want anything.');
      if (encounter.phase !== 'idle') return result('Not now. Somebody is already coming.');
      state.dildo = 'ronnie';
      encounter.phase = 'alarm';
      encounter.remaining = 2;
      encounter.origin = patrolDepth(encounter.patrol, visitorIndex('cletus'));
      encounter.nextVisitor = 'cletus';
      encounter.nextPurpose = 'dildo';
      note('House rules exist for a reason. Ronnie and the dildo is apparently a recurring problem.');
      return result('You set it on the couch by his hand. Ronnie\'s eyes snap open. He snatches it, waves it over his head like a trophy and hammers his buzzer with it. Oh no.', 'whoop');
    }
    case 'work':
      if (state.view !== 'seat' && state.view !== 'bracket') return result('Return to the floor bracket.');
      if (isFree(state)) return result('The chain is already free of the floor. The cuff stays on.');
      if ((action.item !== 'spoon' && action.item !== 'screwdriver') || state[action.item] !== 'inventory') return result(action.item ? 'A broad, corroded slot. A flat spoon handle or screwdriver could fit.' : 'I try to pry it off but it still won’t budge');
      if (action.item === 'spoon' && state.spoonBent) return result(state.screwdriver === 'hidden' ? 'The spoon is bent double. It will not take another turn. You need a real tool. Somebody around here must own one.' : 'The spoon is bent double. Cletus\'s screwdriver is in the kitchen drawer.');
      // High, you crank like a sewing machine: two turns for every one.
      state.bracketWork = Math.min(3, state.bracketWork + (state.trip > 0 ? 2 : 1));
      state.bracketConcealed = false;
      // Steady hands make no sound; a rag-wrapped tool barely does. Bare metal on metal carries. Dale's radio covers half.
      const clank = state.steady > 0 ? 0 : state.wrapped === action.item ? 9 : 27;
      state.noise = Math.min(100, state.noise + (state.radioOn ? Math.round(clank / 2) : clank));
      if (action.item === 'spoon' && !state.spoonBent && state.trip <= 0) {
        state.spoonBent = true;
        // That racket is how Cletus finds out you are awake.
        if (!state.introDone) state.storyAt = Math.min(state.storyAt, state.elapsed + 3);
        note('The spoon bent on the first turn. I need a real tool for the fitting.');
        return result('The fitting shifts a hair. Then the spoon folds in half with a CLANK that rings through the whole trailer. Outside, somebody stops talking.', 'metal');
      }
      if (isFree(state)) {
        if (state.lighter === 'darlene') state.storyAt = state.elapsed + STORY_DELAY.free;
        note('The bracket is loose. I can reach the back now. The cuff is still on; this is not an escape.');
        return result('The rotten fitting gives. Chain off the floor. Cuff still on. You can reach the dinette and rear bunk now.', 'release');
      }
      if (state.trip > 0) return result('You crank it like a sewing machine. Two turns in one breath. Your teeth are grinding in time with the radio.', 'metal');
      return result(state.bracketWork === 1 ? 'The fitting shifts. Metal complains. Two more short efforts.' : 'Almost loose. One more effort. Every sound seems to carry.', 'metal');
    case 'conceal':
      if (state.view !== 'seat') return result('Return to the Stinky Pee Couch first, then conceal the fitting.');
      if (state.bracketWork === 0) return result('The chain is still attached. You sit still and keep your hands away from it.');
      state.view = 'seat';
      state.bracketConcealed = true;
      state.cushionRaised = false;
      note('I can sit back down and lay the loose fitting over its old marks. It only looks attached.');
      return result('Back on the couch. Loose fitting over the old marks. From the door, it looks attached.', 'metal');
    case 'recover': {
      if (!state.drawerOpen || (state.view !== 'seat' && state.view !== 'kitchen')) return result('Your bundled belongings are in the kitchen drawer.');
      let recovered = false;
      for (const item of ITEM_LIST) {
        if (state[item] === 'stash') { state[item] = 'inventory'; recovered = true; }
      }
      return result(recovered ? 'You recover your things from the bundle. The screwdriver still fits the chain fitting.' : 'The bundle is empty.', 'cloth');
    }
    case 'wake':
      if (encounter.phase !== 'blackout') return result();
      encounter.phase = 'idle'; encounter.cooldown = 45; encounter.agitation = 0;
      return result('Your pockets are empty. Fresh scrape marks and an open kitchen drawer: your things are bundled inside. The screwdriver is still within reach.');
    case 'rattle':
      if (state.view !== 'rear') return result('Cant use it is way too far');
      state.noise = Math.min(100, state.noise + 35);
      agitate(48);
      return result('There’s no use it’s shut forever nothing to be done', 'metal');
    case 'respond': {
      if (encounter.phase !== 'dialogue') return result();
      if (action.response === 'more') {
        encounter.talkCount = encounter.talkCount >= 1000000 ? 7 : encounter.talkCount + 1;
        if (encounter.visitor === 'cletus' && encounter.talkCount >= 5 && !encounter.kissed) {
          encounter.kissed = true;
          encounter.phase = 'kiss';
          encounter.remaining = 6;
        }
        return result();
      }
      const caught = Boolean(encounter.evidence) && encounter.evidence !== PUKE_EVIDENCE;
      const hostile = action.response === 'defy';
      encounter.suspicion = Math.min(100, encounter.suspicion + (caught ? 25 : hostile ? 15 : action.response === 'ronnie' ? 5 : 0) + (encounter.purpose === 'dildo' ? 10 : 0));
      if (encounter.purpose === 'dildo') state.ronnieCalm = RONNIE_CALM;
      if (encounter.visitor === 'darlene') {
        encounter.outcome = caught
          ? 'Darlene: "Do not bullshit me, sweetheart. I can count my own filth." She grinds her cigarette out on the doorframe and leaves. Suspicion increased.'
          : hostile ? 'Darlene: "Ooh. It barks." She flicks ash at you and waddles out, laughing smoke. Suspicion increased.'
          : action.response === 'ronnie' ? 'Darlene squints at the couch. "He always looks like that. He has resting dying face." She shuffles out.'
          : action.response === 'shifted' ? 'Darlene: "Uh-huh. And I\'m the queen of the county fair." She leaves the door open two extra seconds, just to be mean.'
          : 'Darlene: "Fine. Choke on your quiet, then." She drags on the cigarette until it hisses, then backs out.';
      } else {
        encounter.outcome = caught
          ? 'Cletus: "Do not bullshit me. I can see what you moved. Next time I will not just be looking." He leaves, watching you. Suspicion increased.'
          : hostile ? 'Cletus: "Keep that mouth running. See where it gets you." He leaves reluctantly. Suspicion increased.'
          : action.response === 'ronnie' ? 'Cletus looks toward the couch. "Then quit upsetting him." He backs out, suspicious.'
          : 'Cletus studies the fitting. "Stay put. And keep it fucking quiet." He backs out.';
      }
      // Puke on the floor trumps everything. They make you clean it, the worst way.
      const slop = state.puddle;
      if (slop) {
        state.puddle = false;
        encounter.suspicion = Math.min(100, encounter.suspicion + 10);
        encounter.outcome = VISITORS[encounter.visitor].pukeLine;
        note('Never leave puke on the floor when they come in. Wipe it up first.');
      }
      if (encounter.purpose === 'intro') {
        if (!slop) encounter.outcome = INTRO_OUTCOME;
        if (state.screwdriver === 'hidden') state.screwdriver = 'drawer';
        state.introDone = true;
        state.nextVisit = state.elapsed + routineGap(state);
        note('Cletus dropped his screwdriver in the kitchen drawer. It will fit the floor fitting. And they come running when they hear noise.');
      }
      encounter.phase = 'leaving';
      encounter.remaining = LEAVE_SECONDS;
      encounter.visits += 1;
      if (slop) return { state, message: encounter.outcome, sound: 'slam', slop: true };
      // Only reachable from saves made inside an older-style inspection; new visits grab you at the door instead.
      if (encounter.chainCaught) {
        if (state.chainStrikes === 0) {
          state.chainStrikes = 1;
          state.bracketWork = 0;
          state.bracketConcealed = false;
          state.view = 'seat';
          state.cushionRaised = false;
          if (state.wrapped === 'spoon') unwrap();
          state.spoon = 'confiscated';
          if (state.screwdriver === 'hidden') state.screwdriver = 'drawer';
          state.drawerOpen = true;
          encounter.outcome = 'Cletus: "My floor. My fucking rules." He pockets the spoon and refastens the fitting, then drops his screwdriver into the kitchen drawer.';
          note('He took the spoon and fixed the chain. He left the screwdriver in the reachable kitchen drawer.');
        } else {
          knockOut();
          encounter.outcome = 'Cletus: "I already told you about my floor." A sudden blow. Blackness. Ninety seconds gone. Your pockets have been emptied and the loose belongings rearranged.';
        }
      }
      note(caught ? 'He noticed what was out of place. Being back on the couch is not enough if the loose fitting is exposed.' : 'He did not notice the fitting. He was busy talking about things listening through the walls.');
      return result(encounter.outcome, encounter.phase === 'leaving' ? 'slam' : undefined);
    }
    case 'snatch':
      if (encounter.phase !== 'dance' || state.finalKey !== 'floor') return result();
      state.finalKey = 'inventory';
      encounter.keyLoose = false;
      note('Got the cuff key while Cletus was mid-spin. He never noticed. It opens the cuff at the floor fitting.');
      return result('You hook the key with your toe, drag it in and sit on it. Cletus is still spinning. He did not see a thing.', 'take');
    case 'skip-kiss':
      if (encounter.phase === 'kiss') { encounter.phase = 'dialogue'; encounter.remaining = 0; }
      return result();
    case 'tick':
      if (!Number.isFinite(action.seconds) || action.seconds <= 0) return result();
      {
        const seconds = Math.min(action.seconds, 1);
        // The radio keeps its place in the song whatever else is happening, and the stations keep broadcasting.
        if (state.radioOn) state.radioClock = (state.radioClock + seconds) % RADIO_LOOP;
        state.tvClock += seconds;
        if (encounter.phase === 'hangout' || encounter.phase === 'offer' || encounter.phase === 'bulb') {
          // Frozen game time: Dale is going through something on the couch next to you.
          const total = encounter.phase === 'hangout' ? HANGOUT_SECONDS : encounter.phase === 'offer' ? OFFER_SECONDS : BULB_SECONDS;
          const before = total - encounter.remaining;
          encounter.remaining = Math.max(0, encounter.remaining - seconds);
          const after = total - encounter.remaining;
          const crossed = (at: number) => before < at && after >= at;
          let sound: Sound | undefined;
          if (encounter.phase === 'hangout') {
            if (crossed(RADIO_ON_AT)) { state.radio = 'floor'; state.radioOn = true; sound = 'click'; }
            if (crossed(TORCH_AT)) sound = 'torch';
            if (crossed(DALE_HIT_AT + 0.5)) sound = 'cough';
            if (encounter.remaining <= 0.00001) { encounter.phase = 'offer'; encounter.remaining = OFFER_SECONDS; }
            return result(undefined, sound);
          }
          if (encounter.phase === 'offer') {
            if (encounter.remaining > 0.00001) return result();
            daleLeaves('Dale holds it out for a long time. Then he takes it back. "Cool. Cool cool cool. More for me." He leaves the radio playing on the floor and shuffles out.');
            return result(encounter.outcome, 'cough');
          }
          if (crossed(BULB_INHALE_AT)) sound = 'inhale';
          if (crossed(BULB_TRIP_AT)) { getHigh(); sound = 'cough'; }
          if (encounter.remaining <= 0.00001) {
            daleLeaves('Dale pats your knee, leaves the radio playing on the floor and shuffles out. "Keep it on. It\'s all I got." The walls are breathing. Something is standing at the end of the aisle.');
            return result(encounter.outcome, sound);
          }
          return result(undefined, sound);
        }
        if (encounter.phase === 'kiss') {
          const before = encounter.remaining;
          encounter.remaining = Math.max(0, before - seconds);
          if (encounter.remaining <= 0.00001) { encounter.remaining = 0; encounter.phase = 'dialogue'; }
          return result(undefined, before > 2.4 && encounter.remaining <= 2.4 ? 'kiss' : undefined);
        }
        if (encounter.phase === 'dance') {
          // Game time is frozen. You are only watching.
          const before = encounter.remaining;
          encounter.remaining = Math.max(0, before - seconds);
          if (encounter.remaining <= 0.00001) {
            encounter.remaining = LEAVE_SECONDS;
            encounter.phase = 'leaving';
            encounter.visits += 1;
            // Still on the floor at his bow: he spots it and takes it back. He will dance again.
            const missed = state.finalKey === 'floor';
            if (missed) state.finalKey = 'cletus';
            encounter.keyLoose = false;
            encounter.outcome = missed ? KEY_MISSED : state.finalKey === 'inventory' ? KEY_SNATCHED : 'Cletus: "Not a word. Not to Darlene, not to Ronnie, not to God." He adjusts the nightgown and bolts out, glowing.';
            note(missed ? 'The cuff key fell off Cletus mid-dance and I did not grab it in time. He will be back to dance again.' : 'Cletus came in wearing Darlene\'s nightgown and danced at me. I have to live with that now.');
            return result(encounter.outcome, 'slam');
          }
          // Mid-spin the shoelace snaps and the cuff key skitters to your feet.
          if (DANCE_SECONDS - before < KEY_DROP_AT && DANCE_SECONDS - encounter.remaining >= KEY_DROP_AT && state.finalKey === 'cletus') {
            state.finalKey = 'floor';
            encounter.keyLoose = true;
            return result(undefined, 'metal');
          }
          return result(undefined, before > 3.2 && encounter.remaining <= 3.2 ? 'kiss' : undefined);
        }
        if (encounter.phase === 'tvshow') {
          // Frozen game time: you are watching yourself on TV with Cletus.
          const before = TVSHOW_SECONDS - encounter.remaining;
          encounter.remaining = Math.max(0, encounter.remaining - seconds);
          const after = TVSHOW_SECONDS - encounter.remaining;
          if (encounter.remaining <= 0.00001) {
            encounter.remaining = LEAVE_SECONDS;
            encounter.phase = 'leaving';
            encounter.visits += 1;
            encounter.outcome = 'Cletus backs out still wheezing, leaving the set on and turned up, so you can listen to yourself stay missing.';
            note('Cletus turned the TV on to show me myself on the news. LOCAL MAN STILL MISSING. He left it running.');
            return result(encounter.outcome, 'slam');
          }
          if (before < TV_ON_AT && after >= TV_ON_AT) {
            // He has it timed: Channel 4, and your story is just starting.
            state.tvOn = true;
            state.tvChannel = 0;
            state.tvMuted = false;
            state.tvClock = cue(STATIONS.news, 'news-local-man');
            return result(undefined, 'tvon');
          }
          return result();
        }
        if (encounter.phase === 'douse') {
          // Frozen game time: one bucket of grey dishwater, then he turns around.
          const before = DOUSE_SECONDS - encounter.remaining;
          encounter.remaining = Math.max(0, encounter.remaining - seconds);
          const after = DOUSE_SECONDS - encounter.remaining;
          const doused = before < DOUSE_HIT && after >= DOUSE_HIT;
          if (doused && state.fireSpot) {
            state.burnt[state.fireSpot] = true;
            state.fire = 0;
          }
          if (encounter.remaining <= 0.00001) {
            encounter.phase = 'grab';
            encounter.remaining = GRAB_SECONDS;
            return result(undefined, doused ? 'splash' : undefined);
          }
          return result(undefined, doused ? 'splash' : undefined);
        }
        if (encounter.phase === 'grab' || encounter.phase === 'kill') {
          // Frozen game time: this is happening to you, fast.
          const grab = encounter.phase === 'grab';
          const total = grab ? GRAB_SECONDS : KILL_SECONDS;
          const before = total - encounter.remaining;
          encounter.remaining = Math.max(0, encounter.remaining - seconds);
          const after = total - encounter.remaining;
          const struck = (grab ? GRAB_HITS : [KILL_HIT]).some(at => at > before && at <= after);
          if (encounter.remaining <= 0.00001) {
            const name = VISITORS[encounter.visitor].name;
            if (grab) {
              const arson = encounter.purpose === 'fire';
              // He takes the lighter back to Darlene. She will lose it again.
              if (arson) state.lighter = 'darlene';
              knockOut();
              encounter.outcome = arson
                ? 'Cletus beats you with the empty bucket until it cracks, then with his hands until the lights go out. The last thing you smell is wet ash.'
                : `${name} drags you back to the couch by your hair and beats you until the lights go out.`;
              if (arson) note('Setting a fire brings Cletus running with a bucket. He puts it out, then beats me unconscious and gives the lighter back to Darlene.');
              return result(encounter.outcome, struck ? 'hit' : undefined);
            }
            encounter.phase = 'dead';
            encounter.remaining = 0;
            encounter.outcome = VISITORS[encounter.visitor].deathText;
            return result(encounter.outcome, struck ? 'kill' : undefined);
          }
          return result(undefined, struck ? grab ? 'hit' : 'kill' : undefined);
        }
        state.elapsed += seconds;
        state.noise = Math.max(0, state.noise - seconds * 4);
        state.ronnieCalm = Math.max(0, state.ronnieCalm - seconds);
        state.steady = Math.max(0, state.steady - seconds);
        state.outsideReading = Math.max(0, state.outsideReading - seconds);
        encounter.cooldown = Math.max(0, encounter.cooldown - seconds);
        if (state.fire > 0) state.fire = Math.min(FIRE_FULL, state.fire + seconds);
        // The high wears off; paranoia builds while you are alone with it, and drains once you are down.
        let comedown = false;
        if (state.trip > 0) {
          state.trip = Math.max(0, state.trip - seconds);
          if (encounter.phase === 'idle') state.paranoia = Math.min(100, state.paranoia + seconds * PARANOIA_RATE);
          comedown = state.trip <= 0;
        } else state.paranoia = Math.max(0, state.paranoia - seconds * 2);
        if (encounter.phase === 'idle') {
          encounter.patrol += seconds;
          if (state.view === 'rear' && state.noise > 25) agitate(seconds * 6);
          else encounter.agitation = Math.max(0, encounter.agitation - seconds * 3);
          if (comedown) {
            state.paranoia = 0;
            return result('The shadows thin out. The walls stop breathing. Your jaw aches from grinding, and your heart sounds like a sewing machine.');
          }
          // Too far gone: you scream at the corner until your voice cracks. Everybody outside hears it.
          if (state.trip > 0 && state.paranoia >= 100) {
            state.noise = 100;
            state.paranoia = 60;
            note('Paranoia all the way up and I lose it. I scream. They hear.');
            return result('You lose it. You scream at the empty corner until your voice cracks, and the corner screams back. Outside, everything goes quiet.', 'shriek');
          }
          // Smoke under the door. Nothing outranks this: not the cooldown, not the paperback.
          if (state.fire >= FIRE_NOTICE) {
            startApproach('cletus', 'fire');
            note('Smoke brings them running.');
            return result(`Outside, Darlene: "${FIRE_SMELL_LINE}"`, 'step');
          }
          // The story first: whoever the next stage needs, once you have reached it and a little time has passed.
          const beat = storyBeat(state);
          if (beat && state.elapsed >= state.storyAt && encounter.cooldown <= 0) {
            startApproach(beat.visitor, beat.purpose);
            // If they are interrupted (you get grabbed), the beat comes round again.
            state.storyAt = state.elapsed + STORY_DELAY.retry;
            state.nextVisit = Math.max(state.nextVisit, state.elapsed + 45);
            return result(beat.purpose === 'intro' ? 'Somebody heard that. Boots on the steps.' : 'Pounding footsteps. Someone is running at the door.', 'step');
          }
          // Routine visits keep the pressure on in between.
          if (state.elapsed >= state.nextVisit && encounter.cooldown <= 0) {
            startApproach(state.nextVisitor ?? ROTATION[state.seed % ROTATION.length]);
            state.nextVisitor = undefined;
            state.nextVisit = state.elapsed + routineGap(state);
            state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
            return result('Pounding footsteps. Someone is running at the door.', 'step');
          }
          // Too loud: somebody outside heard that. Not while they are all busy with a paperback.
          if (state.noise > NOISE_LIMIT && encounter.cooldown <= 0 && state.outsideReading <= 0) {
            if (!state.introDone) { startApproach('cletus', 'intro'); state.storyAt = state.elapsed + STORY_DELAY.retry; } else startApproach(upcomingVisitor(state));
            note('Too much noise brings them running. Pace it, or muffle it.');
            return result('Outside, everything goes quiet. Then: "Hey, what the fuck was that?"', 'step');
          }
        } else {
          // Already on their way in for something else: they smell the smoke and grab the bucket.
          if (state.fire >= FIRE_NOTICE && (encounter.phase === 'approach' || encounter.phase === 'alarm')) {
            encounter.nextVisitor = 'cletus';
            encounter.nextPurpose = 'fire';
          }
          const previous = encounter.remaining;
          encounter.remaining = Math.max(0, previous - seconds);
          let rampageSound: Sound | undefined;
          if (encounter.phase === 'search') {
            const before = RAMPAGE_SECONDS - previous;
            const after = RAMPAGE_SECONDS - encounter.remaining;
            for (const event of RAMPAGE_EVENTS) {
              if (event.at <= before || event.at > after) continue;
              if ('cabinet' in event) { state.cabinets[event.cabinet] = true; rampageSound = 'drawer'; }
              if ('drawer' in event) { state.drawerOpen = true; rampageSound = 'drawer'; }
              if ('rip' in event) rampageSound = 'rip';
              if ('haul' in event) { encounter.haul = rampageHaul(); rampageSound = 'take'; }
            }
          }
          if (encounter.remaining <= 0.00001) {
            if (encounter.phase === 'alarm') {
              startApproach(encounter.nextVisitor ?? 'cletus', encounter.nextPurpose);
              return result('Cletus: "Hey, what the fuck was that?"', 'step');
            }
            if (encounter.phase === 'approach' && state.fire > 0) {
              // Whoever was coming, it is Cletus with a bucket now, and he does not care where you are sitting.
              encounter.nextPurpose = undefined;
              encounter.nextVisitor = undefined;
              encounter.visitor = 'cletus';
              encounter.purpose = 'fire';
              encounter.talkCount = 0; encounter.kissed = false;
              delete encounter.haul;
              encounter.evidence = '';
              encounter.chainCaught = false;
              encounter.phase = 'entering'; encounter.remaining = ENTER_SECONDS;
              return result('The door BANGS open. Cletus charges in with a sloshing bucket of dishwater, screaming.', 'slam');
            }
            if (encounter.phase === 'approach') {
              const visitor: VisitorId = encounter.nextVisitor ?? 'cletus';
              const special = visitor === 'cletus' ? encounter.nextPurpose : undefined;
              const name = VISITORS[visitor].name;
              encounter.nextPurpose = undefined;
              encounter.nextVisitor = undefined;
              encounter.visitor = visitor;
              encounter.talkCount = 0; encounter.kissed = false;
              delete encounter.haul;
              // Anywhere but sitting on the couch looking chained, and they are on you.
              const caught = state.view !== 'seat' || (state.bracketWork > 0 && !state.bracketConcealed);
              encounter.chainCaught = caught && state.bracketWork > 0;
              if (caught) {
                encounter.purpose = 'talk';
                encounter.evidence = 'Caught off the couch.';
                if (state.dildo === 'ronnie') state.dildo = 'counter';
                if (state.knockouts >= 1) {
                  encounter.phase = 'kill'; encounter.remaining = KILL_SECONDS;
                  note('They caught me off the couch twice.');
                  return result(`The door BANGS open and ${name} is already on you.`, 'slam');
                }
                encounter.phase = 'grab'; encounter.remaining = GRAB_SECONDS;
                note('They caught me off the couch. They beat me unconscious. Next time they will kill me.');
                return result(`The door BANGS open. ${name} sees you and comes straight for you.`, 'slam');
              }
              encounter.phase = 'entering'; encounter.remaining = ENTER_SECONDS;
              encounter.evidence = state.puddle ? PUKE_EVIDENCE : state.drawerOpen ? 'That drawer was shut.' : '';
              if (special === 'dance') {
                state.danced = true;
                encounter.purpose = 'dance';
                encounter.evidence = '';
                return result('The door BANGS open. Cletus charges in wearing Darlene\'s nightgown, a mop-head wig and a face full of lipstick. Somewhere, a synthesizer starts.', 'slam');
              }
              if (special === 'tv') {
                state.tvShown = true;
                encounter.purpose = 'tv';
                encounter.evidence = '';
                return result('The door BANGS open. Cletus comes in giggling, rubbing his hands together, headed straight for the TV.', 'slam');
              }
              if (special === 'intro') {
                encounter.purpose = 'intro';
                return result('The door BANGS open. Cletus fills the doorway, sunglasses crooked, squinting at you.', 'slam');
              }
              if (special === 'dildo') {
                encounter.purpose = 'dildo';
                if (state.dildo === 'ronnie') state.dildo = 'counter';
                return result('The door BANGS open. Cletus storms past you to the couch, wrestles the dildo out of Ronnie\'s fist and slams it back on the counter.', 'slam');
              }
              if (VISITORS[visitor].behavior === 'hangout') {
                // Dale checks nothing. Dale is going through something.
                encounter.purpose = 'hangout';
                encounter.evidence = '';
                return result('The door BANGS open. Dale stumbles in with a boombox and a beer, already halfway to crying.', 'slam');
              }
              encounter.purpose = VISITORS[visitor].behavior === 'rampage' ? 'search' : 'talk';
              return result(encounter.purpose === 'search' ? 'The door BANGS off the wall. Darlene comes in screaming.' : `The door BANGS open. ${name} lunges in, eyes everywhere.`, 'slam');
            }
            if (encounter.phase === 'entering') {
              if (encounter.purpose === 'search') { encounter.phase = 'search'; encounter.remaining = RAMPAGE_SECONDS; return result(undefined, 'drawer'); }
              if (encounter.purpose === 'dance') { encounter.phase = 'dance'; encounter.remaining = DANCE_SECONDS; return result('You have to watch.'); }
              if (encounter.purpose === 'tv') { encounter.phase = 'tvshow'; encounter.remaining = TVSHOW_SECONDS; return result(); }
              if (encounter.purpose === 'fire') { encounter.phase = 'douse'; encounter.remaining = DOUSE_SECONDS; return result(); }
              if (encounter.purpose === 'hangout') {
                encounter.phase = 'hangout';
                encounter.remaining = HANGOUT_SECONDS;
                // First thing through the door: he shuts the TV off. It is radio time.
                if (state.tvOn) {
                  state.tvOn = false;
                  note('Dale turns the TV off when he comes in. He needs to hear his song.');
                  return result('Dale walks straight past you and slaps the TV off. "Nope. Radio time."', 'tvoff');
                }
                return result();
              }
              encounter.phase = 'dialogue';
              return result();
            }
            if (encounter.phase === 'search') {
              encounter.phase = 'leaving';
              encounter.remaining = LEAVE_SECONDS;
              encounter.visits += 1;
              encounter.outcome = `${VISITORS[encounter.visitor].name} storms out, still screaming. The door slams so hard the blinds jump.`;
              note('Darlene tears the place apart looking for her lighter. She never checks her own hand.');
              if (state.puddle) {
                state.puddle = false;
                encounter.suspicion = Math.min(100, encounter.suspicion + 10);
                encounter.outcome = VISITORS[encounter.visitor].pukeLine;
                return { state, message: encounter.outcome, sound: 'slam', slop: true };
              }
              return result(encounter.outcome, 'slam');
            }
            if (encounter.phase === 'leaving') {
              encounter.phase = 'idle'; encounter.cooldown = 35; encounter.agitation = 0;
              // A breather before the next story beat, so visits never pile on top of each other.
              state.storyAt = Math.max(state.storyAt, state.elapsed + STORY_DELAY.spacing);
              encounter.patrol = Math.asin((-0.225 - 1.05) / 1.4) / 0.48 - visitorIndex(encounter.visitor) * 6.5;
              return result('Footsteps stomp away from the door. You can breathe again.', 'step');
            }
          }
          if (rampageSound) return result(undefined, rampageSound);
          // The door slams shut behind them, going in and going out.
          const slamAt = encounter.phase === 'entering' ? ENTER_SECONDS - 0.95 : encounter.phase === 'leaving' ? LEAVE_SECONDS - 0.9 : -1;
          if (previous > slamAt && encounter.remaining <= slamAt) return result(undefined, 'slam');
          // Running footsteps, twice a second, then the handle.
          if (encounter.phase === 'approach' && Math.ceil(previous * 2) !== Math.ceil(encounter.remaining * 2)) return result(undefined, encounter.remaining < 1 ? 'metal' : 'step');
        }
      }
      return result();
    case 'note':
      note(action.text);
      return result();
  }
}

// What you read when you open CHOKE ON MY LOVE yourself. Purple, absurd, never explicit.
const READINGS = [
  'You read: ‘Brock’s biceps glistened like two hams left out in the rain.’ Your breathing slows. The trailer feels further away.',
  'You read: ‘She whispered his name into the roar of the crop duster. Brock. BROCK.’ You have never been calmer.',
  'You read: ‘He took her hand the way a man takes the last pork chop: tenderly, and without asking.’ Your pulse settles.',
  'You read: ‘Their love was forbidden in fourteen states and frowned upon in the rest.’ You almost laugh. Almost.',
];

const PLACEMENTS: Record<string, string[]> = {
  brassKey: ['pizza', 'inventory', 'stash'], finalKey: ['cabinet', 'cletus', 'floor', 'inventory', 'stash'], magnet: ['cab-k1', 'inventory', 'stash', 'outside'],
  beenie: ['cab-u2', 'inventory', 'stash', 'outside'], lotto: ['floor', 'inventory', 'stash'], choke: ['cabinet', 'inventory', 'stash', 'outside'],
};
const V5_PLACEMENTS: Record<string, string[]> = {
  dildo: ['counter', 'inventory', 'stash', 'ronnie', 'darlene'], zwinkys: ['counter', 'inventory', 'stash', 'darlene', 'outside'], butt: ['ashtray', 'inventory', 'stash', 'gone'],
  bobbyPins: ['ashtray', 'inventory', 'stash'], usedNeedles: ['pizzaRear', 'inventory', 'stash', 'gone'], axe: ['cabinet', 'inventory', 'stash'],
};
const HAULS: Haul[] = ['drop-lighter', 'drop-zwinkys', 'drop-dildo', 'take-zwinkys', 'take-dildo', 'nothing'];
// Longest legitimate timer per phase, so a hand-edited or corrupt save cannot stall a visit.
const PHASE_LIMITS: Partial<Record<Encounter['phase'], number>> = { dance: DANCE_SECONDS, search: RAMPAGE_SECONDS, grab: GRAB_SECONDS, kill: KILL_SECONDS, kiss: 6, tvshow: TVSHOW_SECONDS, douse: DOUSE_SECONDS, hangout: HANGOUT_SECONDS, offer: OFFER_SECONDS, bulb: BULB_SECONDS };
const NEXT_PURPOSES: Encounter['nextPurpose'][] = ['dildo', 'dance', 'tv', 'fire', 'intro'];

export function decodeSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const value = candidate as Record<string, unknown>;
    const version = Number(value.version);
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(version) || !VIEW_IDS.includes(value.view as ViewId)) return null;
    if (!['cushion', 'inventory', 'confiscated', 'stash'].includes(String(value.spoon))) return null;
    if (!['drawer', 'inventory', 'stash', 'wrapped'].includes(String(value.rag))) return null;
    if (version >= 3 && !['hidden', 'drawer', 'inventory', 'stash'].includes(String(value.screwdriver))) return null;
    for (const field of ['chainStrikes', 'knockouts', 'layout']) if (value[field] !== undefined && (!Number.isSafeInteger(value[field]) || Number(value[field]) < 0)) return null;
    if (!Number.isInteger(value.bracketWork) || Number(value.bracketWork) < 0 || Number(value.bracketWork) > 3) return null;
    for (const flag of ['drawerOpen', 'cushionRaised', 'bracketConcealed']) if (typeof value[flag] !== 'boolean') return null;
    if (typeof value.seed !== 'number' || !Number.isInteger(value.seed)) return null;
    if (typeof value.elapsed !== 'number' || !Number.isFinite(value.elapsed) || value.elapsed < 0) return null;
    if (typeof value.noise !== 'number' || !Number.isFinite(value.noise) || value.noise < 0 || value.noise > 100) return null;
    if (!Array.isArray(value.journal) || !value.journal.every(entry => typeof entry === 'string')) return null;
    let encounter = encounterDefaults();
    if (version >= 2) {
      const savedEncounter = value.encounter as Encounter | undefined;
      if (!savedEncounter || !PHASES.includes(savedEncounter.phase) || savedEncounter.phase === 'dead') return null;
      for (const field of ['remaining', 'agitation', 'cooldown', 'lastMove', 'patrol', 'origin', 'suspicion', 'visits'] as const) {
        if (typeof savedEncounter[field] !== 'number' || !Number.isFinite(savedEncounter[field])) return null;
      }
      if (savedEncounter.remaining < 0 || savedEncounter.agitation < 0 || savedEncounter.agitation > 100 || savedEncounter.suspicion < 0 || savedEncounter.suspicion > 100 || savedEncounter.cooldown < 0 || savedEncounter.visits < 0 || !Number.isInteger(savedEncounter.visits)) return null;
      if (savedEncounter.remaining > (PHASE_LIMITS[savedEncounter.phase] ?? 12)) return null;
      if (savedEncounter.haul !== undefined && !HAULS.includes(savedEncounter.haul)) return null;
      if (savedEncounter.keyLoose !== undefined && typeof savedEncounter.keyLoose !== 'boolean') return null;
      if (typeof savedEncounter.evidence !== 'string' || typeof savedEncounter.outcome !== 'string') return null;
      if (version >= 3 && typeof savedEncounter.chainCaught !== 'boolean') return null;
      const talkCount = savedEncounter.talkCount ?? 0;
      const kissed = savedEncounter.kissed ?? false;
      if (!Number.isSafeInteger(talkCount) || talkCount < 0 || talkCount > 1000000 || typeof kissed !== 'boolean') return null;
      if (savedEncounter.phase === 'kiss' && (!kissed || savedEncounter.remaining > 6)) return null;
      const visitor: VisitorId = VISITOR_IDS.includes(savedEncounter.visitor) ? savedEncounter.visitor : 'cletus';
      const purpose = PURPOSES.includes(savedEncounter.purpose) ? savedEncounter.purpose : 'talk';
      if (savedEncounter.phase === 'dance' && purpose !== 'dance') return null;
      if (savedEncounter.phase === 'tvshow' && purpose !== 'tv') return null;
      if (savedEncounter.phase === 'douse' && purpose !== 'fire') return null;
      if (['hangout', 'offer', 'bulb'].includes(savedEncounter.phase) && (purpose !== 'hangout' || visitor !== 'dale')) return null;
      const nextPurpose = NEXT_PURPOSES.includes(savedEncounter.nextPurpose) ? savedEncounter.nextPurpose : undefined;
      const nextVisitor: VisitorId | undefined = savedEncounter.nextVisitor && VISITOR_IDS.includes(savedEncounter.nextVisitor) ? savedEncounter.nextVisitor : undefined;
      encounter = { ...savedEncounter, visitor, purpose, nextVisitor, nextPurpose, talkCount, kissed, chainCaught: version >= 3 ? savedEncounter.chainCaught : savedEncounter.evidence.includes('chain is off') };
    }
    const base = freshState();
    const v4 = version >= 4;
    const v5 = version >= 5;
    if (v4) {
      for (const [item, allowed] of Object.entries(PLACEMENTS)) if (!allowed.includes(String(value[item]))) return null;
      const cabinets = value.cabinets as Record<string, unknown> | undefined;
      const rummaged = value.rummaged as Record<string, unknown> | undefined;
      if (!cabinets || !CABINET_IDS.every(id => typeof cabinets[id] === 'boolean')) return null;
      if (!rummaged || !RUMMAGE_IDS.every(id => typeof rummaged[id] === 'boolean')) return null;
      for (const flag of ['pizzaOpened', 'cabinetUnlocked', 'cuffOpen', 'escaped']) if (typeof value[flag] !== 'boolean') return null;
      if (typeof value.nextVisit !== 'number' || !Number.isFinite(value.nextVisit) || value.nextVisit < 0) return null;
    }
    if (v5) {
      for (const [item, allowed] of Object.entries(V5_PLACEMENTS)) if (!allowed.includes(String(value[item]))) return null;
      if (typeof value.danced !== 'boolean') return null;
      if (!Number.isInteger(value.doorChops) || Number(value.doorChops) < 0 || Number(value.doorChops) >= DOOR_CHOPS) return null;
      if (typeof value.ronnieCalm !== 'number' || !Number.isFinite(value.ronnieCalm) || value.ronnieCalm < 0 || value.ronnieCalm > RONNIE_CALM) return null;
    }
    const v6 = version >= 6;
    if (v6 && !['darlene', 'floor', 'inventory', 'stash'].includes(String(value.lighter))) return null;
    const v7 = version >= 7;
    if (v7) {
      if (value.wrapped !== null && !['spoon', 'screwdriver', 'axe'].includes(String(value.wrapped))) return null;
      if ((value.wrapped === null) !== (value.rag !== 'wrapped')) return null;
      if (value.wrapped !== null && value[String(value.wrapped)] !== 'inventory') return null;
      for (const flag of ['ragSoiled', 'puddle']) if (typeof value[flag] !== 'boolean') return null;
      if (typeof value.steady !== 'number' || !Number.isFinite(value.steady) || value.steady < 0 || value.steady > STEADY_SECONDS) return null;
      if (typeof value.outsideReading !== 'number' || !Number.isFinite(value.outsideReading) || value.outsideReading < 0 || value.outsideReading > READ_ALOUD_SECONDS) return null;
    } else if (value.rag === 'wrapped') return null;
    const v8 = version >= 8;
    if (v8) {
      for (const flag of ['tvOn', 'tvMuted', 'tvShown']) if (typeof value[flag] !== 'boolean') return null;
      if (!Number.isInteger(value.tvChannel) || Number(value.tvChannel) < 0) return null;
      if (!['hidden', 'inventory', 'stash'].includes(String(value.remote))) return null;
    }
    const v9 = version >= 9;
    if (v9) {
      if (typeof value.fire !== 'number' || !Number.isFinite(value.fire) || value.fire < 0 || value.fire > FIRE_FULL) return null;
      if (value.fireSpot !== null && !isFireSpot(String(value.fireSpot))) return null;
      if (value.fire > 0 && value.fireSpot === null) return null;
      const burnt = value.burnt as Record<string, unknown> | undefined;
      if (!burnt || !FIRE_SPOTS.every(spot => typeof burnt[spot] === 'boolean')) return null;
    }
    // A douse needs a fire it is putting out (or just put out).
    if (encounter.phase === 'douse' && !(v9 && value.fireSpot !== null)) return null;
    const v10 = version >= 10;
    if (v10) {
      const number = (key: string, max: number) => typeof value[key] === 'number' && Number.isFinite(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= max;
      if (!number('daleAt', Number.MAX_SAFE_INTEGER) || !number('trip', TRIP_MAX) || !number('paranoia', 100) || !number('radioClock', RADIO_LOOP)) return null;
      if (!['none', 'floor'].includes(String(value.radio)) || typeof value.radioOn !== 'boolean') return null;
      if (value.radioOn && value.radio !== 'floor') return null;
    } else if (['hangout', 'offer', 'bulb'].includes(encounter.phase)) return null;
    const v11 = version >= 11;
    if (v11 && (typeof value.tvClock !== 'number' || !Number.isFinite(value.tvClock) || value.tvClock < 0)) return null;
    const v12 = version >= 12;
    if (v12) {
      if (typeof value.introDone !== 'boolean' || typeof value.spoonBent !== 'boolean') return null;
      if (typeof value.storyAt !== 'number' || !Number.isFinite(value.storyAt) || value.storyAt < 0) return null;
      if (value.finalKey === 'cabinet') return null;
    }
    const pick = <K extends keyof GameState>(key: K, enabled: boolean): GameState[K] => enabled ? value[key] as GameState[K] : base[key];
    const state: GameState = {
      ...base,
      encounter, seed: value.seed, elapsed: value.elapsed, view: value.view as ViewId,
      screwdriver: version >= 3 ? value.screwdriver as GameState['screwdriver'] : 'hidden',
      chainStrikes: Number(value.chainStrikes ?? 0), knockouts: Number(value.knockouts ?? 0), layout: Number(value.layout ?? 0),
      spoon: value.spoon as GameState['spoon'], rag: value.rag as GameState['rag'], bracketWork: Number(value.bracketWork),
      bracketConcealed: value.bracketConcealed === true, drawerOpen: value.drawerOpen === true,
      cushionRaised: value.cushionRaised === true, noise: value.noise, journal: [...value.journal] as string[],
      brassKey: pick('brassKey', v4), finalKey: pick('finalKey', v4), magnet: pick('magnet', v4),
      beenie: pick('beenie', v4), lotto: pick('lotto', v4), choke: pick('choke', v4),
      dildo: pick('dildo', v5), zwinkys: pick('zwinkys', v5), butt: pick('butt', v5),
      bobbyPins: pick('bobbyPins', v5), usedNeedles: pick('usedNeedles', v5), axe: pick('axe', v5), lighter: pick('lighter', v6),
      wrapped: pick('wrapped', v7), ragSoiled: pick('ragSoiled', v7), puddle: pick('puddle', v7), steady: pick('steady', v7), outsideReading: pick('outsideReading', v7),
      // Before v11 Cletus left the set muted after TV night; now he leaves it turned up, so older sets come back with sound.
      tvOn: pick('tvOn', v8), tvMuted: v11 ? value.tvMuted as boolean : false, tvShown: pick('tvShown', v8), remote: pick('remote', v8),
      // The dial can change between versions; fold any stale channel back onto it.
      tvChannel: v8 ? Number(value.tvChannel) % TV_DIAL.length : 0,
      tvClock: pick('tvClock', v11),
      fire: pick('fire', v9), fireSpot: pick('fireSpot', v9),
      burnt: v9 ? { ...(value.burnt as Record<FireSpot, boolean>) } : { ...base.burnt },
      daleAt: pick('daleAt', v10), radio: pick('radio', v10), radioOn: pick('radioOn', v10), radioClock: pick('radioClock', v10),
      trip: pick('trip', v10), paranoia: pick('paranoia', v10),
      cabinets: v4 ? { ...(value.cabinets as Record<CabinetId, boolean>) } : { ...base.cabinets },
      rummaged: v4 ? { ...(value.rummaged as Record<RummageId, boolean>) } : { ...base.rummaged },
      pizzaOpened: v4 ? Boolean(value.pizzaOpened) : false,
      cabinetUnlocked: v4 ? Boolean(value.cabinetUnlocked) : false,
      cuffOpen: v4 ? Boolean(value.cuffOpen) : false,
      escaped: v4 ? Boolean(value.escaped) : false,
      danced: v5 ? Boolean(value.danced) : false,
      doorChops: v5 ? Number(value.doorChops) : 0,
      ronnieCalm: v5 ? Number(value.ronnieCalm) : 0,
      nextVisit: v4 ? value.nextVisit as number : base.nextVisit,
      nextVisitor: undefined,
      introDone: pick('introDone', v12), spoonBent: pick('spoonBent', v12), storyAt: pick('storyAt', v12),
    };
    // Before v12 the cuff key sat in the rear cabinet; now it hangs on Cletus until his dance. It only lies on
    // the floor mid-dance.
    if (state.finalKey === 'cabinet' as string || (state.finalKey === 'floor' && encounter.phase !== 'dance')) state.finalKey = 'cletus';
    if (!v12) {
      // Older saves pick the new story up from wherever they already are.
      state.introDone = state.bracketWork > 0 || state.screwdriver !== 'hidden' || state.knockouts > 0 || encounter.visits > 0 || state.elapsed >= INTRO_FALLBACK;
      state.spoonBent = state.introDone;
      if (state.introDone && state.screwdriver === 'hidden') state.screwdriver = 'drawer';
      state.storyAt = state.introDone ? state.elapsed + STORY_DELAY.spacing : INTRO_FALLBACK;
      if (!state.introDone) state.nextVisit = NO_VISIT;
      state.doorChops = 0;
    }
    if (!canVisit(state, state.view) || (state.bracketConcealed && state.bracketWork === 0)) return null;
    if (state.view !== 'seat') state.bracketConcealed = false;
    if (state.escaped) return null;
    return state;
  } catch { return null; }
}
