/* ============================================
   COMBATE: rondas, IA, partículas, dificultad
   ============================================ */

const BattleScene = (() => {
  const ROUND_TIME = 60;
  const MAX_HP = 100;
  const ROUNDS_TO_WIN = 2;

  let p1, p2;
  let p1Char, p2Char;
  let timer, timerInterval;
  let roundActive = false;
  let isVsPlayer = false;
  let paused = false;
  let aiTimer = 0;
  let gameLoopId = null;
  let difficulty = 'normal';

  function difficultyMul() {
    if (difficulty === 'easy') return { aiInterval: 80, aiBlockChance: 0.10, aiSpeed: 0.4 };
    if (difficulty === 'hard') return { aiInterval: 30, aiBlockChance: 0.40, aiSpeed: 0.8 };
    return { aiInterval: 50, aiBlockChance: 0.25, aiSpeed: 0.6 };
  }

  function render() {
    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="battle-scene">
        <div class="battle-hud">
          <div class="hud-side left">
            <div class="hud-name" id="p1-hud-name">P1</div>
            <div class="hud-bar"><div class="fill" id="p1-bar" style="width:100%"></div></div>
            <div class="hud-rounds" id="p1-rounds"></div>
          </div>
          <div class="hud-center">
            <div class="hud-timer" id="hud-timer">${ROUND_TIME}</div>
            <div class="hud-round-label" id="round-label">ROUND 1</div>
          </div>
          <div class="hud-side right">
            <div class="hud-name" id="p2-hud-name">P2</div>
            <div class="hud-bar"><div class="fill" id="p2-bar" style="width:100%"></div></div>
            <div class="hud-rounds" id="p2-rounds"></div>
          </div>
        </div>

        <div class="arena" id="arena">
          <div class="fighter p1" id="fighter-p1">
            <div class="shadow"></div>
            <div class="body" id="p1-body"></div>
          </div>
          <div class="fighter p2" id="fighter-p2">
            <div class="shadow"></div>
            <div class="body" id="p2-body"></div>
          </div>
          <div class="announcer" id="announcer">FIGHT!</div>
        </div>

        <div class="pause-overlay" id="pause-overlay">
          <h2>PAUSE</h2>
          <p>P PARA REANUDAR • ESC PARA SALIR</p>
        </div>

        <div class="controls-info">
          P1: ←→ MOVER • Z PUÑO • X PATADA • SHIFT BLOQUEO  ${isVsPlayer ? "•  P2: AD MOVER • F PUÑO • G PATADA • H BLOQUEO" : ""}
        </div>
      </div>
    `;

    document.getElementById("p1-body").style.backgroundImage = `url('${p1Char.sprite}')`;
    document.getElementById("p2-body").style.backgroundImage = `url('${p2Char.sprite}')`;
    document.getElementById("p1-hud-name").textContent = p1Char.name;
    document.getElementById("p2-hud-name").textContent = p2Char.name;

    // Sincronizar posición visual con fighter.x para evitar el "salto" en el primer movimiento
    document.getElementById("fighter-p1").style.left = p1.x + "%";
    document.getElementById("fighter-p2").style.right = (100 - p2.x) + "%";

    updateRounds();
  }

  function updateRounds() {
    const p1r = document.getElementById("p1-rounds");
    const p2r = document.getElementById("p2-rounds");
    if (!p1r || !p2r) return;
    p1r.innerHTML = ""; p2r.innerHTML = "";
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
      const m1 = document.createElement("div");
      m1.className = "round-mark" + (GAME_STATE.rounds.p1 > i ? " win" : "");
      p1r.appendChild(m1);
      const m2 = document.createElement("div");
      m2.className = "round-mark" + (GAME_STATE.rounds.p2 > i ? " win" : "");
      p2r.appendChild(m2);
    }
  }

  function updateBars() {
    document.getElementById("p1-bar").style.width = Math.max(0, p1.hp) + "%";
    document.getElementById("p2-bar").style.width = Math.max(0, p2.hp) + "%";
  }

  function showAnnouncer(text, duration = 1400) {
    const el = document.getElementById("announcer");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), duration);
  }

  function startRound() {
    p1.hp = MAX_HP; p2.hp = MAX_HP;
    p1.state = "idle"; p2.state = "idle";
    p1.cooldown = 0; p2.cooldown = 0;
    timer = ROUND_TIME;

    document.getElementById("round-label").textContent =
      "ROUND " + (GAME_STATE.rounds.p1 + GAME_STATE.rounds.p2 + 1);
    document.getElementById("hud-timer").textContent = timer;
    updateBars();

    showAnnouncer("READY?", 900);
    setTimeout(() => {
      showAnnouncer("FIGHT!", 1200);
      AudioMgr.play("sfxFight");
      roundActive = true;
      startTimer();
    }, 1000);
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (paused || !roundActive) return;
      timer--;
      const tEl = document.getElementById("hud-timer");
      if (tEl) tEl.textContent = timer;
      if (timer <= 0) endRound("time");
    }, 1000);
  }

  function attack(attacker, defender, type) {
    if (!roundActive) return;
    if (attacker.state === "ko" || attacker.cooldown > 0) return;
    if (attacker.state === "attacking") return;

    attacker.state = "attacking";
    attacker.cooldown = (type === "kick") ? 28 : 22;

    const attackerEl = document.getElementById("fighter-" + attacker.id);
    attackerEl.classList.add("attacking");
    AudioMgr.play(type === "kick" ? "sfxKick" : "sfxPunch");

    setTimeout(() => attackerEl.classList.remove("attacking"), 300);

    const dist = Math.abs(attacker.x - defender.x);
    if (dist < 25) {
      let dmg = (type === "kick") ? 12 : 8;
      const ch = (attacker.id === "p1") ? p1Char : p2Char;
      dmg += Math.floor(ch.stats.power * 0.5);

      if (defender.state === "blocking") dmg = Math.floor(dmg * 0.25);

      defender.hp -= dmg;
      defender.state = "hurt";

      const defEl = document.getElementById("fighter-" + defender.id);
      defEl.classList.add("hurt");
      setTimeout(() => {
        defEl.classList.remove("hurt");
        if (defender.hp > 0) defender.state = "idle";
      }, 350);

      AudioMgr.play("sfxHit");
      spawnHitEffect(defender);
      updateBars();

      if (defender.hp <= 0) {
        defender.hp = 0;
        defender.state = "ko";
        defEl.classList.add("ko");
        endRound(attacker.id);
      }
    }

    setTimeout(() => {
      if (attacker.state === "attacking") attacker.state = "idle";
    }, 320);
  }

  function spawnHitEffect(defender) {
    const arena = document.getElementById("arena");
    const fx = document.createElement("div");
    fx.className = "hit-effect";
    fx.textContent = ["POW!", "BAM!", "POW!", "WHACK!", "KO!"][Math.floor(Math.random() * 5)];
    const defEl = document.getElementById("fighter-" + defender.id);
    const r = defEl.getBoundingClientRect();
    const ar = arena.getBoundingClientRect();
    const fxLeft = r.left - ar.left + r.width / 2 - 40;
    const fxTop = r.top - ar.top + r.height / 2 - 60;
    fx.style.left = fxLeft + "px";
    fx.style.top = fxTop + "px";
    arena.appendChild(fx);
    setTimeout(() => fx.remove(), 500);

    // Partículas
    Particles.spawnHit(r.left + r.width / 2, r.top + r.height / 2);
  }

  function endRound(winner) {
    if (!roundActive) return;
    roundActive = false;
    clearInterval(timerInterval);

    let winnerId = null;
    if (winner === "time") {
      if (p1.hp > p2.hp) winnerId = "p1";
      else if (p2.hp > p1.hp) winnerId = "p2";
      else winnerId = "draw";
    } else winnerId = winner;

    if (winnerId === "p1") {
      GAME_STATE.rounds.p1++;
      showAnnouncer("P1 WINS!", 1800);
    } else if (winnerId === "p2") {
      GAME_STATE.rounds.p2++;
      showAnnouncer(isVsPlayer ? "P2 WINS!" : "CPU WINS!", 1800);
    } else {
      showAnnouncer("DRAW!", 1800);
    }

    AudioMgr.play("sfxKo");
    updateRounds();

    setTimeout(() => {
      if (GAME_STATE.rounds.p1 >= ROUNDS_TO_WIN) {
        finishMatch("p1");
      } else if (GAME_STATE.rounds.p2 >= ROUNDS_TO_WIN) {
        finishMatch("p2");
      } else {
        document.getElementById("fighter-p1").classList.remove("ko");
        document.getElementById("fighter-p2").classList.remove("ko");
        startRound();
      }
    }, 2200);
  }

  function finishMatch(winnerId) {
    GAME_STATE.winner = winnerId;

    // Guardado
    const winnerChar = winnerId === "p1" ? p1Char : p2Char;
    const loserChar = winnerId === "p1" ? p2Char : p1Char;
    const playerWin = winnerId === "p1";
    Storage.recordMatch(winnerChar.id, loserChar.id, playerWin);

    if (GAME_STATE.mode === "tournament") {
      SceneManager.go("tournament", { matchResult: winnerId });
    } else {
      SceneManager.go("victory");
    }
  }

  function setBlocking(fighter, val) {
    if (fighter.state === "ko" || fighter.state === "hurt" || fighter.state === "attacking") return;
    fighter.state = val ? "blocking" : "idle";
    document.getElementById("fighter-" + fighter.id).classList.toggle("blocking", val);
  }

  function moveFighter(fighter, dx) {
    if (fighter.state === "ko" || fighter.state === "hurt" || fighter.state === "attacking") return;
    fighter.x = Math.max(8, Math.min(92, fighter.x + dx));
    const el = document.getElementById("fighter-" + fighter.id);
    if (fighter.id === "p1") el.style.left = fighter.x + "%";
    else el.style.right = (100 - fighter.x) + "%";
  }

  function aiUpdate() {
    if (!roundActive || isVsPlayer) return;
    if (p2.state === "ko" || p2.state === "hurt" || p2.state === "attacking") return;

    const cfg = difficultyMul();
    aiTimer++;
    const dist = Math.abs(p1.x - p2.x);

    if (dist > 22) moveFighter(p2, p1.x < p2.x ? -cfg.aiSpeed : cfg.aiSpeed);
    else if (dist < 18) {
      if (aiTimer % cfg.aiInterval === 0) {
        if (Math.random() < cfg.aiBlockChance) {
          setBlocking(p2, true);
          setTimeout(() => setBlocking(p2, false), 600);
        } else {
          attack(p2, p1, Math.random() < 0.5 ? "punch" : "kick");
        }
      }
    } else moveFighter(p2, p1.x < p2.x ? -cfg.aiSpeed * 0.7 : cfg.aiSpeed * 0.7);
  }

  function gameLoop() {
    if (!paused) {
      if (p1.cooldown > 0) p1.cooldown--;
      if (p2.cooldown > 0) p2.cooldown--;

      if (Input.isDown("1:left")) moveFighter(p1, -0.7);
      if (Input.isDown("1:right")) moveFighter(p1, 0.7);

      const p1Block = Input.isDown("1:block");
      if (p1.state === "blocking" && !p1Block) setBlocking(p1, false);
      if (p1Block && p1.state === "idle") setBlocking(p1, true);

      if (isVsPlayer) {
        if (Input.isDown("2:left")) moveFighter(p2, -0.7);
        if (Input.isDown("2:right")) moveFighter(p2, 0.7);
        const p2Block = Input.isDown("2:block");
        if (p2.state === "blocking" && !p2Block) setBlocking(p2, false);
        if (p2Block && p2.state === "idle") setBlocking(p2, true);
      } else aiUpdate();
    }
    gameLoopId = requestAnimationFrame(gameLoop);
  }

  function onInput(evt) {
    if (evt.type !== "press") return;

    if (evt.action === "pause") {
      paused = !paused;
      document.getElementById("pause-overlay").classList.toggle("show", paused);
      return;
    }

    if (evt.action === "back") {
      if (paused) SceneManager.go("menu");
      else {
        paused = true;
        document.getElementById("pause-overlay").classList.add("show");
      }
      return;
    }

    if (paused || !roundActive) return;

    if (evt.player === 1) {
      if (evt.action === "punch") attack(p1, p2, "punch");
      else if (evt.action === "kick") attack(p1, p2, "kick");
    }
    if (evt.player === 2 && isVsPlayer) {
      if (evt.action === "punch") attack(p2, p1, "punch");
      else if (evt.action === "kick") attack(p2, p1, "kick");
    }
  }

  function enter() {
    isVsPlayer = (GAME_STATE.mode === "vs-player");
    difficulty = Storage.get('options.difficulty') || 'normal';
    p1Char = CHARACTERS[GAME_STATE.p1Index];
    p2Char = CHARACTERS[GAME_STATE.p2Index];

    p1 = { id: "p1", hp: MAX_HP, x: 22, state: "idle", cooldown: 0 };
    p2 = { id: "p2", hp: MAX_HP, x: 78, state: "idle", cooldown: 0 };

    paused = false;
    aiTimer = 0;

    render();
    Input.on(onInput);
    AudioMgr.playMusic("battleMusic");
    GAME_STATE.rounds = { p1: 0, p2: 0 };
    startRound();
    gameLoop();
  }

  function exit() {
    Input.off(onInput);
    if (timerInterval) clearInterval(timerInterval);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    roundActive = false;
  }

  return { enter, exit };
})();

window.BattleScene = BattleScene;
