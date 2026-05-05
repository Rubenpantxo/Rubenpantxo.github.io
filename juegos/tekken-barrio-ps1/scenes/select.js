/* ============================================
   SELECT P1 / P2 (o CPU)
   En modo torneo, solo selecciona P1
   ============================================ */

const SelectScene = (() => {
  const COLS = 5;
  const ROWS = 3;

  let p1Index = 0;
  let p2Index = 1;
  let p1Locked = false;
  let p2Locked = false;
  let isVsPlayer = false;
  let isTournament = false;

  function render() {
    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="select-scene">
        <div class="app-header">
          <div class="title">SELECT PLAYER 1</div>
          <div class="vs">VS</div>
          <div class="title">${isTournament ? 'MODO TORNEO' : (isVsPlayer ? 'SELECT PLAYER 2' : 'VS CPU')}</div>
        </div>

        <div class="select-main">
          <div class="preview p1">
            <div class="player-tag">PLAYER 1</div>
            <div id="p1-name" class="preview-name">ELIGE</div>
            <div class="portrait-frame">
              <div class="portrait-inner"><div class="preview-stage" id="p1-stage"></div></div>
            </div>
            <div id="p1-desc" class="preview-desc"></div>
            <div id="p1-style" class="stat-box">ESTILO: ???</div>
            <div id="p1-stats" class="stat-box">PWR - VEL - DEF -</div>
            <div id="p1-ready" class="preview-ready">READY!</div>
          </div>

          <div class="grid-wrap">
            <div class="char-grid" id="char-grid"></div>
          </div>

          ${isTournament ? '' : `
          <div class="preview p2">
            <div class="player-tag">${isVsPlayer ? 'PLAYER 2' : 'CPU'}</div>
            <div id="p2-name" class="preview-name">${isVsPlayer ? 'ELIGE' : 'CPU SELECCIONA'}</div>
            <div class="portrait-frame">
              <div class="portrait-inner"><div class="preview-stage" id="p2-stage"></div></div>
            </div>
            <div id="p2-desc" class="preview-desc"></div>
            <div id="p2-style" class="stat-box">ESTILO: ???</div>
            <div id="p2-stats" class="stat-box">PWR - VEL - DEF -</div>
            <div id="p2-ready" class="preview-ready">READY!</div>
          </div>
          `}
        </div>

        <div class="app-footer">
          <div class="left">P1: ↑↓←→ + ESPACIO  ${isVsPlayer ? '•  P2: WASD + TAB' : ''}</div>
          <div class="right">ESC = VOLVER</div>
        </div>

        <div id="confirm-overlay" class="confirm-overlay">
          <div class="confirm-box">
            <h2 id="confirm-title">¡LISTOS!</h2>
            <p id="confirm-line1"></p>
            <p id="confirm-line2"></p>
            <p class="mini-tip">PULSA ESPACIO PARA CONTINUAR</p>
          </div>
        </div>
      </div>
    `;

    buildGrid();
    updatePreview(1, p1Index);
    if (!isTournament) updatePreview(2, p2Index);
    updateGridSelection();
  }

  function buildGrid() {
    const grid = document.getElementById("char-grid");
    CHARACTERS.forEach((char, idx) => {
      const card = document.createElement("div");
      card.className = "char-card";
      card.dataset.idx = idx;
      card.innerHTML = `
        <div class="char-portrait">
          <img src="${char.thumb}" alt="${char.name}" onerror="this.outerHTML='<div class=fallback>NO IMG</div>'" />
        </div>
        <div class="char-name">${char.name}</div>
        <div class="select-cursor p1-cursor">
          <div class="corner tl"></div><div class="corner tr"></div>
          <div class="corner bl"></div><div class="corner br"></div>
        </div>
        <div class="select-cursor p2-cursor">
          <div class="corner tl"></div><div class="corner tr"></div>
          <div class="corner bl"></div><div class="corner br"></div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (!p1Locked) {
          p1Index = idx;
          updatePreview(1, idx);
          updateGridSelection();
        }
      });
      grid.appendChild(card);
    });
  }

  function updatePreview(player, idx) {
    const char = CHARACTERS[idx];
    if (!char) return;

    const prefix = "p" + player;
    const nameEl = document.getElementById(prefix + "-name");
    if (!nameEl) return;
    nameEl.textContent = char.name;
    document.getElementById(prefix + "-desc").textContent = char.desc;
    document.getElementById(prefix + "-style").textContent = "ESTILO: " + char.style;
    document.getElementById(prefix + "-stats").textContent =
      `PWR ${char.stats.power} VEL ${char.stats.speed} DEF ${char.stats.defense}`;

    const stage = document.getElementById(prefix + "-stage");
    stage.innerHTML = `<img class="preview-static" src="${char.sprite}" alt="${char.name}" onerror="this.outerHTML='<div class=fallback>SIN SPRITE</div>'" />`;

    const ready = document.getElementById(prefix + "-ready");
    if (ready) {
      const lock = (player === 1 && p1Locked) || (player === 2 && p2Locked);
      ready.classList.toggle("show", lock);
    }
  }

  function updateGridSelection() {
    document.querySelectorAll(".char-card").forEach((card, idx) => {
      card.classList.toggle("p1-selected", idx === p1Index);
      card.classList.toggle("p2-selected", !isTournament && idx === p2Index);
    });
  }

  function move(player, dir) {
    if (player === 1 && p1Locked) return;
    if (player === 2 && p2Locked) return;

    let idx = (player === 1) ? p1Index : p2Index;
    let row = Math.floor(idx / COLS);
    let col = idx % COLS;

    if (dir === "left") col = (col - 1 + COLS) % COLS;
    else if (dir === "right") col = (col + 1) % COLS;
    else if (dir === "up") row = (row - 1 + ROWS) % ROWS;
    else if (dir === "down") row = (row + 1) % ROWS;

    const newIdx = row * COLS + col;
    if (player === 1) p1Index = newIdx;
    else p2Index = newIdx;

    AudioMgr.play("sfxMove");
    updatePreview(player, newIdx);
    updateGridSelection();
  }

  function lock(player) {
    if (player === 1) {
      if (p1Locked) return;
      p1Locked = true;
      AudioMgr.play("sfxConfirm");
      updatePreview(1, p1Index);

      if (isTournament) {
        // En torneo solo se elige P1
        showConfirm();
        return;
      }

      if (!isVsPlayer) {
        let cpuIdx;
        do { cpuIdx = Math.floor(Math.random() * CHARACTERS.length); }
        while (cpuIdx === p1Index && CHARACTERS.length > 1);
        p2Index = cpuIdx;
        p2Locked = true;
        updatePreview(2, p2Index);
        updateGridSelection();
        showConfirm();
      }
    } else if (player === 2 && isVsPlayer) {
      if (p2Locked) return;
      p2Locked = true;
      AudioMgr.play("sfxConfirm");
      updatePreview(2, p2Index);
    }

    if (!isTournament && p1Locked && p2Locked) showConfirm();
  }

  function showConfirm() {
    const c1 = CHARACTERS[p1Index];
    const overlay = document.getElementById("confirm-overlay");
    const title = document.getElementById("confirm-title");
    const l1 = document.getElementById("confirm-line1");
    const l2 = document.getElementById("confirm-line2");

    if (isTournament) {
      title.textContent = "¡COMIENZA EL TORNEO!";
      l1.textContent = `Tu campeón: ${c1.name}`;
      l2.textContent = `7 RIVALES TE ESPERAN`;
    } else {
      const c2 = CHARACTERS[p2Index];
      title.textContent = "¡LISTOS PARA EL COMBATE!";
      l1.textContent = `P1: ${c1.name}`;
      l2.textContent = `${isVsPlayer ? "P2" : "CPU"}: ${c2.name}`;
    }
    overlay.classList.add("show");
  }

  function startNext() {
    GAME_STATE.p1Index = p1Index;
    if (!isTournament) GAME_STATE.p2Index = p2Index;
    GAME_STATE.rounds = { p1: 0, p2: 0 };

    if (isTournament) {
      SceneManager.go("tournament", { startWith: p1Index });
    } else {
      SceneManager.go("battle");
    }
  }

  function onInput(evt) {
    if (evt.type !== "press") return;

    if (document.getElementById("confirm-overlay")?.classList.contains("show")) {
      if (evt.action === "confirm") startNext();
      else if (evt.action === "back") {
        document.getElementById("confirm-overlay").classList.remove("show");
        p1Locked = false; p2Locked = false;
        updatePreview(1, p1Index);
        if (!isTournament) updatePreview(2, p2Index);
      }
      return;
    }

    if (evt.action === "back") {
      SceneManager.go(isTournament ? "menu" : "menu");
      return;
    }

    if (evt.player === 1) {
      if (["up","down","left","right"].includes(evt.action)) move(1, evt.action);
      else if (evt.action === "confirm") lock(1);
    } else if (evt.player === 2 && isVsPlayer && !isTournament) {
      if (["up","down","left","right"].includes(evt.action)) move(2, evt.action);
      else if (evt.action === "confirm") lock(2);
    }
  }

  function enter() {
    isVsPlayer = (GAME_STATE.mode === "vs-player");
    isTournament = (GAME_STATE.mode === "tournament");
    p1Index = 0;
    if (isVsPlayer) {
      p2Index = 1;
    } else {
      do {
        p2Index = Math.floor(Math.random() * CHARACTERS.length);
      } while (p2Index === p1Index && CHARACTERS.length > 1);
    }
    p1Locked = false;
    p2Locked = false;
    render();
    Input.on(onInput);
    AudioMgr.playMusic("menuMusic");
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.SelectScene = SelectScene;
