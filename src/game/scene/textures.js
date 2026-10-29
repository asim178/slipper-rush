// ============================================================
// textures.js: every image in the game is painted with the
// 2D canvas API and turned into a Three.js texture.
// No image files to download, and you can tweak them in code.
// ============================================================
import * as THREE from 'three';

const FONT = '"Lilita One", "Arial Black", Impact, sans-serif';

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

function make(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(canvas, repeat = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

export function roadTexture(base = '#4a4556', edge = '#ffcf3a') {
  const [c, g] = make(1024, 1024);
  // Asphalt: base colour, then layers of fine grit and soft blotches
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 1024;
    const y = rnd() * 1024;
    const r = 30 + rnd() * 120;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.5;
    grad.addColorStop(0, dark ? 'rgba(20,16,30,0.18)' : 'rgba(120,112,140,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 16000; i++) {
    const v = rnd();
    g.fillStyle = v < 0.5 ? `rgba(255,255,255,${0.03 + rnd() * 0.06})` : `rgba(0,0,0,${0.05 + rnd() * 0.08})`;
    g.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  // A few cracks
  g.strokeStyle = 'rgba(15,12,22,0.45)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    let x = 100 + rnd() * 824;
    let y = rnd() * 1024;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (rnd() - 0.5) * 40;
      y += 10 + rnd() * 20;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // Worn paint: edge lines and dashed lane dividers with gaps in the paint
  const paintLine = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 30; i++) {
      g.fillStyle = base + 'b3';
      g.fillRect(x + rnd() * w, y + rnd() * h, 2, 2);
    }
  };
  paintLine(10, 0, 18, 1024, edge);
  paintLine(996, 0, 18, 1024, edge);
  for (const x of [1024 / 3, 2048 / 3]) {
    paintLine(x - 9, 60, 18, 380, '#f2f2f2');
    paintLine(x - 9, 572, 18, 380, '#f2f2f2');
  }
  return finish(c, true);
}

export function sidewalkTexture() {
  const [c, g] = make(256, 256);
  g.fillStyle = '#c9b292';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = `hsl(${28 + rnd() * 10}, ${32 + rnd() * 10}%, ${76 + rnd() * 8}%)`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
  }
  return finish(c, true);
}

// Yellow and black painted kerb stones
export function curbTexture(a = '#ffd23f', b = '#25212e') {
  const [c, g] = make(128, 16);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? b : a;
    g.fillRect(i * 32, 0, 32, 16);
  }
  return finish(c, true);
}

// One 3 m x 3 m window bay. It is mostly white so each house's
// material colour tints it.
// One 3 m x 3 m bay of a building front: plaster, a window with a frame,
// shutters and a flower box. It is mostly light grey so each house's
// material colour tints it.
export function facadeTexture() {
  const [c, g] = make(512, 512);
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 512, 512);
  // Plaster: soft stains and grain
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 20 + rnd() * 80;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.4)';
    g.fillRect(rnd() * 512, rnd() * 512, 2, 2);
  }
  // Floor moulding
  g.fillStyle = '#d0d0d0';
  g.fillRect(0, 470, 512, 42);
  g.fillStyle = '#e6e6e6';
  g.fillRect(0, 470, 512, 8);
  // Shutters
  g.fillStyle = '#bdbdbd';
  g.fillRect(92, 96, 56, 280);
  g.fillRect(364, 96, 56, 280);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 104; y < 370; y += 14) {
    g.fillRect(96, y, 48, 4);
    g.fillRect(368, y, 48, 4);
  }
  // Window frame and glass with a reflection
  g.fillStyle = '#fafafa';
  g.fillRect(146, 84, 220, 304);
  const glassGrad = g.createLinearGradient(160, 96, 352, 372);
  glassGrad.addColorStop(0, '#7aa2e3');
  glassGrad.addColorStop(0.5, '#3b5a9a');
  glassGrad.addColorStop(1, '#1d2d5a');
  g.fillStyle = glassGrad;
  g.fillRect(162, 100, 188, 272);
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.beginPath();
  g.moveTo(180, 100);
  g.lineTo(250, 100);
  g.lineTo(170, 260);
  g.lineTo(162, 220);
  g.fill();
  g.fillStyle = '#fafafa';
  g.fillRect(252, 100, 8, 272);
  g.fillRect(162, 230, 188, 8);
  // Window grill
  g.strokeStyle = 'rgba(40,40,50,0.35)';
  g.lineWidth = 3;
  for (let x = 176; x < 350; x += 24) {
    g.beginPath();
    g.moveTo(x, 100);
    g.lineTo(x, 372);
    g.stroke();
  }
  // Sill and flower box
  g.fillStyle = '#c4c4c4';
  g.fillRect(132, 386, 248, 14);
  g.fillStyle = '#9a9a9a';
  g.fillRect(160, 400, 192, 34);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 2 ? '#6f8f5f' : '#8fb070';
    g.beginPath();
    g.arc(172 + i * 21, 398, 13, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c, true);
}

const signCache = new Map();
export function signTexture(text, bg) {
  const key = text + bg;
  if (signCache.has(key)) return signCache.get(key);
  const [c, g] = make(512, 128);
  g.fillStyle = bg;
  roundRect(g, 4, 4, 504, 120, 26);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 8;
  roundRect(g, 14, 14, 484, 100, 20);
  g.stroke();
  g.font = `70px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.strokeText(text, 256, 70);
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 70);
  const t = finish(c);
  signCache.set(key, t);
  return t;
}

// Painted truck panels in the style of South Asian truck art:
// zig-zag borders, mirror chips, flowers, and "HORN PLEASE" on the back.
const ART_PALETTES = [
  ['#ff3b5c', '#ffd23f', '#13b5a5', '#3d5afe', '#ffffff'],
  ['#13b5a5', '#ff8a00', '#ff3b5c', '#ffe14d', '#ffffff'],
  ['#3d5afe', '#ffd23f', '#ff3b5c', '#20c25a', '#ffffff'],
];
const artCache = new Map();
export function truckArtTexture(variant = 0, rear = false) {
  const key = `${variant}-${rear}`;
  if (artCache.has(key)) return artCache.get(key);
  const P = ART_PALETTES[variant % ART_PALETTES.length];
  const [c, g] = make(512, 256);
  g.fillStyle = P[0];
  g.fillRect(0, 0, 512, 256);

  const zigzag = (y, h, c1, c2) => {
    for (let x = -16; x < 512; x += 32) {
      g.fillStyle = c1;
      g.beginPath();
      g.moveTo(x, y + h);
      g.lineTo(x + 16, y);
      g.lineTo(x + 32, y + h);
      g.fill();
      g.fillStyle = c2;
      g.beginPath();
      g.moveTo(x + 16, y);
      g.lineTo(x + 32, y + h);
      g.lineTo(x + 48, y);
      g.fill();
    }
  };
  zigzag(0, 28, P[2], P[3]);
  zigzag(228, 28, P[3], P[2]);
  for (let x = 16; x < 512; x += 28) {
    g.fillStyle = P[4];
    for (const y of [42, 214]) {
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = P[3];
  roundRect(g, 40, 58, 432, 140, 40);
  g.fill();
  g.strokeStyle = P[1];
  g.lineWidth = 8;
  g.stroke();

  const flower = (cx, cy, r) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle = i % 2 ? P[0] : P[2];
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.8, r * 0.42, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = P[1];
    g.beginPath();
    g.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P[4];
    g.beginPath();
    g.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    g.fill();
  };

  if (rear) {
    g.font = `68px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 12;
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.strokeText('HORN PLEASE', 256, 116);
    g.fillStyle = P[1];
    g.fillText('HORN PLEASE', 256, 116);
    g.font = `30px ${FONT}`;
    g.fillStyle = P[4];
    g.fillText('DRIVE SAFE', 256, 168);
  } else {
    flower(256, 128, 34);
    flower(130, 128, 22);
    flower(382, 128, 22);
  }
  const t = finish(c);
  artCache.set(key, t);
  return t;
}

export function crateTexture() {
  const [c, g] = make(128, 128);
  g.fillStyle = '#c98a4b';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#a86f38';
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y + 28, 128, 4);
  g.strokeStyle = '#8a5527';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 118, 118);
  g.beginPath();
  g.moveTo(10, 10);
  g.lineTo(118, 118);
  g.stroke();
  return finish(c);
}

export function jerseyTexture() {
  const [c, g] = make(128, 128);
  g.fillStyle = '#14a04e';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffd23f';
  g.fillRect(0, 12, 128, 10);
  g.font = `76px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = '#0b5e2d';
  g.strokeText('10', 64, 76);
  g.fillStyle = '#ffffff';
  g.fillText('10', 64, 76);
  return finish(c);
}

export function kiteTexture() {
  const [c, g] = make(128, 128);
  const cols = ['#ff3b5c', '#ffd23f', '#2fa8ff', '#20c25a'];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = cols[i];
    g.fillRect((i % 2) * 64, Math.floor(i / 2) * 64, 64, 64);
  }
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 122, 122);
  return finish(c);
}

// White icons for the power-up orbs
export function iconTexture(type) {
  if (type === 'chai') return chaiIconTexture();
  const [c, g] = make(128, 128);
  g.translate(64, 64);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (type === 'forcefield') {
    // A shield with a plus
    g.beginPath();
    g.moveTo(0, -46); g.lineTo(38, -32); g.lineTo(38, 0); g.quadraticCurveTo(36, 30, 0, 48); g.quadraticCurveTo(-36, 30, -38, 0); g.lineTo(-38, -32); g.closePath();
    g.fill();
    g.strokeStyle = '#39c6ff'; g.lineWidth = 10; g.shadowBlur = 0;
    g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 26); g.moveTo(-22, 0); g.lineTo(22, 0); g.stroke();
  } else if (type === 'blaster') {
    // A water balloon
    g.beginPath(); g.arc(4, -8, 34, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(4, 26); g.lineTo(-6, 40); g.lineTo(14, 40); g.closePath(); g.fill();
    g.fillStyle = '#ff8fa3'; g.beginPath(); g.arc(-8, -20, 9, 0, Math.PI * 2); g.fill();
  } else if (type === 'jetpack') {
    g.beginPath();
    g.roundRect(-26, -40, 52, 56, 14);
    g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.moveTo(-14, 20);
    g.lineTo(-4, 20);
    g.lineTo(-9, 46);
    g.closePath();
    g.moveTo(4, 20);
    g.lineTo(14, 20);
    g.lineTo(9, 46);
    g.closePath();
    g.fill();
  } else if (type === 'board') {
    g.rotate(-0.4);
    g.beginPath();
    g.roundRect(-46, -12, 92, 22, 11);
    g.fill();
    for (const x of [-28, 28]) {
      g.beginPath();
      g.arc(x, 18, 9, 0, Math.PI * 2);
      g.fill();
    }
  } else if (type === 'magnet') {
    g.lineWidth = 20;
    g.beginPath();
    g.moveTo(-26, -34);
    g.lineTo(-26, 2);
    g.arc(0, 2, 26, Math.PI, 0, true);
    g.lineTo(26, -34);
    g.stroke();
  } else if (type === 'shield') {
    g.beginPath();
    g.arc(0, 10, 38, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillRect(-46, 8, 92, 12);
  } else if (type === 'turbo') {
    g.beginPath();
    g.moveTo(10, -44);
    g.lineTo(-26, 6);
    g.lineTo(-2, 6);
    g.lineTo(-12, 44);
    g.lineTo(26, -8);
    g.lineTo(2, -8);
    g.closePath();
    g.fill();
  } else if (type === 'double') {
    g.font = `64px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('x2', 0, 4);
  } else if (type === 'kite') {
    g.beginPath();
    g.moveTo(0, -44);
    g.lineTo(30, -6);
    g.lineTo(0, 28);
    g.lineTo(-30, -6);
    g.closePath();
    g.fill();
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 28);
    g.quadraticCurveTo(14, 38, 0, 50);
    g.stroke();
  }
  return finish(c);
}

export function skyTexture() {
  const [c, g] = make(4, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2b93ff');
  grad.addColorStop(0.45, '#79c6ff');
  grad.addColorStop(0.75, '#ffd9a8');
  grad.addColorStop(1, '#ffc48c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  return finish(c);
}

// Distant city with domes and minarets
export function skylineTexture() {
  const [c, g] = make(1024, 256);
  const layer = (color, minH, maxH, step) => {
    g.fillStyle = color;
    for (let x = 0; x < 1024; x += step) {
      const h = minH + rnd() * (maxH - minH);
      const w = step + 6;
      g.fillRect(x, 256 - h, w, h);
      if (rnd() > 0.82) {
        g.beginPath();
        g.arc(x + w / 2, 256 - h, w / 2, Math.PI, 0);
        g.fill();
        g.fillRect(x + 2, 256 - h - 70, 7, 70);
        g.beginPath();
        g.moveTo(x, 256 - h - 70);
        g.lineTo(x + 5.5, 256 - h - 86);
        g.lineTo(x + 11, 256 - h - 70);
        g.fill();
      }
    }
  };
  layer('rgba(196, 160, 222, 0.75)', 60, 150, 34);
  layer('rgba(150, 112, 196, 0.9)', 30, 100, 46);
  return finish(c);
}

export function glowTexture() {
  const [c, g] = make(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return finish(c);
}

// Night-time window lights: 4 window bays, randomly lit, used as an emissive map
export function windowLightsTexture() {
  const [c, g] = make(1024, 256);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 4; i++) {
    if (rnd() < 0.35) continue;
    const warm = g.createLinearGradient(0, 56, 0, 190);
    warm.addColorStop(0, rnd() < 0.3 ? '#9fd0ff' : '#ffd27a');
    warm.addColorStop(1, '#ff9c3c');
    g.fillStyle = warm;
    g.fillRect(i * 256 + 81, 50, 94, 136);
  }
  return finish(c, true);
}

// Soft puffy cloud made of overlapping blurred circles
export function cloudTexture() {
  const [c, g] = make(256, 128);
  for (let i = 0; i < 14; i++) {
    const x = 40 + rnd() * 176;
    const y = 64 + (rnd() - 0.5) * 30;
    const r = 18 + rnd() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

export function chaiIconTexture() {
  const [c, g] = make(128, 128);
  g.translate(64, 64);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 6;
  g.beginPath();
  g.moveTo(-30, -8);
  g.lineTo(30, -8);
  g.lineTo(22, 34);
  g.lineTo(-22, 34);
  g.closePath();
  g.fill();
  g.lineWidth = 8;
  g.beginPath();
  g.arc(34, 10, 12, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  g.lineWidth = 6;
  g.lineCap = 'round';
  for (const x of [-12, 4]) {
    g.beginPath();
    g.moveTo(x, -18);
    g.quadraticCurveTo(x + 10, -30, x, -42);
    g.stroke();
  }
  return finish(c);
}

// Magic carpet pattern
export function carpetTexture() {
  const [c, g] = make(256, 384);
  g.fillStyle = '#b0123f';
  g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 10;
  g.strokeRect(14, 14, 228, 356);
  g.strokeStyle = '#13b5a5';
  g.lineWidth = 6;
  g.strokeRect(30, 30, 196, 324);
  g.fillStyle = '#ffd23f';
  g.translate(128, 192);
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.beginPath();
    g.ellipse(0, 46, 14, 40, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#13b5a5';
  g.beginPath();
  g.arc(0, 0, 24, 0, Math.PI * 2);
  g.fill();
  return finish(c);
}

// ============================================================
// World Tour textures
// ============================================================

// Railway: gravel ballast, wooden sleepers and two rails per lane
export function railTexture() {
  const [c, g] = make(512, 512);
  g.fillStyle = '#7d766c';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 90 + rnd() * 80;
    g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
    g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 3, 2 + rnd() * 3);
  }
  const laneW = 512 / 3;
  for (let lane = 0; lane < 3; lane++) {
    const cx = laneW * lane + laneW / 2;
    for (let y = 8; y < 512; y += 64) {
      g.fillStyle = '#5a3f2a';
      g.fillRect(cx - 70, y, 140, 26);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(cx - 70, y + 22, 140, 4);
    }
    for (const dx of [-42, 42]) {
      g.fillStyle = '#3c3a40';
      g.fillRect(cx + dx - 7, 0, 14, 512);
      g.fillStyle = '#c9ccd6';
      g.fillRect(cx + dx - 4, 0, 6, 512);
    }
  }
  return finish(c, true);
}

// Stone wall texture for mountain houses (tinted by the material colour)
export function stoneTexture() {
  const [c, g] = make(256, 256);
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    let x = row % 2 ? -20 : 0;
    while (x < 256) {
      const w = 34 + rnd() * 30;
      const v = 175 + rnd() * 60;
      g.fillStyle = `rgb(${v},${v},${v - 6})`;
      g.beginPath();
      g.roundRect(x + 2, row * 32 + 2, w - 4, 28, 8);
      g.fill();
      x += w;
    }
  }
  return finish(c, true);
}

// A painted welcome sign for the arch at the start of each place
const archCache = new Map();
export function archTexture(text, color) {
  const key = text + color;
  if (archCache.has(key)) return archCache.get(key);
  const [c, g] = make(1024, 192);
  const grad = g.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#1d2b53');
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(4, 4, 1016, 184, 40);
  g.fill();
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 12;
  g.beginPath();
  g.roundRect(18, 18, 988, 156, 30);
  g.stroke();
  g.font = `84px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.strokeText(text, 512, 100);
  g.fillStyle = '#ffffff';
  g.fillText(text, 512, 100);
  const t = finish(c);
  archCache.set(key, t);
  return t;
}

export function checkerTexture() {
  const [c, g] = make(256, 64);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? '#1b1b22' : '#ffffff';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  return finish(c, true);
}

// Volleyball net
export function netTexture() {
  const [c, g] = make(256, 128);
  g.clearRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  for (let x = 0; x <= 256; x += 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 128);
    g.stroke();
  }
  for (let y = 0; y <= 128; y += 16) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 14);
  return finish(c);
}

// Backdrops behind each place
export function backdropTexture(kind) {
  const [c, g] = make(1024, 256);
  if (kind === 'mountain') {
    const range = (base, color, snow, peaks) => {
      for (let i = 0; i < peaks; i++) {
        const x = (i / peaks) * 1100 - 40 + rnd() * 40;
        const h = base + rnd() * 90;
        const w = 120 + rnd() * 120;
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(x - w, 256);
        g.lineTo(x, 256 - h);
        g.lineTo(x + w, 256);
        g.fill();
        g.fillStyle = snow;
        g.beginPath();
        g.moveTo(x - w * 0.28, 256 - h * 0.72);
        g.lineTo(x, 256 - h);
        g.lineTo(x + w * 0.28, 256 - h * 0.72);
        g.lineTo(x + w * 0.1, 256 - h * 0.66);
        g.lineTo(x - w * 0.06, 256 - h * 0.74);
        g.closePath();
        g.fill();
      }
    };
    range(150, 'rgba(150,170,210,0.85)', 'rgba(255,255,255,0.95)', 8);
    range(90, 'rgba(96,120,170,0.95)', 'rgba(240,246,255,0.95)', 10);
  } else if (kind === 'beach') {
    g.fillStyle = 'rgba(120,150,190,0.7)';
    g.fillRect(620, 210, 14, 46); // lighthouse
    g.fillStyle = 'rgba(230,80,90,0.85)';
    g.fillRect(620, 222, 14, 8);
    for (const [x, s] of [[200, 1], [420, 0.7], [820, 0.85]]) {
      g.fillStyle = 'rgba(110,130,170,0.75)';
      g.beginPath();
      g.moveTo(x - 30 * s, 244);
      g.lineTo(x + 30 * s, 244);
      g.lineTo(x + 22 * s, 252);
      g.lineTo(x - 22 * s, 252);
      g.fill();
      g.fillRect(x - 3, 214 + (1 - s) * 20, 3, 30 * s);
    }
  } else if (kind === 'skyscrapers' || kind === 'vegas') {
    // A wall of towers far away, with lit windows (and neon tops in Vegas)
    const neon = ['#ff3bd4', '#39c6ff', '#ffd23f', '#7fff6a'];
    if (kind === 'vegas') {
      g.fillStyle = 'rgba(190,120,90,0.75)';
      g.beginPath(); g.moveTo(0, 256);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, 190 - Math.sin(x * 0.012) * 25 - rnd() * 20);
      g.lineTo(1024, 256); g.fill();
    }
    for (let i = 0; i < 46; i++) {
      const w = 16 + rnd() * 34;
      const x = rnd() * 1024;
      const h = (kind === 'vegas' ? 40 : 70) + rnd() * (kind === 'vegas' ? 110 : 170);
      g.fillStyle = `rgba(${70 + rnd() * 30},${80 + rnd() * 30},${120 + rnd() * 40},0.92)`;
      g.fillRect(x, 256 - h, w, h);
      if (rnd() < 0.25) { g.fillRect(x + w / 2 - 1.5, 256 - h - 22, 3, 22); } // antenna
      g.fillStyle = 'rgba(255,230,150,0.55)';
      for (let y = 256 - h + 6; y < 252; y += 9) for (let wx = x + 3; wx < x + w - 4; wx += 7) if (rnd() < 0.45) g.fillRect(wx, y, 3, 4);
      if (kind === 'vegas' && rnd() < 0.5) { g.fillStyle = neon[i % 4]; g.fillRect(x, 256 - h, w, 4); }
    }
  } else if (kind === 'hills') {
    // Golden hills with palm trees in front
    for (const [base, col] of [[120, 'rgba(200,140,110,0.7)'], [70, 'rgba(170,110,90,0.85)']]) {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, 256);
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 256 - base - Math.sin(x * 0.006 + base) * 30 - Math.sin(x * 0.02) * 10);
      g.lineTo(1024, 256); g.fill();
    }
    g.strokeStyle = 'rgba(80,60,70,0.85)'; g.fillStyle = 'rgba(80,60,70,0.85)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 115 + rnd() * 30;
      g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + 6, 220, x + 2, 180); g.stroke();
      for (let f = 0; f < 6; f++) { const a = (f / 6) * Math.PI * 2; g.beginPath(); g.moveTo(x + 2, 180); g.quadraticCurveTo(x + 2 + Math.cos(a) * 14, 174, x + 2 + Math.cos(a) * 24, 186 + Math.abs(Math.sin(a)) * 6); g.stroke(); }
    }
  } else {
    return skylineTexture();
  }
  return finish(c);
}

// Glass office windows for skyscrapers: a grid of blue panes with light frames
export function officeTexture(tint = '#3a6fb0') {
  const [c, g] = make(128, 128);
  g.fillStyle = '#d9dde8';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const grad = g.createLinearGradient(0, y * 32, 0, y * 32 + 28);
      grad.addColorStop(0, '#bfe4ff');
      grad.addColorStop(1, tint);
      g.fillStyle = grad;
      g.fillRect(x * 32 + 3, y * 32 + 3, 26, 25);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x * 32 + 5, y * 32 + 5, 6, 20);
    }
  }
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
