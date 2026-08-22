/**
 * Construye, para cada sistema de sistemas-datos.mjs, el bundle que espera un
 * proyecto de Claude Design, y lo deja en .bundles-cd/<id>/:
 *
 *   theme.json          los parametros de los que sale todo lo demas
 *   styles.css          la unica hoja: tokens, rampas y capa de componentes
 *   readme.md           la guia escrita
 *   thumbnail.html      la portada del proyecto
 *   foundations/*.html  color, tipografia, reticula, iconos
 *   components/*.html   botones, formularios, tarjetas, navegacion, tabla, dialogo
 *
 * Cada preview lleva en su primera linea la marca <!-- @dsCard ... -->, que es
 * de donde el panel de Claude Design saca su indice de tarjetas.
 *
 * Las rampas 100-900 se calculan en OKLCh sobre una escala de luminosidad
 * perceptual compartida, para que el mismo paso de dos rampas distintas pese
 * lo mismo. El texto sobre relleno tintado no se elige a ojo: se busca el
 * primer paso de la rampa que llega a 4,5:1.
 *
 *   node servicios/sistemas/generar-bundle-cd.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sistemas } from './sistemas-datos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, '.bundles-cd');

/* ============================================================
   COLOR: sRGB <-> OKLab <-> OKLCh
   ============================================================ */
const aLineal = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const aGamma = c => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
};

const hexARgb = h => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbAHex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function rgbAOklab([R, G, B]) {
  const r = aLineal(R), g = aLineal(G), b = aLineal(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  ];
}

function oklabARgb([L, A, B]) {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
  return [
    aGamma(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    aGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    aGamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
  ];
}

const aOklch = hex => {
  const [L, a, b] = rgbAOklab(hexARgb(hex));
  return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) };
};

// Sale del gamut con facilidad al subir croma: se baja hasta que el redondeo
// de ida y vuelta deja de moverse, que es la senal de que ya esta recortando.
function deOklch({ L, C, h }) {
  for (let c = C; c > 0.0005; c -= 0.002) {
    const rgb = oklabARgb([L, c * Math.cos(h), c * Math.sin(h)]);
    const v = aOklch(rgbAHex(rgb));
    if (Math.abs(v.L - L) < 0.02 && Math.abs(v.C - c) < 0.02) return rgbAHex(rgb);
  }
  return rgbAHex(oklabARgb([L, 0, 0]));
}

/* ---------- rampas ---------- */
const PASOS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const L_OBJETIVO = [0.970, 0.925, 0.860, 0.775, 0.685, 0.585, 0.475, 0.360, 0.250];
// El croma cae en los extremos: un 100 muy saturado no sirve de relleno tenue
// y un 900 muy saturado no es un texto legible.
const C_FACTOR = [0.30, 0.55, 0.80, 0.95, 1.00, 0.98, 0.88, 0.72, 0.55];

function rampa(hexBase, { cromaMax = null } = {}) {
  const { C, h } = aOklch(hexBase);
  const base = cromaMax === null ? C : Math.min(C, cromaMax);
  const out = {};
  PASOS.forEach((p, i) => {
    out[p] = deOklch({ L: L_OBJETIVO[i], C: base * C_FACTOR[i], h });
  });
  return out;
}

/* ---------- contraste ---------- */
const lum = hex => {
  const [r, g, b] = hexARgb(hex).map(aLineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const mejorTexto = fondo =>
  contraste(fondo, '#ffffff') >= contraste(fondo, '#101010') ? '#ffffff' : '#101010';

// Primer paso de la rampa (de los oscuros hacia arriba, o al reves en fondo
// oscuro) que llega a 4,5:1 sobre `fondo`.
function pasoLegible(ramp, fondo, oscuro) {
  const orden = oscuro ? [300, 200, 100, 400, 500] : [700, 800, 900, 600, 500];
  for (const p of orden) if (contraste(ramp[p], fondo) >= 4.5) return ramp[p];
  return mejorTexto(fondo);
}

// Mezcla alfa sobre un fondo opaco, para poder medir un relleno tintado.
function mezclar(frente, fondo, alfa) {
  const f = hexARgb(frente), b = hexARgb(fondo);
  return rgbAHex([0, 1, 2].map(i => Math.round(alfa * f[i] + (1 - alfa) * b[i])));
}

/* ============================================================
   TOKENS DE UN SISTEMA
   ============================================================ */
function tokensDe(s) {
  const t = s.tokens;
  const oscuro = lum(t.fondo) < 0.25;
  const radio = t.radio === 'variable' ? 12 : parseInt(t.radio, 10);
  const densidad = s.id === 'carmin' ? 1.15 : s.id === 'neon' ? 1.05 : 1.0;

  const neutral = rampa(t.fondo, { cromaMax: 0.035 });
  const acento = rampa(t.acento);
  const acento2 = rampa(t.acento2);

  // Relleno tintado del acento y el texto que sí se lee encima.
  const tinte = mezclar(t.acento, t.superficie, 0.18);
  const tinteTexto = pasoLegible(acento, tinte, oscuro);
  const sobreAcento = mejorTexto(t.acento);
  const acentoTexto = pasoLegible(acento, t.fondo, oscuro);

  return {
    oscuro, radio, densidad, neutral, acento, acento2,
    tinte, tinteTexto, sobreAcento, acentoTexto,
    sombraBase: oscuro ? '#000000' : neutral[900]
  };
}

/* ============================================================
   styles.css
   ============================================================ */
const listaRampa = (nombre, r) =>
  PASOS.map(p => `  --color-${nombre}-${p}: ${r[p]};`).join('\n');

function hojaEstilos(s, k) {
  const t = s.tokens;
  const e = n => +(4 * k.densidad * n).toFixed(1);
  const enlaceFuente = s.fuentes.google
    ? `@import url("https://fonts.googleapis.com/css2?family=${s.fuentes.google}&display=swap");\n\n`
    : '';

  return `${enlaceFuente}/* ${s.nombre} — hoja unica del sistema.
   Tokens arriba, capa de componentes debajo. Todo lo que se construya con
   este sistema toma color, tipografia, espacio, radio y sombra de estas
   variables: nunca un hexadecimal ni un pixel a pelo.
   Generado desde sistemas-datos.mjs — no editar a mano. */

:root {
  /* --- roles --- */
  --color-bg: ${t.fondo};
  --color-surface: ${t.superficie};
  --color-text: ${t.tinta};
  --color-text-dim: ${t.apagado};
  --color-accent: ${t.acento};
  --color-accent-2: ${t.acento2};
  --color-line: ${t.linea};
  --color-divider: color-mix(in srgb, ${t.tinta} 16%, transparent);

  /* Texto en acento sobre el fondo de pagina: el acento puro no siempre
     llega a 4,5:1, asi que el rol de texto es un paso de la rampa. */
  --color-accent-text: ${k.acentoTexto};
  --color-on-accent: ${k.sobreAcento};
  --color-accent-tint: ${k.tinte};
  --color-on-accent-tint: ${k.tinteTexto};

  /* --- rampas: mismo paso, mismo peso visual --- */
${listaRampa('neutral', k.neutral)}

${listaRampa('accent', k.acento)}

${listaRampa('accent-2', k.acento2)}

  /* --- tipografia --- */
  --font-heading: ${s.fuentes.display};
  --font-heading-weight: ${s.fuentes.pesoDisplay};
  --font-body: ${s.fuentes.cuerpo};
  --font-mono: ${s.fuentes.mono};

  /* --- espacio: escala al ${k.densidad.toFixed(2)} --- */
  --space-1: ${e(1)}px;
  --space-2: ${e(2)}px;
  --space-3: ${e(3)}px;
  --space-4: ${e(4)}px;
  --space-6: ${e(6)}px;
  --space-8: ${e(8)}px;

  /* --- radio --- */
  --radius-sm: ${Math.max(0, Math.round(k.radio / 2))}px;
  --radius-md: ${k.radio}px;
  --radius-lg: ${Math.round(k.radio * 1.75)}px;
  --radius-pill: ${k.radio >= 16 ? '999px' : `${k.radio}px`};

  /* --- elevacion, ya afinada a este fondo --- */
  --shadow-sm: 0 1px 2px color-mix(in srgb, ${k.sombraBase} 14%, transparent);
  --shadow-md: 0 3px 10px color-mix(in srgb, ${k.sombraBase} 16%, transparent);
  --shadow-lg: 0 12px 32px color-mix(in srgb, ${k.sombraBase} 22%, transparent);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  padding: var(--space-6);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  margin: 0 0 var(--space-3);
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  line-height: 1.15;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.75rem; }
h3 { font-size: 1.25rem; }
h4 { font-size: 1rem; }
p  { margin: 0 0 var(--space-4); }

a { color: var(--color-accent-text); }

::selection {
  background: color-mix(in srgb, var(--color-accent) 30%, transparent);
}

/* El foco de teclado es del sistema, nunca el azul del navegador. */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ============================================================
   COMPONENTES
   ============================================================ */

/* --- acciones --- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font: inherit;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.btn:hover { background: var(--color-accent-${k.oscuro ? '400' : '600'}); }
.btn:active { background: var(--color-accent-${k.oscuro ? '300' : '700'}); }

.btn-secondary {
  background: transparent;
  border-color: var(--color-accent);
  color: var(--color-accent-text);
}

.btn-secondary:hover {
  background: var(--color-accent-tint);
  color: var(--color-on-accent-tint);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-dim);
}

.btn-ghost:hover {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  color: var(--color-text);
}

.btn-block { width: 100%; justify-content: center; }
.btn[disabled] { opacity: 0.45; cursor: not-allowed; }

.tag {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-accent-tint);
  color: var(--color-on-accent-tint);
  font-size: 0.78rem;
  font-weight: 600;
}

.tag-accent-2 {
  background: color-mix(in srgb, var(--color-accent-2) 18%, transparent);
  color: var(--color-accent-2-${k.oscuro ? '200' : '800'});
}

.tag-neutral {
  background: var(--color-neutral-${k.oscuro ? '800' : '200'});
  color: var(--color-neutral-${k.oscuro ? '200' : '800'});
}

.tag-outline {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--color-line);
  color: var(--color-text-dim);
}

/* --- formulario, sobre elementos nativos --- */
.field { display: grid; gap: var(--space-2); margin-bottom: var(--space-4); }

.field > label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-dim);
}

.input {
  padding: var(--space-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.input::placeholder { color: var(--color-text-dim); }

.radio {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-right: var(--space-4);
  cursor: pointer;
}

.radio input { accent-color: var(--color-accent); width: 1.05em; height: 1.05em; }

.seg {
  display: inline-flex;
  padding: var(--space-1);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
}

.seg-opt {
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-dim);
  font: inherit;
  cursor: pointer;
}

.seg-opt[aria-selected="true"] {
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: 600;
}

/* --- superficies --- */
.card {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.card-kicker {
  display: block;
  margin-bottom: var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-accent-text);
}

.card-title { margin: 0 0 var(--space-2); }
.card-body { margin: 0 0 var(--space-3); color: var(--color-text-dim); }
.card-meta { font-size: 0.82rem; color: var(--color-text-dim); }

.elev-sm { box-shadow: var(--shadow-sm); }
.elev-md { box-shadow: var(--shadow-md); }
.elev-lg { box-shadow: var(--shadow-lg); }

/* --- navegacion --- */
.nav {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-line);
  background: var(--color-surface);
}

.nav-brand {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 1.1rem;
  margin-right: auto;
}

.nav a { color: var(--color-text-dim); text-decoration: none; }
.nav a:hover,
.nav a[aria-current="page"] { color: var(--color-accent-text); }

/* --- tabla --- */
.table { width: 100%; border-collapse: collapse; }

.table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-line);
  text-align: left;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

.table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-divider);
}

/* --- dialogo --- */
.dialog-backdrop {
  display: grid;
  place-items: center;
  padding: var(--space-8);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, ${k.sombraBase} 55%, transparent);
}

.dialog {
  width: min(24rem, 100%);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.dialog-title { margin: 0 0 var(--space-2); }
.dialog-body { margin: 0 0 var(--space-6); color: var(--color-text-dim); }
.dialog-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }

.hr { height: 1px; border: 0; margin: var(--space-6) 0; background: var(--color-line); }
`;
}

/* ============================================================
   PREVIEWS
   ============================================================ */
const pagina = (s, tarjeta, cuerpo) => `<!-- @dsCard group="${tarjeta.grupo}" name="${tarjeta.nombre}" subtitle="${tarjeta.pie}" viewport="${tarjeta.viewport}" -->
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tarjeta.nombre} — ${s.nombre}</title>
<link rel="stylesheet" href="${tarjeta.raiz}styles.css">
</head>
<body>
${cuerpo}
</body>
</html>
`;

const muestra = (hex, nombre, rol, texto) => `      <li style="background:${hex};color:${texto}">
        <b>${nombre}</b>
        <code>${hex.toUpperCase()}</code>
        <span>${rol}</span>
      </li>`;

const cssMuestrario = `
  .muestrario { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: var(--space-2); list-style: none; margin: 0 0 var(--space-6); padding: 0; }
  .muestrario li { display: grid; gap: 2px; padding: var(--space-3); border-radius: var(--radius-sm); font-size: 0.75rem; }
  .muestrario code { font-family: var(--font-mono); font-size: 0.72rem; opacity: 0.85; }
  .muestrario span { opacity: 0.75; }
  .tira { display: flex; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: var(--space-6); }
  .tira i { flex: 1; height: 3rem; display: grid; place-items: end center; padding-bottom: 3px; font: 600 0.6rem/1 var(--font-mono); font-style: normal; }
`;

function fColor(s, k) {
  const t = s.tokens;
  const roles = [
    [t.fondo, 'bg', 'Fondo de pagina'],
    [t.superficie, 'surface', 'Tarjeta y campo'],
    [t.tinta, 'text', 'Texto principal'],
    [t.apagado, 'text-dim', 'Texto secundario'],
    [t.acento, 'accent', 'Acento principal'],
    [t.acento2, 'accent-2', 'Segundo acento'],
    [t.linea, 'line', 'Filo de un pixel'],
    [k.acentoTexto, 'accent-text', 'Texto en acento']
  ];
  const tira = (nombre, r) => `    <h3>${nombre}</h3>
    <div class="tira">${PASOS.map(p =>
      `<i style="background:${r[p]};color:${mejorTexto(r[p])}">${p}</i>`).join('')}</div>`;

  return pagina(s, { grupo: 'Foundations', nombre: 'Color', pie: 'Roles y las tres rampas 100-900, todo en variables CSS', viewport: '640x620', raiz: '../' },
`<style>${cssMuestrario}</style>
<h2>Color</h2>
<p>Ocho roles y tres rampas. Cada paso de una rampa pesa lo mismo que el mismo paso de otra, porque se generan sobre una escala de luminosidad perceptual compartida en OKLCh.</p>
<ul class="muestrario">
${roles.map(([hex, n, rol]) => muestra(hex, n, rol, mejorTexto(hex))).join('\n')}
</ul>
${tira('Neutral', k.neutral)}
${tira('Accent', k.acento)}
${tira('Accent 2', k.acento2)}
<p>Los pasos claros (100-300) son para rellenos tintados, hover y filos suaves; el 500 es la base del rol; los oscuros (700-900) para texto sobre relleno tintado y estados pulsados. Prefiere un paso de la rampa a un <code>color-mix()</code> improvisado.</p>`);
}

function fType(s) {
  return pagina(s, { grupo: 'Foundations', nombre: 'Tipografia', pie: `${s.tipo.pie} — escala fija; la densidad mueve el espacio, no los cuerpos`, viewport: '640x640', raiz: '../' },
`<style>
  .esp { display: grid; gap: var(--space-4); }
  .esp > div { display: grid; gap: var(--space-1); }
  .meta { font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.09em; text-transform: uppercase; color: var(--color-text-dim); }
</style>
<h2>Tipografia</h2>
<p>${s.tipo.pie}. La escala es fija: la densidad del sistema mueve el espacio entre elementos, nunca el cuerpo del texto.</p>
<div class="esp">
  <div><span class="meta">h1 · 2,5rem</span><h1 style="margin:0">${s.tipo.muestra}</h1></div>
  <div><span class="meta">h2 · 1,75rem</span><h2 style="margin:0">Un segundo nivel</h2></div>
  <div><span class="meta">h3 · 1,25rem</span><h3 style="margin:0">Y un tercero</h3></div>
  <div><span class="meta">cuerpo · 1rem</span><p style="margin:0">El cuerpo va en <code style="font-family:var(--font-mono)">--font-body</code>. Un parrafo de ejemplo del largo que suele tener de verdad, para ver como se comporta la medida y el interlineado cuando hay dos lineas y no una.</p></div>
  <div><span class="meta">pie · 0,82rem</span><p style="margin:0;font-size:0.82rem;color:var(--color-text-dim)">Nota al pie, metadatos y disponibilidad.</p></div>
  <div><span class="meta">mono · 0,82rem</span><p style="margin:0;font-family:var(--font-mono);font-size:0.82rem">REF 0421 · 24 px · lote 8</p></div>
</div>`);
}

function fLayout(s, k) {
  const e = n => +(4 * k.densidad * n).toFixed(1);
  const pasos = [1, 2, 3, 4, 6, 8];
  return pagina(s, { grupo: 'Foundations', nombre: 'Espacio y elevacion', pie: `Escala al ${k.densidad.toFixed(2)}, radio ${k.radio}px y tres niveles de sombra`, viewport: '640x560', raiz: '../' },
`<style>
  .barra { display: grid; grid-template-columns: 5rem 1fr; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); font-family: var(--font-mono); font-size: 0.72rem; }
  .barra i { display: block; height: 0.85rem; border-radius: 2px; background: var(--color-accent); }
  .cajas { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-top: var(--space-4); }
  .cajas div { display: grid; place-items: center; width: 7rem; height: 4.5rem; border-radius: var(--radius-md); background: var(--color-surface); font-size: 0.75rem; }
  .radios { display: flex; gap: var(--space-4); margin-top: var(--space-4); }
  .radios div { display: grid; place-items: center; width: 5rem; height: 4rem; background: var(--color-accent-tint); color: var(--color-on-accent-tint); font-size: 0.72rem; }
</style>
<h2>Espacio y elevacion</h2>
<p>La escala va al ${k.densidad.toFixed(2)} sobre una base de 4 pixeles. Usa las variables, no los numeros: si la densidad cambia, todo se mueve solo.</p>
${pasos.map(p => `<div class="barra"><span>--space-${p}</span><i style="width:${e(p)}px"></i></div>`).join('\n')}
<h3 style="margin-top:var(--space-6)">Radio</h3>
<div class="radios">
  <div style="border-radius:var(--radius-sm)">sm</div>
  <div style="border-radius:var(--radius-md)">md</div>
  <div style="border-radius:var(--radius-lg)">lg</div>
  <div style="border-radius:var(--radius-pill)">pill</div>
</div>
<h3 style="margin-top:var(--space-6)">Elevacion</h3>
<div class="cajas">
  <div class="elev-sm">shadow-sm</div>
  <div class="elev-md">shadow-md</div>
  <div class="elev-lg">shadow-lg</div>
</div>`);
}

const ICONOS_BASE = [
  ['Inicio', '<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M9 20v-6h6v6"/>'],
  ['Buscar', '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.3-4.3"/>'],
  ['Perfil', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
  ['Ajustes', '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>'],
  ['Hora', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  ['Aviso', '<path d="M12 4 2 20h20L12 4Z"/><path d="M12 10v4M12 17h.01"/>']
];

function fIcons(s, k) {
  const grosor = k.radio >= 16 ? 2.4 : 1.6;
  const svg = (etq, d, tam) =>
    `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${etq}">${d}</svg>`;
  return pagina(s, { grupo: 'Foundations', nombre: 'Iconos', pie: `Lucide a trazo ${grosor}, SVG en linea sobre currentColor`, viewport: '640x400', raiz: '../' },
`<style>
  .fila { display: flex; align-items: center; gap: var(--space-6); margin-bottom: var(--space-6); color: var(--color-text); }
  .fila--acento { color: var(--color-accent-text); }
</style>
<h2>Iconos</h2>
<p>Lucide, en linea y sobre <code style="font-family:var(--font-mono)">currentColor</code>, con el trazo a ${grosor} para que pese lo mismo que la tipografia del sistema.</p>
<div class="fila">${ICONOS_BASE.map(([e, d]) => svg(e, d, 24)).join('')}</div>
<div class="fila fila--acento">${ICONOS_BASE.map(([e, d]) => svg(e, d, 20)).join('')}</div>
<div class="fila">${ICONOS_BASE.slice(0, 3).map(([e, d]) => svg(e, d, 16)).join('')}</div>
<div class="fila">
  <button class="btn">${svg('Anadir', '<path d="M12 5v14M5 12h14"/>', 18)} Con icono</button>
  <button class="btn btn-secondary">${svg('Buscar', ICONOS_BASE[1][1], 18)} Buscar</button>
</div>`);
}

function cButtons(s) {
  return pagina(s, { grupo: 'Components', nombre: 'Botones y etiquetas', pie: 'Las tres variantes de accion y las cuatro etiquetas, con sus estados', viewport: '640x420', raiz: '../' },
`<style>.fila { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-6); align-items: center; }</style>
<h2>Botones y etiquetas</h2>
<div class="fila">
  <button class="btn">Aceptar</button>
  <button class="btn btn-secondary">Ver mas</button>
  <button class="btn btn-ghost">Cancelar</button>
  <button class="btn" disabled>No disponible</button>
</div>
<div class="fila"><button class="btn btn-block">Ancho completo</button></div>
<div class="fila">
  <span class="tag">Acento</span>
  <span class="tag tag-accent-2">Segundo</span>
  <span class="tag tag-neutral">Neutro</span>
  <span class="tag tag-outline">Contorno</span>
</div>
<p style="font-size:0.85rem;color:var(--color-text-dim)">Los estados vienen de serie: el hover y el pulsado salen de la rampa del acento, el foco de teclado es un anillo de 2px en acento y lo deshabilitado baja al 45 % de opacidad. No los reescribas por pagina.</p>`);
}

function cForms(s) {
  return pagina(s, { grupo: 'Components', nombre: 'Formularios', pie: 'Campos, radios y control segmentado sobre elementos nativos, sin script', viewport: '640x480', raiz: '../' },
`<h2>Formularios</h2>
<div class="field">
  <label for="n">Nombre</label>
  <input class="input" id="n" type="text" placeholder="Escribe aqui">
</div>
<div class="field">
  <label for="c">Correo</label>
  <input class="input" id="c" type="email" value="hola@ejemplo.com">
</div>
<div class="field">
  <label>Eleccion</label>
  <div>
    <label class="radio"><input type="radio" name="r" checked> Primera opcion</label>
    <label class="radio"><input type="radio" name="r"> Segunda opcion</label>
  </div>
</div>
<div class="field">
  <label>Control segmentado</label>
  <div class="seg" role="tablist">
    <button class="seg-opt" role="tab" aria-selected="true">Uno</button>
    <button class="seg-opt" role="tab" aria-selected="false">Dos</button>
    <button class="seg-opt" role="tab" aria-selected="false">Tres</button>
  </div>
</div>
<p style="font-size:0.85rem;color:var(--color-text-dim)">Todo son elementos nativos: el radio usa <code style="font-family:var(--font-mono)">accent-color</code> y el foco es el del sistema. Sin JavaScript.</p>`);
}

function cCards(s) {
  const tarjeta = (clase, titulo) => `  <article class="card ${clase}">
    <span class="card-kicker">Etiqueta</span>
    <h3 class="card-title">${titulo}</h3>
    <p class="card-body">Dos lineas de apoyo: que es, y el unico dato que hace falta para decidir.</p>
    <div class="card-meta">Metadato · segundo metadato</div>
  </article>`;
  return pagina(s, { grupo: 'Components', nombre: 'Tarjetas', pie: 'La tarjeta con antetitulo, titulo, cuerpo y pie, y los tres niveles de elevacion', viewport: '640x420', raiz: '../' },
`<style>.rejilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: var(--space-4); }</style>
<h2>Tarjetas</h2>
<div class="rejilla">
${tarjeta('elev-sm', 'Elevacion baja')}
${tarjeta('elev-md', 'Elevacion media')}
${tarjeta('elev-lg', 'Elevacion alta')}
</div>`);
}

function cNav(s) {
  return pagina(s, { grupo: 'Components', nombre: 'Navegacion', pie: 'La barra de cabecera sobre una apertura de pagina', viewport: '640x360', raiz: '../' },
`<h2>Navegacion</h2>
<nav class="nav">
  <span class="nav-brand">${s.nombre}</span>
  <a href="#" aria-current="page">Inicio</a>
  <a href="#">Catalogo</a>
  <a href="#">Contacto</a>
  <button class="btn">Entrar</button>
</nav>
<div style="padding:var(--space-8) 0">
  <h1 style="margin-bottom:var(--space-3)">Apertura de pagina</h1>
  <p style="max-width:44ch;color:var(--color-text-dim)">La barra se apoya en la superficie y se separa del contenido con un filo de un pixel. El enlace activo toma el rol de texto en acento.</p>
</div>`);
}

function cTable(s) {
  const fila = (a, b, c, etq) => `    <tr><td>${a}</td><td>${b}</td><td style="font-family:var(--font-mono)">${c}</td><td>${etq}</td></tr>`;
  return pagina(s, { grupo: 'Components', nombre: 'Tabla', pie: 'Cabecera tematizada, filas separadas por el divisor y estados con etiqueta', viewport: '640x380', raiz: '../' },
`<h2>Tabla</h2>
<table class="table">
  <thead><tr><th>Elemento</th><th>Grupo</th><th>Referencia</th><th>Estado</th></tr></thead>
  <tbody>
${fila('Primer elemento', 'Grupo A', 'REF 0421', '<span class="tag">Activo</span>')}
${fila('Segundo elemento', 'Grupo A', 'REF 0422', '<span class="tag tag-neutral">En pausa</span>')}
${fila('Tercer elemento', 'Grupo B', 'REF 0510', '<span class="tag tag-accent-2">Revision</span>')}
${fila('Cuarto elemento', 'Grupo B', 'REF 0511', '<span class="tag tag-outline">Archivado</span>')}
  </tbody>
</table>`);
}

function cDialog(s) {
  return pagina(s, { grupo: 'Components', nombre: 'Dialogo', pie: 'Un modal en el nivel de elevacion mas alto, dentro de un marco estatico', viewport: '640x420', raiz: '../' },
`<h2>Dialogo</h2>
<div class="dialog-backdrop">
  <div class="dialog">
    <h3 class="dialog-title">Confirmar la accion</h3>
    <p class="dialog-body">Una frase que diga que va a pasar exactamente, sin rodeos y sin preguntar dos veces lo mismo.</p>
    <div class="dialog-actions">
      <button class="btn btn-ghost">Cancelar</button>
      <button class="btn">Aceptar</button>
    </div>
  </div>
</div>`);
}

/* ---------- portada del proyecto ---------- */
function thumbnail(s, k) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${s.nombre}</title>
<link rel="stylesheet" href="styles.css">
<style>
  body { display: grid; align-content: space-between; height: 100vh; padding: var(--space-8); }
  .tira { display: flex; gap: var(--space-2); }
  .tira i { width: 2.5rem; height: 2.5rem; border-radius: var(--radius-sm); }
</style>
</head>
<body>
<div>
  <h1 style="font-size:3rem;margin-bottom:var(--space-3)">${s.nombre}</h1>
  <p style="max-width:34ch;color:var(--color-text-dim)">${s.titular}</p>
</div>
<div class="tira">${s.acentos.map(c => `<i style="background:${c}"></i>`).join('')}</div>
</body>
</html>
`;
}

/* ---------- readme ---------- */
function readme(s, k) {
  const t = s.tokens;
  return `# Sistema de diseno ${s.nombre}

${s.resumen}

## Como se usa

- Enlaza la unica hoja desde cada pagina — \`<link rel="stylesheet" href="styles.css">\`, ajustando la ruta relativa — y saca de sus variables todo el color, la tipografia, el espacio, el radio y la sombra (\`var(--color-*)\`, \`var(--font-*)\`, \`var(--space-*)\`, \`var(--radius-*)\`, \`var(--shadow-*)\`). Nunca escribas un hexadecimal, un nombre de fuente ni un valor en pixeles que los tokens ya lleven.
- Construye con las clases de la tabla de abajo en vez de inventar otras paralelas. Las paginas de componentes son HTML plano: abre el codigo fuente y copia el marcado.
- Todo el sistema sale de \`theme.json\`. Para cambiar el aspecto, edita los tokens de la cabecera de \`styles.css\` y manten \`theme.json\` y esta guia al dia, para que no se separen de lo que el CSS hace de verdad.

## Rasgo

${s.rasgo}. ${s.titular}

## Color

Fondo \`--color-bg\` ${t.fondo} con \`--color-text\` ${t.tinta}, acento \`--color-accent\` ${t.acento} y segundo acento \`--color-accent-2\` ${t.acento2}. Cada rol lleva una rampa de 100 a 900 (\`--color-neutral-100\` … \`--color-accent-2-900\`) generada en OKLCh sobre una escala de luminosidad perceptual compartida, de modo que el mismo paso de dos rampas distintas pesa lo mismo.

Usa los pasos claros (100-300) para rellenos tintados, hover y filos suaves; el 500 como base del rol; los oscuros (700-900) para texto sobre relleno tintado y para el estado pulsado. Prefiere un paso de la rampa a un \`color-mix()\` improvisado.

**El acento no siempre vale como texto.** ${t.acento} sobre ${t.fondo} da ${contraste(t.acento, t.fondo).toFixed(2)}:1, asi que el rol \`--color-accent-text\` (${k.acentoTexto}) es el que se usa para texto en acento a tamano de parrafo: llega a ${contraste(k.acentoTexto, t.fondo).toFixed(2)}:1. Sobre el relleno tintado \`--color-accent-tint\` el texto es \`--color-on-accent-tint\` (${k.tinteTexto}), que da ${contraste(k.tinteTexto, k.tinte).toFixed(2)}:1.

## Tipografia

${s.tipo.pie}, cargadas como \`--font-heading\` y \`--font-body\`, con \`--font-mono\` para dato y etiqueta tecnica. La escala de cuerpos es fija: la densidad del sistema (${k.densidad.toFixed(2)}) mueve el espacio, no los tamanos. Usa las variables, no numeros sueltos.

## Estados

Ninguno es el del navegador. Cada elemento interactivo lleva un \`:hover\` y un pulsado sacados de la rampa del acento (un paso mas alla de la base), el foco de teclado es \`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }\`, \`::selection\` es un tinte del acento y lo deshabilitado baja al 45 % de opacidad. No los reescribas pagina por pagina.

## Componentes

| Clase | Que es | Se ve en |
| --- | --- | --- |
| \`.btn\` con \`.btn-secondary\`, \`.btn-ghost\`, \`.btn-block\` | Acciones; la principal es un relleno solido de acento | components/buttons.html |
| \`.tag\` con \`.tag-accent-2\`, \`.tag-neutral\`, \`.tag-outline\` | Etiquetas pequenas tintadas desde las rampas | components/buttons.html |
| \`.field\` + \`label\`, \`.input\`, \`.radio\`, \`.seg\` + \`.seg-opt\` | Campos y elecciones sobre elementos nativos, sin script | components/forms.html |
| \`.card\` con \`.card-kicker\`, \`.card-title\`, \`.card-body\`, \`.card-meta\`; \`.elev-sm/md/lg\` | Tarjetas sobre la superficie y los tres niveles de elevacion | components/cards.html |
| \`.nav\` + \`.nav-brand\` | La barra de cabecera | components/navigation.html |
| \`.table\` | Tabla de datos con cabecera tematizada y filas separadas | components/table.html |
| \`.dialog-backdrop\` + \`.dialog\` (+ \`.dialog-title/-body/-actions\`) | Un modal en el nivel de elevacion mas alto | components/dialog.html |
| \`.hr\` | Una regla horizontal | — |

## Archivos

- \`styles.css\` — la unica hoja: los tokens (\`:root\`, rampas, tipografia base) y la capa de componentes. Enlazala desde cada pagina.
- \`readme.md\` — esta guia.
- \`theme.json\` — los parametros de los que salen estos archivos.
- \`thumbnail.html\` — la portada del proyecto.
- \`foundations/color.html\` — los roles y las tres rampas, con sus notas de uso.
- \`foundations/type.html\` — la escala y el emparejamiento de fuentes a tamano real.
- \`foundations/layout.html\` — la escala de espaciado, los radios y la elevacion.
- \`foundations/icons.html\` — el juego de iconos a tamanos de interfaz.
- \`components/*.html\` — cada componente en todas sus variantes y estados.

## De donde sale

Este sistema esta tambien publicado en rubenpantxo.com, en \`servicios/sistemas/${s.ficha}\`. La fuente unica de los dos lados es \`servicios/sistemas/sistemas-datos.mjs\`: si aqui cambia algo, hay que volcarlo alli y regenerar la web.
`;
}

/* ---------- theme.json ---------- */
const themeJson = (s, k) => JSON.stringify({
  name: s.nombre,
  id: s.id,
  rasgo: s.rasgo,
  palette: {
    band: k.oscuro ? 'dark' : 'light',
    bg: s.tokens.fondo,
    surface: s.tokens.superficie,
    text: s.tokens.tinta,
    textDim: s.tokens.apagado,
    accent: s.tokens.acento,
    accent2: s.tokens.acento2,
    line: s.tokens.linea,
    accentText: k.acentoTexto,
    onAccent: k.sobreAcento
  },
  fonts: {
    heading: { family: s.fuentes.display, weight: s.fuentes.pesoDisplay },
    body: { family: s.fuentes.cuerpo },
    mono: { family: s.fuentes.mono },
    google: s.fuentes.google
  },
  density: k.densidad,
  radius: k.radio,
  origen: `rubenpantxo.com/servicios/sistemas/${s.ficha}`
}, null, 2) + '\n';

/* ============================================================
   ESCRITURA
   ============================================================ */
rmSync(SALIDA, { recursive: true, force: true });

const avisos = [];
let total = 0;

for (const s of sistemas) {
  const k = tokensDe(s);
  const dir = join(SALIDA, s.id);
  mkdirSync(join(dir, 'foundations'), { recursive: true });
  mkdirSync(join(dir, 'components'), { recursive: true });

  const archivos = {
    'theme.json': themeJson(s, k),
    'styles.css': hojaEstilos(s, k),
    'readme.md': readme(s, k),
    'thumbnail.html': thumbnail(s, k),
    'foundations/color.html': fColor(s, k),
    'foundations/type.html': fType(s),
    'foundations/layout.html': fLayout(s, k),
    'foundations/icons.html': fIcons(s, k),
    'components/buttons.html': cButtons(s),
    'components/forms.html': cForms(s),
    'components/cards.html': cCards(s),
    'components/navigation.html': cNav(s),
    'components/table.html': cTable(s),
    'components/dialog.html': cDialog(s)
  };

  for (const [ruta, contenido] of Object.entries(archivos)) {
    writeFileSync(join(dir, ruta), contenido, 'utf8');
    total++;
  }

  // Auditoria: los pares que van a llevar texto de verdad.
  const pares = [
    ['texto sobre fondo', s.tokens.tinta, s.tokens.fondo],
    ['apagado sobre fondo', s.tokens.apagado, s.tokens.fondo],
    ['apagado sobre superficie', s.tokens.apagado, s.tokens.superficie],
    ['texto en acento sobre fondo', k.acentoTexto, s.tokens.fondo],
    ['texto sobre acento', k.sobreAcento, s.tokens.acento],
    ['texto sobre tinte', k.tinteTexto, k.tinte]
  ];
  for (const [etq, a, b] of pares) {
    const r = contraste(a, b);
    if (r < 4.5) avisos.push(`  ${s.nombre.padEnd(11)} ${etq}: ${r.toFixed(2)}:1`);
  }
}

console.log(`${total} archivos en ${sistemas.length} bundles -> servicios/sistemas/.bundles-cd/`);
if (avisos.length) {
  console.log(`\nPOR DEBAJO DE 4,5:1 (${avisos.length}):`);
  avisos.forEach(a => console.log(a));
} else {
  console.log('contraste: todos los pares de texto llegan a 4,5:1');
}
