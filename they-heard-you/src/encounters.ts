export const PHASES = ['idle', 'alarm', 'approach', 'entering', 'dialogue', 'search', 'leaving', 'blackout', 'kiss'] as const;
export type Phase = typeof PHASES[number];
export type VisitorId = 'cletus' | 'darlene';

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
  purpose: 'talk' | 'search';
  nextVisitor?: VisitorId;
}

export const encounterDefaults = (): Encounter => ({
  phase: 'idle', remaining: 0, agitation: 0, cooldown: 0, lastMove: -10, patrol: 0, origin: 1,
  suspicion: 0, visits: 0, evidence: '', chainCaught: false, outcome: '', talkCount: 0, kissed: false,
  visitor: 'cletus', purpose: 'talk', nextVisitor: undefined,
});

export function openingLine(encounter: Encounter): string {
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
  if (encounter.evidence) return 'You getting comfortable? That was not the fucking arrangement.';
  return [
    'The television clicks before the phone rings. Every time. Do not tell me that is a coincidence.',
    'Somebody moved the moon last night. Same sky, different fucking angle. I wrote it down.',
    'Keep your voice down. That refrigerator has been listening since Tuesday. Unplugged. Explain that.',
  ][encounter.visits % 3];
}

export const patrolDepth = (time: number): number => 1.05 + Math.sin(time * 0.48) * 1.4;

export const RESPONSES = [
  { id: 'more', text: 'Tell me more.' },
  { id: 'enough', text: 'Enough. I need some quiet.' },
  { id: 'shifted', text: 'I shifted in the seat. That is all.' },
  { id: 'ronnie', text: 'Ronnie looks uncomfortable.' },
  { id: 'defy', text: 'Get away from me.' },
] as const;
export type ResponseId = typeof RESPONSES[number]['id'];

export function visitorName(encounter: Encounter): string {
  return encounter.visitor === 'darlene' ? 'DARLENE' : 'CLETUS';
}

export function warning(encounter: Encounter): string {
  const name = encounter.visitor === 'darlene' ? 'Darlene' : 'Cletus';
  switch (encounter.phase) {
    case 'alarm': return '[Rear couch] Ronnie cries out and reaches for his buzzer. Outside footsteps stop.';
    case 'approach': return `[Outside, approaching the entry] Someone is coming. Footsteps. Handle rattling. ${Math.ceil(encounter.remaining)}s until entry.`;
    case 'entering': return `[Entry] The door swings open. ${name} is coming into the aisle.`;
    case 'search': return '[Inside] Darlene is tearing the place apart looking for something. Do not move.';
    case 'dialogue': return `[Inside] ${name}: "${conversationLine(encounter)}"`;
    case 'kiss': return 'Cletus shuffles closer, puckers his lips and plants a brief, unwelcome kiss. Then he backs away.';
    case 'blackout': return 'Everything goes dark. You hear drawers emptying.';
    case 'leaving': return encounter.outcome;
    default: return encounter.agitation >= 30 ? '[Rear couch] Ronnie tenses and grips his buzzer. Slow down. Give him some quiet.' : '';
  }
}
