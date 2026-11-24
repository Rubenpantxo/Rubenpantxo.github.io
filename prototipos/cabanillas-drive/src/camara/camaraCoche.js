// Cámara de persecución suavizada y vista desde el capó (tecla C / botón).
import * as THREE from 'three';
import { CAMARA } from '../config/camara.js';

export function creaCamaraCoche(camara, fisica, terreno, cocheInicial) {
  const { RAPIER, mundo } = fisica;
  // El vehículo puede cambiar (coche ↔ tractor en el modo agricultura): cada uno puede traer sus
  // distancias en config.camara (con la forma de CAMARA)
  let coche = cocheInicial;
  let ajustes = coche.config?.camara ?? CAMARA;
  let modo = 'persecucion';
  let iniciada = false;
  const posicion = new THREE.Vector3();
  const mira = new THREE.Vector3();
  const deseada = new THREE.Vector3();
  const objetivo = new THREE.Vector3();
  const plano = new THREE.Vector3();
  const desde = new THREE.Vector3();

  function aplicaFov(fov) {
    if (camara.fov !== fov) {
      camara.fov = fov;
      camara.updateProjectionMatrix();
    }
  }

  // Si un edificio tapa la vista, la cámara se acerca al coche
  function sinObstaculos(origen, destino) {
    const dir = new THREE.Vector3().subVectors(destino, origen);
    const distancia = dir.length();
    if (distancia < 1e-3) return destino;
    dir.divideScalar(distancia);
    const rayo = new RAPIER.Ray(origen, dir);
    const impacto = mundo.castRay(rayo, distancia, true, undefined, undefined, coche.collider, coche.cuerpo);
    if (!impacto) return destino;
    const toi = impacto.timeOfImpact ?? impacto.toi;
    const util = Math.max(ajustes.persecucion.distanciaMinima, toi - 0.4);
    return origen.clone().addScaledVector(dir, util);
  }

  function actualiza(dt) {
    const e = coche.estado();
    if (modo === 'capo') {
      const c = ajustes.capo;
      aplicaFov(c.fov);
      camara.position.set(...c.posicion).applyQuaternion(e.cuaternion).add(e.posicion);
      objetivo.set(0, c.posicion[1], c.mirarAdelante).applyQuaternion(e.cuaternion).add(e.posicion);
      camara.lookAt(objetivo);
      iniciada = false;
      return;
    }

    const c = ajustes.persecucion;
    aplicaFov(c.fov);
    // Solo el rumbo del coche (sin cabeceo ni balanceo) para que la cámara no se maree
    plano.copy(e.adelante).setY(0);
    if (plano.lengthSq() < 1e-4) plano.set(0, 0, 1);
    plano.normalize();
    deseada.copy(e.posicion).addScaledVector(plano, -c.detras);
    deseada.y += c.altura;
    desde.copy(e.posicion).setY(e.posicion.y + 1.2);
    const libre = sinObstaculos(desde, deseada);
    objetivo.copy(e.posicion).addScaledVector(plano, c.mirarAdelante);
    objetivo.y += c.alturaMirada;

    if (!iniciada) {
      posicion.copy(libre);
      mira.copy(objetivo);
      iniciada = true;
    } else {
      posicion.lerp(libre, 1 - Math.exp(-c.suavizadoPosicion * dt));
      mira.lerp(objetivo, 1 - Math.exp(-c.suavizadoMirada * dt));
    }
    const suelo = terreno.alturaEn(posicion.x, posicion.z) + 0.5;
    if (posicion.y < suelo) posicion.y = suelo;
    camara.position.copy(posicion);
    camara.lookAt(mira);
  }

  function cambia() {
    modo = modo === 'persecucion' ? 'capo' : 'persecucion';
    return modo;
  }

  function ponVehiculo(nuevo) {
    coche = nuevo;
    ajustes = coche.config?.camara ?? CAMARA;
    iniciada = false;
  }

  return { actualiza, cambia, ponVehiculo, get modo() { return modo; } };
}
