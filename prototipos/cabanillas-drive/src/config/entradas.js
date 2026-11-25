// Puntos de entrada del pueblo (PLAN_FIESTAS.md, F7): sitios del mundo donde, al llegar (a pie o
// en coche, parado), aparece un marcador y «E / Entrar» lleva a otra parte del juego o a otro
// juego de la web. Para añadir uno basta una línea más.
//   en: [x, z] locales (m), o null si aún no se sabe dónde está (entonces no sale en el mundo)
//   accion: { fiestas: 'menu' | 'plaza' | … }  o  { juego: '/ruta/del/juego/' }  o  { agricultura: 'cope' }
import { agriculturaActiva } from './agricultura.js';

export const ENTRADAS = [
  // Centro del ruedo de la plaza del Ayuntamiento (src/datos/fiestas.js, plaza.ruedo)
  { id: 'fiestas_plaza', nombre: 'Fiestas · Plaza', icono: '🐂', en: [177.2, 335.6], accion: { fiestas: 'menu' } },
  // Calle San Roque, a 45 m de la puerta de la plaza por el eje del recorrido (src/datos/fiestas.js)
  { id: 'fiestas_sanroque', nombre: 'Fiestas · San Roque', icono: '🐂', en: [117.3, 317.2], accion: { fiestas: 'menu' } },
  // Frontones → juego de cesta punta. Son los edificios 532 (frontón 1, el que prefiere Rubén para
  // jugar) y 538 (frontón 2) del Catastro, sin rótulo de frontón. Las dos entradas son el principio
  // de los dos caminos que marcó Rubén en su captura (2026-11-17): el naranja sale de la calle San
  // Isidro por el pasillo entre el edificio 548 y la piscina; el azul, de la calle Bardenas Reales
  // frente a la calle las Planas. Sitio medido sobre la captura con los edificios como referencia
  { id: 'fronton_sanisidro', nombre: 'Frontón · San Isidro', icono: '🥎', en: [-155.5, 10.5], accion: { juego: '/juegos/cesta-punta/' } },
  { id: 'fronton_bardenas', nombre: 'Frontón · Bardenas Reales', icono: '🥎', en: [-49.5, -65.5], accion: { juego: '/juegos/cesta-punta/' } },
  // COPE (Sociedad Cooperativa del Campo San Isidro), modo agricultura (PLAN_AGRICULTURA.md, A3): el
  // patio de la nave, al norte de la calle San Isidro (parcela urbana 2-1031 del Catastro, la que
  // marcó Rubén el 2026-11-20). Aquí se cambia el coche por el tractor y al revés. Solo con el modo
  // agricultura activo (?agricultura)
  ...(agriculturaActiva() ? [{ id: 'cope', nombre: 'COPE · San Isidro', icono: '🚜', en: [-322, -14], accion: { agricultura: 'cope' } }] : []),
];

export const ENTRADA = {
  radioM: 7,                 // dentro de este radio se puede entrar
  cocheMaxKmh: 12,           // en coche, solo parado o casi
  marcador: { radioM: 3, altoRotuloM: 6, color: 0xffd54a, giroRad: 0.8 },
};
