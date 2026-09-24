// COMPONENTES Y PIELES DE LOS SISTEMAS
//
// Tres cosas viven aqui, y las tres se escriben UNA vez:
//
//   CSS_COMPONENTES  la estructura de cada componente (boton, casilla, aviso...).
//                    Solo consume variables --sd-*: no sabe de que sistema es.
//   PIELES           lo que convierte la misma estructura en pixel art, vidrio
//                    esmerilado, arcilla... Cada juego de elementos de
//                    sistemas-datos.mjs puede nombrar una con `piel`.
//   KIT              los ocho componentes que ensena cada sistema, como los
//                    UI Kits de UIverse: el mismo marcado para los nueve.
//
// De aqui salen tres destinos, con el CSS reescrito para cada uno:
//
//   sistema.css      los componentes, tal cual       (generar-kits.mjs)
//   tema.css         las pieles, bajo [data-elem]      (generar-tema.mjs)
//   kits/<id>/*.html una pieza autonoma por componente (generar-kits.mjs)
//
// En las pieles, `&` es la raiz tematizada y `:lienzo-raiz` es lo que hace de
// fondo: en una pagina es el <body>; en una pieza suelta, la propia pieza.

/* ============================================================
   VARIABLES
   ============================================================ */

// La sombra se escribe con color-mix sobre la tinta de la paleta, no con un
// color fijo: asi el mismo juego de elementos funciona en banda clara y oscura.
export const SOMBRAS = {
  ninguna: { sm: 'none', md: 'none', lg: 'none' },
  suave: {
    sm: '0 1px 2px color-mix(in srgb, var(--sd-ink) 12%, transparent)',
    md: '0 3px 10px color-mix(in srgb, var(--sd-ink) 14%, transparent)',
    lg: '0 12px 32px color-mix(in srgb, var(--sd-ink) 20%, transparent)'
  },
  anillo: {
    sm: '0 0 0 1px color-mix(in srgb, var(--sd-accent) 22%, transparent)',
    md: '0 0 0 1px color-mix(in srgb, var(--sd-accent) 34%, transparent)',
    lg: '0 0 0 1px color-mix(in srgb, var(--sd-accent) 46%, transparent), 0 0 24px color-mix(in srgb, var(--sd-accent) 18%, transparent)'
  },
  // Bloques solidos sin desenfoque: pixel y neobrutal.
  dura: {
    sm: '2px 2px 0 var(--sd-ink)',
    md: '4px 4px 0 var(--sd-ink)',
    lg: '6px 6px 0 var(--sd-ink)'
  },
  // Sombra amplia y un reflejo de luz en el canto de arriba.
  vidrio: {
    sm: '0 1px 2px color-mix(in srgb, var(--sd-ink) 8%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.35)',
    md: '0 8px 24px color-mix(in srgb, var(--sd-ink) 12%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.45)',
    lg: '0 20px 50px color-mix(in srgb, var(--sd-ink) 18%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.5)'
  },
  // Luz arriba a la izquierda, sombra abajo a la derecha, y el volumen por
  // dentro: es lo que hace que parezca blando.
  arcilla: {
    sm: '4px 4px 10px color-mix(in srgb, var(--sd-ink) 14%, transparent), -3px -3px 8px rgb(255 255 255 / 0.7)',
    md: '10px 10px 24px color-mix(in srgb, var(--sd-ink) 16%, transparent), -8px -8px 20px rgb(255 255 255 / 0.75), inset 3px 3px 6px rgb(255 255 255 / 0.55), inset -4px -4px 8px color-mix(in srgb, var(--sd-ink) 7%, transparent)',
    lg: '16px 16px 36px color-mix(in srgb, var(--sd-ink) 20%, transparent), -10px -10px 28px rgb(255 255 255 / 0.8), inset 4px 4px 8px rgb(255 255 255 / 0.6), inset -6px -6px 12px color-mix(in srgb, var(--sd-ink) 8%, transparent)'
  }
};

export const varsPaleta = t => [
  ['--sd-bg', t.fondo],
  ['--sd-surface', t.superficie],
  ['--sd-surface-2', t.superficie2],
  ['--sd-ink', t.tinta],
  ['--sd-muted', t.apagado],
  ['--sd-accent', t.acento],
  ['--sd-accent-strong', t.acentoFuerte],
  ['--sd-accent-solid', t.acentoSolido],
  ['--sd-accent-text', t.acentoTexto],
  ['--sd-on-accent', t.onAcento],
  ['--sd-accent-2', t.acento2],
  ['--sd-line', t.linea],
  ['--sd-ok', t.ok],
  ['--sd-warn', t.aviso],
  ['--sd-danger', t.peligro]
];

export const varsTipo = t => [
  ['--sd-display', t.display],
  ['--sd-font', t.cuerpo],
  ['--sd-mono', t.mono],
  ['--sd-display-peso', t.pesoDisplay],
  ['--sd-display-estilo', t.estiloDisplay || 'normal'],
  ['--sd-display-tracking', t.trackingDisplay],
  ['--sd-display-caja', t.cajaDisplay],
  ['--sd-cifras', t.tabular ? 'tabular-nums' : 'normal']
];

export function varsElem(e) {
  const s = SOMBRAS[e.sombra];
  const esp = n => +(4 * e.densidad * n).toFixed(1) + 'px';
  return [
    ['--sd-radius', e.radio],
    ['--sd-radius-btn', e.radioBoton],
    ['--sd-radius-activo', e.radioActivo],
    ['--sd-border', e.filo],
    ['--sd-densidad', e.densidad],
    ['--sd-icon-stroke', e.grosorIcono],
    ['--sd-boton', e.botonPrincipal],
    ['--sd-shadow-sm', s.sm],
    ['--sd-shadow-md', s.md],
    ['--sd-shadow-lg', s.lg],
    ['--sd-space-1', esp(1)],
    ['--sd-space-2', esp(2)],
    ['--sd-space-3', esp(3)],
    ['--sd-space-4', esp(4)],
    ['--sd-space-6', esp(6)],
    ['--sd-space-8', esp(8)],
    ...(e.rejilla ? [['--sd-rejilla', e.rejilla]] : [])
  ];
}

/* ============================================================
   COMPONENTES
   Estructura sin color propio. El ancho de borde sale de --sd-border, asi que
   el neobrutal y el cartel lo engordan sin tocar esto.
   ============================================================ */
export const CSS_COMPONENTES = `
.sd-fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sd-space-3, 12px);
}

.sd-pila {
  display: grid;
  gap: var(--sd-space-3, 12px);
}

.sd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.72rem 1.35rem;
  border: var(--sd-border, 1px) solid transparent;
  border-radius: var(--sd-radius-btn, var(--sd-radius));
  background: var(--sd-accent-solid, var(--sd-accent));
  color: var(--sd-on-accent, var(--sd-bg));
  font: inherit;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-radius 0.22s ease, filter 0.12s ease;
}

.sd-btn:hover {
  filter: brightness(1.08);
}

.sd-btn--linea {
  background: transparent;
  border-color: var(--sd-accent);
  color: var(--sd-accent-text, var(--sd-accent));
}

.sd-btn--suave {
  background: color-mix(in srgb, var(--sd-accent) 14%, transparent);
  color: color-mix(in srgb, var(--sd-accent-text, var(--sd-accent)) 80%, var(--sd-ink));
}

.sd-btn--fantasma {
  background: transparent;
  color: var(--sd-muted);
}

.sd-btn--fantasma:hover {
  color: var(--sd-ink);
}

.sd-btn--ancho {
  width: 100%;
}

.sd-btn[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
  filter: none;
}

.sd-check {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
}

.sd-check input {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  border: max(1.5px, var(--sd-border, 1px)) solid color-mix(in srgb, var(--sd-ink) 40%, transparent);
  border-radius: min(var(--sd-radius), 6px);
  background: var(--sd-surface-2, var(--sd-surface));
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.sd-check input[type="radio"] {
  border-radius: 50%;
}

.sd-check input:checked {
  border-color: var(--sd-accent-solid, var(--sd-accent));
  background: var(--sd-accent-solid, var(--sd-accent));
  box-shadow: inset 0 0 0 3px var(--sd-surface-2, var(--sd-surface));
}

.sd-interruptor {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
}

.sd-interruptor input {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex: none;
  width: 2.75rem;
  height: 1.5rem;
  margin: 0;
  border: 0;
  border-radius: var(--sd-radius-btn, 999px);
  background: color-mix(in srgb, var(--sd-ink) 22%, transparent);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sd-interruptor input::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(1.5rem - 6px);
  height: calc(1.5rem - 6px);
  border-radius: inherit;
  background: var(--sd-surface, #fff);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
  transition: transform 0.2s ease;
}

.sd-interruptor input:checked {
  background: var(--sd-accent-solid, var(--sd-accent));
}

.sd-interruptor input:checked::before {
  transform: translateX(1.25rem);
}

.sd-campo {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.sd-campo span {
  font-size: 0.8rem;
  color: var(--sd-muted);
}

.sd-campo input {
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: var(--sd-border, 1px) solid var(--sd-line);
  border-radius: var(--sd-radius);
  background: var(--sd-surface-2, var(--sd-bg));
  color: var(--sd-ink);
  font: inherit;
}

.sd-campo input::placeholder {
  color: var(--sd-muted);
}

.sd-campo input:focus {
  outline: 2px solid var(--sd-accent);
  outline-offset: 1px;
}

.sd-insignia {
  display: inline-block;
  justify-self: start;
  width: fit-content;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sd-accent-2, var(--sd-accent)) 18%, transparent);
  color: color-mix(in srgb, var(--sd-accent-2, var(--sd-accent)) 70%, var(--sd-ink));
  font-size: 0.76rem;
  font-weight: 700;
}

.sd-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.8rem;
  border: var(--sd-border, 1px) solid var(--sd-line);
  border-radius: var(--sd-radius-btn, 999px);
  color: var(--sd-ink);
  font-size: 0.82rem;
}

.sd-chip--activo {
  border-color: var(--sd-ink);
  background: var(--sd-ink);
  color: var(--sd-bg);
}

.sd-pestanas {
  display: flex;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: var(--sd-border, 1px) solid var(--sd-line);
  border-radius: var(--sd-radius-btn, var(--sd-radius));
  background: var(--sd-surface-2, var(--sd-surface));
}

.sd-pestanas button {
  flex: 1;
  padding: 0.5rem 0.9rem;
  border: 0;
  border-radius: var(--sd-radius-btn, var(--sd-radius));
  background: transparent;
  color: var(--sd-muted);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.sd-pestanas button[aria-selected="true"] {
  background: var(--sd-surface);
  color: var(--sd-ink);
  box-shadow: var(--sd-shadow-sm, none);
}

.sd-aviso {
  --tono: var(--sd-accent);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.9rem 1rem;
  border: var(--sd-border, 1px) solid color-mix(in srgb, var(--tono) 45%, var(--sd-line));
  border-radius: var(--sd-radius);
  background: color-mix(in srgb, var(--tono) 10%, var(--sd-surface));
  color: var(--sd-ink);
}

.sd-aviso--ok { --tono: var(--sd-ok); }
.sd-aviso--atencion { --tono: var(--sd-warn); }
.sd-aviso--peligro { --tono: var(--sd-danger); }

.sd-aviso svg {
  width: 1.3rem;
  height: 1.3rem;
  margin-top: 0.1rem;
  color: var(--tono);
  stroke-width: var(--sd-icon-stroke, 2);
}

.sd-aviso strong {
  display: block;
  font-size: 0.95rem;
}

.sd-aviso p {
  margin: 0.15rem 0 0;
  font-size: 0.86rem;
  color: var(--sd-muted);
}

.sd-progreso {
  height: 0.55rem;
  overflow: hidden;
  border-radius: var(--sd-radius-btn, 999px);
  background: color-mix(in srgb, var(--sd-ink) 12%, transparent);
}

.sd-progreso > span {
  display: block;
  width: var(--v, 50%);
  height: 100%;
  border-radius: inherit;
  background: var(--sd-accent);
}

.sd-dato {
  display: grid;
  gap: 0.3rem;
  padding: 1.1rem 1.2rem;
  border: var(--sd-border, 1px) solid var(--sd-line);
  border-radius: var(--sd-radius);
  background: var(--sd-surface-2, var(--sd-surface));
  box-shadow: var(--sd-shadow-sm, none);
}

.sd-dato__etiqueta {
  font-size: 0.8rem;
  color: var(--sd-muted);
}

.sd-dato__valor {
  font-family: var(--sd-display, var(--sd-font));
  font-weight: var(--sd-display-peso, 700);
  font-style: var(--sd-display-estilo, normal);
  letter-spacing: var(--sd-display-tracking, 0);
  font-size: 2.4rem;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}

.sd-dato__delta {
  margin-bottom: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--sd-ok) 70%, var(--sd-ink));
}

.sd-ficha {
  display: grid;
  gap: 0.7rem;
  align-content: start;
  max-width: 22rem;
  padding: 1.2rem;
  border: var(--sd-border, 1px) solid var(--sd-line);
  border-radius: var(--sd-radius);
  background: var(--sd-surface-2, var(--sd-surface));
  box-shadow: var(--sd-shadow-sm, none);
}

.sd-ficha h4 {
  margin: 0;
  font-family: var(--sd-display, var(--sd-font));
  font-weight: var(--sd-display-peso, 700);
  font-style: var(--sd-display-estilo, normal);
  letter-spacing: var(--sd-display-tracking, 0);
  text-transform: var(--sd-display-caja, none);
  font-size: 1.15rem;
  line-height: 1.2;
}

.sd-ficha p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--sd-muted);
}

.sd-precio {
  color: var(--sd-muted);
}

.sd-precio strong {
  font-family: var(--sd-display, var(--sd-font));
  font-weight: var(--sd-display-peso, 700);
  font-style: var(--sd-display-estilo, normal);
  font-size: 2.2rem;
  color: var(--sd-ink);
}

.sd-lista {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;
}

.sd-lista li {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}

.sd-lista li::before {
  content: "";
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: var(--sd-radius-btn, 50%);
  background: var(--sd-accent);
}
`;

/* ============================================================
   PIELES
   Solo tocan lo que las distingue. Cuidado con background y border-color en
   .sd-btn: las variantes (--linea, --suave) los ponen, y una piel con la misma
   especificidad los pisaria. Por eso cada piel nombra la variante cuando la
   quiere distinta.
   ============================================================ */
const SUPERFICIES = '.sd-lienzo, .sd-ficha, .sd-dato, .sd-aviso, .sd-pestanas';

export const PIELES = {
  /* Halogeno: lo que ya era, afinado. El radio muta al tocarlo. */
  mutante: `
.sd-btn:hover,
.sd-btn:focus-visible { border-radius: var(--sd-radius-activo); }
.sd-btn:active { transform: scale(0.97); }
.sd-btn:not([class*="sd-btn--"]) { box-shadow: 0 0 0 0 transparent; }
.sd-btn:not([class*="sd-btn--"]):hover { box-shadow: 0 0 22px color-mix(in srgb, var(--sd-accent) 45%, transparent); }
.sd-ficha,
.sd-dato { box-shadow: var(--sd-shadow-md); }
.sd-ficha:hover,
.sd-dato:hover { box-shadow: var(--sd-shadow-lg); }
.sd-chip--activo { border-color: var(--sd-accent); background: transparent; color: var(--sd-accent-text); }
.sd-pestanas button[aria-selected="true"] { background: var(--sd-accent-solid); color: var(--sd-on-accent); }
.sd-insignia { border-radius: var(--sd-radius-activo); font-family: var(--sd-mono); letter-spacing: 0.08em; text-transform: uppercase; }
.sd-dato__etiqueta { font-family: var(--sd-mono); letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.7rem; }
`,

  /* Neon: recreativa de 8 bits. El borde escalonado son cuatro sombras sin
     desenfoque, una por lado: las esquinas quedan mordidas. */
  pixel: `
& { --pix: 4px; --pix-c: var(--sd-ink); }
:lienzo-raiz {
  -webkit-font-smoothing: none;
  background-image: repeating-linear-gradient(0deg, rgb(255 255 255 / 0.028) 0 1px, transparent 1px 3px);
}
.sd-titulo { font-size: clamp(1.5rem, 5.5vw, 2.8rem); line-height: 1.35; }
.sd-seccion > h2 { font-size: clamp(0.95rem, 2.4vw, 1.3rem); line-height: 1.5; }
.sd-muestra-display { line-height: 1.4; }
.sd-etiqueta { border-radius: 0; }
.sd-muestra-dato { font-size: 1.35rem; }
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas,
.sd-campo input {
  border: 0;
  border-radius: 0;
  box-shadow:
    0 calc(var(--pix) * -1) 0 0 var(--pix-c),
    0 var(--pix) 0 0 var(--pix-c),
    calc(var(--pix) * -1) 0 0 0 var(--pix-c),
    var(--pix) 0 0 0 var(--pix-c);
}
.sd-aviso { --pix-c: var(--tono); }
.sd-campo input { --pix-c: color-mix(in srgb, var(--sd-ink) 45%, transparent); --pix: 3px; }
.sd-campo input:focus { --pix-c: var(--sd-accent); outline: 0; }
.sd-ficha h4,
.sd-precio strong,
.sd-dato__valor { font-size: 0.9rem; line-height: 1.5; }
.sd-precio strong,
.sd-dato__valor { font-size: 1.5rem; color: var(--sd-accent-text); }
.sd-btn {
  border: 0;
  border-radius: 0;
  font-family: var(--sd-display);
  font-size: 0.66rem;
  text-transform: uppercase;
  line-height: 1.6;
  box-shadow:
    0 calc(var(--pix) * -1) 0 0 var(--pix-c),
    0 var(--pix) 0 0 var(--pix-c),
    calc(var(--pix) * -1) 0 0 0 var(--pix-c),
    var(--pix) 0 0 0 var(--pix-c),
    inset 0 calc(var(--pix) * -1) 0 0 rgb(0 0 0 / 0.28),
    inset 0 var(--pix) 0 0 rgb(255 255 255 / 0.25);
}
.sd-btn:hover { filter: none; transform: translateY(-2px); }
.sd-btn:active {
  transform: translateY(2px);
  box-shadow:
    0 calc(var(--pix) * -1) 0 0 var(--pix-c),
    0 var(--pix) 0 0 var(--pix-c),
    calc(var(--pix) * -1) 0 0 0 var(--pix-c),
    var(--pix) 0 0 0 var(--pix-c),
    inset 0 var(--pix) 0 0 rgb(0 0 0 / 0.28);
}
.sd-btn--linea { --pix-c: var(--sd-accent); }
.sd-btn--suave { --pix-c: color-mix(in srgb, var(--sd-accent) 40%, transparent); }
.sd-btn--fantasma { box-shadow: none; }
.sd-check input,
.sd-check input[type="radio"],
.sd-interruptor input,
.sd-interruptor input::before,
.sd-progreso,
.sd-progreso > span,
.sd-insignia,
.sd-chip,
.sd-pestanas button,
.sd-lista li::before { border-radius: 0; }
.sd-check input { border-width: 3px; }
.sd-interruptor input::before { box-shadow: none; }
.sd-progreso { height: 0.9rem; background: color-mix(in srgb, var(--sd-ink) 14%, transparent); }
.sd-progreso > span { background: repeating-linear-gradient(90deg, var(--sd-accent) 0 10px, transparent 10px 13px); }
.sd-insignia { font-family: var(--sd-mono); font-size: 1rem; line-height: 1; padding: 0.3rem 0.5rem; background: var(--sd-accent-2); color: var(--sd-bg); }
.sd-pestanas button { font-family: var(--sd-mono); font-size: 1.15rem; line-height: 1; }
.sd-pestanas button[aria-selected="true"] { background: var(--sd-accent-2); color: var(--sd-bg); box-shadow: none; }
.sd-chip { font-family: var(--sd-mono); font-size: 1.05rem; line-height: 1; }
.sd-dato__etiqueta,
.sd-campo span { font-family: var(--sd-mono); font-size: 1.05rem; text-transform: uppercase; }
`,

  /* Savia: vidrio esmerilado. El fondo es luz de color hecha con los dos
     acentos de la paleta; las superficies lo dejan pasar difuminado. */
  vidrio: `
:lienzo-raiz {
  background:
    radial-gradient(38rem 28rem at 8% 6%, color-mix(in srgb, var(--sd-accent) 42%, transparent), transparent 70%),
    radial-gradient(34rem 26rem at 92% 18%, color-mix(in srgb, var(--sd-accent-2) 40%, transparent), transparent 70%),
    radial-gradient(40rem 30rem at 50% 104%, color-mix(in srgb, var(--sd-accent) 30%, transparent), transparent 70%),
    var(--sd-bg);
  background-attachment: fixed;
}
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas {
  border: 1px solid color-mix(in srgb, #fff 60%, transparent);
  background: color-mix(in srgb, var(--sd-surface) 48%, transparent);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  backdrop-filter: blur(22px) saturate(170%);
  box-shadow: var(--sd-shadow-md);
}
.sd-aviso { background: color-mix(in srgb, var(--tono) 12%, color-mix(in srgb, var(--sd-surface) 50%, transparent)); }
.sd-campo input {
  border-color: color-mix(in srgb, #fff 55%, transparent);
  background: color-mix(in srgb, var(--sd-surface) 55%, transparent);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--sd-ink) 8%, transparent);
}
.sd-btn:not([class*="sd-btn--"]) {
  box-shadow: 0 6px 18px color-mix(in srgb, var(--sd-accent-solid) 35%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.35);
}
.sd-btn--linea,
.sd-btn--suave {
  border-color: color-mix(in srgb, #fff 60%, transparent);
  background: color-mix(in srgb, var(--sd-surface) 45%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: var(--sd-shadow-sm);
}
.sd-pestanas button[aria-selected="true"] {
  background: color-mix(in srgb, var(--sd-surface) 85%, transparent);
  box-shadow: var(--sd-shadow-sm);
}
.sd-chip { border-color: color-mix(in srgb, #fff 55%, transparent); background: color-mix(in srgb, var(--sd-surface) 40%, transparent); }
.sd-interruptor input { background: color-mix(in srgb, var(--sd-ink) 16%, transparent); box-shadow: inset 0 1px 3px color-mix(in srgb, var(--sd-ink) 15%, transparent); }
.sd-progreso { background: color-mix(in srgb, var(--sd-surface) 55%, transparent); box-shadow: inset 0 1px 2px color-mix(in srgb, var(--sd-ink) 10%, transparent); }
.sd-progreso > span { background: linear-gradient(90deg, var(--sd-accent), var(--sd-accent-2)); }
`,

  /* Organico: arcilla blanda. Nada tiene borde; el volumen es luz y sombra. */
  arcilla: `
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas {
  border: 0;
  background: var(--sd-surface);
  box-shadow: var(--sd-shadow-md);
}
.sd-aviso { background: color-mix(in srgb, var(--tono) 14%, var(--sd-surface)); }
.sd-btn {
  border: 0;
  box-shadow:
    6px 6px 14px color-mix(in srgb, var(--sd-ink) 22%, transparent),
    -4px -4px 10px rgb(255 255 255 / 0.65),
    inset 3px 3px 6px rgb(255 255 255 / 0.32),
    inset -4px -4px 8px rgb(0 0 0 / 0.16);
}
.sd-btn:hover { filter: none; transform: translateY(-1px); }
.sd-btn:active {
  transform: translateY(1px);
  box-shadow: inset 4px 4px 8px rgb(0 0 0 / 0.2), inset -3px -3px 6px rgb(255 255 255 / 0.3);
}
.sd-btn--linea,
.sd-btn--suave { background: var(--sd-surface); }
.sd-btn--fantasma { box-shadow: none; }
.sd-campo input,
.sd-check input,
.sd-interruptor input,
.sd-progreso {
  border: 0;
  background: var(--sd-bg);
  box-shadow: inset 4px 4px 8px color-mix(in srgb, var(--sd-ink) 13%, transparent), inset -4px -4px 8px rgb(255 255 255 / 0.75);
}
.sd-check input:checked {
  background: var(--sd-accent-solid);
  box-shadow: inset 0 0 0 4px var(--sd-bg), inset 3px 3px 6px rgb(0 0 0 / 0.2);
}
.sd-interruptor input:checked { background: var(--sd-accent-solid); box-shadow: inset 3px 3px 6px rgb(0 0 0 / 0.22); }
.sd-interruptor input::before { background: var(--sd-surface); box-shadow: 2px 2px 5px color-mix(in srgb, var(--sd-ink) 25%, transparent), inset 1px 1px 2px rgb(255 255 255 / 0.8); }
.sd-progreso { height: 0.8rem; }
.sd-progreso > span { box-shadow: inset 2px 2px 3px rgb(255 255 255 / 0.4), inset -2px -2px 4px rgb(0 0 0 / 0.15); }
.sd-pestanas { background: var(--sd-bg); box-shadow: inset 4px 4px 8px color-mix(in srgb, var(--sd-ink) 12%, transparent), inset -4px -4px 8px rgb(255 255 255 / 0.7); }
.sd-pestanas button[aria-selected="true"] { background: var(--sd-surface); box-shadow: var(--sd-shadow-sm); }
.sd-chip { border: 0; background: var(--sd-surface); box-shadow: var(--sd-shadow-sm); }
.sd-chip--activo { background: var(--sd-ink); }
`,

  /* Carmin: neobrutalismo. Tinta gruesa y una sombra dura que la pieza alcanza
     al pulsarla. */
  neobrutal: `
:lienzo-raiz {
  background-image: radial-gradient(color-mix(in srgb, var(--sd-ink) 16%, transparent) 1px, transparent 1.3px);
  background-size: 22px 22px;
}
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas,
.sd-campo input,
.sd-btn,
.sd-insignia,
.sd-chip,
.sd-check input,
.sd-interruptor input,
.sd-progreso { border: var(--sd-border) solid var(--sd-ink); }
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso { box-shadow: var(--sd-shadow-md); }
.sd-aviso { background: color-mix(in srgb, var(--tono) 22%, var(--sd-surface)); }
.sd-btn { box-shadow: var(--sd-shadow-md); font-weight: 700; }
.sd-btn:hover { filter: none; transform: translate(-2px, -2px); box-shadow: var(--sd-shadow-lg); }
.sd-btn:active { transform: translate(4px, 4px); box-shadow: 0 0 0 var(--sd-ink); }
.sd-btn--linea { border-color: var(--sd-ink); background: var(--sd-surface); }
.sd-btn--suave { border-color: var(--sd-ink); background: var(--sd-accent-2); color: var(--sd-ink); }
.sd-btn--fantasma { border-color: transparent; box-shadow: none; }
.sd-btn--fantasma:hover { box-shadow: none; transform: none; }
.sd-campo input:focus { outline: 0; box-shadow: 4px 4px 0 var(--sd-accent); }
.sd-check input:checked { border-color: var(--sd-ink); }
.sd-interruptor input { background: var(--sd-surface); }
.sd-interruptor input::before { top: 1px; left: 1px; background: var(--sd-ink); box-shadow: none; }
.sd-interruptor input:checked::before { background: var(--sd-surface); }
.sd-insignia { background: var(--sd-accent-2); color: var(--sd-ink); }
.sd-chip--activo { background: var(--sd-accent-solid); border-color: var(--sd-ink); color: var(--sd-on-accent); }
.sd-pestanas button[aria-selected="true"] { background: var(--sd-ink); color: var(--sd-bg); box-shadow: none; }
.sd-progreso { height: 0.9rem; background: var(--sd-surface); }
.sd-progreso > span { background: var(--sd-accent-solid); border-right: var(--sd-border) solid var(--sd-ink); }
.sd-dato__valor { font-family: var(--sd-mono); letter-spacing: -0.02em; }
.sd-etiqueta { border: 2px solid var(--sd-ink); border-radius: var(--sd-radius); background: var(--sd-accent-2); color: var(--sd-ink); }
`,

  /* Editorial: cartel. Reglas gruesas, titulares enormes, color plano. */
  cartel: `
.sd-cabecera { border-bottom: 8px solid var(--sd-ink); }
.sd-seccion { border-bottom: 3px solid var(--sd-ink); }
.sd-titulo { font-size: clamp(3.4rem, 13vw, 9rem); line-height: 0.86; letter-spacing: 0; }
.sd-seccion > h2 { font-size: clamp(2rem, 5.5vw, 3.6rem); line-height: 0.95; }
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas { border: var(--sd-border) solid var(--sd-ink); box-shadow: none; }
.sd-ficha { border-top-width: 12px; }
.sd-ficha h4 { font-size: 1.9rem; line-height: 0.95; }
.sd-btn {
  border-color: var(--sd-ink);
  font-family: var(--sd-display);
  font-weight: var(--sd-display-peso);
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sd-btn:not([class*="sd-btn--"]) { border-color: var(--sd-accent-solid); }
.sd-btn--linea { border-color: var(--sd-ink); color: var(--sd-ink); }
.sd-btn--suave { border-color: transparent; }
.sd-btn--fantasma { border-color: transparent; text-decoration: underline; text-underline-offset: 4px; }
.sd-campo input { border-width: 0 0 var(--sd-border); border-color: var(--sd-ink); background: transparent; padding-inline: 0; }
.sd-campo span,
.sd-dato__etiqueta { font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.72rem; color: var(--sd-ink); }
.sd-insignia { border-radius: 0; background: var(--sd-ink); color: var(--sd-bg); letter-spacing: 0.12em; text-transform: uppercase; }
.sd-chip { border-radius: 0; border-color: var(--sd-ink); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.74rem; }
.sd-chip--activo { background: var(--sd-accent-solid); border-color: var(--sd-accent-solid); color: var(--sd-on-accent); }
.sd-pestanas { padding: 0; gap: 0; }
.sd-pestanas button { border-radius: 0; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; }
.sd-pestanas button + button { border-left: var(--sd-border) solid var(--sd-ink); }
.sd-pestanas button[aria-selected="true"] { background: var(--sd-ink); color: var(--sd-bg); box-shadow: none; }
.sd-progreso { height: 0.75rem; border-radius: 0; }
.sd-progreso > span { border-radius: 0; background: var(--sd-accent-solid); }
.sd-dato__valor,
.sd-precio strong { font-size: 3.4rem; line-height: 0.9; }
.sd-aviso { border-left-width: 12px; border-left-color: var(--tono); }
.sd-lista li::before { border-radius: 0; background: var(--sd-ink); }
.sd-etiqueta { border-radius: 0; background: var(--sd-ink); color: var(--sd-bg); }
`,

  /* Terracota: todo plano salvo la accion principal, que tiene relieve. */
  relieve: `
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso,
.sd-pestanas { box-shadow: none; }
.sd-btn:not([class*="sd-btn--"]) {
  border: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--sd-accent-solid) 82%, #fff) 0%, var(--sd-accent-solid) 55%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    inset 0 -2px 0 rgb(0 0 0 / 0.14),
    0 4px 0 var(--sd-accent-strong),
    0 7px 14px color-mix(in srgb, var(--sd-accent-strong) 35%, transparent);
  transform: translateY(-2px);
}
.sd-btn:not([class*="sd-btn--"]):hover {
  filter: none;
  transform: translateY(-3px);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.35),
    inset 0 -2px 0 rgb(0 0 0 / 0.14),
    0 5px 0 var(--sd-accent-strong),
    0 9px 18px color-mix(in srgb, var(--sd-accent-strong) 38%, transparent);
}
.sd-btn:not([class*="sd-btn--"]):active {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 3px rgb(0 0 0 / 0.2),
    0 0 0 var(--sd-accent-strong),
    0 1px 3px color-mix(in srgb, var(--sd-accent-strong) 30%, transparent);
}
.sd-pestanas button[aria-selected="true"] { box-shadow: 0 1px 0 var(--sd-line), 0 2px 0 color-mix(in srgb, var(--sd-ink) 8%, transparent); }
.sd-chip--activo { background: var(--sd-accent-solid); border-color: var(--sd-accent-solid); color: var(--sd-on-accent); }
`,

  /* Clasico: filete doble de oro, versalitas espaciadas y cursiva. */
  filete: `
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso {
  border-color: color-mix(in srgb, var(--sd-accent) 50%, transparent);
  outline: 1px solid color-mix(in srgb, var(--sd-accent) 22%, transparent);
  outline-offset: 4px;
  box-shadow: none;
}
.sd-ficha,
.sd-dato { background: var(--sd-surface); }
.sd-seccion > h2::after {
  content: "";
  display: block;
  width: 3rem;
  height: 1px;
  margin-top: 0.7rem;
  background: var(--sd-accent);
}
.sd-btn {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.sd-insignia,
.sd-chip {
  border: 1px solid color-mix(in srgb, var(--sd-accent) 55%, transparent);
  border-radius: 0;
  background: transparent;
  color: var(--sd-accent-text);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.sd-chip--activo { background: var(--sd-accent-solid); color: var(--sd-on-accent); }
.sd-campo input { border-width: 0 0 1px; border-color: color-mix(in srgb, var(--sd-accent) 50%, transparent); border-radius: 0; background: transparent; padding-inline: 0; }
.sd-campo span,
.sd-dato__etiqueta { letter-spacing: 0.16em; text-transform: uppercase; font-size: 0.7rem; }
.sd-pestanas { border-color: color-mix(in srgb, var(--sd-accent) 45%, transparent); background: transparent; }
.sd-pestanas button[aria-selected="true"] { background: transparent; color: var(--sd-accent-text); box-shadow: inset 0 -1px 0 var(--sd-accent); }
.sd-progreso { height: 3px; }
.sd-lista li::before { width: 0.45rem; height: 0.45rem; border-radius: 0; transform: rotate(45deg); }
.sd-etiqueta { border: 1px solid color-mix(in srgb, var(--sd-accent) 55%, transparent); border-radius: 0; background: transparent; letter-spacing: 0.2em; }
.sd-dato__valor,
.sd-precio strong { font-size: 2.8rem; color: var(--sd-accent-text); }
`,

  /* Industrial: plano tecnico. Rejilla a la vista y marcas de corte en las
     esquinas de cada superficie, como las cotas de un plano. */
  plano: `
:lienzo-raiz {
  background-image:
    linear-gradient(color-mix(in srgb, var(--sd-line) 60%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--sd-line) 60%, transparent) 1px, transparent 1px);
  background-size: var(--sd-rejilla, 24px) var(--sd-rejilla, 24px);
}
.sd-titulo,
.sd-seccion > h2,
.sd-seccion > h3 { text-transform: uppercase; letter-spacing: 0.03em; }
.sd-lienzo,
.sd-ficha,
.sd-dato,
.sd-aviso {
  border-color: color-mix(in srgb, var(--sd-ink) 22%, transparent);
  box-shadow: none;
  background:
    linear-gradient(var(--sd-accent), var(--sd-accent)) left top / 12px 2px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) left top / 2px 12px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) right top / 12px 2px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) right top / 2px 12px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) left bottom / 12px 2px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) left bottom / 2px 12px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) right bottom / 12px 2px no-repeat,
    linear-gradient(var(--sd-accent), var(--sd-accent)) right bottom / 2px 12px no-repeat,
    var(--sd-surface);
}
.sd-aviso { border-left: 4px solid var(--tono); }
.sd-btn { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.86rem; }
.sd-campo span,
.sd-dato__etiqueta,
.sd-insignia,
.sd-chip { font-family: var(--sd-mono); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; }
.sd-insignia { border-radius: var(--sd-radius); }
.sd-dato__valor { font-family: var(--sd-mono); letter-spacing: -0.03em; }
.sd-progreso {
  height: 0.7rem;
  border-radius: 0;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-ink) 18%, transparent) 0 1px, transparent 1px 10%), color-mix(in srgb, var(--sd-ink) 8%, transparent);
}
.sd-progreso > span { border-radius: 0; }

.sd-etiqueta { border-radius: var(--sd-radius); font-family: var(--sd-mono); }`
};

/* ============================================================
   REESCRITURA DE SELECTORES
   El mismo CSS va a tres sitios, con tres prefijos distintos. Se parte a mano
   (no hay reglas anidadas salvo @media) para no meter una dependencia.
   ============================================================ */
function reglas(css) {
  const sin = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < sin.length) {
    const a = sin.indexOf('{', i);
    if (a === -1) break;
    const cabeza = sin.slice(i, a).trim();
    // busca la llave que cierra, contando anidadas
    let prof = 1, j = a + 1;
    while (j < sin.length && prof) {
      if (sin[j] === '{') prof++;
      else if (sin[j] === '}') prof--;
      j++;
    }
    const cuerpo = sin.slice(a + 1, j - 1);
    out.push({ cabeza, cuerpo });
    i = j;
  }
  return out;
}

const formatear = cuerpo => cuerpo.trim().split(';').map(d => d.trim()).filter(Boolean)
  .map(d => `  ${d.replace(/\s*\n\s*/g, '\n    ')};`).join('\n');

// `mapa` recibe un selector suelto y devuelve el reescrito (o null para
// descartar la regla, que es como el kit se queda solo con lo que usa).
export function reescribir(css, mapa) {
  return reglas(css).map(({ cabeza, cuerpo }) => {
    if (cabeza.startsWith('@media') || cabeza.startsWith('@supports')) {
      const dentro = reescribir(cuerpo, mapa);
      return dentro ? `${cabeza} {\n${dentro}\n}` : '';
    }
    if (cabeza.startsWith('@')) return `${cabeza} {${cuerpo}}`;
    const sels = cabeza.split(',').map(s => mapa(s.trim())).filter(Boolean);
    return sels.length ? `${sels.join(',\n')} {\n${formatear(cuerpo)}\n}` : '';
  }).filter(Boolean).join('\n\n');
}

// Para tema.css: la piel cuelga del atributo de <html>.
export function pielParaTema(idElem, piel) {
  const raiz = `[data-elem="${idElem}"]`;
  return reescribir(piel, s => {
    if (s.includes(':lienzo-raiz')) return s.replace(':lienzo-raiz', `${raiz} body`);
    if (s.startsWith('&')) return raiz + s.slice(1);
    return `${raiz} ${s}`;
  });
}

// Para una pieza suelta: todo cuelga de .sd-kit, y se tira lo que la pieza no
// usa para que el codigo copiado sea el justo.
export function paraKit(css, marcado) {
  const clases = new Set([...marcado.matchAll(/class="([^"]+)"/g)]
    .flatMap(m => m[1].split(/\s+/)).concat('sd-kit'));
  return reescribir(css, s => {
    if (s.includes(':lienzo-raiz')) return s.replace(':lienzo-raiz', '.sd-kit');
    if (s.startsWith('&')) return '.sd-kit' + s.slice(1);
    const usadas = [...s.matchAll(/\.([a-z][\w-]*)/g)].map(m => m[1]);
    // Las de fichas (.sd-titulo, .sd-seccion...) no existen en una pieza.
    if (usadas.some(c => !clases.has(c))) return null;
    return `.sd-kit ${s}`;
  });
}

/* ============================================================
   KIT — los ocho componentes de cada sistema
   Texto neutro a proposito: el kit ensena la forma, no un negocio. `n` es el
   id del sistema, para que los name de los radios no choquen en una pagina.
   ============================================================ */
const ICONO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';
const ICONO_ALERTA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.01"/></svg>';

export const KIT = [
  {
    id: 'botones',
    nombre: 'Botones',
    html: () => `<div class="sd-fila">
  <button class="sd-btn" type="button">Continuar</button>
  <button class="sd-btn sd-btn--linea" type="button">Ver más</button>
  <button class="sd-btn sd-btn--suave" type="button">Guardar</button>
  <button class="sd-btn sd-btn--fantasma" type="button">Cancelar</button>
</div>`
  },
  {
    id: 'tarjeta',
    nombre: 'Tarjeta',
    html: () => `<article class="sd-ficha">
  <span class="sd-insignia">Nuevo</span>
  <h4>Título de la tarjeta</h4>
  <p>Dos líneas que explican qué hay dentro y por qué merece la pena abrirla.</p>
  <div class="sd-progreso" role="progressbar" aria-label="Avance" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><span style="--v:64%"></span></div>
  <div class="sd-fila">
    <button class="sd-btn" type="button">Abrir</button>
    <button class="sd-btn sd-btn--fantasma" type="button">Más tarde</button>
  </div>
</article>`
  },
  {
    id: 'acceso',
    nombre: 'Acceso',
    html: () => `<div class="sd-ficha">
  <h4>Entrar</h4>
  <label class="sd-campo"><span>Correo</span><input type="email" placeholder="nombre@correo.com" autocomplete="off"></label>
  <label class="sd-campo"><span>Contraseña</span><input type="password" placeholder="••••••••" autocomplete="off"></label>
  <label class="sd-check"><input type="checkbox" checked> Recordarme</label>
  <button class="sd-btn sd-btn--ancho" type="button">Entrar</button>
</div>`
  },
  {
    id: 'seleccion',
    nombre: 'Selección',
    html: n => `<div class="sd-ficha">
  <label class="sd-interruptor"><input type="checkbox" role="switch" checked> Avisos</label>
  <label class="sd-interruptor"><input type="checkbox" role="switch"> Modo compacto</label>
  <label class="sd-check"><input type="checkbox" checked> Opción marcada</label>
  <label class="sd-check"><input type="checkbox"> Opción sin marcar</label>
  <label class="sd-check"><input type="radio" name="sd-${n}-r" checked> Primera</label>
  <label class="sd-check"><input type="radio" name="sd-${n}-r"> Segunda</label>
</div>`
  },
  {
    id: 'avisos',
    nombre: 'Avisos',
    html: () => `<div class="sd-pila">
  <div class="sd-aviso sd-aviso--ok" role="status">${ICONO_OK}<div><strong>Guardado</strong><p>Los cambios ya están a salvo.</p></div></div>
  <div class="sd-aviso sd-aviso--peligro" role="alert">${ICONO_ALERTA}<div><strong>No se pudo enviar</strong><p>Revisa la conexión e inténtalo otra vez.</p></div></div>
</div>`
  },
  {
    id: 'pestanas',
    nombre: 'Pestañas y filtros',
    html: () => `<div class="sd-pila">
  <div class="sd-pestanas" role="tablist" aria-label="Vista">
    <button type="button" role="tab" aria-selected="true">Resumen</button>
    <button type="button" role="tab" aria-selected="false">Detalle</button>
    <button type="button" role="tab" aria-selected="false">Historial</button>
  </div>
  <div class="sd-fila">
    <span class="sd-chip sd-chip--activo">Todo</span>
    <span class="sd-chip">Hoy</span>
    <span class="sd-chip">Esta semana</span>
  </div>
</div>`
  },
  {
    id: 'dato',
    nombre: 'Dato',
    html: () => `<div class="sd-dato">
  <span class="sd-dato__etiqueta">Visitas este mes</span>
  <strong class="sd-dato__valor">2.480</strong>
  <span class="sd-dato__delta">▲ 12 % frente al mes anterior</span>
  <div class="sd-progreso" role="progressbar" aria-label="Objetivo" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100"><span style="--v:72%"></span></div>
</div>`
  },
  {
    id: 'plan',
    nombre: 'Plan',
    html: () => `<article class="sd-ficha">
  <span class="sd-insignia">Recomendado</span>
  <h4>Plan estándar</h4>
  <p class="sd-precio"><strong>12 €</strong> / mes</p>
  <ul class="sd-lista">
    <li>Hasta cinco personas</li>
    <li>Copia de seguridad diaria</li>
    <li>Respuesta en un día</li>
  </ul>
  <button class="sd-btn sd-btn--ancho" type="button">Elegir plan</button>
</article>`
  }
];

// Los cuatro que ensena la galeria en la fila de cada sistema.
export const KIT_DESTACADOS = ['tarjeta', 'acceso', 'botones', 'dato'];
