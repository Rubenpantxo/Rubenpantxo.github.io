// Parámetros del modo a pie (src/juego/peaton.js). Ajustar aquí.
export const PEATON = {
  altoM: 1.75,
  radioM: 0.3,
  ojosM: 1.65,              // altura de los ojos sobre el suelo
  escalonM: 0.35,           // sube bordillos y escalones de hasta esta altura
  andarMs: 2.0,             // algo más rápido que un paseo real (≈1,4 m/s): el pueblo es grande
  correrMs: 5.5,
  sensibilidad: 0.0024,     // radianes por píxel de ratón o de dedo
  giroTeclasRad: 2.2,       // giro con las flechas, rad/s
  fov: 70,
  distanciaSubirM: 3.5,     // para volver a subir al coche
  velocidadBajarKmh: 8,     // solo se baja con el coche casi parado
};
