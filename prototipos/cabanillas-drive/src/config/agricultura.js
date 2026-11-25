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
    // Aperos aparcados en el patio cuando no van en el tractor (a más de 9 m de cualquier edificio)
    sitiosAperos: { arado: [-299, -11, 180], cultivador: [-313, -6, 180], abonadora: [-292, -11, 180], sembradora: [-313, 3, 180] },
  },
  // Reloj agrícola (A6). Decisión de Rubén (2026-11-25): un día de cultivo dura una hora de juego
  // (con el juego en marcha, no en pausa). En la COPE se pueden pasar días; ?agricultura&dia=N
  // empieza en el día N.
  reloj: { segundosPorDia: 3600, diaInicial: 1, pasarDias: [1, 7, 30] },
  // Labranza (A4): rodadas del tractor, hierba y recuento
  labranza: {
    velocidadMinKmh: 1.0,     // por debajo, el apero bajado no labra (parado)
    refrescoHierbaS: 1.0,     // cada cuánto se quita la hierba 3D de lo recién labrado
    recuentoS: 0.5,           // cada cuánto se rehace el porcentaje del panel
    rodadas: 0.55,            // fuerza de las huellas de las ruedas traseras en tierra seca (0…1)
    rodadasApero: 0.35,       // las de las ruedas de la sembradora, más estrechas y ligeras
  },
  // Riego de la parcela de pruebas (Rubén, 2026-11-21, sobre la captura cope_y_parcelas_prueba.jpg):
  // la acequia corre por fuera de la linde sureste de la 2-700, de nordeste a suroeste, desde algo
  // más allá de la esquina este hasta el camino del norte de la COPE; el agua entra a la parcela por
  // esa linde, en su tramo del lado este (dos flechas). Coordenadas locales (x, z) medidas a mano
  // sobre la captura (±3 m): en A7 se afinan con la ortofoto y Rubén las confirma.
  // A7: la acequia afinada con la ortofoto y las boqueras están en config.json (agricultura.riego),
  // de donde tools/52_riego.py saca public/assets/agricultura/riego.json, que es lo que lee el juego
  // (con el modelo del agua: caudal, rozamiento, infiltración…). Aquí, lo del juego:
  riego: {
    ruta: 'assets/agricultura/riego.json',
    radioTajaderaM: 9,          // a esta distancia (del vehículo a la tajadera) se puede abrir o cerrar
    maxPasosPorFotograma: 16,   // pasos de la simulación por fotograma como mucho (si no da, el agua va más lenta)
    refrescoHumedadS: 0.3,      // cada cuánto se pasa al suelo lo que ha empapado el agua
    refrescoLaminaS: 0.06,      // cada cuánto se sube a la GPU la lámina de agua
    // Acequia: canal de hormigón estrecho sobre su cajero (lo que se ve en la ortofoto y el LiDAR)
    acequia: { anchoM: 0.5, paredM: 0.08, altoM: 0.42, laminaM: 0.3, pasoM: 1.0 },
    // Efecto en el tractor de la tierra mojada (0…1 de humedad por encima de lo de la lluvia)
    barro: { agarre: 0.35, frenoN: 2600, rodadas: 0.8 },
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
