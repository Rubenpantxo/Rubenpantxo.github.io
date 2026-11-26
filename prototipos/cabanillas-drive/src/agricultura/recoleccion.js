// Recolección a mano (PLAN_AGRICULTURA.md, A10): brócoli, alcachofa y espárrago se cogen a pie. Con el
// personaje cerca de una parcela, X (o el botón de la cesta) corta lo que está en su punto en un
// círculo delante de él y lo echa a la cesta (cestaKg). En la COPE se entrega. El brócoli se corta
// entero (la planta se retira); la alcachofa y el espárrago, que duran años, rebrotan: la planta
// vuelve a su edad de rebrote y vuelve a madurar (el ciclo de varios años no se simula).
import { CULTIVOS } from '../config/cultivos.js';
import { edadDe, vigorMedio } from './crecimiento.js';

export const RECOLECCION = { radioM: 1.3, delanteM: 1.4, cestaKg: 40, esperaS: 0.35 };

export function creaRecoleccion({ labranza, reloj }) {
  const cesta = { kg: 0, id: null };
  let espera = 0;
  const resultado = { kg: 0, verdes: 0, llena: false, otro: false };
  return {
    cesta,
    get llena() { return cesta.kg >= RECOLECCION.cestaKg - 0.01; },
    // ¿Hay cultivo de mano en alguna parcela activa a menos de 6 m?
    hayCerca(x, z) {
      for (const p of labranza.parcelas.values()) {
        if (!p.siembra || CULTIVOS[p.siembra.cultivo]?.recoleccion !== 'mano') continue;
        const [x0, z0, x1, z1] = p.info.caja;
        if (x > x0 - 6 && x < x1 + 6 && z > z0 - 6 && z < z1 + 6) return true;
      }
      return false;
    },
    actualiza(dt) { espera = Math.max(0, espera - dt); },
    // Coge lo maduro del círculo de delante. Devuelve { kg, verdes, llena, otro }
    coge(x, z, adelante) {
      resultado.kg = 0; resultado.verdes = 0; resultado.llena = false; resultado.otro = false;
      if (espera > 0) return resultado;
      espera = RECOLECCION.esperaS;
      const cx = x + adelante.x * RECOLECCION.delanteM;
      const cz = z + adelante.z * RECOLECCION.delanteM;
      const r = RECOLECCION.radioM;
      for (const p of labranza.parcelas.values()) {
        if (!p.siembra) continue;
        const c = CULTIVOS[p.siembra.cultivo];
        if (c?.recoleccion !== 'mano') continue;
        const i0 = Math.max(0, Math.floor((cx - r - p.ox) / p.mpp));
        const i1 = Math.min(p.ancho - 1, Math.ceil((cx + r - p.ox) / p.mpp));
        const j0 = Math.max(0, Math.floor((cz - r - p.oz) / p.mpp));
        const j1 = Math.min(p.alto - 1, Math.ceil((cz + r - p.oz) / p.mpp));
        const kgPixel = (c.rendimientoKgHa * p.mpp * p.mpp) / 10000;
        let toco = false;
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const px = p.ox + (i + 0.5) * p.mpp - cx;
            const pz = p.oz + (j + 0.5) * p.mpp - cz;
            if (px * px + pz * pz > r * r) continue;
            const k = j * p.ancho + i;
            const l = k * 4;
            const byte = p.cultivo[l + 1];
            if (!byte || p.cultivo[l + 2] > 127) continue;
            if (edadDe(byte, reloj.dia) < c.madura) { resultado.verdes++; continue; }
            if (cesta.id && cesta.id !== p.siembra.cultivo && cesta.kg > 0.5) { resultado.otro = true; continue; }
            if (cesta.kg >= RECOLECCION.cestaKg) { resultado.llena = true; continue; }
            const prep = Math.max(p.laboreo[l], p.laboreo[l + 1]) / 255;
            const kg = kgPixel * vigorMedio(Math.min(1, prep * 1.4), p.laboreo[l + 2] / 255, p.agua[k] / 255);
            cesta.kg = Math.min(RECOLECCION.cestaKg, cesta.kg + kg);
            cesta.id = p.siembra.cultivo;
            resultado.kg += kg;
            if (c.perenne) p.cultivo[l + 1] = ((((reloj.dia - c.edadRebrote) % 255) + 255) % 255) + 1;
            else { p.cultivo[l + 1] = 0; p.cultivo[l + 2] = 255; p.agua[k] = 128; }
            toco = true;
          }
        }
        if (toco) p.marcaCambio(i0, j0, i1, j1);
      }
      return resultado;
    },
    // Entrega lo que lleva la cesta; devuelve { kg, id }
    vacia() {
      const e = { kg: cesta.kg, id: cesta.id };
      cesta.kg = 0;
      return e;
    },
  };
}
