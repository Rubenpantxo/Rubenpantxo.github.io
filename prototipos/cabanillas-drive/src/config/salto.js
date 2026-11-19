// Salto en paracaídas al empezar (PLAN_SALTO.md). Distancias en metros, velocidades en m/s,
// alturas sobre el suelo (AGL) salvo que se diga otra cosa. Ajustar aquí.
export const SALTO = {
  avion: {
    alturaM: 550,             // sobre el suelo del centro del pueblo
    velocidadMs: 70,
    inicioM: 1100,            // la ruta empieza tan lejos del punto central…
    saltoForzosoM: 450,       // …y te tira cuando lo ha pasado esta distancia
    finM: 1600,               // después sigue volando hasta aquí y desaparece
    desvioCentroM: 220,       // la ruta pasa a esta distancia (como mucho) del centro del casco
    // Figura provisional (S0): una caja con alas
    largoM: 30, fuselajeM: 4.2, envergaduraM: 36,
  },
  caida: {
    gravedad: 9.81,
    // Velocidad límite de bajada y avance horizontal: normal, picado (W) y abierto (S)
    vLimite: 50, vPicado: 65, vAbierto: 35,
    avanceMs: 16, avancePicadoMs: 26, avanceAbiertoMs: 8,
    respuesta: 1.2,           // 1/s: lo rápido que la velocidad va a la deseada
    giroRad: 1.6,             // A/D, rad/s
  },
  apertura: {
    duracionS: 1.1,
    // Automática a h = base + factor · max(0, |vy| − referencia)
    alturaAutoBaseM: 70, factorAuto: 1.5, vReferencia: 35,
    alturaManualMaxM: 500,    // a mano se puede abrir por debajo de esta altura
  },
  planeo: {
    bajadaMs: 5, avanceMs: 12,          // sin tocar nada
    bajadaRapidaMs: 7, avanceRapidoMs: 16,   // W
    bajadaLentaMs: 4, avanceLentoMs: 7,      // S
    respuesta: 1.5,
    giroRad: 1.05,
    // Últimos metros: frena la bajada para posarse
    alturaFrenadaM: 4, bajadaPosarseMs: 1.6,
  },
  aterrizaje: {
    duracionS: 1.2,           // la cámara entra en los ojos del personaje
    distanciaCocheM: 7,       // el coche aparcado, a lo largo de la calle
    margenZonaM: 60,          // no se puede salir de la zona del juego
  },
  camara: {
    fovAvion: 60, fovCaida: 70, fovPlaneo: 66,
    distanciaAvion: 40, distanciaCaida: 9, distanciaPlaneo: 15,
    cabeceoAvion: 0.3, cabeceoCaida: 0.7, cabeceoPlaneo: 0.35,   // rad hacia abajo
    alturaObjetivoPlaneo: 3,  // mira algo por encima del personaje (para ver la lona)
    sensibilidad: 0.0024,     // rad por píxel de ratón o de dedo
    suavizado: 3.0,
    alturaMinimaM: 2,         // sobre el terreno
  },
  // Render según la altura de la cámara sobre el suelo (src/salto/alturaRender.js)
  render: {
    alturaSueloM: 60,         // por debajo, los valores normales de la calidad
    alturaAireM: 300,         // por encima, los del aire
    // near crece con la altura, pero nunca más de 2 m: la cámara va a pocos metros del personaje
    // (con far 6000 la relación sigue siendo 3000:1, suficiente para que los tejados no parpadeen)
    nearPorMetro: 0.015, nearMax: 2,
    alturaEfectosM: 150,      // por encima, sin oclusión ambiental (N8AO)
    alturaDetalleM: 100,      // por encima, sin hierba 3D ni detalle bajo la cámara
    alturaFachadasM: 120,     // por encima, sin carpintería, cristales ni rejas en las casas a mano
    // Lejos de la cámara y niebla en el aire, por calidad
    aire: {
      alto: { lejos: 6000, niebla: { cerca: 1400, lejos: 4200 } },
      medio: { lejos: 6000, niebla: { cerca: 1400, lejos: 4200 } },
      bajo: { lejos: 3200, niebla: { cerca: 900, lejos: 3000 } },
    },
  },
};
