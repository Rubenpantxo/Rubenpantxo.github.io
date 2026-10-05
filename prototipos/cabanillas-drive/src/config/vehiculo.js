// Parámetros del coche. Ajustar aquí para cambiar la sensación de conducción.
// Unidades SI: metros, kilogramos, newtons, segundos, radianes.
// Ejes del coche: X = derecha, Y = arriba, Z = adelante.
export const VEHICULO = {
  chasis: {
    largo: 4.2,
    ancho: 1.8,
    alto: 1.4,
    masa: 1250,
    // Centro de masas por debajo del centro de la caja: menos vuelcos
    centroMasaY: -0.45,
    friccion: 0.4,
    // Amortiguación general (resistencia del aire y rozamientos)
    amortiguacionLineal: 0.05,
    amortiguacionAngular: 0.6,
  },

  ruedas: {
    radio: 0.34,
    anchoVisual: 0.24,
    distanciaEjes: 2.6,      // entre eje delantero y trasero
    via: 1.56,               // entre ruedas del mismo eje
    alturaAnclaje: -0.35,    // respecto al centro de la caja
    suspensionReposo: 0.32,
    recorridoMax: 0.22,
    rigidez: 26,
    compresion: 2.6,
    relajacion: 3.2,
    fuerzaMaxSuspension: 40000,
    agarre: 2.6,             // frictionSlip: más alto = más agarre
    agarreTraseroFrenoMano: 0.9,
    rigidezLateral: 1.0,
  },

  motor: {
    fuerza: 2600,            // N por rueda trasera (tracción trasera)
    velocidadMaxKmh: 95,
    marchaAtrasKmh: 22,
    fuerzaMarchaAtras: 1500,
    frenoMotor: 4,           // freno suave sin acelerar
  },

  frenos: {
    servicio: 38,            // por rueda
    mano: 70,                // solo traseras
  },

  direccion: {
    anguloMax: 0.55,         // rad en parado
    anguloMinAlta: 0.16,     // rad a velocidad alta
    velocidadReferenciaKmh: 80,
    velocidadGiro: 3.2,      // rad/s al girar el volante con teclado
    velocidadRetorno: 4.5,
  },

  reinicio: {
    alturaSobreSuelo: 1.4,   // altura del centro al recolocar
    caidaMaxima: 8,          // si cae tantos m por debajo del terreno, se recoloca
    segundosVolcado: 3,      // tiempo volcado antes de sugerir R
  },
};
