// ============================================================
// people.js: people walking along the pavements. They are simple
// (a few shapes each) so a crowd stays cheap on phones. When you
// run past they turn and cheer with their arms up.
// ============================================================
import * as THREE from 'three';
import { LANE_W } from '../config.js';
import { ZONES, zoneIndexAt } from '../world-data.js';
import { mesh, at, sphere, capsule } from './models.js';

const ROAD_HALF = (LANE_W * 3) / 2;
const SKINS = ['#f6d2b8', '#d9a27a', '#c98b5c', '#a86c43', '#7a4a2a'];
const CLOTHES = ['#ff3b5c', '#2f5bea', '#ffd23f', '#20c25a', '#8a5cff', '#ff7a1a', '#13b5a5', '#f4f6fb', '#14121a', '#ff4f8b'];
const HAIR = ['#14110f', '#3a2418', '#6b4423', '#d9a54a', '#9aa0ad'];
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];
const COUNT = 16;
const SPAN = 220; // metres of pavement the crowd is spread over

function makePerson() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // Each person gets their own materials so their colours can change when recycled
  const own = (roughness) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness });
  const shirt = own(0.7);
  const pants = own(0.7);
  const skin = own(0.6);
  const hair = own(0.6);
  body.add(at(mesh(capsule(0.2, 0.42), shirt), 0, 1.12, 0));
  const head = mesh(sphere(0.19, 14, 10), skin);
  head.position.y = 1.62;
  body.add(head);
  const cap = mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  cap.position.y = 1.64;
  body.add(cap);
  const legs = [-1, 1].map((sx) => {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.1, 0.8, 0);
    leg.add(at(mesh(capsule(0.08, 0.5), pants), 0, -0.38, 0));
    body.add(leg);
    return leg;
  });
  const arms = [-1, 1].map((sx) => {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.25, 1.36, 0);
    arm.add(at(mesh(capsule(0.06, 0.4), shirt), 0, -0.27, 0));
    arm.add(at(mesh(sphere(0.07, 8, 6), skin), 0, -0.52, 0));
    body.add(arm);
    return arm;
  });
  return { root, body, legs, arms, mats: { shirt, pants, skin, hair } };
}

export class Crowd {
  constructor(scene) {
    this.people = [];
    for (let i = 0; i < COUNT; i++) {
      const p = makePerson();
      scene.add(p.root);
      this.people.push(p);
    }
    this.reset(null, 0);
  }

  dress(p, d, chapter) {
    p.side = Math.random() < 0.5 ? -1 : 1;
    p.dir = Math.random() < 0.5 ? -1 : 1; // walking with you or towards you
    p.speed = 0.9 + Math.random() * 0.8;
    p.phase = Math.random() * 6;
    p.offset = 0.7 + Math.random() * 1.1; // how far from the kerb (inside tunnel walls)
    p.mats.shirt.color.set(pickOf(CLOTHES));
    p.mats.pants.color.set(pickOf(CLOTHES));
    p.mats.skin.color.set(pickOf(SKINS));
    p.mats.hair.color.set(pickOf(HAIR));
    p.root.scale.setScalar(0.85 + Math.random() * 0.3);
    p.zone = ZONES[zoneIndexAt(p.z, chapter)].id;
  }

  reset(chapter, d) {
    this.people.forEach((p, i) => {
      p.z = d + 10 + (i / COUNT) * SPAN;
      this.dress(p, d, chapter);
    });
  }

  update(d, chapter, game, dt) {
    const t = game.time;
    const playing = game.status === 'playing';
    for (const p of this.people) {
      p.z += p.dir * p.speed * dt;
      if (p.z < d - 15) {
        p.z += SPAN + 20;
        this.dress(p, d, chapter);
      }
      // People stand on the platform at the station and on the pavement elsewhere
      const railway = p.zone === 'railway';
      const x = p.side * (railway ? ROAD_HALF + 2.6 + p.offset : ROAD_HALF + p.offset);
      p.root.position.set(x, railway ? 0.9 : 0.16, -(p.z - d));
      // Cheer when you run past (a few metres ahead or just behind)
      const near = playing && p.z - d < 7 && p.z - d > -3;
      const ph = t * 6 * p.speed + p.phase;
      if (near) {
        p.root.rotation.y = p.side > 0 ? Math.PI / 2 : -Math.PI / 2; // face the road
        p.arms[0].rotation.set(0, 0, -2.6 + Math.sin(t * 14 + p.phase) * 0.3);
        p.arms[1].rotation.set(0, 0, 2.6 - Math.sin(t * 14 + p.phase) * 0.3);
        p.legs.forEach((l) => (l.rotation.x = 0));
        p.body.position.y = Math.abs(Math.sin(t * 9 + p.phase)) * 0.12; // little jumps
      } else {
        p.root.rotation.y = p.dir > 0 ? Math.PI : 0;
        p.legs[0].rotation.x = Math.sin(ph) * 0.6;
        p.legs[1].rotation.x = -Math.sin(ph) * 0.6;
        p.arms[0].rotation.set(-Math.sin(ph) * 0.5, 0, 0);
        p.arms[1].rotation.set(Math.sin(ph) * 0.5, 0, 0);
        p.body.position.y = Math.abs(Math.cos(ph)) * 0.04;
      }
    }
  }
}
