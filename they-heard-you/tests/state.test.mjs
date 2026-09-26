import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, transition, canVisit, isFree, inventory, decodeSave } from '../.test-dist/state.js';

const act = (state, action) => transition(state, action).state;
function withSpoon() {
  return act(act(freshState(), { type: 'cushion' }), { type: 'take', item: 'spoon' });
}

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
  assert.equal(decodeSave(JSON.stringify({ ...state, version: 3 })), null);
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

function advance(state, seconds) {
  for (let second = 0; second < seconds; second++) state = act(state, { type: 'tick', seconds: 1 });
  return state;
}
function looseState() {
  let state = withSpoon();
  for (let effort = 0; effort < 3; effort++) state = act(state, { type: 'work', item: 'spoon' });
  return state;
}
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
  assert.equal(caught.spoon, 'inventory');
  assert.equal(caught.bracketWork, 3);
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
  assert.equal(migrated.version, 2);
  assert.equal(migrated.encounter.phase, 'idle');
  const original = JSON.stringify(migrated);
  advance(migrated, 96);
  assert.equal(JSON.stringify(migrated), original);
  assert.equal(decodeSave(JSON.stringify({ ...migrated, encounter: { ...migrated.encounter, phase: 'bogus' } })), null);
});