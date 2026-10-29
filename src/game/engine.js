// ============================================================
// engine.js: the game's BRAIN. Pure logic, no drawing.
//
// The world is measured in metres:
//   x = left/right (lanes are at -2.4, 0 and +2.4)
//   y = height
//   d = how far the kid has run. Every object has a track
//       position z; (z - d) is how far ahead of the kid it is.
// update() is called every frame and changes the state a little.
//
// Modes:
//   endless - the World Tour, until you get caught
//   story   - a chapter with a finish line and stars
//   race    - an endless track (same seed) against a ghost
// ============================================================
import { T, LANE_W, POWER_TIME, POWER_INFO, TRICK_POINTS, TRICK_NAMES } from './config.js';
import { rand, pick, emit, banner, popup, burst, newId } from './fx.js';
import { updateSpawner, rageStartsBetween } from './spawner.js';
import { upgradeTime } from './catalog.js';
import { makeRng, randomSeed } from './rng.js';
import { ZONES, CHASERS, zoneIndexAt } from './world-data.js';

// options: { loadout: { upgrades, boards, pet }, mode, seed, chapter, ghost }
export function createGame(options = {}) {
  const loadout = options.loadout ?? {};
  const up = loadout.upgrades ?? {};
  const chapter = options.chapter ?? null;
  const mode = options.mode ?? 'endless';
  const seed = options.seed ?? (chapter ? 1000 + chapter.id : randomSeed());
  const chaser = chapter ? chapter.chaser : 'mom';
  return {
    mode,
    seed,
    trng: makeRng(seed), // the TRACK's random numbers; nothing else may use it
    chapter,
    chaser,
    pet: loadout.pet ?? 'none',
    petCharge: loadout.pet === 'goat' ? 1 : 0,
    nextDigZ: 120,
    ghost: options.ghost ?? null,
    rec: [], // ghost recording: [d*10, x*10, y*10] every 0.25 s
    recT: 0,
    zone: zoneIndexAt(0, chapter),

    // Power-up durations, made longer by shop upgrades
    dur: {
      ...POWER_TIME,
      magnet: upgradeTime('magnet', up.magnet ?? 0),
      jetpack: upgradeTime('jetpack', up.jetpack ?? 0),
      turbo: upgradeTime('turbo', up.turbo ?? 0),
      chai: upgradeTime('chai', up.chai ?? 0),
      board: upgradeTime('board', up.board ?? 0),
    },
    boardsLeft: loadout.boards ?? 0,
    shieldsLeft: loadout.shields ?? 0, // force fields bought in the shop
    allowRevive: !!options.allowRevive, // the app shows the "Save me!" screen
    revives: 0,
    keysFound: 0,
    balloons: [],    // water balloons in flight
    fireCooldown: 0,
    board: { t: 0 },
    stats: { flips: 0, rages: 0, balls: 0, dodges: 0, puddles: 0, boardRides: 0, jetpacks: 0, stumbles: 0, nearMisses: 0, maxCombo: 0, bounces: 0, frenzies: 0 },
    combo: 0,        // coins collected one after another without a gap
    lastCoinT: -9,
    frenzy: 0,       // Coin Frenzy timer: every coin counts double
    slowmo: 0,       // a short slow-motion moment after a close call
    status: 'menu', // menu -> playing -> dying | finishing -> over
    won: false,
    time: 0,
    skyTime: 22,    // starts at golden hour; drives the day/night cycle
    timeScale: 1,
    dyingTimer: 0,
    speed: T.startSpeed,
    d: 0,
    score: 0,
    samosas: 0,
    level: 0,
    deathBy: null,

    player: {
      lane: 0, x: 0, y: 0, vy: 0, onGround: true,
      rollTimer: 0, rollQueued: false,
      flipT: 0, airTricks: 0,
      runPhase: 0, squash: 0, leanDir: 0, leanTimer: 0,
      stumble: 0, lastStumble: -99,
      invuln: 0, shield: false, dead: false, dustTimer: 0, lastLaneChange: -9,
    },
    power: { magnet: 0, turbo: 0, double: 0, kite: 0, chai: 0, jetpack: 0, forcefield: 0, blaster: 0 },
    // The chaser (Mom, Dad or the Principal). "scooter" = riding their boss vehicle.
    mom: { gap: 1.6, runPhase: 0, throwAnim: 0, shout: null, shoutTimer: 0, scooter: false },

    obstacles: [],
    pickups: [],
    strikes: [],   // thrown things: a warning circle, then impact
    decor: [],     // puddles
    particles: [],
    reserved: [],  // lanes kept clear for oncoming vehicles

    weather: { rain: 0, target: 0, nextRain: rand(38, 55), rainLeft: 0, nextThunder: 2 },
    rage: { active: false, t: 0, nextVolley: 0, nextHorn: 0, lastSafe: 0, startZ: 0, done: new Set() },

    spawnZ: 45,
    nextPowerZ: 220,
    nextBallZ: 160,
    nextKeyZ: 700,   // keys are rare
    nextStrike: 3,

    shake: 0,
    flash: 0, // lightning
    banner: null,
    popup: null,
    events: [],
  };
}

export function startRun(game) {
  game.status = 'playing';
  game.rec.push([0, 0, 0]);
  shout(game, pick(lines(game).start), 2);
  if (game.chapter) banner(game, `CHAPTER ${game.chapter.id}: ${game.chapter.title.toUpperCase()}`, '#ffd23f');
  else if (game.mode === 'race') banner(game, 'BEAT YOUR GHOST!', '#9fe8ff');
  emit(game, 'start');
}

// Score multiplier: +1 every 600 m (max x5), doubled by the x2 power-up
export const multiplier = (g) => (1 + Math.min(4, Math.floor(g.d / 600))) * (g.power.double > 0 ? 2 : 1);

const laneOf = (x) => Math.max(-1, Math.min(1, Math.round(x / LANE_W)));
const heightOf = (p) => (p.rollTimer > 0 ? T.rollHeight : T.standHeight);
export const isFlying = (g) => g.power.kite > 0 || g.power.jetpack > 0;
const isGhost = (g) => g.player.invuln > 0 || isFlying(g);
const lines = (g) => CHASERS[g.chaser].lines;

function shout(game, text, time = 1.6) {
  game.mom.shout = text;
  game.mom.shoutTimer = time;
}

// Where the ghost was at a given time (interpolated between samples)
export function ghostAt(ghost, time) {
  const s = ghost.samples;
  const f = time / 0.25;
  const i = Math.min(s.length - 1, Math.floor(f));
  const j = Math.min(s.length - 1, i + 1);
  const k = Math.min(1, f - i);
  const a = s[i];
  const b = s[j];
  return {
    d: (a[0] + (b[0] - a[0]) * k) / 10,
    x: (a[1] + (b[1] - a[1]) * k) / 10,
    y: (a[2] + (b[2] - a[2]) * k) / 10,
    done: f >= s.length - 1,
  };
}

// ------------------------------------------------------------
export function update(game, rawDt, input) {
  // Chai Time slows the WORLD down; timers that use rawDt stay real-time
  if (game.status === 'playing') {
    const target = game.power.chai > 0 ? T.chaiSlowmo : game.slowmo > 0 ? 0.45 : 1;
    game.timeScale += (target - game.timeScale) * Math.min(1, rawDt * (game.slowmo > 0 ? 14 : 6));
    game.slowmo = Math.max(0, game.slowmo - rawDt);
    game.frenzy = Math.max(0, game.frenzy - rawDt);
  }
  const dt = rawDt * game.timeScale;
  updateParticles(game, dt);
  game.shake = Math.max(0, game.shake - rawDt * 2.5);
  game.flash = Math.max(0, game.flash - rawDt * 2.2);

  if (game.status === 'menu') {
    game.time += dt;
    return;
  }
  if (game.status === 'over' || game.status === 'revive') return; // 'revive' waits for the Save me! screen
  if (game.status === 'dying') {
    updateDying(game, dt, rawDt);
    return;
  }
  if (game.status === 'finishing') {
    updateFinishing(game, dt, rawDt);
    return;
  }

  game.time += dt;
  game.skyTime += dt;
  const base = Math.min(T.maxSpeed, T.startSpeed + game.time * T.speedGain);
  let target = game.power.turbo > 0 ? base * T.turboBoost : base;
  if (game.board.t > 0) target *= T.boardBoost;
  game.speed += (target - game.speed) * Math.min(1, dt * 3);

  handleInput(game, input);
  updatePowers(game, dt, rawDt);
  updateWeather(game, dt);
  updateSpawner(game, dt);
  moveObstacles(game, dt);
  stepPlayer(game, dt);
  if (game.status !== 'playing') return;

  updateRage(game, dt);
  updateStrikes(game, dt);
  if (game.status !== 'playing') return;
  updatePickups(game, dt);
  updateBalloons(game, dt);
  updatePet(game);
  updateDecor(game);
  updateMom(game, dt);
  updateZone(game);
  record(game, dt);

  const level = Math.min(4, Math.floor(game.d / 600));
  if (level > game.level) {
    game.level = level;
    banner(game, `x${level + 1} MULTIPLIER!`, '#ffd23f');
    emit(game, 'level');
  }
  game.score += game.speed * dt * 0.5 * multiplier(game);

  // Story mode: reached the finish line
  if (game.chapter && game.d >= game.chapter.length) finish(game);
  cleanup(game);
}

// ---------- Controls ----------
function handleInput(game, input) {
  const p = game.player;
  const flying = isFlying(game);
  if (input.board) activateBoard(game, false);
  if (input.shield) activateShield(game);
  if (input.fire) fireBalloon(game);
  if (input.left) changeLane(game, -1);
  if (input.right) changeLane(game, 1);
  if (input.up && !flying) {
    if (p.onGround) {
      p.vy = T.jumpVelocity;
      p.onGround = false;
      p.rollTimer = 0;
      p.rollQueued = false;
      emit(game, 'jump');
    } else if (p.flipT <= 0) {
      // Swipe up again in the air = flip trick
      p.flipT = T.flipTime;
      p.airTricks += 1;
      emit(game, 'trick');
    }
  }
  if (input.down && !flying) {
    if (p.onGround) {
      if (p.rollTimer <= 0) emit(game, 'roll');
      p.rollTimer = T.rollTime;
    } else {
      p.vy = Math.min(p.vy, T.diveVelocity); // slam down, roll on landing
      p.rollQueued = true;
      emit(game, 'dive');
    }
  }
}

// Force field from your stock (the shield button): smash through everything for 12 s
export function activateShield(game) {
  if (game.shieldsLeft <= 0 || game.power.forcefield > 0 || game.status !== 'playing') return;
  game.shieldsLeft -= 1;
  game.power.forcefield = game.dur.forcefield;
  banner(game, POWER_INFO.forcefield.label, POWER_INFO.forcefield.color);
  emit(game, 'power');
}

// Water balloon launcher: each shot flies down your lane and bursts the first thing it hits
function fireBalloon(game) {
  if (game.power.blaster <= 0 || game.fireCooldown > 0) return;
  const p = game.player;
  game.fireCooldown = 0.35;
  game.balloons.push({ id: newId(), lane: p.lane, x: p.x, y: p.y + 1.3, z: game.d + 0.8, vz: game.speed + 38, color: pick(['#ff3b5c', '#2fa8ff', '#ffd23f', '#20c25a', '#ff4f8b']) });
  emit(game, 'throw');
}

function updateBalloons(game, dt) {
  game.fireCooldown = Math.max(0, game.fireCooldown - dt);
  for (const b of game.balloons) {
    b.z += b.vz * dt;
    b.x += (b.lane * LANE_W - b.x) * Math.min(1, dt * 10);
    b.y += (1.1 - b.y) * Math.min(1, dt * 4);
    for (const o of game.obstacles) {
      if (o.broken || o.pad || o.ramp || o.lane !== b.lane) continue;
      if (Math.abs(o.z - b.z) > o.len / 2 + 0.5) continue;
      if (b.y < o.y0 - 0.3 || b.y > o.y1 + 0.3) continue;
      knockAway(game, o);
      const pts = 50 * multiplier(game);
      game.score += pts;
      popup(game, `SPLASH! +${pts}`, '#7fd0ff');
      burst(game, b.x, b.y, b.z, 22, { color: ['#7fd0ff', '#ffffff', b.color], speed: 7, life: 0.5, gravity: 10 });
      emit(game, 'splash');
      b.done = true;
      break;
    }
    if (b.z > game.d + 70) b.done = true;
  }
  game.balloons = game.balloons.filter((b) => !b.done);
}

// Skateboard: from your stock (double tap / button) or a free one picked up on the road
export function activateBoard(game, free) {
  if (game.status !== 'playing' || game.board.t > 0) return;
  if (!free) {
    if (game.boardsLeft <= 0) return;
    game.boardsLeft -= 1;
  }
  game.board.t = game.dur.board;
  game.stats.boardRides += 1;
  banner(game, 'SKATEBOARD!', '#20c25a');
  emit(game, 'board');
}

function breakBoard(game, o) {
  game.board.t = 0;
  game.player.invuln = 1.6;
  if (o) knockAway(game, o);
  banner(game, 'BOARD SMASHED!', '#ffb800');
  game.shake = Math.max(game.shake, 0.4);
  burst(game, game.player.x, 0.3, game.d, 20, { color: ['#ffd23f', '#e8364f', '#ffffff'], speed: 6, life: 0.6, gravity: 12 });
  emit(game, 'boardbreak');
}

// Bakri the goat saves you once per run
function goatSave(game, o) {
  game.petCharge = 0;
  game.player.invuln = 1.2;
  if (o) knockAway(game, o);
  banner(game, 'GOAT HEADBUTT!', '#f4f1ea');
  game.shake = Math.max(game.shake, 0.4);
  emit(game, 'goat');
}

function changeLane(game, dir) {
  const p = game.player;
  const next = p.lane + dir;
  if (next < -1 || next > 1) {
    game.shake = Math.max(game.shake, 0.15);
    emit(game, 'bump');
    return;
  }
  p.lane = next;
  p.lastLaneChange = game.time;
  p.leanDir = dir;
  p.leanTimer = 0.25;
  emit(game, 'swoosh');
}

// ---------- Collision helpers ----------
// Is the kid's box (at x, d, y) inside any obstacle? Returns it.
// Height of a ramp's slope at track position d
// (it reaches the full height a little before its end, so you step straight onto the roof)
const rampHeight = (o, d) => Math.max(0, Math.min(1, (d - (o.z - o.len / 2)) / (o.len * 0.82))) * o.y1;

function overlapAny(game, x, d, y) {
  const h = heightOf(game.player);
  for (const o of game.obstacles) {
    if (o.broken) continue;
    if (Math.abs(x - o.lane * LANE_W) >= T.halfWidth + o.w / 2) continue;
    if (Math.abs(d - o.z) >= T.halfDepth + o.len / 2) continue;
    if (o.pad) continue; // bounce pads are flat: you run onto them
    // A ramp only blocks you from the side, where its slope is already high
    if (o.ramp) {
      if (y < rampHeight(o, d) - 0.8) return o;
      continue;
    }
    if (y < o.y1 - 0.02 && y + h > o.y0) return o;
  }
  return null;
}

// Highest surface under the kid (0 = road, or the top of a crate)
function floorAt(game, x, d, prevY) {
  let floor = 0;
  for (const o of game.obstacles) {
    if (o.broken || !o.solid) continue;
    if (Math.abs(x - o.lane * LANE_W) >= T.halfWidth + o.w / 2) continue;
    if (o.ramp) {
      // Walk up the slope (it can lift you a little each frame)
      if (Math.abs(d - o.z) >= o.len / 2 + 0.05) continue;
      const rh = rampHeight(o, d);
      if (rh <= prevY + 0.8) floor = Math.max(floor, rh);
      continue;
    }
    if (Math.abs(d - o.z) >= T.halfDepth + o.len / 2) continue;
    if (o.y1 <= prevY + 0.06) floor = Math.max(floor, o.y1);
  }
  return floor;
}

// ---------- The kid ----------
// We move one axis at a time. If moving SIDEWAYS causes a hit, it is a
// side bump (stumble). If moving FORWARD causes a hit, it is a crash.
function stepPlayer(game, dt) {
  const p = game.player;
  const pw = game.power;
  const prevY = p.y;

  // 1) Up and down
  if (isFlying(game)) {
    const height = pw.jetpack > 0 ? T.jetpackHeight : T.kiteHeight;
    p.y += (height - p.y) * Math.min(1, dt * 3);
    p.vy = 0;
    p.onGround = false;
    p.rollTimer = 0;
    p.flipT = 0;
    p.airTricks = 0;
  } else {
    p.vy -= T.gravity * dt;
    p.y += p.vy * dt;
    const floor = floorAt(game, p.x, game.d, prevY);
    if (p.y <= floor) {
      if (!p.onGround && prevY - floor > 0.15) {
        emit(game, 'land');
        p.squash = 1;
        burst(game, p.x, floor + 0.05, game.d, 8, { color: '#d8c8b0', speed: 3, life: 0.4, gravity: -2 });
        landTricks(game);
      }
      if (!p.onGround && p.rollQueued) {
        p.rollTimer = T.rollTime;
        p.rollQueued = false;
        emit(game, 'roll');
      }
      p.y = floor;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
    }
  }

  // 2) Sideways, towards the target lane
  const tx = p.lane * LANE_W;
  const oldX = p.x;
  const step = T.laneSpeed * dt;
  p.x = Math.abs(tx - p.x) <= step ? tx : p.x + Math.sign(tx - p.x) * step;
  if (p.x !== oldX && !isGhost(game)) {
    const o = overlapAny(game, p.x, game.d, p.y);
    if (o) {
      if (pw.turbo > 0 || pw.forcefield > 0) {
        smash(game, o);
      } else {
        p.x = oldX; // bounce back to the lane we came from
        p.lane = laneOf(oldX - Math.sign(tx - oldX) * (LANE_W / 2 - 0.01));
        stumble(game, o.type);
        if (game.status !== 'playing') return;
      }
    }
  }

  // 3) Forward
  game.d += game.speed * dt;
  const o = overlapAny(game, p.x, game.d, p.y);
  if (o && !isGhost(game)) {
    if (pw.turbo > 0 || pw.forcefield > 0) smash(game, o);
    else if (game.board.t > 0) breakBoard(game, o);
    else if (p.shield) shieldSave(game, o);
    else if (game.petCharge > 0) goatSave(game, o);
    else {
      crash(game, o.type);
      return;
    }
  }

  checkNearMisses(game);
  checkBouncePads(game);

  // Timers and little effects
  const wasGhost = p.invuln > 0;
  p.invuln = Math.max(0, p.invuln - dt);
  if (wasGhost && p.invuln === 0 && overlapAny(game, p.x, game.d, p.y)) p.invuln = 0.05; // don't end inside a truck
  if (p.rollTimer > 0) p.rollTimer -= dt;
  p.flipT = Math.max(0, p.flipT - dt);
  p.squash = Math.max(0, p.squash - dt * 5);
  p.leanTimer = Math.max(0, p.leanTimer - dt);
  p.stumble = Math.max(0, p.stumble - dt);
  p.runPhase += dt * game.speed * 0.55;

  p.dustTimer -= dt;
  if (p.onGround && p.dustTimer <= 0) {
    p.dustTimer = 0.08;
    const wet = game.weather.rain > 0.4;
    const sand = ZONES[game.zone].id === 'beach';
    burst(game, p.x, p.y + 0.05, game.d - 0.2, 1, { color: wet ? '#b9d4ff' : sand ? '#f2d9a6' : '#e6d6bf', speed: 1.2, life: 0.4, gravity: -1 });
  }
  if (pw.jetpack > 0) {
    burst(game, p.x, p.y + 0.4, game.d + 0.1, 2, { color: ['#ffd23f', '#ff8a00', '#ff5a1a'], speed: 1.5, life: 0.25, gravity: 8 });
  }
  if (pw.turbo > 0) {
    burst(game, p.x, p.y + 0.9, game.d - 0.6, 3, { color: ['#ffd23f', '#ff8a00', '#ff3b5c', '#a77bff'], speed: 2, life: 0.35, gravity: 0 });
  }
}

// A CLOSE CALL: you swerved past something in the next lane at the last moment.
// The world slows down for a heartbeat and you get bonus points.
function checkNearMisses(game) {
  const p = game.player;
  for (const o of game.obstacles) {
    if (o.passed || o.broken || o.pad || o.kind === 'high') continue;
    if (o.z + o.len / 2 > game.d - 0.2) continue;
    o.passed = true;
    const dx = Math.abs(o.lane * LANE_W - p.x);
    const beside = dx > 0.8 && dx < LANE_W * 1.15 && p.y < o.y1;
    const lastSecond = game.time - p.lastLaneChange < 0.55 || o.moving;
    if (!beside || !lastSecond || p.invuln > 0 || isFlying(game)) continue;
    game.stats.nearMisses += 1;
    const pts = 50 * multiplier(game);
    game.score += pts;
    popup(game, `CLOSE CALL! +${pts}`, '#7fffb0');
    game.slowmo = 0.32;
    game.shake = Math.max(game.shake, 0.12);
    emit(game, 'near');
    burst(game, (p.x + o.lane * LANE_W) / 2, 1, game.d, 10, { color: ['#7fffb0', '#ffffff'], speed: 5, life: 0.4, gravity: 0 });
  }
}

// Bounce pads launch you high: over traffic and onto train roofs
function checkBouncePads(game) {
  const p = game.player;
  if (!p.onGround || p.y > 0.3 || isFlying(game)) return;
  for (const o of game.obstacles) {
    if (!o.pad || o.used) continue;
    if (Math.abs(o.lane * LANE_W - p.x) > o.w / 2) continue;
    if (Math.abs(o.z - game.d) > o.len / 2) continue;
    o.used = true;
    p.vy = T.bounceVelocity;
    p.onGround = false;
    p.rollTimer = 0;
    game.stats.bounces += 1;
    popup(game, 'BOING!', '#ffe14d');
    emit(game, 'bounce');
    burst(game, p.x, 0.2, game.d, 14, { color: ['#ffe14d', '#ff4f8b', '#ffffff'], speed: 5, life: 0.5, gravity: 6 });
    return;
  }
}

// Flip tricks pay out only if you finished the flip before landing
function landTricks(game) {
  const p = game.player;
  if (p.airTricks <= 0) return;
  if (p.flipT > 0.1) {
    popup(game, 'SLOPPY LANDING!', '#ffb3b3');
    emit(game, 'sloppy');
  } else {
    const n = Math.min(3, p.airTricks);
    game.stats.flips += p.airTricks;
    const pts = TRICK_POINTS[n] * multiplier(game);
    game.score += pts;
    popup(game, `${TRICK_NAMES[n]} +${pts}`, '#7fe8ff');
    emit(game, 'trickland');
  }
  p.airTricks = 0;
  p.flipT = 0;
}

function stumble(game, cause) {
  const p = game.player;
  if (game.power.forcefield > 0) {
    popup(game, 'BLOCKED!', '#7fe8ff');
    emit(game, 'shield');
    return;
  }
  if (game.board.t > 0) {
    breakBoard(game, null);
    return;
  }
  if (p.shield) {
    p.shield = false;
    p.invuln = 1.2;
    banner(game, 'HELMET SAVED YOU!', POWER_INFO.shield.color);
    emit(game, 'shield');
    return;
  }
  if (game.petCharge > 0) {
    goatSave(game, null);
    return;
  }
  game.stats.stumbles += 1;
  if (game.time - p.lastStumble < T.stumbleWindow) {
    crash(game, cause); // second stumble: you're caught
    return;
  }
  p.lastStumble = game.time;
  p.stumble = 0.45;
  game.shake = Math.max(game.shake, 0.35);
  shout(game, pick(lines(game).stumble));
  popup(game, 'WATCH OUT!', '#ff6b6b');
  emit(game, 'stumble');
}

function crash(game, cause) {
  const p = game.player;
  game.status = 'dying';
  game.dyingTimer = 1.6;
  game.deathBy = cause;
  game.speedBeforeCrash = game.speed;
  game.speed = 0;
  game.timeScale = 1;
  game.board.t = 0;
  game.d -= 0.25; // small bounce back
  p.dead = true;
  p.rollTimer = 0;
  p.flipT = 0;
  game.shake = 0.9;
  burst(game, p.x, p.y + 1, game.d, 26, { color: ['#ffffff', '#ffd23f', '#ff4f8b'], speed: 6, life: 0.7, gravity: 10 });
  shout(game, 'GOTCHA!', 3);
  emit(game, 'hit');
}

export function endRun(game) {
  game.status = 'over';
  emit(game, 'over');
}

// Keys bring you back: the road ahead is cleared, the chaser drops back
// and you can't be hit for a few seconds
export const reviveCost = (game) => 2 ** game.revives; // 1, 2, 4, 8 keys
export function reviveRun(game) {
  const p = game.player;
  game.status = 'playing';
  game.revives += 1;
  p.dead = false;
  p.vy = 0;
  p.stumble = 0;
  p.lastStumble = -99;
  p.invuln = 3;
  game.speed = Math.max(T.startSpeed, game.speedBeforeCrash ?? T.startSpeed);
  game.obstacles = game.obstacles.filter((o) => o.z < game.d - 6 || o.z > game.d + 45);
  game.strikes = [];
  game.mom.gap = 4;
  game.mom.shout = null;
  banner(game, 'SECOND CHANCE!', '#7fe8ff');
  burst(game, p.x, 1, game.d, 30, { color: ['#7fe8ff', '#ffffff', '#ffd23f'], speed: 7, life: 0.8, gravity: 0 });
  emit(game, 'revive');
}

function updateDying(game, dt, rawDt) {
  game.dyingTimer -= rawDt;
  const m = game.mom;
  m.gap += (0.9 - m.gap) * Math.min(1, rawDt * 4); // the chaser runs up to you
  m.runPhase += rawDt * 6;
  const p = game.player;
  if (p.y > 0) {
    p.vy -= T.gravity * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
  }
  if (game.dyingTimer <= 0) {
    if (game.allowRevive) {
      game.status = 'revive'; // the app asks: spend keys to keep running?
      emit(game, 'saveme');
    } else endRun(game);
  }
}

// Story finish line: slow down, celebrate, then show the results
function finish(game) {
  game.status = 'finishing';
  game.won = true;
  game.dyingTimer = 2.2;
  game.power.kite = 0;
  game.power.jetpack = 0;
  game.rage.active = false;
  game.mom.scooter = false;
  game.strikes = [];
  banner(game, 'YOU MADE IT!', '#22c7b0');
  shout(game, pick(lines(game).lose), 2.5);
  burst(game, game.player.x, 2, game.d + 4, 60, { color: ['#ffd23f', '#ff4f8b', '#2fa8ff', '#20c25a', '#ffffff'], speed: 9, life: 1.4, gravity: 6, up: 0.5 });
  emit(game, 'win');
}

function updateFinishing(game, dt, rawDt) {
  game.dyingTimer -= rawDt;
  game.speed *= Math.pow(0.15, rawDt);
  game.d += game.speed * dt;
  const p = game.player;
  p.runPhase += dt * game.speed * 0.55;
  p.vy -= T.gravity * dt;
  p.y = Math.max(0, p.y + p.vy * dt);
  if (p.y <= 0) { p.vy = 0; p.onGround = true; }
  game.mom.gap += (18 - game.mom.gap) * Math.min(1, rawDt * 0.6); // the chaser gives up
  if (game.dyingTimer <= 0) {
    game.status = 'over';
    emit(game, 'over');
  }
}

// Stars for a story chapter: finish = 1, samosa goal = 2, never stumbled = 3
export function chapterStars(game) {
  if (!game.won) return 0;
  return 1 + (game.samosas >= game.chapter.samosaGoal ? 1 : 0) + (game.stats.stumbles === 0 ? 1 : 0);
}

function knockAway(game, o) {
  o.broken = true;
  const side = o.lane - laneOf(game.player.x) || (Math.random() < 0.5 ? -1 : 1);
  o.fly = { x: 0, y: 0, vx: side * 7, vy: 10, rx: 0, spin: rand(-6, 6) };
  burst(game, o.lane * LANE_W, 1, o.z, 18, { color: ['#ffffff', '#ffd23f', '#8a5cff'], speed: 7, life: 0.6, gravity: 12 });
}

function smash(game, o) {
  knockAway(game, o);
  const pts = 50 * multiplier(game);
  game.score += pts;
  popup(game, `SMASH! +${pts}`, '#c9b6ff');
  game.shake = Math.max(game.shake, 0.3);
  emit(game, 'smash');
}

function shieldSave(game, o) {
  game.player.shield = false;
  game.player.invuln = 1.5;
  knockAway(game, o);
  banner(game, 'HELMET SAVED YOU!', POWER_INFO.shield.color);
  game.shake = Math.max(game.shake, 0.4);
  emit(game, 'shield');
}

// ---------- World ----------
function moveObstacles(game, dt) {
  for (const o of game.obstacles) {
    if (o.moving && !o.broken) o.z -= o.vz * dt;
    if (o.fly) {
      o.fly.vy -= 25 * dt;
      o.fly.x += o.fly.vx * dt;
      o.fly.y += o.fly.vy * dt;
      o.fly.rx += o.fly.spin * dt;
    }
  }
}

// Entering a new place on the World Tour
function updateZone(game) {
  const z = zoneIndexAt(game.d, game.chapter);
  if (z !== game.zone) {
    game.zone = z;
    banner(game, `WELCOME TO ${ZONES[z].name.toUpperCase()}!`, ZONES[z].color);
    emit(game, 'zone');
  }
}

// Monsoon: rain comes and goes, with lightning while it pours
function updateWeather(game, dt) {
  const w = game.weather;
  if (w.rainLeft > 0) {
    w.rainLeft -= dt;
    if (w.rainLeft <= 0) {
      w.target = 0;
      w.nextRain = rand(45, 75);
    }
  } else {
    w.nextRain -= dt;
    if (w.nextRain <= 0) {
      w.target = 1;
      w.rainLeft = rand(16, 24);
      banner(game, 'MONSOON!', '#9fd8ff');
      shout(game, pick(lines(game).rain), 1.8);
      emit(game, 'rainstart');
    }
  }
  w.rain += (w.target - w.rain) * Math.min(1, dt * 0.8);
  if (w.rain > 0.6) {
    w.nextThunder -= dt;
    if (w.nextThunder <= 0) {
      w.nextThunder = rand(4, 9);
      game.flash = 1;
      emit(game, 'thunder');
    }
  }
}

// Boss phase: the chaser rides up on their vehicle and throws into two
// lanes at once. The spawner keeps that stretch of road clear.
function updateRage(game, dt) {
  const r = game.rage;
  if (!r.active) {
    const start = rageStartsBetween(game, game.d - 30, game.d).find((z) => !r.done.has(z));
    if (start !== undefined && !isFlying(game)) {
      r.done.add(start);
      r.active = true;
      r.startZ = start;
      r.t = 0;
      r.nextVolley = 1.4;
      r.nextHorn = 0;
      game.mom.scooter = true;
      banner(game, CHASERS[game.chaser].bossName, '#ff3b5c');
      shout(game, pick(lines(game).boss), 2.2);
      emit(game, 'rage');
    }
    return;
  }
  r.t += dt;
  r.nextVolley -= dt;
  r.nextHorn -= dt;
  if (r.nextHorn <= 0) {
    r.nextHorn = 2.2;
    emit(game, 'horn');
  }
  if (r.nextVolley <= 0 && r.t < T.rageDuration - 1.2) {
    r.nextVolley = T.volleyGap;
    // One safe lane, never the same one three times in a row
    let safe = pick([-1, 0, 1]);
    if (safe === r.lastSafe && Math.random() < 0.6) safe = pick([-1, 0, 1].filter((l) => l !== safe));
    r.lastSafe = safe;
    for (const lane of [-1, 0, 1]) {
      if (lane !== safe) game.strikes.push({ id: newId(), lane, t: 1.0, max: 1.0, rage: true, kind: CHASERS[game.chaser].projectile });
    }
    game.mom.throwAnim = 0.5;
    emit(game, 'warn');
  }
  const outOfRoad = game.d > r.startZ + T.rageZone - 40;
  if (r.t >= T.rageDuration || outOfRoad) {
    r.active = false;
    game.mom.scooter = false;
    const pts = 300 * multiplier(game);
    game.score += pts;
    banner(game, `BOSS SURVIVED! +${pts}`, '#22c7b0');
    game.stats.rages += 1;
    emit(game, 'survived');
  }
}

// The chaser throws at the lane you are in. Move before it lands!
function updateStrikes(game, dt) {
  const p = game.player;
  if (game.time > T.strikeStart && !isFlying(game) && !game.rage.active) {
    game.nextStrike -= dt;
    if (game.nextStrike <= 0) {
      // Mithu the parrot squawks early, so you get longer to move
      const warn = T.strikeWarn + (game.pet === 'parrot' ? 0.45 : 0);
      game.strikes.push({ id: newId(), lane: p.lane, t: warn, max: warn, kind: CHASERS[game.chaser].projectile });
      game.mom.throwAnim = 0.5;
      shout(game, pick(lines(game).throw), 1.2);
      emit(game, game.pet === 'parrot' ? 'squawk' : 'warn');
      game.nextStrike = Math.max(3.5, 9 - game.time * 0.03) + rand(0, 3);
    }
  }
  let dodged = false;
  for (const s of game.strikes) {
    s.t -= dt;
    if (s.t <= 0 && !s.done) {
      s.done = true;
      burst(game, s.lane * LANE_W, 0.2, game.d, 14, { color: ['#2f7fe0', '#ffffff'], speed: 5, life: 0.5, gravity: 12 });
      if (laneOf(p.x) === s.lane && !isGhost(game) && game.power.turbo <= 0) {
        game.shake = Math.max(game.shake, 0.4);
        emit(game, 'thwack');
        stumble(game, CHASERS[game.chaser].projectile);
        if (game.status !== 'playing') return;
      } else {
        dodged = true;
        game.stats.dodges += 1;
      }
    }
  }
  if (dodged) {
    const pts = 25 * multiplier(game);
    game.score += pts;
    popup(game, `DODGED! +${pts}`, '#7cf0a8');
    emit(game, 'dodge');
  }
  game.strikes = game.strikes.filter((s) => s.t > -0.5);
}

function updatePickups(game, dt) {
  const p = game.player;
  const h = heightOf(p);
  for (const k of game.pickups) {
    if (k.taken) continue;
    if (k.type === 'ball') k.x = Math.sin(game.time * 1.7 + k.phase) * LANE_W; // swings across lanes
    const ahead = k.z - game.d;
    if (k.type === 'samosa' && !k.pulled) {
      if (game.power.magnet > 0 && ahead < 16 && ahead > -2) k.pulled = true;
      // Billo the cat grabs samosas from the next lane over
      else if (game.pet === 'cat' && ahead < 6 && ahead > -1 && Math.abs(k.x - p.x) < LANE_W * 1.2 && k.y < p.y + 2.5) k.pulled = true;
    }
    if (k.pulled) {
      const f = Math.min(1, dt * 12);
      k.x += (p.x - k.x) * f;
      k.y += (p.y + 0.9 - k.y) * f;
      k.z += (game.d - k.z) * f;
    }
    const hit = Math.abs(k.x - p.x) < 0.9 && Math.abs(k.z - game.d) < 0.9 && k.y > p.y - 0.4 && k.y < p.y + h + 0.4;
    if (!hit) continue;
    k.taken = true;
    if (k.type === 'samosa') {
      // Combo: coins one after another without a long gap
      game.combo = game.time - game.lastCoinT < 0.75 ? game.combo + 1 : 1;
      game.lastCoinT = game.time;
      game.stats.maxCombo = Math.max(game.stats.maxCombo, game.combo);
      const value = game.frenzy > 0 ? 2 : 1;
      game.samosas += value;
      game.score += 10 * value * multiplier(game) * (1 + Math.floor(game.combo / 10) * 0.5);
      if (game.combo % 10 === 0) popup(game, `COMBO x${game.combo}!`, '#ffd23f');
      if (game.combo === 30 && game.frenzy <= 0) startFrenzy(game);
      emit(game, 'collect');
      burst(game, k.x, k.y, k.z, 5, { color: ['#ffd23f', '#fff3b0'], speed: 3, life: 0.35, gravity: 0 });
    } else if (k.type === 'key') {
      game.keysFound += 1;
      banner(game, 'YOU FOUND A KEY!', '#39c6ff');
      emit(game, 'howzat');
      burst(game, k.x, k.y, k.z, 24, { color: ['#39c6ff', '#ffffff', '#ffd23f'], speed: 6, life: 0.6, gravity: 0 });
    } else if (k.type === 'ball') {
      const pts = 150 * multiplier(game);
      game.score += pts;
      banner(game, `HOWZAT! +${pts}`, '#ff5a5a');
      game.stats.balls += 1;
      emit(game, 'howzat');
      burst(game, k.x, k.y, k.z, 24, { color: ['#ff3b3b', '#ffffff', '#ffd23f'], speed: 6, life: 0.6, gravity: 4 });
    } else {
      givePower(game, k);
    }
  }
}

// Moti the puppy digs up a few samosas every so often
function updatePet(game) {
  if (game.pet !== 'puppy' || game.d < game.nextDigZ) return;
  game.nextDigZ = game.d + 160;
  const lane = game.player.lane;
  for (let i = 0; i < 5; i++) {
    game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: game.d + 10 + i * 2, y: 0.75, dug: true });
  }
  popup(game, 'MOTI FOUND SAMOSAS!', '#ffd6a0');
  emit(game, 'woof');
}

// COIN FRENZY: coins fill every lane for a few seconds and each counts double
function startFrenzy(game) {
  game.frenzy = 6;
  game.stats.frenzies += 1;
  banner(game, 'COIN FRENZY!', '#ffd23f');
  emit(game, 'frenzy');
  for (let i = 0; i < 26; i++) {
    for (const lane of [-1, 0, 1]) {
      game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: game.d + 12 + i * 2.6, y: 0.75 + (lane === 0 ? 0 : Math.sin(i * 0.6) * 0.4 + 0.4) });
    }
  }
}

function givePower(game, k) {
  const p = game.player;
  if (k.type === 'board') {
    activateBoard(game, true);
    return;
  }
  if (k.type === 'shield') p.shield = true;
  else game.power[k.type] = game.dur[k.type];

  if (k.type === 'kite' || k.type === 'jetpack') {
    // A trail of samosas up in the sky, as long as the flight
    const jet = k.type === 'jetpack';
    if (jet) {
      game.power.kite = 0;
      game.stats.jetpacks += 1;
    } else game.power.jetpack = 0;
    p.rollTimer = 0;
    const height = (jet ? T.jetpackHeight : T.kiteHeight) + 0.5;
    const count = Math.floor((game.dur[k.type] * game.speed) / 3.4);
    for (let i = 0; i < count; i++) {
      const lane = Math.max(-1, Math.min(1, Math.round(Math.sin(i / 4) * 1.3)));
      game.pickups.push({ id: newId(), type: 'samosa', lane, x: lane * LANE_W, z: game.d + 14 + i * 3.2, y: height });
    }
  }
  const info = POWER_INFO[k.type];
  banner(game, info.label, info.color);
  burst(game, k.x, k.y, k.z, 20, { color: [info.color, '#ffffff'], speed: 5, life: 0.6, gravity: 0 });
  emit(game, k.type === 'chai' ? 'chai' : 'power');
}

// Chai Time counts down in real seconds (rawDt), everything else in game time
function updatePowers(game, dt, rawDt) {
  const pw = game.power;
  const p = game.player;
  if (game.board.t > 0) {
    game.board.t -= dt;
    if (game.board.t <= 0) {
      game.board.t = 0;
      p.invuln = Math.max(p.invuln, 0.6);
    }
  }
  for (const key of ['magnet', 'turbo', 'double', 'kite', 'chai', 'jetpack', 'forcefield', 'blaster']) {
    if (pw[key] <= 0) continue;
    pw[key] -= key === 'chai' ? rawDt : dt;
    if (pw[key] <= 0) {
      pw[key] = 0;
      if (key === 'turbo') p.invuln = Math.max(p.invuln, 1.0);
      if (key === 'kite' || key === 'jetpack') p.invuln = Math.max(p.invuln, 2.0); // safe landing
    }
  }
}

// Puddles splash when you run through them
function updateDecor(game) {
  const p = game.player;
  for (const c of game.decor) {
    if (c.splashed || laneOf(p.x) !== c.lane || Math.abs(c.z - game.d) > 0.9 || p.y > 0.1) continue;
    c.splashed = true;
    game.stats.puddles += 1;
    burst(game, p.x, 0.15, game.d, 16, { color: ['#cfe6ff', '#ffffff', '#8fb8ff'], speed: 4, life: 0.5, gravity: 14, up: 0.6 });
    emit(game, 'splash');
  }
  game.decor = game.decor.filter((c) => c.z > game.d - 8);
}

function updateMom(game, dt) {
  const m = game.mom;
  const p = game.player;
  // The chaser stays close at the start, right after you stumble, and in boss phases
  const close = game.time < 2.2 || game.time - p.lastStumble < T.stumbleWindow || game.rage.active;
  const target = game.rage.active ? 1.2 : close ? 2.0 : 18;
  m.gap += (target - m.gap) * Math.min(1, dt * (close ? 3 : 0.8));
  m.runPhase += dt * game.speed * 0.5;
  m.throwAnim = Math.max(0, m.throwAnim - dt);
  if (m.shoutTimer > 0) {
    m.shoutTimer -= dt;
    if (m.shoutTimer <= 0) m.shout = null;
  }
}

// Ghost recording: where you were every quarter second
function record(game, dt) {
  game.recT += dt;
  while (game.recT >= 0.25) {
    game.recT -= 0.25;
    const p = game.player;
    game.rec.push([Math.round(game.d * 10), Math.round(p.x * 10), Math.round(p.y * 10)]);
  }
}

function updateParticles(game, dt) {
  for (const pt of game.particles) {
    pt.vy -= pt.gravity * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.z += pt.vz * dt;
    pt.life -= dt;
  }
  game.particles = game.particles.filter((pt) => pt.life > 0);
  if (game.particles.length > 450) game.particles.splice(0, game.particles.length - 450);
}

function cleanup(game) {
  // Throw away what is behind the camera, or the lists grow forever
  game.obstacles = game.obstacles.filter((o) => o.z + o.len / 2 > game.d - 14 && (!o.fly || o.fly.y > -5));
  game.pickups = game.pickups.filter((k) => !k.taken && k.z > game.d - 4);
}
