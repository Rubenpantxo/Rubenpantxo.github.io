// Parámetros de calidad de render. Ajustar aquí, no en el código de la escena.
export const CALIDAD = {
  // Límite del devicePixelRatio (en móvil, más de 1,5 cuesta mucho y apenas se nota)
  pixelRatioMax: 1.5,
  antialias: true,
  sombras: true,
  tamanoMapaSombras: 2048,
  // Planos de recorte de la cámara, en metros
  camaraCerca: 0.5,
  camaraLejos: 5000,
};
