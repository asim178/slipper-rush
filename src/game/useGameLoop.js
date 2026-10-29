// ============================================================
// useGameLoop.js: the heartbeat of the game
// ------------------------------------------------------------
// Every game runs on a loop:
//     read input -> update -> draw -> repeat
// The browser's requestAnimationFrame calls our function in time
// with the screen refresh (usually 60 times a second).
// ============================================================
import { useEffect, useRef } from 'react';

export function useGameLoop(onFrame, running) {
  // Keep the latest function in a ref so the loop never has to restart
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;

  useEffect(() => {
    if (!running) return;

    let last = performance.now();
    let id;

    const tick = (now) => {
      // dt = seconds since the last frame.
      // Capped at 0.05 so that coming back to the tab doesn't
      // make the kid jump straight through a wall.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frameRef.current(dt);
      id = requestAnimationFrame(tick);
    };

    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id); // stop the loop when the component goes away
  }, [running]);
}
