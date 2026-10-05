// Terreno exportado por tools/01_origin_terrain.py (terrain.json + alturas).
// Alturas: terrain.u16 (tools/variantes_movil.mjs, la mitad de peso, paso < 1 mm) si existe;
// si no, terrain.f32. Lo usan el visor, la física (heightfield) y todo lo que se apoya en el suelo.

async function binario(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}`);
  return respuesta.arrayBuffer();
}

async function leeAlturas(base) {
  const compacto = await fetch(`${base}terrain_u16.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (compacto) {
    const u16 = new Uint16Array(await binario(`${base}${compacto.archivo}`));
    const alturas = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) alturas[i] = compacto.minimo + u16[i] * compacto.escala;
    return alturas;
  }
  return new Float32Array(await binario(`${base}terrain.f32`));
}

export async function cargaTerreno(base) {
  const respuestaMeta = await fetch(`${base}terrain.json`);
  if (!respuestaMeta.ok) throw new Error(`No se pudo leer ${base}terrain.json`);
  const meta = await respuestaMeta.json();

  const alturas = await leeAlturas(base);
  if (alturas.length !== meta.filas * meta.columnas) {
    throw new Error(`Las alturas tienen ${alturas.length} valores; se esperaban ${meta.filas * meta.columnas}`);
  }

  const { filas, columnas, paso_m: paso } = meta;
  const x0 = meta.vertice_0.x;
  const z0 = meta.vertice_0.z;

  // Altura (m sobre H_base) en coordenadas locales, interpolación bilineal
  function alturaEn(x, z) {
    const fc = Math.min(Math.max((x - x0) / paso, 0), columnas - 1.000001);
    const ff = Math.min(Math.max((z - z0) / paso, 0), filas - 1.000001);
    const c = Math.floor(fc);
    const f = Math.floor(ff);
    const tc = fc - c;
    const tf = ff - f;
    const i = f * columnas + c;
    const arriba = alturas[i] * (1 - tc) + alturas[i + 1] * tc;
    const abajo = alturas[i + columnas] * (1 - tc) + alturas[i + columnas + 1] * tc;
    return arriba * (1 - tf) + abajo * tf;
  }

  return { meta, alturas, alturaEn };
}
