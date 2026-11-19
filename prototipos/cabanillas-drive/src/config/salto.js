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
    // Figura provisional (si no carga avion.glb): una caja con alas
    largoM: 30, fuselajeM: 4.2, envergaduraM: 36,
    // Se sale por el final de la rampa trasera (avion.glb: llega a 8,5 m por detrás del centro y
    // 3,7 m por debajo)
    salidaAtrasM: 9.5, salidaBajoM: 4,
  },
  // Persona de MakeHuman (src/salto/persona.js): la mochila va este fondo por detrás del pecho;
  // por debajo de esta altura se pone en postura de posarse
  persona: { fondoEspaldaM: 0.13, alturaPosarseM: 7 },
  // Pelo al viento (src/salto/persona.js): cuánto se mueven las puntas (m) a plena velocidad, el
  // temblor, y cómo se reparte desde el cráneo (centro de la cabeza: este alto sobre el cuello)
  pelo: {
    empujeM: 0.07, temblorM: 0.009, velocidadPlenaMs: 45,
    centroSobreCuelloM: 0.1, radioCraneoM: 0.1, largoM: 0.22, minimo: 0.18,
  },
  // Modelos de Rubén (modelos/salto/ → npm run salto). La mochila va en la espalda del personaje:
  // posición de su centro respecto a los pies (Z+ = detrás)
  modelos: {
    ruta: 'assets/salto/', avion: 'avion.glb', mochila: 'mochila_paracaidas.glb',
    mochilaEnEspalda: [0, 1.22, 0.3],
    // Giro de cada solapa abierta (eje x, y, z y grados): el de mochila_paracaidas.glb, para los
    // modelos que vienen cerrados
    aperturaSolapas: {
      Solapa_Izq: [0, -1, 0, 111.7], Solapa_Der: [0, 1, 0, 111.7], Solapa_Inf: [1, 0, 0, 100.3],
    },
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
    fovAvion: 60, fovCaida: 64, fovPlaneo: 64,
    // Cerca del personaje para que se vea quién salta (antes 9 y 15 m: salía diminuto)
    distanciaAvion: 40, distanciaCaida: 4.6, distanciaPlaneo: 9,
    cabeceoAvion: 0.3, cabeceoCaida: 0.42, cabeceoPlaneo: 0.28,   // rad hacia abajo
    alturaObjetivoPlaneo: 2.4,  // mira algo por encima del personaje (para ver la lona)
    sensibilidad: 0.0024,     // rad por píxel de ratón o de dedo
    suavizado: 3.0,
    alturaMinimaM: 2,         // sobre el terreno
  },
  // Sonido (src/salto/sonidoSalto.js). Volúmenes de 0 a 1
  sonido: {
    volumen: 0.55,
    motorHz: 78, helicesHz: 21,        // tono del motor y batir de las hélices
    motorDentro: 0.32, motorRefM: 60,  // volumen dentro del avión; a esta distancia suena la mitad
    vientoAvion: 0.06, vientoMin: 0.03, vientoMax: 0.5, vientoMaxMs: 65,
    golpe: 0.9,                        // golpe de tela al abrir
  },
  // Minimapa durante el salto: radio visible según la altura (m)
  minimapa: { radioAvionM: 1100, radioPorAltura: 1.7, radioMinM: 180 },
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
      // El borde del horizonte (tools/40_horizonte.py) está a 4 km: ahí acaba la niebla
      // (lejos de 12 km: así se dibuja la falda casi hasta el horizonte; con near 2 m, 6000:1)
      alto: { lejos: 12000, niebla: { cerca: 1400, lejos: 4000 } },
      medio: { lejos: 12000, niebla: { cerca: 1400, lejos: 4000 } },
      bajo: { lejos: 12000, niebla: { cerca: 900, lejos: 3000 } },
    },
  },
};
