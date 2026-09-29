import { APPROACH_SECONDS, DANCE_AT, DANCE_SECONDS, ENTER_SECONDS, LEAVE_SECONDS, encounterDefaults, patrolDepth, PHASES, PURPOSES, type Encounter, type ResponseId, type VisitorId } from './encounters.js';

export const SAVE_KEY = 'they-heard-you:first-pass:v1';
export const VIEW_IDS = ['seat', 'kitchen', 'bracket', 'dinette', 'rear'] as const;
export type ViewId = typeof VIEW_IDS[number];
export type ItemId = 'spoon' | 'rag' | 'screwdriver' | 'brassKey' | 'finalKey' | 'magnet' | 'beenie' | 'lotto' | 'choke' | 'dildo' | 'zwinkys' | 'butt' | 'bobbyPins' | 'usedNeedles' | 'axe';
export type Verb = 'look' | 'take' | 'use' | 'talk' | 'put-back';
export type RummageId = 'pizza' | 'trash' | 'floorPapers' | 'cans';
export type CabinetId = 'k1' | 'k2' | 'k3' | 'u1' | 'u2' | 'u3';
export const RUMMAGE_IDS: RummageId[] = ['pizza', 'trash', 'floorPapers', 'cans'];
export const CABINET_IDS: CabinetId[] = ['k1', 'k2', 'k3', 'u1', 'u2', 'u3'];
export type HotspotId = 'drawer' | 'cushion' | 'spoon' | 'rag' | 'screwdriver' | 'brassKey' | 'finalKey' | 'magnet' | 'beenie' | 'lotto' | 'choke' | 'belongings' | 'bracket' | 'cuff' | 'seat' | 'tv' | 'door' | 'hatch' | 'ashtray' | 'notice' | 'pizza' | 'pizzaRear' | 'trash' | 'floorPapers' | 'cans' | 'cab-k1' | 'cab-k2' | 'cab-k3' | 'cab-u1' | 'cab-u2' | 'cab-u3' | 'rearCab' | 'needles' | 'dildo' | 'axe' | 'wall1' | 'wall2' | 'wall3' | 'ronnie';

export const DOOR_CHOPS = 3;
export const RONNIE_CALM = 150;

export interface GameState {
  version: 5;
  encounter: Encounter;
  seed: number;
  elapsed: number;
  view: ViewId;
  drawerOpen: boolean;
  cushionRaised: boolean;
  spoon: 'cushion' | 'inventory' | 'confiscated' | 'stash';
  rag: 'drawer' | 'inventory' | 'stash';
  screwdriver: 'hidden' | 'drawer' | 'inventory' | 'stash';
  brassKey: 'pizza' | 'inventory' | 'stash';
  finalKey: 'cabinet' | 'inventory' | 'stash';
  magnet: 'cab-k1' | 'inventory' | 'stash';
  beenie: 'cab-u2' | 'inventory' | 'stash';
  lotto: 'floor' | 'inventory' | 'stash';
  choke: 'cabinet' | 'inventory' | 'stash';
  dildo: 'counter' | 'inventory' | 'stash' | 'ronnie';
  zwinkys: 'counter' | 'inventory' | 'stash';
  butt: 'ashtray' | 'inventory' | 'stash';
  bobbyPins: 'ashtray' | 'inventory' | 'stash';
  usedNeedles: 'pizzaRear' | 'inventory' | 'stash';
  axe: 'cabinet' | 'inventory' | 'stash';
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

export type Sound = 'drawer' | 'cloth' | 'take' | 'metal' | 'release' | 'alarm' | 'step' | 'door' | 'kiss' | 'vomit' | 'whoop' | 'chop' | 'slam';
export interface Result { state: GameState; message?: string; sound?: Sound; vomit?: boolean; }

export function freshState(): GameState {
  return {
    version: 5, encounter: encounterDefaults(), seed: 731904, elapsed: 0, view: 'seat', drawerOpen: false,
    screwdriver: 'hidden', chainStrikes: 0, knockouts: 0, layout: 0,
    cushionRaised: false, spoon: 'cushion', rag: 'drawer', bracketWork: 0,
    brassKey: 'pizza', finalKey: 'cabinet', magnet: 'cab-k1', beenie: 'cab-u2', lotto: 'floor', choke: 'cabinet',
    dildo: 'counter', zwinkys: 'counter', butt: 'ashtray', bobbyPins: 'ashtray', usedNeedles: 'pizzaRear', axe: 'cabinet',
    cabinets: { k1: false, k2: false, k3: false, u1: false, u2: false, u3: false },
    pizzaOpened: false, rummaged: { pizza: false, trash: false, floorPapers: false, cans: false },
    cabinetUnlocked: false, cuffOpen: false, doorChops: 0, escaped: false, danced: false, ronnieCalm: 0,
    nextVisit: 75 + (731904 % 61),
    bracketConcealed: false, noise: 0,
    journal: ['A cuff, a chain, a floor bracket. Somebody spent more on the padlock than the floor.'],
    nextVisitor: undefined,
  };
}

export function isFree(state: GameState): boolean { return state.bracketWork === 3; }
export function canVisit(state: GameState, view: ViewId): boolean {
  return isFree(state) || view === 'seat' || view === 'kitchen' || view === 'bracket';
}
const ITEM_LIST: ItemId[] = ['spoon', 'rag', 'screwdriver', 'brassKey', 'finalKey', 'magnet', 'beenie', 'lotto', 'choke', 'dildo', 'zwinkys', 'butt', 'bobbyPins', 'usedNeedles', 'axe'];
export function inventory(state: GameState): ItemId[] {
  return ITEM_LIST.filter(item => state[item] === 'inventory');
}
const ITEM_SET = new Set<string>(ITEM_LIST);
export function isItemId(value: string): value is ItemId { return ITEM_SET.has(value); }
const stashable = (state: GameState): ItemId[] => ITEM_LIST.filter(item => state[item] === 'stash');
export function hasStash(state: GameState): boolean { return stashable(state).length > 0; }
const nearCounter = (state: GameState) => state.view === 'seat' || state.view === 'kitchen';

export function transition(current: GameState, action: Action): Result {
  const state: GameState = { ...current, encounter: { ...current.encounter }, journal: [...current.journal], cabinets: { ...current.cabinets }, rummaged: { ...current.rummaged } };
  const encounter = state.encounter;
  const result = (message?: string, sound?: Result['sound']): Result => ({ state, message, sound });
  const note = (text: string) => { if (!state.journal.includes(text)) state.journal.push(text); };
  if (state.escaped) return result();
  if (encounter.phase === 'blackout' && action.type !== 'wake') return result();
  if (encounter.phase === 'kiss' && action.type !== 'tick' && action.type !== 'skip-kiss') return result();
  if (encounter.phase === 'dance' && action.type !== 'tick' && action.type !== 'note') return result('You have to watch.');
  const agitate = (amount: number) => {
    if (encounter.phase !== 'idle' || encounter.cooldown > 0 || state.ronnieCalm > 0) return;
    encounter.agitation = Math.min(100, encounter.agitation + amount);
    if (encounter.agitation >= 85) {
      encounter.phase = 'alarm';
      encounter.remaining = 2;
      encounter.origin = patrolDepth(encounter.patrol);
      note('Ronnie reaches for his buzzer when frightened. His cry brings footsteps to the door.');
    }
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
      if (state.rummaged[action.spot]) return result('You already dug through that. Nothing left but regret.');
      state.rummaged[action.spot] = true;
      state.noise = Math.min(100, state.noise + 7);
      if (action.spot === 'floorPapers') return result('Overdue notices, threats, and a losing scratch ticket that smells like pee. You leave it where it lies.');
      if (action.spot === 'trash') return result('You dig to the bottom. Coffee grounds, a gooey paper towel, a taco wrapper from 2019. Nothing worth pocketing.');
      return result('Nothing in there you want. Nothing in there anybody should want.');
    }
    case 'unlock-cabinet': {
      if (state.view !== 'rear') return result('The locked cabinet is at the rear of the trailer.');
      if (state.cabinetUnlocked) return result('The rear cabinet is already unlocked. It hangs open, embarrassed.');
      const pins = action.item === 'bobbyPins' && state.bobbyPins === 'inventory';
      const key = action.item === 'brassKey' && state.brassKey === 'inventory';
      if (!pins && !key) return result('Requires something to unlock it.');
      state.cabinetUnlocked = true;
      state.noise = Math.min(100, state.noise + 12);
      note('The padlocked cabinet by the bunk is open. There is an axe and a heavy key inside.');
      return result(pins ? 'You bend a bobby pin into a hook and rake the cheap padlock until it gives up. Click. Inside: an axe, a heavy key on twine, and a purple paperback.' : 'The padlock clicks open. Inside: an axe, a heavy key on twine, and a purple paperback.', 'metal');
    }
    case 'unlock-cuff': {
      if (state.cuffOpen) return result('The cuff is already open. You are one decision from gone.');
      if (action.item !== 'finalKey' || state.finalKey !== 'inventory') return result('The cuff lock is heavy and old. A big key, not a spoon.');
      state.cuffOpen = true;
      note('The cuff is open. The rear hatch is glued shut. The front door is plywood. I have an axe, or I know where one is.');
      return result('The cuff springs open. Your wrist is your own for the first time in two days.', 'release');
    }
    case 'chop': {
      if (action.item !== 'axe' || state.axe !== 'inventory') return result('Locked from outside. You would need something heavy to get through it.');
      if (!state.cuffOpen) return result('The cuff yanks your arm back mid-swing. Get the cuff off first.');
      if (state.view !== 'seat' && state.view !== 'kitchen') return result('Get to the entry door first.');
      state.doorChops += 1;
      state.noise = 100;
      if (state.doorChops >= DOOR_CHOPS) {
        state.escaped = true;
        return result('The door splits down the middle and you go through it shoulder first.', 'door');
      }
      return result(state.doorChops === 1 ? 'THUNK. The axe bites the plywood. Outside, the argument stops.' : 'THUNK. Daylight through the crack. Somebody outside is running toward the door. One more. NOW.', 'chop');
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
        return result(item === 'rag' ? 'Pocketed the rag. Calling it a rag is being generous.' : 'A flat screwdriver. He used it on the fitting and left it in the drawer. His mistake.', item === 'rag' ? 'cloth' : 'take');
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
      if (item === 'finalKey' || item === 'choke' || item === 'axe') {
        if (state.view !== 'rear') return result('That is in the cabinet at the rear.');
        if (!state.cabinetUnlocked) return result('Appears to be locked');
        if (state[item] !== 'cabinet') return result('Already taken.');
        state[item] = 'inventory';
        if (item === 'finalKey') note('Got the heavy key from the rear cabinet. It looks like it fits the cuff.');
        if (item === 'axe') note('Got the axe. The front door is plywood. The cuff has to come off first.');
        return result(item === 'finalKey' ? 'A heavy key, cold as a held grudge. This opens the cuff.' : item === 'axe' ? 'An axe. Short handle, heavy head, hair on the blade. It goes down the back of your trousers, next to the other thing.' : 'A purple paperback: CHOKE ON MY LOVE. The cover is doing something illegal in fourteen states. Pocketed.', 'take');
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
      if (state.butt !== 'ashtray' && state.bobbyPins !== 'ashtray') return result('Nothing left in there but ash and regret.');
      if (state.butt === 'ashtray') state.butt = 'inventory';
      if (state.bobbyPins === 'ashtray') state.bobbyPins = 'inventory';
      note('Got bobby pins out of the emergency ashtray. Thin and springy. Lock-shaped, if you squint.');
      return result('Cigarette butt. And tangled under it, a couple of bobby pins.', 'take');
    }
    case 'return': {
      const item = action.item;
      if (state[item] !== 'inventory') return result('It is already where you found it.');
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
      if (item === 'finalKey' || item === 'choke' || item === 'axe') {
        if (state.view !== 'rear' || !state.cabinetUnlocked) return result('It belongs in the rear cabinet.');
        state[item] = 'cabinet';
        return result(item === 'finalKey' ? 'The heavy key goes back on its twine loop.' : item === 'axe' ? 'The axe goes back in the cabinet, blade down.' : 'The novel goes back. The cabinet seems relieved.', 'cloth');
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
      if (!reachable) return result('The Zwinkys is on the counter.');
      state.noise = Math.min(100, state.noise + 22);
      if (state.view === 'rear') agitate(30);
      return { state, message: 'Aahh refreshing', sound: 'vomit', vomit: true };
    }
    case 'give-ronnie': {
      if (state.view !== 'rear') return result('Ronnie is on the couch at the rear.');
      if (action.item === 'usedNeedles') return result('No. Whatever else happens in this trailer, you are not doing that to him.');
      if (action.item !== 'dildo' || state.dildo !== 'inventory') return result('Ronnie does not want that. Ronnie does not seem to want anything.');
      if (encounter.phase !== 'idle') return result('Not now. Somebody is already coming.');
      state.dildo = 'ronnie';
      encounter.phase = 'alarm';
      encounter.remaining = 2;
      encounter.origin = patrolDepth(encounter.patrol);
      encounter.nextVisitor = 'cletus';
      encounter.nextPurpose = 'dildo';
      note('House rules exist for a reason. Ronnie and the dildo is apparently a recurring problem.');
      return result('You set it on the couch by his hand. Ronnie\'s eyes snap open. He snatches it, waves it over his head like a trophy and hammers his buzzer with it. Oh no.', 'whoop');
    }
    case 'work':
      if (state.view !== 'seat' && state.view !== 'bracket') return result('Return to the floor bracket.');
      if (isFree(state)) return result('The chain is already free of the floor. The cuff stays on.');
      if ((action.item !== 'spoon' && action.item !== 'screwdriver') || state[action.item] !== 'inventory') return result(action.item ? 'A broad, corroded slot. A flat spoon handle or screwdriver could fit.' : 'I try to pry it off but it still won’t budge');
      state.bracketWork += 1;
      state.bracketConcealed = false;
      state.noise = Math.min(100, state.noise + 27);
      if (isFree(state)) {
        note('The bracket is loose. I can reach the back now. The cuff is still on; this is not an escape.');
        return result('The rotten fitting gives. Chain off the floor. Cuff still on. You can reach the dinette and rear bunk now.', 'release');
      }
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
      const caught = Boolean(encounter.evidence);
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
      encounter.phase = 'leaving';
      encounter.remaining = LEAVE_SECONDS;
      encounter.visits += 1;
      if (encounter.chainCaught) {
        state.chainStrikes += 1;
        state.bracketWork = 0;
        state.bracketConcealed = false;
        state.view = 'seat';
        state.cushionRaised = false;
        if (state.chainStrikes === 1) {
          state.spoon = 'confiscated';
          if (state.screwdriver === 'hidden') state.screwdriver = 'drawer';
          state.drawerOpen = true;
          encounter.outcome = 'Cletus: "My floor. My fucking rules." He pockets the spoon and refastens the fitting, then drops his screwdriver into the kitchen drawer.';
          note('He took the spoon and fixed the chain. He left the screwdriver in the reachable kitchen drawer.');
        } else {
          state.knockouts += 1;
          state.elapsed += 90;
          state.layout += 1;
          state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
          for (const item of inventory(state)) state[item] = 'stash';
          if (state.screwdriver === 'hidden') state.screwdriver = 'drawer';
          state.drawerOpen = true;
          encounter.phase = 'blackout';
          encounter.remaining = 0;
          encounter.outcome = 'Cletus: "I already told you about my floor." A sudden blow. Blackness. Ninety seconds gone. Your pockets have been emptied and the loose belongings rearranged.';
          note('Woke up chained again. Empty pockets. They dumped my gear in a bundle in the kitchen drawer. Fresh scrape marks everywhere.');
        }
      }
      note(caught ? 'He noticed what was out of place. Being back on the couch is not enough if the loose fitting is exposed.' : 'He did not notice the fitting. He was busy talking about things listening through the walls.');
      return result(encounter.outcome, encounter.phase === 'leaving' ? 'slam' : undefined);
    }
    case 'skip-kiss':
      if (encounter.phase === 'kiss') { encounter.phase = 'dialogue'; encounter.remaining = 0; }
      return result();
    case 'tick':
      if (!Number.isFinite(action.seconds) || action.seconds <= 0) return result();
      {
        const seconds = Math.min(action.seconds, 1);
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
            encounter.outcome = 'Cletus: "Not a word. Not to Darlene, not to Ronnie, not to God." He adjusts the nightgown and bolts out, glowing.';
            note('Cletus came in wearing Darlene\'s nightgown and danced at me. I have to live with that now.');
            return result(encounter.outcome, 'slam');
          }
          return result(undefined, before > 3.2 && encounter.remaining <= 3.2 ? 'kiss' : undefined);
        }
        state.elapsed += seconds;
        state.noise = Math.max(0, state.noise - seconds * 4);
        state.ronnieCalm = Math.max(0, state.ronnieCalm - seconds);
        encounter.cooldown = Math.max(0, encounter.cooldown - seconds);
        if (encounter.phase === 'idle') {
          encounter.patrol += seconds;
          if (state.view === 'rear' && state.noise > 25) agitate(seconds * 6);
          else encounter.agitation = Math.max(0, encounter.agitation - seconds * 3);
          if (state.elapsed >= state.nextVisit && encounter.cooldown <= 0) {
            encounter.phase = 'approach'; encounter.remaining = APPROACH_SECONDS; encounter.origin = patrolDepth(encounter.patrol);
            encounter.nextVisitor = state.nextVisitor ?? (state.seed % 2 === 0 ? 'cletus' : 'darlene');
            if (!state.danced && state.elapsed >= DANCE_AT) { encounter.nextVisitor = 'cletus'; encounter.nextPurpose = 'dance'; }
            state.nextVisitor = undefined;
            state.nextVisit = state.elapsed + 55 + (state.seed % 51);
            state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
            return result('Footsteps stop outside. Someone is coming to the door.', 'step');
          }
        } else {
          const previous = encounter.remaining;
          encounter.remaining = Math.max(0, previous - seconds);
          if (encounter.remaining <= 0.00001) {
            if (encounter.phase === 'alarm') {
              encounter.phase = 'approach'; encounter.remaining = APPROACH_SECONDS;
              return result('Cletus: "Hey, what the fuck was that?"', 'step');
            }
            if (encounter.phase === 'approach') {
              encounter.phase = 'entering'; encounter.remaining = ENTER_SECONDS;
              encounter.talkCount = 0; encounter.kissed = false;
              const visitor: VisitorId = encounter.nextVisitor ?? 'cletus';
              const special = visitor === 'cletus' ? encounter.nextPurpose : undefined;
              encounter.nextPurpose = undefined;
              encounter.nextVisitor = undefined;
              encounter.visitor = visitor;
              if (special === 'dance') {
                state.danced = true;
                encounter.purpose = 'dance';
                encounter.chainCaught = false;
                encounter.evidence = '';
                return result('The door BANGS open. Cletus charges in wearing Darlene\'s nightgown, a mop-head wig and a face full of lipstick. Somewhere, a synthesizer starts.', 'slam');
              }
              encounter.chainCaught = state.bracketWork > 0 && !(state.view === 'seat' && state.bracketConcealed);
              encounter.evidence = encounter.chainCaught ? 'That fitting has been loosened.' : state.view !== 'seat' ? 'I saw you away from your seat.' : state.drawerOpen ? 'That drawer was shut.' : '';
              if (special === 'dildo') {
                encounter.purpose = 'dildo';
                if (state.dildo === 'ronnie') state.dildo = 'counter';
                return result('The door BANGS open. Cletus storms past you to the couch, wrestles the dildo out of Ronnie\'s fist and slams it back on the counter.', 'slam');
              }
              const searching = visitor === 'darlene' && !encounter.chainCaught && encounter.visits % 3 === 0;
              encounter.purpose = searching ? 'search' : 'talk';
              return result(visitor === 'darlene' ? 'The door BANGS off the wall. Darlene barrels in, cigarette first.' : 'The door BANGS open. Cletus lunges in, eyes everywhere.', 'slam');
            }
            if (encounter.phase === 'entering') {
              if (encounter.purpose === 'search') { encounter.phase = 'search'; encounter.remaining = 8; return result('She is not here for you. She is looking for something.', 'drawer'); }
              if (encounter.purpose === 'dance') { encounter.phase = 'dance'; encounter.remaining = DANCE_SECONDS; return result('You have to watch.'); }
              encounter.phase = 'dialogue';
              return result();
            }
            if (encounter.phase === 'search') {
              encounter.phase = 'idle'; encounter.cooldown = 30; encounter.agitation = 0; encounter.visits += 1;
              encounter.patrol = Math.asin((-0.225 - 1.05) / 1.4) / 0.48;
              return result('Darlene: "Where is my fucking lighter." It was in her hand. She leaves without looking at you.', 'slam');
            }
            if (encounter.phase === 'leaving') {
              encounter.phase = 'idle'; encounter.cooldown = 35; encounter.agitation = 0;
              encounter.patrol = Math.asin((-0.225 - 1.05) / 1.4) / 0.48;
              return result('Footsteps stomp away from the door. You can breathe again.', 'step');
            }
          }
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

const PLACEMENTS: Record<string, string[]> = {
  brassKey: ['pizza', 'inventory', 'stash'], finalKey: ['cabinet', 'inventory', 'stash'], magnet: ['cab-k1', 'inventory', 'stash'],
  beenie: ['cab-u2', 'inventory', 'stash'], lotto: ['floor', 'inventory', 'stash'], choke: ['cabinet', 'inventory', 'stash'],
};
const V5_PLACEMENTS: Record<string, string[]> = {
  dildo: ['counter', 'inventory', 'stash', 'ronnie'], zwinkys: ['counter', 'inventory', 'stash'], butt: ['ashtray', 'inventory', 'stash'],
  bobbyPins: ['ashtray', 'inventory', 'stash'], usedNeedles: ['pizzaRear', 'inventory', 'stash'], axe: ['cabinet', 'inventory', 'stash'],
};

export function decodeSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const value = candidate as Record<string, unknown>;
    const version = Number(value.version);
    if (![1, 2, 3, 4, 5].includes(version) || !VIEW_IDS.includes(value.view as ViewId)) return null;
    if (!['cushion', 'inventory', 'confiscated', 'stash'].includes(String(value.spoon))) return null;
    if (!['drawer', 'inventory', 'stash'].includes(String(value.rag))) return null;
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
      if (!savedEncounter || !PHASES.includes(savedEncounter.phase)) return null;
      for (const field of ['remaining', 'agitation', 'cooldown', 'lastMove', 'patrol', 'origin', 'suspicion', 'visits'] as const) {
        if (typeof savedEncounter[field] !== 'number' || !Number.isFinite(savedEncounter[field])) return null;
      }
      if (savedEncounter.remaining < 0 || savedEncounter.remaining > 20 || savedEncounter.agitation < 0 || savedEncounter.agitation > 100 || savedEncounter.suspicion < 0 || savedEncounter.suspicion > 100 || savedEncounter.cooldown < 0 || savedEncounter.visits < 0 || !Number.isInteger(savedEncounter.visits)) return null;
      if (savedEncounter.phase !== 'dance' && savedEncounter.remaining > 12) return null;
      if (typeof savedEncounter.evidence !== 'string' || typeof savedEncounter.outcome !== 'string') return null;
      if (version >= 3 && typeof savedEncounter.chainCaught !== 'boolean') return null;
      const talkCount = savedEncounter.talkCount ?? 0;
      const kissed = savedEncounter.kissed ?? false;
      if (!Number.isSafeInteger(talkCount) || talkCount < 0 || talkCount > 1000000 || typeof kissed !== 'boolean') return null;
      if (savedEncounter.phase === 'kiss' && (!kissed || savedEncounter.remaining > 6)) return null;
      const visitor: VisitorId = savedEncounter.visitor === 'darlene' ? 'darlene' : 'cletus';
      const purpose = PURPOSES.includes(savedEncounter.purpose) ? savedEncounter.purpose : 'talk';
      if (savedEncounter.phase === 'dance' && purpose !== 'dance') return null;
      const nextPurpose = savedEncounter.nextPurpose === 'dildo' || savedEncounter.nextPurpose === 'dance' ? savedEncounter.nextPurpose : undefined;
      const nextVisitor: VisitorId | undefined = savedEncounter.nextVisitor === 'darlene' || savedEncounter.nextVisitor === 'cletus' ? savedEncounter.nextVisitor : undefined;
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
      bobbyPins: pick('bobbyPins', v5), usedNeedles: pick('usedNeedles', v5), axe: pick('axe', v5),
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
    };
    if (!canVisit(state, state.view) || (state.bracketConcealed && state.bracketWork === 0)) return null;
    if (state.view !== 'seat') state.bracketConcealed = false;
    if (state.escaped) return null;
    return state;
  } catch { return null; }
}
