// Coche con DynamicRayCastVehicleController de Rapier: chasis caja, 4 ruedas, tracción trasera.
// Ejes locales del chasis: Y = arriba, Z = adelante (la izquierda es +X).
import * as THREE from 'three';
import { VEHICULO } from '../config/vehiculo.js';
import { creaModeloCoche } from './modeloCoche.js';

const DELANTERAS = [0, 1];
const TRASERAS = [2, 3];

export function creaCoche(fisica, escena) {
  const { RAPIER, mundo } = fisica;
  const { chasis, ruedas, motor, frenos, direccion } = VEHICULO;

  const cuerpo = mundo.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setLinearDamping(chasis.amortiguacionLineal)
      .setAngularDamping(chasis.amortiguacionAngular),
  );
  const { masa: m, ancho: a, alto: h, largo: l } = chasis;
  const inercia = { x: (m / 12) * (h * h + l * l), y: (m / 12) * (a * a + l * l), z: (m / 12) * (a * a + h * h) };
  const collider = mundo.createCollider(
    RAPIER.ColliderDesc.cuboid(a / 2, h / 2, l / 2)
      .setMassProperties(m, { x: 0, y: chasis.centroMasaY, z: 0 }, inercia, { w: 1, x: 0, y: 0, z: 0 })
      .setFriction(chasis.friccion),
    cuerpo,
  );

  const vehiculo = mundo.createVehicleController(cuerpo);
  vehiculo.indexUpAxis = 1;
  vehiculo.setIndexForwardAxis = 2;
  // Orden: 0 delantera izquierda, 1 delantera derecha, 2 trasera izquierda, 3 trasera derecha
  const anclajes = [
    [ruedas.via / 2, ruedas.alturaAnclaje, ruedas.distanciaEjes / 2],
    [-ruedas.via / 2, ruedas.alturaAnclaje, ruedas.distanciaEjes / 2],
    [ruedas.via / 2, ruedas.alturaAnclaje, -ruedas.distanciaEjes / 2],
    [-ruedas.via / 2, ruedas.alturaAnclaje, -ruedas.distanciaEjes / 2],
  ];
  for (let i = 0; i < anclajes.length; i++) {
    const [x, y, z] = anclajes[i];
    vehiculo.addWheel({ x, y, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, ruedas.suspensionReposo, ruedas.radio);
    vehiculo.setWheelMaxSuspensionTravel(i, ruedas.recorridoMax);
    vehiculo.setWheelSuspensionStiffness(i, ruedas.rigidez);
    vehiculo.setWheelSuspensionCompression(i, ruedas.compresion);
    vehiculo.setWheelSuspensionRelaxation(i, ruedas.relajacion);
    vehiculo.setWheelMaxSuspensionForce(i, ruedas.fuerzaMaxSuspension);
    vehiculo.setWheelFrictionSlip(i, ruedas.agarre);
    vehiculo.setWheelSideFrictionStiffness(i, ruedas.rigidezLateral);
  }

  const modelo = creaModeloCoche(chasis, ruedas);
  escena.add(modelo.grupo);

  let volante = 0;          // ángulo actual de la dirección (rad)
  const q = new THREE.Quaternion();
  const ejeY = new THREE.Vector3(0, 1, 0);

  function velocidad() {
    return vehiculo.currentVehicleSpeed(); // m/s, positiva hacia delante
  }

  // entrada: { acelerador 0..1, freno 0..1, direccion −1 (izq)..1 (der), frenoMano, analogica }
  function aplicaEntrada(entrada, dt) {
    const v = velocidad();
    const kmh = v * 3.6;

    // Dirección: menos ángulo cuanto más rápido; con teclado se gira y vuelve gradualmente
    const t = Math.min(Math.abs(kmh) / direccion.velocidadReferenciaKmh, 1);
    const anguloMax = direccion.anguloMax + (direccion.anguloMinAlta - direccion.anguloMax) * t;
    const objetivo = -entrada.direccion * anguloMax;   // girar a la derecha = hacia −X
    if (entrada.analogica) {
      volante = objetivo;
    } else {
      const rapidez = entrada.direccion === 0 ? direccion.velocidadRetorno : direccion.velocidadGiro;
      const paso = rapidez * dt;
      volante += Math.max(-paso, Math.min(paso, objetivo - volante));
    }
    for (const i of DELANTERAS) vehiculo.setWheelSteering(i, volante);

    // Motor y frenos: S frena y, ya parado, da marcha atrás
    let fuerza = 0;
    let freno = 0;
    if (entrada.acelerador > 0) {
      if (v < -0.5) freno = frenos.servicio * entrada.acelerador;
      else fuerza = motor.fuerza * entrada.acelerador * Math.max(0, 1 - kmh / motor.velocidadMaxKmh);
    }
    if (entrada.freno > 0) {
      if (v > 0.5) freno = Math.max(freno, frenos.servicio * entrada.freno);
      else fuerza = -motor.fuerzaMarchaAtras * entrada.freno * Math.max(0, 1 + kmh / motor.marchaAtrasKmh);
    }
    if (entrada.acelerador === 0 && entrada.freno === 0) freno = motor.frenoMotor;

    for (const i of TRASERAS) vehiculo.setWheelEngineForce(i, fuerza);
    for (const i of DELANTERAS) vehiculo.setWheelBrake(i, freno);
    for (const i of TRASERAS) {
      vehiculo.setWheelBrake(i, entrada.frenoMano ? frenos.mano : freno);
      vehiculo.setWheelFrictionSlip(i, entrada.frenoMano ? ruedas.agarreTraseroFrenoMano : ruedas.agarre);
    }
  }

  function paso(dt) {
    vehiculo.updateVehicle(dt);
  }

  // Copia la física al modelo 3D
  function sincroniza() {
    const p = cuerpo.translation();
    const r = cuerpo.rotation();
    modelo.grupo.position.set(p.x, p.y, p.z);
    modelo.grupo.quaternion.set(r.x, r.y, r.z, r.w);
    for (let i = 0; i < modelo.ruedas.length; i++) {
      const anclaje = vehiculo.wheelChassisConnectionPointCs(i);
      const largo = vehiculo.wheelSuspensionLength(i) ?? ruedas.suspensionReposo;
      const { pivote, giro } = modelo.ruedas[i];
      pivote.position.set(anclaje.x, anclaje.y - largo, anclaje.z);
      pivote.rotation.y = vehiculo.wheelSteering(i) ?? 0;
      giro.rotation.x = vehiculo.wheelRotation(i) ?? 0;
    }
  }

  // Coloca el coche parado en (x, y, z) mirando en la dirección (dx, dz)
  function recoloca(x, y, z, dx, dz) {
    const rumbo = Math.atan2(dx, dz);
    q.setFromAxisAngle(ejeY, rumbo);
    cuerpo.setTranslation({ x, y, z }, true);
    cuerpo.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    cuerpo.setLinvel({ x: 0, y: 0, z: 0 }, true);
    cuerpo.setAngvel({ x: 0, y: 0, z: 0 }, true);
    volante = 0;
    sincroniza();
  }

  function estado() {
    const p = cuerpo.translation();
    const r = cuerpo.rotation();
    q.set(r.x, r.y, r.z, r.w);
    const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const adelante = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const ruedasEnSuelo = [0, 1, 2, 3].filter((i) => vehiculo.wheelIsInContact(i)).length;
    return {
      posicion: new THREE.Vector3(p.x, p.y, p.z),
      cuaternion: q.clone(),
      adelante,
      volcado: arriba.y < 0.35,
      velocidadKmh: velocidad() * 3.6,
      ruedasEnSuelo,
    };
  }

  return { cuerpo, collider, vehiculo, modelo, aplicaEntrada, paso, sincroniza, recoloca, estado };
}
