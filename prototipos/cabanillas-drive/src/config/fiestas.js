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

  // Tablado y gradas: filas de asientos que suben desde el frente
  gradas: { filaFondoM: 0.75, contrahuellaM: 0.4, primeraM: 0.9, barandillaM: 1.0 },

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

  // Público (personas de MakeHuman en postura de quieto). Cantidad por calidad.
  publico: {
    cantidad: { alto: 80, medio: 50, bajo: 22 },
    // Reparto: fracción en el tablado y las gradas, en los balcones y el resto en las aceras
    enGradas: 0.3, enBalcones: 0.12,
    visibleHastaM: { alto: 95, medio: 75, bajo: 55 },
    separacionM: 0.62,
    semilla: 20261116,
  },
};
