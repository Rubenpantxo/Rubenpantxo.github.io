// Render según la altura de la cámara durante el salto:
// - near crece con la altura (con 0,5 m y miles de metros de far, los tejados parpadearían)
// - far y niebla del aire (la niebla esconde el borde de la zona y, en S1, el del horizonte)
// - sin oclusión ambiental en lo alto
// Al terminar, todo vuelve a los valores de la calidad.
import * as THREE from 'three';
import { CALIDAD } from '../config/calidad.js';
import { SALTO } from '../config/salto.js';

// «detalles»: funciones (valor) => … que muestran u ocultan detalle que desde lo alto no se ve
export function creaAlturaRender({ camara, escena, render, detalles = [] }) {
  const R = SALTO.render;
  const aire = R.aire[CALIDAD.nivel] ?? R.aire.medio;
  const base = {
    near: camara.near,
    far: camara.far,
    nieblaCerca: escena.fog?.near ?? 0,
    nieblaLejos: escena.fog?.far ?? 0,
  };
  let activo = false;

  return {
    activa() { activo = true; },
    // «h»: altura de la cámara sobre el suelo (m)
    actualiza(h) {
      if (!activo) return;
      const k = THREE.MathUtils.smoothstep(h, R.alturaSueloM, R.alturaAireM);
      const near = THREE.MathUtils.clamp(R.nearPorMetro * h, base.near, R.nearMax);
      const far = THREE.MathUtils.lerp(base.far, Math.max(base.far, aire.lejos), k);
      if (Math.abs(near - camara.near) > 1e-3 || Math.abs(far - camara.far) > 0.5) {
        camara.near = near;
        camara.far = far;
        camara.updateProjectionMatrix();
      }
      if (escena.fog) {
        escena.fog.near = THREE.MathUtils.lerp(base.nieblaCerca, Math.max(base.nieblaCerca, aire.niebla.cerca), k);
        escena.fog.far = THREE.MathUtils.lerp(base.nieblaLejos, Math.max(base.nieblaLejos, aire.niebla.lejos), k);
      }
      render.ponAo?.(h < R.alturaEfectosM);
      for (const f of detalles) f(h < R.alturaFachadasM);
    },
    restaura() {
      activo = false;
      camara.near = base.near;
      camara.far = base.far;
      camara.updateProjectionMatrix();
      if (escena.fog) {
        escena.fog.near = base.nieblaCerca;
        escena.fog.far = base.nieblaLejos;
      }
      render.ponAo?.(true);
      for (const f of detalles) f(true);
    },
  };
}
