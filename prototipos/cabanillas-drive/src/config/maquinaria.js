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
};

// Enganche tripuntal: cuánto sube el apero, cuánto tarda y el freno de la tierra al soltar el acelerador
export const ENGANCHE = {
  subidaM: 0.5,              // los bulones, por encima de la posición de trabajo
  segundosSubir: 1.4,
  segundosVoltear: 1.3,      // el arado reversible da la vuelta al levantarlo en la cabecera
  frenoMotorTrabajo: 90,
  seguimientoSuelo: 6,       // rapidez con la que el apero sigue el terreno (1/s)
};
