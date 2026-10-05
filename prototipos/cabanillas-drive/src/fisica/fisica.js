// Mundo físico (Rapier): terreno como heightfield desde terrain.f32, edificios desde
// buildings.geojson y muros invisibles en el borde de la zona.
import RAPIER from '@dimforge/rapier3d-compat';

export const PASO_FISICA = 1 / 60;
const ENTERRADO_M = 2;       // los colliders de edificios bajan por debajo de base_y
const ALTO_MUROS_M = 200;

function sinCierre(anillo) {
  const a = anillo.slice();
  const [x0, z0] = a[0];
  const [x1, z1] = a[a.length - 1];
  if (x0 === x1 && z0 === z1) a.pop();
  return a;
}

function esConvexo(anillo) {
  let signo = 0;
  for (let i = 0; i < anillo.length; i++) {
    const [x0, z0] = anillo[i];
    const [x1, z1] = anillo[(i + 1) % anillo.length];
    const [x2, z2] = anillo[(i + 2) % anillo.length];
    const cruz = (x1 - x0) * (z2 - z1) - (z1 - z0) * (x2 - x1);
    if (Math.abs(cruz) < 1e-6) continue;
    const s = Math.sign(cruz);
    if (signo === 0) signo = s;
    else if (s !== signo) return false;
  }
  return true;
}

// Prisma de un anillo (sin tapas) + tapa superior triangulada por abanico desde el contorno.
// Para polígonos cóncavos se usa trimesh: solo cuentan las paredes, que es lo que choca.
function trimeshEdificio(anillos, y0, y1) {
  const vertices = [];
  const indices = [];
  for (const anillo of anillos) {
    const base = vertices.length / 3;
    for (const [x, z] of anillo) vertices.push(x, y0, z, x, y1, z);
    const n = anillo.length;
    for (let i = 0; i < n; i++) {
      const a = base + i * 2;
      const b = base + ((i + 1) % n) * 2;
      indices.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  return RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices));
}

export async function creaFisica(terreno, geoEdificios) {
  await RAPIER.init();
  const mundo = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  mundo.timestep = PASO_FISICA;

  // --- Terreno: Rapier pide la matriz de alturas por columnas (filas = Z, columnas = X)
  const { filas, columnas } = terreno.meta;
  const ancho = terreno.meta['tamaño_x_m'];
  const alto = terreno.meta['tamaño_z_m'];
  const alturas = new Float32Array(filas * columnas);
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) alturas[c * filas + f] = terreno.alturas[f * columnas + c];
  }
  const suelo = mundo.createCollider(
    RAPIER.ColliderDesc.heightfield(filas - 1, columnas - 1, alturas, { x: ancho, y: 1, z: alto })
      .setFriction(0.9),
  );

  // --- Edificios: prisma convexo si se puede, trimesh si es cóncavo o tiene patios
  let convexos = 0;
  let concavos = 0;
  for (const f of geoEdificios.features) {
    const { base_y: base, height } = f.properties;
    const anillos = f.geometry.coordinates.map(sinCierre).filter((a) => a.length >= 3);
    if (!anillos.length) continue;
    const y0 = base - ENTERRADO_M;
    const y1 = base + height;
    let desc = null;
    if (anillos.length === 1 && esConvexo(anillos[0])) {
      const puntos = [];
      for (const [x, z] of anillos[0]) puntos.push(x, y0, z, x, y1, z);
      desc = RAPIER.ColliderDesc.convexHull(new Float32Array(puntos));
      if (desc) convexos++;
    }
    if (!desc) {
      desc = trimeshEdificio(anillos, y0, y1);
      concavos++;
    }
    mundo.createCollider(desc.setFriction(0.6));
  }

  // --- Límites de la zona: muros invisibles
  const grosor = 2;
  const muros = [
    [0, -alto / 2 - grosor / 2, ancho / 2 + grosor, grosor / 2],
    [0, alto / 2 + grosor / 2, ancho / 2 + grosor, grosor / 2],
    [-ancho / 2 - grosor / 2, 0, grosor / 2, alto / 2 + grosor],
    [ancho / 2 + grosor / 2, 0, grosor / 2, alto / 2 + grosor],
  ];
  for (const [x, z, hx, hz] of muros) {
    mundo.createCollider(RAPIER.ColliderDesc.cuboid(hx, ALTO_MUROS_M / 2, hz).setTranslation(x, 0, z));
  }

  return { RAPIER, mundo, suelo, resumen: { convexos, concavos } };
}

// Altura del suelo físico bajo (x, z) lanzando un rayo vertical solo contra el terreno
export function alturaFisica(fisica, x, z) {
  const { RAPIER, mundo, suelo } = fisica;
  const rayo = new RAPIER.Ray({ x, y: 1000, z }, { x: 0, y: -1, z: 0 });
  const impacto = mundo.castRay(rayo, 2000, true, undefined, undefined, undefined, undefined,
    (collider) => collider.handle === suelo.handle);
  return impacto ? 1000 - (impacto.timeOfImpact ?? impacto.toi) : null;
}
