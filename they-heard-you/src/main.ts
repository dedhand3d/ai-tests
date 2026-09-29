import './styles.css';
import { AudioEngine } from './audio';
import { hints, HOTSPOTS, inspect, ITEMS, OUTSIDE_LINES } from './content';
import { canVisit, decodeSave, freshState, inventory, isFree, isItemId, SAVE_KEY, transition, type Action, type CabinetId, type GameState, type HotspotId, type ItemId, type Verb } from './state';
import { icon, UI } from './ui';
import { World } from './world';
import { DANCE_LINES, DANCE_SECONDS, RESPONSES, conversationLine, danceBeat, visitorName, warning } from './encounters';
import { scripted } from './interactions';
import { openInspector } from './inspect3d';
import { DANCE_SONG_START } from './midi';

const SONG_URL = `${import.meta.env.BASE_URL}sounds/goodbye-horses.mid`;
const LOCKED_PHASES = new Set(['dialogue', 'entering', 'kiss', 'search', 'dance']);
let closeInspector: (() => void) | null = null;

const root = document.querySelector<HTMLElement>('#app')!;
const ui = new UI(root);
const audio = new AudioEngine();
let storageAvailable = true;
let saved: GameState | null = null;
try { saved = decodeSave(localStorage.getItem(SAVE_KEY)); } catch { storageAvailable = false; }
let state = saved ?? freshState();
let selected: ItemId | null = null;
let verb: Verb = 'use';
let started = false;
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
  if (!started || !storageAvailable) return;
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
  ui.update(state, selected, verb);
}

function dispatch(action: Action): void {
  const wasFree = isFree(state);
  const previousPhase = state.encounter.phase;
  const result = transition(state, action);
  state = result.state;
  if (result.message) ui.say(result.message);
  if (result.sound) audio.play(result.sound);
  if (result.vomit) ui.vomit();
  if (action.type === 'respond' && action.response !== 'more') void audio.speak(state.encounter.outcome, visitorName(state.encounter) === 'DARLENE' ? 'Darlene' : 'Cletus');
  if (previousPhase !== 'alarm' && state.encounter.phase === 'alarm') audio.play('alarm');
  sync();
  save();
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

function interact(id: HotspotId): void {
  if (!started || ui.dialog.open || LOCKED_PHASES.has(state.encounter.phase) || state.escaped) return;
  if (verb === 'look') {
    ui.say(scripted(id, 'look', state) ?? inspect(id, state));
    if (id === 'bracket') dispatch({ type: 'note', text: 'The floor fitting has a broad slot. The lock is not the weak point.' });
    if (id === 'tv') dispatch({ type: 'note', text: 'They are looking for me in Red Creek County. The TV says missing, not dead.' });
    if (id === 'rearCab') dispatch({ type: 'note', text: 'There is a padlocked cabinet by the rear bunk. The padlock is cheap. Something thin could pick it.' });
    return;
  }
  if (verb === 'talk') { ui.say(id === 'ronnie' ? 'Ronnie does not answer. Either he is asleep, or he is ignoring you with real commitment.' : 'No answer from that. The adults outside are still busy with their own grievances.'); return; }
  if (verb === 'put-back') {
    if (!selected) { ui.say('Select the pocketed object you want to return.'); return; }
    dispatch({ type: 'return', item: selected });
    return;
  }
  if (verb === 'take') { grab(id); return; }
  if (selected) { useItemOn(selected, id); return; }
  useHotspot(id);
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
      const inside = (['axe', 'finalKey', 'choke'] as const).find(item => state[item] === 'cabinet');
      if (inside) dispatch({ type: 'take', item: inside }); else ui.say('Nothing left in there but the smell.');
      return;
    }
    case 'drawer': ui.say('Use the handle to open the drawer first.'); return;
  }
  if (isItemId(id)) dispatch({ type: 'take', item: id });
  else ui.say('You cannot pocket that. Not with these trousers.');
}

function useItemOn(item: ItemId, id: HotspotId): void {
  switch (id) {
    case 'bracket': dispatch(item === 'finalKey' ? { type: 'unlock-cuff', item } : { type: 'work', item }); return;
    case 'cuff': dispatch({ type: 'unlock-cuff', item }); return;
    case 'rearCab': dispatch({ type: 'unlock-cabinet', item }); return;
    case 'door': dispatch({ type: 'chop', item }); return;
    case 'ronnie': dispatch({ type: 'give-ronnie', item }); return;
  }
  ui.say(`The ${ITEMS[item].name.toLowerCase()} does not help there. Nothing was used up.`);
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
    case 'spoon': case 'rag': case 'screwdriver': case 'finalKey': case 'magnet': case 'beenie': case 'choke': case 'axe': dispatch({ type: 'take', item: id }); return;
  }
  ui.say(scripted(id, 'look', state) ?? inspect(id, state));
}

function examine(item: ItemId): void {
  openModal(`<p class="eyebrow">EXAMINE</p><h1 id="modal-title"></h1><div id="inspect-view" class="inspect-view"></div><p class="inspect-help">Drag to turn it over. Scroll or pinch to zoom.</p><p id="inspect-text"></p><div class="modal-actions"><button id="inspect-close">${icon('arrow-left')}Back</button>${item === 'zwinkys' ? `<button id="inspect-drink">${icon('beer')}Drink</button>` : ''}</div>`);
  ui.find('modal-title').textContent = ITEMS[item].name;
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
  if (!resume) state = freshState();
  started = true;
  selected = null;
  verb = 'use';
  outsideIndex = OUTSIDE_LINES.findIndex(line => line.at > state.elapsed);
  if (outsideIndex < 0) outsideIndex = OUTSIDE_LINES.length;
  try { await audio.start(); } catch { ui.say('Sound could not start. All clues and outside voices also appear as text.'); }
  closeModal();
  sync();
  save();
  if (!storageAvailable) ui.say('Browser storage is unavailable. Progress will only last for this session.');
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
  const stage = isFree(state) ? 'free' : state.spoon === 'inventory' ? 'work' : 'find';
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
  verb = 'use';
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
  document.querySelector('.verb-panel')!.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-verb]');
    if (!button) return;
    verb = button.dataset.verb as Verb;
    sync();
  });
  ui.find('inventory').onclick = event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-item]');
    if (!button) return;
    const item = button.dataset.item as ItemId;
    if (verb === 'look') { examine(item); return; }
    selected = selected === item ? null : item;
    if (verb !== 'put-back') verb = 'use';
    sync();
  };
  const canvas = world.renderer.domElement;
  canvas.addEventListener('click', event => {
    const hit = world.pick(event.clientX, event.clientY);
    if (hit) interact(hit);
  });
  canvas.addEventListener('pointermove', event => {
    if (ui.dialog.open || !started) return;
    const hit = LOCKED_PHASES.has(state.encounter.phase) ? null : world.pick(event.clientX, event.clientY);
    world.setHover(hit);
    canvas.style.cursor = hit ? 'pointer' : 'default';
    ui.tooltip.hidden = !hit;
    if (!hit) return;
    ui.tooltip.textContent = `${selected ? `${ITEMS[selected].name} / ` : ''}${HOTSPOTS[hit]}`;
    const rect = ui.viewport.getBoundingClientRect();
    ui.tooltip.style.left = `${Math.max(8, Math.min(event.clientX - rect.left + 16, rect.width - Math.min(270, rect.width - 16)))}px`;
    ui.tooltip.style.top = `${Math.max(70, Math.min(event.clientY - rect.top + 14, rect.height - 64))}px`;
  });
  canvas.addEventListener('pointerleave', () => { ui.tooltip.hidden = true; world.setHover(null); });
  canvas.addEventListener('contextmenu', event => { event.preventDefault(); cancelSelection(); });
  const highlightButton = ui.find('highlight');
  highlightButton.addEventListener('pointerdown', event => {
    highlightButton.setPointerCapture(event.pointerId);
    highlight = true;
  });
  const stopHighlight = () => { highlight = false; ui.setHighlights([]); };
  highlightButton.addEventListener('pointerup', stopHighlight);
  highlightButton.addEventListener('pointercancel', stopHighlight);
  window.addEventListener('blur', () => { stopHighlight(); if (started && !ui.dialog.open) pauseMenu(); });
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && !ui.dialog.open && event.target === document.body) { event.preventDefault(); highlight = true; }
    if (event.key === 'Escape' && !ui.dialog.open) {
      event.preventDefault();
      if (selected) cancelSelection(); else pauseMenu();
    }
  });
  document.addEventListener('keyup', event => { if (event.code === 'Space') stopHighlight(); });
  ui.dialog.addEventListener('cancel', event => { event.preventDefault(); if (started) closeModal(); });
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
    const playing = started && !ui.dialog.open && !document.hidden && state.encounter.phase !== 'dialogue' && state.encounter.phase !== 'blackout' && !state.escaped;
    audio.setActive(playing);
    if (playing) {
      const previousPhase = state.encounter.phase;
      const result = transition(state, { type: 'tick', seconds: delta });
      state = result.state;
      world.applyState(state);
      if (result.sound) audio.play(result.sound);
      if (result.message) ui.say(result.message);
      if (state.encounter.phase === 'alarm' && previousPhase !== 'alarm') audio.play('alarm');
      if (state.encounter.phase !== previousPhase) { save(); ui.update(state, selected, verb); }
      if (state.encounter.phase === 'approach' && previousPhase !== 'approach') void audio.speak('Hey, what the fuck was that?', 'Cletus', true);
      if (state.encounter.phase === 'leaving' && previousPhase === 'dance') void audio.speak(state.encounter.outcome);
      if (state.encounter.phase === 'entering' && previousPhase !== 'entering') ui.jolt();
      sceneTime += delta;
      uiElapsed += delta;
      if (uiElapsed > 0.12) {
        ui.update(state, selected, verb);
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
      if (state.elapsed > captionUntil || state.encounter.phase !== 'idle') ui.caption.hidden = true;
    }
    // Goodbye Horses, from the peak, for exactly as long as the dance lasts. Restarts in place after a pause.
    const dancing = playing && state.encounter.phase === 'dance';
    if (dancing && !audio.musicPlaying) void audio.playMusic(SONG_URL, DANCE_SONG_START + DANCE_SECONDS - state.encounter.remaining, state.encounter.remaining + 0.6);
    else if (!dancing && audio.musicPlaying) audio.stopMusic();
    if (LOCKED_PHASES.has(state.encounter.phase)) { world.setHover(null); ui.tooltip.hidden = true; }
    encounterDialogue();
    if (!document.hidden) world.render(playing ? delta : 0, sceneTime);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (import.meta.hot) import.meta.hot.dispose(() => { world.dispose(); audio.dispose(); });
}

function encounterDialogue(): void {
  const panel = ui.find('encounter-dialogue');
  const name = visitorName(state.encounter);
  if (state.encounter.phase === 'blackout' && started) {
    if (panel.dataset.mode !== 'blackout') {
      panel.dataset.mode = 'blackout';
      panel.innerHTML = '<strong>BLACKOUT / +90 SECONDS</strong><p>A blow. The floor drops away. When you open your eyes, your pockets are empty and the loose belongings have been moved.</p><p>The kitchen drawer hangs open. A bundle sits inside.</p><button id="wake-up">Open your eyes</button>';
      ui.find('wake-up').onclick = () => { dispatch({ type: 'wake' }); panel.hidden = true; panel.dataset.mode = ''; };
    }
    panel.hidden = false;
    ui.viewport.classList.add('blackout');
    return;
  }
  ui.viewport.classList.remove('blackout');
  if (state.encounter.phase === 'search' && started) {
    if (panel.dataset.mode !== 'search') {
      panel.dataset.mode = 'search';
      panel.innerHTML = `<strong>${name}</strong><p>She is tearing through the trailer, muttering. Not here for you. Do not move. Do not breathe loudly.</p>`;
      panel.hidden = false;
    }
    return;
  }
  if (state.encounter.phase === 'dance' && started) {
    const line = DANCE_LINES[danceBeat(state.encounter)];
    if (panel.dataset.mode !== 'dance' || panel.dataset.line !== line) {
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
    if (voicedDialogue !== line) { voicedDialogue = line; void audio.speak(line, name === 'DARLENE' ? 'Darlene' : 'Cletus'); }
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