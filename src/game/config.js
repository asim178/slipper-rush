// ============================================================
// config.js: every number that controls how the game FEELS.
// Units are metres and seconds. Tweak these first.
// ============================================================

export const LANE_W = 2.4; // distance between lane centres (3 lanes: -1, 0, 1)

export const T = {
  startSpeed: 14,        // metres per second at the start
  maxSpeed: 30,
  speedGain: 0.12,       // speed added every second
  turboBoost: 1.7,
  chaiSlowmo: 0.55,      // world speed during Chai Time

  gravity: 34,
  jumpVelocity: 11.8,    // peak height = v² / (2 * gravity) ≈ 2 m
  bounceVelocity: 21,  // bounce pads launch you this hard (about 6.5 m high)
  diveVelocity: -18,     // swipe down in the air = slam down
  rollTime: 0.6,
  laneSpeed: 15,         // how fast you slide sideways between lanes
  flipTime: 0.34,        // one air flip; land before it finishes or it's sloppy

  standHeight: 1.7,      // the kid's hitbox
  rollHeight: 0.8,
  halfWidth: 0.38,
  halfDepth: 0.3,

  stumbleWindow: 6,      // two stumbles inside this many seconds = caught
  kiteHeight: 5.2,
  jetpackHeight: 7.5,
  boardBoost: 1.22,     // skateboard speed multiplier
  viewDistance: 150,     // how far ahead the track is generated

  strikeStart: 14,       // Mom starts throwing slippers after this many seconds
  strikeWarn: 1.1,       // seconds of warning before a slipper lands

  rageDuration: 8,       // Mom's Scooter Rage boss phase
  rageZone: 270,         // metres of road kept clear of obstacles for it
  volleyGap: 1.25,

  skyCycle: 185,         // seconds for a full golden hour -> night -> day loop
};

export const TRICK_POINTS = [0, 75, 250, 600];
export const TRICK_NAMES = ['', 'BACKFLIP!', 'DOUBLE FLIP!', 'TRIPLE FLIP!!'];

// Default durations; upgrades in the shop make some of them longer (see catalog.js)
export const POWER_TIME = { magnet: 10, turbo: 5, double: 15, kite: 7, chai: 5, jetpack: 6, board: 10, forcefield: 12, blaster: 12 };

export const POWER_INFO = {
  magnet: { label: 'SAMOSA MAGNET!', color: '#ff4f8b' },
  shield: { label: 'HELMET ON!', color: '#22c7b0' },
  turbo: { label: 'TURBO RUSH!', color: '#8a5cff' },
  double: { label: 'DOUBLE SCORE!', color: '#ffb800' },
  kite: { label: 'KITE FLIGHT!', color: '#2fa8ff' },
  chai: { label: 'CHAI TIME!', color: '#d9822b' },
  jetpack: { label: 'ROCKET BAG!', color: '#ff7a1a' },
  board: { label: 'SKATEBOARD!', color: '#20c25a' },
  forcefield: { label: 'FORCE FIELD!', color: '#39c6ff' },
  blaster: { label: 'BALLOON LAUNCHER!', color: '#ff3b5c' },
};

export const MOM_LINES = {
  start: ['Come back here!', 'Did you finish your homework?!', 'Who broke the window?!'],
  stumble: ['Almost got you!', 'Not so fast!', 'I can see you!'],
  throw: ['Take this!', 'Slipper incoming!', 'You asked for it!'],
  rage: ["That's it, I'm taking the scooter!", 'Beep beep! Here I come!', "You can't outrun a scooter!"],
  rain: ['You will catch a cold!', 'Come inside, it is raining!'],
};
