// Calle San Isidro 5 a 15 (acera norte, de la esquina con Bardenas Reales hacia el este),
// modeladas a mano con las fotos de calle que aportó Rubén (2025) sobre las huellas del
// Catastro y las parcelas de OSM (addr:housenumber). Lo construye src/escena/casas.js.
//
// Coordenadas de la fila (m): u a lo largo de la calle desde la esquina (este +), w hacia dentro
// de la parcela desde la valla de la calle (w = 0; norte +), y sobre la acera de cada casa.
// Lo que no se ve desde la calle (fondos, patios) es sencillo.
//
// Elementos de cada casa:
//   cuerpos: volúmenes con su fachada a la calle en w[0] (huecos recortados en ella)
//     { u, w: [fachada, fondo], desde, alto, mat, matFachada, zocalo: { mat, alto }, huecos }
//     huecos: { t: 'v' ventana | 'p' puerta | 'g' garaje, u, y, ... }
//       ventana: marco ('madera' | 'blanco' | 'aluminio'), persiana (fracción bajada),
//                colorPersiana, contra (contraventanas 'blanca' | 'madera'), cortina, reja
//       puerta:  mat ('madera' | 'blanca'), hojas, vidrio
//       garaje:  tipo ('tablas' | 'seccional' | 'chapa'), color
//   franjas: impostas y bandas en fachada { u, w, y, vuelo, mat }
//   porches: { u, w, suelo, techo, techoMat, dintel: { mat, hasta }, pilares: [{ u, w, t, ancho }] }
//   plataformas: suelos elevados (porche, terraza) { u, w, y, mat, lateral }
//   escaleras: suben hacia +w { u, w, y, peldanos, mat, laterales, barandilla: { color, lados } }
//   balcones: { u, w (fachada), vuelo, y, alto, color }
//   tejados: { u, w, alero, pendiente, vuelo: [delante, detrás], vueloLado, caderas, teja,
//              sofito, pinon (material del hastial), paneles, velux, chimeneas }
//   valla: en w = 0 { tramos: [{ u, murete: { alto, mat }, barandilla: { alto, color, tipo } }],
//          pilares: [{ u, ancho, alto, mat }], puertas: [{ u, alto, color, tipo }] }
//   muretes: { de: [u, w], a: [u, w], y0, alto, mat, barandilla }
//   pavimentos (pegados al terreno), setos, jardineras, arboles (de bola), splits, faroles
export const FILA_SAN_ISIDRO = {
  origen: [-40.3, 1.5134],                  // esquina de la valla con Bardenas Reales (x, z)
  eje: [0.999119, -0.041963],               // dirección de la calle (este)
};

const ENF = '#f1efe9';                      // enfoscado blanco roto de la calle

export const CASAS_SAN_ISIDRO = [
  // --- Nº 5: esquina con Bardenas Reales. Ladrillo caravista crema, porche a la izquierda con
  // techo de madera y fondo de ladrillo rústico, tejado a cuatro aguas rojizo con placas
  // fotovoltaicas y dos colectores solares, valla de ladrillo con forja negra
  {
    numero: 5, u: [0.7, 13.49],
    cuerpos: [
      { u: [0.7, 6.7], w: [4.6, 11.5], alto: 3.75, mat: 'ladrilloCrema', matFachada: 'ladrilloRustico',
        huecos: [
          { t: 'v', u: [1.7, 3.0], y: [1.15, 2.45], marco: 'madera', cortina: true },
          { t: 'p', u: [3.75, 5.15], y: [0.45, 2.75], mat: 'madera', hojas: 2 },
        ] },
      { u: [0.7, 1.15], w: [2.29, 4.6], alto: 3.75, mat: 'ladrilloCrema' },
      { u: [6.7, 13.49], w: [2.29, 11.5], alto: 3.75, mat: 'ladrilloCrema',
        huecos: [
          { t: 'v', u: [7.9, 9.3], y: [1.25, 2.6], marco: 'aluminio', persiana: 0.45, colorPersiana: 'blanca' },
          { t: 'g', u: [10.0, 12.6], y: [0, 2.2], tipo: 'chapa', color: '#3e4844' },
        ] },
    ],
    franjas: [{ u: [0.7, 13.49], w: 2.29, y: [2.95, 3.75], vuelo: 0.05, mat: 'ladrilloClaro' }],
    porches: [{ u: [1.15, 6.7], w: [2.29, 4.6], suelo: 0.45, techo: 2.95, techoMat: 'madera' }],
    plataformas: [{ u: [1.15, 6.7], w: [2.29, 4.6], y: 0.45, mat: 'baldosaRoja', lateral: 'ladrilloRustico' }],
    escaleras: [{ u: [2.95, 4.05], w: [0.3, 2.29], y: [0, 0.45], peldanos: 3, mat: 'baldosaRoja' }],
    tejados: [{
      u: [0.7, 13.49], w: [2.29, 11.5], alero: 3.75, pendiente: 30, vuelo: [0.55, 0.45], vueloLado: [0.55, 0],
      caderas: [true, false], teja: '#995a3e', sofito: 'madera', pinon: 'ladrilloCrema',
      paneles: [{ u: [2.6, 8.0], w: [2.0, 5.6], tipo: 'fv' }, { u: [8.4, 11.6], w: [4.6, 6.2], tipo: 'termico' }],
      chimeneas: [{ u: 6.6, w: 6.6, alto: 1.1, mat: 'enfoscadoGris' }],
    }],
    valla: {
      tramos: [{ u: [0.7, 13.49], murete: { alto: 0.7, mat: 'ladrilloCrema' }, barandilla: { alto: 0.72, color: 'negro', tipo: 'barrotes' } }],
      pilares: [{ u: 0.92, ancho: 0.45, alto: 1.55, mat: 'ladrilloCrema' }, { u: 2.73, ancho: 0.42, alto: 1.55, mat: 'ladrilloCrema' },
        { u: 4.27, ancho: 0.42, alto: 1.55, mat: 'ladrilloCrema' }, { u: 9.7, ancho: 0.42, alto: 1.55, mat: 'ladrilloCrema' },
        { u: 13.27, ancho: 0.42, alto: 1.55, mat: 'ladrilloCrema' }],
      puertas: [{ u: [2.95, 4.05], alto: 1.42, color: 'negro', tipo: 'peaton' },
        { u: [9.92, 13.05], alto: 1.45, color: 'negro', tipo: 'vehiculo' }],
    },
    muretes: [{ de: [0.92, 0.2], a: [0.92, 2.29], alto: 0.7, mat: 'ladrilloCrema', barandilla: { alto: 0.72, color: 'negro' } }],
    pavimentos: [{ u: [1.15, 13.27], w: [0.24, 2.29], mat: 'baldosaGris' }],
    setos: [{ u: [1.15, 2.5], w: [0.3, 1.6], alto: 1.35 }, { u: [5.1, 6.6], w: [0.3, 1.3], alto: 1.0, color: '#4f6a32' },
      { u: [7.7, 9.5], w: [0.3, 1.25], alto: 1.15 }],
  },

  // --- Nº 7: dos plantas y ático. Planta baja con aplacado de piedra, ventana con contraventanas
  // de madera, puerta acristalada y portón de garaje de madera; arriba, balcón corrido con
  // barandilla y persianas de madera bajo un gran alero blanco con columna; jardineras blancas
  {
    numero: 7, u: [13.49, 26.2],
    cuerpos: [
      { u: [13.49, 17.55], w: [2.28, 13.0], alto: 3.0, mat: 'enfoscado', color: ENF, zocalo: { mat: 'piedra', alto: 0.55 },
        huecos: [{ t: 'v', u: [14.4, 16.1], y: [0.95, 2.3], marco: 'madera', contra: 'madera' }] },
      { u: [17.55, 26.2], w: [3.74, 13.0], alto: 3.0, mat: 'enfoscado', color: ENF, matFachada: 'piedra',
        huecos: [
          { t: 'p', u: [18.3, 19.45], y: [0.15, 2.45], mat: 'blanca', vidrio: true },
          { t: 'v', u: [20.0, 20.95], y: [1.0, 2.25], marco: 'madera', persiana: 0.3 },
          { t: 'g', u: [22.85, 25.85], y: [0, 2.6], tipo: 'tablas', color: '#6b4128' },
        ] },
      { u: [13.49, 26.2], w: [3.0, 13.0], desde: 3.0, alto: 6.25, mat: 'enfoscado', color: ENF,
        huecos: [
          { t: 'v', u: [14.25, 16.0], y: [3.25, 5.35], marco: 'madera', persiana: 1, colorPersiana: 'madera' },
          { t: 'v', u: [17.3, 18.55], y: [3.25, 5.35], marco: 'madera', persiana: 1, colorPersiana: 'madera' },
          { t: 'v', u: [19.55, 20.8], y: [3.25, 5.35], marco: 'madera', persiana: 0.8, colorPersiana: 'madera' },
          { t: 'v', u: [22.7, 24.45], y: [3.25, 5.35], marco: 'madera', persiana: 1, colorPersiana: 'madera' },
        ] },
      { u: [15.8, 23.4], w: [6.6, 11.6], desde: 6.0, alto: 8.65, mat: 'enfoscado', color: ENF,
        huecos: [
          { t: 'v', u: [16.9, 18.1], y: [6.95, 7.95], marco: 'madera', persiana: 0.6, colorPersiana: 'madera' },
          { t: 'v', u: [20.9, 22.1], y: [6.95, 7.95], marco: 'madera', persiana: 0.6, colorPersiana: 'madera' },
        ] },
    ],
    balcones: [{ u: [13.49, 26.2], w: 3.0, vuelo: 1.6, y: 3.0, alto: 1.0, color: 'negro', canto: 'enfoscado' }],
    porches: [{ u: [17.55, 26.2], w: [1.4, 3.74], suelo: 0.0, techo: 2.95, sinTecho: true,
      pilares: [{ u: 21.9, w: 1.75, t: 'piedra', ancho: 0.75, alto: 2.95 }] }],
    columnas: [{ u: 21.9, w: 1.65, y: [4.0, 6.25], radio: 0.14 }],
    plataformas: [{ u: [17.8, 20.2], w: [2.9, 3.74], y: 0.15, mat: 'baldosaGris', lateral: 'piedra' }],
    tejados: [
      { u: [13.49, 26.2], w: [3.0, 13.0], alero: 6.25, pendiente: 22, vuelo: [1.7, 0.4], vueloLado: [0.3, 0.3],
        caderas: [true, true], teja: '#7f5a46', sofito: 'blanco', pinon: 'enfoscado' },
      { u: [15.8, 23.4], w: [6.6, 11.6], alero: 8.65, pendiente: 25, vuelo: [0.4, 0.4], vueloLado: [0.4, 0.4],
        caderas: [true, true], teja: '#7f5a46', sofito: 'blanco', chimeneas: [{ u: 22.4, w: 9.8, alto: 0.9, mat: 'enfoscado' }] },
    ],
    pavimentos: [{ u: [13.49, 26.2], w: [0, 3.74], mat: 'baldosaGris' }],
    jardineras: [{ u: 14.3, w: 0.45 }, { u: 15.55, w: 0.45 }, { u: 16.8, w: 0.45 }, { u: 21.0, w: 1.0 }],
  },

  // --- Nº 9: planta baja elevada y garaje de dos alturas. Enfoscado blanco con zócalo de piedra,
  // porche con pilar de piedra, escalera con barandilla negra, portón de madera y placas
  // solares; valla de piedra con forja negra
  {
    numero: 9, u: [26.2, 39.09],
    cuerpos: [
      { u: [26.2, 30.35], w: [2.26, 13.0], alto: 3.95, mat: 'enfoscado', color: ENF, zocalo: { mat: 'piedra', alto: 0.95 },
        huecos: [{ t: 'v', u: [27.35, 29.15], y: [1.6, 2.85], marco: 'madera', persiana: 0.35, colorPersiana: 'madera', cortina: true }] },
      { u: [30.35, 33.8], w: [4.4, 13.0], alto: 3.95, mat: 'enfoscado', color: ENF, zocalo: { mat: 'piedra', alto: 0.9 },
        huecos: [{ t: 'p', u: [31.3, 32.3], y: [0.9, 3.0], mat: 'madera', hojas: 1 }] },
      { u: [33.8, 39.09], w: [4.4, 13.0], alto: 5.25, mat: 'enfoscado', color: ENF,
        huecos: [
          { t: 'g', u: [34.9, 37.9], y: [0, 2.45], tipo: 'tablas', color: '#764628' },
          { t: 'v', u: [34.75, 35.95], y: [3.05, 4.3], marco: 'madera', persiana: 0.45, colorPersiana: 'madera' },
          { t: 'v', u: [36.75, 37.95], y: [3.05, 4.3], marco: 'madera', persiana: 0.45, colorPersiana: 'madera' },
        ] },
    ],
    franjas: [{ u: [33.8, 39.09], w: 4.4, y: [2.62, 2.78], vuelo: 0.12, mat: 'enfoscado', color: ENF }],
    porches: [{ u: [30.35, 33.8], w: [2.26, 4.4], suelo: 0.9, techo: 3.3, techoMat: 'madera', dintel: { mat: 'enfoscado', hasta: 3.95 },
      pilares: [{ u: 33.55, w: 2.5, t: 'piedra', ancho: 0.45 }] }],
    plataformas: [{ u: [30.35, 33.8], w: [2.26, 4.4], y: 0.9, mat: 'marmol', lateral: 'piedra' }],
    escaleras: [{ u: [31.0, 32.3], w: [0.3, 2.26], y: [0, 0.9], peldanos: 5, mat: 'marmol', laterales: 'piedra',
      barandilla: { color: 'negro', lados: [true, false] } }],
    tejados: [
      { u: [26.2, 33.8], w: [2.26, 13.0], alero: 3.95, pendiente: 30, vuelo: [0.55, 0.4], teja: '#6e5446', sofito: 'madera',
        paneles: [{ u: [27.0, 33.4], w: [4.7, 7.3], tipo: 'fv' }], chimeneas: [{ u: 29.6, w: 7.1, alto: 1.0, mat: 'enfoscado', antena: true }] },
      { u: [33.8, 39.09], w: [4.4, 13.0], alero: 5.25, pendiente: 28, vuelo: [0.5, 0.4], teja: '#6e5446', sofito: 'blanco', pinon: 'enfoscado',
        paneles: [{ u: [34.1, 38.8], w: [5.1, 7.6], tipo: 'fv' }], chimeneas: [{ u: 34.6, w: 8.4, alto: 1.1, mat: 'ladrilloRojo' }] },
    ],
    valla: {
      tramos: [{ u: [26.2, 33.95], murete: { alto: 0.55, mat: 'piedra' }, barandilla: { alto: 0.6, color: 'negro', tipo: 'barrotes' } }],
      pilares: [26.42, 28.6, 30.8, 32.5, 33.75].map((u) => ({ u, ancho: 0.42, alto: 1.25, mat: 'piedra' })),
      puertas: [{ u: [31.0, 32.3], alto: 1.15, color: 'negro', tipo: 'peaton' }],
    },
    pavimentos: [{ u: [26.2, 30.35], w: [0.24, 2.26], mat: 'baldosaGris' }, { u: [33.8, 39.09], w: [0, 4.4], mat: 'hormigon' }],
    splits: [{ u: 26.95, y: 1.0, w: 2.26 }],
    faroles: [{ u: 32.6, y: 2.55, w: 4.4 }],
  },

  // --- Nº 11: ladrillo caravista rojizo. Porche con columna blanca sobre una terraza elevada
  // con barandilla blanca, ventanas con contraventanas blancas, lucernario y placas solares
  {
    numero: 11, u: [39.09, 51.8],
    cuerpos: [
      { u: [39.09, 45.1], w: [4.35, 13.0], alto: 3.95, mat: 'ladrilloRojo',
        huecos: [
          { t: 'v', u: [40.2, 41.5], y: [1.3, 3.0], marco: 'blanco', contra: 'blanca', cortina: true },
          { t: 'v', u: [42.0, 43.3], y: [1.3, 3.0], marco: 'blanco', contra: 'blanca', cortina: true },
          { t: 'p', u: [43.75, 44.7], y: [0.9, 3.0], mat: 'blanca', vidrio: true },
        ] },
      { u: [45.1, 51.8], w: [2.21, 13.0], alto: 3.95, mat: 'ladrilloRojo',
        huecos: [
          { t: 'v', u: [46.9, 49.0], y: [1.5, 2.95], marco: 'blanco', contra: 'blanca', cortina: true },
          { t: 'v', u: [49.8, 51.0], y: [1.5, 2.95], marco: 'blanco', contra: 'blanca' },
        ] },
    ],
    porches: [{ u: [39.09, 45.1], w: [2.23, 4.35], suelo: 0.9, techo: 3.3, techoMat: 'madera', dintel: { mat: 'ladrilloRojo', hasta: 3.95 },
      pilares: [{ u: 39.45, w: 2.45, t: 'columna', ancho: 0.32 }] }],
    plataformas: [{ u: [39.09, 44.0], w: [1.0, 4.35], y: 0.9, mat: 'baldosaRoja', lateral: 'ladrilloRojo' }],
    escaleras: [{ u: [44.05, 45.05], w: [0.3, 2.2], y: [0, 0.9], peldanos: 5, mat: 'baldosaRoja', laterales: 'ladrilloRojo',
      barandilla: { color: 'blanco', lados: [false, true] } }],
    muretes: [{ de: [39.09, 1.0], a: [44.0, 1.0], y0: 0.9, alto: 0, barandilla: { alto: 0.85, color: 'blanco' } },
      { de: [44.0, 1.0], a: [44.0, 2.23], y0: 0.9, alto: 0, barandilla: { alto: 0.85, color: 'blanco' } }],
    tejados: [{
      u: [39.09, 51.8], w: [2.21, 13.0], alero: 3.95, pendiente: 30, vuelo: [0.55, 0.4], teja: '#9a6247', sofito: 'madera',
      velux: [{ u: [42.5, 43.6], w: [4.3, 5.6] }],
      paneles: [{ u: [46.4, 51.4], w: [5.0, 7.3], tipo: 'fv' }],
      chimeneas: [{ u: 44.6, w: 7.4, alto: 1.3, mat: 'ladrilloRojo' }],
    }],
    valla: {
      tramos: [{ u: [39.09, 51.8], murete: { alto: 0.55, mat: 'ladrilloRojo' }, barandilla: { alto: 0.6, color: 'blanco', tipo: 'barrotes' } }],
      pilares: [39.3, 41.6, 43.9, 45.25, 48.4, 51.6].map((u) => ({ u, ancho: 0.4, alto: 1.25, mat: 'ladrilloRojo' })),
      puertas: [{ u: [44.1, 45.05], alto: 1.15, color: 'blanco', tipo: 'peaton' }],
    },
    pavimentos: [{ u: [45.1, 51.8], w: [0.24, 2.21], mat: 'baldosaRoja' }],
    setos: [{ u: [39.5, 43.8], w: [0.3, 0.95], alto: 0.75, color: '#8a8f3a', flores: '#e2c23a' }],
  },

  // --- Nº 13: dos plantas en ladrillo caravista claro, balcón de forja, gran alero blanco y
  // portón de madera; valla de forja negra con cruces y seto junto al garaje
  {
    numero: 13, u: [51.8, 64.73],
    cuerpos: [
      { u: [51.8, 56.0], w: [3.88, 11.5], alto: 6.05, mat: 'ladrilloClaro',
        huecos: [
          { t: 'p', u: [52.95, 53.95], y: [0.3, 2.45], mat: 'madera', hojas: 1 },
          { t: 'v', u: [54.5, 55.6], y: [1.0, 2.25], marco: 'madera', persiana: 0.4, colorPersiana: 'madera' },
          { t: 'v', u: [52.6, 54.0], y: [3.65, 4.95], marco: 'madera', persiana: 0.35, colorPersiana: 'madera' },
        ] },
      { u: [56.0, 64.73], w: [2.5, 11.5], alto: 6.05, mat: 'ladrilloClaro',
        huecos: [
          { t: 'v', u: [56.8, 58.2], y: [0.95, 2.25], marco: 'madera', persiana: 0.4, colorPersiana: 'madera', reja: true },
          { t: 'g', u: [60.0, 62.7], y: [0, 2.4], tipo: 'tablas', color: '#8a552f' },
          { t: 'v', u: [57.0, 58.4], y: [3.25, 5.3], marco: 'madera', persiana: 0.45, colorPersiana: 'madera' },
          { t: 'v', u: [60.3, 61.7], y: [3.25, 5.3], marco: 'madera', persiana: 0.45, colorPersiana: 'madera' },
          { t: 'v', u: [63.0, 64.1], y: [3.7, 4.95], marco: 'madera', persiana: 0.3, colorPersiana: 'madera' },
        ] },
    ],
    franjas: [{ u: [56.0, 64.73], w: 2.5, y: [2.95, 3.12], vuelo: 0.04, mat: 'ladrilloCrema' }],
    balcones: [{ u: [56.6, 62.4], w: 2.5, vuelo: 0.85, y: 3.12, alto: 0.95, color: 'negro', canto: 'marmol' }],
    plataformas: [{ u: [52.6, 54.3], w: [3.2, 3.88], y: 0.3, mat: 'marmol', lateral: 'ladrilloClaro' }],
    tejados: [{ u: [51.8, 64.73], w: [2.5, 11.5], alero: 6.05, pendiente: 24, vuelo: [1.0, 0.5], teja: '#87604c', sofito: 'blanco',
      pinon: 'ladrilloClaro' }],
    valla: {
      tramos: [{ u: [51.8, 59.75], murete: { alto: 0.45, mat: 'enfoscadoCrema' }, barandilla: { alto: 0.65, color: 'negro', tipo: 'cruces' } }],
      pilares: [52.0, 54.5, 57.2, 58.75, 59.75, 63.05].map((u) => ({ u, ancho: 0.38, alto: 1.2, mat: 'enfoscadoCrema' })),
      puertas: [{ u: [57.4, 58.55], alto: 1.1, color: 'negro', tipo: 'peaton' }],
    },
    pavimentos: [{ u: [52.2, 59.6], w: [0.24, 2.5], mat: 'baldosaGris' }, { u: [59.6, 63.0], w: [0, 2.5], mat: 'hormigon' }],
    setos: [{ u: [63.25, 64.7], w: [0.1, 1.0], alto: 0.95 }],
  },

  // --- Nº 15: enfoscado blanco con zócalo de piedra. Garaje de dos alturas con puerta
  // seccional marrón, porche con pilar blanco y escalera con muretes de piedra, setos de boj
  {
    numero: 15, u: [64.73, 77.5],
    cuerpos: [
      { u: [64.73, 69.3], w: [4.29, 13.0], alto: 5.1, mat: 'enfoscado', color: ENF,
        huecos: [
          { t: 'g', u: [65.55, 68.3], y: [0, 2.25], tipo: 'seccional', color: '#8a5933' },
          { t: 'v', u: [65.2, 66.4], y: [2.95, 4.15], marco: 'madera', persiana: 0.4, colorPersiana: 'blanca' },
          { t: 'v', u: [67.3, 68.5], y: [2.95, 4.15], marco: 'madera', persiana: 0.4, colorPersiana: 'blanca' },
        ] },
      { u: [69.3, 73.5], w: [4.29, 13.0], alto: 3.95, mat: 'enfoscado', color: ENF, zocalo: { mat: 'piedra', alto: 0.95 },
        huecos: [{ t: 'p', u: [70.25, 71.2], y: [0.9, 3.0], mat: 'madera', hojas: 1 }] },
      { u: [73.5, 77.5], w: [2.2, 13.0], alto: 3.95, mat: 'enfoscado', color: ENF, zocalo: { mat: 'piedra', alto: 0.95 },
        huecos: [{ t: 'v', u: [74.0, 76.5], y: [1.5, 2.95], marco: 'madera', persiana: 0.1, colorPersiana: 'blanca', cortina: true }] },
    ],
    franjas: [{ u: [64.73, 69.3], w: 4.29, y: [2.45, 2.6], vuelo: 0.1, mat: 'enfoscado', color: ENF }],
    porches: [{ u: [69.3, 73.5], w: [2.2, 4.29], suelo: 0.9, techo: 3.3, techoMat: 'madera', dintel: { mat: 'enfoscado', hasta: 3.95 },
      pilares: [{ u: 71.7, w: 2.42, t: 'blanco', ancho: 0.34 }] }],
    plataformas: [{ u: [69.3, 73.5], w: [2.2, 4.29], y: 0.9, mat: 'marmol', lateral: 'piedra' }],
    escaleras: [{ u: [71.95, 73.3], w: [0.2, 2.2], y: [0, 0.9], peldanos: 5, mat: 'marmol', laterales: 'piedra' }],
    tejados: [
      { u: [64.73, 69.3], w: [4.29, 13.0], alero: 5.1, pendiente: 28, vuelo: [0.5, 0.4], teja: '#835d4e', sofito: 'blanco', pinon: 'enfoscado',
        paneles: [{ u: [65.0, 69.1], w: [5.1, 7.7], tipo: 'fv' }] },
      { u: [69.3, 77.5], w: [2.2, 13.0], alero: 3.95, pendiente: 30, vuelo: [0.55, 0.4], teja: '#835d4e', sofito: 'blanco',
        paneles: [{ u: [69.8, 74.6], w: [5.0, 7.3], tipo: 'fv' }],
        chimeneas: [{ u: 73.7, w: 7.8, alto: 1.4, mat: 'enfoscado' }] },
    ],
    muretes: [{ de: [64.73, 0.12], a: [65.2, 0.12], alto: 0.9, mat: 'piedra' }],
    pavimentos: [{ u: [64.73, 69.3], w: [0, 4.29], mat: 'hormigon' }, { u: [69.3, 77.5], w: [0, 2.2], mat: 'baldosaGris' }],
    setos: [{ u: [69.35, 71.85], w: [0.15, 1.7], alto: 1.1 }, { u: [73.45, 77.45], w: [0.12, 0.95], alto: 0.9 }],
    faroles: [{ u: 71.45, y: 2.55, w: 4.29 }],
  },
];

// Árboles de bola de la acera (fotos): sustituyen a los genéricos del LiDAR en esa franja. En fila
// junto al bordillo: la acera norte acaba en el borde de los alcorques, 2 m desde las vallas
// (ACERA de San Isidro en tools/calzadas.py), y los coches aparcan en la calzada
export const ARBOLES_BOLA_SAN_ISIDRO = [
  { u: 6.61, w: -1.6, alto: 3.4, radio: 0.95 },
  { u: 16.13, w: -1.6, alto: 3.2, radio: 0.85 },
  { u: 44.49, w: -1.6, alto: 3.6, radio: 1.0 },
  { u: 57.37, w: -1.6, alto: 3.3, radio: 0.9 },
  { u: 72.4, w: -1.6, alto: 3.3, radio: 0.85 },
];

// Edificios del Catastro que sustituyen estas casas (los cobertizos del fondo se quedan)
export const EDIFICIOS_SAN_ISIDRO = [1375, 1095, 1653, 1449, 771, 1703, 756, 1799, 748, 1707, 908, 1032, 1327];

// Franja de la fila (u, w) donde sobran los muros y vallas de muros.json (las vallas y muretes
// los pone el modelo) y los árboles del LiDAR de la acera
export const ZONA_SAN_ISIDRO = { u: [0.4, 77.7], w: [-3.2, 6.0] };
