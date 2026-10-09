// Fachadas reales, a mano, por id de edificio del Catastro (buildings.geojson). Lo que no se pone
// lo sigue decidiendo el generador (fachadas.glsl.js) con la semilla de la casa.
//   estilo: enfoscado | ladrillo | piedra   color: color de la fachada (#rrggbb)
//   zocalo: color del zócalo (#rrggbb) y altoZocalo (m)
//   balcones: balcón de forja en cada hueco de las plantas altas que dan a la calle
//   rejas: reja en las ventanas de la planta baja que da a la calle
//   fuente: de dónde sale (las fotos de Mapillary son CC-BY-SA 4.0: se cita autor e imagen)
//
// Prueba: calle Ramón y Cajal (carretera Tudela–Tauste), acera norte, mirando al oeste.
// Imagen de Mapillary 532346855555160, de avaldeon (25-02-2023). La correspondencia foto–edificio
// sale de la posición de la imagen (±5 m): revisarla en el juego.
export const FACHADAS_REALES = {
  999: { estilo: 'enfoscado', color: '#f1eee6', zocalo: '#b9a587', altoZocalo: 0.9, balcones: true, rejas: true,
    fuente: 'Mapillary 532346855555160 (avaldeon, CC-BY-SA 4.0)' },
  754: { estilo: 'enfoscado', color: '#efebe2', zocalo: '#8a4b3b', altoZocalo: 1.0, balcones: true, rejas: true,
    fuente: 'Mapillary 532346855555160 (avaldeon, CC-BY-SA 4.0)' },
  957: { estilo: 'enfoscado', color: '#e3c27e', zocalo: '#9a6a4a', altoZocalo: 0.8, balcones: true, rejas: true,
    fuente: 'Mapillary 532346855555160 (avaldeon, CC-BY-SA 4.0)' },
  642: { estilo: 'enfoscado', color: '#e6b866', zocalo: '#8f6a52', altoZocalo: 0.8, balcones: true, rejas: false,
    fuente: 'Mapillary 532346855555160 (avaldeon, CC-BY-SA 4.0)' },
};
