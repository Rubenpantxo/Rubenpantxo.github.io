// Registro de todas las parcelas del término: dónde está cada una y en cuál cae un punto.
// Rejilla espacial de celdas de LADO_CELDA_M con las parcelas cuya caja la toca: buscar la parcela
// bajo el tractor cuesta unas pocas comprobaciones aunque haya 1 797.
import { dentroDeParcela } from '../datos/parcelas.js';

const LADO_CELDA_M = 100;

export function creaRegistro(datos) {
  const celdas = new Map();
  const clave = (i, j) => `${i},${j}`;
  for (const p of datos.parcelas) {
    const [x0, z0, x1, z1] = p.caja;
    for (let i = Math.floor(x0 / LADO_CELDA_M); i <= Math.floor(x1 / LADO_CELDA_M); i++) {
      for (let j = Math.floor(z0 / LADO_CELDA_M); j <= Math.floor(z1 / LADO_CELDA_M); j++) {
        const k = clave(i, j);
        if (!celdas.has(k)) celdas.set(k, []);
        celdas.get(k).push(p);
      }
    }
  }

  return {
    datos,
    cuantas: datos.parcelas.length,
    porRef: (ref) => datos.porRef.get(ref) ?? null,
    // La parcela en (x, z), o null (camino, casco urbano o fuera del término)
    parcelaEn(x, z) {
      const lista = celdas.get(clave(Math.floor(x / LADO_CELDA_M), Math.floor(z / LADO_CELDA_M)));
      if (!lista) return null;
      for (const p of lista) if (dentroDeParcela(p, x, z)) return p;
      return null;
    },
  };
}
