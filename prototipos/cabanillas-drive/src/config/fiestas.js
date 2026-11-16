// Parámetros del modo fiestas (PLAN_FIESTAS.md). Ajustar aquí. Las posiciones (recinto, vallas,
// tablado, corral…) están en src/datos/fiestas.js.
// Las medidas de las vallas salen de las fotos de Rubén tomando como escala a las personas
// (docs/fiestas/README.md): son aproximadas.
export const FIESTAS = {
  // Dónde aparece el jugador al entrar, según el modo (?fiestas=plaza|calle|encierro)
  modos: ['plaza', 'calle', 'encierro'],
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
    correr: { inclinacionRad: 0.3, codoRad: 1.25, zancadaMax: 1.9 },
  },

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
    visibleHastaM: { alto: 95, medio: 70, bajo: 45 },
    separacionM: 0.62,
    semilla: 20261116,
    // Sentados (gradas y tablado): no hay animación de sentado todavía (F6), así que se doblan
    // los huesos de la postura de quieto: muslos hacia delante, piernas colgando y antebrazos
    // sobre los muslos
    sentado: { musloRad: 1.45, piernaRad: 0.12, antebrazoRad: 1.05, brazoRad: 0.18, caderaSobreAsientoM: 0.1 },
  },
};
