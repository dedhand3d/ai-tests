import type { GameState, HotspotId, ItemId, ViewId } from './state';
import { isFree } from './state';

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
  finalKey: { name: 'Heavy key', icon: 'key-round', description: 'A big old key on a twine loop, from the padlocked rear cabinet. It fits the cuff.' },
  magnet: { name: 'Fridge magnet', icon: 'magnet', description: 'MELT-IN-YOUR-MOUTH-MABEL\'S DINER, laminated. Mabel has been dead since the Clinton administration. Useless.' },
  beenie: { name: 'Baby shoe', icon: 'baby', description: 'One beaded baby shoe. There is no baby here. There has never been a baby. Useless, and worse than useless: sad.' },
  lotto: { name: 'Losing ticket', icon: 'ticket', description: 'A losing scratch ticket. Three matching symbols and a prize somebody already spent on cigarettes. Useless.' },
  choke: { name: 'Smutty paperback', icon: 'book-open', description: 'CHOKE ON MY LOVE: a purple romance novel doing something illegal in fourteen states. Useless for escaping. Great for morale, allegedly.' },
};

export const HOTSPOTS: Record<HotspotId, string> = {
  screwdriver: 'Screwdriver', belongings: 'Confiscated belongings',
  brassKey: 'Brass key', finalKey: 'Heavy key', magnet: 'Fridge magnet', beenie: 'Baby shoe', lotto: 'Losing ticket', choke: 'Smutty paperback',
  drawer: 'Kitchen drawer', cushion: 'Seat cushion', spoon: 'Bent spoon', rag: 'Filthy rag',
  bracket: 'Corroded floor fitting', cuff: 'Your cuff', seat: 'Original seat', tv: 'Missing-person report',
  door: 'Entry door', hatch: 'Emergency hatch', ashtray: 'Emergency ashtray', notice: 'House rules',
  pizza: 'Pizza box', trash: 'Trash bags', floorPapers: 'Floor papers', cans: 'Counter cans',
  'cab-k1': 'Lower cabinet', 'cab-k2': 'Lower cabinet', 'cab-k3': 'Lower cabinet',
  'cab-u1': 'Upper cabinet', 'cab-u2': 'Upper cabinet', 'cab-u3': 'Upper cabinet',
  rearCab: 'Padlocked cabinet', needles: 'Discarded needles', dildo: 'Something awful on the counter',
  wall1: 'Wall paper', wall2: 'Wall paper', wall3: 'Wall paper', ronnie: 'Ronnie',
};

const RUMMAGE_DONE = 'Picked clean. Nothing left here but the smell.';

export function inspect(id: HotspotId, state: GameState): string {
  switch (id) {
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
    case 'bracket': return isFree(state) ? 'The floor fitting is loose. The padlock and cuff are not. You can lay the fitting back over its old marks at your seat.' : 'The padlock is solid. The floor fitting is not. A broad slot in the corroded fitting looks about spoon-handle wide.';
    case 'cuff': return state.cuffOpen ? 'The cuff hangs open. Your wrist remembers being owned.' : 'A steel cuff around your wrist, chained to the floor fitting. The keyhole is big, old and brass. Not a spoon job.';
    case 'seat': return 'Your assigned accommodation. A seat, a cuff, and a view of everybody else\'s bullshit.';
    case 'tv': return 'COUNTY NEWS 4: Missing. Last seen in Red Creek County. They used the photo you hated. You would give anything to complain about it in person.';
    case 'door': return 'Locked from outside. A strip of cold light under the frame. Beyond it, someone is arguing about a missing amplifier.';
    case 'hatch': return state.cuffOpen ? 'EMERGENCY EXIT. The handle is gone, but the whole panel is loose and rattling. With the cuff open, you could shoulder it and go.' : 'EMERGENCY EXIT. The inside pull handle is missing. The mount is still there. Useless until this cuff is off.';
    case 'ashtray': return 'DO NOT TOUCH THE EMERGENCY ASHTRAY. Apparently the ordinary ashtrays cannot be trusted in a crisis.';
    case 'notice': return 'HOME SWEET CODE VIOLATION. Finally, something in here that is not a lie.';
    case 'ronnie': return 'Ronnie watches you from the couch. His eyes are the only clean thing in here. He points at nothing and everything.';
    case 'pizza': return state.rummaged.pizza ? 'The box yawns open. Fossilized crust, one gray pepperoni, and a key-shaped clean patch in the grease.' : 'A pizza box from PIZZA REGRETS. The lid is swollen shut with age. You could dig through it.';
    case 'trash': return state.rummaged.trash ? RUMMAGE_DONE : 'Three swollen trash bags, tied with band-aids. Something inside one of them is breathing wrong. You could dig through them.';
    case 'floorPapers': return state.rummaged.floorPapers ? RUMMAGE_DONE : 'A drift of papers by your feet: overdue notices, threats, a church flyer with a phone number scratched out. You could shuffle through them.';
    case 'cans': return state.rummaged.cans ? RUMMAGE_DONE : 'A counter full of crushed cans. One of them sloshes. You do not want to know. You could still shuffle through them.';
    case 'cab-k1': return state.cabinets['k1'] ? (state.magnet === 'cab-k1' ? 'Inside: mouse turds, a pistol cleaning rod with no pistol, and a MELT-IN-YOUR-MOUTH-MABEL\'S fridge magnet.' : 'Inside: mouse turds and a pistol cleaning rod. No pistol. It is that kind of household.') : 'A lower cabinet. The hinge has given up on one side.';
    case 'cab-k2': return state.cabinets['k2'] ? 'Inside: a loaf of bread that has become a science exhibit. The mold has mold. You salute it and move on.' : 'A lower cabinet. Something inside it shifted when the door opened. Something with mass.';
    case 'cab-k3': return state.cabinets['k3'] ? 'Inside: forty packets of taco sauce, one battery of unknown aliveness, and a photograph of a boat.' : 'A lower cabinet. It is taped shut with a band-aid. That is the security system.';
    case 'cab-u1': return state.cabinets.u1 ? 'Inside: a single can of creamed corn from a store that burned down. Expired in a different millennium.' : 'An upper cabinet, door hanging drunk on one hinge.';
    case 'cab-u2': return state.cabinets.u2 ? (state.beenie === 'cab-u2' ? 'Inside: a baby shoe with beads on it. There is no baby. There has never been a baby.' : 'Inside: empty, except for the feeling that a tiny shoe used to watch you from here.') : 'An upper cabinet. It smells like a nursery in a haunted house.';
    case 'cab-u3': return state.cabinets.u3 ? 'Inside: a coffee can full of mysterious pills, none labeled, all judgmental. You leave them exactly where they are.' : 'An upper cabinet. It rattles when the trailer breathes.';
    case 'rearCab': return state.cabinetUnlocked ? (state.finalKey === 'cabinet' ? 'The padlock hangs open. Inside: a heavy key on a twine loop, and a purple paperback titled CHOKE ON MY LOVE.' : 'The unlocked cabinet. Just the smell and a paperback-shaped absence now.') : 'A little cabinet by the bunk, shut with a brass padlock. The kind of lock a brass key would laugh at.';
    case 'needles': return 'A foil dish of discarded needles under the dinette bench, points up, like the world\'s worst flower arrangement. You keep your hands to yourself.';
    case 'dildo': return 'On the counter, next to the sink where dishes should be, sits an unwashed purple monstrosity. It has its own gravity. You will not be using the sink.';
    case 'wall1': return 'A church flyer: RED CREEK REVIVAL, COME AS YOU ARE. The phone number is scratched out and replaced with BRING CANS.';
    case 'wall2': return 'A handwritten list, nailed up like scripture: 1. FEED RONNIE. 2. HIDE THE GOOD SPOONS. 3. NO COPS. Item two is underlined twice.';
    case 'wall3': return 'A child\'s crayon drawing of the RV. Everyone outside is smiling. Someone has drawn bars on your window in black crayon.';
    default: return 'You look. You wish you had not.';
  }
}

export function hints(state: GameState): string[] {
  if (state.cuffOpen) return [
    'The cuff is open. The front door is locked. That leaves exactly one way out.',
    'The rear emergency hatch rattles. It is just held shut by its own bad attitude.',
    'Go to the rear bunk, then Use the hatch. And go. Go now.',
  ];
  if (state.cabinetUnlocked || state.finalKey !== 'cabinet') return [
    'The heavy key from the rear cabinet is the cuff key. Take it if you have not.',
    'Select the heavy key and use it on your cuff at the floor fitting view.',
    'The cuff is steel, the key is heavy brass. Use the key on the cuff, then get to the rear hatch.',
  ];
  if (isFree(state)) return [
    'The floor is yours. Now you need two keys: a little brass one and a heavy one.',
    'Dig through the pizza box on the dinette. Somebody hides small valuable things in grease.',
    'Use the brass key on the padlocked cabinet at the rear bunk. Take the heavy key inside and open your cuff.',
  ];
  if (state.spoon !== 'inventory') return [
    'The chain gives you just enough room to search your seat and the nearby drawer.',
    'There is a hard lump under the seat cushion.',
    'At Your seat, use the cushion to lift it, then take the spoon from underneath.',
  ];
  return [
    'The padlock is not the weakest part of this arrangement.',
    'Inspect the floor fitting. Its broad slot matches the spoon handle.',
    'Select the spoon, choose Floor fitting, and click the fitting three times. Each short effort makes noise.',
  ];
}

export const OUTSIDE_LINES = [
  { at: 18, text: '[Outside, left] Cletus: "The moon is a replacement, Darlene. The real one is in a warehouse outside Reno."' },
  { at: 46, text: '[Outside, toward the door] Darlene: "And I suppose the government told the moon to hide. Sit down before you fall down."' },
  { at: 83, text: '[Outside, behind the RV] Cletus: "The fifth dimension is between the fridge and the wall. That is where the forks go."' },
  { at: 129, text: '[Outside, left] Darlene: "If you touch my ashtray again I will bury you in the yard with the other one."' },
];
