/* ============================================
   TOUCH: controles táctiles que mapean a Input.fireSynthetic
   ============================================ */

const Touch = (() => {
  const KEY_MAP = {
    'ArrowUp':    { player: 1, action: 'up' },
    'ArrowDown':  { player: 1, action: 'down' },
    'ArrowLeft':  { player: 1, action: 'left' },
    'ArrowRight': { player: 1, action: 'right' },
    ' ':          { player: 1, action: 'confirm' },
    'z':          { player: 1, action: 'punch' },
    'x':          { player: 1, action: 'kick' },
    'Shift':      { player: 1, action: 'block' },
    'p':          { player: 0, action: 'pause' },
    'Escape':     { player: 0, action: 'back' }
  };

  let visible = false;

  function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  }

  function setupButton(btn) {
    const key = btn.dataset.key;
    const map = KEY_MAP[key];
    if (!map) return;

    let active = false;

    const press = (ev) => {
      ev.preventDefault();
      if (active) return;
      active = true;
      Input.fireSynthetic(map.player, map.action, 'press');
    };
    const release = (ev) => {
      if (ev) ev.preventDefault();
      if (!active) return;
      active = false;
      Input.fireSynthetic(map.player, map.action, 'release');
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  }

  function init() {
    const root = document.getElementById('touch-controls');
    if (!root) return;

    if (isMobile()) {
      root.classList.remove('hidden');
      visible = true;
    }

    document.querySelectorAll('.touch-btn').forEach(setupButton);
  }

  function setVisible(v) {
    const root = document.getElementById('touch-controls');
    if (!root) return;
    root.classList.toggle('hidden', !v);
    visible = v;
  }

  function isVisible() { return visible; }

  return { init, setVisible, isVisible, isMobile };
})();

window.Touch = Touch;
