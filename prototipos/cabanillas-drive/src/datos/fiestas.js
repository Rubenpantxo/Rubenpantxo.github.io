// Recinto del modo fiestas (PLAN_FIESTAS.md, fase F0): dónde va cada cosa del festejo en la
// Plaza del Ayuntamiento y la Calle San Roque. Coordenadas locales (x este, z sur, m).
//
// ESTADO: PROPUESTA sin aprobar (segunda vuelta). Rubén la revisa sobre la vista cenital que
// dibuja tools/20_recinto_fiestas.py (data/processed/previews/recinto_fiestas.png) y no se
// modela nada hasta que la apruebe.
//
// De dónde sale cada dato (nada es inventado; lo que no se sabe va en DUDAS):
// - Líneas de fachada: las filas de casas hechas a mano (casasPlaza.js: plaza_impares,
//   plaza_pares, san_roque) y, en el resto, las esquinas de las huellas del Catastro
//   (buildings.geojson) y las tapias (muros.json) que dan a la calle. `ref` dice cuál.
// - Ejes: OpenStreetMap (assets/osm/calles.geojson): plaza w1433831399, San Roque w314839343.
// - Vallas: paralelas a la línea de fachadas, a SEPARACION_VALLA m hacia dentro (los 1,5 m que
//   Rubén marcó en la foto 2). La acera que queda detrás es del público.
// - Respuestas de Rubén y sus cuatro fotos de la retransmisión de las fiestas (2026-11-15,
//   descritas en docs/fiestas/README.md). `visto` dice en qué foto se ve cada tramo; los
//   tramos sin `visto` siguen siendo una propuesta.
//     foto 1: la plaza desde un balcón del nº 10, mirando al oeste (el nº 9 queda a la derecha)
//     foto 2: San Roque desde el lado sur, a la altura del nº 25, mirando a la plaza
//     foto 3: San Roque desde el lado sur, frente al nº 29, mirando a la puerta y a la plaza
//     foto 4: la plaza mirando al este: tablado, ambulancia y corral

// Distancia de la valla a la línea de fachadas (m): 1,5 m, marcado por Rubén en la foto 2.
export const SEPARACION_VALLA = 1.5;
// Fondo del tablado delante de la fachada del Ayuntamiento (m): 3 m, aprobado por Rubén.
export const FONDO_TABLADO = 3.0;

// Tipos de valla
//   tablones  postes rojos y tablones de madera (la de la plaza)
//   panel     chapa roja maciza, más baja
//   tubo      barandilla roja de tubo, tres barras
//   puerta    cierre entre plaza y calle, con una hoja practicable
//   tablado   frente del tablado (tablones con las gradas detrás)
//   ninguna   sin valla: el límite es la tapia o la fachada (las puertas, con valla gris)
const T = 'tablones';
const S = SEPARACION_VALLA;

// --- Bordes del recinto: polígonos de la línea de fachadas. Cada entrada es un vértice (p) y
// el lado que va de él al siguiente (el último vuelve al primero), con la clase del lado, el
// tipo de valla y su separación de la línea.

// Plaza: cuña entre las dos filas de casas, de la puerta al Ayuntamiento. Incluye la boca de
// la Calle Fragua, que queda del lado de la plaza con unas gradas (fotos 1 y 3).
const BORDE_PLAZA = [
  { p: [146.6, 319.3], clase: 'fachada', lado: 'norte', tipo: T, sep: S, visto: 'foto 3',
    ref: 'fachada del nº 29 de San Roque (Catastro 47), parte este' },
  { p: [153.1, 320.9], clase: 'fachada', lado: 'norte', tipo: T, sep: S, visto: 'fotos 1 y 4',
    ref: 'recta de la fila plaza_impares (nº 1 a 11); cruza el solar de 5,9 m que hay entre el nº 29 de San Roque y el nº 1' },
  { p: [204.4, 335.65], clase: 'tablado', lado: 'este', tipo: 'tablado', sep: FONDO_TABLADO, visto: 'foto 4',
    nombre: 'tablado (boca del callejón norte)',
    ref: 'de la fila de impares a la esquina noroeste del Ayuntamiento (Catastro 259); boca de 3,7 m' },
  { p: [203.2, 339.2], clase: 'tablado', lado: 'este', tipo: 'tablado', sep: FONDO_TABLADO, visto: 'fotos 1 y 4',
    nombre: 'tablado (fachada del Ayuntamiento)', ref: 'fachada oeste del Ayuntamiento (Catastro 259), 7,7 m' },
  { p: [200.8, 346.5], clase: 'bocacalle', lado: 'este', tipo: T, sep: FONDO_TABLADO, visto: 'foto 4',
    nombre: 'callejón sur del Ayuntamiento',
    ref: 'de la esquina suroeste del Ayuntamiento a la fila de pares; boca de 4,9 m. Detrás, la ambulancia' },
  { p: [199.25, 351.2], clase: 'fachada', lado: 'sur', tipo: T, sep: S, visto: 'foto 1',
    ref: 'recta de la fila plaza_pares (nº 10 a 2)' },
  { p: [148.1, 329.7], clase: 'bocacalle', lado: 'sur', tipo: T, sep: S, visto: 'fotos 1 y 3', nombre: 'Calle Fragua',
    ref: 'de la esquina del nº 2 de la plaza (Catastro 43) a la del nº 54 de San Roque (Catastro 50); boca de 4,1 m. Detrás, gradas' },
  { p: [144.2, 328.4], clase: 'puerta', lado: 'oeste', tipo: 'puerta', sep: 0, visto: 'fotos 1 y 3',
    ref: 'de la esquina del nº 54 de San Roque (Catastro 50) a la fachada del nº 29 (Catastro 47), perpendicular a la calle' },
];

// Calle San Roque: de la puerta a la Sala de Cultura. Primero el lado norte hacia el oeste,
// luego el cierre final y el lado sur de vuelta.
const BORDE_CALLE = [
  { p: [146.6, 319.3], clase: 'fachada', lado: 'norte', tipo: 'tubo', sep: S, visto: 'foto 3',
    ref: 'fachada del nº 29 (Catastro 47), parte oeste; acaba en un cierre de barrotes contra la tapia' },
  { p: [139.8, 317.9], clase: 'fachada', lado: 'norte', tipo: 'ninguna', sep: 0, visto: 'fotos 2 y 3',
    ref: 'tapia de bloque (muros.json, lindero del Catastro, 2,4 m)' },
  { p: [127.6, 316.0], clase: 'fachada', lado: 'norte', tipo: 'ninguna', sep: 0, visto: 'foto 2',
    ref: 'tapia de bloque (muros.json, LiDAR, 2,2 m)' },
  { p: [120.1, 314.2], clase: 'fachada', lado: 'norte', tipo: 'ninguna', sep: 0, visto: 'foto 2',
    ref: 'fachada del Catastro 365 (la casa de la foto 2): acera libre y valla gris delante de la puerta' },
  { p: [111.3, 311.2], clase: 'fachada', lado: 'norte', tipo: T, sep: S, ref: 'fachada del Catastro 94' },
  { p: [101.7, 307.3], clase: 'bocacalle', lado: 'norte', tipo: T, sep: S, nombre: 'Calle la Vicera',
    ref: 'de la esquina del Catastro 94 a la del 84' },
  { p: [95.2, 304.0], clase: 'fachada', lado: 'norte', tipo: T, sep: S, ref: 'fachada del Catastro 84' },
  { p: [84.0, 299.7], clase: 'fachada', lado: 'norte', tipo: T, sep: S, ref: 'fachadas del Catastro 298 y 210' },
  { p: [73.8, 295.7], clase: 'fachada', lado: 'norte', tipo: T, sep: S, ref: 'fachadas del Catastro 62 y 195' },
  { p: [53.3, 289.0], clase: 'fachada', lado: 'norte', tipo: T, sep: S,
    ref: 'recta por delante de la plazuela de los Catastro 14, 18, 286 y 233 (la fachada se mete hasta 3,2 m): '
      + 'la plazuela queda fuera del recorrido' },
  { p: [9.7, 277.9], clase: 'cierre', lado: 'oeste', tipo: T, sep: 0, nombre: 'final del recorrido',
    ref: 'perpendicular a la calle, de la fachada del Catastro 233/304 a la esquina noreste de la Sala de '
      + 'Cultura (Catastro 7)' },
  { p: [6.5, 288.1], clase: 'bocacalle', lado: 'sur', tipo: T, sep: S, nombre: 'ramal que baja a la Sala de Cultura',
    ref: 'de la esquina noreste de la Sala de Cultura (Catastro 7) a la del Catastro 60; boca de 9,6 m' },
  { p: [15.7, 291.0], clase: 'fachada', lado: 'sur', tipo: T, sep: S, ref: 'fachadas del Catastro 60, 235, 75 y 88' },
  { p: [56.8, 302.8], clase: 'fachada', lado: 'sur', tipo: T, sep: S, ref: 'fachada del Catastro 134' },
  { p: [66.7, 305.7], clase: 'fachada', lado: 'sur', tipo: T, sep: S, ref: 'tapia (muros.json, lindero del Catastro, 2,0 m)' },
  { p: [79.9, 309.5], clase: 'fachada', lado: 'sur', tipo: T, sep: S,
    ref: 'recta por delante del retranqueo del Catastro 32 (su fachada se mete hasta 3 m)' },
  { p: [94.8, 316.1], clase: 'fachada', lado: 'sur', tipo: 'panel', sep: S, visto: 'foto 2',
    ref: 'fachadas del Catastro 166, 305, 36 y 136' },
  { p: [117.7, 321.1], clase: 'fachada', lado: 'sur', tipo: 'panel', sep: S, visto: 'foto 2',
    ref: 'tapia (muros.json, lindero del Catastro, 2,6 m)' },
  { p: [120.3, 322.3], clase: 'fachada', lado: 'sur', tipo: 'panel', sep: S, visto: 'fotos 2 y 3',
    ref: 'fachadas del Catastro 261 y 246' },
  { p: [131.9, 324.8], clase: 'fachada', lado: 'sur', tipo: 'panel', sep: S, visto: 'foto 3',
    ref: 'fila san_roque (nº 54, Catastro 50)' },
  { p: [144.2, 328.4], clase: 'puerta', lado: 'este', tipo: 'puerta', sep: 0, compartido: true, ref: 'la misma puerta de la plaza' },
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
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// Devuelve, por cada lado del borde, el segmento de valla [a, b] ya recortado en las esquinas.
// Donde dos lados casi alineados tienen distinta separación no hay esquina sino un escalón:
// cada lado acaba en su propia paralela y entre los dos queda un cierre corto (los barrotes
// que cierran la acera, como junto al nº 29 en la foto 3).
function vallaDeBorde(borde) {
  const n = borde.length;
  const pts = borde.map((v) => v.p);
  const giro = Math.sign(areaConSigno(pts));
  const rectas = borde.map((v, i) => {
    const [x1, z1] = pts[i]; const [x2, z2] = pts[(i + 1) % n];
    const l = Math.hypot(x2 - x1, z2 - z1);
    const d = [(x2 - x1) / l, (z2 - z1) / l];
    const normal = [-d[1] * giro, d[0] * giro];            // hacia dentro del polígono
    return { o: [x1 + normal[0] * v.sep, z1 + normal[1] * v.sep], d, normal, sep: v.sep };
  });
  // Esquina i (entre el lado anterior y el lado i): [fin del anterior, inicio del lado i]
  const esquinas = rectas.map((r, i) => {
    const q = rectas[(i - 1 + n) % n];
    const cruz = q.d[0] * r.d[1] - q.d[1] * r.d[0];
    const propio = (recta) => [pts[i][0] + recta.normal[0] * recta.sep, pts[i][1] + recta.normal[1] * recta.sep];
    if (Math.abs(q.sep - r.sep) > 1e-6 && Math.abs(cruz) < 0.5) return [propio(q), propio(r)];   // escalón
    if (Math.abs(cruz) < 0.02) {
      // Lados casi alineados con la misma separación: el vértice desplazado por la normal media
      const m = [q.normal[0] + r.normal[0], q.normal[1] + r.normal[1]];
      const lm = Math.hypot(m[0], m[1]);
      const e = [pts[i][0] + (m[0] / lm) * r.sep, pts[i][1] + (m[1] / lm) * r.sep];
      return [e, e];
    }
    const t = ((r.o[0] - q.o[0]) * r.d[1] - (r.o[1] - q.o[1]) * r.d[0]) / cruz;
    const e = [q.o[0] + q.d[0] * t, q.o[1] + q.d[1] * t];
    return [e, e];
  });
  return borde.map((v, i) => ({ a: esquinas[i][1].map(r2), b: esquinas[(i + 1) % n][0].map(r2) }));
}

function tramosDe(zona, borde, primerId) {
  const valla = vallaDeBorde(borde);
  const tramos = [];
  const cierres = [];
  const poligono = [];
  borde.forEach((v, i) => {
    const { a, b } = valla[i];
    const anterior = valla[(i - 1 + borde.length) % borde.length].b;
    if (dist(anterior, a) > 0.05) cierres.push({ zona, a: anterior, b: a, largo: r2(dist(anterior, a)) });
    poligono.push(a);
    if (dist(a, b) > 0.05 && dist(b, valla[(i + 1) % borde.length].a) > 0.05) poligono.push(b);
    if (v.compartido) return;
    tramos.push({
      id: primerId + tramos.length, zona, clase: v.clase, lado: v.lado, tipo: v.tipo, nombre: v.nombre ?? null,
      a, b, largo: r2(dist(a, b)), fachada: [v.p, borde[(i + 1) % borde.length].p], sep: v.sep,
      visto: v.visto ?? null, ref: v.ref,
    });
  });
  return { tramos, cierres, poligono };
}

const plaza = tramosDe('plaza', BORDE_PLAZA, 1);
const calle = tramosDe('calle', BORDE_CALLE, plaza.tramos.length + 1);
const TRAMOS = [...plaza.tramos, ...calle.tramos];
const tramo = (clase, nombre) => TRAMOS.find((t) => t.clase === clase && (!nombre || t.nombre === nombre));
const medio = (t) => [r2((t.a[0] + t.b[0]) / 2), r2((t.a[1] + t.b[1]) / 2)];

// Punto de la fila de pares de la plaza (casasPlaza.js: origen y eje de plaza_pares) a u metros
// de la esquina del Ayuntamiento y a w metros de la fachada, hacia la plaza
const enPares = (u, w) => [r2(204.5 - 0.921759 * u + 0.387763 * w), r2(353.4 - 0.387763 * u - 0.921759 * w)];

const T_PUERTA = tramo('puerta');
const T_FRAGUA = tramo('bocacalle', 'Calle Fragua');
const T_PARES = TRAMOS.find((t) => t.zona === 'plaza' && t.lado === 'sur' && t.clase === 'fachada');
const T_AMBULANCIA = tramo('bocacalle', 'callejón sur del Ayuntamiento');
const T_TABLADO = TRAMOS.filter((t) => t.clase === 'tablado');
const T_CASA_GRIS = TRAMOS.find((t) => t.ref.startsWith('fachada del Catastro 365'));

// --- Dudas que tiene que resolver Rubén (las pinta la vista cenital con su número).
// Resueltas el 2026-11-15: D2 (no hay camión: en el callejón sur va la ambulancia y las vacas
// salen de un corral), D3 (los callejones se cierran en su boca) y D4 (1,5 m).
export const DUDAS_FIESTAS = [
  { id: 'D1', en: [207.5, 338.6], texto: 'Tablado: 3 m de fondo, aprobado. El ancho llegó cortado en el mensaje («desde donde hace '
    + 'esquina la cara sur del Ayuntamiento…»). Por la foto 4 lo he puesto desde esa esquina hasta las casas del lado '
    + 'norte, tapando el callejón norte. ¿Es así?' },
  { id: 'D5', en: [86.0, 306.5], texto: 'Tipo de valla: los tramos con «?» no se ven en las fotos y siguen de tablones como '
    + 'propuesta. ¿Cuáles llevan panel rojo, cuáles tubo y dónde no hay valla (solo vallas grises en las puertas)?' },
  { id: 'D6', en: [172.0, 335.0], texto: 'Burladeros: he puesto el único que se ve (foto 1, lado sur de la plaza), a ojo. '
    + '¿Dónde va exactamente y dónde están los demás, en la plaza y en la calle?' },
  { id: 'D7', en: [4.5, 283.0], texto: 'Final del recorrido: propuesto cerrarlo a la altura de la esquina de la Sala de Cultura, '
    + 'cruzando San Roque, con el ramal que baja a su fachada cerrado en la boca. ¿O el recorrido baja por el ramal?' },
  { id: 'D8', en: [99.6, 300.6], texto: 'Bocacalles de la Vicera y del ramal de la Sala de Cultura: propuesta la valla seguida. '
    + '¿Llevan puerta, paso para la gente o gradas, como la Fragua?' },
  { id: 'D9', en: [36.0, 284.5], texto: 'Plazuela del lado norte de San Roque y retranqueo del lado sur (x ≈ 80): propuesto que la valla '
    + 'pase recta por delante y queden para el público.' },
  { id: 'D10', en: [142.2, 323.6], texto: 'Puerta: por las fotos 1 y 3 la he pasado al oeste de la boca de la Fragua (la Fragua y sus '
    + 'gradas quedan del lado de la plaza), con la hoja en la mitad norte y la mitad sur fija. ¿Es así? ¿Qué ancho tiene la hoja?' },
  { id: 'D11', en: [20.0, 287.5], texto: 'Encierro: las vacas salen del corral de la plaza. ¿Recorren la calle hasta el final y '
    + 'vuelven al corral, o acaban en otro sitio?' },
  { id: 'D12', en: [186.5, 349.3], texto: 'Corral: las fotos 1 y 4 lo ponen en el lado sur de la plaza, cerca del Ayuntamiento, pero no '
    + 'dicen en qué casa. Lo he puesto, a ojo, en el portón del nº 8. ¿Es el portón del nº 8, el del nº 10 u otro?' },
  { id: 'D13', en: [143.0, 333.5], texto: 'Gradas de la boca de la Fragua: ¿cuánto fondo ocupan (dibujados 4 m) y cuántas filas tienen?' },
];

// --- El recinto
export const RECINTO_FIESTAS = {
  estado: 'propuesta',            // pasa a 'aprobado' cuando Rubén dé el visto bueno a la F0
  separacionValla: SEPARACION_VALLA,

  plaza: {
    borde: BORDE_PLAZA.map((v) => v.p),        // línea de fachadas
    ruedo: plaza.poligono,                     // interior del vallado: aquí va la arena
    eje: [[144.9, 324.5], [148.38, 325.4], [150.69, 326.11], [191.2, 339.48]],   // OSM w1433831399, desde la puerta
  },
  calle: {
    borde: BORDE_CALLE.map((v) => v.p),
    recorrido: calle.poligono,                 // interior del vallado (asfalto)
    // OSM w314839343, de la puerta al cruce del ramal de la Sala de Cultura
    eje: [[144.9, 324.5], [114.16, 316.35], [98.27, 311.28], [58.18, 298.5], [12.02, 283.91]],
  },

  // Tramos de valla, numerados (primero la plaza, luego la puerta y la calle)
  tramos: TRAMOS,
  // Cierres cortos de barrotes donde la valla empieza o acaba contra una tapia o una fachada
  cierres: [...plaza.cierres, ...calle.cierres],

  // Cierre entre plaza y calle. Cerrado en «Vacas en la plaza», abierto en los otros modos.
  // La hoja practicable ocupa solo una parte (fotos 1 y 3): ancho y lado, a ojo (D10)
  puerta: { tramo: T_PUERTA.id, a: T_PUERTA.a, b: T_PUERTA.b, largo: T_PUERTA.largo,
    hoja: { lado: 'norte', ancho: r2(T_PUERTA.largo / 2), aprox: true } },

  // Tablado con gradas delante del Ayuntamiento: 3 m de fondo (aprobado); ancho por confirmar (D1)
  tablado: { tramos: T_TABLADO.map((t) => t.id), fondo: FONDO_TABLADO,
    esquinas: [T_TABLADO[0].fachada[0], T_TABLADO[T_TABLADO.length - 1].fachada[1], T_TABLADO[T_TABLADO.length - 1].b, T_TABLADO[0].a] },

  // Gradas en la boca de la Calle Fragua, mirando a la puerta (fotos 1 y 3). Fondo a ojo (D13)
  gradas: [(({ id, fachada: [p, q] }) => {
    const l = dist(p, q); const fondo = 4.0;
    const n = [(q[1] - p[1]) / l, -(q[0] - p[0]) / l];          // hacia dentro de la Fragua (sur)
    return { tramo: id, nombre: 'gradas de la Fragua', fondo, aprox: true,
      esquinas: [p, q, [r2(q[0] + n[0] * fondo), r2(q[1] + n[1] * fondo)], [r2(p[0] + n[0] * fondo), r2(p[1] + n[1] * fondo)]] };
  })(T_FRAGUA)],

  // Corral del que salen las vacas, también en el encierro (respuesta de Rubén). Está en el lado
  // sur de la plaza, cerca del Ayuntamiento (fotos 1 y 4): una manga de tablas que cruza la acera
  // desde un portón hasta una puerta en la valla. La casa exacta está por confirmar (D12):
  // provisionalmente, el portón del nº 8 (casasPlaza.js: hueco de u 17,0 a 19,6).
  corral: { tramo: T_PARES.id, aprox: true, ancho: 2.6, manga: [enPares(17.0, 0), enPares(19.6, 0), enPares(19.6, S), enPares(17.0, S)],
    salida: enPares(18.3, S) },

  // Ambulancia (obligatoria en el festejo): detrás de la valla, en el callejón sur del Ayuntamiento
  // (foto 4). Se apoya en el centro del tramo y se alarga hacia fuera del ruedo en `direccion`.
  ambulancia: { tramo: T_AMBULANCIA.id, en: medio(T_AMBULANCIA), direccion: [0.9218, 0.3878], largo: 5.6, ancho: 2.1 },

  // Burladeros: panel rojo estrecho separado de la valla. Solo el que se ve en la foto 1, a ojo (D6)
  burladeros: [{ en: enPares(35.0, S + 0.9), lado: 'sur', zona: 'plaza', aprox: true, visto: 'foto 1' }],

  // Vallas grises que protegen una puerta donde no hay valla seguida (foto 2). Sitio a ojo:
  // la puerta está en el extremo de la casa que toca la tapia
  refugios: [(({ id, fachada: [p, q] }) => {
    const l = dist(p, q); const d = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    const n = [d[1], -d[0]];                                    // hacia la calle (sur)
    const en = (u, w) => [r2(p[0] + d[0] * u + n[0] * w), r2(p[1] + d[1] * u + n[1] * w)];
    return { tramo: id, tipo: 'gris', aprox: true, visto: 'foto 2', esquinas: [en(0.4, 0), en(3.4, 0), en(3.4, S), en(0.4, S)] };
  })(T_CASA_GRIS)],

  // Zonas del público: la acera entre la línea de fachadas y la valla de cada tramo y las bocacalles
  // (los balcones salen de las casas de casasPlaza.js en la F1; tablado y gradas van aparte)
  publico: TRAMOS.filter((t) => t.sep > 0 && t.clase !== 'tablado').map((t) => ({
    tramo: t.id, clase: t.clase === 'bocacalle' ? 'bocacalle' : 'acera', esquinas: [t.fachada[0], t.fachada[1], t.b, t.a],
  })),

  dudas: DUDAS_FIESTAS,
};
