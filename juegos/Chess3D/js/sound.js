// Sonidos sintetizados con WebAudio (sin ficheros de audio).
// API global: Sound.move(), Sound.capture(), Sound.check(), etc.
// Sound.toggle() activa/desactiva y persiste la preferencia.
"use strict";
var Sound = (function () {

	var ctx = null;
	var enabled = true;
	try {
		enabled = localStorage.getItem("chess3d.sound") !== "off";
	} catch (e) {}

	function getCtx() {
		if (!ctx) {
			var AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) { return null; }
			ctx = new AC();
		}
		if (ctx.state === "suspended") { ctx.resume(); }
		return ctx;
	}

	// tono simple con envolvente
	function tone(freq, dur, opts) {
		if (!enabled) { return; }
		var c = getCtx();
		if (!c) { return; }
		opts = opts || {};
		var t0 = c.currentTime + (opts.delay || 0);
		var osc = c.createOscillator();
		var gain = c.createGain();
		osc.type = opts.type || "sine";
		osc.frequency.setValueAtTime(freq, t0);
		if (opts.slideTo) {
			osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
		}
		var vol = (opts.vol !== undefined) ? opts.vol : 0.25;
		gain.gain.setValueAtTime(0.0001, t0);
		gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		osc.connect(gain);
		gain.connect(c.destination);
		osc.start(t0);
		osc.stop(t0 + dur + 0.05);
	}

	// golpe de ruido filtrado (contacto de madera)
	function thump(cutoff, dur, vol, delay) {
		if (!enabled) { return; }
		var c = getCtx();
		if (!c) { return; }
		var t0 = c.currentTime + (delay || 0);
		var len = Math.max(1, Math.floor(c.sampleRate * dur));
		var buffer = c.createBuffer(1, len, c.sampleRate);
		var data = buffer.getChannelData(0);
		for (var i = 0; i < len; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
		}
		var src = c.createBufferSource();
		src.buffer = buffer;
		var filter = c.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = cutoff;
		var gain = c.createGain();
		gain.gain.value = vol;
		src.connect(filter);
		filter.connect(gain);
		gain.connect(c.destination);
		src.start(t0);
	}

	var api = {
		isEnabled: function () { return enabled; },
		setEnabled: function (on) {
			enabled = !!on;
			try {
				localStorage.setItem("chess3d.sound", enabled ? "on" : "off");
			} catch (e) {}
		},
		toggle: function () {
			api.setEnabled(!enabled);
			return enabled;
		},
		// el contexto de audio solo puede crearse tras un gesto del usuario
		unlock: function () { getCtx(); },

		click: function () { tone(650, 0.05, { type: "triangle", vol: 0.08 }); },
		move: function () {
			thump(900, 0.09, 0.5);
			tone(190, 0.07, { type: "sine", vol: 0.12, slideTo: 120 });
		},
		capture: function () {
			thump(500, 0.14, 0.7);
			tone(120, 0.12, { type: "sine", vol: 0.2, slideTo: 70 });
		},
		castle: function () {
			thump(900, 0.08, 0.4);
			thump(700, 0.1, 0.5, 0.09);
		},
		promote: function () {
			tone(523, 0.09, { type: "triangle", vol: 0.18 });
			tone(784, 0.12, { type: "triangle", vol: 0.18, delay: 0.09 });
			tone(1047, 0.2, { type: "triangle", vol: 0.18, delay: 0.19 });
		},
		check: function () {
			tone(880, 0.09, { type: "square", vol: 0.09 });
			tone(1100, 0.14, { type: "square", vol: 0.09, delay: 0.1 });
		},
		start: function () {
			tone(392, 0.1, { type: "triangle", vol: 0.15 });
			tone(523, 0.1, { type: "triangle", vol: 0.15, delay: 0.1 });
			tone(659, 0.18, { type: "triangle", vol: 0.15, delay: 0.2 });
		},
		win: function () {
			[523, 659, 784, 1047].forEach(function (f, i) {
				tone(f, 0.16, { type: "triangle", vol: 0.2, delay: i * 0.13 });
			});
		},
		lose: function () {
			[392, 330, 262, 196].forEach(function (f, i) {
				tone(f, 0.2, { type: "sine", vol: 0.2, delay: i * 0.15 });
			});
		},
		draw: function () {
			tone(440, 0.15, { type: "sine", vol: 0.15 });
			tone(440, 0.2, { type: "sine", vol: 0.12, delay: 0.2 });
		},
		tick: function () { tone(1000, 0.03, { type: "square", vol: 0.05 }); },
		puzzleOk: function () {
			tone(660, 0.08, { type: "triangle", vol: 0.18 });
			tone(990, 0.14, { type: "triangle", vol: 0.18, delay: 0.08 });
		},
		puzzleFail: function () {
			tone(180, 0.22, { type: "sawtooth", vol: 0.12, slideTo: 120 });
		}
	};

	window.Sound = api;
	return api;
})();
