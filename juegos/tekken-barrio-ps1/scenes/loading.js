/* ============================================
   LOADING SCENE: progreso animado al arrancar
   ============================================ */

const LoadingScene = (() => {
  const tips = [
    "Z / PUÑO golpea alto: el rival agachado lo esquiva",
    "X / PATADA pilla a los agachados y sirve de antiaérea",
    "Agachado + patada = BARRIDO a las piernas",
    "Salta (↑ / ▲) y golpea en el aire para castigar desde arriba",
    "Mantén SHIFT / BLOQ para bloquear: agachado protege más",
    "Gana 2 rondas para ganar el combate",
    "En modo torneo, 3 victorias y eres CAMPEÓN",
    "PWA: instala el juego en tu pantalla de inicio"
  ];

  function render() {
    const tip = tips[Math.floor(Math.random() * tips.length)];
    SceneManager.getRoot().innerHTML = `
      <div class="loading-scene">
        <div class="loading-logo">TEKKEN BARRIO</div>
        <div class="loading-sublogo">PS1 EDITION</div>

        <div class="loading-bar-wrap">
          <div class="loading-bar-fill" id="loading-fill"></div>
        </div>
        <div class="loading-percent" id="loading-percent">0%</div>
        <div class="loading-status" id="loading-status">INICIALIZANDO...</div>
        <div class="loading-tip">TIP: ${tip}</div>
      </div>
    `;
  }

  const stages = [
    { pct: 10,  text: "CARGANDO MOTOR..." },
    { pct: 25,  text: "CARGANDO PERSONAJES..." },
    { pct: 45,  text: "DIBUJANDO LUCHADORES..." },
    { pct: 65,  text: "MONTANDO ESCENARIOS..." },
    { pct: 85,  text: "CALIBRANDO IA..." },
    { pct: 100, text: "¡LISTO!" }
  ];

  function setProgress(pct, text) {
    const fill = document.getElementById('loading-fill');
    const num = document.getElementById('loading-percent');
    const status = document.getElementById('loading-status');
    if (fill) fill.style.width = pct + '%';
    if (num) num.textContent = pct + '%';
    if (status && text) status.textContent = text;
  }

  // Los retratos se generan por código: los precalculamos aquí
  function preloadSprites() {
    return new Promise((resolve) => {
      setTimeout(() => {
        try { Portraits.warm(); } catch (e) { console.warn(e); }
        resolve(true);
      }, 30);
    });
  }

  let timer = null;

  function enter() {
    render();

    let i = 0;
    function tick() {
      if (i >= stages.length) {
        clearInterval(timer);
        timer = null;
        setTimeout(() => SceneManager.go('menu'), 400);
        return;
      }
      const s = stages[i++];
      setProgress(s.pct, s.text);
    }

    tick();
    timer = setInterval(tick, 400);

    // Preload paralelo
    preloadSprites();
  }

  function exit() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { enter, exit };
})();

window.LoadingScene = LoadingScene;
