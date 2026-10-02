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

- **Click menus (Sims-style).** Hovering an object only makes it glow and shows its name next to the cursor. Click it and a small ring of numbered options opens around the spot: Look, Grab and a context-specific Use ("Open drawer", "Lift cushion", "Peek outside", "Drink"…). Talk appears on Ronnie. Keys 1–5 pick an option. The menu stays until you pick something, click elsewhere, press Escape or right-click.
- **Pockets.** Click an item to pick it up. A card pops up above it with what it is and everything you can do with it right now (Drink, Smoke it, Chew it, Read it, Wrap the spoon, Wipe the puke, Examine up close, Put it away). While you hold something, its name follows the cursor, and every object's pie offers "Use [item] here" first, highlighted. Escape or right-click puts it away.
- **Text** goes in the single box at the top of the screen, the same one visitor warnings use; the newest message wins.
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

Saves migrate to schema version 12 under the same key.

**Caught off the couch.** There's no countdown, just about 2.5 seconds of running footsteps. If you're not in Your seat view with the fitting concealed when the door opens, the visitor charges you from the door. The camera whips around from whatever view you were in, you take four punches with red flashes and camera jolts, you collapse and fade to black, and you wake up chained to the couch. Your pockets are emptied into the kitchen drawer bundle and 90 seconds are lost. The second time, they kill you in a face-to-face jumpscare and the YOU DIED screen appears. "Wake up again" returns to the moment you last came to, and "Start over" starts a fresh game. The checkpoint is stored under `they-heard-you:first-pass:v1:checkpoint`.

**Darlene** is rebuilt as a gaunt, jaundiced hag with wild straw hair, pinprick pupils, a sagging chest under a filthy tank top, a bare pot belly, frayed cutoffs and big grimy shoes. She never opens a dialogue window, and she leaves Ronnie out of it. The whole visit is a hunt for her lighter, and the pink lighter is clenched in her right fist the entire time. She charges in screaming about it and flings the upper cabinets open. She yanks the drawer out, claws through the lower cabinets and gets in your face. Then she drops to her knees at the trash bag in the aisle and rips it open, flinging garbage across the floor; the camera zooms in on her there. Finally she stands in front of you, pats every pocket, raises her fist, sees the lighter, and slams it down. You watch it bounce onto the papers by your feet, and it stays there for you to take. Whenever she has the lighter back, she does this again. Without it, she drops something else she's holding or steals something off the counter on her way out, never from your pockets. She leaves the cabinets and drawer open.

**Fire** (save schema v9). Hold Darlene's lighter and click something that burns, and you get "Set it on fire" (the lighter's own card lists whatever is in reach):
- the floor papers by the couch (reachable even while chained);
- the trash bag in the aisle (once you're free);
- the pizza box on the dinette table;
- the pizza box by the rear bunk.

The flames grow over about 7 seconds with rising smoke, flickering orange light and a crackle that gets louder, and the trailer fills with haze. At 3.5 seconds Darlene smells it ("Is that SMOKE? … CLETUS! BUCKET!"). Nothing holds her back: not a cooldown, not the paperback read-aloud, and whoever was already coming in becomes Cletus with a bucket. He bangs the door open and charges at the fire. He winds up and heaves grey dishwater onto it with a hiss of steam, screaming "You set my HOUSE on FIRE?" He drops the bucket and beats you unconscious wherever you're sitting. A fire only ever knocks you out, even if you've been knocked out before; it never kills. Game time is frozen while he puts it out, and the used-needle STAB still works when he comes at you. He gives the lighter back to Darlene, who will fling it at your feet again on her next rampage. Whatever burned stays scorched and charred for good, can't be lit again, and has nothing left to rummage.

**Things to do** (save schema v7):
- **Noise matters.** Going over 70 brings someone running ("Hey, what the fuck was that?"), so three quick fitting cranks will do it.
- **Rag:**
  - wrap it around the spoon, screwdriver or axe to muffle it;
  - mop up puke with it (it becomes the Puke rag).
- **Puke** from the Zwinkys or a chewed cigarette butt stays on the floor. If a visitor walks in on it, they make you clean it with your face.
- **Peek** through the blinds to see who's out there, what they're doing and how soon they'll come in.
- **Throw** the baby shoe, magnet, Zwinkys can or paperback out the window to send them off to look, which delays the next visit. The paperback makes Cletus read it aloud in the yard while Darlene heckles, and nobody hears you meanwhile.
- **Cigarette butt:** smoke it with Darlene's lighter for 60 seconds of steady, silent hands. Chew it without the lighter and you puke.
- **Used needles:** if you're holding them when you get grabbed, a STAB button flashes (or press Space) for a split second. Hit it and they stagger out instead of beating you. Works once.
- **Paperback:** read it to calm your nerves (lowers noise and Ronnie's agitation).

**Dale** (save schema v10) is built from the reference art:
- short and round, with a buzzed fade, heavy sad brows, a goatee and ear studs;
- a silver chain over an oversized black ZWINKY ENERGY tee with a big gut;
- baggy blue jeans with a wallet chain, chunky dirty white sneakers, and mitten hands with real elbows.

His visit:
- **When:** his first visit is the first routine visit after about 160 seconds, between TV night and the dance. After that he comes back every 4 minutes or so. Cletus and Darlene still split the random visits.
- **Arriving:** he bangs in with a boombox and a beer, crouches to set the radio on the floor and push play. Then he perches on the front edge of the couch beside you, hunched, feet on the floor. The couch is too high for anything else without his legs going through it.
- **The radio:** plays Fine Again (`public/sounds/fine-again.mid`, copied from `sounds/`) from bar 36, where the second chorus crashes in, looping through the big final chorus. It sounds like a cheap boombox.
- **On the couch:** he nods sadly to the beat, takes long pulls of beer, and talks, voiced, about selling his Marshall half-stack for forty dollars and a bag of ice. He lights a hollowed-out light bulb with a little torch lighter, hits it, coughs out a cloud and slumps.
- **The offer:** he leans over and holds the bulb out. **1. Hit the bulb** or **2. Nah, I'm good, Dale** (click or press 1/2). There's a 10-second countdown; let it run out and he smokes it himself.
- Game time is frozen the whole time he's in. He checks nothing.
- **Leaving:** he always leaves the radio playing on the floor by the couch. Click it to turn it off or on. While it plays, it covers half the noise of working the fitting or chopping the wrapped door.
- **If he catches you off the couch,** he grabs and beats you like anyone else, crying ("Bro. BRO.").

**The bulb trip.** One hit gives about 2 minutes of game time (a second hit stacks, up to 4).
- **The look and sound:** the screen goes oversaturated and the hue drifts. A purple vignette throbs with a heartbeat you can hear, which gets faster as paranoia rises. The room sways and breathes, and the radio clips and blows out louder.
- **Tweaker strength:** every crank of the fitting and every swing of the axe counts double.
- **Shadow people:** tall, thin, faceless silhouettes with pinprick eyes and smoking edges fade in down the trailer (with a whisper), wherever you're looking from. They creep toward you, skipping closer in a flicker.
  - Hover one and it says STARE IT DOWN; click it and it bursts apart, which also calms you a little.
  - If one reaches you, it lunges into your face, the screen jolts, and **you scream**: a big noise spike plus paranoia. Two screams close together bring someone running.
- **Paranoia:** a meter that only appears while you're high. It creeps up on its own; more paranoia means more and faster shadows. At 100 you **lose it** and scream at the corner, which is as loud as it gets.
- **Fake warnings** pop up now and then ("[Outside?] Footsteps. Running? Are they?"), with steps that never arrive. Real warnings never ask questions.
- **Everything looks wrong:** the blinds, Ronnie, the TV, the couch, the walls and the radio all get hallucination descriptions.
- **Comedown:** "The shadows thin out."

**Ronnie** is rebuilt as a starved, sick man lying on his back in a stained adult diaper. He has blocky, readable proportions: visible ribs, a sunken belly, hip bones, thin legs with the feet up at the end of the couch, a bruised, gaunt face with his mouth hanging open and spiky brown hair. One arm is curled up by his forehead, and that arm shakes when he panics. His buzzer sits by his other hand, and he breathes in shallow, quick breaths. A dim lamp over his olive couch keeps him readable from the rear bunk and dinette views.

**The TV** (save schema v11) is local antenna TV and starts off.
- **TV night:** once, on the first routine visit after about 2 minutes, Cletus bursts in and smacks the set on. He has Channel 4 timed so "LOCAL MAN STILL MISSING" starts as it warms up. He stands beside it pointing, cackling, doubling over and wiping his eyes, with voiced insults over the broadcast. Game time is frozen. If you're off the couch when he arrives, you get the beating and TV night happens later.
- **Afterward:** he leaves the set on *with the sound up*. Saves from before this change come back unmuted.
- **The dial:**
  - **Channel 4, COUNTY NEWS 4:** the news story, a "WE'LL BE RIGHT BACK" bumper card, then a commercial break (the Zwinkys Malt Liquor ad), looping.
  - **Channel 11, KRUD 11:** the daytime/nighttime reruns station. It has no shows yet, so it shows color bars and PLEASE STAND BY.
  - **Channel 13:** snow and hiss, nothing else.
- **A real broadcast:** every station airs on one shared clock (`tvClock`, saved), whether the set is on or not. Turning it on or flipping channels lands you mid-program, with a burst of snow first. Two video decks preload the next clip so the cut into a commercial is clean. The picture follows the game's pause and re-syncs itself if it drifts.
- **Adding a commercial:**
  1. Drop the video in `tv/`.
  2. Run `& .\scripts\encode-tv.ps1 -Source "tv\<file>" -Name <name>`. It writes, all loudness-matched, and prints the clip length:
     - `public/tv/<name>.mp4` (H.264 picture);
     - `public/tv/<name>.webm` (VP9 picture fallback);
     - `public/tv/<name>.wav` (the sound, mono 22 kHz).
  3. Add a clip to `CLIPS` in `src/channels.ts`: kind `'commercial'`, `src: 'tv/<name>'` with no extension, that length, and what you see when you Look at the TV.
  4. Add its id to a station's `ads`.

  Ads rotate through the breaks, `adsPerBreak` at a time, so every ad airs. Shows work the same way (kind `'show'`, the station's `shows`). New stations go in `STATIONS` and get a stop on `TV_DIAL`.
- **Picture and sound are separate:**
  - The picture is a muted video: MP4 first, switching to WebM by itself if MP4 errors out or stalls; if both fail, the set shows snow and hiss.
  - The sound is the clip's WAV, played by the game's audio engine and kept within about 0.1 s of the picture, through the same cut-ins to commercials.
  - Why: VS Code's built-in browser (Electron) plays an MP4's picture but can't decode its AAC sound, and can't open WebM at all. WAV decodes everywhere, like the voices, and a muted video is never blocked by autoplay rules.
  - Your originals in `tv/` are untouched; the Zwinkys ad went from 30 MB to about 3 MB of MP4 plus 1 MB of WAV.
- **Dev-only TV report:**
  - Every 3 seconds, the dev server's open game reports what its TV is doing: browser, playable formats, the video decks, autoplay refusals, the speaker and output levels.
  - The report goes to `node_modules/.cache/they-heard-you/tv-report-<port>.json`; the history since the server started is in `.log`.
  - `vite.config.ts` holds the dev-server plugin that writes it. None of this is in a build.
- **At the set:** from the Dinette / TV camera, the TV's menu adds **Turn it off / Turn it on** and **Mute / Unmute** (the power button and volume rocker on its side). Changing channels still needs the remote; the channel knob snapped off.
- **The sound is in the room:**
  - Both decks and the static hiss play through a little speaker: no bass, a boxy honk around 1.4 kHz, a bit of crunch.
  - A 3D panner sits at the set's speaker grille, and the camera is your ears. It's louder and clearer the closer you are, and it sits left or right as you look around.
  - A short, dull trailer-room echo is there wherever you sit.
  - Measured in a headless browser on the static channel: dinette about 2.8× (+9 dB) and rear bunk about 2.5× louder than your seat.
  - It has its own output bus at dialogue level (it used to share the much quieter effects bus). Tuned against a voice line at the output: about as loud as dialogue from your seat, about 2.7× louder at the dinette.
- **The TV remote** is in the game but not placed anywhere yet. Once you have it, its card offers Power / Channel up / Channel down / Mute, and "Turn it on/off" appears on the TV itself. With no remote, the TV can't be controlled (the knobs snapped off).

**Adding visitors later.** Every visitor is an entry in `VISITORS` in `src/encounters.ts` (name, behavior `talk` or `rampage`, grab line, kill line, death text) plus a rig registered in `World.rigs` (root, legs, arms, head, outside patrol X, height). Patrols, running approaches, door slams, grabs, beatings and kills are shared, so a new character gets all of them for free. Only a new behavior needs its own handler.

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

**The linear escape** (save schema v12). Every tweaker hands you one link of the way out; see SPOILERS.md for the full walkthrough.
- **Story beats come when you reach a stage**, not on a timer (`storyBeat` / `stage` in `src/state.ts`), with a breather after each visit:
  - first crank of the spoon → **Cletus's first visit** (a long warning, and his screwdriver left in the drawer);
  - free of the floor → **Darlene** drops her lighter;
  - footlocker open → **TV night**, where he shows you the cuff key on his shoelace;
  - then **the dance**, where the key falls and you press GRAB THE KEY;
  - cuff off → **Dale's bulb**;
  - high → **chop out**.
- **Routine visits** (Cletus/Darlene) keep the pressure on in between, starting only after Cletus's first visit.
- **The gates:**
  - the spoon bends after one turn;
  - the footlocker needs bobby pins **and** steady hands (smoke the butt with Darlene's lighter);
  - the cuff key lives on Cletus;
  - the braced door only gives to tweaker strength.
- **Never stuck:** a **NEXT** objective line under the pockets always says what to do, the 3-level hints follow the stage, refusals name where to go, and the ashtray always has another butt.
- **Pacing:** a scripted, never-dawdling playthrough in the tests takes about 250 s of game time. The frozen set pieces (TV night, the dance, Dale) and real exploring come on top.
- **Old saves** pick up from wherever they are: the cuff key moves onto Cletus, and a save that never met him still gets the intro.
- **Cut:** the dead brass key and the under-bench needle prop.

**Ronnie's room, rebuilt** (`buildRear`):
- the bunk along the back wall under the glued, duct-taped hatch ("EMERGENCY EXIT / NOPE");
- an army **footlocker** in the middle of the room under a bare bulb, with an oversized padlock on the front and a lid that swings up to show the axe, the paperback and the note;
- a red milk-crate nightstand with the needle pizza box;
- Ronnie on his couch.

The Rear bunk camera stands in the doorway so all of it is in frame. **Cabinets:** the two farther doors in each row (k2, k3, u2, u3) hinge on their far edge and swing toward the couch and kitchen views, so you can see inside.

TV sound, take two: production build and all 63 tests pass. The dev report from the actual browser (VS Code 1.139's built-in browser, Electron 43) showed what was wrong: WebM failed with "DEMUXER_ERROR_COULD_NOT_OPEN", and the MP4 played its picture but sent no sound. After the WAV change, the same browser's reports showed the speaker playing the news and then the Zwinkys ad in step with the picture, at about voice level at the dinette. Headless Chrome showed the same, within about 0.1 s across the cuts.

TV sound fix: production build and all 63 tests pass (new: power and mute by hand at the set, but no channel changes). Checked in headless Chrome with normal autoplay rules and a real mouse click on Resume:
- the set picked the WebM (since changed: MP4 picture first, WAV sound);
- the TV and a voice line were metered at the output (`window.__audio.levels()`, dev only): the TV is about as loud as dialogue from your seat;
- the TV's menu at the dinette offers Turn it off and Mute, and both work (muted measures 0);
- the five-button menu no longer overlaps.

The WebM-first fix turned out not to cover VS Code's browser; see "TV sound, take two".

TV update: production build and all 62 tests passed. New tests cover:
- station lineups, the commercial break and ad rotation, cueing, and the dial with its dead channel;
- the broadcast clock saving its place;
- TV night cueing the news and leaving the sound on;
- the v10 → v11 migration unmuting old sets.

A headless browser measured the TV sound at your ears through a dev-only meter (`window.__audio.tvLevel()`, stripped from builds):
- the news is audible (0.10 RMS at your seat, 0.28 at the dinette);
- the Channel 4 break cut cleanly from the news to the bumper to Zwinkys, with sound;
- the TV night clip kept pace with the broadcast clock.

Screenshots show the bumper card, the Zwinkys ad and KRUD's color bars. The speaker and room tone haven't been judged by ear.

Dale update: production build and all 60 tests pass. New tests cover:
- Dale's schedule and frozen hangout, with radio, torch and cough cues;
- hit, pass and offer timeout;
- double-speed work while high, the scream's noise, losing it, and the comedown;
- the radio covering work noise and toggling;
- the v9 → v10 migration;
- voice clips for every Dale line (92 clips total).

Headless screenshots checked:
- Dale walking in, sipping, lighting and hitting the bulb, the offer panel and the bulb close-up;
- the radio left on the floor;
- the trip: hue shift, a shadow in the aisle and up close, "You lose it", and a shadow in the dinette view.

The sitting pose was checked from the player's view plus pinned side and front cameras (shins clear of the couch base, feet on the floor). A headless run hovered and clicked a live shadow person (tooltip "STARE IT DOWN", it burst apart, paranoia 31.5 → 21.9), and a timed run saw one reach the camera and trigger the scream. Dev-only hooks `window.__world` / `window.__shadows` (with `world.debugShot`) exist for these checks and are stripped from builds. None of the new sound has been judged by ear: the Fine Again synth voicing, the clipping, the torch, cough, inhale, whispers and heartbeat.

Previous update: production build and all 54 tests passed (new reducer tests for lighting, growth, the smoke alarm, douse, beating, scorch, the needle stab and the v8 → v9 migration; voice coverage for the two fire lines). Headless screenshots checked:
- Darlene's rampage at the trash, the lighter in her fist, and the lighter landing on the papers;
- fires at all four spots;
- Cletus charging in, heaving the water, the steam, and turning on you;
- the scorched and charred aftermath.

One unscripted headless run lit a fire and let it play all the way through to the blackout panel with no fixtures in between. The "Set it on fire" pie wedge and item-card buttons were type-checked but not clicked in a browser. Before that: production build and 47 tests passed. Headless screenshots showed the TV off, then TV night with the clip playing on the CRT and Cletus beside it. Before that: 42 tests passed. Headless-browser runs drove the pie menus (the cushion, blinds peek and puke mop), the inventory card, the STAB escape and Ronnie's views. Before that: 34 tests passed. Headless screenshots checked Darlene's rampage (cabinets, in your face, the kiss cutaway), a grab from the kitchen view, the kill jumpscare and the death screen. Before that: production build and 32 tests passed. Headless-browser screenshots checked the dance at four points, outward cabinet swings, hover outlines, the examine view and the vomit overlay. The MIDI's sound quality was not judged by ear, and there has been no uninterrupted full playthrough. Earlier: production build and 15 tests passed. Browser fixtures verify successful concealment produces paranoid dialogue without chain evidence, confiscation leaves a raycast-visible screwdriver, blackout empties inventory, the belongings bundle is clickable, and recovery restores the alternate tool. A browser audio analyser measured nonzero output from the processed speech path. This is not subjective listening validation or an uninterrupted full-game playthrough. This remains an in-development prototype, not a complete escape game.