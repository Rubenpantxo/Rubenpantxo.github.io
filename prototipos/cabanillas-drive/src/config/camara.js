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
    entrar: ['KeyE'],                 // en un punto de entrada (fiestas, frontón…): entrar
    apero: ['KeyQ'],                  // modo agricultura: bajar y subir el apero del tractor
    tajadera: ['KeyG'],               // modo agricultura: abrir o cerrar la tajadera de una boquera (riego)
    descargar: ['KeyX'],              // modo agricultura: sacar o recoger el tubo de descarga de la cosechadora
  },
  // Modo fiestas (PLAN_FIESTAS.md §4b): mismas teclas de movimiento (WASD y Mayús) y estas acciones.
  // E, F y Espacio dejan de ser «bajarse» y «freno de mano» mientras dura el modo.
  teclasFiestas: {
    quiebro: ['KeyQ'],
    recorte: ['KeyE'],
    salto: ['Space'],
    refugio: ['KeyF'],                // subir a la valla o meterse en el burladero, y bajar
    camaraFiestas: ['KeyV'],
    sonido: ['KeyM'],                 // quitar y poner el sonido (en fiestas, M no gira el minimapa)
  },
  // Salto en paracaídas (PLAN_SALTO.md): mientras dura, Espacio no es el freno de mano.
  // W picar / adelantar, S frenar, A y D girar (son las mismas teclas de siempre)
  teclasSalto: {
    paracaidas: ['Space'],            // saltar del avión y, en la caída, abrir el paracaídas
    sonido: ['KeyM'],                 // quitar y poner el sonido (en el salto, M no gira el minimapa)
  },
  joystick: {
    radio: 60,                // px de recorrido del mando
    zonaMuerta: 0.08,
  },
};
