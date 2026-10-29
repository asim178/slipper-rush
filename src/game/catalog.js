// ============================================================
// catalog.js: everything you can unlock, buy or earn.
// Add a new character or outfit here and it appears in the shop.
// Prices are in samosas (the game's coins).
// ============================================================

// Characters: body and hair. Outfits are chosen separately.
export const CHARACTERS = [
  { id: 'ali', street: { topColor: '#f4f6fb', trimColor: '#3a6fb0', shoes: '#e8364f' },  name: 'Ali', blurb: 'Street cricket star', price: 0, skin: '#c98b5c', hair: 'cap', hairColor: '#1b1b22', capColor: '#ec3b4f', build: 1, body: 'm', hairStyle: 'short', hat: 'cap', face: 'oval', eyes: '#3b2414' },
  { id: 'zara', street: { topColor: '#ff4f8b', trimColor: '#f4f6fb', bottomColor: '#3a6fb0', shoes: '#ffd23f' }, glasses: 'glasses', glassesColor: '#8a5cff', name: 'Zara', blurb: 'Fastest girl in class', price: 600, skin: '#d9a27a', hair: 'ponytail', hairColor: '#3a2418', capColor: '#ff4f8b', build: 0.97, body: 'f', hairStyle: 'ponytail', buildType: 'slim', eyes: '#6b4423' },
  { id: 'chotu', street: { topColor: '#ffd23f', trimColor: '#14a04e', shoes: '#2f5bea' },  name: 'Chotu', blurb: 'Small, but never caught', price: 900, skin: '#b8794d', hair: 'curly', hairColor: '#20140e', capColor: '#2fa8ff', build: 0.94, body: 'm', hairStyle: 'curly', face: 'round', buildType: 'slim' },
  { id: 'maya', street: { topColor: '#8a5cff', trimColor: '#f4f6fb', shoes: '#13b5a5' },  name: 'Maya', blurb: 'Kite-flying champion', price: 1800, skin: '#e0b089', hair: 'bun', hairColor: '#2a1a12', capColor: '#ffd23f', build: 0.98, body: 'f', hairStyle: 'bun', eyes: '#4f7d3a' },
  { id: 'rocky', street: { topColor: '#14121a', trimColor: '#e8364f', bottomColor: '#22356e', shoes: '#ffd23f' },  name: 'Rocky', blurb: 'The fast bowler', price: 3000, skin: '#a86c43', hair: 'spiky', hairColor: '#120c08', capColor: '#20c25a', build: 1.04, body: 'm', hairStyle: 'spiky', buildType: 'athletic', face: 'square', beard: 'stubble' },
  { id: 'nana', street: { topColor: '#8a5a34', trimColor: '#fbf6ea', bottomColor: '#6b7280', shoes: '#f4f6fb' },  name: 'Nana', blurb: 'Grandpa still has it', price: 5000, skin: '#c48f66', hair: 'bald', hairColor: '#e8e8e8', capColor: '#8a5cff', build: 1.0, body: 'm', hairStyle: 'bald', glasses: 'glasses', beard: 'beard', face: 'square', eyes: '#7a8a96' },
];

// Outfits: colours for each body part plus special extras
export const OUTFITS = [
  { id: 'street', name: 'Street Style', price: 0, shirt: '#f4f6fb', trim: '#3a6fb0', pants: '#2f4f8f', shoes: '#e8364f', long: true, top: 'street', bottom: 'jeans' },
  { id: 'cricket', name: 'Cricket Kit', price: 0, shirt: '#14a04e', trim: '#ffd23f', pants: '#22356e', shoes: '#ffffff', long: false, top: 'jersey', bottom: 'shorts' },
  { id: 'school', name: 'School Uniform', price: 400, shirt: '#f4f6fb', trim: '#d6203a', pants: '#6b7280', shoes: '#1f1f27', long: false, tie: true, top: 'shirt', bottom: 'trousers' },
  { id: 'track', name: 'Tracksuit', price: 900, shirt: '#e8364f', trim: '#ffffff', pants: '#e8364f', shoes: '#ffffff', long: true, top: 'hoodie', bottom: 'track' },
  { id: 'eid', name: 'Eid Kurta', price: 1500, shirt: '#fbf6ea', trim: '#e0a526', pants: '#fbf6ea', shoes: '#b0742f', long: true, kurta: true, top: 'kurta', bottom: 'trousers' },
  { id: 'hero', name: 'Super Hero', price: 3500, shirt: '#2f5bea', trim: '#ffd23f', pants: '#2f5bea', shoes: '#d6203a', long: true, cape: '#e8263f', top: 'suit', bottom: 'tights' },
  { id: 'gold', name: 'Solid Gold', price: 8000, shirt: '#ffc94a', trim: '#fff1b8', pants: '#ffc94a', shoes: '#ffc94a', long: true, metal: true, top: 'suit', bottom: 'tights' },
];

// Skateboards: ride faster and survive one crash
export const BOARDS = [
  { id: 'classic', name: 'Classic Board', price: 0, deck: '#e8364f', wheels: '#ffd23f', style: 'plain' },
  { id: 'art', name: 'Truck Art Board', price: 1200, deck: '#13b5a5', wheels: '#ff3b5c', style: 'art' },
  { id: 'neon', name: 'Neon Board', price: 2500, deck: '#1a1530', wheels: '#39f0ff', style: 'neon' },
  { id: 'carpet', name: 'Magic Carpet', price: 6000, deck: '#b0123f', wheels: '#ffd23f', style: 'carpet' },
];

// Pets run beside you and each has a special skill
export const PETS = [
  { id: 'none', name: 'No pet', price: 0, skill: 'Run solo', color: '#c9d2e3' },
  { id: 'parrot', name: 'Mithu the Parrot', price: 1500, skill: 'Squawks early: slipper warnings last longer', color: '#2fbf4a' },
  { id: 'cat', name: 'Billo the Cat', price: 2500, skill: 'Pulls in samosas from the lanes next to you', color: '#f29a3a' },
  { id: 'puppy', name: 'Moti the Puppy', price: 3500, skill: 'Digs up bonus samosas as you run', color: '#a8713f' },
  { id: 'goat', name: 'Bakri the Goat', price: 5000, skill: 'Headbutts one obstacle out of your way each run', color: '#f4f1ea' },
];

// Upgrades make power-ups last longer. Level 0 to 5.
export const UPGRADES = [
  { id: 'magnet', name: 'Samosa Magnet', base: 10, step: 2, unit: 's' },
  { id: 'jetpack', name: 'Rocket Bag', base: 6, step: 1.5, unit: 's' },
  { id: 'turbo', name: 'Turbo Rush', base: 5, step: 1, unit: 's' },
  { id: 'chai', name: 'Chai Time', base: 5, step: 0.8, unit: 's' },
  { id: 'board', name: 'Skateboard Ride', base: 10, step: 3, unit: 's' },
];
export const UPGRADE_COSTS = [250, 600, 1200, 2500, 5000];

export const BOARD_PRICE = 300;       // one skateboard ride
export const BOARD_PACK = { count: 5, price: 1200 };
// Keys revive you when you get caught; force fields protect you for 12 seconds
export const ITEMS = [
  { id: 'keys', name: 'Keys', text: 'Spend keys to revive and keep running when you get caught.', color: '#39c6ff', icon: 'key', packs: [[1, 800], [5, 3500]] },
  { id: 'shields', name: 'Force fields', text: 'Tap the shield button in a run: smash through everything for 12 s.', color: '#2a8cf0', icon: 'forcefield', packs: [[1, 500], [5, 2000]] },
];

// Score awards. Each is earned once, with a samosa reward.
export const TROPHIES = [
  { id: 'bronze', name: 'Bronze Runner', score: 1000, reward: 200, color: '#cd7f32' },
  { id: 'silver', name: 'Silver Sprinter', score: 5000, reward: 500, color: '#c0c8d6' },
  { id: 'gold', name: 'Golden Legs', score: 15000, reward: 1200, color: '#ffc94a' },
  { id: 'diamond', name: 'Diamond Dasher', score: 40000, reward: 3000, color: '#7fe8ff' },
  { id: 'legend', name: 'Street Legend', score: 100000, reward: 8000, color: '#ff4f8b' },
];

// Missions. "run" ones must be done in a single run; "total" ones add up over time.
export const MISSIONS = [
  { id: 'run-samosa-100', text: 'Collect 100 samosas in one run', stat: 'samosas', goal: 100, scope: 'run', reward: 250 },
  { id: 'run-dist-1000', text: 'Run 1,000 m in one run', stat: 'distance', goal: 1000, scope: 'run', reward: 300 },
  { id: 'run-flips-5', text: 'Land 5 flips in one run', stat: 'flips', goal: 5, scope: 'run', reward: 300 },
  { id: 'run-rage', text: "Survive Mom's Scooter Rage", stat: 'rages', goal: 1, scope: 'run', reward: 500 },
  { id: 'run-ball', text: 'Catch a cricket ball', stat: 'balls', goal: 1, scope: 'run', reward: 300 },
  { id: 'run-dodge-20', text: 'Dodge 20 slippers in one run', stat: 'dodges', goal: 20, scope: 'run', reward: 400 },
  { id: 'run-score-25k', text: 'Score 25,000 in one run', stat: 'score', goal: 25000, scope: 'run', reward: 1000 },
  { id: 'tot-board', text: 'Ride a skateboard', stat: 'boardRides', goal: 1, scope: 'total', reward: 200 },
  { id: 'tot-jetpack', text: 'Fly with the Rocket Bag 3 times', stat: 'jetpacks', goal: 3, scope: 'total', reward: 300 },
  { id: 'tot-puddles', text: 'Splash through 15 puddles', stat: 'puddles', goal: 15, scope: 'total', reward: 250 },
  { id: 'tot-runs', text: 'Play 10 runs', stat: 'runs', goal: 10, scope: 'total', reward: 300 },
  { id: 'tot-samosa-3000', text: 'Collect 3,000 samosas in total', stat: 'samosas', goal: 3000, scope: 'total', reward: 1500 },
];

export const findById = (list, id) => list.find((x) => x.id === id) ?? list[0];
export const upgradeTime = (id, level) => {
  const u = UPGRADES.find((x) => x.id === id);
  return u.base + u.step * level;
};
