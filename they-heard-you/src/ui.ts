import { createIcons, Armchair, ArrowLeft, ArrowRight, Baby, BedSingle, BookOpen, CookingPot, Eye, Hand, HelpCircle, Key, KeyRound, Link, Magnet, Maximize, MessageCircle, Pause, Play, RotateCcw, Settings, Shirt, Ticket, Tv, Undo2, Utensils, Volume2, Wrench, X } from 'lucide';
import { canVisit, inventory, isFree, type GameState, type ItemId, type Verb, type ViewId } from './state';
import { HOTSPOTS, ITEMS, VIEWS } from './content';
import type { Hit } from './world';
import { warning } from './encounters';

export const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export function paintIcons(): void {
  createIcons({ icons: { Armchair, ArrowLeft, ArrowRight, Baby, BedSingle, BookOpen, CookingPot, Eye, Hand, HelpCircle, Key, KeyRound, Link, Magnet, Maximize, MessageCircle, Pause, Play, RotateCcw, Settings, Shirt, Ticket, Tv, Undo2, Utensils, Volume2, Wrench, X } });
}

export class UI {
  readonly viewport: HTMLElement;
  readonly dialog: HTMLDialogElement;
  readonly modalBody: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly caption: HTMLElement;
  private readonly message: HTMLElement;
  private inventoryKey = '';

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <main id="game">
        <section id="viewport" aria-label="RV interior">
          <div class="film" aria-hidden="true"></div>
          <header class="topline">
            <div class="time-label"><span id="day">DAY 2</span><time id="clock">11:47 PM</time></div>
            <div class="scene-label"><span>THEY HEARD YOU</span><strong id="view-name">Your seat</strong></div>
            <div class="top-tools">
              <button id="journal" class="icon-button" title="Journal" aria-label="Open journal">${icon('book-open')}</button>
              <button id="fullscreen" class="icon-button" title="Fullscreen" aria-label="Toggle fullscreen">${icon('maximize')}</button>
              <button id="pause" class="icon-button" title="Pause and settings" aria-label="Pause and settings">${icon('pause')}</button>
            </div>
          </header>
          <div id="outside-caption" aria-live="polite" hidden></div>
          <div id="encounter-warning" role="status" aria-live="polite" hidden></div>
          <section id="encounter-dialogue" aria-label="Cletus confrontation" hidden></section>
          <div id="hotspot-label" hidden></div>
          <div id="hotspots"></div>
          <div class="scene-bottom">
            <button id="pretend" hidden>${icon('armchair')}<span>Pretend restrained</span></button>
            <div class="scene-actions">
              <button id="highlight" class="icon-button" title="Hold to reveal reachable objects (Space)" aria-label="Hold to reveal reachable objects">${icon('eye')}</button>
              <button id="hint" class="icon-button" title="Optional hint" aria-label="Show optional puzzle hint">${icon('help-circle')}</button>
            </div>
          </div>
        </section>
        <nav id="views" aria-label="Fixed camera views">
          ${VIEWS.map(view => `<button data-view="${view.id}">${icon(view.icon)}<span>${view.label}</span><small class="view-lock" aria-hidden="true"></small></button>`).join('')}
        </nav>
        <section id="console" aria-label="Actions and inventory">
          <div class="verb-panel" role="group" aria-label="Action verb">
            ${(['look', 'take', 'use', 'talk', 'put-back'] as Verb[]).map((verb, index) => `<button data-verb="${verb}" aria-pressed="${verb === 'use'}">${icon(['eye', 'hand', 'wrench', 'message-circle', 'undo-2'][index])}<span>${verb === 'put-back' ? 'Put back' : verb}</span></button>`).join('')}
          </div>
          <div class="inventory-panel">
            <div class="inventory-heading"><h2>INVENTORY</h2><span id="selected-name">Nothing selected</span><button id="cancel-item" class="icon-button" title="Cancel item selection (Escape)" aria-label="Cancel item selection">${icon('x')}</button></div>
            <div id="inventory" aria-label="Pocketed items"></div>
            <p id="message" role="status" aria-live="polite">The chain reaches the seat and the kitchen drawer. Not the door.</p>
          </div>
          <aside class="meters" aria-label="Condition">
            <div class="meter-heading"><span id="chain-state">CHAIN / ATTACHED</span><span id="chain-count">0 / 3</span></div>
            <meter id="chain-meter" min="0" max="3" value="0" aria-label="Floor fitting loosened"></meter>
            <div class="meter-heading"><span>NOISE</span><span id="noise-name">QUIET</span></div>
            <meter id="noise-meter" min="0" max="100" value="0" aria-label="Noise"></meter>
            <div class="condition-line"><span>SLEEP DEBT</span><strong>LOW</strong></div>
            <div class="condition-line"><span>SUSPICION</span><strong id="suspicion">LOW</strong></div>
            <div class="condition-line search-line"><span>POLICE SEARCH</span><strong>MISSING</strong></div>
          </aside>
        </section>
      </main>
      <dialog id="modal" aria-labelledby="modal-title"><div id="modal-body"></div></dialog>`;
    this.viewport = this.find('viewport');
    this.dialog = this.find('modal');
    this.modalBody = this.find('modal-body');
    this.tooltip = this.find('hotspot-label');
    this.caption = this.find('outside-caption');
    this.message = this.find('message');
    paintIcons();
  }

  find<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing interface element: ${id}`);
    return element as T;
  }

  update(state: GameState, selected: ItemId | null, verb: Verb): void {
    this.find('day').textContent = `DAY ${2 + state.knockouts}`;
    const totalMinutes = 23 * 60 + 47 + Math.floor(state.elapsed / 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    this.find('clock').textContent = `${hour % 12 || 12}:${String(totalMinutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
    this.find('view-name').textContent = VIEWS.find(view => view.id === state.view)!.label;
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => {
      const view = button.dataset.view as ViewId;
      const available = canVisit(state, view);
      button.disabled = !available;
      button.setAttribute('aria-current', String(view === state.view));
      button.title = available ? `View ${button.textContent?.trim()}` : 'Out of reach until the chain is released';
      button.querySelector('.view-lock')!.textContent = available ? '' : 'CHAINED';
    });
    document.querySelectorAll<HTMLButtonElement>('[data-verb]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.verb === verb)));
    const key = inventory(state).join(',') + ':' + selected;
    if (this.inventoryKey !== key) {
      this.inventoryKey = key;
      const items = inventory(state);
      this.find('inventory').innerHTML = `${items.map(item => `<button class="item-slot" data-item="${item}" aria-pressed="${selected === item}" title="${ITEMS[item].description}">${icon(ITEMS[item].icon)}<span>${ITEMS[item].name}</span></button>`).join('')}${Array.from({ length: 10 - items.length }, () => '<span class="empty-slot" aria-hidden="true"></span>').join('')}`;
      paintIcons();
    }
    this.find('selected-name').textContent = selected ? ITEMS[selected].name : 'Nothing selected';
    this.find<HTMLButtonElement>('cancel-item').disabled = !selected;
    this.find('chain-state').textContent = isFree(state) ? state.bracketConcealed ? 'CHAIN / CONCEALED' : 'CHAIN / LOOSE' : 'CHAIN / ATTACHED';
    this.find('chain-count').textContent = `${state.bracketWork} / 3`;
    this.find<HTMLMeterElement>('chain-meter').value = state.bracketWork;
    this.find<HTMLMeterElement>('noise-meter').value = state.noise;
    this.find('noise-name').textContent = state.noise > 55 ? 'LOUD' : state.noise > 8 ? 'SETTLING' : 'QUIET';
    this.find('pretend').hidden = state.bracketWork === 0 || state.view !== 'seat';
    const message = warning(state.encounter);
    const banner = this.find('encounter-warning');
    banner.hidden = !message || state.encounter.phase === 'dialogue';
    if (banner.textContent !== message) banner.textContent = message;
    this.find('suspicion').textContent = `${state.encounter.suspicion} / 100`;
    this.viewport.classList.toggle('has-warning', Boolean(message));
    const blocked = state.encounter.phase === 'dialogue' || state.encounter.phase === 'entering' || state.encounter.phase === 'blackout' || state.encounter.phase === 'kiss';
    this.find('views').inert = blocked;
    this.find('console').inert = blocked;
    this.find('pretend').inert = blocked;
  }

  say(message: string): void { this.message.textContent = message; }

  showModal(html: string): void {
    this.modalBody.innerHTML = html;
    if (!this.dialog.open) this.dialog.showModal();
    this.tooltip.hidden = true;
    this.setHighlights([]);
    paintIcons();
    this.modalBody.querySelector<HTMLButtonElement>('button')?.focus();
  }

  closeModal(): void { this.dialog.close(); }

  setHighlights(hits: Hit[]): void {
    const container = this.find('hotspots');
    container.replaceChildren();
    for (const hit of hits) {
      const marker = document.createElement('span');
      marker.className = 'hotspot-marker';
      marker.style.left = `${hit.x}px`;
      marker.style.top = `${hit.y}px`;
      marker.textContent = HOTSPOTS[hit.id];
      container.append(marker);
    }
  }
}