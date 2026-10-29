// ============================================================
// App.jsx: the home screen and everything around the game.
// Screens: menu (with shop / trophies / missions sheets),
// playing, paused and results. The player's profile (coins,
// unlocks, trophies) is loaded once and saved after every change.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Game from './game/Game.jsx';
import { initAudio, setMuted, setMusicMuted, startMusic, stopMusic, sfx } from './game/audio.js';
import { loadProfile, saveProfile, finishRun, finishChapter, giftReady, claimGift } from './game/save.js';
import { CHAPTERS } from './game/world-data.js';
import { StoryMap, RacePanel } from './ui/Modes.jsx';
import { CHARACTERS, OUTFITS, MISSIONS, findById } from './game/catalog.js';
import { resolveLook, CLOTHING_KEYS } from './game/looks.js';
import Creator from './ui/Creator.jsx';
import Daily from './ui/Daily.jsx';
import { refreshDaily, claimStreak, spinWheel, claimChallenge, dailyBadge } from './game/daily.js';
import Shop from './ui/Shop.jsx';
import { Trophies, Missions, GiftModal, Results, Settings } from './ui/Panels.jsx';
import { SamosaIcon, SoundIcon } from './ui/icons.jsx';
import { GiftIcon, TrophyIcon, Avatar, PetIcon } from './ui/art.jsx';
import { ShopIcon, TargetIcon } from './ui/icons.jsx';

function loadSetting(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function saveSetting(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
const fmt = (n) => n.toLocaleString('en-US');

export default function App() {
  const [profile, setProfileState] = useState(() => refreshDaily(loadProfile()));
  const [screen, setScreen] = useState('menu');
  const [sheet, setSheet] = useState(null); // 'shop' | 'trophies' | 'missions' | 'story' | 'race'
  const [preview, setPreview] = useState(null);
  const [gift, setGift] = useState(null);
  const [run, setRun] = useState({ id: 0, start: false, options: {} });
  const lastMode = useRef({ mode: 'endless' }); // so "Try again" repeats the same chapter or race
  const [result, setResult] = useState(null);
  const [muted, setMutedState] = useState(() => loadSetting('sr-muted', false));
  const [quality, setQuality] = useState(() => loadSetting('sr-quality', 'high'));
  const [musicOn, setMusicOn] = useState(() => loadSetting('sr-music', true));
  const [vibration, setVibration] = useState(() => loadSetting('sr-vibration', true));
  const [tutorialDone, setTutorialDone] = useState(() => loadSetting('sr-tutorial-done', false));
  // A challenge link like  ...#race=SR1-xxxx  opens the Ghost Race panel with the code filled in
  const [linkCode] = useState(() => {
    const m = /race=(SR1-[A-Za-z0-9_-]+)/.exec(window.location.hash);
    return m ? m[1] : '';
  });
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const overAt = useRef(0);

  const setProfile = useCallback((p) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  useEffect(() => {
    setMuted(muted);
    saveSetting('sr-muted', muted);
  }, [muted]);
  useEffect(() => saveSetting('sr-quality', quality), [quality]);
  useEffect(() => { setMusicMuted(!musicOn); saveSetting('sr-music', musicOn); }, [musicOn]);
  useEffect(() => saveSetting('sr-vibration', vibration), [vibration]);
  useEffect(() => saveSetting('sr-tutorial-done', tutorialDone), [tutorialDone]);
  useEffect(() => { if (linkCode) setSheet('race'); }, [linkCode]);
  const finishTutorial = useCallback(() => setTutorialDone(true), []);
  const autoLow = useCallback(() => setQuality('low'), []);

  // mode: 'endless' | 'story' (with a chapter) | 'race' (with a ghost)
  const play = useCallback((how = lastMode.current) => {
    initAudio();
    stopMusic();
    startMusic('run'); // every run starts the song from its intro
    lastMode.current = how;
    const p = profileRef.current;
    setResult(null);
    setSheet(null);
    setPreview(null);
    const options = {
      loadout: { upgrades: p.upgrades, boards: p.boards, shields: p.shields ?? 0, pet: p.selected.pet },
      allowRevive: true,
      mode: how.mode,
      chapter: how.chapter ?? null,
      ghost: how.ghost ?? null,
      seed: how.ghost ? how.ghost.seed : undefined, // a race runs on the ghost's own track
    };
    setRun((r) => ({ id: r.id + 1, start: true, options }));
    setScreen('playing');
  }, []);
  const playEndless = useCallback(() => play({ mode: 'endless' }), [play]);

  const home = () => {
    startMusic('menu');
    lastMode.current = { mode: 'endless' };
    setRun((r) => ({ id: r.id + 1, start: false, options: {} }));
    setScreen('menu');
  };

  const pause = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    stopMusic();
    setScreen('paused');
  }, []);

  const resume = useCallback(() => {
    initAudio();
    startMusic('run');
    setScreen('playing');
  }, []);

  const handleGameOver = useCallback((r) => {
    stopMusic();
    const before = { ...profileRef.current, boards: r.boardsLeft };
    let { profile: next, isRecord, earned } = finishRun(before, r);
    const extra = {};
    if (r.mode === 'story' && r.won) {
      const ch = finishChapter(next, r.chapter, r.stars);
      next = ch.profile;
      extra.chapterCoins = ch.coins;
      extra.firstClear = ch.firstClear;
    }
    if (r.mode === 'race') {
      extra.ghostScore = r.ghost.score;
      extra.ghostFriend = !!r.ghost.friend;
      extra.beatGhost = r.score > r.ghost.score;
    }
    // A new best in a normal run saves your ghost for Ghost Race
    if (r.mode === 'endless' && r.score > (next.ghost?.score ?? 0) && r.rec.length > 4) {
      next = { ...next, ghost: { seed: r.seed, score: r.score, distance: r.distance, samples: r.rec, char: next.selected.char } };
    }
    setProfile(next);
    setResult({ ...r, isRecord: r.mode === 'endless' && isRecord, earned, ...extra });
    overAt.current = performance.now();
    setScreen('over');
  }, [setProfile]);

  // Android Back button: close a panel, pause the run, resume, or leave the game from the menu
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = NativeApp.addListener('backButton', () => {
      const s = screenRef.current;
      if (s === 'playing') pause();
      else if (s === 'paused') resume();
      else if (s === 'over') home();
      else if (sheetRef.current) { setSheet(null); setPreview(null); }
      else NativeApp.minimizeApp();
    });
    return () => { sub.then((h) => h.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pause, resume]);

  // The menu theme starts with the first tap (phones only allow sound after a tap)
  useEffect(() => {
    const first = () => {
      initAudio();
      if (screenRef.current === 'menu') startMusic('menu');
    };
    window.addEventListener('pointerdown', first, { once: true });
    window.addEventListener('keydown', first, { once: true });
    return () => { window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
  }, []);

  // Pause when the player leaves the app or tab
  useEffect(() => {
    const onHide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pause]);

  // Enter or Space from the menu, pause and results screens
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      const s = screenRef.current;
      if (s === 'menu' && !sheet) { e.preventDefault(); playEndless(); }
      if (s === 'over' && performance.now() - overAt.current > 700) { e.preventDefault(); play(); }
      if (s === 'paused') { e.preventDefault(); resume(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, playEndless, resume, sheet]);

  // ---------- shop actions ----------
  const buy = (listKey, selectKey, item) => {
    const p = profileRef.current;
    if (p.coins < item.price) return;
    initAudio();
    sfx('power');
    setProfile({
      ...p,
      coins: p.coins - item.price,
      owned: { ...p.owned, [listKey]: [...(p.owned[listKey] ?? []), item.id] },
      looks: clearClothes(p, selectKey === 'outfit'),
      selected: { ...p.selected, [selectKey]: item.id },
    });
    setPreview(null);
  };
  // A new outfit replaces the clothes you picked in the creator (your face and hair stay)
  const clearClothes = (p, outfitChanged) => {
    if (!outfitChanged) return p.looks ?? {};
    const mine = { ...(p.looks?.[p.selected.char] ?? {}) };
    CLOTHING_KEYS.forEach((k) => delete mine[k]);
    return { ...(p.looks ?? {}), [p.selected.char]: mine };
  };
  const equip = (selectKey, id) => {
    const p = profileRef.current;
    setProfile({ ...p, looks: clearClothes(p, selectKey === 'outfit'), selected: { ...p.selected, [selectKey]: id } });
    setPreview(null);
  };
  const saveLook = (custom) => {
    const p = profileRef.current;
    initAudio();
    sfx('collect');
    setProfile({ ...p, looks: { ...(p.looks ?? {}), [p.selected.char]: custom } });
    setPreview(null);
    setSheet(null);
  };
  const [zoom, setZoom] = useState('sheet');
  const [shopTab, setShopTab] = useState('chars');
  const upgrade = (id, cost) => {
    const p = profileRef.current;
    if (p.coins < cost) return;
    initAudio();
    sfx('level');
    setProfile({ ...p, coins: p.coins - cost, upgrades: { ...p.upgrades, [id]: (p.upgrades[id] ?? 0) + 1 } });
  };
  const buyItem = (kind, count, price) => {
    const p = profileRef.current;
    if (p.coins < price) return;
    initAudio();
    sfx('collect');
    setProfile({ ...p, coins: p.coins - price, [kind]: (p[kind] ?? 0) + count });
  };
  // Spending keys on the Save me! screen (saved straight away)
  const useKeys = useCallback((n) => {
    const p = profileRef.current;
    if ((p.keys ?? 0) < n) return false;
    setProfile({ ...p, keys: p.keys - n });
    return true;
  }, [setProfile]);
  const buyBoards = (count, price) => {
    const p = profileRef.current;
    if (p.coins < price) return;
    initAudio();
    sfx('collect');
    setProfile({ ...p, coins: p.coins - price, boards: p.boards + count });
  };
  // Daily: streak, wheel and challenges
  const doClaimStreak = () => {
    const { profile: next, reward } = claimStreak(profileRef.current);
    if (!reward) return;
    initAudio();
    sfx('howzat');
    setProfile(next);
  };
  const doSpin = () => {
    const { profile: next, index } = spinWheel(profileRef.current);
    if (index < 0) return -1;
    initAudio();
    sfx('swoosh');
    setTimeout(() => sfx('howzat'), 3700);
    setProfile(next); // the prize is saved straight away, the wheel only shows it
    return index;
  };
  const doClaimChallenge = (i) => {
    initAudio();
    sfx('level');
    setProfile(claimChallenge(profileRef.current, i));
  };
  // A new day may start while the app is open
  useEffect(() => {
    const onFocus = () => setProfile(refreshDaily(profileRef.current));
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [setProfile]);

  const openGift = () => {
    const { coins, board, profile: next } = claimGift(profileRef.current);
    initAudio();
    sfx('howzat');
    setProfile(next);
    setGift({ coins, board });
  };

  // What the 3D runner shows: your saved style, or the one you are previewing
  const shown = preview ?? profile.selected;
  const loadout = {
    ...shown,
    look: resolveLook(findById(CHARACTERS, shown.char), findById(OUTFITS, shown.outfit), shown.custom ?? profile.looks?.[shown.char]),
  };
  const runner = findById(CHARACTERS, profile.selected.char);
  const focus = screen === 'menu' && sheet ? (sheet === 'creator' ? zoom : 'sheet') : null;

  return (
    <main className={`app ${sheet ? 'has-sheet' : ''}`}>
      {/* Splash while the 3D world loads; it fades away by itself */}
      <div className="splash" aria-hidden="true">
        <div className="splash-rays" />
        <div className="splash-logo"><span className="logo-1">Slipper</span><span className="logo-2">Rush</span></div>
        <div className="splash-bar"><span /></div>
      </div>
      <Game
        screen={screen}
        run={run}
        quality={quality}
        loadout={loadout}
        focus={focus}
        best={profile.best}
        keys={profile.keys ?? 0}
        onUseKeys={useKeys}
        missions={{ done: profile.missions.length, total: MISSIONS.length }}
        settings={{ vibration }}
        tutorial={!tutorialDone}
        onTutorialDone={finishTutorial}
        onGameOver={handleGameOver}
        onPause={pause}
        onAutoLow={autoLow}
      />

      {screen === 'menu' && (
        <div className="menu">
          <div className="menu-top">
            {/* Player badge: your runner and your best score */}
            <div className="player-badge">
              <span className="player-face"><Avatar char={runner} size={40} /></span>
              <span className="player-info">
                <span className="player-name">{runner.name}</span>
                <span className="player-best"><TrophyIcon color="#ffc94a" size={14} /> {fmt(profile.best)}</span>
              </span>
            </div>
            <span className="spacer" />
            <button className="stat-pill coins coin-btn" onClick={() => { setShopTab('chars'); setSheet('shop'); }} aria-label={`${fmt(profile.coins)} coins. Open the shop`}>
              <SamosaIcon size={24} />{fmt(profile.coins)}<span className="plus" aria-hidden="true">+</span>
            </button>
            <button id="btn-settings" className="round-btn" onClick={() => setSheet('settings')} aria-label="Settings">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" />
              </svg>
            </button>
          </div>

          {!sheet && (
            <>
              {/* Coins floating in the air */}
              <div className="float-coins" aria-hidden="true">
                {[[8, 30], [80, 26], [22, 52], [70, 50], [12, 66], [86, 64]].map(([x, y], i) => (
                  <span key={i} style={{ '--i': i, left: `${x}%`, top: `${y}%` }}><SamosaIcon size={22 + (i % 3) * 6} /></span>
                ))}
              </div>
              <h1 className="logo">
                <span className="logo-1">Slipper</span>
                <span className="logo-2">Rush</span>
                <span className="ribbon">Run from Mom!</span>
              </h1>
              <div className="spotlight" aria-hidden="true" />

              {/* Side rails of big game buttons */}
              <nav className="rail rail-left" aria-label="Customize">
                <button id="btn-shop" className="tile tile-pink" onClick={() => { setShopTab('chars'); setSheet('shop'); }}>
                  <span className="tile-icon" aria-hidden="true"><ShopIcon /></span><span className="tile-label">Shop</span>
                </button>
                <button id="btn-style" className="tile tile-blue" onClick={() => { setZoom('sheet'); setSheet('creator'); }}>
                  <span className="tile-icon" aria-hidden="true">
                    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4" fill="#ffd6b8" /><path d="M4 21c0-5 3.6-8 8-8s8 3 8 8z" fill="#fff" /><path d="M8 6.5C8 3 16 3 16 6.5 14 5 10 5 8 6.5z" fill="#14110f" /></svg>
                  </span><span className="tile-label">Style</span>
                </button>
                <button id="btn-pets" className="tile tile-green" onClick={() => { setShopTab('pets'); setSheet('shop'); }}>
                  <span className="tile-icon" aria-hidden="true"><PetIcon pet={{ id: 'puppy' }} size={34} /></span><span className="tile-label">Pets</span>
                </button>
              </nav>
              <nav className="rail rail-right" aria-label="Rewards">
                <button id="btn-daily" className={`tile tile-gold ${dailyBadge(profile) ? 'wiggle' : ''}`} onClick={() => setSheet('daily')}>
                  <span className="tile-icon" aria-hidden="true"><GiftIcon /></span><span className="tile-label">Daily</span>
                  {dailyBadge(profile) > 0 && <span className="badge">{dailyBadge(profile)}</span>}
                </button>
                <button id="btn-missions" className="tile tile-purple" onClick={() => setSheet('missions')}>
                  <span className="tile-icon" aria-hidden="true"><TargetIcon /></span><span className="tile-label">Missions</span>
                  <span className="tile-count">{profile.missions.length}/{MISSIONS.length}</span>
                </button>
                <button id="btn-trophies" className="tile tile-orange" onClick={() => setSheet('trophies')}>
                  <span className="tile-icon" aria-hidden="true"><TrophyIcon color="#fff3b0" size={30} /></span><span className="tile-label">Trophies</span>
                </button>
              </nav>

              <div className="menu-bottom">
                <div className="mode-row" role="group" aria-label="Game modes">
                  <button id="btn-story" className="mode-chip chip-orange" onClick={() => setSheet('story')}>
                    <span className="mode-title">Story</span>
                    <span className="mode-sub">{Object.keys(profile.story ?? {}).length}/5 chapters</span>
                  </button>
                  <button id="btn-race" className="mode-chip chip-purple" onClick={() => setSheet('race')}>
                    <span className="mode-title">Ghost Race</span>
                    <span className="mode-sub">{profile.ghost ? `beat ${fmt(profile.ghost.score)}` : 'beat a replay'}</span>
                  </button>
                </div>
                <button id="btn-play" className="btn btn-green btn-big play-btn" onClick={playEndless}>
                  <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg>
                  PLAY
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {screen === 'menu' && sheet === 'shop' && (
        <Shop
          initialTab={shopTab}
          profile={profile}
          onClose={() => { setSheet(null); setPreview(null); }}
          onPreview={setPreview}
          onBuy={buy}
          onEquip={equip}
          onUpgrade={upgrade}
          onBuyBoards={buyBoards}
          onBuyItem={buyItem}
        />
      )}
      {screen === 'menu' && sheet === 'creator' && (
        <Creator
          profile={profile}
          look={resolveLook(findById(CHARACTERS, profile.selected.char), findById(OUTFITS, profile.selected.outfit))}
          onPreview={setPreview}
          onSave={saveLook}
          onZoom={setZoom}
          onClose={() => { setSheet(null); setPreview(null); }}
        />
      )}
      {screen === 'menu' && sheet === 'daily' && profile.daily && (
        <Daily profile={profile} onClaimStreak={doClaimStreak} onSpin={doSpin} onClaimChallenge={doClaimChallenge} onClose={() => setSheet(null)} />
      )}
      {screen === 'menu' && sheet === 'trophies' && <Trophies profile={profile} onClose={() => setSheet(null)} />}
      {screen === 'menu' && sheet === 'missions' && <Missions profile={profile} onClose={() => setSheet(null)} />}
      {screen === 'menu' && sheet === 'story' && <StoryMap profile={profile} onClose={() => setSheet(null)} onPlay={(chapter) => play({ mode: 'story', chapter })} />}
      {screen === 'menu' && sheet === 'settings' && (
        <Settings
          quality={quality} onQuality={setQuality}
          sound={!muted} onSound={(on) => setMutedState(!on)}
          music={musicOn} onMusic={setMusicOn}
          vibration={vibration} onVibration={setVibration}
          onTutorial={() => { setTutorialDone(false); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
      {screen === 'menu' && sheet === 'race' && <RacePanel profile={profile} initialCode={linkCode} onClose={() => setSheet(null)} onRace={(ghost) => play({ mode: 'race', ghost })} />}
      {gift && <GiftModal gift={gift} onClose={() => setGift(null)} />}

      {screen === 'paused' && (
        <div className="overlay">
          <div className="card pause-card">
            <div className="card-ribbon ribbon-blue">Paused</div>
            <p className="card-text">Everyone is catching their breath.</p>
            <div className="pause-toggles">
              <button id="btn-pause-sound" className={`toggle-tile ${muted ? '' : 'on'}`} onClick={() => setMutedState((m) => !m)} aria-pressed={!muted}>
                <SoundIcon muted={muted} /><span>Sound</span>
              </button>
              <button id="btn-pause-music" className={`toggle-tile ${musicOn ? 'on' : ''}`} onClick={() => setMusicOn((m) => !m)} aria-pressed={musicOn}>
                <span className="note" aria-hidden="true">♫</span><span>Music</span>
              </button>
            </div>
            <div className="card-actions">
              <button id="btn-resume" className="btn btn-green" onClick={resume}>Resume</button>
              <div className="card-actions-row">
                <button id="btn-restart" className="btn btn-orange btn-small" onClick={() => play()}>Restart</button>
                <button id="btn-home-pause" className="btn btn-blue btn-small" onClick={home}>Home</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === 'over' && result && (
        <Results
          result={result}
          profile={profile}
          onAgain={() => play()}
          onHome={home}
          onNext={result.mode === 'story' && CHAPTERS[result.chapter.id] ? () => play({ mode: 'story', chapter: CHAPTERS[result.chapter.id] }) : null}
        />
      )}
    </main>
  );
}
