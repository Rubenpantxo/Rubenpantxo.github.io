/* ============================================
   INPUT: P1 (flechas/zxc/shift) y P2 (wasd/fgh/tab)
   ============================================ */

const Input = (() => {
  const keys = new Set();
  const justPressed = new Set();
  const listeners = [];

  function isDown(key) { return keys.has(key); }
  function wasJustPressed(key) { return justPressed.has(key); }
  function on(callback) { listeners.push(callback); }
  function off(callback) {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  }
  function clear() { listeners.length = 0; }
  function emit(action, raw) { for (const cb of listeners) cb(action, raw); }

  function mapKey(e) {
    const key = e.key;
    if (key === "ArrowUp") return { player: 1, action: "up" };
    if (key === "ArrowDown") return { player: 1, action: "down" };
    if (key === "ArrowLeft") return { player: 1, action: "left" };
    if (key === "ArrowRight") return { player: 1, action: "right" };
    if (key === " ") return { player: 1, action: "confirm" };
    if (key === "Enter") return { player: 1, action: "confirm" };
    if (key === "z" || key === "Z") return { player: 1, action: "punch" };
    if (key === "x" || key === "X") return { player: 1, action: "kick" };
    if (key === "Shift") return { player: 1, action: "block" };
    if (key === "Escape") return { player: 0, action: "back" };
    if (key === "p" || key === "P") return { player: 0, action: "pause" };

    if (key === "w" || key === "W") return { player: 2, action: "up" };
    if (key === "s" || key === "S") return { player: 2, action: "down" };
    if (key === "a" || key === "A") return { player: 2, action: "left" };
    if (key === "d" || key === "D") return { player: 2, action: "right" };
    if (key === "f" || key === "F") return { player: 2, action: "punch" };
    if (key === "g" || key === "G") return { player: 2, action: "kick" };
    if (key === "h" || key === "H") return { player: 2, action: "block" };
    if (key === "Tab") return { player: 2, action: "confirm" };

    return null;
  }

  document.addEventListener("keydown", (e) => {
    const m = mapKey(e);
    if (!m) return;
    e.preventDefault();
    const id = `${m.player}:${m.action}`;
    if (!keys.has(id)) {
      keys.add(id);
      justPressed.add(id);
      emit({ ...m, type: "press" }, e);
    }
  });

  document.addEventListener("keyup", (e) => {
    const m = mapKey(e);
    if (!m) return;
    const id = `${m.player}:${m.action}`;
    keys.delete(id);
    emit({ ...m, type: "release" }, e);
  });

  function tick() { justPressed.clear(); }

  // Emisión sintética desde touch
  function fireSynthetic(player, action, type) {
    const id = `${player}:${action}`;
    if (type === 'press') {
      if (!keys.has(id)) {
        keys.add(id);
        justPressed.add(id);
        emit({ player, action, type: 'press' });
      }
    } else if (type === 'release') {
      keys.delete(id);
      emit({ player, action, type: 'release' });
    }
  }

  return { on, off, clear, isDown, wasJustPressed, tick, fireSynthetic };
})();

window.Input = Input;
