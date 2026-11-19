// Editor de personaje (PLAN_PERSONAJE.md): rutas, valores por defecto, cámara del estudio,
// materiales y los nombres en castellano de los deslizadores de MakeHuman.
export const PERSONAJE = {
  ruta: 'assets/personaje/',
  rutaPlantilla: 'assets/personas/h_joven.glb',   // esqueleto y animaciones (andar, quieto)
  claveGuardado: 'cabanillas.personaje.v1',
  edad: { min: 18, max: 90 },
  // La macro «altura» de MakeHuman llega a 2,45 m (y 1,38 m): el editor se queda en lo realista
  // (≈ 1,45–2,05 m en hombres y 1,38–1,90 m en mujeres, según el resto de macros)
  altura: { min: 0.15, max: 0.72 },

  // Apariencia por defecto (la primera vez): un vecino de 30 años
  porDefecto: {
    macro: { sexo: 1, edad: 30, musculo: 0.55, peso: 0.5, altura: 0.55, proporciones: 0.6, pecho: 0.5, firmeza: 0.5,
      origen: { europeo: 0.9, africano: 0.03, asiatico: 0.07 } },
    detalle: {},
    piel: { id: 'young_caucasian_male', tono: 0, rubor: 0.3, brillo: 0.5 },
    ojos: { iris: 'brown', tamanoIris: 0 },
    pelo: { id: 'short02', color: '#3b2a1e', canas: 0 },
    cejas: { id: 'eyebrow001', color: null },
    pestanas: { id: 'eyelashes01' },
    ropa: { conjunto: null, arriba: 'namuhekam_male_polo_shirt', abajo: 'cortu_cargo_pants', calzado: 'shoes01', sombrero: null },
    colores: {},
  },

  // Estudio: cámaras por zona (objetivo en metros sobre los pies y distancia)
  camara: {
    fov: 30,
    zonas: {
      cuerpo: { alto: 0.9, distancia: 5.0, alturaOjo: 0.05 },
      cara: { hueso: 'head', alto: 0.045, distancia: 0.95, alturaOjo: 0.03 },
      torso: { hueso: 'spine_02', alto: 0.05, distancia: 2.0, alturaOjo: 0.05 },
      piernas: { hueso: 'calf_l', alto: 0.1, distancia: 2.4, alturaOjo: 0.1, centrado: true },
      pies: { hueso: 'foot_l', alto: 0.0, distancia: 1.3, alturaOjo: 0.25, centrado: true },
    },
    distanciaMin: 0.45,
    distanciaMax: 7,
    suavizado: 7,               // 1/s: lo que tarda la cámara en llegar a su sitio
  },

  // Piel: dispersión bajo la superficie aproximada (luz que «entra» por el borde de la sombra)
  piel: { ancho: 0.45, color: [1.0, 0.36, 0.22], rugosidad: 0.52, brillo: 0.35 },

  // Colores que se ofrecen (pelo y ropa). El selector libre también está.
  coloresPelo: ['#0f0b09', '#2a1b12', '#3b2a1e', '#5a3a22', '#7a5230', '#a0703f', '#c79a5b', '#e0c48a',
    '#efe0b8', '#8c3a1c', '#b5532a', '#d9d4cc', '#7d7d7d'],
  coloresRopa: ['#f2f0eb', '#1c1c1e', '#3a3d42', '#7c7f84', '#1f3354', '#2f5d8a', '#86b4d8', '#25432c',
    '#5f7d3a', '#b33a2e', '#d86a3c', '#e2b23c', '#6b3f73', '#d7a1b4', '#8a5a3c', '#c8b08a'],

  // Grupos del editor: cada uno junta categorías de target.json (MakeHuman)
  gruposCara: [
    { id: 'cabeza', nombre: 'Cabeza', categorias: ['head', 'forehead'], zona: 'cara' },
    { id: 'ojos', nombre: 'Ojos y cejas', categorias: ['eyes', 'eyebrows'], zona: 'cara' },
    { id: 'nariz', nombre: 'Nariz', categorias: ['nose'], zona: 'cara' },
    { id: 'boca', nombre: 'Boca', categorias: ['mouth'], zona: 'cara' },
    { id: 'mandibula', nombre: 'Mejillas y mandíbula', categorias: ['cheek', 'chin'], zona: 'cara' },
    { id: 'orejas', nombre: 'Orejas', categorias: ['ears'], zona: 'cara' },
    { id: 'cuello', nombre: 'Cuello', categorias: ['neck'], zona: 'torso' },
  ],
  gruposCuerpo: [
    { id: 'torso', nombre: 'Torso', categorias: ['torso', 'stomach'], zona: 'torso' },
    { id: 'pecho', nombre: 'Pecho', categorias: ['breast'], zona: 'torso' },
    { id: 'cadera', nombre: 'Cadera y glúteos', categorias: ['hip', 'buttocks', 'pelvis'], zona: 'torso' },
    { id: 'brazos', nombre: 'Brazos', categorias: ['arms'], zona: 'torso' },
    { id: 'manos', nombre: 'Manos', categorias: ['hands'], zona: 'torso' },
    { id: 'piernas', nombre: 'Piernas', categorias: ['legs'], zona: 'piernas' },
    { id: 'pies', nombre: 'Pies', categorias: ['feet'], zona: 'pies' },
  ],

  // Nombre de cada deslizador; los que no están aquí no se muestran (desplazamientos laterales
  // que con los dos lados juntos no tienen sentido, o detalles que no pintan en el juego)
  nombres: {
    // Cabeza y frente
    'head-age-decr-incr': 'Edad de la cara', 'head-angle-in-out': 'Inclinación', 'head-fat-decr-incr': 'Grasa de la cara',
    'head-scale-vert-decr-incr': 'Alto', 'head-scale-horiz-decr-incr': 'Ancho', 'head-scale-depth-decr-incr': 'Fondo',
    'head-back-scale-depth-decr-incr': 'Nuca', 'head-oval': 'Forma ovalada', 'head-round': 'Forma redonda',
    'head-rectangular': 'Forma rectangular', 'head-square': 'Forma cuadrada', 'head-triangular': 'Forma triangular',
    'head-invertedtriangular': 'Triángulo invertido', 'head-diamond': 'Forma de diamante',
    'forehead-scale-vert-decr-incr': 'Alto de la frente', 'forehead-trans-backward-forward': 'Frente adelante',
    'forehead-temple-decr-incr': 'Sienes', 'forehead-nubian-decr-incr': 'Curva de la frente',
    // Ojos y cejas
    'eye-scale-decr-incr': 'Tamaño de los ojos', 'eye-trans-down-up': 'Altura de los ojos', 'eye-trans-in-out': 'Separación',
    'eye-push1-in-out': 'Hundidos (arriba)', 'eye-push2-in-out': 'Hundidos (abajo)', 'eye-height1-decr-incr': 'Apertura interior',
    'eye-height2-decr-incr': 'Apertura central', 'eye-height3-decr-incr': 'Apertura exterior',
    'eye-corner1-down-up': 'Lagrimal', 'eye-corner2-down-up': 'Rabillo', 'eye-eyefold-down-up': 'Párpado',
    'eye-eyefold-angle-down-up': 'Ángulo del párpado', 'eye-eyefold-concave-convex': 'Curva del párpado',
    'eye-epicanthus-in-out': 'Pliegue epicántico', 'eye-bag-decr-incr': 'Ojeras', 'eye-bag-height-decr-incr': 'Altura de las ojeras',
    'eye-bag-in-out': 'Bolsas', 'eyebrows-angle-down-up': 'Ángulo de las cejas', 'eyebrows-trans-down-up': 'Altura de las cejas',
    'eyebrows-trans-backward-forward': 'Arco superciliar',
    // Nariz
    'nose-scale-vert-decr-incr': 'Largo', 'nose-scale-horiz-decr-incr': 'Ancho', 'nose-scale-depth-decr-incr': 'Salida',
    'nose-trans-down-up': 'Altura', 'nose-trans-backward-forward': 'Adelante', 'nose-volume-decr-incr': 'Volumen',
    'nose-hump-decr-incr': 'Caballete', 'nose-curve-concave-convex': 'Perfil', 'nose-greek-decr-incr': 'Nariz griega',
    'nose-point-width-decr-incr': 'Ancho de la punta', 'nose-point-down-up': 'Punta arriba', 'nose-width1-decr-incr': 'Ancho del puente',
    'nose-width2-decr-incr': 'Ancho medio', 'nose-width3-decr-incr': 'Ancho de la base', 'nose-nostrils-width-decr-incr': 'Ancho de las aletas',
    'nose-nostrils-angle-down-up': 'Ángulo de las aletas', 'nose-flaring-decr-incr': 'Aletas abiertas', 'nose-septumangle-decr-incr': 'Tabique',
    'nose-base-down-up': 'Base', 'nose-compression-compress-uncompress': 'Compresión',
    // Boca
    'mouth-scale-horiz-decr-incr': 'Ancho', 'mouth-scale-vert-decr-incr': 'Alto', 'mouth-scale-depth-decr-incr': 'Salida',
    'mouth-trans-down-up': 'Altura', 'mouth-trans-backward-forward': 'Adelante', 'mouth-angles-down-up': 'Comisuras',
    'mouth-upperlip-volume-decr-incr': 'Labio de arriba: volumen', 'mouth-upperlip-height-decr-incr': 'Labio de arriba: alto',
    'mouth-upperlip-width-decr-incr': 'Labio de arriba: ancho', 'mouth-upperlip-middle-down-up': 'Labio de arriba: centro',
    'mouth-upperlip-ext-down-up': 'Labio de arriba: extremos', 'mouth-lowerlip-volume-decr-incr': 'Labio de abajo: volumen',
    'mouth-lowerlip-height-decr-incr': 'Labio de abajo: alto', 'mouth-lowerlip-width-decr-incr': 'Labio de abajo: ancho',
    'mouth-lowerlip-middle-down-up': 'Labio de abajo: centro', 'mouth-lowerlip-ext-down-up': 'Labio de abajo: extremos',
    'mouth-cupidsbow-decr-incr': 'Arco de Cupido', 'mouth-cupidsbow-width-decr-incr': 'Ancho del arco',
    'mouth-philtrum-volume-decr-incr': 'Surco nasolabial', 'mouth-laugh-lines-in-out': 'Arrugas de reír', 'mouth-dimples-in-out': 'Hoyuelos',
    // Mejillas y mandíbula
    'cheek-volume-decr-incr': 'Mejillas', 'cheek-bones-decr-incr': 'Pómulos', 'cheek-inner-decr-incr': 'Mejilla interior',
    'cheek-trans-down-up': 'Altura de los pómulos', 'chin-width-decr-incr': 'Ancho de la barbilla', 'chin-height-decr-incr': 'Alto de la barbilla',
    'chin-prominent-decr-incr': 'Barbilla saliente', 'chin-bones-decr-incr': 'Mandíbula', 'chin-jaw-drop-decr-incr': 'Ángulo de la mandíbula',
    'chin-prognathism-decr-incr': 'Prognatismo', 'chin-cleft-decr-incr': 'Hoyuelo en la barbilla', 'chin-triangle': 'Barbilla en punta',
    // Orejas
    'ear-scale-decr-incr': 'Tamaño', 'ear-scale-vert-decr-incr': 'Alto', 'ear-scale-depth-decr-incr': 'Fondo',
    'ear-trans-down-up': 'Altura', 'ear-trans-backward-forward': 'Adelante', 'ear-rot-backward-forward': 'Giro',
    'ear-lobe-decr-incr': 'Lóbulo', 'ear-flap-decr-incr': 'Despegadas', 'ear-wing-decr-incr': 'Pabellón',
    'ear-shape-square-round': 'Redondas', 'ear-shape-pointed-triangle': 'Puntiagudas',
    // Cuello
    'measure-neck-circ-decr-incr': 'Grosor', 'measure-neck-height-decr-incr': 'Largo', 'neck-scale-horiz-decr-incr': 'Ancho',
    'neck-scale-depth-decr-incr': 'Fondo', 'neck-back-scale-depth-decr-incr': 'Nuca', 'neck-double-decr-incr': 'Papada',
    'neck-trans-backward-forward': 'Adelante',
    // Torso y vientre
    'torso-scale-horiz-decr-incr': 'Ancho', 'torso-scale-depth-decr-incr': 'Fondo', 'torso-scale-vert-decr-incr': 'Alto',
    'torso-vshape-decr-incr': 'Forma de V', 'torso-muscle-pectoral-decr-incr': 'Pectorales', 'torso-muscle-dorsi-decr-incr': 'Dorsales',
    'measure-shoulder-dist-decr-incr': 'Hombros', 'measure-bust-circ-decr-incr': 'Contorno de pecho',
    'measure-underbust-circ-decr-incr': 'Bajo el pecho', 'measure-waist-circ-decr-incr': 'Cintura',
    'measure-hips-circ-decr-incr': 'Contorno de cadera', 'measure-frontchest-dist-decr-incr': 'Pecho delantero',
    'measure-napetowaist-dist-decr-incr': 'Largo de espalda', 'measure-waisttohip-dist-decr-incr': 'Cintura a cadera',
    'stomach-pregnant-decr-incr': 'Barriga', 'stomach-tone-decr-incr': 'Abdominales', 'stomach-navel-in-out': 'Ombligo hundido',
    'stomach-navel-down-up': 'Altura del ombligo',
    // Pecho
    'breast-volume-vert-down-up': 'Volumen', 'breast-trans-down-up': 'Altura', 'breast-dist-decr-incr': 'Separación',
    'breast-point-decr-incr': 'Forma',
    // Cadera y glúteos
    'hip-scale-horiz-decr-incr': 'Ancho', 'hip-scale-depth-decr-incr': 'Fondo', 'hip-scale-vert-decr-incr': 'Alto',
    'hip-waist-down-up': 'Altura de la cintura', 'buttocks-volume-decr-incr': 'Glúteos', 'pelvis-tone-decr-incr': 'Tono de la pelvis',
    // Brazos
    'measure-upperarm-length-decr-incr': 'Largo del brazo', 'measure-lowerarm-length-decr-incr': 'Largo del antebrazo',
    'measure-upperarm-circ-decr-incr': 'Grosor del brazo', 'upperarm-muscle-decr-incr': 'Bíceps', 'upperarm-fat-decr-incr': 'Grasa del brazo',
    'upperarm-shoulder-muscle-decr-incr': 'Deltoides', 'upperarm-scale-horiz-decr-incr': 'Brazo: ancho',
    'upperarm-scale-depth-decr-incr': 'Brazo: fondo', 'upperarm-scale-vert-decr-incr': 'Brazo: alto',
    'lowerarm-muscle-decr-incr': 'Antebrazo: músculo', 'lowerarm-fat-decr-incr': 'Antebrazo: grasa',
    'lowerarm-scale-horiz-decr-incr': 'Antebrazo: ancho', 'lowerarm-scale-depth-decr-incr': 'Antebrazo: fondo',
    'lowerarm-scale-vert-decr-incr': 'Antebrazo: alto',
    // Manos
    'hand-scale-decr-incr': 'Tamaño', 'hand-fingers-length-decr-incr': 'Largo de los dedos',
    'hand-fingers-diameter-decr-incr': 'Grosor de los dedos', 'hand-fingers-distance-decr-incr': 'Separación de los dedos',
    'measure-wrist-circ-decr-incr': 'Muñeca',
    // Piernas
    'upperlegs-height-decr-incr': 'Largo del muslo', 'lowerlegs-height-decr-incr': 'Largo de la pantorrilla',
    'measure-upperleg-height-decr-incr': 'Alto del muslo', 'measure-lowerleg-height-decr-incr': 'Alto de la pierna',
    'measure-thigh-circ-decr-incr': 'Grosor del muslo', 'measure-knee-circ-decr-incr': 'Rodilla', 'measure-calf-circ-decr-incr': 'Gemelo',
    'upperleg-muscle-decr-incr': 'Cuádriceps', 'upperleg-fat-decr-incr': 'Grasa del muslo', 'lowerleg-muscle-decr-incr': 'Gemelos: músculo',
    'lowerleg-fat-decr-incr': 'Gemelos: grasa', 'leg-valgus-decr-incr': 'Piernas en X',
    'upperleg-scale-horiz-decr-incr': 'Muslo: ancho', 'upperleg-scale-depth-decr-incr': 'Muslo: fondo',
    'upperleg-scale-vert-decr-incr': 'Muslo: alto', 'lowerleg-scale-horiz-decr-incr': 'Pierna: ancho',
    'lowerleg-scale-depth-decr-incr': 'Pierna: fondo', 'lowerleg-scale-vert-decr-incr': 'Pierna: alto',
    // Pies
    'foot-scale-decr-incr': 'Tamaño', 'foot-scale-horiz-decr-incr': 'Ancho', 'foot-scale-vert-decr-incr': 'Alto',
    'foot-scale-depth-decr-incr': 'Largo', 'measure-ankle-circ-decr-incr': 'Tobillo',
  },

  // Herencia (como en otros editores): dos «padres» del pueblo y el parecido
  padres: {
    madres: ['Ainhoa', 'Maite', 'Pilar', 'Itziar', 'Carmen', 'Nerea', 'Rosa', 'Arantxa'],
    padres: ['Javier', 'Iñaki', 'Fermín', 'Mikel', 'Jesús', 'Patxi', 'Txema', 'Alberto'],
  },
};
