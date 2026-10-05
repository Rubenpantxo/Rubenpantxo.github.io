// Terreno exportado por tools/01_origin_terrain.py (terrain.f32 + terrain.json).
// Lo usa el visor para posar líneas sobre el suelo y, en la fase 3, el heightfield de Rapier.

export async function cargaTerreno(base) {
  const respuestaMeta = await fetch(`${base}terrain.json`);
  if (!respuestaMeta.ok) throw new Error(`No se pudo leer ${base}terrain.json`);
  const meta = await respuestaMeta.json();

  const respuestaDatos = await fetch(`${base}terrain.f32`);
  if (!respuestaDatos.ok) throw new Error(`No se pudo leer ${base}terrain.f32`);
  const alturas = new Float32Array(await respuestaDatos.arrayBuffer());
  if (alturas.length !== meta.filas * meta.columnas) {
    throw new Error(`terrain.f32 tiene ${alturas.length} valores; se esperaban ${meta.filas * meta.columnas}`);
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
