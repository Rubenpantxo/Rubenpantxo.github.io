// Plaza del Ayuntamiento (impares 1-11 al norte, pares 2-10 al sur) y Calle San Roque 50-54,
// modeladas a mano con las fotos de calle que aportó Rubén (2025; se ignoran las vallas rojas
// de los encierros, que son temporales) sobre las huellas del Catastro y las parcelas de OSM
// (addr:housenumber). Formato de cada casa: ver casasSanIsidro.js. Además:
//   huecos t: 'a' (arco abierto de medio punto, logia)
//   ventana: reja (true | 'tijera' | 'ornamental'), colorReja; marco 'negro'
//   puerta:  mat 'negra', cortina (cortina de tiras)
//   balcones: curvo (barriga), tipo ('ornamental'), antepecho (material macizo), grueso
//   tejados: canecillos { paso }, sofito 'oscuro'
//   cornisas { u, w, y, vuelo, mat, moldura }, rotulos { u, y, w, texto, color, fuente },
//   cajas (contadores) { u, y, w, mat }, postes { u, w, y, color }
//
// Cada fila: u a lo largo de la fachada (a la derecha de quien la mira desde la plaza), w hacia
// dentro desde la línea de fachadas; y sobre el suelo de delante de cada casa.

const CREMA = '#e9d6b0';

// --- Impares (lado norte, miran al sur): de la esquina con San Roque hacia el Ayuntamiento
const IMPARES = [
  // Nº 1: ladrillo caravista marrón de tres alturas, zócalo de granito, balcones de barriga
  {
    numero: 1, u: [0.3, 5.69],
    cuerpos: [{ u: [0.3, 5.69], w: [0.55, 11.7], alto: 9.3, mat: 'ladrilloMarron', zocalo: { mat: 'granito', alto: 0.85 },
      huecos: [
        { t: 'p', u: [0.75, 1.75], y: [0, 2.3], mat: 'madera', hojas: 1 },
        { t: 'v', u: [2.95, 4.45], y: [0.95, 2.25], marco: 'madera', persiana: 0.5, reja: true },
        { t: 'v', u: [0.85, 1.95], y: [3.25, 5.35], marco: 'madera', persiana: 0.6, sinTravesano: true },
        { t: 'v', u: [3.4, 4.5], y: [3.25, 5.35], marco: 'madera', persiana: 0.6, sinTravesano: true },
        { t: 'v', u: [0.95, 1.85], y: [6.2, 7.9], marco: 'madera', persiana: 0.5 },
        { t: 'v', u: [3.5, 4.4], y: [6.2, 7.9], marco: 'madera', persiana: 0.5 },
      ] }],
    balcones: [
      { u: [0.6, 2.2], w: 0.55, vuelo: 0.45, y: 3.25, alto: 0.95, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.12 },
      { u: [3.15, 4.75], w: 0.55, vuelo: 0.45, y: 3.25, alto: 0.95, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.12 },
      { u: [0.75, 2.05], w: 0.55, vuelo: 0.3, y: 6.2, alto: 0.8, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.1 },
      { u: [3.3, 4.6], w: 0.55, vuelo: 0.3, y: 6.2, alto: 0.8, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.1 },
    ],
    tejados: [{ u: [0.3, 5.69], w: [0.55, 11.7], alero: 9.3, pendiente: 22, vuelo: [0.45, 0.3], teja: '#94654c', sofito: 'madera',
      pinon: 'ladrilloMarron' }],
  },
  // Nº 3: enfoscado blanco, balcón corrido y balconcillos con forja blanca de aros
  {
    numero: 3, u: [5.69, 11.2],
    cuerpos: [{ u: [5.69, 11.2], w: [0.7, 11.9], alto: 10.0, mat: 'enfoscado', color: '#f2f1ec',
      huecos: [
        { t: 'p', u: [7.0, 8.0], y: [0, 2.4], mat: 'madera', hojas: 1 },
        { t: 'v', u: [9.6, 10.95], y: [0.45, 2.5], marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' },
        { t: 'v', u: [6.75, 7.85], y: [3.35, 5.5], marco: 'blanco', sinTravesano: true },
        { t: 'v', u: [9.2, 10.3], y: [3.35, 5.5], marco: 'blanco', sinTravesano: true },
        { t: 'v', u: [7.0, 7.9], y: [6.55, 7.95], marco: 'blanco', persiana: 0.45, colorPersiana: 'blanca' },
        { t: 'v', u: [9.45, 10.35], y: [6.55, 7.95], marco: 'blanco', persiana: 0.45, colorPersiana: 'blanca' },
      ] }],
    balcones: [
      { u: [5.9, 11.0], w: 0.7, vuelo: 0.6, y: 3.35, alto: 1.0, color: 'blanco', tipo: 'ornamental', canto: 'marmol' },
      { u: [6.75, 8.15], w: 0.7, vuelo: 0.35, y: 6.5, alto: 0.75, color: 'blanco', tipo: 'ornamental', canto: 'marmol', grueso: 0.12 },
      { u: [9.2, 10.6], w: 0.7, vuelo: 0.35, y: 6.5, alto: 0.75, color: 'blanco', tipo: 'ornamental', canto: 'marmol', grueso: 0.12 },
    ],
    cajas: [{ u: [8.55, 9.1], y: [1.05, 1.6], w: 0.7 }],
    tejados: [{ u: [5.69, 11.2], w: [0.7, 11.9], alero: 10.0, pendiente: 20, vuelo: [0.35, 0.3], teja: '#8f6a55', sofito: 'blanco' }],
  },
  // Nº 5: de los setenta: balcones corridos con antepecho de uralita y persianas de madera
  // grandes; abajo portón de madera y dos cierres metálicos
  {
    numero: 5, u: [11.2, 21.73],
    cuerpos: [{ u: [11.2, 21.73], w: [0.7, 13.0], alto: 11.6, mat: 'enfoscado', color: '#d8cfbd', zocalo: { mat: 'granito', alto: 0.5 },
      huecos: [
        { t: 'g', u: [11.8, 13.6], y: [0, 2.7], tipo: 'tablas', color: '#7a4b2a' },
        { t: 'g', u: [15.3, 17.4], y: [0, 2.7], tipo: 'chapa', color: '#8f9294' },
        { t: 'g', u: [18.6, 20.8], y: [0, 2.7], tipo: 'chapa', color: '#a3a5a4' },
        ...[3.15, 6.05, 8.95].flatMap((y) => [
          { t: 'v', u: [11.6, 15.0], y: [y + 0.1, y + 2.35], marco: 'aluminio', persiana: 0.75, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [15.5, 18.5], y: [y + 0.1, y + 2.35], marco: 'aluminio', persiana: 0.6, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [19.0, 21.3], y: [y + 0.1, y + 2.35], marco: 'aluminio', persiana: 0.85, colorPersiana: 'madera', sinTravesano: true },
        ]),
      ] }],
    balcones: [3.05, 5.95, 8.85].map((y) => ({ u: [11.2, 21.73], w: 0.7, vuelo: 1.0, y, alto: 1.0, antepecho: 'uralita', canto: 'enfoscadoCrema' })),
    tejados: [{ u: [11.2, 21.73], w: [0.7, 13.0], alero: 11.6, pendiente: 15, vuelo: [0.9, 0.3], teja: '#8a6a58', sofito: 'blanco' }],
  },
  // Nº 7: bar con la planta baja de mármol negro; arriba revoco de sillería crema con balcones
  // de forja negra sobre losas negras, persianas de madera y azotea con barandilla
  {
    numero: 7, u: [21.73, 30.37],
    cuerpos: [
      { u: [21.73, 30.37], w: [0.7, 9.4], alto: 3.15, mat: 'marmolNegro',
        huecos: [
          { t: 'v', u: [22.3, 24.0], y: [0.55, 2.45], marco: 'negro', sinTravesano: true },
          { t: 'p', u: [25.4, 27.4], y: [0, 2.75], mat: 'negra', vidrio: true },
          { t: 'p', u: [28.55, 29.55], y: [0, 2.45], mat: 'negra', hojas: 1 },
        ] },
      { u: [21.73, 30.37], w: [0.7, 9.4], desde: 3.15, alto: 10.6, mat: 'sillar',
        huecos: [
          { t: 'v', u: [22.9, 24.6], y: [3.55, 5.95], marco: 'blanco', persiana: 0.9, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [26.9, 28.6], y: [3.55, 5.95], marco: 'blanco', persiana: 0.9, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [22.9, 24.6], y: [6.65, 8.95], marco: 'blanco', persiana: 0.85, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [26.9, 28.6], y: [6.65, 8.95], marco: 'blanco', persiana: 0.85, colorPersiana: 'madera', sinTravesano: true },
        ] },
    ],
    balcones: [
      { u: [21.73, 30.37], w: 0.7, vuelo: 0.85, y: 3.45, alto: 1.0, color: 'negro', canto: 'negra', grueso: 0.3 },
      { u: [22.5, 29.0], w: 0.7, vuelo: 0.75, y: 6.5, alto: 0.95, color: 'negro', canto: 'negra', grueso: 0.25 },
    ],
    cornisas: [{ u: [21.73, 30.37], w: 0.7, y: [9.75, 10.05], vuelo: 0.25, mat: 'blanco', moldura: true }],
    muretes: [{ de: [21.8, 1.0], a: [30.3, 1.0], y0: 10.6, alto: 0, barandilla: { alto: 0.9, color: 'negro' } }],
    cajas: [{ u: [24.6, 25.1], y: [1.2, 1.7], w: 0.7, mat: 'plastico' }],
  },
  // Nº 9: revoco crema con canecillos de madera bajo el alero; planta baja de placa clara con
  // rejas negras, balcón corrido blanco y balconcillos arriba
  {
    numero: 9, u: [30.37, 40.83],
    cuerpos: [
      { u: [30.37, 40.83], w: [0.68, 12.4], alto: 3.05, mat: 'sillarClaro',
        huecos: [
          { t: 'v', u: [31.3, 32.4], y: [0.55, 2.35], marco: 'madera', reja: true },
          { t: 'v', u: [33.4, 34.5], y: [0.55, 2.35], marco: 'madera', reja: true },
          { t: 'p', u: [35.6, 36.65], y: [0, 2.6], mat: 'madera', hojas: 1 },
        ] },
      { u: [30.37, 40.83], w: [0.68, 12.4], desde: 3.05, alto: 9.6, mat: 'enfoscado', color: CREMA,
        huecos: [
          { t: 'v', u: [32.0, 33.0], y: [3.3, 5.45], marco: 'madera', sinTravesano: true },
          { t: 'v', u: [34.6, 35.6], y: [3.3, 5.45], marco: 'madera', sinTravesano: true },
          { t: 'v', u: [37.2, 38.2], y: [3.3, 5.45], marco: 'madera', sinTravesano: true },
          ...[31.25, 33.65, 36.05, 38.45].map((u) => ({ t: 'v', u: [u, u + 0.9], y: [6.4, 8.25], marco: 'madera', sinTravesano: true })),
        ] },
    ],
    balcones: [
      { u: [31.0, 39.8], w: 0.68, vuelo: 0.7, y: 3.25, alto: 1.0, color: 'blanco', canto: 'marmol' },
      ...[31.25, 33.65, 36.05, 38.45].map((u) => ({ u: [u - 0.15, u + 1.05], w: 0.68, vuelo: 0.3, y: 6.4, alto: 0.8, color: 'blanco', canto: 'marmol', grueso: 0.12 })),
    ],
    tejados: [{ u: [30.37, 40.83], w: [0.68, 12.4], alero: 9.6, pendiente: 20, vuelo: [0.75, 0.3], teja: '#a0674a', sofito: 'madera',
      canecillos: { paso: 0.5 } }],
  },
  // Nº 11: blanco, junto al Ayuntamiento: puerta con cortina, reja blanca, balcones blancos y
  // azotea con cornisa
  {
    numero: 11, u: [40.83, 49.16],
    cuerpos: [{ u: [40.83, 49.16], w: [0.65, 11.4], alto: 9.7, mat: 'enfoscado', color: '#f3f2ee',
      huecos: [
        { t: 'p', u: [41.7, 42.7], y: [0, 2.45], mat: 'blanca', cortina: true },
        { t: 'v', u: [46.2, 47.7], y: [0.6, 2.2], marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' },
        { t: 'v', u: [42.9, 44.0], y: [3.3, 5.45], marco: 'blanco', persiana: 0.4, colorPersiana: 'blanca', sinTravesano: true },
        { t: 'v', u: [46.3, 47.5], y: [3.8, 5.3], marco: 'blanco', persiana: 0.3, colorPersiana: 'blanca' },
        { t: 'v', u: [41.8, 43.0], y: [6.25, 8.35], marco: 'blanco', persiana: 0.5, colorPersiana: 'blanca', sinTravesano: true },
        { t: 'v', u: [45.3, 47.9], y: [6.45, 8.45], marco: 'aluminio', persiana: 0.9, colorPersiana: 'gris' },
      ] }],
    balcones: [
      { u: [42.6, 44.3], w: 0.65, vuelo: 0.45, y: 3.3, alto: 0.95, color: 'blanco', tipo: 'ornamental', canto: 'marmol', grueso: 0.14 },
      { u: [40.9, 44.5], w: 0.65, vuelo: 0.55, y: 6.25, alto: 0.95, color: 'blanco', canto: 'enfoscado' },
    ],
    cornisas: [{ u: [40.83, 49.16], w: 0.65, y: [9.35, 9.7], vuelo: 0.2, mat: 'blanco', moldura: true }],
  },
];

// --- Pares (lado sur, miran al norte): de la esquina del Ayuntamiento hacia San Roque
const PARES = [
  // Nº 10: tres alturas de revoco gris piedra, balcón corrido de forja, balcones de losa y un
  // mirador; azotea con cornisa
  {
    numero: 10, u: [0.52, 16.03],
    cuerpos: [
      { u: [0.52, 16.03], w: [0.3, 10.5], alto: 10.8, mat: 'enfoscado', color: '#cfc4ab', zocalo: { mat: 'enfoscadoGris', alto: 0.6 },
        huecos: [
          { t: 'p', u: [1.3, 2.35], y: [0, 2.45], mat: 'madera', hojas: 2 },
          { t: 'v', u: [3.4, 4.3], y: [0.8, 2.4], marco: 'madera', reja: true },
          { t: 'p', u: [5.4, 6.5], y: [0, 2.5], mat: 'madera', hojas: 1 },
          { t: 'v', u: [7.4, 8.3], y: [0.8, 2.4], marco: 'madera', reja: true },
          { t: 'p', u: [9.4, 10.5], y: [0, 2.5], mat: 'madera', hojas: 1 },
          { t: 'g', u: [12.2, 14.7], y: [0, 2.75], tipo: 'chapa', color: '#e6e5e0' },
          ...[1.9, 5.4, 9.0, 12.6].map((u) => ({ t: 'v', u: [u, u + 1.1], y: [3.35, 5.65], marco: 'madera', persiana: 0.7, colorPersiana: 'madera', sinTravesano: true })),
          { t: 'v', u: [1.9, 3.0], y: [6.45, 8.35], marco: 'madera', persiana: 0.6, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [10.4, 11.4], y: [6.45, 8.35], marco: 'madera', persiana: 0.55, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [12.7, 13.7], y: [6.45, 8.35], marco: 'madera', persiana: 0.65, colorPersiana: 'madera', sinTravesano: true },
        ] },
      { u: [5.6, 9.4], w: [-0.3, 1.5], desde: 6.1, alto: 8.75, mat: 'enfoscado', color: '#c8bca2',
        huecos: [
          { t: 'v', u: [5.95, 7.35], y: [6.5, 8.3], marco: 'madera', persiana: 0.35, colorPersiana: 'crema' },
          { t: 'v', u: [7.65, 9.05], y: [6.5, 8.3], marco: 'madera', persiana: 0.35, colorPersiana: 'crema' },
        ] },
    ],
    balcones: [
      { u: [0.8, 15.7], w: 0.3, vuelo: 0.6, y: 3.3, alto: 1.0, color: 'negro', canto: 'hormigon' },
      { u: [1.55, 3.35], w: 0.3, vuelo: 0.5, y: 6.4, alto: 0.9, color: 'negro', canto: 'hormigon', grueso: 0.22 },
      { u: [10.05, 11.75], w: 0.3, vuelo: 0.5, y: 6.4, alto: 0.9, color: 'negro', canto: 'hormigon', grueso: 0.22 },
      { u: [12.35, 14.05], w: 0.3, vuelo: 0.5, y: 6.4, alto: 0.9, color: 'negro', canto: 'hormigon', grueso: 0.22 },
    ],
    cornisas: [{ u: [0.52, 16.03], w: 0.3, y: [10.4, 10.8], vuelo: 0.3, mat: 'hormigon', moldura: true },
      { u: [5.6, 9.4], w: -0.3, y: [8.75, 8.9], vuelo: 0.1, mat: 'hormigon' }],
  },
  // Nº 8: tres alturas rosa salmón con la planta baja naranja, cuerpo volado, balcón de forja,
  // canecillos de madera bajo el alero y portón metálico
  {
    numero: 8, u: [16.03, 29.97],
    cuerpos: [
      { u: [16.03, 29.97], w: [0.62, 10.9], alto: 3.05, mat: 'enfoscado', color: '#d98c60',
        huecos: [
          { t: 'g', u: [17.0, 19.6], y: [0, 2.65], tipo: 'chapa', color: '#3e4652' },
          { t: 'p', u: [21.0, 22.0], y: [0, 2.5], mat: 'negra', hojas: 1 },
          { t: 'v', u: [23.5, 24.6], y: [0.8, 2.4], marco: 'madera', reja: true },
          { t: 'v', u: [25.6, 26.7], y: [0.8, 2.4], marco: 'madera', reja: true },
          { t: 'p', u: [27.8, 28.8], y: [0, 2.45], mat: 'madera', hojas: 1 },
        ] },
      { u: [16.03, 29.97], w: [0.62, 10.9], desde: 3.05, alto: 10.0, mat: 'enfoscado', color: '#efc5aa',
        huecos: [
          { t: 'v', u: [17.2, 18.4], y: [3.6, 5.0], marco: 'blanco', persiana: 0.3, colorPersiana: 'madera' },
          { t: 'v', u: [25.7, 27.0], y: [3.6, 5.0], marco: 'blanco', persiana: 0.3, colorPersiana: 'madera' },
          { t: 'v', u: [17.2, 18.2], y: [6.6, 8.3], marco: 'madera', persiana: 0.5, colorPersiana: 'madera' },
          { t: 'v', u: [19.8, 21.0], y: [6.3, 8.5], marco: 'madera', persiana: 0.6, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [22.4, 23.6], y: [6.3, 8.5], marco: 'madera', persiana: 0.6, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [26.3, 27.3], y: [6.6, 8.3], marco: 'madera', persiana: 0.4, colorPersiana: 'madera' },
        ] },
      { u: [19.0, 24.3], w: [0.22, 1.5], desde: 3.15, alto: 5.95, mat: 'enfoscado', color: '#efc5aa',
        huecos: [
          { t: 'v', u: [19.6, 20.9], y: [3.6, 5.0], marco: 'blanco', persiana: 0.3, colorPersiana: 'madera' },
          { t: 'v', u: [22.4, 23.7], y: [3.6, 5.0], marco: 'blanco', persiana: 0.3, colorPersiana: 'madera' },
        ] },
    ],
    franjas: [{ u: [16.03, 29.97], w: 0.62, y: [2.95, 3.1], vuelo: 0.06, mat: 'enfoscado', color: '#efc5aa' }],
    balcones: [{ u: [19.4, 23.9], w: 0.62, vuelo: 0.5, y: 6.3, alto: 0.95, color: 'negro', canto: 'enfoscado', grueso: 0.15 }],
    cajas: [{ u: [22.5, 23.1], y: [2.1, 2.5], w: 0.62, mat: 'plastico', color: '#e5c84c' }],
    tejados: [{ u: [16.03, 29.97], w: [0.62, 10.9], alero: 10.0, pendiente: 20, vuelo: [0.8, 0.3], teja: '#a06a50', sofito: 'madera',
      canecillos: { paso: 0.45 } }],
  },
  // Nº 6: bar Katepa. Planta baja de sillería de piedra con tres huecos de persiana de tijera y
  // los rótulos; arriba ladrillo crema, balcón corrido de forja roja con jardineras y postes
  // hasta el gran alero
  {
    numero: 6, u: [29.97, 40.94],
    cuerpos: [
      { u: [29.97, 40.94], w: [0.5, 16.0], alto: 3.35, mat: 'sillarPiedra',
        huecos: [
          { t: 'v', u: [31.0, 32.9], y: [0.15, 2.7], marco: 'negro', reja: 'tijera', sinTravesano: true },
          { t: 'v', u: [34.6, 37.2], y: [0.15, 2.7], marco: 'negro', reja: 'tijera', sinTravesano: true },
          { t: 'v', u: [38.6, 40.5], y: [0.15, 2.7], marco: 'negro', reja: 'tijera', sinTravesano: true },
        ] },
      { u: [29.97, 40.94], w: [0.5, 16.0], desde: 3.35, alto: 7.3, mat: 'ladrilloCrema',
        huecos: [
          { t: 'v', u: [32.4, 33.7], y: [4.0, 5.75], marco: 'blanco', persiana: 0.35, colorPersiana: 'blanca' },
          { t: 'v', u: [35.3, 36.6], y: [4.0, 5.75], marco: 'blanco', persiana: 0.35, colorPersiana: 'blanca' },
          { t: 'v', u: [38.3, 39.9], y: [4.0, 5.85], marco: 'blanco', persiana: 0.3, colorPersiana: 'blanca' },
        ] },
    ],
    rotulos: [
      { u: [31.0, 33.2], y: [2.85, 3.2], w: 0.5, texto: 'Cafetería', color: '#a3241e', fuente: "italic 600 120px 'Brush Script MT', 'Segoe Script', cursive" },
      { u: [33.6, 38.2], y: [2.72, 3.3], w: 0.5, texto: 'KATEPA', color: '#a3241e', fuente: "700 170px 'Georgia', serif" },
      { u: [38.4, 40.8], y: [2.85, 3.2], w: 0.5, texto: 'Discoteca', color: '#5a4636', fuente: "italic 600 120px 'Brush Script MT', 'Segoe Script', cursive" },
    ],
    balcones: [{ u: [30.4, 40.7], w: 0.5, vuelo: 1.05, y: 3.6, alto: 0.95, color: 'rojo', canto: 'hormigon', grueso: 0.3 }],
    jardineras: [31.3, 32.6, 33.9, 35.2, 36.5, 37.8, 39.1, 40.2].map((u) => ({ u, w: -0.48, y: 4.55, ancho: 0.6, alto: 0.22,
      mat: 'hierroGranate', flores: '#d23a3a' })),
    postes: [{ u: 30.6, w: -0.45, y: [4.55, 7.0], color: 'rojo' }, { u: 35.6, w: -0.45, y: [4.55, 7.0], color: 'rojo' },
      { u: 40.5, w: -0.45, y: [4.55, 7.0], color: 'rojo' }],
    tejados: [{ u: [29.97, 40.94], w: [0.5, 16.0], alero: 7.3, pendiente: 16, vuelo: [1.35, 0.3], teja: '#9b6b52', sofito: 'oscuro' }],
  },
  // Nº 4: casa vieja de revoco beige con el granero de tres arcos arriba
  {
    numero: 4, u: [40.94, 48.34],
    cuerpos: [{ u: [40.94, 48.34], w: [0.44, 11.4], alto: 9.7, mat: 'enfoscado', color: '#d8c9ab', zocalo: { mat: 'enfoscadoGris', alto: 0.7 },
      huecos: [
        { t: 'p', u: [42.6, 43.5], y: [0, 2.3], mat: 'madera', hojas: 1 },
        { t: 'v', u: [45.0, 45.8], y: [0.9, 2.0], marco: 'madera', reja: true },
        { t: 'v', u: [42.65, 43.65], y: [3.45, 5.25], marco: 'madera', persiana: 0.5, colorPersiana: 'crema', sinTravesano: true },
        { t: 'v', u: [45.4, 46.3], y: [3.85, 5.1], marco: 'madera', persiana: 0.5, colorPersiana: 'crema' },
        { t: 'a', u: [41.95, 43.35], y: [6.55, 8.75] },
        { t: 'a', u: [43.95, 45.35], y: [6.55, 8.75] },
        { t: 'a', u: [45.95, 47.35], y: [6.55, 8.75] },
      ] }],
    balcones: [{ u: [42.35, 43.95], w: 0.44, vuelo: 0.35, y: 3.45, alto: 0.9, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.12 }],
    cornisas: [{ u: [40.94, 48.34], w: 0.44, y: [6.2, 6.35], vuelo: 0.08, mat: 'enfoscadoGris' }],
    cajas: [{ u: [46.6, 47.1], y: [0.4, 0.9], w: 0.44 }],
    tejados: [{ u: [40.94, 48.34], w: [0.44, 11.4], alero: 9.7, pendiente: 22, vuelo: [0.5, 0.3], teja: '#a2694d', sofito: 'madera' }],
  },
  // Nº 2: esquina con San Roque. Planta baja salmón con zócalo de pizarra y portal de ladrillo
  // metido; planta alta de ladrillo marrón volada, con balcón de forja granate y un mirador de
  // tres ventanas; gran alero oscuro
  {
    numero: 2, u: [48.33, 61.19],
    cuerpos: [
      { u: [48.33, 51.39], w: [1.76, 12.8], alto: 3.0, mat: 'ladrilloMarron',
        huecos: [{ t: 'p', u: [49.2, 50.5], y: [0, 2.45], mat: 'madera', hojas: 1 }] },
      { u: [51.39, 61.19], w: [0.36, 12.8], alto: 3.0, mat: 'enfoscado', color: '#e0a47f', zocalo: { mat: 'pizarra', alto: 0.8 },
        huecos: [
          { t: 'v', u: [53.0, 54.6], y: [0.95, 2.35], marco: 'madera', persiana: 0.25, colorPersiana: 'madera', cortina: true, reja: true },
          { t: 'v', u: [57.3, 58.9], y: [0.95, 2.35], marco: 'madera', persiana: 0.45, colorPersiana: 'madera', cortina: true, reja: true },
        ] },
      { u: [48.33, 48.68], w: [0.36, 1.76], alto: 3.0, mat: 'ladrilloMarron' },
      { u: [48.33, 61.19], w: [-0.25, 12.8], desde: 3.0, alto: 6.1, mat: 'ladrilloMarron',
        huecos: [
          { t: 'v', u: [49.0, 50.2], y: [3.6, 5.0], marco: 'madera', persiana: 0.2, colorPersiana: 'madera' },
          { t: 'v', u: [52.3, 53.4], y: [3.3, 5.4], marco: 'madera', persiana: 0.4, colorPersiana: 'madera', sinTravesano: true },
        ] },
      { u: [55.0, 60.2], w: [-0.7, 0.5], desde: 3.15, alto: 5.75, mat: 'ladrilloMarron',
        huecos: [
          { t: 'v', u: [55.35, 56.85], y: [3.7, 5.3], marco: 'madera', persiana: 0.95, colorPersiana: 'blanca' },
          { t: 'v', u: [56.95, 58.45], y: [3.7, 5.3], marco: 'madera', persiana: 0.95, colorPersiana: 'blanca' },
          { t: 'v', u: [58.55, 60.05], y: [3.7, 5.3], marco: 'madera', persiana: 0.95, colorPersiana: 'blanca' },
        ] },
    ],
    franjas: [{ u: [48.33, 61.19], w: -0.25, y: [2.85, 3.05], vuelo: 0.05, mat: 'hormigon' }],
    cornisas: [{ u: [55.0, 60.2], w: -0.7, y: [5.75, 5.9], vuelo: 0.06, mat: 'hormigon' }],
    balcones: [{ u: [51.8, 54.0], w: -0.25, vuelo: 0.5, y: 3.3, alto: 0.95, color: 'granate', canto: 'hormigon', grueso: 0.15 }],
    cajas: [{ u: [51.9, 52.5], y: [0.95, 1.55], w: 0.36 }],
    tejados: [{ u: [48.33, 61.19], w: [-0.25, 12.8], alero: 6.1, pendiente: 18, vuelo: [0.9, 0.3], vueloLado: [0, 0.6], teja: '#8f6c5a',
      sofito: 'oscuro', pinon: 'ladrilloMarron', chimeneas: [{ u: 58.2, w: 3.2, alto: 1.3, mat: 'ladrilloMarron' }] }],
  },
];

// --- Calle San Roque, acera sur (miran al norte): de la esquina con la plaza hacia el oeste
const SAN_ROQUE = [
  // Nº 54: casa vieja encalada de dos alturas en la esquina, ventanas pequeñas con reja
  {
    numero: 54, u: [0.53, 13.34],
    cuerpos: [{ u: [0.53, 13.34], w: [0.25, 11.8], alto: 5.8, mat: 'cal', zocalo: { mat: 'enfoscadoGris', alto: 0.55 },
      huecos: [
        { t: 'v', u: [2.0, 2.9], y: [0.9, 2.1], marco: 'madera', reja: true },
        { t: 'p', u: [4.4, 5.4], y: [0, 2.2], mat: 'madera', hojas: 1 },
        { t: 'v', u: [7.4, 8.3], y: [0.9, 2.1], marco: 'madera', reja: true },
        { t: 'v', u: [10.2, 11.1], y: [0.9, 2.1], marco: 'madera', reja: true },
        { t: 'v', u: [2.2, 3.0], y: [3.35, 4.55], marco: 'madera', persiana: 0.4, colorPersiana: 'madera' },
        { t: 'v', u: [7.6, 8.4], y: [3.35, 4.55], marco: 'madera', persiana: 0.4, colorPersiana: 'madera' },
        { t: 'v', u: [10.4, 11.2], y: [3.35, 4.55], marco: 'madera', contra: 'madera' },
      ] }],
    tejados: [{ u: [0.53, 13.34], w: [0.25, 11.8], alero: 5.8, pendiente: 22, vuelo: [0.35, 0.3], vueloLado: [0.3, 0], teja: '#8e6d5d',
      sofito: 'blanco', pinon: 'cal' }],
  },
  // Nº 52: planta baja de ladrillo con portón de madera; arriba revoco melocotón con balcón de
  // barriga de forja negra con macetas y gran alero oscuro
  {
    numero: 52, u: [13.34, 19.18],
    cuerpos: [
      { u: [13.34, 19.18], w: [0.08, 10.9], alto: 2.95, mat: 'ladrilloTostado',
        huecos: [
          { t: 'g', u: [13.75, 15.65], y: [0, 2.45], tipo: 'tablas', color: '#7a4a2c' },
          { t: 'v', u: [16.7, 18.2], y: [0.8, 2.3], marco: 'madera', persiana: 0.45, colorPersiana: 'blanca', cortina: true },
        ] },
      { u: [13.34, 19.18], w: [0.08, 10.9], desde: 2.95, alto: 6.1, mat: 'enfoscado', color: '#e8b693',
        huecos: [
          { t: 'v', u: [14.2, 15.2], y: [3.25, 5.2], marco: 'madera', persiana: 0.4, colorPersiana: 'madera', sinTravesano: true },
          { t: 'v', u: [16.6, 17.6], y: [3.25, 5.2], marco: 'madera', persiana: 0.5, colorPersiana: 'blanca', sinTravesano: true },
        ] },
    ],
    balcones: [{ u: [13.5, 19.0], w: 0.08, vuelo: 0.7, y: 3.15, alto: 0.9, color: 'negro', curvo: true, canto: 'enfoscado', grueso: 0.2 }],
    jardineras: [13.9, 14.8, 15.7, 16.6, 17.5].map((u) => ({ u, w: -0.66, y: 4.05, ancho: 0.55, alto: 0.18, mat: 'ladrilloTostado', flores: '#d8345a' })),
    faroles: [{ u: 18.5, y: 4.3, w: 0.08 }],
    tejados: [{ u: [13.34, 19.18], w: [0.08, 10.9], alero: 6.1, pendiente: 18, vuelo: [1.0, 0.3], teja: '#8c6b5c', sofito: 'oscuro' }],
  },
  // Nº 50: ladrillo caravista rayado beige con zócalo de losas rosas, puerta con cortina de
  // tiras, ventanas y balcón blancos, imposta blanca y alero oscuro con farol
  {
    numero: 50, u: [19.18, 25.4],
    cuerpos: [{ u: [19.18, 25.4], w: [0.12, 9.9], alto: 6.35, mat: 'ladrilloRayado', zocalo: { mat: 'piedraRosa', alto: 1.0 },
      huecos: [
        { t: 'p', u: [20.9, 22.2], y: [0, 2.45], cortina: true },
        { t: 'v', u: [23.3, 25.0], y: [0.95, 2.4], marco: 'blanco', persiana: 0.35, colorPersiana: 'blanca' },
        { t: 'v', u: [20.4, 21.6], y: [3.25, 5.3], marco: 'blanco', persiana: 0.9, colorPersiana: 'blanca', sinTravesano: true },
        { t: 'v', u: [22.8, 25.0], y: [3.85, 5.6], marco: 'blanco', persiana: 1.0, colorPersiana: 'blanca' },
      ] }],
    franjas: [{ u: [19.18, 25.4], w: 0.12, y: [2.9, 3.15], vuelo: 0.3, mat: 'blanco' }],
    balcones: [
      { u: [19.8, 22.3], w: 0.12, vuelo: 0.45, y: 3.15, alto: 0.95, color: 'blanco', canto: 'blanco', grueso: 0.05 },
      { u: [23.2, 25.1], w: 0.12, vuelo: 0.18, y: 0.95, alto: 0.4, color: 'blanco', canto: 'marmol', grueso: 0.05 },
    ],
    rotulos: [{ u: [21.25, 21.85], y: [2.55, 2.85], w: 0.12, texto: '50', color: '#8f7350', fuente: "700 150px 'Georgia', serif" }],
    faroles: [{ u: 21.2, y: 5.7, w: -0.3 }],
    tejados: [{ u: [19.18, 25.4], w: [0.12, 9.9], alero: 6.35, pendiente: 18, vuelo: [1.0, 0.3], teja: '#a06a52', sofito: 'oscuro' }],
  },
];

const ZONA = (u1) => ({ u: [-0.5, u1 + 0.5], w: [-1.5, 6.0] });

export const FILAS_PLAZA = [
  { nombre: 'plaza_impares', origen: [158.5, 322.6], eje: [0.961832, 0.273642], casas: IMPARES,
    edificios: [251, 219, 77, 327, 344, 104, 115], zona: ZONA(49.2) },
  { nombre: 'plaza_pares', origen: [204.5, 353.4], eje: [-0.921759, -0.387763], casas: PARES,
    edificios: [33, 26, 46, 170, 43], zona: ZONA(61.2) },
  { nombre: 'san_roque', origen: [144.8, 328.2], eje: [-0.96531, -0.261108], casas: SAN_ROQUE,
    edificios: [50, 246, 261], zona: ZONA(25.4) },
];
