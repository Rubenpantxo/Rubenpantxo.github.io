// FUENTE UNICA DEL CATALOGO DE SISTEMAS DE DISENO
//
// De aqui salen: la portada servicios/sistemas-de-diseno.html (sus tres
// carruseles), el muestrario paletas.html y los bundles que se suben a
// Claude Design. Si un sistema cambia, cambia aqui y se regenera:
//
//     node servicios/sistemas/generar-sistemas.mjs
//     node servicios/sistemas/generar-paletas.mjs
//
// `proyectoCD` es el id del proyecto de Claude Design que corresponde a cada
// sistema. Es el hilo que mantiene los dos lados iguales: lo que se edita alli
// se vuelca aqui y se regenera la web. `null` = todavia no subido.
//
// Ningun nombre alude a un negocio ni a una app: los sistemas son
// intercambiables, cualquiera puede vestir cualquier proyecto.

export const sistemas = [
  {
    id: 'halogeno',
    nombre: 'Halógeno',
    ficha: 'halogeno.html',
    proyectoCD: '8769416e-1dd7-434b-a0fd-cc15d9cbe526',
    rasgo: 'Oscuro · un acento · radio mutante',
    titular: 'Negro verdoso y un lima de alto voltaje. Un solo acento, y unos bordes que cambian de forma al pulsarlos.',
    resumen: "Cuatro negros verdosos apilados por profundidad y un único acento de alto voltaje. La profundidad se dibuja con anillos de luz, no con sombras, y los radios mutan: en reposo son pastilla y al activarse se cuadran. Lo monoespaciado marca siempre dato o etiqueta técnica.",
    fuentes: {
      display: "\"Inter Tight\", \"Inter\", system-ui, sans-serif",
      cuerpo: "\"Inter Tight\", \"Inter\", system-ui, sans-serif",
      mono: "\"JetBrains Mono\", ui-monospace, monospace",
      pesoDisplay: 900,
      google: "Inter+Tight:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700"
    },
    // Los cuatro que se pintan en la tarjeta del catalogo.
    acentos: ['#0a0d0a', '#a3e635', '#f2f5f0', '#3a423a'],
    tokens: {
      fondo: '#0a0d0a',
      superficie: '#12160f',
      tinta: '#f2f5f0',
      apagado: '#8f9a8c',
      acento: '#a3e635',
      acento2: '#a3e635',
      linea: '#2a312a',
      radio: 'variable'
    },
    // Muestra del carrusel A: paleta + tipografia.
    tipo: {
      fondo: '#12160f',
      tinta: '#f2f5f0',
      acento: '#a3e635',
      muestra: 'Alto voltaje',
      estilo: "font-family:'Inter Tight',sans-serif;font-weight:900;letter-spacing:-.04em",
      pie: 'Inter Tight + JetBrains Mono'
    },
    // Muestra del carrusel B: componentes.
    piezas: {
      radio: '999px',
      solido: { texto: 'Aceptar', fondo: '#a3e635', tinta: '#0a0d0a' },
      linea: { texto: 'Ver', color: '#a3e635' },
      check: { fondo: '#a3e635', tinta: '#0a0d0a', radio: '50%' },
      toggle: '#a3e635',
      iconos: [
        '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/>',
        '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>'
      ]
    },
    colores: [
      ['Canvas', '#0a0d0a', 'Fondo de página'],
      ['Surface', '#12160f', 'Tarjeta'],
      ['Raised', '#1a1f18', 'Campo, elemento elevado'],
      ['Hairline', '#2a312a', 'Filo de un píxel'],
      ['Halogen', '#a3e635', 'Acento único'],
      ['Ink', '#f2f5f0', 'Texto principal'],
      ['Ink dim', '#8f9a8c', 'Texto secundario'],
      ['Unchecked', '#3a423a', 'Casilla sin marcar']
    ]
  },

  {
    id: 'terracota',
    nombre: 'Terracota',
    ficha: 'terracota.html',
    proyectoCD: '589fbc66-4234-4521-b64f-de9fbecfb874',
    rasgo: 'Claro · dos acentos · radio 16',
    titular: 'Terracota sobre crema. Cálido, de mesa de madera, con la serif reservada a los titulares.',
    resumen: "Terracota sobre crema, esquinas de 16 píxeles y una serif reservada a los titulares. El cuerpo va en la pila del sistema: cero peso extra y aspecto nativo. El verde solo aparece para confirmar, y el rojo solo para el error.",
    fuentes: {
      display: "Georgia, \"Iowan Old Style\", serif",
      cuerpo: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 700,
      google: null
    },
    acentos: ['#b34a1f', '#fdf6ec', '#2b1d12', '#2e9e5b'],
    tokens: {
      fondo: '#fdf6ec',
      superficie: '#ffffff',
      tinta: '#2b1d12',
      apagado: '#7c6e60',
      acento: '#b34a1f',
      acento2: '#2e9e5b',
      linea: '#e8dcc9',
      radio: '16px'
    },
    tipo: {
      fondo: '#fdf6ec',
      tinta: '#2b1d12',
      acento: '#b34a1f',
      muestra: 'Titular en serif',
      estilo: 'font-family:Georgia,serif',
      pie: 'Serif en titulares'
    },
    piezas: {
      radio: '16px',
      solido: { texto: 'Añadir', fondo: '#b34a1f', tinta: '#fdf6ec' },
      linea: { texto: 'Ver más', color: '#b34a1f' },
      check: { fondo: '#2e9e5b', tinta: '#fdf6ec', radio: null },
      toggle: '#2e9e5b',
      iconos: [
        '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        '<path d="M6 8h12l-1.2 11a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'
      ]
    },
    colores: [
      ['Terracota', '#b34a1f', 'Marca y acción'],
      ['Terracota oscuro', '#8a3514', 'Estado pulsado'],
      ['Crema', '#fdf6ec', 'Fondo'],
      ['Tarjeta', '#ffffff', 'Superficie'],
      ['Tinta', '#2b1d12', 'Texto principal'],
      ['Apagado', '#7c6e60', 'Texto secundario'],
      ['Confirmado', '#2e9e5b', 'Éxito, proceso en marcha']
    ]
  },

  {
    id: 'editorial',
    nombre: 'Editorial',
    ficha: 'editorial.html',
    proyectoCD: '432f110a-8f48-40bf-894f-7ab0f58fcef0',
    rasgo: 'Claro · un acento · esquina recta',
    titular: 'Casi monocromo, esquinas rectas y un fucsia que corta. Mucho aire y titulares en caja alta.',
    resumen: "Tres neutros y un acento. Esquina recta, sin sombras y sin degradados: todo se separa con líneas de un píxel. Los titulares van en caja alta con la letra muy abierta, y el fucsia solo aparece cuando hay algo que decidir.",
    fuentes: {
      display: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      cuerpo: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 500,
      google: null
    },
    acentos: ['#111114', '#fafafa', '#e7335a', '#e8e8ec'],
    tokens: {
      fondo: '#fafafa',
      superficie: '#ffffff',
      tinta: '#111114',
      apagado: '#727278',
      acento: '#e7335a',
      acento2: '#111114',
      linea: '#e8e8ec',
      radio: '0px'
    },
    tipo: {
      fondo: '#fafafa',
      tinta: '#111114',
      acento: '#e7335a',
      muestra: 'Caja alta',
      estilo: 'text-transform:uppercase;letter-spacing:0.09em;font-size:0.86rem;font-weight:500',
      pie: 'Caja alta, letra abierta'
    },
    piezas: {
      radio: '0px',
      solido: { texto: 'Aceptar', fondo: '#111114', tinta: '#fafafa' },
      linea: { texto: 'Guardar', color: '#111114' },
      check: { fondo: '#111114', tinta: '#fafafa', radio: '0' },
      toggle: '#e7335a',
      iconos: [
        '<path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
        '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/>'
      ]
    },
    colores: [
      ['Tinta', '#111114', 'Texto y botón principal'],
      ['Papel', '#fafafa', 'Fondo'],
      ['Blanco', '#ffffff', 'Superficie'],
      ['Apagado', '#727278', 'Texto secundario'],
      ['Línea', '#e8e8ec', 'Separadores'],
      ['Fucsia', '#e7335a', 'Destacado y alerta']
    ]
  },

  {
    id: 'carmin',
    nombre: 'Carmín',
    ficha: 'carmin.html',
    proyectoCD: '08b67aa5-0aef-4ef2-851f-6c8d1c005cf5',
    rasgo: 'Claro · dos acentos · cuerpo grande',
    titular: 'Rojo profundo y verde de mensajería. Cuerpo grande, pesos altos y objetivos pulsables amplios.',
    resumen: "Un rojo profundo que hace de marca y un verde de mensajería que ya significa algo para todo el mundo. Pocos elementos y muy grandes: el cuerpo nunca baja de 16 píxeles, las cifras van en negrita y cada pantalla resuelve una sola cosa.",
    fuentes: {
      display: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      cuerpo: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 800,
      google: null
    },
    acentos: ['#a4262c', '#fbf7f1', '#25d366', '#2c2018'],
    tokens: {
      fondo: '#fbf7f1',
      superficie: '#ffffff',
      tinta: '#2c2018',
      apagado: '#7b6e65',
      acento: '#a4262c',
      acento2: '#25d366',
      linea: '#ece0d4',
      radio: '16px'
    },
    tipo: {
      fondo: '#fbf7f1',
      tinta: '#2c2018',
      acento: '#a4262c',
      muestra: 'Peso alto',
      estilo: 'font-weight:800',
      pie: 'Pesos altos, cuerpo grande'
    },
    piezas: {
      radio: '16px',
      solido: { texto: 'Confirmar', fondo: '#a4262c', tinta: '#fbf7f1' },
      linea: { texto: 'Volver', color: '#a4262c' },
      check: { fondo: '#a4262c', tinta: '#fbf7f1', radio: null },
      toggle: '#25d366',
      iconos: [
        '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.9A8 8 0 1 1 21 12Z"/>',
        '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
      ]
    },
    colores: [
      ['Carmín', '#a4262c', 'Marca y acción'],
      ['Carmín oscuro', '#7c181d', 'Estado pulsado'],
      ['Crema', '#fbf7f1', 'Fondo'],
      ['Tinta', '#2c2018', 'Texto principal'],
      ['Apagado', '#7b6e65', 'Texto secundario'],
      ['Mensajería', '#25d366', 'Confirmación por mensajería'],
      ['Mensajería oscuro', '#075e54', 'Cabecera de conversación'],
      ['Conversación', '#e5ddd5', 'Fondo de conversación']
    ]
  },

  {
    id: 'neon',
    nombre: 'Neón',
    ficha: 'neon.html',
    proyectoCD: '540c21e0-fe5a-4e91-aad2-dedf374746c6',
    rasgo: 'Oscuro · tres acentos · radio 18',
    titular: 'Oscuro con lima, cian y rosa. Tres acentos que solo funcionan porque el fondo calla.',
    resumen: "Tres superficies de gris azulado marcan la profundidad y cada acento tiene un trabajo asignado: lima para lo hecho, cian para lo activo, rosa para lo pendiente. Pesos extremos, cifras tabulares y el radio más redondo del catálogo.",
    fuentes: {
      display: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      cuerpo: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 800,
      google: null
    },
    acentos: ['#0d0f14', '#c8f04c', '#38e1d4', '#ff5e82'],
    tokens: {
      fondo: '#0d0f14',
      superficie: '#161a22',
      tinta: '#f2f4f8',
      apagado: '#8b93a3',
      acento: '#c8f04c',
      acento2: '#38e1d4',
      linea: '#262d3a',
      radio: '18px'
    },
    tipo: {
      fondo: '#161a22',
      tinta: '#f2f4f8',
      acento: '#c8f04c',
      muestra: '48 min',
      estilo: 'font-weight:800;font-variant-numeric:tabular-nums;color:#c8f04c',
      pie: 'Cifras tabulares'
    },
    piezas: {
      radio: '18px',
      solido: { texto: 'Empezar', fondo: '#c8f04c', tinta: '#0d0f14' },
      linea: { texto: 'Detalle', color: '#38e1d4' },
      check: { fondo: '#c8f04c', tinta: '#0d0f14', radio: null },
      toggle: '#38e1d4',
      iconos: [
        '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
        '<path d="M3 17l5-6 4 4 5-8 4 5"/>'
      ]
    },
    colores: [
      ['Fondo', '#0d0f14', 'Base'],
      ['Superficie', '#161a22', 'Tarjeta'],
      ['Superficie 2', '#1e2430', 'Elemento elevado'],
      ['Lima', '#c8f04c', 'Completado, progreso'],
      ['Cian', '#38e1d4', 'Elemento activo'],
      ['Rosa', '#ff5e82', 'Pendiente, intensidad alta'],
      ['Texto', '#f2f4f8', 'Texto principal'],
      ['Apagado', '#8b93a3', 'Texto secundario']
    ]
  },

  {
    id: 'savia',
    nombre: 'Savia',
    ficha: 'savia.html',
    proyectoCD: 'cf7e59fc-8f8a-473d-b299-6496f08a26fc',
    rasgo: 'Doble tema · dos acentos · radio 16',
    titular: 'Verde fresco y un tema oscuro para el reverso. Dos pieles, un único juego de componentes.',
    resumen: "Un verde fresco manda en el tema claro; el naranja avisa y el rojo corrige, nunca al revés. Es el único del catálogo con dos temas: el reverso usa la misma estructura sobre grises fríos y con la mitad de interlineado. Cambian los tokens, no el marcado.",
    fuentes: {
      display: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      cuerpo: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 700,
      google: null
    },
    acentos: ['#1f9d55', '#f4f7f4', '#e67e22', '#10151c'],
    tokens: {
      fondo: '#f4f7f4',
      superficie: '#ffffff',
      tinta: '#1c2b21',
      apagado: '#67736a',
      acento: '#1f9d55',
      acento2: '#e67e22',
      linea: '#dde6de',
      radio: '16px'
    },
    tipo: {
      fondo: '#f4f7f4',
      tinta: '#1c2b21',
      acento: '#1f9d55',
      muestra: 'Dos temas',
      estilo: 'font-weight:700',
      pie: 'Dos temas, una escala'
    },
    piezas: {
      radio: '16px',
      solido: { texto: 'Añadir', fondo: '#1f9d55', tinta: '#ffffff' },
      linea: { texto: 'Aviso', color: '#e67e22' },
      check: { fondo: '#1f9d55', tinta: '#ffffff', radio: null },
      toggle: '#1f9d55',
      iconos: [
        '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
        '<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M9 20v-6h6v6"/>'
      ]
    },
    colores: [
      ['Verde', '#1f9d55', 'Marca y acción'],
      ['Verde oscuro', '#157040', 'Estado pulsado'],
      ['Fondo', '#f4f7f4', 'Tema claro'],
      ['Tinta', '#1c2b21', 'Texto principal'],
      ['Apagado', '#67736a', 'Texto secundario'],
      ['Aviso', '#e67e22', 'Advertencia'],
      ['Peligro', '#e74c3c', 'Error, agotado'],
      ['Reverso fondo', '#10151c', 'Tema oscuro'],
      ['Reverso superficie', '#1a212c', 'Tarjeta del tema oscuro']
    ]
  },

  {
    id: 'organico',
    nombre: 'Orgánico',
    ficha: 'organico.html',
    proyectoCD: '7cc98fa6-2bde-41e0-ab0d-b159cef78977',
    rasgo: 'Claro · dos acentos · radio 16',
    titular: 'Crema y arena con terracota y salvia. Todo redondo: contenedores muy curvos y botones en pastilla.',
    resumen: "Crema y arena con un acento terracota y una salvia de segunda voz. Todo tiende a la curva: contenedores muy redondeados, botones en pastilla y fotografía lavada para que se hunda en el papel. Las formas redondas necesitan aire; apretarlas es lo único que lo rompe.",
    fuentes: {
      display: "\"Caprasimo\", Georgia, serif",
      cuerpo: "\"Figtree\", ui-sans-serif, system-ui, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 400,
      google: "Caprasimo&family=Figtree:wght@400;600;700"
    },
    acentos: ['#c67139', '#f5ead8', '#201e1d', '#7a8a5e'],
    tokens: {
      fondo: '#f5ead8',
      superficie: '#ebddc5',
      tinta: '#201e1d',
      apagado: '#645c50',
      acento: '#c67139',
      acento2: '#7a8a5e',
      linea: '#dcd3c4',
      radio: '16px'
    },
    tipo: {
      fondo: '#f5ead8',
      tinta: '#201e1d',
      acento: '#c67139',
      muestra: 'Forma redonda',
      estilo: "font-family:'Caprasimo',Georgia,serif",
      pie: 'Caprasimo + Figtree'
    },
    piezas: {
      radio: '999px',
      solido: { texto: 'Aceptar', fondo: '#c67139', tinta: '#f5ead8' },
      linea: { texto: 'Ver', color: '#8c491a' },
      check: { fondo: '#c67139', tinta: '#f5ead8', radio: '50%' },
      toggle: '#7a8a5e',
      iconos: [
        '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
        '<path d="M12 21s-7-4.6-7-9.6A4.2 4.2 0 0 1 12 8.4a4.2 4.2 0 0 1 7 3C19 16.4 12 21 12 21Z"/>'
      ]
    },
    colores: [
      ['Fondo', '#f5ead8', 'Fondo de página'],
      ['Superficie', '#ebddc5', 'Tarjeta'],
      ['Tinta', '#201e1d', 'Texto principal'],
      ['Terracota', '#c67139', 'Acento principal'],
      ['Salvia', '#7a8a5e', 'Segundo acento'],
      ['Neutro 300', '#dcd3c4', 'Filo y relleno tenue'],
      ['Neutro 700', '#645c50', 'Texto secundario'],
      ['Terracota 700', '#8c491a', 'Texto sobre relleno tintado']
    ]
  },

  {
    id: 'clasico',
    nombre: 'Clásico',
    ficha: 'clasico.html',
    proyectoCD: 'af52629c-b8d8-4614-bdb5-07eb2ad98a04',
    rasgo: 'Claro · un acento · radio 4',
    titular: 'Gris cálido y un oro apagado. Serif en todo, filetes de un píxel y botones de solo contorno.',
    resumen: "Gris cálido y un oro apagado que aparece poco y siempre por algo. Serif en titulares y en cuerpo, columnas justificadas y filetes de un píxel donde otros pondrían una caja. El color se usa de trazo, no de relleno.",
    fuentes: {
      display: "\"Cormorant Garamond\", Georgia, serif",
      cuerpo: "\"Lora\", Georgia, serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 600,
      google: "Cormorant+Garamond:wght@400;600&family=Lora:wght@400;600"
    },
    acentos: ['#b68235', '#f3f2f2', '#201f1d', '#d7d3d3'],
    tokens: {
      fondo: '#f3f2f2',
      superficie: '#eae9e9',
      tinta: '#201f1d',
      apagado: '#605d5d',
      acento: '#b68235',
      acento2: '#ac803e',
      linea: '#d7d3d3',
      radio: '4px'
    },
    tipo: {
      fondo: '#f3f2f2',
      tinta: '#201f1d',
      acento: '#b68235',
      muestra: 'Filete y serif',
      estilo: "font-family:'Cormorant Garamond',Georgia,serif;font-weight:600",
      pie: 'Cormorant Garamond + Lora'
    },
    piezas: {
      radio: '4px',
      solido: { texto: 'Aceptar', fondo: '#7d5411', tinta: '#f3f2f2' },
      linea: { texto: 'Contorno', color: '#7d5411' },
      check: { fondo: '#b68235', tinta: '#201f1d', radio: '2px' },
      toggle: '#b68235',
      iconos: [
        '<path d="M4 5h16M4 12h16M4 19h10"/>',
        '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>'
      ]
    },
    colores: [
      ['Fondo', '#f3f2f2', 'Fondo de página'],
      ['Superficie', '#eae9e9', 'Tarjeta'],
      ['Tinta', '#201f1d', 'Texto principal'],
      ['Oro', '#b68235', 'Acento principal'],
      ['Oro apagado', '#ac803e', 'Segundo acento'],
      ['Neutro 300', '#d7d3d3', 'Filete de un píxel'],
      ['Neutro 700', '#605d5d', 'Texto secundario'],
      ['Oro 700', '#7d5411', 'Texto sobre relleno tintado']
    ]
  },

  {
    id: 'industrial',
    nombre: 'Industrial',
    ficha: 'industrial.html',
    proyectoCD: '9c8f62a8-66ca-460d-9927-227b5af6cbd2',
    rasgo: 'Claro · un acento · rejilla marcada',
    titular: 'Gris frío y azul de plano. Condensada en los titulares, rejilla a la vista y esquinas de 4 píxeles.',
    resumen: "Neutros fríos y un solo acento de saturación baja. La misma familia en dos anchos: condensada en titulares, normal en el cuerpo. La rejilla de 24 píxeles se deja ver y la escala de espaciado va apretada, porque este sistema es para pantallas con mucho dato.",
    fuentes: {
      display: "\"Barlow Condensed\", \"Barlow\", sans-serif",
      cuerpo: "\"Barlow\", ui-sans-serif, system-ui, sans-serif",
      mono: "ui-monospace, monospace",
      pesoDisplay: 600,
      google: "Barlow+Condensed:wght@400;600&family=Barlow:wght@400;500;700"
    },
    acentos: ['#5980a6', '#f2f2f3', '#1d1f20', '#728fab'],
    tokens: {
      fondo: '#f2f2f3',
      superficie: '#e9e9ea',
      tinta: '#1d1f20',
      apagado: '#5d5d60',
      acento: '#5980a6',
      acento2: '#728fab',
      linea: '#d4d4d7',
      radio: '4px'
    },
    tipo: {
      fondo: '#f2f2f3',
      tinta: '#1d1f20',
      acento: '#5980a6',
      muestra: 'Condensada',
      estilo: "font-family:'Barlow Condensed',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.04em",
      pie: 'Barlow Condensed + Barlow'
    },
    piezas: {
      radio: '4px',
      solido: { texto: 'Ejecutar', fondo: '#2c455d', tinta: '#f2f2f3' },
      linea: { texto: 'Plano', color: '#2c455d' },
      check: { fondo: '#5980a6', tinta: '#f2f2f3', radio: '2px' },
      toggle: '#5980a6',
      iconos: [
        '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18"/>',
        '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>'
      ]
    },
    colores: [
      ['Fondo', '#f2f2f3', 'Fondo de página'],
      ['Superficie', '#e9e9ea', 'Tarjeta'],
      ['Tinta', '#1d1f20', 'Texto principal'],
      ['Azul plano', '#5980a6', 'Acento principal'],
      ['Azul claro', '#728fab', 'Segundo acento'],
      ['Neutro 300', '#d4d4d7', 'Rejilla y filo'],
      ['Neutro 700', '#5d5d60', 'Texto secundario'],
      ['Azul 800', '#2c455d', 'Texto sobre relleno tintado']
    ]
  }
];

// Nombres viejos -> nuevos. Los usa generar-sistemas.mjs para dejar en pie las
// URLs antiguas como redirecciones, que llevan anos indexadas.
export const renombrados = {
  'halogen.html': 'halogeno.html',
  'rincon.html': 'terracota.html',
  'alba.html': 'editorial.html',
  'manolo.html': 'carmin.html',
  'impulso.html': 'neon.html',
  'la-plaza.html': 'savia.html'
};
