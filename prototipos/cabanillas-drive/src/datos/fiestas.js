// Recinto del modo fiestas (PLAN_FIESTAS.md, fase F0): dónde va cada cosa del festejo en la
// Plaza del Ayuntamiento y la Calle San Roque. Coordenadas locales (x este, z sur, m).
//
// ESTADO: PROPUESTA sin aprobar (tercera vuelta). Rubén la revisa sobre la vista cenital que
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
// - Tres croquis de Rubén del 2026-11-16 (también descritos en docs/fiestas/README.md):
//     croquis 1: sobre el plano de la F0, el tablado, el cierre del callejón sur, la ambulancia
//                y la puerta de los corrales
//     croquis 2: sobre Google Maps, los corrales (patio detrás del nº 8) y su pasillo a la plaza
//     croquis 3: sobre Google Maps, las gradas a dos aguas delante del nº 2 y la puerta

// Distancia de la valla a la línea de fachadas (m): 1,5 m, marcado por Rubén en la foto 2.
export const SEPARACION_VALLA = 1.5;
// Fondo del tablado (m): 3 m, aprobado por Rubén.
export const FONDO_TABLADO = 3.0;
// Paso libre entre el tablado y la fachada del Ayuntamiento (m): en el croquis 1 el tablado va
// 3 m por delante de la fachada. Por ahí se pasa del callejón norte a la acera de detrás de la
// valla norte.
export const PASO_TRAS_TABLADO = 3.0;

// Tipos de valla
//   tablones  postes rojos y tablones de madera (la de la plaza)
//   panel     chapa roja maciza, más baja
//   tubo      barandilla roja de tubo, tres barras
//   puerta    cierre entre plaza y calle, con una hoja practicable
//   tablado   frente del tablado o de unas gradas (tablones con las gradas detrás)
//   ninguna   sin valla: el límite es la tapia o la fachada (las puertas, con valla gris)
const T = 'tablones';
const S = SEPARACION_VALLA;

// --- Bordes del recinto: polígonos de la línea de fachadas. Cada entrada es un vértice (p) y
// el lado que va de él al siguiente (el último vuelve al primero), con la clase del lado, el
// tipo de valla y su separación de la línea.

// Punto de la fila de pares de la plaza (casasPlaza.js: origen y eje de plaza_pares) a u metros
// de la esquina del Ayuntamiento y a w metros de la fachada, hacia la plaza
const r2 = (v) => Math.round(v * 100) / 100;
const enPares = (u, w) => [r2(204.5 - 0.921759 * u + 0.387763 * w), r2(353.4 - 0.387763 * u - 0.921759 * w)];

// Gradas a dos aguas delante del nº 2 de la plaza (croquis 3; se ven en las fotos 1 y 3 y también
// en la ortofoto del juego, que las pilló montadas): un bloque pegado a la fachada con la grada
// que mira a la plaza, la que mira a la calle y un hueco para estar de pie. Medidas a ojo del
// croquis y de la ortofoto (D13). u a lo largo de la fila de pares; el nº 2 va de 48,33 a 61,19.
const GRADAS_NUMERO_2 = { u: [50.3, 53.3, 57.3, 59.7], fondo: 5.0 };
const G_ESTE_0 = enPares(GRADAS_NUMERO_2.u[0], 0);                              // en la fachada
const G_ESTE_F = enPares(GRADAS_NUMERO_2.u[0], GRADAS_NUMERO_2.fondo);          // esquina al ruedo
const G_OESTE_0 = enPares(GRADAS_NUMERO_2.u[3], 0);
const G_OESTE_F = enPares(GRADAS_NUMERO_2.u[3], GRADAS_NUMERO_2.fondo);
// Donde la recta de la cara este de las gradas llega a la línea de fachadas del norte: ahí acaba la puerta
const PUERTA_NORTE = [162.42, 323.71];

// Plaza: cuña entre las dos filas de casas, de la puerta al tablado
const BORDE_PLAZA = [
  { p: PUERTA_NORTE, clase: 'fachada', lado: 'norte', tipo: T, sep: S, visto: 'fotos 1 y 4',
    ref: 'recta de la fila plaza_impares (nº 1 a 11)' },
  { p: [204.4, 335.65], clase: 'tablado', lado: 'este', tipo: 'tablado', sep: FONDO_TABLADO + PASO_TRAS_TABLADO,
    visto: 'fotos 1 y 4 y croquis 1',
    ref: 'recta de la fachada oeste del Ayuntamiento (Catastro 259), de la fila de impares a su esquina suroeste; '
      + 'el tablado va de 3 a 6 m de ella' },
  { p: [200.8, 346.5], clase: 'bocacalle', lado: 'este', tipo: T, sep: FONDO_TABLADO + PASO_TRAS_TABLADO, visto: 'croquis 1',
    nombre: 'cierre hacia el callejón sur',
    ref: 'de la esquina suroeste del Ayuntamiento a la fila de pares, en línea con el frente del tablado' },
  { p: [199.25, 351.2], clase: 'fachada', lado: 'sur', tipo: T, sep: S, visto: 'foto 1 y croquis 1',
    ref: 'recta de la fila plaza_pares (nº 10 a 4 y el principio del nº 2)' },
  { p: G_ESTE_0, clase: 'gradas', lado: 'oeste', tipo: 'tablado', sep: 0, visto: 'foto 1 y croquis 3',
    nombre: 'frente de la grada del lado de la plaza', ref: 'cara este de las gradas del nº 2: es la parte fija del cierre' },
  { p: G_ESTE_F, clase: 'puerta', lado: 'oeste', tipo: 'puerta', sep: 0, visto: 'fotos 1 y 3 y croquis 3',
    ref: 'de la esquina de las gradas a la fila de impares, en la recta de su cara este' },
];

// Calle San Roque: de la puerta a la Sala de Cultura. Primero el lado norte hacia el oeste,
// luego el cierre final y el lado sur de vuelta, que acaba rodeando las gradas del nº 2.
const BORDE_CALLE = [
  { p: PUERTA_NORTE, clase: 'fachada', lado: 'norte', tipo: T, sep: S, visto: 'foto 3',
    ref: 'recta de la fila plaza_impares (principio del nº 1) y el solar de 5,9 m que hay hasta el nº 29 de San Roque' },
  { p: [153.1, 320.9], clase: 'fachada', lado: 'norte', tipo: T, sep: S, visto: 'foto 3',
    ref: 'fachada del nº 29 de San Roque (Catastro 47), parte este' },
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
  { p: [144.2, 328.4], clase: 'bocacalle', lado: 'sur', tipo: T, sep: S, nombre: 'Calle Fragua',
    ref: 'de la esquina del nº 54 de San Roque (Catastro 50) a la del nº 2 de la plaza (Catastro 43), boca de 4,1 m, '
      + 'y 1,4 m de la fachada del nº 2 hasta las gradas' },
  { p: G_OESTE_0, clase: 'gradas', lado: 'sur', tipo: T, sep: 0, visto: 'foto 3 y croquis 3',
    nombre: 'cierre del hueco de las gradas', ref: 'cara oeste del bloque de gradas del nº 2 (la valla baja con gente detrás de la foto 3)' },
  { p: G_OESTE_F, clase: 'gradas', lado: 'sur', tipo: T, sep: 0, visto: 'foto 1 y croquis 3',
    nombre: 'costado de las gradas', ref: 'cara norte del bloque de gradas del nº 2' },
  { p: G_ESTE_F, clase: 'puerta', lado: 'este', tipo: 'puerta', sep: 0, compartido: true, ref: 'la misma puerta de la plaza' },
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

const T_PUERTA = tramo('puerta');
const T_PARES = TRAMOS.find((t) => t.zona === 'plaza' && t.lado === 'sur' && t.clase === 'fachada');
const T_TABLADO = tramo('tablado');
const T_CASA_GRIS = TRAMOS.find((t) => t.ref.startsWith('fachada del Catastro 365'));

// --- Dudas que tiene que resolver Rubén (las pinta la vista cenital con su número).
// Resueltas el 2026-11-15: D2 (no hay camión: en el callejón sur va la ambulancia y las vacas
// salen de un corral), D3 (los callejones se cierran en su boca) y D4 (1,5 m).
// Resueltas el 2026-11-16: D10 (puerta en la mitad norte del cierre; la mitad sur es el frente
// de las gradas del nº 2), D11 (el encierro da dos vueltas y acaba en el corral) y D12 (el
// corral está detrás del nº 8 y sale por su portón).
export const DUDAS_FIESTAS = [
  { id: 'D1', en: [207.5, 338.6], texto: 'Tablado: he leído tu rectángulo rojo así: 3 m de fondo, separado 3 m de la fachada del '
    + 'Ayuntamiento (por detrás se pasa del callejón norte a la acera del lado norte), desde la valla norte hasta la '
    + 'esquina de la cara sur del Ayuntamiento. ¿Es así, o el tablado va pegado a la fachada?' },
  { id: 'D5', en: [86.0, 306.5], texto: 'Tipo de valla: los tramos con «?» no se ven en las fotos y siguen de tablones como '
    + 'propuesta. ¿Cuáles llevan panel rojo, cuáles tubo y dónde no hay valla (solo vallas grises en las puertas)?' },
  { id: 'D6', en: [172.0, 335.0], texto: 'Burladeros: he puesto el único que se ve (foto 1, lado sur de la plaza), a ojo. '
    + '¿Dónde va exactamente y dónde están los demás, en la plaza y en la calle?' },
  { id: 'D7', en: [4.5, 283.0], texto: 'Final del recorrido: propuesto cerrarlo a la altura de la esquina de la Sala de Cultura, '
    + 'cruzando San Roque, con el ramal que baja a su fachada cerrado en la boca. ¿O el recorrido baja por el ramal?' },
  { id: 'D8', en: [99.6, 300.6], texto: 'Bocacalles de la Vicera, de la Fragua y del ramal de la Sala de Cultura: propuesta la valla '
    + 'seguida. ¿Llevan puerta o paso para la gente?' },
  { id: 'D9', en: [36.0, 284.5], texto: 'Plazuela del lado norte de San Roque y retranqueo del lado sur (x ≈ 80): propuesto que la valla '
    + 'pase recta por delante y queden para el público.' },
  { id: 'D13', en: enPares(54.5, -3.5), texto: 'Gradas del nº 2: medidas a ojo de tu croquis y de la foto aérea: 5 m de fondo; 3 m de '
    + 'ancho la grada de la plaza, 4 m la de la calle y 2,4 m el hueco para estar de pie. ¿Cuánto miden?' },
];

// --- El recinto
const esquinasPares = (u0, u1, w0, w1) => [enPares(u0, w0), enPares(u1, w0), enPares(u1, w1), enPares(u0, w1)];
const U_G = GRADAS_NUMERO_2.u;
const F_G = GRADAS_NUMERO_2.fondo;
// Portón del nº 8 (casasPlaza.js: hueco de u 17,0 a 19,6): la puerta de los corrales
const U_CORRAL = [17.0, 19.6];
const centroPuerta = medio(T_PUERTA);

export const RECINTO_FIESTAS = {
  estado: 'propuesta',            // pasa a 'aprobado' cuando Rubén dé el visto bueno a la F0
  separacionValla: SEPARACION_VALLA,

  plaza: {
    borde: BORDE_PLAZA.map((v) => v.p),        // línea de fachadas
    ruedo: plaza.poligono,                     // interior del vallado: aquí va la arena
    eje: [centroPuerta, [191.2, 339.48]],      // OSM w1433831399, desde la puerta
  },
  calle: {
    borde: BORDE_CALLE.map((v) => v.p),
    recorrido: calle.poligono,                 // interior del vallado (asfalto)
    // OSM w314839343, de la puerta al cruce del ramal de la Sala de Cultura. Junto a las gradas
    // del nº 2 se desvía al paso que queda entre ellas y la valla norte.
    eje: [centroPuerta, [155.0, 325.1], [150.5, 324.6], [144.0, 324.2], [114.16, 316.35], [98.27, 311.28], [58.18, 298.5],
      [12.02, 283.91]],
  },

  // Tramos de valla, numerados (primero la plaza, luego la puerta y la calle)
  tramos: TRAMOS,
  // Cierres cortos de barrotes donde la valla empieza o acaba contra una tapia o una fachada
  cierres: [...plaza.cierres, ...calle.cierres],

  // Puerta entre plaza y calle: la mitad norte del cierre (respuesta de Rubén); la mitad sur, fija,
  // es el frente de la grada que mira a la plaza. Cerrada en «Vacas en la plaza»; abierta en
  // «Vacas en la calle» y durante todo el encierro.
  puerta: { tramo: T_PUERTA.id, a: T_PUERTA.a, b: T_PUERTA.b, largo: T_PUERTA.largo },

  // Tablado con gradas, 3 m de fondo, a 3 m de la fachada del Ayuntamiento (croquis 1; D1). Va de la
  // valla norte a la esquina de la cara sur del Ayuntamiento.
  tablado: (({ id, a, b }) => {
    const l = dist(a, b); const n = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];     // hacia el Ayuntamiento (este)
    const atras = (p) => [r2(p[0] + n[0] * FONDO_TABLADO), r2(p[1] + n[1] * FONDO_TABLADO)];
    return { tramo: id, fondo: FONDO_TABLADO, paso: PASO_TRAS_TABLADO, esquinas: [a, b, atras(b), atras(a)] };
  })(T_TABLADO),

  // Gradas a dos aguas delante del nº 2 de la plaza (croquis 3). Medidas a ojo (D13)
  gradas: { casa: 'Plaza del Ayuntamiento 2', fondo: F_G, aprox: true, esquinas: esquinasPares(U_G[0], U_G[3], 0, F_G),
    partes: [
      { nombre: 'grada del lado de la plaza', mira: 'este', esquinas: esquinasPares(U_G[0], U_G[1], 0, F_G) },
      { nombre: 'grada del lado de la calle', mira: 'oeste', esquinas: esquinasPares(U_G[1], U_G[2], 0, F_G) },
      { nombre: 'hueco para estar de pie', mira: 'oeste', esquinas: esquinasPares(U_G[2], U_G[3], 0, F_G) },
    ] },

  // Corral: las vacas salen de él y vuelven a él, también en el encierro. Los corrales son el patio
  // de detrás del nº 8 de la plaza (croquis 2; se ven los cercados en la ortofoto) y se comunican
  // con la plaza por un pasillo que acaba en el portón del nº 8 («puerta de los corrales», croquis 1).
  // De ahí, una manga de tablas cruza la acera hasta una puerta en la valla (foto 1).
  corral: { tramo: T_PARES.id, casa: 'Plaza del Ayuntamiento 8', ancho: r2(U_CORRAL[1] - U_CORRAL[0]),
    puerta: [enPares(U_CORRAL[0], 0), enPares(U_CORRAL[1], 0)],
    manga: esquinasPares(U_CORRAL[0], U_CORRAL[1], 0, S),
    salida: enPares((U_CORRAL[0] + U_CORRAL[1]) / 2, S),
    // Pasillo por dentro del edificio y patio de los corrales: a ojo, del croquis 2 y de la ortofoto
    pasillo: [enPares((U_CORRAL[0] + U_CORRAL[1]) / 2, 0), [186.4, 356.5]],
    patio: [[165.3, 358.0], [185.5, 357.2], [186.5, 369.5], [166.0, 371.0]], aprox: true },

  // Ambulancia (obligatoria en el festejo): dentro del callejón sur del Ayuntamiento (foto 4 y croquis 1)
  ambulancia: { en: [202.0, 349.7], direccion: [0.935, 0.354], largo: 5.6, ancho: 2.1 },

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

  // Encierro (respuesta de Rubén, 2026-11-16; para la F5): con la puerta abierta, las vacas salen
  // del corral, van hasta el final de la calle y vuelven a la plaza; el corral sigue cerrado, así
  // que repiten el recorrido; a la segunda vuelta lo encuentran abierto y entran.
  encierro: { sale: 'corral', vueltas: 2, puertaAbierta: true, acaba: 'corral' },

  // Zonas del público: la acera entre la línea de fachadas y la valla de cada tramo, las bocacalles
  // y el paso de detrás del tablado (los balcones salen de las casas de casasPlaza.js en la F1;
  // tablado y gradas van aparte)
  publico: TRAMOS.filter((t) => t.sep > 0).map((t) => ({
    tramo: t.id, clase: t.clase === 'bocacalle' ? 'bocacalle' : t.clase === 'tablado' ? 'paso' : 'acera',
    esquinas: [t.fachada[0], t.fachada[1], t.b, t.a],
  })),

  dudas: DUDAS_FIESTAS,
};
