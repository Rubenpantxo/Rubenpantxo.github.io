/* ============================================
   TORNEO: 8 luchadores, 3 rondas (cuartos, semis, final)
   ============================================ */

const TournamentScene = (() => {
  let activeIndex = 0;

  // Estructura del torneo:
  // GAME_STATE.tournament = {
  //   playerCharIdx,
  //   participants: [charIdx, charIdx, ...] (8 ids),
  //   bracket: { quarters: [...], semis: [...], final: [...] }
  //   currentRound: 0|1|2,
  //   currentMatch: 0..3,
  //   nextMatchIsPlayer: bool,
  //   winnerIdx: null|charIdx
  // }

  function init(playerCharIdx) {
    const allIdx = CHARACTERS.map((_, i) => i);
    const others = allIdx.filter(i => i !== playerCharIdx);

    // Mezclar
    shuffle(others);
    const opponents = others.slice(0, 7);
    const participants = [playerCharIdx, ...opponents];
    shuffle(participants);

    const quarters = [];
    for (let i = 0; i < 8; i += 2) {
      quarters.push({ a: participants[i], b: participants[i + 1], winner: null });
    }
    const semis = [{ a: null, b: null, winner: null }, { a: null, b: null, winner: null }];
    const final = [{ a: null, b: null, winner: null }];

    GAME_STATE.tournament = {
      playerCharIdx,
      participants,
      bracket: { quarters, semis, final },
      currentRound: 0,
      currentMatch: 0,
      winnerIdx: null
    };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function getRoundLabel(idx) {
    return ['CUARTOS', 'SEMIFINAL', 'FINAL'][idx] || '???';
  }

  function getRoundMatches(t, idx) {
    if (idx === 0) return t.bracket.quarters;
    if (idx === 1) return t.bracket.semis;
    return t.bracket.final;
  }

  function findNextPendingMatch(t) {
    const rounds = ['quarters', 'semis', 'final'];
    for (let r = 0; r < rounds.length; r++) {
      const matches = t.bracket[rounds[r]];
      for (let m = 0; m < matches.length; m++) {
        if (matches[m].winner == null && matches[m].a != null && matches[m].b != null) {
          return { round: r, match: m };
        }
      }
    }
    return null;
  }

  function isPlayerInMatch(match, playerCharIdx) {
    return match.a === playerCharIdx || match.b === playerCharIdx;
  }

  function simulateAIMatch(charA, charB) {
    // Probabilidad basada en suma de stats
    const sa = charA.stats.power + charA.stats.speed + charA.stats.defense + Math.random() * 8;
    const sb = charB.stats.power + charB.stats.speed + charB.stats.defense + Math.random() * 8;
    return sa >= sb ? charA.id - 1 : charB.id - 1; // devuelve idx en CHARACTERS
  }

  function advanceWinner(t, roundIdx, matchIdx, winnerCharIdx) {
    const matches = getRoundMatches(t, roundIdx);
    matches[matchIdx].winner = winnerCharIdx;

    // Avanzar al siguiente round
    const nextRoundIdx = roundIdx + 1;
    if (nextRoundIdx > 2) return; // ya es la final
    const nextMatches = getRoundMatches(t, nextRoundIdx);
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const slot = (matchIdx % 2 === 0) ? 'a' : 'b';
    nextMatches[nextMatchIdx][slot] = winnerCharIdx;
  }

  function renderBracket(t) {
    const rounds = [t.bracket.quarters, t.bracket.semis, t.bracket.final];
    const labels = ['CUARTOS', 'SEMIS', 'FINAL'];
    const next = findNextPendingMatch(t);

    return `
      <div class="bracket">
        ${rounds.map((matches, rIdx) => `
          <div class="bracket-round">
            <div class="bracket-round-label">${labels[rIdx]}</div>
            ${matches.map((m, mIdx) => {
              let cls = '';
              if (next && next.round === rIdx && next.match === mIdx) cls = 'next';
              else if (m.winner != null) cls = 'done';
              return renderMatch(m, t.playerCharIdx, cls);
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderMatch(m, playerCharIdx, cls) {
    return `
      <div class="bracket-match ${cls}">
        ${renderFighterRow(m.a, m.winner, playerCharIdx)}
        ${renderFighterRow(m.b, m.winner, playerCharIdx)}
      </div>
    `;
  }

  function renderFighterRow(charIdx, winnerIdx, playerCharIdx) {
    if (charIdx == null) {
      return `<div class="bracket-fighter tbd"><div class="mini-portrait"></div>TBD</div>`;
    }
    const c = CHARACTERS[charIdx];
    let cls = (charIdx === playerCharIdx) ? 'player' : 'cpu';
    if (winnerIdx != null) {
      if (charIdx === winnerIdx) cls += ' winner';
      else cls += ' loser';
    }
    return `
      <div class="bracket-fighter ${cls}">
        <div class="mini-portrait"><img src="${c.thumb}" onerror="this.outerHTML='?'" /></div>
        <span>${c.name}</span>
      </div>
    `;
  }

  function render() {
    const t = GAME_STATE.tournament;
    if (!t) return;

    const next = findNextPendingMatch(t);
    let statusText = '';
    let actions = '';

    if (t.winnerIdx != null) {
      const champ = CHARACTERS[t.winnerIdx];
      statusText = `🏆 CAMPEÓN: ${champ.name}`;
      actions = `
        <button class="tournament-btn ${activeIndex === 0 ? 'active' : ''}" data-idx="0">VOLVER AL MENÚ</button>
      `;
    } else if (next) {
      const matches = getRoundMatches(t, next.round);
      const m = matches[next.match];
      const isPlayer = isPlayerInMatch(m, t.playerCharIdx);
      const a = CHARACTERS[m.a].name;
      const b = CHARACTERS[m.b].name;
      statusText = `${getRoundLabel(next.round)}: ${a} VS ${b}`;
      actions = `
        <button class="tournament-btn ${activeIndex === 0 ? 'active' : ''}" data-idx="0">
          ${isPlayer ? 'PELEAR' : 'SIMULAR'}
        </button>
        <button class="tournament-btn danger ${activeIndex === 1 ? 'active' : ''}" data-idx="1">ABANDONAR</button>
      `;
    }

    const root = SceneManager.getRoot();
    root.innerHTML = `
      <div class="tournament-scene">
        <div class="app-header">
          <div class="title">TORNEO</div>
          <div class="vs">★</div>
          <div class="title">8 LUCHADORES</div>
        </div>

        <div class="tournament-body">
          <div class="tournament-title">TORNEO DEL BARRIO</div>
          <div class="tournament-subtitle">ELIMINATORIA - 8 LUCHADORES</div>

          ${renderBracket(t)}

          <div class="tournament-status">${statusText}</div>
          <div class="tournament-actions">${actions}</div>
        </div>

        <div class="champion-overlay" id="champion-overlay">
          <h2>¡CAMPEÓN!</h2>
          <img id="champ-img" src="" />
          <div class="champ-name" id="champ-name"></div>
          <button class="tournament-btn" id="champ-back">VOLVER AL MENÚ</button>
        </div>
      </div>
    `;

    document.querySelectorAll(".tournament-btn[data-idx]").forEach(el => {
      el.addEventListener("click", () => {
        activeIndex = parseInt(el.dataset.idx, 10);
        confirmAction();
      });
    });

    const champBack = document.getElementById('champ-back');
    if (champBack) champBack.addEventListener('click', () => SceneManager.go('menu'));
  }

  function confirmAction() {
    const t = GAME_STATE.tournament;
    if (!t) return;

    if (t.winnerIdx != null) {
      // Solo opción: volver
      SceneManager.go('menu');
      return;
    }

    if (activeIndex === 1) {
      // Abandonar
      SceneManager.go('menu');
      return;
    }

    // Activar siguiente combate
    AudioMgr.play('sfxConfirm');
    advanceTournament();
  }

  function advanceTournament() {
    const t = GAME_STATE.tournament;
    const next = findNextPendingMatch(t);
    if (!next) {
      // Final terminada
      const finalMatch = t.bracket.final[0];
      if (finalMatch.winner != null) {
        t.winnerIdx = finalMatch.winner;
        if (t.winnerIdx === t.playerCharIdx) {
          Storage.recordTournamentWin(CHARACTERS[t.winnerIdx].id);
        }
        showChampion();
      }
      return;
    }

    const matches = getRoundMatches(t, next.round);
    const m = matches[next.match];
    const isPlayer = isPlayerInMatch(m, t.playerCharIdx);

    if (isPlayer) {
      // Jugador pelea
      const playerSlot = (m.a === t.playerCharIdx) ? 'a' : 'b';
      const enemyIdx = (playerSlot === 'a') ? m.b : m.a;
      GAME_STATE.p1Index = t.playerCharIdx;
      GAME_STATE.p2Index = enemyIdx;
      GAME_STATE.rounds = { p1: 0, p2: 0 };
      SceneManager.go('battle');
    } else {
      // Simular CPU vs CPU
      const winnerIdx = simulateAIMatch(CHARACTERS[m.a], CHARACTERS[m.b]);
      advanceWinner(t, next.round, next.match, winnerIdx);
      AudioMgr.play('sfxKo');
      // Re-renderizar
      activeIndex = 0;
      render();

      // Si la final ya está resuelta tras simular
      const after = findNextPendingMatch(t);
      if (!after && t.bracket.final[0].winner != null) {
        t.winnerIdx = t.bracket.final[0].winner;
        if (t.winnerIdx === t.playerCharIdx) {
          Storage.recordTournamentWin(CHARACTERS[t.winnerIdx].id);
        }
        setTimeout(showChampion, 600);
      }
    }
  }

  function showChampion() {
    const t = GAME_STATE.tournament;
    const champ = CHARACTERS[t.winnerIdx];
    const overlay = document.getElementById('champion-overlay');
    const img = document.getElementById('champ-img');
    const name = document.getElementById('champ-name');

    if (img) img.src = champ.sprite;
    if (name) name.textContent = champ.name + (t.winnerIdx === t.playerCharIdx ? ' (TÚ)' : '');
    if (overlay) overlay.classList.add('show');

    // Confeti
    const w = window.innerWidth;
    const h = window.innerHeight;
    Particles.spawnConfetti(w / 2, h / 3);
    setTimeout(() => Particles.spawnConfetti(w / 4, h / 3), 200);
    setTimeout(() => Particles.spawnConfetti(w * 3 / 4, h / 3), 400);
  }

  function move(dir) {
    const t = GAME_STATE.tournament;
    if (!t) return;
    const buttonsCount = (t.winnerIdx != null) ? 1 : 2;
    activeIndex = (activeIndex + dir + buttonsCount) % buttonsCount;
    AudioMgr.play('sfxMove');
    document.querySelectorAll('.tournament-btn[data-idx]').forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
    });
  }

  function processMatchResult(winnerKey) {
    const t = GAME_STATE.tournament;
    if (!t) return;
    const next = findNextPendingMatch(t);
    if (!next) return;

    const matches = getRoundMatches(t, next.round);
    const m = matches[next.match];
    const winnerCharIdx = (winnerKey === 'p1') ? GAME_STATE.p1Index : GAME_STATE.p2Index;
    advanceWinner(t, next.round, next.match, winnerCharIdx);
  }

  function onInput(evt) {
    if (evt.type !== "press") return;
    if (evt.action === "left" || evt.action === "up") move(-1);
    else if (evt.action === "right" || evt.action === "down") move(1);
    else if (evt.action === "confirm") confirmAction();
    else if (evt.action === "back") SceneManager.go("menu");
  }

  function enter(payload = {}) {
    AudioMgr.playMusic('menuMusic');

    if (payload.startWith != null) {
      // Iniciar nuevo torneo
      init(payload.startWith);
    } else if (payload.matchResult) {
      // Volver de combate
      processMatchResult(payload.matchResult);
    } else if (!GAME_STATE.tournament) {
      // No hay torneo: ir a select
      SceneManager.go('select');
      return;
    }

    activeIndex = 0;
    render();
    Input.on(onInput);
  }

  function exit() { Input.off(onInput); }

  return { enter, exit };
})();

window.TournamentScene = TournamentScene;
