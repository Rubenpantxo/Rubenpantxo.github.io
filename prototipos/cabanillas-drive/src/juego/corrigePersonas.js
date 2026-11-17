// Correcciones de las personas de MakeHuman al cargarlas (tools/build_personas.py hace los GLB en
// Blender; aquí se arreglan sin rehacerlos):
//   - Piernas: el reposo de MakeHuman tiene las piernas abiertas (tobillos a ±0,20 m con las
//     caderas a ±0,11 m), y andar y quieto parten de ahí: se gira cada muslo hacia dentro, en el
//     reposo y en todas las animaciones, hasta tener el tobillo bajo la cadera.
//   - Manos: los dedos no se animan y quedan estirados; se cierran un poco (mano relajada).
import * as THREE from 'three';
import { PEATONES } from '../config/peatones.js';

const qA = new THREE.Quaternion();
const vA = new THREE.Vector3();
const vB = new THREE.Vector3();

export function corrigePersona(escena, animaciones) {
  const C = PEATONES.correccion;
  escena.updateMatrixWorld(true);
  const enMundo = (h, v = new THREE.Vector3()) => h.getWorldPosition(v);
  const raiz = escena.getWorldQuaternion(new THREE.Quaternion()).invert();
  const resultado = { piernas: [], dedos: 0 };

  // --- Piernas: giro sobre el eje hacia delante del cuerpo (Z local de la persona)
  for (const lado of ['l', 'r']) {
    const muslo = escena.getObjectByName(`thigh_${lado}`);
    const pie = escena.getObjectByName(`foot_${lado}`);
    if (!muslo || !pie) continue;
    const cadera = escena.worldToLocal(enMundo(muslo));
    const tobillo = escena.worldToLocal(enMundo(pie));
    const alto = cadera.y - tobillo.y;
    const signo = Math.sign(cadera.x) || 1;                  // hacia fuera
    const fuera = (tobillo.x - cadera.x) * signo;            // lo que se abre el tobillo (m)
    const quiere = -C.tobilloDentroM;                        // un poco por dentro de la cadera
    const angulo = Math.atan2(fuera, alto) - Math.atan2(quiere, alto);
    // Girar hacia dentro: la pierna de +X, sobre +Z en negativo (y la de −X, en positivo)
    const giroPersona = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -signo * angulo);
    // Pasado al espacio del padre del muslo: q' = P⁻¹ · G · P · q
    const P = muslo.parent.getWorldQuaternion(new THREE.Quaternion()).premultiply(raiz);
    const local = P.clone().invert().multiply(giroPersona).multiply(P);
    muslo.quaternion.premultiply(local);
    // Las animaciones: todas las claves del giro del muslo (y, si no tiene, una fija)
    for (const clip of animaciones) {
      const pista = clip.tracks.find((t) => t.name === `${muslo.name}.quaternion`);
      if (!pista) continue;
      const v = pista.values;
      for (let i = 0; i < v.length; i += 4) {
        qA.fromArray(v, i).premultiply(local).normalize().toArray(v, i);
      }
    }
    escena.updateMatrixWorld(true);
    const nuevo = escena.worldToLocal(enMundo(pie));
    resultado.piernas.push({ lado, grados: +(angulo * 180 / Math.PI).toFixed(1), tobilloAntes: +tobillo.x.toFixed(3), tobilloAhora: +nuevo.x.toFixed(3) });
  }

  // --- Dedos: cada falange se dobla hacia la palma
  for (const lado of ['l', 'r']) {
    const mano = escena.getObjectByName(`hand_${lado}`);
    const indice = escena.getObjectByName(`index_01_${lado}`);
    const menique = escena.getObjectByName(`pinky_01_${lado}`);
    if (!mano || !indice || !menique) continue;
    escena.updateMatrixWorld(true);
    // Normal de la palma: perpendicular a la mano, hacia el lado al que se doblan los dedos. En el
    // reposo de MakeHuman las palmas miran hacia el cuerpo (y algo hacia abajo)
    const m = enMundo(mano); const a = enMundo(indice, vA).sub(m); const b = enMundo(menique, vB).sub(m);
    const normal = new THREE.Vector3().crossVectors(a, b).normalize();
    const haciaCuerpo = new THREE.Vector3(-Math.sign(escena.worldToLocal(m.clone()).x), -0.5, 0).applyQuaternion(escena.getWorldQuaternion(new THREE.Quaternion()));
    if (normal.dot(haciaCuerpo) < 0) normal.negate();
    for (const dedo of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      for (const [k, flexion] of C.dedosRad.entries()) {
        const h = escena.getObjectByName(`${dedo}_0${k + 1}_${lado}`);
        const hijo = h?.children.find((x) => x.isBone);
        if (!h) continue;
        escena.updateMatrixWorld(true);
        const base = enMundo(h);
        const dir = hijo ? enMundo(hijo, vA).sub(base).normalize() : a.clone().normalize();
        // Eje: perpendicular a la falange y a la normal de la palma; el giro lleva la punta hacia la palma
        const eje = new THREE.Vector3().crossVectors(dir, normal).normalize();
        const rad = flexion * (dedo === 'thumb' ? C.pulgar : 1);
        const g = new THREE.Quaternion().setFromAxisAngle(eje, rad);
        const punta = dir.clone().applyQuaternion(g);
        if (punta.dot(normal) < dir.dot(normal)) g.setFromAxisAngle(eje, -rad);
        // En el espacio del padre: q' = P⁻¹ · G · P · q (P y G en el mundo)
        const P = h.parent.getWorldQuaternion(new THREE.Quaternion());
        h.quaternion.premultiply(P.clone().invert().multiply(g).multiply(P));
        resultado.dedos++;
      }
    }
  }
  escena.updateMatrixWorld(true);
  return resultado;
}
