/**
 * Genera servicios/sistemas/tema.css a partir de los tres ejes de
 * sistemas-datos.mjs.
 *
 * El tema no se aplica con JavaScript inyectando estilos: se aplica con tres
 * atributos en <html>, y el CSS hace el resto.
 *
 *     <html data-paleta="carbon-lima" data-tipo="inter-mono" data-elem="pastilla-mutante">
 *
 * Asi cada pagina puede llevar su combinacion por defecto escrita en el HTML y
 * verse bien sin que corra una sola linea de JS. El selector solo cambia los
 * tres atributos.
 *
 * El vocabulario --sd-* es el mismo que ya consumia sistema.css, de modo que
 * las fichas de sistema quedan tematizables sin tocarlas.
 *
 *   node servicios/sistemas/generar-tema.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paletas, tipografias, elementos, presets } from './sistemas-datos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'tema.css');

/* ---------- color ---------- */
const bloquePaleta = p => {
  const t = p.tokens;
  const rev = p.reverso ? `

/* Reverso de "${p.nombre}": mismos componentes, otra piel. */
[data-paleta="${p.id}"] .sd-reverso {
  --sd-bg: ${p.reverso.fondo};
  --sd-surface: ${p.reverso.superficie};
  --sd-surface-2: ${p.reverso.superficie2};
  --sd-ink: ${p.reverso.tinta};
  --sd-muted: ${p.reverso.apagado};
  --sd-line: ${p.reverso.linea};
  background: var(--sd-bg);
  color: var(--sd-ink);
}` : '';

  return `/* ${p.nombre} — ${p.nota} */
[data-paleta="${p.id}"] {
  --sd-bg: ${t.fondo};
  --sd-surface: ${t.superficie};
  --sd-surface-2: ${t.superficie2};
  --sd-ink: ${t.tinta};
  --sd-muted: ${t.apagado};
  --sd-accent: ${t.acento};
  --sd-accent-strong: ${t.acentoFuerte};
  --sd-accent-solid: ${t.acentoSolido};
  --sd-accent-text: ${t.acentoTexto};
  --sd-on-accent: ${t.onAcento};
  --sd-accent-2: ${t.acento2};
  --sd-line: ${t.linea};
  --sd-ok: ${t.ok};
  --sd-warn: ${t.aviso};
  --sd-danger: ${t.peligro};
  --sd-banda: ${p.banda === 'oscura' ? 'dark' : 'light'};
  color-scheme: ${p.banda === 'oscura' ? 'dark' : 'light'};
}${rev}`;
};

/* ---------- tipografia ---------- */
const bloqueTipo = t => `/* ${t.nombre} — ${t.nota} */
[data-tipo="${t.id}"] {
  --sd-display: ${t.display};
  --sd-font: ${t.cuerpo};
  --sd-mono: ${t.mono};
  --sd-display-peso: ${t.pesoDisplay};
  --sd-display-tracking: ${t.trackingDisplay};
  --sd-display-caja: ${t.cajaDisplay};
  --sd-cifras: ${t.tabular ? 'tabular-nums' : 'normal'};
}`;

/* ---------- elementos ---------- */
// La sombra se escribe con color-mix sobre la tinta de la paleta, no con un
// color fijo: asi el mismo juego de elementos funciona en banda clara y oscura
// sin tener una variante por cada paleta.
const SOMBRAS = {
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
  }
};

// Cuando el juego de elementos contornea la accion principal, el boton solido
// deja de rellenarse. El :not() evita pisar las variantes de sistema.css.
const bloqueContorno = e => e.botonPrincipal !== 'contorno' ? '' : `

[data-elem="${e.id}"] .sd-btn:not([class*="sd-btn--"]) {
  background: transparent;
  border-color: var(--sd-accent);
  color: var(--sd-accent-text);
}`;

const bloqueElem = e => {
  const s = SOMBRAS[e.sombra];
  const esp = n => +(4 * e.densidad * n).toFixed(1);
  const rejilla = e.rejilla ? `\n  --sd-rejilla: ${e.rejilla};` : '';
  return `/* ${e.nombre} — ${e.nota} */
[data-elem="${e.id}"] {
  --sd-radius: ${e.radio};
  --sd-radius-btn: ${e.radioBoton};
  --sd-radius-activo: ${e.radioActivo};
  --sd-border: ${e.filo};
  --sd-densidad: ${e.densidad};
  --sd-icon-stroke: ${e.grosorIcono};
  --sd-boton: ${e.botonPrincipal};
  --sd-shadow-sm: ${s.sm};
  --sd-shadow-md: ${s.md};
  --sd-shadow-lg: ${s.lg};
  --sd-space-1: ${esp(1)}px;
  --sd-space-2: ${esp(2)}px;
  --sd-space-3: ${esp(3)}px;
  --sd-space-4: ${esp(4)}px;
  --sd-space-6: ${esp(6)}px;
  --sd-space-8: ${esp(8)}px;${rejilla}
}${bloqueContorno(e)}`;
};

/* ---------- los presets, como atajo ---------- */
// Poner data-preset en <html> no aplica nada por si mismo: lo lee el selector
// para saber de que combinacion parte la pagina y poder volver a ella.
const tablaPresets = presets.map(p =>
  `   ${p.id.padEnd(12)} ${p.paleta.padEnd(18)} ${p.tipografia.padEnd(20)} ${p.elementos}`
).join('\n');

const css = `/* TEMA EN VIVO — generado por generar-tema.mjs, no editar a mano.
   Fuente: sistemas-datos.mjs

   Se aplica con tres atributos independientes en <html>:

     <html data-paleta="…" data-tipo="…" data-elem="…">

   Cada eje es libre: ${paletas.length} paletas x ${tipografias.length} tipografias x ${elementos.length} juegos de
   elementos = ${paletas.length * tipografias.length * elementos.length} combinaciones. Los nueve presets son solo
   combinaciones de partida:

     preset       paleta             tipografia           elementos
${tablaPresets}

   Las fuentes de Google las carga selector-sistema.js cuando hacen falta; el
   CSS solo nombra las familias. */

/* Valores de partida, por si una pagina no declara los atributos: la
   combinacion del primer preset. */
:root {
  --sd-radius: 12px;
  --sd-radius-btn: 12px;
  --sd-border: 1px;
  --sd-densidad: 1;
  --sd-icon-stroke: 1.8;
  --sd-display-peso: 700;
  --sd-display-tracking: 0;
  --sd-display-caja: none;
  --sd-cifras: normal;
}

/* ============================================================
   EJE 1 — PALETAS
   ============================================================ */
${paletas.map(bloquePaleta).join('\n\n')}

/* ============================================================
   EJE 2 — TIPOGRAFIAS
   ============================================================ */
${tipografias.map(bloqueTipo).join('\n\n')}

/* ============================================================
   EJE 3 — ELEMENTOS
   ============================================================ */
${elementos.map(bloqueElem).join('\n\n')}

/* ============================================================
   ENGANCHES COMUNES
   Lo minimo para que una pagina que declare los atributos ya se vea con su
   tema, sin depender de la hoja de cada demo.
   ============================================================ */
.sd-tema {
  background: var(--sd-bg);
  color: var(--sd-ink);
  font-family: var(--sd-font);
}

.sd-tema h1,
.sd-tema h2,
.sd-tema h3,
.sd-tema .sd-display {
  font-family: var(--sd-display);
  font-weight: var(--sd-display-peso);
  letter-spacing: var(--sd-display-tracking);
  text-transform: var(--sd-display-caja);
}

.sd-tema :is(.sd-cifra, .sd-num) {
  font-variant-numeric: var(--sd-cifras);
}

/* El cambio de tema no debe animarse: con 648 combinaciones, una transicion
   de color en cada elemento se ve como un parpadeo sucio. */
@media (prefers-reduced-motion: no-preference) {
  .sd-tema,
  .sd-tema * {
    transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
}
`;

writeFileSync(SALIDA, css, 'utf8');
console.log(`tema.css: ${paletas.length} paletas, ${tipografias.length} tipografias, ${elementos.length} juegos de elementos`);
console.log(`${paletas.length * tipografias.length * elementos.length} combinaciones posibles`);

/* ============================================================
   tema-datos.js — el catalogo que necesita el selector en el navegador
   Es un .js que asigna un global, no un .json que haya que pedir con fetch:
   asi funciona igual abriendo el archivo desde disco.
   ============================================================ */
const catalogo = {
  paletas: paletas.map(p => ({
    id: p.id,
    nombre: p.nombre,
    banda: p.banda,
    nota: p.nota,
    muestras: [p.tokens.acento, p.tokens.fondo, p.tokens.tinta, p.tokens.acento2],
    fondo: p.tokens.fondo,
    tinta: p.tokens.tinta,
    acento: p.tokens.acento
  })),
  tipografias: tipografias.map(t => ({
    id: t.id,
    nombre: t.nombre,
    nota: t.nota,
    muestra: t.muestra,
    display: t.display,
    peso: t.pesoDisplay,
    tracking: t.trackingDisplay,
    caja: t.cajaDisplay,
    google: t.google
  })),
  elementos: elementos.map(e => ({
    id: e.id,
    nombre: e.nombre,
    nota: e.nota,
    radio: e.radio,
    radioBoton: e.radioBoton,
    densidad: e.densidad,
    boton: e.botonPrincipal
  })),
  presets: presets.map(p => ({
    id: p.id,
    nombre: p.nombre,
    ficha: p.ficha,
    titular: p.titular,
    paleta: p.paleta,
    tipo: p.tipografia,
    elem: p.elementos
  }))
};

writeFileSync(join(AQUI, 'tema-datos.js'),
  '/* Generado por generar-tema.mjs — no editar a mano. */\n'
  + 'window.SD_CATALOGO = ' + JSON.stringify(catalogo, null, 2) + ';\n', 'utf8');
console.log('tema-datos.js escrito');

/* ============================================================
   AUDITORIA
   Los pares que van a llevar texto de verdad. Si alguno no llega a 4,5:1 se
   avisa aqui, antes de publicar, en vez de descubrirlo en la pagina.
   ============================================================ */
const canal = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const avisos = [];
for (const p of paletas) {
  const t = p.tokens;
  const pares = [
    ['tinta sobre fondo', t.tinta, t.fondo],
    ['tinta sobre superficie', t.tinta, t.superficie],
    ['apagado sobre fondo', t.apagado, t.fondo],
    ['apagado sobre superficie', t.apagado, t.superficie],
    ['acento-texto sobre fondo', t.acentoTexto, t.fondo],
    ['acento-texto sobre superficie', t.acentoTexto, t.superficie],
    ['texto sobre relleno solido', t.onAcento, t.acentoSolido]
  ];
  for (const [etq, a, b] of pares) {
    const r = ratio(a, b);
    if (r < 4.5) avisos.push(`  ${p.nombre.padEnd(22)} ${etq.padEnd(30)} ${r.toFixed(2)}:1`);
  }
}

if (avisos.length) {
  console.log(`\nPOR DEBAJO DE 4,5:1 (${avisos.length}):`);
  avisos.forEach(a => console.log(a));
  process.exitCode = 1;
} else {
  console.log('contraste: los 7 pares de texto de las 9 paletas llegan a 4,5:1');
}
