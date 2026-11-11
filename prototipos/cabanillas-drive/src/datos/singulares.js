import { EDIFICIOS_CASAS } from './casas.js';

// Edificios y elementos singulares modelados a mano a partir de fotos de referencia que aportó
// Rubén (vistas de calle, 2025) y su situación en OSM y el Catastro. Coordenadas locales
// (x este, z sur, m). Lo construye src/escena/singulares.js.
export const SINGULARES = {
  // Campanario exento de la Parroquia de la Asunción (OSM w: man_made=tower, bell_tower):
  // cuatro pilares de ladrillo caravista crema, plataformas abiertas con barandilla y la
  // campana arriba. No está en el Catastro (por eso no había nada).
  campanario: {
    esquinas: [[106.6, 205.8], [106.4, 200.4], [110.7, 200.2], [110.9, 205.7]],
    alto: 19,
    ladrillo: '#d9c293',
    // Plaza alta de la torre: murete con barandilla a la calle la Vicera (este) y a Fueros de
    // Navarra (norte), escalinata al sur hacia la plaza de la iglesia y farola fernandina
    murete: [[[104.2, 196.6], [112.9, 196.3]], [[112.9, 196.3], [113.6, 211.2]]],
    escalinata: { x: 108.6, z: 208.0, ancho: 5.0, peldanos: 5, huella: 0.42 },
    farola: [105.2, 209.4],
  },
  // Pino piñonero centenario de la entrada (Carretera del Ebro, junto al Canal de Tauste):
  // el LiDAR lo da en (−479,8, 111,5), 16,2 m de alto y 11,4 m de radio de copa. Sustituye al
  // árbol genérico de arboles.json.
  pino: { x: -479.78, z: 111.5, alto: 16.2, radioCopa: 11.4 },
  // Sala de Cultura (Calle San Roque 26; OSM «Casa Cultural Cabanillas»): fachada de bloque
  // blanco al este, a la placita del final de San Roque, con el gran arco de entrada, el rótulo
  // y óculos; terraza con pérgola al sur, sobre el talud del canal.
  salaCultura: {
    fachada: [[3.4, 297.1], [-0.3, 308.0]],     // cara exterior del pórtico (Catastro 451)
    fondoPortico: 1.65,                         // hasta la fachada del edificio 7
    alto: 7.0,
    terraza: [[-0.3, 308.0], [-26.3, 298.8]],   // fachada sur (Catastro 7 y 8)
    fondoTerraza: 6.0,
    // El pórtico del Catastro (451) se sustituye por el modelo
    sustituye: [451],
  },
};

// Edificios del Catastro que se quitan del mundo (dibujo, física, peatones): los que sustituye un
// modelo singular y los que no existen (comprobado con las fotos de Rubén):
// - 1543: caja de 4,5 × 4,5 m y 13,6 m de alto junto al pino de la entrada; allí no hay nada
// - 575: la plaza de la iglesia con el solar del campanario (el Catastro le da 7,4 m y el LiDAR
//   le hacía un tejado con la torre y los árboles); la iglesia son el 572 y el 1004
// Además, las casas modeladas a mano (datos/casas.js)
export const EDIFICIOS_SUSTITUIDOS = new Set([...SINGULARES.salaCultura.sustituye, 1543, 575, ...EDIFICIOS_CASAS]);

// Muros y vallas de muros.json que no existen: al pie del campanario el LiDAR vio una «valla»
// de 2 m; en realidad es un murete de hormigón con barandilla negra (lo pone singulares.js)
// y, más al sur, los bolardos del bordillo
export const ZONAS_SIN_MUROS = [{ x: 109, z: 211, radio: 17 }];
