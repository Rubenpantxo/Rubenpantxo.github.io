// Fachadas reales, a mano, por id de edificio del Catastro (buildings.geojson). Lo que no se pone
// lo sigue decidiendo el generador (fachadas.glsl.js) con la semilla de la casa.
//   estilo: enfoscado | ladrillo | piedra   color: color de la fachada (#rrggbb)
//   zocalo: color del zócalo (#rrggbb) y altoZocalo (m); en las casas con la planta baja revestida
//           de otro color, el «zócalo» sube hasta el forjado (~2,6-2,8 m)
//   balcones: balcón de forja en cada hueco de las plantas altas que dan a la calle
//   rejas: reja en las ventanas de la planta baja que da a la calle
//   fuente: de dónde sale (las fotos de Mapillary son CC-BY-SA 4.0: se cita autor e imagen)
//
// Carretera Tudela–Tauste / calle Ramón y Cajal (NA-126): la única calle de Cabanillas con fotos en
// Mapillary. Secuencia de avaldeon del 25-02-2023, de este a oeste: la acera norte se ve de cerca
// y la sur solo de lejos, así que del sur van pocas casas. Las fotos se casan con los edificios
// por orden a lo largo de la calle entre cruces (el GPS de la secuencia va unos 20 m adelantado):
// alguna puede estar corrida una casa. Si se ve mal en el juego, corregir aquí.
const F = (img) => `Mapillary ${img} (avaldeon, CC-BY-SA 4.0)`;

export const FACHADAS_REALES = {
  // --- Acera norte, de este (Príncipe de Viana) a oeste
  586: { estilo: 'enfoscado', color: '#d9cba8', zocalo: '#9d8a6a', altoZocalo: 1.0, balcones: false, rejas: true, fuente: F('716255369964512') },
  590: { estilo: 'enfoscado', color: '#ddd0b2', balcones: false, rejas: false, fuente: F('734462785070349') },
  981: { estilo: 'ladrillo', color: '#c9a274', balcones: true, rejas: false, fuente: F('152418540971117') },
  1010: { estilo: 'enfoscado', color: '#ece2c8', zocalo: '#bfa47e', altoZocalo: 1.0, balcones: false, rejas: false, fuente: F('754571649698316') },
  920: { estilo: 'enfoscado', color: '#f0ede6', zocalo: '#c9a48e', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('856128275453735') },
  955: { estilo: 'ladrillo', color: '#a8664a', balcones: false, rejas: false, fuente: F('590503026265886') },
  935: { estilo: 'enfoscado', color: '#eadfc4', zocalo: '#7d3a33', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('2554744061359880') },
  665: { estilo: 'piedra', color: '#cdb994', balcones: true, rejas: true, fuente: F('2554744061359880') },
  727: { estilo: 'ladrillo', color: '#d0ab78', zocalo: '#7a2f2a', altoZocalo: 1.2, balcones: true, rejas: false, fuente: F('503684298595037') },
  588: { estilo: 'enfoscado', color: '#e8dcc0', balcones: true, rejas: true, fuente: F('1554262868387582') },
  926: { estilo: 'piedra', color: '#c9b48e', balcones: false, rejas: true, fuente: F('1554262868387582') },
  733: { estilo: 'enfoscado', color: '#f2f1ec', zocalo: '#4a4a4a', altoZocalo: 1.0, balcones: false, rejas: false, fuente: F('776326156703741') },
  664: { estilo: 'ladrillo', color: '#c99b62', zocalo: '#6b4a35', altoZocalo: 0.9, balcones: false, rejas: false, fuente: F('917756256023178') },
  968: { estilo: 'enfoscado', color: '#f3f2ee', zocalo: '#3f3f40', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('1925260914481336') },
  707: { estilo: 'ladrillo', color: '#cfa36a', balcones: true, rejas: false, fuente: F('152892187255136') },
  // calle las Eras
  704: { estilo: 'piedra', color: '#cfbb98', balcones: true, rejas: true, fuente: F('492887913053848') },
  714: { estilo: 'enfoscado', color: '#efe4c9', zocalo: '#b88f6a', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('1191297761519984') },
  843: { estilo: 'enfoscado', color: '#efeadc', zocalo: '#c8b08a', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('1531933777298807') },
  837: { estilo: 'enfoscado', color: '#d9dad6', balcones: false, rejas: false, fuente: F('920964562690723') },
  1064: { estilo: 'ladrillo', color: '#c68e5c', zocalo: '#e9e6dc', altoZocalo: 0.8, balcones: true, rejas: false, fuente: F('920964562690723') },
  615: { estilo: 'enfoscado', color: '#eee1a8', zocalo: '#c9b48c', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('935264184140167') },
  916: { estilo: 'enfoscado', color: '#ecdea2', zocalo: '#c9b48c', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('935264184140167') },
  647: { estilo: 'enfoscado', color: '#efe3ad', zocalo: '#c9b48c', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('935264184140167') },
  769: { estilo: 'enfoscado', color: '#f1efe9', zocalo: '#a9b3b8', altoZocalo: 1.0, balcones: true, rejas: true, fuente: F('1275300330001860') },
  1157: { estilo: 'enfoscado', color: '#e3a08f', balcones: true, rejas: false, fuente: F('751229776266184') },
  610: { estilo: 'ladrillo', color: '#d7b98c', zocalo: '#4e3527', altoZocalo: 2.6, balcones: false, rejas: false, fuente: F('868631797580066') },
  // calle la Vicera
  1662: { estilo: 'enfoscado', color: '#dcb779', balcones: false, rejas: false, fuente: F('732578035252740') },
  632: { estilo: 'enfoscado', color: '#f2f0ea', zocalo: '#c9b38c', altoZocalo: 0.6, balcones: false, rejas: true, fuente: F('182867504477692') },
  945: { estilo: 'enfoscado', color: '#e2cfa2', zocalo: '#b0584a', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('164072869347290') },
  1141: { estilo: 'enfoscado', color: '#f1efe8', zocalo: '#c5ad86', altoZocalo: 1.5, balcones: true, rejas: false, fuente: F('158596470323382') },
  999: { estilo: 'enfoscado', color: '#f1eee6', zocalo: '#b9a587', altoZocalo: 0.9, balcones: true, rejas: true, fuente: F('532346855555160') },
  754: { estilo: 'enfoscado', color: '#efebe2', zocalo: '#8a4b3b', altoZocalo: 1.0, balcones: true, rejas: true, fuente: F('532346855555160') },
  957: { estilo: 'ladrillo', color: '#cfab7b', balcones: true, rejas: true, fuente: F('2031212830382578') },
  642: { estilo: 'enfoscado', color: '#e3b55e', zocalo: '#6a2b28', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('1242287679970995') },
  907: { estilo: 'ladrillo', color: '#d2b183', balcones: true, rejas: true, fuente: F('3005923683035129') },
  972: { estilo: 'ladrillo', color: '#cfae80', balcones: true, rejas: true, fuente: F('3005923683035129') },
  1033: { estilo: 'enfoscado', color: '#e6be66', zocalo: '#c6ae86', altoZocalo: 1.2, balcones: true, rejas: true, fuente: F('232680852522464') },
  775: { estilo: 'ladrillo', color: '#d9c29a', zocalo: '#cfc3a8', altoZocalo: 1.2, balcones: false, rejas: false, fuente: F('524922046461281') },
  // calle Bardenas Reales
  938: { estilo: 'enfoscado', color: '#f0ede4', zocalo: '#d1b88f', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('875043370388843') },
  1088: { estilo: 'enfoscado', color: '#e2a9a0', zocalo: '#9b9a96', altoZocalo: 0.8, balcones: false, rejas: false, fuente: F('155283890663275') },
  781: { estilo: 'enfoscado', color: '#ece2c6', zocalo: '#7f8a7c', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('788175949548114') },
  1143: { estilo: 'piedra', color: '#d0bf9d', balcones: true, rejas: false, fuente: F('788175949548114') },
  928: { estilo: 'enfoscado', color: '#f2f2ef', zocalo: '#4b4c4e', altoZocalo: 2.8, balcones: false, rejas: false, fuente: F('602994871675505') },
  628: { estilo: 'enfoscado', color: '#e6b596', balcones: true, rejas: false, fuente: F('208154495064094') },
  992: { estilo: 'enfoscado', color: '#ece0bd', zocalo: '#8f3427', altoZocalo: 1.2, balcones: true, rejas: false, fuente: F('605294404773835') },
  1015: { estilo: 'ladrillo', color: '#a2533a', balcones: false, rejas: false, fuente: F('607963613996181') },
  640: { estilo: 'enfoscado', color: '#e5bb52', zocalo: '#f0eee8', altoZocalo: 2.8, balcones: true, rejas: false, fuente: F('6192117027506260') },
  898: { estilo: 'ladrillo', color: '#d4b07c', balcones: true, rejas: true, fuente: F('609198394554842') },
  980: { estilo: 'enfoscado', color: '#efece4', zocalo: '#d8c8a8', altoZocalo: 0.9, balcones: true, rejas: false, fuente: F('1878320472547649') },
  688: { estilo: 'enfoscado', color: '#eeebe2', balcones: true, rejas: false, fuente: F('1314983002401757') },
  // calle Gustavo Adolfo Bécquer
  1109: { estilo: 'enfoscado', color: '#e2cc9c', zocalo: '#a98763', altoZocalo: 1.2, balcones: true, rejas: false, fuente: F('754870889334348') },
  1173: { estilo: 'enfoscado', color: '#f0eee8', zocalo: '#a8473a', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('8742674202472715') },
  1242: { estilo: 'enfoscado', color: '#efe5cf', zocalo: '#a85a45', altoZocalo: 0.8, balcones: false, rejas: false, fuente: F('1268023514150065') },
  952: { estilo: 'piedra', color: '#cbb690', balcones: false, rejas: false, fuente: F('216141824253120') },
  956: { estilo: 'enfoscado', color: '#e8dcbf', zocalo: '#8a5a3c', altoZocalo: 1.0, balcones: true, rejas: false, fuente: F('782892950104838') },
  743: { estilo: 'enfoscado', color: '#e2d4b4', zocalo: '#a99d88', altoZocalo: 1.5, balcones: true, rejas: true, fuente: F('181409241263960') },
  1003: { estilo: 'enfoscado', color: '#f1f0eb', zocalo: '#555657', altoZocalo: 1.5, balcones: true, rejas: false, fuente: F('703740591443270') },
  1305: { estilo: 'enfoscado', color: '#e9e7e0', balcones: false, rejas: false, fuente: F('1561326781041775') },
  // calle Fueros de Navarra
  1401: { estilo: 'enfoscado', color: '#f3f3f0', zocalo: '#cdbb98', altoZocalo: 0.8, balcones: false, rejas: false, fuente: F('1233811074203421') },
  1343: { estilo: 'enfoscado', color: '#d4c6a6', balcones: false, rejas: false, fuente: F('1035625634079105') },
  943: { estilo: 'piedra', color: '#a99a80', balcones: false, rejas: false, fuente: F('3354166664795552') },
  725: { estilo: 'enfoscado', color: '#efeee9', zocalo: '#9b9b98', altoZocalo: 1.0, balcones: false, rejas: false, fuente: F('3354166664795552') },
  931: { estilo: 'enfoscado', color: '#8e2f2b', zocalo: '#d8c4a0', altoZocalo: 0.6, balcones: false, rejas: false, fuente: F('512338127712453') },
  599: { estilo: 'enfoscado', color: '#e8d9b4', zocalo: '#4d3b2e', altoZocalo: 1.3, balcones: false, rejas: false, fuente: F('5953425374740296') },
  845: { estilo: 'ladrillo', color: '#c99a6c', zocalo: '#9b9b98', altoZocalo: 0.6, balcones: false, rejas: false, fuente: F('571332741691429') },
  932: { estilo: 'enfoscado', color: '#efeee9', balcones: false, rejas: false, fuente: F('571332741691429') },

  // --- Acera sur (vista de lejos: solo las que se distinguen bien)
  149: { estilo: 'ladrillo', color: '#d6bf96', balcones: true, rejas: false, fuente: F('182867504477692') },
  126: { estilo: 'enfoscado', color: '#e8d79f', balcones: true, rejas: false, fuente: F('1298679280691035') },
  81: { estilo: 'enfoscado', color: '#e9dfc0', balcones: true, rejas: false, fuente: F('788175949548114') },
  281: { estilo: 'piedra', color: '#b3a58a', balcones: false, rejas: false, fuente: F('754870889334348') },
  271: { estilo: 'enfoscado', color: '#e2a58e', balcones: true, rejas: false, fuente: F('754870889334348') },

  // Sala de Cultura y biblioteca (Calle San Roque 26): bloque de hormigón blanco. La fachada del
  // arco la modela singulares.js; fuente: fotos de calle aportadas por Rubén
  7: { estilo: 'hormigon', color: '#ebe8e0', balcones: false, rejas: false, fuente: 'fotos de Rubén (2025)' },
  8: { estilo: 'hormigon', color: '#ebe8e0', balcones: false, rejas: false, fuente: 'fotos de Rubén (2025)' },
  // Parroquia de la Asunción: blanca con zócalo de ladrillo (salía como nave de chapa)
  572: { estilo: 'enfoscado', color: '#ece8de', zocalo: '#c9a77a', altoZocalo: 1.2, balcones: false, rejas: false, fuente: 'fotos de Rubén (2025)' },
  1004: { estilo: 'enfoscado', color: '#ece8de', zocalo: '#c9a77a', altoZocalo: 1.2, balcones: false, rejas: false, fuente: 'fotos de Rubén (2025)' },
};
