// Aperos del modo agricultura (PLAN_AGRICULTURA.md §5.6, fases A4–A8): arado reversible, cultivador,
// abonadora, sembradora y (A8) el remolque de grano.
// Modelos de tools/build_maquinaria.py (public/assets/maquinaria/); su configuración de trabajo está
// en src/config/maquinaria.js (APEROS). Cuando no van en el tractor esperan en el patio de la COPE,
// apoyados en el suelo y con una caja de colisión para que no se atraviesen.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { APEROS, RUTA_MAQUINARIA } from '../config/maquinaria.js';
import { MODELOS_CODIGO } from './modelosCodigo.js';

let manifiesto = null;
export async function leeManifiesto() {
  if (!manifiesto) {
    const r = await fetch(`${RUTA_MAQUINARIA}maquinaria.json`);
    if (!r.ok) throw new Error(`No se pudo leer ${RUTA_MAQUINARIA}maquinaria.json (¿npm run maquinaria?)`);
    manifiesto = await r.json();
  }
  return manifiesto;
}

// Un apero listo para colocar: { id, config, info, objeto } con el origen en los bulones inferiores.
// objeto → contenido (bajado al eje de volteo) → modelo, para poder voltear el arado reversible
export async function cargaApero(id, { fisica }) {
  const config = APEROS[id];
  if (!config) throw new Error(`Apero desconocido: ${id}`);
  let info;
  let modelo;
  if (config.procedural) {
    // Modelo hecho en código (sin GLB ni maquinaria.json)
    ({ modelo, info } = MODELOS_CODIGO[config.modelo]());
  } else {
    info = (await leeManifiesto())[config.modelo];
    if (!info) throw new Error(`No hay «${config.modelo}» en maquinaria.json (¿npm run maquinaria?)`);
    const cargador = new GLTFLoader();
    cargador.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await cargador.loadAsync(`${RUTA_MAQUINARIA}${info.archivo}`);
    modelo = gltf.scene;
  }
  modelo.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const ejeVolteo = info.eje_volteo_y ?? 0;
  const objeto = new THREE.Group();
  objeto.name = `apero_${id}`;
  const volteo = new THREE.Group();
  volteo.position.y = ejeVolteo;
  const contenido = new THREE.Group();
  contenido.position.y = -ejeVolteo;
  objeto.add(volteo);
  volteo.add(contenido);
  contenido.add(modelo);
  const rodillo = info.rodillo ? modelo.getObjectByName(info.rodillo.objeto) : null;
  const ruedaControl = info.rueda_control ? modelo.getObjectByName(info.rueda_control.objeto) : null;
  const nodo = (n) => (n ? modelo.getObjectByName(n) : null);
  const discos = (info.discos ?? []).map(nodo).filter(Boolean);
  const ruedas = (info.ruedas ?? []).map(nodo).filter(Boolean);
  const rejas = nodo(info.rejas);
  const pata = nodo(info.pata);
  const nodoCarga = nodo(info.carga?.objeto);
  const rejasY = rejas ? rejas.position.y : 0;

  // Caja de colisión para cuando está aparcado (no va en el tractor: el tractor no choca con su apero)
  const { RAPIER, mundo } = fisica;
  const caja = new THREE.Box3().setFromObject(modelo);
  const tam = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  let cuerpo = null;

  const apero = {
    id, config, info, objeto, modelo, volteo, rodillo, ruedaControl, discos, ruedas, rejas, pata,
    anchoTrabajo: info.ancho_trabajo,
    arrastrado: info.tipo === 'arrastrado',
    angulo: 0,              // volteo del reversible (0 o π)
    // Tolva (abonadora, sembradora): kg que lleva y de qué ('abono', 'trigo', 'cebada')
    carga: 0,
    contenido: null,
    get capacidad() { return config.capacidadKg ?? 0; },
    get llenado() { return config.capacidadKg ? apero.carga / config.capacidadKg : 0; },
    llena(contenido) {
      apero.contenido = contenido;
      apero.carga = config.capacidadKg ?? 0;
      apero.pintaCarga();
    },
    // Gasta hasta «kg» de la tolva; devuelve lo que había de verdad
    gasta(kg) {
      const g = Math.min(kg, apero.carga);
      apero.carga -= g;
      if (apero.carga <= 1e-6) apero.carga = 0;
      apero.pintaCarga();
      return g;
    },
    // La placa de la carga sube con lo que queda y se ensancha como la tolva
    pintaCarga() {
      if (!nodoCarga) return;
      const c = info.carga;
      const t = apero.llenado;
      nodoCarga.visible = t > 0.005;
      nodoCarga.position.y = THREE.MathUtils.lerp(c.y_vacia, c.y_llena, t);
      const sy = c.escala_y ? THREE.MathUtils.lerp(c.escala_y[0], c.escala_y[1], t) : 1;     // el montón del remolque crece
      nodoCarga.scale.set(THREE.MathUtils.lerp(c.escala_vacia_x, 1, t), sy, THREE.MathUtils.lerp(c.escala_vacia, 1, t));
    },
    // Rejas de la sembradora: 0 bajadas (clavadas unos centímetros) … 1 levantadas
    ponRejas(subida) {
      if (rejas) rejas.position.y = rejasY + (info.bajada_rejas ?? 0.12) * subida - 0.04 * (1 - subida);
    },
    // Deja el apero apoyado en el suelo del patio, en (x, z) y con un rumbo en grados (0 = norte)
    aparca(raiz, terreno, [x, z, rumbo]) {
      const r = (rumbo * Math.PI) / 180;
      raiz.add(objeto);
      if (pata) pata.visible = true;
      apero.ponRejas(1);
      objeto.rotation.set(0, Math.atan2(Math.sin(r), -Math.cos(r)), 0);
      // Apoyado en lo más bajo (rejas o brazos encima del suelo, no clavados)
      const y = terreno.alturaEn(x, z) - caja.min.y;
      objeto.position.set(x, y, z);
      volteo.rotation.z = apero.angulo;
      objeto.updateMatrixWorld(true);
      const c = centro.clone().applyMatrix4(objeto.matrixWorld);
      const q = objeto.quaternion;
      cuerpo = mundo.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(c.x, c.y, c.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
      mundo.createCollider(RAPIER.ColliderDesc.cuboid(tam.x / 2, tam.y / 2, tam.z / 2).setFriction(0.6), cuerpo);
    },
    // Lo quita del patio (para engancharlo)
    recoge() {
      if (cuerpo) { mundo.removeRigidBody(cuerpo); cuerpo = null; }
      objeto.removeFromParent();
      if (pata) pata.visible = false;
    },
    get aparcado() { return cuerpo !== null; },
  };
  apero.pintaCarga();
  return apero;
}
