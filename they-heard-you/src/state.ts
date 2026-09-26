import { encounterDefaults, patrolDepth, PHASES, type Encounter, type ResponseId } from './encounters.js';

export const SAVE_KEY = 'they-heard-you:first-pass:v1';
export const VIEW_IDS = ['seat', 'kitchen', 'bracket', 'dinette', 'rear'] as const;
export type ViewId = typeof VIEW_IDS[number];
export type ItemId = 'spoon' | 'rag';
export type Verb = 'look' | 'take' | 'use' | 'talk' | 'put-back';
export type HotspotId = 'drawer' | 'cushion' | 'spoon' | 'rag' | 'bracket' | 'seat' | 'tv' | 'door' | 'hatch' | 'ashtray' | 'notice';

export interface GameState {
  version: 2;
  encounter: Encounter;
  seed: number;
  elapsed: number;
  view: ViewId;
  drawerOpen: boolean;
  cushionRaised: boolean;
  spoon: 'cushion' | 'inventory';
  rag: 'drawer' | 'inventory';
  bracketWork: number;
  bracketConcealed: boolean;
  noise: number;
  journal: string[];
}

export type Action =
  | { type: 'view'; view: ViewId }
  | { type: 'drawer' }
  | { type: 'cushion' }
  | { type: 'take'; item: ItemId }
  | { type: 'return'; item: ItemId }
  | { type: 'work'; item: ItemId | null }
  | { type: 'conceal' }
  | { type: 'rattle' }
  | { type: 'respond'; response: ResponseId }
  | { type: 'tick'; seconds: number }
  | { type: 'note'; text: string };

export interface Result { state: GameState; message?: string; sound?: 'drawer' | 'cloth' | 'take' | 'metal' | 'release' | 'alarm' | 'step' | 'door'; }

export function freshState(): GameState {
  return {
    version: 2, encounter: encounterDefaults(), seed: 731904, elapsed: 0, view: 'seat', drawerOpen: false,
    cushionRaised: false, spoon: 'cushion', rag: 'drawer', bracketWork: 0,
    bracketConcealed: false, noise: 0,
    journal: ['A cuff, a chain, a floor bracket. Somebody spent more on the padlock than the floor.'],
  };
}

export function isFree(state: GameState): boolean { return state.bracketWork === 3; }
export function canVisit(state: GameState, view: ViewId): boolean {
  return isFree(state) || view === 'seat' || view === 'kitchen' || view === 'bracket';
}
export function inventory(state: GameState): ItemId[] {
  return (['spoon', 'rag'] as ItemId[]).filter(item => state[item] === 'inventory');
}

export function transition(current: GameState, action: Action): Result {
  const state: GameState = { ...current, encounter: { ...current.encounter }, journal: [...current.journal] };
  const encounter = state.encounter;
  const result = (message?: string, sound?: Result['sound']): Result => ({ state, message, sound });
  const note = (text: string) => { if (!state.journal.includes(text)) state.journal.push(text); };
  const agitate = (amount: number) => {
    if (encounter.phase !== 'idle' || encounter.cooldown > 0) return;
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
      if (state.view !== 'seat') return result('Go back to the original seat.');
      state.cushionRaised = !state.cushionRaised;
      return result(state.cushionRaised ? 'The cushion comes up reluctantly. Something has been living better than you under here.' : 'Back down. The stain is a permanent resident.', 'cloth');
    case 'take':
      if (state[action.item] === 'inventory') return result('Already in your pocket.');
      if (action.item === 'spoon') {
        if (state.view !== 'seat' || !state.cushionRaised) return result('Lift the seat cushion first.');
        state.spoon = 'inventory';
        note('Found a spoon under the cushion. Flat handle. The floor fitting has a broad slot.');
        return result('A bent spoon. Finally, somebody left the good silver out.', 'take');
      }
      if ((state.view !== 'kitchen' && state.view !== 'seat') || !state.drawerOpen) return result('Open the kitchen drawer first.');
      state.rag = 'inventory';
      return result('Pocketed the rag. Calling it a rag is being generous.', 'cloth');
    case 'return':
      if (state[action.item] !== 'inventory') return result('It is already where you found it.');
      if (action.item === 'spoon') {
        if (state.view !== 'seat' || !state.cushionRaised) return result('Go to the seat and lift the cushion to put it back.');
        state.spoon = 'cushion';
        return result('Spoon back under the cushion. Your inheritance, restored.', 'take');
      }
      if ((state.view !== 'kitchen' && state.view !== 'seat') || !state.drawerOpen) return result('Open the kitchen drawer to put the rag back.');
      state.rag = 'drawer';
      return result('Rag back in the drawer.', 'cloth');
    case 'work':
      if (state.view !== 'seat' && state.view !== 'bracket') return result('Return to the floor bracket.');
      if (isFree(state)) return result('The chain is already free of the floor. The cuff stays on.');
      if (action.item !== 'spoon' || state.spoon !== 'inventory') return result('A broad, corroded slot. Something flat might fit. Bare fingers do not.');
      state.bracketWork += 1;
      state.bracketConcealed = false;
      state.noise = Math.min(100, state.noise + 27);
      if (isFree(state)) {
        note('The bracket is loose. I can reach the back now. The cuff is still on; this is not an escape.');
        return result('The rotten fitting gives. Chain off the floor. Cuff still on. You can reach the dinette and rear bunk now.', 'release');
      }
      return result(state.bracketWork === 1 ? 'The fitting shifts. Metal complains. Two more short efforts.' : 'Almost loose. One more effort. Every sound seems to carry.', 'metal');
    case 'conceal':
      if (state.view !== 'seat') return result('Return to Your seat first, then conceal the fitting.');
      if (!isFree(state)) return result('No pretending required. You are still chained to the floor.');
      state.view = 'seat';
      state.bracketConcealed = true;
      note('I can sit back down and lay the loose fitting over its old marks. It only looks attached.');
      return result('Back in the seat. Loose fitting over the old marks. From the door, it looks attached.', 'metal');
    case 'rattle':
      if (state.view !== 'rear') return result('The hatch is at the rear.');
      state.noise = Math.min(100, state.noise + 35);
      agitate(48);
      return result('The broken hatch rattles sharply. Ronnie flinches. It still needs a replacement handle.', 'metal');
    case 'respond': {
      if (encounter.phase !== 'dialogue') return result();
      const caught = Boolean(encounter.evidence);
      const hostile = action.response === 'defy';
      encounter.suspicion = Math.min(100, encounter.suspicion + (caught ? 25 : hostile ? 15 : action.response === 'ronnie' ? 5 : 0));
      encounter.outcome = caught
        ? `Cletus: "${encounter.evidence} Don't bullshit me. Next time I won't just be looking." He leaves, watching you. Suspicion increased.`
        : hostile ? 'Cletus: "Keep that mouth running. See where it gets you." He leaves reluctantly. Suspicion increased.'
        : action.response === 'ronnie' ? 'Cletus looks toward the couch. "Then quit upsetting him." He backs out, suspicious.'
        : 'Cletus studies the fitting. "Stay put. And keep it fucking quiet." He backs out.';
      encounter.phase = 'leaving';
      encounter.remaining = 5;
      encounter.visits += 1;
      note(caught ? 'He noticed what was out of place. Being back in the seat is not enough if the loose fitting is exposed.' : 'He left. The fitting looks attached from the doorway when I lay it over the marks.');
      return result(encounter.outcome);
    }
    case 'tick':
      if (!Number.isFinite(action.seconds) || action.seconds <= 0) return result();
      {
        const seconds = Math.min(action.seconds, 1);
        state.elapsed += seconds;
        state.noise = Math.max(0, state.noise - seconds * 4);
        encounter.cooldown = Math.max(0, encounter.cooldown - seconds);
        if (encounter.phase === 'idle') {
          encounter.patrol += seconds;
          if (state.view === 'rear' && state.noise > 25) agitate(seconds * 6);
          else encounter.agitation = Math.max(0, encounter.agitation - seconds * 3);
          if (state.elapsed >= 95 && encounter.visits === 0 && encounter.phase === 'idle') {
            encounter.phase = 'approach'; encounter.remaining = 12; encounter.origin = patrolDepth(encounter.patrol);
            return result('Footsteps stop outside. Someone is coming to check on you.', 'step');
          }
        } else {
          const previous = encounter.remaining;
          encounter.remaining = Math.max(0, previous - seconds);
          if (encounter.remaining <= 0.00001) {
            if (encounter.phase === 'alarm') {
              encounter.phase = 'approach'; encounter.remaining = 12;
              return result('Cletus: "Hey, what the fuck was that?"', 'step');
            }
            if (encounter.phase === 'approach') {
              encounter.phase = 'entering'; encounter.remaining = 4;
              encounter.evidence = state.view !== 'seat' ? 'I saw you away from your seat.' : isFree(state) && !state.bracketConcealed ? 'That chain is off the floor.' : state.drawerOpen ? 'That drawer was shut.' : '';
              return result('The handle turns. Cletus pushes the door open.', 'door');
            }
            if (encounter.phase === 'entering') { encounter.phase = 'dialogue'; return result(); }
            if (encounter.phase === 'leaving') {
              encounter.phase = 'idle'; encounter.cooldown = 35; encounter.agitation = 0;
              encounter.patrol = Math.asin((-0.225 - 1.05) / 1.4) / 0.48;
              return result('The door shuts. Footsteps move away. You can breathe again.', 'door');
            }
          }
          if (encounter.phase === 'approach' && Math.ceil(previous) !== Math.ceil(encounter.remaining)) return result(undefined, encounter.remaining < 2 ? 'metal' : 'step');
        }
      }
      return result();
    case 'note':
      note(action.text);
      return result();
  }
}

export function decodeSave(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const value = candidate as Record<string, unknown>;
    if ((value.version !== 1 && value.version !== 2) || !VIEW_IDS.includes(value.view as ViewId)) return null;
    if (value.spoon !== 'cushion' && value.spoon !== 'inventory') return null;
    if (value.rag !== 'drawer' && value.rag !== 'inventory') return null;
    if (!Number.isInteger(value.bracketWork) || Number(value.bracketWork) < 0 || Number(value.bracketWork) > 3) return null;
    if (typeof value.drawerOpen !== 'boolean' || typeof value.cushionRaised !== 'boolean' || typeof value.bracketConcealed !== 'boolean') return null;
    if (typeof value.seed !== 'number' || !Number.isInteger(value.seed)) return null;
    if (typeof value.elapsed !== 'number' || !Number.isFinite(value.elapsed) || value.elapsed < 0) return null;
    if (typeof value.noise !== 'number' || !Number.isFinite(value.noise) || value.noise < 0 || value.noise > 100) return null;
    if (!Array.isArray(value.journal) || !value.journal.every(entry => typeof entry === 'string')) return null;
    let encounter = encounterDefaults();
    if (value.version === 2) {
      const savedEncounter = value.encounter as Encounter | undefined;
      if (!savedEncounter || !PHASES.includes(savedEncounter.phase)) return null;
      for (const field of ['remaining', 'agitation', 'cooldown', 'lastMove', 'patrol', 'origin', 'suspicion', 'visits'] as const) {
        if (typeof savedEncounter[field] !== 'number' || !Number.isFinite(savedEncounter[field])) return null;
      }
      if (savedEncounter.remaining < 0 || savedEncounter.remaining > 12 || savedEncounter.agitation < 0 || savedEncounter.agitation > 100 || savedEncounter.suspicion < 0 || savedEncounter.suspicion > 100 || savedEncounter.cooldown < 0 || savedEncounter.visits < 0 || !Number.isInteger(savedEncounter.visits)) return null;
      if (typeof savedEncounter.evidence !== 'string' || typeof savedEncounter.outcome !== 'string') return null;
      encounter = { ...savedEncounter };
    }
    const state: GameState = {
      version: 2, encounter, seed: value.seed, elapsed: value.elapsed, view: value.view as ViewId,
      spoon: value.spoon, rag: value.rag, bracketWork: Number(value.bracketWork),
      bracketConcealed: value.bracketConcealed, drawerOpen: value.drawerOpen,
      cushionRaised: value.cushionRaised, noise: value.noise, journal: [...value.journal] as string[],
    };
    if (!canVisit(state, state.view) || (state.bracketConcealed && !isFree(state))) return null;
    if (state.view !== 'seat') state.bracketConcealed = false;
    return state;
  } catch { return null; }
}