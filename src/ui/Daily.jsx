// ============================================================
// Daily.jsx: the login streak calendar, the prize wheel and
// today's 3 challenges.
// ============================================================
import { useState } from 'react';
import { STREAK_REWARDS, WHEEL, streakReady, streakDay, spinReady } from '../game/daily.js';
import { SamosaIcon, PowerIcon } from './icons.jsx';

const fmt = (n) => n.toLocaleString('en-US');

function Wheel({ rotation, spinning }) {
  const n = WHEEL.length;
  const r = 100;
  const slice = (i) => {
    const a0 = ((i / n) * 360 - 90 - 180 / n) * (Math.PI / 180);
    const a1 = (((i + 1) / n) * 360 - 90 - 180 / n) * (Math.PI / 180);
    return `M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} A${r} ${r} 0 0 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`;
  };
  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden="true" />
      <svg className="wheel" viewBox="-110 -110 220 220" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3.6s cubic-bezier(0.17, 0.67, 0.12, 1)' : 'none' }} aria-hidden="true">
        <circle r="108" fill="#ffd23f" stroke="#b86e00" strokeWidth="4" />
        {WHEEL.map((w, i) => (
          <g key={i}>
            <path d={slice(i)} fill={w.color} stroke="#ffffff" strokeWidth="2" />
            <text
              transform={`rotate(${(i / n) * 360}) translate(0 -66)`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontFamily="Lilita One, sans-serif"
              fontSize={w.boards || w.keys ? 15 : 20}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="3"
              paintOrder="stroke"
            >
              {w.label}
            </text>
          </g>
        ))}
        {Array.from({ length: n }, (_, i) => (
          <circle key={i} cx={Math.cos(((i / n) * 360 - 90 - 180 / n) * (Math.PI / 180)) * 104} cy={Math.sin(((i / n) * 360 - 90 - 180 / n) * (Math.PI / 180)) * 104} r="4" fill="#fff6c8" />
        ))}
        <circle r="18" fill="#fff" stroke="#b86e00" strokeWidth="4" />
      </svg>
    </div>
  );
}

export default function Daily({ profile, onClaimStreak, onSpin, onClaimChallenge, onClose }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState(null);
  const d = profile.daily;
  const canStreak = streakReady(profile);
  const day = streakDay(profile); // today's box, or tomorrow's once claimed
  const canSpin = spinReady(profile) && !spinning;
  // Boxes already claimed in the current 7-day cycle
  const streak = d.streak ?? 0;
  const claimed = canStreak ? day : streak > 0 && streak % 7 === 0 ? 7 : streak % 7;

  const spin = () => {
    const index = onSpin();
    if (index < 0) return;
    // Land the chosen slice under the pointer at the top, after 5 full turns
    const target = 360 * 5 + (360 - (index / WHEEL.length) * 360);
    setSpinning(true);
    setWon(null);
    setRotation(target);
    setTimeout(() => {
      setSpinning(false);
      setWon(WHEEL[index]);
    }, 3700);
  };

  return (
    <section className="sheet daily" aria-label="Daily rewards">
      <header className="sheet-head">
        <h2 className="sheet-title">Daily</h2>
        <button id="btn-close-daily" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body daily-body">
        <h3 className="list-title">Login streak <span className="count">Day {canStreak ? day + 1 : Math.max(1, claimed)} of 7</span></h3>
        <ol className="streak">
          {STREAK_REWARDS.map((r, i) => {
            const done = i < claimed;
            const now = canStreak && i === day;
            return (
              <li key={i} className={`streak-day ${done ? 'done' : ''} ${now ? 'now' : ''} ${i === 6 ? 'big' : ''}`}>
                <span className="streak-label">Day {i + 1}</span>
                <span className="streak-prize"><SamosaIcon size={i === 6 ? 26 : 20} />{fmt(r.coins)}</span>
                {r.boards ? <span className="streak-extra">+{r.boards} <PowerIcon type="board" /></span> : null}
                {r.keys ? <span className="streak-extra key">+{r.keys} <PowerIcon type="key" /></span> : null}
                {done && <span className="streak-check" aria-label="claimed">✓</span>}
              </li>
            );
          })}
        </ol>
        <button id="btn-claim-streak" className="btn btn-green btn-mini" disabled={!canStreak} onClick={onClaimStreak}>
          {canStreak ? `Claim day ${day + 1}` : 'Come back tomorrow'}
        </button>
        <p className="streak-note">Miss a day and the streak starts again from day 1.</p>

        <h3 className="list-title">Lucky wheel</h3>
        <div className="wheel-row">
          <Wheel rotation={rotation} spinning={spinning} />
          <div className="wheel-side">
            <button id="btn-spin" className="btn btn-purple" disabled={!canSpin} onClick={spin}>
              {spinning ? 'Spinning...' : spinReady(profile) ? 'Free spin!' : 'Spun today'}
            </button>
            {won && (
              <p className="wheel-win" role="status">
                You won {won.coins ? <><strong>{fmt(won.coins)}</strong> <SamosaIcon size={18} /></> : won.keys ? <strong>a key!</strong> : <strong>a skateboard ride!</strong>}
              </p>
            )}
            {!spinReady(profile) && !won && !spinning && <p className="streak-note">One free spin every day.</p>}
          </div>
        </div>

        <h3 className="list-title">Today's challenges</h3>
        <ul className="mission-list">
          {d.challenges.map((c, i) => {
            const complete = c.progress >= c.goal;
            return (
              <li key={c.id} className={`mission ${c.claimed ? 'complete' : ''}`}>
                <span className="check" aria-hidden="true">{c.claimed ? '✓' : i + 1}</span>
                <div className="mission-info">
                  <span className="mission-text">{c.text}</span>
                  <span className="bar"><span className="bar-fill" style={{ transform: `scaleX(${c.progress / c.goal})` }} /></span>
                  <span className="mission-hint">{fmt(Math.floor(c.progress))} / {fmt(c.goal)}{c.scope === 'run' ? ' (best run)' : ''}</span>
                </div>
                {complete && !c.claimed ? (
                  <button id={`btn-claim-${i}`} className="btn btn-green btn-mini" onClick={() => onClaimChallenge(i)}>+{c.reward}</button>
                ) : (
                  <span className="reward">+{fmt(c.reward)} <SamosaIcon size={16} /></span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="streak-note">New challenges every day at midnight.</p>
      </div>
    </section>
  );
}
