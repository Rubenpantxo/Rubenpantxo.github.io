// Maquinaria del modo agricultura (PLAN_AGRICULTURA.md §5.6). Tienen la misma forma que VEHICULO
// (src/config/vehiculo.js) para que los mueva el mismo controlador (src/vehiculo/coche.js); las
// medidas y las ruedas salen del modelo (public/assets/maquinaria/maquinaria.json, de
// tools/build_maquinaria.py). Unidades SI. Ejes: Y arriba, Z adelante, izquierda +X.
import { CAMARA } from './camara.js';

export const RUTA_MAQUINARIA = 'assets/maquinaria/';

// Colores de pintura para elegir (genéricos, sin marca). El primero es el de salida
export const COLORES_TRACTOR = [
  { nombre: 'Rojo', color: 0xa3201b },
  { nombre: 'Verde', color: 0x2f6b2a },
  { nombre: 'Azul', color: 0x1f4f8f },
  { nombre: 'Naranja', color: 0xd8641c },
];

export const TRACTOR = {
  modelo: 'tractor',
  nombreGrupo: 'tractor_jugador',
  color: COLORES_TRACTOR[0].color,

  chasis: {
    masa: 6200,
    alturaLibre: 0.5,         // del suelo a la parte baja de la caja de colisión
    altoCaja: 2.3,            // hasta el techo de la cabina
    anchoMax: 1.9,            // la caja no llega a las ruedas (son rayos)
    centroMasaY: -0.75,       // bajo: el tractor pesa abajo (motor, ejes, ruedas con agua)
    friccion: 0.5,
    amortiguacionLineal: 0.08,
    amortiguacionAngular: 1.0,
  },

  ruedas: {
    suspensionReposo: 0.22,   // casi no tiene suspensión: la hacen los neumáticos
    recorridoMax: 0.12,
    rigidez: 45,
    compresion: 4.0,
    relajacion: 4.6,
    fuerzaMaxSuspension: 200000,
    agarre: 3.2,
    agarreTraseroFrenoMano: 2.6,
    rigidezLateral: 1.3,
  },

  motor: {
    traccionTotal: true,      // doble tracción: empujan las cuatro ruedas
    fuerza: 3200,             // N por rueda
    velocidadMaxKmh: 40,      // carretera
    marchaAtrasKmh: 14,
    fuerzaMarchaAtras: 2800,
    frenoMotor: 30,           // retiene mucho al soltar el acelerador
  },

  frenos: {
    servicio: 200,
    mano: 320,
  },

  direccion: {
    anguloMax: 0.62,          // gira cerrado en parado
    anguloMinAlta: 0.24,
    velocidadReferenciaKmh: 40,
    velocidadGiro: 2.4,
    velocidadRetorno: 3.6,
  },

  reinicio: {
    alturaSobreSuelo: 2.0,
    caidaMaxima: 8,
    segundosVolcado: 3,
  },

  // Cámaras: más alta y más lejos que la del coche; la de «capó» es la de la cabina
  camara: {
    persecucion: { ...CAMARA.persecucion, detras: 9.5, altura: 4.4, mirarAdelante: 3.5, alturaMirada: 1.9, distanciaMinima: 3.0, fov: 60 },
    capo: { posicion: [0, 0.95, -0.75], mirarAdelante: 20, fov: 72 },
  },
};

// Aperos (A4): se enganchan al tripuntal del tractor en la COPE. Las medidas (anchura de trabajo,
// alto de los bulones, dónde trabajan) salen de maquinaria.json; aquí, cómo trabajan.
//   labor: lo que pintan en la parcela (src/agricultura/pincel.js)
//   velocidadMaxKmh: con el apero bajado el tractor no pasa de aquí (tira de él la tierra)
//   resistenciaN: lo que frena el apero clavado, además
//   trabajoKmh: velocidad buena de trabajo (para el aviso y el sonido)
export const APEROS = {
  arado: {
    modelo: 'arado', nombre: 'Arado reversible', detalle: '4 cuerpos · 1,6 m', icono: '⛏️', labor: 'arar',
    velocidadMaxKmh: 10, resistenciaN: 3200, trabajoKmh: [4, 9],
    polvo: 0.8, terrones: 1.0, aves: 9, color: 0x3d5226,
  },
  cultivador: {
    modelo: 'cultivador', nombre: 'Cultivador', detalle: '15 brazos y rodillo · 3 m', icono: '〰️', labor: 'gradear',
    velocidadMaxKmh: 13, resistenciaN: 2200, trabajoKmh: [6, 12],
    polvo: 1.3, terrones: 0.25, aves: 4, color: 0xb88a1a,
  },
  // A5. Tolva: capacidadKg; lo que se gasta por hectárea está en dosisKgHa (abono) o en SEMILLAS
  abonadora: {
    modelo: 'abonadora', nombre: 'Abonadora', detalle: '2 discos · reparte 12 m', icono: '🌨️', labor: 'abonar',
    velocidadMaxKmh: 16, resistenciaN: 0, trabajoKmh: [8, 14],
    polvo: 0.15, terrones: 0, aves: 0, tolva: 'abono', capacidadKg: 800, dosisKgHa: 300,
    discosRpm: 540,          // con la toma de fuerza a 540 vueltas
  },
  sembradora: {
    modelo: 'sembradora', nombre: 'Sembradora', detalle: 'arrastrada · 20 líneas · 3 m', icono: '🌱', labor: 'sembrar',
    velocidadMaxKmh: 13, resistenciaN: 1500, trabajoKmh: [7, 12],
    polvo: 0.5, terrones: 0, aves: 5, tolva: 'semilla', capacidadKg: 400,
  },
  // A10: arrancadora de cebolla, suspendida del tripuntal. Saca solo la cebolla madura y la lleva al
  // cajón que lleva detrás (capacidadKg); se vacía en la COPE. Modelo hecho en código (modelosCodigo.js)
  arrancadora: {
    modelo: 'arrancadora', procedural: true, nombre: 'Arrancadora de cebolla', detalle: '1,8 m · cajón de 3 000 kg', icono: '🧅', labor: 'arrancar',
    velocidadMaxKmh: 7, resistenciaN: 2600, trabajoKmh: [3, 6],
    polvo: 0.9, terrones: 0.5, aves: 3, recolector: true, grano: false, capacidadKg: 3000, cultivos: ['cebolla'],
  },
  // Remolque de grano (A8): no labra; lo llena la cosechadora con el tubo (cargaKg, de grano)
  remolque: {
    modelo: 'remolque', nombre: 'Remolque de grano', detalle: 'un eje · 10 000 kg', icono: '🛒', labor: null,
    velocidadMaxKmh: 40, resistenciaN: 0, trabajoKmh: [0, 40], polvo: 0, terrones: 0, aves: 0,
    grano: true, capacidadKg: 10000,
  },
};

// Cosechadora (A8): compacta, de cabezal de 5,4 m, con tracción en las ruedas delanteras (grandes)
// y la dirección en las traseras (pequeñas). Misma forma que TRACTOR (la mueve coche.js)
export const COSECHADORA = {
  modelo: 'cosechadora',
  nombreGrupo: 'cosechadora_jugador',
  color: 0xc79a14,
  piezasMoviles: ['cabezal', 'molinete', 'tubo_descarga', 'carga'],

  chasis: {
    masa: 9500,
    alturaLibre: 0.55,
    altoCaja: 3.1,
    anchoMax: 2.5,
    centroMasaY: -0.9,
    friccion: 0.5,
    amortiguacionLineal: 0.1,
    amortiguacionAngular: 1.2,
  },
  ruedas: {
    suspensionReposo: 0.24,
    recorridoMax: 0.12,
    rigidez: 42,
    compresion: 4.2,
    relajacion: 4.8,
    fuerzaMaxSuspension: 260000,
    agarre: 3.0,
    agarreTraseroFrenoMano: 2.6,
    rigidezLateral: 1.3,
  },
  motor: {
    traccion: 'delantera',
    fuerza: 6500,             // N por rueda motriz (dos)
    velocidadMaxKmh: 25,
    marchaAtrasKmh: 10,
    fuerzaMarchaAtras: 5500,
    frenoMotor: 45,
  },
  frenos: { servicio: 320, mano: 480 },
  direccion: {
    trasera: true,            // giran las ruedas de atrás: la cola sale hacia fuera en las curvas
    anguloMax: 0.62,
    anguloMinAlta: 0.2,
    velocidadReferenciaKmh: 25,
    velocidadGiro: 2.0,
    velocidadRetorno: 3.2,
  },
  reinicio: { alturaSobreSuelo: 2.4, caidaMaxima: 8, segundosVolcado: 3 },
  camara: {
    persecucion: { ...CAMARA.persecucion, detras: 14.5, altura: 7.2, mirarAdelante: 6, alturaMirada: 2.4, distanciaMinima: 4.5, fov: 60 },
    capo: { posicion: [0, 1.55, 2.0], mirarAdelante: 25, fov: 75 },
  },
  // Cosecha: velocidad buena de trabajo y la máxima con el cabezal bajado; la tolva (litros) y lo
  // que tarda en vaciarse por el tubo; cuánto sube el cabezal y lo que tarda; el molinete
  cosecha: {
    trabajoKmh: [3, 7],
    velocidadMaxKmh: 8,
    tolvaL: 6000,
    descargaLs: 75,
    segundosCabezal: 1.4,
    subidaCabezalRad: 0.14,     // unos 45 cm en la barra de corte
    segundosTubo: 3.5,
    molineteRpm: 38,
    alturaCorteM: 0.15,
  },
};

// Semillas que se cargan en la COPE (A5; los cereales crecen en A6). Dosis orientativas de siembra
// de cereal de invierno en regadío; se ajustarán en A6 con fuentes agronómicas.
export const SEMILLAS = {
  trigo: { nombre: 'Trigo', icono: '🌾', dosisKgHa: 200 },
  cebada: { nombre: 'Cebada', icono: '🌾', dosisKgHa: 180 },
  // A10: semilla de cebolla (siembra de precisión: unos 3,5 kg/ha, orientativo)
  cebolla: { nombre: 'Cebolla', icono: '🧅', dosisKgHa: 3.5 },
};

// Aperos arrastrados (sembradora): la lanza va al enganche de la barra de tiro y el apero sigue al
// tractor sobre sus ruedas; giro máximo de la lanza respecto al tractor (grados)
export const ARRASTRE = { anguloMaxGrados: 75 };

// Enganche tripuntal: cuánto sube el apero, cuánto tarda y el freno de la tierra al soltar el acelerador
export const ENGANCHE = {
  subidaM: 0.5,              // los bulones, por encima de la posición de trabajo
  segundosSubir: 1.4,
  segundosVoltear: 1.3,      // el arado reversible da la vuelta al levantarlo en la cabecera
  frenoMotorTrabajo: 90,
  seguimientoSuelo: 6,       // rapidez con la que el apero sigue el terreno (1/s)
};
