// ============================================================
// props.js: street furniture that repeats along the road:
// poles with decorations strung across the street, street lamps
// and trees. Each one is recycled: when it passes the camera it
// jumps to the far end and dresses up for the place it lands in.
//   bazaar   -> wedding bunting, leafy trees
//   beach    -> blue and white flags, palm trees
//   mountain -> prayer flags, pine trees
//   railway  -> overhead train wires, no trees
// ============================================================
import * as THREE from 'three';
import { LANE_W } from '../config.js';
import { ZONES, zoneIndexAt } from '../world-data.js';
import { paint, mesh, at, cyl, rbox, sphere, cached } from './models.js';
import * as TX from './textures.js';
import { inTunnel } from './landmarks.js';

const ROAD_HALF = (LANE_W * 3) / 2;
const POLE_X = ROAD_HALF + 1.6;

class Recycler {
  constructor(spacing, count, start, onPlace) {
    this.spacing = spacing;
    this.count = count;
    this.start = start;
    this.items = [];
    this.onPlace = onPlace;
  }
  add(item, i) {
    item.z = this.start + i * this.spacing;
    this.items.push(item);
  }
  reset(chapter) {
    this.items.forEach((it, i) => {
      it.z = this.start + i * this.spacing;
      this.onPlace(it, chapter);
    });
  }
  update(d, chapter) {
    for (const it of this.items) {
      if (it.z < d - 15) {
        it.z += this.spacing * this.count;
        this.onPlace(it, chapter);
        it.group.visible = !inTunnel(it.z, chapter); // nothing pokes through a tunnel
      }
      it.group.position.z = -(it.z - d);
    }
  }
}

// Little flags strung along a sagging curve, all in one geometry
function flagString(curve, colors, shape) {
  const pos = [];
  const col = [];
  const c = new THREE.Color();
  for (let j = 1; j < 18; j++) {
    const p = curve.getPoint(j / 18);
    if (shape === 'square') {
      pos.push(p.x - 0.22, p.y, 0, p.x + 0.22, p.y, 0, p.x + 0.22, p.y - 0.4, 0, p.x - 0.22, p.y, 0, p.x + 0.22, p.y - 0.4, 0, p.x - 0.22, p.y - 0.4, 0);
    } else {
      pos.push(p.x - 0.22, p.y, 0, p.x + 0.22, p.y, 0, p.x, p.y - 0.46, 0);
    }
    c.set(colors[j % colors.length]);
    for (let k = 0; k < (shape === 'square' ? 6 : 3); k++) col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}

export class Props {
  constructor(scene) {
    this.scene = scene;
    this.makePoles();
    this.makeLamps();
    this.makeTrees();
  }

  makePoles() {
    const poleMat = paint('#4a4458', { roughness: 0.5, metalness: 0.4 });
    const zoneOf = (it, chapter) => ZONES[zoneIndexAt(it.z, chapter)].id;
    this.poles = new Recycler(34, 7, 20, (it, chapter) => {
      const z = zoneOf(it, chapter);
      it.bunting.visible = z === 'bazaar';
      it.beach.visible = z === 'beach';
      it.prayer.visible = z === 'mountain';
      it.gantry.visible = z === 'railway';
      it.wire.visible = z !== 'railway';
    });
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      for (const x of [-1, 1]) {
        const pole = mesh(cyl(0.09, 0.11, 6.6, 8), poleMat);
        pole.position.set(x * POLE_X, 3.3, 0);
        g.add(pole);
      }
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-POLE_X, 6.3, 0), new THREE.Vector3(0, 4.9, 0), new THREE.Vector3(POLE_X, 6.3, 0));
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.02, 4), poleMat);
      const flatCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-POLE_X, 6.2, 0), new THREE.Vector3(0, 5.5, 0), new THREE.Vector3(POLE_X, 6.2, 0));
      const bunting = flagString(curve, ['#ff3b5c', '#ffd23f', '#13b5a5', '#3d5afe', '#ffffff', '#20c25a'], 'tri');
      const beach = flagString(flatCurve, ['#2fa8ff', '#ffffff', '#ffd23f'], 'tri');
      const prayer = flagString(curve, ['#2f6fd6', '#ffffff', '#e8263f', '#20a35a', '#ffd23f'], 'square');
      // Railway: a steel gantry with the overhead train wires
      const gantry = new THREE.Group();
      gantry.add(at(mesh(rbox(POLE_X * 2 + 0.4, 0.22, 0.22, 0.04), poleMat), 0, 6.5, 0));
      for (let l = -1; l <= 1; l++) {
        gantry.add(at(mesh(cyl(0.012, 0.012, 1.2, 4), poleMat), l * LANE_W, 5.9, 0));
        gantry.add(at(mesh(cached('cat-wire', () => new THREE.CylinderGeometry(0.015, 0.015, 34, 4)), paint('#2b2733')), l * LANE_W, 5.3, -17).rotateX(Math.PI / 2));
      }
      g.add(wire, bunting, beach, prayer, gantry);
      this.scene.add(g);
      this.poles.add({ group: g, wire, bunting, beach, prayer, gantry }, i);
    }
  }

  // Street lamps light up at night: a glowing bulb (bloom does the
  // glow) and a soft pool of light painted on the ground.
  makeLamps() {
    this.lamps = new Recycler(18, 14, 8, () => {});
    this.bulbMat = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
    this.poolMat = new THREE.MeshBasicMaterial({ map: TX.glowTexture(), color: '#ffc46b', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const postMat = paint('#3a3346', { roughness: 0.45, metalness: 0.5 });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 ? 1 : -1;
      const g = new THREE.Group();
      g.position.x = side * (ROAD_HALF + 0.45);
      g.add(at(mesh(cyl(0.07, 0.1, 5, 8), postMat), 0, 2.5, 0));
      g.add(at(mesh(rbox(1.3, 0.07, 0.07, 0.02), postMat), -side * 0.6, 4.95, 0));
      g.add(at(mesh(rbox(0.5, 0.14, 0.32, 0.05), postMat), -side * 1.25, 4.9, 0));
      g.add(at(new THREE.Mesh(sphere(0.13, 10, 8), this.bulbMat), -side * 1.25, 4.78, 0));
      const pool = new THREE.Mesh(cached('lamp-pool', () => new THREE.PlaneGeometry(6, 6)), this.poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-side * 1.25, 0.03, 0);
      g.add(pool);
      this.scene.add(g);
      this.lamps.add({ group: g }, i);
    }
  }

  makeTrees() {
    const trunk = paint('#7a4a2a', { roughness: 0.9 });
    const leaves = [paint('#2f9e44', { flatShading: true }), paint('#40c057', { flatShading: true }), paint('#2b8a3e', { flatShading: true })];
    const pineMat = [paint('#1f6b45', { flatShading: true }), paint('#2a7d52', { flatShading: true })];
    const palmLeaf = paint('#3aa84f', { flatShading: true, side: THREE.DoubleSide });
    this.trees = new Recycler(26, 12, 13, (it, chapter) => {
      const z = ZONES[zoneIndexAt(it.z, chapter)].id;
      it.leafy.visible = z === 'bazaar' || z === 'newyork';
      it.palm.visible = z === 'beach' || z === 'vegas' || z === 'losangeles';
      it.pine.visible = z === 'mountain';
    });
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? -1 : 1;
      const g = new THREE.Group();
      g.position.x = side * (ROAD_HALF + 1.25);
      g.scale.setScalar(0.85 + Math.random() * 0.35);

      const leafy = new THREE.Group();
      leafy.add(at(mesh(cyl(0.13, 0.19, 2.4, 7), trunk), 0, 1.2, 0));
      [[0, 3.0, 0, 1.15], [0.55, 2.6, 0.3, 0.85], [-0.45, 2.7, -0.35, 0.9], [0.1, 3.6, -0.1, 0.75]].forEach(([x, y, z, r], j) => {
        const b = mesh(new THREE.IcosahedronGeometry(r, 0), leaves[j % 3]);
        b.position.set(x, y, z);
        b.rotation.set(Math.random(), Math.random(), Math.random());
        leafy.add(b);
      });

      // Palm: a curved trunk made of segments, and drooping fronds
      const palm = new THREE.Group();
      let y = 0;
      for (let s = 0; s < 8; s++) {
        const seg = mesh(cyl(0.12 - s * 0.006, 0.14 - s * 0.006, 0.6, 8), paint(s % 2 ? '#8a5a34' : '#9c6a40', { roughness: 0.9 }));
        seg.position.set(-side * s * s * 0.012, y + 0.3, 0);
        palm.add(seg);
        y += 0.55;
      }
      const top = new THREE.Vector3(-side * 0.6, y, 0);
      for (let f = 0; f < 7; f++) {
        const frond = mesh(cached('frond', () => new THREE.ConeGeometry(0.28, 2.2, 4, 1).translate(0, 1.1, 0).scale(1, 1, 0.15)), palmLeaf);
        frond.position.copy(top);
        frond.rotation.set(0, (f / 7) * Math.PI * 2, 1.9);
        palm.add(frond);
      }
      for (let k = 0; k < 3; k++) palm.add(at(mesh(sphere(0.12, 8, 6), paint('#6b4423')), top.x + Math.cos(k * 2) * 0.15, y - 0.15, Math.sin(k * 2) * 0.15));

      const pine = new THREE.Group();
      pine.add(at(mesh(cyl(0.12, 0.16, 1.2, 7), trunk), 0, 0.6, 0));
      for (let k = 0; k < 4; k++) {
        const cone = mesh(new THREE.ConeGeometry(1.25 - k * 0.25, 1.4, 8), pineMat[k % 2]);
        cone.position.y = 1.5 + k * 0.85;
        pine.add(cone);
      }

      g.add(leafy, palm, pine);
      this.scene.add(g);
      this.trees.add({ group: g, leafy, palm, pine }, i);
    }
  }

  reset(chapter) {
    this.poles.reset(chapter);
    this.lamps.reset(chapter);
    this.trees.reset(chapter);
  }

  update(d, atm, chapter) {
    this.poles.update(d, chapter);
    this.lamps.update(d, chapter);
    this.trees.update(d, chapter);
    // Bulbs go from dim to bright (values above 1 bloom into a glow)
    const n = atm.night;
    this.bulbMat.color.setRGB(0.9 + n * 3.2, 0.85 + n * 2.6, 0.6 + n * 1.4);
    this.poolMat.opacity = n * 0.55;
  }
}
