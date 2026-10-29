// ============================================================
// pets.js: sidekicks that run (or fly) next to you, and the
// see-through ghost runner for ghost races.
// ============================================================
import * as THREE from 'three';
import { paint, makeKid, rbox, sphere, capsule, cyl, mesh, at, gloss, cached } from './models.js';

function legs4(g, mat, w, l, h) {
  const legs = [];
  for (const [x, z] of [[-w, -l], [w, -l], [-w, l], [w, l]]) {
    const leg = new THREE.Group();
    leg.position.set(x, h, z);
    leg.add(at(mesh(capsule(0.045, h * 0.7), mat), 0, -h / 2, 0));
    g.add(leg);
    legs.push(leg);
  }
  return legs;
}

export function makePet(id) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const eye = paint('#14121a', { roughness: 0.3 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = (head, x, y, z, r = 0.04) => {
    for (const s of [-1, 1]) {
      head.add(at(mesh(sphere(r, 10, 8), eye, false), s * x, y, z));
      head.add(at(new THREE.Mesh(sphere(r * 0.35, 6, 5), shine), s * x + 0.01, y + 0.012, z - r * 0.8));
    }
  };
  let legs = [];
  let wings = null;
  let tail = null;
  let flying = false;

  if (id === 'parrot') {
    flying = true;
    const green = gloss('#2fbf4a');
    const torso = mesh(sphere(0.2, 16, 12), green);
    torso.scale.set(1, 1.15, 1.25);
    body.add(torso);
    const head = new THREE.Group();
    head.position.set(0, 0.2, -0.16);
    body.add(head);
    head.add(mesh(sphere(0.14, 14, 10), green));
    const beak = mesh(cached('beak', () => new THREE.ConeGeometry(0.06, 0.14, 10)), gloss('#ff3b2f'));
    beak.rotation.x = -Math.PI / 2 - 0.4;
    beak.position.set(0, -0.02, -0.15);
    head.add(beak);
    eyes(head, 0.08, 0.04, -0.09, 0.03);
    wings = [-1, 1].map((s) => {
      const w = new THREE.Group();
      w.position.set(s * 0.17, 0.05, 0);
      w.add(at(mesh(rbox(0.36, 0.05, 0.24, 0.02), gloss(s > 0 ? '#2fa8ff' : '#2fa8ff')), s * 0.18, 0, 0));
      body.add(w);
      return w;
    });
    tail = mesh(rbox(0.1, 0.04, 0.4, 0.02), gloss('#e8263f'));
    tail.position.set(0, -0.08, 0.3);
    body.add(tail);
  } else {
    const color = { cat: '#f29a3a', puppy: '#a8713f', goat: '#f4f1ea' }[id];
    const fur = paint(color, { roughness: 0.8 });
    const size = id === 'goat' ? 1.25 : id === 'puppy' ? 1.05 : 0.95;
    body.scale.setScalar(size);
    body.add(at(mesh(capsule(0.16, 0.42), fur), 0, 0.42, 0).rotateX(Math.PI / 2));
    const head = new THREE.Group();
    head.position.set(0, 0.58, -0.36);
    body.add(head);
    head.add(mesh(sphere(0.15, 16, 12), fur));
    eyes(head, 0.07, 0.03, -0.12);
    head.add(at(mesh(sphere(0.035, 8, 6), paint(id === 'goat' ? '#3a2a20' : '#ff8fa3'), false), 0, -0.03, -0.15));
    if (id === 'cat') {
      for (const s of [-1, 1]) {
        const ear = mesh(cached('catEar', () => new THREE.ConeGeometry(0.06, 0.12, 8)), fur);
        ear.position.set(s * 0.08, 0.14, -0.02);
        head.add(ear);
      }
      tail = new THREE.Group();
      tail.position.set(0, 0.5, 0.3);
      tail.add(at(mesh(capsule(0.035, 0.35), fur), 0, 0.18, 0.05));
      body.add(tail);
    } else if (id === 'puppy') {
      for (const s of [-1, 1]) {
        const ear = mesh(capsule(0.05, 0.12), paint('#6b4423', { roughness: 0.8 }));
        ear.position.set(s * 0.13, 0.0, 0);
        ear.rotation.z = s * 0.4;
        head.add(ear);
      }
      head.add(at(mesh(sphere(0.08, 10, 8), fur), 0, -0.05, -0.12));
      tail = new THREE.Group();
      tail.position.set(0, 0.5, 0.3);
      tail.add(at(mesh(capsule(0.03, 0.16), fur), 0, 0.1, 0));
      body.add(tail);
    } else if (id === 'goat') {
      for (const s of [-1, 1]) {
        const horn = mesh(cached('horn', () => new THREE.ConeGeometry(0.035, 0.22, 8)), paint('#8a7a66'));
        horn.position.set(s * 0.07, 0.15, 0.03);
        horn.rotation.x = 0.5;
        head.add(horn);
      }
      head.add(at(mesh(cached('beard', () => new THREE.ConeGeometry(0.04, 0.12, 8)), paint('#e0dccf')), 0, -0.15, -0.08).rotateX(Math.PI));
      head.add(at(mesh(cyl(0.012, 0.012, 0.06, 6), paint('#ffd23f')), 0, -0.12, 0.05));
      head.add(at(mesh(sphere(0.04, 8, 6), gloss('#ffd23f')), 0, -0.17, 0.05)); // bell
    }
    legs = legs4(body, fur, 0.1, 0.17, 0.32);
  }
  return { root, body, legs, wings, tail, flying, id };
}

export function posePet(pet, game) {
  const p = game.player;
  const t = game.time;
  const menu = game.status === 'menu';
  const side = p.lane > 0 ? -1 : 1;
  const tx = menu ? 1.1 : p.x + side * 1.05;
  pet.root.position.x += (tx - pet.root.position.x) * 0.15;
  pet.root.position.z = menu ? 0.3 : 0.7;
  const run = game.status === 'playing' && !p.dead;
  const phase = t * 14;
  if (pet.flying) {
    // The parrot flies at shoulder height and flaps
    const y = (menu ? 1.9 : p.y + 2.0) + Math.sin(t * 4) * 0.1;
    pet.root.position.y += (y - pet.root.position.y) * 0.2;
    const flap = Math.sin(t * (run ? 22 : 8)) * 0.8;
    pet.wings[0].rotation.z = flap;
    pet.wings[1].rotation.z = -flap;
    pet.root.rotation.y = menu ? Math.PI * 0.85 : 0;
  } else {
    const y = menu ? 0 : Math.max(0, p.y * 0.85);
    pet.root.position.y += (y - pet.root.position.y) * 0.25;
    pet.body.position.y = run ? Math.abs(Math.sin(phase)) * 0.08 : 0;
    pet.legs.forEach((leg, i) => (leg.rotation.x = run ? Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.8 : 0));
    pet.root.rotation.y = menu ? Math.PI * 0.8 : 0;
    if (pet.tail) pet.tail.rotation.x = run ? -0.6 + Math.sin(t * 12) * 0.3 : Math.sin(t * 3) * 0.3;
  }
}

// The ghost: a see-through copy of the default runner
let ghostMat = null;
export function makeGhost(loadout) {
  const kid = makeKid(loadout);
  ghostMat ??= new THREE.MeshStandardMaterial({ color: '#8fe8ff', emissive: '#2fb8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.38, depthWrite: false, roughness: 0.3 });
  kid.root.traverse((o) => {
    if (o.isMesh || o.isSprite) {
      o.material = ghostMat;
      o.castShadow = false;
    }
  });
  kid.bubble.visible = false;
  kid.kite.visible = false;
  kid.board.visible = false;
  kid.flames.forEach((f) => (f.visible = false));
  return kid;
}
