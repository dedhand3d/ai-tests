# They Heard You: Kimi Code Handoff

Prepared September 26, 2026, for continuing development with Kimi Code 2.7 or another coding assistant. This is a project handoff, not an instruction to rewrite or restart the game. The user is switching assistants for affordability. Work economically and preserve what already works.

## Start Here

Suggested first message to the new coding assistant:

> Read KIMI-HANDOFF.md in C:\Users\Owner\ai tests\they-heard-you, then read the complete original specification at C:\Users\Owner\ai tests\They-Heard-You-Build-Prompt.txt. Inspect the relevant current source and tests before editing. Preserve the existing game, saved-game compatibility, parent files, and my later design decisions recorded in the handoff. Tell me briefly what is actually implemented and the next small playable milestone. Follow my next request; do not restart the project or assume every draft idea is already approved or implemented.

### Paths and authority

- Project: `C:\Users\Owner\ai tests\they-heard-you`
- Original full specification: `C:\Users\Owner\ai tests\They-Heard-You-Build-Prompt.txt`
- There is **no trailing space** after `ai tests` in either path.
- Read the original document fully. This handoff summarizes it but does not replace it.
- Later explicit user requests override conflicting original details. Implementation choices and proposed next steps below are labeled separately.
- Actual current source and tests establish implementation status. Do not treat old assistant summaries as proof that a feature works.
- Preserve the parent specification, parent `game.js`, `index.html`, `styles.css`, and `agent-test.txt`. Those root files are not the current game's entry point.
- Preserve unrelated user changes. Do not reset the workspace, delete saves, commit changes, or create branches without authorization.
- The original specification's first-build cost target was $10, with a historical $50 ceiling explicitly not authorization to spend it. Do not claim to know remaining budget or promise an API cost. Favor small local edits, no paid asset services, no runtime AI, no unnecessary agents or research.

## Honest Current Status

This is a working opening prototype with a modeled RV, chain puzzle, Cletus inspections, recoverable punishments, speech, and repeatable conversation. **There is no complete escape, win condition, rescue ending, or final deadline yet.** Do not present the game as complete.

Most recent development verification before this handoff: `npm run build` passed and all **17 tests** passed. Vite reports a non-fatal warning about the JavaScript chunk exceeding 500 kB. Earlier browser checks verified specific fixtures and screenshots, not an uninterrupted full game playthrough. See Verification below for exact limitations.

`package-lock.json`, `node_modules`, `dist`, and `.test-dist` exist. `dist` and `.test-dist` are generated outputs, not sources to edit. Some README paragraphs are stale: the lockfile already exists, and an older paragraph still says 15 tests while the latest update says 17. Prefer the actual files and fresh command output.

## Game Concept and Tone

**They Heard You** is a roughly 15-25 minute adult horror-comedy adventure set inside a filthy, cramped RV. You have been kidnapped and chained to the floor. Adults outside argue, misplace objects, become suspicious, and periodically enter. Escape requires observation, borrowing and replacing objects, overhearing information, exploiting grudges, and looking restrained when someone checks on you.

Keep it hostile, unsettling, petty, profane, and disgusting. The humor comes from captors enforcing ridiculous household rules while committing serious crimes. Quiet dread matters. Do not soften it into a cute spooky game, inspirational recovery story, or nonstop comedy routine.

All characters are fictional adults. Give them individual personalities, not identity-based caricatures. Ronnie's disability is not the joke. Non-graphic threats and violence belong to the premise; explicit sex is unnecessary. Children remain offscreen and are never drug users or targets of violence. The original offscreen adult called "the creep by the highway" must not become a depiction of child sexual abuse. These boundaries are in the original specification.

### Visual target

Two reference images were visible in the earlier conversation. They showed densely littered RV interiors: stained patterned upholstery, peeling wood paneling, dirty sink and open drawers, pizza boxes, cans, trash bags, broken blinds, jaundiced practical lights, cold blue CRT glow, and unsettling adults. One had a garish handmade 1990s adventure inventory/verb strip with checkerboard scraps and acid-green, pink, and yellow accents. The other showed a detailed hostile adult leaning into a cramped aisle and an intrusive dialogue panel.

Those attachments are not known to have been saved as local image files. Do not claim you can inspect them unless they are shared again. Their atmosphere, not literal copying, is the target. The existing low-poly procedural scene is a foundation, not a photorealistic match.

- Real interactive Three.js geometry, not a backdrop with invisible buttons.
- One continuous RV; five fixed camera views. No WASD, pointer lock, or physics simulation of every piece of trash.
- Low-resolution painted-looking procedural textures, crunchy silhouettes, grime, clutter, readable targets and crisp overlay text.
- Keep the entry clearly **ahead of the original seat**, not alongside it or nearly offscreen. It has an actual wall opening and swinging hinged door.
- Adults must be visible moving behind the blinds. A silhouette changing course toward the entrance is a warning, connected to the person entering through that same door.
- Preserve the original handmade inventory aesthetic and compact controls. Do not redesign it as a modern SaaS dashboard.

## Explicit Later User Decisions

### Entrance and Ronnie

- The user specifically rejected the initial door beside the player's seat. Entrance placement and seat-camera framing were changed to make it visible ahead.
- Outside adults walk back and forth behind blinds; footsteps, silhouette movement, and a readable warning precede entry.
- **Ronnie lies on a couch**, overriding the original specification's upright chair placement.
- **Ronnie cannot speak.** No dialogue lines, spoken clues, or generated speech for him. He communicates through gaze, gestures, expressions, nonverbal cries and his buzzer. He retains agency and can choose to help or alert others.
- Sudden actual movement near him or loud nearby activity can upset him and trigger an outside reaction: "Hey, what the fuck was that?" Mouse movement and ordinary inspection clicks must not cause punishment.

### Cletus inspection and punishment

- Successful pretending restrained must not cause an accusation that the chain is off the floor. He instead rambles in a paranoid, nonsensical way.
- User proposed spoon confiscation/repaired chain with a screwdriver alternative, and knockout/item removal/rearrangement if caught tinkering.
- The implementation interpreted these as escalation: first caught chain offense repairs the chain and removes the spoon; subsequent caught chain offenses cause blackout and emptied pockets.
- Critical recovery must remain possible. The first punishment leaves a screwdriver in the reachable kitchen drawer. Blackout puts pocketed objects in a recoverable bundle in that drawer.
- User said to move everything after blackout. **Implemented scope is smaller:** seeded loose-paper rearrangement and scrape marks, not moving every furnishing. This limitation was disclosed. Do not claim the full request was implemented.
- Original "preserve pocketed critical items" behavior is superseded by recoverable confiscation. Do not silently remove this later feature when implementing the rest of the original specification.

### Speech and optional conversation

- User requested audible outside/inside dialogue with a threatening, harsh, vocoder-like synthetic quality. Processed local speech is now implemented despite the original warning against goofy default TTS.
- "Tell me more" lets the player keep talking as long as desired. Current Cletus implementation loops six authored fictional conspiracy topics: fake moon, fifth dimension, Earth splitting timelines, anonymous-message/coupon-number clues, and a secret council inside a photocopier.
- On the fifth continuation per visit, he walks close to the camera, dips his head, puckers for a brief kiss, then retreats. It is non-explicit, skippable, and happens once per visit. Conversation remains available afterward.
- "Enough" ends the conversation. Talking/kissing does not erase evidence or advance the game deadline. There is no runtime LLM generating fresh conversation; authored topics repeat.
- This currently applies only to Cletus. Other adults have not yet received interactive encounters or the same conversation behavior.

## What Is Implemented

### Exploration and opening puzzle

- Vite + strict TypeScript + Three.js, vanilla HTML/CSS overlay, local Lucide icons.
- Procedural RV geometry, floor/paneling/fabric textures, kitchenette, sliding drawer, liftable cushion, dinette, CRT, rear bunk/couch, blinds and apertures, litter, props, lights, humanoid meshes.
- Views: `seat`, `kitchen`, `bracket`, `dinette`, `rear`. Initially only the first three are reachable.
- Lift the cushion, collect the spoon, select it and click the fitting three times. `bracketWork === 3` frees the floor chain, leaves the cuff on, and unlocks rear views.
- Rag in the kitchen drawer, item selection, Look/Take/Use/Talk/Put Back, returning objects, cancelling selection, hover labels, hold-to-highlight, hints and journal.
- Current item IDs: `spoon`, `rag`, `screwdriver`. No water, batteries, phone, hatch handle, pawn receipt, or tool-ownership puzzle yet.
- Talk as a generic hotspot verb is mostly a placeholder; Cletus's choices are in the encounter panel.

### Inspection loop

- Single encounter state: `idle`, `alarm`, `approach`, `entering`, `dialogue`, `leaving`, `blackout`, `kiss`.
- Agitation at 85 triggers Ronnie's alarm; at 30 there is a warning caption. Rapid actual transitions touching the rear and repeated Use on the rear hatch cause agitation. Quiet allows decay; cooldown prevents immediate retriggers.
- Alarm lasts 2 seconds, approach 12 seconds, entry animation 4 seconds, departure 5 seconds. A routine first visit begins at 95 elapsed exploration seconds if no visit has occurred.
- `chainCaught` is captured at the approach-to-entry boundary: partial or fully loosened fitting is exposed unless the player is at `seat` and `bracketConcealed` is true.
- Changing the cinematic camera to face Cletus does not change the recorded player view/evidence.
- Pretend restrained requires the actual seat and nonzero bracket work. It conceals the fitting and lowers the cushion. Leaving the seat reveals the fitting. There is no last-second dialogue option that retroactively hides observed evidence.
- Open drawer and being away from the seat are separate observations; an open drawer alone must not imply a loose chain.
- Suspicion persists. Cletus talks and exits; only caught chain tampering invokes chain punishments.
- First caught chain offense: spoon becomes `confiscated`, work resets to zero, screwdriver becomes available in the open kitchen drawer, player returns to seat.
- Later caught chain offenses: blackout, +90 seconds, increment day label/knockouts/layout/seed, reset chain, empty inventory into `stash`, open drawer. Wake acknowledgement stops the blackout; recover bundle and reuse screwdriver. Blackout currently has no lethal third-strike limit.
- Six-second kiss phase advances its own animation timer but not `elapsed`; resumes dialogue or supports Skip. `talkCount` and `kissed` persist and reset on a new entry.

### Audio and persistence

- Web Audio ambience and procedural drawer/chain/footstep/door/alarm/kiss effects.
- Bundled WAV clips in `public/voices`, with `manifest.json` mapping exact dialogue text to asset paths. Latest generator output reported 23 clips.
- Windows `System.Speech` generates speech offline using `scripts/generate-voices.ps1`. Runtime processing: playback-rate changes, bandpass filter, distortion, ring modulation, compression and stereo panning. This is vocoder-like treatment, not a full speech-analysis vocoder or recorded actor performance.
- No paid service, remote voice API, CDN, or runtime AI. All generated speech is served locally by Vite/build output.
- Captions remain visible. Pause has volume and a processed-voices toggle. Menus/hidden tabs interrupt speech; dialogue can be voiced while gameplay timers are stopped.
- One authoritative `GameState`, current schema **version 3**. Storage key remains **`they-heard-you:first-pass:v1`** for compatibility. Do not confuse storage key with schema version.
- `decodeSave` migrates versions 1/2 and older v3 saves without conversation fields. Preserve migration when adding puzzles.
- Saves contain seed, elapsed time, view, placements, bracket work, concealment, noise, journal, strikes/blackouts/layout and encounter progress/evidence/conversation state.
- Resume, restart confirmation, pause, reduced visual effects, fullscreen and localStorage-unavailable warnings exist. Settings are not all persisted.

## Source Map

| File | Responsibility / useful symbols |
| --- | --- |
| `src/state.ts` | `GameState`, `Action`, `transition`, `freshState`, `inventory`, `canVisit`, `decodeSave`; puzzle rules, consequences, timers, migration. |
| `src/encounters.ts` | `Encounter`, `PHASES`, `RESPONSES`, `RAMBLES`, `openingLine`, `conversationLine`, `warning`, patrol calculation. |
| `src/main.ts` | Startup, `dispatch`, `interact`, saves, menu handlers, animation loop, `encounterDialogue`, speech triggering. |
| `src/world.ts` | `World`, fixed `CAMERAS`, builders, mesh registration/raycasting, `applyState`, `currentShot`, animation/render, prop placement. |
| `src/textures.ts` | Seeded PRNG, dirty textures, signs, static missing-person CRT texture. |
| `src/content.ts` | Item/hotspot labels, inspect text, hints, authored outside captions. |
| `src/ui.ts` | HTML overlay, inventory, meters, warnings, UI blocking, icons, highlight labels. |
| `src/styles.css` | Responsive gritty UI, dialogue/blackout styling. |
| `src/audio.ts` | `AudioEngine`, effect synthesis, `speak`, voice fetch/cache/processing/interruption, volume and pause. |
| `scripts/generate-voices.ps1` | Windows-only offline speech generation; extracts lines from source and writes WAVs/manifest. |
| `public/voices/` | Actual shipped speech assets. Preserve or regenerate together with the manifest. |
| `tests/state.test.mjs` | Reducer tests for puzzles, inspection, consequences, recovery, saves, conversation/kiss. |
| `tests/voices.test.mjs` | Exact-line speech coverage, WAV file presence/header and nonspeaking Ronnie guard. |
| `tsconfig.test.json` | Compiles state/encounter module dependencies to `.test-dist` for Node tests. |
| `package.json`, `package-lock.json` | Scripts and pinned dependency graph. |
| `README.md`, `SPOILERS.md` | Existing launch notes and implemented walkthrough; some older README claims are stale. |

### Important engineering constraints

- Derive mesh visibility/placement from state; do not keep independent puzzle truth in UI or renderer.
- `transition` clones nested encounter state and journal. Keep future nested state immutable too.
- `world.applyState` is called on actions and ticking. New animated state must reach it during ticks, not just clicks.
- One active visitor. Future owner requests must queue rather than overlapping Cletus or being resolved omnisciently from outside.
- Keep approach warnings visible in all closeups. Ambient captions must not overwrite encounter warnings.
- Free exploration ticks are suspended during menus/hidden tabs/dialogue/blackout. Kiss has its own advancing animation with frozen game time. Avoid `setTimeout` gameplay deadlines that ignore pause/resume.
- Current take/return logic explicitly handles spoon and screwdriver, then falls through to rag. Do not just expand `ItemId` and accidentally make all new items behave like the rag. Add explicit placement rules.
- Current encounters and renderer are largely Cletus-specific. Adding Ray requires actual actor/reason IDs, authored responses, distinct model and owner checks, not just changing a label.
- Every new pickup needs content, reducer handling, saved placement/migration, actual geometry/raycast target, inventory behavior, and tests.
- Never consume unique items on failed combinations or put a recovery tool behind the chain it must release.
- `System.Speech` generator extracts source with regex and assigns sequential filenames. Changing wording requires regenerating the manifest and WAVs together; stale browser caches may need refresh. Do not claim missing lines are voiced. A structured line catalog would be a reasonable focused improvement, not an excuse for an engine rewrite.

## Remaining Original Game Design

Read the full parent build prompt for exact requirements, dialogue examples, and content boundaries. This is the remaining dependency graph:

1. **Win Ronnie's trust:** sealed water and moving an ashtray out of his reach. Nonverbal deliberate gaze reveals the screwdriver drawer. Ignoring him remains possible; never require harming him.
2. **Borrow Ray's tools:** screwdriver opens decorative service panel containing dead spare battery, working battery and replacement pull handle. Tool ownership has a known original spot and Put Back action. Ray announces he needs it and checks its actual placement.
3. **Create an outside distraction:** discover pawn receipt and Darlene's claim stub; use Dale's missing-amplifier grievance and truthful evidence to start an argument. Guaranteed 75-second safe window; repeatable if missed, never a permanent lockout.
4. **Repair rear emergency hatch:** matching replacement handle, screwdriver, rag padding. Fictional click-to-fit adventure actions. Partial preparation persists; final noisy work is safest during the argument. Return the screwdriver.
5. **Ditch Water ending:** escape physically through the repaired hatch during the distraction.
6. **Rescue route:** power prepaid phone with working battery, read tow invoice behind CRT for location, make an abstract help call, survive final inspection, signal through window when blue lights arrive. If Ronnie trusts you, tell responders his location. No extra explorable rescue map.

Other unfinished requirements:

- All five recurring adults with distinct looks/animations: Darlene, Cletus, Dale, Ray, Ronnie. Currently only Cletus has interactive dialogue; Ronnie is a modeled alarm source. The other outside silhouette is a modified clone, not a full distinct cast member.
- Three encounters with three responses and materially different outcomes for each speaking core NPC; personality/clue-based rather than arbitrary lethal trivia. Current optional rambling does not fulfill that full quota.
- Compressed approximately 22-minute deadline and four evolving TV search stages: missing report, county search, vehicle description, nearby police. Current TV is static and passive police rescue does not exist.
- Sleep debt, warned blackout/rest, fictional stimulant benefit/rebound/craving, explicitly voluntary Just One More Day ending. No real drug recipes/names/doses. HUD sleep/search values are still mostly initial indicators.
- Two survivable knockouts then brief non-graphic fatal outcome, meaningful checkpoint retry and restart; reconcile with newer confiscation/recovery behavior. Currently knockouts can repeat indefinitely.
- Original Cletus post-knockout scene implying urination through sound/wet floor/framing, no genitals, brief and skippable on repeats: **not implemented**.
- Hidden developer tools off by default: **not implemented as a product feature**. Earlier browser fixtures were temporary test instrumentation, not a supported debug menu.
- Optional offscreen cameos and sticker distraction for noisy children come last, after a complete escape path.

## Recommended Next Milestone: Borrowed Time

This was discussed as the next puzzle, but **not implemented** and not a command to start automatically during handoff. Follow the user's next instruction. The proposed 60-second tool grace is a design suggestion, not an original-spec constant.

1. Place a clearly visible sealed water bottle on the dinette and a separate smoking ashtray by Ronnie's couch. The existing dinette emergency ashtray should not silently occupy two places.
2. Let Ronnie accept water and indicate discomfort through eyes/hands. Move the ashtray to an explicit safe shelf. Either order works. Trust reduces ordinary-movement agitation but is not immunity to deliberately loud activity and does not cancel a visitor already approaching.
3. Earn a repeatable gaze clue toward a labeled rear tool drawer. It remains discoverable without trust; avoid a magic kindness lock.
4. Borrow a screwdriver from an outlined location labeled RAY / PUT IT BACK. **Reconcile this with the existing recovery screwdriver.** The player must not need to be caught first to obtain a tool, and existing save holders must not lose theirs. Prefer a consistent shared item/ownership model or clearly explain distinct tools, avoiding duplicates or contradictory origins.
5. Use it on a visible service panel; reveal the hatch handle and batteries. Opening persists through interruptions.
6. Proposed grace: 60 free-exploration seconds from borrowing, followed by the normal 12-second approach after Ray calls for his tool. Early return can cancel a queued request; active arrival still checks the returned spot. Queue behind Cletus, pause with menus, and rearm only on a real new borrow.
7. Return the tool, close its drawer, return to seat and conceal the fitting. Ray checks actual empty/filled outline plus relevant visible evidence. Allow reborrowing for hatch work.
8. Test both help orders, no-help discovery, old recovery screwdriver saves, failed uses, return/reborrow, interrupted panel work, queued visits, pause/hidden tab, save during warning, and no dead ends after blackout.

Then implement the amplifier dispute, hatch work, and **one real escape ending** before expanding optional dialogue further. Keep momentum toward a complete game.

## Cast Reference

- **Darlene / Mom:** authority, cardigan/oversized shirt/cigarette, obsessed with disrespect and household rules. "I don't care who chained you to what. That drawer was shut."
- **Cletus / Starshine:** lanky, stained sleeveless shirt, cheap sunglasses, malicious cheerfulness and invasive behavior. Later user requested nonsensical conspiracy chatter and kiss animation. His absurd claims are fictional characterization, not factual advice.
- **Dale:** smeared face paint, loud vest, missing amp, grievance-driven loyalty. "That amp's family. You are currently more of a paperwork issue."
- **Ray / Tinker:** grease-stained mechanic, counts tools, stalled motorcycle project. "It's not broken. It's waiting on one part. Been waiting since 2009."
- **Ronnie:** nonspeaking adult reclining on a couch, with gaze, hands, facial reactions and buzzer. **Do not give him speech.**
- Offscreen names in the original: Warrant Wes, Vince, Curtis, Bev, Dennis, a bickering adult couple. Do not spend the next development pass building all of them.

## Run and Test on Windows

Use Windows PowerShell from the correct folder. A previously opened async terminal started in the parent and `npm run dev` failed there; set the location explicitly in each new terminal.

```powershell
Set-Location 'C:\Users\Owner\ai tests\they-heard-you'
npm test
npm run build
npm run dev -- --port 5174
```

Dependencies were installed already. On a new checkout/machine use `npm ci` with the existing lockfile, then the commands above. Do not gratuitously upgrade packages during feature work. Current pinned versions: Three.js 0.169.0, Lucide 0.468.0, TypeScript 5.6.2, Vite 5.4.8, @types/three 0.169.0.

Last running URL: `http://127.0.0.1:5174/`. Verify it is still running rather than assuming persistent processes survive a new session. Vite may choose the next port if occupied; use its printed URL. Do not kill unrelated servers. Directly opening HTML will not run the TypeScript app.

Regenerate speech only after changing spoken content:

```powershell
Set-Location 'C:\Users\Owner\ai tests\they-heard-you'
& '.\scripts\generate-voices.ps1'
npm test
npm run build
```

The generator needs Windows PowerShell/.NET `System.Speech` and an installed synthesis voice. It is not required just to play: bundled WAVs already exist. Do not request credentials, use paid speech APIs, or weaken global execution policy to regenerate assets.

### Save and browser-testing cautions

- `http://localhost:5174` and `http://127.0.0.1:5174` have separate localStorage. Keep the user on a consistent origin when resuming progress.
- Do not clear the user's save for a smoke test. Use an isolated browser context/origin or page-local fixture storage.
- The app saves on pagehide. Setting a fixture into localStorage immediately before reload can be overwritten by that handler. Earlier tests installed fixtures before app initialization or used page-local in-memory storage.
- Focus loss pauses the game. Tool calls can move focus and open the Pause dialog; resume deliberately. A timer not advancing while hidden is expected behavior, not proof of a broken encounter.
- Some earlier test pages had temporary injected fixtures/meshes. Prefer a fresh isolated page rather than trusting their state or copying their storage into the user's game.
- Audio needs Start/Resume user activation. Speech parsing uses exact manifest strings or the first quoted utterance; check the clip-coverage tests when authoring lines.

## Verification Record and Remaining Risks

Completed during prior development, not rerun merely to write this document:

- Latest production build succeeded; 17 Node tests passed.
- Tested concealment vs caught chain evidence, partial progress, spoon confiscation, reachable screwdriver, blackout recovery, pause behavior in state, save migration and immutable transitions.
- Tested repeated Tell me more, once-per-visit kiss, skip, mid-kiss persistence, unchanged game clock and retained inspection evidence.
- Voice tests check authored clip coverage and WAV headers; Ronnie has no speech clips.
- Browser fixtures verified safe dialogue, screwdriver/bundle raycast visibility, empty/recovered inventory and restored blackout state.
- Browser Web Audio analyser measured a nonzero processed speech signal; this is **not** subjective proof the voice sounds scary, clear, or pleasant.
- Browser interaction check clicked through all five topics, triggered kiss/Skip, continued to the sixth topic and ended normally with zero elapsed conversation time.
- Desktop and portrait screenshots/canvas checks exercised kiss poses, actor travel, camera clearance and lighting. These are not a comprehensive clipping test of every frame and every viewport.

Unfinished validation/risk to keep visible:

- No uninterrupted full start-to-escape test is possible yet because no ending exists.
- Detailed moving-shadow/silhouette readability and the full uninterrupted encounter loop still deserve visual verification.
- Current humanoids and face/hand animations are crude procedural models. Do not claim reference-image realism or polished character animation.
- Confiscation/refastening is currently a state/text/mesh update, not a fully hand-animated tool-taking and repair scene.
- Kiss skips back to conversation; full retreat/contact can use further visual polish. Voice duration and animation duration are not lip-synchronized.
- Some old README statements conflict with latest status. Update existing documentation when touching relevant features, not by producing lots of extra status files.
- Future full-escape saves, terminal states, owner inspections, timing fairness and migration will need new focused tests. Current 17 tests do not cover unimplemented systems.

## Collaboration Preferences

The user wants concrete working changes when requesting implementation, but sometimes explicitly asks only to plan or give a quick rundown. Honor that distinction. Give short, useful progress updates; avoid long design essays before acting. Make sensible choices where possible, state important interpretations, keep tests targeted, and verify a small edit before widening scope. Do not spawn subagents: the original build prompt requests one economical developer agent.

Do not create unsolicited Markdown reports for each change. This handoff file was explicitly requested. Keep README and SPOILERS accurate when behavior changes. Never claim testing that was not performed, or repeat the earlier mistaken assertion that editing tools are unavailable without checking the current session's actual capabilities.

The next assistant does not need access to previous chat logs or private assistant memory. Everything essential for continuation is in this file, the original build prompt, and the project source. Continue the user's game, not a replacement project.