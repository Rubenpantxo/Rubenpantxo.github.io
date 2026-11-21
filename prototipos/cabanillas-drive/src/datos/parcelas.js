// Parcelas del término de Cabanillas (tools/50_parcelas.py → assets/agricultura/parcelas.json):
// 1 797 parcelas rústicas y mixtas del Catastro de Navarra con su contorno en coordenadas locales,
// superficie, referencia polígono-parcela, uso SIGPAC, regadío, cota, entrada…

export async function cargaParcelas(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta}`);
  const datos = await respuesta.json();
  const porRef = new Map(datos.parcelas.map((p) => [p.ref, p]));
  return { ...datos, porRef };
}

// ¿El punto (x, z) cae dentro de la parcela? Regla par-impar con todos sus anillos (los agujeros
// restan solos) y en todos sus trozos.
export function dentroDeParcela(parcela, x, z) {
  const [x0, z0, x1, z1] = parcela.caja;
  if (x < x0 || x > x1 || z < z0 || z > z1) return false;
  let dentro = false;
  for (const anillos of parcela.partes) {
    for (const anillo of anillos) {
      for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const [xi, zi] = anillo[i];
        const [xj, zj] = anillo[j];
        if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
      }
    }
  }
  return dentro;
}
