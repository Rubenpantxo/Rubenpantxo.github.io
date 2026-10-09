/**
 * ESCENA 3D COMÚN DE LAS DEMOS
 *
 * Lo que comparten todas las escenas de las demos de negocio. Cada app pone su
 * objeto (la mesa, la báscula, la cesta…); esto pone lo que no cambia:
 *
 *   - renderer, cámara y una luz de estudio con reflejos (RoomEnvironment)
 *   - render bajo demanda: solo se pinta cuando algo se mueve
 *   - pausa fuera de pantalla y con la pestaña oculta
 *   - resolución adaptativa si el móvil no llega
 *   - pérdida de contexto WebGL y vuelta
 *   - los colores del sistema de diseño (--sd-*) como THREE.Color, y aviso
 *     cuando el selector cambia de sistema para repintar
 *   - si no hay WebGL, devuelve null y marca el contenedor con .sin-3d: la app
 *     sigue funcionando con su imagen de reserva
 *
 *   import { crearEscena, THREE } from './kit/escena.js';
 *   const e = crearEscena(canvas, {
 *     camara: { fov: 35, pos: [0, 4, 6], mira: [0, 0, 0] },
 *     alTema(c) { material.color.copy(c.acento); },
 *     cuadro(t, dt) { objeto.rotation.y += dt; return true; }  // true = sigue animando
 *   });
 *   e.pedir();   // un fotograma más (tras un cambio puntual)
 */
import * as THREE from '../../js/vendor/three/three.module.min.js';
import { RoomEnvironment } from '../../js/vendor/three/addons/RoomEnvironment.js';

export { THREE };

export const movimientoReducido = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- colores del sistema de diseño ---------- */
const TOKENS = {
  fondo: '--sd-bg', superficie: '--sd-surface', superficie2: '--sd-surface-2',
  tinta: '--sd-ink', apagado: '--sd-muted', acento: '--sd-accent',
  acentoFuerte: '--sd-accent-strong', acento2: '--sd-accent-2', linea: '--sd-line',
  ok: '--sd-ok', aviso: '--sd-warn', peligro: '--sd-danger', sobreAcento: '--sd-on-accent'
};

let sonda = null;
// Un custom property puede valer "color-mix(...)" o "var(...)": se deja que el
// navegador lo resuelva pintándolo en un elemento y leyendo el color final.
function resolver(variable) {
  if (!sonda) {
    sonda = document.createElement('i');
    sonda.setAttribute('aria-hidden', 'true');
    sonda.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(sonda);
  }
  sonda.style.color = `var(${variable}, #888)`;
  return getComputedStyle(sonda).color;
}

export function colorCSS(texto) {
  const c = new THREE.Color();
  const m = texto.match(/[\d.]+/g);
  if (!m) return c.set('#888');
  if (texto.startsWith('color(')) {
    // color(srgb r g b) con canales 0..1
    c.setRGB(+m[0], +m[1], +m[2], THREE.SRGBColorSpace);
  } else {
    c.setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace);
  }
  return c;
}

export function leerTokens() {
  const r = {};
  for (const [k, v] of Object.entries(TOKENS)) r[k] = colorCSS(resolver(v));
  // banda oscura o clara: la luminancia del fondo decide la exposición
  r.oscuro = r.fondo.r * 0.2126 + r.fondo.g * 0.7152 + r.fondo.b * 0.0722 < 0.18;
  return r;
}

/* ---------- la escena ---------- */
export function crearEscena(lienzo, op = {}) {
  const caja = op.contenedor || lienzo.parentElement;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: lienzo,
      antialias: op.antialias !== false,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
  } catch (err) {
    caja.classList.add('sin-3d');
    return null;
  }
  caja.classList.add('con-3d');

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = op.exposicion ?? 1;
  renderer.setClearColor(0x000000, 0);
  if (op.sombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const scene = new THREE.Scene();
  const cam = op.camara || {};
  const camera = cam.orto
    ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
    : new THREE.PerspectiveCamera(cam.fov ?? 35, 1, cam.cerca ?? 0.1, cam.lejos ?? 200);
  camera.position.set(...(cam.pos || [0, 3, 6]));
  const mira = new THREE.Vector3(...(cam.mira || [0, 0, 0]));
  camera.lookAt(mira);

  // Estudio: reflejos suaves para que plástico, cristal y metal se lean como tales
  if (op.entorno !== false) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = op.entornoIntensidad ?? 0.9;
    pmrem.dispose();
  }

  // Luz principal con sombra opcional
  const sol = new THREE.DirectionalLight(0xffffff, op.luz ?? 1.6);
  sol.position.set(...(op.solPos || [3, 6, 4]));
  if (op.sombras) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.02;
    const s = op.sombraTam ?? 4;
    Object.assign(sol.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 30 });
  }
  scene.add(sol);
  const ambiente = new THREE.HemisphereLight(0xffffff, 0x444444, op.ambiente ?? 0.5);
  scene.add(ambiente);

  /* ---------- tamaño y resolución ---------- */
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  const dprMax = Math.min(window.devicePixelRatio || 1, op.dprMax ?? (tactil ? 1.75 : 2));
  let dpr = dprMax;
  let ancho = 1, alto = 1;

  function ajustar() {
    const r = lienzo.getBoundingClientRect();
    ancho = Math.max(1, Math.round(r.width));
    alto = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(ancho, alto, false);
    const asp = ancho / alto;
    if (camera.isPerspectiveCamera) {
      camera.aspect = asp;
      // En vertical se abre el campo para que el objeto no se salga por los lados
      if (cam.fovVertical && asp < 1) camera.fov = cam.fovVertical;
      else if (cam.fov) camera.fov = cam.fov;
    } else {
      const h = (cam.alto ?? 4) / 2;
      Object.assign(camera, { left: -h * asp, right: h * asp, top: h, bottom: -h });
    }
    camera.updateProjectionMatrix();
    op.alAjustar?.(ancho, alto);
    pedir();
  }
  const ro = new ResizeObserver(ajustar);
  ro.observe(lienzo);

  /* ---------- tema ---------- */
  let tokens = leerTokens();
  const aplicarTema = () => {
    tokens = leerTokens();
    op.alTema?.(tokens);
    pedir();
  };
  const mo = new MutationObserver(() => requestAnimationFrame(aplicarTema));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-paleta', 'data-tipo', 'data-elem', 'data-modo'] });

  /* ---------- bucle bajo demanda ---------- */
  let visible = true, oculto = document.hidden, pendiente = 0, raf = 0, ultimo = 0, extra = 0;
  const reloj = { t: 0 };
  let lentos = 0, muestras = 0;

  function cuadro(ahora) {
    raf = 0;
    const dt = Math.min(0.05, ultimo ? (ahora - ultimo) / 1000 : 0.016);
    ultimo = ahora;
    reloj.t += dt;
    const seguir = op.cuadro ? op.cuadro(reloj.t, dt) : false;
    const t0 = performance.now();
    renderer.render(scene, camera);
    // Resolución adaptativa: si 40 fotogramas seguidos van lentos, se baja
    if (op.adaptativo !== false && seguir) {
      muestras++;
      if (dt > 0.03 || performance.now() - t0 > 22) lentos++;
      if (muestras >= 40) {
        if (lentos > 26 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); ajustar(); }
        muestras = lentos = 0;
      }
    }
    if (pendiente > 0) pendiente--;
    if ((seguir || pendiente > 0 || extra > performance.now()) && visible && !oculto) {
      raf = requestAnimationFrame(cuadro);
    } else {
      ultimo = 0;
    }
  }

  function pedir(fotogramas = 1) {
    pendiente = Math.max(pendiente, fotogramas);
    if (!raf && visible && !oculto) raf = requestAnimationFrame(cuadro);
  }
  // Mantiene el bucle vivo un rato (tras un gesto, mientras se asienta un muelle…)
  function animarDurante(ms) {
    extra = Math.max(extra, performance.now() + ms);
    pedir();
  }

  const io = new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) pedir();
  }, { threshold: 0 });
  io.observe(lienzo);
  const alVisibilidad = () => { oculto = document.hidden; if (!oculto) pedir(); };
  document.addEventListener('visibilitychange', alVisibilidad);

  /* ---------- contexto perdido ---------- */
  lienzo.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    cancelAnimationFrame(raf); raf = 0;
    caja.classList.add('sin-3d');
  });
  lienzo.addEventListener('webglcontextrestored', () => {
    caja.classList.remove('sin-3d');
    ajustar();
  });

  /* ---------- puntero y raycast ---------- */
  const rayo = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function puntero(ev) {
    const r = lienzo.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    return ndc;
  }
  function tocar(ev, objetos, recursivo = true) {
    rayo.setFromCamera(puntero(ev), camera);
    return rayo.intersectObjects(objetos, recursivo)[0] || null;
  }
  // Proyecta un punto 3D a píxeles del lienzo (para pegar etiquetas HTML)
  const tmp = new THREE.Vector3();
  function aPantalla(v) {
    tmp.copy(v).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * ancho, y: (-tmp.y * 0.5 + 0.5) * alto, detras: tmp.z > 1 };
  }

  function destruir() {
    cancelAnimationFrame(raf);
    ro.disconnect(); io.disconnect(); mo.disconnect();
    document.removeEventListener('visibilitychange', alVisibilidad);
    renderer.dispose();
  }

  ajustar();
  queueMicrotask(aplicarTema);

  return {
    THREE, renderer, scene, camera, sol, ambiente, mira, reloj,
    get tokens() { return tokens; },
    get tam() { return { ancho, alto }; },
    pedir, animarDurante, ajustar, tocar, puntero, aPantalla, destruir,
    reducido: movimientoReducido()
  };
}

/* ---------- utilidades de material ----------
   Materiales que se repiten en casi todos los oficios. */
export function material(tipo, color, extra = {}) {
  const base = { color };
  switch (tipo) {
    case 'ceramica': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, ...extra });
    case 'metal': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.32, metalness: 1, ...extra });
    case 'cristal': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.05, transmission: 1, thickness: 0.4, ior: 1.45, transparent: true, ...extra });
    case 'madera': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.7, metalness: 0, ...extra });
    case 'tela': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.9, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, ...extra });
    case 'plastico': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.4, clearcoat: 0.3, ...extra });
    default: return new THREE.MeshStandardMaterial({ ...base, roughness: 0.6, ...extra });
  }
}

// Sombra de contacto barata: un disco con degradado radial bajo el objeto
export function sombraContacto(radio = 1, opacidad = 0.35) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(0,0,0,${opacidad})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radio * 2, radio * 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

// Textura de texto para etiquetas, precios o rótulos dentro de la escena
export function texturaTexto(texto, { ancho = 512, alto = 128, fuente = '700 64px system-ui', color = '#111', fondo = null, alinear = 'center' } = {}) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const g = c.getContext('2d');
  if (fondo) { g.fillStyle = fondo; g.fillRect(0, 0, ancho, alto); }
  g.font = fuente;
  g.fillStyle = color;
  g.textAlign = alinear;
  g.textBaseline = 'middle';
  g.fillText(texto, alinear === 'center' ? ancho / 2 : alinear === 'left' ? 16 : ancho - 16, alto / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
