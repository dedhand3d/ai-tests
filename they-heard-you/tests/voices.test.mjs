import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openingLine, encounterDefaults, RAMBLES, DARLENE_RAMBLES, BULB_LINE, DANCE_LINES, DILDO_LINE, FIRE_ENTRY_LINE, FIRE_SMELL_LINE, HANGOUT_LINES, INTRO_LINE, INTRO_OUTCOME, KEY_MISSED, KEY_SNATCHED, OFFER_LINE, HAUL_LINES, PUKE_OPENING, RAMPAGE_SECONDS, READ_ALOUD, TV_SHOW_LINES, VISITORS, rampageLine } from '../.test-dist/encounters.js';
import { freshState, transition } from '../.test-dist/state.js';

const manifest = JSON.parse(readFileSync(new URL('../public/voices/manifest.json', import.meta.url), 'utf8').replace(/^﻿/, ''));
function hasClip(line) {
  const spoken = line.match(/"([^"]+)"/)?.[1] ?? line;
  assert.ok(manifest[spoken], `Missing speech: ${spoken}`);
  const bytes = readFileSync(new URL(`../public/${manifest[spoken]}`, import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.ok(bytes.length > 1000);
}
test('every Cletus opening and consequence has a bundled spoken clip', () => {
  for (const line of RAMBLES) hasClip(line);
  for (let visits = 0; visits < 3; visits++) hasClip(openingLine({...encounterDefaults(), visits}));
  hasClip(openingLine({...encounterDefaults(), chainCaught:true}));
  hasClip(openingLine({...encounterDefaults(), evidence:'Drawer open'}));
  for (const chainCaught of [false,true]) for(const response of ['shifted','ronnie','defy']) for(const strikes of [0,1]) {
    const state=freshState();
    state.chainStrikes=strikes;
    Object.assign(state.encounter,{phase:'dialogue',visitor:'cletus',chainCaught,evidence:chainCaught?'Fitting exposed':''});
    hasClip(transition(state,{type:'respond',response}).state.encounter.outcome);
  }
  const caught=freshState();
  Object.assign(caught.encounter,{phase:'dialogue',visitor:'cletus',evidence:'Drawer open'});
  hasClip(transition(caught,{type:'respond',response:'shifted'}).state.encounter.outcome);
});
test('every Darlene opening and consequence has a bundled spoken clip', () => {
  for (const line of DARLENE_RAMBLES) hasClip(line);
  for (let visits = 0; visits < 3; visits++) hasClip(openingLine({...encounterDefaults(), visits, visitor:'darlene'}));
  hasClip(openingLine({...encounterDefaults(), visitor:'darlene', chainCaught:true}));
  hasClip(openingLine({...encounterDefaults(), visitor:'darlene', evidence:'Drawer open'}));
  for (const chainCaught of [false,true]) for(const response of ['shifted','ronnie','defy','more','enough']) {
    const state=freshState();
    Object.assign(state.encounter,{phase:'dialogue',visitor:'darlene',chainCaught,evidence:chainCaught?'Fitting exposed':''});
    const outcome = transition(state,{type:'respond',response}).state.encounter.outcome;
    if (outcome) hasClip(outcome); // 'more' keeps talking, no closing line
  }
});
test('the drag number, its exit line and the dildo storm-in are voiced', () => {
  for (const line of DANCE_LINES) hasClip(line);
  hasClip(DILDO_LINE);
  let state = freshState();
  Object.assign(state.encounter, { phase: 'dance', purpose: 'dance', remaining: 0.5 });
  hasClip(transition(state, { type: 'tick', seconds: 1 }).state.encounter.outcome);
});
test('every rampage scream, haul line, grab line and kill line is voiced', () => {
  for (const beat of [0, 3.1, 6.1, 9.3]) hasClip(rampageLine({ ...encounterDefaults(), phase: 'search', remaining: RAMPAGE_SECONDS - beat }));
  for (const line of Object.values(HAUL_LINES)) hasClip(line);
  for (const profile of Object.values(VISITORS)) { hasClip(profile.grabLine); hasClip(profile.killLine); }
});
test('puke, stab and the paperback read-aloud are voiced', () => {
  hasClip(PUKE_OPENING);
  for (const profile of Object.values(VISITORS)) { hasClip(profile.stabLine); hasClip(profile.pukeLine); }
  for (const entry of READ_ALOUD) hasClip(entry.line);
});
test('every line Cletus says over the TV news is voiced', () => {
  for (const entry of TV_SHOW_LINES) hasClip(entry.line);
});
test('Cletus\'s first visit and the dance key drop are voiced', () => {
  hasClip(INTRO_LINE);
  hasClip(INTRO_OUTCOME);
  hasClip(KEY_SNATCHED);
  hasClip(KEY_MISSED);
});
test('the fire alarm from outside and Cletus coming in with the bucket are voiced', () => {
  hasClip(FIRE_SMELL_LINE);
  hasClip(FIRE_ENTRY_LINE);
});
test('everything Dale says on the couch, offering the bulb and walking out is voiced', () => {
  for (const entry of HANGOUT_LINES) hasClip(entry.line);
  hasClip(OFFER_LINE);
  hasClip(BULB_LINE);
  const offer = freshState();
  Object.assign(offer.encounter, { phase: 'offer', purpose: 'hangout', visitor: 'dale', remaining: 0.5 });
  hasClip(transition(offer, { type: 'bulb', take: false }).state.encounter.outcome);
  hasClip(transition(offer, { type: 'tick', seconds: 1 }).state.encounter.outcome);
  const bulb = freshState();
  Object.assign(bulb.encounter, { phase: 'bulb', purpose: 'hangout', visitor: 'dale', remaining: 0.5 });
  hasClip(transition(bulb, { type: 'tick', seconds: 1 }).state.encounter.outcome);
});
test('outside dialogue and approach are voiced; Ronnie has no speech clips', () => {
  const source=readFileSync(new URL('../src/content.ts',import.meta.url),'utf8');
  for (const match of source.matchAll(/text: '.*?: "([^"]+)"/g)) hasClip(match[1]);
  hasClip('Hey, what the fuck was that?');
  assert.equal(Object.keys(manifest).some(line=>line.includes('Ronnie:')),false);
});
