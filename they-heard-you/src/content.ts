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
  spoon: { name: 'Bent spoon', icon: 'utensils', description: 'A dull spoon with a broad, flat handle. Found under your seat cushion.' },
  rag: { name: 'Filthy rag', icon: 'shirt', description: 'Stiff at the edges. Soft in the middle. Best not to investigate. Found in the kitchen drawer.' },
};

export const HOTSPOTS: Record<HotspotId, string> = {
  drawer: 'Kitchen drawer', cushion: 'Seat cushion', spoon: 'Bent spoon', rag: 'Filthy rag',
  bracket: 'Corroded floor fitting', seat: 'Original seat', tv: 'Missing-person report',
  door: 'Entry door', hatch: 'Emergency hatch', ashtray: 'Emergency ashtray', notice: 'House rules',
};

export function inspect(id: HotspotId, state: GameState): string {
  const descriptions: Record<HotspotId, string> = {
    drawer: state.drawerOpen ? 'A rag and six bottle caps. Somebody wrote SHUT THE FUCKING DRAWER above it. A welcoming home.' : 'The drawer is within reach. The handle is greasy; the threat above it is unusually legible.',
    cushion: state.cushionRaised ? 'A spoon-shaped clean patch. The cushion was hiding more than its smell.' : 'A hard lump under a cushion with the texture of an old kitchen sponge. You can lift it.',
    spoon: ITEMS.spoon.description,
    rag: ITEMS.rag.description,
    bracket: isFree(state) ? 'The floor fitting is loose. The padlock and cuff are not. You can lay the fitting back over its old marks at your seat.' : 'The padlock is solid. The floor fitting is not. A broad slot in the corroded fitting looks about spoon-handle wide.',
    seat: 'Your assigned accommodation. A seat, a cuff, and a view of everybody else\'s bullshit.',
    tv: 'COUNTY NEWS 4: Missing. Last seen in Red Creek County. They used the photo you hated. You would give anything to complain about it in person.',
    door: 'Locked from outside. A strip of cold light under the frame. Beyond it, someone is arguing about a missing amplifier.',
    hatch: 'EMERGENCY EXIT. The inside pull handle is missing. The mount is still there. Getting loose was only the first problem.',
    ashtray: 'DO NOT TOUCH THE EMERGENCY ASHTRAY. Apparently the ordinary ashtrays cannot be trusted in a crisis.',
    notice: 'HOME SWEET CODE VIOLATION. Finally, something in here that is not a lie.',
  };
  return descriptions[id];
}

export function hints(state: GameState): string[] {
  if (isFree(state)) return [
    'Watch the silhouettes behind the blinds. Footsteps turning toward the door mean you need to get back.',
    'Close the drawer, choose Your seat, then Pretend restrained. Moving away exposes the fitting again.',
    'Ronnie needs quiet. Repeated rapid movement near his couch or rattling the rear hatch can bring Cletus inside. His warning gives you twelve seconds. The hatch escape is not implemented yet.',
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
  { at: 18, text: '[Outside, left] Dale: "That amp had a fucking warranty. You cannot pawn a warranty."' },
  { at: 46, text: '[Outside, toward the door] Darlene: "I told you. It is being stored professionally."' },
  { at: 83, text: '[Outside, behind the RV] Ray: "It is not broken. It is waiting on one part. Been waiting since 2009."' },
  { at: 129, text: '[Outside, left] Dale: "That amp is family. You are currently more of a paperwork issue."' },
];