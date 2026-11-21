// Modo agricultura (PLAN_AGRICULTURA.md). Parámetros ajustables: parcelas, máscaras de estado,
// malla sobre el terreno y pincel de depuración. Se activa en el juego publicado cuando A9 esté
// aprobada; mientras, solo con ?agricultura.
export const AGRICULTURA = {
  activo: false,
  rutaParcelas: 'assets/agricultura/parcelas.json',
  // Parcela de pruebas elegida por Rubén (2026-11-20): 2-700, 0,44 ha de regadío al norte de la COPE
  parcelaPruebas: '2-700',

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
