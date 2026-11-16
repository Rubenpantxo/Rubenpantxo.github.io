// Correcciones del terreno: sitios donde el modelo del terreno (MDT del LiDAR) trae un bulto que
// no existe. Se aplanan al cargar el mundo, tanto en las alturas (física y todo lo que se apoya
// en el suelo) como en la malla que se ve. No se tocan los datos de tools/: es un parche en el
// juego; lo suyo sería corregirlo en el pipeline cuando se regenere el terreno.
import * as THREE from 'three';

export const CORRECCIONES_TERRENO = [
  // Montón de hasta 0,8 m delante del nº 5 de la Plaza del Ayuntamiento (el resto de la plaza es
  // llano: 0,7 % de pendiente). Rubén pidió quitarlo el 2026-11-17 al verlo bajo la arena.
  { nombre: 'montón delante del nº 5 de la plaza', centro: [178.3, 329.3], radio: 6.5, margen: 2.0 },
];

// Plano z = a·x + b·z + c ajustado a los puntos, descartando los que se salen (lo que quede del bulto)
function ajustaPlano(puntos) {
  let usados = puntos;
  let plano = [0, 0, 0];
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    let sxx = 0; let sxz = 0; let szz = 0; let sx = 0; let sz = 0; let sxy = 0; let szy = 0; let sy = 0;
    const n = usados.length;
    for (const [x, z, y] of usados) {
      sxx += x * x; sxz += x * z; szz += z * z; sx += x; sz += z; sxy += x * y; szy += z * y; sy += y;
    }
    const m = new THREE.Matrix3().set(sxx, sxz, sx, sxz, szz, sz, sx, sz, n);
    if (Math.abs(m.determinant()) < 1e-9) break;
    const v = new THREE.Vector3(sxy, szy, sy).applyMatrix3(m.invert());
    plano = [v.x, v.y, v.z];
    const cerca = puntos.filter(([x, z, y]) => Math.abs(y - (plano[0] * x + plano[1] * z + plano[2])) < 0.12);
    if (cerca.length < 12 || cerca.length === usados.length) break;
    usados = cerca;
  }
  return plano;
}

// Aplana las alturas del terreno (rejilla) y las mallas del GLB en cada corrección
export function corrigeTerreno(terreno, mallas = []) {
  const { meta, alturas } = terreno;
  const { filas, columnas, paso_m: paso } = meta;
  const x0 = meta.vertice_0.x;
  const z0 = meta.vertice_0.z;
  const suave = THREE.MathUtils.smoothstep;
  for (const c of CORRECCIONES_TERRENO) {
    const [cx, cz] = c.centro;
    // Plano del suelo de alrededor: el anillo de 3 m por fuera del radio
    const anillo = [];
    const nodos = [];
    const f0 = Math.max(0, Math.floor((cz - c.radio - 3 - z0) / paso));
    const f1 = Math.min(filas - 1, Math.ceil((cz + c.radio + 3 - z0) / paso));
    const c0 = Math.max(0, Math.floor((cx - c.radio - 3 - x0) / paso));
    const c1 = Math.min(columnas - 1, Math.ceil((cx + c.radio + 3 - x0) / paso));
    for (let f = f0; f <= f1; f++) {
      for (let k = c0; k <= c1; k++) {
        const x = x0 + k * paso; const z = z0 + f * paso;
        const d = Math.hypot(x - cx, z - cz);
        if (d <= c.radio) nodos.push([f * columnas + k, x, z, d]);
        else if (d <= c.radio + 3) anillo.push([x, z, alturas[f * columnas + k]]);
      }
    }
    const [a, b, k0] = ajustaPlano(anillo);
    const plano = (x, z) => a * x + b * z + k0;
    // Dentro del radio, el plano; en el margen del borde se funde con lo que había
    const peso = (d) => suave(d, c.radio - c.margen, c.radio);
    for (const [i, x, z, d] of nodos) alturas[i] = THREE.MathUtils.lerp(plano(x, z), alturas[i], peso(d));
    // La malla que se ve: sus vértices dentro del radio bajan igual
    const v = new THREE.Vector3();
    const esfera = new THREE.Sphere();
    for (const malla of mallas) {
      const g = malla.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      esfera.copy(g.boundingSphere).applyMatrix4(malla.matrixWorld);
      if (Math.hypot(esfera.center.x - cx, esfera.center.z - cz) > esfera.radius + c.radio) continue;
      const pos = g.attributes.position;
      const inversa = malla.matrixWorld.clone().invert();
      let tocados = 0;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld);
        const d = Math.hypot(v.x - cx, v.z - cz);
        if (d > c.radio) continue;
        v.y = THREE.MathUtils.lerp(plano(v.x, v.z), v.y, peso(d));
        v.applyMatrix4(inversa);
        pos.setXYZ(i, v.x, v.y, v.z);
        tocados++;
      }
      if (tocados) {
        pos.needsUpdate = true;
        g.computeBoundingBox();
        g.computeBoundingSphere();
      }
    }
  }
}
