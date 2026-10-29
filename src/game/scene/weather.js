// ============================================================
// weather.js: monsoon rain. 900 short lines that fall around the
// camera and wrap back to the top. Cheap but convincing.
// ============================================================
import * as THREE from 'three';

const COUNT = 900;

export class Rain {
  constructor(scene) {
    this.drops = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.drops[i * 3] = (Math.random() - 0.5) * 26;
      this.drops[i * 3 + 1] = Math.random() * 18;
      this.drops[i * 3 + 2] = -45 + Math.random() * 52;
    }
    this.positions = new Float32Array(COUNT * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.mat = new THREE.LineBasicMaterial({ color: '#d6e6ff', transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.mat);
    this.lines.frustumCulled = false;
    this.geo = geo;
    scene.add(this.lines);
  }

  update(rain, game, dt) {
    this.lines.visible = rain > 0.02;
    if (!this.lines.visible) return;
    this.mat.opacity = rain * 0.55;
    const fall = 26 * dt;
    const slide = game.speed * dt * 0.35; // drops streak towards you as you run
    const d = this.drops;
    const p = this.positions;
    for (let i = 0; i < COUNT; i++) {
      d[i * 3 + 1] -= fall;
      d[i * 3 + 2] += slide;
      if (d[i * 3 + 1] < 0) {
        d[i * 3 + 1] += 18;
        d[i * 3] = (Math.random() - 0.5) * 26;
      }
      if (d[i * 3 + 2] > 7) d[i * 3 + 2] -= 52;
      const x = d[i * 3];
      const y = d[i * 3 + 1];
      const z = d[i * 3 + 2];
      p.set([x, y, z, x + 0.04, y + 0.7, z - 0.25], i * 6);
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
