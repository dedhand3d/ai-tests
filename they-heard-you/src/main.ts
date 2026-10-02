import './styles.css';
import { AudioEngine } from './audio';
import { hints, HOTSPOTS, inspect, ITEMS, OUTSIDE_LINES, itemName, objective } from './content';
import { ShadowPeople } from './shadows';
import { BULB_LINE, HANGOUT_LINES, OFFER_LINE, OFFER_SECONDS, RADIO_LOOP, RADIO_SONG_START, hangoutBeat } from './encounters';
import { FINE_AGAIN_VOICES } from './midi';
import { canVisit, decodeSave, FIRE_FULL, freshState, inventory, isFireSpot, isFree, isItemId, READ_ALOUD_SECONDS, tripLevel, SAVE_KEY, STAB_WINDOW, transition, type Action, type CabinetId, type GameState, type HotspotId, type ItemId } from './state';
import { icon, UI } from './ui';
import { World } from './world';
import { DANCE_LINES, DANCE_SECONDS, FIRE_ENTRY_LINE, FIRE_SMELL_LINE, GRAB_SECONDS, KILL_HIT, KILL_SECONDS, READ_ALOUD, RESPONSES, TV_SHOW_LINES, VISITORS, conversationLine, danceBeat, rampageLine, tvShowBeat, visitorName, warning } from './encounters';
import { itemOptions, peekReport, pieOptions, scripted, type Wedge } from './interactions';
import { openInspector } from './inspect3d';
import { DANCE_SONG_START } from './midi';

const SONG_URL = `${import.meta.env.BASE_URL}sounds/goodbye-horses.mid`;
// Dale's radio only has one tape.
const RADIO_URL = `${import.meta.env.BASE_URL}sounds/fine-again.mid`;
const LOCKED_PHASES = new Set(['dialogue', 'entering', 'kiss', 'search', 'dance', 'grab', 'kill', 'dead', 'tvshow', 'douse', 'hangout', 'offer', 'bulb']);
// Shadow people are about while you are high and alone (or somebody is only just coming).
const SHADOW_PHASES = new Set(['idle', 'alarm', 'approach']);
let shadows: ShadowPeople;
let shadowTipShown = false;
let fakeStepsIn = 26;
let heartIn = 0;
let pulse = 1;
// The last time you woke up after a beating. Dying puts you back here.
const CHECKPOINT_KEY = `${SAVE_KEY}:checkpoint`;
const speakerOf = (current: GameState) => VISITORS[current.encounter.visitor].name;
let closeInspector: (() => void) | null = null;
let closeHighlights = () => {};

// Black-out amount for the screen: fades as you are beaten down, cuts to black on the killing blow.
function fadeFor(current: GameState): number {
  const encounter = current.encounter;
  if (encounter.phase === 'grab') {
    const t = GRAB_SECONDS - encounter.remaining;
    return Math.min(1, Math.max(0, (t - 3.1) / 1.1));
  }
  if (encounter.phase === 'kill') return KILL_SECONDS - encounter.remaining >= KILL_HIT + 0.06 ? 1 : 0;
  return encounter.phase === 'dead' ? 1 : 0;
}

const root = document.querySelector<HTMLElement>('#app')!;
const ui = new UI(root);
const audio = new AudioEngine();
let storageAvailable = true;
let saved: GameState | null = null;
try { saved = decodeSave(localStorage.getItem(SAVE_KEY)); } catch { storageAvailable = false; }
let state = saved ?? freshState();
let selected: ItemId | null = null;
let started = false;
let readAloudIndex = -1;
let reduced = false;
let volume = 40;
let voices = true;
let voicedDialogue = '';
let highlight = false;
let hintLevel = 0;
let hintStage = '';
let captionUntil = 0;
let lastSave = 0;
let outsideIndex = OUTSIDE_LINES.findIndex(line => line.at > state.elapsed);
if (outsideIndex < 0) outsideIndex = OUTSIDE_LINES.length;

let world: World;
try {
  world = new World(ui.viewport, state);
  init();
} catch (error) {
  console.error(error);
  ui.showModal('<p class="eyebrow">THEY HEARD YOU</p><h1 id="modal-title">The picture is gone.</h1><p>The 3D renderer could not start. This game needs WebGL and browser hardware acceleration. No progress has been erased.</p>');
}

function save(): void {
  if (!started || !storageAvailable || state.encounter.phase === 'dead') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    saved = state;
  } catch {
    storageAvailable = false;
    ui.say('Browser storage is unavailable. You can keep playing, but this session cannot be saved.');
  }
}

function sync(): void {
  if (selected && !inventory(state).includes(selected)) selected = null;
  world.applyState(state);
  ui.update(state, selected);
  ui.setHeld(selected ? itemName(selected, state) : null, selected ? ITEMS[selected].icon : '');
}

function closePie(): void {
  ui.hidePie();
  world.setHover(null);
}

function openHotspotPie(id: HotspotId, x: number, y: number): void {
  if (!canAct()) return;
  ui.tooltip.hidden = true;
  world.setHover(id);
  ui.showPie(`hot:${id}`, x, y, HOTSPOTS[id], pieOptions(id, state, selected), wedge => interact(id, wedge));
}

function openItemCard(item: ItemId): void {
  const slot = document.querySelector<HTMLElement>(`#inventory [data-item="${item}"]`);
  if (!slot || !canAct()) return;
  ui.showItemCard(item, slot.getBoundingClientRect(), itemName(item, state), ITEMS[item].icon, ITEMS[item].description, itemOptions(item, state), wedge => interactItem(item, wedge));
}

function dispatch(action: Action): void {
  const wasFree = isFree(state);
  const previousPhase = state.encounter.phase;
  const result = transition(state, action);
  state = result.state;
  if (result.message) ui.say(result.message);
  if (result.sound) audio.play(result.sound);
  if (result.vomit) ui.vomit();
  if (result.slop) ui.slop();
  if (action.type === 'respond' && action.response !== 'more') void audio.speak(state.encounter.outcome, speakerOf(state));
  if (action.type === 'bulb' && !action.take && state.encounter.phase === 'leaving') void audio.speak(state.encounter.outcome, 'Dale');
  if (action.type === 'freakout' && result.sound) { ui.jolt(); ui.hurt(); }
  if (previousPhase !== 'alarm' && state.encounter.phase === 'alarm') audio.play('alarm');
  sync();
  save();
  if (action.type === 'wake' && previousPhase === 'blackout' && storageAvailable) {
    try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state)); } catch { /* Storage warning already shown by save(). */ }
  }
  if (!wasFree && isFree(state)) {
    openModal(`<p class="eyebrow">THE FLOOR LET GO</p><h1 id="modal-title">Loose. Not out.</h1><p>The fitting comes away with a mouthful of rotten floor. You hold your breath. Outside, the argument carries on.</p><p>The cuff stays on. The dinette and rear bunk are now within reach. If footsteps turn toward the door, return to Your seat and conceal the fitting.</p><p class="scope-note">Somewhere in this trailer is the key to the cuff. Watch the blinds. Do not get caught standing where you should not be.</p><button id="continue">${icon('arrow-right')}Keep looking</button>`);
    ui.find('continue').onclick = closeModal;
  }
  if (state.escaped) {
    openModal(`<p class="eyebrow">THEY HEARD YOU</p><h1 id="modal-title">DITCH WATER</h1><p>The third swing splits the plywood down the middle and you go through the door shoulder first, axe still in your hand, into cold air and a yard full of lawn chairs. Barefoot. The open cuff swinging from your ankle like a broken watch.</p><p>Somebody drops a Zwinkys. Somebody yells your name wrong. Nobody follows a person holding an axe. You run toward the road and do not look back until the trailer is a rumor behind you.</p><p><strong>You got out.</strong> That is the whole ending. The rest is between you and the county.</p><button id="escape-done">${icon('arrow-right')}Roll credits</button>`);
    ui.find('escape-done').onclick = () => { state = freshState(); started = false; closeModal(); startScreen(); };
  }
}

const CABINET_SET = new Set<string>(['cab-k1', 'cab-k2', 'cab-k3', 'cab-u1', 'cab-u2', 'cab-u3']);

const canAct = () => started && !ui.dialog.open && !LOCKED_PHASES.has(state.encounter.phase) && !state.escaped;

// A wedge picked from a thing's pie menu.
function interact(id: HotspotId, wedge: Wedge): void {
  closePie();
  if (!canAct()) return;
  const action = wedge.action;
  switch (action.kind) {
    case 'look':
      ui.say(scripted(id, 'look', state) ?? inspect(id, state));
      if (id === 'bracket') dispatch({ type: 'note', text: 'The floor fitting has a broad slot. The lock is not the weak point.' });
      if (id === 'tv') dispatch({ type: 'note', text: 'They are looking for me in Red Creek County. The TV says missing, not dead.' });
      if (id === 'rearCab') dispatch({ type: 'note', text: 'There is a padlocked footlocker at the foot of the bunk. The padlock is cheap. Something thin could pick it.' });
      return;
    case 'take': grab(id); return;
    case 'use': useHotspot(id); return;
    case 'talk': ui.say('Ronnie does not answer. His eyes slide to you, then to the door, then back. Either he is warning you, or he just hates you specifically.'); return;
    case 'use-item': useItemOn(action.item, id); return;
    case 'put-back': dispatch({ type: 'return', item: action.item }); return;
    case 'act': dispatch(action.action); return;
  }
}

// A button picked on a pocketed item's card.
function interactItem(item: ItemId, wedge: Wedge): void {
  ui.hideItemCard();
  if (!canAct()) return;
  const action = wedge.action;
  if (action.kind === 'examine') examine(item);
  else if (action.kind === 'hold') hold(null);
  else if (action.kind === 'act') dispatch(action.action);
}

function hold(item: ItemId | null): void {
  selected = item;
  sync();
}

function grab(id: HotspotId): void {
  const line = scripted(id, 'take', state);
  if (line) { ui.say(line); return; }
  switch (id) {
    case 'belongings': dispatch({ type: 'recover' }); return;
    case 'cans': dispatch({ type: 'take', item: 'zwinkys' }); return;
    case 'ashtray': dispatch({ type: 'take-ashtray' }); return;
    case 'pizzaRear': dispatch({ type: 'take', item: 'usedNeedles' }); return;
    case 'cushion': if (state.cushionRaised && state.spoon === 'cushion') dispatch({ type: 'take', item: 'spoon' }); else ui.say('I wonder what\'s under the cushions'); return;
    case 'rearCab': {
      const inside = (['axe', 'choke'] as const).find(item => state[item] === 'cabinet');
      if (inside) dispatch({ type: 'take', item: inside }); else ui.say('Nothing left in there but the smell.');
      return;
    }
    case 'drawer': ui.say('Use the handle to open the drawer first.'); return;
  }
  if (isItemId(id)) dispatch({ type: 'take', item: id });
  else ui.say('You cannot pocket that. Not with these trousers.');
}

function useItemOn(item: ItemId, id: HotspotId): void {
  if (item === 'lighter' && isFireSpot(id)) { dispatch({ type: 'ignite', spot: id }); return; }
  switch (id) {
    case 'bracket': dispatch(item === 'finalKey' ? { type: 'unlock-cuff', item } : { type: 'work', item }); return;
    case 'cuff': dispatch({ type: 'unlock-cuff', item }); return;
    case 'rearCab': dispatch({ type: 'unlock-cabinet', item }); return;
    case 'door': dispatch({ type: 'chop', item }); return;
    case 'ronnie': dispatch({ type: 'give-ronnie', item }); return;
    case 'blinds': dispatch({ type: 'throw', item }); return;
    case 'puddle': if (item === 'rag') { dispatch({ type: 'wipe' }); return; } break;
    case 'cans': if (item === 'zwinkys') { dispatch({ type: 'drink' }); return; } break;
    case 'tv': if (item === 'remote') { dispatch({ type: 'tv', command: 'power' }); return; } break;
  }
  ui.say(`The ${itemName(item, state).toLowerCase()} does not help there. Nothing was used up.`);
}

function useHotspot(id: HotspotId): void {
  const line = scripted(id, 'use', state);
  if (line) { ui.say(line); return; }
  if (CABINET_SET.has(id)) { dispatch({ type: 'cabinet', cabinet: id.slice(4) as CabinetId }); return; }
  switch (id) {
    case 'drawer': dispatch({ type: 'drawer' }); return;
    case 'cushion': dispatch({ type: 'cushion' }); return;
    case 'belongings': dispatch({ type: 'recover' }); return;
    case 'bracket': dispatch({ type: 'work', item: null }); return;
    case 'cuff': dispatch({ type: 'unlock-cuff', item: null }); return;
    case 'rearCab': dispatch({ type: 'unlock-cabinet', item: null }); return;
    case 'door': dispatch({ type: 'chop', item: null }); return;
    case 'seat': dispatch({ type: 'conceal' }); return;
    case 'hatch': dispatch({ type: 'rattle' }); return;
    case 'cans': dispatch({ type: 'drink' }); return;
    case 'blinds': ui.say(peekReport(state)); return;
    case 'puddle': dispatch({ type: 'wipe' }); return;
    case 'radio': dispatch({ type: 'radio' }); return;
    case 'trash': dispatch({ type: 'rummage', spot: 'trash' }); return;
    case 'floorPapers': dispatch({ type: 'rummage', spot: 'floorPapers' }); return;
    case 'spoon': case 'rag': case 'screwdriver': case 'finalKey': case 'magnet': case 'beenie': case 'choke': case 'axe': dispatch({ type: 'take', item: id }); return;
  }
  ui.say(scripted(id, 'look', state) ?? inspect(id, state));
}

function examine(item: ItemId): void {
  openModal(`<p class="eyebrow">EXAMINE</p><h1 id="modal-title"></h1><div id="inspect-view" class="inspect-view"></div><p class="inspect-help">Drag to turn it over. Scroll or pinch to zoom.</p><p id="inspect-text"></p><div class="modal-actions"><button id="inspect-close">${icon('arrow-left')}Back</button>${item === 'zwinkys' ? `<button id="inspect-drink">${icon('beer')}Drink</button>` : ''}</div>`);
  ui.find('modal-title').textContent = itemName(item, state);
  ui.find('inspect-text').textContent = ITEMS[item].description;
  closeInspector = openInspector(ui.find('inspect-view'), world.itemModel(item));
  ui.find('inspect-close').onclick = closeModal;
  if (item === 'zwinkys') ui.find('inspect-drink').onclick = () => { closeModal(); dispatch({ type: 'drink' }); };
}

function disposeInspector(): void { closeInspector?.(); closeInspector = null; }

function openModal(html: string): void {
  disposeInspector();
  world.setHover(null);
  highlight = false;
  audio.setActive(false);
  audio.pauseVoices(true);
  voicedDialogue = '';
  ui.showModal(html);
}

function closeModal(): void {
  disposeInspector();
  ui.closeModal();
  audio.pauseVoices(document.hidden);
  audio.setActive(started && !document.hidden);
}

async function begin(resume: boolean): Promise<void> {
  audio.stopVoice(); voicedDialogue = '';
  if (!resume) {
    state = freshState();
    try { localStorage.removeItem(CHECKPOINT_KEY); } catch { /* No storage. */ }
  }
  started = true;
  selected = null;
  readAloudIndex = -1;
  outsideIndex = OUTSIDE_LINES.findIndex(line => line.at > state.elapsed);
  if (outsideIndex < 0) outsideIndex = OUTSIDE_LINES.length;
  try { await audio.start(); audio.attachTelevision(); audio.placeTelevision(...world.tvSpeaker.toArray()); } catch { ui.say('Sound could not start. All clues and outside voices also appear as text.'); }
  closeModal();
  sync();
  save();
  if (!storageAvailable) ui.say('Browser storage is unavailable. Progress will only last for this session.');
}

// Killed. Put the save back at the last wake-up so resuming never drops you straight into the fatal visit.
function deathScreen(): void {
  audio.stopVoice();
  let checkpoint: GameState | null = null;
  try { checkpoint = decodeSave(localStorage.getItem(CHECKPOINT_KEY)); } catch { /* No storage: start over only. */ }
  if (storageAvailable) {
    try { if (checkpoint) localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint)); else localStorage.removeItem(SAVE_KEY); } catch { /* Handled by save(). */ }
  }
  saved = checkpoint;
  // A second of black silence before the verdict. Purely presentational.
  window.setTimeout(showDeath, 1400);
}

function showDeath(): void {
  const profile = VISITORS[state.encounter.visitor];
  const checkpoint = saved;
  openModal(`<p class="eyebrow">RED CREEK COUNTY / CAUGHT TWICE</p><h1 id="modal-title" class="title">YOU DIED</h1><p id="death-text"></p><p class="scope-note">They caught you off the couch a second time. Next time, be sitting there, chained-looking, before the door opens.</p><div class="modal-actions">${checkpoint ? `<button id="retry">${icon('rotate-ccw')}Wake up again</button>` : ''}<button id="death-restart">${icon('arrow-right')}Start over</button></div>`);
  ui.find('death-text').textContent = profile.deathText;
  if (checkpoint) ui.find('retry').onclick = () => { state = checkpoint; void begin(true); };
  ui.find('death-restart').onclick = () => { void begin(false); };
}

function startScreen(): void {
  openModal(`<p class="eyebrow">RED CREEK COUNTY / DAY 2</p><h1 id="modal-title" class="title">THEY<br>HEARD YOU</h1><p class="intro">Somebody outside is arguing about nothing.<br>Somebody inside has chained you to the floor.</p><p>You are the only one treating this as an emergency.</p><div class="modal-actions">${saved ? `<button id="resume">${icon('play')}Resume</button>` : ''}<button id="start">${icon('arrow-right')}${saved ? 'New game' : 'Open your eyes'}</button></div><p class="scope-note">Dig through everything. Get the cuff off. Get out. Adult language, captivity, gross surroundings, and threatening atmosphere.</p>`);
  if (saved) ui.find('resume').onclick = () => { void begin(true); };
  ui.find('start').onclick = () => saved ? confirmRestart() : void begin(false);
}

function confirmRestart(): void {
  openModal(`<p class="eyebrow">START OVER</p><h1 id="modal-title">Back on the floor?</h1><p>Your saved puzzle progress will be replaced.</p><div class="modal-actions"><button id="cancel-restart">${icon('arrow-left')}Keep progress</button><button id="confirm-restart">${icon('rotate-ccw')}Restart</button></div>`);
  ui.find('cancel-restart').onclick = () => started ? pauseMenu() : startScreen();
  ui.find('confirm-restart').onclick = () => { hintLevel = 0; captionUntil = 0; ui.caption.hidden = true; void begin(false); };
}

function pauseMenu(): void {
  if (!started) return;
  if (state.encounter.phase === 'dead') { showDeath(); return; }
  save();
  openModal(`<p class="eyebrow">PAUSED</p><h1 id="modal-title">Nobody moves.</h1><div class="settings-row"><label for="volume">${icon('volume-2')}Volume</label><input id="volume" type="range" min="0" max="100" value="${volume}" /></div><label class="settings-row"><span>Reduced visual effects</span><input id="reduced" type="checkbox" ${reduced ? 'checked' : ''} /></label><p class="scope-note">${storageAvailable ? 'Progress saved in this browser.' : 'Browser storage is unavailable. Progress is not saved.'}</p><div class="modal-actions"><button id="unpause">${icon('play')}Resume</button><button id="restart">${icon('rotate-ccw')}Restart</button></div>`);
  ui.find('unpause').onclick = closeModal;
  const voiceLabel = document.createElement('label');
  voiceLabel.className = 'settings-row';
  voiceLabel.innerHTML = `<span>Processed dialogue voices</span><input type="checkbox" ${voices ? 'checked' : ''}>`;
  voiceLabel.querySelector('input')!.onchange = event => { voices = (event.target as HTMLInputElement).checked; audio.setVoiceEnabled(voices); voicedDialogue = ''; };
  ui.modalBody.insertBefore(voiceLabel, ui.find('unpause').parentElement);
  ui.find('restart').onclick = confirmRestart;
  ui.find<HTMLInputElement>('volume').oninput = event => {
    volume = Number((event.target as HTMLInputElement).value);
    audio.setVolume(volume / 100);
  };
  ui.find<HTMLInputElement>('reduced').onchange = event => {
    reduced = (event.target as HTMLInputElement).checked;
    document.body.classList.toggle('reduced', reduced);
    world.setReduced(reduced);
  };
}

function showHint(): void {
  const stage = objective(state);
  if (stage !== hintStage) { hintStage = stage; hintLevel = 0; }
  const clues = hints(state);
  openModal(`<p class="eyebrow">OPTIONAL HINT / ${hintLevel + 1} OF 3</p><h1 id="modal-title">Think it through.</h1><p id="hint-copy"></p><div class="modal-actions"><button id="hint-close">${icon('arrow-left')}Back</button><button id="hint-more" ${hintLevel === 2 ? 'disabled' : ''}>${icon('arrow-right')}More direct</button></div>`);
  ui.find('hint-copy').textContent = clues[hintLevel];
  ui.find('hint-close').onclick = closeModal;
  ui.find('hint-more').onclick = () => { hintLevel = Math.min(2, hintLevel + 1); showHint(); };
}

function showJournal(): void {
  openModal(`<p class="eyebrow">THINGS WORTH REMEMBERING</p><h1 id="modal-title">Keep it together.</h1><ul id="journal-notes"></ul><button id="journal-close">${icon('arrow-left')}Back</button>`);
  for (const text of state.journal) {
    const entry = document.createElement('li');
    entry.textContent = text;
    ui.find('journal-notes').append(entry);
  }
  ui.find('journal-close').onclick = closeModal;
}

function cancelSelection(): void {
  selected = null;
  ui.hideItemCard();
  sync();
}

function init(): void {
  sync();
  startScreen();
  ui.find('pause').onclick = pauseMenu;
  ui.find('journal').onclick = showJournal;
  ui.find('hint').onclick = showHint;
  ui.find('pretend').onclick = () => dispatch({ type: 'conceal' });
  ui.find('cancel-item').onclick = cancelSelection;
  ui.find('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { ui.say('Fullscreen is unavailable in this browser window.'); }
  };
  ui.find('views').onclick = event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-view]');
    if (!button || button.disabled || ui.dialog.open || !started) return;
    const view = button.dataset.view as GameState['view'];
    if (canVisit(state, view)) dispatch({ type: 'view', view });
  };
  // Pockets: click an item to pick it up. Its card shows what it is and what you can do with it;
  // while you hold it, every object's menu offers to use it there. Click it again to close the card.
  const inventoryPanel = ui.find('inventory');
  inventoryPanel.onclick = event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-item]');
    if (!button || !canAct()) return;
    event.stopPropagation();
    const item = button.dataset.item as ItemId;
    if (ui.itemCardFor === item) { ui.hideItemCard(); return; }
    closePie();
    if (selected !== item) hold(item);
    openItemCard(item);
  };
  document.addEventListener('click', event => {
    const target = event.target as Element;
    if (ui.itemCardFor && !target.closest('#item-card') && !target.closest('#inventory')) ui.hideItemCard();
    if (ui.pieOpenFor && !target.closest('#pie') && target !== world.renderer.domElement) closePie();
  });
  // The world: hovering only highlights and names a thing; clicking it opens its menu (like the Sims).
  // The menu stays put until you pick something, click elsewhere, press Escape or right-click.
  const canvas = world.renderer.domElement;
  shadows = new ShadowPeople(world.scene);
  // Dev server only: lets headless checks pin the camera (world.debugShot). Stripped from production builds.
  if (import.meta.env.DEV) Object.assign(window, { __world: world, __shadows: shadows, __audio: audio });
  // Dev server only: every few seconds, tell the dev server what the TV is doing (vite.config.ts writes it to
  // node_modules/.cache/they-heard-you/tv-report.json), so a TV that will not play can be diagnosed from there.
  const hot = import.meta.hot;
  if (hot) {
    window.setInterval(() => {
      if (document.hidden) return;
      hot.send('they-heard-you:tv', {
        ua: navigator.userAgent, started, activated: navigator.userActivation?.hasBeenActive ?? null,
        audio: audio.contextState, levels: audio.levels(),
        game: { version: state.version, phase: state.encounter.phase, view: state.view, tvOn: state.tvOn, tvMuted: state.tvMuted, tvChannel: state.tvChannel, tvClock: +state.tvClock.toFixed(1), tvShown: state.tvShown },
        tv: world.tv.report(),
        speaker: audio.televisionReport(),
      });
    }, 3000);
  }
  canvas.addEventListener('click', event => {
    // A shadow person in the way: clicking it stares it down. That comes before anything else.
    if (canAct() && state.trip > 0 && shadows.banish(event.clientX, event.clientY, canvas, world.camera)) {
      closePie();
      dispatch({ type: 'banish' });
      return;
    }
    const hit = canAct() ? world.pick(event.clientX, event.clientY) : null;
    if (hit) openHotspotPie(hit, event.clientX, event.clientY); else closePie();
  });
  canvas.addEventListener('pointermove', event => {
    if (!canAct()) { ui.tooltip.hidden = true; return; }
    if (state.trip > 0 && shadows.hovering(event.clientX, event.clientY, canvas, world.camera)) {
      canvas.style.cursor = 'crosshair';
      world.setHover(null);
      const rect = ui.viewport.getBoundingClientRect();
      ui.tooltip.textContent = 'STARE IT DOWN';
      ui.tooltip.hidden = Boolean(ui.pieOpenFor);
      ui.tooltip.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 16, rect.width - 200))}px`;
      ui.tooltip.style.top = `${Math.max(70, Math.min(event.clientY - rect.top + 16, rect.height - 50))}px`;
      return;
    }
    const hit = world.pick(event.clientX, event.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'default';
    if (!ui.pieOpenFor) world.setHover(hit);
    ui.tooltip.hidden = !hit || Boolean(ui.pieOpenFor);
    if (!hit || ui.pieOpenFor) return;
    ui.tooltip.textContent = selected ? `Use ${itemName(selected, state)} on: ${HOTSPOTS[hit]}` : HOTSPOTS[hit];
    const rect = ui.viewport.getBoundingClientRect();
    ui.tooltip.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 16, rect.width - 200))}px`;
    ui.tooltip.style.top = `${Math.max(70, Math.min(event.clientY - rect.top + 16, rect.height - 50))}px`;
  });
  canvas.addEventListener('pointerleave', () => { ui.tooltip.hidden = true; if (!ui.pieOpenFor) world.setHover(null); });
  canvas.addEventListener('contextmenu', event => { event.preventDefault(); closePie(); cancelSelection(); });
  document.addEventListener('pointermove', event => ui.moveHeld(event.clientX, event.clientY));
  ui.find('stab').onclick = () => dispatch({ type: 'stab' });
  ui.find('snatch').onclick = () => dispatch({ type: 'snatch' });
  const highlightButton = ui.find('highlight');
  highlightButton.addEventListener('pointerdown', event => {
    highlightButton.setPointerCapture(event.pointerId);
    highlight = true;
  });
  const stopHighlight = () => { highlight = false; ui.setHighlights([]); };
  closeHighlights = stopHighlight;
  highlightButton.addEventListener('pointerup', stopHighlight);
  highlightButton.addEventListener('pointercancel', stopHighlight);
  window.addEventListener('blur', () => { stopHighlight(); if (started && !ui.dialog.open) pauseMenu(); });
  document.addEventListener('keydown', event => {
    const phase = state.encounter.phase;
    if (event.code === 'Space' && (phase === 'grab' || phase === 'kill')) { event.preventDefault(); dispatch({ type: 'stab' }); return; }
    if (event.code === 'Space' && phase === 'dance' && state.finalKey === 'floor') { event.preventDefault(); dispatch({ type: 'snatch' }); return; }
    if (phase === 'offer' && !ui.dialog.open && (event.key === '1' || event.key === '2')) { event.preventDefault(); dispatch({ type: 'bulb', take: event.key === '1' }); return; }
    if (event.code === 'Space' && !ui.dialog.open && event.target === document.body) { event.preventDefault(); highlight = true; }
    // Number keys pick from an open menu.
    if (ui.pieOpenFor && /^[1-9]$/.test(event.key)) { event.preventDefault(); ui.pickPieOption(Number(event.key) - 1); return; }
    if (event.key === 'Escape' && !ui.dialog.open) {
      event.preventDefault();
      if (ui.pieOpenFor) closePie(); else if (ui.itemCardFor) ui.hideItemCard(); else if (selected) cancelSelection(); else pauseMenu();
    }
  });
  document.addEventListener('keyup', event => { if (event.code === 'Space') stopHighlight(); });
  ui.dialog.addEventListener('cancel', event => { event.preventDefault(); if (started && state.encounter.phase !== 'dead') closeModal(); });
  document.addEventListener('visibilitychange', () => {
    save();
    stopHighlight();
    audio.setActive(started && !document.hidden && !ui.dialog.open);
    audio.pauseVoices(document.hidden || ui.dialog.open);
    voicedDialogue = '';
  });
  window.addEventListener('pagehide', save);
  let previous = performance.now();
  let uiElapsed = 0;
  let sceneTime = 0;
  function frame(now: number): void {
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    const phaseNow = state.encounter.phase;
    const playing = started && !ui.dialog.open && !document.hidden && phaseNow !== 'dialogue' && phaseNow !== 'blackout' && phaseNow !== 'dead' && !state.escaped;
    audio.setActive(playing);
    audio.setTelevisionLevel(state.tvOn && !state.tvMuted ? 1 : 0);
    audio.setFireLevel(state.fire > 0 ? 0.35 + 0.65 * state.fire / FIRE_FULL : 0);
    ui.setFade(fadeFor(state));
    if (playing) {
      const previousPhase = state.encounter.phase;
      const smeltSmoke = state.encounter.nextPurpose === 'fire';
      const wasHigh = state.trip;
      const result = transition(state, { type: 'tick', seconds: delta });
      state = result.state;
      // The hit: everything goes white, then comes back wrong.
      if (state.trip > wasHigh + 1) ui.whiteout();
      if ((previousPhase === 'offer' || previousPhase === 'bulb') && state.encounter.phase === 'leaving') void audio.speak(state.encounter.outcome, 'Dale');
      world.applyState(state);
      const phase = state.encounter.phase;
      if (result.sound) audio.play(result.sound);
      if (result.sound === 'hit' || result.sound === 'kill') ui.hurt(result.sound === 'kill');
      if (result.message) ui.say(result.message);
      if (result.slop) ui.slop();
      if (phase === 'alarm' && previousPhase !== 'alarm') audio.play('alarm');
      if (phase !== previousPhase) { save(); ui.update(state, selected); if (LOCKED_PHASES.has(phase)) { closePie(); ui.hideItemCard(); } }
      if (phase === 'approach' && (previousPhase === 'alarm' || result.message?.includes('what the fuck was that'))) void audio.speak('Hey, what the fuck was that?', 'Cletus', true);
      if (phase === 'leaving' && previousPhase === 'dance') void audio.speak(state.encounter.outcome);
      if (phase === 'entering' && previousPhase !== 'entering') ui.jolt();
      // Smoke under the door: Darlene shrieks for Cletus and the bucket; he comes in screaming about his house.
      if (!smeltSmoke && state.encounter.nextPurpose === 'fire') void audio.speak(FIRE_SMELL_LINE, 'Darlene', true, true);
      if (phase === 'douse' && previousPhase !== 'douse') void audio.speak(FIRE_ENTRY_LINE, 'Cletus', false, true);
      if ((phase === 'grab' || phase === 'kill') && previousPhase !== phase) {
        ui.jolt();
        closeHighlights();
        const profile = VISITORS[state.encounter.visitor];
        // Straight on from the bucket: he is still screaming about his house.
        if (previousPhase === 'douse') ui.say(`Cletus drops the bucket and comes for you. Cletus: "${FIRE_ENTRY_LINE}"`);
        else {
          ui.say(`${profile.name}: "${phase === 'kill' ? profile.killLine : profile.grabLine}"`);
          void audio.speak(phase === 'kill' ? profile.killLine : profile.grabLine, profile.name, false, true);
        }
      }
      if (phase === 'dead' && previousPhase !== 'dead') deathScreen();
      sceneTime += delta;
      uiElapsed += delta;
      if (uiElapsed > 0.12) {
        ui.update(state, selected);
        if (highlight) ui.setHighlights(world.hotspotPositions());
        uiElapsed = 0;
      }
      if (state.elapsed - lastSave > 5) { save(); lastSave = state.elapsed; }
      if (state.encounter.phase === 'idle' && outsideIndex < OUTSIDE_LINES.length && state.elapsed >= OUTSIDE_LINES[outsideIndex].at) {
        const line = OUTSIDE_LINES[outsideIndex++];
        ui.caption.textContent = line.text;
        const speaker = line.text.includes('Darlene:') ? 'Darlene' : 'Cletus';
        void audio.speak(line.text, speaker, true);
        ui.caption.hidden = false;
        captionUntil = state.elapsed + 11;
        dispatch({ type: 'note', text: line.text });
      }
      // A paperback thrown out the window: Cletus reads it to the yard while Darlene heckles.
      if (state.outsideReading > 0) {
        const heard = READ_ALOUD_SECONDS - state.outsideReading;
        let index = -1;
        READ_ALOUD.forEach((entry, at) => { if (heard >= entry.at) index = at; });
        if (index >= 0 && index !== readAloudIndex) {
          readAloudIndex = index;
          const entry = READ_ALOUD[index];
          ui.caption.textContent = `[Outside, in the weeds] ${entry.speaker}: "${entry.line}"`;
          ui.caption.hidden = false;
          captionUntil = state.elapsed + 12;
          void audio.speak(entry.line, entry.speaker, true);
        }
      } else readAloudIndex = -1;
      if (state.elapsed > captionUntil || state.encounter.phase !== 'idle') ui.caption.hidden = true;
      tripFrame(delta);
    }
    // The trip on screen: how high, how paranoid, the hue sliding around, the vignette throbbing with your heart.
    pulse = Math.max(1, pulse - delta * 1.6);
    const high = started ? tripLevel(state) : 0;
    ui.setTrip(high, state.paranoia, Math.sin(sceneTime * 0.33) * 28 * high + Math.sin(sceneTime * 1.7) * 6 * high, pulse);
    // One chance to fight back: jab them with a used needle in the first moment of a grab.
    const attackTime = state.encounter.phase === 'grab' ? GRAB_SECONDS - state.encounter.remaining : state.encounter.phase === 'kill' ? KILL_SECONDS - state.encounter.remaining : Infinity;
    ui.showStab(playing && state.usedNeedles === 'inventory' && attackTime <= STAB_WINDOW);
    // The cuff key on the floor mid-dance: a big button, impossible to miss.
    ui.showSnatch(started && !ui.dialog.open && state.encounter.phase === 'dance' && state.finalKey === 'floor');
    // Goodbye Horses, from the peak, for exactly as long as the dance lasts. Otherwise Dale's radio, if it is on:
    // Fine Again from the second chorus, looping through the big finish. High, it clips and blows out the speaker.
    // Either one restarts in place after a pause.
    const dancing = playing && state.encounter.phase === 'dance';
    const radio = playing && !dancing && state.radioOn;
    const song = dancing ? SONG_URL : radio ? RADIO_URL : '';
    if (audio.musicSong && audio.musicSong !== song) audio.stopMusic();
    if (song && !audio.musicPlaying) {
      if (dancing) void audio.playMusic(SONG_URL, DANCE_SONG_START + DANCE_SECONDS - state.encounter.remaining, state.encounter.remaining + 0.6);
      else void audio.playMusic(RADIO_URL, RADIO_SONG_START + state.radioClock, RADIO_LOOP - state.radioClock + 0.4, FINE_AGAIN_VOICES);
    }
    audio.setMusicMode(dancing ? 'clean' : state.trip > 0 ? 'fried' : 'radio');
    if (LOCKED_PHASES.has(state.encounter.phase)) { world.setHover(null); ui.tooltip.hidden = true; }
    encounterDialogue();
    if (!document.hidden) world.render(playing ? delta : 0, sceneTime);
    // The TV is heard from where you are: closer is louder, and it sits where it is in the room.
    const ears = world.ears();
    audio.setListener(ears.position, ears.forward, ears.up);
    audio.setTelevisionStatic(world.tv.staticLevel);
    audio.syncTelevision(world.tv.soundCue, playing);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (import.meta.hot) import.meta.hot.dispose(() => { world.dispose(); audio.dispose(); });
}

// High on the bulb: shadow people, footsteps that are not there, and your heart in your ears.
function tripFrame(delta: number): void {
  const high = state.trip > 0;
  const alone = SHADOW_PHASES.has(state.encounter.phase);
  for (const event of shadows.update(delta, performance.now() / 1000, high && alone, state.paranoia, state.view, world.camera)) {
    if (event.kind === 'spawn') {
      audio.whisper(event.pan);
      if (!shadowTipShown) {
        shadowTipShown = true;
        ui.say('Something tall and black is standing down the aisle. It was not there a second ago. CLICK IT. Stare it down before it gets to you.');
      }
    }
    if (event.kind === 'reached') dispatch({ type: 'freakout' });
  }
  if (!high) { fakeStepsIn = 18; heartIn = 0; return; }
  // Footsteps outside. Maybe. The real ones do not ask questions.
  if (state.encounter.phase === 'idle') {
    fakeStepsIn -= delta;
    if (fakeStepsIn <= 0) {
      fakeStepsIn = 22 + Math.random() * 16;
      ui.say(['[Outside?] Footsteps. Running? Are they running at the door? Are they?', '[Outside?] Somebody whispered your name right outside the blinds. Your REAL name.', '[Outside?] The door handle just moved. Did the door handle just move?'][Math.floor(Math.random() * 3)]);
      for (let step = 0; step < 4; step++) window.setTimeout(() => { if (state.trip > 0) audio.play('step'); }, step * 480);
    }
  }
  // Your heart: faster and louder the closer you are to losing it. The vignette throbs with it.
  heartIn -= delta;
  if (heartIn <= 0) {
    heartIn = 1.05 - state.paranoia / 100 * 0.6;
    audio.heartbeat(state.paranoia / 100);
    pulse = 1.35;
  }
}

function encounterDialogue(): void {
  const panel = ui.find('encounter-dialogue');
  const name = visitorName(state.encounter);
  const phase = state.encounter.phase;
  if (phase === 'blackout' && started) {
    if (panel.dataset.mode !== 'blackout') {
      panel.dataset.mode = 'blackout';
      panel.innerHTML = `<strong>BLACKOUT / +90 SECONDS</strong><p id="blackout-cause"></p><p>You come to chained to the couch again. Your pockets are empty. The kitchen drawer hangs open with a bundle inside.</p><p class="dance-note">IF THEY CATCH YOU OFF THE COUCH AGAIN, THEY WILL KILL YOU.</p><button id="wake-up">Open your eyes</button>`;
      ui.find('blackout-cause').textContent = state.encounter.outcome;
      ui.find('wake-up').onclick = () => { dispatch({ type: 'wake' }); panel.hidden = true; panel.dataset.mode = ''; };
    }
    panel.hidden = false;
    ui.viewport.classList.add('blackout');
    return;
  }
  ui.viewport.classList.remove('blackout');
  if (phase === 'grab' || phase === 'kill' || phase === 'dead' || phase === 'douse') { panel.hidden = true; panel.dataset.mode = ''; return; }
  if (phase === 'tvshow' && started) {
    // No window: the top box carries what he is doing and saying; he says it out loud over the news.
    panel.hidden = true;
    panel.dataset.mode = '';
    const line = TV_SHOW_LINES[tvShowBeat(state.encounter)].line;
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line, 'Cletus'); }
    return;
  }
  if ((phase === 'hangout' || phase === 'bulb') && started) {
    // Dale talks into the top box; no window. You sit there with him.
    panel.hidden = true;
    panel.dataset.mode = '';
    const line = phase === 'bulb' ? BULB_LINE : HANGOUT_LINES[hangoutBeat(state.encounter)].line;
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line, 'Dale'); }
    return;
  }
  if (phase === 'offer' && started) {
    // He holds it out. Your call, and he will not hold it out forever.
    if (panel.dataset.mode !== 'offer') {
      panel.dataset.mode = 'offer';
      panel.innerHTML = `<strong>DALE</strong><p id="offer-line"></p><p class="inspect-help">The bulb is still smoking. The torch is still lit. Dale is looking at you like a dog that brought you a dead bird.</p><div class="bulb-choices"><button id="bulb-hit" class="hit">1. Hit the bulb</button><button id="bulb-pass">2. Nah, I'm good, Dale</button></div><div class="offer-clock"><span id="offer-clock"></span></div>`;
      ui.find('offer-line').textContent = `"${OFFER_LINE}"`;
      ui.find('bulb-hit').onclick = () => { dispatch({ type: 'bulb', take: true }); panel.hidden = true; };
      ui.find('bulb-pass').onclick = () => { dispatch({ type: 'bulb', take: false }); panel.hidden = true; };
      panel.hidden = false;
      ui.find('bulb-hit').focus();
    }
    ui.find('offer-clock').style.width = `${(state.encounter.remaining / OFFER_SECONDS * 100).toFixed(1)}%`;
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== OFFER_LINE) { voicedDialogue = OFFER_LINE; void audio.speak(OFFER_LINE, 'Dale'); }
    return;
  }
  if (phase === 'search' && started) {
    // No window, no choices. She screams; you sit there and take it.
    panel.hidden = true;
    panel.dataset.mode = '';
    const line = rampageLine(state.encounter);
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line, 'Darlene', false, true); }
    return;
  }
  if (state.encounter.phase === 'dance' && started) {
    const line = DANCE_LINES[danceBeat(state.encounter)];
    if (panel.dataset.mode !== 'dance' || panel.dataset.line !== line || panel.dataset.key !== String(Boolean(state.encounter.keyLoose))) {
      panel.dataset.key = String(Boolean(state.encounter.keyLoose));
      panel.dataset.mode = 'dance';
      panel.dataset.line = line;
      panel.innerHTML = '<strong>CLETUS</strong><p id="dance-line"></p><p id="dance-stage" class="inspect-help"></p><p class="dance-note">YOU HAVE TO WATCH.</p>';
      ui.find('dance-line').textContent = `"${line}"`;
      ui.find('dance-stage').textContent = warning(state.encounter).replace('[Inside] ', '');
      panel.hidden = false;
    }
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line); }
    return;
  }
  if (state.encounter.phase === 'kiss' && started) {
    if (panel.dataset.mode !== 'kiss') {
      panel.dataset.mode = 'kiss';
      panel.innerHTML = '<strong>CLETUS</strong><p id="kiss-line"></p><button id="skip-kiss">Skip</button>';
      ui.find('kiss-line').textContent = conversationLine(state.encounter);
      ui.find('skip-kiss').onclick = () => { dispatch({ type: 'skip-kiss' }); panel.hidden = true; };
      panel.hidden = false;
    }
    const line = conversationLine(state.encounter);
    if (!ui.dialog.open && !document.hidden && voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line); }
    return;
  }
  const visible = state.encounter.phase === 'dialogue' && started;
  if (visible && !ui.dialog.open && !document.hidden) {
    const line = conversationLine(state.encounter);
    if (voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line, speakerOf(state)); }
  }
  if (!visible) voicedDialogue = '';
  if (visible && (panel.hidden || panel.dataset.mode !== 'dialogue')) {
    panel.dataset.mode = 'dialogue';
    panel.innerHTML = `<strong>${name}</strong><p id="cletus-opening"></p><p id="inspection-evidence"></p><div id="encounter-responses"></div>`;
    ui.find('cletus-opening').textContent = conversationLine(state.encounter);
    ui.find('inspection-evidence').textContent = state.encounter.evidence || (name === 'DARLENE' ? 'She has not noticed anything yet. She is busy being furious at the concept of you.' : 'He has not noticed the fitting. He seems more concerned with the walls.');
    for (const response of RESPONSES) {
      const button = document.createElement('button');
      button.textContent = response.text;
      button.onclick = () => { dispatch({ type: 'respond', response: response.id }); panel.hidden = true; };
      ui.find('encounter-responses').append(button);
    }
    panel.hidden = false;
    panel.querySelector('button')?.focus();
  } else if (!visible) panel.hidden = true;
}