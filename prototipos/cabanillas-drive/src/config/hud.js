// Parámetros del HUD (velocímetro, minimapa, brújula). Ajustar aquí.
export const HUD = {
  velocimetro: {
    maxKmh: 140,
    marcaCada: 10,          // rayitas
    numeroCada: 20,         // números
    barrido: 240,           // grados de la escala
    zonaRoja: 120,          // a partir de aquí la escala va en rojo (km/h)
  },
  minimapa: {
    pixelesPorMetro: 1.4,   // resolución del mapa precalculado
    radioVisibleM: 130,     // metros del centro al borde a poca velocidad…
    radioVisibleRapidoM: 230, // …y a 90 km/h o más (se aleja con la velocidad)
    giraConRumbo: true,     // true: el coche apunta siempre arriba; false: norte arriba (tecla M)
    colores: {
      fondo: '#d9cfb3',
      campo: '#cfc6a6',
      parque: '#a9c48a',
      agua: '#6fa6d6',
      edificio: '#8c7f70',
      edificioBorde: '#6f6458',
      calleBorde: '#7a7368',
      calle: '#fbfaf6',
      principal: '#ffd54a',
      camino: '#b3a582',
      jugador: '#e53935',
      trafico: '#2f80ed',
    },
  },
  brujula: {
    anchoGrados: 120,       // grados visibles en la franja
  },
};
