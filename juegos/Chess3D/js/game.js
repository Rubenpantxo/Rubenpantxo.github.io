// Nucleo del juego: escena 3D (estetica original de Chess3D), interaccion,
// animaciones, modos de juego (IA, 2 jugadores, rafaga de mates), relojes,
// pistas y barra de evaluacion. Sustituye al antiguo chess.js.
/* global THREE, document, window, console, localStorage */
/* global ROWS, COLS, BOARD_SIZE, FLOOR_SIZE, WHITE, BLACK, SHADOW, DEBUG, Cell */
/* global textures, geometries */
/* global initPieceFactory, initCellFactory, createPiece, createChessBoard, createFloor */
/* global createValidCellMaterial, createSelectedMaterial, selectedMaterial */
/* global Search, FormatSquare, GenerateMove, MakeMove, GetMoveSAN, MakeSquare, UnmakeMove, FormatMove, ResetGame, GetFen, GetMoveFromString, InitializeFromFen, GenerateValidMoves */
/* global g_inCheck, g_board, g_pieceList, g_toMove, g_timeout:true, g_maxply:true */
/* global moveflagCastleKing, moveflagCastleQueen, moveflagEPC, moveflagPromotion, colorWhite */
/* global moveflagPromoteQueen, moveflagPromoteRook, moveflagPromoteBishop, moveflagPromoteKnight */
/* global piecePawn, pieceKnight, pieceBishop, pieceRook, pieceQueen, pieceKing */
/* global Sound, UI, PUZZLES_MATE1, parsePGN */
"use strict";

// niveles de la IA: tiempo de busqueda (ms) y profundidad maxima
var levels = [
	{ timeout: 0,    maxply: 1,   name: "Peón",         elo: "~400"  },
	{ timeout: 12,   maxply: 20,  name: "Principiante", elo: "~700"  },
	{ timeout: 25,   maxply: 40,  name: "Aficionado",   elo: "~900"  },
	{ timeout: 50,   maxply: 60,  name: "Casual",       elo: "~1100" },
	{ timeout: 100,  maxply: 80,  name: "Club",         elo: "~1300" },
	{ timeout: 200,  maxply: 100, name: "Torneo",       elo: "~1500" },
	{ timeout: 400,  maxply: 120, name: "Experto",      elo: "~1700" },
	{ timeout: 800,  maxply: 140, name: "Candidato",    elo: "~1900" },
	{ timeout: 1600, maxply: 160, name: "Maestro",      elo: "~2100" },
	{ timeout: 3200, maxply: 180, name: "Gran Maestro", elo: "~2300" }
];

var Game = (function () {

	// --- estado 3D ---
	var scene, renderer, camera, cameraControls, projector;
	var chessBoard;
	var clock3D = new THREE.Clock();
	var board3D = [];          // index 0..63 -> Object3D de la pieza
	var cellMap = {};          // index 0..63 -> mesh de la casilla
	var initialized = false;

	// --- estado de partida ---
	var state = {
		mode: null,            // 'ai' | '2p' | 'puzzle' | null (menu)
		playerWhite: true,
		level: 4,
		gameOver: true,
		thinking: false
	};
	var validMoves = [];
	var g_allMoves = [];
	var sanHistory = [];
	var moveMeta = [];         // por jugada: {key, halfmove} para tablas
	var backgroundEngine = null;
	var backgroundEngineValid = true;

	// --- seleccion / resaltado ---
	var selectedPiece = null;
	var lastMoveIdxs = [];
	var checkIdx = null;
	var hintIdxs = [];
	var hintTimer = null;

	// --- animacion ---
	var tweens = [];
	var animQueue = [];
	var animating = false;

	// --- camara ---
	var cinematic = true;
	var cineAngle = 0;
	var cameraTweening = false;

	// --- relojes ---
	var chessClock = {
		enabled: false,
		wMs: 0, bMs: 0, incMs: 0,
		timer: null,
		lastTick: 0,
		lowWarned: {}
	};

	// --- rafaga de mates ---
	var puzzle = {
		active: false,
		list: [],
		idx: -1,
		score: 0,
		strikes: 3,
		endTime: 0,
		timer: null,
		transition: false
	};

	// --- materiales de resaltado de casillas ---
	var hlMaterials = null;

	/* ================= utilidades ================= */

	function ui() { return window.UI || null; }

	function whiteToMove() { return !!g_toMove; }

	function easeInOut(p) {
		return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
	}

	function addTween(dur, onUpdate, onComplete) {
		tweens.push({ t: 0, dur: dur, onUpdate: onUpdate, onComplete: onComplete });
	}

	function updateTweens(dt) {
		for (var i = tweens.length - 1; i >= 0; i--) {
			var tw = tweens[i];
			tw.t += dt;
			var p = Math.min(1, tw.t / tw.dur);
			tw.onUpdate(easeInOut(p), p);
			if (p >= 1) {
				tweens.splice(i, 1);
				if (tw.onComplete) { tw.onComplete(); }
			}
		}
	}

	/* ================= escena ================= */

	function init() {
		if (initialized) { return; }
		initialized = true;

		var canvasWidth = window.innerWidth;
		var canvasHeight = window.innerHeight;

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.setSize(canvasWidth, canvasHeight);
		renderer.setClearColor(0x000000, 1.0);
		renderer.domElement.id = "game-canvas";
		document.body.appendChild(renderer.domElement);

		camera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 1, 40000);
		cameraControls = new THREE.OrbitAndPanControls(camera, renderer.domElement);
		cameraControls.minPolarAngle = 0;
		cameraControls.maxPolarAngle = 80 * Math.PI / 180;
		cameraControls.minDistance = 10;
		cameraControls.maxDistance = 200;
		cameraControls.userZoomSpeed = 1.0;
		// perspectiva clasica detras de las blancas (como el Chess3D original)
		camera.position.set(0, 100, 100);

		// iluminacion identica al original
		var spotlight = new THREE.SpotLight(0xFFFFFF, 1.0);
		spotlight.position.set(0, 300, 0);
		spotlight.angle = Math.PI / 2;
		spotlight.exponent = 50.0;
		spotlight.target.position.set(0, 0, 0);

		var whiteLight = new THREE.PointLight(0xFFEEDD, 0.2);
		whiteLight.position.set(0, 0, 100);
		var blackLight = new THREE.PointLight(0xFFEEDD, 0.2);
		blackLight.position.set(0, 0, -100);

		initPieceFactory();
		initCellFactory();

		chessBoard = createChessBoard(BOARD_SIZE);
		var floor = createFloor(FLOOR_SIZE, BOARD_SIZE);
		floor.position.y = chessBoard.height;

		scene = new THREE.Scene();
		scene.add(floor);
		scene.add(spotlight);
		scene.add(whiteLight);
		scene.add(blackLight);
		scene.add(chessBoard);
		scene.fog = new THREE.FogExp2(0x000000, 0.001);
		scene.add(new THREE.AmbientLight(0x330000));

		projector = new THREE.Projector();

		// materiales del original (seleccion de pieza)
		createValidCellMaterial();
		createSelectedMaterial();
		createHighlightMaterials();

		// mapa de casillas para resaltados
		chessBoard.children.forEach(function (child) {
			if (child.name && /^[a-h][1-8]$/.test(child.name)) {
				var c = new Cell(child.name);
				cellMap[c.index] = child;
				child.baseMaterial = child.material;
			}
		});

		document.addEventListener("mousedown", onMouseDown, false);
		document.addEventListener("mousemove", onMouseMove, false);
		renderer.domElement.addEventListener("contextmenu", function (e) { e.preventDefault(); });
		window.addEventListener("resize", onResize, false);

		// posicion inicial de fondo para el menu
		ResetGame();
		validMoves = GenerateValidMoves();
		syncBoard();

		animate();

		// con la pestaña en segundo plano el navegador congela requestAnimationFrame;
		// este pulso de respaldo mantiene las animaciones (y sus callbacks) vivas
		setInterval(function () {
			if (document.hidden) {
				updateTweens(clock3D.getDelta());
			}
		}, 50);

		// handle de depuracion (consola del navegador)
		window.__three = { renderer: renderer, scene: scene, camera: camera };
		if (DEBUG) {
			window.scene = scene;
			window.renderer = renderer;
		}
	}

	function createHighlightMaterials() {
		function cellMat(base, opts) {
			var diff = textures["texture/wood-" + base + ".jpg"].clone();
			diff.tile(2);
			var norm = textures["texture/wood_N.jpg"].clone();
			norm.tile(2);
			var spec = textures["texture/wood_S.jpg"].clone();
			spec.tile(2);
			return new THREE.MeshPhongMaterial({
				color: opts.color,
				emissive: opts.emissive,
				specular: 0x999999,
				shininess: 60.0,
				map: diff,
				specularMap: spec,
				normalMap: norm,
				transparent: true,
				opacity: opts.opacity
			});
		}
		hlMaterials = {
			valid: [
				cellMat(0, { color: 0x44dd66, emissive: 0x0a3312, opacity: 0.85 }),
				cellMat(1, { color: 0x33bb55, emissive: 0x0a3312, opacity: 0.85 })
			],
			last: [
				cellMat(0, { color: 0xddbb44, emissive: 0x332508, opacity: 0.8 }),
				cellMat(1, { color: 0xcc9933, emissive: 0x332508, opacity: 0.8 })
			],
			check: [
				cellMat(0, { color: 0xff5544, emissive: 0x441008, opacity: 0.9 }),
				cellMat(1, { color: 0xee3322, emissive: 0x441008, opacity: 0.9 })
			],
			hint: [
				cellMat(0, { color: 0x44aaff, emissive: 0x0a2244, opacity: 0.9 }),
				cellMat(1, { color: 0x3388ee, emissive: 0x0a2244, opacity: 0.9 })
			]
		};
	}

	function onResize() {
		if (!renderer) { return; }
		var w = window.innerWidth;
		var h = window.innerHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	function animate() {
		window.requestAnimationFrame(animate);
		var delta = clock3D.getDelta();
		updateTweens(delta);
		if (cinematic) {
			cineAngle += delta * 0.12;
			var r = 145;
			camera.position.set(
				Math.sin(cineAngle) * r,
				85,
				Math.cos(cineAngle) * r
			);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		} else if (!cameraTweening) {
			cameraControls.update(delta);
		}
		renderer.render(scene, camera);
	}

	function tweenCameraTo(x, y, z, dur, then) {
		var from = camera.position.clone();
		var to = new THREE.Vector3(x, y, z);
		cameraTweening = true;
		addTween(dur, function (e) {
			camera.position.set(
				from.x + (to.x - from.x) * e,
				from.y + (to.y - from.y) * e,
				from.z + (to.z - from.z) * e
			);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
		}, function () {
			cameraTweening = false;
			if (then) { then(); }
		});
	}

	function cameraToSide(white, instant) {
		var z = white ? 100 : -100;
		if (instant) {
			camera.position.set(0, 100, z);
			camera.lookAt(new THREE.Vector3(0, 0, 0));
			return;
		}
		tweenCameraTo(0, 100, z, 0.9);
	}

	/* ================= tablero 3D ================= */

	function pieceNameFromFlag(p) {
		switch (p & 0x7) {
		case piecePawn: return "pawn";
		case pieceKnight: return "knight";
		case pieceBishop: return "bishop";
		case pieceRook: return "rook";
		case pieceQueen: return "queen";
		case pieceKing: return "king";
		}
		return null;
	}

	function syncBoard() {
		board3D.forEach(function (p) { if (p) { scene.remove(p); } });
		board3D = [];
		for (var y = 0; y < ROWS; y++) {
			for (var x = 0; x < COLS; x++) {
				var p = g_board[MakeSquare(y, x)];
				var name = pieceNameFromFlag(p);
				if (name !== null) {
					var color = (p & colorWhite) ? WHITE : BLACK;
					var piece = createPiece(name, color);
					var cell = new Cell(x, y);
					piece.position = cell.getWorldPosition();
					piece.cell = cell.index;
					board3D[cell.index] = piece;
					scene.add(piece);
				}
			}
		}
		selectedPiece = null;
		updateHighlights();
	}

	// comprueba que la vista incremental coincide con el motor; si no, reconstruye
	function verifySync() {
		for (var y = 0; y < ROWS; y++) {
			for (var x = 0; x < COLS; x++) {
				var idx = x + y * COLS;
				var p = g_board[MakeSquare(y, x)];
				var name = pieceNameFromFlag(p);
				var piece = board3D[idx];
				if (name === null) {
					if (piece) { syncBoard(); return; }
				} else {
					var color = (p & colorWhite) ? WHITE : BLACK;
					if (!piece || piece.name !== name || piece.color !== color) {
						syncBoard();
						return;
					}
				}
			}
		}
	}

	function updateHighlights() {
		var i;
		for (i = 0; i < ROWS * COLS; i++) {
			if (cellMap[i]) { cellMap[i].material = cellMap[i].baseMaterial; }
		}
		lastMoveIdxs.forEach(function (idx) {
			var cell = cellMap[idx];
			if (cell) { cell.material = hlMaterials.last[cell.color]; }
		});
		if (checkIdx !== null && cellMap[checkIdx]) {
			cellMap[checkIdx].material = hlMaterials.check[cellMap[checkIdx].color];
		}
		hintIdxs.forEach(function (idx) {
			var cell = cellMap[idx];
			if (cell) { cell.material = hlMaterials.hint[cell.color]; }
		});
		if (selectedPiece !== null) {
			var fromCell = new Cell(selectedPiece.cell);
			var fromSquare = MakeSquare(fromCell.y, fromCell.x);
			validMoves.forEach(function (m) {
				if ((m & 0xFF) === fromSquare) {
					var to = new Cell(FormatSquare((m >> 8) & 0xFF));
					var cell = cellMap[to.index];
					if (cell) { cell.material = hlMaterials.valid[cell.color]; }
				}
			});
		}
	}

	function updateCheckHighlight() {
		checkIdx = null;
		if (g_inCheck) {
			// localizar el rey del bando al que le toca mover
			var kingFlag = (g_toMove ? colorWhite : 0) | pieceKing;
			var sq = g_pieceList[kingFlag << 4];
			if (sq) {
				checkIdx = new Cell(FormatSquare(sq)).index;
			}
		}
	}

	/* ================= animacion de jugadas ================= */

	function promotionNameFromMove(move) {
		if (move & moveflagPromoteQueen) { return "queen"; }
		if (move & moveflagPromoteKnight) { return "knight"; }
		if (move & moveflagPromoteBishop) { return "bishop"; }
		return "rook";
	}

	function animatePieceTo(piece, fromCell, toCell, lift, dur, onDone) {
		var from = fromCell.getWorldPosition();
		var to = toCell.getWorldPosition();
		addTween(dur, function (e, p) {
			piece.position.x = from.x + (to.x - from.x) * e;
			piece.position.z = from.z + (to.z - from.z) * e;
			piece.position.y = Math.sin(Math.PI * p) * lift;
		}, function () {
			piece.position.x = to.x;
			piece.position.y = 0;
			piece.position.z = to.z;
			if (onDone) { onDone(); }
		});
	}

	function playMoveAnimation(anim, onFinished) {
		var move = anim.move;
		var fromCell = new Cell(FormatSquare(move & 0xFF));
		var toCell = new Cell(FormatSquare((move >> 8) & 0xFF));
		var mover = board3D[fromCell.index];

		if (!mover) {
			// estado inesperado: resincronizamos sin animar
			syncBoard();
			if (onFinished) { onFinished(); }
			return;
		}

		// pieza capturada (incluida captura al paso)
		var capturedIdx = null;
		if (board3D[toCell.index]) {
			capturedIdx = toCell.index;
		} else if (move & moveflagEPC) {
			capturedIdx = new Cell(toCell.x, fromCell.y).index;
		}
		var captured = (capturedIdx !== null) ? board3D[capturedIdx] : null;

		delete board3D[fromCell.index];
		if (capturedIdx !== null) { delete board3D[capturedIdx]; }
		board3D[toCell.index] = mover;
		mover.cell = toCell.index;

		// torre del enroque
		if (move & (moveflagCastleKing | moveflagCastleQueen)) {
			var kingSide = !!(move & moveflagCastleKing);
			var rookFrom = new Cell(kingSide ? 7 : 0, fromCell.y);
			var rookTo = new Cell(kingSide ? 5 : 3, fromCell.y);
			var rook = board3D[rookFrom.index];
			if (rook) {
				delete board3D[rookFrom.index];
				board3D[rookTo.index] = rook;
				rook.cell = rookTo.index;
				animatePieceTo(rook, rookFrom, rookTo, 2, 0.34);
			}
		}

		if (captured) {
			addTween(0.3, function (e) {
				captured.scale.set(1 - 0.9 * e, 1 - 0.9 * e, 1 - 0.9 * e);
				captured.position.y = -4 * e;
			}, function () {
				scene.remove(captured);
			});
		}

		var lift = (mover.name === "knight") ? 7 : 2;
		animatePieceTo(mover, fromCell, toCell, lift, 0.34, function () {
			// promocion: sustituir el peon por la pieza elegida
			if (move & moveflagPromotion) {
				scene.remove(mover);
				var promoted = createPiece(promotionNameFromMove(move), mover.color);
				promoted.position = toCell.getWorldPosition();
				promoted.cell = toCell.index;
				board3D[toCell.index] = promoted;
				scene.add(promoted);
			}
			// sonidos en el momento del impacto
			if (anim.capture) { Sound.capture(); }
			else if (anim.castle) { Sound.castle(); }
			else { Sound.move(); }
			if (move & moveflagPromotion) { Sound.promote(); }
			if (anim.check) { Sound.check(); }

			lastMoveIdxs = [fromCell.index, toCell.index];
			updateHighlights();
			if (onFinished) { onFinished(); }
		});
	}

	function processAnimQueue() {
		if (animating || animQueue.length === 0) { return; }
		animating = true;
		var anim = animQueue.shift();
		playMoveAnimation(anim, function () {
			animating = false;
			if (anim.after) { anim.after(); }
			if (animQueue.length > 0) {
				processAnimQueue();
			} else {
				verifySync();
			}
		});
	}

	/* ================= logica de partida ================= */

	function currentPositionKey() {
		var f = GetFen().split(" ");
		return f[0] + " " + f[1] + " " + (f[2] || "-") + " " + (f[3] || "-");
	}

	function pieceCounts() {
		var counts = { w: {}, b: {}, minors: 0, others: 0 };
		for (var y = 0; y < ROWS; y++) {
			for (var x = 0; x < COLS; x++) {
				var p = g_board[MakeSquare(y, x)];
				var t = p & 0x7;
				if (!t || t === pieceKing) { continue; }
				if (t === pieceKnight || t === pieceBishop) { counts.minors++; }
				else { counts.others++; }
			}
		}
		return counts;
	}

	// pieza capturada por una jugada (antes de ejecutarla), o null
	function capturedByMove(move, moverWhite) {
		var targetP = g_board[(move >> 8) & 0xFF];
		if (targetP & 0x7) {
			return { white: !!(targetP & colorWhite), type: targetP & 0x7 };
		}
		if (move & moveflagEPC) {
			return { white: !moverWhite, type: piecePawn };
		}
		return null;
	}

	// jugada confirmada (del humano o de la IA): registra, anima y evalua fin de partida
	function commitMove(move, opts) {
		opts = opts || {};
		var san = GetMoveSAN(move, validMoves);
		var moverWhite = whiteToMove();
		var capturedInfo = capturedByMove(move, moverWhite);
		var isCapture = capturedInfo !== null;
		var isCastle = !!(move & (moveflagCastleKing | moveflagCastleQueen));
		var isPawnMove = (g_board[move & 0xFF] & 0x7) === piecePawn;

		// avisar al motor en segundo plano (partidas contra la IA)
		if (state.mode === "ai" && !opts.fromEngine && initBackgroundEngine()) {
			backgroundEngine.postMessage(FormatMove(move));
		}

		MakeMove(move);
		g_allMoves.push(move);
		sanHistory.push(san);

		// metadatos para reglas de tablas y registro de capturas
		var prevHalf = moveMeta.length ? moveMeta[moveMeta.length - 1].halfmove : 0;
		moveMeta.push({
			key: currentPositionKey(),
			halfmove: (isCapture || isPawnMove) ? 0 : prevHalf + 1,
			captured: capturedInfo
		});

		validMoves = GenerateValidMoves();
		updateCheckHighlight();

		var mate = (validMoves.length === 0) && g_inCheck;
		var stalemate = (validMoves.length === 0) && !g_inCheck;

		// incremento de reloj para quien acaba de mover
		if (chessClock.enabled && !state.gameOver) {
			if (moverWhite) { chessClock.wMs += chessClock.incMs; }
			else { chessClock.bMs += chessClock.incMs; }
			notifyClock();
		}

		if (ui()) {
			ui().onMoveApplied({
				san: san,
				white: moverWhite,
				check: g_inCheck,
				mate: mate,
				capture: isCapture
			});
			ui().onTurn(whiteToMove());
			ui().onCapturedUpdate(capturedSummary());
		}

		// decidir si la partida termina (se notifica al acabar la animacion)
		var endInfo = null;
		if (mate) {
			endInfo = { winner: moverWhite ? "white" : "black", reason: "jaque mate" };
		} else if (stalemate) {
			endInfo = { winner: null, reason: "tablas por rey ahogado" };
		} else if (moveMeta[moveMeta.length - 1].halfmove >= 100) {
			endInfo = { winner: null, reason: "tablas por la regla de los 50 movimientos" };
		} else if (isRepetition()) {
			endInfo = { winner: null, reason: "tablas por triple repetición" };
		} else if (isInsufficientMaterial()) {
			endInfo = { winner: null, reason: "tablas por material insuficiente" };
		}

		// animacion (encolada para jugadas encadenadas jugador/IA)
		animQueue.push({
			move: move,
			capture: isCapture,
			castle: isCastle,
			check: g_inCheck,
			after: function () {
				if (opts.afterAnim) { opts.afterAnim(); }
				if (endInfo) { endGame(endInfo.winner, endInfo.reason); }
			}
		});
		processAnimQueue();

		// turno de la IA (piensa mientras corre la animacion)
		if (!endInfo && state.mode === "ai" && !opts.fromEngine &&
				(whiteToMove() !== state.playerWhite)) {
			aiGo();
		}
	}

	function isRepetition() {
		var key = moveMeta[moveMeta.length - 1].key;
		var count = 0;
		for (var i = 0; i < moveMeta.length; i++) {
			if (moveMeta[i].key === key) { count++; }
		}
		return count >= 3;
	}

	function isInsufficientMaterial() {
		var c = pieceCounts();
		return c.others === 0 && c.minors <= 1;
	}

	function capturedSummary() {
		// piezas perdidas por cada bando, segun el registro real de capturas
		var result = { w: [], b: [] };
		moveMeta.forEach(function (m) {
			if (m.captured) {
				(m.captured.white ? result.w : result.b).push(m.captured.type);
			}
		});
		result.w.sort(function (a, b) { return a - b; });
		result.b.sort(function (a, b) { return a - b; });
		return result;
	}

	function endGame(winner, reason) {
		if (state.gameOver) { return; }
		state.gameOver = true;
		state.thinking = false;
		stopClock();
		ensureAnalysisStopped();

		var outcome; // desde el punto de vista del jugador humano
		if (winner === null) {
			outcome = "draw";
			Sound.draw();
		} else if (state.mode === "2p") {
			outcome = winner;
			Sound.win();
		} else {
			var playerWon = (winner === "white") === state.playerWhite;
			outcome = playerWon ? "win" : "lose";
			if (playerWon) { Sound.win(); } else { Sound.lose(); }
		}

		if (ui()) {
			ui().onThinking(false);
			ui().onGameOver({
				outcome: outcome,
				winner: winner,
				reason: reason,
				moves: Math.ceil(sanHistory.length / 2),
				mode: state.mode,
				level: state.level,
				pgn: getPGN()
			});
		}
	}

	/* ================= motor IA ================= */

	function ensureAnalysisStopped() {
		if (backgroundEngine) {
			backgroundEngine.terminate();
			backgroundEngine = null;
		}
		state.thinking = false;
	}

	function initBackgroundEngine() {
		if (!backgroundEngineValid) { return false; }
		if (!backgroundEngine) {
			try {
				backgroundEngine = new Worker("js/AI/garbochess.js");
				backgroundEngine.onmessage = function (e) {
					if (e.data.match("^pv") == "pv") {
						handlePV(e.data);
					} else if (e.data.match("^message") == "message") {
						console.warn(e.data);
					} else if (e.data.match("^console: ") == "console: ") {
						console.log(e.data.substr(9));
					} else {
						// jugada de la IA
						state.thinking = false;
						if (ui()) { ui().onThinking(false); }
						var mv = GetMoveFromString(e.data);
						if (mv !== undefined && !state.gameOver) {
							commitMove(mv, { fromEngine: true });
						}
					}
				};
				backgroundEngine.onerror = function (e) {
					console.error("Error del motor:", e.message);
					backgroundEngineValid = false;
				};
				backgroundEngine.postMessage("position " + GetFen());
			} catch (err) {
				backgroundEngineValid = false;
			}
		}
		return backgroundEngineValid;
	}

	function handlePV(data) {
		// mensajes "pv Ply:N Score:V ..." emitidos durante la busqueda de la IA
		var m = data.match(/Score:(-?\d+)/);
		if (!m) { return; }
		var cp = parseInt(m[1], 10);
		// la puntuacion es desde el punto de vista de quien mueve (la IA)
		var aiWhite = !state.playerWhite;
		var whiteCp = aiWhite ? cp : -cp;
		if (ui()) { ui().onEval(whiteCp); }
	}

	function aiGo() {
		if (state.gameOver) { return; }
		var lv = levels[state.level] || levels[4];
		state.thinking = true;
		if (ui()) { ui().onThinking(true); }
		if (initBackgroundEngine()) {
			backgroundEngine.postMessage("search " + lv.timeout + "," + lv.maxply);
		} else {
			// sin web workers: busqueda sincrona de emergencia
			g_timeout = lv.timeout;
			g_maxply = lv.maxply;
			Search(function (bestMove) {
				state.thinking = false;
				if (ui()) { ui().onThinking(false); }
				if (bestMove !== null && !state.gameOver) {
					commitMove(bestMove, { fromEngine: true });
				}
			}, lv.maxply, null);
		}
	}

	function requestHint() {
		if (state.gameOver || state.thinking || puzzle.active) { return; }
		if (state.mode === "ai" && whiteToMove() !== state.playerWhite) { return; }
		var w;
		try {
			w = new Worker("js/AI/garbochess.js");
		} catch (e) {
			if (ui()) { ui().toast("Las pistas necesitan web workers"); }
			return;
		}
		if (ui()) { ui().onThinking(true, "Buscando pista…"); }
		w.onmessage = function (e) {
			if (e.data.match("^pv") == "pv" ||
				e.data.match("^message") == "message" ||
				e.data.match("^console: ") == "console: ") { return; }
			w.terminate();
			if (ui()) { ui().onThinking(false); }
			var str = e.data;
			if (!str || str.length < 4) { return; }
			var from = new Cell(str.substr(0, 2));
			var to = new Cell(str.substr(2, 2));
			hintIdxs = [from.index, to.index];
			updateHighlights();
			clearTimeout(hintTimer);
			hintTimer = setTimeout(function () {
				hintIdxs = [];
				updateHighlights();
			}, 3000);
		};
		w.postMessage("position " + GetFen());
		w.postMessage("search 700,60");
	}

	/* ================= relojes ================= */

	function startClock(minutes, incSeconds) {
		stopClock();
		chessClock.enabled = minutes > 0;
		if (!chessClock.enabled) {
			notifyClock();
			return;
		}
		chessClock.wMs = minutes * 60000;
		chessClock.bMs = minutes * 60000;
		chessClock.incMs = (incSeconds || 0) * 1000;
		chessClock.lowWarned = {};
		chessClock.lastTick = Date.now();
		chessClock.timer = setInterval(clockTick, 100);
		notifyClock();
	}

	function stopClock() {
		if (chessClock.timer) {
			clearInterval(chessClock.timer);
			chessClock.timer = null;
		}
	}

	function clockTick() {
		var now = Date.now();
		var dt = now - chessClock.lastTick;
		chessClock.lastTick = now;
		if (state.gameOver) { return; }

		if (whiteToMove()) { chessClock.wMs -= dt; }
		else { chessClock.bMs -= dt; }

		var activeMs = whiteToMove() ? chessClock.wMs : chessClock.bMs;
		var humanTurn = (state.mode === "2p") ||
			(state.mode === "ai" && whiteToMove() === state.playerWhite);
		if (humanTurn && activeMs > 0 && activeMs < 10500) {
			var sec = Math.ceil(activeMs / 1000);
			if (!chessClock.lowWarned[sec]) {
				chessClock.lowWarned[sec] = true;
				Sound.tick();
			}
		}

		if (chessClock.wMs <= 0) {
			chessClock.wMs = 0;
			notifyClock();
			endGame("black", "las blancas agotaron su tiempo");
			return;
		}
		if (chessClock.bMs <= 0) {
			chessClock.bMs = 0;
			notifyClock();
			endGame("white", "las negras agotaron su tiempo");
			return;
		}
		notifyClock();
	}

	function notifyClock() {
		if (ui()) {
			ui().onClock({
				enabled: chessClock.enabled,
				wMs: Math.max(0, chessClock.wMs),
				bMs: Math.max(0, chessClock.bMs),
				active: state.gameOver ? null : (whiteToMove() ? "w" : "b")
			});
		}
	}

	/* ================= interaccion raton ================= */

	function getRay(event) {
		var rect = renderer.domElement.getBoundingClientRect();
		var mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		var my = 1 - ((event.clientY - rect.top) / rect.height) * 2;
		return projector.pickingRay(new THREE.Vector3(mx, my, 0.5), camera);
	}

	function selectableColor() {
		if (state.gameOver || puzzle.transition) { return null; }
		if (puzzle.active || state.mode === "2p") {
			return whiteToMove() ? WHITE : BLACK;
		}
		if (state.mode === "ai") {
			if (state.thinking) { return null; }
			if (whiteToMove() !== state.playerWhite) { return null; }
			return state.playerWhite ? WHITE : BLACK;
		}
		return null;
	}

	function pickPiece(raycaster, color) {
		if (color === null) { return null; }
		var picked = null;
		for (var i in board3D) {
			if ({}.hasOwnProperty.call(board3D, i)) {
				var piece = board3D[i];
				if (!piece || piece.color !== color) { continue; }
				var intersect = raycaster.intersectObject(piece.children[0], true);
				if (intersect.length > 0) {
					if (picked === null || picked.distance > intersect[0].distance) {
						picked = intersect[0];
					}
				}
			}
		}
		return picked ? picked.object.parent : null;
	}

	function pickCell(raycaster) {
		var intersect = raycaster.intersectObject(chessBoard, true);
		if (intersect.length > 0 && intersect[0].object.name &&
			/^[a-h][1-8]$/.test(intersect[0].object.name)) {
			return intersect[0].object;
		}
		return null;
	}

	function movesForSelection(endCell) {
		// jugadas legales de la pieza seleccionada hacia endCell
		var start = new Cell(selectedPiece.cell);
		var startSquare = MakeSquare(start.y, start.x);
		var endSquare = MakeSquare(endCell.y, endCell.x);
		return validMoves.filter(function (m) {
			return (m & 0xFF) === startSquare && ((m >> 8) & 0xFF) === endSquare;
		});
	}

	function tryPlayerMove(cellMesh) {
		var endCell = new Cell(cellMesh.name);
		var candidates = movesForSelection(endCell);
		if (candidates.length === 0) { return false; }

		var promo = candidates.filter(function (m) { return m & moveflagPromotion; });
		if (promo.length > 0) {
			// eleccion de pieza de promocion via interfaz
			var start = new Cell(selectedPiece.cell);
			deselectPiece();
			if (ui()) {
				ui().promotionChoice(function (letter) {
					var flagMap = {
						q: moveflagPromoteQueen,
						r: moveflagPromoteRook,
						b: moveflagPromoteBishop,
						n: moveflagPromoteKnight
					};
					var wanted = GenerateMove(
						MakeSquare(start.y, start.x),
						MakeSquare(endCell.y, endCell.x),
						moveflagPromotion | flagMap[letter]
					);
					for (var i = 0; i < validMoves.length; i++) {
						if (validMoves[i] === wanted) {
							playHumanMove(validMoves[i]);
							return;
						}
					}
				});
			}
			return true;
		}

		playHumanMove(candidates[0]);
		return true;
	}

	function playHumanMove(move) {
		deselectPiece();
		if (puzzle.active) {
			puzzleMove(move);
		} else {
			commitMove(move);
		}
	}

	function deselectPiece() {
		if (selectedPiece !== null) {
			selectedPiece.children[0].material = selectedPiece.baseMaterial;
			selectedPiece = null;
			updateHighlights();
		}
	}

	function onMouseDown(event) {
		if (!initialized || cinematic || animating) { return; }
		if (event.target !== renderer.domElement) { return; }

		var raycaster = getRay(event);
		var color = selectableColor();
		var pickedPiece = pickPiece(raycaster, color);
		var pickedCell = pickCell(raycaster);

		if (selectedPiece !== null && pickedCell !== null) {
			if (tryPlayerMove(pickedCell)) { return; }
		}

		deselectPiece();
		if (pickedPiece !== null) {
			selectedPiece = pickedPiece;
			selectedPiece.baseMaterial = selectedPiece.children[0].material;
			selectedPiece.children[0].material = selectedMaterial[selectedPiece.color];
			updateHighlights();
		}
	}

	function onMouseMove(event) {
		if (!initialized || cinematic || animating) { return; }
		if (event.target !== renderer.domElement) { return; }
		var canvas = renderer.domElement;
		var raycaster = getRay(event);
		var color = selectableColor();
		var pickedPiece = pickPiece(raycaster, color);
		var cursor = "default";
		if (pickedPiece !== null) { cursor = "pointer"; }
		if (selectedPiece !== null) {
			var pickedCell = pickCell(raycaster);
			if (pickedCell !== null) {
				var endCell = new Cell(pickedCell.name);
				if (movesForSelection(endCell).length > 0) { cursor = "pointer"; }
			}
		}
		canvas.style.cursor = cursor;
	}

	/* ================= partidas ================= */

	function resetCommonState() {
		ensureAnalysisStopped();
		stopClock();
		animQueue = [];
		animating = false;
		g_allMoves = [];
		sanHistory = [];
		moveMeta = [];
		lastMoveIdxs = [];
		checkIdx = null;
		hintIdxs = [];
		selectedPiece = null;
		puzzle.active = false;
		puzzle.transition = false;
		if (puzzle.timer) { clearInterval(puzzle.timer); puzzle.timer = null; }
	}

	function newGame(opts) {
		resetCommonState();
		state.mode = opts.mode;
		state.level = (opts.level !== undefined) ? opts.level : state.level;
		state.playerWhite = (opts.playerWhite !== undefined) ? opts.playerWhite : true;
		state.gameOver = false;
		state.thinking = false;

		ResetGame();
		validMoves = GenerateValidMoves();
		syncBoard();
		cinematic = false;

		if (state.mode === "ai" && initBackgroundEngine()) {
			backgroundEngine.postMessage("go");
		}

		startClock(opts.minutes || 0, opts.increment || 0);
		cameraToSide(state.mode === "2p" ? true : state.playerWhite);
		Sound.start();

		if (ui()) {
			ui().onNewGameStarted({
				mode: state.mode,
				playerWhite: state.playerWhite,
				level: state.level,
				levelInfo: levels[state.level],
				clock: chessClock.enabled
			});
			ui().onTurn(whiteToMove());
			ui().onCapturedUpdate(capturedSummary());
		}

		// si el jugador lleva negras, la IA abre
		if (state.mode === "ai" && !state.playerWhite) {
			aiGo();
		}
	}

	function resign() {
		if (state.gameOver || puzzle.active) { return; }
		if (state.mode === "2p") {
			// se rinde el bando al que le toca mover
			var loserWhite = whiteToMove();
			endGame(loserWhite ? "black" : "white",
				loserWhite ? "las blancas se rinden" : "las negras se rinden");
		} else {
			endGame(state.playerWhite ? "black" : "white", "te has rendido");
		}
	}

	function canUndo() {
		return !puzzle.active && g_allMoves.length > 0 && !animating;
	}

	function undo() {
		if (puzzle.active || g_allMoves.length === 0 || animating) { return; }
		ensureAnalysisStopped();
		if (ui()) { ui().onThinking(false); }

		function undoOne() {
			UnmakeMove(g_allMoves.pop());
			sanHistory.pop();
			moveMeta.pop();
		}
		undoOne();
		// contra la IA deshacemos tambien su respuesta para volver a tu turno
		if (state.mode === "ai" &&
			(whiteToMove() !== state.playerWhite) && g_allMoves.length > 0) {
			undoOne();
		}

		state.gameOver = false;
		validMoves = GenerateValidMoves();
		updateCheckHighlight();
		if (g_allMoves.length > 0) {
			var last = g_allMoves[g_allMoves.length - 1];
			lastMoveIdxs = [
				new Cell(FormatSquare(last & 0xFF)).index,
				new Cell(FormatSquare((last >> 8) & 0xFF)).index
			];
		} else {
			lastMoveIdxs = [];
		}
		syncBoard();

		if (ui()) {
			ui().onHistoryRebuilt(sanHistory.slice());
			ui().onTurn(whiteToMove());
			ui().onCapturedUpdate(capturedSummary());
		}
	}

	function flipCamera() {
		var z = camera.position.z >= 0 ? -100 : 100;
		tweenCameraTo(0, 100, z, 0.9);
	}

	/* ================= PGN ================= */

	function getPGN() {
		var str = "";
		sanHistory.forEach(function (move, i) {
			if (i % 2 === 0) {
				if (move === "..") {
					str += ((i / 2) + 1) + "...";
				} else {
					str += ((i / 2) + 1) + ". " + move;
				}
			} else {
				str += " " + move + "\r\n";
			}
		});
		return str;
	}

	function loadPGNText(pgn) {
		var parsedPGN = parsePGN(pgn);
		var fen = parsedPGN.fen;
		var moves = parsedPGN.sequence;

		resetCommonState();
		state.mode = "ai";
		state.gameOver = false;

		if (fen !== null) {
			InitializeFromFen(fen);
			if (parsedPGN.startColor === BLACK) { sanHistory.push(".."); }
		} else {
			ResetGame();
		}

		function Piece(flag, promo) {
			this.flag = flag;
			this.promo = promo;
		}

		moves.forEach(function (move) {
			var i;
			var formatedMove;
			var vMoves = GenerateValidMoves();
			var pieces = {
				"P": new Piece(piecePawn, null),
				"N": new Piece(pieceKnight, moveflagPromoteKnight),
				"B": new Piece(pieceBishop, moveflagPromoteBishop),
				"R": new Piece(pieceRook, moveflagPromoteRook),
				"Q": new Piece(pieceQueen, moveflagPromoteQueen),
				"K": new Piece(pieceKing, null)
			};

			var piece = pieces[move.piece].flag;
			var color = (move.color === WHITE) ? 0x8 : 0x0;
			var startList = [];
			var pieceIdx = (color | piece) << 4;
			while (g_pieceList[pieceIdx] !== 0) {
				startList.push(new Cell(FormatSquare(g_pieceList[pieceIdx])));
				pieceIdx++;
			}

			var from = move.from;
			if (from !== undefined) {
				for (i = startList.length - 1; i >= 0; i--) {
					if (from.length === 1) {
						if (from.match(/[a-h]/) && startList[i].position.charAt(0) !== from) {
							startList.splice(i, 1);
						} else if (from.match(/[1-8]/) && startList[i].position.charAt(1) !== from) {
							startList.splice(i, 1);
						}
					} else if (from.length === 2) {
						if (startList[i].position !== from) {
							startList.splice(i, 1);
						}
					}
				}
			}

			var end = new Cell(move.to);
			var endSquare = MakeSquare(end.y, end.x);
			var promotion = (move.promotion) ? pieces[move.promotion.substr(1)].promo : undefined;

			function checkMove(start) {
				var startSquare = MakeSquare(start.y, start.x);
				if (promotion !== undefined) {
					if (vMoves[i] === GenerateMove(startSquare, endSquare, moveflagPromotion | promotion)) {
						formatedMove = vMoves[i];
					}
				} else {
					if ((vMoves[i] & 0xFF) == startSquare &&
						((vMoves[i] >> 8) & 0xFF) == endSquare) {
						formatedMove = vMoves[i];
					}
				}
			}

			for (i = 0; i < vMoves.length; i++) {
				startList.forEach(checkMove);
				if (formatedMove) { break; }
			}

			if (formatedMove) {
				// aplicar en silencio (sin animacion)
				validMoves = vMoves;
				var san = GetMoveSAN(formatedMove, vMoves);
				var capInfo = capturedByMove(formatedMove, move.color === WHITE);
				MakeMove(formatedMove);
				g_allMoves.push(formatedMove);
				sanHistory.push(san);
				moveMeta.push({ key: currentPositionKey(), halfmove: 0, captured: capInfo });
			} else {
				throw new Error("PGN no válido: " + JSON.stringify(move));
			}
		});

		state.playerWhite = whiteToMove();
		validMoves = GenerateValidMoves();
		updateCheckHighlight();
		syncBoard();
		cinematic = false;
		cameraToSide(state.playerWhite);

		ensureAnalysisStopped();
		if (initBackgroundEngine()) {
			backgroundEngine.postMessage("position " + GetFen());
		}

		if (ui()) {
			ui().onNewGameStarted({
				mode: "ai",
				playerWhite: state.playerWhite,
				level: state.level,
				levelInfo: levels[state.level],
				clock: false,
				loaded: true
			});
			ui().onHistoryRebuilt(sanHistory.slice());
			ui().onTurn(whiteToMove());
			ui().onCapturedUpdate(capturedSummary());
		}
		return true;
	}

	/* ================= rafaga de mates ================= */

	function shuffled(list) {
		var a = list.slice();
		for (var i = a.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var tmp = a[i];
			a[i] = a[j];
			a[j] = tmp;
		}
		return a;
	}

	function startPuzzleRush() {
		resetCommonState();
		state.mode = "puzzle";
		state.gameOver = false;
		cinematic = false;

		puzzle.active = true;
		puzzle.list = shuffled(PUZZLES_MATE1);
		puzzle.idx = -1;
		puzzle.score = 0;
		puzzle.strikes = 3;
		puzzle.endTime = Date.now() + 180000; // 3 minutos
		puzzle.timer = setInterval(puzzleTick, 200);

		Sound.start();
		nextPuzzle(true);
	}

	function puzzleTick() {
		var left = puzzle.endTime - Date.now();
		if (left <= 0) {
			endPuzzleRush();
			return;
		}
		if (ui()) { ui().onPuzzleTick(left); }
	}

	function nextPuzzle(instantCamera) {
		puzzle.idx++;
		if (puzzle.idx >= puzzle.list.length) {
			puzzle.list = shuffled(puzzle.list);
			puzzle.idx = 0;
		}
		var p = puzzle.list[puzzle.idx];
		ResetGame();
		var err = InitializeFromFen(p.fen);
		if (err && err.length) {
			// puzzle defectuoso (no deberia ocurrir: estan validados)
			nextPuzzle(instantCamera);
			return;
		}
		g_allMoves = [];
		sanHistory = [];
		moveMeta = [];
		lastMoveIdxs = [];
		checkIdx = null;
		state.playerWhite = whiteToMove();
		validMoves = GenerateValidMoves();
		syncBoard();
		puzzle.transition = false;
		cameraToSide(state.playerWhite, instantCamera);
		if (ui()) {
			ui().onPuzzleUpdate({
				score: puzzle.score,
				strikes: puzzle.strikes,
				white: state.playerWhite
			});
		}
	}

	function puzzleMove(move) {
		var san = GetMoveSAN(move, validMoves);
		var isCapture = san.indexOf("x") !== -1 || !!(move & moveflagEPC);
		MakeMove(move);
		validMoves = GenerateValidMoves();
		updateCheckHighlight();
		var mate = (validMoves.length === 0) && g_inCheck;

		puzzle.transition = true;
		animQueue.push({
			move: move,
			capture: isCapture,
			castle: false,
			check: g_inCheck,
			after: function () {
				if (mate) {
					puzzle.score++;
					Sound.puzzleOk();
					if (ui()) {
						ui().onPuzzleSolved(puzzle.score);
					}
					setTimeout(function () {
						if (puzzle.active) { nextPuzzle(false); }
					}, 700);
				} else {
					puzzle.strikes--;
					Sound.puzzleFail();
					UnmakeMove(move);
					validMoves = GenerateValidMoves();
					updateCheckHighlight();
					lastMoveIdxs = [];
					if (ui()) {
						ui().onPuzzleFailed(puzzle.strikes, puzzle.list[puzzle.idx].san);
					}
					if (puzzle.strikes <= 0) {
						setTimeout(endPuzzleRush, 600);
					} else {
						setTimeout(function () {
							if (puzzle.active) {
								syncBoard();
								puzzle.transition = false;
							}
						}, 500);
					}
				}
			}
		});
		processAnimQueue();
	}

	function endPuzzleRush() {
		if (!puzzle.active) { return; }
		puzzle.active = false;
		clearInterval(puzzle.timer);
		puzzle.timer = null;
		state.gameOver = true;

		var best = 0;
		try {
			best = parseInt(localStorage.getItem("chess3d.bestRush") || "0", 10);
		} catch (e) {}
		var newRecord = puzzle.score > best;
		if (newRecord) {
			best = puzzle.score;
			try { localStorage.setItem("chess3d.bestRush", String(best)); } catch (e) {}
		}
		if (newRecord && puzzle.score > 0) { Sound.win(); } else { Sound.draw(); }
		if (ui()) {
			ui().onPuzzleEnd({
				score: puzzle.score,
				best: best,
				newRecord: newRecord
			});
		}
	}

	/* ================= menu / ciclo de vida ================= */

	function toMenu() {
		resetCommonState();
		state.mode = null;
		state.gameOver = true;
		cinematic = true;
		// posicion inicial de fondo
		ResetGame();
		validMoves = GenerateValidMoves();
		lastMoveIdxs = [];
		checkIdx = null;
		syncBoard();
	}

	function onLoaded() {
		init();
		if (ui()) { ui().onReady(); }
	}

	window.onLoaded = onLoaded;

	/* ================= API publica ================= */

	return {
		state: state,
		levels: levels,
		newGame: newGame,
		startPuzzleRush: startPuzzleRush,
		toMenu: toMenu,
		resign: resign,
		undo: undo,
		canUndo: canUndo,
		requestHint: requestHint,
		flipCamera: flipCamera,
		getPGN: getPGN,
		loadPGNText: loadPGNText,
		getFen: function () { return GetFen(); },
		isAnimating: function () { return animating; },
		// para depuracion y pruebas automatizadas
		debugMove: function (str) {
			var mv = GetMoveFromString(str);
			if (mv !== undefined) {
				if (puzzle.active) { puzzleMove(mv); }
				else { commitMove(mv); }
				return true;
			}
			return false;
		},
		debugValidMoves: function () {
			return validMoves.map(function (m) { return FormatMove(m); });
		}
	};
})();

window.Game = Game;
