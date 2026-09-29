import { isFree, type GameState, type HotspotId } from './state';

// Authored Look / Grab / Use lines per hotspot. A function may vary by camera view or puzzle state;
// returning undefined falls back to the default inspect text or game mechanic.
type Line = string | ((state: GameState) => string | undefined);
interface Script { look?: Line; take?: Line; use?: Line; }

const FAR = 'I can’t reach that its too far';
const NO_USE = 'I have no use for it';
const wallpaper: Script = { look: 'Appears to be crazy notes written by a mad man', take: NO_USE, use: NO_USE };

const SCRIPTS: Partial<Record<HotspotId, Script>> = {
  wall1: wallpaper, wall2: wallpaper, wall3: wallpaper,
  notice: { look: 'No touching anything, Dont give Ronnie the dildo, Dont be too loud, Dont touch the amp, No escaping' },
  hatch: {
    look: state => state.view === 'rear' ? 'Its locked, they glued it shut there is no way to get out of this' : 'It appears to be an escape hatch',
    take: state => state.view === 'rear' ? 'I cant take it' : undefined,
    use: state => state.view === 'rear' ? undefined : 'Cant use it is way too far',
  },
  pizza: { look: 'That\'s some stinky pizza looks like it has to be 2 months old', take: FAR, use: FAR },
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
  seat: { look: 'Oh god this couch smells awful! Who would fucking pee on a couch????' },
  bracket: {
    look: state => isFree(state) ? undefined : 'These guys really got my leg tied to a chain.. it looks like theres a screw i can loosen',
    take: 'I can’t take that it’s bolted to the ground.. There must be a way to loosen it',
  },
  lotto: { look: 'These losers have no money and they are still gambling', take: 'I’m not going to touch that it smells like pee' },
  rearCab: {
    look: state => state.cabinetUnlocked ? undefined : 'Appears to be locked',
    take: state => state.cabinetUnlocked ? undefined : 'Appears to be locked',
  },
  pizzaRear: { use: 'I’m not touching anything in there with my bare hands. Grabbing is different. Somehow.' },
  ronnie: { look: 'He appears to be unresponsive.', use: 'He appears to be unresponsive.' },
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
