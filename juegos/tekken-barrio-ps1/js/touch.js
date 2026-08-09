/* ============================================
   TOUCH: controles táctiles contextuales.

   Dos juegos de botones:
     - 'menu'   : dpad + OK + ESC (navegar menús)
     - 'battle' : ◀ ▶ mover, ▲ saltar, ▼ agacharse,
                  PUÑO / PATADA / BLOQ y pausa.
                  Sin OK, que en combate no hace nada.

   Extras pensados para jugar con los pulgares:
     - multitouch real (mover y golpear a la vez)
     - arrastrar el dedo dentro del pad cambia de dirección
       sin levantarlo
     - vibración corta al pulsar (configurable)
     - libera todo al pausar/cambiar de escena/perder el foco
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
  let layout = 'menu';
  let root = null;
  const active = new Map();   // pointerId -> botón pulsado

  function isMobile() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
      || (coarse && window.innerWidth < 1100)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  }

  function buzz(ms) {
    try {
      if (!navigator.vibrate) return;
      if (window.Storage && Storage.get('options.vibration') === false) return;
      navigator.vibrate(ms);
    } catch (e) { /* sin soporte */ }
  }

  function press(btn) {
    if (!btn || btn.dataset.pressed === '1') return;
    const map = KEY_MAP[btn.dataset.key];
    if (!map) return;
    btn.dataset.pressed = '1';
    btn.classList.add('pressed');
    Input.fireSynthetic(map.player, map.action, 'press');
    buzz(btn.dataset.key === 'z' || btn.dataset.key === 'x' ? 16 : 10);
  }

  function release(btn) {
    if (!btn || btn.dataset.pressed !== '1') return;
    const map = KEY_MAP[btn.dataset.key];
    btn.dataset.pressed = '0';
    btn.classList.remove('pressed');
    if (map) Input.fireSynthetic(map.player, map.action, 'release');
  }

  function releaseAll() {
    if (!root) return;
    active.clear();
    root.querySelectorAll('.touch-btn').forEach(release);
  }

  // Botón bajo un punto, limitado al pad indicado (para poder arrastrar)
  function btnAt(x, y, pad) {
    const scope = pad || root;
    if (!scope) return null;
    const btns = scope.querySelectorAll('.touch-btn');
    let best = null, bestD = Infinity;
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      if (r.width === 0) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return b;
      if (pad) {
        // dentro del pad, engancha al botón más cercano (tolerancia al dedo gordo)
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d < bestD) { bestD = d; best = b; }
      }
    }
    if (pad && best && bestD < 62) return best;
    return null;
  }

  function onDown(ev) {
    const btn = ev.target.closest ? ev.target.closest('.touch-btn') : null;
    if (!btn) return;
    ev.preventDefault();
    const pad = btn.closest('[data-pad]');
    active.set(ev.pointerId, { btn, pad });
    press(btn);
  }

  function onMove(ev) {
    const cur = active.get(ev.pointerId);
    if (!cur || !cur.pad) return;           // arrastrar solo dentro de un pad
    ev.preventDefault();
    const next = btnAt(ev.clientX, ev.clientY, cur.pad);
    if (next === cur.btn) return;
    release(cur.btn);
    if (next) {
      press(next);
      cur.btn = next;
    } else {
      active.delete(ev.pointerId);
    }
  }

  function onUp(ev) {
    const cur = active.get(ev.pointerId);
    if (!cur) return;
    active.delete(ev.pointerId);
    release(cur.btn);
  }

  function init() {
    root = document.getElementById('touch-controls');
    if (!root) return;

    applyPreference();

    root.addEventListener('pointerdown', onDown, { passive: false });
    // el arrastre se sigue en window: el dedo puede salirse del botón
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseAll();
    });
    // evitar menús contextuales al mantener pulsado
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // 'auto' | 'on' | 'off' desde opciones
  function applyPreference() {
    const pref = (window.Storage && Storage.get('options.touchControls')) || 'auto';
    const on = pref === 'on' || (pref !== 'off' && isMobile());
    setVisible(on);
  }

  function setVisible(v) {
    if (!root) root = document.getElementById('touch-controls');
    if (!root) return;
    if (!v) releaseAll();
    root.classList.toggle('hidden', !v);
    visible = v;
  }

  function isVisible() { return visible; }

  // Cambia el juego de botones ('menu' | 'battle')
  function setLayout(name) {
    if (!root) root = document.getElementById('touch-controls');
    if (!root) return;
    const next = (name === 'battle') ? 'battle' : 'menu';
    if (next === layout) return;
    releaseAll();
    layout = next;
    root.dataset.layout = layout;
  }

  function getLayout() { return layout; }

  // Altura que ocupan los controles de combate (para que los
  // luchadores queden por encima). Se lee de la CSS (--pad-h).
  function getBattleInset() {
    if (!visible) return 0;
    if (!root) root = document.getElementById('touch-controls');
    if (!root) return 0;
    const raw = getComputedStyle(root).getPropertyValue('--pad-h').trim();
    const n = parseFloat(raw);
    if (isNaN(n)) return 180;
    return Math.round(n);
  }

  return {
    init, setVisible, isVisible, isMobile,
    setLayout, getLayout, getBattleInset, releaseAll, applyPreference
  };
})();

window.Touch = Touch;
