// ============================================================
// daily.js: reasons to come back every day.
//  - Login streak: 7 days in a row, each reward bigger than the last
//  - 3 daily challenges, new ones every day
//  - One free spin of the prize wheel per day
// Everything is keyed by the local date ("2026-10-26"), so it
// resets at midnight on the player's phone.
// ============================================================

export const STREAK_REWARDS = [
  { coins: 100 },
  { coins: 150 },
  { coins: 200, boards: 1 },
  { coins: 300 },
  { coins: 400 },
  { coins: 500, boards: 1 },
  { coins: 1000, boards: 2, keys: 2 },
];

// stat: which number from a run counts. scope 'total' adds up all runs today,
// 'run' needs it in a single run.
const TEMPLATES = [
  { id: 'coins', stat: 'samosas', scope: 'total', goals: [150, 250, 400], text: (n) => `Collect ${n} coins` },
  { id: 'distance', stat: 'distance', scope: 'total', goals: [1500, 2500, 4000], text: (n) => `Run ${n.toLocaleString('en-US')} m in total` },
  { id: 'score', stat: 'score', scope: 'run', goals: [5000, 9000, 15000], text: (n) => `Score ${n.toLocaleString('en-US')} in one run` },
  { id: 'near', stat: 'nearMisses', scope: 'total', goals: [5, 10, 15], text: (n) => `Get ${n} close calls` },
  { id: 'combo', stat: 'maxCombo', scope: 'run', goals: [20, 30, 45], text: (n) => `Make a coin combo of ${n}` },
  { id: 'bounce', stat: 'bounces', scope: 'total', goals: [3, 5, 8], text: (n) => `Bounce on ${n} bounce pads` },
  { id: 'flips', stat: 'flips', scope: 'total', goals: [3, 6, 10], text: (n) => `Land ${n} flips` },
  { id: 'board', stat: 'boardRides', scope: 'total', goals: [2, 3, 5], text: (n) => `Ride the skateboard ${n} times` },
];
const REWARDS = [150, 250, 400];

// The prize wheel: 8 slices, drawn clockwise from the top
export const WHEEL = [
  { label: '50', coins: 50, color: '#ff7a1a' },
  { label: '200', coins: 200, color: '#2f5bea' },
  { label: '75', coins: 75, color: '#20c25a' },
  { label: 'Board', boards: 1, color: '#8a5cff' },
  { label: '100', coins: 100, color: '#ff3b5c' },
  { label: '500', coins: 500, color: '#ffb703' },
  { label: 'Key', keys: 1, color: '#13b5a5' },
  { label: '150', coins: 150, color: '#ff4f8b' },
];
// How likely each slice is (the big ones are rare)
const WHEEL_WEIGHTS = [20, 10, 18, 8, 16, 3, 15, 10];

export const today = (date = new Date()) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
const dayBefore = (day) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return today(d);
};

// A small seeded random generator, so everyone gets the same 3 challenges on the same day
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function makeChallenges(day) {
  const rnd = seeded(day);
  const pool = [...TEMPLATES];
  const out = [];
  for (let level = 0; level < 3; level++) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    out.push({ id: t.id, text: t.text(t.goals[level]), stat: t.stat, scope: t.scope, goal: t.goals[level], progress: 0, reward: REWARDS[level], claimed: false });
  }
  return out;
}

// Bring the daily part of the profile up to date (call when the app opens)
export function refreshDaily(profile) {
  const day = today();
  const d = profile.daily ?? {};
  if (d.day === day) return profile;
  // Keep the streak only if yesterday's reward was claimed
  const keep = d.streakLastDay === dayBefore(day) || d.streakLastDay === day;
  return {
    ...profile,
    daily: {
      day,
      challenges: makeChallenges(day),
      spun: false,
      streak: keep ? d.streak ?? 0 : 0,
      streakLastDay: keep ? d.streakLastDay : null,
    },
  };
}

export const streakReady = (p) => p.daily && p.daily.streakLastDay !== p.daily.day;
export const spinReady = (p) => p.daily && !p.daily.spun;
export const challengesToClaim = (p) => (p.daily?.challenges ?? []).filter((c) => c.progress >= c.goal && !c.claimed).length;
export const dailyBadge = (p) => (streakReady(p) ? 1 : 0) + (spinReady(p) ? 1 : 0) + challengesToClaim(p);

// Day number in the 7-day calendar for today's claim (0 to 6)
export const streakDay = (p) => (p.daily.streak ?? 0) % 7;

export function claimStreak(p) {
  if (!streakReady(p)) return { profile: p, reward: null };
  const reward = STREAK_REWARDS[streakDay(p)];
  return {
    reward,
    profile: {
      ...p,
      coins: p.coins + (reward.coins ?? 0),
      boards: p.boards + (reward.boards ?? 0),
      keys: (p.keys ?? 0) + (reward.keys ?? 0),
      daily: { ...p.daily, streak: (p.daily.streak ?? 0) + 1, streakLastDay: p.daily.day },
    },
  };
}

// Spin: pick the winning slice now; the wheel animation just shows it
export function spinWheel(p) {
  if (!spinReady(p)) return { profile: p, index: -1 };
  const total = WHEEL_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let index = 0;
  while (r >= WHEEL_WEIGHTS[index]) r -= WHEEL_WEIGHTS[index++];
  const prize = WHEEL[index];
  return {
    index,
    profile: { ...p, coins: p.coins + (prize.coins ?? 0), boards: p.boards + (prize.boards ?? 0), keys: (p.keys ?? 0) + (prize.keys ?? 0), daily: { ...p.daily, spun: true } },
  };
}

// After every run: move the challenges forward
export function updateDaily(p, runStats) {
  if (!p.daily) return p;
  const challenges = p.daily.challenges.map((c) => {
    const v = runStats[c.stat] ?? 0;
    const progress = c.scope === 'run' ? Math.max(c.progress, v) : c.progress + v;
    return { ...c, progress: Math.min(c.goal, progress) };
  });
  return { ...p, daily: { ...p.daily, challenges } };
}

export function claimChallenge(p, i) {
  const c = p.daily.challenges[i];
  if (!c || c.claimed || c.progress < c.goal) return p;
  const challenges = p.daily.challenges.map((x, j) => (j === i ? { ...x, claimed: true } : x));
  return { ...p, coins: p.coins + c.reward, daily: { ...p.daily, challenges } };
}
