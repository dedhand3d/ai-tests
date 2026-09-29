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

Dependencies have exact versions in package.json and a committed package-lock.json; use `npm ci` on a fresh checkout.

```powershell
npm test
npm run build
npm run preview
```

The tests use TypeScript to compile the isolated state module, then Node's built-in test runner. They cover chain release, concealment, inspection consequences, screwdriver recovery, blackout persistence, save migration, immutable transitions, and bundled spoken-clip coverage. They do not test rendering.

## Controls

- Left-click real 3D objects to act with the selected verb. Use is selected initially. Hovering an interactable draws an acid-green glowing outline around it.
- Look inspects. Grab pockets an exposed object. Use opens/closes the drawer and cabinets, lifts/lowers the cushion, or triggers the object. Every object has authored Look/Grab/Use lines (see `src/interactions.ts`); some differ by camera view.
- Look, then click an inventory item: opens a close-up 3D examine view. Drag to rotate it 360 degrees, scroll or pinch to zoom. The Zwinkys can be drunk from there.
- Select an inventory item, then click its target to use it. Click the item again, right-click the scene, or press Escape to cancel selection.
- Put back: select the item and click its original location while it is open.
- The five camera buttons select fixed viewpoints. Rear views unlock when the chain is released.
- Hold the eye button to label visible raycast targets. Space does the same when the page body has keyboard focus.
- Question mark: three optional hints for the current puzzle. Book: journal. Pause: volume, reduced effects, resume, restart confirmation.
- Menus, hidden tabs, and loss of window focus stop progression. Audio begins after the start/resume button.
- Saves live in this browser's localStorage, under they-heard-you:first-pass:v1. The page warns if storage is unavailable.

## Items Rework, Escape Route and the Drag Number

Object text follows the September 2026 item spec: Wallpaper, House rules, Emergency hatch, Pizza box, Emergency ashtray, Something awful on the counter, Can of Zwinkys Malt Liquor (was Counter cans), Seat cushion, Stinky Pee Couch (was Original seat), lower and upper cabinets, Corroded floor fitting, Losing ticket, Padlocked cabinet and Ronnie. Kitchen drawer and Missing-person report are unchanged. Cabinet carcasses are hollow and every cabinet door swings out into the aisle.

New pocket items: Dildo, Zwinkys Malt Liquor (Use it for a gag, a vomit overlay and "Aahh refreshing"), Cigarette butt, Bobby pins, Used needles and Axe. The escape route is now: loosen the fitting, grab bobby pins from the emergency ashtray at the dinette, pick the padlocked rear cabinet, take the heavy key and the axe, unlock the cuff, then axe the entry door three times. The rear hatch is glued shut. The pizza box no longer hides the brass key; saves that already hold it can still open the cabinet with it.

Leaving the dildo with Ronnie makes him grab it, wave it and hit his buzzer. Cletus storms in ("God damnit Ronnie got the dildo again"), takes it back and questions you with the normal evidence checks. Afterwards Ronnie stays calm for 150 seconds of play. Nothing is used on Ronnie; the needles are refused.

Once per game, on the first routine visit after 200 seconds, Cletus arrives in Darlene's nightgown, a mop-head wig, a boa and smeared lipstick for a 20-second unskippable Buffalo Bill parody dance while the camera stays on him. Game time is frozen and he checks nothing. The music is `public/sounds/goodbye-horses.mid` (copied from `sounds/`), parsed and played by a small local oscillator synth in `src/midi.ts`, starting at bar 88, where the full band comes back after the breakdown. Pausing stops the music, and it resumes at the matching point.

Saves migrate to schema version 5 under the same key.

Visits are now violent. The warning is 8 seconds of running footsteps. Then the door bangs off the wall and the visitor charges in, hunched, twitching and flailing. The door slams shut behind them, the camera hard-cuts and jolts, the screen flashes, and a dissonant stab plays. They leave the same way. Ronnie's alarm is a synthesized, vocoded frightened groan over his buzzer, with no words. Voice clips and their manifest are always revalidated, so regenerating voices can't leave a stale cached manifest muting the dialogue.

## First-Pass Scope

Cletus offers Tell me more throughout his confrontation. Six voiced fictional conspiracy topics loop without forcing an exit: fake moon, fifth dimension, splitting timelines, anonymous-message decoys and a secret council. After five continuations he walks toward the seated camera, dips his head, puckers for a brief kiss and retreats. It happens once per visit and has a Skip button. Dialogue and the kiss do not advance the deadline; menus freeze the animation. Enough ends the conversation. Talking never clears entry evidence. Ronnie remains nonspeaking; other adult conversation encounters are not implemented yet.

Conversation update verification: production build and 17 tests pass. Browser checks exercised five continuations, the kiss trigger, continuation afterward and Enough. Desktop/portrait screenshots and canvas-pixel checks verified the animated close-up; subjective listening quality was not assessed.

Implemented: continuous modeled RV, procedural dirty surfaces and clutter, CRT report, jaundiced practical lights, five cameras, sliding drawer and collectible rag, liftable cushion and spoon, inventory and item return, noisy three-action floor-fitting release, chain repositioning, concealment at the seat, authored outside captions, journal, hints, save/resume, pause, volume, fullscreen, and reduced effects.

The entrance is now ahead of the original seat, with a real wall opening and swinging door. Adults pace outside actual window openings, visible through gaps in the blinds. Ronnie reclines on a rear couch. Repeated fast moves near him or noisy hatch rattling build agitation; his alarm brings Cletus to the door. A first routine visit also occurs after 95 seconds of free exploration if no visit has occurred.

Cletus gives a twelve-second warning and records what is visible at entry. Return to Your seat and Pretend restrained before the door opens: successful concealment never produces a chain accusation. If nothing else is disturbed, he instead rambles about the television, moon, or refrigerator. An open drawer remains separate evidence, not proof of a loose chain.

The first caught chain offense makes him refasten the chain and confiscate the spoon. He leaves his screwdriver in the reachable kitchen drawer; use it on the fitting three times. Subsequent caught chain offenses cause a non-graphic blackout, a 90-second penalty, a new day label, emptied pockets and seeded relocation of loose papers. The RV structure remains fixed. Confiscated pocket items are recoverable from a bundle in the reachable drawer, so there is always another attempt. Blackout waits for acknowledgement and survives save/resume. Existing saves migrate to version 3 under the same key.

Outside and Cletus dialogue use bundled local WAV speech, processed through pitch shifting, bandpass filtering, distortion, ring modulation and compression for a harsh synthetic voice. Captions remain on. Pause settings include a voice toggle; volume controls speech as well as effects. Speech is allowed while the dialogue clock is stopped, but menus/hidden tabs interrupt it. Ronnie remains entirely nonspeaking. To regenerate authored speech on Windows, run `& .\scripts\generate-voices.ps1`; no runtime speech service or network voice API is used.

Not implemented: witness trust, Ray's full borrowing puzzle, distractions, phone/rescue, sleep/deadline consequences, lethal endings/checkpoint retry and full cast dialogue. Sleep and police search still show initial states. The adult voices are deliberately processed synthesized speech, not human voice acting.

Latest update: production build and all 32 tests pass. Headless-browser screenshots checked the dance at four points, outward cabinet swings, hover outlines, the examine view and the vomit overlay. The MIDI's sound quality was not judged by ear, and there has been no uninterrupted full playthrough. Earlier: production build and 15 tests passed. Browser fixtures verify successful concealment produces paranoid dialogue without chain evidence, confiscation leaves a raycast-visible screwdriver, blackout empties inventory, the belongings bundle is clickable, and recovery restores the alternate tool. A browser audio analyser measured nonzero output from the processed speech path. This is not subjective listening validation or an uninterrupted full-game playthrough. This remains an in-development prototype, not a complete escape game.