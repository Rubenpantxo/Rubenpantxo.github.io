// Grafo dirigido de las calles OSM para el tráfico. Cada vértice de las calles es un nodo
// (las vías que se cruzan comparten vértice en OSM) y cada tramo entre vértices, una arista;
// en las de sentido único, solo en el sentido del dibujo.
import { TRAFICO } from '../config/trafico.js';

function lineasDe(geometria) {
  if (geometria.type === 'LineString') return [geometria.coordinates];
  if (geometria.type === 'MultiLineString') return geometria.coordinates;
  return [];
}

const clave = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;

export function creaGrafoCalles(geojson) {
  const nodos = new Map();   // clave → { id, x, z, salidas: [arista] }
  const aristas = [];
  const nodo = (x, z) => {
    const k = clave(x, z);
    if (!nodos.has(k)) nodos.set(k, { id: nodos.size, x, z, salidas: [] });
    return nodos.get(k);
  };
  const une = (a, b, via) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const largo = Math.hypot(dx, dz);
    if (largo < 0.3) return;
    const arista = { id: aristas.length, desde: a, hasta: b, largo, dx: dx / largo, dz: dz / largo,
      tipo: via.tipo, sentidoUnico: via.sentidoUnico, inversa: null };
    aristas.push(arista);
    a.salidas.push(arista);
    return arista;
  };
  for (const f of geojson.features) {
    const tipo = f.properties.tipo;
    if (!TRAFICO.velocidadKmh[tipo]) continue;          // solo vías por las que circula el tráfico
    const sentidoUnico = f.properties.sentido_unico === 'yes';
    for (const linea of lineasDe(f.geometry)) {
      for (let i = 0; i + 1 < linea.length; i++) {
        const a = nodo(linea[i][0], linea[i][1]);
        const b = nodo(linea[i + 1][0], linea[i + 1][1]);
        const ida = une(a, b, { tipo, sentidoUnico });
        if (!sentidoUnico && ida) {
          const vuelta = une(b, a, { tipo, sentidoUnico });
          if (vuelta) { ida.inversa = vuelta; vuelta.inversa = ida; }
        }
      }
    }
  }
  return { nodos: [...nodos.values()], aristas };
}

// Siguiente arista al llegar al final de «arista»: al azar entre las salidas, sin dar media
// vuelta salvo en un fondo de saco; prefiere seguir recto (los giros pesan menos)
export function siguienteArista(arista, azar) {
  const opciones = arista.hasta.salidas.filter((s) => s !== arista.inversa);
  if (!opciones.length) return arista.inversa ?? null;
  const pesos = opciones.map((s) => 0.35 + Math.max(0, s.dx * arista.dx + s.dz * arista.dz));
  let r = azar() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < opciones.length; i++) {
    r -= pesos[i];
    if (r <= 0) return opciones[i];
  }
  return opciones[opciones.length - 1];
}
