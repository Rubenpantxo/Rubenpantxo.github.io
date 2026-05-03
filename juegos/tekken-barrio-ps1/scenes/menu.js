/* ============================================
   MENU PRINCIPAL
   ============================================ */

const MenuScene = (() => {
  let activeIndex = 0;

  const options = [
    { label: "ARCADE (VS CPU)", action: () => startGame("vs-cpu") },
    { label: "VERSUS 2 JUGADORES", action: () => startGame("vs-player") },
    { label: "TORNEO", action: () => startTournament() },
    { label: "OPCIONES", action: () => SceneManager.go("options") },
    { label: "CRÉDITOS", action: () => SceneManager.go("credits") }
  ];

  function startGame(mode) {
    GAME_STATE.mode = mode;
    GAME_STATE.rounds = { p1: 0, p2: 0 };
    GAME_STATE.tournament = null;
    SceneManager.go("select");
  }

  function startTournament() {
    GAME_STATE.mode = "tournament";
    GAME_STATE.tournament = null;
    SceneManager.go("tournament");
  }

  function render() {
    const stats = Storage.get('stats');
    const winRate = (stats.totalWins + stats.totalLosses) > 0
      ? Math.round((stats.totalWins / (stats.totalWins + stats.totalLosses)) * 100)
      : 0;

    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="menu-scene">
        <div class="menu-logo">
          <div class="line1">TEKKEN</div>
          <div class="line2">BARRIO PS1</div>
          <div class="ps1-tag">ARCADE 1996</div>
        </div>

        <div class="menu-stats">
          <div class="stat">VICTORIAS <strong>${stats.totalWins}</strong></div>
          <div class="stat">DERROTAS <strong>${stats.totalLosses}</strong></div>
          <div class="stat">TORNEOS <strong>${stats.tournamentsWon}</strong></div>
          <div class="stat">% WIN <strong>${winRate}%</strong></div>
        </div>

        <div class="menu-options" id="menu-options">
          ${options.map((opt, i) => `
            <div class="menu-option ${i === activeIndex ? "active" : ""}" data-idx="${i}">
              ${opt.label}
            </div>
          `).join("")}
        </div>

        <div class="menu-press">PULSA ↑/↓ PARA NAVEGAR • ESPACIO/ENTER PARA SELECCIONAR</div>
        <div class="menu-copyright">© 1996 BARRIO ARCADE INC. ALL RIGHTS BARRIO.</div>
      </div>
    `;

    document.querySelectorAll(".menu-option").forEach(el => {
      el.addEventListener("click", () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        update(); confirm();
      });
      el.addEventListener("mouseenter", () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        update();
      });
    });
  }

  function update() {
    document.querySelectorAll(".menu-option").forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
    });
  }

  function move(dir) {
    activeIndex = (activeIndex + dir + options.length) % options.length;
    AudioMgr.play("sfxMove");
    update();
  }

  function confirm() {
    AudioMgr.play("sfxConfirm");
    options[activeIndex].action();
  }

  function onInput(evt) {
    if (evt.type !== "press") return;
    if (evt.action === "up") move(-1);
    else if (evt.action === "down") move(1);
    else if (evt.action === "confirm") confirm();
  }

  function enter() {
    activeIndex = 0;
    render();
    Input.on(onInput);
    AudioMgr.playMusic("menuMusic");
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.MenuScene = MenuScene;
