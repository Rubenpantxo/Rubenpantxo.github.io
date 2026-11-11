// Filas de casas modeladas a mano (las construye src/escena/casas.js). Cada fila tiene su
// origen y su eje: u a lo largo de la fachada (a la derecha de quien la mira desde la calle),
// w hacia dentro de la parcela. Ver casasSanIsidro.js para el formato de cada casa.
import { ARBOLES_BOLA_SAN_ISIDRO, CASAS_SAN_ISIDRO, EDIFICIOS_SAN_ISIDRO, FILA_SAN_ISIDRO, ZONA_SAN_ISIDRO } from './casasSanIsidro.js';
import { FILAS_PLAZA } from './casasPlaza.js';
import { FILAS_CALLES } from './casasCalles.js';

export const FILAS_CASAS = [
  { nombre: 'san_isidro', ...FILA_SAN_ISIDRO, casas: CASAS_SAN_ISIDRO, arboles: ARBOLES_BOLA_SAN_ISIDRO,
    edificios: EDIFICIOS_SAN_ISIDRO, zona: ZONA_SAN_ISIDRO },
  ...FILAS_PLAZA,
  ...FILAS_CALLES,
];

// Edificios del Catastro que sustituyen (se quitan del mundo)
export const EDIFICIOS_CASAS = FILAS_CASAS.flatMap((f) => f.edificios);

// (u, w) de un punto del mundo en el sistema de una fila
export function enFila(fila, x, z) {
  const { origen: O, eje: [ex, ez] } = fila;
  const dx = x - O[0]; const dz = z - O[1];
  return [dx * ex + dz * ez, dx * ez - dz * ex];
}

// ¿(x, z) cae en la franja de alguna fila? (ahí sobran los muros de muros.json y los árboles
// del LiDAR: los pone el modelo)
export function enZonaCasas(x, z) {
  return FILAS_CASAS.some((f) => {
    const [u, w] = enFila(f, x, z);
    return u >= f.zona.u[0] && u <= f.zona.u[1] && w >= f.zona.w[0] && w <= f.zona.w[1];
  });
}
