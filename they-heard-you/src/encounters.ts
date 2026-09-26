export const PHASES = ['idle', 'alarm', 'approach', 'entering', 'dialogue', 'leaving'] as const;
export type Phase = typeof PHASES[number];
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
  outcome: string;
}
export const encounterDefaults = (): Encounter => ({ phase: 'idle', remaining: 0, agitation: 0, cooldown: 0, lastMove: -10, patrol: 0, origin: 1, suspicion: 0, visits: 0, evidence: '', outcome: '' });
export const patrolDepth = (time: number): number => 1.05 + Math.sin(time * 0.48) * 1.4;
export const RESPONSES = [
  { id: 'shifted', text: 'I shifted in the seat. That is all.' },
  { id: 'ronnie', text: 'Ronnie looks uncomfortable.' },
  { id: 'defy', text: 'Get away from me.' },
] as const;
export type ResponseId = typeof RESPONSES[number]['id'];
export function warning(encounter: Encounter): string {
  switch (encounter.phase) {
    case 'alarm': return '[Rear couch] Ronnie cries out and reaches for his buzzer. Outside footsteps stop.';
    case 'approach': return `[Outside, approaching the entry] Cletus: "Hey, what the fuck was that?" Footsteps. Handle rattling. ${Math.ceil(encounter.remaining)}s until entry.`;
    case 'entering': return '[Entry] The door swings open. Cletus is coming into the aisle.';
    case 'dialogue': return '[Inside] Cletus: "You getting comfortable? That wasn\'t the fucking arrangement."';
    case 'leaving': return encounter.outcome;
    default: return encounter.agitation >= 30 ? '[Rear couch] Ronnie tenses and grips his buzzer. Slow down. Give him some quiet.' : '';
  }
}