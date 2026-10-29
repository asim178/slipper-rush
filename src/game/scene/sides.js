// ============================================================
// sides.js: the road and everything along it, for every place.
//
//  Street  - the road is made of 12 m tiles. Each tile takes the
//            look of the place it is in, so the bazaar road turns
//            into a beach road, a mountain road or railway tracks
//            exactly where the place changes.
//  Sides   - buildings and scenery on both sides, recycled and
//            chosen by place (houses, beach huts and palms, stone
//            houses and pines, station platforms and trains).
//  Sea     - an animated water shader next to the beach.
//  Arches  - the welcome arch at the start of each place, and the
//            finish line in story mode.
// ============================================================
import * as THREE from 'three';
import { LANE_W } from '../config.js';
import { ZONES, zoneIndexAt, zoneStarts } from '../world-data.js';
import * as TX from './textures.js';
import { paint, glow, rbox, sphere, cyl, mesh, at, gloss, glass, cached } from './models.js';
import { makeArch, setArchText } from './skins.js';

const ROAD_HALF = (LANE_W * 3) / 2; // 3.6 m
const SIDEWALK_W = 2.4;
const FRONT = ROAD_HALF + SIDEWALK_W; // 6 m: where buildings start
const TILE = 12;
const TILE_COUNT = 24;

// ------------------------------------------------------------
export class Street {
  constructor(scene) {
    this.scene = scene;
    this.mats = {
      bazaar: this.makeMats(TX.roadTexture(), '#ffffff', TX.curbTexture()),
      beach: this.makeMats(TX.roadTexture('#6d625a', '#ffffff'), '#f6deb0', TX.curbTexture('#ffffff', '#2fa8ff')),
      mountain: this.makeMats(TX.roadTexture('#3d3b46', '#ffffff'), '#cfc8bb', TX.curbTexture('#ffffff', '#e8263f')),
      railway: this.makeMats(TX.railTexture(), '#c9c9cf', TX.curbTexture('#ffd23f', '#ffd23f')),
      newyork: this.makeMats(TX.roadTexture('#34343e', '#ffd23f'), '#b8b8c4', TX.curbTexture('#ffd23f', '#34343e')),
      vegas: this.makeMats(TX.roadTexture('#2b2633', '#ff3bd4'), '#e6c9a8', TX.curbTexture('#ff3bd4', '#39c6ff')),
      losangeles: this.makeMats(TX.roadTexture('#4a4556', '#ffffff'), '#f2dcc0', TX.curbTexture('#ffffff', '#ff7a59')),
    };
    this.tiles = [];
    const roadGeo = new THREE.PlaneGeometry(ROAD_HALF * 2, TILE);
    const walkGeo = new THREE.PlaneGeometry(SIDEWALK_W, TILE);
    const curbGeo = new THREE.PlaneGeometry(TILE, 0.16);
    for (let i = 0; i < TILE_COUNT; i++) {
      const group = new THREE.Group();
      const road = new THREE.Mesh(roadGeo, this.mats.bazaar.road);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      group.add(road);
      const walks = [];
      const curbs = [];
      for (const side of [-1, 1]) {
        const walk = new THREE.Mesh(walkGeo, this.mats.bazaar.walk);
        walk.rotation.x = -Math.PI / 2;
        walk.position.set(side * (ROAD_HALF + SIDEWALK_W / 2), 0.16, 0);
        walk.receiveShadow = true;
        const curb = new THREE.Mesh(curbGeo, this.mats.bazaar.curb);
        curb.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        curb.position.set(side * ROAD_HALF, 0.08, 0);
        group.add(walk, curb);
        walks.push(walk);
        curbs.push(curb);
      }
      scene.add(group);
      this.tiles.push({ group, road, walks, curbs, z: 0 });
    }
    this.reset(null);
  }

  makeMats(roadTex, walkTint, curbTex) {
    roadTex.repeat.set(1, 1);
    const walkTex = TX.sidewalkTexture();
    walkTex.repeat.set(1, TILE / SIDEWALK_W);
    curbTex.repeat.set(TILE / 1.5, 1);
    return {
      road: paint('#ffffff', { map: roadTex, roughness: 0.85 }),
      walk: paint(walkTint, { map: walkTex, roughness: 0.8 }),
      curb: paint('#ffffff', { map: curbTex, roughness: 0.6 }),
    };
  }

  dress(tile, chapter) {
    const m = this.mats[ZONES[zoneIndexAt(tile.z + TILE / 2, chapter)].id];
    tile.road.material = m.road;
    tile.walks.forEach((w) => (w.material = m.walk));
    tile.curbs.forEach((c) => (c.material = m.curb));
  }

  reset(chapter) {
    this.tiles.forEach((t, i) => {
      t.z = -24 + i * TILE;
      this.dress(t, chapter);
    });
  }

  update(d, chapter, rain) {
    for (const t of this.tiles) {
      if (t.z + TILE < d - 24) {
        t.z += TILE * TILE_COUNT;
        this.dress(t, chapter);
      }
      t.group.position.z = -(t.z + TILE / 2 - d);
    }
    for (const m of Object.values(this.mats)) m.road.color.setScalar(1 - rain * 0.3); // a wet road is darker
  }
}

// ------------------------------------------------------------
const HOUSE_COLORS = ['#ff7aa8', '#4fd1c5', '#ffd166', '#7fb2ff', '#ff9f68', '#b693f5', '#8be28b', '#ff6b6b', '#5ec2ff'];
const SIGNS = [['TEA', '#e8364f'], ['TAILOR', '#1a9e8f'], ['BAKERY', '#ff8a00'], ['SWEETS', '#d61f6b'], ['PHONES', '#3d5afe'], ['BARBER', '#20a35a'], ['GROCERY', '#8a5cff'], ['JUICE', '#ff3b5c']];
const BEACH_SIGNS = [['SURF', '#2fa8ff'], ['COCONUTS', '#20a35a'], ['KULFI', '#ff4f8b'], ['SNACKS', '#ff8a00'], ['CHAI', '#e8364f']];
const HUT_COLORS = ['#ff8fc0', '#7fd6ff', '#ffe066', '#9be8a8', '#ffb37a'];
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];

// What kind of scenery goes where
function sceneryType(zone, side) {
  if (zone === 'newyork') return 'tower';
  if (zone === 'vegas') return Math.random() < 0.75 ? 'neon' : 'tower';
  if (zone === 'losangeles') return side > 0 ? 'palms' : 'house';
  if (zone === 'beach') return side > 0 ? 'palms' : 'hut';
  if (zone === 'mountain') return Math.random() < 0.55 ? 'stonehouse' : 'pines';
  if (zone === 'railway') return 'platform';
  return 'house';
}

export class Sides {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.pools = new Map();
    this.signMats = new Map();
    this.houseMats = [];
    this.facade = TX.facadeTexture();
    this.stone = TX.stoneTexture();
    this.windowLights = [TX.windowLightsTexture(), TX.windowLightsTexture(), TX.windowLightsTexture()];
    this.reset(null);
  }

  signMaterial(text, bg) {
    const key = text + bg;
    if (!this.signMats.has(key)) {
      const tex = TX.signTexture(text, bg);
      // The sign texture is also its glow map, so it lights up like neon at night
      this.signMats.set(key, paint('#ffffff', { map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0 }));
    }
    return this.signMats.get(key);
  }

  reset(chapter) {
    for (const it of this.items) this.release(it);
    this.items = [];
    this.frontZ = { '-1': -25, '1': -25 };
    this.chapter = chapter;
  }

  release(it) {
    it.group.visible = false;
    const key = it.type + it.side;
    if (!this.pools.has(key)) this.pools.set(key, []);
    this.pools.get(key).push(it);
  }

  spawn(side) {
    const z0 = this.frontZ[side];
    const zone = ZONES[zoneIndexAt(z0 + 5, this.chapter)].id;
    const type = sceneryType(zone, side);
    const pool = this.pools.get(type + side);
    const it = pool && pool.length ? pool.pop() : this.build(type, side);
    it.group.visible = true;
    this.place(it, z0);
    this.items.push(it);
    this.frontZ[side] = z0 + it.len + (type === 'platform' ? 0 : 0.3);
  }

  update(d, chapter, atm) {
    if (chapter !== this.chapter) this.reset(chapter);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.z + it.len / 2 < d - 25) {
        this.release(it);
        this.items.splice(i, 1);
      }
    }
    for (const side of [-1, 1]) while (this.frontZ[side] < d + 240) this.spawn(side);
    for (const it of this.items) it.group.position.z = -(it.z - d);

    // Windows and neon signs light up after sunset
    const glowLevel = Math.max(0, (atm.night - 0.25) / 0.75);
    for (const m of this.houseMats) m.emissiveIntensity = glowLevel * 1.1;
    for (const m of this.signMats.values()) m.emissiveIntensity = 0.1 + glowLevel * 1.4;
  }

  // ---------- builders ----------
  build(type, side) {
    const group = new THREE.Group();
    group.position.x = side * FRONT;
    this.scene.add(group);
    const it = { type, side, group, z: 0, len: 8 };
    const facing = side > 0 ? -Math.PI / 2 : Math.PI / 2; // turn signs to face the road
    const s = side;

    if (type === 'house') {
      const map = this.facade.clone();
      map.needsUpdate = true;
      const lit = pickOf(this.windowLights).clone();
      lit.needsUpdate = true;
      const mat = paint('#ffffff', { map, emissiveMap: lit, emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.75 });
      this.houseMats.push(mat);
      const body = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), mat);
      const cornice = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), paint('#f7f2ea'));
      const sign = new THREE.Mesh(cached('signplane', () => new THREE.PlaneGeometry(3, 0.75)), paint('#ffffff'));
      sign.rotation.y = facing;
      const awning = mesh(rbox(0.9, 0.1, 1, 0.03), paint('#ffffff'));
      const balcony = mesh(rbox(0.7, 0.14, 1, 0.04), paint('#f7f2ea'));
      const rail = mesh(rbox(0.05, 0.5, 1, 0.02), paint('#ffffff'));
      const tank = mesh(cyl(0.6, 0.6, 1.0, 14), paint('#2b2b33', { roughness: 0.4 }));
      const door = new THREE.Mesh(cached('doorplane', () => new THREE.PlaneGeometry(1.1, 2.0)), paint('#5a3a2a'));
      door.rotation.y = facing;
      group.add(body, cornice, sign, awning, balcony, rail, tank, door);
      // Street life on the house: AC units, a satellite dish, potted plants,
      // a washing line with clothes, a low wall on the roof and a fruit stall
      const grey = paint('#c9ccd6', { roughness: 0.5, metalness: 0.3 });
      const acs = [0, 1].map(() => {
        const ac = new THREE.Group();
        ac.add(mesh(rbox(0.36, 0.42, 0.62, 0.04), grey));
        ac.add(at(mesh(cyl(0.16, 0.16, 0.02, 14), paint('#5a5f6e'), false), -s * 0.19, 0, 0).rotateZ(Math.PI / 2));
        group.add(ac);
        return ac;
      });
      const dish = new THREE.Group();
      const bowl = mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), paint('#eef0f4', { side: THREE.DoubleSide, roughness: 0.4 }));
      bowl.rotation.z = -s * 1.0;
      dish.add(bowl, at(mesh(cyl(0.03, 0.03, 0.6, 6), grey), 0, -0.3, 0));
      group.add(dish);
      const pots = [0, 1, 2].map(() => {
        const pot = new THREE.Group();
        pot.add(mesh(cyl(0.13, 0.1, 0.22, 10), paint('#c0582f', { roughness: 0.8 })));
        pot.add(at(mesh(new THREE.IcosahedronGeometry(0.18, 0), paint(pickOf(['#3aa84f', '#2f9e44', '#ff4f8b', '#ffd23f']), { flatShading: true })), 0, 0.22, 0));
        group.add(pot);
        return pot;
      });
      const laundry = new THREE.Group();
      laundry.add(at(mesh(cyl(0.01, 0.01, 4, 4), paint('#ffffff'), false), 0, 0, 0).rotateX(Math.PI / 2));
      for (let k = 0; k < 5; k++) {
        const cloth = mesh(rbox(0.03, 0.55 + (k % 2) * 0.2, 0.5, 0.01), paint(pickOf(['#ff3b5c', '#2fa8ff', '#ffd23f', '#ffffff', '#20c25a', '#ff8a00'])), false);
        cloth.position.set(0, -0.3, -1.6 + k * 0.8);
        laundry.add(cloth);
      }
      group.add(laundry);
      const parapet = mesh(rbox(0.18, 0.5, 1, 0.03), paint('#f7f2ea'));
      group.add(parapet);
      const stall = new THREE.Group();
      stall.add(at(mesh(rbox(0.7, 0.6, 1.6, 0.05), paint('#8a5a34', { roughness: 0.85 })), 0, 0.3, 0));
      for (let k = 0; k < 8; k++) stall.add(at(mesh(sphere(0.1, 8, 6), paint(pickOf(['#ff3b2f', '#ff9f1a', '#ffd23f', '#6fcf3a'])), false), (k % 2 - 0.5) * 0.3, 0.66, -0.6 + Math.floor(k / 2) * 0.4));
      group.add(stall);
      Object.assign(it, { body, cornice, map, lit, sign, awning, balcony, rail, tank, door, acs, dish, pots, laundry, parapet, stall });
    } else if (type === 'tower' || type === 'neon') {
      // Skyscrapers: tall glass towers. In Las Vegas they glow with neon bands and big signs.
      const neon = type === 'neon';
      const map = (this.office ??= TX.officeTexture()).clone();
      map.needsUpdate = true;
      const lit = pickOf(this.windowLights).clone();
      lit.needsUpdate = true;
      const mat = paint('#ffffff', { map, emissiveMap: lit, emissive: '#ffe2a0', emissiveIntensity: 0, roughness: 0.25, metalness: 0.35 });
      this.houseMats.push(mat);
      const body = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), mat);
      const crown = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), paint('#5a5f6e', { roughness: 0.4, metalness: 0.5 }));
      const spire = mesh(cyl(0.08, 0.2, 4, 8), paint('#c9ccd6', { metalness: 0.8, roughness: 0.3 }));
      const lobby = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), paint('#2b2733', { roughness: 0.3, metalness: 0.4 }));
      const sign = new THREE.Mesh(cached('bigsign', () => new THREE.PlaneGeometry(4.2, 1.2)), paint('#ffffff'));
      sign.rotation.y = facing;
      const bands = [];
      if (neon) {
        for (let k = 0; k < 3; k++) {
          const band = new THREE.Mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), glow(pickOf(['#ff3bd4', '#39c6ff', '#ffd23f', '#7fff6a']), 2.2));
          group.add(band);
          bands.push(band);
        }
      }
      group.add(body, crown, spire, lobby, sign);
      Object.assign(it, { body, crown, spire, lobby, sign, map, lit, bands, neon });
    } else if (type === 'hut') {
      const body = mesh(rbox(4.2, 2.8, 1, 0.12), paint('#ffffff', { roughness: 0.7 }));
      const roof = mesh(cached('hutroof', () => new THREE.CylinderGeometry(2.9, 2.9, 1, 3, 1)), paint('#d9853b', { roughness: 0.9 }));
      roof.rotation.x = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      const stripes = mesh(rbox(4.25, 0.3, 1, 0.05), paint('#ffffff'));
      const sign = new THREE.Mesh(cached('signplane', () => new THREE.PlaneGeometry(3, 0.75)), paint('#ffffff'));
      sign.rotation.y = facing;
      const counter = mesh(rbox(0.6, 0.9, 1, 0.08), paint('#8a5a34', { roughness: 0.85 }));
      const stilts = [];
      for (let k = 0; k < 4; k++) {
        const st = mesh(cyl(0.1, 0.1, 0.8, 8), paint('#8a5a34'));
        group.add(st);
        stilts.push(st);
      }
      group.add(body, roof, stripes, sign, counter);
      Object.assign(it, { body, roof, stripes, sign, counter, stilts });
    } else if (type === 'palms') {
      const items = [];
      for (let k = 0; k < 3; k++) {
        const palm = makePalm();
        group.add(palm);
        items.push(palm);
      }
      const umbrella = new THREE.Group();
      umbrella.add(at(mesh(cyl(0.04, 0.04, 2.4, 6), paint('#ffffff')), 0, 1.2, 0));
      const canopy = mesh(cached('umbrella', () => new THREE.ConeGeometry(1.4, 0.6, 12, 1, true)), paint('#ff4f8b', { side: THREE.DoubleSide, roughness: 0.6 }));
      canopy.position.y = 2.45;
      umbrella.add(canopy);
      const chair = mesh(rbox(0.7, 0.12, 1.6, 0.05), paint('#2fa8ff'));
      chair.position.set(0.6, 0.35, 0.4);
      chair.rotation.x = -0.2;
      group.add(umbrella, chair);
      Object.assign(it, { palms: items, umbrella, canopy, chair });
    } else if (type === 'stonehouse') {
      const map = this.stone.clone();
      map.needsUpdate = true;
      const lit = pickOf(this.windowLights).clone();
      lit.needsUpdate = true;
      const mat = paint('#ffffff', { map, emissiveMap: lit, emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.9 });
      this.houseMats.push(mat);
      const body = mesh(cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1)), mat);
      const roof = mesh(cached('prism', () => new THREE.CylinderGeometry(0.58, 0.58, 1, 3, 1)), paint('#a33a2b', { roughness: 0.7 }));
      roof.rotation.x = Math.PI / 2;
      roof.rotation.z = Math.PI / 2;
      const chimney = mesh(rbox(0.5, 1.2, 0.5, 0.05), paint('#6b6b78'));
      const balcony = mesh(rbox(0.8, 0.12, 1, 0.03), paint('#8a5a34', { roughness: 0.85 }));
      const door = new THREE.Mesh(cached('doorplane', () => new THREE.PlaneGeometry(1.1, 2.0)), paint('#6b4423'));
      door.rotation.y = facing;
      group.add(body, roof, chimney, balcony, door);
      Object.assign(it, { body, roof, chimney, balcony, door, map, lit });
    } else if (type === 'pines') {
      const trees = [];
      for (let k = 0; k < 4; k++) {
        const t = makePine();
        group.add(t);
        trees.push(t);
      }
      const rock = mesh(new THREE.IcosahedronGeometry(0.9, 0), paint('#8d8f99', { flatShading: true, roughness: 0.9 }));
      group.add(rock);
      Object.assign(it, { trees, rock });
    } else if (type === 'platform') {
      it.len = 14;
      const slab = mesh(rbox(5.5, 0.9, 14, 0.08), paint('#bdbdc6', { roughness: 0.8 }));
      slab.position.set(s * 2.75, 0.45, 0);
      const edge = mesh(rbox(0.25, 0.06, 14, 0.02), paint('#ffd23f', { roughness: 0.5 }));
      edge.position.set(s * 0.15, 0.92, 0);
      const roof = mesh(rbox(5.2, 0.18, 13.4, 0.06), paint('#7a2f3a', { roughness: 0.6 }));
      roof.position.set(s * 2.9, 4.6, 0);
      group.add(slab, edge, roof);
      for (const z of [-5.5, 0, 5.5]) {
        group.add(at(mesh(cyl(0.1, 0.1, 3.7, 8), paint('#3a3346', { metalness: 0.5, roughness: 0.4 })), s * 2.9, 2.75, z));
        const bench = mesh(rbox(0.55, 0.12, 1.8, 0.04), paint('#8a5a34'));
        bench.position.set(s * 2.2, 1.35, z + 2.5);
        group.add(bench);
      }
      const sign = mesh(rbox(0.1, 0.7, 3.0, 0.03), paint('#1d4fbf'));
      sign.position.set(s * 1.3, 3.6, -2);
      const face = new THREE.Mesh(cached('signplane', () => new THREE.PlaneGeometry(3, 0.75)), this.signMaterial('PLATFORM 2', '#1d4fbf'));
      face.rotation.y = facing;
      face.position.set(s * 1.24, 3.6, -2);
      const clock = mesh(cyl(0.35, 0.35, 0.12, 20), paint('#ffffff', { roughness: 0.3 }));
      clock.rotation.z = Math.PI / 2;
      clock.position.set(s * 1.3, 3.6, 3.5);
      // A parked train behind the platform
      const train = new THREE.Group();
      train.position.set(s * 7.4, 0, 0);
      const color = pickOf(['#1f7a4a', '#a0202e', '#1f4f9a']);
      train.add(at(mesh(rbox(3, 3.2, 13.6, 0.3), gloss(color)), 0, 2.1, 0));
      train.add(at(mesh(rbox(3.04, 0.25, 13.64, 0.08), gloss('#ffd23f')), 0, 1.4, 0));
      for (let k = 0; k < 6; k++) train.add(at(mesh(rbox(0.05, 0.8, 1.2, 0.04), glass(), false), -s * 1.52, 2.6, -5.5 + k * 2.2));
      group.add(sign, face, clock, train);
      Object.assign(it, { slab, train });
    }
    return it;
  }

  place(it, z0) {
    const s = it.side;
    if (it.type === 'house') {
      const len = 6 + Math.random() * 5;
      const floors = 2 + Math.floor(Math.random() * 3);
      const height = floors * 3 + 0.6;
      it.len = len;
      it.body.scale.set(5, height, len);
      it.body.position.set(s * 2.5, height / 2, 0);
      it.body.material.color.set(pickOf(HOUSE_COLORS));
      it.map.repeat.set(len / 3, height / 3);
      it.lit.repeat.set(len / 12, height / 3);
      it.lit.offset.set(Math.random(), 0);
      it.cornice.scale.set(5.3, 0.35, len + 0.2);
      it.cornice.position.set(s * 2.5, height + 0.1, 0);
      const shop = Math.random() < 0.6;
      it.sign.visible = it.awning.visible = shop;
      if (shop) {
        const [text, bg] = pickOf(SIGNS);
        it.sign.material = this.signMaterial(text, bg);
        it.sign.position.set(-s * 0.03, 2.8, 0);
        it.awning.material = paint(bg);
        it.awning.scale.z = Math.min(len * 0.55, 4);
        it.awning.position.set(-s * 0.45, 2.2, 0);
        it.awning.rotation.z = s * 0.25;
      }
      it.door.position.set(-s * 0.02, 1.0, len * 0.3);
      const balcony = Math.random() < 0.6;
      it.balcony.visible = it.rail.visible = balcony;
      it.balcony.scale.z = it.rail.scale.z = len * 0.7;
      it.balcony.position.set(-s * 0.35, 3.05, -len * 0.05);
      it.rail.position.set(-s * 0.68, 3.35, -len * 0.05);
      it.tank.visible = Math.random() < 0.5;
      it.tank.position.set(s * 3.2, height + 0.75, len * 0.2);
      // Extras, each one only on some houses so no two look the same
      it.acs.forEach((ac, k) => {
        ac.visible = Math.random() < 0.6;
        ac.position.set(-s * 0.2, 3.6 + k * 3 + Math.random() * 0.6, (Math.random() - 0.5) * len * 0.7);
      });
      it.dish.visible = Math.random() < 0.5;
      it.dish.position.set(s * 1.2, height + 0.65, -len * 0.25);
      it.pots.forEach((pot, k) => {
        pot.visible = balcony;
        pot.position.set(-s * 0.4, 3.22, -len * 0.3 + k * 0.6);
      });
      it.laundry.visible = floors > 2 && Math.random() < 0.5;
      it.laundry.position.set(-s * 0.55, 6.7, 0);
      it.parapet.scale.z = len;
      it.parapet.position.set(s * 0.1, height + 0.5, 0);
      it.stall.visible = shop && Math.random() < 0.5;
      it.stall.position.set(-s * 0.9, 0.16, -len * 0.2);
    } else if (it.type === 'tower' || it.type === 'neon') {
      const len = 8 + Math.random() * 5;
      const height = it.neon ? 14 + Math.random() * 14 : 20 + Math.random() * 22;
      it.len = len;
      it.body.scale.set(6, height, len);
      it.body.position.set(s * 3, height / 2, 0);
      it.body.material.color.set(pickOf(it.neon ? ['#ffd6f2', '#d6ecff', '#fff0c8', '#e6dcff'] : ['#ffffff', '#e8f0ff', '#f0e8ff', '#e6fff4', '#fff4e0']));
      it.map.repeat.set(len / 3, height / 3);
      it.lit.repeat.set(len / 12, height / 3);
      it.lit.offset.set(Math.random(), 0);
      it.crown.scale.set(6.4, 0.8, len + 0.4);
      it.crown.position.set(s * 3, height + 0.4, 0);
      it.spire.visible = Math.random() < 0.35;
      it.spire.position.set(s * 3, height + 2.8, 0);
      it.lobby.scale.set(0.4, 3.2, len * 0.9);
      it.lobby.position.set(-s * 0.05, 1.6, 0);
      const signs = it.neon ? [['HOTEL', '#d61f6b'], ['SHOWS', '#8a5cff'], ['DINER', '#e8364f'], ['ARCADE', '#2fa8ff'], ['MOTEL', '#ff7a1a'], ['PIZZA', '#20a35a']] : [['DELI', '#e8364f'], ['PIZZA', '#ff8a00'], ['BAGELS', '#8a5a34'], ['BURGERS', '#20a35a'], ['THEATER', '#d61f6b'], ['COFFEE', '#6b4423']];
      const [text, bg] = pickOf(signs);
      it.sign.material = this.signMaterial(text, bg);
      it.sign.position.set(-s * 0.06, it.neon ? 6 + Math.random() * 4 : 4.2, 0);
      it.bands.forEach((b, k) => {
        b.scale.set(0.12, 0.3, len);
        b.position.set(-s * 0.03, 4 + k * (height / 4), 0);
      });
    } else if (it.type === 'hut') {
      const len = 5 + Math.random() * 2.5;
      it.len = len;
      const color = pickOf(HUT_COLORS);
      it.body.material = paint(color, { roughness: 0.7 });
      it.body.scale.z = len;
      it.body.position.set(s * 2.4, 2.2, 0);
      it.stripes.scale.z = len;
      it.stripes.position.set(s * 2.4, 1.2, 0);
      it.stripes.material = paint('#ffffff');
      it.roof.scale.set(1, len + 0.6, 1);
      it.roof.position.set(s * 2.4, 4.1, 0);
      const [text, bg] = pickOf(BEACH_SIGNS);
      it.sign.material = this.signMaterial(text, bg);
      it.sign.position.set(-s * 0.04, 3.0, 0);
      it.counter.scale.z = len * 0.7;
      it.counter.position.set(-s * 0.2, 0.45, 0);
      it.stilts.forEach((st, k) => st.position.set(s * (k < 2 ? 0.5 : 4.3), 0.4, (k % 2 ? 1 : -1) * len * 0.42));
    } else if (it.type === 'palms') {
      it.len = 7 + Math.random() * 5;
      it.palms.forEach((p, k) => {
        p.position.set(s * (1 + Math.random() * 5), 0, (k - 1) * it.len * 0.3);
        p.rotation.y = Math.random() * 6;
        p.scale.setScalar(0.9 + Math.random() * 0.4);
      });
      it.umbrella.position.set(s * (2.5 + Math.random() * 3), 0, (Math.random() - 0.5) * it.len * 0.6);
      it.canopy.material = paint(pickOf(['#ff4f8b', '#2fa8ff', '#ffd23f', '#20c25a']), { side: THREE.DoubleSide, roughness: 0.6 });
      it.chair.position.set(it.umbrella.position.x + s * 0.8, 0.35, it.umbrella.position.z + 0.5);
    } else if (it.type === 'stonehouse') {
      const len = 6 + Math.random() * 3;
      const height = Math.random() < 0.5 ? 3.6 : 6.6;
      it.len = len;
      it.body.scale.set(5, height, len);
      it.body.position.set(s * 2.5, height / 2, 0);
      it.body.material.color.set(pickOf(['#f2e6d0', '#e6dccb', '#d9d2c5', '#f0e0c0']));
      it.map.repeat.set(len / 3, height / 3);
      it.lit.repeat.set(len / 12, height / 3);
      it.lit.offset.set(Math.random(), 0);
      it.roof.scale.set(5.6 * 1.0, len + 0.6, 2.2);
      it.roof.position.set(s * 2.5, height + 0.55, 0);
      it.roof.material = paint(pickOf(['#a33a2b', '#2f6b4a', '#3a5a9a']), { roughness: 0.7 });
      it.chimney.position.set(s * 3.6, height + 1.0, len * 0.25);
      it.balcony.visible = height > 4;
      it.balcony.scale.z = len * 0.6;
      it.balcony.position.set(-s * 0.4, 3.3, 0);
      it.door.position.set(-s * 0.02, 1.0, -len * 0.25);
    } else if (it.type === 'pines') {
      it.len = 8 + Math.random() * 4;
      it.trees.forEach((t, k) => {
        t.position.set(s * (0.8 + Math.random() * 4), 0, (k - 1.5) * it.len * 0.24);
        t.scale.setScalar(0.8 + Math.random() * 0.6);
      });
      it.rock.position.set(s * (1 + Math.random() * 2), 0.3, (Math.random() - 0.5) * it.len * 0.6);
    } else if (it.type === 'platform') {
      it.train.visible = Math.random() < 0.7;
    }
    it.z = z0 + it.len / 2;
  }
}

function makePalm() {
  const g = new THREE.Group();
  let y = 0;
  const bend = 0.015 + Math.random() * 0.02;
  for (let s = 0; s < 9; s++) {
    const seg = mesh(cyl(0.13 - s * 0.006, 0.15 - s * 0.006, 0.62, 8), paint(s % 2 ? '#8a5a34' : '#9c6a40', { roughness: 0.9 }));
    seg.position.set(s * s * bend, y + 0.3, 0);
    g.add(seg);
    y += 0.58;
  }
  const top = new THREE.Vector3(81 * bend, y, 0);
  const leaf = paint('#3aa84f', { flatShading: true, side: THREE.DoubleSide });
  for (let f = 0; f < 8; f++) {
    const frond = mesh(cached('frond', () => new THREE.ConeGeometry(0.28, 2.2, 4, 1).translate(0, 1.1, 0).scale(1, 1, 0.15)), leaf);
    frond.position.copy(top);
    frond.rotation.set(0, (f / 8) * Math.PI * 2, 1.9);
    g.add(frond);
  }
  return g;
}

function makePine() {
  const g = new THREE.Group();
  g.add(at(mesh(cyl(0.12, 0.16, 1.2, 7), paint('#6b4423', { roughness: 0.9 })), 0, 0.6, 0));
  const mats = [paint('#1f6b45', { flatShading: true }), paint('#2a7d52', { flatShading: true })];
  for (let k = 0; k < 4; k++) {
    const cone = mesh(new THREE.ConeGeometry(1.3 - k * 0.26, 1.5, 8), mats[k % 2]);
    cone.position.y = 1.6 + k * 0.9;
    g.add(cone);
    if (k === 3) g.add(at(mesh(new THREE.ConeGeometry(0.42, 0.5, 8), paint('#ffffff', { roughness: 0.6 })), 0, cone.position.y + 0.55, 0)); // snow cap
  }
  return g;
}

// ------------------------------------------------------------
// The sea beside the beach: waves move the vertices, colour goes
// from shallow turquoise to deep blue, with foam at the shore.
const SEA_VERT = /* glsl */ `
  uniform float time;
  varying vec2 vUv;
  varying float vWave;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 0.18 + time * 1.3) * 0.22 + sin(p.y * 0.23 + time * 0.9) * 0.18;
    p.z += w * smoothstep(0.0, 0.05, uv.x);
    vWave = w;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const SEA_FRAG = /* glsl */ `
  uniform vec3 deep;
  uniform vec3 shallow;
  uniform float time;
  varying vec2 vUv;
  varying float vWave;
  #include <common>
  #include <fog_pars_fragment>
  void main() {
    vec3 col = mix(shallow, deep, smoothstep(0.0, 0.25, vUv.x));
    float foamLine = 0.012 + sin(vUv.y * 90.0 + time * 2.0) * 0.004;
    float foam = smoothstep(0.012, 0.0, abs(vUv.x - foamLine));
    col = mix(col, vec3(1.0), foam * 0.9);
    float sparkle = pow(max(0.0, sin(vUv.x * 1200.0 + time * 3.0) * sin(vUv.y * 900.0 - time * 2.0)), 40.0);
    col += sparkle * 0.8 + vWave * 0.12;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export class Sea {
  constructor(scene) {
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { time: { value: 0 }, deep: { value: new THREE.Color('#0b5fa5') }, shallow: { value: new THREE.Color('#2fd6d0') } },
    ]);
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, fog: true });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(320, 1, 80, 60), mat);
    this.water.rotation.x = -Math.PI / 2;
    this.sand = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paint('#f0d29a', { roughness: 1 }));
    this.sand.rotation.x = -Math.PI / 2;
    this.sand.receiveShadow = true;
    scene.add(this.water, this.sand);
    this.shore = FRONT + 8;
  }

  update(d, chapter, time, night) {
    // Find which part of the visible road is beach
    let from = null;
    let to = null;
    for (let z = d - 30; z <= d + 260; z += 6) {
      if (ZONES[zoneIndexAt(z, chapter)].id === 'beach') {
        if (from === null) from = z;
        to = z + 6;
      }
    }
    const show = from !== null;
    this.water.visible = this.sand.visible = show;
    if (!show) return;
    const len = to - from;
    const zMid = -((from + to) / 2 - d);
    this.water.scale.y = len;
    this.water.position.set(this.shore + 160, 0.04, zMid);
    this.sand.scale.set(this.shore - FRONT + 0.5, len, 1);
    this.sand.position.set((FRONT + this.shore) / 2, 0.02, zMid);
    this.uniforms.time.value = time;
    const dim = 1 - night * 0.65;
    this.uniforms.deep.value.set('#0b5fa5').multiplyScalar(dim);
    this.uniforms.shallow.value.set('#2fd6d0').multiplyScalar(dim);
  }
}

// ------------------------------------------------------------
export class Arches {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = new Map();
  }

  take() {
    const a = this.pool.pop() ?? makeArch();
    if (!a.parent) this.scene.add(a);
    a.visible = true;
    return a;
  }

  update(d, chapter) {
    const wanted = new Map();
    for (const z of zoneStarts(d - 20, d + 230, chapter)) {
      const zone = ZONES[zoneIndexAt(z + 1, chapter)];
      wanted.set(`zone-${z}`, { z, text: `WELCOME TO ${zone.name.toUpperCase()}`, color: zone.color });
    }
    if (chapter && chapter.length > d - 20 && chapter.length < d + 230) {
      wanted.set(`finish-${chapter.length}`, { z: chapter.length, text: 'FINISH', color: '#e8263f', finish: true });
    }
    for (const [key, a] of this.active) {
      if (!wanted.has(key)) {
        a.visible = false;
        if (!a.userData.finishText) this.pool.push(a);
        this.active.delete(key);
      }
    }
    for (const [key, w] of wanted) {
      let a = this.active.get(key);
      if (!a) {
        if (w.finish) {
          a = makeArch();
          this.scene.add(a);
        } else a = this.take();
        setArchText(a, w.text, w.color, w.finish);
        this.active.set(key, a);
      }
      a.position.z = -(w.z - d);
    }
  }

  reset() {
    for (const [key, a] of this.active) {
      a.visible = false;
      if (!a.userData.finishText) this.pool.push(a);
      this.active.delete(key);
    }
  }
}
