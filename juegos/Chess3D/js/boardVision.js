// boardVision.js
// Analiza una imagen cualquiera de un tablero de ajedrez (PNG, JPG, JPEG,
// WEBP, GIF...) y trata de reconstruir la posicion de las piezas.
//
// Todo el procesado ocurre en el navegador con <canvas>, sin subir la imagen
// a ningun sitio. El resultado es una mejor estimacion: por eso la interfaz
// muestra despues un editor para que el usuario corrija cualquier casilla
// antes de cargar la partida.
//
// Estrategia:
//   1. Recortar los margenes lisos y quedarnos con el cuadrado del tablero.
//   2. Dividirlo en 8x8 casillas.
//   3. Por casilla: estimar el color del fondo (anillo exterior), decidir si
//      esta ocupada, de que color es la pieza y, por la silueta, que pieza es.
//   4. El tipo de pieza se decide comparando la silueta detectada con las
//      siluetas de las piezas Unicode (peon, caballo, alfil, torre, dama, rey).
/* global document, Image, Uint8Array, Promise */
"use strict";

var BoardVision = (function () {

	var GRID = 24;          // resolucion de la silueta normalizada
	var COLOR_TOL = 52;     // distancia RGB para separar pieza de fondo
	var templates = null;   // siluetas de referencia por tipo de pieza

	/* ============ utilidades de mascara ============ */

	function luminance(r, g, b) {
		return 0.299 * r + 0.587 * g + 0.114 * b;
	}

	function colorDist(r1, g1, b1, r2, g2, b2) {
		var dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
		return Math.sqrt(dr * dr + dg * dg + db * db);
	}

	function median(arr) {
		if (arr.length === 0) { return 0; }
		var a = arr.slice().sort(function (x, y) { return x - y; });
		return a[Math.floor(a.length / 2)];
	}

	// Recorta la mascara a su caja, la reescala manteniendo la proporcion y la
	// centra en una rejilla fija GRID x GRID para poder comparar siluetas.
	function normalizeMask(mask, w, h) {
		var minx = w, miny = h, maxx = -1, maxy = -1;
		var x, y;
		for (y = 0; y < h; y++) {
			for (x = 0; x < w; x++) {
				if (mask[y * w + x]) {
					if (x < minx) { minx = x; }
					if (x > maxx) { maxx = x; }
					if (y < miny) { miny = y; }
					if (y > maxy) { maxy = y; }
				}
			}
		}
		var out = new Uint8Array(GRID * GRID);
		if (maxx < 0) { return out; }

		var bw = maxx - minx + 1;
		var bh = maxy - miny + 1;
		var scale = Math.min(GRID / bw, GRID / bh);
		var dw = Math.max(1, Math.round(bw * scale));
		var dh = Math.max(1, Math.round(bh * scale));
		var offx = Math.floor((GRID - dw) / 2);
		var offy = Math.floor((GRID - dh) / 2);

		for (var oy = 0; oy < dh; oy++) {
			var sy = miny + Math.floor((oy + 0.5) / dh * bh);
			for (var ox = 0; ox < dw; ox++) {
				var sx = minx + Math.floor((ox + 0.5) / dw * bw);
				if (mask[sy * w + sx]) {
					out[(offy + oy) * GRID + (offx + ox)] = 1;
				}
			}
		}
		return out;
	}

	// Espejo horizontal de una mascara GRID x GRID.
	function hmirror(m) {
		var o = new Uint8Array(m.length);
		for (var y = 0; y < GRID; y++) {
			for (var x = 0; x < GRID; x++) {
				o[y * GRID + (GRID - 1 - x)] = m[y * GRID + x];
			}
		}
		return o;
	}

	// Coeficiente de Dice entre dos mascaras del mismo tamano.
	function dice(a, b) {
		var inter = 0, sa = 0, sb = 0;
		for (var i = 0; i < a.length; i++) {
			if (a[i]) { sa++; }
			if (b[i]) { sb++; }
			if (a[i] && b[i]) { inter++; }
		}
		if (sa + sb === 0) { return 0; }
		return (2 * inter) / (sa + sb);
	}

	/* ============ plantillas de piezas ============ */

	function buildTemplates() {
		if (templates) { return templates; }
		templates = {};
		var glyphs = {
			p: "♟", // peon
			n: "♞", // caballo
			b: "♝", // alfil
			r: "♜", // torre
			q: "♛", // dama
			k: "♚"  // rey
		};
		var S = 90;
		var c = document.createElement("canvas");
		c.width = S;
		c.height = S;
		var ctx = c.getContext("2d");
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = Math.floor(S * 0.82) + "px 'Segoe UI Symbol','DejaVu Sans','Arial Unicode MS',serif";

		Object.keys(glyphs).forEach(function (key) {
			ctx.clearRect(0, 0, S, S);
			ctx.fillStyle = "#000";
			ctx.fillText(glyphs[key], S / 2, S / 2 + S * 0.02);
			var data = ctx.getImageData(0, 0, S, S).data;
			var mask = new Uint8Array(S * S);
			for (var i = 0; i < S * S; i++) {
				mask[i] = data[i * 4 + 3] > 40 ? 1 : 0;
			}
			templates[key] = normalizeMask(mask, S, S);
		});
		return templates;
	}

	/* ============ carga de la imagen ============ */

	function loadImage(src) {
		return new Promise(function (resolve, reject) {
			var img = new Image();
			img.onload = function () { resolve(img); };
			img.onerror = function () { reject(new Error("No se pudo leer la imagen")); };
			img.src = src;
		});
	}

	/* ============ deteccion del tablero ============ */

	// Varianza de luminancia a lo largo de una fila (o columna). Los margenes
	// lisos tienen varianza casi nula; el tablero (casillas alternas + piezas)
	// tiene varianza alta.
	function lineVariance(data, W, H, index, isRow) {
		var n = isRow ? W : H;
		var step = 8; // muestreo para ir rapido
		var sum = 0, sum2 = 0, count = 0;
		for (var k = 0; k < n; k += step) {
			var x = isRow ? k : index;
			var y = isRow ? index : k;
			var o = (y * W + x) * 4;
			var l = luminance(data[o], data[o + 1], data[o + 2]);
			sum += l;
			sum2 += l * l;
			count++;
		}
		if (count === 0) { return 0; }
		var mean = sum / count;
		return (sum2 / count) - (mean * mean);
	}

	function detectBoard(data, W, H) {
		var UNIFORM = 150; // varianza por debajo de la cual la linea es "lisa"
		var x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
		var limitY = Math.floor(H * 0.35);
		var limitX = Math.floor(W * 0.35);

		while (y0 < limitY && lineVariance(data, W, H, y0, true) < UNIFORM) { y0++; }
		while (y1 > H - 1 - limitY && lineVariance(data, W, H, y1, true) < UNIFORM) { y1--; }
		while (x0 < limitX && lineVariance(data, W, H, x0, false) < UNIFORM) { x0++; }
		while (x1 > W - 1 - limitX && lineVariance(data, W, H, x1, false) < UNIFORM) { x1--; }

		var bw = x1 - x0 + 1;
		var bh = y1 - y0 + 1;
		if (bw < 16 || bh < 16) {
			// recorte degenerado: usar la imagen entera
			x0 = 0; y0 = 0; bw = W; bh = H;
		}

		// El tablero es cuadrado: quedarnos con el cuadrado centrado.
		var side = Math.min(bw, bh);
		var ox = x0 + Math.floor((bw - side) / 2);
		var oy = y0 + Math.floor((bh - side) / 2);
		return { x: ox, y: oy, side: side };
	}

	// Rellena los huecos de una mascara binaria: todo pixel de fondo (0) que
	// no este conectado con el borde de la region esta "encerrado" por el
	// primer plano, asi que pasa a formar parte de el. Convierte un contorno
	// cerrado en una silueta solida.
	function fillHoles(mask, w, h) {
		var outside = new Uint8Array(w * h);
		var stack = [];
		var i, x, y;
		// sembrar desde todos los pixeles de fondo del borde
		for (x = 0; x < w; x++) {
			if (!mask[x]) { stack.push(x); }
			var b = (h - 1) * w + x;
			if (!mask[b]) { stack.push(b); }
		}
		for (y = 0; y < h; y++) {
			if (!mask[y * w]) { stack.push(y * w); }
			var rr = y * w + (w - 1);
			if (!mask[rr]) { stack.push(rr); }
		}
		while (stack.length) {
			var p = stack.pop();
			if (outside[p]) { continue; }
			outside[p] = 1;
			var cx = p % w, cy = (p - cx) / w;
			if (cx > 0 && !mask[p - 1] && !outside[p - 1]) { stack.push(p - 1); }
			if (cx < w - 1 && !mask[p + 1] && !outside[p + 1]) { stack.push(p + 1); }
			if (cy > 0 && !mask[p - w] && !outside[p - w]) { stack.push(p - w); }
			if (cy < h - 1 && !mask[p + w] && !outside[p + w]) { stack.push(p + w); }
		}
		for (i = 0; i < mask.length; i++) {
			if (!mask[i] && !outside[i]) { mask[i] = 1; }
		}
	}

	/* ============ clasificacion de una casilla ============ */

	function classifyCell(data, W, H, cellX, cellY, cell) {
		var ringR = [], ringG = [], ringB = [];
		var x, y;

		var x0 = Math.round(cellX);
		var y0 = Math.round(cellY);
		var cs = Math.round(cell);

		// Region de silueta: 10%..90% de la casilla (evita las lineas de rejilla).
		var mLo = Math.round(cs * 0.10);
		var mHi = Math.round(cs * 0.90);
		var maskW = mHi - mLo;
		var maskH = mHi - mLo;
		var mask = new Uint8Array(maskW * maskH);
		var lumArr = new Float32Array(maskW * maskH); // luminancia por pixel

		// 1) color de fondo = mediana del anillo exterior (pieza suele ir centrada)
		for (y = mLo; y < mHi; y++) {
			for (x = mLo; x < mHi; x++) {
				var fx = (x - mLo) / cs; // 0..0.8 aprox
				var fy = (y - mLo) / cs;
				var edge = fx < 0.12 || fx > 0.68 || fy < 0.12 || fy > 0.68;
				if (!edge) { continue; }
				var ry = y0 + y, rx = x0 + x;
				if (rx < 0 || ry < 0 || rx >= W || ry >= H) { continue; }
				var o = (ry * W + rx) * 4;
				ringR.push(data[o]);
				ringG.push(data[o + 1]);
				ringB.push(data[o + 2]);
			}
		}
		var bgR = median(ringR), bgG = median(ringG), bgB = median(ringB);

		// 2) mascara del primer plano (pixeles que difieren del fondo)
		for (y = 0; y < maskH; y++) {
			for (x = 0; x < maskW; x++) {
				var px = x0 + mLo + x;
				var py = y0 + mLo + y;
				var idx = y * maskW + x;
				if (px < 0 || py < 0 || px >= W || py >= H) { continue; }
				var oo = (py * W + px) * 4;
				var r = data[oo], g = data[oo + 1], b = data[oo + 2];
				lumArr[idx] = luminance(r, g, b);
				if (colorDist(r, g, b, bgR, bgG, bgB) > COLOR_TOL) {
					mask[idx] = 1;
				}
			}
		}

		// Rellenar el interior: si una pieza clara sobre casilla clara (o
		// oscura sobre oscura) solo deja ver su contorno, el hueco encerrado
		// se convierte en primer plano para recuperar la silueta solida.
		fillHoles(mask, maskW, maskH);

		// 3) estadisticas del primer plano (ya relleno)
		var fgBright = 0, fgDark = 0, fgCount = 0;
		var innerLum = [];
		for (var i = 0; i < mask.length; i++) {
			if (mask[i]) {
				fgCount++;
				var l = lumArr[i];
				innerLum.push(l);
				if (l > 150) { fgBright++; }
				else if (l < 105) { fgDark++; }
			}
		}

		var frac = mask.length > 0 ? fgCount / mask.length : 0;
		if (frac < 0.05) {
			return null; // casilla vacia
		}

		// 4) color de la pieza: el cuerpo (mediana de luminancia del primer
		//    plano) decide. Las piezas blancas tienen relleno claro; las
		//    negras, relleno oscuro. Como respaldo, el recuento de pixeles
		//    muy claros/oscuros.
		var medLum = median(innerLum);
		var isWhite;
		if (medLum > 150) { isWhite = true; }
		else if (medLum < 100) { isWhite = false; }
		else { isWhite = fgBright >= fgDark; }

		// 5) tipo de pieza por comparacion de siluetas. El caballo puede mirar
		//    a cualquier lado, asi que se compara tambien con la silueta espejo.
		var norm = normalizeMask(mask, maskW, maskH);
		var mirror = hmirror(norm);
		var tpl = buildTemplates();
		var bestType = "p", bestScore = -1;
		Object.keys(tpl).forEach(function (t) {
			var s = Math.max(dice(norm, tpl[t]), dice(mirror, tpl[t]));
			if (s > bestScore) { bestScore = s; bestType = t; }
		});

		return isWhite ? bestType.toUpperCase() : bestType;
	}

	/* ============ API publica ============ */

	// analyze(dataUrl) -> Promise<{ board: (char|null)[8][8] }>
	// board[0] es la fila superior de la imagen.
	function analyze(dataUrl) {
		return loadImage(dataUrl).then(function (img) {
			var maxSide = 720;
			var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
			var W = Math.max(1, Math.round(img.width * scale));
			var H = Math.max(1, Math.round(img.height * scale));

			var canvas = document.createElement("canvas");
			canvas.width = W;
			canvas.height = H;
			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, W, H);
			var data = ctx.getImageData(0, 0, W, H).data;

			var box = detectBoard(data, W, H);
			var cell = box.side / 8;

			var board = [];
			for (var r = 0; r < 8; r++) {
				var row = [];
				for (var c = 0; c < 8; c++) {
					row.push(classifyCell(data, W, H, box.x + c * cell, box.y + r * cell, cell));
				}
				board.push(row);
			}
			return { board: board };
		});
	}

	return { analyze: analyze };
})();
