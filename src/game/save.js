// ============================================================
// save.js: the player's profile, kept in localStorage.
// Everything that should survive closing the app lives here.
// ============================================================
import { MISSIONS, TROPHIES } from './catalog.js';
import { updateDaily } from './daily.js';

const KEY = 'slipper-rush-profile-v1';

export function defaultProfile() {
  return {
    coins: 0,
    best: 0,
    topScores: [],                     // [{ score, date }]
    owned: { chars: ['ali'], outfits: ['street', 'cricket'], boards: ['classic'], pets: ['none'] },
    selected: { char: 'ali', outfit: 'street', board: 'classic', pet: 'none' },
    upgrades: { magnet: 0, jetpack: 0, turbo: 0, chai: 0, board: 0 },
    boards: 2,                         // skateboard rides in stock (2 free to start)
    keys: 2,                           // revive when caught (2 free to start)
    shields: 1,                        // force fields in stock
    totals: { samosas: 0, runs: 0, boardRides: 0, jetpacks: 0, puddles: 0, distance: 0 },
    missions: [],                      // ids of completed missions
    trophies: [],                      // ids of earned trophies
    lastGift: 0,                       // time of the last daily gift
    story: {},                         // chapter id -> best stars (1 to 3)
    looks: {},                         // your creator changes for each character
    ghost: null,                       // your best endless run, for ghost races
    daily: null,                       // streak, challenges and spin (see daily.js)
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw);
    const d = defaultProfile();
    // Merge with defaults so older saves still work after an update
    return {
      ...d,
      ...p,
      // Street Style is free for everyone, also on saves from older versions
      owned: { ...d.owned, ...p.owned, outfits: [...new Set(['street', ...(p.owned?.outfits ?? d.owned.outfits)])] },
      selected: { ...d.selected, ...p.selected },
      upgrades: { ...d.upgrades, ...p.upgrades },
      totals: { ...d.totals, ...p.totals },
    };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked: play on without saving */ }
}

// ---------- Daily gift ----------
const DAY = 24 * 60 * 60 * 1000;
export const giftReady = (p) => Date.now() - p.lastGift >= DAY;
export function claimGift(p) {
  const coins = 100 + Math.floor(Math.random() * 9) * 50; // 100 to 500
  const board = Math.random() < 0.35 ? 1 : 0;
  return { coins, board, profile: { ...p, coins: p.coins + coins, boards: p.boards + board, lastGift: Date.now() } };
}

// ---------- End of a run: scores, trophies, missions ----------
export function finishRun(profile, run) {
  const p = structuredClone(profile);
  const s = run.stats;
  p.coins += run.samosas;
  p.keys = (p.keys ?? 0) + (run.keysFound ?? 0);
  if (run.shieldsLeft != null) p.shields = run.shieldsLeft;
  p.totals.samosas += run.samosas;
  p.totals.runs += 1;
  p.totals.boardRides += s.boardRides;
  p.totals.jetpacks += s.jetpacks;
  p.totals.puddles += s.puddles;
  p.totals.distance += run.distance;

  const isRecord = run.score > p.best;
  if (isRecord) p.best = run.score;
  p.topScores = [...p.topScores, { score: run.score, date: Date.now() }].sort((a, b) => b.score - a.score).slice(0, 5);

  const runStats = { ...s, samosas: run.samosas, distance: run.distance, score: run.score };
  const earned = [];
  for (const t of TROPHIES) {
    if (!p.trophies.includes(t.id) && run.score >= t.score) {
      p.trophies.push(t.id);
      p.coins += t.reward;
      earned.push({ kind: 'trophy', text: t.name, reward: t.reward, color: t.color });
    }
  }
  for (const m of MISSIONS) {
    if (p.missions.includes(m.id)) continue;
    const value = m.scope === 'run' ? runStats[m.stat] : p.totals[m.stat];
    if (value >= m.goal) {
      p.missions.push(m.id);
      p.coins += m.reward;
      earned.push({ kind: 'mission', text: m.text, reward: m.reward });
    }
  }
  return { profile: updateDaily(p, runStats), isRecord, earned };
}

// How far along a mission is, 0 to 1 (run missions show the best attempt only once done)
export function missionProgress(p, m) {
  if (p.missions.includes(m.id)) return 1;
  if (m.scope === 'run') return 0;
  return Math.min(1, (p.totals[m.stat] ?? 0) / m.goal);
}

// ---------- Story mode ----------
export function finishChapter(profile, chapter, stars) {
  const p = structuredClone(profile);
  const before = p.story[chapter.id] ?? 0;
  let coins = 0;
  if (before === 0) coins += chapter.reward;       // first time you finish it
  coins += Math.max(0, stars - before) * 100;      // every new star
  p.story[chapter.id] = Math.max(before, stars);
  p.coins += coins;
  return { profile: p, coins, firstClear: before === 0 };
}

// ---------- Ghost runs and challenge codes ----------
// A ghost is the seed of the track plus a sample of where you were
// every 0.25 seconds. A challenge code packs that into text you can
// send to a friend: they race your ghost on exactly your track.
export function packGhost(g) {
  const bytes = [];
  const u32 = (n) => bytes.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  u32(g.seed);
  u32(g.score);
  const n = Math.min(g.samples.length, 65535);
  bytes.push((n >>> 8) & 255, n & 255);
  let prevD = 0;
  for (let i = 0; i < n; i++) {
    const [d, x, y] = g.samples[i];
    bytes.push(Math.max(0, Math.min(255, d - prevD)), Math.max(0, Math.min(255, x + 40)), Math.max(0, Math.min(255, y)));
    prevD += Math.max(0, Math.min(255, d - prevD));
  }
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'SR1-' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unpackGhost(code) {
  try {
    const clean = code.trim().replace(/^SR1-/, '').replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(clean + '==='.slice((clean.length + 3) % 4));
    const b = [...bin].map((c) => c.charCodeAt(0));
    const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const seed = u32(0);
    const score = u32(4);
    const n = (b[8] << 8) | b[9];
    if (b.length < 10 + n * 3 || n < 4) return null;
    const samples = [];
    let d = 0;
    for (let i = 0; i < n; i++) {
      const o = 10 + i * 3;
      d += b[o];
      samples.push([d, b[o + 1] - 40, b[o + 2]]);
    }
    return { seed, score, samples, distance: Math.round(d / 10), friend: true };
  } catch {
    return null;
  }
}
