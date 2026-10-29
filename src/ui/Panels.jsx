// ============================================================
// Panels.jsx: Trophy Room, Missions, the daily gift and the
// end-of-run results with awards.
// ============================================================
import { useEffect, useState } from 'react';
import { TROPHIES, MISSIONS } from '../game/catalog.js';
import { missionProgress } from '../game/save.js';
import { TrophyIcon, GiftIcon } from './art.jsx';
import { SamosaIcon } from './icons.jsx';
import { Stars } from './Modes.jsx';
import { CHASERS } from '../game/world-data.js';

const fmt = (n) => n.toLocaleString('en-US');
const dateFmt = (t) => new Date(t).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

export function Trophies({ profile, onClose }) {
  const next = TROPHIES.find((t) => !profile.trophies.includes(t.id));
  return (
    <section className="sheet" aria-label="Trophy Room">
      <header className="sheet-head">
        <h2 className="sheet-title">Trophy Room</h2>
        <button id="btn-close-trophies" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body">
        <div className="best-banner">
          <TrophyIcon color="#ffc94a" size={56} />
          <div>
            <span className="best-label">Highest score</span>
            <span className="best-value">{fmt(profile.best)}</span>
          </div>
        </div>
        {next && <p className="next-goal">Next award at <strong>{fmt(next.score)}</strong> points: {next.name}</p>}
        <div className="trophy-grid">
          {TROPHIES.map((t) => {
            const won = profile.trophies.includes(t.id);
            return (
              <article key={t.id} className={`trophy ${won ? 'won' : ''}`}>
                <TrophyIcon color={t.color} locked={!won} />
                <h3>{t.name}</h3>
                <p>{fmt(t.score)} points</p>
                <span className="tag">{won ? 'Earned' : <>+{fmt(t.reward)} <SamosaIcon size={14} /></>}</span>
              </article>
            );
          })}
        </div>
        <h3 className="list-title">Top scores</h3>
        {profile.topScores.length === 0 ? (
          <p className="empty">No runs yet. Your best 5 scores will show here.</p>
        ) : (
          <ol className="top-list">
            {profile.topScores.map((s, i) => (
              <li key={s.date + i}>
                <span className="rank">{i + 1}</span>
                <span className="top-score">{fmt(s.score)}</span>
                <span className="top-date">{dateFmt(s.date)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export function Missions({ profile, onClose }) {
  const done = profile.missions.length;
  return (
    <section className="sheet" aria-label="Missions">
      <header className="sheet-head">
        <h2 className="sheet-title">Missions <span className="count">{done}/{MISSIONS.length}</span></h2>
        <button id="btn-close-missions" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body">
        <ul className="mission-list">
          {MISSIONS.map((m) => {
            const complete = profile.missions.includes(m.id);
            const prog = missionProgress(profile, m);
            return (
              <li key={m.id} className={`mission ${complete ? 'complete' : ''}`}>
                <span className="check" aria-hidden="true">{complete ? '✓' : ''}</span>
                <div className="mission-info">
                  <span className="mission-text">{m.text}</span>
                  {m.scope === 'total' && !complete && (
                    <span className="bar"><span className="bar-fill" style={{ transform: `scaleX(${prog})` }} /></span>
                  )}
                  {m.scope === 'run' && !complete && <span className="mission-hint">In a single run</span>}
                </div>
                <span className="reward">+{fmt(m.reward)} <SamosaIcon size={16} /></span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function GiftModal({ gift, onClose }) {
  return (
    <div className="overlay" role="dialog" aria-label="Daily gift">
      <div className="card gift-card">
        <div className="card-ribbon ribbon-blue">Daily gift</div>
        <div className="gift-art"><GiftIcon size={96} /></div>
        <p className="gift-amount">+{fmt(gift.coins)} <SamosaIcon size={30} /></p>
        {gift.board > 0 && <p className="card-text">And a free skateboard ride!</p>}
        <p className="card-text">Come back tomorrow for another one.</p>
        <button id="btn-gift-ok" className="btn btn-green" onClick={onClose}>Collect</button>
      </div>
    </div>
  );
}

const DEATH_LINES = {
  truck: 'You ran into a painted truck.',
  rickshaw: 'Beep beep! A rickshaw got you.',
  crate: 'Tripped over a crate.',
  cart: 'Face first into the fruit cart.',
  line: 'Tangled in the washing line.',
  slipper: "Mom's slipper never misses.",
  newspaper: "Dad's newspaper hit the headlines. And you.",
  book: 'The Principal threw the rule book at you.',
};

// The score counts up from 0 when the results appear
function useCountUp(target, ms = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const f = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - f) ** 3)));
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function Results({ result, profile, onAgain, onHome, onNext }) {
  const shown = useCountUp(result.score);
  const share = async () => {
    const text = `I scored ${fmt(result.score)} in Slipper Rush and ran ${fmt(result.distance)} m from Mom! Can you beat me?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Slipper Rush', text });
      else await navigator.clipboard.writeText(text);
    } catch { /* closed the share menu */ }
  };
  const story = result.mode === 'story';
  const race = result.mode === 'race';
  const won = story ? result.won : race ? result.beatGhost : result.isRecord;
  const chaser = CHASERS[result.chaser ?? 'mom'];
  let ribbon = result.isRecord ? 'New record!' : 'Caught!';
  if (story) ribbon = result.won ? 'Chapter clear!' : 'Caught!';
  if (race) ribbon = result.beatGhost ? 'You beat the ghost!' : 'The ghost wins';
  let line = DEATH_LINES[result.deathBy] ?? `${chaser.name} caught up with you.`;
  if (story && result.won) line = `"${chaser.lines.lose[0]}" said ${chaser.name}.`;
  if (race) line = result.beatGhost ? `You beat ${result.ghostFriend ? "your friend's" : 'your own'} ghost by ${fmt(result.score - result.ghostScore)} points!` : `The ghost scored ${fmt(result.ghostScore)}. So close!`;
  return (
    <div className="overlay">
      <div className={`card results ${won ? 'record' : ''}`}>
        {won && <div className="coin-rain" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }}><SamosaIcon size={18 + (i % 3) * 6} /></i>)}</div>}
        {won && <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>}
        <div className="card-ribbon">{ribbon}</div>
        {story && <div className="result-stars"><Stars count={result.stars} size={44} /></div>}
        {!story && result.isRecord && <div className="record-trophy"><span className="sunburst" aria-hidden="true" /><TrophyIcon color="#ffc94a" size={72} /></div>}
        {story && <p className="chapter-name">Chapter {result.chapter.id}: {result.chapter.title}</p>}
        <p className="card-text">{line}</p>
        <div className="final-score">{fmt(shown)}</div>
        <div className="result-row">
          <div className="result-cell">
            <span className="result-label">Samosas</span>
            <span className="result-value"><SamosaIcon size={20} /> +{result.samosas}</span>
          </div>
          <div className="result-cell">
            <span className="result-label">Distance</span>
            <span className="result-value">{fmt(result.distance)} m</span>
          </div>
          <div className="result-cell">
            <span className="result-label">{race ? 'Ghost' : 'Best'}</span>
            <span className="result-value">{fmt(race ? result.ghostScore : profile.best)}</span>
          </div>
        </div>
        {(result.earned.length > 0 || result.chapterCoins > 0) && (
          <ul className="earned">
            {result.chapterCoins > 0 && (
              <li className="earned-mission">
                <span className="check">★</span>
                <span className="earned-text">{result.firstClear ? 'Chapter reward' : 'New stars'}</span>
                <span className="reward">+{fmt(result.chapterCoins)} <SamosaIcon size={14} /></span>
              </li>
            )}
            {result.earned.map((e) => (
              <li key={e.text} className={`earned-${e.kind}`}>
                {e.kind === 'trophy' ? <TrophyIcon color={e.color} size={28} /> : <span className="check">✓</span>}
                <span className="earned-text">{e.kind === 'trophy' ? `Award: ${e.text}` : e.text}</span>
                <span className="reward">+{fmt(e.reward)} <SamosaIcon size={14} /></span>
              </li>
            ))}
          </ul>
        )}
        <p className="wallet">You now have <strong>{fmt(profile.coins)}</strong> <SamosaIcon size={16} /></p>
        <div className="card-actions">
          {story && result.won && onNext ? (
            <button id="btn-next" className="btn btn-green" onClick={onNext}>Next chapter</button>
          ) : (
            <button id="btn-again" className="btn btn-green" onClick={onAgain}>{story || race ? 'Try again' : 'Play again'}</button>
          )}
          <div className="card-actions-row">
            <button id="btn-share" className="btn btn-purple btn-small" onClick={share}>Share</button>
            <button id="btn-home" className="btn btn-blue btn-small" onClick={onHome}>Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// #12 Settings: clear words instead of a mystery "HD / Fast" button
function Toggle({ id, label, hint, on, onChange }) {
  return (
    <li className="setting">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <button id={id} role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
        <span className="knob" />
      </button>
    </li>
  );
}

export function Settings({ quality, onQuality, sound, onSound, music, onMusic, vibration, onVibration, onTutorial, onClose }) {
  return (
    <section className="sheet" aria-label="Settings">
      <header className="sheet-head">
        <h2 className="sheet-title">Settings</h2>
        <button id="btn-close-settings" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body">
        <h3 className="list-title">Graphics</h3>
        <div className="segmented" role="radiogroup" aria-label="Graphics">
          <button id="btn-q-high" role="radio" aria-checked={quality === 'high'} className={quality === 'high' ? 'on' : ''} onClick={() => onQuality('high')}>
            <strong>Beautiful</strong><span>Glow, shadows, sharp. For newer phones.</span>
          </button>
          <button id="btn-q-low" role="radio" aria-checked={quality === 'low'} className={quality === 'low' ? 'on' : ''} onClick={() => onQuality('low')}>
            <strong>Smooth</strong><span>Faster and saves battery. For older phones.</span>
          </button>
        </div>
        <h3 className="list-title">Sound and feel</h3>
        <ul className="settings-list">
          <Toggle id="tog-sound" label="Sound effects" on={sound} onChange={onSound} />
          <Toggle id="tog-music" label="Music" on={music} onChange={onMusic} />
          <Toggle id="tog-vibration" label="Vibration" hint="Buzz when you get hit" on={vibration} onChange={onVibration} />
        </ul>
        <button id="btn-replay-tutorial" className="btn btn-blue btn-mini" onClick={onTutorial}>Show the tutorial again</button>
      </div>
    </section>
  );
}
