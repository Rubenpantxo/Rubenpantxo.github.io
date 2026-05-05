/* ============================================
   MAIN: arranque de la PWA
   ============================================ */

window.GAME_STATE = {
  p1Index: 0,
  p2Index: 1,
  mode: "vs-cpu",        // 'vs-cpu', 'vs-player', 'tournament'
  winner: null,
  rounds: { p1: 0, p2: 0 },
  tournament: null
};

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar storage para asegurar defaults
  Storage.load();

  // Touch / partículas
  Touch.init();
  Particles.init();

  // Registrar escenas
  SceneManager.register("loading", LoadingScene);
  SceneManager.register("menu", MenuScene);
  SceneManager.register("options", OptionsScene);
  SceneManager.register("select", SelectScene);
  SceneManager.register("battle", BattleScene);
  SceneManager.register("victory", VictoryScene);
  SceneManager.register("credits", CreditsScene);
  SceneManager.register("tournament", TournamentScene);

  SceneManager.go("loading");

  // Loop input ticks
  function loop() {
    Input.tick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Registrar Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('SW registration failed', err);
      });
    });
  }

  console.log("%c✅ TEKKEN BARRIO PS1 - PWA cargada", "color:#00ffff; font-size:14px;");
});
