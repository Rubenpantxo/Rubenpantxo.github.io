// Cabanillas Drive — arranque. Por defecto el juego; con ?visor, el visor de comprobación;
// con ?arboles, la galería de modelos de árbol; con ?personaje, solo el editor de personaje.
// Convención: 1 unidad = 1 m, Y arriba, norte = −Z.
import * as THREE from 'three';
import { CALIDAD } from './config/calidad.js';
import { CAMARA } from './config/camara.js';
import { ESCENA } from './config/escena.js';
import { cargaCielo, creaEntorno } from './escena/entorno.js';
import { configuraSombras, creaRender } from './escena/render.js';
import { creaCicloDia } from './escena/cicloDia.js';
import { creaPantallas } from './hud/pantallas.js';
import { vigilaDescargas } from './hud/progresoCarga.js';
import { iniciaJuego } from './juego/juego.js';
import { iniciaVisor } from './visor/visor.js';
import { iniciaVisorArboles } from './visor/visorArboles.js';

vigilaDescargas();   // antes de la primera descarga: la barra de inicio cuenta todos los bytes
const parametros = new URLSearchParams(location.search);
if (parametros.has('debug')) console.info(`[calidad] nivel ${CALIDAD.nivel}`, CALIDAD);
// ?personaje: solo el editor de personaje (?personaje=0, en cambio, se lo salta y carga el juego)
const soloPersonaje = parametros.has('personaje') && parametros.get('personaje') !== '0';
const esJuego = !parametros.has('visor') && !parametros.has('arboles') && !soloPersonaje;
const ui = {
  panel: document.getElementById('panel'),
  estado: document.getElementById('estado'),
  tactil: document.getElementById('tactil'),
  mostrarFps: parametros.has('debug'),
};
const estadoJuego = ui.estado;
let api = null;
let tactilVisible = false;
let pistaMostrada = false;
const pantallas = creaPantallas({
  alCambiar(estado) {
    const jugando = estado === 'jugando';
    if (jugando && !pistaMostrada && esJuego) muestraPista();
    api?.ponPausa(!jugando);
    // Los mandos táctiles solo con el juego en marcha (vuelven si ya se estaban usando)
    if (!jugando) {
      document.exitPointerLock?.();
      tactilVisible = tactilVisible || !ui.tactil.hidden;
      ui.tactil.hidden = true;
    } else if (tactilVisible) {
      ui.tactil.hidden = false;
    }
  },
});
// Al empezar a jugar, un recordatorio de dónde están los controles
function muestraPista() {
  if (!api) return;
  pistaMostrada = true;
  api.avisa(matchMedia('(pointer: coarse)').matches ? '☰: pausa y controles' : 'Esc: pausa y controles', 6);
}
if (esJuego) ui.estado = pantallas.textoCarga;   // durante la carga, el progreso va a la pantalla de inicio
else pantallas.omite();

const fallo = document.getElementById('fallo');
fallo.querySelectorAll('[data-recarga-fallo]').forEach((b) => b.addEventListener('click', () => {
  const p = new URLSearchParams(location.search);
  if (b.dataset.recargaFallo) p.set('calidad', b.dataset.recargaFallo);
  location.search = p.toString();
}));
function muestraFallo(titulo, texto, detalle = '') {
  document.getElementById('titulo-fallo').textContent = titulo;
  document.getElementById('fallo-texto').textContent = texto;
  document.getElementById('fallo-detalle').textContent = detalle;
  fallo.querySelector('[data-recarga-fallo="bajo"]').hidden = CALIDAD.nivel === 'bajo';
  fallo.hidden = false;
}

// Sin WebGL (o bloqueado: tras varios fallos de la gráfica, Chrome lo desactiva para la web
// hasta que se reinicia) no hay juego: se avisa en vez de dejar la carga parada en 0 MB
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('escena'), antialias: CALIDAD.antialias });
} catch (error) {
  muestraFallo('No se pueden mostrar gráficos 3D',
    'El navegador no deja usar WebGL. Si antes salió «Se ha perdido la imagen 3D», Chrome lo bloquea un tiempo '
    + 'para esta web: cierra Chrome del todo (también de las aplicaciones recientes) y vuelve a abrirlo.',
    String(error?.message ?? error));
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CALIDAD.pixelRatioMax));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.info.autoReset = false;   // se pone a cero una vez por fotograma (cuenta todas las pasadas)
renderer.toneMappingExposure = 0.75;
function nombreGpu() {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  } catch { return 'desconocida'; }
}
const gpu = nombreGpu();
// Las gráficas PowerVR (Pixel 10 y otros) pierden el contexto WebGL al dibujar con el mapa de
// sombras (fallo del controlador; three.js #34311): ahí se juega sin sombras 3D, que la
// ortofoto ya trae pintadas. ?sombras=0 o ?sombras=1 lo fuerza en cualquier gráfica.
const sombrasPedidas = parametros.get('sombras');
if (sombrasPedidas === '0' || (sombrasPedidas !== '1' && /PowerVR/i.test(gpu))) {
  CALIDAD.sombras = false;
  CALIDAD.sombrasEdificios = false;
}
if (parametros.has('debug')) console.info(`[render] gráfica ${gpu} · sombras ${CALIDAD.sombras ? 'sí' : 'no'}`);

// Si la GPU se queda sin memoria (varias pestañas con el juego, calidad alta en una gráfica
// justa, móviles) o falla su controlador, el navegador retira el contexto y el lienzo queda en
// blanco: se muestra una pantalla fija con el motivo, la gráfica y la fase (para diagnosticar)
// y botones de recarga. No se recarga sola al recuperar el contexto: sería un bucle.
let fase = 'cargando';
renderer.domElement.addEventListener('webglcontextlost', (ev) => {
  ev.preventDefault();
  muestraFallo('Se ha perdido la imagen 3D',
    'La gráfica o su controlador han fallado y el navegador ha retirado la imagen. Cierra otras pestañas '
    + 'o aplicaciones y recarga.',
    `Gráfica: ${gpu} · calidad ${CALIDAD.nivel} · sombras ${CALIDAD.sombras ? 'sí' : 'no'} · `
    + `al ${fase === 'cargando' ? 'cargar' : 'jugar'} · ${window.innerWidth}×${window.innerHeight} px × `
    + `${Math.round(window.devicePixelRatio * 100) / 100}` + (navigator.deviceMemory ? ` · ${navigator.deviceMemory} GB` : ''));
  api?.ponPausa(true);
  console.warn('[render] contexto WebGL perdido', gpu);
});

// Sol del día de la ortofoto (tools/10_sol.py); sin él, el de config/escena.js
const sol = await fetch(ESCENA.rutaSol).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const escena = new THREE.Scene();
const { luzSol, direccion } = creaEntorno(escena, ESCENA, sol);
// Móvil: niebla más cerca para recortar lo lejano (THREE.Fog usa near y far, no cerca y lejos)
if (CALIDAD.niebla && escena.fog) {
  escena.fog.near = CALIDAD.niebla.cerca;
  escena.fog.far = CALIDAD.niebla.lejos;
}
const camara = new THREE.PerspectiveCamera(
  CAMARA.persecucion.fov, window.innerWidth / window.innerHeight, CALIDAD.camaraCerca, CALIDAD.camaraLejos,
);

await cargaCielo(ESCENA.rutaCielo, renderer, escena, direccion, CALIDAD.cielo);
const render = creaRender(renderer, escena, camara, luzSol, CALIDAD);
if (import.meta.env.DEV) window.__render = render;
const ciclo = creaCicloDia({ escena, camara, luzSol, direccionRender: render.direccion, intensidadSol: ESCENA.sol.intensidad });
if (import.meta.env.DEV) window.__ciclo = ciclo;
pantallas.ponHoras(ciclo);
// Tamaño: se comprueba en cada fotograma (además del evento), porque si la página se abre en una
// pestaña oculta o un panel sin tamaño, el primer «resize» puede no llegar nunca
let tamanoAplicado = '';
function ajustaTamano() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h || `${w}x${h}` === tamanoAplicado) return;
  tamanoAplicado = `${w}x${h}`;
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
  renderer.setSize(w, h);
  render.redimensiona(w, h);
}
window.addEventListener('resize', ajustaTamano);
ajustaTamano();

// --- Editor de personaje (PLAN_PERSONAJE.md). Al empezar la sesión se elige la apariencia: se
// abre con «Crea tu personaje» (también mientras carga el pueblo) o al pulsar cualquier botón de
// jugar si aún no se ha hecho. Una vez en el juego no se vuelve a abrir. Comparte el renderer.
// ?personaje=0 lo salta (pruebas); al volver de otro juego (?aparece) tampoco sale.
let editor = null;
let saltoPendiente = null;
let personajeElegido = parametros.get('personaje') === '0' || Boolean(parametros.get('aparece'));
async function abrePersonaje(boton) {
  if (editor) return;
  document.body.classList.add('editando-personaje');
  const { abreEditor } = await import('./personaje/editor.js');
  try {
    editor = await abreEditor({
      renderer,
      progresoJuego: esJuego ? () => pantallas.progreso() : null,
      calidad: { sombras: CALIDAD.sombras, texturaMax: CALIDAD.texturaMax ?? 2048 },
    });
  } catch (error) {
    console.error('[personaje] no se pudo abrir el editor', error);
    document.body.classList.remove('editando-personaje');
    document.getElementById('editor-personaje')?.remove();
    editor = null;
    personajeElegido = true;
    return;
  }
  const apariencia = await editor.terminado;
  window.__aparienciaJugador = apariencia;
  if (!esJuego) return;
  personajeElegido = true;
  editor = null;
  document.body.classList.remove('editando-personaje');
  // El juego ya ha cargado (el botón del editor espera): se monta el jugador y se empieza
  await api?.ponJugador(apariencia);
  saltoPendiente?.();
  saltoPendiente = null;
  (boton ?? document.getElementById('jugar')).click();
}
if (esJuego) {
  document.getElementById('crear-personaje').addEventListener('click', () => abrePersonaje(null));
  // Antes que los manejadores de pantallas.js: sin personaje, primero el editor
  for (const id of ['jugar', 'jugar-calle', 'jugar-fiestas']) {
    document.getElementById(id).addEventListener('click', (e) => {
      if (personajeElegido) return;
      e.stopImmediatePropagation();
      abrePersonaje(e.currentTarget);
    }, { capture: true });
  }
} else {
  document.getElementById('crear-personaje').hidden = true;
}

const modo = parametros.has('visor') ? iniciaVisor : parametros.has('arboles') ? iniciaVisorArboles
  : soloPersonaje ? async () => { abrePersonaje(null); return { actualiza() {} }; } : iniciaJuego;
const reloj = new THREE.Clock();
let actualiza = () => {};

// Resolución dinámica: ventanas de 2 s; por debajo del objetivo baja la proporción de píxeles
// (hasta el mínimo de la calidad), y con margen de sobra la recupera poco a poco
const dinamica = CALIDAD.resolucionDinamica;
const proporcionMax = Math.min(window.devicePixelRatio, CALIDAD.pixelRatioMax);
let proporcion = proporcionMax;
let ventanaT = 0;
let ventanaN = 0;
function gobiernaResolucion(dtReal) {
  if (!dinamica || !esJuego || !api || api.pausado || document.hidden) {
    ventanaT = 0; ventanaN = 0;
    return;
  }
  ventanaT += dtReal;
  ventanaN++;
  if (ventanaT < 2) return;
  const fps = ventanaN / ventanaT;
  ventanaT = 0; ventanaN = 0;
  let nueva = proporcion;
  if (fps < dinamica.objetivoFps - 2) nueva = Math.max(dinamica.minimo * proporcionMax, proporcion - 0.1);
  else if (fps > dinamica.objetivoFps + 15) nueva = Math.min(proporcionMax, proporcion + 0.05);
  if (Math.abs(nueva - proporcion) > 1e-3) {
    proporcion = nueva;
    render.ponProporcionPixeles(proporcion);
  }
}
if (import.meta.env.DEV) window.__resolucion = () => proporcion;
ui.proporcionPixeles = () => proporcion / proporcionMax;

renderer.setAnimationLoop(() => {
  const dtReal = reloj.getDelta();
  const dt = Math.min(dtReal, 0.1);
  ajustaTamano();
  if (!tamanoAplicado) return;          // aún sin tamaño (panel oculto): no se dibuja
  renderer.info.reset();
  // Editor de personaje abierto: se dibuja su estudio (el juego espera en la pantalla de inicio)
  if (editor?.abierto) {
    editor.actualiza(dt);
    editor.render();
    return;
  }
  gobiernaResolucion(dtReal);
  actualiza(dt);
  ciclo.actualiza(dt);
  render.render();
});

modo({ renderer, escena, camara, ui, ciclo, render })
  .then((m) => {
    configuraSombras(escena);
    fase = 'jugando';
    actualiza = m.actualiza;
    if (esJuego) {
      api = m.api;
      ui.estado = estadoJuego;
      api.ponPausa(pantallas.estado !== 'jugando');
      if (pantallas.estado !== 'jugando') {          // la entrada táctil se acaba de mostrar: oculta hasta Jugar
        tactilVisible = tactilVisible || !ui.tactil.hidden;
        ui.tactil.hidden = true;
      }
      pantallas.ponLugares(api.lugares ?? [], (nombre) => api.irA(nombre));
      pantallas.ponFiestas((valor) => {
        if (valor === 'salir') return api.saleFiestas();
        if (valor === 'dejar') return api.fiestas.abandona();
        return api.entraFiestas(valor);
      }, (que) => (que === 'partida' ? Boolean(api.fiestas?.partida) : api.modoFiestas !== null));
      // Se empieza saltando del avión (PLAN_SALTO.md), salvo con ?salto=0, al entrar directo a las
      // fiestas o al volver de otro juego. ?salto=semilla repite la misma ruta. Desde la pantalla de
      // inicio, «Empezar en la calle» lo omite; en la pausa, «Saltarse el salto»
      if (parametros.get('salto') !== '0' && !parametros.get('fiestas') && !parametros.get('aparece')) {
        const semilla = Number.parseInt(parametros.get('salto'), 10);
        const arranca = () => api.empiezaSalto(Number.isFinite(semilla) ? semilla : undefined);
        // Con el editor pendiente, el salto espera al personaje (lo monta abrePersonaje)
        if (personajeElegido) arranca();
        else saltoPendiente = arranca;
      }
      pantallas.ponSalto(() => api.puedeOmitirSalto, () => api.omiteSalto());
      // Sin pasar por el editor (?personaje=0 o de vuelta de otro juego): el último personaje guardado
      if (personajeElegido) {
        import('./personaje/estado.js').then(({ cargaGuardada }) => {
          const guardada = cargaGuardada();
          if (guardada) api.ponJugador(guardada);
        });
      }
      window.addEventListener('cabanillas:inicioCalle', () => api.omiteSalto());
      // ?fiestas=plaza|calle|encierro entra directamente al modo
      if (parametros.get('fiestas')) api.entraFiestas(parametros.get('fiestas'));
      // Desde la pantalla de inicio, «Ir a las fiestas»
      window.addEventListener('cabanillas:inicioFiestas', () => api.entraFiestas('menu'));
      // ?aparece=<entrada>: de vuelta de otro juego (el frontón…), aparece allí
      if (parametros.get('aparece')) {
        api.aparece(parametros.get('aparece'));
        const p = new URLSearchParams(location.search);
        p.delete('aparece');
        history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
      }
      pantallas.listo();
    }
  })
  .catch((error) => {
    ui.estado.textContent = `Error: ${error.message}`;
    console.error(error);
  });
