// ============================================================
// Modes.jsx: the Story map (chapters with goals and bosses) and
// the Ghost Race panel (race your best run, or a friend's code).
// ============================================================
import { useState } from 'react';
import { CHAPTERS, ZONES, CHASERS } from '../game/world-data.js';
import { packGhost, unpackGhost } from '../game/save.js';
import { SamosaIcon } from './icons.jsx';

const fmt = (n) => n.toLocaleString('en-US');

export function Stars({ count, size = 22 }) {
  return (
    <span className="stars" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={i < count ? 'on' : ''}>
          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

export const chapterUnlocked = (profile, ch) => ch.id === 1 || (profile.story[ch.id - 1] ?? 0) > 0;

export function StoryMap({ profile, onPlay, onClose }) {
  const totalStars = CHAPTERS.reduce((n, c) => n + (profile.story[c.id] ?? 0), 0);
  return (
    <section className="sheet" aria-label="Story">
      <header className="sheet-head">
        <h2 className="sheet-title">Story <span className="count">★ {totalStars}/{CHAPTERS.length * 3}</span></h2>
        <button id="btn-close-story" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body">
        <ol className="chapter-list">
          {CHAPTERS.map((ch) => {
            const open = chapterUnlocked(profile, ch);
            const stars = profile.story[ch.id] ?? 0;
            const zone = ch.zone === 'tour' ? { name: 'World tour', color: '#ff3b5c' } : ch.zone === 'usa' ? { name: 'USA tour', color: '#2f5bea' } : ZONES[ch.zone];
            return (
              <li key={ch.id} className={`chapter ${open ? '' : 'locked'}`} style={{ '--zone': zone.color }}>
                <span className="chapter-num">{open ? ch.id : '🔒'}</span>
                <div className="chapter-info">
                  <h3>{ch.title}</h3>
                  <p className="chapter-meta">{zone.name} · chased by {CHASERS[ch.chaser].name}</p>
                  {open && <p className="chapter-intro">{ch.intro}</p>}
                  {open && (
                    <ul className="goals">
                      <li className={stars >= 1 ? 'done' : ''}>Run {fmt(ch.length)} m to the finish</li>
                      <li>Collect {ch.samosaGoal} samosas</li>
                      <li>Never stumble</li>
                    </ul>
                  )}
                  {!open && <p className="chapter-intro">Finish chapter {ch.id - 1} to unlock. New place, new boss, +{fmt(ch.reward)} samosas!</p>}
                </div>
                <div className="chapter-side">
                  <Stars count={stars} />
                  {open && (
                    <button id={`btn-chapter-${ch.id}`} className="btn btn-green btn-mini" onClick={() => onPlay(ch)}>
                      {stars ? 'Replay' : 'Play'}
                    </button>
                  )}
                  {stars === 0 && open && <span className="chapter-reward">+{fmt(ch.reward)} <SamosaIcon size={14} /></span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// Find a code inside a whole pasted message ("Beat my 5,000! Race code: SR1-...")
const findCode = (text) => (/SR1-[A-Za-z0-9_-]+/.exec(text) ?? [''])[0];

export function RacePanel({ profile, onRace, onClose, initialCode = '' }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const ghost = profile.ghost;
  const myCode = ghost ? packGhost(ghost) : '';
  const message = ghost ? `I scored ${fmt(ghost.score)} in Slipper Rush! Can you beat my ghost? Open the game, tap Ghost Race and paste this: ${myCode}` : '';

  const share = async () => {
    try {
      await navigator.share({ title: 'Slipper Rush challenge', text: message });
    } catch { /* the player closed the share menu */ }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const raceFriend = () => {
    const g = unpackGhost(findCode(code));
    if (!g) {
      setError("That code doesn't look right. Ask your friend to copy it again.");
      return;
    }
    onRace(g);
  };

  return (
    <section className="sheet" aria-label="Ghost race">
      <header className="sheet-head">
        <h2 className="sheet-title">Ghost Race</h2>
        <button id="btn-close-race" className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body race">
        <article className="race-card">
          <h3>Race your best run</h3>
          {ghost ? (
            <>
              <p>Your ghost scored <strong>{fmt(ghost.score)}</strong> over {fmt(ghost.distance)} m. Same track, same obstacles. Beat yourself!</p>
              <button id="btn-race-me" className="btn btn-green btn-mini" onClick={() => onRace(ghost)}>Race my ghost</button>
            </>
          ) : (
            <p>Set a new best score in a normal run and your ghost is saved here.</p>
          )}
        </article>

        {ghost && (
          <article className="race-card">
            <h3>Challenge a friend</h3>
            <p>Send your ghost. Your friend races it on exactly your track.</p>
            <div className="share-row">
              {navigator.share && <button id="btn-share" className="btn btn-green btn-mini" onClick={share}>Share</button>}
              <a id="btn-whatsapp" className="btn btn-whatsapp btn-mini" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <button id="btn-copy-code" className="btn btn-blue btn-mini" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <details className="code-details">
              <summary>Show code</summary>
              <textarea className="code-box" readOnly value={myCode} rows={3} onFocus={(e) => e.target.select()} aria-label="Your challenge code" />
            </details>
          </article>
        )}

        <article className="race-card">
          <h3>Got a code from a friend?</h3>
          <textarea
            id="input-code"
            className="code-box"
            rows={3}
            placeholder="Paste your friend's whole message here"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            aria-label="Friend's challenge code"
          />
          {error && <p className="code-error">{error}</p>}
          <button id="btn-race-friend" className="btn btn-green btn-mini" disabled={!findCode(code)} onClick={raceFriend}>Race their ghost</button>
        </article>
      </div>
    </section>
  );
}
