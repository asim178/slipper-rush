// ============================================================
// fx.js: small helpers shared by the engine and spawner.
// ============================================================

let nextId = 1;
export const newId = () => nextId++; // every object gets an id so the 3D view can track it

export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The engine never plays sounds or touches the screen. It writes
// event names here, and Game.jsx turns them into sound and vibration.
export function emit(game, name) {
  game.events.push(name);
}

// Big centre-screen announcement ("TURBO RUSH!")
export function banner(game, text, color = '#ffd23f') {
  game.banner = { text, color, id: newId() };
}

// Small pop-up text ("DODGED! +25")
export function popup(game, text, color = '#ffffff') {
  game.popup = { text, color, id: newId() };
}

// 3D particle spray. z is the track position (metres along the road).
export function burst(game, x, y, z, count, opts = {}) {
  const { color = '#ffffff', speed = 4, life = 0.5, gravity = 8, up = 0 } = opts;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.random() * Math.PI - Math.PI / 2;
    const s = speed * (0.4 + Math.random() * 0.6);
    const l = life * (0.6 + Math.random() * 0.4);
    game.particles.push({
      x, y, z,
      vx: Math.cos(a) * Math.cos(b) * s,
      vy: Math.sin(b) * s + up * speed,
      vz: Math.sin(a) * Math.cos(b) * s,
      life: l,
      max: l,
      gravity,
      color: Array.isArray(color) ? color[i % color.length] : color,
    });
  }
}
