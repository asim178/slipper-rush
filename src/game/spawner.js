// ============================================================
// spawner.js: builds the road ahead, one "row" at a time.
//
// Every row always leaves at least one lane you can get through.
// The layout only uses game.trng (the seeded generator) and the
// distance z, never time or speed, so the same seed always gives
// exactly the same track. That is what makes ghost races fair.
// ============================================================
import { T, LANE_W } from './config.js';
import { pick, newId } from './fx.js';
import { zoneIndexAt } from './world-data.js';

// Size of every obstacle. kind tells you how to beat it:
//   low   -> jump over it (or run across the top)
//   high  -> roll under it
//   block -> change lane
// Each place (zone) draws these with its own models, but the sizes stay the same.
export const OBSTACLES = {
  crate: { kind: 'low', w: 1.9, len: 1.0, y0: 0, y1: 1.0, solid: true },
  cart: { kind: 'low', w: 1.9, len: 1.5, y0: 0, y1: 1.05, solid: true },
  line: { kind: 'high', w: 2.3, len: 0.3, y0: 1.1, y1: 2.7, solid: false },
  rickshaw: { kind: 'block', w: 1.7, len: 2.6, y0: 0, y1: 1.9, solid: true },
  truck: { kind: 'block', w: 2.2, len: 7.0, y0: 0, y1: 3.2, solid: true },
  // A ramp in front of a parked truck or train: run up it and along the roof
  ramp: { kind: 'ramp', w: 2.2, len: 4.6, y0: 0, y1: 3.2, solid: true, ramp: true },
  // A bounce pad (trampoline) flat on the road: run over it to fly high
  pad: { kind: 'pad', w: 2.0, len: 1.4, y0: 0, y1: 0.2, solid: false, pad: true },
};

// Coins along the flight path after a bounce pad
function addBounceArc(game, lane, padZ) {
  const v = speedAt(padZ);
  for (let t = 0.12; t < 1.2; t += 0.1) {
    const y = T.bounceVelocity * t - 0.5 * T.gravity * t * t;
    if (y < 0.8) continue;
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: padZ + v * t, y: y + 0.3 });
  }
}

// Parked trucks / trains sometimes get a ramp, and sometimes a second
// carriage right behind, so you can run along the roofs (samosas up there!)
function addBlock(game, type, lane, z) {
  const rng = game.trng;
  addObstacle(game, type, lane, z);
  if (type !== 'truck' || z < 90 || rng() > 0.45) return;
  const T_LEN = OBSTACLES.truck.len;
  const R = OBSTACLES.ramp;
  // Either a ramp up to the roof, or a bounce pad that throws you onto it
  if (rng() < 0.3) addObstacle(game, 'pad', lane, z - T_LEN / 2 - 6.5);
  else addObstacle(game, 'ramp', lane, z - T_LEN / 2 - R.len / 2);
  const long = rng() < 0.5;
  if (long) addObstacle(game, 'truck', lane, z + T_LEN + 0.2);
  const roofEnd = z + (long ? T_LEN * 1.5 + 0.2 : T_LEN / 2);
  for (let zz = z - T_LEN / 2 + 1; zz < roofEnd - 0.5; zz += 2.2) {
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: zz, y: R.y1 + 0.75 });
  }
}

const LANES = [-1, 0, 1];
const ENDLESS_BOSS_FIRST = 650;
const ENDLESS_BOSS_EVERY = 850;

// Where boss phases start, between two track positions
export function rageStartsBetween(game, from, to) {
  if (game.chapter) return game.chapter.bosses.filter((z) => z >= from && z <= to);
  const out = [];
  const k0 = Math.max(0, Math.ceil((from - ENDLESS_BOSS_FIRST) / ENDLESS_BOSS_EVERY));
  for (let k = k0; ; k++) {
    const z = ENDLESS_BOSS_FIRST + k * ENDLESS_BOSS_EVERY;
    if (z > to) break;
    if (z >= from) out.push(z);
  }
  return out;
}
const inBossZone = (game, z) => rageStartsBetween(game, z - T.rageZone, z + 12).length > 0;

// Expected running speed at a track position (a plain run with no power-ups).
// Rows are spaced using this, so spacing depends only on distance.
function speedAt(z) {
  const t = (-T.startSpeed + Math.sqrt(T.startSpeed ** 2 + 2 * T.speedGain * z)) / T.speedGain;
  return Math.min(T.maxSpeed, T.startSpeed + T.speedGain * t);
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function addObstacle(game, type, lane, z, extra = {}) {
  game.obstacles.push({
    id: newId(), type, lane, z, vz: 0, seed: game.trng(), zone: zoneIndexAt(z, game.chapter), ...OBSTACLES[type], ...extra,
  });
}

function addSamosaLine(game, lane, z0, count, y = 0.75) {
  for (let i = 0; i < count; i++) {
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: z0 + i * 2.2, y });
  }
}

// Samosas in a jump-shaped arc over a low obstacle
function addSamosaArc(game, lane, zc) {
  for (let i = -3; i <= 3; i++) {
    const f = 1 - (i / 3.6) ** 2;
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: zc + i * 1.5, y: 0.75 + f * 1.7 });
  }
}

// Zig-zag samosa trail for the obstacle-free boss zone
function addSamosaWeave(game, z0, count) {
  for (let i = 0; i < count; i++) {
    const lane = Math.max(-1, Math.min(1, Math.round(Math.sin(i / 3) * 1.4)));
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: z0 + i * 2.4, y: 0.75 });
  }
}

export function updateSpawner(game) {
  const end = game.chapter ? game.chapter.length - 25 : Infinity;
  while (game.spawnZ < game.d + T.viewDistance) {
    const z = game.spawnZ;
    if (z < end) spawnRow(game, z);
    const progress = Math.min(1, z / 3000);
    game.spawnZ += Math.max(16, speedAt(z) * (1.55 - progress * 0.6));

    // Puddles while it rains: decoration only, so they use Math.random
    if (game.weather.rain > 0.3) {
      game.decor.push({ id: newId(), type: 'puddle', lane: pick(LANES), z: z + 8 + Math.random() * 6, size: 0.8 + Math.random() * 0.4 });
    }
  }
}

function spawnRow(game, z) {
  const rng = game.trng;
  const level = Math.min(1, z / 3000);
  const lanes = shuffle(rng, [...LANES]);
  const free = lanes[0];
  const blockType = () => (rng() < 0.35 + level * 0.25 ? 'truck' : 'rickshaw');
  const passableType = () => (rng() < 0.55 ? rng.pick(['crate', 'cart']) : 'line');

  // The boss zone: no obstacles, only samosas, so the thrown things are the challenge
  if (inBossZone(game, z)) {
    addSamosaWeave(game, z - 8, 7);
    return;
  }

  // Lanes reserved by an oncoming vehicle stay empty until it has passed
  game.reserved = game.reserved.filter((r) => r.until > z);
  const reserved = new Set(game.reserved.map((r) => r.lane));
  if (reserved.size) {
    const open = LANES.filter((l) => !reserved.has(l));
    if (open.length >= 2) {
      if (rng() < 0.5) addBlock(game, blockType(), open[0], z);
      else addObstacle(game, passableType(), open[0], z);
      addSamosaLine(game, open[1], z - 5, 5);
    }
    maybeExtras(game, open[open.length - 1] ?? free, z);
    return;
  }

  const r = rng();
  if (r < 0.12 && z > 120) {
    // Breather: a long samosa trail, or a bounce pad with coins up in the sky
    const lane = rng.pick(LANES);
    if (rng() < 0.45) {
      addObstacle(game, 'pad', lane, z - 8);
      addBounceArc(game, lane, z - 8);
    } else addSamosaLine(game, lane, z - 6, 8);
  } else if (r < 0.4) {
    // One obstacle
    if (rng() < 0.4) addBlock(game, blockType(), lanes[1], z);
    else addObstacle(game, passableType(), lanes[1], z);
    addSamosaLine(game, free, z - 5, 5);
  } else if (r < 0.7) {
    // Two lanes taken, one free lane full of samosas
    for (const lane of [lanes[1], lanes[2]]) {
      if (rng() < 0.6) addBlock(game, blockType(), lane, z);
      else addObstacle(game, passableType(), lane, z);
    }
    addSamosaLine(game, free, z - 5, 5);
  } else if (r < 0.85 - level * 0.1) {
    // Wall: two blocked lanes, and the third needs a jump or a roll
    const t = passableType();
    addObstacle(game, t, free, z);
    for (const lane of [lanes[1], lanes[2]]) addBlock(game, blockType(), lane, z);
    if (OBSTACLES[t].kind === 'low') addSamosaArc(game, free, z);
    else addSamosaLine(game, free, z - 4, 4, 0.6);
  } else if (!spawnOncoming(game, lanes[1], z)) {
    addSamosaLine(game, free, z - 5, 5);
  } else {
    addSamosaLine(game, free, z - 5, 6);
  }
  maybeExtras(game, free, z);
}

// A vehicle driving towards you. It sweeps down its lane,
// so that lane is kept empty for the next few rows.
function spawnOncoming(game, lane, z) {
  const rng = game.trng;
  const zz = z + 25;
  const end = game.chapter ? game.chapter.length - 40 : Infinity;
  if (zz > end || inBossZone(game, zz + 60) || inBossZone(game, zz)) return false;
  const clash = game.obstacles.some((o) => o.lane === lane && o.z > zz - 90 && o.z < zz + 10);
  if (clash) return false;
  const type = rng() < 0.6 ? 'rickshaw' : 'truck';
  addObstacle(game, type, lane, zz, { vz: rng.range(5, 9), moving: true });
  game.reserved.push({ lane, until: zz + 8 });
  return true;
}

// Power-ups and cricket balls, spaced by distance
function maybeExtras(game, lane, z) {
  const rng = game.trng;
  if (z >= game.nextPowerZ) {
    game.nextPowerZ = z + rng.range(300, 450);
    const type = rng.pick(['magnet', 'shield', 'turbo', 'double', 'kite', 'chai', 'jetpack', 'jetpack', 'board', 'blaster', 'blaster', 'forcefield']);
    game.pickups.push({ id: newId(), type, lane, x: lane * LANE_W, z: z - 9, y: 1.0 });
  }
  // A key: rare, and it floats up high, so you need a jump (or a bounce pad)
  if (z >= game.nextKeyZ) {
    game.nextKeyZ = z + rng.range(1100, 1700);
    game.pickups.push({ id: newId(), type: 'key', lane, x: lane * LANE_W, z: z - 5, y: 1.9 });
  }
  // A cricket ball swinging across the lanes, high up: jump to catch it
  if (z >= game.nextBallZ) {
    game.nextBallZ = z + rng.range(380, 600);
    game.pickups.push({ id: newId(), type: 'ball', lane: 0, x: 0, z: z - 14, y: 2.7, phase: rng.range(0, 6) });
  }
}
