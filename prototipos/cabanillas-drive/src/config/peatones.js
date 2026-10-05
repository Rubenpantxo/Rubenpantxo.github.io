// Peatones (figuras genéricas) paseando por las aceras. Ajustar aquí.
// Las aceras son las mismas que dibuja el suelo (tools/11_suelo.py): franja de 1,8 m junto a la
// calzada de cada calle OSM, más las calles peatonales y sendas urbanas.
export const PEATONES = {
  cantidad: { alto: 60, medio: 40, bajo: 16 },
  // De noche sale menos gente (fracción de la cantidad con oscuridad total)
  fraccionNoche: 0.3,
  apareceEntreM: [35, 170],     // distancia al jugador al aparecer
  desapareceM: 210,
  velocidadMs: [1.0, 1.5],
  // Media calzada por tipo de vía (igual que tools/08_arboles.py y 11_suelo.py) + media acera
  mediaCalzadaM: { primary: 4.0, secondary: 4.0, tertiary: 3.5, residential: 3.0, unclassified: 3.0,
    living_street: 2.5, service: 2.2, pedestrian: 0.0 },
  mediaAceraM: 0.9,
  // Sendas peatonales de caminos.geojson (por el centro)
  sendas: ['footway', 'pedestrian', 'steps'],
  // Una calle solo tiene peatones si hay edificios a menos de esta distancia (casco urbano)
  edificioCercaM: 22,
  // Reacción a los coches: se apartan si uno se acerca rápido
  apartarseM: 3.0,
  distanciaCocheM: 9,
};
