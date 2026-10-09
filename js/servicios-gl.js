// ============================================================
// SECCIÓN SERVICIOS — fondo WebGL
// Metabolas de "cristal líquido" calculadas por raymarching en un
// fragment shader: 3D de verdad (normales, fresnel, reflejos de un
// estudio fotográfico) sin ninguna librería. Siguen al puntero, se
// tiñen con el acento de la tarjeta que señalas y se separan con un
// pulso elástico al hacer clic en el titular.
//
// Cuidados:
// - Solo se compila la primera vez que la sección se ve.
// - Resolución reducida y adaptativa (baja sola si van lentos los fps).
// - Se para fuera de pantalla, con el visor abierto y en pestañas
//   ocultas; con prefers-reduced-motion pinta un único fotograma.
// - Si se pierde el contexto se recupera; sin WebGL queda el
//   degradado CSS del lienzo y no pasa nada más.
// Escucha sv:acento, sv:visor y sv:tema (los lanza js/servicios.js).
// ============================================================
(() => {
    'use strict';
    const section = document.getElementById('servicios');
    const canvas = section && section.querySelector('.sv-gl');
    const hero = section && section.querySelector('.sv-hero');
    const wrap = section && section.querySelector('.sv-wrap');
    if (!canvas || !hero || !wrap) return;

    const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
    const tactil = matchMedia('(pointer: coarse)').matches;
    const PASOS = tactil ? 36 : 56;

    const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define PASOS ${PASOS}
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uAcc;
uniform float uPulse;
uniform float uLight;
uniform vec3 uView;

float smin(float a, float b, float k) {
    float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
    return mix(b, a, h) - k * h * (1. - h);
}

float map(vec3 p) {
    float t = uTime;
    float s = 1. + uPulse * .55;
    vec3 a = vec3(sin(t * .53) * .42, cos(t * .71) * .26, sin(t * .37) * .22);
    vec3 b = vec3(cos(t * .61 + 1.3) * .78, sin(t * .47 + .4) * .5, cos(t * .59) * .3) * s;
    vec3 c = vec3(sin(t * .83 + 2.1) * .55, cos(t * .67 + 2.7) * .66, sin(t * .41 + 1.) * .3) * s;
    vec3 e = vec3(cos(t * .45 + 3.3) * .9, sin(t * .9 + 1.7) * .32, -.2) * s;
    float d = length(p - a) - .55;
    d = smin(d, length(p - b) - .34, .45);
    d = smin(d, length(p - c) - .3, .45);
    d = smin(d, length(p - e) - .25, .45);
    d = smin(d, length(p - vec3(uMouse, .3)) - .24, .5);
    return d;
}

vec3 normal(vec3 p) {
    const vec2 k = vec2(1., -1.);
    const float h = .002;
    return normalize(k.xyy * map(p + k.xyy * h) + k.yyx * map(p + k.yyx * h) +
                     k.yxy * map(p + k.yxy * h) + k.xxx * map(p + k.xxx * h));
}

// Estudio: dos ventanas de luz, cielo teñido del acento y suelo oscuro
vec3 entorno(vec3 r) {
    float y = r.y * .5 + .5;
    vec3 col = mix(vec3(.015, .015, .03), uAcc * .28, smoothstep(.2, 1., y));
    col += smoothstep(.86, .99, dot(r, normalize(vec3(-.55, .65, .55)))) * vec3(1.2);
    col += smoothstep(.9, .995, dot(r, normalize(vec3(.75, .15, .6)))) * mix(uAcc, vec3(1.), .5) * .9;
    col += smoothstep(.6, 1., -r.y) * uAcc * .18;
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
    uv = (uv - uView.xy) / uView.z;
    vec3 ro = vec3(0., 0., 3.2);
    vec3 rd = normalize(vec3(uv, -1.9));
    float t = 0.;
    float d = 1.;
    float md = 9.;
    for (int i = 0; i < PASOS; i++) {
        d = map(ro + rd * t);
        md = min(md, d);
        if (d < .0015 * t || t > 6.) break;
        t += d * .9;
    }
    float halo = exp(-md * 7.) * .5 * (1. - uLight * .4);
    // Umbral generoso: los rayos rasantes que agotan los pasos pegados a la
    // superficie cuentan como impacto (si no, el borde sale punteado)
    if (d < .03) {
        vec3 p = ro + rd * t;
        vec3 n = normal(p);
        vec3 r = reflect(rd, n);
        float fr = pow(1. - max(dot(n, -rd), 0.), 3.);
        vec3 l = normalize(vec3(-.55, .7, .6));
        float dif = max(dot(n, l), 0.);
        float sp = pow(max(dot(r, l), 0.), 60.);
        vec3 irid = .5 + .5 * cos(6.2831 * (vec3(0., .33, .67) + dot(n, rd) * .55 + uTime * .04));
        float borde = smoothstep(.2, 1., fr);
        vec3 cristal = uAcc * (.1 + .42 * dif) + entorno(r) * (.22 + .9 * fr) + irid * fr * .32 + sp * 1.5 + uAcc * borde * .35;
        vec3 arcilla = mix(vec3(.96, .94, .9), uAcc, .55) * (.45 + .6 * dif) + uAcc * fr * .45 + sp * .6 + entorno(r) * .06;
        vec3 col = mix(cristal, arcilla, uLight);
        col = col / (1. + col * .85);
        col = pow(col, vec3(.4545));
        gl_FragColor = vec4(col, 1.);
    } else {
        gl_FragColor = vec4(pow(uAcc, vec3(.4545)) * halo, halo);
    }
}`;

    let gl = null;
    let U = {};
    let listo = false, perdido = false, visible = false, visorAbierto = false;
    let raf = 0, prev = 0, tiempo = 8;
    // Fracción de la resolución real: más alta en pantallas de densidad 1, donde se notan los dientes
    let escala = tactil ? .5 : ((window.devicePixelRatio || 1) >= 1.5 ? .55 : .8);
    let vista = [.4, .06, .46];
    let medias = [], ultimoAjuste = 0;

    const hexARgbLineal = hex => {
        const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
        const n = m ? parseInt(m[1], 16) : 0x7c6cff;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.pow(c / 255, 2.2));
    };
    const acento = hexARgbLineal('#7c6cff');
    let acentoObjetivo = acento.slice();
    let luz = section.dataset.svTema === 'claro' ? 1 : 0;
    let luzObjetivo = luz;
    const raton = { x: .6, y: .2, tx: .6, ty: .2, ultimo: -1e9 };
    let pulso = 0, pulsoVel = 0;

    function compilar() {
        const opciones = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
        gl = canvas.getContext('webgl', opciones) || canvas.getContext('experimental-webgl', opciones);
        if (!gl) return false;
        const shader = (tipo, fuente) => {
            const s = gl.createShader(tipo);
            gl.shaderSource(s, fuente);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
                console.warn('[servicios-gl]', gl.getShaderInfoLog(s));
                return null;
            }
            return s;
        };
        const vs = shader(gl.VERTEX_SHADER, VERT);
        const fs = shader(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return false;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.bindAttribLocation(prog, 0, 'p');
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) return false;
        gl.useProgram(prog);
        // Un triángulo que cubre toda la pantalla
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        U = {};
        ['uRes', 'uTime', 'uMouse', 'uAcc', 'uPulse', 'uLight', 'uView'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
        return true;
    }

    function medir() {
        if (!gl) return;
        const alto = Math.round(hero.offsetTop + hero.offsetHeight + 90);
        canvas.style.setProperty('--sv-gl-h', alto + 'px');
        const ancho = canvas.clientWidth || wrap.clientWidth;
        if (!ancho || !alto) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(ancho * dpr * escala));
        canvas.height = Math.max(1, Math.round(alto * dpr * escala));
        gl.viewport(0, 0, canvas.width, canvas.height);
        // Composición: a la derecha del titular en pantallas anchas,
        // arriba a la derecha y más pequeño en móvil
        const aspecto = ancho / alto;
        vista = aspecto > 1.25
            ? [Math.min(aspecto * .5 - .6, .95), .04, .46]
            : [aspecto * .5 - .14, .1, .27];
    }

    function dibujar() {
        if (!gl || perdido) return;
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, tiempo);
        gl.uniform2f(U.uMouse, raton.x, raton.y);
        gl.uniform3f(U.uAcc, acento[0], acento[1], acento[2]);
        gl.uniform1f(U.uPulse, pulso);
        gl.uniform1f(U.uLight, luz);
        gl.uniform3f(U.uView, vista[0], vista[1], vista[2]);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
    }

    const activo = () => listo && visible && !visorAbierto && !document.hidden && !perdido && !sinMovimiento.matches;

    function paso(ahora) {
        raf = 0;
        if (!activo()) return;
        const dt = Math.min(.05, Math.max(0, (ahora - prev) / 1000));
        prev = ahora;
        tiempo += dt;

        // Sin puntero un rato: la metabola "del ratón" orbita sola
        if (ahora - raton.ultimo > 2500) {
            raton.tx = Math.cos(tiempo * .4) * .95;
            raton.ty = Math.sin(tiempo * .55) * .55;
        }
        const k = Math.min(1, dt * 3.2);
        raton.x += (raton.tx - raton.x) * k;
        raton.y += (raton.ty - raton.y) * k;

        const ka = Math.min(1, dt * 2.6);
        for (let i = 0; i < 3; i++) acento[i] += (acentoObjetivo[i] - acento[i]) * ka;
        luz += (luzObjetivo - luz) * Math.min(1, dt * 3);

        // Muelle amortiguado para el pulso: arranca suave y rebota
        pulsoVel += (-26 * pulso - 5.5 * pulsoVel) * dt;
        pulso += pulsoVel * dt;

        dibujar();
        ajustarCalidad(dt, ahora);
        raf = requestAnimationFrame(paso);
    }

    // Si el equipo no llega, se baja la resolución (nunca por debajo de .3)
    function ajustarCalidad(dt, ahora) {
        medias.push(dt);
        if (medias.length < 45) return;
        const media = medias.reduce((a, b) => a + b, 0) / medias.length;
        medias = [];
        if (media > .028 && escala > .3 && ahora - ultimoAjuste > 1500) {
            escala = Math.max(.3, escala - .1);
            ultimoAjuste = ahora;
            medir();
        }
    }

    function arrancar() {
        if (!listo) return;
        if (sinMovimiento.matches) {
            for (let i = 0; i < 3; i++) acento[i] = acentoObjetivo[i];
            luz = luzObjetivo;
            dibujar();
            return;
        }
        if (!raf && activo()) {
            prev = performance.now();
            raf = requestAnimationFrame(paso);
        }
    }

    function iniciar() {
        if (listo || perdido) return;
        if (!compilar()) {
            section.classList.add('sv-no-gl');
            return;
        }
        listo = true;
        medir();
        dibujar();
        arrancar();
    }

    /* ---------- Visibilidad ---------- */
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible) { iniciar(); arrancar(); }
        }, { threshold: 0 }).observe(canvas);
    } else {
        visible = true;
        iniciar();
    }
    document.addEventListener('visibilitychange', arrancar);
    if (sinMovimiento.addEventListener) sinMovimiento.addEventListener('change', arrancar);

    if ('ResizeObserver' in window) {
        new ResizeObserver(() => { if (listo) { medir(); dibujar(); } }).observe(hero);
    }
    window.addEventListener('resize', () => { if (listo) { medir(); dibujar(); } });

    /* ---------- Contexto perdido / recuperado ---------- */
    canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        perdido = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    });
    canvas.addEventListener('webglcontextrestored', () => {
        perdido = false;
        listo = false;
        iniciar();
    });

    /* ---------- Puntero ---------- */
    wrap.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        if (!r.height || e.clientY > r.bottom) return;
        const ux = (e.clientX - r.left - r.width / 2) / r.height;
        const uy = -(e.clientY - r.top - r.height / 2) / r.height;
        // De la pantalla al plano z = .3 de la escena: (3.2 - .3) / 1.9
        let mx = (ux - vista[0]) / vista[2] * 1.53;
        let my = (uy - vista[1]) / vista[2] * 1.53;
        const largo = Math.hypot(mx, my);
        const maximo = 1.35; // atada al grupo: se estira, no se escapa
        if (largo > maximo) { mx *= maximo / largo; my *= maximo / largo; }
        raton.tx = mx;
        raton.ty = my;
        raton.ultimo = performance.now();
    });
    hero.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button')) return;
        pulsoVel += 4.2;
    });

    /* ---------- Eventos de la sección ---------- */
    section.addEventListener('sv:acento', e => {
        acentoObjetivo = hexARgbLineal(e.detail);
        pulsoVel += .9;
        if (sinMovimiento.matches) arrancar();
    });
    section.addEventListener('sv:visor', e => {
        visorAbierto = !!e.detail;
        arrancar();
    });
    section.addEventListener('sv:tema', e => {
        luzObjetivo = e.detail === 'claro' ? 1 : 0;
        if (sinMovimiento.matches) arrancar();
    });
})();
