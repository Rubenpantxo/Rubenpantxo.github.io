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
import { crearEscena, THREE, material, texturaTexto } from '../servicios/kit/escena.js';
import { RoundedBoxGeometry } from './vendor/three/addons/RoundedBoxGeometry.js';

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

  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const resplandor = (color, tam) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(tam);
    return s;
  };

  const FABRICAS = {
    // Filamento incandescente dentro de una bombilla
    halogeno() {
      const g = new THREE.Group();
      const perfil = [[0.16, -0.62], [0.18, -0.5], [0.2, -0.36], [0.34, -0.18], [0.5, 0.02], [0.56, 0.22], [0.52, 0.44], [0.38, 0.62], [0.18, 0.72], [0.001, 0.75]];
      // El perfil pasa por una spline para que el cristal no salga facetado
      const suave = new THREE.SplineCurve(perfil.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(64);
      const vidrio = new THREE.Mesh(new THREE.LatheGeometry(suave, 64),
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
      const pts = [];
      for (let k = 0; k <= 16; k++) pts.push(new THREE.Vector3(-0.22 + k * 0.0275, 0.2 + (k % 2 ? 0.08 : -0.08), 0));
      const filamento = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, -0.3, 0), ...pts, new THREE.Vector3(0.12, -0.3, 0)]), 120, 0.012, 6),
        new THREE.MeshBasicMaterial({ color: '#e9ffb8' }));
      const rosca = new THREE.Group();
      const metal = material('metal', '#c9ccc4', { roughness: 0.3 });
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 32), metal);
      cuerpo.position.y = -0.78;
      rosca.add(cuerpo);
      for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.018, 8, 32), metal); t.rotation.x = Math.PI / 2; t.position.y = -0.68 - k * 0.07; rosca.add(t); }
      const punta = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8), material('default', '#1a1a1a'));
      punta.position.y = -0.95;
      const brillo = resplandor('#c6ff5c', 2.6); brillo.position.y = 0.2;
      g.add(vidrio, filamento, rosca, punta, brillo);
      g.userData.vivo = (t, act) => {
        const k = act ? 0.85 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.04 : 0.45;
        brillo.material.opacity = k;
      };
      return g;
    },
    // Baldosa de barro con un botón hundido
    terracota() {
      const g = new THREE.Group();
      const baldosa = new THREE.Mesh(new RoundedBoxGeometry(1.35, 1.35, 0.24, 5, 0.08), material('default', '#b34a1f', { roughness: 0.88 }));
      const boton = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 48), material('ceramica', '#fdf6ec', { roughness: 0.5 }));
      boton.rotation.x = Math.PI / 2; boton.position.z = 0.15;
      const hueco = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 10, 48), material('default', '#7d3112', { roughness: 0.9 }));
      hueco.position.z = 0.12;
      g.add(baldosa, boton, hueco);
      g.userData.vivo = (t, act) => { boton.position.z = 0.15 - (act ? Math.max(0, Math.sin(t * 2.2)) * 0.07 : 0); };
      return g;
    },
    // Cartel de papel con la esquina levantada
    editorial() {
      const c = document.createElement('canvas'); c.width = 512; c.height = 700;
      const x = c.getContext('2d');
      const pintar = () => {
        x.fillStyle = '#fafafa'; x.fillRect(0, 0, 512, 700);
        x.fillStyle = '#111114'; x.font = '400 300px Anton, Impact, sans-serif'; x.textBaseline = 'top';
        x.fillText('Aa', 18, 40);
        x.fillStyle = '#e7335a'; x.fillRect(0, 380, 512, 58);
        x.fillStyle = '#111114'; x.font = '700 34px Archivo, Arial, sans-serif';
        x.fillText('EDICIÓN Nº 03', 24, 470);
        for (let k = 0; k < 5; k++) x.fillRect(24, 530 + k * 26, 300 + (k % 2) * 120, 9);
      };
      pintar();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      document.fonts?.ready.then(() => { pintar(); tex.needsUpdate = true; e.pedir(); });
      const geo = new THREE.PlaneGeometry(1.15, 1.58, 24, 32);
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const px = pos.getX(k), py = pos.getY(k);
        const curl = Math.max(0, px + py - 0.9);
        pos.setZ(k, Math.sin(px * 2.2) * 0.05 + curl * curl * 0.9);
      }
      geo.computeVertexNormals();
      const papel = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
      const g = new THREE.Group(); g.add(papel);
      return g;
    },
    // Bloque neobrutal con su sombra dura de tinta
    carmin() {
      const g = new THREE.Group();
      const frente = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.28, 2, 0.02), material('default', '#a4262c', { roughness: 0.55 }));
      const sombra = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.28, 2, 0.02), material('default', '#1d1412', { roughness: 0.9 }));
      sombra.position.set(0.16, -0.16, -0.18);
      const borde = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25, 1.25, 0.28)), new THREE.LineBasicMaterial({ color: '#1d1412' }));
      const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5),
        new THREE.MeshBasicMaterial({ map: texturaTexto('¡YA!', { ancho: 512, alto: 256, fuente: '700 170px "Space Grotesk", Arial, sans-serif', color: '#fbf7f1' }), transparent: true }));
      rotulo.position.z = 0.145;
      g.add(sombra, frente, borde, rotulo);
      g.userData.vivo = (t, act) => {
        const k = act ? (Math.sin(t * 2.4) > 0.7 ? 1 : 0) : 0;
        frente.position.set(k * 0.16, -k * 0.16, 0); borde.position.copy(frente.position); rotulo.position.set(k * 0.16, -k * 0.16, 0.145);
      };
      return g;
    },
    // Marciano de 8 bits hecho de vóxeles
    neon() {
      const MAPA = [
        '..X.....X..',
        '...X...X...',
        '..XXXXXXX..',
        '.XX.XXX.XX.',
        'XXXXXXXXXXX',
        'X.XXXXXXX.X',
        'X.X.....X.X',
        '...XX.XX...'
      ];
      const celdas = [];
      MAPA.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch === 'X') celdas.push([x, y]); }));
      const lado = 0.12;
      const malla = new THREE.InstancedMesh(new RoundedBoxGeometry(lado * 0.92, lado * 0.92, lado * 0.92, 1, 0.01), new THREE.MeshBasicMaterial(), celdas.length);
      const m = new THREE.Matrix4(), col = new THREE.Color();
      const tonos = ['#c8f04c', '#38e1d4', '#ff3fa4'];
      celdas.forEach(([x, y], k) => {
        m.makeTranslation((x - 5) * lado, (3.5 - y) * lado, 0);
        malla.setMatrixAt(k, m);
        malla.setColorAt(k, col.set(tonos[y < 3 ? 0 : y < 6 ? 1 : 2]));
      });
      const g = new THREE.Group();
      g.add(malla, resplandor('#8a5cff', 2.6));
      g.userData.vivo = (t, act) => { malla.position.y = act ? (Math.floor(t * 2) % 2) * 0.05 : 0; };
      return g;
    },
    // Placa de vidrio esmerilado con dos luces detrás
    savia() {
      const g = new THREE.Group();
      const vidrio = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.45, 0.14, 4, 0.06),
        new THREE.MeshPhysicalMaterial({ color: '#f4f7f4', roughness: 0.42, transmission: 1, thickness: 0.6, ior: 1.42, transparent: true }));
      const verde = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16), new THREE.MeshBasicMaterial({ color: '#1f9d55' }));
      const naranja = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 16), new THREE.MeshBasicMaterial({ color: '#e67e22' }));
      verde.position.set(-0.22, 0.25, -0.45); naranja.position.set(0.25, -0.28, -0.45);
      g.add(verde, naranja, vidrio);
      g.userData.vivo = (t, act) => {
        const v = act ? 1 : 0.3;
        verde.position.x = -0.22 + Math.sin(t * 0.9) * 0.18 * v; verde.position.y = 0.25 + Math.cos(t * 0.7) * 0.12 * v;
        naranja.position.x = 0.25 + Math.cos(t * 0.8) * 0.16 * v; naranja.position.y = -0.28 + Math.sin(t * 1.1) * 0.12 * v;
      };
      return g;
    },
    // Arcilla blanda que respira
    organico() {
      const geo = new THREE.SphereGeometry(0.66, 96, 64);
      const base = geo.attributes.position.array.slice();
      const malla = new THREE.Mesh(geo, material('default', '#7a8a5e', { roughness: 0.92 }));
      const guijarro = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), material('default', '#e9dcc3', { roughness: 0.95 }));
      guijarro.scale.set(1, 0.7, 0.9); guijarro.position.set(0.55, -0.5, 0.25);
      const deformar = t => {
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = base[k * 3], y = base[k * 3 + 1], z = base[k * 3 + 2];
          const n = Math.sin(x * 3.1 + t) * 0.06 + Math.sin(y * 2.7 + t * 1.3) * 0.07 + Math.sin(z * 3.7 - t * 0.8) * 0.05;
          const f = 1 + n;
          p.setXYZ(k, x * f, y * f * 0.94, z * f);
        }
        p.needsUpdate = true;
        geo.computeVertexNormals();
      };
      deformar(0);
      const g = new THREE.Group(); g.add(malla, guijarro);
      let ultimo = 0;
      g.userData.vivo = (t, act) => { if (act && t - ultimo > 1 / 30) { deformar(t * 0.8); ultimo = t; } };
      return g;
    },
    // Marco dorado sobre tinta profunda
    clasico() {
      const g = new THREE.Group();
      const oro = material('metal', '#d4ae62', { roughness: 0.26 });
      const W = 1.2, H = 1.5, a = 0.13;
      [[0, H / 2, W + a, a], [0, -H / 2, W + a, a], [-W / 2, 0, a, H + a], [W / 2, 0, a, H + a]].forEach(([x, y, w, h]) => {
        const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.12, 3, 0.04), oro); b.position.set(x, y, 0); g.add(b);
      });
      const c = document.createElement('canvas'); c.width = 400; c.height = 500;
      const x = c.getContext('2d');
      const pintar = () => {
        x.fillStyle = '#14110d'; x.fillRect(0, 0, 400, 500);
        x.strokeStyle = '#c9a255'; x.lineWidth = 2; x.strokeRect(22, 22, 356, 456); x.strokeRect(30, 30, 340, 440);
        x.fillStyle = '#e9cf95'; x.font = 'italic 600 300px "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('C', 200, 240);
      };
      pintar();
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      document.fonts?.ready.then(() => { pintar(); tex.needsUpdate = true; e.pedir(); });
      const lienzoC = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
      lienzoC.position.z = -0.02;
      g.add(lienzoC);
      return g;
    },
    // Pieza mecanizada en acero cepillado, con su cota
    industrial() {
      const forma = new THREE.Shape();
      const w = 1.3, h = 0.9, r = 0.06;
      forma.moveTo(-w / 2 + r, -h / 2); forma.lineTo(w / 2 - r, -h / 2); forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      forma.lineTo(w / 2, h / 2 - r); forma.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); forma.lineTo(-w / 2 + r, h / 2);
      forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); forma.lineTo(-w / 2, -h / 2 + r); forma.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      [[-0.4, 0.2], [0.4, 0.2]].forEach(([cx, cy]) => { const a = new THREE.Path(); a.absarc(cx, cy, 0.11, 0, Math.PI * 2, true); forma.holes.push(a); });
      const ranura = new THREE.Path();
      ranura.moveTo(-0.3, -0.25); ranura.lineTo(0.3, -0.25); ranura.absarc(0.3, -0.17, 0.08, -Math.PI / 2, Math.PI / 2, false); ranura.lineTo(-0.3, -0.09); ranura.absarc(-0.3, -0.17, 0.08, Math.PI / 2, Math.PI * 1.5, false);
      forma.holes.push(ranura);
      const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 32 });
      geo.center();
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#9aa1a8'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 40},${Math.random() > 0.5 ? 255 : 40},${Math.random() > 0.5 ? 255 : 40},${Math.random() * 0.08})`; x.fillRect(0, Math.random() * 256, 256, 1); }
      const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const pieza = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#c3c8cd', metalness: 0.92, roughness: 0.36, roughnessMap: tex, map: tex }));
      const azul = new THREE.LineBasicMaterial({ color: '#7fa6cf' });
      const cota = new THREE.Group();
      const ln = (a, b) => cota.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), azul));
      ln([-0.65, -0.66, 0], [0.65, -0.66, 0]); ln([-0.65, -0.58, 0], [-0.65, -0.74, 0]); ln([0.65, -0.58, 0], [0.65, -0.74, 0]);
      ln([-0.65, -0.66, 0], [-0.57, -0.62, 0]); ln([-0.65, -0.66, 0], [-0.57, -0.70, 0]); ln([0.65, -0.66, 0], [0.57, -0.62, 0]); ln([0.65, -0.66, 0], [0.57, -0.70, 0]);
      const etq = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto('130', { ancho: 256, alto: 96, fuente: '600 72px "Barlow Condensed", Arial, sans-serif', color: '#9ec2e8' }), transparent: true, depthTest: false }));
      etq.scale.set(0.5, 0.19, 1); etq.position.set(0, -0.8, 0);
      cota.add(etq);
      const g = new THREE.Group(); g.add(pieza, cota);
      return g;
    }
  };

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
