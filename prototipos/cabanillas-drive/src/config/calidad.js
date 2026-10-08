// Parámetros de calidad de render. Ajustar aquí, no en el código de la escena.
// Nivel: ?calidad=alto|medio|bajo; si no se indica, «bajo» en móvil y «alto» en escritorio.
export const NIVELES = {
  alto: {
    pixelRatioMax: 1.5,
    sombras: true, mapaSombras: 4096, radioSombras: 110,
    ao: true, aoMediaResolucion: false,
    distanciaArbolesDetalle: 110, radioHierba: 70,
    detalleSuelo: true,
    // Coches aparcados: modelo completo / versión ligera / coche genérico hasta el máximo
    distanciaCochesDetalle: 70, distanciaCochesLejos: 180, distanciaCochesMax: 900,
    // Edificios con tejado del LiDAR hasta esta distancia (más lejos, techo plano)
    distanciaEdificiosDetalle: 700, sombrasEdificios: true, unirMaterialesCoche: false,
    terreno: 'assets/cabanillas.glb', atlasTejados: 'assets/tejados.jpg',
    // Cielo fotográfico: ancho máximo del fondo y de la imagen de la que salen los reflejos
    // (con 4096 px los reflejos ocupan ~200 MB de memoria gráfica; con 2048, ~50 MB)
    cielo: { anchoFondo: 4096, anchoReflejos: 2048 },
    niebla: null, camaraLejos: 6000,
    // Descarga aproximada (MB): la barra de carga no baja de aquí hasta conocer los tamaños reales
    descargaEstimadaMB: 22,
    // Resolución dinámica: si los FPS caen del objetivo, baja la resolución interna (hasta el mínimo)
    resolucionDinamica: { objetivoFps: 45, minimo: 0.75 },
  },
  medio: {
    pixelRatioMax: 1.25,
    sombras: true, mapaSombras: 2048, radioSombras: 80,
    ao: true, aoMediaResolucion: true,
    distanciaArbolesDetalle: 90, radioHierba: 55,
    detalleSuelo: true,
    distanciaCochesDetalle: 55, distanciaCochesLejos: 120, distanciaCochesMax: 600,
    distanciaEdificiosDetalle: 400, sombrasEdificios: true, unirMaterialesCoche: false,
    terreno: 'assets/cabanillas.glb', atlasTejados: 'assets/tejados.jpg',
    cielo: { anchoFondo: 4096, anchoReflejos: 1024 },
    niebla: null, camaraLejos: 6000, descargaEstimadaMB: 22,
    resolucionDinamica: { objetivoFps: 35, minimo: 0.7 },
  },
  // Móvil: terreno simplificado con ortofoto a 768 px, atlas de tejados a la mitad, niebla
  // más cercana (recorta lo lejano) y sin versión intermedia de los coches
  bajo: {
    pixelRatioMax: 1,
    sombras: true, mapaSombras: 1024, radioSombras: 50,
    ao: false, aoMediaResolucion: true,
    distanciaArbolesDetalle: 55, radioHierba: 30,
    detalleSuelo: false,
    distanciaCochesDetalle: 40, distanciaCochesLejos: 0, distanciaCochesMax: 350,
    // Las sombras de los edificios ya están pintadas en la ortofoto (mismo sol): en móvil no se
    // calculan; y el coche del jugador agrupa sus materiales (menos llamadas de dibujo)
    distanciaEdificiosDetalle: 160, sombrasEdificios: false, unirMaterialesCoche: true,
    terreno: 'assets/cabanillas_bajo.glb', atlasTejados: 'assets/tejados_bajo.jpg',
    // Sin esto el móvil se queda sin memoria gráfica y la vista 3D sale en blanco
    cielo: { anchoFondo: 1024, anchoReflejos: 512 },
    // Texturas de coches, personas y árboles reducidas a este lado máximo (px)
    texturaMax: 512,
    niebla: { cerca: 450, lejos: 1300 }, camaraLejos: 1400, descargaEstimadaMB: 13,
    resolucionDinamica: { objetivoFps: 30, minimo: 0.6 },
  },
};

function eligeNivel() {
  const pedido = new URLSearchParams(location.search).get('calidad');
  if (pedido in NIVELES) return pedido;
  const movil = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  return movil ? 'bajo' : 'alto';
}

const nivel = eligeNivel();

export const CALIDAD = {
  nivel,
  ...NIVELES[nivel],
  antialias: true,
  // Obstáculos fijos activos alrededor del coche (src/fisica/fisica.js)
  radioColisiones: 45,
  camaraCerca: 0.5,
};
