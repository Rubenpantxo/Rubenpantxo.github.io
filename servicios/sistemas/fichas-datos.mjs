// LO QUE SE DICE EN CADA FICHA
//
// La prosa de las fichas de sistema, separada de los datos de color y forma.
// generar-fichas.mjs junta esto con sistemas-datos.mjs y componentes.mjs y
// escribe la pagina entera. Halogeno tambien sale de aqui, aunque
// enseña además las piezas de producción de halogen.css (campo `produccion`).
//
// Cada `tipo` son las cuatro lineas de la muestra tipografica:
//   [meta, texto, rol]   rol = display | titulo | cuerpo | pie | dato (en mono)

export const fichas = {
  halogeno: {
    descripcion: 'Halógeno: oscuro, cinético y de un solo acento. Sistema de diseño con radios que mutan y profundidad por anillos de luz.',
    etiqueta: 'Oscuro · un acento · radio mutante',
    bajada: 'Oscuro, cinético y de un solo acento. Profundidad por anillos de luz en vez de sombras, y radios que mutan: lo que está en reposo es una pastilla y al activarse se cuadra.',
    paleta: 'Cuatro negros verdosos que se apilan por profundidad y un único acento de alto voltaje. No hay color secundario: si algo necesita destacar, o es lima o no destaca.',
    tipografia: 'Inter Tight para todo lo que se lee y JetBrains Mono para lo que se mide. El monoespaciado no es decoración: marca lo que es un dato, un estado o una etiqueta técnica.',
    tipo: [
      ['Display · Inter Tight 900', 'Alto voltaje', 'display'],
      ['Título · Inter Tight 700', 'Un solo acento de alto voltaje', 'titulo'],
      ['Cuerpo · Inter Tight 400', 'La interfaz desaparece y deja mandar al contenido. Sobre negro verdoso, un texto claro descansa la vista incluso después de un rato largo.', 'cuerpo'],
      ['Dato · JetBrains Mono', 'dato · etiqueta técnica', 'dato']
    ],
    componentes: 'Los ocho componentes que tienen todos los sistemas, con la piel de Halógeno: radios que se cuadran al tocarlos y anillos de luz en vez de sombras. Son los mismos que puedes copiar sueltos en la Biblioteca de elementos.',
    ejemplo: '../logistica.html',
    // Halógeno nació como el kit de una app (apps/escenas): su ficha enseña
    // además las piezas de producción de halogen.css, que se cargan tal cual.
    css: '../../apps/escenas/halogen.css',
    estilo: "/* Puente entre los tokens del kit y la estructura compartida de las fichas. */\n  /* Al reves que antes: ahora el kit sigue al tema, no lo impone. Asi los\n     componentes hk- cambian con la paleta que elijas. */\n  :root {\n    --canvas: var(--sd-bg);\n    --surface: var(--sd-surface);\n    --raised: var(--sd-surface-2);\n    --ink: var(--sd-ink);\n    --ink-dim: var(--sd-muted);\n    --halogen: var(--sd-accent);\n    --hairline: var(--sd-line);\n    --font-sans: var(--sd-font);\n    --font-mono: var(--sd-mono);\n  }\n  .sd-titulo {\n    font-weight: 900;\n    letter-spacing: -0.04em;\n    line-height: 0.92;\n  }\n\n  .sd-mono {\n    font-family: var(--font-mono);\n    font-size: 0.78rem;\n    letter-spacing: 0.06em;\n    color: var(--ink-dim);\n  }\n\n  /* El kit pone box-sizing y tipografia globales; aqui solo se recupera el\n     ancho de la ficha, que el kit no contempla porque nacio para una app. */\n  body { line-height: 1.6; }\n  .sd-lienzo { align-items: flex-start; }",
    produccion: {
      titulo: 'Las piezas de producción',
      html: "\n    <h3>Botones</h3>\n    <div class=\"sd-lienzo\">\n      <button class=\"hk-btn hk-btn--primary\" type=\"button\">Aceptar <span class=\"hk-btn__arrow\">&#8594;</span></button>\n      <button class=\"hk-btn\" type=\"button\">Restablecer</button>\n      <button class=\"hk-btn\" type=\"button\" disabled>No disponible</button>\n    </div>\n\n    <h3>Chip y baldosa de icono</h3>\n    <div class=\"sd-lienzo\">\n      <span class=\"hk-chip\">Activo</span>\n      <span class=\"hk-chip hk-chip--mute\">Sin definir</span>\n      <span class=\"hk-tile\" aria-hidden=\"true\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M23 7l-7 5 7 5V7Z\"/><rect x=\"1\" y=\"5\" width=\"15\" height=\"14\" rx=\"2\"/></svg>\n      </span>\n      <span class=\"hk-tile hk-tile--soft\" aria-hidden=\"true\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg>\n      </span>\n    </div>\n\n    <h3>Casillas</h3>\n    <div class=\"sd-lienzo\" style=\"flex-direction:column;align-items:stretch;gap:0\">\n      <label class=\"hk-check\">\n        <input type=\"checkbox\" checked>\n        <span class=\"hk-check__dot\"></span>\n        <span class=\"hk-check__label\">Mostrar rejilla</span>\n        <span class=\"hk-check__state\">ON</span>\n      </label>\n      <label class=\"hk-check\">\n        <input type=\"checkbox\">\n        <span class=\"hk-check__dot\"></span>\n        <span class=\"hk-check__label\">Sombras suaves</span>\n        <span class=\"hk-check__state\">OFF</span>\n      </label>\n      <label class=\"hk-check\">\n        <input type=\"checkbox\" checked>\n        <span class=\"hk-check__dot\"></span>\n        <span class=\"hk-check__label\">Bloquear proporci\u00f3n</span>\n        <span class=\"hk-check__state\">ON</span>\n      </label>\n    </div>\n\n    <h3>Campo y dato</h3>\n    <div class=\"sd-lienzo\">\n      <span class=\"hk-field\">\n        <input type=\"text\" value=\"Sin t\u00edtulo\" aria-label=\"Nombre del documento\">\n      </span>\n      <span class=\"hk-stat\">\n        <span class=\"hk-stat__value hk-num\">128</span>\n        <span class=\"sd-mono\">elementos</span>\n      </span>\n      <span class=\"hk-stat\">\n        <span class=\"hk-stat__value hk-num\">24 px</span>\n        <span class=\"sd-mono\">ret\u00edcula</span>\n      </span>\n    </div>\n\n    <h3>Tarjeta</h3>\n    <div class=\"sd-lienzo\">\n      <article class=\"hk-card\" style=\"max-width:22rem\">\n        <span class=\"hk-eyebrow\">Ejemplo</span>\n        <h4 style=\"margin:.5rem 0 .35rem;font-weight:700\">Tarjeta de contenido</h4>\n        <p style=\"margin:0 0 1rem;color:var(--ink-dim);font-size:.9rem\">Una l\u00ednea de apoyo en texto secundario, del largo que suele tener de verdad.</p>\n        <button class=\"hk-btn hk-btn--primary hk-btn--block\" type=\"button\">Abrir <span class=\"hk-btn__arrow\">&#8594;</span></button>\n      </article>\n    </div>"
    }
  },

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
