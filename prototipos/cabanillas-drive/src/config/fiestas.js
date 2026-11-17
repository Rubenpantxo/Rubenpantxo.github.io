// Parámetros del modo fiestas (PLAN_FIESTAS.md). Ajustar aquí. Las posiciones (recinto, vallas,
// tablado, corral…) están en src/datos/fiestas.js.
// Las medidas de las vallas salen de las fotos de Rubén tomando como escala a las personas
// (docs/fiestas/README.md): son aproximadas.
export const FIESTAS = {
  // Dónde aparece el jugador al entrar, según el modo (?fiestas=plaza|calle|encierro)
  modos: ['plaza', 'calle', 'encierro'],
  // Lo que se puede pedir al entrar: los modos, el concurso de la plaza y el menú
  entradas: ['menu', 'plaza', 'concurso', 'calle', 'encierro'],
  fundidoS: 0.45,                    // fundido a negro al entrar y al salir

  valla: {
    altoColisionM: 3.0,              // la colisión es más alta que la valla: en F1 no se salta
    gruesoColisionM: 0.24,
    rojo: 0xa01f24,                  // postes, paneles, tablado
    rojoOscuro: 0x7d171b,
    madera: 0xc79a5c,                // tablones sin pintar
    maderaVieja: 0xa9824f,
    gris: 0xaeb3b6,                  // acero galvanizado
    // Valla de tablones: postes rojos y tablones horizontales con huecos
    tablones: { altoM: 1.75, pasoPosteM: 2.4, posteM: 0.1, tablonAltoM: 0.2, tablonGruesoM: 0.045,
      alturasM: [0.3, 0.68, 1.06, 1.44] },
    // Panel rojo macizo, más bajo
    panel: { altoM: 1.35, pasoPosteM: 2.0, posteM: 0.08, gruesoM: 0.04 },
    // Barandilla roja de tubo, tres barras
    tubo: { altoM: 1.15, pasoPosteM: 2.0, tuboM: 0.05, alturasM: [0.4, 0.78, 1.15] },
    // Cierre de barrotes verticales que cruza la acera
    barrotes: { altoM: 1.7, pasoM: 0.14, barraM: 0.025 },
    // Valla gris que protege una puerta
    gris_: { altoM: 1.15, pasoPosteM: 1.5, tuboM: 0.04, alturasM: [0.25, 0.55, 0.85, 1.15] },
    burladero: { anchoM: 1.3, altoM: 1.55, gruesoM: 0.06 },
  },

  // Tablado y gradas: filas de asientos que suben desde el frente. La primera fila queda casi a
  // la altura de la valla, como en la foto 4 (los pies de los sentados asoman por encima)
  gradas: { filaFondoM: 0.75, contrahuellaM: 0.4, primeraM: 1.4, barandillaM: 1.0 },

  arena: { gruesoM: 0.16, color: 0xcdb083, colorOscuro: 0xb39468 },   // tapa los bordillos (12 cm)

  banderines: {
    cadaM: 9,                        // una ristra cada tantos metros de calle
    altoM: 5.2,                      // altura de la cuerda en los extremos
    flechaM: 0.45,                   // lo que cuelga en el centro
    pasoM: 0.42, anchoM: 0.3, largoM: 0.42,
    colores: [0xd9262c, 0xf2f2f2, 0x1c8a3c, 0xf0c419, 0x1f5fb4],
    vaivenRad: 0.35,
  },

  ambulancia: { altoM: 2.5, blanco: 0xf3f3f0, franja: 0xe2792a },

  // Jugador en tercera persona (F2). Velocidades en m/s, tiempos en s, energía de 0 a 1.
  personaje: {
    modelo: 'h_joven',               // persona de MakeHuman que hace de jugador (si falta, la primera)
    andarMs: 2.2, correrMs: 4.6, esprintMs: 6.6,
    joystickAndar: 0.5,              // con el joystick por debajo de esto se anda; a fondo se esprinta
    joystickEsprint: 0.93,
    aceleracion: 14,                 // lo rápido que coge la velocidad pedida (1/s)
    giroRad: 13,                     // giro del cuerpo hacia donde se mueve (rad/s)
    // Energía: el esprint gasta y cada suerte cuesta; se recupera sola, y más deprisa en el refugio
    energia: { esprintPorS: 0.1, recuperaPorS: 0.07, recuperaRefugio: 3, minimoEsprint: 0.05, vuelveEsprint: 0.22,
      quiebro: 0.07, recorte: 0.11, salto: 0.18, especial: 0.32 },
    quiebro: { duracionS: 0.26, distanciaM: 2.3, inclinacionRad: 0.38, comboS: 0.5 },
    recorte: { duracionS: 0.44, velocidadMs: 5.6, giroRad: 2.7, inclinacionRad: 0.3 },
    salto: { altoM: 0.75, empujeMs: 1.0 },
    especial: { altoM: 1.3, empujeMs: 3.2, ventanaS: 0.16 },   // E y Espacio «a la vez»: dentro de esta ventana
    // Refugio (F): valla de tablones, burladero o valla gris a menos de esta distancia
    refugio: { vallaM: 1.5, burladeroM: 2.0, grisM: 2.4, subirS: 0.42, bajarS: 0.34, separaM: 0.85 },
    // Postura al correr (se suma a la animación de andar, que es la única que hay)
    // codoRad: lo que se dobla el codo sobre la animación (que ya lo lleva algo doblado);
    // braceoRad: lo que van y vienen los brazos; manoDentroRad: los antebrazos hacia el centro
    correr: { inclinacionRad: 0.28, codoRad: 1.15, braceoRad: 0.45, manoDentroRad: 0.3, zancadaMax: 1.9 },
  },

  // La vaca (F3). La clave del recorte: corre más que el jugador (6,6 m/s a esprint) pero gira
  // peor cuanto más deprisa va. Velocidades en m/s, giros en rad/s, tiempos en s.
  vaca: {
    activa: true,                    // ?vacas=0 entra al modo sin vaca
    salidaS: 4,                      // segundos desde que se entra hasta que sale del corral
    capas: ['colorada', 'negra', 'berrenda'],
    radioM: 0.55,                    // para no atravesar vallas (el cuerpo mide 1,9 × 0,6 m)
    troteMs: 2.6, galopeMs: 8.6, recogeMs: 4.5,
    aceleracion: 6.5, frenada: 9,
    // Giro máximo: giroParado / (1 + (v / giroVelRef)²). Parada gira en el sitio; a galope, casi nada
    giroParado: 3.4, giroVelRef: 4.2,
    reaccionS: 0.22,                 // persigue adonde estaba el jugador hace este tiempo
    fijaS: [0.7, 1.5],               // se para y mira antes de arrancarse
    reconoceS: [2.0, 4.5],           // trota a su aire entre embestidas
    embisteMaxS: 6,                  // si no llega, deja la embestida
    pasaDeLargoM: 3.5,               // tras cruzarse con el jugador sigue recta esto antes de frenar
    veHastaM: 45,                    // no se arranca a nadie más lejos
    derroteS: 1.1,                   // parada tras rematar en la valla
    cogidaM: 0.95,                   // distancia a la que coge
    saltoLibraM: 0.6,                // con los pies por encima de esto, pasa por debajo (el salto normal sube 0,75)
    // Se va cansando: pierde fuerza con el tiempo y con cada embestida, y con ella velocidad
    cansancio: { porS: 0.0025, porEmbestida: 0.035, minimo: 0.45 },
    colores: { colorada: 0x8a4526, negra: 0x1c1816, berrendaClaro: 0xe9e2d2, berrendaOscuro: 0x1e1a18,
      cuerno: 0xd9cfb4, pezuna: 0x2a2420, morro: 0x3a2a26 },
  },
  cogida: { vueloS: 0.9, altoM: 1.6, lejosM: 3.2 },   // volteo sencillo: por los aires y al refugio

  // Recortes y puntuación (F4). Las distancias son del jugador a los cuernos, en metros.
  recortes: {
    tandaS: 120,                     // duración de la tanda
    otraTandaS: 7,                   // al acabar, segundos hasta que empieza otra (el menú es de la F5)
    // Distancia buena para cada suerte: [mínima, máxima] al pulsar, con la vaca embistiendo
    valida: { quiebro: [1.2, 5.0], recorte: [1.8, 6.0], salto: [1.8, 3.4], especial: [1.8, 5.5] },
    puntos: { pase: 20, quiebro: 100, recorte: 150, salto: 200, combo: 250, especial: 350 },
    // Riesgo: 0 si la vaca pasa a lejosM o más, 1 si pasa a cenidoM o menos. Multiplica por 1 + extra × riesgo
    cenidoM: 1.1, lejosM: 3.6, extraRiesgo: 2,
    notas: [[0.75, 'ceñido'], [0.4, 'bueno'], [0, 'lejano']],   // riesgo mínimo de cada nota
    paseHastaM: 4.5,                 // la vaca tiene que pasar a menos de esto para contar como pase
    rozadoM: 1.05, rozado: 0.8,      // si pasa rozando (sin salto), no es limpio: multiplica por esto
    repetida: 0.7, variada: 1.2,     // misma suerte que la anterior / distinta de las dos anteriores
    // Cogidas: fuerte si la vaca venía a más de esta velocidad
    cogida: { fuerteMs: 6.5, leve: { vida: 0.2, puntos: 150 }, fuerte: { vida: 0.35, puntos: 300 } },
    lenta: { riesgo: 0.75, ritmo: 0.35, duraS: 0.55 },   // cámara lenta en los recortes ceñidos
    avisoS: 2.2,
    fuerza: [[0.8, 'Con fuerza'], [0.6, 'Se va cansando'], [0, 'Cansada']],
    consejos: ['Espera a que se arranque y calcula su paso', 'Cuanto más cerca pase, más puntos', 'No repitas siempre la misma suerte',
      'Sin energía no hay suerte: súbete a la valla a recuperar', 'A galope casi no gira: quiébrala al final'],
  },

  // Los modos (F5). Tiempos en s, distancias en m.
  partida: {
    salidaSiguienteS: 2.5,           // espera en el corral de la vaca siguiente
    // Vacas en la plaza, concurso: rondas con tiempo, cada una con su vaca; nota sobre 10
    concurso: { rondas: 3, rondaS: 60, notaDiez: 3000 },
    // Vacas en la calle: de una en una; además de los recortes, puntos por metros corridos delante
    calle: { vacas: 3, vacaS: 75, puntosPorMetro: 2, delanteHastaM: 14, correMs: 3 },
    // Encierro: la manada sale del corral, va al final de la calle y vuelve, dos veces, y entra al corral
    encierro: { vacas: 6, cadaS: 0.9, velocidadMs: 5.6, filaM: 2.3, ladoM: 0.9, margenFinalM: 8, vueltas: 2,
      puntosPorS: 12, delanteHastaM: 14, correMs: 3, liderDelanteM: 4, salidaJugadorM: 14,
      descuelga: { cadaS: [6, 14], duraS: [2, 4], metros: 6 } },
  },

  // Mozos (F6): gente del pueblo que corre delante de las vacas, las cita y se sube a la valla.
  // Cantidad por calidad; en la plaza, menos. Velocidades en m/s.
  mozos: {
    cantidad: { alto: 8, medio: 6, bajo: 3 },
    enPlaza: 0.6,
    andarMs: 1.3, troteMs: 3.4, correrMs: 6.4,
    giroRad: 9,
    radioM: 0.32,
    // Habilidad de cada mozo (0 a 1, al azar en este margen): a qué distancia reacciona a la embestida
    habilidad: [0.35, 0.95], reaccionaM: [3.2, 6.5],
    citaHastaM: 24, citaDistanciaM: [6.5, 10], citaS: [2.5, 6], citandoMax: 2, citaCadaS: [3, 10],
    vallaCercaM: 3.6,                // si la valla queda más cerca que esto al huir, se sube
    huyeS: 1.0,
    subidoMinS: 2.5, bajaSiVacaLejosM: 9,
    tendidoS: 1.3,                   // tras la cogida, en el suelo antes de levantarse
    // Encierro: corren delante de la manada a esta distancia y se apartan si se les echa encima
    encierro: { delanteM: [3.5, 10], apartarseM: 2.6, empiezanM: 26, bajanTrasM: 12, detrasM: 14 },
    // La vaca elige a quién se arranca: la distancia de cada uno por esto (el jugador, 1)
    preferenciaMozo: 1.35, preferenciaCitando: 0.7,
  },

  // Sonido (F6), sintetizado en sonido.js. Ganancias de 0 a 1
  sonido: {
    volumen: 0.8, murmullo: 0.32, ole: 0.85, aplauso: 0.55, uy: 0.75, cohete: 0.9,
    cencerro: 0.55, pezuna: 0.7, pisada: 0.22, golpe: 1.0,
    cencerros: [430, 515, 600, 690],  // tono (Hz) de cada cencerro: cada vaca, el suyo
    referenciaM: 4, caida: 1.3,       // a esta distancia suena entero; luego baja con la distancia
    pisadaCadaM: 1.15,               // un paso cada tantos metros (a la carrera, zancada más larga)
  },

  // Vibración de la valla al rematar la vaca (F6)
  vibracion: { radioM: 3.5, amplitudM: 0.07, hz: 6, amortigua: 5, duraS: 1.2 },

  // Cámara del personaje: detrás del hombro; V o 👁 cambia de vista
  camara: {
    vistas: [
      { nombre: 'hombro', distanciaM: 3.9, alturaM: 1.62, hombroM: 0.5 },
      { nombre: 'lejos', distanciaM: 7.0, alturaM: 1.9, hombroM: 0.0 },
      { nombre: 'ojos', distanciaM: 0, alturaM: 1.65, hombroM: 0 },
    ],
    fov: 66,
    cabeceo: [-0.55, 1.1],           // límites al mirar arriba y abajo (rad)
    cabeceoInicial: 0.2,
    distanciaMinimaM: 0.7,           // si una fachada tapa, se acerca hasta aquí
    margenM: 0.3,
    suavizado: 12,
    // Vaca más cercana (F3): si queda fuera de la vista y no se está moviendo la cámara, gira hacia ella
    vaca: { hastaM: 28, giroRad: 1.6, esperaS: 0.7, margenRad: 0.75 },
  },

  // Público (personas de MakeHuman en postura de quieto). Cantidad por calidad.
  publico: {
    // Cada persona son ~11 000 triángulos y una malla con esqueleto: en «bajo», pocas. Un
    // público lejano simplificado queda para la F8.
    cantidad: { alto: 70, medio: 40, bajo: 16 },
    // Reparto: fracción en el tablado y las gradas, en los balcones y el resto en las aceras
    enGradas: 0.3, enBalcones: 0.12,
    enValla: 0.1,                    // sentados encima de la valla de tablones de la plaza (F6)
    apoyados: 0.45,                  // de los de la primera fila, cuántos se apoyan en la valla
    // Reacciones (F6): cuántos reaccionan según la distancia al lance, y cuánto dura cada cosa (s)
    reaccion: { alcanceM: 60, retrasoS: 0.45, aplausoS: [2.2, 3.6], oleS: [1.6, 2.4], uyS: [1.4, 2.0], entraS: 0.22, saleS: 0.35,
      // De vez en cuando alguien aplaude por su cuenta (probabilidad por persona y segundo)
      espontaneo: 0.004 },
    animadosHastaM: 35,              // más lejos no se mueven los brazos (no se aprecia)
    // Sombra solo de los cercanos (F8): cada persona son ~11 000 triángulos y con sombra se dibuja
    // dos veces. Medido en la plaza (tools/mide_fiestas.mjs): el público era el 17 % de los
    // triángulos en «alto» y el 16 % en «bajo»
    sombraHastaM: { alto: 40, medio: 28, bajo: 18 },
    visibleHastaM: { alto: 95, medio: 70, bajo: 45 },
    separacionM: 0.62,
    semilla: 20261116,
    // Sentados (gradas y tablado): no hay animación de sentado todavía (F6), así que se doblan
    // los huesos de la postura de quieto: muslos hacia delante, piernas colgando y antebrazos
    // sobre los muslos
    sentado: { musloRad: 1.45, piernaRad: 0.12, antebrazoRad: 1.05, brazoRad: 0.18, caderaSobreAsientoM: 0.1 },
  },
};
