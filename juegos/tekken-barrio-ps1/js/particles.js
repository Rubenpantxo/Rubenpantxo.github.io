/* ============================================
   PARTÍCULAS: canvas overlay para efectos
   ============================================ */

const Particles = (() => {
  let canvas, ctx;
  let particles = [];
  let rafId = null;
  let enabled = true;
  let lastFrame = 0;

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    if (window.Storage) {
      enabled = Storage.get('options.particles') !== false;
    }

    loop(performance.now());
  }

  function setEnabled(v) {
    enabled = v;
    if (!enabled) particles.length = 0;
  }

  function spawn(x, y, opts = {}) {
    if (!enabled || !canvas) return;
    const count = opts.count ?? 14;
    const colors = opts.colors ?? ['#ffe600', '#ff3030', '#ffffff', '#00e5ff'];
    const speed = opts.speed ?? 5;
    const life = opts.life ?? 600;
    const size = opts.size ?? 4;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1,
        gravity: opts.gravity ?? 0.15,
        size: size * (0.5 + Math.random() * 1.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        born: performance.now()
      });
    }
  }

  function spawnHit(x, y) {
    spawn(x, y, {
      count: 20,
      colors: ['#ffe600', '#ff3030', '#ffffff'],
      speed: 6,
      life: 500,
      size: 5
    });
  }

  function spawnConfetti(x, y) {
    spawn(x, y, {
      count: 40,
      colors: ['#ffe600', '#00ff66', '#00e5ff', '#ff00ff', '#ff3030'],
      speed: 8,
      life: 1500,
      gravity: 0.25,
      size: 6
    });
  }

  function spawnBurst(x, y, color = '#00e5ff') {
    spawn(x, y, {
      count: 12,
      colors: [color, '#ffffff'],
      speed: 4,
      life: 400,
      gravity: 0,
      size: 3
    });
  }

  function loop(t) {
    rafId = requestAnimationFrame(loop);
    if (!ctx || !canvas) return;
    const dt = Math.min(48, t - lastFrame);
    lastFrame = t;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!enabled) return;

    const alive = [];
    for (const p of particles) {
      const age = t - p.born;
      if (age >= p.life) continue;
      const a = 1 - age / p.life;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;

      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);

      alive.push(p);
    }
    particles = alive;
    ctx.globalAlpha = 1;
  }

  return { init, spawn, spawnHit, spawnConfetti, spawnBurst, setEnabled };
})();

window.Particles = Particles;
