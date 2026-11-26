// Reportes de los jugadores (fallos e ideas): se envían por Web3Forms al correo de Rubén.
// La clave es pública por diseño (va en el HTML de la web igual que la del formulario de
// servicios). Si se crea una clave solo para el juego en web3forms.com, basta cambiarla aquí.
export const REPORTES = {
  url: 'https://api.web3forms.com/submit',
  claveWeb3Forms: 'b8e6ddd6-0aaf-4a87-9718-bd971f811088',
  // Las mismas secciones que la pizarra de errores
  categorias: [
    'Agricultura',
    'Movimiento del personaje',
    'Casas: fidelidad con la realidad',
    'Vehículos de las calles',
    'Fiestas',
    'Cesta punta (frontón)',
    'Ideas nuevas y añadidos',
    'Otra cosa',
  ],
  tipos: { fallo: 'Fallo', idea: 'Idea o mejora' },
  descripcionMin: 15,          // caracteres: que cuente algo, aunque sea poco
  descripcionMax: 2000,
  tiempoMinimoMs: 3000,        // un bot rellena y envía en milisegundos
};
