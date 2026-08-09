/* ============================================
   COMBATE: rondas, IA, partículas, dificultad
   Movimiento en 2 ejes: andar, SALTAR y AGACHARSE,
   con golpes que cambian según la altura:
     - PUÑO alto      -> falla contra rival agachado
     - PATADA media   -> golpea agachados y antiaérea
     - BARRIDO (agachado + patada) -> solo a rivales en el suelo
     - PATADA AÉREA (en el aire)   -> castiga desde arriba
   Render de luchadores en canvas (FighterRenderer)
   ============================================ */

const BattleScene = (() => {
  const ROUND_TIME = 60;
  const MAX_HP = 100;
  const ROUNDS_TO_WIN = 2;

  // Física del salto (unidades: fracción de la altura del luchador / frame a 60fps)
  const JUMP_V = 0.041;
  const GRAVITY = 0.00186;
  const AIR_SPEED = 0.62;   // multiplicador de la velocidad horizontal en el aire
  const MIN_GAP = 14;       // separación mínima entre cuerpos en el suelo

  let p1, p2;
  let p1Char, p2Char;
  let timer, timerInterval;
  let roundActive = false;
  let isVsPlayer = false;
  let paused = false;
  let aiTimer = 0;
  let gameLoopId = null;
  let lastFrameTs = 0;
  let difficulty = 'normal';
  let p1Speed = 0.7, p2Speed = 0.7, aiSpeedMul = 1;
  let aiPlan = { jumpCd: 0, crouchUntil: 0 };
  let onViewportChange = null;

  function difficultyMul() {
    if (difficulty === 'easy') return { aiInterval: 80, aiBlockChance: 0.10, aiSpeed: 0.4, aiJump: 0.0015, aiCrouch: 0.004 };
    if (difficulty === 'hard') return { aiInterval: 30, aiBlockChance: 0.40, aiSpeed: 0.8, aiJump: 0.010, aiCrouch: 0.020 };
    return { aiInterval: 50, aiBlockChance: 0.25, aiSpeed: 0.6, aiJump: 0.005, aiCrouch: 0.010 };
  }

  // Velocidad de movimiento ligeramente influida por stats.speed (4..10 -> 0.67..0.85)
  function moveSpeed(ch) { return 0.55 + ch.stats.speed * 0.03; }

  function newFighter(id, x) {
    return {
      id, hp: MAX_HP, x,
      y: 0, vy: 0, vx: 0,
      airborne: false, crouching: false, airAttacked: false,
      state: 'idle', cooldown: 0, attackType: 'punch', celebrate: false
    };
  }

  function isTouch() { return window.Touch && Touch.isVisible(); }

  function render() {
    const root = SceneManager.getRoot();
    const touch = isTouch();
    root.innerHTML = `
      <div class="battle-scene${touch ? ' touch-mode' : ''}">
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
          <div class="stage-name" id="stage-name"></div>
          <div class="announcer" id="announcer">FIGHT!</div>
        </div>

        <div class="pause-overlay" id="pause-overlay">
          <h2>PAUSA</h2>
          <div class="pause-btns">
            <button class="pause-btn" id="pause-resume">REANUDAR</button>
            <button class="pause-btn danger" id="pause-quit">SALIR AL MENÚ</button>
          </div>
          <p>${touch ? 'II REANUDAR • ESC SALIR' : 'P PARA REANUDAR • ESC PARA SALIR'}</p>
        </div>

        <div class="controls-info">
          ${touch
            ? '◀▶ MOVER • ▲ SALTAR • ▼ AGACHARSE • PUÑO / PATADA / BLOQUEO'
            : 'P1: ←→ MOVER • ↑ SALTAR • ↓ AGACHARSE • Z PUÑO • X PATADA • SHIFT BLOQUEO' +
              (isVsPlayer ? '  •  P2: AD MOVER • W SALTAR • S AGACHARSE • F/G/H' : '')}
        </div>
      </div>
    `;

    document.getElementById("p1-hud-name").textContent = p1Char.name;
    document.getElementById("p2-hud-name").textContent = p2Char.name;

    const resume = document.getElementById('pause-resume');
    const quit = document.getElementById('pause-quit');
    if (resume) resume.addEventListener('click', () => setPaused(false));
    if (quit) quit.addEventListener('click', () => SceneManager.go('menu'));

    // Renderizador procedural en canvas (luchadores + escenario)
    FighterRenderer.init(document.getElementById("battle-canvas"), p1Char, p2Char);
    FighterRenderer.setBottomInset(touch ? Touch.getBattleInset() : 0);

    const st = document.getElementById('stage-name');
    if (st) st.textContent = FighterRenderer.getStageName();

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
    const b1 = document.getElementById("p1-bar");
    const b2 = document.getElementById("p2-bar");
    if (b1) b1.style.width = Math.max(0, p1.hp) + "%";
    if (b2) b2.style.width = Math.max(0, p2.hp) + "%";
    if (b1) b1.classList.toggle('low', p1.hp <= 30);
    if (b2) b2.classList.toggle('low', p2.hp <= 30);
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
    p1.y = p2.y = 0; p1.vy = p2.vy = 0; p1.vx = p2.vx = 0;
    p1.airborne = p2.airborne = false;
    p1.crouching = p2.crouching = false;
    p1.airAttacked = p2.airAttacked = false;
    // Posiciones iniciales de ronda (estilo arcade)
    p1.x = 22; p2.x = 78;
    timer = ROUND_TIME;

    const rl = document.getElementById("round-label");
    if (rl) rl.textContent = "ROUND " + (GAME_STATE.rounds.p1 + GAME_STATE.rounds.p2 + 1);
    const tEl = document.getElementById("hud-timer");
    if (tEl) tEl.textContent = timer;
    updateBars();

    showAnnouncer("READY?", 900);
    setTimeout(() => {
      if (!gameLoopId) return; // la escena pudo cambiar
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

  /* ============================================
     ATAQUES CON ALTURA
     ============================================ */
  function attackKind(fighter, button) {
    if (fighter.airborne) return 'airkick';
    if (fighter.crouching) return button === 'kick' ? 'lowkick' : 'punch';
    return button === 'kick' ? 'kick' : 'punch';
  }

  const ATTACK = {
    punch:   { dmg: 8,  reach: 22, cd: 22, dur: 320, push: 2.2 },
    kick:    { dmg: 12, reach: 26, cd: 28, dur: 340, push: 3.2 },
    lowkick: { dmg: 10, reach: 24, cd: 30, dur: 360, push: 2.6 },
    airkick: { dmg: 14, reach: 24, cd: 26, dur: 420, push: 3.6 }
  };

  // ¿Llega el golpe a la altura del rival?
  function heightConnects(type, attacker, defender) {
    switch (type) {
      case 'punch':
        // golpe alto: pasa por encima del agachado y no alcanza al que salta
        if (defender.crouching) return false;
        return defender.y < 0.14;
      case 'kick':
        // media altura: pilla agachados y sirve de antiaérea si el rival está bajo
        return defender.y < 0.20;
      case 'lowkick':
        // barrido: solo a rivales pisando el suelo
        return defender.y < 0.06;
      case 'airkick':
        // desde el aire hacia abajo
        return defender.y < 0.16;
      default:
        return true;
    }
  }

  function attack(attacker, defender, button) {
    if (!roundActive) return;
    if (attacker.state === "ko" || attacker.cooldown > 0) return;
    if (attacker.state === "attacking" || attacker.state === "hurt") return;
    if (attacker.airborne && attacker.airAttacked) return;

    const type = attackKind(attacker, button);
    const A = ATTACK[type];

    attacker.state = "attacking";
    attacker.attackType = type;
    attacker.cooldown = A.cd;
    if (attacker.airborne) attacker.airAttacked = true;

    AudioMgr.play(type === "punch" ? "sfxPunch" : "sfxKick");

    const dist = Math.abs(attacker.x - defender.x);
    if (dist < A.reach && heightConnects(type, attacker, defender)) {
      let dmg = A.dmg;
      const ch = (attacker.id === "p1") ? p1Char : p2Char;
      dmg += Math.floor(ch.stats.power * 0.5);

      // El bloqueo protege; agachado y bloqueando protege aún más de los medios
      const blocked = (defender.state === "blocking");
      if (blocked) dmg = Math.floor(dmg * (defender.crouching && type !== 'airkick' ? 0.18 : 0.25));

      defender.hp -= dmg;
      defender.state = "hurt";

      // Knockback: retroceso horizontal (+ caída si estaba en el aire)
      const push = A.push * (blocked ? 0.4 : 1);
      const dir = (defender.x >= attacker.x) ? 1 : -1;
      defender.x = Math.max(8, Math.min(92, defender.x + push * dir));
      if (defender.airborne) {
        defender.vy = Math.max(defender.vy, 0.012);
        defender.vx = 0.35 * dir;
      }

      setTimeout(() => {
        if (defender.hp > 0 && defender.state === "hurt") defender.state = "idle";
      }, 350);

      AudioMgr.play("sfxHit");
      FighterRenderer.hit(defender.id, type, blocked);
      FighterRenderer.shake(blocked ? 2 : (type === "punch" ? 5 : 7));
      spawnHitEffect(defender, type, blocked);
      updateBars();

      if (defender.hp <= 0) {
        defender.hp = 0;
        defender.state = "ko";
        defender.crouching = false;
        FighterRenderer.shake(11);
        endRound(attacker.id);
      }
    }

    setTimeout(() => {
      if (attacker.state === "attacking") attacker.state = "idle";
    }, A.dur);
  }

  function spawnHitEffect(defender, type, blocked) {
    const arena = document.getElementById("arena");
    if (!arena) return;
    const fx = document.createElement("div");
    fx.className = "hit-effect" + (blocked ? " blocked" : "");
    fx.textContent = blocked
      ? "BLOCK!"
      : (type === 'airkick' ? "SMASH!" : ["POW!", "BAM!", "POW!", "WHACK!", "CRACK!"][Math.floor(Math.random() * 5)]);
    const pos = FighterRenderer.getScreenPos(defender.id);
    const ar = arena.getBoundingClientRect();
    fx.style.left = (pos.x - ar.left - 40) + "px";
    fx.style.top = (pos.y - ar.top - 60) + "px";
    arena.appendChild(fx);
    setTimeout(() => fx.remove(), 500);

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

    if (winnerId === "p1" && p1.state !== "ko") p1.celebrate = true;
    else if (winnerId === "p2" && p2.state !== "ko") p2.celebrate = true;

    AudioMgr.play("sfxKo");
    updateRounds();

    setTimeout(() => {
      if (!gameLoopId) return;
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

  /* ============================================
     MOVIMIENTO
     ============================================ */
  function busy(f) {
    return f.state === "ko" || f.state === "hurt" || f.state === "attacking";
  }

  function setBlocking(fighter, val) {
    if (busy(fighter)) return;
    fighter.state = val ? "blocking" : "idle";
  }

  function setCrouching(fighter, val) {
    if (fighter.state === "ko") return;
    if (val && fighter.airborne) return;
    fighter.crouching = val;
  }

  function moveFighter(fighter, dx) {
    if (busy(fighter)) return;
    if (fighter.crouching && !fighter.airborne) return; // agachado no camina
    const foe = (fighter === p1) ? p2 : p1;
    let nx = Math.max(8, Math.min(92, fighter.x + dx));

    // Los cuerpos no se atraviesan andando: para pasar al otro lado hay que saltar
    if (!fighter.airborne && !foe.airborne && foe.state !== 'ko') {
      const cur = fighter.x - foe.x;
      const next = nx - foe.x;
      if (Math.abs(next) < MIN_GAP && Math.abs(next) < Math.abs(cur)) {
        nx = (Math.abs(cur) < MIN_GAP)
          ? fighter.x                                        // ya pegados: no empuja
          : foe.x + (cur >= 0 ? MIN_GAP : -MIN_GAP);
      }
    }
    fighter.x = nx;
  }

  function jump(fighter, dirX) {
    if (busy(fighter) || fighter.airborne) return;
    fighter.airborne = true;
    fighter.crouching = false;
    fighter.airAttacked = false;
    fighter.vy = -JUMP_V;
    fighter.vx = dirX * AIR_SPEED;
    AudioMgr.play("sfxMove");
  }

  function physics(f, k) {
    if (!f.airborne) return;
    f.vy += GRAVITY * k;
    f.y -= f.vy * k;
    if (f.vx) f.x = Math.max(8, Math.min(92, f.x + f.vx * k));
    if (f.y <= 0) {
      f.y = 0; f.vy = 0; f.vx = 0;
      f.airborne = false;
      f.airAttacked = false;
      if (f.state === "attacking") f.state = "idle";
    }
  }

  /* ============================================
     IA
     ============================================ */
  function aiUpdate(k) {
    if (!roundActive || isVsPlayer) return;
    if (p2.state === "ko") return;

    const cfg = difficultyMul();
    aiTimer++;
    const dist = Math.abs(p1.x - p2.x);
    const sp = cfg.aiSpeed * aiSpeedMul;
    const toward = p1.x < p2.x ? -1 : 1;

    // remate en el aire
    if (p2.airborne) {
      if (p2.state === 'hurt') return;
      if (!p2.airAttacked && dist < 26 && p2.vy > -0.01) attack(p2, p1, 'kick');
      return;
    }
    if (busy(p2)) return;

    // dejar de agacharse cuando toque
    if (p2.crouching && aiTimer > aiPlan.crouchUntil) setCrouching(p2, false);

    // esquivar puños agachándose
    if (!p2.crouching && p1.state === 'attacking' && p1.attackType === 'punch'
      && dist < 26 && Math.random() < cfg.aiCrouch * 12) {
      setCrouching(p2, true);
      aiPlan.crouchUntil = aiTimer + 22;
      return;
    }
    // castigar barridos y patadas bajas saltando
    if (p1.state === 'attacking' && p1.attackType === 'lowkick' && dist < 30
      && aiTimer > aiPlan.jumpCd && Math.random() < cfg.aiJump * 40) {
      aiPlan.jumpCd = aiTimer + 60;
      jump(p2, toward * 0.7);
      return;
    }

    if (p2.crouching) {
      if (aiTimer % cfg.aiInterval === 0 && dist < 22) attack(p2, p1, 'kick');
      return;
    }

    if (dist > 22) {
      // acercarse, a veces saltando encima
      if (dist < 42 && aiTimer > aiPlan.jumpCd && Math.random() < cfg.aiJump) {
        aiPlan.jumpCd = aiTimer + 80;
        jump(p2, toward);
      } else {
        moveFighter(p2, toward * sp * k);
      }
    } else if (dist < 18) {
      if (aiTimer % cfg.aiInterval === 0) {
        if (Math.random() < cfg.aiBlockChance) {
          setBlocking(p2, true);
          setTimeout(() => setBlocking(p2, false), 600);
        } else {
          attack(p2, p1, Math.random() < 0.5 ? "punch" : "kick");
        }
      }
    } else {
      moveFighter(p2, toward * sp * 0.7 * k);
    }
  }

  /* ============================================
     LOOP
     ============================================ */
  function playerLoop(f, player, speed, k) {
    const pre = player + ":";
    const down = Input.isDown(pre + "down");
    const left = Input.isDown(pre + "left");
    const right = Input.isDown(pre + "right");

    if (!f.airborne) {
      if (down && !busy(f)) setCrouching(f, true);
      else if (!down && f.crouching) setCrouching(f, false);
    }

    if (!f.crouching) {
      if (left) moveFighter(f, -speed * k);
      if (right) moveFighter(f, speed * k);
    }

    const block = Input.isDown(pre + "block");
    if (f.state === "blocking" && !block) setBlocking(f, false);
    if (block && f.state === "idle") setBlocking(f, true);
  }

  function gameLoop(ts) {
    gameLoopId = requestAnimationFrame(gameLoop);

    const now = ts || performance.now();
    let k = lastFrameTs ? (now - lastFrameTs) / 16.6667 : 1;
    lastFrameTs = now;
    k = Math.max(0.4, Math.min(2.5, k));

    if (!paused) {
      if (p1.cooldown > 0) p1.cooldown -= k;
      if (p2.cooldown > 0) p2.cooldown -= k;

      playerLoop(p1, 1, p1Speed, k);
      if (isVsPlayer) playerLoop(p2, 2, p2Speed, k);
      else aiUpdate(k);

      physics(p1, k);
      physics(p2, k);
    }

    FighterRenderer.frame(p1, p2, { paused });
  }

  function setPaused(v) {
    paused = v;
    const ov = document.getElementById("pause-overlay");
    if (ov) ov.classList.toggle("show", paused);
  }

  function onInput(evt) {
    if (evt.type !== "press") return;

    if (evt.action === "pause") {
      setPaused(!paused);
      return;
    }

    if (evt.action === "back") {
      if (paused) SceneManager.go("menu");
      else setPaused(true);
      return;
    }

    if (paused || !roundActive) return;

    if (evt.player === 1) {
      handlePlayerPress(p1, p2, 1, evt.action);
    } else if (evt.player === 2 && isVsPlayer) {
      handlePlayerPress(p2, p1, 2, evt.action);
    }
  }

  function handlePlayerPress(self, foe, player, action) {
    if (action === "punch") attack(self, foe, "punch");
    else if (action === "kick") attack(self, foe, "kick");
    else if (action === "up") {
      const pre = player + ":";
      const dir = Input.isDown(pre + "right") ? 1 : (Input.isDown(pre + "left") ? -1 : 0);
      jump(self, dir);
    }
  }

  function enter() {
    isVsPlayer = (GAME_STATE.mode === "vs-player");
    difficulty = Storage.get('options.difficulty') || 'normal';
    p1Char = CHARACTERS[GAME_STATE.p1Index];
    p2Char = CHARACTERS[GAME_STATE.p2Index];

    p1 = newFighter("p1", 22);
    p2 = newFighter("p2", 78);

    p1Speed = moveSpeed(p1Char);
    p2Speed = moveSpeed(p2Char);
    aiSpeedMul = 0.75 + p2Char.stats.speed * 0.04;

    paused = false;
    aiTimer = 0;
    aiPlan = { jumpCd: 0, crouchUntil: 0 };
    lastFrameTs = 0;

    render();
    Input.on(onInput);

    // Al girar el móvil cambia el alto de los controles: recolocamos el suelo
    onViewportChange = () => {
      if (isTouch()) FighterRenderer.setBottomInset(Touch.getBattleInset());
      else FighterRenderer.setBottomInset(0);
    };
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);

    AudioMgr.playMusic("battleMusic");
    GAME_STATE.rounds = { p1: 0, p2: 0 };
    gameLoopId = requestAnimationFrame(gameLoop);
    startRound();
  }

  function exit() {
    Input.off(onInput);
    if (onViewportChange) {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
      onViewportChange = null;
    }
    if (timerInterval) clearInterval(timerInterval);
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    roundActive = false;
    FighterRenderer.destroy();
  }

  return { enter, exit };
})();

window.BattleScene = BattleScene;
