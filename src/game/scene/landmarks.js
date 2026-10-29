// ============================================================
// landmarks.js: big things you pass under.
//  - Bridges: a railway bridge over the road; every so often a
//    train rumbles across it above your head.
//  - Tunnels: a 45 m tunnel with lights along the walls. In the
//    mountains it is cut through rock.
// They are only scenery (the engine doesn't know about them), placed
// at fixed distances so they show up in the same spots every run.
// ============================================================
import * as THREE from 'three';
import { LANE_W } from '../config.js';
import { ZONES, zoneIndexAt } from '../world-data.js';
import { paint, glow, mesh, at, rbox, cyl, gloss, glass } from './models.js';

const ROAD_HALF = (LANE_W * 3) / 2;
const FRONT = ROAD_HALF + 2.4;
const BRIDGE_EVERY = 700;
const BRIDGE_FIRST = 300;
const TUNNEL_EVERY = 1000;
const TUNNEL_FIRST = 620;
const TUNNEL_LEN = 45;
const WALL_X = ROAD_HALF + 2.15; // on the pavement, just in front of the houses

// Where the next landmark of a kind is, at or after track position z
const nextAt = (z, first, every) => (z <= first ? first : first + Math.ceil((z - first) / every) * every);

function makeBridge() {
  const g = new THREE.Group();
  const concrete = paint('#b9b4c4', { roughness: 0.85 });
  const steel = paint('#3a3346', { roughness: 0.4, metalness: 0.5 });
  // Deck across the road and over the houses
  g.add(at(mesh(rbox(40, 1.6, 4.6, 0.1), concrete), 0, 10.2, 0));
  g.add(at(mesh(rbox(40, 0.4, 4.8, 0.05), paint('#ff7a1a')), 0, 9.4, 0)); // orange stripe
  for (const z of [-2.0, 2.0]) {
    g.add(at(mesh(rbox(40, 0.9, 0.12, 0.03), steel), 0, 11.45, z * 1.1)); // railings
    for (let x = -19; x <= 19; x += 2) g.add(at(mesh(cyl(0.04, 0.04, 0.9, 6), steel, false), x, 11.45, z * 1.1));
  }
  // Pillars on both sides of the road
  for (const x of [-(FRONT - 0.6), FRONT - 0.6]) {
    g.add(at(mesh(rbox(1.0, 9.6, 3.2, 0.12), concrete), x, 4.8, 0));
    // Steel arch braces from the pillar up to the deck
    const brace = mesh(rbox(0.25, 3.2, 0.25, 0.05), paint('#ff3b5c'));
    brace.position.set(x * 0.8, 8.0, 1.9);
    brace.rotation.z = Math.sign(x) * 0.6;
    g.add(brace);
    g.add(at(mesh(rbox(1.1, 0.5, 3.4, 0.08), paint('#ffd23f')), x, 0.25, 0));
  }
  // A sign hanging under the deck
  const sign = mesh(rbox(5, 0.9, 0.12, 0.06), paint('#1d4fbf'));
  sign.position.set(0, 8.8, 2.5);
  g.add(sign);
  g.add(at(mesh(rbox(4.6, 0.12, 0.14, 0.03), paint('#ffffff'), false), 0, 8.8, 2.58));
  // The train that crosses (three carriages)
  const train = new THREE.Group();
  const colors = ['#e63946', '#ffb703', '#3a86ff'];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    car.position.x = i * 7.4;
    car.add(at(mesh(rbox(7, 2.6, 2.8, 0.3), gloss(colors[i])), 0, 1.3, 0));
    car.add(at(mesh(rbox(7.02, 0.3, 2.84, 0.1), gloss('#f1faee')), 0, 0.9, 0));
    for (let w = 0; w < 4; w++) car.add(at(mesh(rbox(1.0, 0.7, 2.86, 0.05), glass(), false), -2.4 + w * 1.6, 1.75, 0));
    train.add(car);
  }
  train.position.y = 11.0;
  g.add(train);
  g.userData.train = train;
  return g;
}

function makeTunnel(rock) {
  const g = new THREE.Group();
  const wallMat = rock ? paint('#8d8f99', { roughness: 0.95, flatShading: true }) : paint('#a9a3b6', { roughness: 0.85 });
  const len = TUNNEL_LEN;
  // Walls and roof (the tunnel runs from local z 0 back to -len)
  // (tall enough for the Rocket Bag, which flies at 7.5 m)
  for (const x of [-WALL_X, WALL_X]) {
    g.add(at(mesh(rbox(0.6, 9.8, len, 0.1), wallMat), x, 4.9, -len / 2));
    g.add(at(mesh(rbox(0.65, 1.0, len, 0.05), paint('#ffd23f')), x * 0.995, 0.5, -len / 2)); // yellow kerb stripe
  }
  g.add(at(mesh(rbox(WALL_X * 2 + 0.6, 0.6, len, 0.1), wallMat), 0, 9.9, -len / 2));
  // Lights along both walls
  const lamp = glow('#ffd98a', 2.6);
  for (let z = -2; z > -len; z -= 4.5) {
    for (const x of [-(WALL_X - 0.32), WALL_X - 0.32]) {
      g.add(at(new THREE.Mesh(rbox(0.1, 0.25, 1.4, 0.04), lamp), x, 4.6, z));
      g.add(at(new THREE.Mesh(rbox(0.1, 0.18, 1.0, 0.04), lamp), x, 8.2, z - 2));
    }
  }
  // Entrance: a portal with warning stripes (concrete) or a rocky cliff (mountains)
  const portal = new THREE.Group();
  if (rock) {
    const rockMat = paint('#7f8290', { roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.4, 0), rockMat);
      const a = (i / 13) * Math.PI;
      r.position.set(Math.cos(a) * 7.6, 1 + Math.sin(a) * 9.6, 0.5);
      r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      portal.add(r);
    }
    for (let i = 0; i < 5; i++) portal.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 7), paint('#2a7d52', { flatShading: true })), -6 + i * 3, 13 + Math.random(), 0));
  } else {
    const face = paint('#e6e1ec');
    portal.add(at(mesh(rbox(WALL_X * 2 + 3, 2.2, 1.0, 0.1), face), 0, 10.6, 0));
    for (const x of [-(WALL_X + 0.5), WALL_X + 0.5]) portal.add(at(mesh(rbox(1.6, 10, 1.0, 0.1), face), x, 5, 0));
    for (let i = 0; i < 11; i++) portal.add(at(mesh(rbox(1.0, 0.55, 1.05, 0.02), paint(i % 2 ? '#14121a' : '#ffd23f'), false), -5.5 + i * 1.1, 9.75, 0));
    // A big lit sign over the entrance
    portal.add(at(mesh(rbox(5, 1.1, 0.2, 0.06), paint('#20c25a')), 0, 10.7, 0.55));
    portal.add(at(new THREE.Mesh(rbox(4.4, 0.18, 0.05, 0.02), glow('#ffffff', 1.6)), 0, 10.7, 0.67));
  }
  g.add(portal);
  return g;
}

// Is track position z inside a tunnel? (Street lamps and poles hide there.)
export function inTunnel(z, chapter) {
  const tz = nextAt(z - TUNNEL_LEN, TUNNEL_FIRST, TUNNEL_EVERY);
  if (ZONES[zoneIndexAt(tz + 5, chapter)].id === 'beach') return false;
  return z > tz - 1 && z < tz + TUNNEL_LEN + 1;
}

export class Landmarks {
  constructor(scene) {
    this.scene = scene;
    this.bridge = makeBridge();
    this.tunnels = { rock: makeTunnel(true), concrete: makeTunnel(false) };
    scene.add(this.bridge, this.tunnels.rock, this.tunnels.concrete);
  }

  update(d, chapter, time) {
    // Bridge: the nearest one ahead (or just behind) within view
    const bz = nextAt(d - 30, BRIDGE_FIRST, BRIDGE_EVERY);
    const tz = nextAt(d - TUNNEL_LEN - 10, TUNNEL_FIRST, TUNNEL_EVERY);
    // No bridge where a tunnel already is
    const bridgeShow = bz - d < 260 && !(bz > tz - 20 && bz < tz + TUNNEL_LEN + 20);
    this.bridge.visible = bridgeShow;
    if (bridgeShow) {
      this.bridge.position.z = -(bz - d);
      // A train crosses every 9 seconds, from one side to the other
      const phase = (time % 9) / 9;
      const tr = this.bridge.userData.train;
      tr.visible = phase < 0.55;
      tr.position.x = -45 + phase * 160;
    }
    const zone = ZONES[zoneIndexAt(tz + 5, chapter)].id;
    const tunnelShow = tz - d < 260 && zone !== 'beach'; // no tunnels on the beach
    const rock = zone === 'mountain';
    this.tunnels.rock.visible = tunnelShow && rock;
    this.tunnels.concrete.visible = tunnelShow && !rock;
    const t = rock ? this.tunnels.rock : this.tunnels.concrete;
    // The tunnel's entrance is at tz, and it runs on to tz + TUNNEL_LEN
    t.position.z = -(tz - d);
  }

  // How much of the camera is inside a tunnel (0 or 1), so the world can get darker in there
  insideTunnel(d, chapter) {
    const tz = nextAt(d - TUNNEL_LEN, TUNNEL_FIRST, TUNNEL_EVERY);
    if (ZONES[zoneIndexAt(tz + 5, chapter)].id === 'beach') return 0;
    const into = d - 5.5 - tz; // the camera is about 5.5 m behind you
    if (into < 0 || into > TUNNEL_LEN) return 0;
    return Math.min(1, into / 6, (TUNNEL_LEN - into) / 6);
  }
}
