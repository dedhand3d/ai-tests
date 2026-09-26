# They Heard You

Opening prototype of a low-poly, fixed-camera horror adventure. All RV geometry, textures, faces, and audio are generated locally. No remote assets, CDN, backend, or runtime AI.

## Launch On Windows

Prerequisite: Node.js 20.19+ with npm.

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

The tests use TypeScript to compile the isolated state module, then Node's built-in test runner. They cover chain release, concealment, inspection consequences, screwdriver recovery, blackout persistence, save migration, immutable transitions, and bundled spoken-clip coverage. They do not test rendering.

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

Cletus offers Tell me more throughout his confrontation. Six voiced fictional conspiracy topics loop without forcing an exit: fake moon, fifth dimension, splitting timelines, anonymous-message decoys and a secret council. After five continuations he walks toward the seated camera, dips his head, puckers for a brief kiss and retreats. It happens once per visit and has a Skip button. Dialogue and the kiss do not advance the deadline; menus freeze the animation. Enough ends the conversation. Talking never clears entry evidence. Ronnie remains nonspeaking; other adult conversation encounters are not implemented yet.

Conversation update verification: production build and 17 tests pass. Browser checks exercised five continuations, the kiss trigger, continuation afterward and Enough. Desktop/portrait screenshots and canvas-pixel checks verified the animated close-up; subjective listening quality was not assessed.

Implemented: continuous modeled RV, procedural dirty surfaces and clutter, CRT report, jaundiced practical lights, five cameras, sliding drawer and collectible rag, liftable cushion and spoon, inventory and item return, noisy three-action floor-fitting release, chain repositioning, concealment at the seat, authored outside captions, journal, hints, save/resume, pause, volume, fullscreen, and reduced effects.

The entrance is now ahead of the original seat, with a real wall opening and swinging door. Adults pace outside actual window openings, visible through gaps in the blinds. Ronnie reclines on a rear couch. Repeated fast moves near him or noisy hatch rattling build agitation; his alarm brings Cletus to the door. A first routine visit also occurs after 95 seconds of free exploration if no visit has occurred.

Cletus gives a twelve-second warning and records what is visible at entry. Return to Your seat and Pretend restrained before the door opens: successful concealment never produces a chain accusation. If nothing else is disturbed, he instead rambles about the television, moon, or refrigerator. An open drawer remains separate evidence, not proof of a loose chain.

The first caught chain offense makes him refasten the chain and confiscate the spoon. He leaves his screwdriver in the reachable kitchen drawer; use it on the fitting three times. Subsequent caught chain offenses cause a non-graphic blackout, a 90-second penalty, a new day label, emptied pockets and seeded relocation of loose papers. The RV structure remains fixed. Confiscated pocket items are recoverable from a bundle in the reachable drawer, so there is always another attempt. Blackout waits for acknowledgement and survives save/resume. Existing saves migrate to version 3 under the same key.

Outside and Cletus dialogue use bundled local WAV speech, processed through pitch shifting, bandpass filtering, distortion, ring modulation and compression for a harsh synthetic voice. Captions remain on. Pause settings include a voice toggle; volume controls speech as well as effects. Speech is allowed while the dialogue clock is stopped, but menus/hidden tabs interrupt it. Ronnie remains entirely nonspeaking. To regenerate authored speech on Windows, run `& .\scripts\generate-voices.ps1`; no runtime speech service or network voice API is used.

Not implemented: witness trust, Ray's full borrowing puzzle, distractions, hatch repair, phone/rescue, sleep/deadline consequences, lethal endings/checkpoint retry, full cast dialogue, and escape endings. Sleep and police search still show initial states. The adult voices are deliberately processed synthesized speech, not human voice acting.

Production build and all 15 tests pass. Browser fixtures verify successful concealment produces paranoid dialogue without chain evidence, confiscation leaves a raycast-visible screwdriver, blackout empties inventory, the belongings bundle is clickable, and recovery restores the alternate tool. A browser audio analyser measured nonzero output from the processed speech path. This is not subjective listening validation or an uninterrupted full-game playthrough. This remains an in-development prototype, not a complete escape game.