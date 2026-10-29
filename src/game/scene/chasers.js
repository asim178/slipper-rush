// ============================================================
// chasers.js: who chases you (Mom, Dad, the Principal), the
// vehicle each one rides in a boss phase, and what they throw.
// ============================================================
import * as THREE from 'three';
import { makeHuman } from './human.js';
import { paint, glow, makeScooter, makeSlipperMesh, rbox, sphere, capsule, cyl, mesh, at, wheel, gloss, chrome } from './models.js';

// Each chaser is a human built with the same body as the runner (human.js)
const CHASER_LOOKS = {
  mom: { body: 'f', build: 'regular', face: 'round', skin: '#d9a27a', eyes: '#3b2414', hair: 'bun', hairColor: '#1a1210', beard: 'none', hat: 'none', glasses: 'none',
    top: 'kurta', topColor: '#d61f6b', trimColor: '#ffd23f', bottom: 'trousers', bottomColor: '#fbe3ef', shoes: '#b0742f', scale: 1, noPack: true },
  dad: { body: 'm', build: 'athletic', face: 'square', skin: '#b98055', eyes: '#3b2414', hair: 'short', hairColor: '#14110f', beard: 'mustache', hat: 'none', glasses: 'none',
    top: 'tee', topColor: '#2f6fd6', trimColor: '#ffffff', bottom: 'jeans', bottomColor: '#2b3a5c', shoes: '#3a2a20', scale: 1.04, noPack: true },
  principal: { body: 'm', build: 'regular', face: 'oval', skin: '#d4a278', eyes: '#6b4423', hair: 'bald', hairColor: '#d9d9d9', beard: 'none', hat: 'none', glasses: 'glasses',
    top: 'shirt', topColor: '#eef1f6', trimColor: '#a3124e', bottom: 'trousers', bottomColor: '#3a3d48', shoes: '#1f1f27', scale: 1.02, noPack: true },
};

export function makeChaser(type) {
  const t = CHASER_LOOKS[type] ? type : 'mom';
  const h = makeHuman(CHASER_LOOKS[t]);
  const held = makeProjectile(t === 'dad' ? 'newspaper' : t === 'principal' ? 'book' : 'slipper');
  held.position.set(0, -0.3, -0.05);
  h.arms[1].elbow.add(held);
  const vehicle = t === 'dad' ? makeMotorbike() : t === 'principal' ? makeBicycle() : makeScooter();
  if (t === 'mom') vehicle.userData.seatY = 0.5;
  h.root.add(vehicle);
  // A dupatta (scarf) for Mom that flows behind her
  let tail = null;
  if (t === 'mom') {
    tail = new THREE.Group();
    tail.position.set(0, 0.52, 0.1);
    tail.add(at(mesh(new THREE.PlaneGeometry(0.4, 0.75, 1, 3).translate(0, -0.37, 0), paint('#ffd23f', { side: THREE.DoubleSide, roughness: 0.6 })), 0, 0, 0));
    h.hips.add(tail);
  }
  return {
    root: h.root, body: h.body, hips: h.hips, human: true, tail,
    arms: h.arms.map((a) => a.shoulder), elbows: h.arms.map((a) => a.elbow),
    legs: h.legs.map((l) => l.upper), knees: h.legs.map((l) => l.knee),
    held, vehicle, type: t,
  };
}

function makeMan(o) {
  const shirt = paint(o.shirt, { roughness: 0.65 });
  const pants = paint(o.pants, { roughness: 0.7 });
  const skin = paint(o.skin, { roughness: 0.55 });
  const hair = paint(o.hair, { roughness: 0.5 });
  const dark = paint('#1b1b22');
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const hips = new THREE.Group();
  hips.position.y = 1.0;
  body.add(hips);
  hips.add(at(mesh(rbox(0.72, 0.85, 0.46, 0.2), shirt), 0, 0.55, 0));
  hips.add(at(mesh(rbox(0.66, 0.24, 0.44, 0.1), pants), 0, 0.05, 0));
  if (o.tie) hips.add(at(mesh(rbox(0.1, 0.5, 0.03, 0.02), paint(o.tie)), 0, 0.62, -0.24));
  const head = new THREE.Group();
  head.position.y = 1.25;
  hips.add(head);
  head.add(mesh(sphere(0.27, 22, 16), skin));
  for (const sx of [-0.1, 0.1]) {
    head.add(at(mesh(sphere(0.035, 8, 6), dark, false), sx, 0.04, -0.25));
    const brow = mesh(rbox(0.12, 0.03, 0.03, 0.012), hair, false);
    brow.position.set(sx, 0.12, -0.25);
    brow.rotation.z = sx > 0 ? 0.35 : -0.35;
    head.add(brow);
  }
  if (o.mustache) {
    const m = mesh(capsule(0.035, 0.16), hair, false);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, -0.08, -0.26);
    head.add(m);
  }
  if (o.bald) {
    for (const sx of [-1, 1]) head.add(at(mesh(sphere(0.09, 10, 8), hair), sx * 0.24, 0.0, 0.06));
  } else {
    const top = mesh(new THREE.SphereGeometry(0.28, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), o.cap ? paint(o.cap) : hair);
    top.position.y = 0.03;
    head.add(top);
    if (o.cap) head.add(at(mesh(rbox(0.3, 0.04, 0.24, 0.02), paint(o.cap)), 0, 0.06, -0.3));
  }
  if (o.glasses) {
    const frame = paint('#1b1b22', { roughness: 0.3, metalness: 0.6 });
    for (const sx of [-0.1, 0.1]) {
      const ring = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 18), frame, false);
      ring.position.set(sx, 0.04, -0.27);
      head.add(ring);
    }
  }

  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.44, 0.92, 0);
    hips.add(shoulder);
    shoulder.add(at(mesh(capsule(0.09, 0.42), shirt), 0, -0.28, 0));
    shoulder.add(at(mesh(sphere(0.1, 12, 10), skin), 0, -0.56, 0));
    return shoulder;
  });
  o.held.position.set(0, -0.64, -0.05);
  arms[1].add(o.held);

  const legs = [-0.17, 0.17].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0, 0);
    hips.add(leg);
    leg.add(at(mesh(capsule(0.11, 0.66), pants), 0, -0.45, 0));
    leg.add(at(mesh(rbox(0.22, 0.13, 0.38, 0.05), dark), 0, -0.93, -0.07));
    return leg;
  });

  root.add(o.ride);
  return { root, body, hips, arms, legs, held: o.held, vehicle: o.ride, type: o.type };
}

function makeMotorbike() {
  const g = new THREE.Group();
  const red = gloss('#d6203a');
  g.add(at(mesh(rbox(0.36, 0.38, 1.1, 0.14), red), 0, 0.85, -0.1)); // tank
  g.add(at(mesh(rbox(0.32, 0.12, 0.7, 0.05), paint('#1b1b22')), 0, 0.95, 0.5)); // seat
  g.add(at(mesh(rbox(0.3, 0.3, 0.9, 0.1), chrome()), 0, 0.55, 0.15)); // engine
  g.add(at(mesh(cyl(0.03, 0.03, 0.8, 8), chrome()), 0, 1.25, -0.75).rotateZ(Math.PI / 2));
  g.add(at(mesh(cyl(0.04, 0.04, 0.6, 8), chrome()), 0, 0.95, -0.72).rotateX(0.35));
  g.add(at(new THREE.Mesh(sphere(0.12, 12, 10), glow('#fff3c4')), 0, 1.05, -0.92));
  g.add(at(mesh(cyl(0.05, 0.06, 0.6, 8), chrome()), 0.22, 0.45, 0.65).rotateX(Math.PI / 2)); // exhaust
  const wheels = [wheel(0.34, 0.14, 0, 0.34, -0.75), wheel(0.34, 0.14, 0, 0.34, 0.8)];
  g.add(...wheels);
  g.userData.wheels = wheels;
  g.userData.seatY = 0.55;
  g.visible = false;
  return g;
}

function makeBicycle() {
  const g = new THREE.Group();
  const frame = gloss('#20a35a');
  const tube = (x1, y1, z1, x2, y2, z2) => {
    const a = new THREE.Vector3(x1, y1, z1);
    const b = new THREE.Vector3(x2, y2, z2);
    const len = a.distanceTo(b);
    const m = mesh(cyl(0.035, 0.035, len, 8), frame);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
  };
  tube(0, 0.4, 0.55, 0, 0.95, 0.15);
  tube(0, 0.95, 0.15, 0, 1.0, -0.5);
  tube(0, 1.0, -0.5, 0, 0.4, -0.65);
  tube(0, 0.4, 0.55, 0, 0.45, 0.0);
  g.add(at(mesh(rbox(0.2, 0.06, 0.32, 0.03), paint('#1b1b22')), 0, 1.0, 0.18));
  g.add(at(mesh(cyl(0.025, 0.025, 0.6, 8), chrome()), 0, 1.15, -0.55).rotateZ(Math.PI / 2));
  g.add(at(mesh(rbox(0.36, 0.22, 0.28, 0.04), paint('#b07a43', { roughness: 0.8 })), 0, 1.0, -0.8)); // basket
  g.add(at(new THREE.Mesh(sphere(0.07, 8, 6), glow('#fff3c4')), 0, 1.05, -0.96));
  const wheels = [wheel(0.38, 0.06, 0, 0.38, -0.65), wheel(0.38, 0.06, 0, 0.38, 0.55)];
  g.add(...wheels);
  g.userData.wheels = wheels;
  g.userData.seatY = 0.6;
  g.visible = false;
  return g;
}

// What each chaser throws
export function makeProjectile(kind) {
  if (kind === 'newspaper') {
    const g = new THREE.Group();
    const roll = mesh(cyl(0.11, 0.11, 0.55, 14), paint('#f2efe6', { roughness: 0.85 }));
    roll.rotation.z = Math.PI / 2;
    g.add(roll);
    const band = mesh(cyl(0.115, 0.115, 0.12, 14), paint('#e8263f'));
    band.rotation.z = Math.PI / 2;
    g.add(band);
    return g;
  }
  if (kind === 'book') {
    const g = new THREE.Group();
    g.add(mesh(rbox(0.42, 0.1, 0.32, 0.02), gloss('#2f5bea')));
    g.add(at(mesh(rbox(0.4, 0.07, 0.3, 0.01), paint('#fbf6ea')), 0.012, 0, 0));
    return g;
  }
  return makeSlipperMesh();
}

export function poseChaser(m, game) {
  const g = game.mom;
  const p = game.player;
  const t = game.time;
  m.root.visible = game.status !== 'menu' && g.gap < 5;
  if (!m.root.visible) return;
  const riding = g.scooter;
  // On foot they run just behind you; on a vehicle they ride in the next lane
  const side = riding ? (p.lane >= 0 ? -1.8 : 1.8) : 1.0;
  m.root.position.set(p.x + side, 0, g.gap);
  m.root.scale.setScalar(m.human ? 1 : riding ? 0.8 : 0.88);
  if (m.elbows) m.elbows.forEach((e) => (e.rotation.x = riding ? 0.4 : 1.1)); // bent arms when running
  if (m.knees) m.knees.forEach((k, i) => (k.rotation.x = riding ? -1.5 : -0.3 - 0.8 * (1 + (i ? -1 : 1) * Math.sin(g.runPhase)) / 2));
  m.vehicle.visible = riding;
  if (m.tail) m.tail.rotation.x = 0.35 + Math.sin(t * 9) * (riding ? 0.3 : 0.15);
  const throwing = g.throwAnim > 0;
  const throwArm = throwing ? 2.8 - (0.5 - g.throwAnim) * 4 : null;
  const sn = Math.sin(g.runPhase);

  if (riding) {
    for (const w of m.vehicle.userData.wheels) w.rotation.x -= 0.6;
    if (m.legs) {
      // Sitting on a motorbike or bicycle
      m.body.position.y = m.human ? ({ mom: 0.96, dad: 1.0, principal: 1.05 }[m.type] - 0.84) : (m.vehicle.userData.seatY ?? 0.5) - 0.05;
      m.legs[0].rotation.x = 1.3 + (m.type === 'principal' ? Math.sin(t * 10) * 0.4 : 0);
      m.legs[1].rotation.x = 1.3 - (m.type === 'principal' ? Math.sin(t * 10) * 0.4 : 0);
      m.hips.rotation.x = -0.3;
    } else {
      m.body.position.y = 0.35 + Math.sin(t * 18) * 0.015;
      m.feet.forEach((f) => (f.visible = false));
    }
    m.arms[0].rotation.x = 1.25;
    m.arms[1].rotation.x = throwArm ?? 1.25;
  } else {
    m.body.position.y = Math.abs(Math.cos(g.runPhase)) * 0.08;
    if (m.legs) {
      m.hips.rotation.x = -0.12;
      m.legs[0].rotation.x = sn * 0.8;
      m.legs[1].rotation.x = -sn * 0.8;
    } else {
      m.feet.forEach((f) => (f.visible = true));
      m.feet[0].position.z = sn * 0.35;
      m.feet[1].position.z = -sn * 0.35;
    }
    if (game.status !== 'playing') {
      m.arms[0].rotation.x = 1.6; // reaching out to grab (or waving goodbye)
      m.arms[1].rotation.x = 1.6;
    } else {
      m.arms[0].rotation.x = sn * 0.7;
      m.arms[1].rotation.x = throwArm ?? -sn * 0.7;
    }
  }
  m.held.visible = g.throwAnim > 0.25 || game.status === 'dying';
}
