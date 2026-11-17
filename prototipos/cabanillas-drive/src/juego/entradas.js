// Puntos de entrada en el mundo (F7): un aro dorado en el suelo que gira y un rótulo encima en
// cada sitio de src/config/entradas.js con posición. Dice en qué entrada está el jugador y qué
// lugares añade al minimapa y a «Ir a…».
import * as THREE from 'three';
import { ENTRADA, ENTRADAS } from '../config/entradas.js';
import { rotulo } from '../escena/carteles.js';

export function creaEntradas({ terreno, lista = ENTRADAS }) {
  const M = ENTRADA.marcador;
  const raiz = new THREE.Group();
  raiz.name = 'entradas';
  const conSitio = lista.filter((e) => Array.isArray(e.en));
  const material = new THREE.MeshBasicMaterial({ color: M.color, transparent: true, opacity: 0.85, depthWrite: false });
  const aro = new THREE.TorusGeometry(M.radioM, 0.07, 8, 48);
  aro.rotateX(Math.PI / 2);
  const marcas = conSitio.map((e) => {
    const [x, z] = e.en;
    const y = terreno.alturaEn(x, z);
    const grupo = new THREE.Group();
    grupo.name = `entrada_${e.id}`;
    grupo.position.set(x, y, z);
    const anillo = new THREE.Mesh(aro, material);
    anillo.position.y = 0.12;
    anillo.userData.sinSombra = true;
    const cartel = rotulo(e.nombre, null, e.icono);
    cartel.position.y = M.altoRotuloM;
    grupo.add(anillo, cartel);
    raiz.add(grupo);
    return { e, grupo, anillo, cartel };
  });
  let t = 0;

  return {
    raiz,
    // Para el minimapa y «Ir a…»
    lugares: conSitio.map((e) => ({ nombre: e.nombre, tipo: 'entrada', icono: e.icono, x: e.en[0], z: e.en[1], entrada: e.id })),
    // La entrada en la que está (x, z), o null
    en(x, z) {
      let mejor = null; let d0 = ENTRADA.radioM;
      for (const e of conSitio) {
        const d = Math.hypot(x - e.en[0], z - e.en[1]);
        if (d < d0) { d0 = d; mejor = e; }
      }
      return mejor;
    },
    porId: (id) => lista.find((e) => e.id === id) ?? null,
    mostrar(visible) { raiz.visible = visible; },
    actualiza(dt) {
      t += dt;
      for (const m of marcas) {
        m.anillo.rotation.y += M.giroRad * dt;
        const latido = 1 + Math.sin(t * 3) * 0.06;
        m.anillo.scale.set(latido, 1, latido);
        m.cartel.position.y = M.altoRotuloM + Math.sin(t * 1.6) * 0.15;
      }
    },
  };
}
