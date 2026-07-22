// Cargador de recursos (modelos JSON y texturas) sin jQuery.
// Rellena los diccionarios globales `geometries` y `textures`
// y llama a window.onLoaded() cuando todo esta listo.
/* global THREE, onLoaded */
"use strict";

var geometries = {};
var textures = {};

(function () {

	var tips = [
		"Puliendo las fibras de madera",
		"Alistando a los peones",
		"Coronando al rey",
		"Nombrando caballeros",
		"Encerando el tablero",
		"Pidiendo consejo a Deep Blue",
		"Intimidando al rival",
		"Aprendiendo la defensa siciliana",
		"Contando 64 casillas... dos veces",
		"Afilando los alfiles",
		"Enseñando a saltar al caballo",
		"Despertando a la dama",
		"Colocando las piezas con guante blanco"
	];

	var tipTimer = null;

	function rotateTip() {
		var el = document.getElementById("loading-tip");
		if (!el) { return; }
		var t = tips[Math.floor(Math.random() * tips.length)];
		el.textContent = t + "…";
		tipTimer = setTimeout(rotateTip, 2600);
	}

	function setProgress(p) {
		var fill = document.getElementById("loading-fill");
		var label = document.getElementById("loading-percent");
		var pct = Math.round(p * 100);
		if (fill) { fill.style.width = pct + "%"; }
		if (label) { label.textContent = pct + "%"; }
	}

	function removeLoader() {
		clearTimeout(tipTimer);
		var el = document.getElementById("loading");
		if (el) {
			el.classList.add("hidden");
			setTimeout(function () {
				if (el.parentNode) { el.parentNode.removeChild(el); }
			}, 700);
		}
	}

	function loadResources() {
		var loaded = 0;
		var failed = [];
		var resources = [
			"3D/json/knight.json",
			"3D/json/king.json",
			"3D/json/queen.json",
			"3D/json/bishop.json",
			"3D/json/rook.json",
			"3D/json/pawn.json",
			"3D/json/board.json",
			"3D/json/innerBoard.json",
			"texture/wood-0.jpg",
			"texture/wood-1.jpg",
			"texture/wood_N.jpg",
			"texture/wood_S.jpg",
			"texture/knight-ao.jpg",
			"texture/rook-ao.jpg",
			"texture/king-ao.jpg",
			"texture/bishop-ao.jpg",
			"texture/queen-ao.jpg",
			"texture/pawn-ao.jpg",
			"texture/floor.jpg",
			"texture/floor_N.jpg",
			"texture/floor_S.jpg",
			"texture/fakeShadow.jpg"
		];

		function checkLoad() {
			setProgress(loaded / resources.length);
			if (loaded === resources.length) {
				if (failed.length) {
					var el = document.getElementById("loading-tip");
					if (el) {
						el.textContent = "Error cargando: " + failed.join(", ") +
							" — ¿estás abriendo el juego con un servidor local? Usa Jugar.bat";
						el.style.color = "#ff6666";
					}
					return;
				}
				setTimeout(function () {
					removeLoader();
					window.onLoaded();
				}, 150);
			}
		}

		function loadJSON(url) {
			var loader = new THREE.JSONLoader();
			loader.load(url, function (geometry) {
				geometries[url] = geometry;
				loaded++;
				checkLoad();
			});
		}

		function loadImage(url) {
			THREE.ImageUtils.loadTexture(
				url,
				new THREE.UVMapping(),
				function (texture) {
					textures[url] = texture;
					loaded++;
					checkLoad();
				},
				function () {
					failed.push(url);
					loaded++;
					checkLoad();
				}
			);
		}

		resources.forEach(function (url) {
			if (url.slice(-5) === ".json") {
				loadJSON(url);
			} else {
				loadImage(url);
			}
		});
	}

	window.addEventListener("load", function () {
		setProgress(0);
		rotateTip();
		loadResources();
	});

	window.removeLoader = removeLoader;
})();
