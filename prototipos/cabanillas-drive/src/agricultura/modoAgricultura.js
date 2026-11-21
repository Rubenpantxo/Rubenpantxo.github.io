// Modo agricultura (PLAN_AGRICULTURA.md). Por ahora (fase A2) solo el pincel de depuración:
// ?agricultura (o ?agricultura=2-650 para otra parcela) abre la parcela de pruebas con una cámara
// propia y un panel para pintar cada labor con el ratón o el dedo y ver cómo queda la tierra.
// El juego se queda en pausa debajo; al cerrar el panel se recarga sin el parámetro.
import * as THREE from 'three';
import { AGRICULTURA, LABORES } from '../config/agricultura.js';
import { CALIDAD } from '../config/calidad.js';
import { cargaParcelas } from '../datos/parcelas.js';
import { creaRegistro } from './registro.js';
import { creaParcela } from './parcela.js';
import { direccionLabor, labradoEn, limpia, pinta } from './pincel.js';

const ESTILO = `
#agri-panel { position: fixed; left: 8px; right: 8px; bottom: 8px; z-index: 30; color: var(--tinta, #fff);
  background: var(--fondo-ui, rgba(16,22,30,.78)); border-radius: 12px; padding: 8px 10px; font: 500 13px system-ui, sans-serif;
  backdrop-filter: blur(6px); max-width: 980px; margin: 0 auto; user-select: none; -webkit-user-select: none; }
#agri-panel .fila { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
#agri-panel .fila + .fila { margin-top: 6px; }
#agri-panel button { font: 600 13px system-ui, sans-serif; color: inherit; background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.22); border-radius: 9px; padding: 7px 9px; cursor: pointer; min-height: 36px; }
#agri-panel button.activo { background: var(--acento, #ffd54a); color: #1a1a1a; border-color: transparent; }
#agri-panel .labores button { flex: 1 1 0; min-width: 74px; }
#agri-panel input[type=range] { flex: 1; min-width: 90px; accent-color: var(--acento, #ffd54a); }
#agri-panel .dato { color: var(--tenue, #c9d3de); font-size: 12px; }
#agri-titulo { position: fixed; top: 8px; left: 8px; right: 8px; z-index: 30; text-align: center; pointer-events: none;
  color: #fff; font: 600 14px system-ui, sans-serif; text-shadow: 0 1px 3px #000, 0 0 8px #000; }
#agri-titulo small { display: block; font-weight: 500; font-size: 12px; opacity: .9; }
.agri-etiqueta { position: fixed; z-index: 29; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap;
  color: #fff; font: 700 12px system-ui, sans-serif; background: rgba(0,0,0,.55); border-radius: 6px; padding: 2px 6px; }
#agri-panel .vistas button { flex: 1 1 0; white-space: nowrap; }
@media (max-width: 640px) {
  #agri-panel .labores button { min-width: 60px; padding: 6px 4px; font-size: 12px; }
  #agri-panel .vistas button { padding: 6px 2px; font-size: 11px; }
}
@media (max-width: 480px) { #agri-panel .vistas button span { display: none; } #agri-panel .vistas button { font-size: 18px; } }
`;

// Franjas del muestrario: una por estado de la tabla 5.3 del plan, en el sentido de labor
const MUESTRARIO = [
  { nombre: 'Sin trabajar', labores: [] },
  { nombre: 'Arado', labores: ['arar'] },
  { nombre: 'Gradeado', labores: ['arar', 'gradear'] },
  { nombre: 'Abonado', labores: ['arar', 'gradear', 'abonar'] },
  { nombre: 'Sembrado', labores: ['arar', 'gradear', 'sembrar'] },
  { nombre: 'Regado', labores: ['arar', 'gradear', 'sembrar', ['regar', 0.7], ['regar', 1, 0.45]] },
  { nombre: 'Cosechado', labores: ['cosechar'] },
  { nombre: 'Rodadas', labores: ['arar', 'rodar'] },
];

// Cámara orbital sobre un punto: guiñada, cabeceo y distancia
function creaOrbita(camara, terreno) {
  const o = { objetivo: new THREE.Vector3(), guinada: 0, cabeceo: 0.6, distancia: 60 };
  const P = AGRICULTURA.pincel.camara;
  o.coloca = () => {
    o.cabeceo = Math.min(1.53, Math.max(0.05, o.cabeceo));
    o.distancia = Math.min(P.distanciaMaxM, Math.max(P.distanciaMinM, o.distancia));
    const c = Math.cos(o.cabeceo);
    camara.position.set(
      o.objetivo.x + Math.sin(o.guinada) * c * o.distancia,
      o.objetivo.y + Math.sin(o.cabeceo) * o.distancia,
      o.objetivo.z + Math.cos(o.guinada) * c * o.distancia,
    );
    const suelo = terreno.alturaEn(camara.position.x, camara.position.z) + 0.6;
    if (camara.position.y < suelo) camara.position.y = suelo;
    camara.lookAt(o.objetivo);
  };
  // Mover el objetivo por el suelo (en la orientación de la cámara)
  o.desplaza = (dx, dz) => {
    const s = Math.sin(o.guinada);
    const c = Math.cos(o.guinada);
    o.objetivo.x += dx * c + dz * s;
    o.objetivo.z += -dx * s + dz * c;
    o.objetivo.y = terreno.alturaEn(o.objetivo.x, o.objetivo.z);
  };
  return o;
}

export async function iniciaAgricultura({ api, escena, camara, renderer, refParcela = null }) {
  const datos = await cargaParcelas(AGRICULTURA.rutaParcelas);
  const registro = creaRegistro(datos);
  const terreno = api.mundo.terreno;
  const ref = refParcela && registro.porRef(refParcela) ? refParcela : AGRICULTURA.parcelaPruebas;
  if (refParcela && ref !== refParcela) api.avisa(`No hay parcela ${refParcela}: se abre la ${ref}`, 5);
  const info = registro.porRef(ref);
  if (!info) throw new Error(`No está la parcela de pruebas ${ref} en ${AGRICULTURA.rutaParcelas}`);
  const parcela = creaParcela(info, { terreno, nivelCalidad: CALIDAD.nivel });
  const raiz = new THREE.Group();
  raiz.name = 'raizAgricultura';
  raiz.add(parcela.malla);
  escena.add(raiz);
  const sol = escena.getObjectByName('sol');
  const uSol = parcela.malla.material.userData.uniformes.uSol;

  // Sin hierba en lo labrado (la de la ortofoto seguiría saliendo encima de la tierra arada)
  let excluyeBase = null;
  escena.traverse((o) => { if (!excluyeBase && o.userData?.bajoAgua) excluyeBase = o.userData.bajoAgua; });
  const refrescaHierba = () => api.hierba.ponExclusion((x, z, y) => Boolean(excluyeBase?.(x, z, y)) || labradoEn(parcela, x, z));

  // --- Cámara
  const orbita = creaOrbita(camara, terreno);
  const [cx, cz] = info.centro;
  const [ex, ez] = direccionLabor(info);
  const guinadaLabor = Math.atan2(-ex, -ez);       // mirando a lo largo de las pasadas
  const VISTAS = {
    lejos: () => Object.assign(orbita, { guinada: guinadaLabor + 0.5, cabeceo: 0.62, distancia: 115 }),
    cerca: () => Object.assign(orbita, { guinada: guinadaLabor + 0.35, cabeceo: 0.42, distancia: 13 }),
    arriba: () => Object.assign(orbita, { guinada: guinadaLabor, cabeceo: 1.5, distancia: 95 }),
  };
  function vista(nombre, x = cx, z = cz) {
    orbita.objetivo.set(x, terreno.alturaEn(x, z), z);
    VISTAS[nombre]();
    orbita.coloca();
  }
  vista('lejos');
  camara.fov = 50;
  camara.updateProjectionMatrix();

  // --- Muestrario: franjas a lo ancho de la parcela, cada una en un estado
  const nx = -ez;
  const nz = ex;
  let sMin = Infinity; let sMax = -Infinity; let tMin = Infinity; let tMax = -Infinity;
  for (const anillos of info.partes) for (const [x, z] of anillos[0]) {
    const s = (x - cx) * ex + (z - cz) * ez;
    const t = (x - cx) * nx + (z - cz) * nz;
    sMin = Math.min(sMin, s); sMax = Math.max(sMax, s); tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
  }
  const etiquetas = [];
  function muestrario() {
    limpia(parcela);
    etiquetas.length = 0;
    const anchoFranja = (tMax - tMin) / MUESTRARIO.length;
    MUESTRARIO.forEach((f, k) => {
      const t = tMin + (k + 0.5) * anchoFranja;
      const a = [cx + ex * (sMin - 3) + nx * t, cz + ez * (sMin - 3) + nz * t];
      const b = [cx + ex * (sMax + 3) + nx * t, cz + ez * (sMax + 3) + nz * t];
      for (const lab of f.labores) {
        const [labor, fuerza = 1, tramo = 1] = Array.isArray(lab) ? lab : [lab];
        const bb = [a[0] + (b[0] - a[0]) * tramo, a[1] + (b[1] - a[1]) * tramo];
        if (labor === 'rodar') {
          // Dos pasadas de tractor por la franja (cuatro huellas)
          for (const d of [-0.25, 0.25]) {
            const o = d * anchoFranja;
            pinta(parcela, labor, a[0] + nx * o, a[1] + nz * o, bb[0] + nx * o, bb[1] + nz * o, 2.3, { fuerza });
          }
        } else {
          pinta(parcela, labor, a[0], a[1], bb[0], bb[1], anchoFranja + 0.3, { fuerza });
        }
      }
      // Etiqueta en el punto de la franja más cercano al centro que caiga dentro de la parcela
      const desplaza = (k % 2 ? 1 : -1) * Math.min(12, (sMax - sMin) * 0.15);   // al tresbolillo
      for (let s = 0; s <= Math.max(sMax, -sMin); s += 2) {
        for (const sg of [desplaza + s, desplaza - s]) {
          const x = cx + ex * sg + nx * t;
          const z = cz + ez * sg + nz * t;
          if (registro.parcelaEn(x, z) === info) { etiquetas.push({ texto: f.nombre, x, z }); s = Infinity; break; }
        }
      }
    });
    parcela.sube(performance.now(), true);
    refrescaHierba();
    actualizaDatos();
  }

  // --- Panel
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.append(estilo);
  const titulo = document.createElement('div');
  titulo.id = 'agri-titulo';
  const uso = info.sigpac?.uso ?? '—';
  titulo.innerHTML = `🚜 Parcela ${info.ref}${info.paraje ? ` · ${info.paraje}` : ''} · ${info.superficie_ha.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ha`
    + `<small>${uso} · ${info.sigpac?.explotacion ?? ''} · pincel de pruebas de la fase A2</small>`;
  const panel = document.createElement('div');
  panel.id = 'agri-panel';
  panel.innerHTML = `
    <div class="fila labores">${LABORES.map((l, i) => `<button data-labor="${l.id}" title="${i + 1}">${l.icono} ${l.nombre}</button>`).join('')}</div>
    <div class="fila">
      <button data-modo title="Espacio">🖌️ Pintar</button>
      <span class="dato">Ancho</span><input type="range" min="${AGRICULTURA.pincel.anchoMinM}" max="${AGRICULTURA.pincel.anchoMaxM}" step="0.5" value="${AGRICULTURA.pincel.anchoInicialM}">
      <span class="dato" data-ancho></span>
    </div>
    <div class="fila vistas">
      <button data-vista="cerca" title="Cerca">🔍<span> Cerca</span></button><button data-vista="lejos" title="Lejos">🔭<span> Lejos</span></button><button data-vista="arriba" title="Arriba">⬆️<span> Arriba</span></button>
      <button data-muestrario title="Muestrario">🧪<span> Muestrario</span></button><button data-limpia title="Limpiar">🧹<span> Limpiar</span></button><button data-cierra title="Cerrar">✖</button>
    </div>
    <div class="fila dato" data-recuento></div>`;
  document.body.append(titulo, panel);
  const $ = (s) => panel.querySelector(s);
  const $$ = (s) => panel.querySelectorAll(s);
  let labor = 'arar';
  let ancho = AGRICULTURA.pincel.anchoInicialM;
  let pintando = true;        // 🖌️ pinta con un dedo o el botón izquierdo; ✋ mueve la cámara
  const marcaLabor = () => $$('[data-labor]').forEach((b) => b.classList.toggle('activo', b.dataset.labor === labor));
  const marcaModo = () => { $('[data-modo]').textContent = pintando ? '🖌️ Pintar' : '✋ Mover'; $('[data-modo]').classList.toggle('activo', pintando); };
  const marcaAncho = () => { $('[data-ancho]').textContent = `${ancho.toLocaleString('es-ES')} m`; };
  marcaLabor(); marcaModo(); marcaAncho();
  $$('[data-labor]').forEach((b) => b.addEventListener('click', () => { labor = b.dataset.labor; marcaLabor(); }));
  $('[data-modo]').addEventListener('click', () => { pintando = !pintando; marcaModo(); });
  $('input[type=range]').addEventListener('input', (e) => { ancho = Number(e.target.value); marcaAncho(); });
  $$('[data-vista]').forEach((b) => b.addEventListener('click', () => vista(b.dataset.vista)));
  $('[data-muestrario]').addEventListener('click', muestrario);
  $('[data-limpia]').addEventListener('click', () => {
    limpia(parcela); etiquetas.length = 0; parcela.sube(performance.now(), true); refrescaHierba(); actualizaDatos();
  });
  $('[data-cierra]').addEventListener('click', () => {
    const p = new URLSearchParams(location.search);
    p.delete('agricultura');
    location.search = p.toString();
  });
  const NOMBRES = { arado: 'Arado', gradeado: 'Gradeado', abonado: 'Abonado', sembrado: 'Sembrado', regado: 'Mojado', cosechado: 'Cosechado', rodadas: 'Rodadas' };
  function actualizaDatos() {
    const r = parcela.recuento();
    $('[data-recuento]').textContent = Object.entries(NOMBRES).map(([k, n]) => `${n} ${r[k].toLocaleString('es-ES')} %`).join(' · ');
  }
  actualizaDatos();

  // --- Ratón y dedos sobre la escena
  const lienzo = renderer.domElement;
  const raton = new THREE.Vector2();
  const rayo = new THREE.Raycaster();
  // Punto del suelo bajo el puntero: rayo contra el plano de la cota y dos correcciones con el terreno
  function puntoSuelo(clientX, clientY) {
    const r = lienzo.getBoundingClientRect();
    raton.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(raton, camara);
    const { origin: o, direction: d } = rayo.ray;
    if (d.y > -1e-3) return null;
    let y = orbita.objetivo.y;
    let p = null;
    for (let i = 0; i < 4; i++) {
      const t = (y - o.y) / d.y;
      if (t < 0) return null;
      p = [o.x + d.x * t, o.z + d.z * t];
      y = terreno.alturaEn(p[0], p[1]);
    }
    return p;
  }
  const punteros = new Map();
  let anterior = null;
  let ultimoGesto = null;
  let cambiosDesdeHierba = false;
  function trazo(p) {
    if (!p) return;
    const [xa, za] = anterior ?? p;
    pinta(parcela, labor, xa, za, p[0], p[1], ancho);
    anterior = p;
    cambiosDesdeHierba = true;
  }
  function terminaTrazo() {
    if (!anterior) return;
    anterior = null;
    parcela.sube(performance.now(), true);
    if (cambiosDesdeHierba) { refrescaHierba(); cambiosDesdeHierba = false; }
    actualizaDatos();
  }
  const enPanel = (e) => e.target !== lienzo;
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  lienzo.addEventListener('pointerdown', (e) => {
    if (enPanel(e)) return;
    lienzo.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, boton: e.button });
    ultimoGesto = null;
    if (punteros.size === 1 && pintando && e.button === 0) trazo(puntoSuelo(e.clientX, e.clientY));
    else terminaTrazo();
  });
  lienzo.addEventListener('pointermove', (e) => {
    const antes = punteros.get(e.pointerId);
    if (!antes) return;
    const dx = e.clientX - antes.x;
    const dy = e.clientY - antes.y;
    antes.x = e.clientX; antes.y = e.clientY;
    if (punteros.size >= 2) {
      // Dos dedos: pellizco para acercar y arrastre para desplazar
      const [a, b] = [...punteros.values()];
      const gesto = { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (ultimoGesto) {
        orbita.distancia *= ultimoGesto.d / Math.max(gesto.d, 1);
        const escala = orbita.distancia / 600;
        orbita.desplaza(-(gesto.x - ultimoGesto.x) * escala, -(gesto.y - ultimoGesto.y) * escala);
      }
      ultimoGesto = gesto;
      return;
    }
    if (pintando && antes.boton === 0) { trazo(puntoSuelo(e.clientX, e.clientY)); return; }
    if (antes.boton === 1 || (e.shiftKey && antes.boton === 0)) {
      const escala = orbita.distancia / 600;
      orbita.desplaza(-dx * escala, -dy * escala);
    } else {
      orbita.guinada -= dx * 0.006;
      orbita.cabeceo += dy * 0.005;
    }
  });
  const suelta = (e) => {
    punteros.delete(e.pointerId);
    if (punteros.size < 2) ultimoGesto = null;
    if (punteros.size === 0) terminaTrazo();
  };
  lienzo.addEventListener('pointerup', suelta);
  lienzo.addEventListener('pointercancel', suelta);
  lienzo.addEventListener('wheel', (e) => { e.preventDefault(); orbita.distancia *= Math.exp(e.deltaY * 0.0012); }, { passive: false });
  lienzo.style.touchAction = 'none';
  window.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= LABORES.length) { labor = LABORES[n - 1].id; marcaLabor(); }
    if (e.key === ' ') { pintando = !pintando; marcaModo(); e.preventDefault(); }
  });

  // --- Etiquetas del muestrario sobre la escena
  const capaEtiquetas = [];
  const v = new THREE.Vector3();
  function colocaEtiquetas() {
    while (capaEtiquetas.length < etiquetas.length) {
      const d = document.createElement('div');
      d.className = 'agri-etiqueta';
      document.body.append(d);
      capaEtiquetas.push(d);
    }
    const r = lienzo.getBoundingClientRect();
    camara.updateMatrixWorld();
    capaEtiquetas.forEach((d, k) => {
      const e = etiquetas[k];
      if (!e) { d.hidden = true; return; }
      v.set(e.x, terreno.alturaEn(e.x, e.z) + 0.5, e.z).project(camara);
      d.hidden = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05 || orbita.distancia < 25;
      d.textContent = e.texto;
      d.style.left = `${r.left + ((v.x + 1) / 2) * r.width}px`;
      d.style.top = `${r.top + ((1 - v.y) / 2) * r.height}px`;
    });
  }

  function actualiza() {
    orbita.coloca();
    if (sol) uSol.value.copy(sol.position).sub(sol.target.position).normalize();
    parcela.sube();
    colocaEtiquetas();
  }

  const agricultura = {
    registro, parcela, vista, muestrario, orbita, actualiza,
    pinta: (l, xa, za, xb, zb, a, op) => { const n = pinta(parcela, l, xa, za, xb, zb, a, op); parcela.sube(performance.now(), true); return n; },
    recuento: () => parcela.recuento(),
    etiquetas: () => etiquetas.map((e) => ({ ...e })),
  };
  if (import.meta.env.DEV) window.__agricultura = agricultura;
  return agricultura;
}
