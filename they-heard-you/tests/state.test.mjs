import test from 'node:test';
import assert from 'node:assert/strict';
import { RAMBLES, DARLENE_RAMBLES, APPROACH_SECONDS, DANCE_AT, DANCE_LINES, DANCE_SECONDS, DILDO_LINE, conversationLine, encounterDefaults } from '../.test-dist/encounters.js';
import { freshState, transition, canVisit, isFree, inventory, decodeSave } from '../.test-dist/state.js';

const act = (state, action) => transition(state, action).state;
function advance(state, seconds) {
  for (let second = 0; second < seconds; second++) state = act(state, { type: 'tick', seconds: 1 });
  return state;
}
function withSpoon() {
  return act(act(freshState(), { type: 'cushion' }), { type: 'take', item: 'spoon' });
}
function looseState() {
  let state = withSpoon();
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'spoon' });
  return state;
}
function cuffKeyState() {
  let state = looseState();
  state = act(state, { type: 'view', view: 'dinette' });
  state = act(state, { type: 'take-ashtray' });
  state = act(state, { type: 'view', view: 'rear' });
  state = act(state, { type: 'unlock-cabinet', item: 'bobbyPins' });
  state = act(state, { type: 'take', item: 'finalKey' });
  state = act(state, { type: 'take', item: 'axe' });
  return state;
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
test('three work actions release the floor chain and unlock rear views', () => {
  let state = withSpoon();
  assert.equal(canVisit(state, 'rear'), false);
  for (let count = 1; count <= 3; count++) {
    state = act(state, { type: 'work', item: 'spoon' });
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
  for (let count = 0; count < 3; count++) state = act(state, { type: 'work', item: 'spoon' });
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
  assert.equal(decodeSave(JSON.stringify({ ...state, version: 9 })), null);
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

test('alarm gives the full approach warning, saves mid-warning, and the door bangs', () => {
  let state = act(looseState(), { type: 'view', view: 'rear' });
  state = act(act(state, { type: 'rattle' }), { type: 'rattle' });
  assert.equal(state.encounter.phase, 'alarm');
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.remaining, APPROACH_SECONDS);
  state = advance(state, APPROACH_SECONDS - 3);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'approach');
  const bang = transition(state, { type: 'tick', seconds: 1 });
  assert.equal(bang.state.encounter.phase, 'entering');
  assert.equal(bang.sound, 'slam');
  // Slammed shut behind him on the way in.
  const shut = transition(bang.state, { type: 'tick', seconds: 1 });
  assert.equal(shut.sound, 'slam');
});
test('conceal never teleports and inspection distinguishes caught from concealed', () => {
  let state = act(looseState(), { type: 'view', view: 'bracket' });
  state = act(state, { type: 'conceal' });
  assert.equal(state.view, 'bracket');
  assert.equal(state.bracketConcealed, false);
  state = act(state, { type: 'view', view: 'seat' });
  state = act(state, { type: 'conceal' });
  state.encounter.phase = 'approach'; state.encounter.remaining = 1;
  const safe = advance(state, 5);
  assert.equal(safe.encounter.phase, 'dialogue');
  assert.equal(safe.encounter.evidence, '');
  assert.deepEqual(advance(safe, 30), safe);
  const accepted = act(safe, { type: 'respond', response: 'shifted' });
  assert.equal(accepted.encounter.suspicion, 0);
  const exposed = act(state, { type: 'view', view: 'rear' });
  const caught = act(advance(exposed, 5), { type: 'respond', response: 'shifted' });
  assert.equal(caught.encounter.suspicion, 25);
  assert.equal(caught.spoon, 'confiscated');
  assert.equal(caught.bracketWork, 0);
  assert.equal(caught.screwdriver, 'drawer');
  const departed = advance(caught, 5);
  assert.equal(departed.encounter.phase, 'idle');
  assert.equal(departed.encounter.cooldown, 35);
  assert.equal(act(departed, { type: 'rattle' }).encounter.phase, 'idle');
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
  assert.equal(migrated.version, 5);
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
test('confiscation leaves a reachable screwdriver and blackout gear can be recovered', () => {
  let state = looseState();
  state.encounter.phase = 'approach'; state.encounter.remaining = 1;
  state = act(advance(state, 5), {type:'respond',response:'shifted'});
  state = advance(state, 5);
  state = act(state,{type:'take',item:'screwdriver'});
  assert.equal(state.screwdriver,'inventory');
  for (let effort=0; effort<3; effort++) state=act(state,{type:'work',item:'screwdriver'});
  assert.equal(isFree(state),true);
  state.rag='inventory';
  state.encounter.phase='approach'; state.encounter.remaining=1;
  const before=state.elapsed;
  state=act(advance(state,5),{type:'respond',response:'defy'});
  assert.equal(state.encounter.phase,'blackout');
  assert.deepEqual(inventory(state),[]);
  assert.equal(state.knockouts,1);
  assert.equal(state.elapsed,before+93);
  assert.deepEqual(decodeSave(JSON.stringify(state)),state);
  assert.deepEqual(advance(state,10),state);
  state=act(state,{type:'wake'});
  state=act(state,{type:'recover'});
  assert.equal(state.screwdriver,'inventory');
  assert.equal(state.rag,'inventory');
  for(let effort=0;effort<3;effort++) state=act(state,{type:'work',item:'screwdriver'});
  assert.equal(isFree(state),true);
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
  assert.equal(locked.message, 'Requires something to unlock it.');
  assert.equal(act(state, { type: 'take', item: 'axe' }).axe, 'cabinet');
  state = cuffKeyState();
  assert.equal(state.cabinetUnlocked, true);
  assert.equal(state.axe, 'inventory');
  assert.equal(state.finalKey, 'inventory');
});

test('full escape chain: cuff key, then three axe swings at the entry door', () => {
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
  state = act(state, { type: 'chop', item: 'axe' });
  state = act(state, { type: 'chop', item: 'axe' });
  assert.equal(state.doorChops, 2);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = act(state, { type: 'chop', item: 'axe' });
  assert.equal(state.escaped, true);
  assert.equal(decodeSave(JSON.stringify(state)), null);
});

test('the glued rear hatch never opens but still makes noise', () => {
  let state = act(cuffKeyState(), { type: 'view', view: 'bracket' });
  state = act(act(state, { type: 'unlock-cuff', item: 'finalKey' }), { type: 'view', view: 'rear' });
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
  assert.deepEqual(inventory(state).sort(), ['magnet', 'spoon'].sort());
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
  state = act(act(taken.state, { type: 'cushion' }), { type: 'take', item: 'spoon' });
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'spoon' });
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

test('Cletus dances exactly once, mid-game, with the clock frozen and no evidence taken', () => {
  let state = looseState();
  state = { ...state, elapsed: DANCE_AT, nextVisit: DANCE_AT, encounter: { ...state.encounter, cooldown: 0 } };
  state = act(state, { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.nextPurpose, 'dance');
  state = advance(state, APPROACH_SECONDS + 2);
  assert.equal(state.encounter.phase, 'dance');
  assert.equal(state.danced, true);
  // The chain is exposed and he does not care; he is busy.
  assert.equal(state.encounter.chainCaught, false);
  const frozen = state.elapsed;
  assert.equal(act(state, { type: 'view', view: 'rear' }).view, state.view);
  state = advance(state, 5);
  assert.equal(conversationLine(state.encounter), DANCE_LINES[1]);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = advance(state, DANCE_SECONDS - 5);
  assert.equal(state.encounter.phase, 'leaving');
  assert.equal(state.elapsed, frozen);
  assert.equal(state.spoon, 'inventory');
  state = advance(state, 6);
  assert.equal(state.encounter.phase, 'idle');
  // Never again.
  state = { ...state, nextVisit: state.elapsed, encounter: { ...state.encounter, cooldown: 0 } };
  state = act(state, { type: 'tick', seconds: 0.5 });
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.nextPurpose, undefined);
});

test('v4 saves migrate with new items in place and new items survive blackout', () => {
  const old = JSON.parse(JSON.stringify(looseState()));
  old.version = 4;
  for (const field of ['dildo', 'zwinkys', 'butt', 'bobbyPins', 'usedNeedles', 'axe', 'danced', 'doorChops', 'ronnieCalm']) delete old[field];
  old.brassKey = 'inventory';
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.version, 5);
  assert.equal(migrated.brassKey, 'inventory');
  assert.equal(migrated.axe, 'cabinet');
  assert.equal(migrated.danced, false);
  // Legacy brass key holders can still open the cabinet.
  assert.equal(act(act(migrated, { type: 'view', view: 'rear' }), { type: 'unlock-cabinet', item: 'brassKey' }).cabinetUnlocked, true);
  let state = cuffKeyState();
  state.chainStrikes = 1;
  state = act(state, { type: 'view', view: 'dinette' });
  state.encounter.phase = 'approach'; state.encounter.remaining = 1;
  state = act(advance(state, 5), { type: 'respond', response: 'shifted' });
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

test('random visits alternate Cletus and Darlene by seed', () => {
  let state = looseState();
  const visitors = new Set();
  for (let visit = 0; visit < 6; visit++) {
    state = { ...state, elapsed: state.nextVisit, encounter: { ...state.encounter, phase: 'idle', cooldown: 0 } };
    state = act(state, { type: 'tick', seconds: 1 });
    assert.equal(state.encounter.phase, 'approach');
    visitors.add(state.encounter.nextVisitor);
    state = advance(state, 16);
    if (state.encounter.phase === 'dialogue') {
      state = act(state, { type: 'respond', response: 'shifted' });
      state = advance(state, 6);
    } else if (state.encounter.phase === 'search') {
      state = advance(state, 8);
    } else if (state.encounter.phase === 'dance') {
      state = advance(state, DANCE_SECONDS + 6);
    }
    assert.equal(state.encounter.phase, 'idle');
  }
  assert.ok(visitors.has('cletus'));
  assert.ok(visitors.has('darlene'));
});

test('Darlene silent search visit leaves without dialogue', () => {
  let state = looseState();
  state = act(state, { type: 'view', view: 'seat' });
  state = act(state, { type: 'conceal' }); // hide the chain work so this is a genuine search visit
  // Darlene with visits % 3 === 0 and no evidence means a search visit, no dialogue.
  state = { ...state, elapsed: state.nextVisit, encounter: { ...state.encounter, phase: 'idle', cooldown: 0, visits: 0 } };
  state.seed = 9; // odd seed: next visitor is Darlene
  state = act(state, { type: 'tick', seconds: 1 });
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.nextVisitor, 'darlene');
  state = advance(state, APPROACH_SECONDS);
  assert.equal(state.encounter.phase, 'entering');
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'search');
  state = advance(state, 8);
  assert.equal(state.encounter.phase, 'idle');
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
