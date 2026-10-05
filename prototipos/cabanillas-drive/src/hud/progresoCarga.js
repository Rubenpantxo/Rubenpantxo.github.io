// Progreso de la carga contando los bytes de todas las descargas de assets/ (no solo el GLB del
// terreno): envuelve fetch, que es lo que usan GLTFLoader, FileLoader y los JSON. Las imágenes
// sueltas (TextureLoader) no pasan por aquí, pero pesan poco.
const descargas = new Set();
let ultimoAvance = performance.now();

export function vigilaDescargas() {
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const respuesta = await original(...args);
    const url = String(args[0]?.url ?? args[0]);
    if (!respuesta.ok || !respuesta.body || !url.includes('assets/')) return respuesta;
    // Con compresión, content-length es lo comprimido y el cuerpo llega descomprimido: se acota
    const d = { total: Number(respuesta.headers.get('content-length')) || 0, recibido: 0 };
    descargas.add(d);
    ultimoAvance = performance.now();
    const lector = respuesta.body.getReader();
    const cuerpo = new ReadableStream({
      async pull(control) {
        const { done, value } = await lector.read();
        ultimoAvance = performance.now();
        if (done) {
          d.total = Math.max(d.total, d.recibido);
          d.recibido = d.total;
          control.close();
          return;
        }
        d.recibido += value.byteLength;
        control.enqueue(value);
      },
      cancel(motivo) { return lector.cancel(motivo); },
    });
    return new Response(cuerpo, { status: respuesta.status, statusText: respuesta.statusText, headers: respuesta.headers });
  };
}

// Bytes recibidos y esperados (el esperado nunca baja de la estimación del nivel de calidad)
export function estadoDescargas(estimado = 0) {
  let recibido = 0;
  let total = 0;
  for (const d of descargas) {
    total += Math.max(d.total, d.recibido);
    recibido += Math.min(d.recibido, Math.max(d.total, d.recibido));
  }
  return { recibido, total: Math.max(total, estimado), msSinAvance: performance.now() - ultimoAvance };
}

export function marcaAvance() { ultimoAvance = performance.now(); }
