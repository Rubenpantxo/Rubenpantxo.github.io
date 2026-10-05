// Peatones: figuras genéricas que pasean por las aceras (config/peatones.js).
// - Caminos: cada tramo de calle OSM del casco urbano con su acera a cada lado (a media calzada
//   + media acera del centro, como el suelo de tools/11_suelo.py) y las sendas peatonales por
//   el centro. Un lado no se usa si choca con un edificio (Catastro).
// - Cada peatón sigue su acera; en los cruces elige otra calle y a veces cruza al otro lado.
//   Si un coche se le acerca rápido, se aparta; nunca se deja atropellar.
// - Dibujo: 5 mallas instanciadas para todos (piernas, brazos, cuerpo, cabeza, pelo) animadas
//   con el paso. Aparecen cerca del jugador y desaparecen lejos, como el tráfico.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { PEATONES } from '../config/peatones.js';

const CELDA = 10;
const clave = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
const claveCelda = (cx, cz) => `${cx},${cz}`;

function lineasDe(g) {
  if (!g) return [];
  if (g.type === 'LineString') return [g.coordinates];
  if (g.type === 'MultiLineString') return g.coordinates;
  return [];
}

function puntoEnAnillo(x, z, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, zi] = anillo[i];
    const [xj, zj] = anillo[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Índice de huellas de edificios en celdas de 10 m: ¿punto dentro? ¿hay alguno cerca?
function indiceEdificios(geo) {
  const celdas = new Map();
  for (const f of geo?.features ?? []) {
    const g = f.geometry;
    const anillos = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : [];
    for (const a of anillos) {
      let x0 = Infinity; let z0 = Infinity; let x1 = -Infinity; let z1 = -Infinity;
      for (const [x, z] of a) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
      const p = { a, x0, z0, x1, z1 };
      for (let cx = Math.floor(x0 / CELDA); cx <= Math.floor(x1 / CELDA); cx++) {
        for (let cz = Math.floor(z0 / CELDA); cz <= Math.floor(z1 / CELDA); cz++) {
          const k = claveCelda(cx, cz);
          if (!celdas.has(k)) celdas.set(k, []);
          celdas.get(k).push(p);
        }
      }
    }
  }
  const dentro = (x, z) => {
    for (const p of celdas.get(claveCelda(Math.floor(x / CELDA), Math.floor(z / CELDA))) ?? []) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (puntoEnAnillo(x, z, p.a)) return true;
    }
    return false;
  };
  const cerca = (x, z, r) => {
    for (let cx = Math.floor((x - r) / CELDA); cx <= Math.floor((x + r) / CELDA); cx++) {
      for (let cz = Math.floor((z - r) / CELDA); cz <= Math.floor((z + r) / CELDA); cz++) {
        for (const p of celdas.get(claveCelda(cx, cz)) ?? []) {
          const dx = Math.max(p.x0 - x, 0, x - p.x1);
          const dz = Math.max(p.z0 - z, 0, z - p.z1);
          if (dx * dx + dz * dz < r * r) return true;
        }
      }
    }
    return false;
  };
  return { dentro, cerca };
}

// Grafo no dirigido de aceras y sendas
function creaCaminos(calles, caminos, edificios) {
  const nodos = new Map();
  const aristas = [];
  const nodo = (x, z) => {
    const k = clave(x, z);
    if (!nodos.has(k)) nodos.set(k, { x, z, aristas: [] });
    return nodos.get(k);
  };
  // ¿Se puede andar por esta línea desplazada? (muestras cada 2 m, con margen de hombros)
  const libre = (a, dx, dz, largo, desplazamiento) => {
    const nx = -dz * desplazamiento;
    const nz = dx * desplazamiento;
    for (let s = 0.5; s <= largo - 0.5; s += 2) {
      const x = a.x + dx * s + nx;
      const z = a.z + dz * s + nz;
      if (edificios.dentro(x, z) || edificios.dentro(x + 0.35, z) || edificios.dentro(x - 0.35, z)
        || edificios.dentro(x, z + 0.35) || edificios.dentro(x, z - 0.35)) return false;
    }
    return true;
  };
  const une = (pa, pb, desplazamiento) => {
    const a = nodo(pa[0], pa[1]);
    const b = nodo(pb[0], pb[1]);
    const largo = Math.hypot(b.x - a.x, b.z - a.z);
    if (largo < 0.5) return;
    if (!edificios.cerca((a.x + b.x) / 2, (a.z + b.z) / 2, PEATONES.edificioCercaM)) return;   // fuera del pueblo
    const dx = (b.x - a.x) / largo;
    const dz = (b.z - a.z) / largo;
    // Lados: +1 a la izquierda de a→b (normal (−dz, dx)), −1 a la derecha; 0 = por el centro
    const lados = desplazamiento > 0
      ? [1, -1].filter((l) => libre(a, dx, dz, largo, l * desplazamiento))
      : (libre(a, dx, dz, largo, 0) ? [0] : []);
    if (!lados.length) return;
    const arista = { a, b, largo, dx, dz, desplazamiento, lados, mediaCalzada: Math.max(0, desplazamiento - PEATONES.mediaAceraM) };
    aristas.push(arista);
    a.aristas.push(arista);
    b.aristas.push(arista);
  };
  for (const f of calles?.features ?? []) {
    const media = PEATONES.mediaCalzadaM[f.properties.tipo];
    if (media === undefined) continue;
    const desplazamiento = media > 0 ? media + PEATONES.mediaAceraM : 0;
    for (const l of lineasDe(f.geometry)) for (let i = 0; i + 1 < l.length; i++) une(l[i], l[i + 1], desplazamiento);
  }
  for (const f of caminos?.features ?? []) {
    if (!PEATONES.sendas.includes(f.properties.tipo)) continue;
    for (const l of lineasDe(f.geometry)) for (let i = 0; i + 1 < l.length; i++) une(l[i], l[i + 1], 0);
  }
  return aristas;
}

// Figura: piezas con el origen en su articulación
function piezas() {
  const pierna = new THREE.CapsuleGeometry(0.075, 0.72, 3, 6).translate(0, -0.435, 0);
  const brazo = new THREE.CapsuleGeometry(0.055, 0.5, 3, 6).translate(0, -0.305, 0);
  const cuerpo = new THREE.CapsuleGeometry(0.17, 0.42, 3, 8).scale(1.2, 1, 0.72);
  const cabeza = new THREE.SphereGeometry(0.105, 10, 8);
  const pelo = new THREE.SphereGeometry(0.113, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.25);
  return { pierna, brazo, cuerpo, cabeza, pelo };
}

const ROPA = ['#2f4f7f', '#7a2e2e', '#3d6b45', '#d8d2c4', '#222428', '#8a6d3b', '#5b4a7a', '#c96f2d', '#9aa3ad', '#e2c25a', '#1f6f74', '#b04a6a'];
const PANTALON = ['#2b3442', '#1d1f24', '#4a4036', '#6b6f78', '#33465e', '#7d6a55'];
const PIEL = ['#f0c9a6', '#e1b08a', '#c68e66', '#9c6a45', '#6e4a31'];
const PELO = ['#2a1d14', '#4a3222', '#16120f', '#8a6a3e', '#b9b2a6', '#d9c18f'];

export function creaPeatones({ calles, caminos, edificios, terreno, azar = Math.random }) {
  const aristas = creaCaminos(calles, caminos, indiceEdificios(edificios));
  const total = PEATONES.cantidad[CALIDAD.nivel] ?? PEATONES.cantidad.medio;
  const raiz = new THREE.Group();
  raiz.name = 'peatones';
  const g = piezas();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const malla = (geo, n, nombre) => {
    const m = new THREE.InstancedMesh(geo, material, n);
    m.name = `peatones_${nombre}`;
    m.frustumCulled = false;
    m.count = 0;
    raiz.add(m);
    return m;
  };
  const mallas = {
    piernas: malla(g.pierna, total * 2, 'piernas'),
    brazos: malla(g.brazo, total * 2, 'brazos'),
    cuerpos: malla(g.cuerpo, total, 'cuerpos'),
    cabezas: malla(g.cabeza, total, 'cabezas'),
    pelos: malla(g.pelo, total, 'pelos'),
  };
  const elige = (lista) => lista[Math.floor(azar() * lista.length)];

  // Colores de cada peatón; se escriben en el hueco de dibujo que le toque (cambia cuando
  // aparecen o desaparecen otros)
  function pintaEn(ag, hueco) {
    const { pantalon, ropa, piel, pelo } = ag.colores;
    mallas.piernas.setColorAt(hueco * 2, pantalon); mallas.piernas.setColorAt(hueco * 2 + 1, pantalon);
    mallas.brazos.setColorAt(hueco * 2, ropa); mallas.brazos.setColorAt(hueco * 2 + 1, ropa);
    mallas.cuerpos.setColorAt(hueco, ropa);
    mallas.cabezas.setColorAt(hueco, piel);
    mallas.pelos.setColorAt(hueco, pelo);
    ag.hueco = hueco;
  }
  const agentes = Array.from({ length: total }, () => {
    return {
      colores: {
        pantalon: new THREE.Color(elige(PANTALON)), ropa: new THREE.Color(elige(ROPA)),
        piel: new THREE.Color(elige(PIEL)), pelo: new THREE.Color(elige(PELO)),
      },
      hueco: -1,
      activo: false, arista: null, sentido: 1, s: 0, lado: 1,
      pos: new THREE.Vector2(), rumbo: 0, fase: azar() * 6.28, rapidez: 0,
      v: THREE.MathUtils.lerp(...PEATONES.velocidadMs, azar()),
      escala: THREE.MathUtils.lerp(0.92, 1.07, azar()),
      parado: 0,
    };
  });
  agentes.forEach((ag, i) => pintaEn(ag, i));

  const ideal = new THREE.Vector2();
  function puntoIdeal(ag, destino = ideal) {
    const a = ag.arista;
    const d = a.desplazamiento * ag.lado;
    return destino.set(a.a.x + a.dx * ag.s - a.dz * d, a.a.z + a.dz * ag.s + a.dx * d);
  }

  const delanteCamara = new THREE.Vector3();
  function aparece(ag, jugador, camara) {
    const [dMin, dMax] = PEATONES.apareceEntreM;
    camara?.getWorldDirection(delanteCamara);
    for (let intento = 0; intento < 40; intento++) {
      const a = aristas[Math.floor(azar() * aristas.length)];
      ag.arista = a;
      ag.s = azar() * a.largo;
      ag.lado = a.lados[Math.floor(azar() * a.lados.length)];
      ag.sentido = azar() < 0.5 ? 1 : -1;
      puntoIdeal(ag);
      const dx = ideal.x - jugador.x;
      const dz = ideal.y - jugador.z;
      const d = Math.hypot(dx, dz);
      if (d < dMin || d > dMax) continue;
      if (camara && d < 80 && (dx * delanteCamara.x + dz * delanteCamara.z) / d > 0.4) continue;   // no a la vista
      ag.pos.copy(ideal);
      ag.activo = true;
      ag.parado = 0;
      return;
    }
    ag.activo = false;
  }

  // Al final del tramo: otro tramo al azar (mejor seguir recto) y la acera más cercana; a veces
  // cruza a la de enfrente
  function siguiente(ag) {
    const a = ag.arista;
    const nodo = ag.sentido > 0 ? a.b : a.a;
    let opciones = nodo.aristas.filter((o) => o !== a);
    if (!opciones.length) opciones = [a];
    const dirX = a.dx * ag.sentido;
    const dirZ = a.dz * ag.sentido;
    const pesos = opciones.map((o) => {
      const s = o.a === nodo ? 1 : -1;
      return 0.3 + Math.max(0, (o.dx * dirX + o.dz * dirZ) * s);
    });
    let r = azar() * pesos.reduce((x, y) => x + y, 0);
    let nueva = opciones[opciones.length - 1];
    for (let i = 0; i < opciones.length; i++) { r -= pesos[i]; if (r <= 0) { nueva = opciones[i]; break; } }
    ag.sentido = nueva === a ? -ag.sentido : (nueva.a === nodo ? 1 : -1);
    ag.arista = nueva;
    ag.s = ag.sentido > 0 ? 0 : nueva.largo;
    // Lado: el más cercano a donde está (o el otro, cruzando, con poca probabilidad)
    const candidatos = nueva.lados.map((l) => {
      ag.lado = l;
      return { l, d: puntoIdeal(ag).distanceTo(ag.pos) };
    }).sort((x, y) => x.d - y.d);
    ag.lado = candidatos.length > 1 && azar() < 0.15 ? candidatos[1].l : candidatos[0].l;
    if (azar() < 0.08) ag.parado = 2 + azar() * 6;    // se para un rato (a mirar, a hablar…)
  }

  // Apartarse del coche: si viene rápido hacia él, se mueve de lado; y nunca dentro del coche
  function evitaCoche(ag, coche, dt) {
    const rx = ag.pos.x - coche.x;
    const rz = ag.pos.y - coche.z;
    if (rx * rx + rz * rz > PEATONES.distanciaCocheM ** 2) return;
    const lz = rx * coche.fx + rz * coche.fz;              // hacia delante del coche
    const lx = rx * coche.fz - rz * coche.fx;              // hacia su derecha
    const avanza = coche.velocidad * Math.sign(lz);        // > 0: el coche se le echa encima
    const semiAncho = coche.ancho / 2 + 0.45;
    const semiLargo = coche.largo / 2 + 0.45;
    if (avanza > 1.5 && Math.abs(lx) < semiAncho + 0.8) {
      const lado = lx >= 0 ? 1 : -1;
      const paso = Math.min(4.0 * dt, PEATONES.apartarseM);
      ag.pos.x += coche.fz * lado * paso;
      ag.pos.y -= coche.fx * lado * paso;
      ag.parado = Math.max(ag.parado, 0.6);
    }
    if (Math.abs(lx) < semiAncho && Math.abs(lz) < semiLargo) {      // dentro: fuera por el lado
      const lado = lx >= 0 ? 1 : -1;
      const sale = semiAncho * lado - lx;
      ag.pos.x += coche.fz * sale;
      ag.pos.y -= coche.fx * sale;
    }
  }

  const m4 = new THREE.Matrix4();
  const base = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qPieza = new THREE.Quaternion();
  const t = new THREE.Vector3();
  const s = new THREE.Vector3();
  const ejeY = new THREE.Vector3(0, 1, 0);
  const ejeX = new THREE.Vector3(1, 0, 0);
  const local = new THREE.Matrix4();
  function pieza(mallaPieza, indice, x, y, z, angulo) {
    qPieza.setFromAxisAngle(ejeX, angulo);
    local.compose(t.set(x, y, z), qPieza, s.set(1, 1, 1));
    mallaPieza.setMatrixAt(indice, m4.multiplyMatrices(base, local));
  }

  const anterior = new THREE.Vector2();
  let activos = 0;
  return {
    raiz,
    agentes,
    aristas,
    get activos() { return activos; },
    actualiza(dt, { jugador, camara, coche = null, aPie = null, oscuridad = 0 }) {
      if (!aristas.length || !PEATONES.activo) { raiz.visible = false; return; }
      raiz.visible = true;
      const objetivo = Math.round(total * THREE.MathUtils.lerp(1, PEATONES.fraccionNoche, oscuridad));
      let n = 0;
      let colorCambiado = false;
      for (let i = 0; i < total; i++) {
        const ag = agentes[i];
        if (i >= objetivo) { ag.activo = false; continue; }
        if (ag.activo && Math.hypot(ag.pos.x - jugador.x, ag.pos.y - jugador.z) > PEATONES.desapareceM) ag.activo = false;
        if (!ag.activo) aparece(ag, jugador, camara);
        if (!ag.activo) continue;

        anterior.copy(ag.pos);
        // Avanza por su tramo solo si va pegado a su punto (si no, primero llega a él: cruces)
        puntoIdeal(ag);
        const lejos = ideal.distanceTo(ag.pos);
        if (ag.parado > 0) ag.parado -= dt;
        else if (lejos < 1.2) {
          ag.s += ag.v * dt * ag.sentido;
          if (ag.s < 0 || ag.s > ag.arista.largo) siguiente(ag);
          puntoIdeal(ag);
        }
        const dx = ideal.x - ag.pos.x;
        const dz = ideal.y - ag.pos.y;
        const d = Math.hypot(dx, dz);
        const paso = Math.min(d, ag.v * 1.3 * dt);
        if (d > 1e-4) ag.pos.x += (dx / d) * paso, ag.pos.y += (dz / d) * paso;
        if (coche) evitaCoche(ag, coche, dt);
        if (aPie) {                                        // no atravesar al jugador a pie
          const ex = ag.pos.x - aPie.x;
          const ez = ag.pos.y - aPie.z;
          const de = Math.hypot(ex, ez);
          if (de < 0.75 && de > 1e-3) { ag.pos.x = aPie.x + (ex / de) * 0.75; ag.pos.y = aPie.z + (ez / de) * 0.75; }
        }

        // Rumbo y paso según lo que se ha movido de verdad
        const mx = ag.pos.x - anterior.x;
        const mz = ag.pos.y - anterior.y;
        const rapidez = Math.hypot(mx, mz) / Math.max(dt, 1e-4);
        ag.rapidez += (rapidez - ag.rapidez) * (1 - Math.exp(-dt * 8));
        if (rapidez > 0.2) {
          let giro = Math.atan2(mx, mz) - ag.rumbo;
          giro = Math.atan2(Math.sin(giro), Math.cos(giro));
          ag.rumbo += giro * (1 - Math.exp(-dt * 7));
        }
        ag.fase += ag.rapidez * dt * (Math.PI * 2 / 1.35);
        const k = Math.min(1, ag.rapidez / 0.9);
        const balanceo = Math.sin(ag.fase) * k;

        const y = terreno.alturaEn(ag.pos.x, ag.pos.y) + Math.abs(Math.cos(ag.fase)) * 0.03 * k;
        q.setFromAxisAngle(ejeY, ag.rumbo);
        base.compose(t.set(ag.pos.x, y, ag.pos.y), q, s.setScalar(ag.escala));
        pieza(mallas.piernas, n * 2, -0.1, 0.92, 0, balanceo * 0.45);
        pieza(mallas.piernas, n * 2 + 1, 0.1, 0.92, 0, -balanceo * 0.45);
        pieza(mallas.brazos, n * 2, -0.235, 1.43, 0, -balanceo * 0.35);
        pieza(mallas.brazos, n * 2 + 1, 0.235, 1.43, 0, balanceo * 0.35);
        pieza(mallas.cuerpos, n, 0, 1.2, 0, 0);
        pieza(mallas.cabezas, n, 0, 1.69, 0.01, 0);
        pieza(mallas.pelos, n, 0, 1.70, -0.005, 0);
        if (ag.hueco !== n) {
          // El hueco pudo ser de otro: quien lo tenía tendrá que repintarse en el suyo
          for (const otro of agentes) if (otro !== ag && otro.hueco === n) otro.hueco = -1;
          pintaEn(ag, n);
          colorCambiado = true;
        }
        n++;
      }
      activos = n;
      for (const m of Object.values(mallas)) {
        m.count = n * (m === mallas.piernas || m === mallas.brazos ? 2 : 1);
        m.instanceMatrix.needsUpdate = true;
        if (colorCambiado) m.instanceColor.needsUpdate = true;
      }
    },
    // Para el tráfico: los que están en la calzada (cruzando)
    obstaculos() {
      const lista = [];
      for (const ag of agentes) {
        if (!ag.activo) continue;
        const a = ag.arista;
        const rx = ag.pos.x - a.a.x;
        const rz = ag.pos.y - a.a.z;
        const lateral = Math.abs(-rx * a.dz + rz * a.dx);
        if (lateral < a.mediaCalzada + 0.3) lista.push({ x: ag.pos.x, z: ag.pos.y, radio: 0.7 });
      }
      return lista;
    },
  };
}
