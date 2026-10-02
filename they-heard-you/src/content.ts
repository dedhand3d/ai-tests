import type { GameState, HotspotId, ItemId, ViewId } from './state';
import { isFree, stage } from './state';
import { TV_DIAL, tuned } from './channels';

export const VIEWS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'seat', label: 'Your seat', icon: 'armchair' },
  { id: 'kitchen', label: 'Kitchenette', icon: 'cooking-pot' },
  { id: 'bracket', label: 'Floor fitting', icon: 'link' },
  { id: 'dinette', label: 'Dinette / TV', icon: 'tv' },
  { id: 'rear', label: 'Rear bunk', icon: 'bed-single' },
];

export const ITEMS: Record<ItemId, { name: string; icon: string; description: string }> = {
  screwdriver: { name: 'Screwdriver', icon: 'wrench', description: 'Cletus left this flat screwdriver in the kitchen drawer after refastening the chain.' },
  spoon: { name: 'Bent spoon', icon: 'utensils', description: 'A dull spoon with a broad, flat handle. Found under your seat cushion.' },
  rag: { name: 'Filthy rag', icon: 'shirt', description: 'Stiff at the edges. Soft in the middle. Best not to investigate. Found in the kitchen drawer.' },
  brassKey: { name: 'Brass key', icon: 'key', description: 'A little brass key, greasy from years inside a pizza box. Opens something small and locked.' },
  finalKey: { name: 'Cuff key', icon: 'key-round', description: 'A big old brass key on a snapped greasy shoelace, still warm from Cletus\'s neck. It fits the cuff.' },
  magnet: { name: 'Fridge magnet', icon: 'magnet', description: 'MELT-IN-YOUR-MOUTH-MABEL\'S DINER, laminated. Mabel has been dead since the Clinton administration. Useless.' },
  beenie: { name: 'Baby shoe', icon: 'baby', description: 'One beaded baby shoe. There is no baby here. There has never been a baby. Useless, and worse than useless: sad.' },
  lotto: { name: 'Losing ticket', icon: 'ticket', description: 'A losing scratch ticket. Three matching symbols and a prize somebody already spent on cigarettes. Useless.' },
  choke: { name: 'Smutty paperback', icon: 'book-open', description: 'CHOKE ON MY LOVE: a purple romance novel doing something illegal in fourteen states. Useless for escaping. Great for morale, allegedly.' },
  dildo: { name: 'Dildo', icon: 'banana', description: 'The poopy stinky dildo from beside the sink. Currently stored somewhere nobody will ever look. You walk very carefully now.' },
  zwinkys: { name: 'Zwinkys Malt Liquor', icon: 'beer', description: 'A can of Zwinkys Malt Liquor with some ash in it, but there\'s a little sip left. The can says BREWED WITH PRIDE. Pride is doing a lot of work there.' },
  butt: { name: 'Cigarette butt', icon: 'cigarette', description: 'A cigarette butt from the emergency ashtray. Somebody chewed the filter flat. Useless, and somehow still smoldering emotionally.' },
  bobbyPins: { name: 'Bobby pins', icon: 'paperclip', description: 'Two bent bobby pins, tangled in ash. Thin, springy, and roughly the shape of a bad idea for a cheap padlock.' },
  usedNeedles: { name: 'Used needles', icon: 'syringe', description: 'Used needles from a pizza box, held by the very ends. Nobody here is getting stuck with these. Especially not you.' },
  remote: { name: 'TV remote', icon: 'tv', description: 'A TV remote held together with electrical tape and something sticky. Most of the buttons are gone. Power, channel and mute still work.' },
  lighter: { name: 'Darlene\'s lighter', icon: 'flame', description: 'A pink plastic lighter shaped like a naked lady, worn smooth by a thousand panicked thumbs. The one she screams about. It was in her hand the whole time. It works. Everything in here is paper, grease or plastic.' },
  axe: { name: 'Axe', icon: 'axe', description: 'A short, heavy hatchet from the padlocked cabinet. There is hair on the blade. The front door is plywood and bad decisions.' },
};

export const HOTSPOTS: Record<HotspotId, string> = {
  screwdriver: 'Screwdriver', belongings: 'Confiscated belongings',
  brassKey: 'Brass key', finalKey: 'Heavy key', magnet: 'Fridge magnet', beenie: 'Baby shoe', lotto: 'Losing ticket', choke: 'Smutty paperback',
  drawer: 'Kitchen drawer', cushion: 'Seat cushion', spoon: 'Bent spoon', rag: 'Filthy rag',
  bracket: 'Corroded floor fitting', cuff: 'Your cuff', seat: 'Stinky Pee Couch', tv: 'TV',
  door: 'Entry door', hatch: 'Emergency hatch', ashtray: 'Emergency ashtray', notice: 'House rules',
  pizza: 'Pizza box', pizzaRear: 'Pizza box', trash: 'Trash bags', floorPapers: 'Floor papers', cans: 'Can of Zwinkys Malt Liquor',
  'cab-k1': 'Lower cabinet', 'cab-k2': 'Lower cabinet 2', 'cab-k3': 'Lower cabinet 3',
  'cab-u1': 'Upper cabinet', 'cab-u2': 'Upper cabinet 2', 'cab-u3': 'Upper cabinet 3',
  rearCab: 'Footlocker', needles: 'Discarded needles', dildo: 'Something awful on the counter', axe: 'Axe', lighter: 'Darlene\'s lighter',
  wall1: 'Wallpaper', wall2: 'Wallpaper', wall3: 'Wallpaper', ronnie: 'Ronnie',
  puddle: 'Your puke', blinds: 'Blinds', radio: 'Dale\'s radio',
};

// Names that change with what you have done to them.
export function itemName(item: ItemId, state: GameState): string {
  if (item === 'rag' && state.ragSoiled) return 'Puke rag';
  if (state.wrapped === item) return `${ITEMS[item].name} (muffled)`;
  return ITEMS[item].name;
}

const RUMMAGE_DONE = 'Picked clean. Nothing left here but the smell.';

const BURNT: Partial<Record<HotspotId, string>> = {
  floorPapers: 'A black, wet crater of ash where your debts used to be. The floor underneath is scorched in the shape of a bad decision.',
  trash: 'One of the bags is a melted black blob fused to the floor, still weeping dishwater. It smells like burnt taco and consequences.',
  pizza: 'A charred, bubbled lump that used to be a PIZZA REGRETS box. Somehow it still smells better than the couch.',
  pizzaRear: 'The rear pizza box is a black, soggy husk. The grease burned blue. Ronnie watched the whole thing and has not blinked since.',
};

// What things look like with the bulb in you.
const TRIPPING: Partial<Record<HotspotId, string>> = {
  ronnie: 'Ronnie\'s face is sliding slowly down into the couch like candle wax. He winks at you. Ronnie has never winked. Ronnie does not have the muscles to wink.',
  tv: 'The anchor stops reading the news, turns, and looks straight at you through the glass. She mouths: we see you. Then she goes back to the news like nothing happened.',
  seat: 'The stains on the couch are making a face. It is your face. It looks worried about you.',
  door: 'Light is leaking around the frame in long fingers. Something on the other side is breathing in time with you. Probably. Maybe.',
  radio: 'The speaker cones are pulsing like two big black hearts. Fine Again. It has always been Fine Again. It will always be Fine Again.',
  wall1: 'The flyer\'s letters are crawling off the paper one at a time and lining up on the wall to spell your name wrong.',
  wall2: 'The list has a fourth item now, in fresh ink: 4. WATCH HIM. You are almost sure it was not there before.',
  wall3: 'In the crayon drawing, the people outside the RV have turned around. They are all looking at your window. So is the RV.',
};

export function inspect(id: HotspotId, state: GameState): string {
  const burnt = BURNT[id];
  if (burnt && state.burnt[id as keyof GameState['burnt']]) return burnt;
  const tripping = TRIPPING[id];
  if (tripping && state.trip > 0 && (id !== 'tv' || state.tvOn)) return tripping;
  switch (id) {
    case 'radio': return state.radioOn ? 'Dale\'s boombox, duct-taped together, playing Fine Again on a loop because it is the only tape Dale owns. It covers the sound of your work. Mostly.' : 'Dale\'s boombox, switched off, sulking. One cassette in it. You know which one.';
    case 'screwdriver': return ITEMS.screwdriver.description;
    case 'belongings': return 'Your emptied pockets, bundled in the kitchen drawer. Recover them. He left fresh scrape marks across the floor.';
    case 'drawer': return state.drawerOpen ? 'A rag and six bottle caps. Somebody wrote SHUT THE FUCKING DRAWER above it. A welcoming home.' : 'The drawer is within reach. The handle is greasy; the threat above it is unusually legible.';
    case 'cushion': return state.cushionRaised ? 'A spoon-shaped clean patch. The cushion was hiding more than its smell.' : 'A hard lump under a cushion with the texture of an old kitchen sponge. You can lift it.';
    case 'spoon': return ITEMS.spoon.description;
    case 'rag': return ITEMS.rag.description;
    case 'brassKey': return ITEMS.brassKey.description;
    case 'finalKey': return ITEMS.finalKey.description;
    case 'magnet': return ITEMS.magnet.description;
    case 'beenie': return ITEMS.beenie.description;
    case 'lotto': return ITEMS.lotto.description;
    case 'choke': return ITEMS.choke.description;
    case 'axe': return ITEMS.axe.description;
    case 'lighter': return 'Darlene\'s lighter, lying on the floor where she flung it. Pink. Naked lady. Still warm.';
    case 'puddle': return 'A puddle of your own puke by the couch, slowly finding the low spots in the floor. If they walk in on this, they will make you clean it. With your face.';
    case 'blinds': return 'Bent aluminum blinds, furred with nicotine. Through the gaps: yard, weeds, a propane tank and whoever is pacing out there.';
    case 'pizzaRear': return state.usedNeedles === 'pizzaRear' ? 'There are used needles in the box' : 'An empty pizza box that used to hold needles. It still holds the vibe.';
    case 'bracket': return isFree(state) ? 'The floor fitting is loose. The padlock and cuff are not. You can lay the fitting back over its old marks at your seat.' : 'The padlock is solid. The floor fitting is not. A broad slot in the corroded fitting looks about spoon-handle wide.';
    case 'cuff': return state.cuffOpen ? 'The cuff hangs open. Your wrist remembers being owned.' : 'A steel cuff around your wrist, chained to the floor fitting. The keyhole is big, old and brass. Not a spoon job.';
    case 'seat': return 'Your assigned accommodation. A seat, a cuff, and a view of everybody else\'s bullshit.';
    case 'tv': {
      if (!state.tvOn) return state.tvShown ? 'The TV is off. Your face is still burned into the glass a little.' : 'A dead TV with a crack across the glass. The channel knob snapped off long ago, but there is a power button and a volume rocker on the side, if you can get up to it.';
      const airing = tuned(state.tvChannel, state.tvClock);
      return airing ? airing.clip.look : `Channel ${TV_DIAL[state.tvChannel].number}: snow, and a hiss like a pan of bacon. The rabbit ears are not reaching anything out here.`;
    }
    case 'door': return 'Locked from outside. A strip of cold light under the frame. Beyond it, someone is arguing about a missing amplifier.';
    case 'hatch': return 'EMERGENCY EXIT, glued shut along every seam and duct-taped in a big X. Somebody wrote NOPE on the tape. It is not an exit. It was never an exit.';
    case 'ashtray': return 'DO NOT TOUCH THE EMERGENCY ASHTRAY. Apparently the ordinary ashtrays cannot be trusted in a crisis.';
    case 'notice': return 'HOME SWEET CODE VIOLATION. Finally, something in here that is not a lie.';
    case 'ronnie': return 'Ronnie watches you from the couch. His eyes are the only clean thing in here. He points at nothing and everything.';
    case 'pizza': return state.rummaged.pizza ? 'The box yawns open. Fossilized crust and one gray pepperoni, curled up like it is trying to leave.' : 'A pizza box from PIZZA REGRETS. The lid is swollen shut with age. You could dig through it.';
    case 'trash': return state.rummaged.trash ? RUMMAGE_DONE : 'Three swollen trash bags, tied with band-aids. Something inside one of them is breathing wrong. You could dig through them.';
    case 'floorPapers': return state.rummaged.floorPapers ? RUMMAGE_DONE : 'A drift of papers by your feet: overdue notices, threats, a church flyer with a phone number scratched out. You could shuffle through them.';
    case 'cans': return state.rummaged.cans ? RUMMAGE_DONE : 'A counter full of crushed cans. One of them sloshes. You do not want to know. You could still shuffle through them.';
    case 'cab-k1': return state.cabinets['k1'] ? (state.magnet === 'cab-k1' ? 'Inside: mouse turds, a pistol cleaning rod with no pistol, and a MELT-IN-YOUR-MOUTH-MABEL\'S fridge magnet.' : 'Inside: mouse turds and a pistol cleaning rod. No pistol. It is that kind of household.') : 'A lower cabinet. The hinge has given up on one side.';
    case 'cab-k2': return state.cabinets['k2'] ? 'Inside: a loaf of bread that has become a science exhibit. The mold has mold. You salute it and move on.' : 'A lower cabinet. Something inside it shifted when the door opened. Something with mass.';
    case 'cab-k3': return state.cabinets['k3'] ? 'Inside: forty packets of taco sauce, one battery of unknown aliveness, and a photograph of a boat.' : 'A lower cabinet. It is taped shut with a band-aid. That is the security system.';
    case 'cab-u1': return state.cabinets.u1 ? 'Inside: a single can of creamed corn from a store that burned down. Expired in a different millennium.' : 'An upper cabinet, door hanging drunk on one hinge.';
    case 'cab-u2': return state.cabinets.u2 ? (state.beenie === 'cab-u2' ? 'Inside: a baby shoe with beads on it. There is no baby. There has never been a baby.' : 'Inside: empty, except for the feeling that a tiny shoe used to watch you from here.') : 'An upper cabinet. It smells like a nursery in a haunted house.';
    case 'cab-u3': return state.cabinets.u3 ? 'Inside: a coffee can full of mysterious pills, none labeled, all judgmental. You leave them exactly where they are.' : 'An upper cabinet. It rattles when the trailer breathes.';
    case 'rearCab': return state.cabinetUnlocked ? (state.axe === 'cabinet' ? 'The footlocker hangs open. Inside: an axe with hair on the blade, CHOKE ON MY LOVE, and a note in marker: KEY STAYS ON CLETUS. ALWAYS.' : 'The open footlocker. A note in marker: KEY STAYS ON CLETUS. ALWAYS. Somebody underlined ALWAYS three times.') : 'An army footlocker at the foot of the bunk with a cheap padlock on it. Something thin and springy would pick it, if your hands would hold still.';
    case 'needles': return 'A foil dish of discarded needles under the dinette bench, points up, like the world\'s worst flower arrangement. You keep your hands to yourself.';
    case 'dildo': return 'On the counter, next to the sink where dishes should be, sits an unwashed purple monstrosity. It has its own gravity. You will not be using the sink.';
    case 'wall1': return 'A church flyer: RED CREEK REVIVAL, COME AS YOU ARE. The phone number is scratched out and replaced with BRING CANS.';
    case 'wall2': return 'A handwritten list, nailed up like scripture: 1. FEED RONNIE. 2. HIDE THE GOOD SPOONS. 3. NO COPS. Item two is underlined twice.';
    case 'wall3': return 'A child\'s crayon drawing of the RV. Everyone outside is smiling. Someone has drawn bars on your window in black crayon.';
    default: return 'You look. You wish you had not.';
  }
}

// What to do next, one line, always on screen. Follows the escape's stages (state.ts stage()).
export function objective(state: GameState): string {
  if (state.escaped) return 'You got out.';
  if (!isFree(state) && !state.cabinetUnlocked) {
    if (!state.introDone && state.spoon !== 'inventory') return 'NEXT: You are chained to the floor. Find something flat to work the floor fitting with. Try the seat cushion.';
    if (!state.introDone) return 'NEXT: Work the floor fitting with the spoon. Hold the spoon, click the fitting.';
    if (state.screwdriver === 'drawer') return 'NEXT: Cletus left his screwdriver in the kitchen drawer. Use it on the floor fitting until it comes loose.';
    if (state.screwdriver === 'stash' || state.spoon === 'stash') return 'NEXT: Your things are bundled in the kitchen drawer. Get them, then work the floor fitting loose again.';
    return 'NEXT: Work the floor fitting loose. Someone always comes when you make noise: get back on the couch and Pretend restrained.';
  }
  switch (stage(state)) {
    case 1:
      if (state.lighter === 'darlene') return 'NEXT: You can reach the back now. Look around, and get back on the couch when you hear running.';
      if (state.bobbyPins !== 'inventory') return 'NEXT: The footlocker in the back room is padlocked. Something thin from the emergency ashtray on the dinette could pick it.';
      if (state.steady <= 0) return state.lighter === 'inventory' ? 'NEXT: Your hands shake too hard to pick a lock. Smoke the cigarette butt to steady them, then pick the footlocker.' : 'NEXT: Your hands shake too hard to pick a lock. Darlene threw her lighter on the floor by the couch: grab it and smoke the butt.';
      return 'NEXT: Hands steady. Go to the back room and use the bobby pins on the footlocker, quick.';
    case 2: return state.axe === 'cabinet' ? 'NEXT: Take the axe from the footlocker. The note says the cuff key stays on Cletus. Wait on the couch for him.' : 'NEXT: The cuff key is on Cletus. Wait on the couch, Pretend restrained, and see what he does.';
    case 3: return state.finalKey === 'inventory' ? 'NEXT: You have the cuff key. Use it on your cuff at the floor fitting.' : 'NEXT: The key hangs on a shoelace around Cletus\'s neck. Be on the couch when he comes back. Watch him closely.';
    case 4: return state.radio === 'none' ? 'NEXT: The door is braced with steel. Sober, you cannot chop through it. Wait on the couch: somebody is bound to come by with something to help.' : 'NEXT: The door is braced with steel. You need to be stronger than you are. Dale offers his bulb: take the hit next time he does.';
    default: return state.wrapped === 'axe' ? 'NEXT: GO. Chop the entry door with the axe. Stare down the shadows.' : 'NEXT: GO. Chop the entry door with the axe while you are this strong. Stare down the shadows. Wrapping the axe in the rag keeps it quieter.';
  }
}

export function hints(state: GameState): string[] {
  const next = objective(state).replace('NEXT: ', '');
  if (!isFree(state) && !state.cabinetUnlocked) {
    if (state.spoon !== 'inventory' && !state.introDone) return [
      'The chain gives you just enough room to search your seat and the nearby drawer.',
      'There is a hard lump under the seat cushion.',
      'At Your seat, use the cushion to lift it, then grab the spoon from underneath. Hold it and click the floor fitting.',
    ];
    return [
      'The padlock is not the weak point. The floor fitting is. And noise brings company.',
      'When you hear footsteps, click Your seat and then Pretend restrained, before the door opens.',
      next,
    ];
  }
  switch (stage(state)) {
    case 1: return [
      'The footlocker at the foot of the bunk is padlocked, and your hands are shaking.',
      'Bobby pins and a cigarette butt are in the emergency ashtray on the dinette. Darlene\'s lighter turns up when she does.',
      next,
    ];
    case 2: return ['The note in the footlocker tells you who has the key.', 'Cletus will come back. Be on the couch when he does.', next];
    case 3: return [
      'The key is on a shoelace around Cletus\'s neck. Shoelaces do not last forever.',
      'His next visit is a performance. When the key comes loose, press the GRAB THE KEY button (or Space).',
      next,
    ];
    case 4: return ['Sober, the door just rings. You need tweaker strength.', 'Dale shares what he has. Take the hit when he offers.', next];
    default: return [
      'Every swing counts double while you are high. Three swings and you are through.',
      'Muffle the axe with the rag, keep Dale\'s radio on, and click every shadow before it reaches you.',
      next,
    ];
  }
}
export const OUTSIDE_LINES = [
  { at: 18, text: '[Outside, left] Cletus: "The moon is a replacement, Darlene. The real one is in a warehouse outside Reno."' },
  { at: 46, text: '[Outside, toward the door] Darlene: "And I suppose the government told the moon to hide. Sit down before you fall down."' },
  { at: 83, text: '[Outside, behind the RV] Cletus: "The fifth dimension is between the fridge and the wall. That is where the forks go."' },
  { at: 129, text: '[Outside, left] Darlene: "If you touch my ashtray again I will bury you in the yard with the other one."' },
];
