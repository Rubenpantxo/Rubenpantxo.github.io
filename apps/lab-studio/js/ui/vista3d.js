// Visor 3D de la ficha de componente: la «vista 3/4».
//
// Monta con three.js (el r128 que ya sirve /apps/escenas/) un modelo hecho
// de primitivas a partir de datos/fichas.js: carcasa, placa y piezas
// numeradas. La tapa de la carcasa lleva como textura el mismo dibujo en
// planta de la mesa, así coinciden rótulos, tornillos y botones.
//
// Cámara orbital propia (arrastrar, Ctrl + rueda, pellizco, flechas),
// vistas 3/4, arriba, abajo y frente, giro automático, rótulos numerados y
// «Ver la placa», que levanta la carcasa y la vuelve translúcida. Se pinta
// a demanda: sin animaciones en curso no gasta GPU.

import { DEFS, dibujar } from './dibujos.js';
import { U } from '../core/modelo.js';

let THREE = null;
let cargando = null;
let actual = null;

function cargarThree() {
    if (window.THREE) return Promise.resolve(THREE = window.THREE);
    if (!cargando) {
        cargando = new Promise((ok, mal) => {
            const s = document.createElement('script');
            s.src = new URL('../../../escenas/three.r128.min.js', import.meta.url).href;
            s.onload = () => ok(THREE = window.THREE);
            s.onerror = () => { cargando = null; mal(new Error('No se pudo cargar three.js')); };
            document.head.appendChild(s);
        });
    }
    return cargando;
}

const VISTAS = {
    '34': { th: .62, ph: .98, nombre: '3/4' },
    arriba: { th: 0, ph: .03, nombre: 'Arriba' },
    abajo: { th: 0, ph: Math.PI - .03, nombre: 'Abajo' },
    frente: { th: 0, ph: 1.38, nombre: 'Frente' }
};
const suave = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const mezcla = (a, b, t) => a + (b - a) * t;
const reducido = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function cerrarVisor() {
    if (actual) { actual.cerrar(); actual = null; }
}

// raiz: el elemento de la ficha (escucha [data-pieza]); def: componente;
// ficha: entrada de FICHAS con `modelo`.
export async function montarVisor(raiz, def, ficha) {
    cerrarVisor();
    const caja = raiz.querySelector('.visor3d');
    if (!caja || !ficha || !ficha.modelo) return null;
    const testigo = {};
    actual = { cerrar() { testigo.cancelado = true; } };
    try { await cargarThree(); } catch { return null; }
    if (testigo.cancelado || !caja.isConnected) return null;
    let visor;
    try { visor = crearVisor(raiz, caja, def, ficha.modelo); } catch (e) { console.warn('Vista 3/4 no disponible:', e); return null; }
    actual = visor;
    return visor;
}

// ------------------------------------------------------------------ visor
function crearVisor(raiz, caja, def, modelo) {
    const lienzoCaja = caja.querySelector('.visor-lienzo');
    const capaMarcas = caja.querySelector('.visor-marcas');
    const globo = caja.querySelector('.visor-globo');
    const info = caja.querySelector('.visor-info');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'visor-canvas';
    lienzoCaja.replaceChildren(canvas);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(32, 1, 1, 4000);
    escena.add(new THREE.HemisphereLight(0xffffff, 0x6b707a, .62));
    const sol = new THREE.DirectionalLight(0xfff6ea, 1.05);
    sol.position.set(-70, 150, 80);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 400 });
    sol.shadow.bias = -.0006;
    escena.add(sol);
    const relleno = new THREE.DirectionalLight(0xdfe8ff, .4);
    relleno.position.set(90, 50, -40);
    escena.add(relleno);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: .3 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -.02;
    suelo.receiveShadow = true;
    escena.add(suelo);

    const recursos = [];
    const texturas = [];
    const pedirFrame = () => pedir();
    const obj = construirModelo(def, modelo, recursos, texturas, renderer, pedirFrame);
    escena.add(obj.raiz);

    // Encaje: centro y tamaño del modelo cerrado.
    const caja3 = new THREE.Box3().setFromObject(obj.raiz);
    const centro = caja3.getCenter(new THREE.Vector3());
    const tam = caja3.getSize(new THREE.Vector3());
    const radioBase = Math.max(tam.x, tam.z, tam.y * 1.4) * 2.1 + 12;

    const cam = { th: VISTAS['34'].th, ph: VISTAS['34'].ph, r: radioBase, tx: centro.x, ty: centro.y * .6, tz: centro.z };
    const destino = { ...cam };
    let tween = null;
    const estado = { vista: '34', girar: false, rotulos: true, abierta: 0, abrir: false, sel: null };
    let tweenTapa = null;

    function colocarCamara() {
        const s = Math.sin(cam.ph);
        camara.position.set(cam.tx + cam.r * s * Math.sin(cam.th), cam.ty + cam.r * Math.cos(cam.ph), cam.tz + cam.r * s * Math.cos(cam.th));
        camara.up.set(0, 1, 0);
        if (cam.ph < .05 || cam.ph > Math.PI - .05) camara.up.set(-Math.sin(cam.th), 0, -Math.cos(cam.th));
        camara.lookAt(cam.tx, cam.ty, cam.tz);
    }

    function irA(obj, ms = 650) {
        Object.assign(destino, obj);
        // El ángulo horizontal va por el camino corto.
        while (destino.th - cam.th > Math.PI) destino.th -= 2 * Math.PI;
        while (destino.th - cam.th < -Math.PI) destino.th += 2 * Math.PI;
        if (reducido() || ms === 0) { Object.assign(cam, destino); tween = null; }
        else tween = { desde: { ...cam }, t0: performance.now(), ms };
        pedir();
    }

    function ponerVista(nombre) {
        const v = VISTAS[nombre];
        if (!v) return;
        estado.vista = nombre;
        irA({ th: v.th, ph: v.ph, r: radioBase, tx: centro.x, ty: nombre === 'abajo' || nombre === 'arriba' ? centro.y * .5 : centro.y * .6, tz: centro.z });
        sincronizarBarra();
    }

    function ponerAbierta(abrir) {
        estado.abrir = abrir;
        const desde = estado.abierta, hasta = abrir ? 1 : 0;
        if (reducido()) { estado.abierta = hasta; aplicarTapa(); tweenTapa = null; }
        else tweenTapa = { desde, hasta, t0: performance.now(), ms: 700 };
        // Sin pieza elegida, la cámara se aleja un poco para que quepa la placa entera.
        if (estado.sel == null && estado.vista) irA({ r: radioBase * (abrir ? 1.12 : 1), ty: centro.y * (abrir ? .75 : .6) }, 700);
        sincronizarBarra();
        pedir();
    }

    function aplicarTapa() {
        const t = suave(estado.abierta);
        obj.tapa.position.y = t * obj.levantar;
        const op = mezcla(1, .16, t), opBase = mezcla(1, .35, t);
        const ajustar = (lista, o) => {
            for (const m of lista) {
                m.opacity = o * (m.userData.opacidad ?? 1);
                m.transparent = o < .999 || m.userData.opacidad != null;
                m.depthWrite = o > .6;
            }
        };
        ajustar(obj.materialesTapa, op);
        // Levantada y translúcida, la carcasa no debe tapar la placa con su sombra.
        for (const me of obj.mallasTapa) me.castShadow = t < .4;
        ajustar(obj.materialesBase, opBase);
    }

    // ------------------------------------------------------- rótulos
    const marcas = new Map();
    capaMarcas.replaceChildren();
    for (const p of obj.piezas) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'marca-pieza';
        b.textContent = p.n;
        b.title = p.datos.nombre;
        b.dataset.pieza = p.n;
        capaMarcas.appendChild(b);
        marcas.set(p.n, b);
    }

    const v3 = new THREE.Vector3();
    function actualizarMarcas() {
        capaMarcas.hidden = !estado.rotulos;
        if (!estado.rotulos) return;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        for (const p of obj.piezas) {
            const b = marcas.get(p.n);
            p.ancla(v3);
            v3.project(camara);
            const fuera = v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05;
            // Lo de dentro solo se rotula con la carcasa levantada.
            // Con la carcasa cerrada, cada cara solo rotula lo suyo: arriba lo de arriba, abajo lo de abajo.
            const cerrada = estado.abierta < .5, desdeAbajo = cam.ph > Math.PI / 2 + .2;
            const oculta = fuera || (estado.sel !== p.n && cerrada && (p.dentro || (p.abajo ? !desdeAbajo : desdeAbajo)));
            b.hidden = oculta;
            if (oculta) continue;
            b.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
            b.classList.toggle('tapada', p.dentro && estado.abierta < .5);
            b.classList.toggle('activa', estado.sel === p.n);
        }
    }

    // ------------------------------------------------------- selección
    function seleccionar(n, volar = true) {
        const p = obj.piezas.find(x => x.n === n);
        for (const q of obj.piezas) q.resaltar(q === p);
        estado.sel = p ? n : null;
        for (const el of raiz.querySelectorAll('[data-pieza]')) {
            if (el.closest('.visor-marcas')) continue;
            el.setAttribute('aria-pressed', String(Number(el.dataset.pieza) === n));
        }
        if (!p) { info.hidden = true; pedir(); return; }
        info.innerHTML = `<b><span class="num">${p.n}</span>${escapar(p.datos.nombre)}</b><p>${escapar(p.datos.texto || '')}</p>`;
        info.hidden = false;
        if (p.dentro && !estado.abrir) ponerAbierta(true);
        if (volar) {
            const c = p.centro(new THREE.Vector3());
            if (estado.abrir || p.dentro) c.y = Math.max(c.y, 0);
            const r = Math.max(p.tamano() * 4.2, radioBase * .62);
            const v = estado.vista === 'abajo' && !p.abajo ? VISTAS['34'] : estado.vista === 'arriba' || estado.vista === 'frente' ? { th: cam.th, ph: cam.ph } : (p.abajo ? VISTAS.abajo : { th: cam.th, ph: Math.min(cam.ph, 1.2) });
            irA({ th: v.th, ph: v.ph, r, tx: c.x, ty: c.y, tz: c.z }, 750);
        }
        pedir();
    }

    // ------------------------------------------------------- bucle
    let raf = 0, ultimo = 0;
    function pedir() { if (!raf) raf = requestAnimationFrame(cuadro); }
    function cuadro(t) {
        raf = 0;
        if (!canvas.isConnected) { cerrar(); return; }
        const dt = ultimo ? Math.min(.05, (t - ultimo) / 1000) : 0;
        ultimo = t;
        let seguir = false;
        if (tween) {
            const k = Math.min(1, (t - tween.t0) / tween.ms), e = suave(k);
            for (const c of ['th', 'ph', 'r', 'tx', 'ty', 'tz']) cam[c] = mezcla(tween.desde[c], destino[c], e);
            if (k >= 1) tween = null; else seguir = true;
        }
        if (tweenTapa) {
            const k = Math.min(1, (t - tweenTapa.t0) / tweenTapa.ms);
            estado.abierta = mezcla(tweenTapa.desde, tweenTapa.hasta, k);
            if (k >= 1) tweenTapa = null; else seguir = true;
            aplicarTapa();
        }
        if (estado.girar && !arrastre) { cam.th += dt * .45; seguir = true; }
        colocarCamara();
        renderer.render(escena, camara);
        actualizarMarcas();
        if (seguir) pedir(); else ultimo = 0;
    }

    function ajustarTamano() {
        const w = lienzoCaja.clientWidth, h = lienzoCaja.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camara.aspect = w / h;
        // En pantallas estrechas el modelo necesita más distancia para caber.
        camara.fov = w / h < 1 ? 44 : 32;
        camara.updateProjectionMatrix();
        pedir();
    }
    const observador = new ResizeObserver(ajustarTamano);
    observador.observe(lienzoCaja);

    // ------------------------------------------------------- entrada
    const punteros = new Map();
    let arrastre = null, pellizco = null, movido = false;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function piezaBajo(x, y) {
        const r = canvas.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camara);
        const objetivos = estado.abierta > .5 ? obj.mallasPiezas : [...obj.mallasPiezas, ...obj.mallasTapa];
        const hit = raycaster.intersectObjects(objetivos, false)[0];
        return hit && hit.object.userData.pieza != null ? hit.object.userData.pieza : null;
    }

    function alBajar(e) {
        canvas.setPointerCapture(e.pointerId);
        punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        movido = false;
        if (punteros.size === 1) arrastre = { x: e.clientX, y: e.clientY, th: cam.th, ph: cam.ph };
        else if (punteros.size === 2) {
            const [a, b] = [...punteros.values()];
            pellizco = { d: Math.hypot(a.x - b.x, a.y - b.y), r: cam.r };
            arrastre = null;
        }
        tween = null;
    }
    function alMover(e) {
        if (punteros.has(e.pointerId)) punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pellizco && punteros.size === 2) {
            const [a, b] = [...punteros.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            cam.r = Math.min(radioBase * 2.2, Math.max(radioBase * .22, pellizco.r * pellizco.d / Math.max(d, 1)));
            movido = true;
            pedir();
            return;
        }
        if (arrastre) {
            const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) movido = true;
            cam.th = arrastre.th - dx * .009;
            cam.ph = Math.min(Math.PI - .03, Math.max(.03, arrastre.ph - dy * .009));
            if (movido) { estado.vista = null; sincronizarBarra(); }
            pedir();
            return;
        }
        if (e.pointerType === 'mouse') {
            const n = piezaBajo(e.clientX, e.clientY);
            canvas.style.cursor = n != null ? 'pointer' : 'grab';
            if (n != null) {
                const p = obj.piezas.find(q => q.n === n);
                const r = lienzoCaja.getBoundingClientRect();
                globo.textContent = `${p.n} · ${p.datos.nombre}`;
                globo.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 12}px)`;
                globo.hidden = false;
            } else globo.hidden = true;
        }
    }
    function alSubir(e) {
        punteros.delete(e.pointerId);
        if (punteros.size < 2) pellizco = null;
        if (punteros.size === 0) {
            if (!movido && arrastre) {
                const n = piezaBajo(e.clientX, e.clientY);
                seleccionar(n, n != null);
            }
            arrastre = null;
        }
    }
    function alRueda(e) {
        if (!e.ctrlKey && !e.metaKey) return;   // sin Ctrl la rueda desplaza la página
        e.preventDefault();
        cam.r = Math.min(radioBase * 2.2, Math.max(radioBase * .22, cam.r * Math.exp(e.deltaY * .0015)));
        tween = null;
        pedir();
    }
    function alTecla(e) {
        const paso = .18;
        if (e.key === 'ArrowLeft') cam.th -= paso;
        else if (e.key === 'ArrowRight') cam.th += paso;
        else if (e.key === 'ArrowUp') cam.ph = Math.max(.03, cam.ph - paso);
        else if (e.key === 'ArrowDown') cam.ph = Math.min(Math.PI - .03, cam.ph + paso);
        else if (e.key === '+' || e.key === '=') cam.r = Math.max(radioBase * .22, cam.r * .88);
        else if (e.key === '-') cam.r = Math.min(radioBase * 2.2, cam.r * 1.14);
        else if (e.key === 'Escape') { seleccionar(null, false); return; }
        else return;
        e.preventDefault();
        tween = null;
        pedir();
    }
    canvas.addEventListener('pointerdown', alBajar);
    canvas.addEventListener('pointermove', alMover);
    canvas.addEventListener('pointerup', alSubir);
    canvas.addEventListener('pointercancel', alSubir);
    canvas.addEventListener('pointerleave', () => { globo.hidden = true; });
    canvas.addEventListener('wheel', alRueda, { passive: false });
    canvas.addEventListener('dblclick', () => { seleccionar(null, false); ponerVista(estado.vista || '34'); });
    caja.addEventListener('keydown', alTecla);

    function sincronizarBarra() {
        for (const b of caja.querySelectorAll('[data-vista]')) b.setAttribute('aria-pressed', String(b.dataset.vista === estado.vista));
        for (const b of caja.querySelectorAll('[data-visor]')) {
            const k = b.dataset.visor;
            b.setAttribute('aria-pressed', String(k === 'girar' ? estado.girar : k === 'rotulos' ? estado.rotulos : estado.abrir));
        }
    }

    function alClic(e) {
        const v = e.target.closest('[data-vista]');
        if (v && caja.contains(v)) { ponerVista(v.dataset.vista); return; }
        const a = e.target.closest('[data-visor]');
        if (a && caja.contains(a)) {
            const k = a.dataset.visor;
            if (k === 'girar') estado.girar = !estado.girar;
            else if (k === 'rotulos') estado.rotulos = !estado.rotulos;
            else if (k === 'abrir') ponerAbierta(!estado.abrir);
            sincronizarBarra();
            pedir();
            return;
        }
        const p = e.target.closest('[data-pieza]');
        if (p && raiz.contains(p)) {
            const n = Number(p.dataset.pieza);
            seleccionar(estado.sel === n && p.closest('.visor-marcas') ? null : n);
            if (!p.closest('.visor3d')) caja.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'nearest' });
        }
    }
    raiz.addEventListener('click', alClic);

    function cerrar() {
        cancelAnimationFrame(raf);
        raf = 0;
        observador.disconnect();
        raiz.removeEventListener('click', alClic);
        caja.removeEventListener('keydown', alTecla);
        escena.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) for (const m of [].concat(o.material)) m.dispose();
        });
        for (const t of texturas) t.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
        if (actual === visor) actual = null;
    }

    caja.classList.add('listo');
    sincronizarBarra();
    aplicarTapa();
    colocarCamara();
    ajustarTamano();
    pedir();

    const visor = { cerrar, seleccionar, ponerVista, ponerAbierta };
    return visor;
}

const escapar = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------- modelo
function construirModelo(def, m, recursos, texturas, renderer, pedir) {
    const C = m.caja, P = m.placa || {};
    const W = def.w * U, H = def.h * U;                 // dibujo en planta (px)
    const rect = C.rect || [0, 0, W, H, 0];
    // Del dibujo (px) a la carcasa (mm): el rectángulo `rect` ocupa w × d.
    const aX = px => (px - rect[0]) / rect[2] * C.w - C.w / 2;
    const aZ = px => (px - rect[1]) / rect[3] * C.d - C.d / 2;

    const raiz = new THREE.Group();
    const tapa = new THREE.Group();
    const base = new THREE.Group();
    raiz.add(base, tapa);
    const materialesTapa = [], mallasTapa = [], mallasPiezas = [];

    const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...o });
    const metal = () => mat('#c9ced4', { roughness: .32, metalness: .65 });
    const oro = () => mat('#d8b14a', { roughness: .35, metalness: .7 });
    const malla = (geo, material, sombra = true) => {
        const me = new THREE.Mesh(geo, material);
        me.castShadow = sombra;
        me.receiveShadow = true;
        return me;
    };

    const enTapa = (me, material) => { tapa.add(me); mallasTapa.push(me); materialesTapa.push(material); return me; };
    const materialesBase = [];
    const grosor = 1.6;
    let margen, pw, pd, py, pTop;

    if (C.tipo === 'placa') {
        // Placa sin carcasa (placas de desarrollo): el propio circuito lleva el
        // dibujo en planta y descansa a la altura `y` (sobre sus pines o sus piezas de abajo).
        pw = C.w; pd = C.d; py = C.y ?? 0; pTop = py + grosor;
        const matPcb = mat(P.color || C.color || '#1d5e3a', { roughness: .6 });
        const pcb = malla(cajaRedondeada(pw, pd, grosor, C.r ?? 1, .2), matPcb);
        pcb.position.y = py;
        base.add(pcb);
        const texPcb = texturaDibujo(def, rect, renderer, pedir);
        texturas.push(texPcb);
        const plano = new THREE.Mesh(new THREE.PlaneGeometry(pw * .995, pd * .995), new THREE.MeshStandardMaterial({ map: texPcb, transparent: true, roughness: .55, polygonOffset: true, polygonOffsetFactor: -2 }));
        plano.rotation.x = -Math.PI / 2;
        plano.position.y = pTop + .02;
        plano.receiveShadow = true;
        base.add(plano);
        if (C.fondo) {
            const tex = texturaTexto(C.fondo, pw, pd, '#e8eaed');
            texturas.push(tex);
            const etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(pw * .9, pd * .9), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .7 }));
            etiqueta.rotation.x = Math.PI / 2;
            etiqueta.position.y = py - .03;
            base.add(etiqueta);
        }
    } else {
        // --- carcasa ----------------------------------------------------
        const colCaja = C.color || '#f2f3f5';
        const matCaja = C.metal ? mat(colCaja, { roughness: .35, metalness: .55 }) : mat(colCaja, { roughness: .5 });

        if (C.tipo === 'mecanismo') {
            const fr = C.frente || 4;
            enTapa(malla(cajaRedondeada(C.w, C.d, fr, C.r || 2, .5), matCaja), matCaja).position.y = C.h - fr;
            const matCuerpo = mat(C.cuerpo || '#2a2c31', { roughness: .7 });
            enTapa(malla(cajaRedondeada(C.w * .86, C.d * .84, C.h - fr, 1.5, .4), matCuerpo), matCuerpo);
        } else {
            enTapa(malla(cajaRedondeada(C.w, C.d, C.h, C.r || 3, Math.min(1.2, C.h * .08)), matCaja), matCaja);
        }
        if (C.tipo === 'llavero') {
            // Ranura del marco entre la carcasa y el panel negro.
            const borde = mat('#8f959d', { roughness: .4, metalness: .6 });
            const me = enTapa(malla(cajaRedondeada(C.w + .4, C.d + .4, 1.2, C.r, .3), borde), borde);
            me.position.y = C.h * .45;
        }

        // Tapa: el dibujo en planta como textura, recortado al rectángulo de la carcasa.
        const texTapa = texturaDibujo(def, rect, renderer, pedir);
        texturas.push(texTapa);
        const matDibujo = new THREE.MeshStandardMaterial({ map: texTapa, transparent: true, roughness: .6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
        matDibujo.userData.opacidad = 1;
        const plano = new THREE.Mesh(new THREE.PlaneGeometry(C.w * .985, C.d * .985), matDibujo);
        plano.rotation.x = -Math.PI / 2;
        plano.position.y = C.h + .03;
        plano.receiveShadow = true;
        enTapa(plano, matDibujo);

        // Base interior: queda en su sitio al abrir y lleva la etiqueta de abajo.
        const matBase = mat(C.tipo === 'mecanismo' ? (C.cuerpo || '#2a2c31') : colCaja, { roughness: .6 });
        const bw = C.tipo === 'mecanismo' ? C.w * .86 - .6 : C.w - .6, bd = C.tipo === 'mecanismo' ? C.d * .84 - .6 : C.d - .6;
        const placaBase = malla(cajaRedondeada(bw, bd, 1.2, C.tipo === 'mecanismo' ? 1.2 : Math.max(1, (C.r || 3) - .3), .3), matBase);
        placaBase.position.y = .05;
        base.add(placaBase);
        // Al abrir, el fondo también se vuelve translúcido: deja ver lo que va debajo de la placa.
        materialesBase.push(matBase);
        if (C.fondo) {
            const tex = texturaTexto(C.fondo, bw, bd, C.tipo === 'mecanismo' || C.metal ? '#e8eaed' : '#3b3f45');
            texturas.push(tex);
            const matEtiqueta = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .7 });
            matEtiqueta.userData.opacidad = 1;
            materialesBase.push(matEtiqueta);
            const etiqueta = new THREE.Mesh(new THREE.PlaneGeometry(bw * .9, bd * .9), matEtiqueta);
            etiqueta.rotation.x = Math.PI / 2;
            etiqueta.position.y = -.04;
            base.add(etiqueta);
        }

        // --- placa de circuito -------------------------------------------
        margen = P.margen ?? 2;
        pw = (C.tipo === 'mecanismo' ? C.w * .86 : C.w) - 2 * margen;
        pd = (C.tipo === 'mecanismo' ? C.d * .84 : C.d) - 2 * margen;
        py = P.y ?? 2; pTop = py + grosor;
        const matPcb = mat(P.color || '#1d5e3a', { roughness: .62 });
        const pcb = malla(cajaRedondeada(pw, pd, grosor, 1, .2), matPcb);
        pcb.position.y = py;
        base.add(pcb);
        // Serigrafía: el nombre del componente en una esquina libre.
        const serig = texturaTexto([def.corto], pw, pd, '#eef2f4', 'esquina');
        texturas.push(serig);
        const planoSerig = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshStandardMaterial({ map: serig, transparent: true, roughness: .6, polygonOffset: true, polygonOffsetFactor: -1 }));
        planoSerig.rotation.x = -Math.PI / 2;
        planoSerig.position.y = pTop + .01;
        base.add(planoSerig);

    }

    // --- piezas -----------------------------------------------------
    const piezas = [];
    const topeCaja = C.h + .35;
    for (const d of m.piezas) {
        const grupo = new THREE.Group();
        const mallas = [];
        const add = (me, x = 0, y = 0, z = 0) => { me.position.set(x, y, z); grupo.add(me); mallas.push(me); return me; };
        const x0 = d.x != null ? aX(d.x) : 0, z0 = d.z != null ? aZ(d.z) : 0;
        const enLaTapa = d.en === 'tapa';
        const y0 = enLaTapa ? C.h : d.abajo ? py : pTop;
        const sentido = d.abajo ? -1 : 1;                  // hacia dónde crece
        const alto = h => d.asoma ? (d.abajo ? y0 + .35 : topeCaja - y0) : h;

        const pinta = (f, ox = 0, oz = 0) => {
            const t = f.tipo;
            if (t === 'chip' || t === 'caja' || t === 'smd') {
                const h = f.h || 1;
                const top = f.rotulo ? texturaRotulo(f.rotulo, f.w, f.d, t === 'chip' && !f.color ? '#9da3ab' : '#20242a', f.color && t === 'chip' ? f.color : null) : null;
                if (top) texturas.push(top);
                const lados = mat(f.color || (t === 'smd' ? '#c9a66b' : t === 'caja' ? '#2b2d31' : '#1a1b1e'), { roughness: t === 'chip' ? .45 : .6 });
                const arriba = top ? mat('#ffffff', { map: top, roughness: .5 }) : lados;
                add(malla(new THREE.BoxGeometry(f.w, h, f.d), [lados, lados, arriba, lados, lados, lados]), ox, sentido * h / 2, oz);
            } else if (t === 'blindaje' || t === 'cristal') {
                const h = f.h || 1.5;
                const top = f.rotulo ? texturaRotulo(f.rotulo, f.w, f.d, '#4a5058', '#c9ced4') : null;
                if (top) texturas.push(top);
                const lados = metal();
                const arriba = top ? mat('#ffffff', { map: top, roughness: .3, metalness: .5 }) : lados;
                add(malla(new THREE.BoxGeometry(f.w, h, f.d), [lados, lados, arriba, lados, lados, lados]), ox, sentido * h / 2, oz);
            } else if (t === 'rele') {
                const h = f.h || 10;
                const claro = esClaro(f.color);
                const top = texturaRotulo(f.rotulo || '', f.w, f.d, claro ? '#30343a' : '#e8eaed', f.color);
                texturas.push(top);
                const lados = mat(f.color || '#25272c', { roughness: .45 });
                add(malla(new THREE.BoxGeometry(f.w, h, f.d), [lados, lados, mat('#ffffff', { map: top, roughness: .45 }), lados, lados, lados]), ox, sentido * h / 2, oz);
            } else if (t === 'condensador') {
                const h = f.h || 7, r = f.r || 2.5;
                add(malla(new THREE.CylinderGeometry(r, r, h, 28), mat(f.color || '#243a8f', { roughness: .4 })), ox, sentido * h / 2, oz);
                add(malla(new THREE.CylinderGeometry(r * .92, r * .92, .25, 28), metal()), ox, sentido * (h + .1), oz);
            } else if (t === 'bobina') {
                const h = f.h || 3, r = f.r || 2.5;
                add(malla(new THREE.CylinderGeometry(r, r, h, 24), mat('#3a3d42', { roughness: .7 })), ox, sentido * h / 2, oz);
                add(malla(new THREE.CylinderGeometry(r * .62, r * .62, h + .1, 20), mat('#b87333', { roughness: .4, metalness: .6 })), ox, sentido * h / 2, oz);
            } else if (t === 'led') {
                const c = new THREE.Color(f.color || '#3ccf6a');
                add(malla(new THREE.BoxGeometry(1.6, .7, .9), mat(c, { emissive: c, emissiveIntensity: .9 }), false), ox, .35, oz);
                const hTubo = alto(0);
                if (hTubo > .8) {
                    const tubo = mat(c, { emissive: c, emissiveIntensity: .55, transparent: true, opacity: .75, roughness: .2 });
                    tubo.userData.fija = true;
                    add(malla(new THREE.CylinderGeometry(.9, .9, hTubo, 16), tubo, false), ox, hTubo / 2, oz);
                }
            } else if (t === 'boton') {
                const h = alto(f.h || 3), r = f.r || 2.4;
                add(malla(new THREE.BoxGeometry(r * 2.4, .9, r * 2.4), mat('#1d1e21')), ox, .45, oz);
                add(malla(new THREE.CylinderGeometry(r, r, h + .5, 28), mat(f.color || '#f4f5f7', { roughness: .45 })), ox, (h + .5) / 2, oz);
            } else if (t === 'pot') {
                const h = alto(f.h || 4), r = f.r || 2;
                add(malla(new THREE.CylinderGeometry(r, r, h + .6, 24), mat('#2c2e33', { roughness: .5 })), ox, (h + .6) / 2, oz);
                add(malla(new THREE.BoxGeometry(r * 1.5, .25, .45), mat('#a9adb3')), ox, h + .62, oz);
            } else if (t === 'sensor') {
                const h = f.h || 6, r = f.r || 4;
                for (const dx of [-1.3, 0, 1.3]) add(malla(new THREE.CylinderGeometry(.22, .22, h - 4, 6), metal(), false), ox + dx, (h - 4) / 2, oz);
                add(malla(new THREE.CylinderGeometry(r, r, 4, 28), metal()), ox, h - 2, oz);
                add(malla(new THREE.BoxGeometry(r * .9, .12, r * .7), mat('#2a2618', { roughness: .2, metalness: .3 })), ox, h + .05, oz);
            } else if (t === 'ldr') {
                const r = f.r || 2;
                add(malla(new THREE.CylinderGeometry(r, r, .9, 24), mat('#c8743a', { roughness: .4 })), ox, .45, oz);
                add(malla(new THREE.BoxGeometry(r * 1.3, .05, .35), mat('#f2e7c9')), ox, .93, oz);
            } else if (t === 'pila') {
                const h = f.h || 3.2, r = f.r || 10;
                const tex = texturaRotulo('CR2032', r * 2, r * 2, '#4a5058', '#c9ced4', true);
                texturas.push(tex);
                const lados = metal();
                add(malla(new THREE.CylinderGeometry(r, r, h, 40), [lados, lados, mat('#ffffff', { map: tex, roughness: .3, metalness: .5 })]), ox, sentido * h / 2, oz).rotation.x = d.abajo ? Math.PI : 0;
            } else if (t === 'antena') {
                const cobre = mat('#c99a3c', { roughness: .35, metalness: .7 });
                const vertical = f.d > f.w;
                const largo = vertical ? f.d : f.w, ancho = vertical ? f.w : f.d;
                const n = Math.max(3, Math.round(largo / 2.2));
                for (let i = 0; i < n; i++) {
                    const u = -largo / 2 + (i + .5) * largo / n;
                    add(malla(new THREE.BoxGeometry(vertical ? ancho : .5, .06, vertical ? .5 : ancho), cobre, false), ox + (vertical ? 0 : u), .03, oz + (vertical ? u : 0));
                    if (i < n - 1) {
                        const lado = (i % 2 ? -1 : 1) * ancho / 2;
                        add(malla(new THREE.BoxGeometry(vertical ? .5 : largo / n, .06, vertical ? largo / n : .5), cobre, false), ox + (vertical ? lado : u + largo / n / 2), .03, oz + (vertical ? u + largo / n / 2 : lado));
                    }
                }
            } else if (t === 'pads') {
                const et = f.etiquetas || [];
                const paso = 1.6;
                et.forEach((txt, i) => {
                    const u = (i - (et.length - 1) / 2) * paso;
                    add(malla(new THREE.BoxGeometry(1.1, .08, 1.1), oro(), false), ox + (f.vertical ? 0 : u), .04, oz + (f.vertical ? u : 0));
                });
                const tex = texturaPads(et, f.vertical);
                texturas.push(tex);
                const largo = et.length * paso;
                const pl = new THREE.Mesh(new THREE.PlaneGeometry(f.vertical ? 3 : largo, f.vertical ? largo : 3), new THREE.MeshStandardMaterial({ map: tex, transparent: true }));
                pl.rotation.x = -Math.PI / 2;
                add(pl, ox + (f.vertical ? -2.4 : 0), .02, oz + (f.vertical ? 0 : 1.9));
            } else if (t === 'borna') {
                const h = alto(f.h || 8);
                const cuerpo = mat(f.color || '#eceef1', { roughness: .55 });
                for (const px of f.polos) {
                    const x = aX(px) - x0;
                    const yb = d.abajo ? -h : 0;
                    add(malla(new THREE.BoxGeometry(4.6, h, f.d || 7), cuerpo), x, yb + h / 2, 0);
                    const yCab = d.abajo ? -h - .05 : h + .05;
                    add(malla(new THREE.CylinderGeometry(1.7, 1.7, .5, 24), metal()), x, yCab, 0);
                    add(malla(new THREE.BoxGeometry(2.6, .2, .45), mat('#3a3e44')), x, yCab + (d.abajo ? -.3 : .3), 0).rotation.y = Math.PI / 4;
                }
            } else if (t === 'lente') {
                const r = f.r || 6;
                const lente = mat('#efece4', { roughness: .35, transparent: true, opacity: .96, flatShading: true });
                lente.userData.opacidad = .96;
                add(malla(new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), lente), ox, 0, oz).scale.y = .55;
            } else if (t === 'teclas') {
                for (const [px, pz] of f.puntos) {
                    const tecla = malla(new THREE.CylinderGeometry(1, 1, f.h || 1.2, 36), mat('#b9bec6', { roughness: .3, metalness: .5 }));
                    tecla.scale.set(f.w / 2, 1, f.d / 2);
                    add(tecla, aX(px) - x0, (f.h || 1.2) / 2, aZ(pz) - z0);
                }
            } else if (t === 'anilla') {
                const r = f.r || 5;
                const an = malla(new THREE.TorusGeometry(r, 1.6, 14, 40), mat('#c3c7cd', { roughness: .3, metalness: .65 }));
                an.rotation.x = Math.PI / 2;
                add(an, ox, -C.h / 2, oz);
            } else if (t === 'usbc' || t === 'microusb') {
                // Conector metálico con la boca hacia el borde (+z).
                // `lado: 'x'` la gira para que mire al borde derecho.
                const enX = f.lado === 'x';
                const a = f.w || (t === 'usbc' ? 8.9 : 7.5), l = f.d || (t === 'usbc' ? 7.3 : 5.6), h = f.h || (t === 'usbc' ? 3.2 : 2.6);
                const w = enX ? l : a, dd = enX ? a : l;
                add(malla(cajaRedondeada(w, dd, h, t === 'usbc' ? Math.min(h / 2 - .05, .9) : .5, .15), metal()), ox, 0, oz);
                const boca = malla(new THREE.BoxGeometry(enX ? .3 : a * .72, h * .42, enX ? a * .72 : .3), mat('#141518', { roughness: .8 }), false);
                add(boca, ox + (enX ? w / 2 - .05 : 0), h / 2, oz + (enX ? 0 : dd / 2 - .05));
            } else if (t === 'tira') {
                // Tira de pines macho de 2,54 mm a lo largo de z, montada por debajo:
                // plástico pegado a la placa y pines que la atraviesan hasta el suelo.
                const zA = aZ(f.z0) - z0, zB = aZ(f.z1) - z0, n = f.n || Math.round(Math.abs(zB - zA) / 2.54) + 1;
                const paso = n > 1 ? (zB - zA) / (n - 1) : 0;
                add(malla(new THREE.BoxGeometry(2.5, 2.5, Math.abs(zB - zA) + 2.54), mat('#141518', { roughness: .7 })), ox, -1.25, (zA + zB) / 2);
                const arriba = grosor + .9, abajoPin = -(y0 - .15), geo = new THREE.BoxGeometry(.64, arriba - abajoPin, .64);
                for (let i = 0; i < n; i++) add(malla(geo, oro(), false), ox, (arriba + abajoPin) / 2, zA + i * paso);
            } else if (t === 'pantalla') {
                // Módulo TFT: marco metálico y, encima, el dibujo de la pantalla recortado.
                const [rx, ry, rw, rh] = f.rect;
                const w = rw / W * C.w, dd = rh / H * C.d, h = f.h || 3.5;
                const cx = aX(rx + rw / 2) - x0, cz = aZ(ry + rh / 2) - z0;
                add(malla(new THREE.BoxGeometry(w, h, dd), mat('#9aa1a9', { roughness: .35, metalness: .6 })), cx, h / 2, cz);
                const tex = texturaDibujo(def, f.rect, renderer, pedir);
                texturas.push(tex);
                const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(w, dd), new THREE.MeshStandardMaterial({ map: tex, roughness: .18, metalness: .1 }));
                vidrio.rotation.x = -Math.PI / 2;
                add(vidrio, cx, h + .02, cz);
            } else if (t === 'tacto') {
                const w = f.w || 4.6, dd = f.d || 3.6;
                add(malla(new THREE.BoxGeometry(w, 1.4, dd), metal()), ox, sentido * .7, oz);
                add(malla(new THREE.CylinderGeometry(Math.min(w, dd) * .3, Math.min(w, dd) * .3, .7, 20), mat(f.color || '#1a1b1e')), ox, sentido * 1.75, oz);
            } else if (t === 'rgb') {
                const w = f.w || 5, c = new THREE.Color(f.color || '#ffd2a0');
                add(malla(new THREE.BoxGeometry(w, 1.5, w), mat('#f4f4f0', { roughness: .4 })), ox, .75, oz);
                add(malla(new THREE.CylinderGeometry(w * .32, w * .32, .1, 24), mat(c, { emissive: c, emissiveIntensity: .5, roughness: .3 }), false), ox, 1.52, oz);
            }
        };

        if (d.tipo === 'grupo') {
            for (const f of d.formas) {
                const antes = mallas.length;
                pinta(f, f.dx || 0, f.dz || 0);
                if (f.dy) for (const me of mallas.slice(antes)) me.position.y += f.dy;
            }
        } else pinta(d);

        grupo.position.set(x0, y0, z0);
        (enLaTapa ? tapa : base).add(grupo);
        const mats = [];
        for (const me of mallas) {
            me.userData.pieza = d.n;
            mallasPiezas.push(me);
            for (const mm of [].concat(me.material)) {
                if (mm.emissive && !mm.userData.fija && !mats.includes(mm)) mats.push(mm);
                if (enLaTapa && !materialesTapa.includes(mm)) { materialesTapa.push(mm); if (mm.transparent && mm.userData.opacidad == null) mm.userData.opacidad = mm.opacity; }
            }
        }
        const originales = mats.map(mm => ({ mm, e: mm.emissive.clone(), i: mm.emissiveIntensity }));
        const acento = new THREE.Color('#4c9dff');
        const bb = new THREE.Box3();
        piezas.push({
            n: d.n, datos: d, dentro: C.tipo !== 'placa' && !enLaTapa && !d.asoma, abajo: !!d.abajo,
            centro(v) { bb.setFromObject(grupo); return bb.getCenter(v); },
            tamano() { bb.setFromObject(grupo); const s = bb.getSize(new THREE.Vector3()); return Math.max(s.x, s.y, s.z, 3); },
            ancla(v) {
                bb.setFromObject(grupo);
                bb.getCenter(v);
                v.y = d.abajo ? bb.min.y - 1.5 : bb.max.y + 1.5;
                return v;
            },
            resaltar(si) {
                for (const o of originales) {
                    if (si) { o.mm.emissive.copy(acento); o.mm.emissiveIntensity = .42; }
                    else { o.mm.emissive.copy(o.e); o.mm.emissiveIntensity = o.i; }
                }
            }
        });
    }

    // Abierta, la carcasa sube hasta dejar ver la pieza más alta de la placa.
    const levantar = C.h * 1.15 + 8;
    return { raiz, tapa, base, piezas, materialesTapa, materialesBase, mallasTapa, mallasPiezas, levantar };
}

// ------------------------------------------------------------- geometría
function cajaRedondeada(w, d, h, r, bisel = .6) {
    bisel = Math.min(bisel, h / 2 - .01, w / 4, d / 4);
    const W = w - 2 * bisel, D = d - 2 * bisel;
    const R = Math.max(.05, Math.min(r, W / 2 - .01, D / 2 - .01));
    const s = new THREE.Shape();
    const x = -W / 2, y = -D / 2;
    s.moveTo(x + R, y);
    s.lineTo(x + W - R, y);
    s.quadraticCurveTo(x + W, y, x + W, y + R);
    s.lineTo(x + W, y + D - R);
    s.quadraticCurveTo(x + W, y + D, x + W - R, y + D);
    s.lineTo(x + R, y + D);
    s.quadraticCurveTo(x, y + D, x, y + D - R);
    s.lineTo(x, y + R);
    s.quadraticCurveTo(x, y, x + R, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, h - 2 * bisel), bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bisel, 0);
    return g;
}

// ------------------------------------------------------------- texturas
function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w));
    c.height = Math.max(2, Math.round(h));
    return c;
}
function texturaDe(c) {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
}

// El dibujo SVG en planta del componente, pintado en un canvas.
function texturaDibujo(def, rect, renderer, pedir) {
    const W = def.w * U, H = def.h * U;
    const escala = Math.min(8, 2048 / Math.max(W, H));
    const c = lienzo(W * escala, H * escala);
    const tex = texturaDe(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.repeat.set(rect[2] / W, rect[3] / H);
    tex.offset.set(rect[0] / W, 1 - (rect[1] + rect[3]) / H);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}" viewBox="0 0 ${W} ${H}"><defs>${DEFS}</defs>${dibujar(def)}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        tex.needsUpdate = true;
        URL.revokeObjectURL(url);
        pedir();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
    return tex;
}

const FUENTE = 'Inter, system-ui, sans-serif';

// Líneas de texto centradas (etiqueta de la base) o en una esquina (serigrafía).
function texturaTexto(lineas, w, d, color, modo = 'centro') {
    const k = 24;
    const c = lienzo(w * k, d * k);
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.textBaseline = 'middle';
    if (modo === 'esquina') {
        g.font = `600 ${k * 1.6}px ${FUENTE}`;
        g.globalAlpha = .75;
        g.fillText(lineas[0], k * 1.4, c.height - k * 1.6);
    } else {
        g.textAlign = 'center';
        const tam = Math.min(k * 3.2, c.width / 14);
        lineas.forEach((t, i) => {
            g.font = `${i === 0 ? 800 : 500} ${i === 0 ? tam : tam * .72}px ${FUENTE}`;
            g.fillText(t, c.width / 2, c.height / 2 + (i - (lineas.length - 1) / 2) * tam * 1.25);
        });
    }
    return texturaDe(c);
}

// Rótulo de la cara de arriba de un chip, un relé o una pila.
function texturaRotulo(texto, w, d, color, fondo = null, redondo = false) {
    const k = 48;
    const c = lienzo(w * k, d * k);
    const g = c.getContext('2d');
    g.fillStyle = fondo || '#1a1b1e';
    if (redondo) { g.beginPath(); g.arc(c.width / 2, c.height / 2, c.width / 2, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(0, 0, c.width, c.height);
    if (texto) {
        const lineas = String(texto).split('\n');
        g.fillStyle = color;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        let tam = c.height / (lineas.length + 1.2);
        g.font = `700 ${tam}px ${FUENTE}`;
        const ancho = Math.max(...lineas.map(l => g.measureText(l).width));
        if (ancho > c.width * .86) { tam *= c.width * .86 / ancho; g.font = `700 ${tam}px ${FUENTE}`; }
        lineas.forEach((l, i) => g.fillText(l, c.width / 2, c.height / 2 + (i - (lineas.length - 1) / 2) * tam * 1.1));
    }
    if (!redondo) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(k * .55, k * .55, k * .18, 0, Math.PI * 2); g.fill(); }
    return texturaDe(c);
}

function texturaPads(etiquetas, vertical) {
    const k = 40, paso = 1.6, n = etiquetas.length;
    const c = lienzo((vertical ? 3 : n * paso) * k, (vertical ? n * paso : 3) * k);
    const g = c.getContext('2d');
    g.fillStyle = '#eef2f4';
    g.font = `700 ${k * .78}px ${FUENTE}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    etiquetas.forEach((t, i) => {
        const u = (i + .5) * paso * k;
        if (vertical) g.fillText(t, c.width / 2, u);
        else g.fillText(t, u, c.height / 2);
    });
    return texturaDe(c);
}

function esClaro(hex) {
    const c = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!c) return false;
    const [r, g, b] = c.slice(1).map(x => parseInt(x, 16));
    return r * .299 + g * .587 + b * .114 > 160;
}
