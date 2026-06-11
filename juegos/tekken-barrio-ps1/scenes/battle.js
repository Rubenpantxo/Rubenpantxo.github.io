/* ============================================
   COMBATE: rondas, IA, partículas, dificultad
   Render de luchadores en canvas (FighterRenderer)
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
  let p1Speed = 0.7, p2Speed = 0.7, aiSpeedMul = 1;

  function difficultyMul() {
    if (difficulty === 'easy') return { aiInterval: 80, aiBlockChance: 0.10, aiSpeed: 0.4 };
    if (difficulty === 'hard') return { aiInterval: 30, aiBlockChance: 0.40, aiSpeed: 0.8 };
    return { aiInterval: 50, aiBlockChance: 0.25, aiSpeed: 0.6 };
  }

  // Velocidad de movimiento ligeramente influida por stats.speed (4..10 -> 0.67..0.85)
  function moveSpeed(ch) { return 0.55 + ch.stats.speed * 0.03; }

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
          <canvas id="battle-canvas"></canvas>
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

    document.getElementById("p1-hud-name").textContent = p1Char.name;
    document.getElementById("p2-hud-name").textContent = p2Char.name;

    // Renderizador procedural en canvas (sustituye a los antiguos div .fighter)
    FighterRenderer.init(document.getElementById("battle-canvas"), p1Char, p2Char);

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
    p1.celebrate = false; p2.celebrate = false;
    // Posiciones iniciales de ronda (estilo arcade)
    p1.x = 22; p2.x = 78;
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
    attacker.attackType = type; // el renderer distingue puñetazo / patada
    attacker.cooldown = (type === "kick") ? 28 : 22;

    AudioMgr.play(type === "kick" ? "sfxKick" : "sfxPunch");

    // Hitbox coherente con el alcance visual: la patada llega más lejos
    const dist = Math.abs(attacker.x - defender.x);
    const reach = (type === "kick") ? 26 : 22;
    if (dist < reach) {
      let dmg = (type === "kick") ? 12 : 8;
      const ch = (attacker.id === "p1") ? p1Char : p2Char;
      dmg += Math.floor(ch.stats.power * 0.5);

      const blocked = (defender.state === "blocking");
      if (blocked) dmg = Math.floor(dmg * 0.25);

      defender.hp -= dmg;
      defender.state = "hurt";

      // Knockback real: el golpeado retrocede un poco
      const push = ((type === "kick") ? 3.2 : 2.2) * (blocked ? 0.4 : 1);
      const dir = (defender.x >= attacker.x) ? 1 : -1;
      defender.x = Math.max(8, Math.min(92, defender.x + push * dir));

      setTimeout(() => {
        if (defender.hp > 0 && defender.state === "hurt") defender.state = "idle";
      }, 350);

      AudioMgr.play("sfxHit");
      FighterRenderer.hit(defender.id, type, blocked);
      FighterRenderer.shake(blocked ? 2 : (type === "kick" ? 7 : 5));
      spawnHitEffect(defender);
      updateBars();

      if (defender.hp <= 0) {
        defender.hp = 0;
        defender.state = "ko";
        FighterRenderer.shake(10);
        endRound(attacker.id);
      }
    }

    setTimeout(() => {
      if (attacker.state === "attacking") attacker.state = "idle";
    }, type === "kick" ? 340 : 320);
  }

  function spawnHitEffect(defender) {
    const arena = document.getElementById("arena");
    if (!arena) return;
    const fx = document.createElement("div");
    fx.className = "hit-effect";
    fx.textContent = ["POW!", "BAM!", "POW!", "WHACK!", "KO!"][Math.floor(Math.random() * 5)];
    const pos = FighterRenderer.getScreenPos(defender.id); // coords de página
    const ar = arena.getBoundingClientRect();
    fx.style.left = (pos.x - ar.left - 40) + "px";
    fx.style.top = (pos.y - ar.top - 60) + "px";
    arena.appendChild(fx);
    setTimeout(() => fx.remove(), 500);

    // Partículas globales (canvas overlay de toda la pantalla)
    Particles.spawnHit(pos.x, pos.y);
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

    // Pose de celebración del ganador de la ronda (si sigue en pie)
    if (winnerId === "p1" && p1.state !== "ko") p1.celebrate = true;
    else if (winnerId === "p2" && p2.state !== "ko") p2.celebrate = true;

    AudioMgr.play("sfxKo");
    updateRounds();

    setTimeout(() => {
      if (GAME_STATE.rounds.p1 >= ROUNDS_TO_WIN) {
        finishMatch("p1");
      } else if (GAME_STATE.rounds.p2 >= ROUNDS_TO_WIN) {
        finishMatch("p2");
      } else {
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
  }

  function moveFighter(fighter, dx) {
    if (fighter.state === "ko" || fighter.state === "hurt" || fighter.state === "attacking") return;
    fighter.x = Math.max(8, Math.min(92, fighter.x + dx));
  }

  function aiUpdate() {
    if (!roundActive || isVsPlayer) return;
    if (p2.state === "ko" || p2.state === "hurt" || p2.state === "attacking") return;

    const cfg = difficultyMul();
    aiTimer++;
    const dist = Math.abs(p1.x - p2.x);
    const sp = cfg.aiSpeed * aiSpeedMul;

    if (dist > 22) moveFighter(p2, p1.x < p2.x ? -sp : sp);
    else if (dist < 18) {
      if (aiTimer % cfg.aiInterval === 0) {
        if (Math.random() < cfg.aiBlockChance) {
          setBlocking(p2, true);
          setTimeout(() => setBlocking(p2, false), 600);
        } else {
          attack(p2, p1, Math.random() < 0.5 ? "punch" : "kick");
        }
      }
    } else moveFighter(p2, p1.x < p2.x ? -sp * 0.7 : sp * 0.7);
  }

  function gameLoop() {
    if (!paused) {
      if (p1.cooldown > 0) p1.cooldown--;
      if (p2.cooldown > 0) p2.cooldown--;

      if (Input.isDown("1:left")) moveFighter(p1, -p1Speed);
      if (Input.isDown("1:right")) moveFighter(p1, p1Speed);

      const p1Block = Input.isDown("1:block");
      if (p1.state === "blocking" && !p1Block) setBlocking(p1, false);
      if (p1Block && p1.state === "idle") setBlocking(p1, true);

      if (isVsPlayer) {
        if (Input.isDown("2:left")) moveFighter(p2, -p2Speed);
        if (Input.isDown("2:right")) moveFighter(p2, p2Speed);
        const p2Block = Input.isDown("2:block");
        if (p2.state === "blocking" && !p2Block) setBlocking(p2, false);
        if (p2Block && p2.state === "idle") setBlocking(p2, true);
      } else aiUpdate();
    }

    // Dibujar el frame del combate (luchadores + escenario + fx)
    FighterRenderer.frame(p1, p2, { paused });

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

    p1 = { id: "p1", hp: MAX_HP, x: 22, state: "idle", cooldown: 0, attackType: "punch", celebrate: false };
    p2 = { id: "p2", hp: MAX_HP, x: 78, state: "idle", cooldown: 0, attackType: "punch", celebrate: false };

    p1Speed = moveSpeed(p1Char);
    p2Speed = moveSpeed(p2Char);
    aiSpeedMul = 0.75 + p2Char.stats.speed * 0.04;

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
    FighterRenderer.destroy(); // cancela listeners de resize y libera el canvas
  }

  return { enter, exit };
})();

window.BattleScene = BattleScene;
