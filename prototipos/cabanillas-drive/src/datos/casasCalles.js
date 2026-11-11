// Calle Juan XXIII (pares 10-26 al sur, impares 37-73 al norte) y Calle las Eras (impares 7-13
// al oeste, pares 6 y 8 al este), modeladas a mano con las fotos de calle de Rubén (2025). Cada
// casa lleva su marco, sacado de su huella del Catastro (la que sustituye): origen en la esquina
// de la fachada a la izquierda de quien la mira desde la calle, u hacia su derecha, w hacia
// dentro. Formato: ver casasSanIsidro.js y casasPlaza.js. Lo construye src/escena/casas.js.

const BLANCO = '#f1efe9';
const T_PARDA = '#8f6a55';
const T_ROJA = '#9a6a52';
const T_VIVA = '#a8583c';

// Una fila de una sola casa (o de varias que comparten huella del Catastro)
function fila(nombre, origen, eje, ancho, edificios, casas) {
  return { nombre, origen, eje, casas, edificios, zona: { u: [-0.3, ancho + 0.3], w: [-1.0, 6.0] } };
}
const tejado = (u, w, alero, extra = {}) => ({ u, w, alero, pendiente: 22, vuelo: [0.4, 0.3], teja: T_PARDA, sofito: 'blanco', ...extra });
const ventana = (u, y, extra = {}) => ({ t: 'v', u, y, marco: 'madera', ...extra });
const puerta = (u, y, extra = {}) => ({ t: 'p', u, y, mat: 'madera', hojas: 1, ...extra });
const barriga = (u, w, y, extra = {}) => ({ u, w, vuelo: 0.4, y, alto: 0.9, color: 'negro', curvo: true, canto: 'marmol', grueso: 0.14, ...extra });

export const FILAS_CALLES = [
  // ===== Calle Juan XXIII, pares (miran al norte)
  // Nº 10: moderna, enfoscado blanco con zócalo de pizarra, rejas blancas de adorno y split
  fila('juan_xxiii_10', [194.23, 279.61], [-0.94918, -0.31473], 15.38, [123, 309], [{
    numero: 10, u: [0, 15.38],
    cuerpos: [{ u: [0, 15.38], w: [0, 11.5], alto: 6.3, mat: 'enfoscado', color: BLANCO, zocalo: { mat: 'pizarra', alto: 0.6 },
      huecos: [
        ventana([1.0, 2.4], [0.7, 2.3], { marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' }),
        puerta([3.4, 4.4], [0, 2.4]),
        ventana([6.2, 7.4], [0.8, 2.2], { marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' }),
        puerta([9.5, 10.5], [0, 2.4]),
        ventana([12.0, 13.4], [0.8, 2.2], { marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' }),
        ...[[1.0, 2.2], [3.2, 4.4], [6.6, 7.8], [10.0, 11.2], [12.5, 13.7]].map((u) => ventana(u, [3.6, 5.3], { marco: 'blanco' })),
      ] }],
    cajas: [{ u: [0.2, 0.9], y: [0.35, 0.95], w: 0 }, { u: [8.2, 8.7], y: [1.1, 1.6], w: 0 }],
    splits: [{ u: 5.0, y: 3.4, w: 0 }],
    tejados: [tejado([0, 15.38], [0, 11.5], 6.3, { teja: T_ROJA })],
  }]),
  // Nº 16: moderna, blanca con recercados grises, portón seccional gris oscuro, balcón de forja
  // metido en el recercado y canecillos bajo el alero
  fila('juan_xxiii_16', [253.66, 299.12], [-0.96993, -0.24337], 7.15, [229], [{
    numero: 16, u: [0, 7.15],
    cuerpos: [{ u: [0, 7.15], w: [0, 10.4], alto: 6.4, mat: 'enfoscado', color: '#f0eee8', zocalo: { mat: 'enfoscadoGris', alto: 0.5 },
      huecos: [
        puerta([0.65, 1.65], [0, 2.4], { mat: 'negra', recercado: { ancho: 0.22 } }),
        { t: 'g', u: [2.9, 6.6], y: [0, 2.35], tipo: 'seccional', color: '#4d4f52', recercado: { ancho: 0.2 } },
        ventana([0.85, 1.4], [3.4, 5.1], { marco: 'negro', recercado: { ancho: 0.2 } }),
        ventana([4.2, 5.7], [3.25, 5.4], { marco: 'negro', sinTravesano: true, recercado: { ancho: 0.28 } }),
      ] }],
    balcones: [{ u: [4.15, 5.75], w: 0, vuelo: 0.12, y: 3.25, alto: 1.0, color: 'negro', tipo: 'ornamental', canto: 'enfoscadoGris', grueso: 0.06 },
      { u: [0.8, 1.45], w: 0, vuelo: 0.08, y: 3.4, alto: 0.9, color: 'negro', canto: 'enfoscadoGris', grueso: 0.05 }],
    tejados: [tejado([0, 7.15], [0, 10.4], 6.4, { vuelo: [0.6, 0.3], sofito: 'madera', canecillos: { paso: 0.45 } })],
  }]),
  // Nº 18: blanca con zócalo de piedra, rejas negras abajo y dos balcones de barriga arriba
  fila('juan_xxiii_18', [260.71, 300.89], [-0.96993, -0.24337], 8.12, [207], [{
    numero: 18, u: [0, 8.12],
    cuerpos: [{ u: [0, 8.12], w: [0, 10.7], alto: 6.2, mat: 'enfoscado', color: '#f2efe6', zocalo: { mat: 'piedra', alto: 0.9 },
      huecos: [
        puerta([1.1, 2.1], [0, 2.35]),
        ventana([3.3, 3.95], [0.6, 2.3], { reja: true }),
        ventana([4.7, 5.35], [0.6, 2.3], { reja: true }),
        ventana([1.6, 2.6], [3.25, 5.25], { sinTravesano: true, persiana: 0.3, colorPersiana: 'madera' }),
        ventana([4.6, 5.6], [3.25, 5.25], { sinTravesano: true, persiana: 0.3, colorPersiana: 'madera' }),
      ] }],
    balcones: [barriga([1.35, 2.85], 0, 3.25), barriga([4.35, 5.85], 0, 3.25)],
    tejados: [tejado([0, 8.12], [0, 10.7], 6.2, { teja: T_ROJA })],
    arboles: [{ u: 7.0, w: -0.7, alto: 2.7, radio: 0.5 }],
  }]),
  // Nº 20: ladrillo tostado con dos portones metálicos, terraza con barandilla y farol
  fila('juan_xxiii_20', [279.28, 308.74], [-0.94567, -0.32513], 16.48, [108, 301], [{
    numero: 20, u: [0, 16.48],
    cuerpos: [
      { u: [0, 11.11], w: [0, 9.8], alto: 3.2, mat: 'ladrilloTostado',
        huecos: [
          { t: 'g', u: [0.7, 4.7], y: [0, 2.8], tipo: 'chapa', color: '#6f857a' },
          { t: 'g', u: [6.0, 8.6], y: [0, 2.65], tipo: 'chapa', color: '#858a89' },
          puerta([9.4, 10.4], [0, 2.4]),
        ] },
      { u: [0, 11.11], w: [0.8, 9.8], desde: 3.2, alto: 6.3, mat: 'ladrilloTostado',
        huecos: [ventana([1.5, 2.7], [3.8, 5.3], { persiana: 0.5, colorPersiana: 'madera' }), ventana([5.0, 6.2], [3.8, 5.3], { persiana: 0.5, colorPersiana: 'madera' }),
          ventana([8.4, 9.6], [3.8, 5.3], { persiana: 0.5, colorPersiana: 'madera' })] },
      { u: [11.11, 16.48], w: [0.4, 10.1], alto: 3.6, mat: 'enfoscado', color: '#dccbab', zocalo: { mat: 'ladrilloTostado', alto: 0.8 },
        huecos: [{ t: 'g', u: [11.9, 14.6], y: [0, 2.6], tipo: 'chapa', color: '#8b8f8d' }, ventana([15.0, 16.0], [1.0, 2.3], { reja: true })] },
    ],
    franjas: [{ u: [0, 11.11], w: 0, y: [3.05, 3.25], vuelo: 0.05, mat: 'hormigon' }],
    muretes: [{ de: [0.05, 0.1], a: [11.05, 0.1], y0: 3.25, alto: 0, barandilla: { alto: 0.9, color: 'blanco' } },
      { de: [11.2, 0.5], a: [16.4, 0.5], y0: 3.6, alto: 0, barandilla: { alto: 0.95, color: 'blanco' } }],
    jardineras: [{ u: 2.0, w: 0.4, y: 3.25, ancho: 1.2, alto: 0.3, mat: 'ladrilloTostado' }, { u: 13.0, w: 1.2, y: 3.6, ancho: 1.6, alto: 0.4, mat: 'ladrilloTostado' }],
    faroles: [{ u: 10.9, y: 3.0, w: 0 }],
    tejados: [tejado([0, 11.11], [0.8, 9.8], 6.3, { teja: T_ROJA })],
  }]),
  // Nº 26: planta alta de ladrillo claro con persianas blancas cerradas y gran alero de madera;
  // abajo porche de pilares blancos
  fila('juan_xxiii_26', [301.28, 315.93], [-0.94567, -0.32513], 8.27, [220], [{
    numero: 26, u: [0, 8.27],
    cuerpos: [
      { u: [0, 8.27], w: [1.2, 9.9], alto: 3.0, mat: 'enfoscado', color: '#e3d4b8',
        huecos: [puerta([2.2, 3.2], [0, 2.4]), ventana([5.0, 6.4], [0.9, 2.3], { persiana: 0.4, colorPersiana: 'blanca' })] },
      { u: [0, 8.27], w: [0, 9.9], desde: 3.0, alto: 6.0, mat: 'ladrilloClaro',
        huecos: [[0.8, 2.2], [3.4, 4.8], [6.0, 7.4]].map((u) => ventana(u, [3.5, 5.3], { marco: 'blanco', persiana: 1, colorPersiana: 'blanca' })) },
    ],
    porches: [{ u: [0, 8.27], w: [0, 1.2], suelo: 0.1, techo: 2.9, techoMat: 'blanco',
      pilares: [0.25, 4.1, 8.0].map((u) => ({ u, w: 0.2, t: 'blanco', ancho: 0.35 })) }],
    plataformas: [{ u: [0, 8.27], w: [0, 1.2], y: 0.12, mat: 'baldosaGris', lateral: 'enfoscadoGris' }],
    tejados: [tejado([0, 8.27], [0, 9.9], 6.0, { vuelo: [0.9, 0.3], sofito: 'madera', teja: '#a0674a' })],
  }]),

  // ===== Calle Juan XXIII, impares (miran al sur)
  // Nº 37: blanca con zócalo de azulejo marrón, rejas blancas de adorno y balcones negros
  fila('juan_xxiii_37', [200.97, 276.31], [0.94918, 0.31473], 11.63, [63], [{
    numero: 37, u: [0, 11.63],
    cuerpos: [{ u: [0, 11.63], w: [0, 11.5], alto: 6.4, mat: 'enfoscado', color: '#f3f2ee', zocalo: { mat: 'azulejoMarron', alto: 1.1 },
      huecos: [
        ventana([1.0, 2.2], [0.7, 2.3], { marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' }),
        puerta([3.4, 4.3], [0, 2.4], { mat: 'blanca' }),
        ventana([5.6, 6.8], [0.7, 2.3], { marco: 'blanco', reja: 'ornamental', colorReja: 'blanco' }),
        ventana([8.4, 9.6], [0.7, 2.3], { marco: 'blanco', reja: 'ornamental' }),
        ventana([1.2, 2.2], [3.7, 5.2], { marco: 'blanco', persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([5.7, 6.7], [3.4, 5.4], { marco: 'blanco', sinTravesano: true }),
        ventana([8.5, 9.5], [3.4, 5.4], { marco: 'blanco', sinTravesano: true }),
      ] }],
    balcones: [barriga([5.45, 6.95], 0, 3.4, { vuelo: 0.35 }), barriga([8.25, 9.75], 0, 3.4, { vuelo: 0.35 })],
    faroles: [{ u: 10.6, y: 3.3, w: 0 }],
    tejados: [tejado([0, 11.63], [0, 11.5], 6.4)],
  }]),
  // Nº 41: blanca de dos alturas con dos balcones de barriga de forja
  fila('juan_xxiii_41', [246.66, 292.56], [0.96993, 0.24337], 15.87, [38], [{
    numero: 41, u: [0, 15.87],
    cuerpos: [{ u: [0, 15.87], w: [0, 10.9], alto: 6.8, mat: 'enfoscado', color: '#f2f0ea', zocalo: { mat: 'enfoscadoGris', alto: 0.7 },
      huecos: [
        puerta([1.5, 2.5], [0, 2.45]), ventana([4.0, 5.2], [0.7, 2.3], { reja: true }), puerta([7.5, 8.5], [0, 2.45]),
        ventana([10.5, 11.7], [0.7, 2.3], { reja: true }), { t: 'g', u: [13.0, 15.2], y: [0, 2.5], tipo: 'tablas', color: '#6e4a30' },
        ventana([3.8, 4.8], [3.4, 5.5], { sinTravesano: true, persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([7.0, 8.0], [3.4, 5.5], { sinTravesano: true, persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([10.6, 11.6], [3.8, 5.3], { persiana: 0.4, colorPersiana: 'blanca' }),
        ventana([13.4, 14.4], [3.8, 5.3], { persiana: 0.4, colorPersiana: 'blanca' }),
      ] }],
    balcones: [barriga([3.5, 5.1], 0, 3.4, { vuelo: 0.45, tipo: 'ornamental' }), barriga([6.7, 8.3], 0, 3.4, { vuelo: 0.45, tipo: 'ornamental' })],
    tejados: [tejado([0, 15.87], [0, 10.9], 6.8)],
  }]),
  // Nº 43: revoco beige con zócalo de piedra gris, rejas bajas y persianas blancas
  fila('juan_xxiii_43', [261.55, 296.21], [0.96009, 0.2797], 14.7, [12], [{
    numero: 43, u: [0, 14.7],
    cuerpos: [{ u: [0, 14.7], w: [0, 12.0], alto: 6.5, mat: 'enfoscado', color: '#dcc7aa', zocalo: { mat: 'piedraGris', alto: 0.95 },
      huecos: [
        ventana([1.0, 2.0], [0.35, 1.6], { marco: 'blanco', reja: true }), puerta([3.0, 3.9], [0, 2.35], { mat: 'blanca' }),
        ventana([5.5, 6.6], [0.6, 2.2], { marco: 'blanco', reja: true }), puerta([8.4, 9.3], [0, 2.35], { mat: 'blanca' }),
        ventana([11.5, 12.6], [0.6, 2.2], { marco: 'blanco', reja: true }),
        ...[[1.0, 2.0], [4.2, 5.2], [7.4, 8.4], [10.6, 11.6], [12.9, 13.9]].map((u) => ventana(u, [3.7, 5.3], { persiana: 0.6, colorPersiana: 'blanca' })),
      ] }],
    tejados: [tejado([0, 14.7], [0, 12.0], 6.5, { vuelo: [0.35, 0.3], teja: '#a0674a' })],
  }]),
  // Nº 47: encalada vieja con zócalo gris, ventana alta con reja y dos balcones de forja
  fila('juan_xxiii_47', [277.09, 300.87], [0.94567, 0.32513], 7.33, [188], [{
    numero: 47, u: [0, 7.33],
    cuerpos: [{ u: [0, 7.33], w: [0, 10.9], alto: 6.4, mat: 'cal', zocalo: { mat: 'enfoscadoGris', alto: 0.9 },
      huecos: [
        puerta([1.0, 2.0], [0, 2.45]), ventana([3.4, 4.4], [0.5, 2.6], { reja: true, sinTravesano: true }),
        ventana([5.6, 6.0], [0.4, 0.7], {}),
        ventana([1.2, 2.3], [3.3, 5.5], { sinTravesano: true, persiana: 0.7, colorPersiana: 'madera' }),
        ventana([4.4, 5.5], [3.3, 5.5], { sinTravesano: true, persiana: 0.7, colorPersiana: 'madera' }),
      ] }],
    balcones: [barriga([0.9, 2.6], 0, 3.3, { vuelo: 0.55, tipo: 'ornamental', grueso: 0.18 }), barriga([4.1, 5.8], 0, 3.3, { vuelo: 0.55, tipo: 'ornamental', grueso: 0.18 })],
    tejados: [tejado([0, 7.33], [0, 10.9], 6.4, { vuelo: [0.45, 0.3], sofito: 'madera' })],
  }]),
  // Nº 51 (ladrillo marrón con balcones) y 53 (blanca con zócalo de piedra gris): una sola huella
  // del Catastro
  fila('juan_xxiii_51_53', [300.03, 307.99], [0.94567, 0.32513], 11.35, [152], [
    {
      numero: 51, u: [0, 5.22],
      cuerpos: [{ u: [0, 5.22], w: [0, 10.9], alto: 6.3, mat: 'ladrilloMarron', zocalo: { mat: 'granito', alto: 0.6 },
        huecos: [puerta([0.8, 1.8], [0, 2.4]), ventana([3.0, 4.3], [0.8, 2.2], { reja: true }),
          ventana([0.9, 1.9], [3.3, 5.4], { sinTravesano: true, persiana: 0.5, colorPersiana: 'madera' }),
          ventana([3.2, 4.2], [3.3, 5.4], { sinTravesano: true, persiana: 0.5, colorPersiana: 'madera' })] }],
      balcones: [barriga([0.65, 2.15], 0, 3.3, { curvo: false }), barriga([2.95, 4.45], 0, 3.3, { curvo: false })],
      tejados: [tejado([0, 5.22], [0, 10.9], 6.3)],
    },
    {
      numero: 53, u: [5.22, 11.35],
      cuerpos: [{ u: [5.22, 11.35], w: [0, 10.9], alto: 6.3, mat: 'enfoscado', color: '#f1f0ec', zocalo: { mat: 'piedraGris', alto: 1.0 },
        huecos: [ventana([5.9, 7.0], [0.8, 2.3], { reja: true }), puerta([7.8, 8.8], [0, 2.4]), ventana([9.6, 10.7], [0.8, 2.3], { reja: true }),
          ...[[6.0, 7.0], [7.9, 8.9], [9.7, 10.7]].map((u) => ventana(u, [3.6, 5.2], { persiana: 0.4, colorPersiana: 'blanca' }))] }],
      tejados: [tejado([5.22, 11.35], [0, 10.9], 6.3, { teja: T_ROJA })],
    },
  ]),
  // Nº 55: una planta moderna, blanca con banda gris, portón seccional blanco con ventanillas y
  // visera gris
  fila('juan_xxiii_55', [310.78, 311.31], [0.94567, 0.32513], 10.61, [86], [{
    numero: 55, u: [0, 10.61],
    cuerpos: [{ u: [0, 10.61], w: [0, 12.0], alto: 3.9, mat: 'enfoscado', color: '#f3f3f0', zocalo: { mat: 'enfoscadoGris', alto: 1.0 },
      huecos: [
        { t: 'g', u: [1.2, 4.4], y: [0, 2.4], tipo: 'seccional', color: '#ecebe6', recercado: { ancho: 0.25, color: '#8b8d8f', mat: 'enfoscado' } },
        puerta([8.4, 9.5], [0, 2.4], { recercado: { ancho: 0.3, color: '#8b8d8f', mat: 'enfoscado' } }),
      ] }],
    cornisas: [{ u: [0, 10.61], w: 0, y: [3.0, 3.35], vuelo: 0.55, mat: 'enfoscado', color: '#8b8d8f' },
      { u: [0, 10.61], w: 0, y: [3.6, 3.9], vuelo: 0.1, mat: 'enfoscado', color: '#8b8d8f' }],
    cajas: [{ u: [5.5, 6.6], y: [0.7, 1.6], w: 0, mat: 'enfoscado', color: '#8b8d8f', fondo: 0.03 },
      ...[1.6, 2.3, 3.0, 3.7].map((u) => ({ u: [u, u + 0.45], y: [2.0, 2.2], w: 0, mat: 'vidrio', fondo: 0.02 }))],
  }]),
  // Nº 57: blanca de dos alturas con banda y cornisa grises, portón seccional y azotea
  fila('juan_xxiii_57', [318.71, 313.12], [0.84918, 0.52811], 13.19, [64], [{
    numero: 57, u: [0, 13.19],
    cuerpos: [{ u: [0, 13.19], w: [0, 11.9], alto: 6.7, mat: 'enfoscado', color: '#f3f3f0', zocalo: { mat: 'enfoscadoGris', alto: 0.9 },
      huecos: [
        puerta([1.0, 2.0], [0, 2.4]), ventana([3.5, 4.7], [0.8, 2.3], { marco: 'blanco', reja: true }),
        { t: 'g', u: [8.5, 11.5], y: [0, 2.4], tipo: 'seccional', color: '#ecebe6' },
        ...[[1.2, 2.4], [4.0, 5.2], [8.6, 9.8], [10.8, 12.0]].map((u) => ventana(u, [3.7, 5.3], { marco: 'blanco', persiana: 0.4, colorPersiana: 'blanca' })),
      ] }],
    cornisas: [{ u: [0, 13.19], w: 0, y: [6.3, 6.7], vuelo: 0.3, mat: 'enfoscado', color: '#8b8d8f' },
      { u: [0, 13.19], w: 0, y: [3.0, 3.15], vuelo: 0.05, mat: 'enfoscado', color: '#8b8d8f' }],
    cajas: [{ u: [5.6, 6.2], y: [1.0, 1.6], w: 0 }],
  }]),
  // Nº 69: planta baja de aplacado de piedra con portón metálico gris y enredadera; arriba
  // terraza corrida con antepecho de travertino y barandilla, ladrillo marrón y gran alero
  fila('juan_xxiii_69', [356.39, 346.34], [0.64076, 0.76774], 13.04, [55], [{
    numero: 69, u: [0, 13.04],
    cuerpos: [
      { u: [0, 13.04], w: [0, 12.5], alto: 3.3, mat: 'piedra',
        huecos: [
          { t: 'g', u: [1.0, 2.6], y: [0.15, 2.6], tipo: 'tablas', color: '#8a5530' },
          ventana([3.3, 4.9], [0.9, 2.2], { persiana: 0.9, colorPersiana: 'crema' }),
          { t: 'g', u: [7.0, 11.4], y: [0, 3.05], tipo: 'chapa', color: '#7d8283' },
        ] },
      { u: [0, 13.04], w: [1.0, 12.5], desde: 3.3, alto: 6.8, mat: 'ladrilloMarron',
        huecos: [
          ventana([0.6, 2.6], [3.9, 5.9], { marco: 'blanco', persiana: 0.95, colorPersiana: 'blanca' }),
          ventana([2.7, 4.7], [3.9, 5.9], { marco: 'blanco', persiana: 0.95, colorPersiana: 'blanca' }),
          ventana([6.6, 8.0], [3.9, 5.6], { persiana: 0.8, colorPersiana: 'blanca' }),
          ventana([9.2, 10.4], [3.9, 5.6], { persiana: 0.7, colorPersiana: 'blanca' }),
        ] },
    ],
    plataformas: [{ u: [0.6, 3.0], w: [-0.6, 0], y: 0.18, mat: 'marmol', lateral: 'piedra' }],
    balcones: [
      { u: [0, 13.04], w: 1.0, vuelo: 1.6, y: 3.45, alto: 0.8, antepecho: 'travertino', canto: 'travertino', grueso: 0.2 },
      { u: [0, 13.04], w: 1.0, vuelo: 1.55, y: 4.29, alto: 0.3, color: 'granate', canto: 'travertino', grueso: 0.04 },
    ],
    jardineras: [{ u: 3.1, w: -0.25, y: 2.8, ancho: 6.0, alto: 0.15, mat: 'piedra' }],
    tejados: [tejado([0, 13.04], [1.0, 12.5], 6.8, { pendiente: 15, vuelo: [1.4, 0.3], sofito: 'madera', teja: '#8a6a58' })],
  }]),
  // Nº 71: ladrillo amarillo con zócalo de granito, persianas de madera abajo, imposta blanca,
  // dos balcones de barriga y dos balconcillos arriba, farol entre los balcones
  fila('juan_xxiii_71', [365.33, 358.27], [0.94399, 0.32998], 16.41, [15], [{
    numero: 71, u: [0, 16.41],
    cuerpos: [{ u: [0, 16.41], w: [0, 12.0], alto: 6.3, mat: 'ladrilloAmarillo', zocalo: { mat: 'granito', alto: 0.6 },
      huecos: [
        puerta([1.4, 2.5], [0, 2.5], { cortina: true }),
        ...[[4.3, 5.7], [7.6, 9.0], [11.0, 12.4], [13.9, 15.1]].map((u) => ventana(u, [0.85, 2.35], { persiana: 0.95, colorPersiana: 'madera' })),
        ventana([1.4, 2.2], [3.6, 5.0], { persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([4.6, 5.6], [3.3, 5.4], { sinTravesano: true, persiana: 0.5, colorPersiana: 'madera' }),
        ventana([7.8, 8.8], [3.3, 5.4], { sinTravesano: true }),
        ventana([11.3, 12.1], [3.6, 5.0], { persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([14.1, 14.9], [3.6, 5.0], { persiana: 0.3, colorPersiana: 'blanca' }),
      ] }],
    franjas: [{ u: [0, 16.41], w: 0, y: [2.95, 3.15], vuelo: 0.06, mat: 'blanco' }],
    balcones: [barriga([4.3, 5.9], 0, 3.3), barriga([7.5, 9.1], 0, 3.3),
      ...[[1.3, 2.3], [11.2, 12.2], [14.0, 15.0]].map((u) => ({ u, w: 0, vuelo: 0.1, y: 3.6, alto: 0.5, color: 'negro', canto: 'marmol', grueso: 0.05 }))],
    faroles: [{ u: 6.6, y: 4.6, w: 0 }],
    tejados: [tejado([0, 16.41], [0, 12.0], 6.3, { vuelo: [0.3, 0.3] })],
  }]),
  // Nº 73: esquina, revoco beige con zócalo de placa clara, entrada metida con pilares y
  // persianas blancas; tejado rojo
  fila('juan_xxiii_73', [380.0, 367.4], [0.94399, 0.32998], 13.05, [129], [{
    numero: 73, u: [0, 13.05],
    cuerpos: [
      { u: [0, 6.0], w: [0, 11.6], alto: 6.4, mat: 'enfoscado', color: '#dcc7ac', zocalo: { mat: 'sillarClaro', alto: 1.0 },
        huecos: [ventana([1.0, 2.0], [1.0, 2.3], { persiana: 0.6, colorPersiana: 'blanca' }), ventana([3.4, 4.4], [1.0, 2.3], { persiana: 0.6, colorPersiana: 'blanca' }),
          ventana([1.4, 2.4], [3.6, 5.0], { persiana: 0.7, colorPersiana: 'blanca' }), ventana([4.4, 5.4], [3.6, 5.0], { persiana: 0.7, colorPersiana: 'blanca' })] },
      { u: [6.0, 9.0], w: [1.1, 11.6], alto: 3.0, mat: 'enfoscado', color: '#dcc7ac', huecos: [puerta([7.0, 8.0], [0.15, 2.45])] },
      { u: [6.0, 9.0], w: [0, 11.6], desde: 3.0, alto: 6.4, mat: 'enfoscado', color: '#dcc7ac',
        huecos: [ventana([7.0, 8.0], [3.6, 5.0], { persiana: 0.7, colorPersiana: 'blanca' })] },
      { u: [9.0, 13.05], w: [0, 11.6], alto: 6.4, mat: 'enfoscado', color: '#dcc7ac', zocalo: { mat: 'sillarClaro', alto: 1.0 },
        huecos: [ventana([10.2, 11.4], [1.0, 2.3], { persiana: 0.6, colorPersiana: 'blanca' }), ventana([10.2, 11.2], [3.6, 5.0], { persiana: 0.7, colorPersiana: 'blanca' })] },
    ],
    porches: [{ u: [6.0, 9.0], w: [0, 1.1], suelo: 0.15, techo: 2.9, techoMat: 'blanco',
      pilares: [{ u: 6.2, w: 0.2, t: 'blanco', ancho: 0.35 }, { u: 8.8, w: 0.2, t: 'blanco', ancho: 0.35 }] }],
    plataformas: [{ u: [6.0, 9.0], w: [0, 1.1], y: 0.15, mat: 'baldosaGris', lateral: 'sillarClaro' }],
    tejados: [tejado([0, 13.05], [0, 11.6], 6.4, { pendiente: 25, teja: T_VIVA, caderas: [false, true], vueloLado: [0, 0.4] })],
    arboles: [{ u: 0.6, w: -0.7, alto: 2.6, radio: 0.45 }],
  }]),

  // ===== Calle las Eras, impares (miran al este)
  // Nº 7: ladrillo crema con zócalo de granito, puerta de madera en recercado de ladrillo y reja
  fila('eras_7', [231.97, 286.24], [0.29447, -0.95566], 7.69, [40], [{
    numero: 7, u: [0, 7.69],
    cuerpos: [{ u: [0, 7.69], w: [0, 12.0], alto: 6.2, mat: 'ladrilloCrema', zocalo: { mat: 'granito', alto: 0.6 },
      huecos: [
        puerta([0.6, 1.6], [0, 2.4], { recercado: { mat: 'ladrilloCrema', ancho: 0.24, vuelo: 0.12 } }),
        ventana([3.0, 4.2], [0.8, 2.2], { reja: true, persiana: 0.3, colorPersiana: 'blanca' }),
        ventana([0.6, 1.8], [3.5, 5.0], { persiana: 1, colorPersiana: 'blanca', recercado: { mat: 'ladrilloCrema', ancho: 0.12, vuelo: 0.12 } }),
        ventana([3.2, 4.4], [3.5, 5.0], { persiana: 1, colorPersiana: 'blanca', recercado: { mat: 'ladrilloCrema', ancho: 0.12, vuelo: 0.12 } }),
      ] }],
    cajas: [{ u: [-0.02, 0.45], y: [1.6, 2.0], w: 0 }],
    rotulos: [{ u: [1.85, 2.15], y: [2.2, 2.4], w: 0, texto: '7', color: '#333', fuente: "700 150px sans-serif" }],
    tejados: [tejado([0, 7.69], [0, 12.0], 6.2, { teja: '#a0674a' })],
  }]),
  // Nº 9: ladrillo rojizo con persianas blancas y farol
  fila('eras_9', [234.09, 279.37], [0.3196, -0.94755], 7.32, [237], [{
    numero: 9, u: [0, 7.32],
    cuerpos: [{ u: [0, 7.32], w: [0, 9.0], alto: 6.2, mat: 'ladrilloRojo', zocalo: { mat: 'granito', alto: 0.5 },
      huecos: [puerta([1.0, 1.9], [0, 2.35], { mat: 'blanca' }), ventana([3.5, 4.7], [0.8, 2.2], { marco: 'blanco', persiana: 0.5, colorPersiana: 'blanca', reja: true }),
        ventana([1.0, 2.0], [3.5, 5.0], { marco: 'blanco', persiana: 0.6, colorPersiana: 'blanca' }),
        ventana([3.6, 4.6], [3.5, 5.0], { marco: 'blanco', persiana: 0.6, colorPersiana: 'blanca' })] }],
    faroles: [{ u: 6.0, y: 3.2, w: 0 }],
    tejados: [tejado([0, 7.32], [0, 9.0], 6.2, { teja: '#a0674a' })],
  }]),
  // Nº 11: encalada con zócalo alto de ladrillo, portal con cancela negra, ventanas altas con
  // persianas y balconcillos de barriga arriba
  fila('eras_11', [236.3, 272.76], [0.32159, -0.94688], 14.05, [42], [{
    numero: 11, u: [0, 14.05],
    cuerpos: [{ u: [0, 14.05], w: [0, 11.1], alto: 6.4, mat: 'cal', zocalo: { mat: 'ladrilloRojo', alto: 1.2 },
      huecos: [
        puerta([0.8, 2.0], [0, 2.5], { mat: 'negra' }),
        ventana([3.2, 4.0], [0.4, 2.6], { sinTravesano: true, persiana: 0.95, colorPersiana: 'madera', reja: true }),
        ventana([5.0, 5.8], [0.4, 2.6], { sinTravesano: true, persiana: 0.95, colorPersiana: 'madera', reja: true }),
        { t: 'g', u: [6.8, 7.8], y: [0, 2.4], tipo: 'chapa', color: '#9a9c9c' },
        ventana([9.4, 10.2], [0.4, 2.6], { sinTravesano: true, persiana: 0.9, colorPersiana: 'madera', reja: true }),
        ...[[1.0, 1.8], [3.4, 4.2], [5.6, 6.4], [9.4, 10.2]].map((u) => ventana(u, [3.8, 5.1], { persiana: 0.4, colorPersiana: 'blanca' })),
      ] }],
    balcones: [[1.0, 1.8], [3.4, 4.2], [5.6, 6.4]].map(([a, b]) => barriga([a - 0.15, b + 0.15], 0, 3.8, { vuelo: 0.28, alto: 0.6, grueso: 0.08 })),
    rotulos: [{ u: [1.1, 1.4], y: [2.9, 3.1], w: 0, texto: '11', color: '#333', fuente: "700 150px sans-serif" }],
    tejados: [tejado([0, 14.05], [0, 11.1], 6.4)],
  }]),
  // Nº 13: esquina, revoco claro con balcón de barandilla blanca
  fila('eras_13', [240.31, 260.55], [0.3445, -0.93879], 8.84, [41], [{
    numero: 13, u: [0, 8.84],
    cuerpos: [{ u: [0, 8.84], w: [0, 12.0], alto: 6.6, mat: 'enfoscado', color: '#eee6d6', zocalo: { mat: 'sillarClaro', alto: 0.9 },
      huecos: [puerta([1.0, 2.0], [0, 2.4]), ventana([3.5, 4.5], [0.8, 2.2], { reja: true }),
        ventana([1.2, 2.2], [3.6, 5.0], { persiana: 0.5, colorPersiana: 'madera' }),
        ventana([5.6, 6.6], [3.3, 5.4], { sinTravesano: true, persiana: 0.4, colorPersiana: 'madera' })] }],
    balcones: [{ u: [5.0, 7.4], w: 0, vuelo: 0.8, y: 3.3, alto: 1.0, color: 'blanco', canto: 'marmol' }],
    tejados: [tejado([0, 8.84], [0, 12.0], 6.6, { teja: T_ROJA, caderas: [false, true], vueloLado: [0, 0.4] })],
  }]),

  // ===== Calle las Eras, pares (miran al oeste)
  // Nº 8: esquina con la carretera: planta baja de ladrillo crema y alta encalada
  fila('eras_8', [251.94, 251.25], [-0.3445, 0.93879], 13.37, [53], [{
    numero: 8, u: [0, 13.37],
    cuerpos: [
      { u: [0, 13.37], w: [0, 12.0], alto: 3.0, mat: 'ladrilloCrema',
        huecos: [puerta([1.0, 2.0], [0, 2.4]), ...[[3.5, 4.5], [6.5, 7.5], [9.5, 10.5]].map((u) => ventana(u, [0.9, 2.2], { persiana: 0.5, colorPersiana: 'madera' }))] },
      { u: [0, 13.37], w: [0, 12.0], desde: 3.0, alto: 6.2, mat: 'enfoscado', color: '#f0efea',
        huecos: [ventana([2.0, 2.8], [3.8, 4.9], { persiana: 0.4, colorPersiana: 'madera' }), ventana([10.0, 10.8], [3.8, 4.9], { persiana: 0.4, colorPersiana: 'madera' })] },
    ],
    franjas: [{ u: [0, 13.37], w: 0, y: [2.9, 3.1], vuelo: 0.05, mat: 'ladrilloCrema' }],
    tejados: [tejado([0, 13.37], [0, 12.0], 6.2, { teja: T_ROJA, sofito: 'madera', caderas: [true, false], vueloLado: [0.4, 0] })],
  }]),
  // Nº 6: tres cuerpos: el Bar Paco (aplacado claro, rejas blancas, toldo negro con el rótulo y
  // visera de uralita), una casa vieja de una planta con portón de madera y la de ladrillo
  // rosado con zócalo de piedra, portón de madera viejo, imposta blanca y alero con canecillos
  fila('eras_6', [247.72, 263.78], [-0.3445, 0.93879], 17.96, [160, 96, 354], [{
    numero: 6, u: [0, 17.96],
    cuerpos: [
      { u: [0, 6.4], w: [0, 13.0], alto: 4.6, mat: 'enfoscado', color: '#efece4', zocalo: { mat: 'sillarClaro', alto: 2.75 },
        huecos: [
          ventana([0.6, 1.8], [0.55, 2.5], { marco: 'negro', reja: 'ornamental', colorReja: 'blanco', sinTravesano: true }),
          puerta([2.5, 3.5], [0, 2.5], { mat: 'negra', vidrio: true }),
          ventana([4.2, 5.4], [0.55, 2.5], { marco: 'negro', reja: 'ornamental', colorReja: 'blanco', sinTravesano: true }),
        ] },
      { u: [6.4, 12.4], w: [0, 13.0], alto: 3.9, mat: 'cal', zocalo: { mat: 'enfoscadoGris', alto: 0.9 },
        huecos: [ventana([7.0, 7.6], [2.2, 2.8], {}), { t: 'g', u: [8.6, 10.2], y: [0, 2.8], tipo: 'tablas', color: '#6b4c33' }] },
      { u: [12.4, 17.96], w: [0, 13.0], alto: 6.6, mat: 'ladrilloRosa', zocalo: { mat: 'sillarPiedra', alto: 1.0 },
        huecos: [
          ventana([12.8, 13.6], [1.0, 2.3], { persiana: 0.8, colorPersiana: 'madera' }),
          { t: 'g', u: [14.0, 17.5], y: [0, 2.85], tipo: 'tablas', color: '#4e3a2a' },
          ventana([12.9, 13.5], [3.9, 5.4], { persiana: 0.9, colorPersiana: 'madera', recercado: { mat: 'blanco', ancho: 0.12 } }),
          ventana([14.6, 15.4], [3.9, 5.4], { persiana: 0.9, colorPersiana: 'madera', recercado: { mat: 'blanco', ancho: 0.12 } }),
          ventana([16.6, 17.4], [3.9, 5.4], { persiana: 0.9, colorPersiana: 'madera', recercado: { mat: 'blanco', ancho: 0.12 } }),
        ] },
    ],
    franjas: [{ u: [12.4, 17.96], w: 0, y: [3.0, 3.4], vuelo: 0.06, mat: 'blanco' }],
    cornisas: [{ u: [0.3, 6.2], w: 0, y: [2.75, 3.15], vuelo: 0.5, mat: 'negra' }, { u: [1.4, 6.4], w: 0, y: [3.25, 3.7], vuelo: 0.45, mat: 'uralita' }],
    rotulos: [{ u: [1.2, 4.6], y: [2.8, 3.1], w: -0.5, texto: 'BAR PACO', color: '#f2f2f0', fuente: "700 150px 'Arial Black', sans-serif" }],
    faroles: [{ u: 2.2, y: 2.0, w: 0 }, { u: 3.8, y: 2.0, w: 0 }],
    tejados: [
      tejado([0, 6.4], [0, 13.0], 4.6, { teja: T_ROJA, pendiente: 20 }),
      tejado([6.4, 12.4], [0, 13.0], 3.9, { teja: '#8e6d5d' }),
      tejado([12.4, 17.96], [0, 13.0], 6.6, { vuelo: [0.9, 0.3], sofito: 'oscuro', canecillos: { paso: 0.5 } }),
    ],
  }]),
];
