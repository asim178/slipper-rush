// ============================================================
// sky.js: the sky dome, sun, stars, clouds, distant city,
// kites flying over the rooftops and flocks of birds.
// It also works out the "atmosphere": the light colours for the
// current time of day (golden hour -> sunset -> night -> dawn -> day).
// ============================================================
import * as THREE from 'three';
import { T } from '../config.js';
import * as TX from './textures.js';

const PRESETS = {
  golden: { top: '#3d8bff', horizon: '#ffcf8a', fog: '#ffd9a8', sun: '#ffd9a0', sunInt: 2.3, hemiSky: '#d6ecff', hemiGround: '#e2b98a', hemiInt: 1.5, night: 0, cloud: '#fff1dc' },
  sunset: { top: '#46399a', horizon: '#ff8a5c', fog: '#f2a07c', sun: '#ff9a5c', sunInt: 1.9, hemiSky: '#d2b0ff', hemiGround: '#d68a6a', hemiInt: 1.25, night: 0.35, cloud: '#ffb08a' },
  night: { top: '#070c28', horizon: '#283068', fog: '#222a58', sun: '#a9bcff', sunInt: 0.75, hemiSky: '#6474c0', hemiGround: '#2a2440', hemiInt: 0.85, night: 1, cloud: '#3a4078' },
  dawn: { top: '#5b7bd6', horizon: '#ffb3c7', fog: '#f3c1cf', sun: '#ffd1dc', sunInt: 1.7, hemiSky: '#cfd8ff', hemiGround: '#d9a7a7', hemiInt: 1.25, night: 0.2, cloud: '#ffe0ea' },
  day: { top: '#2b93ff', horizon: '#bfe6ff', fog: '#cfe9ff', sun: '#fff6e6', sunInt: 2.6, hemiSky: '#d6ecff', hemiGround: '#d9c19a', hemiInt: 1.6, night: 0, cloud: '#ffffff' },
};
// [seconds into the cycle, preset]
const KEYS = [[0, 'golden'], [35, 'golden'], [50, 'sunset'], [62, 'sunset'], [78, 'night'], [112, 'night'], [126, 'dawn'], [134, 'dawn'], [144, 'day'], [170, 'day'], [185, 'golden']];
const RAIN = { top: '#4a5370', horizon: '#7d879c', fog: '#6f7890', cloud: '#59607a' };

const COLOR_KEYS = ['top', 'horizon', 'fog', 'sun', 'hemiSky', 'hemiGround', 'cloud'];
const presetColors = {};
for (const [name, p] of Object.entries(PRESETS)) {
  presetColors[name] = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color(p[k])]));
}
const rainColors = Object.fromEntries(Object.entries(RAIN).map(([k, v]) => [k, new THREE.Color(v)]));

// The current atmosphere, reused every frame (no garbage)
const atm = { night: 0, sunInt: 1, hemiInt: 1, rain: 0 };
for (const k of COLOR_KEYS) atm[k] = new THREE.Color();

export function atmosphere(skyTime, rain) {
  const c = ((skyTime % T.skyCycle) + T.skyCycle) % T.skyCycle;
  let i = 0;
  while (i < KEYS.length - 2 && c > KEYS[i + 1][0]) i++;
  const [t0, a] = KEYS[i];
  const [t1, b] = KEYS[i + 1];
  let f = t1 > t0 ? (c - t0) / (t1 - t0) : 0;
  f = f * f * (3 - 2 * f);
  for (const k of COLOR_KEYS) atm[k].copy(presetColors[a][k]).lerp(presetColors[b][k], f);
  for (const k of ['sunInt', 'hemiInt', 'night']) atm[k] = PRESETS[a][k] + (PRESETS[b][k] - PRESETS[a][k]) * f;
  // Rain greys everything out
  if (rain > 0) {
    for (const k of ['top', 'horizon', 'fog', 'cloud']) atm[k].lerp(rainColors[k], rain * 0.65);
    atm.sunInt *= 1 - rain * 0.6;
    atm.hemiInt *= 1 - rain * 0.25;
  }
  atm.rain = rain;
  return atm;
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform float flash;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(horizon, top, smoothstep(-0.02, 0.6, d.y));
    float s = max(dot(d, sunDir), 0.0);
    col += sunColor * (smoothstep(0.9975, 0.999, s) * 2.0 + pow(s, 14.0) * 0.4);
    col += vec3(flash);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Sky {
  // Each place has its own far-away view: city domes, the sea with
  // a lighthouse, or snowy mountain peaks.
  setBackdrop(kind) {
    if (kind === this.backdropKind) return;
    this.backdrops.city ??= this.skyline.material.map; // remember the original city skyline
    this.backdropKind = kind;
    if (!this.backdrops[kind]) this.backdrops[kind] = kind === 'city' ? this.skyline.material.map : TX.backdropTexture(kind);
    this.skyline.material.map = this.backdrops[kind];
    this.skyline.material.needsUpdate = true;
  }

  constructor(scene) {
    this.uniforms = {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(-0.35, 0.2, -1).normalize() },
      sunColor: { value: new THREE.Color() },
      flash: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(420, 32, 16),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    this.dome.renderOrder = -10;
    scene.add(this.dome);

    // Stars
    const starPos = [];
    for (let i = 0; i < 700; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = 0.08 + Math.random() * 0.92;
      const r = Math.sqrt(1 - y * y);
      starPos.push(Math.cos(a) * r * 400, y * 400, Math.sin(a) * r * 400);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(starGeo, this.starMat);
    scene.add(this.stars);

    // Distant city with domes and minarets
    this.skyline = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 160),
      new THREE.MeshBasicMaterial({ map: TX.skylineTexture(), transparent: true, fog: false, depthWrite: false }),
    );
    this.skyline.position.set(0, 42, -330);
    scene.add(this.skyline);
    this.backdrops = {};
    this.backdropKind = 'city';

    // Clouds
    this.cloudMat = new THREE.SpriteMaterial({ map: TX.cloudTexture(), transparent: true, depthWrite: false, fog: false });
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const w = 70 + Math.random() * 90;
      s.scale.set(w, w * 0.42, 1);
      s.position.set(-300 + Math.random() * 600, 60 + Math.random() * 70, -200 - Math.random() * 160);
      s.userData.speed = 1 + Math.random() * 2;
      scene.add(s);
      this.clouds.push(s);
    }

    // Kites over the rooftops
    this.kites = [];
    const kiteTex = TX.kiteTexture();
    for (let i = 0; i < 10; i++) {
      const k = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 1.8),
        new THREE.MeshBasicMaterial({ map: kiteTex, side: THREE.DoubleSide, color: new THREE.Color().setHSL(Math.random(), 0.6, 0.75) }),
      );
      k.rotation.z = Math.PI / 4;
      const side = i % 2 ? 1 : -1;
      k.userData = { x: side * (12 + Math.random() * 40), y: 18 + Math.random() * 20, z: Math.random() * 200, phase: Math.random() * 6 };
      scene.add(k);
      this.kites.push(k);
    }

    // A flock of birds that crosses now and then
    this.flock = new THREE.Group();
    this.birds = [];
    const birdMat = new THREE.MeshBasicMaterial({ color: '#2a2338', side: THREE.DoubleSide });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.9, 0, 0.2, 0.3, 0, -0.3], 3));
    for (let i = 0; i < 7; i++) {
      const bird = new THREE.Group();
      const left = new THREE.Mesh(wingGeo, birdMat);
      const right = new THREE.Mesh(wingGeo, birdMat);
      right.scale.x = -1;
      bird.add(left, right);
      bird.position.set((i % 4) * 2.2 - (i > 3 ? 1 : 0), Math.abs(i - 3) * -0.8, (i % 3) * 1.5);
      bird.userData = { left, right, phase: Math.random() * 6 };
      this.flock.add(bird);
      this.birds.push(bird);
    }
    this.flock.scale.setScalar(1.4);
    this.flockX = -400;
    scene.add(this.flock);
  }

  update(atm, game, camera, dt) {
    const u = this.uniforms;
    u.top.value.copy(atm.top);
    u.horizon.value.copy(atm.horizon);
    u.sunColor.value.copy(atm.sun).multiplyScalar(1 - atm.rain * 0.8);
    u.flash.value = game.flash * 0.6;
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    this.starMat.opacity = Math.max(0, atm.night - 0.4) * (1 - atm.rain) * 1.6;

    this.cloudMat.color.copy(atm.cloud);
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 320) c.position.x = -320;
    }

    // Kites drift slowly towards you as you run (parallax), then loop back
    const t = game.time;
    for (const k of this.kites) {
      const u2 = k.userData;
      const rel = ((u2.z + game.d * 0.3) % 200) + 50;
      k.position.set(u2.x + Math.sin(t * 0.7 + u2.phase) * 2, u2.y + Math.sin(t * 1.1 + u2.phase) * 1.5, -rel);
      k.rotation.y = Math.sin(t * 0.9 + u2.phase) * 0.4;
      k.visible = atm.night < 0.7;
    }

    this.flockX += dt * 14;
    if (this.flockX > 400) this.flockX = -400 - Math.random() * 300;
    this.flock.position.set(this.flockX * 0.3, 30, -90);
    this.flock.visible = atm.night < 0.6 && atm.rain < 0.5;
    for (const b of this.birds) {
      const flap = Math.sin(t * 10 + b.userData.phase) * 0.6;
      b.userData.left.rotation.z = flap;
      b.userData.right.rotation.z = -flap;
    }
  }
}
