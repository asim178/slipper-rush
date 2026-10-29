// ============================================================
// skins.js: what each obstacle looks like in each place.
// The engine only knows five obstacle types (crate, cart, line,
// rickshaw, truck) with fixed sizes. Each place draws them its own
// way, so the beach has sandcastles and the railway has trains,
// but jumping and rolling work exactly the same everywhere.
// ============================================================
import * as THREE from 'three';
import { paint, glow, makeObstacle as bazaarObstacle, rbox, sphere, capsule, cyl, mesh, at, wheel, gloss, chrome, glass, cached } from './models.js';
import * as TX from './textures.js';

export function makeSkinnedObstacle(type, variant, zone) {
  if (zone === 'beach') return BEACH[type](variant);
  if (zone === 'mountain') return MOUNTAIN[type](variant);
  if (zone === 'railway') return RAILWAY[type](variant);
  if (zone === 'newyork' || zone === 'vegas' || zone === 'losangeles') return CITY[type](variant, zone);
  return bazaarObstacle(type, variant);
}

const sand = () => paint('#f0d29a', { roughness: 0.95 });

// ---------------- Beach ----------------
const BEACH = {
  // Sandcastle with towers and a little flag
  crate() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.8, 0.55, 0.95, 0.12), sand()), 0, 0.28, 0));
    for (const x of [-0.65, 0, 0.65]) {
      g.add(at(mesh(cyl(0.2, 0.26, 0.42, 12), sand()), x, 0.74, 0));
      g.add(at(mesh(cached('castleTop', () => new THREE.ConeGeometry(0.24, 0.22, 12)), sand()), x, 1.0, 0));
    }
    g.add(at(mesh(cyl(0.012, 0.012, 0.4, 4), paint('#ffffff')), 0, 1.25, 0));
    const flag = mesh(rbox(0.18, 0.1, 0.01, 0.004), paint('#ff3b5c'), false);
    flag.position.set(0.09, 1.38, 0);
    g.add(flag);
    for (let i = 0; i < 5; i++) g.add(at(mesh(sphere(0.06, 8, 6), paint(['#ffd6e8', '#fff3c4', '#d6f5ff'][i % 3], { roughness: 0.3 })), -0.8 + i * 0.4, 0.06, 0.48));
    return g;
  },
  // Cool box with beach balls on top
  cart() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.8, 0.7, 1.3, 0.12), gloss('#2fa8ff')), 0, 0.35, 0));
    g.add(at(mesh(rbox(1.84, 0.16, 1.34, 0.06), gloss('#ffffff')), 0, 0.74, 0));
    const ball = (x, z, c1) => {
      const b = new THREE.Group();
      b.position.set(x, 0.98, z);
      b.add(mesh(sphere(0.2, 18, 12), gloss('#ffffff')));
      const band = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 20), gloss(c1));
      band.rotation.y = Math.PI / 2;
      b.add(band);
      return b;
    };
    g.add(ball(-0.5, 0.1, '#ff3b5c'), ball(0.3, -0.2, '#ffd23f'), ball(0.6, 0.35, '#20c25a'));
    return g;
  },
  // Volleyball net
  line() {
    const g = new THREE.Group();
    for (const x of [-1.15, 1.15]) g.add(at(mesh(cyl(0.07, 0.07, 2.9, 10), paint('#ffffff', { roughness: 0.4 })), x, 1.45, 0));
    const net = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), new THREE.MeshStandardMaterial({ map: TX.netTexture(), transparent: true, side: THREE.DoubleSide, roughness: 0.8 }));
    net.position.y = 1.95;
    g.add(net);
    g.userData.sway = net;
    return g;
  },
  // Beach buggy
  rickshaw() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.5, 0.6, 2.4, 0.2), gloss('#ff8a00')), 0, 0.7, 0));
    g.add(at(mesh(rbox(1.3, 0.12, 0.8, 0.05), paint('#2b2733')), 0, 1.06, -0.3));
    for (const x of [-0.62, 0.62]) {
      g.add(at(mesh(cyl(0.04, 0.04, 0.9, 8), chrome()), x, 1.45, -0.55));
      g.add(at(mesh(cyl(0.04, 0.04, 0.9, 8), chrome()), x, 1.45, 0.25));
    }
    g.add(at(mesh(rbox(1.34, 0.06, 0.86, 0.02), chrome()), 0, 1.9, -0.15));
    g.add(at(new THREE.Mesh(sphere(0.1, 10, 8), glow('#fff3b0')), -0.45, 0.85, 1.21));
    g.add(at(new THREE.Mesh(sphere(0.1, 10, 8), glow('#fff3b0')), 0.45, 0.85, 1.21));
    const wheels = [-0.85, 0.85].flatMap((x) => [wheel(0.38, 0.3, x, 0.38, 0.8), wheel(0.38, 0.3, x, 0.38, -0.8)]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
  // Ice-cream truck with a giant cone on top
  truck() {
    const g = new THREE.Group();
    const pink = gloss('#ff8fc0');
    g.add(at(mesh(rbox(2.15, 2.4, 6.6, 0.35), gloss('#fff6fb')), 0, 1.6, -0.2));
    g.add(at(mesh(rbox(2.2, 0.7, 6.66, 0.2), pink), 0, 0.75, -0.2));
    g.add(at(mesh(rbox(1.9, 0.8, 0.05, 0.03), glass(), false), 0, 2.15, 3.15));
    const sign = mesh(new THREE.PlaneGeometry(1.8, 0.5), paint('#ffffff', { map: TX.signTexture('ICE CREAM', '#ff4f8b'), emissiveMap: TX.signTexture('ICE CREAM', '#ff4f8b'), emissive: '#ffffff', emissiveIntensity: 0.3 }), false);
    sign.position.set(0, 2.95, 3.0);
    g.add(sign);
    const cone = mesh(cached('icecone', () => new THREE.ConeGeometry(0.35, 0.8, 16)), paint('#d9a05a'));
    cone.rotation.x = Math.PI;
    cone.position.set(0, 3.25, -0.5);
    g.add(cone);
    g.add(at(mesh(sphere(0.42, 18, 14), gloss('#ff8fc0')), 0, 3.75, -0.5));
    g.add(at(mesh(sphere(0.12, 10, 8), gloss('#e8263f')), 0, 4.15, -0.5));
    for (const x of [-0.7, 0.7]) g.add(at(new THREE.Mesh(sphere(0.13, 10, 8), glow('#fff6c8')), x, 0.85, 3.15));
    const wheels = [2.2, -2.4].flatMap((z) => [wheel(0.45, 0.32, -1.0, 0.45, z, '#ff8fc0'), wheel(0.45, 0.32, 1.0, 0.45, z, '#ff8fc0')]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
};

// ---------------- Mountain Road ----------------
const stone = () => paint('#8d8f99', { roughness: 0.9, flatShading: true });
const MOUNTAIN = {
  // Pile of boulders
  crate() {
    const g = new THREE.Group();
    const rocks = [[-0.6, 0.42, 0, 0.5], [0.15, 0.4, 0.1, 0.46], [0.7, 0.34, -0.1, 0.38], [-0.2, 0.75, -0.05, 0.3]];
    for (const [x, y, z, r] of rocks) {
      const m = mesh(new THREE.IcosahedronGeometry(r, 0), stone());
      m.position.set(x, y, z);
      m.rotation.set(x * 3, z * 5, y * 2);
      g.add(m);
    }
    return g;
  },
  // Wooden cart full of hay
  cart() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.85, 0.36, 1.4, 0.04), paint('#8a5a34', { roughness: 0.85 })), 0, 0.55, 0));
    g.add(at(mesh(rbox(1.7, 0.4, 1.25, 0.18), paint('#e7c160', { roughness: 1 })), 0, 0.88, 0));
    g.add(wheel(0.34, 0.1, -0.98, 0.34, 0, '#8a5a34'), wheel(0.34, 0.1, 0.98, 0.34, 0, '#8a5a34'));
    return g;
  },
  // Red and white checkpoint barrier
  line() {
    const g = new THREE.Group();
    for (const x of [-1.15, 1.15]) g.add(at(mesh(rbox(0.22, 2.9, 0.22, 0.04), paint('#3a3346')), x, 1.45, 0));
    const pole = new THREE.Group();
    pole.position.y = 2.2;
    for (let i = 0; i < 8; i++) pole.add(at(mesh(cyl(0.09, 0.09, 0.29, 12), paint(i % 2 ? '#ffffff' : '#e8263f', { roughness: 0.4 })), -1.0 + i * 0.29, 0, 0).rotateZ(Math.PI / 2));
    g.add(pole);
    const sign = mesh(new THREE.PlaneGeometry(1.0, 0.7), paint('#ffffff', { map: TX.signTexture('STOP', '#e8263f') }), false);
    sign.position.set(0, 1.62, 0.02);
    g.add(sign);
    g.add(at(mesh(rbox(1.02, 0.72, 0.03, 0.02), paint('#ffffff')), 0, 1.62, -0.01));
    return g;
  },
  // Mountain jeep with a spare tyre
  rickshaw() {
    const g = new THREE.Group();
    const green = gloss('#4d6b3c');
    g.add(at(mesh(rbox(1.6, 0.8, 2.5, 0.18), green), 0, 0.85, 0));
    g.add(at(mesh(rbox(1.5, 0.6, 1.5, 0.12), paint('#e9e2cf', { roughness: 0.7 })), 0, 1.55, -0.35));
    g.add(at(mesh(rbox(1.4, 0.42, 0.04, 0.02), glass(), false), 0, 1.5, 0.42).rotateX(-0.25));
    g.add(at(mesh(rbox(1.62, 0.16, 0.12, 0.05), chrome()), 0, 0.55, 1.27));
    const spare = mesh(cyl(0.34, 0.34, 0.22, 16), paint('#1e1c24'));
    spare.rotation.x = Math.PI / 2;
    spare.position.set(0, 1.1, -1.35);
    g.add(spare);
    g.add(at(new THREE.Mesh(sphere(0.11, 10, 8), glow('#fff3b0')), -0.5, 1.0, 1.26), at(new THREE.Mesh(sphere(0.11, 10, 8), glow('#fff3b0')), 0.5, 1.0, 1.26));
    const wheels = [-0.8, 0.8].flatMap((x) => [wheel(0.38, 0.28, x, 0.38, 0.85), wheel(0.38, 0.28, x, 0.38, -0.85)]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
  // Decorated mountain bus with luggage on the roof
  truck(variant = 0) {
    const g = new THREE.Group();
    const art = paint('#ffffff', { map: TX.truckArtTexture(variant + 1), roughness: 0.4 });
    const rear = paint('#ffffff', { map: TX.truckArtTexture(variant + 1, true), roughness: 0.4 });
    const body = gloss(['#e8263f', '#2f7fe0', '#ff8a00'][variant % 3]);
    const bus = mesh(new THREE.BoxGeometry(2.2, 2.3, 6.8), [art, art, body, body, body, rear]);
    bus.position.set(0, 1.65, 0);
    g.add(bus);
    g.add(at(mesh(rbox(2.0, 0.7, 0.05, 0.03), glass(), false), 0, 2.2, 3.41));
    for (let i = 0; i < 5; i++) g.add(at(mesh(rbox(0.04, 0.6, 0.9, 0.02), glass(), false), 1.11, 2.2, -2.6 + i * 1.2), at(mesh(rbox(0.04, 0.6, 0.9, 0.02), glass(), false), -1.11, 2.2, -2.6 + i * 1.2));
    g.add(at(mesh(rbox(2.0, 0.08, 5.6, 0.03), chrome()), 0, 2.84, 0));
    const bags = ['#8a5a34', '#2f7fe0', '#e8263f', '#ffd23f'];
    for (let i = 0; i < 6; i++) g.add(at(mesh(rbox(0.6, 0.35, 0.7, 0.08), paint(bags[i % 4], { roughness: 0.8 })), (i % 2 ? 0.45 : -0.45), 3.06, -2 + i * 0.75));
    for (const x of [-0.75, 0.75]) g.add(at(new THREE.Mesh(sphere(0.13, 10, 8), glow('#fff6c8')), x, 0.85, 3.42));
    const wheels = [2.3, -2.3].flatMap((z) => [wheel(0.45, 0.32, -1.0, 0.45, z), wheel(0.45, 0.32, 1.0, 0.45, z)]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
};

// ---------------- Railway Station ----------------
const RAILWAY = {
  // Luggage trolley with suitcases
  crate() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.8, 0.08, 0.95, 0.02), chrome()), 0, 0.28, 0));
    g.add(wheel(0.14, 0.08, -0.8, 0.14, 0.35), wheel(0.14, 0.08, 0.8, 0.14, 0.35), wheel(0.14, 0.08, -0.8, 0.14, -0.35), wheel(0.14, 0.08, 0.8, 0.14, -0.35));
    const cases = [[-0.5, 0.55, '#e8263f'], [0.35, 0.5, '#2f7fe0'], [0.0, 0.85, '#ffd23f']];
    for (const [x, y, c] of cases) g.add(at(mesh(rbox(0.8, 0.45, 0.6, 0.08), gloss(c)), x, y, 0));
    g.add(at(mesh(rbox(0.06, 0.8, 0.9, 0.02), chrome()), -0.9, 0.7, 0));
    return g;
  },
  // Tea stall cart with a kettle
  cart() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.85, 0.7, 1.4, 0.08), gloss('#20a35a')), 0, 0.55, 0));
    g.add(at(mesh(rbox(1.9, 0.08, 1.45, 0.03), paint('#c9c9d6', { metalness: 0.8, roughness: 0.3 })), 0, 0.93, 0));
    g.add(at(mesh(sphere(0.2, 16, 12), chrome()), -0.4, 1.12, 0));
    g.add(at(mesh(cyl(0.03, 0.05, 0.25, 8), chrome()), -0.18, 1.15, 0).rotateZ(-0.8));
    for (let i = 0; i < 4; i++) g.add(at(mesh(cyl(0.07, 0.06, 0.12, 10), paint('#ffffff', { roughness: 0.3 })), 0.2 + i * 0.18, 1.03, 0.1));
    g.add(wheel(0.3, 0.1, -0.98, 0.3, 0), wheel(0.3, 0.1, 0.98, 0.3, 0));
    return g;
  },
  // Hanging platform sign
  line() {
    const g = new THREE.Group();
    for (const x of [-1.15, 1.15]) g.add(at(mesh(cyl(0.06, 0.06, 3.0, 8), paint('#3a3346', { metalness: 0.6, roughness: 0.4 })), x, 1.5, 0));
    g.add(at(mesh(rbox(2.4, 0.1, 0.1, 0.03), paint('#3a3346')), 0, 2.95, 0));
    const tex = TX.signTexture('PLATFORM 1', '#1d4fbf');
    const board = mesh(rbox(2.1, 0.9, 0.08, 0.04), paint('#1d4fbf'));
    board.position.y = 1.85;
    g.add(board);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8), paint('#ffffff', { map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.25 }));
    face.position.set(0, 1.85, 0.045);
    g.add(face);
    for (const x of [-0.8, 0.8]) g.add(at(mesh(cyl(0.012, 0.012, 0.65, 4), chrome()), x, 2.62, 0));
    g.userData.sway = board;
    return g;
  },
  // Little yellow baggage tractor
  rickshaw() {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.5, 0.7, 2.4, 0.16), gloss('#ffc107')), 0, 0.65, 0));
    g.add(at(mesh(rbox(1.3, 0.85, 1.1, 0.12), gloss('#ffc107')), 0, 1.45, -0.4));
    g.add(at(mesh(rbox(1.2, 0.5, 0.04, 0.02), glass(), false), 0, 1.55, 0.16));
    g.add(at(new THREE.Mesh(rbox(0.3, 0.12, 0.12, 0.04), glow('#ff8a00', 2.6)), 0, 1.95, -0.4)); // beacon
    g.add(at(new THREE.Mesh(sphere(0.1, 10, 8), glow('#fff3b0')), -0.5, 0.8, 1.21), at(new THREE.Mesh(sphere(0.1, 10, 8), glow('#fff3b0')), 0.5, 0.8, 1.21));
    const wheels = [-0.75, 0.75].flatMap((x) => [wheel(0.32, 0.26, x, 0.32, 0.8), wheel(0.32, 0.26, x, 0.32, -0.8)]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
  // A bright train carriage on the tracks. From the high camera you mostly see
  // its roof (you can run along it), so the roof gets colour and details too.
  truck(variant = 0) {
    const g = new THREE.Group();
    const LIVERY = [['#ffb703', '#e85d04'], ['#38b000', '#ffd23f'], ['#e63946', '#f1faee'], ['#3a86ff', '#ffd23f']];
    const [main, band] = LIVERY[variant % LIVERY.length];
    const body = gloss(main);
    g.add(at(mesh(rbox(2.2, 2.6, 6.9, 0.3), body), 0, 1.75, 0));
    g.add(at(mesh(rbox(2.24, 0.3, 6.94, 0.1), gloss(band)), 0, 1.3, 0)); // stripe
    g.add(at(mesh(rbox(2.24, 0.12, 6.94, 0.05), gloss(band)), 0, 2.85, 0));
    // Roof: a rounded top in the main colour with a lighter walkway and vents
    g.add(at(mesh(rbox(2.1, 0.3, 6.8, 0.15), gloss(new THREE.Color(main).multiplyScalar(0.8).getStyle())), 0, 3.05, 0));
    g.add(at(mesh(rbox(0.9, 0.06, 6.4, 0.03), paint('#e8e6ef', { roughness: 0.6 })), 0, 3.2, 0));
    for (const z of [-2.2, 0, 2.2]) g.add(at(mesh(rbox(0.7, 0.18, 0.9, 0.06), paint('#9aa0ad', { roughness: 0.4, metalness: 0.5 })), 0.62, 3.25, z));
    // Windows and doors on both sides
    for (let i = 0; i < 5; i++) {
      for (const x of [-1.11, 1.11]) g.add(at(mesh(rbox(0.04, 0.75, 0.95, 0.06), glass(), false), x, 2.2, -2.6 + i * 1.3));
    }
    for (const x of [-1.12, 1.12]) g.add(at(mesh(rbox(0.04, 1.9, 0.9, 0.05), paint('#2b2733', { roughness: 0.4 }), false), x, 1.55, 3.0));
    // Front face with windscreen, headlights and a number board
    g.add(at(mesh(rbox(1.7, 0.85, 0.05, 0.05), glass(), false), 0, 2.3, 3.46));
    for (const x of [-0.6, 0.6]) g.add(at(new THREE.Mesh(sphere(0.14, 12, 10), glow('#fff6c8', 3)), x, 1.05, 3.46));
    g.add(at(mesh(rbox(0.7, 0.24, 0.04, 0.03), paint('#14121a')), 0, 2.88, 3.47));
    g.add(at(mesh(rbox(2.0, 0.4, 0.2, 0.06), paint('#2b2733')), 0, 0.45, 3.4));
    const wheels = [2.4, 1.6, -1.6, -2.4].flatMap((z) => [wheel(0.36, 0.2, -0.75, 0.36, z, '#9aa0ad'), wheel(0.36, 0.2, 0.75, 0.36, z, '#9aa0ad')]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
};

// The arch over the road where each place begins (and the story finish line)
export function makeArch() {
  const g = new THREE.Group();
  const post = paint('#3a3346', { roughness: 0.5, metalness: 0.4 });
  for (const x of [-4.4, 4.4]) {
    g.add(at(mesh(rbox(0.5, 6.4, 0.5, 0.08), post), x, 3.2, 0));
    g.add(at(mesh(sphere(0.32, 14, 10), gloss('#ffd23f')), x, 6.6, 0));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.55), new THREE.MeshStandardMaterial({ roughness: 0.5 }));
  sign.position.set(0, 5.4, 0.28);
  const back = mesh(rbox(8.4, 1.75, 0.4, 0.12), paint('#1d2b53'));
  back.position.set(0, 5.4, 0);
  g.add(back, sign);
  // String of bulbs under the sign
  const bulbColors = ['#ff3b5c', '#ffd23f', '#20c25a', '#2fa8ff'];
  for (let i = 0; i < 15; i++) g.add(at(new THREE.Mesh(sphere(0.07, 8, 6), glow(bulbColors[i % 4], 2.6)), -3.9 + i * 0.56, 4.42, 0.25));
  g.userData.sign = sign;
  return g;
}

export function setArchText(arch, text, color, finishLine = false) {
  const sign = arch.userData.sign;
  if (finishLine) {
    sign.material.map = TX.checkerTexture();
    sign.material.map.repeat.set(4, 1);
    sign.material.emissiveMap = null;
    sign.material.emissive?.set('#000000');
  }
  const tex = TX.archTexture(text, color);
  if (!finishLine) {
    sign.material.map = tex;
    sign.material.emissiveMap = tex;
    sign.material.emissive.set('#ffffff');
    sign.material.emissiveIntensity = 0.35;
  }
  sign.material.needsUpdate = true;
  if (finishLine && !arch.userData.finishText) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), paint('#ffffff', { map: TX.archTexture('FINISH', '#e8263f'), emissiveMap: TX.archTexture('FINISH', '#e8263f'), emissive: '#ffffff', emissiveIntensity: 0.4 }));
    label.position.set(0, 5.4, 0.3);
    arch.add(label);
    arch.userData.finishText = label;
  }
}

export { capsule };

// A ramp up to a roof: a sloped deck with yellow and black edges and side frames.
// The slope reaches the top at 82% of its length (same as the engine).
export function makeRamp(zone) {
  const g = new THREE.Group();
  const len = 4.6;
  const top = 3.2;
  const run = len * 0.82;
  const deckColor = { beach: '#2fa8ff', mountain: '#8a5a34', railway: '#5a6170' }[zone] ?? '#ff7a1a';
  const slope = Math.hypot(run, top);
  const angle = Math.atan2(top, run);
  // Deck (front of the ramp is towards the runner, at +len/2 in local z)
  const deck = mesh(rbox(2.1, 0.14, slope, 0.04), paint(deckColor, { roughness: 0.55 }));
  deck.position.set(0, top / 2, len / 2 - run / 2);
  deck.rotation.x = angle;
  g.add(deck);
  // Flat bit at the top, level with the roof
  g.add(at(mesh(rbox(2.1, 0.14, len - run + 0.1, 0.04), paint(deckColor, { roughness: 0.55 })), 0, top - 0.07, -len / 2 + (len - run) / 2));
  // Grip stripes across the deck
  const stripe = paint('#ffd23f', { roughness: 0.5 });
  for (let i = 1; i < 7; i++) {
    const f = i / 7;
    const s = mesh(rbox(2.0, 0.03, 0.12, 0.01), stripe, false);
    s.position.set(0, f * top + 0.09, len / 2 - f * run);
    s.rotation.x = angle;
    g.add(s);
  }
  // Side frames (triangles)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(run, 0);
  shape.lineTo(run, top);
  shape.lineTo(0, 0);
  const side = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false });
  const frameMat = paint('#2b2733', { roughness: 0.5, metalness: 0.4 });
  for (const x of [-1.06, 0.98]) {
    const m = mesh(side, frameMat);
    m.rotation.y = Math.PI / 2; // shape x runs up the slope, away from the runner
    m.position.set(x, 0, len / 2);
    m.scale.set(1, 0.97, 1);
    g.add(m);
  }
  // Warning chevrons on the front edge
  g.add(at(mesh(rbox(2.12, 0.16, 0.1, 0.03), paint('#14121a')), 0, 0.08, len / 2));
  return g;
}

// A bounce pad: a round trampoline with a bouncy top, a striped rim and springs
export function makePad() {
  const g = new THREE.Group();
  const rim = mesh(new THREE.TorusGeometry(0.85, 0.12, 12, 32), gloss('#ff3b5c'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.2;
  g.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(mesh(rbox(0.16, 0.25, 0.1, 0.03), gloss('#ffd23f'), false), Math.cos(a) * 0.86, 0.2, Math.sin(a) * 0.86).rotateY(-a));
    g.add(at(mesh(cyl(0.04, 0.04, 0.2, 6), chrome()), Math.cos(a + 0.4) * 0.7, 0.08, Math.sin(a + 0.4) * 0.7));
  }
  const surface = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 32), paint('#2f5bea', { roughness: 0.4, emissive: '#1a3a9a', emissiveIntensity: 0.4 }));
  surface.position.y = 0.2;
  g.add(surface);
  // A glowing arrow so you can spot it from far away
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 3), glow('#ffe14d', 2.4));
  arrow.position.y = 0.26;
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.y = Math.PI;
  g.add(arrow);
  g.scale.set(1.15, 1, 0.85);
  g.userData.surface = surface;
  g.userData.arrow = arrow;
  return g;
}

// ---------------- American cities ----------------
// Same five obstacle sizes as everywhere: crate (jump), cart (jump), line (roll),
// rickshaw (car, change lane) and truck (bus or truck, change lane).
const CITY = {
  // Trash cans and traffic cones
  crate(variant, zone) {
    const g = new THREE.Group();
    const can = zone === 'vegas' ? '#ff3bd4' : zone === 'losangeles' ? '#20a35a' : '#5a6170';
    for (const x of [-0.55, 0.55]) {
      g.add(at(mesh(cyl(0.34, 0.3, 0.85, 14), paint(can, { roughness: 0.5, metalness: 0.3 })), x, 0.43, 0));
      g.add(at(mesh(cyl(0.37, 0.37, 0.08, 14), paint('#2b2733')), x, 0.88, 0));
    }
    for (const x of [-0.05]) {
      g.add(at(mesh(new THREE.ConeGeometry(0.22, 0.75, 12), paint('#ff7a1a')), x, 0.38, 0.25));
      g.add(at(mesh(cyl(0.15, 0.17, 0.1, 12), paint('#ffffff'), false), x, 0.42, 0.25));
    }
    return g;
  },
  // A hot dog cart with a striped umbrella
  cart(variant, zone) {
    const g = new THREE.Group();
    g.add(at(mesh(rbox(1.7, 0.75, 1.1, 0.1), chrome()), 0, 0.62, 0));
    g.add(at(mesh(rbox(1.72, 0.18, 1.12, 0.05), gloss(zone === 'vegas' ? '#ff3bd4' : '#e8364f')), 0, 0.98, 0));
    for (const x of [-0.6, 0.6]) g.add(at(wheel(0.22, 0.1, 0, 0, 0, '#9aa0ad'), x, 0.22, 0.5));
    g.add(at(mesh(cyl(0.03, 0.03, 1.0, 6), chrome()), 0, 1.5, 0));
    const umb = mesh(new THREE.ConeGeometry(0.95, 0.4, 12, 1, true), paint('#ffd23f', { side: THREE.DoubleSide }));
    umb.position.y = 2.05;
    g.add(umb);
    for (let i = 0; i < 3; i++) g.add(at(mesh(capsule(0.06, 0.3), paint('#c96a3a'), false), -0.4 + i * 0.4, 1.12, 0).rotateZ(Math.PI / 2));
    return g;
  },
  // A construction banner across the lane: roll under it
  line(variant, zone) {
    const g = new THREE.Group();
    for (const x of [-1.1, 1.1]) g.add(at(mesh(cyl(0.06, 0.06, 2.9, 8), paint('#ff7a1a')), x, 1.45, 0));
    const banner = mesh(rbox(2.3, 0.9, 0.06, 0.02), paint(zone === 'vegas' ? '#8a5cff' : zone === 'losangeles' ? '#ff7a59' : '#ffd23f'));
    banner.position.y = 1.95;
    g.add(banner);
    for (let i = 0; i < 5; i++) g.add(at(mesh(rbox(0.32, 0.9, 0.065, 0.01), paint('#14121a'), false), -0.9 + i * 0.45, 1.95, 0).rotateZ(0.5));
    return g;
  },
  // Cars: a yellow taxi in New York and Vegas, a convertible in LA
  rickshaw(variant, zone) {
    const g = new THREE.Group();
    const la = zone === 'losangeles';
    const color = la ? ['#ff4f8b', '#2fa8ff', '#ffd23f'][variant % 3] : '#ffc20e';
    g.add(at(mesh(rbox(1.7, 0.7, 2.5, 0.2), gloss(color)), 0, 0.6, 0));
    if (!la) {
      g.add(at(mesh(rbox(1.5, 0.55, 1.4, 0.18), gloss(color)), 0, 1.15, 0.1));
      for (const z of [-0.6, 0.8]) g.add(at(mesh(rbox(1.42, 0.42, 0.05, 0.05), glass(), false), 0, 1.15, z));
      g.add(at(mesh(rbox(0.6, 0.18, 0.3, 0.05), paint('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 })), 0, 1.52, 0.1)); // TAXI light
      g.add(at(mesh(rbox(1.72, 0.12, 2.0, 0.02), paint('#14121a'), false), 0, 0.68, 0)); // checker stripe
    } else {
      g.add(at(mesh(rbox(1.5, 0.35, 0.05, 0.05), glass(), false), 0, 1.1, -0.5));
      g.add(at(mesh(rbox(1.4, 0.3, 0.9, 0.1), paint('#f2e6d0')), 0, 0.95, 0.4)); // seats
    }
    for (const x of [-0.5, 0.5]) g.add(at(new THREE.Mesh(sphere(0.1, 10, 8), glow('#fff6c8', 2.5)), x, 0.62, -1.27));
    const wheels = [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].map(([x, z]) => wheel(0.3, 0.22, x, 0.3, z));
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
  // Big vehicles: a city bus in New York, a pink tour bus in Vegas, a food truck in LA
  truck(variant, zone) {
    const g = new THREE.Group();
    const [main, band] = zone === 'vegas' ? ['#ff3bd4', '#ffd23f'] : zone === 'losangeles' ? ['#13b5a5', '#ff7a59'] : ['#f4f6fb', '#2f5bea'];
    g.add(at(mesh(rbox(2.2, 2.7, 6.9, 0.3), gloss(main)), 0, 1.65, 0));
    g.add(at(mesh(rbox(2.24, 0.5, 6.94, 0.1), gloss(band)), 0, 1.0, 0));
    for (let i = 0; i < 5; i++) for (const x of [-1.11, 1.11]) g.add(at(mesh(rbox(0.04, 0.8, 1.1, 0.05), glass(), false), x, 2.2, -2.6 + i * 1.3));
    g.add(at(mesh(rbox(1.9, 1.0, 0.05, 0.06), glass(), false), 0, 2.2, 3.46));
    g.add(at(mesh(rbox(1.2, 0.3, 0.05, 0.03), paint('#14121a')), 0, 2.95, 3.47));
    if (zone === 'losangeles') {
      g.add(at(mesh(rbox(0.05, 1.0, 3.4, 0.03), paint('#ffd23f')), 1.13, 2.0, 0.4)); // serving hatch
      g.add(at(mesh(rbox(0.6, 0.6, 0.6, 0.1), paint('#ffd23f')), 0, 3.3, -1)); // giant taco on the roof
    }
    for (const x of [-0.7, 0.7]) g.add(at(new THREE.Mesh(sphere(0.14, 10, 8), glow('#fff6c8', 2.5)), x, 0.75, 3.46));
    const wheels = [2.4, -2.4].flatMap((z) => [wheel(0.42, 0.25, -0.95, 0.42, z, '#9aa0ad'), wheel(0.42, 0.25, 0.95, 0.42, z, '#9aa0ad')]);
    g.add(...wheels);
    g.userData.wheels = wheels;
    return g;
  },
};
const CITY_ZONES = ['newyork', 'vegas', 'losangeles'];
export const isCity = (zone) => CITY_ZONES.includes(zone);
export function makeCityObstacle(type, variant, zone) {
  return CITY[type](variant, zone);
}
