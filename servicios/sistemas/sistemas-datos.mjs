// FUENTE UNICA DE LOS SISTEMAS DE DISENO
//
// Un sistema ya no es un paquete cerrado: son TRES EJES INDEPENDIENTES que se
// combinan. Puedes coger la paleta de uno, la tipografia de otro y los
// elementos de un tercero.
//
//   paletas      el color: fondo, tinta, acentos, estados
//   tipografias  la voz: display, cuerpo, monoespaciada, pesos
//   elementos    la forma: radio, sombra, densidad, grosor de icono
//
// Los `presets` son solo atajos: la combinacion por defecto de cada uno de los
// nueve sistemas. Nada obliga a respetarlos.
//
// Ningun nombre alude a un negocio ni a una app. Los tres ejes tampoco se
// llaman como el preset del que salieron: una paleta se llama por sus colores,
// una tipografia por sus fuentes y unos elementos por su forma.
//
// De aqui salen la portada, el muestrario, el configurador, el tema en vivo de
// las demos y los bundles de Claude Design:
//
//     node servicios/sistemas/generar-tema.mjs      tema.css (con las pieles)
//     node servicios/sistemas/generar-kits.mjs      sistema.css y kits/
//     node servicios/sistemas/generar-fichas.mjs    las fichas de cada sistema
//     node servicios/sistemas/generar-paletas.mjs   paletas.html (y la paleta de cada ficha)
//     node servicios/sistemas/generar-sistemas.mjs  la portada
//     node servicios/sistemas/generar-bundle-cd.mjs
//
// En ese orden: generar-fichas reescribe las fichas enteras y generar-paletas
// repinta despues su muestrario de color.
//
// Las pieles (pixel, vidrio, arcilla...) y los componentes del kit viven en
// componentes.mjs; lo que se dice en cada ficha, en fichas-datos.mjs.

/* ============================================================
   EJE 1 — PALETAS
   `tokens` es el vocabulario compartido: es lo que se vuelca a las variables
   --sd-* y lo que las demos consumen. `colores` es el muestrario con nombre,
   para la pagina de paletas.
   ============================================================ */
export const paletas = [
  {
    id: 'carbon-lima',
    nombre: 'Carbón y lima',
    banda: 'oscura',
    nota: 'Cuatro negros verdosos apilados por profundidad y un único acento de alto voltaje.',
    tokens: {
      fondo: '#0a0d0a',
      superficie: '#12160f',
      superficie2: '#1a1f18',
      tinta: '#f2f5f0',
      apagado: '#8f9a8c',
      acento: '#a3e635',
      acentoSolido: '#a3e635',
      acentoFuerte: '#8ecc1f',
      acentoTexto: '#afe668',
      onAcento: '#0a0d0a',
      acento2: '#8ecc1f',
      linea: '#2a312a',
      ok: '#a3e635',
      aviso: '#e8c547',
      peligro: '#ff6b6b'
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
    id: 'barro-crema',
    nombre: 'Barro y crema',
    banda: 'clara',
    nota: 'Un tostado de barro cocido sobre un fondo crema que no deslumbra, con verde solo para confirmar.',
    tokens: {
      fondo: '#fdf6ec',
      superficie: '#ffffff',
      superficie2: '#fffdf9',
      tinta: '#2b1d12',
      apagado: '#7c6e60',
      acento: '#b34a1f',
      acentoSolido: '#b34a1f',
      acentoFuerte: '#8a3514',
      acentoTexto: '#963d18',
      onAcento: '#fdf6ec',
      acento2: '#2e9e5b',
      linea: '#e8dcc9',
      ok: '#2e9e5b',
      aviso: '#c98a1e',
      peligro: '#c0392b'
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
    id: 'tinta-fucsia',
    nombre: 'Tinta y fucsia',
    banda: 'clara',
    nota: 'Tres neutros y un fucsia que solo aparece cuando hay algo que decidir.',
    tokens: {
      fondo: '#fafafa',
      superficie: '#ffffff',
      superficie2: '#ffffff',
      tinta: '#111114',
      apagado: '#727278',
      acento: '#e7335a',
      acentoSolido: '#c11f43',
      acentoFuerte: '#c11f43',
      acentoTexto: '#c11f43',
      onAcento: '#ffffff',
      acento2: '#111114',
      linea: '#e8e8ec',
      ok: '#1f8a4c',
      aviso: '#b8860b',
      peligro: '#c11f43'
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
    id: 'grana-mensajeria',
    nombre: 'Grana y mensajería',
    banda: 'clara',
    nota: 'Un rojo profundo que hace de marca y el verde de mensajería que ya significa algo para todo el mundo.',
    tokens: {
      fondo: '#fbf7f1',
      superficie: '#ffffff',
      superficie2: '#fffdfa',
      tinta: '#2c2018',
      apagado: '#7b6e65',
      acento: '#a4262c',
      acentoSolido: '#a4262c',
      acentoFuerte: '#7c181d',
      acentoTexto: '#8e1f25',
      onAcento: '#fbf7f1',
      acento2: '#25d366',
      linea: '#ece0d4',
      ok: '#1f8a4c',
      aviso: '#c98a1e',
      peligro: '#a4262c'
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
    id: 'noche-neon',
    nombre: 'Noche neón',
    banda: 'oscura',
    nota: 'Tres superficies de gris azulado y tres acentos con un trabajo cada uno: lima, cian y rosa.',
    tokens: {
      fondo: '#0d0f14',
      superficie: '#161a22',
      superficie2: '#1e2430',
      tinta: '#f2f4f8',
      apagado: '#8b93a3',
      acento: '#c8f04c',
      acentoSolido: '#c8f04c',
      acentoFuerte: '#a8d42c',
      acentoTexto: '#c8f04c',
      onAcento: '#0d0f14',
      acento2: '#38e1d4',
      linea: '#262d3a',
      ok: '#c8f04c',
      aviso: '#ffb84d',
      peligro: '#ff5e82'
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
    id: 'savia-naranja',
    nombre: 'Savia y naranja',
    banda: 'clara',
    nota: 'Verde fresco de marca, naranja que avisa y rojo que corrige, nunca al revés. Trae reverso oscuro.',
    tokens: {
      fondo: '#f4f7f4',
      superficie: '#ffffff',
      superficie2: '#fbfdfb',
      tinta: '#1c2b21',
      apagado: '#67736a',
      acento: '#1f9d55',
      acentoSolido: '#157040',
      acentoFuerte: '#157040',
      acentoTexto: '#157040',
      onAcento: '#ffffff',
      acento2: '#e67e22',
      linea: '#dde6de',
      ok: '#1f9d55',
      aviso: '#e67e22',
      peligro: '#e74c3c'
    },
    // Esta es la unica paleta con un segundo tema completo.
    reverso: {
      fondo: '#10151c',
      superficie: '#1a212c',
      superficie2: '#222b38',
      tinta: '#eef2f6',
      apagado: '#8694a6',
      linea: '#2b3644'
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
    id: 'arena-salvia',
    nombre: 'Arena y salvia',
    banda: 'clara',
    nota: 'Crema y arena con un acento terracota y una salvia que hace de segunda voz.',
    tokens: {
      fondo: '#f5ead8',
      superficie: '#ebddc5',
      superficie2: '#f9f4ed',
      tinta: '#201e1d',
      apagado: '#645c50',
      acento: '#c67139',
      acentoSolido: '#8c491a',
      acentoFuerte: '#8c491a',
      acentoTexto: '#8c491a',
      onAcento: '#f5ead8',
      acento2: '#7a8a5e',
      linea: '#dcd3c4',
      ok: '#56633f',
      aviso: '#b2622d',
      peligro: '#9c3a1e'
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
    id: 'pergamino-oro',
    nombre: 'Pergamino y oro',
    banda: 'clara',
    nota: 'Gris cálido y un oro apagado que aparece poco y siempre por algo.',
    tokens: {
      fondo: '#f3f2f2',
      superficie: '#eae9e9',
      superficie2: '#f8f4f4',
      tinta: '#201f1d',
      apagado: '#605d5d',
      acento: '#b68235',
      acentoSolido: '#7d5411',
      acentoFuerte: '#7d5411',
      acentoTexto: '#7d5411',
      onAcento: '#f3f2f2',
      acento2: '#ac803e',
      linea: '#d7d3d3',
      ok: '#4f6b3a',
      aviso: '#a06f24',
      peligro: '#8f2f2f'
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
    id: 'acero-plano',
    nombre: 'Acero y azul de plano',
    banda: 'clara',
    nota: 'Neutros fríos y un solo acento de saturación baja: el color marca lo interactivo y poco más.',
    tokens: {
      fondo: '#f2f2f3',
      superficie: '#e9e9ea',
      superficie2: '#f5f5f8',
      tinta: '#1d1f20',
      apagado: '#5d5d60',
      acento: '#5980a6',
      acentoSolido: '#2c455d',
      acentoFuerte: '#2c455d',
      acentoTexto: '#2c455d',
      onAcento: '#f2f2f3',
      acento2: '#728fab',
      linea: '#d4d4d7',
      ok: '#3f6b4a',
      aviso: '#8a6d1f',
      peligro: '#8f3a3a'
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
  },
  {
    id: 'tinta-oro',
    nombre: 'Tinta y oro',
    banda: 'oscura',
    nota: 'Una tinta casi negra y cálida, marfil para leer y un oro que enmarca: va en filetes, no en rellenos.',
    tokens: {
      fondo: '#14110d',
      superficie: '#1c1813',
      superficie2: '#241e17',
      tinta: '#f1e8d8',
      apagado: '#a89a84',
      acento: '#c9a255',
      acentoSolido: '#c9a255',
      acentoFuerte: '#a8823a',
      acentoTexto: '#d4b26e',
      onAcento: '#14110d',
      acento2: '#9c7b4a',
      linea: '#3a3126',
      ok: '#9fbf7a',
      aviso: '#e0b04c',
      peligro: '#e0806a'
    },
    colores: [
      ['Tinta', '#14110d', 'Fondo de página'],
      ['Estuche', '#1c1813', 'Superficie'],
      ['Relieve', '#241e17', 'Tarjeta, campo'],
      ['Filete', '#3a3126', 'Línea de un píxel'],
      ['Oro', '#c9a255', 'Acento, filete doble'],
      ['Oro viejo', '#a8823a', 'Estado pulsado'],
      ['Marfil', '#f1e8d8', 'Texto principal'],
      ['Marfil apagado', '#a89a84', 'Texto secundario']
    ]
  }
];

/* ============================================================
   EJE 2 — TIPOGRAFIAS
   `google` es lo que va tras family= en el enlace de Google Fonts, o null si
   la pila es la del sistema y no hay nada que descargar.
   ============================================================ */
export const tipografias = [
  {
    id: 'inter-mono',
    nombre: 'Inter Tight + JetBrains Mono',
    nota: 'Display de peso 900 con el interletraje muy cerrado. Lo monoespaciado marca dato o etiqueta técnica.',
    display: '"Inter Tight", "Inter", system-ui, sans-serif',
    cuerpo: '"Inter Tight", "Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
    pesoDisplay: 900,
    trackingDisplay: '-0.04em',
    cajaDisplay: 'none',
    google: 'Inter+Tight:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700',
    muestra: 'Alto voltaje'
  },
  {
    id: 'serif-titulares',
    nombre: 'Serif en titulares',
    nota: 'Serif solo arriba; el cuerpo va en la pila del sistema, sin peso extra que descargar.',
    display: 'Georgia, "Iowan Old Style", serif',
    cuerpo: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 700,
    trackingDisplay: '0',
    cajaDisplay: 'none',
    google: null,
    muestra: 'Titular en serif'
  },
  {
    id: 'caja-alta',
    nombre: 'Caja alta, letra abierta',
    nota: 'Una sola familia jugando con mayúsculas y espaciado. Editorial, mucho aire.',
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    cuerpo: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 500,
    trackingDisplay: '0.09em',
    cajaDisplay: 'uppercase',
    google: null,
    muestra: 'Caja alta'
  },
  {
    id: 'peso-alto',
    nombre: 'Pesos altos, cuerpo grande',
    nota: 'Pila del sistema con el cuerpo un punto más grande. Para leerse al sol y con prisa.',
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    cuerpo: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 800,
    trackingDisplay: '-0.01em',
    cajaDisplay: 'none',
    google: null,
    muestra: 'Peso alto'
  },
  {
    id: 'tabular',
    nombre: 'Cifras tabulares',
    nota: 'Pesos extremos y numeración tabular: cuando el dato es el contenido de la pantalla.',
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    cuerpo: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 800,
    trackingDisplay: '-0.02em',
    cajaDisplay: 'none',
    tabular: true,
    google: null,
    muestra: '48 min'
  },
  {
    id: 'neutra',
    nombre: 'Pila del sistema',
    nota: 'Sin descargar nada: aspecto nativo en cada dispositivo. La opción por defecto sensata.',
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    cuerpo: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 700,
    trackingDisplay: '0',
    cajaDisplay: 'none',
    google: null,
    muestra: 'Pila del sistema'
  },
  {
    id: 'caprasimo-figtree',
    nombre: 'Caprasimo + Figtree',
    nota: 'Display gruesa y redonda, que hace de mancha y no de texto largo, sobre una humanista.',
    display: '"Caprasimo", Georgia, serif',
    cuerpo: '"Figtree", ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 400,
    trackingDisplay: '0',
    cajaDisplay: 'none',
    google: 'Caprasimo&family=Figtree:wght@400;600;700',
    muestra: 'Forma redonda'
  },
  {
    id: 'cormorant-lora',
    nombre: 'Cormorant Garamond + Lora',
    nota: 'Dos serifs a propósito: la primera fina y de mucho contraste, la segunda hecha para pantalla.',
    display: '"Cormorant Garamond", Georgia, serif',
    cuerpo: '"Lora", Georgia, serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 600,
    trackingDisplay: '0',
    cajaDisplay: 'none',
    google: 'Cormorant+Garamond:wght@400;600&family=Lora:wght@400;600',
    muestra: 'Filete y serif'
  },
  {
    id: 'barlow',
    nombre: 'Barlow Condensed + Barlow',
    nota: 'La misma familia en dos anchos: condensada arriba, normal en el cuerpo.',
    display: '"Barlow Condensed", "Barlow", sans-serif',
    cuerpo: '"Barlow", ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 600,
    trackingDisplay: '0.04em',
    cajaDisplay: 'uppercase',
    google: 'Barlow+Condensed:wght@400;600&family=Barlow:wght@400;500;700',
    muestra: 'Condensada'
  },
  {
    id: 'pixel',
    nombre: 'Press Start 2P + Pixelify Sans',
    nota: 'Titulares en la letra de una recreativa de 8 bits; el cuerpo en una pixelada que sí se lee a 16 píxeles.',
    // Las mayusculas con tilde de Press Start 2P son mas bajas: en una rejilla
    // de 8x8 no cabe otra cosa. Pixelify va detras para lo que no traiga (€, ▲).
    display: '"Press Start 2P", "Pixelify Sans", ui-monospace, monospace',
    cuerpo: '"Pixelify Sans", ui-sans-serif, system-ui, sans-serif',
    mono: '"VT323", ui-monospace, monospace',
    pesoDisplay: 400,
    trackingDisplay: '0',
    cajaDisplay: 'uppercase',
    tabular: true,
    google: 'Press+Start+2P&family=Pixelify+Sans:wght@400;600;700&family=VT323',
    muestra: 'Nivel 1'
  },
  {
    id: 'anton-archivo',
    nombre: 'Anton + Archivo',
    nota: 'Una condensada de cartel, siempre en mayúsculas y enorme, sobre una grotesca sobria para el texto.',
    display: '"Anton", Impact, "Arial Narrow", sans-serif',
    cuerpo: '"Archivo", ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 400,
    trackingDisplay: '0.01em',
    cajaDisplay: 'uppercase',
    google: 'Anton&family=Archivo:wght@400;500;700',
    muestra: 'Cartel'
  },
  {
    id: 'space-grotesk',
    nombre: 'Space Grotesk + Space Mono',
    nota: 'Una grotesca de rasgos raros y peso firme, con su monoespaciada para las cifras. Directa, sin rodeos.',
    display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    cuerpo: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
    pesoDisplay: 700,
    trackingDisplay: '-0.03em',
    cajaDisplay: 'none',
    google: 'Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700',
    muestra: 'Sin rodeos'
  },
  {
    id: 'cormorant-cursiva',
    nombre: 'Cormorant en cursiva + Lora',
    nota: 'Titulares en una serif de mucho contraste y en cursiva, como grabados en oro; el cuerpo en una serif de pantalla.',
    display: '"Cormorant Garamond", Georgia, serif',
    cuerpo: '"Lora", Georgia, serif',
    mono: 'ui-monospace, monospace',
    pesoDisplay: 500,
    estiloDisplay: 'italic',
    trackingDisplay: '0',
    cajaDisplay: 'none',
    google: 'Cormorant+Garamond:ital,wght@0,400;0,600;1,500;1,600&family=Lora:wght@400;600',
    muestra: 'Oro y cursiva'
  }
];

/* ============================================================
   EJE 3 — ELEMENTOS
   La forma, sin color ni tipografia: radio, filo, sombra, densidad y grosor de
   icono. `botonPrincipal` decide si la accion principal se rellena o se
   contornea, que es lo que mas cambia el caracter de una pantalla.
   ============================================================ */
export const elementos = [
  {
    id: 'pastilla-mutante',
    nombre: 'Pastilla mutante',
    nota: 'En reposo es pastilla y al activarse se cuadra. La profundidad se dibuja con anillos de luz, no con sombras.',
    radio: '12px',
    radioBoton: '999px',
    radioActivo: '10px',
    filo: '1px',
    sombra: 'anillo',
    densidad: 1.0,
    grosorIcono: 2,
    botonPrincipal: 'solido',
    piel: 'mutante'
  },
  {
    id: 'redondeado',
    nombre: 'Redondeado',
    nota: 'Radio de 16 en todo y zonas pulsables que nunca bajan de 44 píxeles de alto.',
    radio: '16px',
    radioBoton: '16px',
    radioActivo: '16px',
    filo: '1px',
    sombra: 'suave',
    densidad: 1.0,
    grosorIcono: 1.7,
    botonPrincipal: 'solido'
  },
  {
    id: 'recto',
    nombre: 'Recto',
    nota: 'Sin radio, sin sombras, sin degradados. Todo se separa con líneas de un píxel.',
    radio: '0px',
    radioBoton: '0px',
    radioActivo: '0px',
    filo: '1px',
    sombra: 'ninguna',
    densidad: 1.0,
    grosorIcono: 1.6,
    botonPrincipal: 'solido'
  },
  {
    id: 'generoso',
    nombre: 'Generoso',
    nota: 'Pocos elementos y muy grandes. Cada pantalla resuelve una cosa.',
    radio: '16px',
    radioBoton: '16px',
    radioActivo: '16px',
    filo: '1px',
    sombra: 'suave',
    densidad: 1.15,
    grosorIcono: 1.8,
    botonPrincipal: 'solido'
  },
  {
    id: 'muy-redondo',
    nombre: 'Muy redondo',
    nota: 'El radio más alto del catálogo. Objetivos pulsables enormes, para tocarse con prisa.',
    radio: '18px',
    radioBoton: '18px',
    radioActivo: '18px',
    filo: '1px',
    sombra: 'suave',
    densidad: 1.05,
    grosorIcono: 1.8,
    botonPrincipal: 'solido'
  },
  {
    id: 'pastilla',
    nombre: 'Pastilla',
    nota: 'Contenedores muy curvos y todo lo pulsable en pastilla. Las formas redondas necesitan aire.',
    radio: '16px',
    radioBoton: '999px',
    radioActivo: '999px',
    filo: '1px',
    sombra: 'suave',
    densidad: 1.1,
    grosorIcono: 2.75,
    botonPrincipal: 'solido'
  },
  {
    id: 'filete',
    nombre: 'Filete',
    nota: 'Casi recto pero no del todo. Los contenedores no se rellenan: se delimitan con un filete.',
    radio: '4px',
    radioBoton: '4px',
    radioActivo: '4px',
    filo: '1px',
    sombra: 'ninguna',
    densidad: 1.15,
    grosorIcono: 1.4,
    botonPrincipal: 'contorno',
    piel: 'filete'
  },
  {
    id: 'plano-tecnico',
    nombre: 'Plano técnico',
    nota: 'Rejilla de 24 píxeles a la vista y escala apretada. Para pantallas con mucho dato.',
    radio: '4px',
    radioBoton: '4px',
    radioActivo: '4px',
    filo: '1px',
    sombra: 'ninguna',
    densidad: 0.85,
    grosorIcono: 1.4,
    rejilla: '24px',
    botonPrincipal: 'solido',
    piel: 'plano'
  },
  {
    id: 'pixel',
    nombre: 'Pixel',
    nota: 'Sin una curva: las esquinas se muerden en escalón de 4 píxeles y las sombras son bloques sólidos, sin desenfoque.',
    radio: '0px',
    radioBoton: '0px',
    radioActivo: '0px',
    filo: '4px',
    sombra: 'dura',
    densidad: 1.0,
    grosorIcono: 2.5,
    botonPrincipal: 'solido',
    piel: 'pixel'
  },
  {
    id: 'vidrio',
    nombre: 'Vidrio esmerilado',
    nota: 'Superficies translúcidas que flotan sobre un fondo de luz de color. El borde es un reflejo, no una línea.',
    radio: '22px',
    radioBoton: '999px',
    radioActivo: '999px',
    filo: '1px',
    sombra: 'vidrio',
    densidad: 1.05,
    grosorIcono: 1.6,
    botonPrincipal: 'solido',
    piel: 'vidrio'
  },
  {
    id: 'arcilla',
    nombre: 'Arcilla',
    nota: 'Todo parece moldeado en arcilla blanda: luz por arriba, sombra por abajo y ni un solo borde.',
    radio: '28px',
    radioBoton: '999px',
    radioActivo: '999px',
    filo: '0px',
    sombra: 'arcilla',
    densidad: 1.1,
    grosorIcono: 2.2,
    botonPrincipal: 'solido',
    piel: 'arcilla'
  },
  {
    id: 'neobrutal',
    nombre: 'Neobrutal',
    nota: 'Bordes de tinta de tres píxeles y sombras duras desplazadas. Al pulsar, la pieza se hunde hasta tocar su sombra.',
    radio: '6px',
    radioBoton: '6px',
    radioActivo: '6px',
    filo: '3px',
    sombra: 'dura',
    densidad: 1.05,
    grosorIcono: 2.4,
    botonPrincipal: 'solido',
    piel: 'neobrutal'
  },
  {
    id: 'cartel',
    nombre: 'Cartel',
    nota: 'Reglas gruesas, titulares enormes y bloques de color plano, como un cartel pegado en la calle.',
    radio: '0px',
    radioBoton: '0px',
    radioActivo: '0px',
    filo: '3px',
    sombra: 'ninguna',
    densidad: 1.1,
    grosorIcono: 2,
    botonPrincipal: 'solido',
    piel: 'cartel'
  },
  {
    id: 'relieve',
    nombre: 'Relieve',
    nota: 'Todo es plano menos la acción principal, que tiene relieve de verdad: capas, luz arriba y un hundimiento al pulsarla.',
    radio: '12px',
    radioBoton: '12px',
    radioActivo: '12px',
    filo: '1px',
    sombra: 'suave',
    densidad: 1.05,
    grosorIcono: 1.8,
    botonPrincipal: 'solido',
    piel: 'relieve'
  }
];

/* ============================================================
   PRESETS — las nueve combinaciones por defecto
   Son atajos, no jaulas: el configurador deja cambiar los tres ejes.
   ============================================================ */
export const presets = [
  {
    id: 'halogeno', nombre: 'Halógeno', ficha: 'halogeno.html',
    proyectoCD: '8769416e-1dd7-434b-a0fd-cc15d9cbe526',
    paleta: 'carbon-lima', tipografia: 'inter-mono', elementos: 'pastilla-mutante',
    titular: 'Negro verdoso, un lima de alto voltaje y radios que mutan.'
  },
  {
    id: 'terracota', nombre: 'Terracota', ficha: 'terracota.html',
    proyectoCD: '589fbc66-4234-4521-b64f-de9fbecfb874',
    paleta: 'barro-crema', tipografia: 'serif-titulares', elementos: 'relieve',
    titular: 'Terracota sobre crema y un botón que se hunde al pulsarlo.'
  },
  {
    id: 'editorial', nombre: 'Editorial', ficha: 'editorial.html',
    proyectoCD: '432f110a-8f48-40bf-894f-7ab0f58fcef0',
    paleta: 'tinta-fucsia', tipografia: 'anton-archivo', elementos: 'cartel',
    titular: 'Cartel en blanco y negro con un fucsia que corta.'
  },
  {
    id: 'carmin', nombre: 'Carmín', ficha: 'carmin.html',
    proyectoCD: '08b67aa5-0aef-4ef2-851f-6c8d1c005cf5',
    paleta: 'grana-mensajeria', tipografia: 'space-grotesk', elementos: 'neobrutal',
    titular: 'Rojo profundo, bordes de tinta y sombras duras.'
  },
  {
    id: 'neon', nombre: 'Neón', ficha: 'neon.html',
    proyectoCD: '540c21e0-fe5a-4e91-aad2-dedf374746c6',
    paleta: 'noche-neon', tipografia: 'pixel', elementos: 'pixel',
    titular: 'Recreativa de 8 bits: lima, cian y rosa sobre la noche.'
  },
  {
    id: 'savia', nombre: 'Savia', ficha: 'savia.html',
    proyectoCD: 'cf7e59fc-8f8a-473d-b299-6496f08a26fc',
    paleta: 'savia-naranja', tipografia: 'neutra', elementos: 'vidrio',
    titular: 'Vidrio esmerilado sobre luz verde y naranja.'
  },
  {
    id: 'organico', nombre: 'Orgánico', ficha: 'organico.html',
    proyectoCD: '7cc98fa6-2bde-41e0-ab0d-b159cef78977',
    paleta: 'arena-salvia', tipografia: 'caprasimo-figtree', elementos: 'arcilla',
    titular: 'Arena y salvia moldeadas en arcilla blanda.'
  },
  {
    id: 'clasico', nombre: 'Clásico', ficha: 'clasico.html',
    proyectoCD: 'af52629c-b8d8-4614-bdb5-07eb2ad98a04',
    paleta: 'tinta-oro', tipografia: 'cormorant-cursiva', elementos: 'filete',
    titular: 'Tinta profunda, filetes de oro y serif en cursiva.'
  },
  {
    id: 'industrial', nombre: 'Industrial', ficha: 'industrial.html',
    proyectoCD: '9c8f62a8-66ca-460d-9927-227b5af6cbd2',
    paleta: 'acero-plano', tipografia: 'barlow', elementos: 'plano-tecnico',
    titular: 'Gris frío, azul de plano y cotas a la vista.'
  }
];

/* ============================================================
   RESOLUCION
   Junta los tres ejes en un objeto plano. Es lo que consumen los generadores
   y lo que se vuelca a las variables --sd-*.
   ============================================================ */
const porId = (lista, id) => {
  const x = lista.find(e => e.id === id);
  if (!x) throw new Error(`No existe "${id}" en el catálogo`);
  return x;
};

export const buscarPaleta = id => porId(paletas, id);
export const buscarTipografia = id => porId(tipografias, id);
export const buscarElementos = id => porId(elementos, id);

// Dos iconos neutros para las muestras. Antes cada sistema traia los suyos, de
// su sector; ahora lo que la muestra tiene que ensenar es el GROSOR del trazo,
// que es lo que decide el eje de elementos.
const ICONOS_MUESTRA = [
  '<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M9 20v-6h6v6"/>',
  '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/>'
];

export function resolver({ paleta, tipografia, elementos: elem, ...resto }) {
  const p = buscarPaleta(paleta);
  const t = buscarTipografia(tipografia);
  const e = buscarElementos(elem);
  const k = p.tokens;

  return {
    ...resto,
    paleta: p, tipografia: t, elementos: e,
    // Rasgo escrito, no recordado: sale de los tres ejes.
    rasgo: `${p.banda === 'oscura' ? 'Oscuro' : 'Claro'} · ${e.nombre.toLowerCase()} · ${t.nombre}`,
    resumen: `${p.nota} ${t.nota} ${e.nota}`,
    // El radio entra en los tokens porque el bundle de Claude Design lo espera
    // ahi: alli un sistema si es un paquete cerrado.
    tokens: { ...k, radio: e.radio },
    colores: p.colores,
    acentos: [k.acento, k.fondo, k.tinta, k.acento2],

    fuentes: {
      display: t.display,
      cuerpo: t.cuerpo,
      mono: t.mono,
      pesoDisplay: t.pesoDisplay,
      google: t.google
    },

    // Muestra del carrusel A de la portada: paleta + tipografia.
    tipo: {
      fondo: p.banda === 'oscura' ? k.superficie : k.fondo,
      tinta: k.tinta,
      acento: k.acentoTexto,
      muestra: t.muestra,
      estilo: `font-family:${t.display};font-weight:${t.pesoDisplay}`
        + (t.estiloDisplay ? `;font-style:${t.estiloDisplay}` : '')
        + `;letter-spacing:${t.trackingDisplay};text-transform:${t.cajaDisplay}`
        + (t.tabular ? ';font-variant-numeric:tabular-nums' : ''),
      pie: t.nombre
    },

    // Muestra del carrusel B: los mismos componentes con la forma del eje.
    piezas: {
      radio: e.radioBoton,
      grosor: e.grosorIcono,
      solido: { texto: 'Aceptar', fondo: k.acentoSolido, tinta: k.onAcento },
      linea: { texto: 'Ver', color: k.acentoTexto },
      check: {
        fondo: k.acentoSolido,
        tinta: k.onAcento,
        radio: e.radioBoton === '999px' ? '50%' : e.radio
      },
      toggle: k.acento,
      iconos: ICONOS_MUESTRA
    }
  };
}

// Los nueve sistemas ya resueltos, en el orden del catalogo.
export const sistemas = presets.map(resolver);

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
