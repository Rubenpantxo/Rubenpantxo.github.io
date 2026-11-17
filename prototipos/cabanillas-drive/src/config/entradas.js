// Puntos de entrada del pueblo (PLAN_FIESTAS.md, F7): sitios del mundo donde, al llegar (a pie o
// en coche, parado), aparece un marcador y «E / Entrar» lleva a otra parte del juego o a otro
// juego de la web. Para añadir uno basta una línea más.
//   en: [x, z] locales (m), o null si aún no se sabe dónde está (entonces no sale en el mundo)
//   accion: { fiestas: 'menu' | 'plaza' | … }  o  { juego: '/ruta/del/juego/' }
export const ENTRADAS = [
  // Centro del ruedo de la plaza del Ayuntamiento (src/datos/fiestas.js, plaza.ruedo)
  { id: 'fiestas_plaza', nombre: 'Fiestas · Plaza', icono: '🐂', en: [177.2, 335.6], accion: { fiestas: 'menu' } },
  // Calle San Roque, a 45 m de la puerta de la plaza por el eje del recorrido (src/datos/fiestas.js)
  { id: 'fiestas_sanroque', nombre: 'Fiestas · San Roque', icono: '🐂', en: [117.3, 317.2], accion: { fiestas: 'menu' } },
  // Frontón → juego de cesta punta. Sin sitio todavía: no está en el Catastro ni en OSM (D14)
  { id: 'fronton', nombre: 'Frontón', icono: '🥎', en: null, accion: { juego: '/juegos/cesta-punta/' } },
];

export const ENTRADA = {
  radioM: 7,                 // dentro de este radio se puede entrar
  cocheMaxKmh: 12,           // en coche, solo parado o casi
  marcador: { radioM: 3, altoRotuloM: 6, color: 0xffd54a, giroRad: 0.8 },
};
