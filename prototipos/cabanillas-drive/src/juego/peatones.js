// Peatones: personas de MakeHuman (tools/build_personas.py) que pasean por las aceras
// (config/peatones.js).
// - Caminos: cada tramo de calle OSM del casco urbano con su acera a cada lado (a media calzada
//   + media acera del centro, como el suelo de tools/11_suelo.py) y las sendas peatonales por
//   el centro. Un lado no se usa si choca con un edificio (Catastro).
// - Cada peatón sigue su acera; en los cruces elige otra calle y a veces cruza al otro lado.
//   Si un coche se le acerca rápido, se aparta; nunca se deja atropellar.
// - Dibujo: cada peatón es un clon de una de las personas (malla con esqueleto, un material) con
//   su mezclador: «andar» al ritmo de su velocidad y «quieto» al pararse. Los lejanos actualizan
//   la animación con menos frecuencia. Aparecen cerca del jugador y desaparecen lejos.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as clonaConEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CALIDAD } from '../config/calidad.js';
import { PEATONES } from '../config/peatones.js';
import { limitaTexturas } from '../escena/texturas.js';

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

// Índice de los muros y vallas (tools/13_muros.py): ¿hay alguno a menos de r?
function indiceMuros(datos) {
  const celdas = new Map();
  for (const m of datos?.muros ?? []) {
    for (let i = 1; i < m.p.length; i++) {
      const [x0, z0] = m.p[i - 1];
      const [x1, z1] = m.p[i];
      const s = { x0, z0, x1, z1 };
      for (let cx = Math.floor(Math.min(x0, x1) / CELDA); cx <= Math.floor(Math.max(x0, x1) / CELDA); cx++) {
        for (let cz = Math.floor(Math.min(z0, z1) / CELDA); cz <= Math.floor(Math.max(z0, z1) / CELDA); cz++) {
          const k = claveCelda(cx, cz);
          if (!celdas.has(k)) celdas.set(k, []);
          celdas.get(k).push(s);
        }
      }
    }
  }
  return {
    cerca(x, z, r) {
      for (const s of celdas.get(claveCelda(Math.floor(x / CELDA), Math.floor(z / CELDA))) ?? []) {
        const ex = s.x1 - s.x0;
        const ez = s.z1 - s.z0;
        const l2 = ex * ex + ez * ez || 1;
        const k = Math.max(0, Math.min(1, ((x - s.x0) * ex + (z - s.z0) * ez) / l2));
        if (Math.hypot(s.x0 + ex * k - x, s.z0 + ez * k - z) < r) return true;
      }
      return false;
    },
  };
}

// Grafo no dirigido de aceras y sendas
function creaCaminos(calles, caminos, edificios, muros) {
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
        || edificios.dentro(x, z + 0.35) || edificios.dentro(x, z - 0.35) || muros.cerca(x, z, 0.45)) return false;
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
    // Lados: +1 a la izquierda de a→b (normal (−dz, dx)), −1 a la derecha; 0 = por el centro. Si
    // la línea de la acera choca con un muro o una casa, se prueba algo más cerca de la calzada
    const despPorLado = { 0: 0 };
    const lados = [];
    if (desplazamiento > 0) {
      for (const l of [1, -1]) {
        const d = [0, 0.35, 0.7].map((m) => desplazamiento - m).find((d) => libre(a, dx, dz, largo, l * d));
        if (d !== undefined) { despPorLado[l] = d; lados.push(l); }
      }
    } else if (libre(a, dx, dz, largo, 0)) lados.push(0);
    if (!lados.length) return;
    const arista = { a, b, largo, dx, dz, desplazamiento, despPorLado, lados, mediaCalzada: Math.max(0, desplazamiento - PEATONES.mediaAceraM) };
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

// Personas (public/assets/personas/): manifiesto y modelos. En calidad baja, menos variantes.
export async function cargaPersonas(ruta) {
  const manifiesto = await fetch(`${ruta}personas.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!manifiesto) return null;
  const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const lista = manifiesto.personas.slice(0, PEATONES.variantes[CALIDAD.nivel] ?? manifiesto.personas.length);
  const modelos = await Promise.all(lista.map(async (p) => {
    const gltf = await cargador.loadAsync(`${ruta}${p.archivo}`);
    limitaTexturas(gltf.scene, CALIDAD.texturaMax);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.material.alphaTest = 0.5;          // pelo, cejas y pestañas recortados
      o.material.transparent = false;
      o.material.depthWrite = true;        // el GLB lo trae como transparente (sin profundidad)
      o.material.roughness = 0.85;
      o.material.metalness = 0;
    });
    const clip = (nombre) => gltf.animations.find((a) => a.name === nombre);
    return { id: p.id, escena: gltf.scene, andar: clip('andar'), quieto: clip('quieto') };
  }));
  return { metrosPorCiclo: manifiesto.metros_por_ciclo, modelos: modelos.filter((m) => m.andar && m.quieto) };
}

export function creaPeatones({ calles, caminos, edificios, muros, terreno, personas, azar = Math.random }) {
  const aristas = creaCaminos(calles, caminos, indiceEdificios(edificios), indiceMuros(muros));
  const total = PEATONES.cantidad[CALIDAD.nivel] ?? PEATONES.cantidad.medio;
  const raiz = new THREE.Group();
  raiz.name = 'peatones';
  const variantes = personas?.modelos ?? [];
  const metrosPorCiclo = personas?.metrosPorCiclo ?? 1.39;
  const agentes = Array.from({ length: variantes.length ? total : 0 }, (_, i) => {
    const v = variantes[i % variantes.length];
    const objeto = clonaConEsqueleto(v.escena);
    objeto.visible = false;
    let malla = null;
    objeto.traverse((o) => { if (o.isSkinnedMesh) malla = o; });
    raiz.add(objeto);
    const mezclador = new THREE.AnimationMixer(objeto);
    const andar = mezclador.clipAction(v.andar);
    const quieto = mezclador.clipAction(v.quieto);
    andar.play();
    quieto.play();
    andar.time = azar() * v.andar.duration;
    quieto.time = azar() * v.quieto.duration;
    return {
      objeto, malla, mezclador, andar, quieto, duracionPaso: v.andar.duration, pendiente: 0, turno: i % 3,
      activo: false, arista: null, sentido: 1, s: 0, lado: 1,
      pos: new THREE.Vector2(), rumbo: 0, rapidez: 0,
      v: THREE.MathUtils.lerp(...PEATONES.velocidadMs, azar()),
      parado: 0,
    };
  });

  const ideal = new THREE.Vector2();
  function puntoIdeal(ag, destino = ideal) {
    const a = ag.arista;
    const d = a.despPorLado[ag.lado] * ag.lado;
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

  const anterior = new THREE.Vector2();
  const visibleM = PEATONES.visibleHastaM[CALIDAD.nivel] ?? 90;
  let activos = 0;
  let contador = 0;
  return {
    raiz,
    agentes,
    aristas,
    get activos() { return activos; },
    actualiza(dt, { jugador, camara, coche = null, aPie = null, oscuridad = 0 }) {
      if (!aristas.length || !agentes.length || !PEATONES.activo) { raiz.visible = false; return; }
      raiz.visible = true;
      const objetivo = Math.round(total * THREE.MathUtils.lerp(1, PEATONES.fraccionNoche, oscuridad));
      let n = 0;
      for (let i = 0; i < total; i++) {
        const ag = agentes[i];
        if (i >= objetivo) { ag.activo = false; ag.objeto.visible = false; continue; }
        if (ag.activo && Math.hypot(ag.pos.x - jugador.x, ag.pos.y - jugador.z) > PEATONES.desapareceM) ag.activo = false;
        if (!ag.activo) aparece(ag, jugador, camara);
        if (!ag.activo) { ag.objeto.visible = false; continue; }

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
        // Animación: mezcla de andar y quieto según la velocidad; el paso al ritmo de lo andado
        const k = THREE.MathUtils.clamp(ag.rapidez / 0.8, 0, 1);
        ag.andar.setEffectiveWeight(k);
        ag.quieto.setEffectiveWeight(1 - k);
        ag.andar.timeScale = Math.max(0.3, ag.rapidez) / (metrosPorCiclo / ag.duracionPaso);
        // Lejos: animación 1 de cada 3 fotogramas, sin sombra y, más allá, sin dibujar
        const dJugador = Math.hypot(ag.pos.x - jugador.x, ag.pos.y - jugador.z);
        const visible = dJugador < visibleM;
        ag.pendiente += dt;
        if (visible && (dJugador < PEATONES.animacionCercaM || (contador + ag.turno) % 3 === 0)) {
          ag.mezclador.update(ag.pendiente);
          ag.pendiente = 0;
        }
        ag.objeto.position.set(ag.pos.x, terreno.alturaEn(ag.pos.x, ag.pos.y), ag.pos.y);
        ag.objeto.rotation.y = ag.rumbo;
        ag.objeto.visible = visible;
        if (ag.malla) ag.malla.castShadow = dJugador < PEATONES.sombraHastaM;
        n++;
      }
      activos = n;
      contador++;
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
        if (lateral < a.mediaCalzada + 0.15) lista.push({ x: ag.pos.x, z: ag.pos.y, radio: 0.7 });
      }
      return lista;
    },
  };
}
