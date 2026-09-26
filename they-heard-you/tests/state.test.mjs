import test from 'node:test';
import assert from 'node:assert/strict';
import { RAMBLES, DARLENE_RAMBLES, conversationLine, encounterDefaults } from '../.test-dist/encounters.js';
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
  state = act(state, { type: 'rummage', spot: 'pizza' });
  state = act(state, { type: 'view', view: 'rear' });
  state = act(state, { type: 'unlock-cabinet', item: 'brassKey' });
  state = act(state, { type: 'take', item: 'finalKey' });
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

test('alarm gives full twelve second approach and saves mid-warning', () => {
  let state = act(looseState(), { type: 'view', view: 'rear' });
  state = act(act(state, { type: 'rattle' }), { type: 'rattle' });
  assert.equal(state.encounter.phase, 'alarm');
  state = advance(state, 2);
  assert.equal(state.encounter.phase, 'approach');
  assert.equal(state.encounter.remaining, 12);
  state = advance(state, 7);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  state = advance(state, 4);
  assert.equal(state.encounter.phase, 'approach');
  state = advance(state, 1);
  assert.equal(state.encounter.phase, 'entering');
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
  assert.equal(migrated.version, 4);
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
  assert.equal(state.elapsed,before+95);
  assert.deepEqual(decodeSave(JSON.stringify(state)),state);
  assert.deepEqual(advance(state,10),state);
  state=act(state,{type:'wake'});
  state=act(state,{type:'recover'});
  assert.equal(state.screwdriver,'inventory');
  assert.equal(state.rag,'inventory');
  for(let effort=0;effort<3;effort++) state=act(state,{type:'work',item:'screwdriver'});
  assert.equal(isFree(state),true);
});

// New pivot: full escape chain.
test('brass key is dug from the pizza box only while loose', () => {
  let state = freshState();
  assert.equal(act(state, { type: 'view', view: 'dinette' }).view, 'seat'); // still chained
  state = looseState();
  state = act(state, { type: 'view', view: 'dinette' });
  assert.equal(state.brassKey, 'pizza');
  state = act(state, { type: 'rummage', spot: 'pizza' });
  assert.equal(state.brassKey, 'inventory');
  // Digging again yields nothing.
  state = act(state, { type: 'rummage', spot: 'pizza' });
  assert.equal(state.brassKey, 'inventory');
});

test('full escape chain: key, cabinet, cuff, hatch', () => {
  let state = cuffKeyState();
  assert.equal(state.cabinetUnlocked, true);
  assert.equal(state.finalKey, 'inventory');
  // Wrong key does not open the cuff.
  assert.equal(act(state, { type: 'unlock-cuff', item: 'brassKey' }).cuffOpen, false);
  state = act(state, { type: 'view', view: 'bracket' });
  state = act(state, { type: 'unlock-cuff', item: 'finalKey' });
  assert.equal(state.cuffOpen, true);
  // Escape only at the rear hatch.
  state = act(state, { type: 'view', view: 'rear' });
  state = act(state, { type: 'escape' });
  assert.equal(state.escaped, true);
  // Escaped states do not persist a game-over save.
  assert.equal(decodeSave(JSON.stringify(state)), null);
});

test('escape requires the cuff open and the rear hatch', () => {
  let state = looseState();
  assert.equal(act(state, { type: 'escape' }).escaped, false);
  let cuffed = cuffKeyState();
  assert.equal(act(cuffed, { type: 'escape' }).escaped, false); // cuff still locked
});

test('red herrings are collectible and returnable but useless', () => {
  let state = looseState();
  state = act(state, { type: 'view', view: 'kitchen' });
  state = act(state, { type: 'cabinet', cabinet: 'k1' });
  state = act(state, { type: 'take', item: 'magnet' });
  assert.equal(state.magnet, 'inventory');
  // Magnet does nothing on the bracket.
  assert.equal(act(state, { type: 'work', item: 'magnet' }).bracketWork, 3);
  // Losing ticket from the floor papers.
  state = act(state, { type: 'rummage', spot: 'floorPapers' });
  assert.equal(state.lotto, 'inventory');
  assert.deepEqual(inventory(state).sort(), ['lotto', 'magnet', 'spoon'].sort());
  // Return the magnet to its cabinet.
  state = act(state, { type: 'return', item: 'magnet' });
  assert.equal(state.magnet, 'cab-k1');
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
  state = advance(state, 12);
  assert.equal(state.encounter.phase, 'entering');
  state = advance(state, 4);
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
