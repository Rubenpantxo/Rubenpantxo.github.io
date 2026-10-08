// Calles OSM como líneas apoyadas en el terreno (para comprobar la alineación).
import * as THREE from 'three';

export async function cargaGeoJSON(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}`);
  return respuesta.json();
}

function lineasDe(geometria) {
  if (geometria.type === 'LineString') return [geometria.coordinates];
  if (geometria.type === 'MultiLineString') return geometria.coordinates;
  return [];
}

// Segmentos densificados cada pasoMaxM para que la línea siga el relieve
export function lineasSobreTerreno(geojson, terreno, { color, alturaSobreSuelo, pasoMaxM }) {
  const posiciones = [];
  for (const feature of geojson.features) {
    for (const linea of lineasDe(feature.geometry)) {
      for (let i = 0; i < linea.length - 1; i++) {
        const [x0, z0] = linea[i];
        const [x1, z1] = linea[i + 1];
        const trozos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / pasoMaxM));
        for (let k = 0; k < trozos; k++) {
          for (const t of [k / trozos, (k + 1) / trozos]) {
            const x = x0 + (x1 - x0) * t;
            const z = z0 + (z1 - z0) * t;
            posiciones.push(x, terreno.alturaEn(x, z) + alturaSobreSuelo, z);
          }
        }
      }
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  const lineas = new THREE.LineSegments(geometria, new THREE.LineBasicMaterial({ color, fog: false }));
  lineas.name = 'calles_osm';
  return lineas;
}
