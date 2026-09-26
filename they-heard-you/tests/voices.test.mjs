import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openingLine, encounterDefaults, RAMBLES, DARLENE_RAMBLES } from '../.test-dist/encounters.js';
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
test('outside dialogue and approach are voiced; Ronnie has no speech clips', () => {
  const source=readFileSync(new URL('../src/content.ts',import.meta.url),'utf8');
  for (const match of source.matchAll(/text: '.*?: "([^"]+)"/g)) hasClip(match[1]);
  hasClip('Hey, what the fuck was that?');
  hasClip('Where is my fucking lighter.');
  assert.equal(Object.keys(manifest).some(line=>line.includes('Ronnie:')),false);
});
