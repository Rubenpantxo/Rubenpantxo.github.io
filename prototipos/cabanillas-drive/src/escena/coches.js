// Modelos de coche (public/assets/coches/, preparados por tools/build_coches.py) y coches
// aparcados donde la ortofoto tenía coches (tools/07_coches_orto.py).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { registraEstatico } from '../fisica/fisica.js';
import { CALIDAD } from '../config/calidad.js';
import { uneCochePorClase, unePorMaterial } from './geometria.js';

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

  // Tres niveles: modelo completo (cerca), versión ligera (media distancia) y un coche
  // genérico para todos (lejos: dos mallas instanciadas, carrocería tintada y el resto).
  // actualiza() reparte los coches según la distancia a la cámara; más allá del máximo, nada.
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
      instancias.visible = false;
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
      info: modelo.info,
      cerca: creaConjunto(modelo, modelo.escena, lista),
      lejos: modelo.lejos ? creaConjunto(modelo, modelo.lejos, lista) : null,
    });
  }
  const generico = creaCocheGenerico(colocados.length);
  generico.grupo.name = 'coches_genericos';
  raiz.add(generico.grupo);

  const m = new THREE.Matrix4();
  const escalaGenerico = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const escribe = (partes, elegidos) => {
    for (const parte of partes) {
      elegidos.forEach((inst, k) => {
        parte.instancias.setMatrixAt(k, m.multiplyMatrices(inst.matriz, parte.matriz));
        if (parte.esPintura) parte.instancias.setColorAt(k, inst.color);
      });
      parte.instancias.count = elegidos.length;
      parte.instancias.visible = elegidos.length > 0;   // sin llamadas de dibujo vacías
      parte.instancias.instanceMatrix.needsUpdate = true;
      if (parte.instancias.instanceColor) parte.instancias.instanceColor.needsUpdate = true;
    }
  };
  let triangulos = 0;
  // distancias: número (solo detalle) o { detalle, lejos, max }; lejos ≤ detalle quita el nivel medio
  function actualiza(posicionCamara, distancias) {
    const { detalle, lejos = 0, max = Infinity } = typeof distancias === 'number' ? { detalle: distancias } : distancias;
    const d2Detalle = detalle * detalle;
    const d2Lejos = lejos * lejos;
    const d2Max = max * max;
    triangulos = 0;
    let nGenerico = 0;
    for (const c of conjuntos) {
      const cerca = [];
      const medios = [];
      for (const inst of c.lista) {
        p.setFromMatrixPosition(inst.matriz);
        const d2 = p.distanceToSquared(posicionCamara);
        if (d2 < d2Detalle || (!c.lejos && d2 < d2Lejos)) cerca.push(inst);
        else if (c.lejos && d2 < d2Lejos) medios.push(inst);
        else if (d2 < d2Max) {
          escalaGenerico.makeScale(Math.min(c.info.ancho, 2.0), c.info.alto, c.info.largo);
          m.multiplyMatrices(inst.matriz, escalaGenerico);
          generico.carroceria.setMatrixAt(nGenerico, m);
          generico.resto.setMatrixAt(nGenerico, m);
          generico.carroceria.setColorAt(nGenerico, inst.color);
          nGenerico++;
        }
      }
      escribe(c.cerca, cerca);
      if (c.lejos) escribe(c.lejos, medios);
      triangulos += c.cerca.reduce((s, x) => s + x.triangulos, 0) * cerca.length
        + (c.lejos ? c.lejos.reduce((s, x) => s + x.triangulos, 0) * medios.length : 0);
    }
    for (const malla of [generico.carroceria, generico.resto]) {
      malla.count = nGenerico;
      malla.visible = nGenerico > 0;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    }
    triangulos += nGenerico * generico.triangulos;
    return triangulos;
  }
  return { raiz, colocados, actualiza, get triangulos() { return triangulos; } };
}

// Coche genérico de lejos (1 × 1 × 1: x ancho, y alto, z largo; delante = +Z): carrocería baja,
// habitáculo oscuro con techo del color del coche y cuatro ruedas. ~150 triángulos.
function creaCocheGenerico(maximo) {
  const caja = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
    .translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // Habitáculo en trapecio (parabrisas y luna trasera inclinados): la cara de arriba se estrecha
  const habitaculo = caja(-0.44, 0.44, 0.52, 0.92, -0.36, 0.2);
  const pos = habitaculo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0.7) {
      pos.setZ(i, pos.getZ(i) > 0 ? 0.04 : -0.3);
      pos.setX(i, pos.getX(i) * 0.92);
    }
  }
  habitaculo.computeVertexNormals();
  const carroceria = mergeGeometries([
    caja(-0.5, 0.5, 0.16, 0.54, -0.5, 0.5),
    caja(-0.4, 0.4, 0.9, 0.95, -0.29, 0.03),         // techo
  ].map((g) => g.toNonIndexed()));
  const ruedas = [];
  for (const sx of [-0.43, 0.43]) {
    for (const sz of [-0.32, 0.32]) {
      ruedas.push(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 8).rotateZ(Math.PI / 2).translate(sx, 0.2, sz).toNonIndexed());
    }
  }
  const resto = mergeGeometries([habitaculo.toNonIndexed(), ...ruedas]);
  const grupo = new THREE.Group();
  const crea = (geo, material) => {
    const malla = new THREE.InstancedMesh(geo, material, maximo);
    malla.frustumCulled = false;
    malla.count = 0;
    malla.visible = false;
    grupo.add(malla);
    return malla;
  };
  const mallaCarroceria = crea(carroceria, new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const mallaResto = crea(resto, new THREE.MeshLambertMaterial({ color: 0x1c2026 }));
  return {
    grupo, carroceria: mallaCarroceria, resto: mallaResto,
    triangulos: (carroceria.attributes.position.count + resto.attributes.position.count) / 3,
  };
}

// Colisión: una caja fija por coche aparcado (sus medidas reales)
export function colisionaCochesAparcados(fisica, colocados) {
  const { RAPIER, mundo } = fisica;
  const centro = new THREE.Vector3();
  for (const c of colocados) {
    const { largo, ancho, alto } = c.info;
    centro.set(0, alto / 2, 0).applyQuaternion(c.cuaternion).add(new THREE.Vector3(c.x, c.y, c.z));
    const collider = mundo.createCollider(
      RAPIER.ColliderDesc.cuboid(Math.min(ancho, 2.0) / 2, alto / 2, largo / 2)
        .setTranslation(centro.x, centro.y, centro.z)
        .setRotation({ x: c.cuaternion.x, y: c.cuaternion.y, z: c.cuaternion.z, w: c.cuaternion.w })
        .setFriction(0.6),
    );
    registraEstatico(fisica, collider, c.x, c.z, largo / 2);
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
  let pintura = null;
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
        // Un solo material de pintura para todas las piezas (así se pueden unir)
        if (!pintura) {
          pintura = copia.material.clone();
          pintura.color.set(colorCarroceria);
        }
        copia.material = pintura;
      }
    }
    destino.add(copia);
  }
  if (ruedas.some((r) => !r)) throw new Error(`El modelo ${modelo.id} no tiene las 4 ruedas separadas`);
  // Menos llamadas de dibujo: piezas con el mismo material, unidas (carrocería y cada rueda);
  // en móvil, además, agrupadas por tipo de material
  const une = CALIDAD.unirMaterialesCoche ? uneCochePorClase : unePorMaterial;
  une(grupo);
  for (const r of ruedas) une(r.giro);
  return { grupo, ruedas };
}
