// Interfaz de usuario: menu principal, HUD, modales, estadisticas y toasts.
// Se comunica con el nucleo del juego a traves de window.Game / window.UI.
/* global document, window, localStorage, Game, Sound, console */
/* global piecePawn, pieceKnight, pieceBishop, pieceRook, pieceQueen */
"use strict";

var UI = (function () {

	var $ = function (id) { return document.getElementById(id); };

	var GLYPHS = {};
	var lastGameOpts = null;
	var promoCallback = null;
	var toastTimer = null;
	var estadoTimer = null;

	/* ================= estadisticas ================= */

	function loadStats() {
		var stats = { games: 0, wins: 0, losses: 0, draws: 0, maxLevelBeaten: -1 };
		try {
			var raw = localStorage.getItem("chess3d.stats");
			if (raw) {
				var parsed = JSON.parse(raw);
				Object.keys(stats).forEach(function (k) {
					if (typeof parsed[k] === "number") { stats[k] = parsed[k]; }
				});
			}
		} catch (e) {}
		return stats;
	}

	function saveStats(stats) {
		try { localStorage.setItem("chess3d.stats", JSON.stringify(stats)); } catch (e) {}
	}

	function bestRush() {
		try { return parseInt(localStorage.getItem("chess3d.bestRush") || "0", 10); } catch (e) { return 0; }
	}

	function refreshMenuStats() {
		var s = loadStats();
		$("stat-games").textContent = s.games;
		$("stat-wins").textContent = s.wins;
		$("stat-level").textContent = s.maxLevelBeaten >= 0 ?
			(Game.levels[s.maxLevelBeaten].name) : "—";
		$("stat-rush").textContent = bestRush();
	}

	/* ================= helpers ================= */

	function show(id) { $(id).classList.remove("hidden"); }
	function hide(id) { $(id).classList.add("hidden"); }

	function toast(msg, ms) {
		var el = $("toast");
		el.textContent = msg;
		el.classList.add("visible");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () {
			el.classList.remove("visible");
		}, ms || 2600);
	}

	function estado(msg, persistent) {
		var el = $("estado");
		clearTimeout(estadoTimer);
		if (!msg) {
			el.classList.remove("visible");
			return;
		}
		el.textContent = msg;
		el.classList.add("visible");
		if (!persistent) {
			estadoTimer = setTimeout(function () {
				el.classList.remove("visible");
			}, 2200);
		}
	}

	function fmtClock(ms) {
		var total = Math.ceil(ms / 1000);
		var m = Math.floor(total / 60);
		var s = total % 60;
		return m + ":" + (s < 10 ? "0" : "") + s;
	}

	function download(filename, text) {
		var a = document.createElement("a");
		a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	function closeModals() {
		hide("modal-back");
		hide("modal-gameover");
		hide("modal-promotion");
		hide("modal-pgn");
		hide("modal-puzzle-end");
	}

	function openModal(id) {
		closeModals();
		show("modal-back");
		show(id);
	}

	/* ================= menu ================= */

	function showMenu() {
		Game.toMenu();
		closeModals();
		hide("hud");
		hide("puzzle-hud");
		hide("eval-wrap");
		hide("menu-config");
		show("menu");
		show("menu-cards");
		refreshMenuStats();
	}

	function openConfig(mode) {
		$("menu-config").dataset.mode = mode;
		$("config-title").textContent = (mode === "ai") ?
			"Partida contra la IA" : "Partida de dos jugadores";
		document.querySelectorAll(".ai-only").forEach(function (el) {
			el.style.display = (mode === "ai") ? "" : "none";
		});
		hide("menu-cards");
		show("menu-config");
	}

	function startFromConfig() {
		var mode = $("menu-config").dataset.mode;
		var colorSel = document.querySelector('input[name="color"]:checked').value;
		var playerWhite = colorSel === "white" ? true :
			colorSel === "black" ? false : Math.random() < 0.5;
		var level = parseInt($("sel-level").value, 10);
		var time = $("sel-time").value.split(",");
		var opts = {
			mode: mode,
			playerWhite: playerWhite,
			level: level,
			minutes: parseInt(time[0], 10),
			increment: parseInt(time[1], 10)
		};
		lastGameOpts = opts;
		hide("menu");
		Game.newGame(opts);
	}

	function startPuzzle() {
		hide("menu");
		closeModals();
		hide("hud");
		show("puzzle-hud");
		hide("eval-wrap");
		Game.startPuzzleRush();
	}

	/* ================= callbacks del juego ================= */

	var api = {

		onReady: function () {
			showMenu();
		},

		onNewGameStarted: function (info) {
			closeModals();
			hide("menu");
			hide("puzzle-hud");
			show("hud");
			$("moves").innerHTML = "";
			estado("");
			$("hud-thinking").classList.remove("visible");

			var label;
			if (info.mode === "ai") {
				var lv = info.levelInfo;
				label = (info.playerWhite ? "Blancas" : "Negras") +
					" contra IA · " + lv.name + " (" + lv.elo + ")";
				show("eval-wrap");
				api.onEval(0);
			} else {
				label = "Dos jugadores";
				hide("eval-wrap");
			}
			if (info.loaded) { label += " · partida cargada"; }
			$("hud-mode").textContent = label;

			if (info.clock) {
				show("clocks");
			} else {
				hide("clocks");
			}
			updateUndoButton();
		},

		onMoveApplied: function (m) {
			var list = $("moves");
			if (m.white || list.children.length === 0) {
				var li = document.createElement("li");
				li.innerHTML = "<span class='mw'></span><span class='mb'></span>";
				list.appendChild(li);
			}
			var last = list.lastChild;
			var slot = m.white ? last.querySelector(".mw") : last.querySelector(".mb");
			if (slot) { slot.textContent = m.san; }
			list.parentNode.scrollTop = list.parentNode.scrollHeight;

			if (m.mate) {
				estado("¡Jaque mate!", true);
			} else if (m.check) {
				estado("¡Jaque!");
			}
			updateUndoButton();
		},

		onHistoryRebuilt: function (sans) {
			var list = $("moves");
			list.innerHTML = "";
			sans.forEach(function (san, i) {
				var white = i % 2 === 0;
				if (white) {
					var li = document.createElement("li");
					li.innerHTML = "<span class='mw'></span><span class='mb'></span>";
					list.appendChild(li);
				}
				var last = list.lastChild;
				var slot = white ? last.querySelector(".mw") : last.querySelector(".mb");
				if (slot) { slot.textContent = san; }
			});
			list.parentNode.scrollTop = list.parentNode.scrollHeight;
			estado("");
			updateUndoButton();
		},

		onTurn: function (whiteToMove) {
			$("turn-dot").className = whiteToMove ? "dot white" : "dot black";
			$("turn-label").textContent = whiteToMove ? "Mueven blancas" : "Mueven negras";
		},

		onCapturedUpdate: function (captured) {
			// captured.w = piezas blancas perdidas; captured.b = negras perdidas
			function render(el, list, cssClass) {
				el.innerHTML = "";
				list.forEach(function (t) {
					var span = document.createElement("span");
					span.className = cssClass;
					span.textContent = GLYPHS[t] || "?";
					el.appendChild(span);
				});
			}
			render($("captured-by-white"), captured.b, "cap black-piece");
			render($("captured-by-black"), captured.w, "cap white-piece");
		},

		onThinking: function (on, msg) {
			var el = $("hud-thinking");
			el.textContent = msg || "La IA está pensando…";
			el.classList.toggle("visible", !!on);
		},

		onEval: function (cp) {
			var el = $("eval-fill");
			var clamped = Math.max(-2000, Math.min(2000, cp));
			var pct = 50 + 50 * (2 / (1 + Math.exp(-clamped / 400)) - 1);
			pct = Math.max(4, Math.min(96, pct));
			el.style.height = pct + "%";
			var label = $("eval-label");
			var val = (cp / 100);
			label.textContent = (val > 0 ? "+" : "") + val.toFixed(1);
		},

		onClock: function (c) {
			if (!c.enabled) { hide("clocks"); return; }
			show("clocks");
			$("clock-w-time").textContent = fmtClock(c.wMs);
			$("clock-b-time").textContent = fmtClock(c.bMs);
			$("clock-w").classList.toggle("active", c.active === "w");
			$("clock-b").classList.toggle("active", c.active === "b");
			$("clock-w").classList.toggle("low", c.wMs < 10500);
			$("clock-b").classList.toggle("low", c.bMs < 10500);
		},

		onGameOver: function (info) {
			// estadisticas (solo partidas contra la IA)
			if (info.mode === "ai") {
				var s = loadStats();
				s.games++;
				if (info.outcome === "win") {
					s.wins++;
					if (info.level > s.maxLevelBeaten) { s.maxLevelBeaten = info.level; }
				} else if (info.outcome === "lose") {
					s.losses++;
				} else {
					s.draws++;
				}
				saveStats(s);
			}

			var title, cls;
			if (info.outcome === "win") { title = "¡Victoria!"; cls = "win"; }
			else if (info.outcome === "lose") { title = "Derrota"; cls = "lose"; }
			else if (info.outcome === "draw") { title = "Tablas"; cls = "draw"; }
			else if (info.outcome === "white") { title = "Ganan las blancas"; cls = "win"; }
			else { title = "Ganan las negras"; cls = "win"; }

			$("go-title").textContent = title;
			$("go-title").className = cls;
			$("go-reason").textContent =
				info.reason.charAt(0).toUpperCase() + info.reason.slice(1) +
				" · " + info.moves + " jugadas";
			openModal("modal-gameover");
		},

		/* --- rafaga de mates --- */

		onPuzzleUpdate: function (p) {
			$("pz-score").textContent = p.score;
			renderStrikes(p.strikes);
			$("pz-side").textContent = p.white ?
				"Juegan blancas: ¡mate en 1!" : "Juegan negras: ¡mate en 1!";
		},

		onPuzzleTick: function (leftMs) {
			$("pz-timer").textContent = fmtClock(leftMs);
			$("pz-timer").classList.toggle("low", leftMs < 30000);
		},

		onPuzzleSolved: function (score) {
			$("pz-score").textContent = score;
			estado("¡Mate! +1");
		},

		onPuzzleFailed: function (strikes, solutionSan) {
			renderStrikes(strikes);
			estado("No es mate — solución: " + solutionSan);
		},

		onPuzzleEnd: function (r) {
			$("pz-end-score").textContent = r.score;
			$("pz-end-best").textContent = r.best;
			$("pz-end-record").style.display = r.newRecord && r.score > 0 ? "" : "none";
			hide("puzzle-hud");
			openModal("modal-puzzle-end");
			refreshMenuStats();
		},

		/* --- varios --- */

		promotionChoice: function (cb) {
			promoCallback = cb;
			openModal("modal-promotion");
		},

		toast: toast
	};

	function renderStrikes(n) {
		var el = $("pz-strikes");
		el.innerHTML = "";
		for (var i = 0; i < 3; i++) {
			var s = document.createElement("span");
			s.textContent = "♥";
			s.className = i < n ? "life" : "life lost";
			el.appendChild(s);
		}
	}

	function updateUndoButton() {
		$("btn-undo").disabled = !Game.canUndo();
	}

	/* ================= tarjeta para compartir ================= */

	function shareCard() {
		var canvas = document.createElement("canvas");
		canvas.width = 1000;
		canvas.height = 560;
		var ctx = canvas.getContext("2d");

		var grad = ctx.createLinearGradient(0, 0, 0, 560);
		grad.addColorStop(0, "#1a120a");
		grad.addColorStop(1, "#000000");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, 1000, 560);

		ctx.strokeStyle = "#8a6d3b";
		ctx.lineWidth = 4;
		ctx.strokeRect(14, 14, 972, 532);

		// mini tablero decorativo
		var size = 30;
		for (var y = 0; y < 8; y++) {
			for (var x = 0; x < 8; x++) {
				ctx.fillStyle = (x + y) % 2 === 0 ? "#d8b98c" : "#5c3a1e";
				ctx.globalAlpha = 0.25;
				ctx.fillRect(710 + x * size, 150 + y * size, size, size);
			}
		}
		ctx.globalAlpha = 1;

		ctx.fillStyle = "#e8d5b0";
		ctx.font = "bold 52px Georgia, serif";
		ctx.fillText("AJEDREZ 3D", 60, 100);

		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 64px Georgia, serif";
		ctx.fillText($("go-title").textContent, 60, 240);

		ctx.fillStyle = "#c8b490";
		ctx.font = "28px Georgia, serif";
		ctx.fillText($("go-reason").textContent, 60, 300);

		var s = loadStats();
		ctx.font = "24px Georgia, serif";
		ctx.fillStyle = "#9a8a6a";
		ctx.fillText("Partidas: " + s.games + "  ·  Victorias: " + s.wins +
			"  ·  Récord ráfaga: " + bestRush(), 60, 360);

		ctx.fillStyle = "#6a5a3a";
		ctx.font = "20px Georgia, serif";
		ctx.fillText(new Date().toLocaleDateString("es-ES"), 60, 500);

		var a = document.createElement("a");
		a.href = canvas.toDataURL("image/png");
		a.download = "ajedrez3d-resultado.png";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		toast("Tarjeta descargada: compártela donde quieras");
	}

	/* ================= eventos DOM ================= */

	function bind() {
		// desbloquear audio en el primer gesto
		document.addEventListener("pointerdown", function once() {
			Sound.unlock();
			document.removeEventListener("pointerdown", once);
		});

		// menu principal
		$("card-ai").addEventListener("click", function () { Sound.click(); openConfig("ai"); });
		$("card-2p").addEventListener("click", function () { Sound.click(); openConfig("2p"); });
		$("card-puzzle").addEventListener("click", function () { Sound.click(); startPuzzle(); });
		$("card-load").addEventListener("click", function () { Sound.click(); openModal("modal-pgn"); });
		$("btn-config-back").addEventListener("click", function () {
			Sound.click();
			hide("menu-config");
			show("menu-cards");
		});
		$("btn-config-start").addEventListener("click", function () {
			Sound.click();
			startFromConfig();
		});

		// HUD
		$("btn-undo").addEventListener("click", function () { Sound.click(); Game.undo(); });
		$("btn-hint").addEventListener("click", function () { Sound.click(); Game.requestHint(); });
		$("btn-flip").addEventListener("click", function () { Sound.click(); Game.flipCamera(); });
		$("btn-resign").addEventListener("click", function () { Sound.click(); Game.resign(); });
		$("btn-save").addEventListener("click", function () {
			Sound.click();
			download("partida-ajedrez3d.pgn", Game.getPGN());
			toast("Partida guardada en PGN");
		});
		$("btn-menu").addEventListener("click", function () { Sound.click(); showMenu(); });
		$("btn-sound").addEventListener("click", function () {
			var on = Sound.toggle();
			$("btn-sound").textContent = on ? "🔊" : "🔇";
			if (on) { Sound.click(); }
		});
		$("btn-sound").textContent = Sound.isEnabled() ? "🔊" : "🔇";

		// rafaga
		$("btn-pz-quit").addEventListener("click", function () { Sound.click(); showMenu(); });
		$("btn-pz-retry").addEventListener("click", function () { Sound.click(); startPuzzle(); });
		$("btn-pz-menu").addEventListener("click", function () { Sound.click(); showMenu(); });

		// fin de partida
		$("btn-go-rematch").addEventListener("click", function () {
			Sound.click();
			if (lastGameOpts) {
				closeModals();
				Game.newGame(lastGameOpts);
			} else {
				showMenu();
			}
		});
		$("btn-go-menu").addEventListener("click", function () { Sound.click(); showMenu(); });
		$("btn-go-save").addEventListener("click", function () {
			Sound.click();
			download("partida-ajedrez3d.pgn", Game.getPGN());
			toast("Partida guardada en PGN");
		});
		$("btn-go-share").addEventListener("click", function () { Sound.click(); shareCard(); });
		$("btn-go-close").addEventListener("click", function () {
			Sound.click();
			closeModals();
		});

		// promocion
		document.querySelectorAll("#modal-promotion button[data-promo]").forEach(function (b) {
			b.addEventListener("click", function () {
				Sound.click();
				closeModals();
				if (promoCallback) {
					var cb = promoCallback;
					promoCallback = null;
					cb(b.dataset.promo);
				}
			});
		});

		// PGN
		$("btn-pgn-close").addEventListener("click", function () { Sound.click(); closeModals(); });
		$("btn-pgn-load").addEventListener("click", function () {
			Sound.click();
			var text = $("pgn-text").value.trim();
			if (!text) { toast("Pega un PGN o elige un archivo"); return; }
			tryLoadPGN(text);
		});
		$("pgn-file").addEventListener("change", function (evt) {
			var file = evt.target.files[0];
			if (!file) { return; }
			var reader = new FileReader();
			reader.onload = function (e) {
				$("pgn-text").value = e.target.result;
				tryLoadPGN(e.target.result);
			};
			reader.readAsText(file);
		});

		// niveles de IA
		var sel = $("sel-level");
		Game.levels.forEach(function (lv, i) {
			var opt = document.createElement("option");
			opt.value = i;
			opt.textContent = (i + 1) + ". " + lv.name + " (" + lv.elo + ")";
			if (i === 4) { opt.selected = true; }
			sel.appendChild(opt);
		});

		// teclado
		document.addEventListener("keydown", function (e) {
			if (e.key === "Escape") {
				if (!$("modal-back").classList.contains("hidden")) {
					// no cerrar la promocion con Escape (hay que elegir)
					if ($("modal-promotion").classList.contains("hidden")) {
						closeModals();
					}
				}
			}
		});
	}

	function tryLoadPGN(text) {
		try {
			Game.loadPGNText(text);
			closeModals();
			hide("menu");
			toast("Partida cargada, sigue jugando contra la IA");
		} catch (err) {
			console.error(err);
			toast("No se pudo leer ese PGN");
		}
	}

	function initGlyphs() {
		GLYPHS[piecePawn] = "♟";
		GLYPHS[pieceKnight] = "♞";
		GLYPHS[pieceBishop] = "♝";
		GLYPHS[pieceRook] = "♜";
		GLYPHS[pieceQueen] = "♛";
	}

	document.addEventListener("DOMContentLoaded", function () {
		initGlyphs();
		bind();
	});

	window.UI = api;
	return api;
})();
