// ============================================================
// world.js: the 3D view. It READS the engine state every frame
// and moves meshes to match. It never changes the game itself.
//
// Coordinates: the kid always stands at z = 0 and the world
// comes towards the camera. An object at track position z is
// drawn at  -(z - d)  where d is how far the kid has run.
// The camera sits behind the kid at +z, looking down -z.
// ============================================================
import * as THREE from 'three';
import { LANE_W, T } from '../config.js';
import * as TX from './textures.js';
import * as M from './models.js';
import { Sky, atmosphere } from './sky.js';
import { Props } from './props.js';
import { Rain } from './weather.js';
import { createPost } from './post.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTERS, OUTFITS, BOARDS, findById } from '../catalog.js';
import { ZONES, zoneIndexAt } from '../world-data.js';
import { ghostAt } from '../engine.js';
import { makeSkinnedObstacle, makeRamp, makePad } from './skins.js';
import { makeChaser, makeProjectile, poseChaser } from './chasers.js';
import { makePet, posePet, makeGhost } from './pets.js';
import { Street, Sides, Sea, Arches } from './sides.js';
import { Crowd } from './people.js';
import { Landmarks } from './landmarks.js';

export class GameView {
  constructor(canvas, quality = 'high', loadout = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // filmic colour grading
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#ffd9a8', 55, 180);
    // Soft light from every direction, plus reflections on shiny things
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 900);
    this.camera.position.set(0, 1.6, -4.6);
    this.look = new THREE.Vector3(0, 1.15, 0);
    this.fov = 60;
    this.baseFov = 60;

    this.meshes = new Map(); // engine id -> mesh
    this.pools = new Map();  // reusable meshes by type (no garbage while playing)
    this.frame = 0;
    this.colorCache = new Map();

    this.addLights();
    this.addGround();
    this.street = new Street(this.scene);
    this.sides = new Sides(this.scene);
    this.sea = new Sea(this.scene);
    this.arches = new Arches(this.scene);
    this.crowd = new Crowd(this.scene);
    this.landmarks = new Landmarks(this.scene);
    this.sky = new Sky(this.scene);
    this.props = new Props(this.scene);
    this.rain = new Rain(this.scene);
    this.post = createPost(this.renderer, this.scene, this.camera);

    this.setChaser('mom');
    this.setLoadout(loadout);
    this.particles = M.makeParticles(500);
    this.scene.add(this.particles.points);

    this.size = [1, 1];
    this.setQuality(quality);
  }

  // High: bloom, shadows, smooth edges, sharp pixels. Low: fast on older phones.
  setQuality(q) {
    this.quality = q;
    const high = q === 'high';
    this.renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio || 1, 1.75) : 1);
    this.sun.castShadow = high;
    this.resize(...this.size);
  }

  // Swap the character, outfit or board (used by the shop preview too)
  setLoadout({ char, outfit, board, pet, look } = {}) {
    this.setPet(pet);
    const key = `${char}-${outfit}-${board}-${JSON.stringify(look ?? null)}`;
    if (key === this.loadoutKey) return;
    this.loadoutKey = key;
    if (this.kid) this.scene.remove(this.kid.root, this.kid.blob);
    this.kid = M.makeKid({ char: findById(CHARACTERS, char), outfit: findById(OUTFITS, outfit), board: findById(BOARDS, board), look });
    this.kid.showBoard = true; // stand on the board in the menu
    if (!this.podium) {
      // A glowing ring under the runner on the home screen
      this.podium = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd23f').multiplyScalar(1.8), transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ map: TX.glowTexture(), color: '#ffcf4a', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      glowDisc.rotation.x = -Math.PI / 2;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.12, 48), M.paint('#2a3a7a', { roughness: 0.3, metalness: 0.4 }));
      base.position.y = 0.06;
      ring.position.y = 0.13;
      glowDisc.position.y = 0.025;
      this.podium.add(glowDisc, base, ring);
      this.podium.userData.ring = ring;
      this.scene.add(this.podium);
    }
    this.scene.add(this.kid.root, this.kid.blob);
  }

  // ---------- setup ----------
  addLights() {
    this.hemi = new THREE.HemisphereLight('#d6ecff', '#e2b98a', 1.5);
    this.scene.add(this.hemi);
    // A rim light from in front of the kid outlines him with a warm edge
    this.rim = new THREE.DirectionalLight('#ffe2c4', 1.1);
    this.rim.position.set(0, 6, -14);
    this.scene.add(this.rim);
    const sun = new THREE.DirectionalLight('#fff0d4', 2.3);
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 3;
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 24, bottom: -10, near: 1, far: 70 });
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  addGround() {
    this.groundMat = M.paint('#e4c79d');
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 900), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -400);
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  // The chaser model (Mom, Dad or the Principal) is rebuilt when it changes
  setChaser(type) {
    if (this.chaserType === type) return;
    if (this.chaser) this.scene.remove(this.chaser.root);
    this.chaserType = type;
    this.chaser = makeChaser(type);
    this.scene.add(this.chaser.root);
  }

  setPet(id) {
    if (this.petId === id) return;
    if (this.pet) this.scene.remove(this.pet.root);
    this.petId = id;
    this.pet = id && id !== 'none' ? makePet(id) : null;
    if (this.pet) this.scene.add(this.pet.root);
  }

  setGhost(ghost) {
    const key = ghost ? `${ghost.seed}-${ghost.score}-${ghost.char}` : null;
    if (key === this.ghostKey) return;
    this.ghostKey = key;
    if (this.ghost) this.scene.remove(this.ghost.root);
    this.ghost = null;
    if (!ghost) return;
    const char = findById(CHARACTERS, ghost.char ?? 'ali');
    this.ghost = makeGhost({ char, outfit: findById(OUTFITS, 'cricket'), board: findById(BOARDS, 'classic') });
    this.scene.add(this.ghost.root);
  }

  // ---------- per frame ----------
  resize(w, h) {
    this.size = [w, h];
    this.renderer.setSize(w, h, false);
    const ratio = this.renderer.getPixelRatio();
    this.post.setSize(w * ratio, h * ratio);
    this.camera.aspect = w / h;
    this.baseFov = w / h < 1 ? 74 : 58; // see more on a tall phone screen
    this.camera.updateProjectionMatrix();
  }

  // Get the mesh for an engine object, reusing one from the pool if we can
  use(id, key, make) {
    let m = this.meshes.get(id);
    if (!m) {
      const pool = this.pools.get(key);
      m = pool && pool.length ? pool.pop() : make();
      m.userData.poolKey = key;
      m.visible = true;
      if (!m.parent) this.scene.add(m);
      this.meshes.set(id, m);
    }
    m.userData.frame = this.frame;
    return m;
  }

  releaseUnused(all = false) {
    for (const [id, m] of this.meshes) {
      if (all || m.userData.frame !== this.frame) {
        m.visible = false;
        this.meshes.delete(id);
        const key = m.userData.poolKey;
        if (!this.pools.has(key)) this.pools.set(key, []);
        this.pools.get(key).push(m);
      }
    }
  }

  // A new run: put the road and scenery back to the start for this chapter
  reset(chapter = null) {
    this.releaseUnused(true);
    this.chapter = chapter;
    this.street.reset(chapter);
    this.sides.reset(chapter);
    this.props.reset(chapter);
    this.arches.reset();
    this.crowd.reset(chapter, 0);
  }

  render(game, dt) {
    this.frame++;
    const d = game.d;
    const t = game.time;
    const atm = atmosphere(game.skyTime, game.weather.rain);

    this.applyAtmosphere(atm, game);

    const chapter = game.chapter;
    if (chapter !== this.chapter) this.reset(chapter);
    this.setChaser(game.chaser);
    this.setGhost(game.status === 'menu' ? null : game.ghost);
    const zone = ZONES[game.zone ?? 0].id;
    this.sky.setBackdrop({ beach: 'beach', mountain: 'mountain', newyork: 'skyscrapers', vegas: 'vegas', losangeles: 'hills' }[zone] ?? 'city');

    this.street.update(d, chapter, atm.rain);
    this.sides.update(d, chapter, atm);
    this.sea.update(d, chapter, t, atm.night);
    this.arches.update(d, chapter);
    this.props.update(d, atm, chapter);
    this.crowd.update(d, chapter, game, dt);
    this.landmarks.update(d, chapter, t);

    for (const o of game.obstacles) {
      const variant = o.type === 'truck' ? Math.floor(o.seed * 3) : 0;
      const oz = o.zone ?? 0;
      const m = this.use(o.id, `${o.type}${variant}-${oz}`, () => (o.ramp ? makeRamp(ZONES[oz].id) : o.pad ? makePad() : makeSkinnedObstacle(o.type, variant, ZONES[oz].id)));
      const f = o.fly;
      m.position.set(o.lane * LANE_W + (f ? f.x : 0), f ? f.y : 0, -(o.z - d));
      // Parked vehicles face away (you see the painted back), oncoming ones face you
      const vehicle = o.type === 'truck' || o.type === 'rickshaw';
      m.rotation.set(f ? f.rx : 0, vehicle && !o.moving ? Math.PI : 0, 0);
      if (o.moving && m.userData.wheels) for (const w of m.userData.wheels) w.rotation.x += (game.speed + o.vz) * dt * 2.5;
      if (m.userData.surface) {
        // The pad's top dips and springs back when you bounce
        m.userData.surface.position.y = o.used ? 0.2 - Math.max(0, Math.sin(Math.min(Math.PI, (game.d - o.z) * 0.6))) * 0.15 : 0.2;
        m.userData.arrow.position.y = 0.3 + Math.abs(Math.sin(t * 6)) * 0.25;
      }
      if (m.userData.sway) m.userData.sway.rotation.x = Math.sin(t * 3 + o.seed * 6) * 0.12;
    }

    for (const k of game.pickups) {
      if (k.type === 'samosa') {
        const m = this.use(k.id, 'samosa', M.makeSamosa);
        m.position.set(k.x, k.y + Math.sin(t * 4 + k.z) * 0.08, -(k.z - d));
        m.rotation.y = t * 3 + k.z;
        m.userData.sparkle.scale.setScalar(0.18 + Math.max(0, Math.sin(t * 5 + k.z * 1.3)) * 0.3);
      } else if (k.type === 'key') {
        const m = this.use(k.id, 'key', M.makeKey);
        m.position.set(k.x, k.y + Math.sin(t * 3) * 0.15, -(k.z - d));
        m.rotation.y = t * 2.5;
      } else if (k.type === 'ball') {
        const m = this.use(k.id, 'ball', M.makeBall);
        m.position.set(k.x, k.y, -(k.z - d));
        m.rotation.set(t * 9, t * 4, 0);
      } else {
        const m = this.use(k.id, `power-${k.type}`, () => M.makePower(k.type));
        m.position.set(k.x, k.y + 0.3 + Math.sin(t * 3) * 0.15, -(k.z - d));
        m.rotation.y = t * 1.5;
        m.userData.halo.rotation.x = t * 2;
      }
    }

    for (const c of game.decor) {
      const m = this.use(c.id, 'puddle', M.makePuddle);
      m.position.set(c.lane * LANE_W, 0.015, -(c.z - d));
      m.scale.set(c.size, c.size * 1.6, 1);
    }

    for (const s of game.strikes) {
      const kind = s.kind ?? 'slipper';
      const m = this.use(s.id, 'strike-' + kind, () => {
        const g = M.makeStrike();
        if (kind !== 'slipper') {
          // Swap the slipper for a newspaper or a book
          const old = g.userData.slipper;
          const thing = makeProjectile(kind);
          thing.position.copy(old.position);
          old.parent.add(thing);
          old.parent.remove(old);
          g.userData.slipper = thing;
        }
        return g;
      });
      const { marker, slipper, ringMat } = m.userData;
      const x = s.lane * LANE_W;
      const f = Math.min(1, Math.max(0, 1 - s.t / s.max));
      marker.position.set(x, 0.05, 0);
      marker.scale.setScalar(1 + Math.sin(t * 22) * 0.08);
      ringMat.opacity = s.t > 0 ? 0.9 : Math.max(0, 1 + s.t * 2);
      slipper.visible = s.t > 0;
      // Flies in from behind and above the camera in an arc
      slipper.position.set(x + 1.2 * (1 - f), 7 * (1 - f) + 0.25 * f + Math.sin(Math.PI * f) * 2.5, 10 * (1 - f));
      slipper.rotation.set(t * 14, 0, t * 6);
    }
    for (const b of game.balloons) {
      const m = this.use(b.id, `balloon-${b.color}`, () => M.makeBalloon(b.color));
      m.position.set(b.x, b.y, -(b.z - d));
      m.rotation.set(t * 8, 0, t * 5);
    }
    this.releaseUnused();

    this.kid.calm = game.status === 'menu' && this.focus === 'face';
    if (this.podium) {
      this.podium.visible = game.status === 'menu';
      this.podium.userData.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
      this.podium.rotation.y = t * 0.6;
    }
    M.poseKid(this.kid, game);
    poseChaser(this.chaser, game);
    if (this.pet) posePet(this.pet, game);
    this.poseGhost(game);
    this.updateParticles(game);
    this.updateCamera(game, dt);
    this.sky.update(atm, game, this.camera, dt);
    this.rain.update(atm.rain, game, dt);

    const p = game.player;
    this.sun.position.set(p.x - 7, 17, 9);
    this.sun.target.position.set(p.x, 0, -7);

    if (this.quality === 'high') {
      // Glow gets stronger at night when lamps and signs are lit
      this.post.bloom.strength = 0.35 + atm.night * 0.55 + game.flash * 0.6;
      this.post.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  applyAtmosphere(atm, game) {
    this.scene.fog.color.copy(atm.fog);
    this.scene.fog.near = 55 - atm.rain * 25;
    this.scene.fog.far = 180 - atm.rain * 70;
    this.hemi.color.copy(atm.hemiSky);
    this.hemi.groundColor.copy(atm.hemiGround);
    // Darker inside tunnels (the tunnel's own lamps glow)
    const tunnel = this.landmarks ? this.landmarks.insideTunnel(game.d, game.chapter) : 0;
    this.hemi.intensity = (atm.hemiInt * 0.6 + game.flash * 2.5) * (1 - tunnel * 0.55);
    this.scene.environmentIntensity = 0.18 + (1 - atm.night) * 0.3;
    this.rim.intensity = 0.5 + atm.sunInt * 0.3;
    this.sun.color.copy(atm.sun);
    this.sun.intensity = atm.sunInt * 1.25 * (1 - tunnel * 0.85);

    // The ground far away matches the place: sand, grass or gravel
    const zone = ZONES[game.zone ?? 0].id;
    const ground = { bazaar: '#e4c79d', beach: '#f0d29a', mountain: '#7fae5a', railway: '#9a8f86', newyork: '#7a7a86', vegas: '#d9a77a', losangeles: '#e8c48a' }[zone] ?? '#e4c79d';
    this.groundMat.color.set(ground).multiplyScalar(1 - atm.night * 0.5);
  }

  // The ghost runner replays a recorded run, drawn where it is
  // compared with you (ahead of you = further down the road)
  poseGhost(game) {
    const gh = this.ghost;
    if (!gh) return;
    const show = game.ghost && game.status !== 'menu' && game.time > 0;
    gh.root.visible = gh.blob.visible = !!show;
    if (!show) return;
    const g = ghostAt(game.ghost, game.time);
    const z = -(g.d - game.d);
    gh.root.visible = !g.done && z > -150 && z < 8;
    // #14 when the ghost is right on top of you, draw it half a lane to the
    // side so you can still see it (it's only a picture, it can't be hit)
    const p = game.player;
    const close = Math.abs(z) < 4 && Math.abs(g.x - p.x) < 0.8 && Math.abs(g.y - p.y) < 1;
    this.ghostSide = this.ghostSide ?? 0;
    const side = close ? (p.x <= 0 ? 1.15 : -1.15) : 0;
    this.ghostSide += (side - this.ghostSide) * 0.12;
    gh.root.position.set(g.x + this.ghostSide, g.y, z);
    gh.blob.visible = false;
    const phase = game.time * 13;
    gh.hips.position.y = 0.88 + Math.abs(Math.sin(phase)) * 0.06;
    gh.legs.forEach((l, i) => {
      const sw = Math.sin(phase + i * Math.PI);
      l.upper.rotation.x = sw * 0.9;
      l.knee.rotation.x = Math.max(0, -sw) * 1.1;
    });
    gh.arms.forEach((a, i) => {
      a.shoulder.rotation.x = -Math.sin(phase + i * Math.PI) * 0.8;
      a.elbow.rotation.x = -0.9;
    });
  }

  updateParticles(game) {
    const { pos, col, geo, max } = this.particles;
    const n = Math.min(max, game.particles.length);
    for (let i = 0; i < n; i++) {
      const pt = game.particles[i];
      pos[i * 3] = pt.x;
      pos[i * 3 + 1] = pt.y;
      pos[i * 3 + 2] = -(pt.z - game.d);
      let c = this.colorCache.get(pt.color);
      if (!c) {
        c = new THREE.Color(pt.color);
        this.colorCache.set(pt.color, c);
      }
      const fade = Math.max(0, pt.life / pt.max) * 1.3;
      col[i * 3] = c.r * fade;
      col[i * 3 + 1] = c.g * fade;
      col[i * 3 + 2] = c.b * fade;
    }
    geo.setDrawRange(0, n);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  updateCamera(game, dt) {
    const p = game.player;
    const cam = this.camera;
    const target = new THREE.Vector3();
    const look = new THREE.Vector3();

    // Field of view widens with speed and turbo, narrows in Chai Time
    let fov = this.baseFov + (game.speed - T.startSpeed) * 0.35;
    if (game.power.turbo > 0) fov += 10;
    if (game.power.chai > 0) fov -= 6;
    this.fov += (fov - this.fov) * Math.min(1, dt * 4);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }

    // #10 A panel is open: frame the whole runner, then slide the picture
    // so he sits in the free part of the screen (above the panel on a
    // phone, left of it when the phone is sideways).
    const sheetOpen = game.status === 'menu' && this.focus;
    const portrait = cam.aspect < 1;
    const shiftTarget = sheetOpen ? (portrait ? [0, 0.3] : [0.27, 0]) : [0, 0];
    this.shift ??= [0, 0];
    const ks = 1 - Math.exp(-dt * 6);
    this.shift[0] += (shiftTarget[0] - this.shift[0]) * ks;
    this.shift[1] += (shiftTarget[1] - this.shift[1]) * ks;
    const [w, h] = this.size;
    if (Math.abs(this.shift[0]) + Math.abs(this.shift[1]) > 0.002) cam.setViewOffset(w, h, w * this.shift[0], h * this.shift[1], w, h);
    else if (cam.view?.enabled) cam.clearViewOffset();

    if (sheetOpen && this.focus === 'face') {
      // Close-up on the face while you style it
      this.kid.head.getWorldPosition(look);
      look.y += 0.1;
      target.set(look.x + 0.15, look.y + 0.02, -1.7);
    } else if (sheetOpen) {
      target.set(0.5, 1.35, portrait ? -4.8 : -4.2);
      look.set(0, 1.0, 0);
    } else if (game.status === 'menu') {
      target.set(Math.sin(game.time * 0.4) * 0.6, 1.45, cam.aspect < 1 ? -4.6 : -4.0);
      look.set(0, cam.aspect < 1 ? 2.2 : 1.9, 0); // aim above the kid so he sits low, under the logo
    } else if (game.status === 'playing' && game.time < 1.2) {
      // Swoop around from the front to behind the kid
      const f = game.time / 1.2;
      const e = f * f * (3 - 2 * f);
      const angle = Math.PI * (1 - e);
      const radius = 4.6 + 0.9 * e;
      // #4 swing round on a tighter circle and keep looking at the runner until
      // the very end, so he never slips off the edge of a narrow phone screen
      cam.position.set(p.x + Math.sin(angle) * radius * 0.45, 1.6 + 2.0 * e, Math.cos(angle) * radius);
      this.look.set(p.x, 1.1, 0).lerp(look.set(p.x * 0.8, 0.9, -12), e * e * e);
      cam.lookAt(this.look);
      return;
    } else if (game.status === 'playing') {
      // High behind the runner, looking down the lanes so you see what's coming
      target.set(p.x * 0.7, 3.6 + p.y * 0.8, 5.5);
      look.set(p.x * 0.8, 0.9 + p.y * 0.8, -12);
    } else {
      // Caught: swing round to the left so we see Mom grab the kid
      target.set(p.x - 3.3, 2.4, 2.2);
      look.set(p.x + 0.4, 0.9, 0.4);
    }
    const k = 1 - Math.exp(-dt * (game.status === 'playing' ? 8 : 3));
    cam.position.lerp(target, k);
    this.look.lerp(look, k);
    if (game.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * game.shake * 0.6;
      cam.position.y += (Math.random() - 0.5) * game.shake * 0.6;
    }
    cam.lookAt(this.look);
  }

  dispose() {
    this.renderer.dispose();
  }
}
