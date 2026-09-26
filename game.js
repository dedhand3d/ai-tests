const cashEl = document.getElementById('cash');
const resolveEl = document.getElementById('resolve');
const trustEl = document.getElementById('trust');
const stabilityEl = document.getElementById('stability');
const sceneTitleEl = document.getElementById('sceneTitle');
const sceneTextEl = document.getElementById('sceneText');
const storyTextEl = document.getElementById('storyText');
const choicesEl = document.getElementById('choices');
const inventoryEl = document.getElementById('inventory');
const restartButton = document.getElementById('restartButton');

const state = {
  cash: 12,
  resolve: 2,
  trust: 1,
  stability: 1,
  inventory: ['dirty lighter'],
  currentLocation: 'bench',
  route: 0,
  ended: false,
};

const scenes = {
  bench: {
    title: 'The Bench',
    text: 'A concrete bench sits under a dead streetlamp, and two people are arguing with the same tired voice they used last week.',
    story: 'Mara is sorting bottles again. She says the city owes her something, and you can tell she is choosing whether to trust you today.',
    choices: [
      {
        label: 'Help Mara sort bottles for cash',
        result: 'You trade a few hours of work for a little money and a little dignity. Mara laughs, not because it is funny, but because it is the first honest thing the block has heard all night.',
        apply: { cash: 6, trust: 1, resolve: 1 },
        inventory: ['half a sandwich'],
      },
      {
        label: 'Sit in silence and keep your head down',
        result: 'The block keeps moving around you. Nothing changes, but nothing burns out either. You save your energy for the next move.',
        apply: { resolve: 1, stability: 1 },
      },
      {
        label: 'Ask if the city gave her anything good lately',
        result: 'She shrugs and says, “Only our names.” It lands harder than expected. You walk away with a little more sense and a little less hope.',
        apply: { trust: 1, resolve: -1 },
      },
    ],
  },
  payphone: {
    title: 'The Payphone',
    text: 'The handset has one of those cracked plastic faces that always look like they are about to confess something.',
    story: 'A counselor can still be reached, if you can get a quarter, a calm voice, and the nerve to ask for help without sounding too desperate.',
    choices: [
      {
        label: 'Call the recovery line',
        result: 'You get a real person on the other end, and that is rare enough to feel like a miracle. They offer a pickup list and a place to sleep if you can make it to the intake desk by dawn.',
        apply: { trust: 1, stability: 1 },
        inventory: ['intake slip'],
      },
      {
        label: 'Call a friend from the old block',
        result: 'The line clicks, then goes dead. You leave with the same empty pocket and a slightly lighter heart. The city always keeps some distance.',
        apply: { cash: 2, resolve: 1 },
      },
      {
        label: 'Use the change on coffee instead',
        result: 'It does not fix the night, but it keeps your hands steady for another hour. Sometimes survival is a warm cup and a long breath.',
        apply: { cash: -3, stability: 1 },
        inventory: ['hot coffee'],
      },
    ],
  },
  shelter: {
    title: 'The Shelter Line',
    text: 'The line is a river of tired faces and borrowed blankets, all waiting for a cot and a half-decent answer to the same question: “Who gets a bed tonight?”',
    story: 'There is a chance to sleep inside, but on this block, every bed comes with conditions, paperwork, and a little shame.',
    choices: [
      {
        label: 'Stand in line and accept the bed',
        result: 'The intake worker marks your name down, and you get an actual mattress and a little time away from the weather. It is not a miracle, just a quiet one.',
        apply: { stability: 2, trust: 1 },
        inventory: ['shelter pass'],
      },
      {
        label: 'Skip the line and keep moving',
        result: 'You decide the cold is a better friend than the bureaucracy. You stay alive, if not a little more exhausted.',
        apply: { resolve: 1, stability: -1 },
      },
      {
        label: 'Trade a favor for a head start',
        result: 'Someone on the line sees a chance to be useful and hands you a better spot in exchange for a few minutes of work. The city keeps teaching everyone to be transactional.',
        apply: { cash: 2, trust: 1 },
      },
    ],
  },
  bodega: {
    title: 'The Corner Store',
    text: 'The fluorescent lights buzz like a wasp nest. The clerk watches the whole block through one tired eye.',
    story: 'The bodega has stale pastries, instant noodles, and a freezer full of cheap food that can keep your body from becoming a warning sign.',
    choices: [
      {
        label: 'Buy a bag of rice and a can of beans',
        result: 'Your stomach settles for a while. The old man behind the counter says, “Good choice,” like it is a very serious piece of advice.',
        apply: { cash: -5, stability: 1 },
        inventory: ['beans', 'rice'],
      },
      {
        label: 'Buy a poor man’s breakfast and a paper cup of coffee',
        result: 'The sugar floods your system, but it is enough to get you through the next hour. You are still walking a thin line, but now it is a line with coffee on it.',
        apply: { cash: -4, resolve: 1 },
        inventory: ['coffee', 'pastry'],
      },
      {
        label: 'Steal a can from the back shelf',
        result: 'You get the can, but the clerk catches you. The confrontation drops your trust and leaves you with a hot face and a colder walk home.',
        apply: { trust: -1, resolve: -1 },
      },
    ],
  },
  alley: {
    title: 'The Alley Mouth',
    text: 'The alley smells like wet metal and old smoke. Someone has written “stay alive” on the wall with a marker that is almost out of ink.',
    story: 'This is where the block tells the truth: every choice here is a gamble with your future, your body, and your friends.',
    choices: [
      {
        label: 'Check on a passed-out friend and drag them into the light',
        result: 'You get them awake and breathing. The night goes from stupid to dangerous in about thirty seconds, but you both make it home to the same city another day.',
        apply: { trust: 1, stability: 1 },
      },
      {
        label: 'Keep moving and save your strength',
        result: 'You refuse to get pulled into someone else’s disaster. From a distance, survival looks like selfishness; up close, it is just arithmetic.',
        apply: { resolve: 1 },
      },
      {
        label: 'Sell your last decent thing for a little cash',
        result: 'You part with the one piece of dignity you had left. The money helps for a few hours, and the punch to the ego lasts much longer.',
        apply: { cash: 8, trust: -1, stability: -1 },
      },
    ],
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function updateStats() {
  cashEl.textContent = String(state.cash);
  resolveEl.textContent = String(state.resolve);
  trustEl.textContent = String(state.trust);
  stabilityEl.textContent = String(state.stability);
}

function renderInventory() {
  inventoryEl.innerHTML = '';
  if (state.inventory.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'empty pockets';
    inventoryEl.appendChild(li);
    return;
  }

  state.inventory.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    inventoryEl.appendChild(li);
  });
}

function updateStory(location) {
  const scene = scenes[location];
  const current = state.currentLocation;

  sceneTitleEl.textContent = scene.title;
  sceneTextEl.textContent = scene.text;
  storyTextEl.textContent = scene.story;

  if (current === 'bench' && state.route > 0) {
    storyTextEl.textContent = 'The block is beginning to know your face. This is the part where luck either decides to be kind or reminds you that it is not your friend.';
  }

  choicesEl.innerHTML = '';
  scene.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.textContent = choice.label;
    button.addEventListener('click', () => applyChoice(choice));
    choicesEl.appendChild(button);
  });
}

function applyChoice(choice) {
  if (state.ended) return;

  state.cash = clamp(state.cash + (choice.apply.cash || 0), 0, 999);
  state.resolve = clamp(state.resolve + (choice.apply.resolve || 0), 0, 10);
  state.trust = clamp(state.trust + (choice.apply.trust || 0), 0, 10);
  state.stability = clamp(state.stability + (choice.apply.stability || 0), 0, 10);

  if (choice.inventory) {
    choice.inventory.forEach((item) => {
      if (!state.inventory.includes(item)) {
        state.inventory.push(item);
      }
    });
  }

  state.route += 1;
  updateStats();
  renderInventory();

  const result = document.createElement('p');
  result.textContent = choice.result;
  result.style.marginTop = '14px';
  result.style.color = '#f3ede3';
  result.style.lineHeight = '1.6';
  choicesEl.appendChild(result);

  checkEnding();
}

function checkEnding() {
  if (state.route < 5) {
    return;
  }

  state.ended = true;

  const endingText = state.stability >= 5 && state.trust >= 4
    ? 'You make it through the night by choosing care over chaos. The city does not forgive you, but it does let you keep walking.'
    : state.cash >= 20
      ? 'You scrape together enough for a real meal, a decent night, and a tiny pocket of hope. The block still looks ugly, but you are no longer on the edge of it.'
      : 'The night leaves you bruised and poorer, but alive enough to try again. That is the best kind of luck in a city like this.';

  sceneTitleEl.textContent = 'End of Night';
  sceneTextEl.textContent = 'The first light of morning arrives over the rooftops and nobody gets to call it noble.';
  storyTextEl.textContent = endingText;
  choicesEl.innerHTML = '<button class="choice-button">Run it again</button>';
  choicesEl.querySelector('button').addEventListener('click', () => resetGame());
}

function handleLocationClick(event) {
  if (state.ended) return;
  const location = event.target.dataset.loc;
  if (!location) return;
  state.currentLocation = location;
  updateStory(location);
}

function resetGame() {
  state.cash = 12;
  state.resolve = 2;
  state.trust = 1;
  state.stability = 1;
  state.inventory = ['dirty lighter'];
  state.currentLocation = 'bench';
  state.route = 0;
  state.ended = false;
  updateStats();
  renderInventory();
  updateStory('bench');
}

document.querySelectorAll('.hotspot').forEach((button) => {
  button.addEventListener('click', handleLocationClick);
});

restartButton.addEventListener('click', resetGame);

updateStats();
renderInventory();
updateStory('bench');
