/* ============================================
   ROSTER DE 15 LUCHADORES
   ============================================ */

const CHARACTERS = [
  { id: 1, name: "BRAWLER AMARILLO", desc: "Powerhouse callejero.", style: "POWER / PRESSURE", accent: "#FFDD00", quote: "¡EL BARRIO ES MÍO!", stats: { power: 9, speed: 5, defense: 6 }, thumb: "sprites/thumbs/brawler-amarillo.png", sprite: "sprites/full/brawler-amarillo.png" },
  { id: 2, name: "MATRIARCA AZUL", desc: "Grappler explosiva con castigo brutal.", style: "GRAB / COUNTER", accent: "#0066FF", quote: "RESPETO A LA MATRIARCA.", stats: { power: 8, speed: 4, defense: 8 }, thumb: "sprites/thumbs/matriarca-azul.png", sprite: "sprites/full/matriarca-azul.png" },
  { id: 3, name: "SULIMA-X FIGHTER", desc: "Rushdown rápido y movilidad agresiva.", style: "RUSH / SPEED", accent: "#FF99CC", quote: "DEMASIADO RÁPIDA PARA TI.", stats: { power: 5, speed: 10, defense: 4 }, thumb: "sprites/thumbs/sulima-x-fighter.png", sprite: "sprites/full/sulima-x-fighter.png" },
  { id: 4, name: "DUO RAYAS & CADENA", desc: "Tag team duro con alcance y presión.", style: "TAG / RANGE", accent: "#FFFFFF", quote: "DOBLE PROBLEMA.", stats: { power: 7, speed: 5, defense: 8 }, thumb: "sprites/thumbs/duo-rayas-cadena.png", sprite: "sprites/full/duo-rayas-cadena.png" },
  { id: 5, name: "LA PATAI & HIJA", desc: "Combinación de potencia y velocidad.", style: "MIX / FAMILY", accent: "#FFCC66", quote: "EN FAMILIA SE GANA.", stats: { power: 7, speed: 7, defense: 6 }, thumb: "sprites/thumbs/la-patai-hija.png", sprite: "sprites/full/la-patai-hija.png" },
  { id: 6, name: "CABALLERO NEGRO", desc: "Defensa técnica y counters precisos.", style: "DEFENSE / COUNTER", accent: "#444444", quote: "EL HONOR SE DEFIENDE.", stats: { power: 6, speed: 6, defense: 10 }, thumb: "sprites/thumbs/caballero-negro.png", sprite: "sprites/full/caballero-negro.png" },
  { id: 7, name: "EL CHACAL", desc: "Kickboxer veloz con presión constante.", style: "KICK / SPEED", accent: "#88FF88", quote: "MIS PIES SON LEY.", stats: { power: 6, speed: 9, defense: 5 }, thumb: "sprites/thumbs/el-chacal.png", sprite: "sprites/full/el-chacal.png" },
  { id: 8, name: "DOÑA MERCADO", desc: "Grappler de mercado con agarres locos.", style: "GRAB / CHAOS", accent: "#FF6600", quote: "¡A LA BOLSA, MIJO!", stats: { power: 9, speed: 4, defense: 7 }, thumb: "sprites/thumbs/dona-mercado.png", sprite: "sprites/full/dona-mercado.png" },
  { id: 9, name: "PANAS DEL BARRIO", desc: "Dúo ofensivo de presión callejera.", style: "TAG / OFFENSE", accent: "#00FFAA", quote: "PANAS HASTA EL FINAL.", stats: { power: 7, speed: 7, defense: 6 }, thumb: "sprites/thumbs/panas-del-barrio.png", sprite: "sprites/full/panas-del-barrio.png" },
  { id: 10, name: "LA GRAFFITERA", desc: "Especialista en distancia y proyectiles.", style: "PROJECTILE / TRICK", accent: "#FF00FF", quote: "PINTÉ MI VICTORIA.", stats: { power: 5, speed: 8, defense: 5 }, thumb: "sprites/thumbs/la-graffitera.png", sprite: "sprites/full/la-graffitera.png" },
  { id: 11, name: "EL MECÁNICO", desc: "Luchador técnico con herramientas raras.", style: "TECH / SETUP", accent: "#888888", quote: "TODO SE ARREGLA A GOLPES.", stats: { power: 7, speed: 5, defense: 8 }, thumb: "sprites/thumbs/el-mecanico.png", sprite: "sprites/full/el-mecanico.png" },
  { id: 12, name: "LOS PRIMOS", desc: "Versatilidad y mezcla impredecible.", style: "MIX / COMBO", accent: "#FFAA00", quote: "SOMOS FAMILIA.", stats: { power: 6, speed: 7, defense: 7 }, thumb: "sprites/thumbs/los-primos.png", sprite: "sprites/full/los-primos.png" },
  { id: 13, name: "EL VIEJO DEL BARRIO", desc: "Veterano sabio con timing letal.", style: "VETERAN / TIMING", accent: "#AA8800", quote: "AÑOS DE EXPERIENCIA.", stats: { power: 8, speed: 5, defense: 9 }, thumb: "sprites/thumbs/el-viejo-del-barrio.png", sprite: "sprites/full/el-viejo-del-barrio.png" },
  { id: 14, name: "LA REINA DEL RING", desc: "Boxeadora callejera explosiva.", style: "BOX / PRESSURE", accent: "#FF2266", quote: "REINA POR ALGO.", stats: { power: 8, speed: 8, defense: 6 }, thumb: "sprites/thumbs/la-reina-del-ring.png", sprite: "sprites/full/la-reina-del-ring.png" },
  { id: 15, name: "EL RAPERO", desc: "Flow, ritmo y presión a distancia.", style: "RHYTHM / PROJECTILE", accent: "#00AAFF", quote: "PURO FLOW BROTHER.", stats: { power: 6, speed: 8, defense: 5 }, thumb: "sprites/thumbs/el-rapero.png", sprite: "sprites/full/el-rapero.png" }
];

window.CHARACTERS = CHARACTERS;
