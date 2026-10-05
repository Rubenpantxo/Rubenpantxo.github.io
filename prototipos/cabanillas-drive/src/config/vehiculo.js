// Parámetros del coche. Ajustar aquí para cambiar la sensación de conducción.
// Unidades SI: metros, kilogramos, newtons, segundos, radianes.
// Ejes del coche: Y = arriba, Z = adelante (la izquierda es +X).
// Medidas, posición y radio de las ruedas salen del modelo 3D (public/assets/coches/coches.json).
export const VEHICULO = {
  modelo: 'landcruiser',
  color: 0x8f1d1d,            // pintura del coche del jugador

  chasis: {
    masa: 2450,
    alturaLibre: 0.30,        // del suelo a la parte baja de la caja de colisión
    altoCaja: 1.45,           // alto de la caja de colisión
    anchoMax: 1.98,           // sin retrovisores
    // Centro de masas por debajo del centro de la caja: menos vuelcos
    centroMasaY: -0.5,
    friccion: 0.4,
    amortiguacionLineal: 0.05,
    amortiguacionAngular: 0.6,
  },

  ruedas: {
    suspensionReposo: 0.30,
    recorridoMax: 0.22,
    rigidez: 26,
    compresion: 2.6,
    relajacion: 3.2,
    fuerzaMaxSuspension: 80000,
    agarre: 2.6,              // frictionSlip: más alto = más agarre
    agarreTraseroFrenoMano: 0.9,
    rigidezLateral: 1.0,
  },

  motor: {
    fuerza: 4600,             // N por rueda trasera (tracción trasera)
    velocidadMaxKmh: 95,
    marchaAtrasKmh: 22,
    fuerzaMarchaAtras: 2800,
    frenoMotor: 8,            // freno suave sin acelerar
  },

  frenos: {
    servicio: 75,             // por rueda
    mano: 130,                // solo traseras
  },

  direccion: {
    anguloMax: 0.55,          // rad en parado
    anguloMinAlta: 0.16,      // rad a velocidad alta
    velocidadReferenciaKmh: 80,
    velocidadGiro: 3.2,       // rad/s al girar el volante con teclado
    velocidadRetorno: 4.5,
  },

  reinicio: {
    alturaSobreSuelo: 1.6,    // altura del centro de la caja al recolocar
    caidaMaxima: 8,
    segundosVolcado: 3,
  },
};
