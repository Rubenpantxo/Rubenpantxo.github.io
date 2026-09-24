/**
 * Genera, a partir de componentes.mjs y sistemas-datos.mjs:
 *
 *   - el bloque de componentes de sistema.css
 *   - kits/<sistema>/<componente>.html: una pieza autonoma por componente y
 *     sistema, en el mismo formato que las de UIverse (marcado + <style>), para
 *     que la Biblioteca de elementos las monte y las copie igual
 *   - kits/indice.js: el catalogo que lee la galeria
 *
 * Cada pieza lleva dentro todo lo que necesita: las variables del sistema ya
 * resueltas, el CSS de los componentes que usa y la piel. Pegada en cualquier
 * pagina se ve igual que aqui.
 *
 *   node servicios/sistemas/generar-kits.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sistemas } from './sistemas-datos.mjs';
import {
  CSS_COMPONENTES, PIELES, KIT, KIT_DESTACADOS,
  varsPaleta, varsTipo, varsElem, paraKit
} from './componentes.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const KITS = join(AQUI, 'kits');

/* ---------- 1. sistema.css ---------- */
const rutaCss = join(AQUI, 'sistema.css');
let hoja = readFileSync(rutaCss, 'utf8');
const crlf = hoja.includes('\r\n');
hoja = hoja.replace(/\r\n/g, '\n');
const abre = '/*@bloque componentes*/';
const cierra = '/*/@bloque componentes*/';
const i = hoja.indexOf(abre);
const j = hoja.indexOf(cierra);
if (i === -1 || j === -1) throw new Error('Falta la marca de componentes en sistema.css');
hoja = hoja.slice(0, i + abre.length)
  + '\n/* Generado por generar-kits.mjs desde componentes.mjs — no editar a mano. */\n'
  + CSS_COMPONENTES.trim() + '\n'
  + hoja.slice(j);
writeFileSync(rutaCss, crlf ? hoja.replace(/\n/g, '\r\n') : hoja, 'utf8');
console.log('sistema.css: bloque de componentes al dia');

/* ---------- 2. las piezas sueltas ---------- */
const decl = pares => pares.map(([k, v]) => `  ${k}: ${v};`).join('\n');

// Lo mismo que hace tema.css cuando el juego de elementos contornea la accion
// principal (Clasico): aqui va dentro de la pieza.
const contorno = s => s.elementos.botonPrincipal !== 'contorno' ? '' : `
.sd-btn:not([class*="sd-btn--"]) {
  background: transparent;
  border-color: var(--sd-accent);
  color: var(--sd-accent-text);
}`;

function pieza(s, c) {
  const marcado = c.html(s.id);
  const raiz = `.sd-kit {
${decl(varsPaleta(s.paleta.tokens))}
${decl(varsTipo(s.tipografia))}
${decl(varsElem(s.elementos))}
  color-scheme: ${s.paleta.banda === 'oscura' ? 'dark' : 'light'};
  box-sizing: border-box;
  display: grid;
  gap: 12px;
  width: 21rem;
  padding: 1.5rem;
  background: var(--sd-bg);
  color: var(--sd-ink);
  font-family: var(--sd-font);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.sd-kit *,
.sd-kit *::before,
.sd-kit *::after {
  box-sizing: border-box;
}`;

  const css = [
    raiz,
    paraKit(CSS_COMPONENTES + contorno(s), marcado),
    s.elementos.piel ? paraKit(PIELES[s.elementos.piel], marcado) : ''
  ].filter(Boolean).join('\n\n');

  // Las fuentes van por @import para que la pieza copiada funcione sola. En la
  // galeria no sirven (Chrome ignora @font-face dentro de un shadow root) y
  // las carga la propia pagina.
  const fuentes = s.fuentes.google
    ? `@import url("https://fonts.googleapis.com/css2?family=${s.fuentes.google}&display=swap");\n`
    : '';

  return `<div class="sd-kit">
${marcado}
</div>
<style>
${fuentes}/* ${s.nombre} — ${c.nombre}. Sistema de diseño de rubenpantxo.com
   (servicios/sistemas/${s.ficha}). Generado por generar-kits.mjs. */
${css}
</style>
`;
}

rmSync(KITS, { recursive: true, force: true });
const indice = [];
for (const s of sistemas) {
  mkdirSync(join(KITS, s.id), { recursive: true });
  for (const c of KIT) {
    writeFileSync(join(KITS, s.id, `${c.id}.html`), pieza(s, c), 'utf8');
  }
  indice.push({
    id: s.id,
    nombre: s.nombre,
    ficha: s.ficha,
    titular: s.titular,
    rasgo: s.rasgo,
    piel: s.elementos.piel || null,
    google: s.fuentes.google,
    colores: s.acentos,
    componentes: KIT.map(c => ({ id: c.id, nombre: c.nombre, archivo: `${c.id}.html` })),
    destacados: KIT_DESTACADOS
  });
}

writeFileSync(join(KITS, 'indice.js'),
  '/* Generado por generar-kits.mjs — no editar a mano. */\n'
  + 'window.SD_KITS = ' + JSON.stringify(indice, null, 1) + ';\n', 'utf8');

console.log(`kits/: ${sistemas.length} sistemas x ${KIT.length} componentes = ${sistemas.length * KIT.length} piezas`);
