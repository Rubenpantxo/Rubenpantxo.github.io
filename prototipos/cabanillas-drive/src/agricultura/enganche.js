// Enganche del tractor (PLAN_AGRICULTURA.md §5.6, fases A4–A5).
// - Tripuntal (aperos suspendidos: arado, cultivador, abonadora): los brazos giran en su eje y suben o
//   bajan el apero colgado de las rótulas (Q o el botón del apero). Bajado, el apero que se clava
//   sigue el terreno de debajo. El arado reversible da la vuelta cada vez que se levanta. Si el apero
//   tiene entrada de toma de fuerza (abonadora), un cardán la une a la del tractor.
// - Barra de tiro (aperos arrastrados: sembradora): la lanza va enganchada a la barra y el apero
//   sigue al tractor sobre sus ruedas como un remolque (su eje va hacia el enganche, como en la
//   realidad: en las curvas va por dentro y marcha atrás se cruza), con un giro máximo de la lanza.
//   Es cinemático (no tiene cuerpo en la física): no choca con nada, y no se vuelca.
//
// Todo lo suspendido cuelga de tractor.base (el modelo del tractor, suelo en y = 0, morro hacia +Z);
// lo arrastrado va en el mundo. Los puntos del enganche vienen de maquinaria.json.
import * as THREE from 'three';
import { ARRASTRE, ENGANCHE } from '../config/maquinaria.js';

const suave = (t) => t * t * (3 - 2 * t);

export function creaEnganche(tractor, { terreno, raiz }) {
  const datos = tractor.info.enganche;
  if (!datos) throw new Error('El tractor no tiene puntos de enganche en maquinaria.json');
  const P = new THREE.Vector3(...datos.pivote);
  const R = new THREE.Vector3(...datos.rotula);
  const B = new THREE.Vector3(...(datos.barra_tiro ?? [0, 0.42, R.z]));
  const T = new THREE.Vector3(...(datos.toma_fuerza ?? [0, 0.78, R.z + 0.3]));
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
  // El apero suspendido cuelga de aquí (origen en las rótulas)
  const soporte = new THREE.Group();
  soporte.name = 'soporte_apero';
  tractor.base.add(soporte);
  // Cardán de la toma de fuerza (cilindro de 1 m que se estira entre la toma del tractor y la del apero)
  const cardan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 1, 10).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0xd9a400 }),
  );
  cardan.name = 'cardan';
  cardan.castShadow = true;
  cardan.visible = false;
  tractor.base.add(cardan);

  let apero = null;
  let bajado = false;
  let subida = 1;                 // 0 trabajando … 1 levantado
  let correccion = 0;             // m que se baja o sube el apero para seguir el suelo
  let anguloVolteo = 0;
  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);

  // Arrastrado: posición del eje de sus ruedas (en el suelo) y distancia de la lanza al eje
  const eje = new THREE.Vector3();
  let largoLanza = 0;
  let hayEje = false;
  const enganchado = new THREE.Vector3();
  const adelante = new THREE.Vector3();
  const maxGiro = (ARRASTRE.anguloMaxGrados * Math.PI) / 180;

  const anguloPara = (y) => Math.asin(THREE.MathUtils.clamp((y - P.y) / L, -0.95, 0.95)) - a0;
  const suspendido = () => apero && !apero.arrastrado;

  function coloca() {
    const alto = suspendido() ? apero.info.alto_bulon : R.y;
    const yTrabajo = alto + correccion;
    const y = suspendido() ? THREE.MathUtils.lerp(yTrabajo, alto + ENGANCHE.subidaM, suave(subida)) : R.y + 0.12;
    const th = anguloPara(y);
    pivote.rotation.x = th;
    soporte.position.set(0, P.y + L * Math.sin(a0 + th), P.z - L * Math.cos(a0 + th));
    soporte.rotation.x = -0.18 * th;            // el tercer punto lo mantiene casi derecho
    // Cardán: de la toma de fuerza del tractor a la entrada del apero
    if (suspendido() && apero.info.entrada_tdf) {
      soporte.updateMatrix();
      w.fromArray(apero.info.entrada_tdf).applyMatrix4(soporte.matrix);
      v.subVectors(w, T);
      cardan.position.copy(T);
      cardan.quaternion.setFromUnitVectors(arriba, v.clone().normalize());
      cardan.scale.set(1, v.length(), 1);
      cardan.visible = true;
    } else {
      cardan.visible = false;
    }
  }
  coloca();

  // Barra de tiro en el mundo
  function puntoBarra(salida) {
    tractor.base.updateWorldMatrix(true, false);
    return salida.copy(B).applyMatrix4(tractor.base.matrixWorld);
  }
  // Arrastrado: el eje va hacia la lanza (tractriz), con giro limitado; luego se apoya en el suelo
  function arrastra(dt) {
    puntoBarra(enganchado);
    adelante.set(0, 0, 1).transformDirection(tractor.base.matrixWorld).setY(0).normalize();
    let dx = enganchado.x - eje.x;
    let dz = enganchado.z - eje.z;
    let d = Math.hypot(dx, dz);
    if (!hayEje || d > largoLanza + 1.5 || d < 0.2) {         // recién enganchado o el tractor ha saltado
      dx = adelante.x; dz = adelante.z; d = 1;
      hayEje = true;
    }
    dx /= d; dz /= d;
    // Giro de la lanza respecto al tractor, limitado
    let giro = Math.atan2(dx, dz) - Math.atan2(adelante.x, adelante.z);
    giro = Math.atan2(Math.sin(giro), Math.cos(giro));
    if (Math.abs(giro) > maxGiro) {
      const a = Math.atan2(adelante.x, adelante.z) + Math.sign(giro) * maxGiro;
      dx = Math.sin(a); dz = Math.cos(a);
    }
    const antesX = eje.x;
    const antesZ = eje.z;
    eje.set(enganchado.x - dx * largoLanza, 0, enganchado.z - dz * largoLanza);
    const avance = (eje.x - antesX) * dx + (eje.z - antesZ) * dz;      // m hacia delante este fotograma
    // Cabeceo: la rueda en el suelo y la lanza en la barra; alabeo: lo que se inclina el terreno de lado
    const info = apero.info;
    const yRueda = info.suelo_y + info.rueda_r;                         // centro de la rueda, local
    const objetivo = terreno.alturaEn(eje.x, eje.z) + info.rueda_r - enganchado.y;
    const cabeceo = Math.asin(THREE.MathUtils.clamp((objetivo - yRueda) / largoLanza, -0.6, 0.6));
    const media = info.via / 2;
    const hI = terreno.alturaEn(eje.x + dz * media, eje.z - dx * media);     // la izquierda de la marcha
    const hD = terreno.alturaEn(eje.x - dz * media, eje.z + dx * media);
    const o = apero.objeto;
    o.position.copy(enganchado);
    o.rotation.set(cabeceo, Math.atan2(dx, dz), Math.atan2(hI - hD, info.via), 'YXZ');
    for (const r of apero.ruedas) r.rotation.x += avance / info.rueda_r;
    return avance;
  }

  // Punto del apero en el mundo (coordenadas locales del apero: origen en los bulones o en el ojo de la lanza)
  function puntoApero(x, y, z, salida = new THREE.Vector3()) {
    const marco = apero?.arrastrado ? apero.objeto : soporte;
    marco.updateWorldMatrix(true, false);
    return salida.set(x, y, z).applyMatrix4(marco.matrixWorld);
  }

  return {
    get apero() { return apero; },
    get bajado() { return bajado; },
    get subida() { return subida; },
    get cardan() { return cardan; },
    // Apero en posición de trabajo (bajado del todo)
    get trabajando() { return Boolean(apero) && bajado && subida < 0.06; },
    // Toma de fuerza en marcha (abonadora bajada: los discos giran)
    get tdf() { return Boolean(apero?.info.entrada_tdf) && bajado && subida < 0.5; },
    engancha(nuevo) {
      apero = nuevo;
      apero.objeto.rotation.set(0, 0, 0);
      if (apero.arrastrado) {
        raiz.add(apero.objeto);
        largoLanza = Math.abs(apero.info.eje_z);
        hayEje = false;
        arrastra(0);
      } else {
        soporte.add(apero.objeto);
        apero.objeto.position.set(0, 0, 0);
      }
      anguloVolteo = apero.angulo;
      apero.volteo.rotation.z = anguloVolteo;
      if (apero.ruedaControl) apero.ruedaControl.rotation.z = -anguloVolteo;
      bajado = false;
      subida = 1;
      correccion = 0;
      apero.ponRejas?.(1);
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
    // Centro del eje de las ruedas del apero arrastrado (para sus rodadas), en el suelo
    ejeApero(salida) { return apero?.arrastrado ? salida.copy(eje).setY(terreno.alturaEn(eje.x, eje.z)) : null; },
    actualiza(dt) {
      if (!apero) { coloca(); return 0; }
      const objetivo = bajado ? 0 : 1;
      const paso = dt / ENGANCHE.segundosSubir;
      subida += Math.max(-paso, Math.min(paso, objetivo - subida));
      let avance = 0;
      if (apero.arrastrado) {
        apero.ponRejas(suave(subida));
        avance = arrastra(dt);
      } else if (bajado && subida < 0.5 && apero.info.profundidad > 0) {
        // Bajado: el apero que se clava sigue el suelo de debajo (su plano de trabajo con el terreno)
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
      // Discos de la abonadora con la toma de fuerza (giran en sentidos contrarios)
      if (apero.discos.length && this.tdf) {
        const vel = ((apero.config.discosRpm ?? 540) / 60) * 2 * Math.PI * dt;
        apero.discos.forEach((d, k) => { d.rotation.y += k % 2 ? -vel : vel; });
      }
      coloca();
      return avance;
    },
  };
}
