// Peatones (personas de MakeHuman, tools/build_personas.py) paseando por las aceras. Ajustar aquí.
// Las aceras son las mismas que dibuja el suelo (tools/11_suelo.py): franja de 1,8 m junto a la
// calzada de cada calle OSM, más las calles peatonales y sendas urbanas.
export const PEATONES = {
  activo: true,
  cantidad: { alto: 45, medio: 30, bajo: 12 },
  variantes: { alto: 12, medio: 12, bajo: 6 },   // personas distintas que se cargan
  animacionCercaM: 50,                           // más lejos, la animación se actualiza 1 de cada 3 fotogramas
  visibleHastaM: { alto: 110, medio: 85, bajo: 60 },   // más lejos se simulan pero no se dibujan
  sombraHastaM: 45,
  // De noche sale menos gente (fracción de la cantidad con oscuridad total)
  fraccionNoche: 0.3,
  apareceEntreM: [30, 115],     // distancia al jugador al aparecer
  desapareceM: 140,
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
