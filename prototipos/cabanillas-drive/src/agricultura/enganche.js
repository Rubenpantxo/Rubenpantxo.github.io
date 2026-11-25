// Enganche tripuntal del tractor (PLAN_AGRICULTURA.md §5.6, fase A4). Los brazos giran sobre su eje
// y suben o bajan el apero colgado de las rótulas (Q o el botón del apero). Bajado, el apero sigue el
// terreno que tiene debajo (el tractor no siempre está en el mismo plano que la tierra que labra).
// El arado reversible da la vuelta cada vez que se levanta, como en la cabecera de la parcela.
//
// Todo cuelga de tractor.base (el modelo del tractor, suelo en y = 0, morro hacia +Z): los puntos
// del enganche (pivote de los brazos, rótulas) vienen de maquinaria.json.
import * as THREE from 'three';
import { ENGANCHE } from '../config/maquinaria.js';

const suave = (t) => t * t * (3 - 2 * t);

export function creaEnganche(tractor, { terreno }) {
  const datos = tractor.info.enganche;
  if (!datos) throw new Error('El tractor no tiene puntos de enganche en maquinaria.json');
  const P = new THREE.Vector3(...datos.pivote);
  const R = new THREE.Vector3(...datos.rotula);
  const L = Math.hypot(R.y - P.y, R.z - P.z);
  const a0 = Math.atan2(R.y - P.y, P.z - R.z);        // ángulo de los brazos en reposo (sobre la horizontal)

  // Brazos: giran en el pivote (rotation.x > 0 sube las rótulas)
  const pivote = new THREE.Group();
  pivote.name = 'pivote_tripuntal';
  pivote.position.copy(P);
  tractor.base.add(pivote);
  if (tractor.tripuntal) {
    const ajuste = new THREE.Group();
    ajuste.matrixAutoUpdate = false;
    ajuste.matrix.makeTranslation(-P.x, -P.y, -P.z).multiply(tractor.tripuntal.matrizPadre);
    pivote.add(ajuste);
    ajuste.add(tractor.tripuntal.nodo);
    tractor.tripuntal.nodo.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  // El apero cuelga de aquí (origen en las rótulas)
  const soporte = new THREE.Group();
  soporte.name = 'soporte_apero';
  tractor.base.add(soporte);

  let apero = null;
  let bajado = false;
  let subida = 1;                 // 0 trabajando … 1 levantado
  let correccion = 0;             // m que se baja o sube el apero para seguir el suelo
  let anguloVolteo = 0;
  const v = new THREE.Vector3();

  const anguloPara = (y) => Math.asin(THREE.MathUtils.clamp((y - P.y) / L, -0.95, 0.95)) - a0;

  function coloca() {
    const alto = apero ? apero.info.alto_bulon : R.y;
    const yTrabajo = alto + correccion;
    const y = apero ? THREE.MathUtils.lerp(yTrabajo, alto + ENGANCHE.subidaM, suave(subida)) : R.y + 0.12;
    const th = anguloPara(y);
    pivote.rotation.x = th;
    soporte.position.set(0, P.y + L * Math.sin(a0 + th), P.z - L * Math.cos(a0 + th));
    soporte.rotation.x = -0.18 * th;            // el tercer punto lo mantiene casi derecho
  }
  coloca();

  // Punto del apero en el mundo (coordenadas locales del apero: origen en los bulones)
  function puntoApero(x, y, z, salida = new THREE.Vector3()) {
    soporte.updateWorldMatrix(true, false);
    return salida.set(x, y, z).applyMatrix4(soporte.matrixWorld);
  }

  return {
    get apero() { return apero; },
    get bajado() { return bajado; },
    get subida() { return subida; },
    // Apero clavado en la tierra (bajado del todo)
    get trabajando() { return Boolean(apero) && bajado && subida < 0.06; },
    engancha(nuevo) {
      apero = nuevo;
      soporte.add(apero.objeto);
      apero.objeto.position.set(0, 0, 0);
      apero.objeto.rotation.set(0, 0, 0);
      anguloVolteo = apero.angulo;
      apero.volteo.rotation.z = anguloVolteo;
      if (apero.ruedaControl) apero.ruedaControl.rotation.z = -anguloVolteo;
      bajado = false;
      subida = 1;
      correccion = 0;
      coloca();
    },
    desengancha() {
      const viejo = apero;
      if (viejo) viejo.objeto.removeFromParent();
      apero = null;
      bajado = false;
      subida = 1;
      coloca();
      return viejo;
    },
    // Subir o bajar (Q o el botón): al subir el reversible, da la vuelta
    alterna() {
      if (!apero) return null;
      bajado = !bajado;
      if (!bajado && apero.info.reversible) apero.angulo = apero.angulo ? 0 : Math.PI;
      return bajado;
    },
    pon(valor) { if (apero && valor !== bajado) this.alterna(); },
    puntoApero,
    // Centro de la línea de trabajo, en el suelo
    puntoTrabajo(salida) { return apero ? puntoApero(0, apero.info.suelo_y, apero.info.trabajo_z, salida) : null; },
    actualiza(dt) {
      if (!apero) { coloca(); return; }
      const objetivo = bajado ? 0 : 1;
      const paso = dt / ENGANCHE.segundosSubir;
      subida += Math.max(-paso, Math.min(paso, objetivo - subida));
      // Bajado: el apero sigue el suelo de debajo (se compara su plano de trabajo con el terreno)
      if (bajado && subida < 0.5) {
        const p = puntoApero(0, apero.info.suelo_y, apero.info.trabajo_z, v);
        const error = terreno.alturaEn(p.x, p.z) - p.y;
        correccion = THREE.MathUtils.clamp(correccion + error * Math.min(1, ENGANCHE.seguimientoSuelo * dt), -0.4, 0.4);
      } else {
        correccion *= Math.max(0, 1 - 3 * dt);
      }
      // Volteo del reversible, ya levantado
      if (anguloVolteo !== apero.angulo && subida > 0.75) {
        const pasoV = (Math.PI * dt) / ENGANCHE.segundosVoltear;
        anguloVolteo += Math.max(-pasoV, Math.min(pasoV, apero.angulo - anguloVolteo));
        apero.volteo.rotation.z = anguloVolteo;
        if (apero.ruedaControl) apero.ruedaControl.rotation.z = -anguloVolteo;    // la rueda queda abajo
      }
      coloca();
    },
  };
}
