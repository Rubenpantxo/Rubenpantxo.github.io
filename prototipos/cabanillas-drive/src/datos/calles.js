// Nodos de las calles OSM: punto de salida y recolocación del coche (tecla R).
const TIPOS_CONDUCIBLES = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary',
  'tertiary_link', 'unclassified', 'residential', 'living_street', 'service', 'road']);

function lineasDe(geometria) {
  if (geometria.type === 'LineString') return [geometria.coordinates];
  if (geometria.type === 'MultiLineString') return geometria.coordinates;
  return [];
}

// Cada nodo lleva la dirección de su tramo para orientar el coche a lo largo de la calle
export function nodosDeCalles(geojson) {
  const nodos = [];
  for (const f of geojson.features) {
    if (!TIPOS_CONDUCIBLES.has(f.properties.tipo)) continue;
    for (const linea of lineasDe(f.geometry)) {
      for (let i = 0; i < linea.length; i++) {
        const [x, z] = linea[i];
        const [xa, za] = linea[Math.max(i - 1, 0)];
        const [xb, zb] = linea[Math.min(i + 1, linea.length - 1)];
        const largo = Math.hypot(xb - xa, zb - za) || 1;
        nodos.push({ x, z, dx: (xb - xa) / largo, dz: (zb - za) / largo, tipo: f.properties.tipo });
      }
    }
  }
  return nodos;
}

export function nodoMasCercano(nodos, x, z, { excluirServicio = false } = {}) {
  let mejor = null;
  let distancia = Infinity;
  for (const n of nodos) {
    if (excluirServicio && n.tipo === 'service') continue;
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < distancia) {
      distancia = d;
      mejor = n;
    }
  }
  return mejor;
}
