// LO QUE SE DICE EN CADA FICHA
//
// La prosa de las fichas de sistema, separada de los datos de color y forma.
// generar-fichas.mjs junta esto con sistemas-datos.mjs y componentes.mjs y
// escribe la pagina entera. Halogeno no esta aqui: su ficha es a mano porque
// ensena las piezas de produccion (halogen.css), y solo recibe el kit.
//
// Cada `tipo` son las cuatro lineas de la muestra tipografica:
//   [meta, texto, rol]   rol = display | titulo | cuerpo | pie | dato (en mono)

export const fichas = {
  terracota: {
    descripcion: 'Terracota: barro cocido sobre crema, superficies planas y una sola acción con relieve de verdad, que se hunde al pulsarla.',
    etiqueta: 'Claro · papel · botón con relieve',
    bajada: 'Terracota sobre crema, como una mesa de madera. Todo es plano y tranquilo salvo la acción principal: un botón con capas, luz arriba y un canto que se hunde cuando lo pulsas. Si hay relieve, es que ahí hay que tocar.',
    paleta: 'Un tostado de barro cocido que hace de marca y de acción, un crema que no deslumbra y un verde que solo aparece para confirmar.',
    tipografia: 'Serif solo en los titulares. El resto, la pila del sistema: cero peso extra y aspecto nativo en el móvil de quien lo lea.',
    tipo: [
      ['Display · serif', 'Titular en serif', 'display'],
      ['Subtítulo · serif', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · sistema / 16px', 'El párrafo cabe en dos líneas y esa es la restricción: si necesita tres, sobra texto o el componente está mal elegido.', 'cuerpo'],
      ['Pie · sistema / 13px', 'Nota al pie, metadatos y disponibilidad.', 'pie']
    ],
    componentes: 'Superficies planas con un filete de un píxel y radio de 12. El único volumen del sistema es el del botón principal: tres capas de sombra que desaparecen al pulsarlo. Pruébalo.',
    ejemplo: '../bar-restaurante.html'
  },

  editorial: {
    descripcion: 'Editorial: un sistema de cartel. Reglas gruesas, titulares condensados enormes y un fucsia que corta el blanco y negro.',
    etiqueta: 'Claro · cartel · reglas gruesas',
    bajada: 'Un cartel pegado en la calle. Titulares condensados que ocupan el ancho entero, reglas de tinta de tres y ocho píxeles, y un fucsia que solo aparece cuando hay algo que decidir.',
    paleta: 'Tres neutros y un fucsia. El negro no es gris oscuro: es tinta, y hace de regla, de fondo invertido y de texto a la vez.',
    tipografia: 'Anton, una condensada de cartel, siempre en mayúsculas y siempre grande. Debajo, Archivo: una grotesca sobria que no compite.',
    tipo: [
      ['Display · Anton', 'Cartel', 'display'],
      ['Título · Anton', 'Un segundo nivel, igual de alto', 'titulo'],
      ['Cuerpo · Archivo 400', 'El titular grita y el cuerpo informa. Si los dos gritan, no se entiende ninguno.', 'cuerpo'],
      ['Pie · Archivo 400 / 13px', 'Sección · número 04 · otoño', 'pie']
    ],
    componentes: 'Sin radio y sin sombra. Todo se separa con reglas de tinta: tres píxeles en los contenedores y doce arriba de cada tarjeta, como la cabecera de una columna.',
    ejemplo: '../tienda-ropa.html'
  },

  carmin: {
    descripcion: 'Carmín: neobrutalismo en rojo profundo y verde de mensajería. Bordes de tinta, sombras duras y botones que se hunden al pulsarlos.',
    etiqueta: 'Claro · neobrutal · sombra dura',
    bajada: 'Rojo profundo, verde de mensajería y cero disimulo. Cada pieza lleva un borde de tinta de tres píxeles y una sombra dura desplazada; al pulsarla se hunde hasta tocar su sombra. Nada flota: todo está pegado al papel.',
    paleta: 'Un rojo profundo que hace de marca y el verde de mensajería, que ya significa algo para todo el mundo. La tinta hace de borde y de sombra.',
    tipografia: 'Space Grotesk para todo, en pesos firmes, y Space Mono para las cifras. Letra de rasgos raros que aguanta bien el borde grueso.',
    tipo: [
      ['Display · Space Grotesk 700', 'Sin rodeos', 'display'],
      ['Título · Space Grotesk 700', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · Space Grotesk 400', 'Frases cortas y en activa. El borde ya grita bastante; el texto no necesita hacerlo.', 'cuerpo'],
      ['Cifra · Space Mono', '2.480 · 12 % · 04/11', 'dato']
    ],
    componentes: 'Borde de tres píxeles en todo, sombra dura de cuatro y radio de 6. El fondo lleva una trama de puntos, como papel de cuaderno.',
    ejemplo: '../carniceria.html'
  },

  neon: {
    descripcion: 'Neón: pixel art de recreativa. Lima, cian y rosa sobre la noche, esquinas escalonadas y letra de 8 bits.',
    etiqueta: 'Oscuro · pixel art · 8 bits',
    bajada: 'Una recreativa de 8 bits. Lima, cian y rosa sobre la noche, esquinas mordidas en escalón de cuatro píxeles y letra de consola. Sin una curva y sin un desenfoque: cada sombra es un bloque.',
    paleta: 'Tres superficies de gris azulado marcan la profundidad, y cada acento tiene un trabajo: lima para lo hecho, cian para lo activo, rosa para lo pendiente.',
    tipografia: 'Press Start 2P para los titulares, la letra de las recreativas. Para leer, Pixelify Sans, pixelada pero cómoda a 16 píxeles, y VT323 para los datos de consola.',
    tipo: [
      ['Display · Press Start 2P', 'Nivel 1', 'display'],
      ['Título · Press Start 2P', 'Pulsa start', 'titulo'],
      ['Cuerpo · Pixelify Sans', 'La letra pixelada se lee si le das tamaño y aire. Por debajo de 16 píxeles, mejor no.', 'cuerpo'],
      ['Dato · VT323', 'PUNTOS 002480 · VIDAS 3', 'dato']
    ],
    componentes: 'Los bordes son cuatro sombras sin desenfoque, una por lado, así que las esquinas quedan escalonadas. Los botones se hunden un píxel al pulsarlos y las barras de progreso avanzan por bloques.',
    ejemplo: '../gimnasio.html'
  },

  savia: {
    descripcion: 'Savia: glassmorphism. Vidrio esmerilado sobre luz verde y naranja, pastillas translúcidas y un reverso oscuro.',
    etiqueta: 'Claro · vidrio esmerilado · doble tema',
    bajada: 'Vidrio esmerilado sobre luz de color. El fondo es un resplandor verde y naranja hecho con los dos acentos, y las superficies lo dejan pasar difuminado: se ve que hay algo detrás, pero no distrae.',
    paleta: 'Verde fresco de marca, naranja que avisa y rojo que corrige, nunca al revés. Los dos primeros son también la luz del fondo.',
    tipografia: 'La pila del sistema: sobre vidrio, la letra nativa de cada dispositivo es la que mejor se lee. La densidad cambia entre temas; la escala no.',
    tipo: [
      ['Display · 700', 'Dos temas', 'display'],
      ['Subtítulo · 600', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · 400 / 16px', 'Sobre vidrio el contraste lo pone la superficie, no el fondo: por eso el texto va siempre sobre una capa esmerilada.', 'cuerpo'],
      ['Referencia · 13px', 'SKU 10428 · 2,45 € · 38 unidades', 'dato']
    ],
    componentes: 'Superficies al 48 % de opacidad con desenfoque de 22 píxeles, un canto de luz arriba y controles en pastilla. El botón principal es el único opaco.',
    ejemplo: '../supermercado.html'
  },

  organico: {
    descripcion: 'Orgánico: claymorphism en arena y salvia. Todo parece moldeado en arcilla blanda, sin un solo borde.',
    etiqueta: 'Claro · arcilla · todo redondo',
    bajada: 'Arena y salvia moldeadas en arcilla blanda. No hay un solo borde: el volumen se hace con luz arriba a la izquierda y sombra abajo a la derecha. Los botones sobresalen; los campos están hundidos.',
    paleta: 'Crema y arena con un acento terracota y una salvia que hace de segunda voz. Colores de tierra, que es de lo que está hecha la arcilla.',
    tipografia: 'Caprasimo, gruesa y redonda, hace de mancha en los titulares. Debajo, Figtree: una humanista que se lee sin esfuerzo.',
    tipo: [
      ['Display · Caprasimo', 'Forma redonda', 'display'],
      ['Título · Caprasimo', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · Figtree 400', 'Las formas blandas necesitan aire: el doble de margen del que pondrías en un sistema plano.', 'cuerpo'],
      ['Pie · Figtree / 13px', 'Nota al pie y metadatos', 'pie']
    ],
    componentes: 'Radio de 28 en los contenedores y pastilla en todo lo pulsable. Lo que sobresale se toca; lo que está hundido se rellena. Al pulsar un botón, su volumen pasa de fuera a dentro.',
    ejemplo: null
  },

  clasico: {
    descripcion: 'Clásico: tinta profunda, filetes de oro y serif en cursiva. Un sistema oscuro y sereno, de estuche.',
    etiqueta: 'Oscuro · oro · serif en cursiva',
    bajada: 'Tinta casi negra, marfil para leer y oro para enmarcar. Los titulares van en cursiva, como grabados, y los contenedores no se rellenan: se delimitan con un filete doble.',
    paleta: 'Una tinta cálida en tres profundidades, marfil para el texto y un oro que se usa en líneas, casi nunca en rellenos. Si el oro ocupa mucho, deja de ser oro.',
    tipografia: 'Cormorant Garamond en cursiva para los titulares: mucho contraste y trazo fino. Lora para leer, una serif pensada para pantalla.',
    tipo: [
      ['Display · Cormorant cursiva', 'Oro y cursiva', 'display'],
      ['Título · Cormorant cursiva', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · Lora 400', 'La serif de cuerpo va derecha: la cursiva cansa en párrafos largos y aquí se reserva para lo que tiene que lucir.', 'cuerpo'],
      ['Pie · Lora / 13px', 'Colección · número 12 · otoño', 'pie']
    ],
    componentes: 'Filete de oro al 50 % y un segundo filete, más tenue, a cuatro píxeles: el marco doble de una lámina. Botones en contorno y versalitas espaciadas.',
    ejemplo: null
  },

  industrial: {
    descripcion: 'Industrial: plano técnico. Gris frío, azul de plano, rejilla de 24 píxeles a la vista y marcas de corte en cada esquina.',
    etiqueta: 'Claro · plano técnico · rejilla y cotas',
    bajada: 'Un plano técnico. Gris frío y un azul de saturación baja, la rejilla de 24 píxeles a la vista en el fondo y marcas de corte en las esquinas de cada superficie, como las cotas de un plano.',
    paleta: 'Neutros fríos y un solo acento de saturación baja: el color marca lo interactivo y las cotas, y poco más.',
    tipografia: 'Barlow en dos anchos: condensada y en mayúsculas para los titulares, normal para leer. Las cifras y etiquetas, en monoespaciada.',
    tipo: [
      ['Display · Barlow Condensed', 'Condensada', 'display'],
      ['Título · Barlow Condensed', 'Un segundo nivel', 'titulo'],
      ['Cuerpo · Barlow 400', 'Densidad al 0,85: este sistema aprieta, porque está hecho para pantallas con mucho dato.', 'cuerpo'],
      ['Cota · monoespaciada', 'REF 10428 · 24 × 24 · ESC 1:50', 'dato']
    ],
    componentes: 'Radio de 4, sin sombras y con escuadras de acento en las cuatro esquinas. Las barras de progreso llevan marcas cada 10 %, como una regla.',
    ejemplo: null
  }
};
