import { fireRefusal, FIRE_SPOTS, isFireSpot, isFree, isThrowable, upcomingVisitor, type Action, type CabinetId, type FireSpot, type GameState, type HotspotId, type ItemId } from './state';
import { ITEMS, itemName } from './content';
import type { VisitorId } from './encounters';

// Authored Look / Grab / Use lines per hotspot. A function may vary by camera view or puzzle state;
// returning undefined falls back to the default inspect text or game mechanic.
type Line = string | ((state: GameState) => string | undefined);
interface Script { look?: Line; take?: Line; use?: Line; }

const FAR = 'I can’t reach that its too far';
const NO_USE = 'I have no use for it';
// While you are high, the authored line steps aside and the hallucination shows (content.ts TRIPPING).
const sober = (line: string): Line => state => state.trip > 0 ? undefined : line;
const wallpaper: Script = { look: sober('Appears to be crazy notes written by a mad man'), take: NO_USE, use: NO_USE };

const SCRIPTS: Partial<Record<HotspotId, Script>> = {
  wall1: wallpaper, wall2: wallpaper, wall3: wallpaper,
  notice: { look: 'No touching anything, Dont give Ronnie the dildo, Dont be too loud, Dont touch the amp, No escaping' },
  hatch: {
    look: state => state.view === 'rear' ? 'Its locked, they glued it shut there is no way to get out of this' : 'It appears to be an escape hatch',
    take: state => state.view === 'rear' ? 'I cant take it' : undefined,
    use: state => state.view === 'rear' ? undefined : 'Cant use it is way too far',
  },
  pizza: { look: state => state.burnt.pizza ? undefined : 'That\'s some stinky pizza looks like it has to be 2 months old', take: FAR, use: FAR },
  ashtray: {
    look: state => state.view === 'dinette' ? 'Full of cigarette butts, roach clips (Weed) and bobby pins' : 'That looks like a very uniquely disgusting ashtray but i can’t reach it',
    take: state => state.view === 'dinette' ? undefined : FAR,
    use: state => state.view === 'dinette' ? 'Unable to use them' : FAR,
  },
  dildo: {
    look: 'This appears to be a poopy stinky dildo right next to the sink and stove yucky what the fuck am i supposed to do with that?',
    use: 'Ronnie keeps side-eyeing it from the couch. The house rules are very specific: Dont give Ronnie the dildo.',
  },
  cans: { look: 'It looks like a can of Zwinkys Malt Liquor that has some ash in it but there\'s a little sip left.' },
  cushion: { look: state => state.cushionRaised ? undefined : 'It smells like pee, I wonder what\'s under the cushions' },
  seat: { look: sober('Oh god this couch smells awful! Who would fucking pee on a couch????') },
  bracket: {
    look: state => isFree(state) ? undefined : 'These guys really got my leg tied to a chain.. it looks like theres a screw i can loosen',
    take: 'I can’t take that it’s bolted to the ground.. There must be a way to loosen it',
  },
  lotto: { look: 'These losers have no money and they are still gambling', take: 'I’m not going to touch that it smells like pee' },
  rearCab: {
    take: state => state.cabinetUnlocked ? undefined : 'The footlocker is padlocked. Pick the padlock first.',
  },
  pizzaRear: { use: 'I’m not touching anything in there with my bare hands. Grabbing is different. Somehow.' },
  ronnie: { look: sober('He appears to be unresponsive.'), use: 'He appears to be unresponsive.' },
  tv: {
    take: 'It weighs as much as a dead dog and it is bolted to the counter. Leave it.',
    use: state => state.tvOn ? 'You smack the side of the set. The picture jumps, then goes right back to where it was.' : 'You smack the side of the set. Nothing. The power button is on the side, if you get up to it.',
  },
  puddle: { take: 'You are not picking that up with your hands. Find something to mop it with.' },
  blinds: { take: 'The blinds are the only thing in here that are not sticky. Leave them.' },
  radio: { take: 'It is Dale\'s. It is the only thing Dale has left. You are not taking it off him too.' },
};

// Lower cabinets describe their contents once open; the authored line applies while shut.
for (const id of ['cab-k1', 'cab-k2', 'cab-k3'] as const) {
  const cabinet = id.slice(4) as 'k1' | 'k2' | 'k3';
  SCRIPTS[id] = { look: state => state.cabinets[cabinet] ? undefined : 'This appears to be a cabinet under the sink, maybe I can open it?' };
}

export function scripted(id: HotspotId, verb: 'look' | 'take' | 'use', state: GameState): string | undefined {
  const line = SCRIPTS[id]?.[verb];
  return typeof line === 'function' ? line(state) : line;
}

// ---------------------------------------------------------------------------------------------
// Sims-style pie menus. Hovering a thing in the world, or an item in your pockets, offers these.

export type WedgeAction =
  | { kind: 'look' } | { kind: 'take' } | { kind: 'use' } | { kind: 'talk' }
  | { kind: 'use-item'; item: ItemId } | { kind: 'put-back'; item: ItemId }
  | { kind: 'examine' } | { kind: 'hold' } | { kind: 'act'; action: Action };
export interface Wedge { action: WedgeAction; label: string; icon: string; primary?: boolean; }

// Where each pocketed thing can be put back.
const HOMES: Partial<Record<ItemId, HotspotId[]>> = {
  spoon: ['cushion', 'seat'], rag: ['drawer'], screwdriver: ['drawer'], dildo: ['dildo', 'cans'], zwinkys: ['cans'],
  butt: ['ashtray'], bobbyPins: ['ashtray'], usedNeedles: ['pizzaRear'], axe: ['rearCab'],
  choke: ['rearCab'], magnet: ['cab-k1'], beenie: ['cab-u2'], lotto: ['floorPapers'], lighter: ['floorPapers', 'seat'],
};

function useLabel(id: HotspotId, state: GameState): string {
  if (id.startsWith('cab-')) return state.cabinets[id.slice(4) as CabinetId] ? 'Shut it' : 'Open it';
  switch (id) {
    case 'drawer': return state.drawerOpen ? 'Shut drawer' : 'Open drawer';
    case 'cushion': return state.cushionRaised ? 'Drop cushion' : 'Lift cushion';
    case 'seat': return state.bracketWork > 0 ? 'Pretend restrained' : 'Sit still';
    case 'bracket': return 'Pry at it';
    case 'cuff': return 'Tug the cuff';
    case 'rearCab': return state.cabinetUnlocked ? 'Take what\'s inside' : 'Rattle the padlock';
    case 'hatch': return 'Shove it';
    case 'cans': return 'Drink';
    case 'door': return 'Try the door';
    case 'blinds': return 'Peek outside';
    case 'tv': return 'Smack it';
    case 'puddle': return 'Wipe it up';
    case 'radio': return state.radioOn ? 'Turn it off' : 'Turn it on';
    case 'ronnie': return 'Poke him';
    case 'belongings': return 'Open bundle';
    case 'trash': case 'floorPapers': return 'Dig through';
    default: return 'Use';
  }
}

function heldLabel(item: ItemId, id: HotspotId, state: GameState): string {
  const name = itemName(item, state);
  if (id === 'blinds' && isThrowable(item)) return `Throw ${name} out`;
  if (id === 'puddle' && item === 'rag') return 'Mop it up';
  if (id === 'ronnie' && item === 'dildo') return 'Leave it by his hand';
  if ((id === 'bracket' || id === 'cuff') && item === 'finalKey') return 'Unlock the cuff';
  if (id === 'bracket' && (item === 'spoon' || item === 'screwdriver')) return `Crank it with the ${name}`;
  if (id === 'rearCab' && (item === 'bobbyPins' || item === 'brassKey')) return state.steady > 0 ? 'Pick the lock' : 'Try to pick the lock';
  if (id === 'door' && item === 'axe') return 'CHOP';
  if (id === 'tv' && item === 'remote') return state.tvOn ? 'Turn it off' : 'Turn it on';
  if (item === 'lighter' && isFireSpot(id)) return state.burnt[id] ? 'Nothing left to burn' : 'Set it on fire';
  return `Use ${name}`;
}

export function pieOptions(id: HotspotId, state: GameState, held: ItemId | null): Wedge[] {
  const wedges: Wedge[] = [
    { action: { kind: 'look' }, label: 'Look', icon: 'eye' },
    { action: { kind: 'take' }, label: 'Grab', icon: 'hand' },
    { action: { kind: 'use' }, label: useLabel(id, state), icon: 'wrench' },
  ];
  if (id === 'ronnie') wedges.push({ action: { kind: 'talk' }, label: 'Talk', icon: 'message-circle' });
  // Up at the set: its power button and volume rocker.
  if (id === 'tv' && state.view === 'dinette') {
    wedges.push({ action: { kind: 'act', action: { type: 'tv', command: 'power' } }, label: state.tvOn ? 'Turn it off' : 'Turn it on', icon: 'power', primary: !held });
    if (state.tvOn) wedges.push({ action: { kind: 'act', action: { type: 'tv', command: 'mute' } }, label: state.tvMuted ? 'Unmute' : 'Mute', icon: state.tvMuted ? 'volume-2' : 'volume-x', primary: !held });
  }
  if (held) {
    // Holding something: using it here is the obvious move, so it comes first and stands out.
    wedges.unshift({ action: { kind: 'use-item', item: held }, label: heldLabel(held, id, state), icon: ITEMS[held].icon, primary: true });
    if (HOMES[held]?.includes(id)) wedges.push({ action: { kind: 'put-back', item: held }, label: 'Put back', icon: 'undo-2' });
  }
  return wedges;
}

const BURN_LABELS: Record<FireSpot, string> = {
  floorPapers: 'Burn the floor papers', trash: 'Burn the trash bags', pizza: 'Burn the pizza box', pizzaRear: 'Burn the pizza box',
};

// The action card for something in your pockets: what it is, and everything you can do with it right now.
export function itemOptions(item: ItemId, state: GameState): Wedge[] {
  const wedges: Wedge[] = [];
  const act = (action: Action, label: string, icon: string) => wedges.push({ action: { kind: 'act', action }, label, icon, primary: true });
  if (item === 'zwinkys') act({ type: 'drink' }, 'Drink', 'beer');
  if (item === 'butt') { act({ type: 'smoke' }, 'Smoke it', 'flame'); act({ type: 'chew' }, 'Chew it', 'cigarette'); }
  if (item === 'choke') act({ type: 'read' }, 'Read it', 'book-open');
  if (item === 'lighter') {
    if (state.butt === 'inventory') act({ type: 'smoke' }, 'Light the butt', 'cigarette');
    // Whatever flammable thing is in reach right now.
    for (const spot of FIRE_SPOTS) if (!fireRefusal(state, spot)) act({ type: 'ignite', spot }, BURN_LABELS[spot], 'flame');
  }
  if (item === 'remote') {
    act({ type: 'tv', command: 'power' }, state.tvOn ? 'Power off' : 'Power on', 'tv');
    act({ type: 'tv', command: 'next' }, 'Channel up', 'arrow-right');
    act({ type: 'tv', command: 'prev' }, 'Channel down', 'arrow-left');
    if (state.tvOn) act({ type: 'tv', command: 'mute' }, state.tvMuted ? 'Unmute' : 'Mute', 'volume-2');
  }
  if (item === 'rag') {
    for (const tool of ['spoon', 'screwdriver', 'axe'] as const) if (state[tool] === 'inventory' && state.wrapped !== tool) act({ type: 'wrap', item: tool }, `Wrap the ${tool}`, 'shirt');
    if (state.puddle) act({ type: 'wipe' }, 'Wipe the puke', 'shirt');
  }
  if (state.wrapped === item) act({ type: 'unwrap' }, 'Unwrap rag', 'shirt');
  wedges.push({ action: { kind: 'examine' }, label: 'Examine up close', icon: 'eye' });
  wedges.push({ action: { kind: 'hold' }, label: 'Put it away', icon: 'x' });
  return wedges;
}

// What you see through the blinds: who is out there, what they are doing, and how close they are to coming in.
const PEEKS: Record<VisitorId, [string[], string[], string[]]> = {
  cletus: [
    ['Cletus is flat on his back in the weeds, explaining the moon to a plastic flamingo. Not yet.', 'Cletus is chewing on the porch rail. Just chewing it. Not yet.'],
    ['Cletus is pacing and scratching his forearms raw. He keeps looking at the door. Soon-ish.', 'Cletus is doing push-ups on the propane tank and losing count. He glances at the trailer. Soon-ish.'],
    ['Cletus is standing dead still, staring straight at your window. His lips are moving. SOON.', 'Cletus is sniffing the air like a dog and walking toward the door. SOON.'],
  ],
  darlene: [
    ['Darlene is asleep standing up against the shed, cigarette still burning in her mouth. Not yet.', 'Darlene is talking to a lawn chair about her ex-husband. Not yet.'],
    ['Darlene is going through the outside trash can for the third time, getting madder. Soon-ish.', 'Darlene is patting every pocket she owns and swearing. Soon-ish.'],
    ['Darlene is marching at the trailer, fists balled, screaming about her lighter. SOON.', 'Darlene has her face pressed right up against your window, looking in. SOON.'],
  ],
  dale: [
    ['Dale is sitting on an upturned bucket, playing air guitar very slowly, crying a little. Not yet.', 'Dale is talking to the empty spot in his truck bed where the amp used to ride. Not yet.'],
    ['Dale is wiping his eyes with his ZWINKY ENERGY shirt and looking at the trailer. Soon-ish.', 'Dale is untangling the cord on his boombox and sniffing. Soon-ish.'],
    ['Dale is walking toward the door with his boombox, a beer and a look like a wet dog. SOON.', 'Dale is right outside, practicing what he is going to say about the amp. SOON.'],
  ],
};
// Through the blinds with the bulb in you.
const TRIP_PEEKS = [
  'Seven of them are standing in the yard, perfectly still, all facing your window. Cletus walks right through one and does not notice.',
  'Something tall and black is crouched on the propane tank, wearing your face. It waves. You do not wave back. You almost wave back.',
  'Nobody out there. Just the shadow of somebody, on the grass, with nobody standing over it.',
  'Every window in every trailer in the park has a face in it, and every face is looking at you.',
];

export function peekReport(state: GameState): string {
  const encounter = state.encounter;
  if (encounter.phase === 'approach' || encounter.phase === 'alarm') return 'Somebody is RUNNING at the door. Get on the couch. NOW.';
  if (encounter.phase !== 'idle') return 'Nobody out there. They are in here with you.';
  if (state.trip > 0 && Math.floor(state.elapsed / 7) % 2 === 0) return TRIP_PEEKS[Math.floor(state.elapsed / 14) % TRIP_PEEKS.length];
  if (state.outsideReading > 0) return 'Cletus is sitting in the weeds with your paperback, reading it out loud with his finger under every word. Darlene is heckling him. You have time.';
  const who = upcomingVisitor(state);
  const wait = state.nextVisit - state.elapsed;
  const band = wait > 45 ? 0 : wait > 20 ? 1 : 2;
  const lines = PEEKS[who][band];
  return lines[Math.floor(state.elapsed / 10) % lines.length];
}
