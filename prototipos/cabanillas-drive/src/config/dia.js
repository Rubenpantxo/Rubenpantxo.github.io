// Ciclo de día y noche. Ajustar aquí.
// El sol recorre el camino del día de la ortofoto: su declinación sale de assets/sol.json y la
// latitud de Cabanillas, así que a la «hora de la foto» queda donde estaba (y las sombras 3D
// siguen cayendo sobre las de la foto).
export const DIA = {
  latitudGrados: 42.03,
  longitudGrados: -1.52,
  husoHoras: 2,                 // hora de verano (el vuelo es de verano: sol a 65°)
  minutosPorDia: 24,            // en modo ciclo, un día dura 24 min (1 h de juego = 1 min)
  // Modos: hora de la foto fija, ciclo que avanza, o una hora fija (hora local)
  modos: {
    foto: { nombre: 'Hora de la foto' },
    ciclo: { nombre: 'Ciclo día y noche' },
    manana: { nombre: 'Mañana', hora: 9 },
    atardecer: { nombre: 'Atardecer', hora: 20.85 },
    noche: { nombre: 'Noche', hora: 0.5 },
  },
  modoInicial: 'foto',
  luna: { intensidad: 0.42, color: 0xa9bfff },
  // Luz de la ortofoto (terreno, tejados, impostores) de noche y su tono al atardecer
  fotoNoche: [0.05, 0.06, 0.1],
  tonoDorado: [1.0, 0.78, 0.6],
  nieblaNoche: [0.05, 0.04, 0.035],         // algo cálida: el resplandor de las luces del pueblo
  nieblaDorada: [0.78, 0.56, 0.44],
  hemisferioNoche: { cielo: 0x2a3b66, suelo: 0x2b2119, intensidad: 0.35 },   // suelo cálido: luz rebotada de las calles
  // Ventanas encendidas (decorativas): fracción según la hora [hora, fracción], en orden
  ventanas: {
    intensidad: 2.0,
    porHora: [[6, 0.16], [8, 0.0], [19, 0.0], [21, 0.36], [23, 0.3], [1.5, 0.1], [4, 0.05]],
  },
  estrellas: 1800,
  faros: { intensidad: 90, alcanceM: 70, anguloGrados: 34, penumbra: 0.55 },
};
