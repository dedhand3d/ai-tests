import { createIcons, Armchair, ArrowLeft, ArrowRight, Axe, Baby, Banana, BedSingle, Beer, BookOpen, Cigarette, CookingPot, Eye, Flame, Hand, HelpCircle, Key, KeyRound, Link, Magnet, Maximize, MessageCircle, Paperclip, Pause, Play, Power, RotateCcw, Settings, Shirt, Syringe, Ticket, Tv, Undo2, Utensils, Volume2, VolumeX, Wrench, X } from 'lucide';
import { canVisit, inventory, isFree, type GameState, type ItemId, type ViewId } from './state';
import { HOTSPOTS, ITEMS, VIEWS, itemName, objective } from './content';
import type { Wedge } from './interactions';
import type { Hit } from './world';
import { warning } from './encounters';

export const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export function paintIcons(): void {
  createIcons({ icons: { Armchair, ArrowLeft, ArrowRight, Axe, Baby, Banana, BedSingle, Beer, BookOpen, Cigarette, CookingPot, Eye, Flame, Hand, HelpCircle, Key, KeyRound, Link, Magnet, Maximize, MessageCircle, Paperclip, Pause, Play, Power, RotateCcw, Settings, Shirt, Syringe, Ticket, Tv, Undo2, Utensils, Volume2, VolumeX, Wrench, X } });
}

export class UI {
  readonly viewport: HTMLElement;
  readonly dialog: HTMLDialogElement;
  readonly modalBody: HTMLElement;
  readonly tooltip: HTMLElement;
  readonly caption: HTMLElement;
  private inventoryKey = '';

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <main id="game">
        <section id="viewport" aria-label="RV interior">
          <div class="film" aria-hidden="true"></div>
          <div id="vomit" aria-hidden="true"></div>
          <div id="fade" aria-hidden="true"></div>
          <div id="trip" aria-hidden="true"></div>
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
          <div id="pie" role="menu" hidden></div>
          <button id="stab" hidden>STAB</button>
          <button id="snatch" hidden>GRAB THE KEY <small>(Space)</small></button>
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
        <section id="console" aria-label="Inventory">
          <div class="inventory-panel">
            <div class="inventory-heading"><h2>POCKETS</h2><span id="selected-name">Hands empty</span><button id="cancel-item" class="icon-button" title="Put it away (Escape or right-click)" aria-label="Put the held item away">${icon('x')}</button></div>
            <div id="inventory" aria-label="Pocketed items"></div>
            <p id="message" role="status" aria-live="polite">Click anything to see what you can do with it. Keys 1–5 pick an option.</p>
          </div>
          <aside class="meters" aria-label="Condition">
            <div class="meter-heading"><span id="chain-state">CHAIN / ATTACHED</span><span id="chain-count">0 / 3</span></div>
            <meter id="chain-meter" min="0" max="3" value="0" aria-label="Floor fitting loosened"></meter>
            <div class="meter-heading"><span>NOISE</span><span id="noise-name">QUIET</span></div>
            <meter id="noise-meter" min="0" max="100" value="0" aria-label="Noise"></meter>
            <div class="condition-line"><span>SLEEP DEBT</span><strong>LOW</strong></div>
            <div class="condition-line"><span>SUSPICION</span><strong id="suspicion">LOW</strong></div>
            <div class="meter-heading trip-row" id="paranoia-row" hidden><span>PARANOIA</span><span id="paranoia-name">UNEASY</span></div>
            <meter id="paranoia-meter" class="trip-row" min="0" max="100" value="0" aria-label="Paranoia" hidden></meter>
            <div class="condition-line search-line"><span>POLICE SEARCH</span><strong>MISSING</strong></div>
          </aside>
        </section>
      </main>
      <div id="held" aria-hidden="true" hidden></div>
      <div id="item-card" role="menu" hidden></div>
      <dialog id="modal" aria-labelledby="modal-title"><div id="modal-body"></div></dialog>`;
    this.viewport = this.find('viewport');
    this.dialog = this.find('modal');
    this.modalBody = this.find('modal-body');
    this.tooltip = this.find('hotspot-label');
    this.caption = this.find('outside-caption');
    paintIcons();
  }

  find<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing interface element: ${id}`);
    return element as T;
  }

  update(state: GameState, selected: ItemId | null): void {
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
    const key = `${inventory(state).join(',')}:${selected}:${state.wrapped}:${state.ragSoiled}`;
    if (this.inventoryKey !== key) {
      this.inventoryKey = key;
      const items = inventory(state);
      this.find('inventory').innerHTML = `${items.map(item => `<button class="item-slot${state.wrapped === item ? ' wrapped' : ''}" data-item="${item}" aria-pressed="${selected === item}" title="${ITEMS[item].description}">${icon(ITEMS[item].icon)}<span>${itemName(item, state)}</span></button>`).join('')}${Array.from({ length: Math.max(0, 10 - items.length) }, () => '<span class="empty-slot" aria-hidden="true"></span>').join('')}`;
      paintIcons();
    }
    this.find('selected-name').textContent = selected ? `Holding: ${itemName(selected, state)}` : 'Hands empty';
    this.find<HTMLButtonElement>('cancel-item').disabled = !selected;
    this.find('chain-state').textContent = isFree(state) ? state.bracketConcealed ? 'CHAIN / CONCEALED' : 'CHAIN / LOOSE' : 'CHAIN / ATTACHED';
    this.find('chain-count').textContent = `${state.bracketWork} / 3`;
    this.find<HTMLMeterElement>('chain-meter').value = state.bracketWork;
    this.find<HTMLMeterElement>('noise-meter').value = state.noise;
    this.find('noise-name').textContent = state.noise > 55 ? 'LOUD' : state.noise > 8 ? 'SETTLING' : 'QUIET';
    this.find('pretend').hidden = state.bracketWork === 0 || state.view !== 'seat';
    // Always on screen: what to do next.
    const next = objective(state);
    if (this.find('message').textContent !== next) this.find('message').textContent = next;
    const message = warning(state.encounter);
    if (message !== this.warningText) { this.warningText = message; this.warningAt = performance.now(); }
    this.bannerSuppressed = ['dialogue', 'dance', 'grab', 'kill', 'dead'].includes(state.encounter.phase);
    this.renderBanner();
    this.find('suspicion').textContent = `${state.encounter.suspicion} / 100`;
    // Paranoia only shows while the bulb is in you.
    const high = state.trip > 0;
    this.find('paranoia-row').hidden = !high;
    this.find('paranoia-meter').hidden = !high;
    this.find<HTMLMeterElement>('paranoia-meter').value = state.paranoia;
    this.find('paranoia-name').textContent = state.paranoia > 80 ? 'LOSING IT' : state.paranoia > 50 ? 'THEY KNOW' : state.paranoia > 25 ? 'WATCHED' : 'UNEASY';
    this.viewport.classList.toggle('has-warning', Boolean(message));
    const blocked = ['dialogue', 'entering', 'blackout', 'kiss', 'dance', 'search', 'grab', 'kill', 'dead', 'tvshow', 'douse', 'hangout', 'offer', 'bulb'].includes(state.encounter.phase);
    this.find('views').inert = blocked;
    this.find('console').inert = blocked;
    this.find('pretend').inert = blocked;
  }

  // One box for everything: what you just did, and visitor warnings, share the top banner.
  // Whichever is newest shows; your action text stays up long enough to read, then the warning returns.
  say(message: string): void {
    this.said = message;
    this.saidAt = performance.now();
    this.saidUntil = this.saidAt + Math.max(3500, message.length * 55);
    this.renderBanner();
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.renderBanner(), this.saidUntil - this.saidAt + 20);
  }

  private renderBanner(): void {
    const banner = this.find('encounter-warning');
    const showSaid = Boolean(this.said) && performance.now() < this.saidUntil && this.saidAt >= this.warningAt;
    const text = showSaid ? this.said : this.warningText;
    banner.hidden = !text || this.bannerSuppressed;
    if (banner.textContent !== text) banner.textContent = text;
  }

  private said = '';
  private saidAt = 0;
  private saidUntil = 0;
  private warningText = '';
  private warningAt = 0;
  private bannerSuppressed = false;
  private bannerTimer = 0;
  private pieOwner = '';

  // The Sims-style pie: wedges fanned around the cursor, clamped inside the viewport.
  showPie(owner: string, clientX: number, clientY: number, title: string, wedges: Wedge[], pick: (wedge: Wedge) => void): void {
    const pie = this.find('pie');
    const rect = this.viewport.getBoundingClientRect();
    const radius = wedges.length > 4 ? 70 : 58;
    // The labels are wide and short, so the ring is too: wider than tall, wider still with five or more.
    const spread = radius * (wedges.length > 4 ? 1.75 : 1.3);
    const x = Math.max(spread + 80, Math.min(rect.width - spread - 80, clientX - rect.left));
    const y = Math.max(radius + 70, Math.min(rect.height - radius - 52, clientY - rect.top));
    this.pieOwner = owner;
    pie.replaceChildren();
    pie.style.left = `${x}px`;
    pie.style.top = `${y}px`;
    pie.style.setProperty('--r', `${radius}px`);
    const centre = document.createElement('div');
    centre.className = 'pie-title';
    centre.textContent = title;
    pie.append(centre);
    wedges.forEach((wedge, index) => {
      // Fan the options evenly around the click, starting straight up.
      const angle = -Math.PI / 2 + index / wedges.length * Math.PI * 2;
      const button = document.createElement('button');
      button.className = wedge.primary ? 'pie-wedge primary' : 'pie-wedge';
      button.setAttribute('role', 'menuitem');
      button.style.left = `${Math.cos(angle) * spread}px`;
      button.style.top = `${Math.sin(angle) * radius}px`;
      button.style.animationDelay = `${index * 18}ms`;
      button.innerHTML = `<b>${index + 1}</b>${icon(wedge.icon)}<span></span>`;
      button.querySelector('span')!.textContent = wedge.label;
      button.onclick = event => { event.stopPropagation(); pick(wedge); };
      pie.append(button);
    });
    pie.hidden = false;
    this.find('held').style.visibility = 'hidden';
    paintIcons();
  }

  hidePie(): void {
    this.pieOwner = '';
    this.find('pie').hidden = true;
    this.find('held').style.visibility = '';
  }

  get pieOpenFor(): string { return this.find('pie').hidden ? '' : this.pieOwner; }

  pickPieOption(index: number): void {
    this.find('pie').querySelectorAll<HTMLButtonElement>('.pie-wedge')[index]?.click();
  }

  // The card that pops up above a pocket slot when you pick the item up.
  showItemCard(owner: string, anchor: DOMRect, title: string, iconName: string, description: string, wedges: Wedge[], pick: (wedge: Wedge) => void): void {
    const card = this.find('item-card');
    this.itemCardOwner = owner;
    card.replaceChildren();
    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `${icon(iconName)}<strong></strong>`;
    head.querySelector('strong')!.textContent = title;
    const blurb = document.createElement('p');
    blurb.className = 'card-blurb';
    blurb.textContent = description;
    const hint = document.createElement('p');
    hint.className = 'card-hint';
    hint.textContent = 'You are holding it. Click anything in the room to use it there.';
    card.append(head, blurb);
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    for (const wedge of wedges) {
      const button = document.createElement('button');
      button.className = wedge.primary ? 'card-action primary' : 'card-action';
      button.setAttribute('role', 'menuitem');
      button.innerHTML = `${icon(wedge.icon)}<span></span>`;
      button.querySelector('span')!.textContent = wedge.label;
      button.onclick = event => { event.stopPropagation(); pick(wedge); };
      actions.append(button);
    }
    card.append(actions, hint);
    card.hidden = false;
    paintIcons();
    const width = card.offsetWidth;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2));
    card.style.left = `${left}px`;
    card.style.top = `${Math.max(8, anchor.top - card.offsetHeight - 12)}px`;
    card.style.setProperty('--arrow', `${anchor.left + anchor.width / 2 - left}px`);
  }

  hideItemCard(): void {
    this.itemCardOwner = '';
    this.find('item-card').hidden = true;
  }

  get itemCardFor(): string { return this.find('item-card').hidden ? '' : this.itemCardOwner; }
  private itemCardOwner = '';

  // The item you are holding rides along with the cursor.
  setHeld(label: string | null, iconName = ''): void {
    const held = this.find('held');
    held.hidden = !label;
    if (label) held.innerHTML = `${icon(iconName)}<span></span>`;
    if (label) { held.querySelector('span')!.textContent = label; paintIcons(); }
  }

  moveHeld(clientX: number, clientY: number): void {
    const held = this.find('held');
    held.style.transform = `translate(${clientX + 14}px, ${clientY + 16}px)`;
  }

  showStab(visible: boolean): void { this.find('stab').hidden = !visible; }
  showSnatch(visible: boolean): void { this.find('snatch').hidden = !visible; }

  // Purely visual: brown slop over the screen when they rub your face in it.
  slop(): void {
    const overlay = this.find('vomit');
    overlay.classList.remove('active', 'slop');
    void overlay.offsetWidth;
    overlay.classList.add('active', 'slop');
  }

  // Purely visual: a red flash each time a blow lands.
  hurt(fatal = false): void {
    this.viewport.classList.remove('hurt', 'hurt-fatal');
    void this.viewport.offsetWidth;
    this.viewport.classList.add(fatal ? 'hurt-fatal' : 'hurt');
  }

  // 0 = clear, 1 = black. Driven every frame from game state, so it pauses with the game.
  setFade(amount: number): void {
    const overlay = this.find('fade');
    const value = amount.toFixed(3);
    if (overlay.style.opacity !== value) overlay.style.opacity = value;
  }

  // The trip, every frame: how high (0-1), how paranoid (0-100), the hue drift and the heartbeat throb.
  setTrip(level: number, paranoia: number, hue: number, pulse: number): void {
    this.viewport.classList.toggle('tripping', level > 0);
    if (level <= 0) return;
    const style = this.viewport.style;
    style.setProperty('--trip', level.toFixed(3));
    style.setProperty('--paranoia', (paranoia / 100).toFixed(3));
    style.setProperty('--hue', `${hue.toFixed(1)}deg`);
    style.setProperty('--pulse', pulse.toFixed(3));
  }

  // Purely visual: the white-out of the hit.
  whiteout(): void {
    this.viewport.classList.remove('whiteout');
    void this.viewport.offsetWidth;
    this.viewport.classList.add('whiteout');
  }

  // Purely visual: a hard flash and lurch when the door bangs open.
  jolt(): void {
    this.viewport.classList.remove('jolt');
    void this.viewport.offsetWidth;
    this.viewport.classList.add('jolt');
  }

  // Purely visual: restarts the splatter animation.
  vomit(): void {
    const overlay = this.find('vomit');
    overlay.classList.remove('active', 'slop');
    void overlay.offsetWidth;
    overlay.classList.add('active');
  }

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