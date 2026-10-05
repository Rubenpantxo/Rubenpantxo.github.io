// A pie: el jugador se baja del coche y camina en primera persona. Cápsula con el controlador
// de personaje de Rapier (sube bordillos y escalones bajos, resbala en pendientes fuertes y
// choca con edificios, árboles y coches).
import * as THREE from 'three';
import { PEATON } from '../config/peaton.js';

export function creaPeaton(fisica, terreno) {
  const { RAPIER, mundo } = fisica;
  const radio = PEATON.radioM;
  const mitad = (PEATON.altoM - 2 * radio) / 2;          // semialtura del cilindro de la cápsula
  const cuerpo = mundo.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -200, 0));
  const collider = mundo.createCollider(RAPIER.ColliderDesc.capsule(mitad, radio), cuerpo);
  collider.setEnabled(false);
  const control = mundo.createCharacterController(0.03);
  control.setUp({ x: 0, y: 1, z: 0 });
  control.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(50));
  control.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(35));
  control.enableAutostep(PEATON.escalonM, 0.2, true);
  control.enableSnapToGround(0.4);
  control.setApplyImpulsesToDynamicBodies(false);   // andando no se empuja el coche

  let activo = false;
  let guinada = 0;          // giro sobre Y de la mirada (0 = mirando al norte, −Z)
  let cabeceo = 0;
  let vy = 0;
  let enSuelo = false;
  const velocidad = new THREE.Vector3();
  const deseado = { x: 0, y: 0, z: 0 };

  function coloca(x, z, rumboGuinada) {
    const y = terreno.alturaEn(x, z) + mitad + radio + 0.05;
    cuerpo.setTranslation({ x, y, z }, true);
    cuerpo.setNextKinematicTranslation({ x, y, z });
    guinada = rumboGuinada;
    cabeceo = 0;
    vy = 0;
  }

  return {
    get activo() { return activo; },
    activa(x, z, rumboGuinada) {
      activo = true;
      collider.setEnabled(true);
      coloca(x, z, rumboGuinada);
    },
    desactiva() {
      activo = false;
      collider.setEnabled(false);
      cuerpo.setTranslation({ x: 0, y: -200, z: 0 }, true);
    },
    // Hueco libre para aparecer (que no caiga dentro de un edificio o de un coche)
    libre(x, z) {
      const y = terreno.alturaEn(x, z) + mitad + radio + 0.1;
      let choca = false;
      mundo.intersectionsWithShape({ x, y, z }, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Capsule(mitad, radio),
        () => { choca = true; return false; }, undefined, undefined, collider);
      return !choca;
    },
    // Mirada: arrastre del ratón o del dedo (px) y flechas (−1…1)
    mira(dxPx, dyPx, giroTeclas, dt) {
      guinada -= dxPx * PEATON.sensibilidad + giroTeclas * PEATON.giroTeclasRad * dt;
      cabeceo = THREE.MathUtils.clamp(cabeceo - dyPx * PEATON.sensibilidad, -1.35, 1.35);
    },
    // Un paso de física: entrada → movimiento con colisiones
    paso({ avance, lateral, correr }, dt) {
      if (!activo) return;
      const vMax = correr ? PEATON.correrMs : PEATON.andarMs;
      const fx = -Math.sin(guinada);
      const fz = -Math.cos(guinada);
      let mx = fx * avance + -fz * lateral;      // derecha = (−fz, fx)
      let mz = fz * avance + fx * lateral;
      const largo = Math.hypot(mx, mz);
      if (largo > 1) { mx /= largo; mz /= largo; }
      // Arranca y para con suavidad
      const k = 1 - Math.exp(-dt * 12);
      velocidad.x += (mx * vMax - velocidad.x) * k;
      velocidad.z += (mz * vMax - velocidad.z) * k;
      vy = enSuelo ? -1 : Math.max(vy - 9.81 * dt, -30);
      deseado.x = velocidad.x * dt;
      deseado.y = vy * dt;
      deseado.z = velocidad.z * dt;
      control.computeColliderMovement(collider, deseado);
      const mov = control.computedMovement();
      enSuelo = control.computedGrounded();
      const p = cuerpo.translation();
      // Nunca por debajo del terreno (por si el paso de física se salta el heightfield)
      const suelo = terreno.alturaEn(p.x + mov.x, p.z + mov.z) + mitad + radio;
      cuerpo.setNextKinematicTranslation({ x: p.x + mov.x, y: Math.max(p.y + mov.y, suelo - 0.02), z: p.z + mov.z });
    },
    colocaCamara(camara) {
      const p = cuerpo.translation();
      camara.position.set(p.x, p.y - (mitad + radio) + PEATON.ojosM, p.z);
      camara.rotation.set(cabeceo, guinada, 0, 'YXZ');
    },
    // Para el HUD: posición, dirección de la mirada y velocidad en km/h
    estado() {
      const p = cuerpo.translation();
      return {
        posicion: new THREE.Vector3(p.x, p.y, p.z),
        adelante: new THREE.Vector3(-Math.sin(guinada), 0, -Math.cos(guinada)),
        velocidadKmh: Math.hypot(velocidad.x, velocidad.z) * 3.6,
        volcado: false,
      };
    },
    get radio() { return radio; },
  };
}
