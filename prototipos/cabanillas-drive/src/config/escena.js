// Parámetros de la escena y del visor de comprobación. Ajustar aquí.
export const ESCENA = {
  rutaGlb: 'assets/cabanillas.glb',
  rutaTerreno: 'assets/terrain/',
  rutaCalles: 'assets/osm/calles.geojson',
  rutaOrto: 'assets/orto/orto.json',
  rutaEdificios: 'assets/buildings.geojson',
  rutaAspecto: 'assets/edificios_aspecto.json',
  rutaAtlasTejados: 'assets/tejados.jpg',
  rutaTejados: 'assets/',
  rutaCoches: 'assets/coches/',
  rutaCochesAparcados: 'assets/coches_aparcados.json',
  rutaArboles: 'assets/arboles.json',
  rutaModelosArboles: 'assets/arboles/',
  rutaVegetacion: 'assets/vegetacion/',
  // Coches aparcados: a menos de esta distancia de la cámara se dibuja el modelo detallado
  distanciaCochesDetalle: 70,
  segundosRepartoCoches: 0.25,
  // Árboles: a menos de esta distancia, modelo 3D; más lejos, impostor (tarjeta)
  distanciaArbolesDetalle: 90,
  // Césped y rastrojo en 3D solo hasta esta distancia de la cámara
  radioHierba: 60,

  // La ortofoto ya trae la luz del día en que se tomó: sin iluminación se ve como la foto
  terrenoSinLuz: true,
  tejadosSinLuz: true,

  // Líneas de calles OSM sobre el terreno (comprobación de alineación)
  calles: { color: 0xffe000, alturaSobreSuelo: 0.6, pasoMaxM: 2 },

  // Comprobación GLB ↔ terrain.f32 (puntos aleatorios)
  puntosComprobacion: 300,

  niebla: { color: 0xc9d6e3, cerca: 1200, lejos: 4000 },
  camara: { fov: 55, posicion: [-420, 320, 520], objetivo: [0, 10, 0], distanciaMax: 2500 },
  sol: { elevacionGrados: 40, azimutGrados: 210, intensidad: 2.2 },
};
