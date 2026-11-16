// Ayuntamiento de Cabanillas (Plaza del Ayuntamiento, edificio exento al este de la plaza),
// modelado a mano con dos fotos de calle de Rubén (2026): la fachada a la plaza (oeste: soportal
// con columna troncocónica, pavés, balcón corrido de forja gris, ladrillo amarillo con el paño
// crema del reloj y cuatro banderas) y la trasera (este: planta baja blanca, ladrillo crema y
// ático de placas con ventanas). Los laterales norte y sur no salen en las fotos: siguen el
// orden de la trasera (ventanas supuestas). Tejado a cuatro aguas de teja roja con alero ancho
// y la torreta de lamas sobre la cumbrera.
//
// Son cuatro filas sobre las huellas 121 y 259 del Catastro (23,4 × 9,3 m): oeste y este (1,2 m
// de fondo cada una), norte y sur (la mitad del ancho cada una, entre las dos fachadas). Todas
// con el mismo «nivel» (cota de la plaza) para que casen en altura; la calle de detrás baja
// ~0,3 m, que tapa el arranque de los cuerpos (desde −0,5).

const NIVEL = 16.6;
const BLANCO = '#f1efe9';
const GRIS = '#5d6166';          // banda gris oscura bajo el alero
const T_VIVA = '#a8583c';
const FONDO_EXT = 1.2;           // fondo de las filas de las fachadas oeste y este
const LARGO = 23.37;
const MEDIO = 4.67;              // medio ancho (norte | sur)

// Alturas (sobre el nivel de la plaza)
const H_BAJA = 3.55; const H_CORNISA = 7.75; const H_ATICO = 7.95; const H_BANDA = 9.35; const H_ALERO = 9.8;

const zona = (ancho) => ({ u: [-0.3, ancho + 0.3], w: [-1.0, 6.0] });
const v = (u, y, extra = {}) => ({ t: 'v', u, y, marco: 'negro', ...extra });
const cornisa = (u, w = 0) => ({ u, w, y: [H_CORNISA, H_ATICO], vuelo: 0.15, mat: 'enfoscadoCrema' });

// Lateral (norte o sur): planta baja blanca, ladrillo amarillo, cornisa, ático crema y banda gris
function lateral(fondo) {
  const u = [FONDO_EXT, LARGO - FONDO_EXT];
  const ejes = [3.6, 7.2, 10.8, 14.4, 18.0, 20.6];
  return {
    numero: 0, u: [0, LARGO],
    cuerpos: [
      { u, w: [0, fondo], alto: H_BAJA, mat: 'enfoscado', color: BLANCO,
        huecos: ejes.map((c) => v([c - 0.5, c + 0.5], [1.1, 2.5], { reja: true, colorReja: 'gris' })) },
      { u, w: [0, fondo], desde: H_BAJA, alto: H_CORNISA, mat: 'ladrilloAmarillo',
        huecos: ejes.map((c) => v([c - 0.7, c + 0.7], [4.6, 6.0], { recercado: { mat: 'enfoscadoCrema', ancho: 0.12 } })) },
      { u, w: [0, fondo], desde: H_CORNISA, alto: H_BANDA, mat: 'sillarClaro',
        huecos: ejes.map((c) => v([c - 0.7, c + 0.7], [8.15, 9.15])) },
      { u, w: [0, fondo], desde: H_BANDA, alto: H_ALERO, mat: 'enfoscado', color: GRIS },
    ],
    franjas: [{ u: [0, LARGO], w: 0, y: [H_BAJA - 0.05, H_BAJA + 0.05], vuelo: 0.04, mat: 'blanco' }],
    cornisas: [cornisa([0, LARGO])],
  };
}

export const FILAS_AYUNTAMIENTO = [
  // ===== Fachada a la plaza (oeste): u de norte a sur
  { nombre: 'ayuntamiento_oeste', edificios: [], origen: [201.91, 338.23], eje: [-0.3312, 0.9432], nivel: NIVEL, zona: zona(9.33),
    casas: [{
      numero: 0, u: [0, 9.33],
      cuerpos: [
        // pilastras de la planta baja y fondo del soportal
        { u: [0, 1.4], w: [0, FONDO_EXT], alto: 3.0, mat: 'enfoscado', color: BLANCO, matFachada: 'enfoscadoCrema' },
        { u: [7.85, 9.33], w: [0, FONDO_EXT], alto: 3.0, mat: 'enfoscado', color: BLANCO, matFachada: 'enfoscadoCrema' },
        { u: [1.4, 7.85], w: [1.0, FONDO_EXT], alto: 3.0, mat: 'enfoscadoCrema',
          huecos: [
            { t: 'p', u: [1.5, 3.35], y: [0, 2.75], mat: 'negra', hojas: 2, vidrio: true },
            v([5.95, 7.75], [0.15, 2.75], { sinTravesano: true }),
          ] },
        // planta noble: ladrillo amarillo con el paño crema de los dos balcones
        { u: [0, 2.2], w: [0, FONDO_EXT], desde: 3.0, alto: H_CORNISA, mat: 'ladrilloAmarillo' },
        { u: [2.2, 7.13], w: [0, FONDO_EXT], desde: 3.0, alto: H_CORNISA, mat: 'sillarClaro',
          huecos: [v([2.6, 3.85], [3.4, 6.0], { sinTravesano: true }), v([5.48, 6.73], [3.4, 6.0], { sinTravesano: true })] },
        { u: [7.13, 9.33], w: [0, FONDO_EXT], desde: 3.0, alto: H_CORNISA, mat: 'ladrilloAmarillo' },
        // ático: ladrillo con el paño del reloj
        { u: [0, 3.3], w: [0, FONDO_EXT], desde: H_CORNISA, alto: H_BANDA, mat: 'sillarClaro', matFachada: 'ladrilloAmarillo' },
        { u: [3.3, 6.03], w: [0, FONDO_EXT], desde: H_CORNISA, alto: H_BANDA, mat: 'sillarClaro' },
        { u: [6.03, 9.33], w: [0, FONDO_EXT], desde: H_CORNISA, alto: H_BANDA, mat: 'sillarClaro', matFachada: 'ladrilloAmarillo' },
        { u: [0, 9.33], w: [0, FONDO_EXT], desde: H_BANDA, alto: H_ALERO, mat: 'enfoscado', color: GRIS },
      ],
      // pavés a los lados de la columna
      franjas: [
        { u: [3.45, 4.3], w: 1.0, y: [0.05, 2.85], vuelo: 0.03, mat: 'paves' },
        { u: [5.05, 5.9], w: 1.0, y: [0.05, 2.85], vuelo: 0.03, mat: 'paves' },
        { u: [1.4, 7.85], w: 0, y: [2.75, 3.0], vuelo: 0.05, mat: 'blanco' },      // viga del soportal
      ],
      cornisas: [cornisa([0, 9.33])],
      columnas: [{ u: 4.67, w: 0.4, y: [0, 3.0], radio: 0.2, radioArriba: 0.36, mat: 'hormigon' }],
      balcones: [{ u: [1.0, 8.33], w: 0, vuelo: 0.65, y: 3.35, alto: 1.0, color: 'gris', tipo: 'cruces', canto: 'blanco', grueso: 0.32 }],
      relojes: [{ u: 4.67, y: 8.6, w: 0, radio: 0.42 }],
      banderas: [
        { u: 1.3, y: 6.3, w: 0, tipo: 'municipal', angulo: 38, abre: -62, alto: 1.1 },
        { u: 1.9, y: 6.3, w: 0, tipo: 'espana', angulo: 42, abre: -40, alto: 1.1 },
        { u: 7.4, y: 6.3, w: 0, tipo: 'navarra', angulo: 42, abre: 40, alto: 1.1 },
        { u: 8.0, y: 6.3, w: 0, tipo: 'europa', angulo: 38, abre: 62, alto: 1.1 },
      ],
      // tótem rojo del cajero / información en la acera de la pilastra derecha
      cajas: [
        { u: [8.15, 8.6], y: [0, 1.9], w: -0.25, mat: 'hierroRojo', fondo: 0.14 },
        { u: [8.2, 8.55], y: [1.25, 1.6], w: -0.39, mat: 'plastico', fondo: 0.01 },
      ],
    }] },

  // ===== Trasera (este): u de sur a norte (la calle está ~0,3 m por debajo del nivel)
  { nombre: 'ayuntamiento_este', edificios: [], origen: [220.87, 354.74], eje: [0.3316, -0.9433], nivel: NIVEL, zona: zona(9.35),
    casas: [{
      numero: 0, u: [0, 9.35],
      cuerpos: [
        { u: [0, 9.35], w: [0, FONDO_EXT], alto: H_BAJA, mat: 'enfoscado', color: BLANCO,
          huecos: [v([3.25, 3.95], [1.3, 2.85]), v([4.4, 5.05], [1.3, 2.85])] },
        { u: [0, 9.35], w: [0, FONDO_EXT], desde: H_BAJA, alto: H_CORNISA, mat: 'ladrilloAmarillo',
          huecos: [v([3.0, 4.8], [4.65, 5.95], { recercado: { mat: 'enfoscadoCrema', ancho: 0.12 } })] },
        { u: [0, 9.35], w: [0, FONDO_EXT], desde: H_CORNISA, alto: H_BANDA, mat: 'sillarClaro',
          huecos: [v([0.6, 1.55], [8.15, 9.2]), v([3.05, 4.9], [8.15, 9.2]), v([6.9, 7.95], [8.15, 9.2])] },
        { u: [0, 9.35], w: [0, FONDO_EXT], desde: H_BANDA, alto: H_ALERO, mat: 'enfoscado', color: GRIS },
      ],
      franjas: [{ u: [0, 9.35], w: 0, y: [H_BAJA - 0.05, H_BAJA + 0.05], vuelo: 0.04, mat: 'blanco' }],
      cornisas: [cornisa([0, 9.35])],
      cajas: [{ u: [6.6, 7.0], y: [2.75, 3.2], w: 0, mat: 'aluminio', fondo: 0.03 }],   // rejilla de ventilación
      faroles: [{ u: 3.9, y: 6.6, w: 0 }],
    }] },

  // ===== Lateral norte (u de este a oeste) con el tejado de todo el edificio
  { nombre: 'ayuntamiento_norte', edificios: [121, 259], origen: [223.97, 345.92], eje: [-0.9443, -0.3292], nivel: NIVEL, zona: zona(LARGO),
    casas: [{
      ...lateral(MEDIO),
      tejados: [{ u: [0, LARGO], w: [0, 2 * MEDIO], alero: H_ALERO, pendiente: 22, vuelo: [1.0, 1.0], vueloLado: [1.0, 1.0],
        caderas: [true, true], teja: T_VIVA, sofito: 'blanco', cornisa: 0.3,
        chimeneas: [{ u: 18.2, w: MEDIO, alto: 1.3, mat: 'ladrilloAmarillo', ancho: 1.2, lamas: true }] }],
    }] },

  // ===== Lateral sur (u de oeste a este)
  { nombre: 'ayuntamiento_sur', edificios: [], origen: [198.82, 347.03], eje: [0.9439, 0.3301], nivel: NIVEL, zona: zona(LARGO),
    casas: [lateral(2 * MEDIO - MEDIO)] },
];
