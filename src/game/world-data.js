// ============================================================
// world-data.js: places, chasers and story chapters.
// Pure data, so the engine, the 3D view and the menus share it.
// ============================================================

// The World Tour: an endless run passes through these in order
export const ZONES = [
  { id: 'bazaar', name: 'Old City Bazaar', color: '#ff7a1a' },
  { id: 'beach', name: 'Sunny Beach', color: '#2fa8ff' },
  { id: 'mountain', name: 'Mountain Road', color: '#20c25a' },
  { id: 'railway', name: 'Railway Station', color: '#8a5cff' },
  // American cities
  { id: 'newyork', name: 'New York City', color: '#ffb703' },
  { id: 'vegas', name: 'Las Vegas', color: '#ff3bd4' },
  { id: 'losangeles', name: 'Los Angeles', color: '#ff7a59' },
];
// Endless runs mix home and America: Bazaar, New York, Beach, Las Vegas, Mountain, Los Angeles, Railway
const ENDLESS_ORDER = [0, 4, 1, 5, 2, 6, 3];
const USA = [4, 5, 6];
export const ZONE_LENGTH = 750; // metres of each place in an endless run

// Who is chasing you, what they throw and what they ride in a boss phase
export const CHASERS = {
  mom: {
    name: 'Mom',
    projectile: 'slipper',
    ride: 'scooter',
    bossName: "MOM'S SCOOTER RAGE!",
    lines: {
      start: ['Come back here!', 'Did you finish your homework?!', 'Who broke the window?!'],
      stumble: ['Almost got you!', 'Not so fast!', 'I can see you!'],
      throw: ['Take this!', 'Slipper incoming!', 'You asked for it!'],
      boss: ["That's it, I'm taking the scooter!", 'Beep beep! Here I come!', "You can't outrun a scooter!"],
      rain: ['You will catch a cold!', 'Come inside, it is raining!'],
      lose: ['Fine! But dinner is at eight!', 'You win this time...'],
    },
  },
  dad: {
    name: 'Dad',
    projectile: 'newspaper',
    ride: 'motorbike',
    bossName: "DAD'S MOTORBIKE CHASE!",
    lines: {
      start: ['Who scratched my motorbike?!', 'Stop right there, young man!'],
      stumble: ['Ha! Too slow!', 'I was a sprinter in college!'],
      throw: ["Read the news: you're grounded!", 'Catch this!'],
      boss: ['Vroom vroom! Here comes Dad!', 'Nobody outruns my motorbike!'],
      rain: ['My newspaper is getting wet!'],
      lose: ['I need a cup of tea...', 'You are fast, just like me!'],
    },
  },
  principal: {
    name: 'The Principal',
    projectile: 'book',
    ride: 'bicycle',
    bossName: "THE PRINCIPAL'S BICYCLE!",
    lines: {
      start: ['Bunking school?! Detention!', 'Get back to class!'],
      stumble: ['Rule number one: no running!', 'I see you!'],
      throw: ['Homework incoming!', 'Read chapter five!'],
      boss: ['Ring ring! Out of my way!', 'My bicycle never loses!'],
      rain: ['Umbrellas are in the rules!'],
      lose: ['Fine. See you on Monday.', 'Class dismissed...'],
    },
  },
};

// Story mode. Each chapter is a fixed level (same seed every time) with a finish line.
// bosses = where the boss phases start (metres). zone 'tour' cycles through every place.
export const CHAPTERS = [
  {
    id: 1, title: 'Homework Escape', zone: 0, chaser: 'mom', length: 900, samosaGoal: 60, bosses: [450], reward: 300,
    intro: 'Mom found out you skipped your homework. Run to the cricket ground!',
  },
  {
    id: 2, title: 'Beach Day Dash', zone: 1, chaser: 'mom', length: 1100, samosaGoal: 90, bosses: [380, 780], reward: 500,
    intro: "You took Mom's phone to the beach. She is NOT happy.",
  },
  {
    id: 3, title: "Dad's Motorbike", zone: 2, chaser: 'dad', length: 1300, samosaGoal: 110, bosses: [350, 850], reward: 800,
    intro: "You scratched Dad's motorbike, and now he's riding it after you.",
  },
  {
    id: 4, title: 'The Principal', zone: 3, chaser: 'principal', length: 1500, samosaGoal: 130, bosses: [400, 950], reward: 1200,
    intro: 'You bunked school. The Principal is coming on his bicycle!',
  },
  {
    id: 5, title: 'The Final Chase', zone: 'tour', chaser: 'mom', length: 1800, samosaGoal: 160, bosses: [450, 950, 1400], reward: 2500,
    intro: 'Run through the whole city and make it home before dinner!',
  },
  {
    id: 6, title: 'Coast to Coast', zone: 'usa', chaser: 'dad', length: 1800, samosaGoal: 170, bosses: [500, 1050, 1500], reward: 3000,
    intro: 'The family holiday in America! You ran off with Dad\'s new camera from New York to Las Vegas to Los Angeles.',
  },
];

// Which place is at track position z
const touring = (chapter) => !chapter || chapter.zone === 'tour' || chapter.zone === 'usa';
export function zoneIndexAt(z, chapter) {
  if (!touring(chapter)) return chapter.zone;
  const len = chapter ? 450 : ZONE_LENGTH;
  const i = Math.floor(Math.max(0, z) / len);
  if (chapter?.zone === 'usa') return USA[i % USA.length];
  if (chapter) return i % 4; // the Final Chase tours the four home places
  return ENDLESS_ORDER[i % ENDLESS_ORDER.length];
}

// Where each place begins (used for the welcome arches)
export function zoneStarts(fromZ, toZ, chapter) {
  if (!touring(chapter)) return [];
  const len = chapter ? 450 : ZONE_LENGTH;
  const out = [];
  for (let z = Math.ceil(fromZ / len) * len; z <= toZ; z += len) if (z > 0) out.push(z);
  return out;
}
