/* ============================================
   VICTORY SCREEN
   ============================================ */

const VictoryScene = (() => {
  let activeIndex = 0;
  const options = [
    { label: "REVANCHA", action: () => SceneManager.go("battle") },
    { label: "NUEVO COMBATE", action: () => SceneManager.go("select") },
    { label: "VOLVER AL MENÚ", action: () => SceneManager.go("menu") }
  ];

  function render() {
    const winnerId = GAME_STATE.winner;
    const winnerChar = (winnerId === "p1")
      ? CHARACTERS[GAME_STATE.p1Index]
      : CHARACTERS[GAME_STATE.p2Index];

    const isVsPlayer = (GAME_STATE.mode === "vs-player");
    let winnerLabel = "";
    if (winnerId === "p1") winnerLabel = "PLAYER 1 GANA";
    else if (winnerId === "p2") winnerLabel = isVsPlayer ? "PLAYER 2 GANA" : "CPU GANA";

    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="victory-scene">
        <div class="victory-title">¡VICTORIA!</div>
        <div class="victory-winner">${winnerLabel}</div>

        <div class="victory-portrait">
          <img src="${winnerChar.sprite}" alt="${winnerChar.name}"
               onerror="this.outerHTML='<div class=fallback>SIN SPRITE</div>'" />
        </div>

        <div class="victory-quote">"${winnerChar.quote}"<br/>
          <span style="color:#ffe600">— ${winnerChar.name}</span>
        </div>

        <div class="victory-options" id="victory-options">
          ${options.map((opt, i) => `
            <div class="victory-option ${i === activeIndex ? 'active' : ''}" data-idx="${i}">
              ${opt.label}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll(".victory-option").forEach(el => {
      el.addEventListener("click", () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        update(); confirm();
      });
      el.addEventListener("mouseenter", () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        update();
      });
    });

    // Confeti
    setTimeout(() => {
      const w = window.innerWidth;
      Particles.spawnConfetti(w / 2, 60);
      Particles.spawnConfetti(w / 4, 120);
      Particles.spawnConfetti(w * 3 / 4, 120);
    }, 200);
  }

  function update() {
    document.querySelectorAll(".victory-option").forEach((el, i) => {
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
    if (activeIndex === 0) GAME_STATE.rounds = { p1: 0, p2: 0 };
    options[activeIndex].action();
  }

  function onInput(evt) {
    if (evt.type !== "press") return;
    if (evt.action === "up") move(-1);
    else if (evt.action === "down") move(1);
    else if (evt.action === "confirm") confirm();
    else if (evt.action === "back") SceneManager.go("menu");
  }

  function enter() {
    activeIndex = 0;
    render();
    Input.on(onInput);
    AudioMgr.playMusic("victoryMusic");
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.VictoryScene = VictoryScene;
