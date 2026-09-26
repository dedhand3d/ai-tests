# They Heard You

Opening prototype of a low-poly, fixed-camera horror adventure. All RV geometry, textures, faces, and audio are generated locally. No remote assets, CDN, backend, or runtime AI.

## Launch On Windows

Prerequisite: Node.js 20.19+ with npm. No install, command execution, or launch was performed while creating this first pass.

```powershell
Set-Location 'C:\Users\Owner\ai tests\they-heard-you'
npm install
npm run dev
```

Open the local URL printed by Vite. Vite will select another port if its default port is occupied. Opening index.html directly does not work for this TypeScript project.

Dependencies have exact versions in package.json. The first npm install will generate package-lock.json; a lockfile has deliberately not been fabricated without dependency resolution. Retain that generated file for repeatable subsequent installs with npm ci.

```powershell
npm test
npm run build
npm run preview
```

The tests use TypeScript to compile the isolated state module, then Node's built-in test runner. They cover spoon discovery, three-action chain release, locked views, failed combinations, object returns, concealment, save validation, and immutable transitions. They do not test rendering. These commands have not yet been run.

## Controls

- Left-click real 3D objects to act with the selected verb. Use is selected initially.
- Look inspects. Take pockets an exposed object. Use opens/closes the drawer and lifts/lowers the cushion.
- Select an inventory item, then click its target to use it. Click the item again, right-click the scene, or press Escape to cancel selection.
- Put back: select the item and click its original location while it is open.
- The five camera buttons select fixed viewpoints. Rear views unlock when the chain is released.
- Hold the eye button to label visible raycast targets. Space does the same when the page body has keyboard focus.
- Question mark: three optional hints for the current puzzle. Book: journal. Pause: volume, reduced effects, resume, restart confirmation.
- Menus, hidden tabs, and loss of window focus stop progression. Audio begins after the start/resume button.
- Saves live in this browser's localStorage, under they-heard-you:first-pass:v1. The page warns if storage is unavailable.

## First-Pass Scope

Implemented: continuous modeled RV, procedural dirty surfaces and clutter, CRT report, jaundiced practical lights, five cameras, sliding drawer and collectible rag, liftable cushion and spoon, inventory and item return, noisy three-action floor-fitting release, chain repositioning, concealment at the seat, authored outside captions, journal, hints, save/resume, pause, volume, fullscreen, and reduced effects.

The entrance is now ahead of the original seat, with a real wall opening and swinging door. Adults pace outside actual window openings, visible through gaps in the blinds. Ronnie reclines on a rear couch. Repeated fast moves near him or noisy hatch rattling build agitation; his alarm brings Cletus to the door. A first routine visit also occurs after 95 seconds of free exploration if no visit has occurred.

Cletus gives a twelve-second approach warning, enters, checks your location, fitting and drawer, and confronts you with three responses. You must deliberately return to Your seat and conceal the loose fitting before entry. The encounter is nonlethal; getting caught increases persistent suspicion without removing critical items or puzzle progress. Dialogue pauses time. He walks back outside, and an alarm cooldown prevents immediate repeat visits. Version-1 saves migrate to version 2 under the existing storage key; mid-encounter saves retain the remaining warning and evidence.

Not implemented: witness trust, tool borrowing, distractions, hatch repair, phone/rescue, sleep/deadline consequences, blackouts, failure/retry, full cast dialogue, and escape endings. Sleep and police search still show initial states. Synthesized alarm audio is a placeholder, not recorded voice acting.

Production build and 11 state tests pass. Browser checks cover rendering, the moved doorway, reclining Ronnie, saved alarm restoration and caught inspection state. This remains an in-development prototype, not a complete escape game.