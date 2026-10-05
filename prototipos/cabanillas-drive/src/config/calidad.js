// Parámetros de calidad de render. Ajustar aquí, no en el código de la escena.
// Nivel: ?calidad=alto|medio|bajo; si no se indica, «bajo» en móvil y «alto» en escritorio.
export const NIVELES = {
  alto: {
    pixelRatioMax: 1.5,
    sombras: true, mapaSombras: 4096, radioSombras: 110,
    ao: true, aoMediaResolucion: false,
    distanciaArbolesDetalle: 110, radioHierba: 70,
    detalleSuelo: true,
  },
  medio: {
    pixelRatioMax: 1.25,
    sombras: true, mapaSombras: 2048, radioSombras: 80,
    ao: true, aoMediaResolucion: true,
    distanciaArbolesDetalle: 90, radioHierba: 55,
    detalleSuelo: true,
  },
  bajo: {
    pixelRatioMax: 1,
    sombras: true, mapaSombras: 1024, radioSombras: 50,
    ao: false, aoMediaResolucion: true,
    distanciaArbolesDetalle: 55, radioHierba: 30,
    detalleSuelo: false,
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
  // Planos de recorte de la cámara, en metros
  camaraCerca: 0.5,
  camaraLejos: 6000,
};
