// Cámara del salto: alrededor del avión, detrás y por encima del personaje en la caída y más
// atrás en el planeo (para ver la lona). La guiñada la marca el rumbo del personaje (el ratón y
// A/D lo giran); el cabeceo, el de cada fase más lo que se mueva el ratón en vertical.
import * as THREE from 'three';
import { SALTO } from '../config/salto.js';

const AJUSTES = {
  avion: { distancia: 'distanciaAvion', cabeceo: 'cabeceoAvion', fov: 'fovAvion' },
  caida: { distancia: 'distanciaCaida', cabeceo: 'cabeceoCaida', fov: 'fovCaida' },
  planeo: { distancia: 'distanciaPlaneo', cabeceo: 'cabeceoPlaneo', fov: 'fovPlaneo' },
};

export function creaCamaraSalto({ camara, terreno }) {
  const C = SALTO.camara;
  let distancia = C.distanciaAvion;
  let cabeceoBase = C.cabeceoAvion;
  let extraCabeceo = 0;
  let guinadaAvion = 0;          // en el avión, la cámara gira sola alrededor (con el ratón)
  const objetivo = new THREE.Vector3();
  let primera = true;
  let guinadaActual = 0;         // se acerca a la pedida por el camino corto (sin saltos al cambiar de fase)

  return {
    // Mirada del ratón o del dedo (px): en el avión gira la cámara; luego, el rumbo lo gira salto.js
    mira(dxPx, dyPx, enAvion) {
      if (enAvion) guinadaAvion -= dxPx * C.sensibilidad;
      extraCabeceo = THREE.MathUtils.clamp(extraCabeceo + dyPx * C.sensibilidad, -0.6, 0.7);
    },
    // fase: 'avion' | 'caida' | 'planeo'; «centro»: lo que se sigue; «rumbo»: guiñada
    actualiza(dt, fase, centro, rumbo) {
      const a = AJUSTES[fase] ?? AJUSTES.caida;
      const k = primera ? 1 : 1 - Math.exp(-dt * C.suavizado);
      primera = false;
      distancia += (C[a.distancia] - distancia) * k;
      cabeceoBase += (C[a.cabeceo] - cabeceoBase) * k;
      const fov = C[a.fov];
      if (Math.abs(camara.fov - fov) > 0.05) {
        camara.fov += (fov - camara.fov) * k;
        camara.updateProjectionMatrix();
      }
      const alto = fase === 'planeo' ? C.alturaObjetivoPlaneo : 0;
      objetivo.set(centro.x, centro.y + alto, centro.z);
      const pedida = fase === 'avion' ? rumbo + guinadaAvion : rumbo;
      if (primera || k === 1) guinadaActual = pedida;
      const diferencia = Math.atan2(Math.sin(pedida - guinadaActual), Math.cos(pedida - guinadaActual));
      guinadaActual += diferencia * (1 - Math.exp(-dt * C.suavizado * 2.5));
      const guinada = guinadaActual;
      const cabeceo = THREE.MathUtils.clamp(cabeceoBase + extraCabeceo, -0.25, 1.45);
      // Detrás del objetivo según la guiñada y por encima según el cabeceo
      const horizontal = Math.cos(cabeceo) * distancia;
      camara.position.set(
        objetivo.x + Math.sin(guinada) * horizontal,
        objetivo.y + Math.sin(cabeceo) * distancia,
        objetivo.z + Math.cos(guinada) * horizontal,
      );
      const suelo = terreno.alturaEn(camara.position.x, camara.position.z) + C.alturaMinimaM;
      if (camara.position.y < suelo) camara.position.y = suelo;
      camara.lookAt(objetivo);
    },
    // Al pasar de fase, el ratón vuelve a la mirada de la fase
    reiniciaMirada() { extraCabeceo = 0; },
  };
}
