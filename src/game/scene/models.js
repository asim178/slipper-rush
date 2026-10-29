// ============================================================
// models.js: every 3D model, built from simple shapes. No files.
//
// Materials are "physically based" (MeshStandardMaterial):
// roughness decides how shiny a surface is, metalness makes it
// reflect like metal. With an environment light in the scene this
// gives the soft, modern look of mobile games.
//
// Characters are nested Groups. A Group is a joint: rotating the
// hip group swings the whole leg, the knee group bends the shin.
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { T } from '../config.js';
import * as TX from './textures.js';
import { makeHuman } from './human.js';
import { resolveLook } from '../looks.js';

// ---------- materials and shared geometry ----------
const matCache = new Map();
export function paint(color, opts = {}) {
  // Materials with a texture are unique; plain colours are shared
  if (opts.map || opts.emissiveMap) return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts });
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts }));
  return matCache.get(key);
}
const gloss = (color) => paint(color, { roughness: 0.28, metalness: 0.05 }); // car paint
const chrome = () => paint('#e6e8f0', { roughness: 0.18, metalness: 1 });
const glass = () => paint('#1d3357', { roughness: 0.05, metalness: 0.6 });
// Colours brighter than 1.0 glow when bloom is on
export const glow = (color, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const rbox = (w, h, d, r = 0.06) => cached(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
const sphere = (r, w = 20, h = 14) => cached(`sp${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const capsule = (r, l) => cached(`ca${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 12));
const cyl = (rt, rb, h, s = 16, open = false) => cached(`cy${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
function at(m, x, y, z) {
  m.position.set(x, y, z);
  return m;
}

// A wheel inside an "axle" group, so spinning the group spins the wheel
function wheel(r, width, x, y, z, rim = '#d9d9e6') {
  const axle = new THREE.Group();
  axle.position.set(x, y, z);
  const tyre = mesh(cyl(r, r, width, 20), paint('#1e1c24', { roughness: 0.85 }));
  tyre.rotation.z = Math.PI / 2;
  const hub = mesh(cyl(r * 0.55, r * 0.55, width + 0.02, 12), paint(rim, { roughness: 0.25, metalness: 0.8 }), false);
  hub.rotation.z = Math.PI / 2;
  axle.add(tyre, hub);
  return axle;
}

// Torso shaped like a jelly bean (a "lathe" spins this outline around)
const torsoGeo = cached('torso', () => {
  const pts = [[0, 0], [0.24, 0.01], [0.3, 0.12], [0.3, 0.32], [0.27, 0.48], [0.17, 0.6], [0, 0.63]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 24);
});

// ============================================================
// The kid: built from a character + outfit + skateboard choice
// ============================================================
export function makeKid({ char, outfit, board, look }) {
  // The body, face, hair and clothes come from human.js (see looks.js for every option)
  const k = makeHuman(look ?? resolveLook(char, outfit));
  const { root, body, hips, head, eyes, brows, smile, mouthO, pack, flames, cape, hairParts, legs, arms } = k;

  // Skateboard
  const boardGroup = makeBoard(board);
  boardGroup.position.y = 0.06;
  root.add(boardGroup);

  // Helmet bubble
  const bubble = new THREE.Mesh(
    sphere(1.05, 36, 24),
    new THREE.MeshPhysicalMaterial({ color: '#9ffcea', emissive: '#0f6f62', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  );
  bubble.position.y = 0.95;
  root.add(bubble);

  // Kite for the kite power-up
  const kite = new THREE.Group();
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), paint('#ffffff', { map: TX.kiteTexture(), side: THREE.DoubleSide }));
  sail.rotation.z = Math.PI / 4;
  kite.add(sail);
  for (let i = 0; i < 4; i++) {
    kite.add(at(mesh(rbox(0.14, 0.08, 0.03, 0.01), paint(['#ff3b5c', '#ffd23f', '#2fa8ff', '#20c25a'][i]), false), 0, -0.95 - i * 0.28, 0));
  }
  const string = mesh(cyl(0.01, 0.01, 1.6, 4), paint('#ffffff'), false);
  string.position.set(0, -0.9, 0.3);
  string.rotation.x = 0.3;
  kite.add(string);
  kite.position.set(0, 3.2, -0.4);
  root.add(kite);

  // Soft round shadow so the kid always looks grounded (even in Fast mode)
  const blob = new THREE.Mesh(
    cached('blob', () => new THREE.CircleGeometry(0.55, 24)),
    new THREE.MeshBasicMaterial({ map: TX.glowTexture(), color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;

  return { root, body, hips, head, eyes, brows, smile, mouthO, pack, flames, cape, hairParts, legs, arms, board: boardGroup, bubble, kite, blob };
}

function buildHair(head, char, hair, accent, dark) {
  const parts = {};
  const dome = (thetaLen = Math.PI * 0.55, z = 0.02) => {
    const m = mesh(new THREE.SphereGeometry(0.295, 26, 14, 0, Math.PI * 2, 0, thetaLen), hair);
    m.position.set(0, 0.02, z);
    head.add(m);
    return m;
  };
  switch (char.hair) {
    case 'cap': {
      const back = mesh(sphere(0.27, 18, 14), hair);
      back.scale.set(1, 0.8, 0.9);
      back.position.set(0, -0.03, 0.06);
      head.add(back);
      const top = mesh(new THREE.SphereGeometry(0.3, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), accent);
      top.position.y = 0.04;
      head.add(top);
      head.add(at(mesh(rbox(0.32, 0.045, 0.28, 0.02), accent), 0, 0.06, 0.32)); // backwards brim
      head.add(at(mesh(sphere(0.035, 8, 6), accent), 0, 0.34, 0));
      break;
    }
    case 'ponytail': {
      dome(Math.PI * 0.6, 0.03);
      const tail = new THREE.Group();
      tail.position.set(0, 0.1, 0.27);
      tail.add(at(mesh(new THREE.TorusGeometry(0.055, 0.025, 8, 14), accent), 0, 0, 0));
      const lock = mesh(capsule(0.08, 0.3), hair);
      lock.position.set(0, -0.2, 0.05);
      lock.rotation.x = -0.3;
      tail.add(lock);
      head.add(tail);
      parts.swing = tail;
      break;
    }
    case 'curly': {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const ring = i % 2 ? 0.2 : 0.12;
        const c = mesh(sphere(0.1, 10, 8), hair);
        c.position.set(Math.cos(a) * ring, 0.2 + (i % 3) * 0.03, Math.sin(a) * ring + 0.04);
        head.add(c);
      }
      dome(Math.PI * 0.45, 0.04);
      break;
    }
    case 'bun': {
      dome(Math.PI * 0.58, 0.03);
      head.add(at(mesh(sphere(0.13, 16, 12), hair), 0, 0.3, 0.08));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        head.add(at(mesh(sphere(0.04, 8, 6), accent, false), Math.cos(a) * 0.06 + 0.14, 0.3 + Math.sin(a) * 0.06, 0.02));
      }
      break;
    }
    case 'spiky': {
      dome(Math.PI * 0.5, 0.03);
      for (let i = 0; i < 9; i++) {
        const spike = mesh(cached('spike', () => new THREE.ConeGeometry(0.07, 0.24, 8)), hair);
        const a = -0.9 + (i % 5) * 0.45;
        spike.position.set(Math.sin(a) * 0.17, 0.26 - Math.floor(i / 5) * 0.05, 0.04 + Math.floor(i / 5) * 0.12);
        spike.rotation.set(0.35 + Math.floor(i / 5) * 0.5, 0, -a * 0.6);
        head.add(spike);
      }
      break;
    }
    case 'bald': {
      for (const sx of [-1, 1]) head.add(at(mesh(sphere(0.1, 10, 8), hair), sx * 0.24, 0.02, 0.08));
      const beard = mesh(sphere(0.2, 16, 12), hair);
      beard.scale.set(1.15, 0.9, 0.8);
      beard.position.set(0, -0.2, -0.12);
      head.add(beard);
      const tache = mesh(capsule(0.03, 0.12), hair, false);
      tache.rotation.z = Math.PI / 2;
      tache.position.set(0, -0.08, -0.27);
      head.add(tache);
      break;
    }
  }
  if (char.glasses) {
    const frame = paint('#1b1b22', { roughness: 0.3, metalness: 0.6 });
    for (const sx of [-0.105, 0.105]) {
      const ring = mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 20), frame, false);
      ring.position.set(sx, 0.035, -0.29);
      head.add(ring);
    }
    head.add(at(mesh(cyl(0.008, 0.008, 0.07, 6), frame, false), 0, 0.04, -0.29).rotateZ(Math.PI / 2));
  }
  return parts;
}

// ============================================================
// Skateboards
// ============================================================
export function makeBoard(def) {
  const g = new THREE.Group();
  if (def.style === 'carpet') {
    // A magic carpet that ripples
    const carpet = mesh(new THREE.PlaneGeometry(0.9, 1.4, 6, 10), paint('#ffffff', { map: TX.carpetTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.08;
    g.add(carpet);
    for (let i = 0; i < 4; i++) {
      const tassel = mesh(cached('tassel', () => new THREE.ConeGeometry(0.04, 0.14, 6)), paint('#ffd23f'), false);
      tassel.position.set(i < 2 ? -0.45 : 0.45, 0.06, i % 2 ? -0.72 : 0.72);
      g.add(tassel);
    }
    g.userData.carpet = carpet;
    return g;
  }
  const deckMat = def.style === 'art' ? paint('#ffffff', { map: TX.truckArtTexture(1), roughness: 0.45 }) : gloss(def.deck);
  const deck = mesh(rbox(0.46, 0.06, 1.1, 0.03), deckMat);
  deck.position.y = 0.13;
  g.add(deck);
  for (const z of [-0.36, 0.36]) {
    g.add(at(mesh(rbox(0.3, 0.05, 0.08, 0.015), chrome()), 0, 0.08, z));
    for (const x of [-0.17, 0.17]) {
      const w = mesh(cyl(0.055, 0.055, 0.06, 14), def.style === 'neon' ? glow(def.wheels, 2.5) : gloss(def.wheels));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.055, z);
      g.add(w);
    }
  }
  if (def.style === 'neon') {
    for (const x of [-0.235, 0.235]) g.add(at(new THREE.Mesh(rbox(0.02, 0.02, 1.0, 0.008), glow('#39f0ff', 3)), x, 0.13, 0));
  }
  return g;
}

const setRot = (g, x, z = 0) => {
  g.rotation.x = x;
  g.rotation.z = z;
};

// Positive rotation.x swings a limb FORWARD (the kid runs towards -z)
export function poseKid(k, game) {
  const p = game.player;
  const t = game.time;
  const [L, R] = k.legs;
  const [AL, AR] = k.arms;
  const riding = game.board.t > 0 || (game.status === 'menu' && k.showBoard);
  const flyingJet = game.power.jetpack > 0;

  k.root.position.set(p.x, p.y, 0);
  if (game.status === 'menu') k.root.position.y += 0.12; // stand on the podium
  k.root.rotation.set(0, 0, 0);
  k.root.scale.set(1, 1, 1);
  k.body.position.y = riding && p.onGround ? 0.19 : 0;
  k.body.rotation.set(0, 0, 0);
  k.hips.rotation.set(0, 0, 0);
  k.hips.scale.setScalar(1);
  k.head.rotation.set(0, 0, 0);
  k.pack.rotation.x = 0;
  k.board.visible = riding;
  k.board.rotation.set(0, 0, 0);
  for (const f of k.flames) {
    f.visible = flyingJet;
    f.scale.set(1, 0.8 + Math.random() * 0.5, 1);
  }

  if (game.status === 'menu') {
    // Idle: bounce and wave at the camera
    k.hips.position.y = 0.88 + Math.abs(Math.sin(t * 4)) * 0.03;
    setRot(L.upper, 0.05); setRot(L.knee, -0.05);
    setRot(R.upper, -0.05); setRot(R.knee, -0.05);
    setRot(AL.shoulder, 0.1, -0.15); setRot(AL.elbow, 0.3);
    // A cool hero pose: thumbs up to the camera and a hand on the hip
    // (standing still for the close-up in the style editor)
    if (k.calm) { setRot(AR.shoulder, -0.1, 0.15); setRot(AR.elbow, 0.3); }
    else {
      setRot(AR.shoulder, 1.15 + Math.sin(t * 2) * 0.06, 0.32); setRot(AR.elbow, 1.25);
      setRot(AL.shoulder, -0.15, -0.75); AL.elbow.rotation.set(-0.2, 0, 1.9);
      k.hips.rotation.z = Math.sin(t * 1.6) * 0.03;
    }
    k.head.rotation.y = Math.sin(t * 1.5) * (k.calm ? 0.35 : 0.2); // turns the head so you see the face from the side too
  } else if (p.dead) {
    k.hips.position.y = 0.32;
    k.hips.rotation.x = 1.3;
    setRot(L.upper, 0.6); setRot(L.knee, -0.4);
    setRot(R.upper, 0.2); setRot(R.knee, -0.2);
    setRot(AL.shoulder, 2.6, -0.6); setRot(AL.elbow, 0.2);
    setRot(AR.shoulder, 2.6, 0.6); setRot(AR.elbow, 0.2);
  } else if (p.rollTimer > 0) {
    const f = 1 - p.rollTimer / T.rollTime;
    k.hips.position.y = 0.45;
    k.hips.rotation.x = -f * Math.PI * 2;
    k.hips.scale.setScalar(0.82);
    setRot(L.upper, 1.7); setRot(L.knee, -2.3);
    setRot(R.upper, 1.7); setRot(R.knee, -2.3);
    setRot(AL.shoulder, 1.3); setRot(AL.elbow, 1.4);
    setRot(AR.shoulder, 1.3); setRot(AR.elbow, 1.4);
  } else if (flyingJet) {
    // Rocket Bag: superhero pose
    k.hips.rotation.x = -0.35;
    setRot(AL.shoulder, 2.9, -0.15); setRot(AL.elbow, 0.1);
    setRot(AR.shoulder, 0.4, 0.5); setRot(AR.elbow, 0.6);
    setRot(L.upper, -0.2 + Math.sin(t * 6) * 0.1); setRot(L.knee, -0.5);
    setRot(R.upper, 0.1 - Math.sin(t * 6) * 0.1); setRot(R.knee, -0.3);
  } else if (game.power.kite > 0) {
    setRot(AL.shoulder, 3.0, -0.2); setRot(AL.elbow, 0.2);
    setRot(AR.shoulder, 3.0, 0.2); setRot(AR.elbow, 0.2);
    setRot(L.upper, Math.sin(t * 3) * 0.35); setRot(L.knee, -0.4);
    setRot(R.upper, -Math.sin(t * 3) * 0.35); setRot(R.knee, -0.4);
  } else if (!p.onGround) {
    if (p.flipT > 0) {
      k.hips.rotation.x = -(1 - p.flipT / T.flipTime) * Math.PI * 2;
      setRot(L.upper, 1.6); setRot(L.knee, -2.0);
      setRot(R.upper, 1.6); setRot(R.knee, -2.0);
      setRot(AL.shoulder, 1.2); setRot(AR.shoulder, 1.2);
    } else {
      setRot(L.upper, 1.0); setRot(L.knee, -1.5);
      setRot(R.upper, 0.2); setRot(R.knee, -0.9);
      setRot(AL.shoulder, 2.5, -0.3); setRot(AL.elbow, 0.3);
      setRot(AR.shoulder, 2.5, 0.3); setRot(AR.elbow, 0.3);
    }
  } else if (riding) {
    // Skateboard stance: knees bent, arms out for balance
    const sway = Math.sin(t * 3);
    k.hips.position.y = 0.8;
    k.body.rotation.y = 0.35;
    setRot(L.upper, 0.45); setRot(L.knee, -0.8);
    setRot(R.upper, -0.2); setRot(R.knee, -0.5);
    setRot(AL.shoulder, 0.2, -1.1 + sway * 0.1); setRot(AL.elbow, 0.3);
    setRot(AR.shoulder, 0.2, 1.1 + sway * 0.1); setRot(AR.elbow, 0.3);
    k.board.rotation.z = sway * 0.05;
  } else {
    // Run cycle: legs opposite to each other, arms opposite to legs
    const sn = Math.sin(p.runPhase);
    k.hips.position.y = 0.88 + Math.abs(Math.cos(p.runPhase)) * 0.07;
    k.hips.rotation.x = -0.18;
    setRot(L.upper, sn * 0.95); setRot(L.knee, -0.3 - 0.9 * (1 - sn) / 2);
    setRot(R.upper, -sn * 0.95); setRot(R.knee, -0.3 - 0.9 * (1 + sn) / 2);
    setRot(AL.shoulder, -sn * 0.9); setRot(AL.elbow, 1.3);
    setRot(AR.shoulder, sn * 0.9); setRot(AR.elbow, 1.3);
    k.pack.rotation.x = Math.abs(Math.cos(p.runPhase)) * 0.12;
  }

  // Flowing cape and swinging ponytail
  const moving = game.status === 'playing' && !p.dead;
  if (k.cape) k.cape.rotation.x = moving ? 0.7 + Math.sin(t * 12) * 0.12 : 0.08 + Math.sin(t * 2) * 0.04;
  if (k.hairParts.swing) k.hairParts.swing.rotation.x = moving ? 0.5 + Math.sin(t * 10) * 0.25 : Math.sin(t * 2) * 0.1;
  if (k.board.userData.carpet) k.board.userData.carpet.rotation.z = Math.sin(t * 4) * 0.05;

  // Face: blink, worried eyebrows when Mom is close
  k.eyes.scale.y = (t % 3.4 < 0.12 ? 0.1 : 1) * k.eyes.scale.x; // blink
  const worried = game.status !== 'menu' && (game.mom.gap < 4 || p.dead);
  k.brows[0].rotation.z = worried ? -0.45 : 0;
  k.brows[1].rotation.z = worried ? 0.45 : 0;
  const open = game.status !== 'menu' && (!p.onGround || p.dead || worried);
  k.mouthO.visible = open;
  k.smile.visible = !open;

  if (p.leanTimer > 0) k.root.rotation.z = -p.leanDir * 0.28 * (p.leanTimer / 0.25);
  if (p.stumble > 0) k.root.rotation.z += Math.sin(t * 40) * 0.2 * p.stumble;
  if (p.squash > 0) k.root.scale.set(1 + 0.18 * p.squash, 1 - 0.18 * p.squash, 1 + 0.18 * p.squash);
  // While you can't be hit, a soft bubble pulses round you (no flickering, you never disappear)
  k.root.visible = true;

  const safe = p.invuln > 0.08 && !p.dead && game.status === 'playing';
  const field = game.power.forcefield > 0;
  k.bubble.visible = p.shield || safe || field;
  k.bubble.material.color.set(field ? '#7fd8ff' : '#9ffcea');
  k.bubble.material.opacity = field ? 0.32 + Math.sin(t * 10) * 0.06 : 0.22;
  k.bubble.scale.setScalar(p.shield ? 1 : 0.92 + Math.sin(t * 14) * 0.05);
  k.bubble.scale.setScalar(1 + Math.sin(t * 6) * 0.03);
  k.kite.visible = game.power.kite > 0;
  k.kite.rotation.z = Math.sin(t * 2) * 0.15;

  k.blob.position.x = p.x;
  const lift = Math.min(1, p.y / 4);
  k.blob.scale.setScalar(1 - lift * 0.6);
  k.blob.material.opacity = 0.35 * (1 - lift);
}

// ============================================================
// Mom (and her scooter)
// ============================================================
export function makeMom() {
  const dress = paint('#d61f6b', { roughness: 0.6 });
  const sleeve = paint('#a3124e', { roughness: 0.6 });
  const scarf = paint('#ffc93c', { roughness: 0.55 });
  const skin = paint('#d6a070', { roughness: 0.55 });
  const gold = paint('#ffcf4a', { roughness: 0.25, metalness: 1 });
  const dark = paint('#2b1a12');

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skirt = mesh(new THREE.ConeGeometry(0.64, 1.35, 28), dress);
  skirt.position.y = 0.78;
  body.add(skirt);
  const hem = mesh(new THREE.TorusGeometry(0.6, 0.045, 8, 32), gold);
  hem.position.y = 0.16;
  hem.rotation.x = Math.PI / 2;
  body.add(hem);
  const torso = mesh(torsoGeo, dress);
  torso.position.y = 1.14;
  torso.scale.set(1.08, 1, 1);
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = 2.0;
  body.add(head);
  head.add(at(mesh(sphere(0.31, 24, 18), scarf), 0, 0.03, 0.05));
  head.add(at(mesh(sphere(0.25, 24, 18), skin), 0, 0, -0.08));
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Group();
    eye.position.set(sx, 0.03, -0.28);
    eye.add(mesh(sphere(0.045, 12, 10), paint('#ffffff', { roughness: 0.2 }), false));
    eye.add(at(mesh(sphere(0.025, 10, 8), dark, false), 0, 0, -0.035));
    head.add(eye);
    const brow = mesh(rbox(0.12, 0.03, 0.03, 0.012), dark, false);
    brow.position.set(sx, 0.1, -0.3);
    brow.rotation.z = sx > 0 ? 0.4 : -0.4; // angry!
    head.add(brow);
    head.add(at(mesh(sphere(0.04, 10, 8), gold, false), sx * 2.8, -0.12, -0.06));
  }
  head.add(at(mesh(sphere(0.035, 8, 6), paint('#c98a5c'), false), 0, -0.03, -0.33));
  const tail = mesh(rbox(0.46, 0.95, 0.05, 0.02), scarf);
  tail.position.set(0, -0.45, 0.3);
  head.add(tail);

  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.4, 1.62, 0);
    body.add(shoulder);
    shoulder.add(at(mesh(capsule(0.09, 0.42), sleeve), 0, -0.28, 0));
    const bangle = mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 14), gold);
    bangle.position.y = -0.48;
    bangle.rotation.x = Math.PI / 2;
    shoulder.add(bangle);
    shoulder.add(at(mesh(sphere(0.1, 12, 10), skin), 0, -0.56, 0));
    return shoulder;
  });
  const slipper = makeSlipperMesh();
  slipper.position.set(0, -0.62, -0.05);
  arms[1].add(slipper);

  const feet = [-0.18, 0.18].map((x) => {
    const f = mesh(rbox(0.2, 0.12, 0.36, 0.05), paint('#7a3b1d'));
    f.position.set(x, 0.06, 0);
    root.add(f);
    return f;
  });

  const scooter = makeScooter();
  root.add(scooter);
  return { root, body, arms, feet, tail, slipper, scooter };
}

export function makeScooter() {
  const g = new THREE.Group();
  const body = gloss('#2fc4b2');
  const cream = gloss('#fff3dc');
  const shield = mesh(rbox(0.62, 0.95, 0.16, 0.07), body);
  shield.position.set(0, 0.75, -0.75);
  shield.rotation.x = -0.2;
  g.add(shield);
  g.add(at(mesh(rbox(0.5, 0.1, 0.8, 0.04), cream), 0, 0.32, -0.2));
  const rear = mesh(sphere(0.42, 22, 14), body);
  rear.scale.set(1, 0.8, 1.35);
  rear.position.set(0, 0.55, 0.45);
  g.add(rear);
  g.add(at(mesh(rbox(0.42, 0.12, 0.6, 0.05), paint('#3b2a24', { roughness: 0.5 })), 0, 0.9, 0.35));
  const bar = mesh(cyl(0.03, 0.03, 0.8, 8), chrome());
  bar.position.set(0, 1.35, -0.82);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  g.add(at(mesh(cyl(0.05, 0.05, 0.5, 8), body), 0, 1.12, -0.82));
  g.add(at(new THREE.Mesh(sphere(0.1, 12, 10), glow('#fff3c4')), 0, 1.18, -0.95));
  for (const x of [-0.42, 0.42]) g.add(at(mesh(sphere(0.05, 8, 6), chrome()), x, 1.5, -0.82)); // mirrors
  const wheels = [wheel(0.24, 0.14, 0, 0.24, -0.72), wheel(0.24, 0.14, 0, 0.24, 0.6)];
  g.add(...wheels);
  g.userData.wheels = wheels;
  g.visible = false;
  return g;
}

export function poseMom(m, game) {
  const g = game.mom;
  const p = game.player;
  const t = game.time;
  m.root.visible = game.status !== 'menu' && g.gap < 5;
  if (!m.root.visible) return;
  // On foot she runs just behind you; on the scooter she rides in the next lane
  const side = g.scooter ? (p.lane >= 0 ? -1.8 : 1.8) : 1.0;
  m.root.position.set(p.x + side, 0, g.gap);
  m.root.scale.setScalar(g.scooter ? 0.8 : 0.88);
  m.scooter.visible = g.scooter;
  m.tail.rotation.x = 0.35 + Math.sin(t * 9) * (g.scooter ? 0.3 : 0.15);

  if (g.scooter) {
    m.body.position.y = 0.35 + Math.sin(t * 18) * 0.015;
    m.feet.forEach((f) => (f.visible = false));
    for (const w of m.scooter.userData.wheels) w.rotation.x -= 0.6;
    m.arms[0].rotation.x = 1.25;
    m.arms[1].rotation.x = g.throwAnim > 0 ? 2.8 - (0.5 - g.throwAnim) * 4 : 1.25;
  } else {
    const sn = Math.sin(g.runPhase);
    m.body.position.y = Math.abs(Math.cos(g.runPhase)) * 0.08;
    m.feet.forEach((f) => (f.visible = true));
    m.feet[0].position.z = sn * 0.35;
    m.feet[1].position.z = -sn * 0.35;
    if (game.status !== 'playing') {
      m.arms[0].rotation.x = 1.6;
      m.arms[1].rotation.x = 1.6;
    } else if (g.throwAnim > 0) {
      m.arms[0].rotation.x = sn * 0.6;
      m.arms[1].rotation.x = 2.8 - (0.5 - g.throwAnim) * 4;
    } else {
      m.arms[0].rotation.x = sn * 0.7;
      m.arms[1].rotation.x = -sn * 0.7;
    }
  }
  m.slipper.visible = g.throwAnim > 0.25 || game.status !== 'playing';
}

export function makeSlipperMesh() {
  const g = new THREE.Group();
  const sole = mesh(sphere(0.2, 18, 10), gloss('#2f7fe0'));
  sole.scale.set(1, 0.28, 1.9);
  g.add(sole);
  const strap = mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 14, Math.PI), paint('#ffffff', { roughness: 0.4 }));
  strap.position.set(0, 0.03, -0.05);
  g.add(strap);
  return g;
}

// ============================================================
// Obstacles (built facing +z, towards the player)
// ============================================================
export function makeObstacle(type, variant) {
  // (the beach, mountain and railway versions live in skins.js)
  switch (type) {
    case 'crate': return makeCrate();
    case 'cart': return makeCart();
    case 'line': return makeLine();
    case 'rickshaw': return makeRickshaw();
    default: return makeTruck(variant);
  }
}

function makeCrate() {
  const g = new THREE.Group();
  const wood = paint('#ffffff', { map: TX.crateTexture(), roughness: 0.75 });
  // Two crates side by side, slightly different, look more natural than one block
  g.add(at(mesh(rbox(0.92, 1.0, 0.98, 0.05), wood), -0.48, 0.5, 0));
  const second = mesh(rbox(0.92, 0.92, 0.94, 0.05), wood);
  second.position.set(0.48, 0.46, 0.02);
  second.rotation.y = 0.06;
  g.add(second);
  for (const x of [-0.48, 0.48]) g.add(at(mesh(rbox(0.94, 0.06, 0.06, 0.02), paint('#6b6b78', { roughness: 0.35, metalness: 0.8 })), x, 0.98 - (x > 0 ? 0.08 : 0), -0.49));
  return g;
}

function makeCart() {
  const g = new THREE.Group();
  g.add(at(mesh(rbox(1.85, 0.42, 1.4, 0.06), gloss('#2f7fe0')), 0, 0.6, 0));
  g.add(at(mesh(rbox(1.92, 0.08, 1.46, 0.03), gloss('#ffd23f')), 0, 0.82, 0));
  g.add(wheel(0.32, 0.12, -0.98, 0.32, 0, '#ffd23f'), wheel(0.32, 0.12, 0.98, 0.32, 0, '#ffd23f'));
  const fruitColors = ['#ff8a00', '#38c95a', '#ff3b5c', '#ffd23f'];
  for (let i = 0; i < 18; i++) {
    const f = mesh(sphere(0.14, 14, 10), paint(fruitColors[i % 4], { roughness: 0.3 }));
    f.position.set(-0.72 + (i % 6) * 0.29, 0.93 + Math.floor(i / 6) * 0.03, -0.5 + Math.floor(i / 6) * 0.42);
    g.add(f);
  }
  return g;
}

function makeLine() {
  const g = new THREE.Group();
  for (const x of [-1.15, 1.15]) g.add(at(mesh(cyl(0.07, 0.07, 2.9, 10), paint('#8a8496', { roughness: 0.35, metalness: 0.7 })), x, 1.45, 0));
  const rope = mesh(cyl(0.025, 0.025, 2.3, 6), paint('#f4ead6'), false);
  rope.position.y = 2.75;
  rope.rotation.z = Math.PI / 2;
  g.add(rope);
  const clothes = new THREE.Group();
  const colors = ['#ff6fae', '#18a058', '#f3efe6', '#2fa8ff', '#ffd23f'];
  const items = [[-0.72, 0.6, 1.3], [0, 0.55, 1.6], [0.72, 0.6, 1.25]];
  items.forEach(([x, w, h], i) => {
    const c = mesh(rbox(w, h, 0.05, 0.02), paint(colors[(i + Math.floor(Math.random() * 5)) % 5], { roughness: 0.85 }));
    c.position.set(x, 2.72 - h / 2, 0);
    clothes.add(c);
    clothes.add(at(mesh(rbox(0.06, 0.1, 0.07, 0.01), paint('#c9c9d6')), x, 2.74, 0)); // peg
  });
  g.add(clothes);
  g.userData.sway = clothes;
  return g;
}

function makeRickshaw() {
  const g = new THREE.Group();
  const green = gloss('#17a34a');
  const yellow = gloss('#ffd23f');
  g.add(at(mesh(rbox(1.5, 0.75, 2.2, 0.14), green), 0, 0.66, 0));
  g.add(at(mesh(rbox(0.92, 1.0, 0.6, 0.16), yellow), 0, 0.95, 1.1));
  g.add(at(mesh(rbox(1.62, 0.74, 1.95, 0.18), paint('#1d1d26', { roughness: 0.5 })), 0, 1.52, -0.1));
  g.add(at(mesh(rbox(1.64, 0.12, 1.97, 0.05), yellow), 0, 1.2, -0.1));
  const shield = mesh(rbox(0.86, 0.46, 0.03, 0.02), glass(), false);
  shield.position.set(0, 1.5, 0.86);
  shield.rotation.x = -0.2;
  g.add(shield);
  g.add(at(new THREE.Mesh(sphere(0.11, 12, 10), glow('#fff3b0')), 0, 1.05, 1.41));
  g.add(at(mesh(rbox(0.5, 0.06, 0.05, 0.02), chrome()), 0, 0.5, 1.42)); // bumper
  for (let i = 0; i < 6; i++) {
    const tassel = mesh(cached('tasselR', () => new THREE.ConeGeometry(0.05, 0.16, 6)), paint(['#ff3b5c', '#ffd23f', '#2fa8ff'][i % 3]), false);
    tassel.position.set(-0.7 + i * 0.28, 1.08, -1.08);
    tassel.rotation.x = Math.PI;
    g.add(tassel);
  }
  for (const x of [-0.5, 0.5]) g.add(at(new THREE.Mesh(rbox(0.16, 0.1, 0.04, 0.02), glow('#ff3040')), x, 0.7, -1.11)); // tail lights
  const wheels = [wheel(0.28, 0.18, 0, 0.28, 1.0), wheel(0.28, 0.18, -0.78, 0.28, -0.7), wheel(0.28, 0.18, 0.78, 0.28, -0.7)];
  g.add(...wheels);
  g.userData.wheels = wheels;
  return g;
}

function makeTruck(variant = 0) {
  const g = new THREE.Group();
  const cabColor = ['#ff5a36', '#1fb5a3', '#3a6bff'][variant % 3];
  const art = paint('#ffffff', { map: TX.truckArtTexture(variant), roughness: 0.4 });
  const rearArt = paint('#ffffff', { map: TX.truckArtTexture(variant, true), roughness: 0.4 });
  const plain = gloss(cabColor);

  g.add(at(mesh(rbox(2.0, 0.4, 6.8, 0.08), paint('#2b2733', { roughness: 0.6 })), 0, 0.6, 0));
  g.add(at(mesh(rbox(2.1, 1.9, 1.7, 0.2), plain), 0, 1.6, 2.6));
  const shield = mesh(rbox(1.8, 0.75, 0.04, 0.03), glass(), false);
  shield.position.set(0, 2.05, 3.45);
  g.add(shield);
  g.add(at(mesh(new THREE.PlaneGeometry(2.0, 0.85), art, false), 0, 1.05, 3.46));
  g.add(at(mesh(rbox(2.2, 0.7, 0.22, 0.06), art), 0, 2.85, 3.3)); // decorated crown
  g.add(at(mesh(rbox(2.15, 0.16, 0.14, 0.05), chrome()), 0, 0.55, 3.5)); // bumper
  // Cargo box: art on the sides, HORN PLEASE on the back (-z face)
  const cargo = mesh(new THREE.BoxGeometry(2.2, 2.4, 5.0), [art, art, plain, plain, plain, rearArt]);
  cargo.position.set(0, 1.95, -0.85);
  g.add(cargo);
  g.add(at(mesh(rbox(2.26, 0.12, 5.06, 0.04), chrome()), 0, 3.18, -0.85)); // roof trim
  for (const x of [-0.7, 0.7]) {
    g.add(at(new THREE.Mesh(sphere(0.13, 12, 10), glow('#fff6c8')), x, 0.82, 3.47));
    g.add(at(new THREE.Mesh(rbox(0.22, 0.12, 0.05, 0.02), glow('#ff3040')), x * 1.3, 0.75, -3.37));
  }
  // Chain of coloured bulbs on the bumper and around the crown
  const bulbColors = ['#ff3b5c', '#ffd23f', '#20c25a', '#2fa8ff'];
  for (let i = 0; i < 9; i++) {
    g.add(at(new THREE.Mesh(sphere(0.06, 8, 6), glow(bulbColors[i % 4])), -0.96 + i * 0.24, 0.42, 3.5));
    g.add(at(new THREE.Mesh(sphere(0.06, 8, 6), glow(bulbColors[(i + 2) % 4])), -0.96 + i * 0.24, 3.25, 3.32));
  }
  const wheels = [2.4, -1.4, -2.6].flatMap((z) => [wheel(0.45, 0.32, -1.0, 0.45, z), wheel(0.45, 0.32, 1.0, 0.45, z)]);
  g.add(...wheels);
  g.userData.wheels = wheels;
  return g;
}

// ============================================================
// Pickups, puddles and Mom's slipper strike
// ============================================================
const samosaGeo = new THREE.ConeGeometry(0.27, 0.4, 3);
const samosaRim = new THREE.TorusGeometry(0.2, 0.04, 6, 3);
let sparkleMat = null;
// The coin: shiny gold with a raised rim and a samosa stamped on both faces
let coinMats = null;
export function makeSamosa() {
  coinMats ??= {
    gold: paint('#ffc21a', { roughness: 0.22, metalness: 0.85, emissive: '#7a4a00', emissiveIntensity: 0.55 }),
    rim: paint('#ffde6b', { roughness: 0.18, metalness: 0.9, emissive: '#7a5200', emissiveIntensity: 0.5 }),
    stamp: paint('#ff9d00', { roughness: 0.3, metalness: 0.7, emissive: '#6a3200', emissiveIntensity: 0.5 }),
  };
  const g = new THREE.Group();
  const face = mesh(cached('coin', () => new THREE.CylinderGeometry(0.34, 0.34, 0.08, 32).rotateX(Math.PI / 2)), coinMats.gold);
  const rim = mesh(cached('coinRim', () => new THREE.TorusGeometry(0.33, 0.04, 8, 32)), coinMats.rim, false);
  g.add(face, rim);
  for (const z of [-0.045, 0.045]) {
    const tri = mesh(cached('coinStamp', () => new THREE.CylinderGeometry(0.17, 0.17, 0.03, 3).rotateX(Math.PI / 2)), coinMats.stamp, false);
    tri.position.z = z;
    tri.rotation.z = Math.PI / 2;
    g.add(tri);
  }
  g.scale.setScalar(1.05);
  sparkleMat ??= new THREE.SpriteMaterial({ map: TX.glowTexture(), color: new THREE.Color('#fff2b0').multiplyScalar(1.6), depthWrite: false });
  const sparkle = new THREE.Sprite(sparkleMat);
  sparkle.scale.setScalar(0.3);
  sparkle.position.set(0.16, 0.18, -0.08);
  g.add(sparkle);
  g.userData.sparkle = sparkle;
  return g;
}

const POWER_COLORS = { magnet: '#ff4f8b', shield: '#22c7b0', turbo: '#8a5cff', double: '#ffb800', kite: '#2fa8ff', chai: '#d9822b', jetpack: '#ff7a1a', board: '#20c25a', forcefield: '#2a8cf0', blaster: '#ff3b5c' };
export function makePower(type) {
  const color = POWER_COLORS[type];
  const g = new THREE.Group();
  g.add(mesh(new THREE.IcosahedronGeometry(0.42, 4), paint(color, { emissive: color, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.2 })));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 40), glow('#ffffff', 1.8));
  g.add(halo);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.iconTexture(type), depthTest: false }));
  icon.scale.setScalar(0.62);
  icon.renderOrder = 10;
  g.add(icon);
  g.userData.halo = halo;
  return g;
}

// The key: a glowing blue key that spins in the air
export function makeKey() {
  const g = new THREE.Group();
  const blue = paint('#39c6ff', { roughness: 0.2, metalness: 0.6, emissive: '#1a7fd0', emissiveIntensity: 0.8 });
  const bow = mesh(new THREE.TorusGeometry(0.2, 0.07, 10, 24), blue);
  bow.position.y = 0.25;
  g.add(bow);
  g.add(at(mesh(cyl(0.05, 0.05, 0.6, 10), blue), 0, -0.2, 0));
  g.add(at(mesh(rbox(0.16, 0.08, 0.08, 0.02), blue), 0.09, -0.36, 0));
  g.add(at(mesh(rbox(0.12, 0.08, 0.08, 0.02), blue), 0.07, -0.2, 0));
  sparkleMat ??= new THREE.SpriteMaterial({ map: TX.glowTexture(), color: new THREE.Color('#fff2b0').multiplyScalar(1.6), depthWrite: false });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture(), color: new THREE.Color('#39c6ff').multiplyScalar(1.4), depthWrite: false, transparent: true, opacity: 0.8 }));
  halo.scale.setScalar(1.4);
  g.add(halo);
  return g;
}

export function makeBalloon(color) {
  const g = new THREE.Group();
  const b = mesh(sphere(0.24, 16, 12), paint(color, { roughness: 0.15, metalness: 0.1 }), false);
  b.scale.set(1, 1.15, 1);
  g.add(b, at(mesh(new THREE.ConeGeometry(0.05, 0.08, 8), paint(color), false), 0, -0.28, 0));
  g.add(at(new THREE.Mesh(sphere(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })), -0.08, 0.1, -0.16));
  return g;
}

export function makeBall() {
  const g = new THREE.Group();
  g.add(mesh(sphere(0.2, 22, 16), paint('#c81d28', { roughness: 0.3, emissive: '#3a0005' })));
  g.add(mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 28), paint('#ffffff'), false));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glowTexture(), color: new THREE.Color('#ff6b6b').multiplyScalar(1.2), depthWrite: false, transparent: true, opacity: 0.6 }));
  halo.scale.setScalar(1.2);
  g.add(halo);
  return g;
}

export function makePuddle() {
  const m = new THREE.Mesh(
    cached('puddle', () => new THREE.CircleGeometry(1, 32)),
    new THREE.MeshStandardMaterial({ color: '#4c6699', roughness: 0.04, metalness: 0.4, transparent: true, opacity: 0.85 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function makeStrike() {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2d55').multiplyScalar(1.6), transparent: true, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ color: '#ff2d55', transparent: true, opacity: 0.25, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  const marker = new THREE.Group();
  marker.add(ring, disc);
  const slipper = makeSlipperMesh();
  slipper.scale.setScalar(1.4);
  g.add(marker, slipper);
  g.userData = { marker, slipper, ringMat };
  return g;
}

// ============================================================
// Particles: one Points object, positions updated every frame
// ============================================================
export function makeParticles(max) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.32, map: TX.glowTexture(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, geo, pos, col, max };
}

// Shared building blocks for the other model files (skins, chasers, pets, scenery)
export { rbox, sphere, capsule, cyl, mesh, at, wheel, gloss, chrome, glass, cached };
