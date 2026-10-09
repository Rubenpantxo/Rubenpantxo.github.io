/**
 * PORTADA DE LOS SISTEMAS DE DISEÑO
 *
 *   1. La vitrina: un carrusel 3D con un material por sistema. El que queda
 *      delante tiñe la sección con su paleta y escribe su nombre con su letra.
 *   2. El catálogo: aparición escalonada y los detalles vivos de algunas
 *      tarjetas (la luz de Savia, la cota real de Industrial).
 *   3. El mezclador: los tres ejes aplicados en vivo a una pantalla de muestra.
 *
 * Todo sale de window.SD_CATALOGO (servicios/sistemas/tema-datos.js), así que
 * si el catálogo crece, la vitrina y el mezclador crecen solos.
 */
import { crearEscena, THREE, material } from '../servicios/kit/escena.js';
import { RoundedBoxGeometry } from './vendor/three/addons/RoundedBoxGeometry.js';
import { fabricas } from './sistemas-materiales.js';

const CAT = window.SD_CATALOGO;
const $ = id => document.getElementById(id);
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dos = n => String(n).padStart(2, '0');
const buscar = (lista, id) => CAT[lista].find(x => x.id === id);

const PRESETS = CAT.presets;
// La demo donde mejor luce cada sistema
const DEMO = {
  halogeno: 'logistica', terracota: 'bar-restaurante', editorial: 'tienda-ropa', carmin: 'carniceria',
  neon: 'gimnasio', savia: 'supermercado', organico: 'granja', clasico: 'bar-restaurante', industrial: 'industria'
};
const conEjes = (pagina, p) => `${pagina}.html?paleta=${p.paleta}&tipo=${p.tipo}&elem=${p.elem}`;

/* ---------- fuentes de los sistemas, cuando hacen falta ---------- */
const puestas = new Set();
function fuente(tipoId) {
  const t = buscar('tipografias', tipoId);
  if (!t || !t.google || puestas.has(t.google)) return;
  puestas.add(t.google);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${t.google}&display=swap`;
  document.head.appendChild(l);
}
PRESETS.forEach(p => fuente(p.tipo));

/* =========================================================
   1 · LA VITRINA
   ========================================================= */
const vitrina = $('vitrina');
let activo = 0;

function pintarActivo(i, { animar = true } = {}) {
  activo = (i + PRESETS.length) % PRESETS.length;
  const p = PRESETS[activo];
  const pal = buscar('paletas', p.paleta);
  const tip = buscar('tipografias', p.tipo);
  const raiz = document.documentElement.style;
  raiz.setProperty('--pg-fondo', pal.fondo);
  raiz.setProperty('--pg-tinta', pal.tinta);
  raiz.setProperty('--pg-acento', pal.acento);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pal.fondo);

  const nombre = $('activo-nombre');
  const poner = () => {
    nombre.textContent = p.nombre;
    Object.assign(nombre.style, {
      fontFamily: tip.display, fontWeight: tip.peso, fontStyle: tip.estilo,
      letterSpacing: tip.tracking === '0' ? '-0.02em' : tip.tracking, textTransform: tip.caja
    });
    $('activo-titular').textContent = p.titular;
    $('activo-num').textContent = `${dos(activo + 1)} / ${dos(PRESETS.length)}`;
    $('activo-ficha').href = `sistemas/${p.ficha}`;
    $('activo-demo').href = conEjes(DEMO[p.id] || 'bar-restaurante', p);
    nombre.classList.remove('is-cambio');
  };
  if (animar && !reducido) { nombre.classList.add('is-cambio'); setTimeout(poner, 220); } else poner();

  [...$('puntos').children].forEach((b, k) => b.setAttribute('aria-current', k === activo));
  [...$('reserva').children].forEach((b, k) => b.setAttribute('aria-current', k === activo));
}

// Puntos y reserva sin WebGL: botones de verdad, también para teclado
$('puntos').replaceChildren(...PRESETS.map((p, k) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', p.nombre);
  b.addEventListener('click', () => ir(k));
  return b;
}));
$('reserva').replaceChildren(...PRESETS.map((p, k) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.style.setProperty('--c', buscar('paletas', p.paleta).acento);
  b.setAttribute('aria-label', p.nombre);
  b.addEventListener('click', () => ir(k));
  return b;
}));

let carrusel = null;
function ir(k) {
  pintarActivo(k);
  carrusel?.ir(k);
  pararAuto(9000);
}
$('ant').addEventListener('click', () => ir(activo - 1));
$('sig').addEventListener('click', () => ir(activo + 1));
vitrina.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); ir(activo - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); ir(activo + 1); }
});

// Avance solo, despacio, mientras nadie toque y la vitrina se vea
let auto = 0, pausaHasta = 0, vitrinaVisible = true;
function pararAuto(ms) { pausaHasta = performance.now() + ms; }
function programarAuto() {
  clearTimeout(auto);
  if (reducido) return;
  auto = setTimeout(() => {
    if (vitrinaVisible && !document.hidden && performance.now() > pausaHasta) {
      pintarActivo(activo + 1);
      carrusel?.ir(activo);
    }
    programarAuto();
  }, 6500);
}
new IntersectionObserver(([e]) => { vitrinaVisible = e.isIntersecting; }, { threshold: 0.35 }).observe(vitrina);

/* ---------- los nueve materiales ---------- */
function crearCarrusel() {
  const lienzo = $('lienzo');
  const caja = $('escena');
  const e = crearEscena(lienzo, {
    contenedor: caja,
    camara: { fov: 30, fovVertical: 46, pos: [0, 0.6, 8.2], mira: [0, -0.15, 0] },
    luz: 2.1, solPos: [3, 5, 6], ambiente: 0.6, exposicion: 1.05,
    cuadro: (t, dt) => paso(t, dt)
  });
  if (!e) return null;
  const { scene, camera } = e;
  scene.fog = new THREE.Fog(0x0a0a0f, 8.5, 14);

  const anillo = new THREE.Group();
  scene.add(anillo);
  const R = 3.7;
  const N = PRESETS.length;
  const paso0 = (Math.PI * 2) / N;

  const FABRICAS = fabricas(e);

  const piezas = PRESETS.map((p, k) => {
    const hacer = FABRICAS[p.id] || (() => new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.2, 1.2, 3, 0.1), material('default', buscar('paletas', p.paleta).acento)));
    const obj = hacer();
    const soporte = new THREE.Group();
    soporte.add(obj);
    soporte.userData.k = k;
    obj.traverse(o => { o.userData.k = k; });
    anillo.add(soporte);
    return { soporte, obj, escala: 0.8, giro: Math.random() * 6 };
  });

  // Giro del anillo con muelle; el arrastre lo mueve y al soltar se asienta
  let phi = 0, objetivo = 0, vel = 0, arrastrando = false, ultimoX = 0, velArrastre = 0, movido = 0;
  const angDe = k => -k * paso0;
  function ir(k) {
    // Por el camino más corto
    let destino = angDe(k);
    while (destino - phi > Math.PI) destino -= Math.PI * 2;
    while (destino - phi < -Math.PI) destino += Math.PI * 2;
    objetivo = destino;
    e.animarDurante(2200);
  }
  const masCercano = () => (((Math.round(-phi / paso0) % N) + N) % N);

  lienzo.addEventListener('pointerdown', ev => {
    arrastrando = true; ultimoX = ev.clientX; velArrastre = 0; movido = 0;
    lienzo.setPointerCapture(ev.pointerId);
    pararAuto(12000);
    e.animarDurante(60000);
  });
  lienzo.addEventListener('pointermove', ev => {
    if (!arrastrando) {
      if (ev.pointerType === 'mouse') {
        const hit = e.tocar(ev, piezas.map(p => p.soporte));
        lienzo.style.cursor = hit ? 'pointer' : '';
      }
      return;
    }
    const dx = ev.clientX - ultimoX; ultimoX = ev.clientX;
    movido += Math.abs(dx);
    const ancho = lienzo.clientWidth || 400;
    const d = (dx / ancho) * 2.6;
    phi += d; objetivo = phi; velArrastre = d;
    const k = masCercano();
    if (k !== activo) pintarActivo(k);
  });
  const soltar = ev => {
    if (!arrastrando) return;
    arrastrando = false;
    if (movido < 6) {
      const hit = e.tocar(ev, piezas.map(p => p.soporte));
      if (hit) {
        const k = hit.object.userData.k;
        if (k === activo) document.querySelector(`[data-sistema="${PRESETS[k].id}"] .esp`)?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
        else ir2(k);
        return;
      }
    }
    // inercia: proyecta el giro y se queda en el sistema más cercano
    const proy = phi + velArrastre * 9;
    const k = (((Math.round(-proy / paso0) % N) + N) % N);
    let destino = -Math.round(-proy / paso0) * paso0;
    objetivo = destino;
    pintarActivo(k);
    e.animarDurante(2500);
  };
  function ir2(k) { pintarActivo(k); ir(k); pararAuto(12000); }
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', () => { arrastrando = false; });

  // Paralaje con el ratón
  let mx = 0, my = 0, cmx = 0, cmy = 0;
  vitrina.addEventListener('pointermove', ev => {
    if (reducido || ev.pointerType !== 'mouse') return;
    mx = (ev.clientX / innerWidth - 0.5); my = (ev.clientY / innerHeight - 0.5);
    e.animarDurante(900);
  });

  const fondo = new THREE.Color();
  // En vertical el anillo se ve más estrecho: los objetos crecen un poco
  let escalaVista = 1;
  const medir = () => { escalaVista = lienzo.clientWidth < lienzo.clientHeight ? 0.92 : 0.76; };
  new ResizeObserver(medir).observe(lienzo);
  function paso(t, dt) {
    let vivo = !reducido; // los materiales tienen vida propia
    if (!arrastrando) {
      const f = -18 * (phi - objetivo) - 7.5 * vel;
      vel += f * dt; phi += vel * dt;
      if (Math.abs(phi - objetivo) > 1e-4 || Math.abs(vel) > 1e-4) vivo = true;
    } else vivo = true;
    cmx += (mx - cmx) * Math.min(1, dt * 4); cmy += (my - cmy) * Math.min(1, dt * 4);
    camera.position.x = cmx * 1.2; camera.position.y = 0.6 - cmy * 0.6;
    camera.lookAt(0, -0.15, 0);

    // Color de niebla = fondo actual de la vitrina, para que lo lejano se funda
    const css = getComputedStyle(document.documentElement).getPropertyValue('--pg-fondo').trim();
    if (css) { fondo.set(css); scene.fog.color.copy(fondo); }

    piezas.forEach((p, k) => {
      const a = k * paso0 + phi;
      p.soporte.position.set(Math.sin(a) * R * 1.02, -0.22, Math.cos(a) * R - R * 0.5);
      const frente = Math.max(0, Math.cos(a));
      const act = k === activo;
      const meta = (act ? 0.98 : 0.56 + frente * 0.12) * escalaVista;
      p.escala += (meta - p.escala) * Math.min(1, dt * 6);
      p.soporte.scale.setScalar(p.escala);
      if (!reducido) {
        p.giro += dt * (act ? 0.55 : 0.18);
        p.obj.rotation.y = Math.sin(p.giro) * (act ? 0.55 : 0.35) + (act ? cmx * 0.6 : 0);
        p.obj.position.y = Math.sin(t * 1.1 + k) * 0.06;
      }
      p.obj.userData.vivo?.(t, act && !reducido);
      if (Math.abs(meta - p.escala) > 0.002) vivo = true;
    });
    return vivo && vitrinaVisible;
  }

  caja.classList.add('is-listo');
  ir(0);
  return { ir };
}

/* =========================================================
   2 · EL CATÁLOGO
   ========================================================= */
const tarjetas = [...document.querySelectorAll('.catalogo > li')];
const vigia = new IntersectionObserver(ents => ents.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add('is-visto');
  en.target.querySelector('.esp')?.classList.add('is-visto');
  vigia.unobserve(en.target);
}), { threshold: 0.15 });
tarjetas.forEach(li => vigia.observe(li));

// Savia: la luz sigue al puntero
document.querySelectorAll('[data-sistema="savia"] .esp').forEach(t => {
  t.addEventListener('pointermove', ev => {
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
    t.style.setProperty('--my', ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
  });
  t.addEventListener('pointerleave', () => { t.style.setProperty('--mx', 0); t.style.setProperty('--my', 0); });
});

// Industrial: la cota dice el ancho real de la tarjeta, en píxeles
document.querySelectorAll('[data-cota]').forEach(c => {
  const t = c.closest('.esp');
  new ResizeObserver(() => { c.textContent = `${Math.round(t.clientWidth - 44)} px`; }).observe(t);
});

/* =========================================================
   3 · EL MEZCLADOR
   ========================================================= */
const pantalla = $('pantalla');
const mezcla = { paleta: PRESETS[0].paleta, tipo: PRESETS[0].tipo, elem: PRESETS[0].elem };

function ficha(texto, extra = '') {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ficha ' + extra;
  b.setAttribute('aria-pressed', 'false');
  b.textContent = texto;
  return b;
}

$('m-presets').replaceChildren(...PRESETS.map(p => {
  const b = ficha(p.nombre);
  const pal = buscar('paletas', p.paleta);
  const bolas = document.createElement('span'); bolas.className = 'bolitas'; bolas.setAttribute('aria-hidden', 'true');
  [pal.acento, pal.fondo, pal.tinta].forEach(c => { const i = document.createElement('i'); i.style.background = c; bolas.appendChild(i); });
  b.prepend(bolas);
  b.dataset.preset = p.id;
  return b;
}));
$('m-paleta').replaceChildren(...CAT.paletas.map(p => {
  const b = ficha(p.nombre);
  const bolas = document.createElement('span'); bolas.className = 'bolitas'; bolas.setAttribute('aria-hidden', 'true');
  p.muestras.slice(0, 3).forEach(c => { const i = document.createElement('i'); i.style.background = c; bolas.appendChild(i); });
  b.prepend(bolas);
  b.dataset.v = p.id;
  return b;
}));
$('m-tipo').replaceChildren(...CAT.tipografias.map(t => {
  const b = ficha(t.muestra || t.nombre, 'ficha--tipo');
  b.style.fontFamily = t.display; b.style.fontWeight = t.peso; b.style.fontStyle = t.estilo;
  b.style.textTransform = t.caja; b.style.letterSpacing = t.tracking;
  b.title = t.nombre;
  b.setAttribute('aria-label', t.nombre);
  b.dataset.v = t.id;
  return b;
}));
$('m-elem').replaceChildren(...CAT.elementos.map(x => { const b = ficha(x.nombre); b.dataset.v = x.id; return b; }));

// Las fuentes del mezclador se piden al acercarse, no al cargar la página
new IntersectionObserver(([en], o) => {
  if (!en.isIntersecting) return;
  CAT.tipografias.forEach(t => fuente(t.id));
  o.disconnect();
}, { rootMargin: '400px' }).observe($('mezclador'));

function aplicarMezcla() {
  pantalla.dataset.paleta = mezcla.paleta;
  pantalla.dataset.tipo = mezcla.tipo;
  pantalla.dataset.elem = mezcla.elem;
  fuente(mezcla.tipo);
  const marcar = (id, v) => $(id).querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  marcar('m-paleta', mezcla.paleta); marcar('m-tipo', mezcla.tipo); marcar('m-elem', mezcla.elem);
  const pre = PRESETS.find(p => p.paleta === mezcla.paleta && p.tipo === mezcla.tipo && p.elem === mezcla.elem);
  $('m-presets').querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', b.dataset.preset === pre?.id));
  $('o-paleta').textContent = buscar('paletas', mezcla.paleta).nombre;
  $('o-tipo').textContent = buscar('tipografias', mezcla.tipo).nombre;
  $('o-elem').textContent = buscar('elementos', mezcla.elem).nombre;
  const q = `?paleta=${mezcla.paleta}&tipo=${mezcla.tipo}&elem=${mezcla.elem}`;
  $('m-abrir').href = `${$('m-demo').value}.html${q}`;
  $('m-config').href = `sistemas/configurador.html${q}`;
  if (!reducido) pantalla.animate([{ transform: 'scale(.985)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}
const alPulsar = (id, eje) => $(id).addEventListener('click', ev => {
  const b = ev.target.closest('[data-v]');
  if (!b) return;
  mezcla[eje] = b.dataset.v;
  aplicarMezcla();
});
alPulsar('m-paleta', 'paleta'); alPulsar('m-tipo', 'tipo'); alPulsar('m-elem', 'elem');
$('m-presets').addEventListener('click', ev => {
  const b = ev.target.closest('[data-preset]');
  if (!b) return;
  const p = PRESETS.find(x => x.id === b.dataset.preset);
  Object.assign(mezcla, { paleta: p.paleta, tipo: p.tipo, elem: p.elem });
  aplicarMezcla();
});
$('m-demo').addEventListener('change', aplicarMezcla);
$('m-azar').addEventListener('click', () => {
  const azar = l => l[Math.floor(Math.random() * l.length)].id;
  Object.assign(mezcla, { paleta: azar(CAT.paletas), tipo: azar(CAT.tipografias), elem: azar(CAT.elementos) });
  const d = $('m-azar');
  d.classList.remove('is-rueda'); void d.offsetWidth; d.classList.add('is-rueda');
  aplicarMezcla();
});
// La pantalla de muestra es de verdad: sus pestañas cambian
pantalla.querySelector('.sd-pestanas').addEventListener('click', ev => {
  const b = ev.target.closest('[role="tab"]');
  if (!b) return;
  b.parentElement.querySelectorAll('[role="tab"]').forEach(x => x.setAttribute('aria-selected', x === b));
});

/* ---------- navegación: sólida al salir de la vitrina ---------- */
const nav = $('nav');
new IntersectionObserver(([en]) => nav.classList.toggle('is-solida', !en.isIntersecting), { rootMargin: '-70px 0px 0px 0px' }).observe(vitrina);

/* ---------- arranque ---------- */
pintarActivo(0, { animar: false });
aplicarMezcla();
carrusel = crearCarrusel();
programarAuto();
