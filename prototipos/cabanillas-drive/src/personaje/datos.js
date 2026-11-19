// Datos del editor de personaje (tools/40_editor_personaje.py): malla base de MakeHuman, targets
// de las macros comprimidos (base de SVD + correcciones), targets de detalle y prendas.
// Los .binz van comprimidos con gzip y se abren con DecompressionStream.
import { PERSONAJE } from '../config/personaje.js';

const TIPOS = {
  float32: Float32Array, int16: Int16Array, uint16: Uint16Array, uint32: Uint32Array,
  uint8: Uint8Array, int32: Int32Array,
};

async function binario(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se puede cargar ${url} (${r.status})`);
  const flujo = r.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(flujo).arrayBuffer();
}

// Vista tipada de un trozo {o, n, t} del paquete
export function vista(buffer, d) {
  if (!d) return null;
  const T = TIPOS[d.t];
  if (!T) throw new Error(`Tipo ${d.t} desconocido`);
  return new T(buffer, d.o, d.n);
}

let promesaBase = null;
export function cargaBase() {
  promesaBase ??= (async () => {
    const ruta = PERSONAJE.ruta;
    const [meta, buffer, catalogo] = await Promise.all([
      fetch(`${ruta}base.json`).then((r) => r.json()),
      binario(`${ruta}base.binz`),
      fetch(`${ruta}catalogo.json`).then((r) => r.json()),
    ]);
    return { meta, buffer, catalogo };
  })();
  return promesaBase;
}

const prendas = new Map();
export function cargaPrenda(id) {
  if (!prendas.has(id)) {
    const ruta = `${PERSONAJE.ruta}prendas/${id}`;
    prendas.set(id, Promise.all([fetch(`${ruta}.json`).then((r) => r.json()), binario(`${ruta}.binz`)])
      .then(([meta, buffer]) => ({ meta, buffer })));
  }
  return prendas.get(id);
}
