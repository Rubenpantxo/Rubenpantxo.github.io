// Modo agricultura (PLAN_AGRICULTURA.md). Parámetros ajustables: parcelas, máscaras de estado,
// malla sobre el terreno y pincel de depuración. Se activa en el juego publicado cuando A9 esté
// aprobada; mientras, solo con ?agricultura.
export const AGRICULTURA = {
  activo: false,
  rutaParcelas: 'assets/agricultura/parcelas.json',
  // Parcela de pruebas elegida por Rubén (2026-11-20): 2-700, 0,44 ha de regadío al norte de la COPE
  parcelaPruebas: '2-700',
  // COPE (Sociedad Cooperativa del Campo San Isidro, parcela urbana 2-1031): sitios del patio, entre
  // la fachada sur de la nave (z ≈ −24) y la calle San Isidro, lejos de las casetas. [x, z, rumbo°]
  // (0 = norte, 90 = este). El aro de entrada está en src/config/entradas.js
  cope: {
    sitioTractor: [-306, -10, 180],     // mirando a la calle
    sitioCoche: [-291, -4, 180],
  },
  // Riego de la parcela de pruebas (Rubén, 2026-11-21, sobre la captura cope_y_parcelas_prueba.jpg):
  // la acequia corre por fuera de la linde sureste de la 2-700, de nordeste a suroeste, desde algo
  // más allá de la esquina este hasta el camino del norte de la COPE; el agua entra a la parcela por
  // esa linde, en su tramo del lado este (dos flechas). Coordenadas locales (x, z) medidas a mano
  // sobre la captura (±3 m): en A7 se afinan con la ortofoto y Rubén las confirma.
  riegoPruebas: {
    acequia: [[-217.8, -266.3], [-242.2, -228.4], [-287.8, -145.1]],
    boqueras: [[-230.2, -252.6], [-235.3, -244.6]],   // en la linde sureste (a 30 % y 55 % desde la esquina este)
  },

  // Máscaras de estado de cada parcela activa (A, laboreo; B, cultivo): metros por píxel según la
  // calidad y lado máximo de la textura. Si la parcela no cabe, se usan píxeles más grandes.
  mascara: {
    // 0,5 m también en «bajo»: las rodadas (45 cm) y las lindes necesitan ese detalle. En baja,
    // las parcelas grandes llegan antes al tope y tienen el píxel mayor
    metrosPorPixel: { alto: 0.5, medio: 0.5, bajo: 0.5 },
    ladoMax: { alto: 1024, medio: 1024, bajo: 512 },
    margenM: 1.5,             // alrededor de la caja de la parcela (para el fundido de la linde)
  },
  // Malla que se apoya en el terreno
  malla: {
    pasoM: 1.0,               // rejilla de 1 m (2 m si la parcela pasa de pasoGrandeDesdeM de lado)
    pasoGrandeM: 2.0,
    pasoGrandeDesdeM: 400,
    alturaSobreSueloM: 0.03,
  },
  fundidoLindeM: 0.8,         // la linde funde con la ortofoto en estos metros hacia dentro
  subidasPorSegundo: 10,      // como mucho, veces por segundo que las máscaras se suben a la GPU

  // Pincel de depuración (?agricultura&pincel)
  pincel: {
    anchoInicialM: 3,
    anchoMinM: 0.5,
    anchoMaxM: 12,
    bordeSuaveM: 0.2,         // el trazo se difumina en este borde
    anchoRodadaM: 0.5,        // cada huella de rueda
    viaRodadasM: 1.8,         // separación entre las dos huellas (vía del tractor)
    camara: { distanciaInicialM: 70, alturaInicialM: 40, distanciaMinM: 3, distanciaMaxM: 400 },
  },
};

// Labores que entiende el pincel (las mismas que harán los aperos). El orden es el del panel.
export const LABORES = [
  { id: 'rastrojo', icono: '🌾', nombre: 'Rastrojo' },
  { id: 'arar', icono: '🟫', nombre: 'Arar' },
  { id: 'gradear', icono: '〰️', nombre: 'Gradear' },
  { id: 'abonar', icono: '⚪', nombre: 'Abonar' },
  { id: 'sembrar', icono: '🌱', nombre: 'Sembrar' },
  { id: 'regar', icono: '💧', nombre: 'Regar' },
  { id: 'cosechar', icono: '✂️', nombre: 'Cosechar' },
  { id: 'rodar', icono: '🛞', nombre: 'Rodadas' },
];

// ¿Está el modo agricultura? En el juego publicado, cuando AGRICULTURA.activo; mientras, con ?agricultura
export function agriculturaActiva() {
  if (AGRICULTURA.activo) return true;
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('agricultura');
}
