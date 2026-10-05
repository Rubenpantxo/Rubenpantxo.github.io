// Modelos de coche (public/assets/coches/, preparados por tools/build_coches.py) y coches
// aparcados donde la ortofoto tenía coches (tools/07_coches_orto.py).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const CANDIDATOS_POR_LARGO = 3; // modelos de largo más parecido entre los que se sortea

export async function cargaModelosCoches(ruta) {
  const respuesta = await fetch(`${ruta}coches.json`);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}coches.json`);
  const manifiesto = await respuesta.json();
  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  const carga = async (archivo) => {
    const gltf = await cargador.loadAsync(`${ruta}${archivo}`);
    gltf.scene.updateMatrixWorld(true);
    return gltf.scene;
  };
  const entradas = await Promise.all(Object.entries(manifiesto).map(async ([id, info]) => {
    const [escena, lejos] = await Promise.all([carga(info.archivo), info.archivo_lejos ? carga(info.archivo_lejos) : null]);
    return [id, { id, info, escena, lejos }];
  }));
  return Object.fromEntries(entradas);
}

// Piezas de una escena de modelo con su matriz respecto a la raíz del modelo
function piezas(modelo, escena = modelo.escena) {
  const lista = [];
  escena.traverse((o) => {
    if (o.isMesh) lista.push({ malla: o, matriz: o.matrixWorld.clone() });
  });
  return lista;
}

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Orientación sobre el terreno: rumbo (giro sobre Y) e inclinación según la pendiente
function orientacion(terreno, x, z, rumbo, q) {
  const d = 0.8;
  const nx = terreno.alturaEn(x - d, z) - terreno.alturaEn(x + d, z);
  const nz = terreno.alturaEn(x, z - d) - terreno.alturaEn(x, z + d);
  const normal = new THREE.Vector3(nx, 2 * d, nz).normalize();
  const inclinacion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rumbo).premultiply(inclinacion);
}

// Color del coche visto en la ortofoto (sRGB) → color de pintura algo más saturado
function colorPintura(rgb, color) {
  color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
  const hsl = {};
  color.getHSL(hsl);
  // Los grises del aire tiran a azulados por la atmósfera: se desaturan los casi grises
  const s = hsl.s < 0.18 ? hsl.s * 0.3 : Math.min(1, hsl.s * 1.25);
  return color.setHSL(hsl.h, s, Math.min(0.92, Math.max(0.04, hsl.l)));
}

export function creaCochesAparcados(modelos, datos, terreno, { excluir = [] } = {}) {
  const disponibles = Object.values(modelos).filter((m) => !excluir.includes(m.id));
  const porModelo = new Map(disponibles.map((m) => [m.id, []]));
  const colocados = [];
  const q = new THREE.Quaternion();
  const color = new THREE.Color();

  datos.coches.forEach((c, i) => {
    const r = azar(i * 7919 + 13);
    // El modelo, entre los 3 de largo más parecido al coche medido en la ortofoto
    // (la medida aérea es aproximada: se acota a turismos normales)
    const largo = Math.min(Math.max(c.largo, 4.1), 5.4);
    const parecidos = disponibles.slice().sort((a, b) => Math.abs(a.info.largo - largo) - Math.abs(b.info.largo - largo))
      .slice(0, CANDIDATOS_POR_LARGO);
    const modelo = parecidos[Math.floor(r() * parecidos.length)];
    const y = terreno.alturaEn(c.x, c.z);
    orientacion(terreno, c.x, c.z, c.rumbo, q);
    const matriz = new THREE.Matrix4().compose(new THREE.Vector3(c.x, y, c.z), q.clone(), new THREE.Vector3(1, 1, 1));
    porModelo.get(modelo.id).push({ matriz, color: colorPintura(c.color, color).clone() });
    colocados.push({ modelo: modelo.id, x: c.x, y, z: c.z, cuaternion: q.clone(), info: modelo.info });
  });

  // Dos juegos de mallas instanciadas por modelo: detallado (cerca) y ligero (lejos).
  // actualiza() reparte los coches entre ambos según la distancia a la cámara.
  const raiz = new THREE.Group();
  raiz.name = 'coches_aparcados';
  const conjuntos = [];
  const creaConjunto = (modelo, escena, lista) => {
    const partes = piezas(modelo, escena).map(({ malla, matriz }) => {
      const esPintura = malla.material.name === 'pintura';
      const material = esPintura ? malla.material.clone() : malla.material;
      if (esPintura) material.color.set(0xffffff);
      const instancias = new THREE.InstancedMesh(malla.geometry, material, lista.length);
      instancias.name = `${modelo.id}_${malla.name}`;
      instancias.frustumCulled = false;   // el reparto por distancia ya limita lo que se dibuja
      instancias.count = 0;
      raiz.add(instancias);
      return { instancias, matriz, esPintura, triangulos: malla.geometry.index ? malla.geometry.index.count / 3 : 0 };
    });
    return partes;
  };
  for (const modelo of disponibles) {
    const lista = porModelo.get(modelo.id);
    if (!lista.length) continue;
    conjuntos.push({
      lista,
      cerca: creaConjunto(modelo, modelo.escena, lista),
      lejos: modelo.lejos ? creaConjunto(modelo, modelo.lejos, lista) : null,
    });
  }

  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const escribe = (partes, elegidos) => {
    for (const parte of partes) {
      elegidos.forEach((inst, k) => {
        parte.instancias.setMatrixAt(k, m.multiplyMatrices(inst.matriz, parte.matriz));
        if (parte.esPintura) parte.instancias.setColorAt(k, inst.color);
      });
      parte.instancias.count = elegidos.length;
      parte.instancias.instanceMatrix.needsUpdate = true;
      if (parte.instancias.instanceColor) parte.instancias.instanceColor.needsUpdate = true;
    }
  };
  let triangulos = 0;
  function actualiza(posicionCamara, distanciaCerca) {
    const d2 = distanciaCerca * distanciaCerca;
    triangulos = 0;
    for (const c of conjuntos) {
      const cerca = [];
      const lejos = [];
      for (const inst of c.lista) {
        p.setFromMatrixPosition(inst.matriz);
        (p.distanceToSquared(posicionCamara) < d2 || !c.lejos ? cerca : lejos).push(inst);
      }
      escribe(c.cerca, cerca);
      if (c.lejos) escribe(c.lejos, lejos);
      triangulos += c.cerca.reduce((s, x) => s + x.triangulos, 0) * cerca.length
        + (c.lejos ? c.lejos.reduce((s, x) => s + x.triangulos, 0) * lejos.length : 0);
    }
    return triangulos;
  }
  return { raiz, colocados, actualiza, get triangulos() { return triangulos; } };
}

// Colisión: una caja fija por coche aparcado (sus medidas reales)
export function colisionaCochesAparcados(fisica, colocados) {
  const { RAPIER, mundo } = fisica;
  const centro = new THREE.Vector3();
  for (const c of colocados) {
    const { largo, ancho, alto } = c.info;
    centro.set(0, alto / 2, 0).applyQuaternion(c.cuaternion).add(new THREE.Vector3(c.x, c.y, c.z));
    mundo.createCollider(
      RAPIER.ColliderDesc.cuboid(Math.min(ancho, 2.0) / 2, alto / 2, largo / 2)
        .setTranslation(centro.x, centro.y, centro.z)
        .setRotation({ x: c.cuaternion.x, y: c.cuaternion.y, z: c.cuaternion.z, w: c.cuaternion.w })
        .setFriction(0.6),
    );
  }
}

// Coche del jugador: carrocería + 4 ruedas con el origen en su centro para que giren.
// Devuelve el grupo (origen = suelo bajo el centro del coche) y las ruedas ordenadas:
// 0 delantera izquierda (+X), 1 delantera derecha, 2 trasera izquierda, 3 trasera derecha.
export function preparaCocheJugador(modelo, colorCarroceria) {
  const grupo = new THREE.Group();
  grupo.name = `jugador_${modelo.id}`;
  const datosRuedas = modelo.info.ruedas;
  const nombresRuedas = new Set(datosRuedas.map((d) => d.objeto));
  const ruedas = new Array(4);
  const inversa = new THREE.Matrix4();
  for (const { malla, matriz } of piezas(modelo)) {
    let destino = grupo;
    let nodo = malla;
    // Las mallas de una rueda cuelgan de un nodo con su nombre exacto (rueda_di, …)
    while (nodo && !nombresRuedas.has(nodo.name)) nodo = nodo.parent;
    const copia = malla.clone();
    copia.matrixAutoUpdate = false;
    if (nodo) {
      const dato = datosRuedas.find((d) => d.objeto === nodo.name);
      const [cx, cy, cz] = dato.centro;
      const indice = (cz > 0 ? 0 : 2) + (cx > 0 ? 0 : 1);
      if (!ruedas[indice]) {
        const pivote = new THREE.Group();
        const giro = new THREE.Group();
        pivote.add(giro);
        ruedas[indice] = { pivote, giro, centro: new THREE.Vector3(cx, cy, cz), radio: dato.radio, ancho: dato.ancho };
      }
      destino = ruedas[indice].giro;
      // La geometría queda centrada en el eje de la rueda
      copia.matrix.multiplyMatrices(inversa.makeTranslation(-cx, -cy, -cz), matriz);
    } else {
      copia.matrix.copy(matriz);
      if (copia.material.name === 'pintura') {
        copia.material = copia.material.clone();
        copia.material.color.set(colorCarroceria);
      }
    }
    destino.add(copia);
  }
  if (ruedas.some((r) => !r)) throw new Error(`El modelo ${modelo.id} no tiene las 4 ruedas separadas`);
  return { grupo, ruedas };
}
