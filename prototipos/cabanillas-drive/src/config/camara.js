// Cámaras del coche. Distancias en metros respecto al coche (Z = adelante).
export const CAMARA = {
  persecucion: {
    detras: 7.2,
    altura: 2.7,
    mirarAdelante: 3.0,
    alturaMirada: 1.1,
    suavizadoPosicion: 5.0,   // más alto = sigue más pegada
    suavizadoMirada: 9.0,
    distanciaMinima: 2.0,     // si un edificio tapa, se acerca hasta aquí
    fov: 62,
  },
  capo: {
    posicion: [0, 0.78, 0.55],
    mirarAdelante: 20,
    fov: 70,
  },
};

export const CONTROLES = {
  teclas: {
    acelerar: ['KeyW', 'ArrowUp'],
    frenar: ['KeyS', 'ArrowDown'],
    izquierda: ['KeyA', 'ArrowLeft'],
    derecha: ['KeyD', 'ArrowRight'],
    frenoMano: ['Space'],
    reiniciar: ['KeyR'],
    camara: ['KeyC'],
    bajar: ['KeyE', 'KeyF'],          // bajarse del coche / volver a subir
    correr: ['ShiftLeft', 'ShiftRight'],
    hora: ['KeyT'],                   // adelantar una hora
  },
  joystick: {
    radio: 60,                // px de recorrido del mando
    zonaMuerta: 0.08,
  },
};
