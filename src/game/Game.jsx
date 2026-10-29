// ============================================================
// Game.jsx: connects the engine, the 3D view, the controls and
// the HUD.
//
// KEY LESSON: the game state lives in useRef, not useState.
// useState would re-render React 60 times a second. Instead the
// loop updates the engine, tells Three.js to draw, and writes
// the score straight into the HUD elements through refs.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { createGame, startRun, update, multiplier, chapterStars, ghostAt, reviveRun, reviveCost, endRun } from './engine.js';
import { CHASERS } from './world-data.js';
import { POWER_INFO, T } from './config.js';
import { GameView } from './scene/world.js';
import { useGameLoop } from './useGameLoop.js';
import { sfx, setIntensity, setRain } from './audio.js';
import { PowerIcon, SamosaIcon, StarIcon } from '../ui/icons.jsx';
import { Avatar } from '../ui/art.jsx';
import { CHARACTERS, findById } from './catalog.js';

const NO_INPUT = { left: false, right: false, up: false, down: false, board: false, tap: false, shield: false, fire: false };

// #3 First-run tutorial. The game freezes at each step until you do the move.
const TUTORIAL = [
  { icon: '↔', text: 'Swipe left or right to change lanes', ok: (i) => i.left || i.right },
  { icon: '↑', text: 'Swipe up to jump over crates', ok: (i) => i.up },
  { icon: '↓', text: 'Swipe down to roll under washing lines', ok: (i) => i.down },
  { icon: '◎', text: 'A red circle under you means a slipper is coming. Change lane! (Tap to go on)', ok: (i) => i.tap || i.left || i.right || i.up || i.down },
  { icon: '🛹', text: 'Double tap to ride a skateboard: faster, and it saves you from one crash', ok: (i) => i.board, needsBoard: true },
];
const POWER_KEYS = ['board', 'forcefield', 'blaster', 'jetpack', 'magnet', 'shield', 'turbo', 'double', 'kite', 'chai'];
const REVIVE_TIME = 5; // seconds to decide on the Save me! screen

let vibrationOn = true;
function vibrate(ms) {
  if (!vibrationOn) return;
  try { navigator.vibrate?.(ms); } catch { /* not supported everywhere */ }
}

export default function Game({ screen, run, quality, loadout, focus, best = 0, keys = 0, onUseKeys, missions = { done: 0, total: 0 }, settings = {}, tutorial = false, onTutorialDone, onGameOver, onPause, onAutoLow }) {
  const canvasRef = useRef(null);
  const viewRef = useRef(null);
  const gameRef = useRef(createGame());
  const input = useRef({ ...NO_INPUT });
  const reported = useRef(false);
  const music = useRef('');
  const rainLevel = useRef(0);
  const perf = useRef({ time: 0, frames: 0, done: false });
  const hud = useRef({});
  const tut = useRef(null);
  const [revive, setRevive] = useState(null); // { cost, left } while the Save me! screen is up
  const reviveRef = useRef(null);
  const keysRef = useRef(keys);
  keysRef.current = keys;
  reviveRef.current = revive;
  const last = useRef({});

  // Create the 3D view once (after the font loads, so painted signs use it)
  useEffect(() => {
    let view = null;
    let cancelled = false;
    const canvas = canvasRef.current;
    const resize = () => view?.resize(canvas.clientWidth, canvas.clientHeight);
    const fontReady = document.fonts?.load ? document.fonts.load('40px "Lilita One"').catch(() => {}) : Promise.resolve();
    Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
      if (cancelled) return;
      view = new GameView(canvas, quality, loadout);
      viewRef.current = view;
      resize();
    });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
      view?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewRef.current?.setQuality(quality);
  }, [quality]);
  // Show the chosen (or previewed) character, outfit and board
  const loadoutKey = JSON.stringify(loadout);
  useEffect(() => {
    viewRef.current?.setLoadout(loadout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadoutKey]);
  vibrationOn = settings.vibration !== false;
  const bestRef = useRef(best);
  bestRef.current = best;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // A new run (Play or Home) starts a fresh game state
  useEffect(() => {
    if (run.id === 0) return;
    gameRef.current = createGame(run.options);
    if (run.start) startRun(gameRef.current);
    viewRef.current?.reset(gameRef.current.chapter);
    reported.current = false;
    setRevive(null);
    tut.current = run.start && tutorial && run.options?.mode === 'endless' ? { step: 0, waiting: false, resumeAt: 1.6 } : null;
    music.current = '';
    last.current = {};
  }, [run]);

  // Keyboard: arrows or WASD, Space to jump, P to pause
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const onKey = (e) => {
      const i = input.current;
      if (e.repeat) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) i.left = true;
      else if (['ArrowRight', 'KeyD'].includes(e.code)) i.right = true;
      else if (['ArrowUp', 'KeyW', 'Space'].includes(e.code)) i.up = true;
      else if (['ArrowDown', 'KeyS'].includes(e.code)) i.down = true;
      else if (['KeyB', 'ShiftLeft', 'ShiftRight'].includes(e.code)) i.board = true;
      else if (e.code === 'KeyF') i.fire = true;
      else if (e.code === 'KeyE') i.shield = true;
      else if (['KeyP', 'Escape'].includes(e.code)) onPause();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, onPause]);

  // Swipes: fire as soon as the finger has moved far enough
  // A quick double tap (no swipe) rides a skateboard
  const swipe = useRef(null);
  const lastTap = useRef(0);
  const onPointerDown = (e) => {
    if (screen !== 'playing') return;
    swipe.current = { x: e.clientX, y: e.clientY, done: false, t: performance.now() };
  };
  const onPointerMove = (e) => {
    const s = swipe.current;
    if (!s || s.done) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) < 28) return;
    s.done = true;
    const i = input.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) i.left = true;
      else i.right = true;
    } else if (dy < 0) i.up = true;
    else i.down = true;
  };
  const onPointerUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.done || performance.now() - s.t > 250) return;
    const now = performance.now();
    input.current.tap = true;
    if (now - lastTap.current < 320) {
      input.current.board = true;
      lastTap.current = 0;
    } else lastTap.current = now;
  };

  useGameLoop((dt) => {
    const game = gameRef.current;
    if (import.meta.env.DEV) {
      if (!Object.getOwnPropertyDescriptor(window, '__game')) {
        Object.defineProperty(window, '__game', { get: () => gameRef.current, configurable: true });
      }
      window.__view = viewRef.current;
      // __step(120) runs 2 seconds of game instantly (handy for testing)
      window.__step = (n, inp = {}) => {
        for (let i = 0; i < n; i++) {
          update(gameRef.current, 1 / 60, { ...NO_INPUT, ...(i === 0 ? inp : {}) });
          viewRef.current?.updateCamera(gameRef.current, 1 / 60);
        }
      };
    }
    const tt = tut.current;
    let frozen = false;
    if (tt && game.status === 'playing' && screen === 'playing') {
      let step = TUTORIAL[tt.step];
      if (step?.needsBoard && game.boardsLeft <= 0) step = TUTORIAL[++tt.step];
      if (!step) {
        tut.current = null;
        showTip(null);
        onTutorialDone?.();
      } else if (!tt.waiting && game.time >= tt.resumeAt) {
        tt.waiting = true;
        showTip(step);
      } else if (tt.waiting) {
        if (step.ok(input.current)) {
          tt.waiting = false;
          tt.step += 1;
          tt.resumeAt = game.time + 2.2;
          showTip(null);
        } else frozen = true; // wait for the player
      }
      game.player.invuln = Math.max(game.player.invuln, 0.3); // no crashing while you learn
    }
    if (frozen) update(game, 0, NO_INPUT);
    else update(game, dt, input.current);
    input.current = { ...NO_INPUT };
    if (viewRef.current) viewRef.current.focus = focusRef.current;

    if (game.status !== 'menu') {
      for (const e of game.events) {
        sfx(e);
        if (e === 'hit') vibrate(250);
        if (e === 'stumble' || e === 'thwack' || e === 'thunder') vibrate(60);
      }
      // Music follows the action; Chai Time slows it down
      const level = game.power.turbo > 0 || game.power.kite > 0 || game.rage.active ? 2 : game.time > 25 ? 1 : 0;
      const slow = game.power.chai > 0;
      const key = `${level}${slow}`;
      if (key !== music.current && game.status === 'playing') {
        music.current = key;
        setIntensity(level, slow);
      }
    }
    game.events.length = 0;

    const rain = game.status === 'playing' ? game.weather.rain : 0;
    if (Math.abs(rain - rainLevel.current) > 0.05) {
      rainLevel.current = rain;
      setRain(rain);
    }

    // Drop to Low graphics automatically if the phone can't keep up
    const pf = perf.current;
    if (!import.meta.env.DEV && !pf.done && quality === 'high' && game.status === 'playing' && game.time > 1.5) {
      pf.time += dt;
      pf.frames += 1;
      if (pf.time > 4) {
        pf.done = true;
        if (pf.frames / pf.time < 32) onAutoLow?.();
      }
    }

    // Caught! Offer to spend keys and keep running
    if (game.status === 'revive') {
      const r = reviveRef.current;
      if (!r) {
        // Not enough keys: no point asking, the run just ends
        if (keysRef.current < reviveCost(game)) declineRevive();
        else setRevive({ cost: reviveCost(game), left: REVIVE_TIME });
      }
      else if (r.left > 0) {
        const left = Math.max(0, r.left - dt);
        if (Math.ceil(left) !== Math.ceil(r.left)) setRevive({ ...r, left });
        else r.left = left;
      } else declineRevive();
    }
    updateHud(game);
    viewRef.current?.render(game, dt);

    if (game.status === 'over' && !reported.current) {
      reported.current = true;
      onGameOver({
        score: Math.floor(game.score),
        samosas: game.samosas,
        distance: Math.floor(game.d),
        deathBy: game.deathBy,
        stats: game.stats,
        boardsLeft: game.boardsLeft,
        shieldsLeft: game.shieldsLeft,
        keysFound: game.keysFound,
        revives: game.revives,
        mode: game.mode,
        won: game.won,
        stars: game.chapter ? chapterStars(game) : 0,
        chapter: game.chapter,
        chaser: game.chaser,
        ghost: game.ghost,
        seed: game.seed,
        rec: game.rec,
      });
    }
  }, screen !== 'paused');

  // Write HUD values directly to the DOM, and only when they change
  function updateHud(game) {
    const h = hud.current;
    const l = last.current;
    if (!h.score) return;
    const score = Math.floor(game.score);
    if (score !== l.score) { h.score.textContent = String(score).padStart(6, '0'); l.score = score; }
    if (game.samosas !== l.samosas) {
      h.samosas.textContent = game.samosas;
      h.coinPill.classList.remove('bump');
      void h.coinPill.offsetWidth; // restart the CSS animation
      h.coinPill.classList.add('bump');
      l.samosas = game.samosas;
    }
    const dist = Math.floor(game.d);
    if (dist !== l.dist) { h.dist.textContent = `${dist.toLocaleString('en-US')} m`; l.dist = dist; }
    // #9 show the record to beat, and celebrate the moment you pass it
    const best = bestRef.current;
    if (best > 0 && game.mode === 'endless' && game.status === 'playing') {
      const passed = score > best;
      if (passed && !l.passedBest) {
        l.passedBest = true;
        h.banner.textContent = 'NEW BEST!';
        h.banner.style.color = '#ffd23f';
        h.banner.classList.remove('show');
        void h.banner.offsetWidth;
        h.banner.classList.add('show');
        sfx('level');
      }
      const left = best - score;
      const bt = passed ? 'New record!' : left < best * 0.15 ? `${left.toLocaleString('en-US')} to beat your best!` : `Best ${best.toLocaleString('en-US')}`;
      if (bt !== l.bestText) { h.best.textContent = bt; h.best.classList.toggle('hot', passed || left < best * 0.15); l.bestText = bt; }
    } else if (l.bestText !== '') { h.best.textContent = ''; l.bestText = ''; }
    // Coin combo counter (fades when the chain breaks) and the Coin Frenzy glow
    const live = game.combo >= 5 && game.time - game.lastCoinT < 0.75 ? game.combo : 0;
    if (live !== l.combo) {
      h.combo.hidden = !live;
      if (live) {
        h.combo.textContent = `COMBO x${live}`;
        h.combo.classList.remove('bump');
        void h.combo.offsetWidth;
        h.combo.classList.add('bump');
      }
      l.combo = live;
    }
    toggle(h.frenzy, game.frenzy > 0, 'frenzy');
    toggle(h.slowmo, game.slowmo > 0, 'slowmo');
    const m = multiplier(game);
    if (m !== l.mult) { h.multText.textContent = `x${m}`; h.mult.classList.toggle('hot', m > 1); l.mult = m; }

    for (const k of POWER_KEYS) {
      const v = k === 'shield' ? (game.player.shield ? 1 : 0) : k === 'board' ? game.board.t / game.dur.board : game.power[k] / game.dur[k];
      const row = h[`power-${k}`];
      row.hidden = v <= 0;
      if (v > 0) h[`bar-${k}`].style.transform = `scaleX(${v})`;
    }

    flash(h.banner, game.banner, 'bannerId');
    flash(h.popup, game.popup, 'popupId');

    // Story: how far to the finish line. Race: ahead of or behind the ghost.
    if (game.chapter && h.progFill) {
      const f = Math.min(1, game.d / game.chapter.length);
      const pct = Math.round(f * 200) / 200;
      if (pct !== l.prog) { h.progFill.style.transform = `scaleX(${pct})`; h.progRunner.style.left = `${pct * 100}%`; l.prog = pct; }
    }
    if (game.ghost && h.ghostText && game.status !== 'menu') {
      const gp = ghostAt(game.ghost, game.time);
      // #13 compare SCORES (both runs move at the same speed, so distance is nearly always equal).
      // The ghost's score at this moment is estimated from how far it has run.
      const gs = gp.done ? game.ghost.score : Math.round(game.ghost.score * Math.min(1, gp.d / Math.max(1, game.ghost.distance ?? gp.d)));
      const diff = score - gs;
      const n = (v) => Math.abs(v).toLocaleString('en-US');
      const text = gp.done ? (diff > 0 ? `You beat the ghost by ${n(diff)}!` : `Ghost finished · ${n(diff)} to beat`) : diff >= 0 ? `You lead the ghost by ${n(diff)}` : `Ghost leads by ${n(diff)}`;
      if (text !== l.ghost) {
        h.ghostText.textContent = text;
        h.ghostPill.classList.toggle('ahead', diff < 0);
        l.ghost = text;
      }
    }
    const tag = CHASERS[game.chaser]?.name ?? 'Mom';
    if (tag !== l.tag) { h.momTag.textContent = tag; h.rageLabel.textContent = game.chaser === 'mom' ? 'Scooter Rage' : 'Boss chase'; l.tag = tag; }

    const shout = game.status === 'menu' ? null : game.mom.shout;
    if (shout !== l.shout) {
      h.mom.hidden = !shout;
      if (shout) h.momText.textContent = shout;
      l.shout = shout;
    }
    toggle(h.shieldBtn, game.status === 'playing' && game.shieldsLeft > 0 && game.power.forcefield <= 0, 'shieldBtn');
    if (game.shieldsLeft !== l.shields) { h.shieldCount.textContent = game.shieldsLeft; l.shields = game.shieldsLeft; }
    toggle(h.fireBtn, game.status === 'playing' && game.power.blaster > 0, 'fireBtn');
    const canRide = game.status === 'playing' && game.boardsLeft > 0 && game.board.t <= 0;
    toggle(h.boardBtn, canRide, 'boardBtn');
    if (game.boardsLeft !== l.boards) { h.boardCount.textContent = game.boardsLeft; l.boards = game.boardsLeft; }
    toggle(h.danger, game.strikes.some((s) => s.t > 0), 'danger');
    toggle(h.chai, game.power.chai > 0, 'chai');
    toggle(h.speed, game.status === 'playing' && (game.power.turbo > 0 || game.speed > 27), 'speed');
    toggle(h.rage, game.rage.active, 'rage');
    if (game.rage.active) h.rageFill.style.transform = `scaleX(${1 - game.rage.t / T.rageDuration})`;
    const f = Math.round(game.flash * 20) / 20;
    if (f !== l.flash) { h.flash.style.opacity = f * 0.55; l.flash = f; }
  }

  function acceptRevive() {
    const game = gameRef.current;
    if (game.status !== 'revive' || !onUseKeys?.(reviveCost(game))) return;
    reviveRun(game);
    setRevive(null);
  }
  function declineRevive() {
    const game = gameRef.current;
    if (game.status === 'revive') endRun(game);
    setRevive(null);
  }

  function showTip(step) {
    const h = hud.current;
    if (!h.tip) return;
    h.tip.hidden = !step;
    if (step) {
      h.tipIcon.textContent = step.icon;
      h.tipText.textContent = step.text;
    }
  }

  function toggle(el, on, key) {
    if (on === last.current[key]) return;
    el.hidden = !on;
    last.current[key] = on;
  }

  function flash(el, msg, key) {
    if (!msg || msg.id === last.current[key]) return;
    last.current[key] = msg.id;
    el.textContent = msg.text;
    el.style.color = msg.color;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  const ref = (name) => (el) => { hud.current[name] = el; };

  return (
    <div className="game">
      <canvas ref={canvasRef} className="view" aria-label="Game view" />
      <div className="fx-chai" ref={ref('chai')} hidden />
      <div className="fx-speed" ref={ref('speed')} hidden />
      <div className="fx-flash" ref={ref('flash')} />
      <div className="fx-frenzy" ref={ref('frenzy')} hidden />
      <div className="fx-slowmo" ref={ref('slowmo')} hidden />
      <div
        className="touch-layer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div className="hud" hidden={screen === 'menu'}>
        <div className="hud-top">
          {missions.total > 0 && (
            <div className="mission-pill" aria-label={`Missions done: ${missions.done} of ${missions.total}`}>
              <span aria-hidden="true">🎯</span>{missions.done}/{missions.total}
            </div>
          )}
          <button id="btn-pause" className="round-btn" onClick={onPause} aria-label="Pause">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          </button>
          <div className="rage-meter" ref={ref('rage')} hidden>
            <span className="rage-label" ref={ref('rageLabel')}>Scooter Rage</span>
            <span className="rage-track"><span className="rage-fill" ref={ref('rageFill')} /></span>
          </div>
          <div className="hud-right">
            <div className="score-pill">
              <span className="mult" ref={ref('mult')}><span ref={ref('multText')}>x1</span><StarIcon /></span>
              <span className="score" ref={ref('score')}>000000</span>
            </div>
            {best > 0 && (
              <div className="top-run" aria-label={`Top run ${best}`}>
                <span className="top-run-label">TOP RUN</span>
                <span className="top-run-face"><Avatar char={findById(CHARACTERS, loadout.char) ?? CHARACTERS[0]} size={40} /></span>
                <span className="top-run-score">{best.toLocaleString('en-US')}</span>
              </div>
            )}
            <div className="sub-stats">
              <span ref={ref('dist')}>0 m</span>
              <span className="best-line" ref={ref('best')} />
            </div>
            <div className="coin-pill" ref={ref('coinPill')}>
              <SamosaIcon />
              <span ref={ref('samosas')}>0</span>
            </div>
          </div>
        </div>

        {run.options?.chapter && (
          <div className="level-bar" aria-label="Distance to the finish">
            <span className="level-track"><span className="level-fill" ref={ref('progFill')} /></span>
            <span className="level-runner" ref={ref('progRunner')} />
            <span className="level-flag" aria-hidden="true">🏁</span>
          </div>
        )}
        {run.options?.ghost && (
          <div className="ghost-pill" ref={ref('ghostPill')}>
            <span className="ghost-dot" aria-hidden="true" />
            <span ref={ref('ghostText')}>Ghost</span>
          </div>
        )}

        <div className="powers">
          {POWER_KEYS.map((k) => (
            <div key={k} className="power-row" ref={ref(`power-${k}`)} hidden>
              <span className="power-icon" style={{ background: POWER_INFO[k].color }}>
                <PowerIcon type={k} />
              </span>
              <span className="power-track">
                <span className="power-fill" ref={ref(`bar-${k}`)} style={{ background: POWER_INFO[k].color }} />
              </span>
            </div>
          ))}
        </div>

        <button
          id="btn-board"
          className="board-btn"
          ref={ref('boardBtn')}
          hidden
          onPointerDown={(e) => { e.stopPropagation(); input.current.board = true; }}
          aria-label="Ride a skateboard"
        >
          <PowerIcon type="board" />
          <span className="board-count" ref={ref('boardCount')}>0</span>
        </button>

        <button id="btn-shield" className="action-btn shield-btn" ref={ref('shieldBtn')} hidden onPointerDown={(e) => { e.stopPropagation(); input.current.shield = true; }} aria-label="Turn on a force field">
          <PowerIcon type="forcefield" />
          <span className="board-count" ref={ref('shieldCount')}>0</span>
        </button>
        <button id="btn-fire" className="action-btn fire-btn" ref={ref('fireBtn')} hidden onPointerDown={(e) => { e.stopPropagation(); input.current.fire = true; }} aria-label="Throw a water balloon">
          <PowerIcon type="blaster" />
          <span className="fire-label">FIRE</span>
        </button>

        <div className="tutorial" ref={ref('tip')} hidden role="status">
          <span className="tip-icon" ref={ref('tipIcon')} aria-hidden="true" />
          <span className="tip-text" ref={ref('tipText')} />
        </div>
        <div className="combo-pill" ref={ref('combo')} hidden />
        <div className="banner" ref={ref('banner')} />
        <div className="popup" ref={ref('popup')} />
        <div className="danger" ref={ref('danger')} hidden />
        <div className="mom-bubble" ref={ref('mom')} hidden>
          <span className="mom-tag" ref={ref('momTag')}>Mom</span>
          <span ref={ref('momText')} />
        </div>
      </div>
      {revive && (
        <div className="overlay revive-overlay" role="dialog" aria-label="Save me">
          <div className="card revive-card">
            <div className="card-ribbon">Save me!</div>
            <div className="revive-timer" style={{ '--p': revive.left / REVIVE_TIME }}>
              <span>{Math.ceil(revive.left)}</span>
            </div>
            <p className="card-text">Use keys to escape and keep your run going.</p>
            <button id="btn-revive" className="btn btn-blue revive-btn" disabled={keys < revive.cost} onClick={acceptRevive}>
              <PowerIcon type="key" /> Use {revive.cost} {revive.cost === 1 ? 'key' : 'keys'}
            </button>
            <p className="revive-have">You have <strong>{keys}</strong> {keys === 1 ? 'key' : 'keys'}</p>
            <button id="btn-no-revive" className="link-btn" onClick={declineRevive}>No thanks</button>
          </div>
        </div>
      )}
    </div>
  );
}
