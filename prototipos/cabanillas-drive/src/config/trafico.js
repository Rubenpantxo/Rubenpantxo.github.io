// Parámetros del tráfico (src/juego/trafico.js). Ajustar aquí.
export const TRAFICO = {
  // Coches circulando a la vez según la calidad
  cantidad: { alto: 14, medio: 10, bajo: 6 },
  // Velocidad de crucero por tipo de vía OSM (las que no aparecen no tienen tráfico)
  velocidadKmh: {
    primary: 50, primary_link: 35, secondary: 45, tertiary: 40, unclassified: 35,
    residential: 30, living_street: 15,
  },
  // Distancia desde el eje de la calle al centro del coche (circulan por la derecha)
  desplazamientoM: { doble: 1.6, unico: 0.6 },
  aceleracion: 2.2,          // m/s²
  frenada: 5.5,              // m/s²
  velocidadGiroKmh: 14,      // en un giro de 90°
  anticipacionGiroM: 18,     // empieza a frenar antes del cruce
  distanciaSeguridadM: 6,    // hueco que deja con el de delante parado
  vistaDelanteM: 22,         // distancia a la que mira si hay alguien delante
  apareceEntreM: [110, 320], // aparecen a esta distancia del jugador…
  desapareceM: 380,          // …y se recolocan si se alejan más
  colores: [0xf2f2f0, 0xd9dadc, 0x9ea3a8, 0x4a4d52, 0x1d1f22, 0x8f1d1d, 0x1f3d6b, 0x6b7a3a, 0xc9b28a],
};
