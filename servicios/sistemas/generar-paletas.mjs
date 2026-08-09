/**
 * Genera el muestrario a partir de paletas-datos.mjs:
 *   - servicios/sistemas/paletas.html  (las 6 paletas de sistema + las 24 sueltas)
 *   - sustituye la <ul class="sd-paleta"> de cada ficha por bloques grandes
 *
 * El color del texto de cada muestra se elige aqui, no en el navegador: se
 * prueba negro y blanco y gana el que mas contraste da. Si ninguno llega a
 * 4,5:1 se avisa por consola en vez de publicarlo a ciegas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sistemas, capturas } from './paletas-datos.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const FICHAS = AQUI;

/* ---------- contraste ---------- */
const canal = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
const contraste = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const avisos = [];
function textoSobre(hex, etiqueta) {
  const negro = contraste(hex, '#101010');
  const blanco = contraste(hex, '#ffffff');
  const gana = negro >= blanco ? '#101010' : '#ffffff';
  const ratio = Math.max(negro, blanco);
  if (ratio < 4.5) avisos.push(`${etiqueta} ${hex}: ${ratio.toFixed(2)}:1`);
  return { color: gana, ratio };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- una muestra ---------- */
function muestra([nombre, hex, tercero]) {
  const rol = typeof tercero === 'string' ? tercero : null;
  const revisar = tercero === true;
  const { color } = textoSobre(hex, nombre);
  const HEX = hex.toUpperCase();
  return `        <li>
          <button class="pl-color" type="button" data-hex="${HEX}" style="--c:${hex};--t:${color}"
                  aria-label="Copiar ${HEX}, ${esc(nombre)}">
            <span class="pl-color__nombre">${esc(nombre)}${revisar ? ' <i class="pl-revisar" title="Leido de una captura: conviene confirmar el valor">?</i>' : ''}</span>
            <span class="pl-color__hex"><span>HEX</span> <b>${HEX}</b></span>${rol ? `
            <span class="pl-color__rol">${esc(rol)}</span>` : ''}
          </button>
        </li>`;
}

const rejilla = (colores, clase = '') =>
  `      <ul class="pl-rejilla${clase}">\n${colores.map(muestra).join('\n')}\n      </ul>`;

/* ---------- 1. paletas.html ---------- */
const grupoSistema = s => `    <section class="pl-grupo" id="${s.id}">
      <div class="pl-grupo__cab">
        <h3>${esc(s.nombre)}</h3>
        <a class="pl-grupo__ver" href="${s.id}.html">Ver el sistema completo &#8599;</a>
      </div>
      <p class="pl-grupo__nota">${esc(s.nota)}</p>
${rejilla(s.colores)}
    </section>`;

const TONOS = { calido: 'Cálidos', frio: 'Fríos', vivo: 'Vivos', neutro: 'Neutros' };

const grupoCaptura = c => `    <section class="pl-grupo">
      <div class="pl-grupo__cab">
        <h3>${esc(c.nombre)}</h3>
        <span class="pl-tono">${TONOS[c.tono]}</span>
      </div>
${rejilla(c.colores, ' pl-rejilla--suelta')}
    </section>`;

const porTono = t => capturas.filter(c => c.tono === t);
const bloqueTono = t => `    <h2 class="pl-seccion" id="tono-${t}">${TONOS[t]}</h2>
${porTono(t).map(grupoCaptura).join('\n')}`;

const total = capturas.reduce((n, c) => n + c.colores.length, 0)
  + sistemas.reduce((n, s) => n + s.colores.length, 0);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Muestrario de color — Sistemas de diseño</title>
<meta name="description" content="Muestrario de color agrupado por paletas: cada color a tamaño real, con su nombre y su hexadecimal. Un clic lo copia.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../apps/escenas/halogen.css">
<link rel="stylesheet" href="sistema.css">
<style>
  :root {
    --sd-bg: var(--canvas);
    --sd-surface: var(--surface);
    --sd-surface-2: var(--raised);
    --sd-ink: var(--ink);
    --sd-muted: var(--ink-dim);
    --sd-accent: var(--halogen);
    --sd-accent-2: var(--halogen);
    --sd-line: var(--hairline);
    --sd-radius: var(--r-morph);
    --sd-font: var(--font-sans);
    --sd-display: var(--font-sans);
  }
  body { line-height: 1.6; }
  .sd-titulo { font-weight: 900; letter-spacing: -0.04em; line-height: 0.92; }
</style>
<script src="copiar-color.js" defer></script>
</head>
<body>
<div class="sd-contenedor">

  <header class="sd-cabecera">
    <a class="sd-migas" href="../sistemas-de-diseno.html">&#8592; Todos los sistemas</a>
    <span class="hk-eyebrow">${total} colores</span>
    <h1 class="sd-titulo">Muestrario de color</h1>
    <p class="sd-bajada">Cada color a tamaño real, con su nombre y su hexadecimal para que no haya dudas de cuál es. Pulsa cualquiera y se copia el código al portapapeles.</p>
    <nav class="pl-indice" aria-label="Ir a una sección">
      <a href="#sistemas">Mis sistemas</a>
      <a href="#tono-calido">Cálidos</a>
      <a href="#tono-frio">Fríos</a>
      <a href="#tono-vivo">Vivos</a>
      <a href="#tono-neutro">Neutros</a>
    </nav>
  </header>

  <section class="sd-seccion">
    <h2 class="pl-seccion" id="sistemas">Mis sistemas</h2>
    <p class="pl-intro">Las seis paletas que están en uso ahora mismo. Cada una lleva al detalle completo del sistema.</p>
${sistemas.map(grupoSistema).join('\n')}
  </section>

  <section class="sd-seccion">
    <p class="pl-intro">Paletas de referencia, agrupadas por tonalidad. Colores que combinan entre sí y sirven de punto de partida para un encargo nuevo.</p>
${['calido', 'frio', 'vivo', 'neutro'].map(bloqueTono).join('\n')}
  </section>

  <nav class="sd-pie" aria-label="Enlaces relacionados">
    <a class="sd-enlace" href="../sistemas-de-diseno.html">&#8592; Todos los sistemas</a>
    <a class="sd-enlace" href="../../index.html#servicios">Ver los servicios</a>
  </nav>

</div>
<p class="cine-sr" role="status" aria-live="polite" data-copiar-estado></p>
</body>
</html>
`;

writeFileSync(join(FICHAS, 'paletas.html'), html, 'utf8');

/* ---------- 2. la paleta de cada ficha ---------- */
let sustituidas = 0;
for (const s of sistemas) {
  const ruta = join(FICHAS, `${s.id}.html`);
  let txt = readFileSync(ruta, 'utf8');
  const nueva = rejilla(s.colores).replace(/^ {6}/gm, '    ');
  // Acepta la marca original y la ya generada, para poder volver a pasar el
  // generador tantas veces como haga falta sin romper nada. Se comprueba que
  // el patron exista, no que el texto cambie: en la segunda pasada el
  // resultado es identico y eso significa que va bien, no que haya fallado.
  const patron = / {4}<ul class="(?:sd-paleta|pl-rejilla)">[\s\S]*?\n {4}<\/ul>/;
  if (!patron.test(txt)) {
    console.error(`  !! no encontre la paleta en ${s.id}.html`);
    continue;
  }
  txt = txt.replace(patron, nueva);
  // El script de copiado, una sola vez por ficha.
  if (!txt.includes('copiar-color.js')) {
    txt = txt.replace('</head>', '<script src="copiar-color.js" defer></script>\n</head>');
  }
  // Region viva para anunciar el copiado.
  if (!txt.includes('data-copiar-estado')) {
    txt = txt.replace('</body>', '<p class="cine-sr" role="status" aria-live="polite" data-copiar-estado></p>\n</body>');
  }
  // Enlace al muestrario completo desde el pie.
  if (!txt.includes('paletas.html')) {
    txt = txt.replace(
      '<a class="sd-enlace" href="../sistemas-de-diseno.html">',
      '<a class="sd-enlace" href="paletas.html">Muestrario de color completo</a>\n    <a class="sd-enlace" href="../sistemas-de-diseno.html">'
    );
  }
  writeFileSync(ruta, txt, 'utf8');
  sustituidas++;
}

console.log(`paletas.html: ${capturas.length} paletas de referencia + ${sistemas.length} sistemas, ${total} colores`);
console.log(`fichas actualizadas: ${sustituidas}/${sistemas.length}`);
if (avisos.length) {
  console.log(`\nSIN CONTRASTE SUFICIENTE (${avisos.length}):`);
  avisos.forEach(a => console.log('  ' + a));
} else {
  console.log('contraste: todas las etiquetas llegan a 4,5:1 sobre su propio color');
}
