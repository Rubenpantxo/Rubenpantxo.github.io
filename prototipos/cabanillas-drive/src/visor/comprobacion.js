// Compara la superficie del GLB (simplificada y cuantizada) con terrain.f32, que es lo
// que usará la física. Lanza rayos verticales en puntos pseudoaleatorios repetibles.
import * as THREE from 'three';

export function compruebaTerreno(mallas, terreno, puntos) {
  const { tamaño_x_m: ancho, tamaño_z_m: alto } = terreno.meta;
  const rayo = new THREE.Raycaster();
  const abajo = new THREE.Vector3(0, -1, 0);
  const origen = new THREE.Vector3();
  let semilla = 12345;
  const aleatorio = () => {
    semilla = (semilla * 1664525 + 1013904223) % 4294967296;
    return semilla / 4294967296;
  };

  const difs = [];
  for (let i = 0; i < puntos; i++) {
    const x = (aleatorio() - 0.5) * (ancho - 2);
    const z = (aleatorio() - 0.5) * (alto - 2);
    rayo.set(origen.set(x, 1000, z), abajo);
    const impacto = rayo.intersectObjects(mallas, false)[0];
    if (impacto) difs.push(Math.abs(impacto.point.y - terreno.alturaEn(x, z)));
  }
  difs.sort((a, b) => a - b);
  const media = difs.reduce((s, d) => s + d, 0) / Math.max(difs.length, 1);
  return {
    puntos: difs.length,
    media,
    p95: difs[Math.floor(difs.length * 0.95)] ?? 0,
    maxima: difs[difs.length - 1] ?? 0,
  };
}
