import test from 'node:test';
import assert from 'node:assert/strict';
import { RAMBLES, DARLENE_RAMBLES, APPROACH_SECONDS, DALE_AT, DANCE_LINES, DANCE_SECONDS, DILDO_LINE, INTRO_LINE, INTRO_OUTCOME, KEY_DROP_AT, KEY_MISSED, KEY_SNATCHED, PUKE_OPENING, TVSHOW_SECONDS, conversationLine, encounterDefaults, rampageLine } from '../.test-dist/encounters.js';
import { CLIPS, STATIONS, TV_DIAL, cue, lineup, lineupSeconds, onAir, tuned } from '../.test-dist/channels.js';
import { freshState, transition, canVisit, isFree, inventory, decodeSave, upcomingVisitor, stage, storyBeat, FIRE_NOTICE, NOISE_LIMIT, READ_ALOUD_SECONDS, STEADY_SECONDS, THROWS, TRIP_SECONDS } from '../.test-dist/state.js';

const act = (state, action) => transition(state, action).state;
function advance(state, seconds) {
  for (let second = 0; second < seconds; second++) state = act(state, { type: 'tick', seconds: 1 });
  return state;
}
// Fixtures keep the story beats and routine visits away unless a test brings them on itself.
const QUIET = { storyAt: 1e9, nextVisit: 1e9 };
function withSpoon() {
  return { ...act(act(freshState(), { type: 'cushion' }), { type: 'take', item: 'spoon' }), ...QUIET };
}
// Past Cletus's first visit: the spoon bent on the fitting and his screwdriver is in your pocket.
function metCletus(state) {
  return { ...state, introDone: true, spoonBent: true, screwdriver: 'inventory', ...QUIET };
}
function looseState() {
  let state = metCletus(act(withSpoon(), { type: 'work', item: 'spoon' }));
  for (let effort = 0; effort < 2; effort++) state = act(state, { type: 'work', item: 'screwdriver' });
  return { ...state, ...QUIET };
}
// Footlocker picked, axe in hand, and the cuff key snatched off the floor during the dance.
function cuffKeyState() {
  let state = looseState();
  state = act(state, { type: 'view', view: 'dinette' });
  state = act(state, { type: 'take-ashtray' });
  state = act({ ...state, lighter: 'inventory' }, { type: 'smoke' });
  state = act(state, { type: 'view', view: 'rear' });
  state = act(state, { type: 'unlock-cabinet', item: 'bobbyPins' });
  state = act(state, { type: 'take', item: 'axe' });
  return { ...state, finalKey: 'inventory', tvShown: true, danced: true, ...QUIET };
}

test('Tell me more loops indefinitely, kisses once and preserves frozen inspection evidence', () => {
  let state = looseState();
  Object.assign(state.encounter, {phase:'dialogue',visitor:'cletus',chainCaught:true,evidence:'That fitting has been loosened.'});
  const elapsed = state.elapsed;
  for (let count=1;count<=4;count++) {
    state=act(state,{type:'respond',response:'more'});
    assert.equal(state.encounter.phase,'dialogue');
    assert.equal(conversationLine(state.encounter),RAMBLES[count-1]);
    assert.deepEqual(advance(state,20),state);
  }
  state=act(state,{type:'respond',response:'more'});
  assert.equal(state.encounter.phase,'kiss');
  assert.equal(state.encounter.remaining,6);
  state=advance(state,3);
  assert.deepEqual(decodeSave(JSON.stringify(state)),state);
  assert.equal(act(state,{type:'view',view:'rear'}).view,state.view);
  state=advance(state,3);
  assert.equal(state.encounter.phase,'dialogue');
  for(let count=0;count<60;count++) {
    state=act(state,{type:'respond',response:'more'});
    assert.equal(state.encounter.phase,'dialogue');
  }
  assert.equal(state.elapsed,elapsed);
  assert.equal(state.encounter.chainCaught,true);
  state=act(state,{type:'respond',response:'enough'});
  assert.equal(state.spoon,'confiscated');
});

test('kiss skip and old conversation saves are safe', () => {
  const state=looseState();
  Object.assign(state.encounter,{phase:'kiss',remaining:4,kissed:true,talkCount:5});
  const skipped=act(state,{type:'skip-kiss'});
  assert.equal(skipped.encounter.phase,'dialogue');
  assert.equal(skipped.encounter.kissed,true);
  assert.equal(act(skipped,{type:'respond',response:'more'}).encounter.phase,'dialogue');
  const old=JSON.parse(JSON.stringify(freshState()));
  delete old.encounter.talkCount; delete old.encounter.kissed;
  assert.equal(decodeSave(JSON.stringify(old)).encounter.talkCount,0);
  old.encounter.talkCount=-1;
  assert.equal(decodeSave(JSON.stringify(old)),null);
});

test('spoon requires an open cushion and stays unique', () => {
  assert.equal(act(freshState(), { type: 'take', item: 'spoon' }).spoon, 'cushion');
  assert.deepEqual(inventory(act(withSpoon(), { type: 'take', item: 'spoon' })), ['spoon']);
});
test('the spoon bends on the first turn; the screwdriver finishes the job and the rear opens up', () => {
  let state = withSpoon();
  assert.equal(canVisit(state, 'rear'), false);
  state = act(state, { type: 'work', item: 'spoon' });
  assert.equal(state.bracketWork, 1);
  assert.equal(state.spoonBent, true);
  const again = transition(state, { type: 'work', item: 'spoon' });
  assert.equal(again.state.bracketWork, 1);
  assert.match(again.message, /bent double/);
  state = metCletus(state);
  for (let count = 2; count <= 3; count++) {
    state = act(state, { type: 'work', item: 'screwdriver' });
    assert.equal(state.bracketWork, count);
    assert.equal(isFree(state), count === 3);
  }
  assert.equal(canVisit(state, 'dinette'), true);
  assert.equal(canVisit(state, 'rear'), true);
  assert.equal(state.noise, 81);
  assert.equal(act(state, { type: 'work', item: 'spoon' }).bracketWork, 3);
});
test('failed combinations do not consume unique items', () => {
  const state = withSpoon();
  const failed = act(state, { type: 'work', item: 'rag' });
  assert.equal(failed.bracketWork, 0);
  assert.equal(failed.spoon, 'inventory');
  assert.equal(act(freshState(), { type: 'work', item: 'spoon' }).bracketWork, 0);
});
test('drawer and returns preserve object placements', () => {
  let state = act(freshState(), { type: 'view', view: 'kitchen' });
  assert.equal(act(state, { type: 'take', item: 'rag' }).rag, 'drawer');
  state = act(state, { type: 'drawer' });
  state = act(state, { type: 'take', item: 'rag' });
  assert.equal(state.rag, 'inventory');
  state = act(state, { type: 'return', item: 'rag' });
  assert.equal(state.rag, 'drawer');
  assert.equal(act(withSpoon(), { type: 'return', item: 'spoon' }).spoon, 'cushion');
});
test('concealment requires release and returning to the seat', () => {
  let state = withSpoon();
  assert.equal(act(state, { type: 'conceal' }).bracketConcealed, false);
  state = looseState();
  state = act(state, { type: 'view', view: 'rear' });
  assert.equal(act(state, { type: 'conceal' }).bracketConcealed, false);
  state = act(state, { type: 'view', view: 'seat' });
  state = act(state, { type: 'conceal' });
  assert.equal(state.bracketConcealed, true);
  assert.equal(isFree(state), true);
  state = act(state, { type: 'view', view: 'dinette' });
  assert.equal(state.bracketConcealed, false);
  assert.equal(isFree(state), true);
});
test('save round trip retains puzzle, noise, seed, and placements', () => {
  const state = act(withSpoon(), { type: 'work', item: 'spoon' });
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  assert.equal(decodeSave('{bad json'), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, version: 13 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, bracketWork: 9 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, view: 'rear' })), null);
  assert.equal(decodeSave(JSON.stringify({ ...state, noise: 'loud' })), null);
});
test('transitions do not mutate previous state', () => {
  const before = freshState();
  const original = JSON.stringify(before);
  act(before, { type: 'note', text: 'new clue' });
  act(before, { type: 'tick', seconds: 0.5 });
  assert.equal(JSON.stringify(before), original);
});

function runPhase(state, phase, step = 0.1) {
  const sounds = [];
  for (let guard = 0; guard < 400 && state.encounter.phase === phase; guard++) {
    const result = transition(state, { type: 'tick', seconds: step });
    if (result.sound) sounds.push(result.sound);
    state = result.state;
  }
  return { state, sounds };
}

test('alarm gives a short warning with no countdown, saves mid-warning, and the door bangs', () => {
  let state = act(looseState(), { type: 'view', view: 'rear' });
  state = act(act(state, { type: 'rattle' }), { type: 'rattle' });
  assert.equal(state.encounter.phase, 'alarm');
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.remaining, APPROACH_SECONDS);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  // Just enough time to get back on the couch and look chained.
  state = act(act(state, { type: 'view', view: 'seat' }), { type: 'conceal' });
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'approach');
  const bang = transition(state, { type: 'tick', seconds: 1 });
  assert.equal(bang.state.encounter.phase, 'entering');
  assert.equal(bang.sound, 'slam');
  const shut = transition(bang.state, { type: 'tick', seconds: 1 });
  assert.equal(shut.sound, 'slam');
});

test('caught off the couch: grabbed and beaten unconscious, and killed the second time', () => {
  let state = act(looseState(), { type: 'view', view: 'bracket' });
  state = act(state, { type: 'conceal' });
  assert.equal(state.view, 'bracket');
  assert.equal(state.bracketConcealed, false);
  state.rag = 'inventory';
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5, nextVisitor: 'darlene' });
  const grabbed = transition(state, { type: 'tick', seconds: 1 });
  assert.equal(grabbed.state.encounter.phase, 'grab');
  assert.equal(grabbed.state.encounter.visitor, 'darlene');
  assert.equal(grabbed.sound, 'slam');
  state = grabbed.state;
  const frozen = state.elapsed;
  assert.equal(act(state, { type: 'view', view: 'seat' }).view, 'bracket');
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  let run = runPhase(state, 'grab');
  state = run.state;
  assert.equal(run.sounds.filter(sound => sound === 'hit').length, 4);
  assert.equal(state.encounter.phase, 'blackout');
  assert.equal(state.knockouts, 1);
  assert.equal(state.elapsed, frozen + 90);
  assert.deepEqual(inventory(state), []);
  assert.equal(state.view, 'seat');
  assert.equal(state.bracketWork, 0);
  assert.equal(state.screwdriver, 'stash');
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = act(act(state, { type: 'wake' }), { type: 'recover' });
  assert.deepEqual(inventory(state).sort(), ['rag', 'screwdriver', 'spoon']);
  // Second time off the couch: no beating. They kill you.
  state = act(state, { type: 'view', view: 'kitchen' });
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5, nextVisitor: 'cletus' });
  state = act(state, { type: 'tick', seconds: 1 });
  assert.equal(state.encounter.phase, 'kill');
  run = runPhase(state, 'kill');
  state = run.state;
  assert.deepEqual(run.sounds, ['kill']);
  assert.equal(state.encounter.phase, 'dead');
  assert.equal(decodeSave(JSON.stringify(state)), null);
  assert.equal(act(state, { type: 'view', view: 'seat' }).view, 'kitchen');
});

test('sitting on the couch with the loose fitting in plain view still gets you grabbed', () => {
  const state = looseState();
  assert.equal(state.view, 'seat');
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5 });
  assert.equal(act(state, { type: 'tick', seconds: 1 }).encounter.phase, 'grab');
  const hidden = act(looseState(), { type: 'conceal' });
  Object.assign(hidden.encounter, { phase: 'approach', remaining: 0.5 });
  assert.equal(act(hidden, { type: 'tick', seconds: 1 }).encounter.phase, 'entering');
});
test('quiet and same-view clicks do not startle Ronnie; fast real moves do', () => {
  let state = act(looseState(), { type: 'view', view: 'rear' });
  const agitation = state.encounter.agitation;
  for (let click = 0; click < 10; click++) state = act(state, { type: 'view', view: 'rear' });
  assert.equal(state.encounter.agitation, agitation);
  state = advance({ ...state, noise: 0 }, 4);
  assert.equal(state.encounter.agitation, 0);
  for (const view of ['dinette', 'rear', 'dinette', 'rear']) state = act(state, { type: 'view', view });
  assert.equal(state.encounter.phase, 'alarm');
});
test('old saves migrate and nested encounter transitions remain immutable', () => {
  const old = { ...looseState(), version: 1 };
  delete old.encounter;
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.encounter.phase, 'idle');
  assert.equal(migrated.cabinetUnlocked, false);
  assert.equal(migrated.brassKey, 'pizza');
  const original = JSON.stringify(migrated);
  advance(migrated, 2);
  assert.equal(JSON.stringify(migrated), original);
  assert.equal(decodeSave(JSON.stringify({ ...migrated, encounter: { ...migrated.encounter, phase: 'bogus' } })), null);
});

test('successful pretending never produces chain evidence, even with another disturbance', () => {
  let state = act(looseState(), { type: 'conceal' });
  state.drawerOpen = true;
  state.encounter.phase = 'approach'; state.encounter.remaining = 1;
  state = advance(state, 5);
  assert.equal(state.encounter.chainCaught, false);
  assert.equal(state.encounter.evidence, 'That drawer was shut.');
  state = act(state, { type: 'respond', response: 'shifted' });
  assert.equal(state.spoon, 'inventory');
  assert.equal(state.bracketWork, 3);
});
test('saves made mid-inspection under the old rules still resolve: confiscation, then recoverable blackout', () => {
  let state = { ...looseState(), screwdriver: 'hidden' };
  Object.assign(state.encounter, { phase: 'dialogue', visitor: 'cletus', chainCaught: true, evidence: 'That fitting has been loosened.' });
  state = act(state, { type: 'respond', response: 'shifted' });
  assert.equal(state.spoon, 'confiscated');
  assert.equal(state.screwdriver, 'drawer');
  state = advance(state, 5);
  state = act(state, { type: 'take', item: 'screwdriver' });
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'screwdriver' });
  assert.equal(isFree(state), true);
  state.rag = 'inventory';
  Object.assign(state.encounter, { phase: 'dialogue', chainCaught: true, evidence: 'That fitting has been loosened.' });
  const before = state.elapsed;
  state = act(state, { type: 'respond', response: 'defy' });
  assert.equal(state.encounter.phase, 'blackout');
  assert.deepEqual(inventory(state), []);
  assert.equal(state.elapsed, before + 90);
  assert.deepEqual(advance(state, 10), state);
  state = act(act(state, { type: 'wake' }), { type: 'recover' });
  assert.equal(state.screwdriver, 'inventory');
  assert.equal(state.rag, 'inventory');
});

// Escape chain: ashtray bobby pins, padlocked cabinet, heavy key, axe through the front door.
test('bobby pins come from the emergency ashtray, only up close at the dinette', () => {
  let state = looseState();
  const far = transition(state, { type: 'take-ashtray' });
  assert.equal(far.state.bobbyPins, 'ashtray');
  assert.equal(far.message, 'I can’t reach that its too far');
  state = act(state, { type: 'view', view: 'dinette' });
  state = act(state, { type: 'take-ashtray' });
  assert.equal(state.bobbyPins, 'inventory');
  assert.equal(state.butt, 'inventory');
  assert.equal(act(state, { type: 'take-ashtray' }).bobbyPins, 'inventory');
  // The pizza box no longer hides a key.
  assert.equal(act(state, { type: 'rummage', spot: 'pizza' }).brassKey, 'pizza');
});

test('padlocked cabinet needs something to pick it and holds the axe', () => {
  let state = act(looseState(), { type: 'view', view: 'rear' });
  const locked = transition(state, { type: 'unlock-cabinet', item: null });
  assert.match(locked.message, /emergency ashtray/);
  assert.equal(act(state, { type: 'take', item: 'axe' }).axe, 'cabinet');
  // Shaky hands cannot pick it; a smoke steadies them.
  const shaky = transition({ ...state, bobbyPins: 'inventory' }, { type: 'unlock-cabinet', item: 'bobbyPins' });
  assert.equal(shaky.state.cabinetUnlocked, false);
  assert.match(shaky.message, /shake/);
  assert.equal(act({ ...state, bobbyPins: 'inventory', steady: 30 }, { type: 'unlock-cabinet', item: 'bobbyPins' }).cabinetUnlocked, true);
  state = cuffKeyState();
  assert.equal(state.cabinetUnlocked, true);
  assert.equal(state.axe, 'inventory');
  assert.equal(state.finalKey, 'inventory');
});

test('full escape chain: cuff key, then the braced door only gives to tweaker strength', () => {
  let state = cuffKeyState();
  // Axe will not swing while cuffed.
  assert.equal(act(act(state, { type: 'view', view: 'seat' }), { type: 'chop', item: 'axe' }).doorChops, 0);
  assert.equal(act(state, { type: 'unlock-cuff', item: 'bobbyPins' }).cuffOpen, false);
  state = act(state, { type: 'view', view: 'bracket' });
  state = act(state, { type: 'unlock-cuff', item: 'finalKey' });
  assert.equal(state.cuffOpen, true);
  // Not from the back of the trailer, and not bare-handed.
  assert.equal(act(act(state, { type: 'view', view: 'rear' }), { type: 'chop', item: 'axe' }).doorChops, 0);
  state = act(state, { type: 'view', view: 'seat' });
  assert.equal(act(state, { type: 'chop', item: null }).doorChops, 0);
  // Sober, the steel bracing just rings.
  const clang = transition(state, { type: 'chop', item: 'axe' });
  assert.equal(clang.state.doorChops, 0);
  assert.match(clang.message, /not strong enough/);
  // High: two chops' worth a swing, three swings.
  state = { ...state, trip: 100, noise: 0 };
  state = act(state, { type: 'chop', item: 'axe' });
  state = act(state, { type: 'chop', item: 'axe' });
  assert.equal(state.doorChops, 4);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = act(state, { type: 'chop', item: 'axe' });
  assert.equal(state.escaped, true);
  assert.equal(decodeSave(JSON.stringify(state)), null);
});

test('the glued rear hatch never opens but still makes noise', () => {
  let state = act(cuffKeyState(), { type: 'view', view: 'bracket' });
  state = { ...act(act(state, { type: 'unlock-cuff', item: 'finalKey' }), { type: 'view', view: 'rear' }), noise: 0 };
  const rattled = transition(state, { type: 'rattle' });
  assert.equal(rattled.message, 'There’s no use it’s shut forever nothing to be done');
  assert.equal(rattled.state.escaped, false);
  assert.ok(rattled.state.noise > state.noise);
});

test('red herrings are collectible and returnable but useless; the pee ticket is not', () => {
  let state = looseState();
  state = act(state, { type: 'view', view: 'kitchen' });
  state = act(state, { type: 'cabinet', cabinet: 'k1' });
  state = act(state, { type: 'take', item: 'magnet' });
  assert.equal(state.magnet, 'inventory');
  assert.equal(act(state, { type: 'work', item: 'magnet' }).bracketWork, 3);
  state = act(state, { type: 'rummage', spot: 'floorPapers' });
  assert.equal(state.lotto, 'floor');
  assert.equal(transition(state, { type: 'take', item: 'lotto' }).message, 'I’m not going to touch that it smells like pee');
  assert.deepEqual(inventory(state).sort(), ['magnet', 'screwdriver', 'spoon'].sort());
  state = act(state, { type: 'return', item: 'magnet' });
  assert.equal(state.magnet, 'cab-k1');
});

test('Zwinkys: pocket it, drink it for a vomit, and it is never used up', () => {
  let state = freshState();
  const sip = transition(state, { type: 'drink' });
  assert.equal(sip.message, 'Aahh refreshing');
  assert.equal(sip.vomit, true);
  assert.equal(sip.sound, 'vomit');
  const pocket = transition(state, { type: 'take', item: 'zwinkys' });
  assert.equal(pocket.message, 'You put the Zwinkys in your pocket');
  state = act(pocket.state, { type: 'drink' });
  assert.equal(state.zwinkys, 'inventory');
  assert.equal(act(state, { type: 'return', item: 'zwinkys' }).zwinkys, 'counter');
});

test('the dildo: pocketed, handed to Ronnie, and Cletus storms in about it', () => {
  let state = freshState();
  const taken = transition(state, { type: 'take', item: 'dildo' });
  assert.equal(taken.message, 'I place the dildo up my butt for safe keeping surely no one will notice');
  state = { ...looseState(), dildo: 'inventory' };
  state = act(state, { type: 'view', view: 'rear' });
  // Needles are refused outright; nothing is consumed.
  state.usedNeedles = 'inventory';
  const refused = act(state, { type: 'give-ronnie', item: 'usedNeedles' });
  assert.equal(refused.usedNeedles, 'inventory');
  assert.equal(refused.encounter.phase, 'idle');
  state = act(state, { type: 'give-ronnie', item: 'dildo' });
  assert.equal(state.dildo, 'ronnie');
  assert.equal(state.encounter.phase, 'alarm');
  assert.equal(state.encounter.nextPurpose, 'dildo');
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  // Get back to the couch and hide the fitting before he arrives.
  state = advance(state, 3);
  state = act(act(state, { type: 'view', view: 'seat' }), { type: 'conceal' });
  state = advance(state, 15);
  assert.equal(state.encounter.phase, 'dialogue');
  assert.equal(state.encounter.purpose, 'dildo');
  assert.equal(state.dildo, 'counter');
  assert.equal(conversationLine(state.encounter), DILDO_LINE);
  assert.equal(state.encounter.chainCaught, false);
  state = act(state, { type: 'respond', response: 'shifted' });
  assert.equal(state.encounter.suspicion, 10);
  assert.ok(state.ronnieCalm > 0);
  state = advance(state, 6);
  // A calm Ronnie ignores even rapid trips to the back for a while.
  for (const view of ['dinette', 'rear', 'dinette', 'rear']) state = act(state, { type: 'view', view });
  assert.equal(state.encounter.phase, 'idle');
});

// Stage 3: footlocker open, TV night seen, the cuff key still on Cletus. The dance is the next beat.
function danceDue(view = 'seat') {
  let state = { ...looseState(), cabinetUnlocked: true, tvShown: true, axe: 'inventory' };
  if (view === 'seat') state = act(state, { type: 'conceal' }); else state = act(state, { type: 'view', view });
  return { ...state, storyAt: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
}

test('the dance: mid-spin the cuff key falls, you grab it, and game time stays frozen', () => {
  // Off the couch when he arrives: a beating instead, and the dance is still owed.
  let state = act(danceDue('kitchen'), { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.nextPurpose, 'dance');
  const beaten = runPhase(advance(state, 3), 'grab').state;
  assert.equal(beaten.encounter.phase, 'blackout');
  assert.equal(beaten.finalKey, 'cletus');
  state = act(danceDue(), { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.phase, 'approach');
  state = advance(state, APPROACH_SECONDS + 2);
  assert.equal(state.encounter.phase, 'dance');
  const frozen = state.elapsed;
  // Nothing to grab yet.
  assert.equal(act(state, { type: 'snatch' }).finalKey, 'cletus');
  const drop = runPhase(state, 'dance');
  assert.ok(drop.sounds.includes('metal'), 'the key hits the floor');
  // Mid-dance, from a fresh run: grab it while he spins.
  state = advance(state, KEY_DROP_AT + 1);
  assert.equal(state.encounter.phase, 'dance');
  assert.equal(state.finalKey, 'floor');
  assert.equal(state.encounter.keyLoose, true);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = act(state, { type: 'snatch' });
  assert.equal(state.finalKey, 'inventory');
  state = runPhase(state, 'dance').state;
  assert.equal(state.encounter.phase, 'leaving');
  assert.equal(state.encounter.outcome, KEY_SNATCHED);
  assert.equal(state.elapsed, frozen);
  assert.equal(conversationLine({ ...state.encounter, phase: 'dance', remaining: DANCE_SECONDS - 6 }), DANCE_LINES[1]);
  // With the key in hand the story moves on: no more dancing.
  state = runPhase(state, 'leaving').state;
  assert.equal(storyBeat(state), null);
});

test('miss the key and Cletus takes it back, then dances again later', () => {
  let state = advance(act(danceDue(), { type: 'tick', seconds: 0.5 }), APPROACH_SECONDS + 2);
  const missed = runPhase(state, 'dance').state;
  assert.equal(missed.finalKey, 'cletus');
  assert.equal(missed.encounter.outcome, KEY_MISSED);
  state = runPhase(missed, 'leaving').state;
  assert.deepEqual(storyBeat(state), { visitor: 'cletus', purpose: 'dance' });
  assert.ok(state.storyAt > state.elapsed, 'a breather first');
  state = advance(state, Math.ceil(state.storyAt - state.elapsed) + 1);
  assert.equal(state.encounter.nextPurpose, 'dance');
});
test('v4 saves migrate with new items in place and new items survive blackout', () => {
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 4;
  for (const field of ['dildo', 'zwinkys', 'butt', 'bobbyPins', 'usedNeedles', 'axe', 'danced', 'doorChops', 'ronnieCalm']) delete old[field];
  old.brassKey = 'inventory';
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.brassKey, 'inventory');
  assert.equal(migrated.axe, 'cabinet');
  assert.equal(migrated.lighter, 'darlene');
  assert.equal(migrated.danced, false);
  // Version 5 saves predate the lighter; they get it in Darlene's hand.
  const v5 = JSON.parse(JSON.stringify(looseState()));
  v5.version = 5;
  delete v5.lighter;
  assert.equal(decodeSave(JSON.stringify(v5)).lighter, 'darlene');
  // Legacy brass key holders can still open the cabinet.
  assert.equal(act(act(migrated, { type: 'view', view: 'rear' }), { type: 'unlock-cabinet', item: 'brassKey' }).cabinetUnlocked, true);
  let state = cuffKeyState();
  state = act(state, { type: 'view', view: 'dinette' });
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5 });
  state = runPhase(act(state, { type: 'tick', seconds: 1 }), 'grab').state;
  assert.equal(state.encounter.phase, 'blackout');
  assert.equal(state.axe, 'stash');
  assert.equal(state.bobbyPins, 'stash');
  state = act(act(state, { type: 'wake' }), { type: 'recover' });
  assert.equal(state.axe, 'inventory');
  assert.equal(state.finalKey, 'inventory');
});

test('rummaging every spot is safe and idempotent', () => {
  let state = looseState();
  for (const view of ['seat', 'kitchen', 'dinette', 'rear']) state = act(state, { type: 'view', view });
  for (const spot of ['pizza', 'trash', 'floorPapers', 'cans']) {
    const before = state.elapsed;
    state = act(state, { type: 'rummage', spot });
    assert.equal(state.rummaged[spot], true);
    const again = act(state, { type: 'rummage', spot });
    assert.equal(again.rummaged[spot], true);
    assert.equal(state.elapsed, before);
  }
});

test('random visits alternate Cletus and Darlene by seed, and a seated player is never grabbed', () => {
  let state = act(looseState(), { type: 'conceal' });
  const visitors = new Set();
  for (let visit = 0; visit < 6; visit++) {
    state = { ...state, elapsed: state.nextVisit, encounter: { ...state.encounter, phase: 'idle', cooldown: 0 } };
    state = act(state, { type: 'tick', seconds: 1 });
    assert.equal(state.encounter.phase, 'approach');
    visitors.add(state.encounter.nextVisitor);
    for (let guard = 0; guard < 80 && state.encounter.phase !== 'idle'; guard++) {
      assert.ok(!['grab', 'kill', 'blackout', 'dead'].includes(state.encounter.phase));
      state = state.encounter.phase === 'dialogue' ? act(state, { type: 'respond', response: 'shifted' }) : act(state, { type: 'tick', seconds: 1 });
    }
    assert.equal(state.encounter.phase, 'idle');
  }
  assert.ok(visitors.has('cletus'));
  assert.ok(visitors.has('darlene'));
});

test('Darlene rampages for her lighter with no dialogue: cabinets, drawer, trash, then flings the lighter down', () => {
  let state = act(looseState(), { type: 'conceal' });
  state = { ...state, elapsed: state.nextVisit, seed: 9, encounter: { ...state.encounter, phase: 'idle', cooldown: 0, visits: 0 } };
  state = act(state, { type: 'tick', seconds: 1 });
  assert.equal(state.encounter.nextVisitor, 'darlene');
  state = advance(state, APPROACH_SECONDS);
  assert.equal(state.encounter.phase, 'entering');
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'search');
  assert.equal(rampageLine(state.encounter), 'WHERE IS MY FUCKING LIGHTER?');
  assert.equal(act(state, { type: 'view', view: 'kitchen' }).view, 'seat');
  const run = runPhase(state, 'search');
  state = run.state;
  // She rips the trash open looking for it. Ronnie is left out of it entirely.
  assert.ok(run.sounds.includes('rip'));
  assert.ok(!run.sounds.includes('kiss'));
  assert.ok(Object.values(state.cabinets).every(Boolean));
  assert.equal(state.drawerOpen, true);
  // First visit: she finds the lighter in her own hand and throws it on the floor.
  assert.equal(state.encounter.haul, 'drop-lighter');
  assert.equal(state.lighter, 'floor');
  assert.equal(state.encounter.phase, 'leaving');
  state = runPhase(state, 'leaving').state;
  assert.equal(state.encounter.phase, 'idle');
  assert.equal(state.encounter.visits, 1);
  assert.equal(act(state, { type: 'take', item: 'lighter' }).lighter, 'inventory');
  // Next time she steals the Zwinkys off the counter. Never anything from your pockets.
  state = act(state, { type: 'take', item: 'spoon' });
  state = { ...state, tvShown: true, daleAt: 1e9, elapsed: state.nextVisit, nextVisitor: 'darlene', encounter: { ...state.encounter, cooldown: 0 } };
  state = runPhase(act(state, { type: 'tick', seconds: 1 }), 'approach', 1).state;
  state = runPhase(runPhase(state, 'entering').state, 'search').state;
  assert.equal(state.encounter.haul, 'take-zwinkys');
  assert.equal(state.zwinkys, 'darlene');
  assert.equal(transition(state, { type: 'drink' }).message, 'Darlene took the Zwinkys. You mourn it.');
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
});

test('Darlene dialogue uses her own rambles and never kisses', () => {
  let state = looseState();
  Object.assign(state.encounter, {phase:'dialogue',visitor:'darlene',purpose:'talk'});
  state = act(state, {type:'respond',response:'more'});
  state = act(state, {type:'respond',response:'more'});
  assert.equal(conversationLine(state.encounter), DARLENE_RAMBLES[1]);
  for (let count = 0; count < 8; count++) state = act(state, {type:'respond',response:'more'});
  assert.equal(state.encounter.phase, 'dialogue'); // no kiss phase for Darlene
  state = act(state, {type:'respond',response:'enough'});
  assert.equal(state.encounter.phase, 'leaving');
});

// ---- Playability pass: noise, rag, puke, throwing, smoking, stabbing, peeking ----
function withRag(state) {
  state = act(state, { type: 'drawer' });
  return act(state, { type: 'take', item: 'rag' });
}

test('too much noise brings someone running, but not during a cooldown', () => {
  let state = metCletus(withSpoon());
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'screwdriver' });
  assert.equal(state.noise, 81);
  const heard = transition(state, { type: 'tick', seconds: 0.5 });
  assert.equal(heard.state.encounter.phase, 'approach');
  assert.match(heard.message, /what the fuck was that/);
  const cooling = { ...state, encounter: { ...state.encounter, cooldown: 10 } };
  assert.equal(act(cooling, { type: 'tick', seconds: 0.5 }).encounter.phase, 'idle');
});

test('the rag muffles a tool: quiet fitting work, quiet axe, and it comes back off', () => {
  let state = withRag(metCletus(withSpoon()));
  state = act(state, { type: 'wrap', item: 'screwdriver' });
  assert.equal(state.rag, 'wrapped');
  assert.equal(state.wrapped, 'screwdriver');
  assert.deepEqual(inventory(state), ['spoon', 'screwdriver']);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'screwdriver' });
  assert.equal(state.noise, 27);
  assert.equal(act(state, { type: 'tick', seconds: 0.5 }).encounter.phase, 'idle');
  state = act(state, { type: 'unwrap' });
  assert.equal(state.rag, 'inventory');
  assert.equal(state.wrapped, null);
  // A wrapped axe chops quietly enough not to summon anyone.
  let chop = cuffKeyState();
  chop.rag = 'inventory';
  chop = act(chop, { type: 'wrap', item: 'axe' });
  chop = act(act(chop, { type: 'view', view: 'bracket' }), { type: 'unlock-cuff', item: 'finalKey' });
  chop = act(act(chop, { type: 'view', view: 'seat' }), { type: 'tick', seconds: 30 });
  chop = { ...chop, noise: 0 };
  chop = act(chop, { type: 'chop', item: 'axe' });
  chop = act(chop, { type: 'chop', item: 'axe' });
  assert.equal(chop.noise, 44);
  // Getting knocked out puts the rag back in your stash with everything else.
  const beaten = withRag(withSpoon());
  const wrapped = act(beaten, { type: 'wrap', item: 'spoon' });
  Object.assign(wrapped.encounter, { phase: 'approach', remaining: 0.5 });
  wrapped.view = 'kitchen';
  const knocked = runPhase(act(wrapped, { type: 'tick', seconds: 1 }), 'grab').state;
  assert.equal(knocked.rag, 'stash');
  assert.equal(knocked.wrapped, null);
});

test('puke on the floor: they make you clean it with your face, unless you wipe it first', () => {
  let state = act(looseState(), { type: 'conceal' });
  state = act(state, { type: 'drink' });
  assert.equal(state.puddle, true);
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5, nextVisitor: 'cletus' });
  state = runPhase(act(state, { type: 'tick', seconds: 1 }), 'entering').state;
  assert.equal(state.encounter.phase, 'dialogue');
  assert.equal(conversationLine(state.encounter), PUKE_OPENING);
  const cleaned = transition(state, { type: 'respond', response: 'shifted' });
  assert.equal(cleaned.slop, true);
  assert.equal(cleaned.state.puddle, false);
  assert.equal(cleaned.state.encounter.suspicion, 10);
  assert.match(cleaned.message, /With your FACE/);
  // Mop it first and nobody knows.
  let mopped = act(withRag(freshState()), { type: 'drink' });
  mopped = act(mopped, { type: 'wipe' });
  assert.equal(mopped.puddle, false);
  assert.equal(mopped.ragSoiled, true);
});

test('throwing things out the window buys time; the paperback buys the most and hushes the yard', () => {
  let state = looseState();
  state = act(state, { type: 'cabinet', cabinet: 'u2' });
  state = act(act(state, { type: 'view', view: 'kitchen' }), { type: 'take', item: 'beenie' });
  assert.equal(act(state, { type: 'throw', item: 'beenie' }).beenie, 'inventory');
  state = act(state, { type: 'view', view: 'dinette' });
  const before = state.nextVisit;
  state = act(state, { type: 'throw', item: 'beenie' });
  assert.equal(state.beenie, 'outside');
  assert.equal(state.nextVisit, before + THROWS.beenie.delay);
  assert.equal(act(state, { type: 'throw', item: 'spoon' }).spoon, 'inventory');
  let book = act(cuffKeyState(), { type: 'take', item: 'choke' });
  book = act(book, { type: 'view', view: 'dinette' });
  book = act(book, { type: 'throw', item: 'choke' });
  assert.equal(book.outsideReading, READ_ALOUD_SECONDS);
  // While Cletus reads aloud, nobody hears you.
  assert.equal(act({ ...book, noise: 95 }, { type: 'tick', seconds: 0.5 }).encounter.phase, 'idle');
  assert.deepEqual(decodeSave(JSON.stringify(book)), book);
});

test('smoke the butt for steady, silent hands; chew it without a light and you puke', () => {
  let state = act(looseState(), { type: 'view', view: 'dinette' });
  state = act(state, { type: 'take-ashtray' });
  assert.equal(act(state, { type: 'smoke' }).butt, 'inventory');
  const chewed = act(state, { type: 'chew' });
  assert.equal(chewed.butt, 'gone');
  assert.equal(chewed.puddle, true);
  state.lighter = 'inventory';
  state = act(state, { type: 'smoke' });
  assert.equal(state.butt, 'gone');
  assert.equal(state.steady, STEADY_SECONDS);
  let fresh = act(act(withSpoon(), { type: 'note', text: 'x' }), { type: 'note', text: 'y' });
  fresh.steady = 20;
  fresh = act(fresh, { type: 'work', item: 'spoon' });
  assert.equal(fresh.noise, 0);
});

test('a used needle stabs your way out of one grab, only in the first instant', () => {
  let state = act(looseState(), { type: 'view', view: 'kitchen' });
  state.usedNeedles = 'inventory';
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5, nextVisitor: 'cletus' });
  state = act(state, { type: 'tick', seconds: 1 });
  assert.equal(state.encounter.phase, 'grab');
  const late = act(act(state, { type: 'tick', seconds: 0.5 }), { type: 'tick', seconds: 0.5 });
  assert.equal(act(late, { type: 'stab' }).encounter.phase, 'grab');
  const stabbed = transition(state, { type: 'stab' });
  assert.equal(stabbed.state.encounter.phase, 'leaving');
  assert.equal(stabbed.state.usedNeedles, 'gone');
  assert.equal(stabbed.state.knockouts, 0);
  assert.match(stabbed.message, /STUCK me/);
  assert.equal(act(stabbed.state, { type: 'stab' }).usedNeedles, 'gone');
});

test('peeking knows who is coming next, and v6 saves migrate into the playability pass', () => {
  // Before his first visit, it is always Cletus coming.
  assert.equal(upcomingVisitor({ ...freshState(), seed: 9 }), 'cletus');
  const state = { ...freshState(), introDone: true, storyAt: 1e9, nextVisit: 100 };
  assert.equal(upcomingVisitor(state), 'cletus');
  assert.equal(upcomingVisitor({ ...state, seed: 9 }), 'darlene');
  // A story beat due sooner than the routine visit wins: footlocker open means Cletus and the TV.
  assert.equal(upcomingVisitor({ ...state, seed: 9, bracketWork: 3, cabinetUnlocked: true, storyAt: 50 }), 'cletus');
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 6;
  for (const field of ['wrapped', 'ragSoiled', 'puddle', 'steady', 'outsideReading']) delete old[field];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.wrapped, null);
  assert.equal(migrated.puddle, false);
  assert.equal(decodeSave(JSON.stringify({ ...migrated, rag: 'wrapped' })), null);
});

// ---- The TV ----
test('the TV starts off; Cletus comes in once to put you on the news and laughs at you', () => {
  let state = act({ ...looseState(), cabinetUnlocked: true }, { type: 'conceal' });
  assert.equal(state.tvOn, false);
  assert.deepEqual(storyBeat(state), { visitor: 'cletus', purpose: 'tv' });
  state = { ...state, noise: 0, storyAt: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
  state = act(state, { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.nextPurpose, 'tv');
  state = runPhase(runPhase(state, 'approach').state, 'entering').state;
  assert.equal(state.encounter.phase, 'tvshow');
  assert.equal(state.tvShown, true);
  const frozen = state.elapsed;
  // He smacks it on a couple of seconds in; you cannot do anything but watch.
  assert.equal(act(state, { type: 'view', view: 'rear' }).view, 'seat');
  const run = runPhase(state, 'tvshow');
  assert.ok(run.sounds.includes('tvon'));
  state = run.state;
  assert.equal(state.encounter.phase, 'leaving');
  assert.equal(state.elapsed, frozen);
  // He leaves it on Channel 4, turned up. The news aired from the top when he smacked it on; then the break.
  assert.equal(state.tvOn, true);
  assert.equal(state.tvMuted, false);
  assert.equal(state.tvChannel, 0);
  const aired = onAir(STATIONS.news, state.tvClock);
  assert.ok(Math.abs(state.tvClock - (cue(STATIONS.news, 'news-local-man') + TVSHOW_SECONDS - 2.2)) < 0.2);
  assert.notEqual(aired.id, 'news-local-man', 'by the time he leaves, the news has gone to a break');
  // Mid-show saves come back.
  let mid = act(looseState(), { type: 'conceal' });
  mid = { ...mid, tvShown: true, tvOn: true, encounter: { ...mid.encounter, phase: 'tvshow', purpose: 'tv', visitor: 'cletus', remaining: 10 } };
  assert.deepEqual(decodeSave(JSON.stringify(mid)), mid);
  // Including the very first seconds of the show, when the timer is longest.
  const start = { ...mid, encounter: { ...mid.encounter, remaining: TVSHOW_SECONDS } };
  assert.deepEqual(decodeSave(JSON.stringify(start)), start);
  // Never twice.
  state = runPhase(state, 'leaving').state;
  state = { ...state, nextVisit: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
  assert.notEqual(act(state, { type: 'tick', seconds: 0.5 }).encounter.nextPurpose, 'tv');
});

test('caught off the couch when the TV show is due: a beating first, the show later', () => {
  let state = act({ ...looseState(), cabinetUnlocked: true }, { type: 'view', view: 'kitchen' });
  state = { ...state, noise: 0, storyAt: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
  state = runPhase(act(state, { type: 'tick', seconds: 0.5 }), 'approach').state;
  assert.equal(state.encounter.phase, 'grab');
  assert.equal(state.tvShown, false);
});

test('the remote drives the set: power, channels and mute, and nothing without it', () => {
  let state = freshState();
  assert.equal(act(state, { type: 'tv', command: 'power' }).tvOn, false);
  state.remote = 'inventory';
  state = act(state, { type: 'tv', command: 'power' });
  assert.equal(state.tvOn, true);
  state = act(state, { type: 'tv', command: 'mute' });
  assert.equal(state.tvMuted, true);
  // The dial: Channel 4 news, Channel 11 KRUD, then a dead channel of snow, then round again.
  state = act(state, { type: 'tv', command: 'next' });
  assert.equal(state.tvChannel, 1);
  const dead = transition(state, { type: 'tv', command: 'next' });
  assert.equal(dead.state.tvChannel, 2);
  assert.match(dead.message, /Channel 13: nothing but snow/);
  assert.equal(act(dead.state, { type: 'tv', command: 'next' }).tvChannel, 0);
  state = act(state, { type: 'tv', command: 'prev' });
  assert.equal(state.tvChannel, 0);
  state = act(state, { type: 'tv', command: 'power' });
  assert.equal(state.tvOn, false);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  // Getting knocked out takes the remote with everything else.
  state.view = 'kitchen';
  Object.assign(state.encounter, { phase: 'approach', remaining: 0.5 });
  assert.equal(runPhase(act(state, { type: 'tick', seconds: 1 }), 'grab').state.remote, 'stash');
});

test('v7 saves migrate with the TV off and no remote', () => {
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 7;
  for (const field of ['tvOn', 'tvChannel', 'tvMuted', 'tvShown', 'remote']) delete old[field];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.tvOn, false);
  assert.equal(migrated.tvShown, false);
  assert.equal(migrated.remote, 'hidden');
});

// A fixture with Darlene's lighter in your pocket, sitting on the couch next to the floor papers.
function lighterState() {
  const state = withSpoon();
  state.lighter = 'inventory';
  return state;
}

test('the lighter sets things on fire, the fire grows, and smoke brings Cletus running with a bucket', () => {
  let state = lighterState();
  // Chained, you can only reach the papers by your feet.
  assert.match(transition(state, { type: 'ignite', spot: 'trash' }).message, /chain stops you/);
  assert.match(transition(state, { type: 'ignite', spot: 'pizza' }).message, /dinette/);
  assert.match(transition({ ...state, lighter: 'floor' }, { type: 'ignite', spot: 'floorPapers' }).message, /nothing to light it with/);
  const lit = transition(state, { type: 'ignite', spot: 'floorPapers' });
  assert.equal(lit.sound, 'ignite');
  state = lit.state;
  assert.ok(state.fire > 0);
  assert.equal(state.fireSpot, 'floorPapers');
  assert.match(transition(state, { type: 'ignite', spot: 'floorPapers' }).message, /already on fire/);
  // It grows. Not even a fresh cooldown or a paperback read-aloud keeps them outside.
  state = { ...state, outsideReading: 30, encounter: { ...state.encounter, cooldown: 30 } };
  state = advance(state, 2);
  assert.ok(state.fire >= 2 && state.encounter.phase === 'idle');
  let smelt;
  for (let guard = 0; guard < 20 && state.encounter.phase === 'idle'; guard++) {
    const result = transition(state, { type: 'tick', seconds: 0.5 });
    if (result.state.encounter.phase !== 'idle') smelt = result;
    state = result.state;
  }
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.nextVisitor, 'cletus');
  assert.equal(state.encounter.nextPurpose, 'fire');
  assert.match(smelt.message, /SMOKE/);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  // Sitting still on the couch does not save you from this one.
  state = runPhase(state, 'approach').state;
  assert.equal(state.encounter.phase, 'entering');
  assert.equal(state.encounter.purpose, 'fire');
  state = runPhase(state, 'entering').state;
  assert.equal(state.encounter.phase, 'douse');
  assert.equal(act(state, { type: 'view', view: 'kitchen' }).view, 'seat');
  const elapsed = state.elapsed;
  const douse = runPhase(state, 'douse');
  state = douse.state;
  assert.ok(douse.sounds.includes('splash'));
  assert.equal(state.elapsed, elapsed, 'game time is frozen while he puts it out');
  assert.equal(state.fire, 0);
  assert.equal(state.burnt.floorPapers, true);
  // Then he beats you unconscious and takes the lighter back to Darlene.
  assert.equal(state.encounter.phase, 'grab');
  const beating = runPhase(state, 'grab');
  state = beating.state;
  assert.ok(beating.sounds.includes('hit'));
  assert.equal(state.encounter.phase, 'blackout');
  assert.match(state.encounter.outcome, /bucket/);
  assert.equal(state.lighter, 'darlene');
  assert.equal(state.spoon, 'stash');
  assert.equal(state.knockouts, 1);
  // Burnt things stay burnt, and the scorch cannot be relit.
  state = act(state, { type: 'wake' });
  state.lighter = 'inventory';
  assert.match(transition(state, { type: 'ignite', spot: 'floorPapers' }).message, /ash/);
  assert.match(transition(state, { type: 'rummage', spot: 'floorPapers' }).message, /ash/);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
});

test('a fire always beats you unconscious, never kills, and overrides whoever was already coming', () => {
  // Already knocked out once: an ordinary catch would kill, the fire only knocks you out.
  let state = lighterState();
  state.knockouts = 1;
  state = act(state, { type: 'ignite', spot: 'floorPapers' });
  // Darlene was already on her way in.
  Object.assign(state.encounter, { phase: 'approach', remaining: APPROACH_SECONDS, nextVisitor: 'darlene', nextPurpose: undefined });
  state = { ...state, fire: 3.4 };
  state = act(state, { type: 'tick', seconds: 0.2 });
  assert.equal(state.encounter.nextVisitor, 'cletus');
  assert.equal(state.encounter.nextPurpose, 'fire');
  state = runPhase(runPhase(runPhase(state, 'approach').state, 'entering').state, 'douse').state;
  assert.equal(state.encounter.phase, 'grab');
  state = runPhase(state, 'grab').state;
  assert.equal(state.encounter.phase, 'blackout');
  assert.equal(state.knockouts, 2);
});

test('whenever Darlene has her lighter back, she finds it in her fist and flings it down again', () => {
  let state = act(looseState(), { type: 'conceal' });
  // An odd visit with the Zwinkys on the counter used to mean a theft. The lighter comes first.
  state = { ...state, lighter: 'darlene', encounter: { ...state.encounter, phase: 'search', remaining: 3, visitor: 'darlene', purpose: 'search', visits: 3 } };
  state = runPhase(state, 'search').state;
  assert.equal(state.encounter.haul, 'drop-lighter');
  assert.equal(state.lighter, 'floor');
  assert.equal(state.zwinkys, 'counter');
});

test('you can stab Cletus with a needle once he drops the bucket', () => {
  let state = lighterState();
  state.usedNeedles = 'inventory';
  state = act(state, { type: 'ignite', spot: 'floorPapers' });
  state = { ...state, fire: FIRE_NOTICE };
  state = act(state, { type: 'tick', seconds: 0.1 });
  state = runPhase(runPhase(runPhase(state, 'approach').state, 'entering').state, 'douse').state;
  assert.equal(state.encounter.phase, 'grab');
  state = act(state, { type: 'stab' });
  assert.equal(state.encounter.phase, 'leaving');
  assert.equal(state.lighter, 'inventory');
  assert.equal(state.burnt.floorPapers, true);
});

test('once free, the trash bags and both pizza boxes burn too', () => {
  let state = act(looseState(), { type: 'view', view: 'dinette' });
  state.lighter = 'inventory';
  assert.equal(transition(state, { type: 'ignite', spot: 'pizzaRear' }).message, 'That pizza box is back by the bunk.');
  for (const [view, spot] of [['kitchen', 'trash'], ['dinette', 'pizza'], ['rear', 'pizzaRear']]) {
    const lit = act({ ...state, view }, { type: 'ignite', spot });
    assert.equal(lit.fireSpot, spot);
  }
});

test('v8 saves migrate with nothing burning and nothing burnt', () => {
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 8;
  for (const field of ['fire', 'fireSpot', 'burnt']) delete old[field];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.fire, 0);
  assert.equal(migrated.fireSpot, null);
  assert.deepEqual(migrated.burnt, { floorPapers: false, trash: false, pizza: false, pizzaRear: false });
  // Corrupt fire state is refused rather than trusted.
  const burning = JSON.parse(JSON.stringify(act(lighterState(), { type: 'ignite', spot: 'floorPapers' })));
  assert.ok(decodeSave(JSON.stringify(burning)));
  assert.equal(decodeSave(JSON.stringify({ ...burning, fireSpot: null })), null);
  assert.equal(decodeSave(JSON.stringify({ ...burning, fire: 99 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...burning, fireSpot: 'ronnie' })), null);
});

// Dale is due and you are sitting on the couch looking chained.
function daleState() {
  // Stage 4: the cuff is off and you are sober. Dale is the next beat.
  const state = act({ ...looseState(), cabinetUnlocked: true, tvShown: true, danced: true, finalKey: 'inventory', cuffOpen: true }, { type: 'conceal' });
  return { ...state, storyAt: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
}
function offerState() {
  let state = act(daleState(), { type: 'tick', seconds: 0.5 });
  state = runPhase(runPhase(state, 'approach').state, 'entering').state;
  return runPhase(state, 'hangout').state;
}

test('Dale comes in with his radio, sits down, plays his song, smokes the bulb and offers you a hit', () => {
  let state = daleState();
  assert.equal(upcomingVisitor(state), 'dale');
  state = act(state, { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.nextVisitor, 'dale');
  state = runPhase(state, 'approach').state;
  assert.equal(state.encounter.phase, 'entering');
  assert.equal(state.encounter.purpose, 'hangout');
  state = runPhase(state, 'entering').state;
  assert.equal(state.encounter.phase, 'hangout');
  assert.equal(act(state, { type: 'view', view: 'kitchen' }).view, 'seat');
  const elapsed = state.elapsed;
  const hangout = runPhase(state, 'hangout');
  state = hangout.state;
  assert.equal(state.elapsed, elapsed, 'game time is frozen while Dale is in');
  for (const sound of ['click', 'torch', 'cough']) assert.ok(hangout.sounds.includes(sound), sound);
  assert.equal(state.radio, 'floor');
  assert.equal(state.radioOn, true);
  assert.ok(state.radioClock > 0);
  assert.equal(state.encounter.phase, 'offer');
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  // Hit it.
  state = act(state, { type: 'bulb', take: true });
  assert.equal(state.encounter.phase, 'bulb');
  const bulb = runPhase(state, 'bulb');
  state = bulb.state;
  assert.ok(bulb.sounds.includes('inhale'));
  assert.equal(state.encounter.phase, 'leaving');
  assert.equal(state.trip, TRIP_SECONDS);
  assert.ok(state.paranoia >= 10);
  assert.match(state.encounter.outcome, /Keep it on/);
  state = runPhase(state, 'leaving').state;
  assert.equal(state.encounter.phase, 'idle');
  assert.equal(state.radioOn, true, 'he leaves the radio playing');
  // He is due back later; a routine visit in between is somebody else.
  assert.notEqual(upcomingVisitor({ ...state, nextVisit: state.elapsed + 10 }), 'dale');
});

test('pass on the bulb, or let the offer hang, and Dale smokes it himself', () => {
  const offer = offerState();
  const passed = act(offer, { type: 'bulb', take: false });
  assert.equal(passed.encounter.phase, 'leaving');
  assert.equal(passed.trip, 0);
  assert.match(passed.encounter.outcome, /More for me/);
  assert.equal(act(passed, { type: 'bulb', take: true }).trip, 0, 'only one answer counts');
  const ignored = runPhase(offer, 'offer').state;
  assert.equal(ignored.encounter.phase, 'leaving');
  assert.equal(ignored.trip, 0);
  assert.equal(ignored.radio, 'floor');
});

test('high, you work twice as fast, a shadow person reaching you makes you scream, and you can lose it', () => {
  let state = { ...withSpoon(), trip: TRIP_SECONDS, paranoia: 10, nextVisit: 1e9, daleAt: 1e9 };
  state = act(state, { type: 'work', item: 'spoon' });
  assert.equal(state.bracketWork, 2);
  state = act(state, { type: 'work', item: 'spoon' });
  assert.equal(isFree(state), true);
  // A shadow person gets to you: you scream.
  state = { ...state, noise: 0 };
  const scream = transition(state, { type: 'freakout' });
  assert.equal(scream.sound, 'shriek');
  assert.equal(scream.state.noise, 45);
  assert.equal(scream.state.paranoia, 30);
  // Staring one down settles you a little.
  assert.equal(act(scream.state, { type: 'banish' }).paranoia, 20);
  // Two screams close together are loud enough to bring somebody.
  const loud = act(scream.state, { type: 'freakout' });
  assert.ok(loud.noise > NOISE_LIMIT);
  assert.equal(act({ ...loud, encounter: { ...loud.encounter, cooldown: 0 } }, { type: 'tick', seconds: 0.5 }).encounter.phase, 'approach');
  // Paranoia all the way up: you lose it, at the top of your lungs.
  const lost = transition({ ...withSpoon(), trip: 60, paranoia: 99.9, nextVisit: 1e9, daleAt: 1e9 }, { type: 'tick', seconds: 0.5 });
  assert.equal(lost.state.noise, 100);
  assert.equal(lost.state.paranoia, 60);
  assert.match(lost.message, /lose it/);
  // Sober, there are no shadows to scream at.
  assert.equal(transition(withSpoon(), { type: 'freakout' }).state.noise, 0);
});

test('the high wears off, and the radio left behind covers half the noise of work', () => {
  let state = { ...withSpoon(), trip: 2, paranoia: 40, nextVisit: 1e9, daleAt: 1e9 };
  let comedown;
  for (let second = 0; second < 3; second++) {
    const result = transition(state, { type: 'tick', seconds: 1 });
    if (result.message) comedown = result.message;
    state = result.state;
  }
  assert.equal(state.trip, 0);
  assert.equal(state.paranoia, 0);
  assert.match(comedown, /shadows thin out/);
  // Two cranks of the fitting under the radio stay quiet enough.
  let radio = { ...withSpoon(), noise: 0, radio: 'floor', radioOn: true };
  radio = act(radio, { type: 'work', item: 'spoon' });
  assert.equal(radio.noise, 14);
  const off = act(radio, { type: 'radio' });
  assert.equal(off.radioOn, false);
  assert.equal(act(off, { type: 'radio' }).radioOn, true);
  assert.equal(transition(freshState(), { type: 'radio' }).state.radioOn, false, 'no radio until Dale brings one');
});

test('v9 saves migrate sober, with no radio and Dale still to come', () => {
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 9;
  for (const field of ['daleAt', 'radio', 'radioOn', 'radioClock', 'trip', 'paranoia']) delete old[field];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.daleAt, DALE_AT);
  assert.equal(migrated.radio, 'none');
  assert.equal(migrated.trip, 0);
  const high = JSON.parse(JSON.stringify({ ...looseState(), trip: 50, paranoia: 20, radio: 'floor', radioOn: true }));
  assert.ok(decodeSave(JSON.stringify(high)));
  assert.equal(decodeSave(JSON.stringify({ ...high, trip: 9999 })), null);
  assert.equal(decodeSave(JSON.stringify({ ...high, radio: 'none' })), null);
  assert.equal(decodeSave(JSON.stringify({ ...high, paranoia: -1 })), null);
});
test('stations air on one broadcast clock: shows, a bumper, then the ads in rotation, looping', () => {
  // The news: the story, the bumper, then the Zwinkys ad, and round again.
  assert.deepEqual(lineup(STATIONS.news), ['news-local-man', 'news-break', 'zwinkys']);
  const length = lineupSeconds(STATIONS.news);
  assert.equal(onAir(STATIONS.news, 0).id, 'news-local-man');
  assert.equal(onAir(STATIONS.news, 21).id, 'news-break');
  const ad = onAir(STATIONS.news, 30);
  assert.equal(ad.id, 'zwinkys');
  assert.equal(ad.clip.kind, 'commercial');
  assert.ok(Math.abs(ad.offset - (30 - CLIPS['news-local-man'].seconds - CLIPS['news-break'].seconds)) < 1e-9);
  assert.equal(ad.next, 'news-local-man');
  assert.equal(onAir(STATIONS.news, length + 1).id, 'news-local-man', 'it loops');
  // Cueing a clip lands right at its start.
  const cued = onAir(STATIONS.news, cue(STATIONS.news, 'zwinkys'));
  assert.equal(cued.id, 'zwinkys');
  assert.ok(cued.offset < 1e-9);
  // Ads rotate through the breaks so every one airs; a station with nothing airs its filler.
  const packed = { ...STATIONS.news, shows: ['news-local-man'], ads: ['zwinkys', 'news-break', 'krud-standby'], adsPerBreak: 2 };
  assert.deepEqual(lineup(packed), ['news-local-man', 'news-break', 'zwinkys', 'news-break', 'news-local-man', 'news-break', 'krud-standby', 'zwinkys']);
  assert.deepEqual(lineup(STATIONS.krud), ['krud-standby']);
  // The dial: news, KRUD, then a dead channel.
  assert.equal(TV_DIAL.length, 3);
  assert.equal(tuned(0, 5).id, 'news-local-man');
  assert.equal(tuned(1, 5).id, 'krud-standby');
  assert.equal(tuned(2, 5), null);
});

test('the broadcast keeps going with the set off, saves its place, and v10 sets come back with sound', () => {
  let state = { ...freshState(), nextVisit: 1e9, daleAt: 1e9 };
  state = advance(state, 4);
  assert.equal(state.tvClock, 4);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  assert.equal(decodeSave(JSON.stringify({ ...state, tvClock: -1 })), null);
  // Before v11 Cletus left the set muted after TV night.
  const old = JSON.parse(JSON.stringify({ ...looseState(), tvOn: true, tvMuted: true, tvShown: true }));
  old.version = 10;
  delete old.tvClock;
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.tvMuted, false);
  assert.equal(migrated.tvClock, 0);
  assert.equal(migrated.tvOn, true);
});
test('up at the set, you can turn it off and on and mute it by hand, but not change the channel', () => {
  let state = { ...looseState(), tvOn: true, tvShown: true, view: 'dinette' };
  assert.equal(state.remote, 'hidden');
  // From across the trailer, nothing.
  assert.equal(act({ ...state, view: 'seat' }, { type: 'tv', command: 'power' }).tvOn, true);
  state = act(state, { type: 'tv', command: 'mute' });
  assert.equal(state.tvMuted, true);
  state = act(state, { type: 'tv', command: 'mute' });
  assert.equal(state.tvMuted, false);
  const off = transition(state, { type: 'tv', command: 'power' });
  assert.equal(off.state.tvOn, false);
  assert.equal(off.sound, 'tvoff');
  assert.equal(act(off.state, { type: 'tv', command: 'mute' }).tvMuted, false, 'nothing to mute with it off');
  assert.equal(act(off.state, { type: 'tv', command: 'power' }).tvOn, true);
  // The channel knob is gone.
  const flip = transition(state, { type: 'tv', command: 'next' });
  assert.equal(flip.state.tvChannel, 0);
  assert.match(flip.message, /remote/);
});
test('Dale turns the TV off before he puts his radio on', () => {
  let state = { ...daleState(), tvOn: true, tvShown: true };
  state = runPhase(runPhase(act(state, { type: 'tick', seconds: 0.5 }), 'approach').state, 'entering').state;
  assert.equal(state.encounter.phase, 'hangout');
  assert.equal(state.tvOn, false);
});
// ---- The linear escape: every tweaker hands you a link ----

// A careful player: whenever somebody is coming they are on the couch looking chained; they answer politely,
// take Dale's hit, and grab the key when it falls. Waits in half-second ticks, for at most `limit` seconds.
function waitFor(state, done, limit = 400) {
  const startedAt = state.elapsed;
  for (let tick = 0; tick < limit * 4 && !done(state); tick++) {
    const phase = state.encounter.phase;
    if ((phase === 'approach' || phase === 'alarm') && state.view !== 'seat') state = act(state, { type: 'view', view: 'seat' });
    if ((phase === 'approach' || phase === 'alarm') && state.bracketWork > 0 && !state.bracketConcealed) state = act(state, { type: 'conceal' });
    if (phase === 'dialogue') state = act(state, { type: 'respond', response: 'shifted' });
    if (phase === 'offer') state = act(state, { type: 'bulb', take: true });
    if (phase === 'dance' && state.finalKey === 'floor') state = act(state, { type: 'snatch' });
    if (phase === 'blackout') assert.fail(`knocked out at ${state.elapsed}s: ${state.encounter.outcome}`);
    state = act(state, { type: 'tick', seconds: 0.25 });
    if (state.elapsed - startedAt > limit) break;
  }
  assert.ok(done(state), `still waiting after ${limit}s (stage ${stage(state)}, phase ${state.encounter.phase})`);
  return state;
}
const idle = state => state.encounter.phase === 'idle';
const seated = state => act(act(state, { type: 'view', view: 'seat' }), { type: 'conceal' });

test('the whole escape, start to finish, meets every tweaker in order', t => {
  const times = [];
  const mark = (label, state) => times.push(`${label} @${state.elapsed.toFixed(0)}s`);
  let state = freshState();
  assert.equal(stage(state), 0);
  // 0. The spoon bends on the fitting; the racket brings Cletus in for the first time.
  state = act(act(act(state, { type: 'cushion' }), { type: 'take', item: 'spoon' }), { type: 'work', item: 'spoon' });
  assert.equal(state.spoonBent, true);
  state = waitFor(seated(state), s => s.introDone && idle(s));
  assert.equal(state.screwdriver, 'drawer');
  mark('Cletus intro', state);
  // He left his screwdriver. Two more turns and the chain is off the floor.
  state = act(act(state, { type: 'drawer' }), { type: 'take', item: 'screwdriver' });
  state = act(act(state, { type: 'work', item: 'screwdriver' }), { type: 'work', item: 'screwdriver' });
  assert.equal(stage(state), 1);
  // The footlocker will not open for shaking hands, and there is nothing to light the butt with yet.
  state = act(act(state, { type: 'view', view: 'dinette' }), { type: 'take-ashtray' });
  state = act(act(state, { type: 'view', view: 'rear' }), { type: 'unlock-cabinet', item: 'bobbyPins' });
  assert.equal(state.cabinetUnlocked, false);
  assert.match(transition(state, { type: 'smoke' }).message, /Nothing to light it with/);
  // 1. Darlene's rampage leaves her lighter by the couch.
  state = waitFor(seated(state), s => s.lighter === 'floor' && idle(s));
  mark('Darlene drops the lighter', state);
  state = act(act(state, { type: 'take', item: 'lighter' }), { type: 'smoke' });
  assert.ok(state.steady > 0);
  state = act(act(state, { type: 'view', view: 'rear' }), { type: 'unlock-cabinet', item: 'bobbyPins' });
  assert.equal(state.cabinetUnlocked, true);
  state = act(state, { type: 'take', item: 'axe' });
  assert.equal(stage(state), 2);
  // 2. TV night: he shows you the news, and the key on his shoelace.
  state = waitFor(seated(state), s => s.tvShown && idle(s));
  mark('TV night', state);
  assert.equal(stage(state), 3);
  // 3. The dance: the shoelace snaps and the key is yours.
  state = waitFor(state, s => s.finalKey === 'inventory' && idle(s));
  mark('the dance, key grabbed', state);
  state = act(state, { type: 'unlock-cuff', item: 'finalKey' });
  assert.equal(state.cuffOpen, true);
  // Sober, the braced door just rings.
  assert.equal(act(state, { type: 'chop', item: 'axe' }).doorChops, 0);
  // 4. Dale's bulb.
  state = waitFor(seated({ ...state, noise: 0 }), s => s.trip > 0 && idle(s));
  mark('Dale and the bulb', state);
  assert.equal(stage(state), 5);
  // 5. Three swings and you are out.
  for (let swing = 0; swing < 3; swing++) state = act(state, { type: 'chop', item: 'axe' });
  assert.equal(state.escaped, true);
  mark('escaped', state);
  t.diagnostic(times.join(' | '));
  // Story beats are paced: the whole line is a few minutes of game time even for a player who never dawdles.
  assert.ok(state.elapsed > 150 && state.elapsed < 900, `game time ${state.elapsed}`);
});

test('Cletus comes in anyway if you never touch the fitting, and his first visit is a long warning', () => {
  let state = { ...freshState(), nextVisit: 1e9 };
  state = advance(state, 89);
  assert.equal(state.encounter.phase, 'idle');
  state = act(state, { type: 'tick', seconds: 1 });
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.nextPurpose, 'intro');
  assert.ok(state.encounter.remaining > APPROACH_SECONDS, 'more time than usual to get back on the couch');
  state = runPhase(runPhase(state, 'approach').state, 'entering').state;
  assert.equal(state.encounter.phase, 'dialogue');
  assert.equal(conversationLine(state.encounter), INTRO_LINE);
  state = act(state, { type: 'respond', response: 'shifted' });
  assert.equal(state.encounter.outcome, INTRO_OUTCOME);
  assert.equal(state.screwdriver, 'drawer');
  assert.equal(state.introDone, true);
  assert.ok(state.nextVisit < 1e9, 'routine visits start after he has been');
});

test('the butt keeps coming back to the ashtray, so steady hands are never lost for good', () => {
  let state = act(looseState(), { type: 'view', view: 'dinette' });
  state = act(state, { type: 'take-ashtray' });
  state = act(state, { type: 'chew' });
  assert.equal(state.butt, 'gone');
  state = act(state, { type: 'take-ashtray' });
  assert.equal(state.butt, 'inventory');
});

test('v11 saves pick the story up where they are: the key moves onto Cletus', () => {
  const old = JSON.parse(JSON.stringify({ ...looseState(), cabinetUnlocked: true }));
  old.version = 11;
  old.finalKey = 'cabinet';
  for (const field of ['introDone', 'spoonBent', 'storyAt']) delete old[field];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 12);
  assert.equal(migrated.finalKey, 'cletus');
  assert.equal(migrated.introDone, true);
  assert.equal(stage(migrated), 2);
  assert.ok(migrated.storyAt > migrated.elapsed);
  // A brand-new save that never met Cletus still gets the intro.
  const fresh = JSON.parse(JSON.stringify(freshState()));
  fresh.version = 11;
  fresh.finalKey = 'cabinet';
  for (const field of ['introDone', 'spoonBent', 'storyAt']) delete fresh[field];
  const early = decodeSave(JSON.stringify(fresh));
  assert.equal(early.introDone, false);
  assert.deepEqual(storyBeat(early), { visitor: 'cletus', purpose: 'intro' });
});