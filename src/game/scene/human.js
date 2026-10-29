// ============================================================
// human.js: a realistic-proportioned runner, built from a "look"
// (see looks.js). Same joints as before, so all the animations in
// poseKid() keep working:
//
//   root > body > hips > (torso, head, shoulder > elbow, upper > knee)
//
// What makes it look human instead of a robot:
//  - adult proportions: the head is about 1/7 of the height
//  - limbs taper (thick at the top, thin at the wrist and ankle),
//    and the joints are hidden inside the limbs, no ball joints
//  - a real face: a jaw and chin, nose, ears, lips, eyes with
//    whites, iris, pupil and a reflection, and eyebrows
//  - hands with a thumb and fingers, sneakers with soles and laces
//  - clothes are separate layers: sleeves, collars, hoods, pockets
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const geo = new Map();
const g = (key, make) => {
  if (!geo.has(key)) geo.set(key, make());
  return geo.get(key);
};
const mats = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...opts }));
  return mats.get(key);
}
function part(geometry, material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}
const sph = (r, w = 20, h = 14) => g(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const box = (w, h, d, r) => g(`b${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
// A limb segment: wider at the top, hanging DOWN from its joint
const limb = (top, bottom, len) => g(`l${top},${bottom},${len}`, () => new THREE.CylinderGeometry(top, bottom, len, 18, 1).translate(0, -len / 2, 0));
const cap = (r, len) => g(`c${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 12));

// Body outline, spun round by a lathe: [radius, height] from hips to shoulders
const TORSO = {
  m: [[0, -0.1], [0.15, -0.09], [0.168, 0.0], [0.152, 0.14], [0.168, 0.28], [0.19, 0.42], [0.18, 0.5], [0.12, 0.57], [0.065, 0.6], [0, 0.6]],
  f: [[0, -0.1], [0.16, -0.09], [0.175, 0.0], [0.13, 0.16], [0.15, 0.3], [0.165, 0.4], [0.15, 0.5], [0.1, 0.56], [0.06, 0.59], [0, 0.59]],
};
const torsoGeo = (body) => g(`torso-${body}`, () => new THREE.LatheGeometry(TORSO[body].map(([r, y]) => new THREE.Vector2(r, y)), 28));
const BUILD = { slim: 0.9, regular: 1, athletic: 1.12 };

export function makeHuman(look) {
  const metal = look.metal ? { roughness: 0.22, metalness: 1 } : {};
  const toonSkin = look.style !== 'real';
  // Cartoon skin is a little matte and glows warmly, so faces look soft and friendly
  const skin = toonSkin ? mat(look.skin, { roughness: 0.7, emissive: look.skin, emissiveIntensity: 0.12 }) : mat(look.skin, { roughness: 0.48 });
  const skinDark = mat(new THREE.Color(look.skin).multiplyScalar(0.82).getStyle(), { roughness: 0.5 });
  const lips = mat(new THREE.Color(look.skin).lerp(new THREE.Color(look.body === 'f' ? '#c2405a' : '#a0524a'), 0.45).getStyle(), { roughness: 0.4 });
  const top = mat(look.topColor, { roughness: 0.75, ...metal });
  const trim = mat(look.trimColor, { roughness: 0.6, ...metal });
  const pants = mat(look.bottomColor, { roughness: look.bottom === 'jeans' ? 0.9 : 0.75, ...metal });
  const shoe = mat(look.shoes, { roughness: 0.45, ...metal });
  const sole = mat('#f4f4f4', { roughness: 0.55 });
  const hair = mat(look.hairColor, { roughness: 0.55 });
  const dark = mat('#120f14', { roughness: 0.3 });
  const female = look.body === 'f';
  const wide = BUILD[look.build] ?? 1;
  const longSleeves = ['hoodie', 'street', 'shirt', 'kurta', 'suit'].includes(look.top);
  const longLegs = look.bottom !== 'shorts';

  const toon = look.style !== 'real'; // 'cartoon' (default) or 'real'
  const hands = [];
  const feet = [];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.scale.setScalar(look.scale ?? 1);
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  body.add(hips);

  // ---------- torso and top ----------
  const torso = part(torsoGeo(female ? 'f' : 'm'), top, 0, 0, 0);
  torso.scale.set(1.12 * wide, 1, 0.68 * (0.9 + wide * 0.1));
  hips.add(torso);
  // Waistband / belt where the top meets the trousers
  const waist = part(g(`waist${female}`, () => new THREE.CylinderGeometry(0.172, 0.17, 0.12, 28, 1, true)), pants, 0, -0.04, 0);
  waist.scale.set(1.12 * wide, 1, 0.7 * (0.9 + wide * 0.1));
  hips.add(waist);
  const shoulderX = (female ? 0.165 : 0.2) * wide;

  if (look.top === 'jersey') {
    // V-neck collar and a stripe across the chest
    hips.add(part(box(0.2, 0.03, 0.02, 0.008), trim, 0, 0.53, -0.115).rotateX(0.5));
    const stripe = part(box(0.38 * wide, 0.05, 0.02, 0.01), trim, 0, 0.36, -0.127, false);
    hips.add(stripe);
    hips.add(part(box(0.06, 0.07, 0.01, 0.005), mat('#ffffff'), 0.07, 0.44, -0.13, false)); // badge
  } else if (look.top === 'street') {
    // Street style: a hoodie with an open denim vest over it
    const hood = part(g('hood', () => new THREE.TorusGeometry(0.11, 0.05, 10, 20)), top, 0, 0.56, 0.05);
    hood.rotation.x = Math.PI / 2 + 0.4;
    hips.add(hood);
    for (const x of [-0.035, 0.035]) hips.add(part(g('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6)), mat('#ffffff'), x, 0.47, -0.13, false));
    const vestGeo = g(`vest-${female}`, () => {
      const pts = TORSO[female ? 'f' : 'm'].filter(([, y]) => y >= 0.02 && y <= 0.52).map(([r, y]) => new THREE.Vector2(r * 1.07, y));
      return new THREE.LatheGeometry(pts, 28, Math.PI + 0.42, Math.PI * 2 - 0.84); // open at the front
    });
    const vest = part(vestGeo, mat(look.trimColor, { roughness: 0.85, side: THREE.DoubleSide }), 0, 0, 0);
    vest.scale.set(1.12 * wide, 1, 0.7 * (0.9 + wide * 0.1));
    hips.add(vest);
    hips.userData.vest = vest;
    // Lapels, pockets and buttons on the vest
    const denim = mat(new THREE.Color(look.trimColor).multiplyScalar(0.8).getStyle(), { roughness: 0.85 });
    for (const sx of [-1, 1]) {
      const lapel = part(box(0.06, 0.16, 0.02, 0.01), denim, sx * 0.075, 0.45, -0.118);
      lapel.rotation.z = sx * 0.35;
      hips.add(lapel);
      hips.add(part(box(0.06, 0.05, 0.012, 0.006), denim, sx * 0.11, 0.33, -0.128, false)); // chest pocket
      hips.add(part(sph(0.007, 8, 6), mat('#d9d9e6', { metalness: 0.8, roughness: 0.3 }), sx * 0.075, 0.25, -0.13, false));
    }
  } else if (look.top === 'hoodie') {
    const hood = part(g('hood', () => new THREE.TorusGeometry(0.11, 0.05, 10, 20)), top, 0, 0.56, 0.05);
    hood.rotation.x = Math.PI / 2 + 0.4;
    hips.add(hood);
    hips.add(part(box(0.24, 0.1, 0.03, 0.02), top, 0, 0.12, -0.12)); // front pocket
    for (const x of [-0.04, 0.04]) hips.add(part(g('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6)), trim, x, 0.47, -0.12, false));
  } else if (look.top === 'shirt') {
    for (const sx of [-1, 1]) {
      const c = part(box(0.08, 0.025, 0.06, 0.008), mat('#ffffff'), sx * 0.045, 0.565, -0.07);
      c.rotation.set(0.3, 0, sx * -0.5);
      hips.add(c);
    }
    hips.add(part(box(0.045, 0.3, 0.02, 0.01), trim, 0, 0.4, -0.125)); // tie
    hips.add(part(box(0.05, 0.04, 0.025, 0.01), trim, 0, 0.545, -0.11));
  } else if (look.top === 'kurta') {
    const skirt = part(g('kurtaSkirt', () => new THREE.CylinderGeometry(0.19, 0.26, 0.4, 28, 1, true)), top, 0, -0.24, 0);
    skirt.scale.set(1.1 * wide, 1, 0.8);
    hips.add(skirt);
    hips.add(part(box(0.025, 0.3, 0.015, 0.006), trim, 0, 0.4, -0.125));
    for (let i = 0; i < 4; i++) hips.add(part(sph(0.008, 8, 6), trim, 0, 0.5 - i * 0.07, -0.135, false));
  } else if (look.top === 'suit' && look.emblem) {
    const emblem = part(g('emblem', () => new THREE.CylinderGeometry(0.06, 0.06, 0.015, 24)), trim, 0, 0.38, -0.128, false);
    emblem.rotation.x = Math.PI / 2;
    hips.add(emblem);
  } else {
    // T-shirt: a ribbed round collar
    const collar = part(g('collar', () => new THREE.TorusGeometry(0.068, 0.012, 8, 22)), trim, 0, 0.58, -0.005, false);
    collar.rotation.x = Math.PI / 2;
    hips.add(collar);
  }

  // Neck
  hips.add(part(limb(0.054, 0.062, 0.1).clone().translate(0, 0.1, 0), skin, 0, 0.555, 0.0));

  // ---------- school bag (becomes the Rocket Bag) ----------
  const pack = new THREE.Group();
  pack.position.set(0, 0.32, 0.16);
  hips.add(pack);
  const bagMat = mat('#2f7fe0', { roughness: 0.4 });
  pack.add(part(box(0.32, 0.38, 0.14, 0.05), bagMat));
  pack.add(part(box(0.24, 0.13, 0.05, 0.025), mat('#ffd23f', { roughness: 0.4 }), 0, -0.08, 0.085));
  for (const sx of [-1, 1]) {
    const strap = part(box(0.04, 0.42, 0.02, 0.01), mat('#1d4fa0'), sx * 0.11, 0.05, -0.2);
    strap.rotation.x = 0.12;
    pack.add(strap);
  }
  const flames = [];
  for (const x of [-0.09, 0.09]) {
    pack.add(part(g('nozzle', () => new THREE.CylinderGeometry(0.045, 0.06, 0.1, 12)), mat('#e6e8f0', { roughness: 0.18, metalness: 1 }), x, -0.23, 0.02));
    const flame = new THREE.Mesh(g('flame', () => new THREE.ConeGeometry(0.06, 0.36, 12)), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a2e').multiplyScalar(3) }));
    flame.rotation.x = Math.PI;
    flame.position.set(x, -0.46, 0.02);
    pack.add(flame);
    flames.push(flame);
  }

  if (look.noPack) pack.visible = false; // grown-ups don't carry the school bag

  let cape = null;
  if (look.cape) {
    cape = new THREE.Group();
    cape.position.set(0, 0.56, 0.12);
    cape.add(part(g('cape', () => new THREE.PlaneGeometry(0.46, 0.95, 1, 4).translate(0, -0.47, 0)), mat(look.cape, { side: THREE.DoubleSide, roughness: 0.55 })));
    hips.add(cape);
  }

  // ---------- head ----------
  const head = new THREE.Group();
  head.position.y = 0.645;
  hips.add(head);
  const faceWide = { oval: 1, round: 1.08, square: 1.06 }[look.face] ?? 1;
  const cranium = part(sph(0.115, 32, 24), skin, 0, 0.13, 0.005);
  cranium.scale.set(0.9 * (female ? 0.97 : 1), 1.08, 1.04);
  head.add(cranium);
  // Jaw and chin: what turns a ball into a face
  const jaw = part(sph(0.09, 28, 20), skin, 0, 0.075, -0.012);
  jaw.scale.set(faceWide * (look.face === 'square' ? 0.95 : 0.88) * (female ? 0.9 : 1), 0.74, 0.95);
  head.add(jaw);
  const chin = part(sph(0.03, 16, 12), skin, 0, 0.03, -0.07);
  chin.scale.set(look.face === 'square' ? 1.45 : 1.1, 0.8, 0.85);
  if (look.style !== 'real') chin.visible = false; // cartoon faces get a smooth round chin
  head.add(chin);
  // Cheekbones (realistic faces only; cartoon faces stay smooth and round)
  for (const sx of look.style === 'real' ? [-1, 1] : []) {
    const cheek = part(sph(0.03, 14, 10), skin, sx * 0.052, 0.108, -0.072);
    cheek.scale.set(1, 0.7, 0.6);
    head.add(cheek);
  }
  // Ears
  for (const sx of [-1, 1]) {
    const ear = part(sph(0.028, 14, 10), skin, sx * 0.104, 0.122, 0.012);
    ear.scale.set(0.42, 1.05, 0.72);
    head.add(ear);
    head.add(part(sph(0.012, 8, 6), skinDark, sx * 0.108, 0.12, 0.01, false));
  }
  let eyes, brows, smile, mouthO;
  if (toon) ({ eyes, brows, smile, mouthO } = buildToonFace(head, look, { skin, hair, dark, female }));
  else {
    // Nose: bridge, tip and the two wings
    const bridge = part(box(0.022, 0.05, 0.03, 0.01), skin, 0, 0.122, -0.106);
    bridge.rotation.x = -0.25;
    head.add(bridge);
    head.add(part(sph(0.017, 12, 10), skin, 0, 0.096, -0.119));
    for (const sx of [-1, 1]) head.add(part(sph(0.011, 10, 8), skin, sx * 0.014, 0.093, -0.11));

    // Eyes in shallow sockets
    eyes = new THREE.Group();
    eyes.position.y = 0.14;
    eyes.scale.setScalar(1.25); // a little bigger than real life reads better on a phone
    head.add(eyes);
    const white = mat('#fbfbf7', { roughness: 0.15 });
    const iris = mat(look.eyes, { roughness: 0.2 });
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (const sx of [-0.041, 0.041]) {
      const eye = new THREE.Group();
      eye.position.set(sx * 0.82, 0, -0.072);
      const ball = part(sph(0.019, 16, 12), white, 0, 0, 0, false);
      ball.scale.set(1.15, 0.85, 0.8);
      eye.add(ball);
      eye.add(part(sph(0.0115, 14, 10), iris, 0, 0, -0.012, false));
      eye.add(part(sph(0.006, 10, 8), dark, 0, 0, -0.0175, false));
      eye.add(new THREE.Mesh(sph(0.0028, 6, 5), shine).translateX(0.004).translateY(0.004).translateZ(-0.021));
      // Upper eyelid line (lashes)
      const lid = part(g('lid', () => new THREE.TorusGeometry(0.02, female ? 0.003 : 0.0018, 6, 16, Math.PI)), dark, 0, 0.002, -0.006, false);
      lid.scale.set(1.1, 0.85, 1);
      eye.add(lid);
      eyes.add(eye);
    }
    brows = [];
    for (const sx of [-0.042, 0.042]) {
      const brow = part(box(0.044, female ? 0.007 : 0.011, 0.012, 0.004), hair, sx, 0.172, -0.1, false);
      brow.rotation.z = sx < 0 ? 0.08 : -0.08;
      head.add(brow);
      brows.push(brow);
    }
    // Mouth: closed smiling lips, or open (surprised / shouting)
    smile = new THREE.Group();
    smile.position.set(0, 0.06, -0.103);
    head.add(smile);
    const upperLip = part(cap(0.0075, 0.028), lips, 0, 0.004, 0, false);
    upperLip.rotation.z = Math.PI / 2;
    const lowerLip = part(cap(0.0095, 0.024), lips, 0, -0.008, 0.002, false);
    lowerLip.rotation.z = Math.PI / 2;
    smile.add(upperLip, lowerLip);
    for (const sx of [-1, 1]) smile.add(part(sph(0.004, 6, 5), skinDark, sx * 0.024, 0.003, 0.002, false)); // smile corners
    mouthO = part(sph(0.018, 14, 10), mat('#3a1418'), 0, 0.056, -0.1, false);
    mouthO.scale.set(1, 1.15, 0.5);
    head.add(mouthO);

  }

  buildBeard(head, look, hair);
  const hairParts = buildHairStyle(head, look, hair);
  buildExtras(head, look);

  // ---------- arms ----------
  const sleeve = longSleeves ? top : skin;
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 0.49, 0);
    hips.add(shoulder);
    const delt = part(sph(0.062 * wide, 16, 12), top, -side * 0.012, -0.02, 0);
    delt.scale.set(1, 0.85, 0.95);
    shoulder.add(delt);
    shoulder.add(part(limb(0.058 * wide, 0.046, 0.29), sleeve, 0, -0.02, 0));
    if (!longSleeves) shoulder.add(part(limb(0.066 * wide, 0.06, 0.13), top, 0, -0.01, 0)); // short sleeve
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    elbow.add(part(sph(0.046, 14, 10), sleeve, 0, 0, 0));
    elbow.add(part(limb(0.046, 0.035, 0.25), sleeve, 0, 0, 0));
    if (longSleeves) elbow.add(part(limb(0.04, 0.04, 0.03), look.top === 'hoodie' ? trim : top, 0, -0.22, 0)); // cuff
    if (look.top === 'street') shoulder.add(part(limb(0.074 * wide, 0.066, 0.1), mat(look.trimColor, { roughness: 0.85 }), 0, 0.0, 0)); // vest armhole
    // Hand: palm, curled fingers and a thumb
    const hand = new THREE.Group();
    hand.position.y = -0.27;
    elbow.add(hand);
    hands.push(hand);
    hand.add(part(box(0.04, 0.075, 0.068, 0.018), skin, 0, -0.03, 0));
    hand.add(part(box(0.044, 0.05, 0.06, 0.02), skin, 0.002, -0.075, -0.012));
    const thumb = part(cap(0.012, 0.035), skin, -side * 0.012, -0.035, -0.035);
    thumb.rotation.x = 0.6;
    hand.add(thumb);
    return { shoulder, elbow };
  });

  // ---------- legs ----------
  const legMat = longLegs ? pants : skin;
  const legs = [-1, 1].map((side) => {
    const upper = new THREE.Group();
    upper.position.set(side * (female ? 0.085 : 0.09) * wide, -0.02, 0);
    hips.add(upper);
    upper.add(part(limb(0.1 * wide, 0.07, 0.43), legMat, 0, 0.02, 0));
    if (!longLegs) upper.add(part(limb(0.109 * wide, 0.096, 0.24), pants, 0, 0.03, 0)); // shorts leg
    const knee = new THREE.Group();
    knee.position.y = -0.41;
    upper.add(knee);
    knee.add(part(sph(0.069, 14, 10), legMat, 0, 0, 0));
    knee.add(part(limb(0.068, 0.047, 0.4), legMat, 0, 0, 0));
    const calf = part(sph(0.058, 14, 10), legMat, 0, -0.12, 0.018);
    calf.scale.set(0.95, 1.6, 0.95);
    knee.add(calf);
    if (look.bottom === 'track') knee.add(part(box(0.012, 0.36, 0.012, 0.004), trim, side * 0.052, -0.18, 0, false));
    if (look.bottom === 'jeans') {
      // Rolled-up cuff, a lighter shade of the denim
      const cuff = mat(new THREE.Color(look.bottomColor).lerp(new THREE.Color('#ffffff'), 0.25).getStyle(), { roughness: 0.9 });
      knee.add(part(limb(0.058, 0.058, 0.06), cuff, 0, -0.33, 0));
    }
    if (!longLegs) knee.add(part(limb(0.05, 0.05, 0.07), mat('#ffffff', { roughness: 0.8 }), 0, -0.31, 0)); // sock
    // Sneaker: upper, rounded toe, thick white sole, laces and a side flash
    const foot = new THREE.Group();
    foot.position.set(0, -0.42, -0.035);
    knee.add(foot);
    feet.push(foot);
    foot.add(part(box(0.1, 0.075, 0.22, 0.035), shoe, 0, 0.005, 0));
    const toe = part(sph(0.05, 14, 10), shoe, 0, -0.005, -0.09);
    toe.scale.set(1, 0.72, 0.9);
    foot.add(toe);
    foot.add(part(box(0.108, 0.03, 0.25, 0.012), sole, 0, -0.04, -0.01));
    foot.add(part(box(0.11, 0.012, 0.252, 0.005), trim, 0, -0.028, -0.01, false)); // coloured stripe round the sole
    foot.add(part(box(0.09, 0.05, 0.05, 0.02), mat('#ffffff', { roughness: 0.6 }), 0, 0.045, 0.085)); // padded collar
    foot.add(part(box(0.05, 0.012, 0.08, 0.004), mat('#ffffff'), 0, 0.044, -0.04, false));
    foot.add(part(box(0.004, 0.025, 0.1, 0.002), trim, side * 0.051, 0.0, 0.0, false));
    return { upper, knee };
  });

  // Cartoon proportions, like the heroes of mobile runners: a big head with
  // big eyes, big hands and chunky sneakers on a slightly smaller body
  if (toon) {
    body.scale.multiplyScalar(0.86);
    head.scale.setScalar(2.0);
    head.position.y = 0.6;
    brows.forEach((b) => b.scale.set(1.15, 1.5, 1));
    hands.forEach((h) => h.scale.setScalar(1.35));
    feet.forEach((f) => {
      f.scale.set(1.55, 1.6, 1.45); // big chunky sneakers
      f.position.y = -0.395;
    });
    pack.scale.setScalar(1.1);
    // Chunkier arms, legs and body
    arms.forEach((a) => a.shoulder.scale.set(1.22, 1, 1.22));
    const baggy = look.bottom === 'jeans' || look.bottom === 'track' ? 1.34 : 1.2;
    legs.forEach((l) => l.upper.scale.set(baggy, 1, baggy));
    torso.scale.x *= 1.1;
    torso.scale.z *= 1.15;
    waist.scale.x *= 1.1;
    waist.scale.z *= 1.15;
    if (hips.userData.vest) {
      hips.userData.vest.scale.x *= 1.1;
      hips.userData.vest.scale.z *= 1.15;
    }
    arms.forEach((a, i) => (a.shoulder.position.x *= 1.1));
  }

  if (toon) addOutlines(root);
  return { root, body, hips, head, eyes, brows, smile, mouthO, pack, flames, cape, hairParts, legs, arms };
}

// ---------- the cartoon face ----------
// Big glossy eyes with a large iris and two highlights, thick lashes,
// chunky brows, a button nose, rosy cheeks and a big grin with teeth.
function buildToonFace(head, look, { skin, hair, dark, female }) {
  const eyes = new THREE.Group();
  eyes.position.y = 0.132;
  head.add(eyes);
  const white = mat('#ffffff', { roughness: 0.2 });
  const iris = mat(look.eyes, { roughness: 0.15, emissive: look.eyes, emissiveIntensity: 0.25 });
  const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * 0.043, 0, -0.103);
    eye.rotation.y = sx * -0.25; // follow the curve of the face
    const ball = part(sph(0.031, 20, 16), white, 0, 0, 0, false);
    ball.scale.set(0.82, 1.08, 0.5);
    eye.add(ball);
    const ir = part(sph(0.023, 18, 14), iris, 0, -0.002, -0.011, false);
    ir.scale.set(0.82, 1.0, 0.4);
    eye.add(ir);
    const pupil = part(sph(0.0125, 14, 10), dark, 0, -0.002, -0.0152, false);
    pupil.scale.set(0.82, 1.0, 0.35);
    eye.add(pupil);
    eye.add(new THREE.Mesh(sph(0.0068, 8, 6), shine).translateX(0.007).translateY(0.002).translateZ(-0.0205));
    eye.add(new THREE.Mesh(sph(0.0032, 6, 5), shine).translateX(-0.006).translateY(-0.009).translateZ(-0.018));
    // Thick upper lash line
    const lash = part(g('toonLash', () => new THREE.TorusGeometry(0.03, 0.0045, 6, 18, Math.PI)), dark, 0, 0.001, -0.004, false);
    lash.scale.set(0.86, 1.12, 1);
    eye.add(lash);
    // Cool half-closed upper eyelid (in skin colour), for that confident look
    const lid = part(sph(0.033, 18, 12), skin, 0, 0.024, -0.007, false);
    lid.scale.set(0.84, female ? 0.42 : 0.55, 0.56);
    eye.add(lid);
    if (female) {
      const flick = part(cap(0.003, 0.012), dark, sx * 0.022, 0.016, -0.004, false);
      flick.rotation.z = sx * -0.9;
      eye.add(flick);
    }
    eyes.add(eye);
  }
  const brows = [];
  for (const sx of [-1, 1]) {
    const brow = part(cap(female ? 0.0042 : 0.0062, 0.03), hair, sx * 0.045, 0.186, -0.098, false);
    brow.rotation.z = Math.PI / 2 + sx * 0.12;
    head.add(brow);
    brows.push(brow);
  }
  // Button nose
  const nose = part(sph(0.015, 14, 10), skin, 0, 0.1, -0.114, false);
  nose.scale.set(1.1, 0.85, 0.9);
  head.add(nose);
  // Rosy cheeks
  const blush = new THREE.MeshBasicMaterial({ color: '#ff7a8a', transparent: true, opacity: 0.32, depthWrite: false });
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(sph(0.02, 12, 8), blush);
    b.position.set(sx * 0.068, 0.096, -0.088);
    b.scale.set(1.2, 0.7, 0.4);
    head.add(b);
  }
  // Big grin: a dark mouth with a row of teeth and a pink tongue.
  // Boys get a confident lopsided smirk (tilted, a little to one side).
  const smile = new THREE.Group();
  smile.position.set(female ? 0 : 0.008, 0.07, -0.101);
  smile.rotation.set(-0.25, 0, female ? 0 : 0.16);
  head.add(smile);
  const mouthMat = new THREE.MeshStandardMaterial({ color: '#4a1018', roughness: 0.6, side: THREE.DoubleSide });
  const grin = new THREE.Mesh(g('grin', () => new THREE.CircleGeometry(0.03, 24, Math.PI, Math.PI)), mouthMat);
  grin.scale.set(1.25, 0.8, 1);
  grin.rotation.y = Math.PI;
  smile.add(grin);
  const teeth = new THREE.Mesh(box(0.062, 0.009, 0.003, 0.002), mat('#ffffff', { roughness: 0.3 }));
  teeth.position.set(0, -0.004, -0.001);
  smile.add(teeth);
  const tongue = new THREE.Mesh(g('tongue', () => new THREE.CircleGeometry(0.014, 16, Math.PI, Math.PI)), new THREE.MeshStandardMaterial({ color: '#ff6b81', roughness: 0.5, side: THREE.DoubleSide }));
  tongue.position.set(0, -0.012, -0.001);
  tongue.scale.set(1.3, 0.8, 1);
  tongue.rotation.y = Math.PI;
  smile.add(tongue);
  const mouthO = new THREE.Mesh(g('mouthO', () => new THREE.CircleGeometry(0.018, 20)), mouthMat);
  mouthO.position.set(0, 0.06, -0.106);
  mouthO.rotation.set(-0.25, Math.PI, 0);
  mouthO.scale.set(1, 1.25, 1);
  head.add(mouthO);
  return { eyes, brows, smile, mouthO };
}

// ---------- cartoon outlines ----------
// Each big part gets a slightly bigger copy, drawn from the inside in dark
// brown. Only its edge shows, which looks like an ink outline.
let outlineMat = null;
function addOutlines(root) {
  outlineMat ??= (() => {
    const m = new THREE.MeshBasicMaterial({ color: '#2a1810', side: THREE.BackSide });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize(normal) * 0.008;');
    };
    return m;
  })();
  const targets = [];
  root.traverse((o) => {
    if (o.isMesh && o.castShadow && !o.material.transparent && !o.material.isMeshBasicMaterial && !o.userData.isOutline) targets.push(o);
  });
  for (const o of targets) {
    const line = new THREE.Mesh(o.geometry, outlineMat);
    line.userData.isOutline = true;
    o.add(line);
  }
}

// ---------- hair ----------
// A cap of hair that follows the skull, tilted back so the forehead shows
function hairCap(head, hairMat, { r = 0.122, theta = 0.56, tilt = 0.42, y = 0.135 } = {}) {
  const m = part(g(`hcap${r},${theta}`, () => new THREE.SphereGeometry(r, 30, 16, 0, Math.PI * 2, 0, Math.PI * theta)), hairMat, 0, y, 0.012);
  m.scale.set(0.92, 1.08, 1.06);
  m.rotation.x = tilt;
  head.add(m);
  return m;
}

function buildHairStyle(head, look, hairMat) {
  const parts = {};
  const style = look.hat === 'cap' || look.hat === 'beanie' ? (look.hair === 'bald' ? 'bald' : 'buzz') : look.hair;
  switch (style) {
    case 'short':
      hairCap(head, hairMat);
      for (const sx of [-1, 1]) head.add(part(box(0.014, 0.05, 0.05, 0.006), hairMat, sx * 0.1, 0.12, 0.0)); // sideburns
      break;
    case 'quiff': {
      hairCap(head, hairMat);
      const q = part(cap(0.04, 0.09), hairMat, 0.0, 0.23, -0.055);
      q.rotation.set(-0.9, 0, Math.PI / 2);
      head.add(q);
      head.add(part(sph(0.06, 14, 10), hairMat, 0.01, 0.235, -0.03));
      break;
    }
    case 'buzz':
      hairCap(head, mat(look.hairColor, { roughness: 0.9 }), { r: 0.118, theta: 0.58 });
      break;
    case 'curly':
      hairCap(head, hairMat, { r: 0.124 });
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const ring = i % 2 ? 0.07 : 0.035;
        head.add(part(sph(0.036, 10, 8), hairMat, Math.cos(a) * ring, 0.24 + (i % 3) * 0.01, Math.sin(a) * ring + 0.015));
      }
      for (let i = 0; i < 8; i++) {
        const a = -0.4 + (i / 7) * (Math.PI + 0.8);
        head.add(part(sph(0.03, 10, 8), hairMat, Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1 + 0.01));
      }
      break;
    case 'spiky':
      hairCap(head, hairMat);
      for (let i = 0; i < 11; i++) {
        const spike = part(g('spike', () => new THREE.ConeGeometry(0.03, 0.1, 8)), hairMat, 0, 0, 0);
        const a = -0.9 + (i % 6) * 0.36;
        const row = Math.floor(i / 6);
        spike.position.set(Math.sin(a) * 0.07, 0.24 - row * 0.02, -0.03 + row * 0.07);
        spike.rotation.set(-0.3 + row * 0.7, 0, -a * 0.5);
        head.add(spike);
      }
      break;
    case 'long': {
      hairCap(head, hairMat, { theta: 0.6, tilt: 0.3 });
      const back = part(box(0.22, 0.32, 0.08, 0.04), hairMat, 0, 0.0, 0.085);
      back.rotation.x = 0.12;
      head.add(back);
      for (const sx of [-1, 1]) head.add(part(box(0.04, 0.22, 0.07, 0.02), hairMat, sx * 0.1, 0.04, 0.0));
      parts.swing = null;
      break;
    }
    case 'ponytail': {
      hairCap(head, hairMat, { theta: 0.6, tilt: 0.32 });
      const tail = new THREE.Group();
      tail.position.set(0, 0.16, 0.115);
      tail.add(part(g('band', () => new THREE.TorusGeometry(0.022, 0.009, 8, 14)), mat(look.hatColor), 0, 0, 0));
      const lock = part(cap(0.032, 0.2), hairMat, 0, -0.12, 0.03);
      lock.rotation.x = -0.25;
      tail.add(lock);
      head.add(tail);
      parts.swing = tail;
      break;
    }
    case 'bun':
      hairCap(head, hairMat, { theta: 0.6, tilt: 0.3 });
      head.add(part(sph(0.055, 16, 12), hairMat, 0, 0.25, 0.06));
      break;
    case 'bald':
      for (const sx of [-1, 1]) {
        const side = part(sph(0.05, 12, 10), hairMat, sx * 0.095, 0.13, 0.04);
        side.scale.set(0.5, 0.8, 1.3);
        head.add(side);
      }
      break;
  }
  return parts;
}

function buildBeard(head, look, hairMat) {
  const b = look.beard;
  if (!b || b === 'none') return;
  if (b === 'stubble' || b === 'beard') {
    // A shell over the jaw; stubble is see-through
    const shellMat = b === 'stubble' ? new THREE.MeshStandardMaterial({ color: look.hairColor, transparent: true, opacity: 0.38, roughness: 1, depthWrite: false }) : hairMat;
    const shell = part(g(`beard${b}`, () => new THREE.SphereGeometry(b === 'beard' ? 0.104 : 0.099, 26, 16, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.42, Math.PI * 0.5)), shellMat, 0, 0.07, -0.016, b === 'beard');
    shell.rotation.y = Math.PI; // open side towards the back of the head
    shell.scale.set(0.98, b === 'beard' ? 0.95 : 0.8, 1);
    head.add(shell);
    if (b === 'beard') head.add(part(sph(0.045, 14, 10), hairMat, 0, 0.015, -0.075));
  }
  if (b === 'mustache' || b === 'beard' || b === 'goatee') {
    const m = part(cap(0.009, 0.04), hairMat, 0, 0.074, -0.108, false);
    m.rotation.z = Math.PI / 2;
    head.add(m);
  }
  if (b === 'goatee') head.add(part(sph(0.022, 12, 10), hairMat, 0, 0.022, -0.09));
}

function buildExtras(head, look) {
  if (look.hat === 'cap') {
    const capMat = mat(look.hatColor, { roughness: 0.5 });
    const dome = part(g('capdome', () => new THREE.SphereGeometry(0.128, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)), capMat, 0, 0.165, 0.008);
    dome.scale.set(0.95, 0.9, 1.04);
    head.add(dome);
    head.add(part(box(0.15, 0.012, 0.11, 0.006), capMat, 0, 0.17, 0.155)); // backwards brim
    head.add(part(sph(0.012, 8, 6), capMat, 0, 0.28, 0.0));
  } else if (look.hat === 'beanie') {
    const beanie = part(g('beanie', () => new THREE.SphereGeometry(0.128, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55)), mat(look.hatColor, { roughness: 0.95 }), 0, 0.15, 0.01);
    beanie.scale.set(0.95, 1.12, 1.05);
    head.add(beanie);
    const fold = part(g('fold', () => new THREE.TorusGeometry(0.112, 0.018, 8, 28)), mat(look.hatColor, { roughness: 0.95 }), 0, 0.17, 0.01);
    fold.rotation.x = Math.PI / 2 + 0.25;
    head.add(fold);
  }
  if (look.glasses === 'glasses' || look.glasses === 'shades') {
    const frame = mat(look.glassesColor ?? '#1b1b22', { roughness: 0.3, metalness: 0.4 });
    for (const sx of [-0.041, 0.041]) {
      if (look.glasses === 'shades') {
        head.add(part(box(0.04, 0.026, 0.006, 0.006), mat('#14121a', { roughness: 0.05, metalness: 0.7 }), sx, 0.142, -0.113, false));
      } else {
        const ring = part(g('lens', () => new THREE.TorusGeometry(0.02, 0.0035, 6, 20)), frame, sx, 0.142, -0.111, false);
        ring.scale.set(1.15, 0.9, 1);
        head.add(ring);
      }
    }
    head.add(part(box(0.022, 0.004, 0.004, 0.001), frame, 0, 0.146, -0.113, false));
    for (const sx of [-1, 1]) head.add(part(box(0.004, 0.004, 0.11, 0.001), frame, sx * 0.064, 0.146, -0.06, false));
  }
}
