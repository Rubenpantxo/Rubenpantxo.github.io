// Recinto del modo fiestas (PLAN_FIESTAS.md, fase F0): dónde va cada cosa del festejo en la
// Plaza del Ayuntamiento y la Calle San Roque. Coordenadas locales (x este, z sur, m).
//
// ESTADO: PROPUESTA sin aprobar. Rubén la revisa sobre la vista cenital que dibuja
// tools/20_recinto_fiestas.py (data/processed/previews/recinto_fiestas.png) y no se modela
// nada hasta que la apruebe.
//
// De dónde sale cada dato (nada es inventado; lo que no se puede deducir va en DUDAS):
// - Líneas de fachada: las filas de casas hechas a mano (casasPlaza.js: plaza_impares,
//   plaza_pares, san_roque) y, en el resto, las esquinas de las huellas del Catastro
//   (buildings.geojson) y las tapias (muros.json) que dan a la calle. `ref` dice cuál.
// - Ejes: OpenStreetMap (assets/osm/calles.geojson): plaza w1433831399, San Roque w314839343.
// - Vallas: paralelas a la línea de fachadas, a SEPARACION_VALLA m hacia dentro, seguidas
//   (cruzan las bocacalles sin interrumpirse). La acera que queda detrás es del público.
// - Todavía NO se han podido usar los croquis ni las fotos de Rubén (no estaban en
//   docs/fiestas/ al hacer la F0): tablado, camión, tipo de valla por tramo, burladeros y
//   los cortes son propuestas o están sin poner. Ver DUDAS.

// Distancia de la valla a la línea de fachadas (m). Propuesta: una acera para dos filas de
// gente. San Roque mide 7,0 m entre fachadas en su punto más estrecho (x ≈ 121).
export const SEPARACION_VALLA = 1.5;
// Fondo del tablado delante de la fachada del Ayuntamiento (m). Propuesta.
export const FONDO_TABLADO = 3.0;

const T = 'tablones';   // valla de tablones (la principal)
// Otros tipos previstos: 'panel' (chapa roja maciza), 'puerta' y 'tablado' (frente del tablado)

// --- Bordes del recinto: polígonos de la línea de fachadas. Cada entrada es un vértice (p) y
// el lado que va de él al siguiente (el último vuelve al primero), con la clase del lado, el
// tipo de valla y su separación de la línea.

// Plaza: cuña entre las dos filas de casas, de la puerta al Ayuntamiento
const BORDE_PLAZA = [
  { p: [150.5, 320.3], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA,
    ref: 'recta de la fila plaza_impares (nº 1 a 11) prolongada al oeste por la fachada del Catastro 47; '
      + 'cruza el solar de 5,9 m que hay entre el 47 y el nº 1' },
  { p: [204.4, 335.65], clase: 'bocacalle', lado: 'este', tipo: T, sep: FONDO_TABLADO, nombre: 'callejón norte del Ayuntamiento',
    ref: 'de la fila de impares a la esquina noroeste del Ayuntamiento (Catastro 259); boca de 3,7 m' },
  { p: [203.2, 339.2], clase: 'tablado', lado: 'este', tipo: 'tablado', sep: FONDO_TABLADO,
    ref: 'fachada oeste del Ayuntamiento (Catastro 259), 7,7 m' },
  { p: [200.8, 346.5], clase: 'bocacalle', lado: 'este', tipo: T, sep: FONDO_TABLADO, nombre: 'callejón sur del Ayuntamiento',
    ref: 'de la esquina suroeste del Ayuntamiento a la fila de pares; boca de 4,9 m' },
  { p: [199.25, 351.2], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA,
    ref: 'recta de la fila plaza_pares (nº 10 a 2)' },
  { p: [148.1, 329.7], clase: 'puerta', lado: 'oeste', tipo: 'puerta', sep: 0,
    ref: 'de la esquina del nº 2 (Catastro 43) a la fachada del Catastro 47, perpendicular a la calle; '
      + 'el nudo de OSM (148,4, 325,4) queda a 0,8 m' },
];

// Calle San Roque: de la puerta a la Sala de Cultura. Primero el lado norte hacia el oeste,
// luego el cierre final y el lado sur de vuelta.
const BORDE_CALLE = [
  { p: [150.5, 320.3], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachada del Catastro 47' },
  { p: [139.8, 317.9], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'tapia (muros.json, lindero del Catastro, 2,4 m)' },
  { p: [127.6, 316.0], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'tapia (muros.json, LiDAR, 2,2 m)' },
  { p: [120.1, 314.2], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachada del Catastro 365' },
  { p: [111.3, 311.2], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachada del Catastro 94' },
  { p: [101.7, 307.3], clase: 'bocacalle', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, nombre: 'Calle la Vicera',
    ref: 'de la esquina del Catastro 94 a la del 84' },
  { p: [95.2, 304.0], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachada del Catastro 84' },
  { p: [84.0, 299.7], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachadas del Catastro 298 y 210' },
  { p: [73.8, 295.7], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA, ref: 'fachadas del Catastro 62 y 195' },
  { p: [53.3, 289.0], clase: 'fachada', lado: 'norte', tipo: T, sep: SEPARACION_VALLA,
    ref: 'recta por delante de la plazuela de los Catastro 14, 18, 286 y 233 (la fachada se mete hasta 3,2 m): '
      + 'la plazuela queda fuera del recorrido' },
  { p: [9.7, 277.9], clase: 'cierre', lado: 'oeste', tipo: T, sep: 0, nombre: 'final del recorrido',
    ref: 'perpendicular a la calle, de la fachada del Catastro 233/304 a la esquina noreste de la Sala de '
      + 'Cultura (Catastro 7)' },
  { p: [6.5, 288.1], clase: 'bocacalle', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, nombre: 'ramal que baja a la Sala de Cultura',
    ref: 'de la esquina noreste de la Sala de Cultura (Catastro 7) a la del Catastro 60; boca de 9,6 m' },
  { p: [15.7, 291.0], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'fachadas del Catastro 60, 235, 75 y 88' },
  { p: [56.8, 302.8], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'fachada del Catastro 134' },
  { p: [66.7, 305.7], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'tapia (muros.json, lindero del Catastro, 2,0 m)' },
  { p: [79.9, 309.5], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA,
    ref: 'recta por delante del retranqueo del Catastro 32 (su fachada se mete hasta 3 m)' },
  { p: [94.8, 316.1], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'fachadas del Catastro 166, 305, 36 y 136' },
  { p: [117.7, 321.1], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'tapia (muros.json, lindero del Catastro, 2,6 m)' },
  { p: [120.3, 322.3], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'fachadas del Catastro 261 y 246' },
  { p: [131.9, 324.8], clase: 'fachada', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, ref: 'fila san_roque (nº 54, Catastro 50)' },
  { p: [144.2, 328.4], clase: 'bocacalle', lado: 'sur', tipo: T, sep: SEPARACION_VALLA, nombre: 'Calle Fragua',
    ref: 'de la esquina del nº 54 de San Roque (Catastro 50) a la del nº 2 de la plaza (Catastro 43); boca de 4,1 m' },
  { p: [148.1, 329.7], clase: 'puerta', lado: 'este', tipo: 'puerta', sep: 0, compartido: true, ref: 'la misma puerta de la plaza' },
];

// --- Geometría: polígono paralelo hacia dentro, con una distancia por lado

function areaConSigno(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i]; const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

const r2 = (v) => Math.round(v * 100) / 100;

// Devuelve, por cada lado del borde, el segmento de valla [a, b] ya recortado en las esquinas
function vallaDeBorde(borde) {
  const n = borde.length;
  const pts = borde.map((v) => v.p);
  const giro = Math.sign(areaConSigno(pts));
  // Recta desplazada de cada lado: punto y dirección
  const rectas = borde.map((v, i) => {
    const [x1, z1] = pts[i]; const [x2, z2] = pts[(i + 1) % n];
    const l = Math.hypot(x2 - x1, z2 - z1);
    const d = [(x2 - x1) / l, (z2 - z1) / l];
    const normal = [-d[1] * giro, d[0] * giro];            // hacia dentro del polígono
    return { o: [x1 + normal[0] * v.sep, z1 + normal[1] * v.sep], d, normal };
  });
  // Esquina i: corte de la recta del lado anterior con la del lado i
  const esquinas = rectas.map((r, i) => {
    const q = rectas[(i - 1 + n) % n];
    const cruz = q.d[0] * r.d[1] - q.d[1] * r.d[0];
    if (Math.abs(cruz) < 0.02) {
      // Lados casi alineados: el vértice desplazado por la normal media
      const sep = (borde[i].sep + borde[(i - 1 + n) % n].sep) / 2;
      const m = [q.normal[0] + r.normal[0], q.normal[1] + r.normal[1]];
      const lm = Math.hypot(m[0], m[1]);
      return [pts[i][0] + (m[0] / lm) * sep, pts[i][1] + (m[1] / lm) * sep];
    }
    const t = ((r.o[0] - q.o[0]) * r.d[1] - (r.o[1] - q.o[1]) * r.d[0]) / cruz;
    return [q.o[0] + q.d[0] * t, q.o[1] + q.d[1] * t];
  });
  return borde.map((v, i) => ({ a: esquinas[i].map(r2), b: esquinas[(i + 1) % n].map(r2) }));
}

function tramosDe(zona, borde, primerId) {
  const valla = vallaDeBorde(borde);
  const tramos = [];
  borde.forEach((v, i) => {
    if (v.compartido) return;
    const { a, b } = valla[i];
    tramos.push({
      id: primerId + tramos.length, zona, clase: v.clase, lado: v.lado, tipo: v.tipo, nombre: v.nombre ?? null,
      a, b, largo: r2(Math.hypot(b[0] - a[0], b[1] - a[1])),
      fachada: [v.p, borde[(i + 1) % borde.length].p], sep: v.sep, ref: v.ref,
    });
  });
  return { tramos, poligono: valla.map((s) => s.a) };
}

const plaza = tramosDe('plaza', BORDE_PLAZA, 1);
const calle = tramosDe('calle', BORDE_CALLE, plaza.tramos.length + 1);
const TRAMOS = [...plaza.tramos, ...calle.tramos];
const tramo = (clase, nombre) => TRAMOS.find((t) => t.clase === clase && (!nombre || t.nombre === nombre));

// --- Dudas que tiene que resolver Rubén (las pinta la vista cenital con su número)
export const DUDAS_FIESTAS = [
  { id: 'D1', en: [206.5, 344.2], texto: 'Tablado: ¿va delante de la fachada oeste del Ayuntamiento (la que da a la plaza)? '
    + '¿Cuánto fondo (propuesto 3 m) y cuánto ancho (propuesto: los 7,7 m de la fachada)?' },
  { id: 'D2', en: [212.0, 337.4], texto: 'Camión de las vacas: ¿en el callejón norte del Ayuntamiento (A), en el sur (B) o en otro sitio? '
    + '(el croquis lo marca como «corral»)' },
  { id: 'D3', en: [213.0, 351.5], texto: 'Calles de los lados del Ayuntamiento: propuesto cerrarlas en su boca, en línea con la fachada '
    + 'oeste. ¿O el recinto sigue por ellas hacia la Plaza Donantes?' },
  { id: 'D4', en: [121.0, 318.0], texto: 'Separación de la valla a las fachadas: propuesto 1,5 m en todo el recinto. San Roque mide '
    + '7,0 m entre fachadas en lo más estrecho: quedan 4,3 m entre vallas. ¿Es así, o la valla va más pegada?' },
  { id: 'D5', en: [90.0, 308.5], texto: 'Tipo de valla por tramo: todo propuesto de tablones. ¿Qué tramos de la calle llevan panel '
    + 'rojo macizo?' },
  { id: 'D6', en: [175.0, 334.5], texto: 'Burladeros: no hay ninguno puesto. ¿Dónde van (plaza y calle)?' },
  { id: 'D7', en: [4.5, 283.0], texto: 'Final del recorrido: propuesto cerrarlo a la altura de la esquina de la Sala de Cultura, '
    + 'cruzando San Roque, con el ramal que baja a su fachada cerrado en la boca. ¿O el recorrido baja por el ramal?' },
  { id: 'D8', en: [99.6, 300.6], texto: 'Bocacalles (la Vicera, Fragua, ramal de la Sala de Cultura) y el solar junto al nº 1 de la '
    + 'plaza: propuesta la valla seguida. ¿Alguna lleva puerta o paso para la gente?' },
  { id: 'D9', en: [36.0, 284.5], texto: 'Plazuela del lado norte de San Roque y retranqueo del lado sur (x ≈ 80): propuesto que la valla '
    + 'pase recta por delante y queden para el público.' },
  { id: 'D10', en: [149.3, 325.0], texto: 'Puerta entre plaza y calle: propuesta justo al este de la boca de la Calle Fragua (la '
    + 'Fragua queda del lado de la calle). ¿Es ahí? ¿Qué ancho tiene la hoja practicable?' },
  { id: 'D11', en: [20.0, 287.5], texto: 'Encierro (para la F5): ¿de qué extremo salen las vacas y dónde acaban? Si salen del extremo de '
    + 'la Sala de Cultura hará falta otro camión o corral allí.' },
];

// --- El recinto
export const RECINTO_FIESTAS = {
  estado: 'propuesta',            // pasa a 'aprobado' cuando Rubén dé el visto bueno a la F0
  separacionValla: SEPARACION_VALLA,

  plaza: {
    borde: BORDE_PLAZA.map((v) => v.p),        // línea de fachadas
    ruedo: plaza.poligono,                     // interior del vallado: aquí va la arena
    eje: [[148.38, 325.4], [150.69, 326.11], [191.2, 339.48]],          // OSM w1433831399
  },
  calle: {
    borde: BORDE_CALLE.map((v) => v.p),
    recorrido: calle.poligono,                 // interior del vallado (asfalto)
    // OSM w314839343, de la puerta al cruce del ramal de la Sala de Cultura
    eje: [[148.38, 325.4], [114.16, 316.35], [98.27, 311.28], [58.18, 298.5], [12.02, 283.91]],
  },

  // Tramos de valla, numerados (1… plaza, puerta y después la calle)
  tramos: TRAMOS,
  // Puerta practicable entre plaza y calle: cerrada en «Vacas en la plaza», abierta en los otros modos
  puerta: (({ id, a, b, largo }) => ({ tramo: id, a, b, largo }))(tramo('puerta')),

  // Tablado con gradas delante de la fachada del Ayuntamiento. Propuesta (D1)
  tablado: (({ id, a, b, fachada }) => ({ tramo: id, esquinas: [fachada[0], fachada[1], b, a], fondo: FONDO_TABLADO, propuesta: true }))(tramo('tablado')),

  // Camión de ganado con rampa, pegado al vallado. Sin decidir (D2): candidatos que se ven en el plano.
  // El camión se apoya en el centro del tramo y se alarga hacia fuera del ruedo en `direccion`.
  corral: null,
  corralCandidatos: [
    { id: 'A', tramo: tramo('bocacalle', 'callejón norte del Ayuntamiento').id, direccion: [0.9618, 0.2736],
      nota: 'callejón norte del Ayuntamiento (3,7 m de ancho), se llega desde la Plaza Donantes' },
    { id: 'B', tramo: tramo('bocacalle', 'callejón sur del Ayuntamiento').id, direccion: [0.9218, 0.3878],
      nota: 'callejón sur del Ayuntamiento (4,9 m de ancho), se llega desde la Plaza Donantes' },
  ],
  camion: { largo: 8.0, ancho: 2.5 },       // solo para dibujar los candidatos; se ajusta en F1

  // Burladeros: sin datos (D6)
  burladeros: [],

  // Zonas del público: la acera entre la línea de fachadas y la valla de cada tramo, y las bocacalles
  // (los balcones salen de las casas de casasPlaza.js en la F1; el tablado va aparte)
  publico: TRAMOS.filter((t) => t.sep > 0 && t.clase !== 'tablado').map((t) => ({
    tramo: t.id, clase: t.clase === 'bocacalle' ? 'bocacalle' : 'acera', esquinas: [t.fachada[0], t.fachada[1], t.b, t.a],
  })),

  dudas: DUDAS_FIESTAS,
};
