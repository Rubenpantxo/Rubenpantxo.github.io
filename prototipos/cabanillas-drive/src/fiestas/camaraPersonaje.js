// Cámara del jugador del modo fiestas: detrás del hombro, girando con el ratón o el dedo. Si una
// fachada tapa la vista se acerca al jugador, y si hay una vaca cerca que queda fuera de la
// imagen (F3) gira sola hacia ella cuando no se está moviendo la cámara. V o 👁 cambia de vista.
import * as THREE from 'three';
import { FIESTAS } from '../config/fiestas.js';
import { PEATON } from '../config/peaton.js';

export function creaCamaraPersonaje({ camara, fisica, terreno, colliderJugador, transparentes = new Set() }) {
  const C = FIESTAS.camara;
  const { RAPIER, mundo } = fisica;
  let guinada = 0;                     // 0 = mirando al norte, como en juego/peaton.js
  let cabeceo = -C.cabeceoInicial;     // negativo = mirando hacia abajo
  let vista = 0;
  let distancia = C.vistas[0].distanciaM;
  let sinTocar = 10;                   // segundos desde que el jugador movió la cámara
  const pivote = new THREE.Vector3();
  const adelante = new THREE.Vector3();
  const destino = new THREE.Vector3();
  // Las vallas tienen una colisión más alta que ellas y se ve a través: no cuentan para la cámara
  const cuenta = (collider) => !transparentes.has(collider.handle);

  function aplicaFov() {
    if (camara.fov !== C.fov) { camara.fov = C.fov; camara.updateProjectionMatrix(); }
  }

  return {
    get guinada() { return guinada; },
    get vista() { return C.vistas[vista].nombre; },
    reinicia(g) {
      guinada = g;
      cabeceo = -C.cabeceoInicial;
      distancia = C.vistas[vista].distanciaM;
      aplicaFov();
    },
    cambiaVista() {
      vista = (vista + 1) % C.vistas.length;
      return C.vistas[vista].nombre;
    },
    // Arrastre del ratón o del dedo (px) y flechas (−1…1)
    mira(dxPx, dyPx, giroTeclas, dt) {
      if (dxPx || dyPx || giroTeclas) sinTocar = 0; else sinTocar += dt;
      guinada -= dxPx * PEATON.sensibilidad + giroTeclas * PEATON.giroTeclasRad * dt;
      cabeceo = THREE.MathUtils.clamp(cabeceo - dyPx * PEATON.sensibilidad, -C.cabeceo[1], -C.cabeceo[0]);
    },
    // «pies»: posición del jugador; «vaca»: posición de la más cercana o null
    coloca(pies, dt, vaca = null) {
      aplicaFov();
      const v = C.vistas[vista];
      // Que no se pierda de vista a la vaca: si está cerca y fuera del ángulo, la cámara gira hacia ella
      if (vaca && sinTocar > C.vaca.esperaS) {
        const dx = vaca.x - pies.x; const dz = vaca.z - pies.z;
        if (Math.hypot(dx, dz) < C.vaca.hastaM) {
          let giro = Math.atan2(-dx, -dz) - guinada;
          giro = Math.atan2(Math.sin(giro), Math.cos(giro));
          if (Math.abs(giro) > C.vaca.margenRad) guinada += Math.sign(giro) * Math.min(Math.abs(giro) - C.vaca.margenRad, C.vaca.giroRad * dt);
        }
      }
      const cc = Math.cos(cabeceo);
      adelante.set(-Math.sin(guinada) * cc, Math.sin(cabeceo), -Math.cos(guinada) * cc);
      // Pivote sobre el hombro derecho
      pivote.set(pies.x + Math.cos(guinada) * v.hombroM, pies.y + v.alturaM, pies.z - Math.sin(guinada) * v.hombroM);
      let d = v.distanciaM;
      if (d > 0) {
        const rayo = new RAPIER.Ray(pivote, { x: -adelante.x, y: -adelante.y, z: -adelante.z });
        const impacto = mundo.castRay(rayo, d + C.margenM, true, undefined, undefined, colliderJugador, undefined, cuenta);
        if (impacto) d = Math.max(C.distanciaMinimaM, (impacto.timeOfImpact ?? impacto.toi) - C.margenM);
      }
      // Acercarse es inmediato (que no se meta en la pared); alejarse, suave
      distancia = d < distancia ? d : distancia + (d - distancia) * (1 - Math.exp(-dt * C.suavizado));
      destino.copy(pivote).addScaledVector(adelante, -distancia);
      destino.y = Math.max(destino.y, terreno.alturaEn(destino.x, destino.z) + 0.3);
      camara.position.copy(destino);
      camara.rotation.set(cabeceo, guinada, 0, 'YXZ');
    },
  };
}
