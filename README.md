# Slipper Rush 🩴

A 3D lane runner set on a colourful South Asian street. Mom is chasing you with her slipper.
Swipe between three lanes, jump crates, roll under washing lines, dodge painted trucks and rickshaws,
and grab samosas and power-ups.

Built with **React** (menus and HUD) and **Three.js** (the 3D world). Every model and texture is made
in code, so there are no image or model files.

## Three ways to play

- **Endless:** tap *Tap to play*. Run as far as you can through the **World Tour**: every 900 m you pass
  under a welcome arch into a new place, each with its own look and its own obstacles.

  | Place | Road | Scenery | Obstacles |
  |---|---|---|---|
  | Old City Bazaar | painted street | shop houses, neon signs, bunting | crates, fruit carts, washing lines, rickshaws, truck art |
  | Sunny Beach | sandy road | beach huts, palm trees, umbrellas, animated sea | sandcastles, cool boxes, volleyball nets, buggies, ice-cream trucks |
  | Mountain Road | mountain road | stone houses, pines, prayer flags, snowy peaks | boulders, hay carts, STOP barriers, jeeps, decorated buses |
  | Railway Station | railway tracks | platforms, parked trains, overhead wires | luggage trolleys, tea carts, platform signs, baggage tractors, train carriages |

- **Story:** 5 chapters, each with a finish line, goals and boss phases. Earn up to 3 stars per chapter
  (finish, collect the samosa goal, never stumble). New chasers: **Dad** on his motorbike throwing
  newspapers, and **the Principal** on his bicycle throwing books. Chapter 5 is a tour of all 4 places.
- **Ghost Race:** a new best score saves your **ghost**, a see-through replay of your run. Race it on
  exactly the same track, or **share a challenge code** with a friend so they race your ghost.

## Pet sidekicks

| Pet | Price | Skill |
|---|---|---|
| Mithu the Parrot | 1,500 | Flies beside you and squawks early, so throw warnings last longer |
| Billo the Cat | 2,500 | Pulls in samosas from the lanes next to you |
| Moti the Puppy | 3,500 | Digs up bonus samosas as you run |
| Bakri the Goat | 5,000 | Headbutts one obstacle out of your way each run |

## Style: customize your runner

The **Style** button opens a character creator with a live 3D preview (the camera zooms in on the face
while you edit it). Everything is free to change and is saved separately for each character:

- **Art style:** Cartoon (big head, big eyes, chunky sneakers; the default) or Realistic
- **Body:** man or woman, slim / regular / athletic build, 8 skin tones
- **Face:** oval, round or square jaw, eye colour, facial hair (stubble, mustache, goatee, full beard)
- **Hair:** short, quiff, buzz cut, curly, spiky, long, ponytail, bun or bald, in 9 colours
- **Clothes:** T-shirt, cricket jersey, hoodie, shirt and tie or kurta; shorts, jeans, track pants or
  trousers; each in 14 colours, plus shoe colour
- **Extras:** cap or beanie, glasses or sunglasses
- **Random** makes a new look, **Reset** goes back to the character's own look

The runners and chasers are built by `scene/human.js` with human proportions: a real face (jaw, nose,
ears, lips, eyes with iris and reflection), tapered arms and legs with no ball joints, hands with a
thumb, and sneakers with soles. All the options live in `game/looks.js`.

## Home screen

- **First run tutorial:** the game pauses at each move (lanes, jump, roll, red circles, skateboard)
  until the player does it. It can be replayed from Settings.
- **Settings (gear button):** graphics (Beautiful or Smooth), sound effects, music and vibration.
- **Challenge links:** opening the game with `#race=SR1-...` in the address opens Ghost Race with the code filled in.

- **Shop** (with a live 3D preview of everything you tap):
  - **Runners:** Ali, Zara, Chotu, Maya, Rocky and Nana (grandpa, with glasses and a beard)
  - **Outfits:** Cricket Kit, School Uniform, Tracksuit, Eid Kurta, Super Hero (with a cape) and Solid Gold (shiny metal)
  - **Skateboards:** Classic, Truck Art, Neon (glows) and a Magic Carpet
  - **Upgrades:** make the Magnet, Rocket Bag, Turbo, Chai Time and skateboard rides last longer (5 levels each)
  - **Pets:** see above
  - **Skateboard rides:** buy one, or a pack of 5
- **Trophy Room:** score awards (Bronze 1,000, Silver 5,000, Gold 15,000, Diamond 40,000, Legend 100,000),
  your highest score and your top 5 runs.
- **Missions:** 12 goals that pay samosas, such as "Survive Mom's Scooter Rage" and "Land 5 flips in one run".
- **Daily gift:** free samosas every 24 hours, sometimes with a skateboard ride.
- **Results screen:** new-record trophy with confetti, plus every award and mission you completed in that run.

Samosas are the coins. Everything is saved in the browser (`localStorage`) under `slipper-rush-profile-v1`.

## Skateboard and Rocket Bag

- **Skateboard:** double tap the screen (or press B / Shift, or the green button) to ride. You go 22% faster,
  and the board breaks instead of you if you crash. You can also find free boards on the road.
- **Rocket Bag:** the school bag turns into a jetpack. You fly high above the traffic collecting samosas.

## Run it

```bash
npm install
npm run dev      # open http://localhost:5173
npm run build    # creates dist/index.html (the whole game in one file)
```

While `npm run dev` is running you can use the browser console:
- `__game` is the live game state, e.g. `__game.power.kite = 7` or `__game.player.shield = true`
- `__step(120)` runs two seconds of game instantly

## How to play

| Action | Touch | Keyboard |
|---|---|---|
| Change lane | Swipe left / right | ← → or A D |
| Jump | Swipe up | ↑, W or Space |
| Roll (or slam down in the air) | Swipe down | ↓ or S |
| Pause | Pause button | P or Esc |

- **Crates and fruit carts:** jump over them, or land on top and run across.
- **Washing lines:** roll under.
- **Trucks and rickshaws:** change lane. Some drive towards you.
- **Mom's slipper:** a red circle appears under you. Leave that lane before it lands.
- Bumping into the side of something makes you stumble. Mom catches up, and a second stumble within
  6 seconds means you're caught.

**Power-ups:** Samosa Magnet, Helmet (survive one hit), Turbo Rush (smash through everything),
Double Score, and Kite Flight (fly over the street collecting a trail of samosas).

The score multiplier goes up every 600 m (up to x5). Samosas are saved between runs.

### Excitement

- **Close call!** Swerve past something in the next lane at the last moment: bonus points and a split second of slow motion.
- **Coin combos:** collect coins one after another without a gap. Every 10 in a row scores more; 30 in a row starts **Coin Frenzy**, where coins fill all three lanes and count double.
- **Bounce pads:** trampolines on the road launch you about 6.5 m up, through coin arcs in the sky or onto train roofs.

### Daily rewards (the gift button on the home screen)

- **Login streak:** 7 days in a row, bigger rewards each day (day 7: 1,000 coins and 2 skateboards). Miss a day and it starts again.
- **Lucky wheel:** one free spin every day.
- **3 daily challenges:** new ones every midnight (the same for everyone on that day), for example close calls, combos or bounces.
- Code: `game/daily.js` and `ui/Daily.jsx`.

### Keys, revive, force fields and water balloons

- **Keys** (blue, rare, floating high: jump for them) are also on the Lucky wheel, the day-7 streak reward and in the Shop (Items tab). When you get caught, the **Save me!** screen gives you 5 seconds to spend keys and keep running: the road ahead is cleared and you are safe for 3 seconds. Each revive in a run costs double: 1, 2, 4, 8 keys.
- **Force fields:** buy them in the Shop, then tap the blue shield button in a run (or press E). For 12 seconds you smash through everything and Mom's throws bounce off. Sometimes there is one on the road too.
- **Water Balloon Launcher:** a power-up on the road. Tap FIRE (or press F) to throw water balloons down your lane; each one bursts the first obstacle it hits (+50 points).

### American cities

Endless runs now mix home and America: Old City Bazaar, **New York City** (glass skyscrapers, yellow taxis, city buses, hot dog carts), Sunny Beach, **Las Vegas** (neon towers, pink tour buses, desert skyline), Mountain Road, **Los Angeles** (pastel houses, palms, convertibles, food trucks, hills) and the Railway Station. Story chapter 6, **Coast to Coast**, tours all three US cities with Dad chasing you.

### Music

The soundtrack is synthesized in code too (`game/audio.js`), so there are no music files and no copyright worries. A little band plays a song written as data: kick, clap, hi-hats, dhol (low "dhum" and high "ta" in a bhangra rhythm), a deep bass, warm chord pads, a pluck arpeggio and a catchy lead hook with echo and reverb, in D Phrygian dominant for a South Asian flavour. The menu has its own relaxed theme. During a run the music builds: it starts with drums and bass, the full band and melody join in, and boss chases and Turbo make it faster and busier (the melody jumps an octave). Chai Time slows it down.

### The world

People walk along the pavements and cheer as you run past (`scene/people.js`). Railway bridges cross the road with trains rumbling over them, and you run through lit tunnels, cut through rock in the mountains (`scene/landmarks.js`). Bazaar houses have AC units, satellite dishes, washing lines, potted plants and fruit stalls.

### Running on roofs

Parked trucks and train carriages sometimes have a **ramp** in front. Run up it and along the roof,
where a line of coins is waiting; some carriages come in pairs for a longer roof run. Ramps only block
you from the side (`overlapAny` / `floorAt` in `engine.js`).

### What makes it different from other lane runners

- **Mom's Scooter Rage (boss phase).** Every 700 to 950 m Mom hops on her scooter, rides alongside you
  and throws slippers into two lanes at once. The road is cleared of obstacles, so it's pure dodging.
  Survive 8 seconds for a big bonus.
- **Monsoon storms.** Rain rolls in, the sky goes grey, lightning flashes and puddles splash.
- **Air tricks.** Swipe up again in the air to flip. Land after the flip finishes for 75 / 250 / 600
  points; land mid-flip and it's a "sloppy landing" with no points.
- **Chai Time.** A power-up that puts the world in slow motion for 5 seconds (and slows the music).
- **Catch the cricket ball.** A ball swings across the lanes high up. Jump to catch it: HOWZAT!
- **Day and night.** Golden hour, sunset, a starry night with lit windows, neon signs and street lamps,
  then dawn. One full cycle is about 3 minutes.

### Graphics settings

The **HD / Fast** button on the menu switches between high quality (glow, shadows, cartoon outlines,
sharp pixels) and fast mode for older phones. If a phone can't keep 32 FPS in HD, the game switches to
Fast by itself.

## Project map

```
src/
  main.jsx                 starts React
  App.jsx                  screens: menu, paused, game over; saves best score and samosas
  styles.css               glossy buttons, HUD pills, cards
  ui/icons.jsx             small SVG icons
  ui/art.jsx               shop and trophy pictures (avatars, outfits, boards, cups)
  ui/Shop.jsx              the shop with tabs and live preview
  ui/Panels.jsx            Trophy Room, Missions, daily gift and results
  ui/Creator.jsx           the Style screen (character creator)
  ui/Modes.jsx             Story map and Ghost Race panel (challenge codes)
  game/
    config.js              ALL tuning numbers (speed, gravity, timings, Mom's lines)
    catalog.js             every character, outfit, board, pet, upgrade, trophy and mission (edit to add more)
    looks.js               every option in the character creator, and resolveLook()
    world-data.js          the 4 places, the 3 chasers (and their lines) and the 5 story chapters
    rng.js                 seeded random numbers, so the same seed always builds the same track
    save.js                the player profile, chapter stars, ghost saving and challenge codes
    engine.js              BRAIN: lanes, physics, collisions, power-ups, scoring
    spawner.js             builds the road ahead and makes sure there's always a way through
    fx.js                  ids, particles, banners, sound events
    audio.js               sound effects and music, synthesized with the Web Audio API
    useGameLoop.js         HEART: runs every frame with requestAnimationFrame
    Game.jsx               joins engine + 3D view + swipe controls + HUD
    scene/
      world.js             the 3D view: puts everything together, camera, lighting, quality
      sides.js             road tiles per place, side scenery per place, the sea shader, welcome arches
      skins.js             what each obstacle looks like in each place
      human.js             the human body used by every runner and chaser, built from a "look"
      chasers.js           Mom, Dad and the Principal, their vehicles and what they throw
      pets.js              the four pets and the see-through ghost runner
      models.js            runners (built from catalog choices), Mom, scooter, boards, vehicles, samosas
      sky.js               sky shader, day/night colours, stars, clouds, kites, birds
      props.js             poles with bunting / flags / train wires, lamps, leafy, palm and pine trees
      weather.js           monsoon rain
      post.js              anti-aliasing, bloom glow, colour grading and vignette
      textures.js          truck art, shop signs, road, windows and clouds painted on canvas
```

## Ideas worth understanding

1. **Engine and view are separate.** `engine.js` only does maths in metres. `world.js` reads that
   state every frame and moves 3D meshes to match. You could swap Three.js for something else and
   keep the whole engine.
2. **The kid never moves forward.** He stays at z = 0 and the world comes towards him. Each object is
   drawn at `-(z - d)`, where `d` is the distance run. The road just scrolls its texture.
3. **Recycling.** Houses and poles that pass the camera jump to the far end with a new look, and
   obstacle meshes go back into a pool. Nothing is created while you play, so it stays smooth.
4. **One axis at a time.** The kid moves sideways first, then forward. A hit while moving sideways is
   a stumble; a hit while moving forward is a crash. That small trick is how lane runners decide which
   is which.
5. **Characters are nested groups.** Hip → knee → foot. Rotating a group swings everything inside it,
   and `Math.sin(runPhase)` drives the run cycle.
6. **Physically based materials.** Every surface has a roughness (matte or shiny) and metalness. An
   environment light makes shiny things (truck paint, chrome, the gold outfit) reflect their surroundings.
7. **Glow is just brightness.** Bloom makes anything brighter than white glow, so a lamp bulb glows
   because its colour is set above 1.0 at night.
8. **The HUD skips React re-renders.** The score is written straight into the DOM through refs, so
   React doesn't re-render 60 times a second.
9. **Seeded randomness makes replays possible.** The track is built only from a seeded random number
   generator (`rng.js`), and obstacles are spaced by *distance*, not time. So the same seed always gives
   the same track, however you play. A ghost is just that seed plus where you were every 0.25 seconds,
   and a challenge code packs it into text (`packGhost` in `save.js`).
10. **Same rules, different looks.** The engine only knows 5 obstacle types with fixed sizes. Each place
    draws them differently (`skins.js`), so a sandcastle is jumped exactly like a crate.

## Try changing

- In `config.js`, change `startSpeed`, `gravity` or `stumbleWindow`.
- Add a new obstacle in `spawner.js` (`OBSTACLES`) and build its model in `models.js`.
- Add a new character skin: copy `makeKid()` and change the colours.
- Add a 6th story chapter in `world-data.js` (`CHAPTERS`): pick a place, a chaser, a length and bosses.
- Add a new pet in `catalog.js` (`PETS`), build it in `scene/pets.js` and give it a skill in `engine.js`.

## To the Play Store (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Slipper Rush" com.asim.slipperrush --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android      # opens Android Studio
```

In Android Studio:
1. Plug in your phone and press Run to test it.
2. Lock the screen to portrait: add `android:screenOrientation="portrait"` to the activity in
   `android/app/src/main/AndroidManifest.xml`.
3. Use Build > Generate Signed Bundle (.aab). Keep the keystore file safe. Without it you can never
   update the app.
4. Upload it in the Play Console ($25 one-time fee). New personal accounts must run a closed test
   first.

Before release:
- Fonts load from Google Fonts. For an offline app, put the font files in `public/` and load them
  with `@font-face`.
- Test on a cheap Android phone. If it stutters, lower the pixel ratio in `world.js`
  (`setPixelRatio`) or turn off shadows.

## Making money

- AdMob via the `@capacitor-community/admob` plugin.
- Rewarded ad on the game over screen: "Watch an ad to keep running".
- Spend samosas on character skins (cricket kits, Eid outfits), and sell samosa packs as in-app
  purchases.
- Don't run banner ads during gameplay. They ruin the experience.

## Making it look even better

Everything is built from code shapes. For true top-store quality, replace the models in
`scene/models.js` with artist-made glTF models (free CC0 packs from Kenney or Quaternius are a good start)
loaded with `GLTFLoader`. The engine doesn't need to change; only the functions that build meshes do.
