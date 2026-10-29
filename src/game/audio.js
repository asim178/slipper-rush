// ============================================================
// audio.js: every sound is synthesized with the Web Audio API.
// No sound files needed. An oscillator makes a tone, a gain
// node shapes its volume (the "envelope"), and noise makes
// whooshes, hits and hi-hats.
//
// Browsers only allow sound after the player taps something,
// so initAudio() is called from the Start button.
// ============================================================

let ac = null;
let master, sfxBus, musicBus, bassFilter, noiseBuf;
let muted = false;

export function initAudio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ac.destination);

    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);

    musicBus = ac.createGain();
    musicBus.gain.value = musicOff ? 0 : 0.42;
    musicBus.connect(master);

    bassFilter = ac.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 700;
    bassFilter.connect(musicBus);

    // One second of white noise, reused for every noisy sound
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    startRainLoop();
  }
  if (ac.state === 'suspended') ac.resume();
}

// Rain is a looping filtered noise whose volume follows the weather
let rainGain = null;
function startRainLoop() {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2200;
  f.Q.value = 0.4;
  rainGain = ac.createGain();
  rainGain.gain.value = 0;
  src.connect(f);
  f.connect(rainGain);
  rainGain.connect(sfxBus);
  src.start();
}
export function setRain(level) {
  if (rainGain) rainGain.gain.setTargetAtTime(muted ? 0 : level * 0.35, ac.currentTime, 0.3);
}

let musicOff = false;
export function setMusicMuted(value) {
  musicOff = value;
  if (musicBus) musicBus.gain.value = value ? 0 : 0.42;
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.8;
}

// A single note. `when` is an absolute time on the audio clock.
function tone(when, freq, { type = 'square', dur = 0.12, vol = 0.3, to = null, bus = sfxBus } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  if (to) o.frequency.exponentialRampToValueAtTime(to, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g);
  g.connect(bus);
  o.start(when);
  o.stop(when + dur + 0.02);
}

function noise(when, { dur = 0.1, vol = 0.3, filter = 'highpass', freq = 4000, bus = sfxBus } = {}) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  src.start(when, Math.random() * 0.5);
  src.stop(when + dur + 0.02);
}

// ---------- Sound effects (names match the engine's events) ----------
export function sfx(name) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  switch (name) {
    case 'jump':
      tone(t, 380, { to: 760, dur: 0.14, vol: 0.16 });
      break;
    case 'doublejump':
      tone(t, 520, { to: 1250, dur: 0.16, vol: 0.15 });
      tone(t + 0.04, 780, { to: 1560, dur: 0.14, vol: 0.1 });
      break;
    case 'slide':
      noise(t, { dur: 0.25, vol: 0.22, filter: 'bandpass', freq: 1200 });
      break;
    case 'land':
      tone(t, 130, { to: 60, dur: 0.08, type: 'sine', vol: 0.25 });
      break;
    case 'collect':
      tone(t, 988, { dur: 0.07, vol: 0.12 });
      tone(t + 0.05, 1319, { dur: 0.1, vol: 0.12 });
      break;
    case 'power':
    case 'survived':
      [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, f, { dur: 0.12, vol: 0.13 }));
      break;
    case 'windup':
      tone(t, 660, { dur: 0.08, type: 'triangle', vol: 0.12 });
      break;
    case 'throw':
      noise(t, { dur: 0.18, vol: 0.14, filter: 'bandpass', freq: 2500 });
      tone(t, 300, { to: 180, dur: 0.12, type: 'triangle', vol: 0.1 });
      break;
    case 'rollingPin':
      tone(t, 90, { to: 50, dur: 0.3, type: 'sawtooth', vol: 0.18 });
      break;
    case 'smack':
      noise(t, { dur: 0.08, vol: 0.45, freq: 3000 });
      tone(t, 1400, { to: 700, dur: 0.08, vol: 0.14 });
      break;
    case 'bonk':
      tone(t, 220, { to: 110, dur: 0.25, type: 'sine', vol: 0.35 });
      tone(t, 880, { dur: 0.05, vol: 0.1 });
      break;
    case 'smash':
      noise(t, { dur: 0.2, vol: 0.4, filter: 'lowpass', freq: 800 });
      tone(t, 160, { to: 60, dur: 0.2, vol: 0.2 });
      break;
    case 'near':
      tone(t, 1200, { to: 1800, dur: 0.1, type: 'sine', vol: 0.1 });
      break;
    case 'combo':
      [523, 659, 784].forEach((f) => tone(t, f, { dur: 0.25, vol: 0.08 }));
      break;
    case 'shield':
      tone(t, 600, { to: 200, dur: 0.3, type: 'triangle', vol: 0.2 });
      noise(t, { dur: 0.2, vol: 0.2, freq: 2000 });
      break;
    case 'rage':
      tone(t, 400, { to: 900, dur: 0.35, type: 'sawtooth', vol: 0.12 });
      tone(t + 0.35, 900, { to: 400, dur: 0.35, type: 'sawtooth', vol: 0.12 });
      break;
    case 'hit':
      noise(t, { dur: 0.5, vol: 0.55, filter: 'lowpass', freq: 1500 });
      tone(t, 300, { to: 40, dur: 0.5, type: 'sawtooth', vol: 0.25 });
      break;
    case 'over':
      [392, 370, 349, 330].forEach((f, i) => tone(t + i * 0.25, f, { dur: i === 3 ? 0.6 : 0.22, type: 'triangle', vol: 0.18 }));
      break;
    case 'swoosh':
      noise(t, { dur: 0.12, vol: 0.16, filter: 'bandpass', freq: 1800 });
      break;
    case 'bump':
      tone(t, 140, { to: 90, dur: 0.1, type: 'square', vol: 0.12 });
      break;
    case 'roll':
    case 'dive':
      noise(t, { dur: 0.22, vol: 0.2, filter: 'bandpass', freq: 900 });
      tone(t, 420, { to: 180, dur: 0.18, type: 'triangle', vol: 0.1 });
      break;
    case 'stumble':
      tone(t, 200, { to: 90, dur: 0.22, type: 'square', vol: 0.18 });
      noise(t, { dur: 0.15, vol: 0.25, filter: 'lowpass', freq: 900 });
      break;
    case 'thwack':
      noise(t, { dur: 0.1, vol: 0.5, freq: 2500 });
      break;
    case 'warn':
      tone(t, 880, { dur: 0.09, type: 'square', vol: 0.1 });
      tone(t + 0.12, 880, { dur: 0.09, type: 'square', vol: 0.1 });
      break;
    case 'dodge':
      tone(t, 700, { to: 1400, dur: 0.12, type: 'sine', vol: 0.12 });
      break;
    case 'level':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.07, f, { dur: 0.14, vol: 0.12 }));
      break;
    case 'trick':
      noise(t, { dur: 0.25, vol: 0.18, filter: 'bandpass', freq: 2600 });
      tone(t, 500, { to: 1100, dur: 0.22, type: 'triangle', vol: 0.1 });
      break;
    case 'trickland':
      [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.05, f, { dur: 0.12, vol: 0.12 }));
      break;
    case 'sloppy':
      tone(t, 300, { to: 150, dur: 0.25, type: 'triangle', vol: 0.14 });
      break;
    case 'splash':
      noise(t, { dur: 0.3, vol: 0.3, filter: 'bandpass', freq: 1400 });
      break;
    case 'howzat':
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(t + i * 0.06, f, { dur: 0.16, vol: 0.12 }));
      noise(t + 0.1, { dur: 0.9, vol: 0.12, filter: 'bandpass', freq: 900 }); // crowd cheer
      break;
    case 'chai':
      [392, 523, 659].forEach((f, i) => tone(t + i * 0.12, f, { dur: 0.6, type: 'sine', vol: 0.14 }));
      break;
    case 'thunder':
      noise(t, { dur: 1.6, vol: 0.55, filter: 'lowpass', freq: 220 });
      noise(t + 0.05, { dur: 0.3, vol: 0.3, filter: 'lowpass', freq: 900 });
      break;
    case 'rainstart':
      tone(t, 200, { to: 120, dur: 0.6, type: 'sine', vol: 0.15 });
      break;
    case 'horn':
      tone(t, 440, { dur: 0.14, type: 'square', vol: 0.1 });
      tone(t + 0.18, 440, { dur: 0.2, type: 'square', vol: 0.1 });
      tone(t, 554, { dur: 0.14, type: 'square', vol: 0.06 });
      tone(t + 0.18, 554, { dur: 0.2, type: 'square', vol: 0.06 });
      break;
    case 'start':
      tone(t, 300, { to: 900, dur: 0.3, type: 'sawtooth', vol: 0.1 });
      break;
    case 'bounce': // boing!
      tone(t, 180, { to: 720, dur: 0.28, type: 'sine', vol: 0.22 });
      tone(t + 0.05, 360, { to: 1100, dur: 0.22, type: 'triangle', vol: 0.1 });
      break;
    case 'frenzy':
      [659, 784, 988, 1175, 1319, 1568, 1760].forEach((f, i) => tone(t + i * 0.05, f, { dur: 0.1, vol: 0.12 }));
      break;
    case 'saveme':
      [784, 659, 523].forEach((f, i) => tone(t + i * 0.12, f, { dur: 0.16, type: 'triangle', vol: 0.14 }));
      break;
    case 'revive':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.05, f, { dur: 0.14, type: 'triangle', vol: 0.13 }));
      noise(t, { dur: 0.5, vol: 0.1, filter: 'highpass', freq: 3000 });
      break;
    case 'zone': // a little fanfare when you enter a new place
      [587, 740, 880, 1175].forEach((f, i) => tone(t + i * 0.09, f, { dur: 0.2, type: 'triangle', vol: 0.13 }));
      break;
    case 'win':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.1, f, { dur: 0.22, vol: 0.13 }));
      noise(t + 0.2, { dur: 1.2, vol: 0.12, filter: 'bandpass', freq: 900 });
      break;
    case 'squawk': // the parrot warns you
      tone(t, 1800, { to: 1100, dur: 0.08, type: 'sawtooth', vol: 0.08 });
      tone(t + 0.1, 1900, { to: 1200, dur: 0.08, type: 'sawtooth', vol: 0.08 });
      break;
    case 'woof':
      tone(t, 260, { to: 160, dur: 0.12, type: 'sawtooth', vol: 0.14 });
      tone(t + 0.16, 280, { to: 170, dur: 0.12, type: 'sawtooth', vol: 0.12 });
      break;
    case 'goat':
      noise(t, { dur: 0.12, vol: 0.35, filter: 'lowpass', freq: 600 }); // the headbutt
      tone(t + 0.1, 520, { to: 480, dur: 0.5, type: 'sawtooth', vol: 0.08 }); // "meh-eh-eh"
      break;
    default:
      break;
  }
}

// ============================================================
// MUSIC: a little synthesized band, playing a song written as data.
//
// Instruments (all made from oscillators and noise, no files):
//   kick, clap, hi-hats, dhol (low "dhum" and high "ta"), deep bass,
//   warm chord pads, a pluck arpeggio and the lead hook with echo.
// Scale: D Phrygian dominant (D Eb F# G A Bb C), which gives the
// South Asian flavour. Chords: D, Eb and C.
//
// Two songs: a chill menu theme and the running theme. The running
// theme has 3 intensity levels (calm, full, boss) that add and
// remove instruments live, without restarting the song.
// ============================================================
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// The hook: [step, midi note, length in 16th steps]. 8 bars = 128 steps.
const HOOK = [
  [0, 74, 2], [2, 78, 2], [4, 79, 2], [6, 81, 4], [10, 79, 2], [12, 78, 2], [14, 75, 2],
  [16, 74, 3], [19, 78, 1], [20, 81, 2], [22, 82, 2], [24, 81, 2], [26, 79, 2], [28, 81, 4],
  [32, 82, 2], [34, 81, 2], [36, 79, 2], [38, 78, 2], [40, 79, 4], [44, 75, 2], [46, 78, 2],
  [48, 74, 6], [54, 72, 2], [56, 74, 4], [60, 78, 2], [62, 79, 2],
  [64, 86, 2], [66, 84, 2], [68, 82, 2], [70, 81, 2], [72, 82, 3], [75, 81, 1], [76, 79, 4],
  [80, 81, 2], [82, 79, 2], [84, 78, 2], [86, 79, 2], [88, 75, 4], [92, 78, 4],
  [96, 79, 2], [98, 81, 2], [100, 82, 2], [102, 84, 2], [104, 86, 6], [110, 84, 2],
  [112, 82, 2], [114, 81, 2], [116, 79, 2], [118, 78, 2], [120, 74, 8],
];
// One chord per bar, as midi notes
const CHORDS = {
  D: [62, 66, 69], Eb: [63, 67, 70], C: [60, 64, 67], Gm: [62, 67, 70],
};
const RUN_BARS = ['D', 'D', 'Eb', 'D', 'C', 'D', 'Eb', 'D'];
const MENU_BARS = ['D', 'Gm', 'Eb', 'D'];
const ROOT = { D: 38, Eb: 39, C: 36, Gm: 43 };
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0]; // syncopated
const BASS_OCT = [0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 7, 12, 0];
const DHUM = [0, 6, 8, 14];          // the dhol's low beat (bhangra rhythm)
const TA = [3, 4, 11, 12, 15];       // the dhol's high slaps

const seq = { timer: null, step: 0, next: 0, bpm: 128, intensity: 0, song: 'run', fx: null };

// Echo and reverb, built once
function musicFx() {
  if (seq.fx) return seq.fx;
  const echo = ac.createDelay(1);
  const feedback = ac.createGain();
  const echoOut = ac.createGain();
  feedback.gain.value = 0.32;
  echoOut.gain.value = 0.35;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(echoOut);
  echoOut.connect(musicBus);
  // Reverb: a short burst of fading noise as the "room"
  const len = Math.floor(ac.sampleRate * 1.8);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const verb = ac.createConvolver();
  verb.buffer = ir;
  const verbOut = ac.createGain();
  verbOut.gain.value = 0.5;
  verb.connect(verbOut);
  verbOut.connect(musicBus);
  seq.fx = { echo, verb };
  return seq.fx;
}

// One synth note: oscillators -> optional filter -> volume envelope -> outputs
function voice(t, freq, o) {
  const { types = ['sawtooth'], detune = 0, dur = 0.2, vol = 0.1, attack = 0.005, release = 0.1, cutoff = 0, cutoffEnd = 0, q = 1, vibrato = 0, echo = 0, verb = 0 } = o;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  let head = g;
  if (cutoff) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(cutoff, t);
    if (cutoffEnd) f.frequency.exponentialRampToValueAtTime(cutoffEnd, t + dur);
    f.connect(g);
    head = f;
  }
  let depth = null;
  if (vibrato) {
    const lfo = ac.createOscillator();
    depth = ac.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * vibrato, t + dur * 0.6); // vibrato grows on long notes
    lfo.connect(depth);
    lfo.start(t);
    lfo.stop(t + dur + release + 0.05);
  }
  types.forEach((type, i) => {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (i - (types.length - 1) / 2) * detune;
    if (depth) depth.connect(osc.frequency);
    osc.connect(head);
    osc.start(t);
    osc.stop(t + dur + release + 0.05);
  });
  g.connect(musicBus);
  const fx = musicFx();
  if (echo) {
    const s = ac.createGain();
    s.gain.value = echo;
    g.connect(s);
    s.connect(fx.echo);
  }
  if (verb) {
    const s = ac.createGain();
    s.gain.value = verb;
    g.connect(s);
    s.connect(fx.verb);
  }
}

// Drums
function kick(t, vol = 0.55) {
  tone(t, 160, { to: 42, dur: 0.16, type: 'sine', vol, bus: musicBus });
  noise(t, { dur: 0.015, vol: vol * 0.25, filter: 'highpass', freq: 3000, bus: musicBus }); // click
}
function clap(t, vol = 0.22) {
  for (let i = 0; i < 3; i++) noise(t + i * 0.011, { dur: 0.05, vol: vol * 0.6, filter: 'bandpass', freq: 1500, bus: musicBus });
  noise(t + 0.03, { dur: 0.16, vol, filter: 'bandpass', freq: 1200, bus: musicBus });
}
function hat(t, open = false, vol = 0.06) {
  noise(t, { dur: open ? 0.18 : 0.035, vol, filter: 'highpass', freq: 8000, bus: musicBus });
}
function dhum(t, vol = 0.35) {
  tone(t, 118, { to: 70, dur: 0.22, type: 'sine', vol, bus: musicBus });
  tone(t, 240, { to: 140, dur: 0.06, type: 'triangle', vol: vol * 0.3, bus: musicBus });
}
function ta(t, vol = 0.16) {
  tone(t, 520, { to: 380, dur: 0.06, type: 'triangle', vol, bus: musicBus });
  noise(t, { dur: 0.04, vol: vol * 0.7, filter: 'bandpass', freq: 3200, bus: musicBus });
}

export function startMusic(song = 'run') {
  if (!ac) return;
  if (seq.timer && seq.song === song) return;
  stopMusic();
  seq.song = song;
  seq.step = 0;
  seq.bpm = song === 'menu' ? 98 : 128;
  seq.next = ac.currentTime + 0.06;
  // Schedule a little ahead of time so the beat never stutters
  seq.timer = setInterval(() => {
    while (seq.next < ac.currentTime + 0.15) {
      if (!muted && !musicOff) (seq.song === 'menu' ? menuStep : runStep)(seq.step, seq.next);
      seq.next += 60 / seq.bpm / 4;
      seq.step += 1;
    }
  }, 25);
}

export function stopMusic() {
  clearInterval(seq.timer);
  seq.timer = null;
}

// 0 = calm start, 1 = full band, 2 = boss / turbo (faster, busier). slow = Chai Time.
export function setIntensity(level, slow = false) {
  seq.intensity = level;
  if (seq.song === 'run') seq.bpm = (level >= 2 ? 146 : 128) * (slow ? 0.62 : 1);
}

function runStep(step, t) {
  const s = step % 16;
  const bar = Math.floor(step / 16) % 8;
  const loop = Math.floor(step / 128); // how many times the 8 bars have played
  const chord = RUN_BARS[bar];
  const beat = 60 / seq.bpm / 4;
  const lvl = seq.intensity;
  const intro = step < 64 && lvl < 2; // the first 4 bars build up
  const fill = bar === 7 && s >= 12; // drum fill into the next round

  // Drums: four on the floor, claps on 2 and 4, hats on the off-beats
  if (s % 4 === 0 && !(intro && step < 16)) kick(t);
  if ((s === 4 || s === 12) && !intro) clap(t);
  if (s % 2 === 1) hat(t, s === 14, s % 4 === 3 ? 0.07 : 0.045);
  if (lvl >= 2 && s % 2 === 0) hat(t, false, 0.03);
  // Dhol
  if (!intro || step >= 32) {
    if (DHUM.includes(s)) dhum(t, lvl >= 2 ? 0.42 : 0.32);
    if (TA.includes(s)) ta(t, lvl >= 1 ? 0.16 : 0.1);
  }
  if (fill) ta(t + beat / 2, 0.14);

  // Bass: two detuned saws through a filter that opens up when the music gets intense
  if (BASS[s]) {
    voice(t, mtof(ROOT[chord] + BASS_OCT[s]), {
      types: ['sawtooth', 'square'], detune: 8, dur: beat * 1.6, vol: 0.2, release: 0.06,
      cutoff: lvl >= 2 ? 1400 : 900, cutoffEnd: 220, q: 6,
    });
  }

  // Chord pad, one per bar, soft and wide
  if (s === 0) {
    for (const n of CHORDS[chord]) {
      voice(t, mtof(n), { types: ['sawtooth', 'sawtooth'], detune: 14, dur: beat * 15, vol: 0.022, attack: 0.25, release: 0.4, cutoff: 1800, verb: 0.6 });
    }
  }

  // Pluck arpeggio (full band and boss)
  if (lvl >= 1 && (lvl >= 2 || s % 2 === 0)) {
    const notes = CHORDS[chord];
    const n = notes[(s >> (lvl >= 2 ? 0 : 1)) % 3] + 12 + (s >= 8 ? 12 : 0);
    voice(t, mtof(n), { types: ['triangle', 'square'], detune: 5, dur: beat * 0.9, vol: 0.028, release: 0.05, cutoff: 3200, cutoffEnd: 600, echo: 0.25 });
  }

  // The lead hook (from the full band on; on the second round it goes up an octave in boss mode)
  if (lvl >= 1 && !intro) {
    const local = step % 128;
    for (const [at, note, len] of HOOK) {
      if (at !== local) continue;
      const up = lvl >= 2 && loop % 2 === 1 ? 12 : 0;
      voice(t, mtof(note + up), {
        types: ['square', 'sawtooth'], detune: 9, dur: beat * len, vol: lvl >= 2 ? 0.075 : 0.06, attack: 0.008, release: 0.12,
        cutoff: 4200, vibrato: len >= 4 ? 0.012 : 0, echo: 0.35, verb: 0.35,
      });
    }
  }

  // Riser sweep at the end of each round
  if (bar === 7 && s === 8 && lvl >= 1) noise(t, { dur: beat * 8, vol: 0.05, filter: 'bandpass', freq: 3000, bus: musicBus });
}

// The menu theme: slower and relaxed, with the hook played as soft plucks
function menuStep(step, t) {
  const s = step % 16;
  const bar = Math.floor(step / 16) % 4;
  const chord = MENU_BARS[bar];
  const beat = 60 / seq.bpm / 4;
  if (s === 0 || s === 10) kick(t, 0.38);
  if (s === 8) clap(t, 0.14);
  if (s % 2 === 1) hat(t, false, 0.03);
  if (s === 0) {
    for (const n of CHORDS[chord]) voice(t, mtof(n), { types: ['triangle', 'sawtooth'], detune: 10, dur: beat * 15, vol: 0.03, attack: 0.4, release: 0.6, cutoff: 1400, verb: 0.7 });
    voice(t, mtof(ROOT[chord]), { types: ['sine', 'triangle'], dur: beat * 6, vol: 0.18, release: 0.2 });
  }
  if (s === 8) voice(t, mtof(ROOT[chord] + 7), { types: ['sine'], dur: beat * 4, vol: 0.12 });
  // Soft plucked melody: the first half of the hook, an octave down
  const local = step % 64;
  for (const [at, note, len] of HOOK) {
    if (at !== local) continue;
    voice(t, mtof(note - 12), { types: ['triangle', 'sine'], dur: beat * Math.min(len, 3), vol: 0.07, release: 0.25, cutoff: 2600, cutoffEnd: 800, echo: 0.4, verb: 0.5 });
  }
}

// For making a preview recording: schedule a whole stretch of a song at once
// (used with an OfflineAudioContext; the game itself uses startMusic).
export function scheduleFor(song, seconds, levels = [0]) {
  stopMusic();
  seq.song = song;
  seq.bpm = song === 'menu' ? 98 : 128;
  let t = 0.05;
  let step = 0;
  while (t < seconds) {
    const lvl = levels[Math.min(levels.length - 1, Math.floor((t / seconds) * levels.length))];
    if (song === 'run') setIntensity(lvl);
    (song === 'menu' ? menuStep : runStep)(step, t);
    t += 60 / seq.bpm / 4;
    step += 1;
  }
}
