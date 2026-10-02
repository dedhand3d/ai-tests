export const PHASES = ['idle', 'alarm', 'approach', 'entering', 'dialogue', 'search', 'leaving', 'blackout', 'kiss', 'dance', 'grab', 'kill', 'dead', 'tvshow', 'douse', 'hangout', 'offer', 'bulb'] as const;
export type Phase = typeof PHASES[number];
export type Purpose = 'talk' | 'search' | 'dildo' | 'dance' | 'tv' | 'fire' | 'hangout' | 'intro';
export const PURPOSES: Purpose[] = ['talk', 'search', 'dildo', 'dance', 'tv', 'fire', 'hangout', 'intro'];

// Cletus's first visit, brought by your first go at the floor fitting. A long, loud warning so you learn to get
// back on the couch and play chained; he rants, fiddles with the fitting, and leaves his screwdriver in the drawer.
export const INTRO_APPROACH_SECONDS = 6;
export const INTRO_LINE = "Who's making that racket? You? You're chained to a floor. What are you gonna do, scoot?";
export const INTRO_OUTCOME = 'Cletus kneels and wiggles the floor fitting with a screwdriver, mutters "Solid. Solid as my marriage," gets distracted by a sound only he can hear, and drops the screwdriver in the kitchen drawer on his way out.';

// The dance: mid-spin the shoelace around his neck snaps and the cuff key skitters across the floor to you.
export const KEY_DROP_AT = 9.5;
export const KEY_SNATCHED = 'Cletus: "Not a word. Not to Darlene, not to Ronnie, not to God." He adjusts the nightgown and bolts out, glowing. He never checks his neck.';
export const KEY_MISSED = 'Cletus spots the key on the floor at the end of his bow. "Whoa. Almost lost my baby." He knots the shoelace and tucks it back down the nightgown, deeply relieved, and bolts out.';

// Dale: sold his amp, kept his feelings. He shuffles in with his radio and a beer, sits on the couch beside
// you, plays Fine Again, cries about the amp, lights his bulb with a torch and offers you a hit.
// Game time is frozen while he is in. Hangout -> offer (you choose) -> bulb (only if you hit it) -> leaving.
export const DALE_AT = 160;
export const DALE_RETURN = 240;
export const HANGOUT_SECONDS = 26;
export const OFFER_SECONDS = 10;
export const BULB_SECONDS = 4.5;
export const RADIO_PLACED_AT = 1.6;
export const RADIO_ON_AT = 2.6;
export const TORCH_AT = 17.6;
export const DALE_HIT_AT = 21.6;
// In the bulb: the torch, the pull, and the moment the room comes apart.
export const BULB_INHALE_AT = 1.4;
export const BULB_TRIP_AT = 3.0;
// The radio's song: Fine Again from bar 24 (a chorus kicking in), through the second verse and chorus, looping
// after the big final chorus. 32 bars, about 90 seconds.
export const RADIO_SONG_START = 24 * 2.8235;
export const RADIO_LOOP = 32 * 2.8235;
export const HANGOUT_LINES = [
  { at: 0, line: "Scoot over. Not you. The couch. I'm talking to the couch." },
  { at: RADIO_ON_AT, line: "This song. This song gets me every time. Right here. Right in the here." },
  { at: 7.6, line: "Sold my amp today. Marshall half stack. Got forty dollars and a bag of ice for it." },
  { at: 12.6, line: "Ice melted. Forty dollars is gone. My amp is out there being loud for somebody else." },
  { at: TORCH_AT, line: "Hold on. Hold on. I gotta take my medicine. Doctor's orders. I'm the doctor." },
  { at: DALE_HIT_AT, line: "Oh, that's... yeah. Yeah. That's sad medicine. That's the good sad." },
];
const HANGOUT_STAGE = [
  '[Inside] Dale shuffles in with a boombox under one arm and a beer in his fist, sets the radio on the floor and drops onto the couch beside you. The springs scream.',
  '[Inside] He nudges the radio on with his shoe. He closes his eyes and nods along, slow and sad, like a man at his own funeral.',
  '[Inside] He takes a long pull of beer and stares at the spot where the amp would be, if he still had an amp.',
  '[Inside] His chin wobbles. He wipes his nose on the ZWINKY ENERGY shirt. It has seen worse.',
  '[Inside] He sets the beer down, digs a hollowed-out light bulb out of his pocket and thumbs a little torch lighter. The flame hisses blue under the glass.',
  '[Inside] He hits the bulb, holds it, then coughs out a cloud that hangs in the air like a ghost who also sold his amp.',
];
export const OFFER_LINE = "You want some? It helps with the amp thing. Everybody's got an amp thing.";
export const BULB_LINE = "Atta boy. Welcome to the amp club.";
export const hangoutTime = (encounter: Encounter): number => HANGOUT_SECONDS - encounter.remaining;
export function hangoutBeat(encounter: Encounter): number {
  const time = hangoutTime(encounter);
  let beat = 0;
  HANGOUT_LINES.forEach((entry, index) => { if (time >= entry.at) beat = index; });
  return beat;
}

// Set something on fire with Darlene's lighter and somebody smells the smoke. Cletus charges in with
// a bucket of dishwater, throws it on the flames (douse), then beats you unconscious. Frozen game time.
export const DOUSE_SECONDS = 2.4;
export const DOUSE_HIT = 1.1;
export const FIRE_SMELL_LINE = "Is that SMOKE? Something's BURNING in there! CLETUS! BUCKET!";
export const FIRE_ENTRY_LINE = "You set my HOUSE on FIRE? You set my fucking HOUSE on FIRE?";

// Cletus's TV night: he bursts in, smacks the set on, and makes you watch yourself on the news
// while he cackles. Once, early. Game time is frozen while you watch.
export const TV_AT = 120;
export const TVSHOW_SECONDS = 27;
export const TV_ON_AT = 2.2;
export const TV_CLIP_SECONDS = 20;
export const TV_SHOW_LINES = [
  { at: 0, line: "Sit tight. Sit TIGHT. You gotta see this. You're gonna love this." },
  { at: 2.5, line: "Ooh, look who's on TV! LOCAL MAN! That's YOU, local man!" },
  { at: 8.6, line: "Still missing! Hear that? STILL missing! They can't find you and you're RIGHT HERE!" },
  { at: 13.8, line: "Look at that picture. You look like a thumb somebody drew a face on." },
  { at: 18.6, line: "Nobody's coming. Nobody even knows your name. They just call you LOCAL." },
  { at: 23.2, line: "And don't get ideas. Key's right here on my shoelace. Never comes off. Not even in the shower. Especially not in the shower." },
];
const TV_SHOW_STAGE = [
  '[Inside] Cletus stomps down the aisle to the dead TV, grinning, rubbing his hands together.',
  '[Inside] He smacks the set until it wakes up. COUNTY NEWS 4. The anchor looks carved out of a potato. Then your face fills the screen.',
  '[Inside] Cletus is doubled over, pointing at the screen, then at you, then at the screen. He is crying laughing.',
  '[Inside] He slaps his knee so hard he has to lean on the TV. Snot is involved.',
  '[Inside] He wipes his eyes and does an impression of you: blank, sad, chained. It is not a good impression. It is close enough.',
  '[Inside] He fishes a big old key out of his shirt on a greasy shoelace and dangles it at you, still wheezing. The cuff key.',
];
export function tvShowBeat(encounter: Encounter): number {
  const time = TVSHOW_SECONDS - encounter.remaining;
  let beat = 0;
  TV_SHOW_LINES.forEach((entry, index) => { if (time >= entry.at) beat = index; });
  return beat;
}

// Everyone who can come through that door. Adding a visitor means adding an entry here, a rig in
// world.ts (buildRig) and, for a new behavior, its handler. Grab and kill lines are voiced.
export type VisitorId = 'cletus' | 'darlene' | 'dale';
export interface VisitorProfile {
  name: string;
  // talk: opens a conversation when you are where you should be. rampage: tears the place apart, no dialogue.
  // hangout: sits down beside you with his radio and his bulb.
  behavior: 'talk' | 'rampage' | 'hangout';
  grabLine: string;
  killLine: string;
  deathText: string;
  // Stabbed with a used needle mid-grab: they stagger out instead.
  stabLine: string;
  // Walked in on a puddle of your puke.
  pukeLine: string;
}
export const VISITORS: Record<VisitorId, VisitorProfile> = {
  cletus: {
    name: 'Cletus', behavior: 'talk',
    grabLine: "WHAT DID I TELL YOU? WHAT DID I FUCKING TELL YOU?",
    killLine: "I warned you. I warned you. Hold still. HOLD STILL.",
    deathText: 'Cletus is on you before the door finishes swinging, twitching, grinning, sunglasses crooked, breathing through his teeth. You do not see the next part. Nobody in Red Creek County ever will.',
    stabLine: 'Cletus: "AAAH! You STUCK me! That is somebody\'s NEEDLE! Whose needle is this?" He staggers out backward with the syringe hanging off his forearm, howling.',
    pukeLine: 'Cletus: "WHO PUKED ON MY FLOOR? Clean it up. With your FACE." He holds you by the back of the neck and scrubs the floor with you until it is mostly gone.',
  },
  darlene: {
    name: 'Darlene', behavior: 'rampage',
    grabLine: "YOU LITTLE SHIT! Off the couch? OFF MY COUCH?",
    killLine: "Night night, sweetheart. Mommy's got you now.",
    deathText: 'Darlene comes at you all elbows and ashtray, shrieking and giggling at the same time. Her cigarette never leaves her mouth. The last thing you smell is menthol.',
    stabLine: 'Darlene: "My ARM! Oh God, that is SOMEBODY\'S needle! I\'m gonna get the COOTIES!" She reels out the door, shrieking, flapping her arm like it is on fire.',
    pukeLine: 'Darlene: "Who PUKED? You PUKED? On my FLOOR? Lick it. LICK IT UP." She grinds your face in it until it is gone, then storms out.',
  },
  dale: {
    name: 'Dale', behavior: 'hangout',
    grabLine: "Bro. BRO. Why are you off the couch, bro? Why would you do this to me?",
    killLine: "I'm sorry, bro. I'm so sorry. Hold still. I'm SO sorry.",
    deathText: 'Dale is crying the whole time. Big, wet, heaving sobs. He apologizes to you, then to the amp, then to God, in that order. Fine Again is still playing on the radio when the lights go out.',
    stabLine: 'Dale: "Ow. Ow! Bro, that is a NEEDLE. You stuck me with a NEEDLE." He sits down in the doorway, cries for a minute, then shuffles out, wounded in every sense.',
    pukeLine: 'Dale: "Somebody puked. Same, bro. Same." He steps around it very carefully, like it is a sleeping dog.',
  },
};
// Everyone with a body: they all pace outside and can all come through the door.
export const VISITOR_IDS = Object.keys(VISITORS) as VisitorId[];
// Who a routine visit picks from. Dale keeps his own schedule (DALE_AT, then every DALE_RETURN).
export const ROTATION: VisitorId[] = ['cletus', 'darlene'];

// Visits are sudden: a couple of seconds of running footsteps, the door bangs open, they are inside.
export const APPROACH_SECONDS = 2.5;
export const ENTER_SECONDS = 1.6;
export const LEAVE_SECONDS = 5;
export const INSIDE_Z = -0.7;
// Caught away from your seat: grabbed and beaten unconscious. Caught again: killed.
export const GRAB_SECONDS = 4.4;
export const GRAB_HITS = [1.0, 1.45, 1.9, 2.5];
export const KILL_SECONDS = 3.2;
export const KILL_HIT = 1.7;

// The one-time drag number. Seconds of forced viewing; game time is frozen while it plays.
export const DANCE_SECONDS = 20;
export const DANCE_AT = 200;
export const DANCE_LINES = [
  "Do you like my body? I like my body.",
  "Would you fuck me? I'd fuck me. I would fuck me so hard.",
  "Don't you look at that door. You look at me. Look at all of it.",
  "It puts the lotion on its skin. I don't know why I said that. It just came to me.",
] as const;
const DANCE_STAGE = [
  '[Inside] Cletus is wearing Darlene\'s nightgown, a mop-head wig, a feather boa and lipstick applied during an earthquake. He sways. You cannot look away. The chain will not let you.',
  '[Inside] He tucks something, flutters his crusty eyelashes and does a slow, horrible spin. The nightgown clings to a back that has never been washed on purpose.',
  '[Inside] He licks his lipstick off his own teeth and rolls his hips at you. His armpit hair has glitter in it. Why is there glitter.',
  '[Inside] He shuffles close enough that you can smell the Zwinkys and the lotion. His breath fogs your face. Then he backs off, deeply satisfied with himself.',
];
export function danceBeat(encounter: Encounter): number {
  return Math.min(DANCE_LINES.length - 1, Math.floor((DANCE_SECONDS - encounter.remaining) / (DANCE_SECONDS / DANCE_LINES.length)));
}
export const DILDO_LINE = "God damnit Ronnie got the dildo again. Which one of you gave it to him?";
export const PUKE_EVIDENCE = 'There is puke on the floor.';
export const PUKE_OPENING = "WHO PUKED ON MY FLOOR? Who? You? Did YOU puke on my FLOOR?";

// Throw CHOKE ON MY LOVE out the window and Cletus reads it aloud in the yard while Darlene heckles.
export const READ_ALOUD = [
  { at: 4, speaker: 'Cletus', line: "Chapter nine. Brock's biceps glistened like two hams left out in the rain." },
  { at: 20, speaker: 'Darlene', line: "That is not how hams work, Cletus. I have worked with hams." },
  { at: 34, speaker: 'Cletus', line: "She whispered his name into the roar of the crop duster. Brock. BROCK." },
  { at: 50, speaker: 'Darlene', line: "Who wrote this? A prisoner? This was written by a prisoner." },
  { at: 62, speaker: 'Cletus', line: "Somebody's MOTHER wrote this, Darlene. Show some respect." },
];

// Darlene never talks with you. She storms in hunting for her lighter: tears the kitchen apart, gets in
// your face, rips the trash open, then finds it in her own fist and flings it on the floor (or, once it is
// gone, drops or steals something else) and storms out. Timed in seconds from the end of her entrance.
export const RAMPAGE_SECONDS = 14.5;
export const RAMPAGE_EVENTS = [
  { at: 0.5, cabinet: 'u1' }, { at: 0.9, cabinet: 'u2' }, { at: 1.3, cabinet: 'u3' },
  { at: 3.2, drawer: true },
  { at: 4.6, cabinet: 'k1' }, { at: 5.0, cabinet: 'k2' }, { at: 5.4, cabinet: 'k3' },
  { at: 9.8, rip: true }, { at: 10.9, rip: true },
  { at: 12.6, haul: true },
] as const;
const RAMPAGE_BEATS = [0, 3.0, 6.0, 9.2, 12.6];
const RAMPAGE_LINES = [
  "WHERE IS MY FUCKING LIGHTER?",
  "Not in the drawer, not in the drawer, NOT IN THE FUCKING DRAWER!",
  "Did you take it? Did you? I can smell it on you.",
  "Is it in the TRASH? Who throws a LIGHTER in the TRASH? Who DOES that?",
];
const RAMPAGE_STAGE = [
  '[Inside] Darlene is ripping the cabinets open one after another, shrieking. Nothing is safe. Nothing was ever safe.',
  '[Inside] She yanks the kitchen drawer out so hard the bottle caps jump, then drops to her knees and claws through the lower cabinets.',
  '[Inside] She is in your face. Menthol and battery acid. Her pupils are pinpricks. Do not move. Do not blink.',
  '[Inside] She drops to her knees at the trash bags and rips them open with her fingernails, flinging coffee grounds and worse across the floor.',
];
// What she drops or steals on her way out, and what she screams about it.
export type Haul = 'drop-lighter' | 'drop-zwinkys' | 'drop-dildo' | 'take-zwinkys' | 'take-dildo' | 'nothing';
export const HAUL_LINES: Record<Haul, string> = {
  'drop-lighter': "There it is. It was in my fucking hand. Keep it, it's cursed now.",
  'drop-zwinkys': "Who put my Zwinkys in my bra? Somebody in this house wants me dead.",
  'drop-dildo': "And THIS goes back where it lives. Don't you tell Ronnie.",
  'take-zwinkys': "Is this MY Zwinkys? This is MY fucking Zwinkys.",
  'take-dildo': "Ronnie is not getting this. NOBODY is getting this.",
  'nothing': "FINE. Everybody in this house is a thief. FINE.",
};
const HAUL_STAGE: Record<Haul, string> = {
  'drop-lighter': '[Inside] She stands up, pats every pocket, and finds the lighter clenched in her own fist. She flings it down at the floor by your feet.',
  'drop-zwinkys': '[Inside] She pulls a Zwinkys out of her tank top and slams it back on the counter.',
  'drop-dildo': '[Inside] She produces the dildo from somewhere and slams it back beside the sink.',
  'take-zwinkys': '[Inside] She snatches the Zwinkys off the counter and jams it down her tank top.',
  'take-dildo': '[Inside] She snatches the dildo off the counter and shoves it down the back of her shorts.',
  'nothing': '[Inside] She kicks a trash bag across the aisle and heads for the door.',
};
export const rampageTime = (encounter: Encounter): number => RAMPAGE_SECONDS - encounter.remaining;
export function rampageBeat(encounter: Encounter): number {
  const time = rampageTime(encounter);
  let beat = 0;
  RAMPAGE_BEATS.forEach((at, index) => { if (time >= at) beat = index; });
  return beat;
}
export function rampageLine(encounter: Encounter): string {
  const beat = rampageBeat(encounter);
  return beat < RAMPAGE_LINES.length ? RAMPAGE_LINES[beat] : HAUL_LINES[encounter.haul ?? 'nothing'];
}
function rampageStage(encounter: Encounter): string {
  const beat = rampageBeat(encounter);
  return beat < RAMPAGE_STAGE.length ? RAMPAGE_STAGE[beat] : HAUL_STAGE[encounter.haul ?? 'nothing'];
}

export const RAMBLES = [
  'The moon is a replacement. The real one is in a warehouse outside Reno. Look at the seams. They painted over the fucking seams.',
  'The fifth dimension is between the fridge and the wall. That is why the forks disappear. They need metal over there.',
  'Earth split into two timelines on Tuesday. In the other one I own this whole park. Same rent, though. Explain that shit.',
  'Those anonymous message-board drops? Half are decoys. The real instructions are on gas station receipts. Follow the coupon numbers.',
  'You actually listen. Nobody listens anymore. The satellites hate that. Come here. A kiss seals the frequency.',
  'The secret council meets inside a photocopier. Every paper jam is a vote. That is why they keep denying my application.',
] as const;

export const DARLENE_RAMBLES = [
  'The government put my brain in a bird. Every morning I wake up and I am still in this body. So who is in the bird?',
  'They say smoking kills. I have buried three doctors. That is not a coincidence, that is a pattern.',
  'My cousin swallowed a toothpick in 1987. He is fine. He is a senator now. You tell me what that means.',
  'The lotto is rigged but only on days I play. On my birthday they let a winner through to keep me hopeful. I know the schedule.',
  'I do not snore. I talk in my sleep to the people living in the walls. They pay half the rent. You have never seen them because they are polite.',
  'That television is the only honest thing in this county. It told me I would be kidnapped once. I watched. I waited. It lied. So I did it to somebody else first.',
] as const;

export function conversationLine(encounter: Encounter): string {
  if (encounter.talkCount <= 0) return openingLine(encounter);
  if (encounter.visitor === 'darlene') return DARLENE_RAMBLES[(encounter.talkCount - 1) % DARLENE_RAMBLES.length];
  return RAMBLES[(encounter.talkCount - 1) % RAMBLES.length];
}

export interface Encounter {
  phase: Phase;
  remaining: number;
  agitation: number;
  cooldown: number;
  lastMove: number;
  patrol: number;
  origin: number;
  suspicion: number;
  visits: number;
  evidence: string;
  chainCaught: boolean;
  outcome: string;
  talkCount: number;
  kissed: boolean;
  visitor: VisitorId;
  purpose: Purpose;
  nextVisitor?: VisitorId;
  nextPurpose?: 'dildo' | 'dance' | 'tv' | 'fire' | 'intro';
  haul?: Haul;
  // During the dance: the cuff key is lying on the floor, there for the grabbing.
  keyLoose?: boolean;
}

export const encounterDefaults = (): Encounter => ({
  phase: 'idle', remaining: 0, agitation: 0, cooldown: 0, lastMove: -10, patrol: 0, origin: 1,
  suspicion: 0, visits: 0, evidence: '', chainCaught: false, outcome: '', talkCount: 0, kissed: false,
  visitor: 'cletus', purpose: 'talk', nextVisitor: undefined, nextPurpose: undefined,
});

export function openingLine(encounter: Encounter): string {
  if (encounter.purpose === 'intro') return INTRO_LINE;
  if (encounter.purpose === 'dildo') return DILDO_LINE;
  if (encounter.purpose === 'dance') return DANCE_LINES[danceBeat(encounter)];
  if (encounter.visitor === 'darlene') {
    if (encounter.chainCaught) return 'That fitting has been played with. On my floor. In my house.';
    if (encounter.evidence) return 'You have been busy, sweetheart. Busy busy busy.';
    return [
      'I am not angry. I am disappointed. That is worse. Ask my kids. Oh wait, the state took them.',
      'You look at me like I am the bad guy. I provide housing. I provide chain. That is basically a landlord.',
      'Smoking keeps the bugs out of my lungs. It is called fumigation. Look it up.',
    ][encounter.visits % 3];
  }
  if (encounter.chainCaught) return 'That fitting has been worked loose. You think I do not check my own floor?';
  if (encounter.evidence === PUKE_EVIDENCE) return PUKE_OPENING;
  if (encounter.evidence) return 'You getting comfortable? That was not the fucking arrangement.';
  return [
    'The television clicks before the phone rings. Every time. Do not tell me that is a coincidence.',
    'Somebody moved the moon last night. Same sky, different fucking angle. I wrote it down.',
    'Keep your voice down. That refrigerator has been listening since Tuesday. Unplugged. Explain that.',
  ][encounter.visits % 3];
}

// Each visitor paces outside on their own offset so they do not walk through each other.
export const patrolDepth = (time: number, index = 0): number => 1.05 + Math.sin((time + index * 6.5) * 0.48) * 1.4;
export const visitorIndex = (visitor: VisitorId): number => Math.max(0, VISITOR_IDS.indexOf(visitor));

export const RESPONSES = [
  { id: 'more', text: 'Tell me more.' },
  { id: 'enough', text: 'Enough. I need some quiet.' },
  { id: 'shifted', text: 'I shifted in the seat. That is all.' },
  { id: 'ronnie', text: 'Ronnie looks uncomfortable.' },
  { id: 'defy', text: 'Get away from me.' },
] as const;
export type ResponseId = typeof RESPONSES[number]['id'];

export function visitorName(encounter: Encounter): string {
  return VISITORS[encounter.visitor].name.toUpperCase();
}

export function warning(encounter: Encounter): string {
  const name = VISITORS[encounter.visitor].name;
  switch (encounter.phase) {
    case 'alarm': return '[Rear couch] Ronnie cries out and reaches for his buzzer. Outside, the footsteps stop dead.';
    case 'approach': return encounter.nextPurpose === 'intro'
      ? '[Outside] Somebody heard that. Heavy boots on the steps, coming for the door. GET BACK ON THE COUCH: Your seat, then Pretend restrained.'
      : encounter.nextPurpose === 'fire' ? `[Outside] Darlene: "${FIRE_SMELL_LINE}" Somebody is running at the door with something sloshing.` : '[Outside] Pounding footsteps. Someone is RUNNING at the door.';
    case 'douse': return `[Inside] Cletus hurls a bucket of grey dishwater at the flames. Steam, ash, a hiss like a snake. Then he turns around. Cletus: "${FIRE_ENTRY_LINE}"`;
    case 'grab': case 'kill': case 'dead': return '';
    case 'hangout': return `${HANGOUT_STAGE[hangoutBeat(encounter)]} Dale: "${HANGOUT_LINES[hangoutBeat(encounter)].line}"`;
    case 'offer': return `[Inside] Dale turns and holds the bulb out to you, the torch still hissing under it. Dale: "${OFFER_LINE}"`;
    case 'bulb': return `[Inside] You put your lips on the glass. Dale works the torch. The bulb fills with a thick white cloud and you pull until there is no more room in you. Dale: "${BULB_LINE}"`;
    case 'entering': return encounter.purpose === 'hangout' ? '[Entry] The door BANGS open. Dale stumbles in with a boombox and a beer, already halfway to crying.' : encounter.purpose === 'fire' ? '[Entry] The door BANGS open. Cletus charges in with a sloshing bucket.' : encounter.purpose === 'dance' ? '[Entry] The door BANGS open. Something pink is charging down the aisle.' : encounter.purpose === 'tv' ? '[Entry] The door BANGS open. Cletus comes in giggling, headed straight for the TV.' : encounter.visitor === 'darlene' ? '[Entry] The door BANGS off the wall. Darlene comes in screaming.' : `[Entry] The door BANGS open. ${name} is coming straight at you.`;
    case 'search': return `${rampageStage(encounter)} Darlene: "${rampageLine(encounter)}"`;
    case 'dialogue': return `[Inside] ${name}: "${conversationLine(encounter)}"`;
    case 'kiss': return 'Cletus shuffles closer, puckers his lips and plants a brief, unwelcome kiss. Then he backs away.';
    case 'dance': return encounter.keyLoose
      ? '[Inside] Mid-spin the greasy shoelace around his neck SNAPS. The cuff key skitters across the floor and stops by your foot. He has not noticed. GRAB IT.'
      : DANCE_STAGE[danceBeat(encounter)];
    case 'tvshow': return `${TV_SHOW_STAGE[tvShowBeat(encounter)]} Cletus: "${TV_SHOW_LINES[tvShowBeat(encounter)].line}"`;
    case 'blackout': return 'Everything goes dark. You hear drawers emptying.';
    case 'leaving': return encounter.outcome;
    default: return encounter.agitation >= 30 ? '[Rear couch] Ronnie tenses and grips his buzzer. Slow down. Give him some quiet.' : '';
  }
}
