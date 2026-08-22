/**
 * Genera uiverse/tokenizados.js: el mapa que convierte los colores fijos de
 * algunos elementos de UIverse en variables --sd-*, para que sigan la paleta
 * que tenga puesta la pagina.
 *
 * El mapa vive aparte, NO dentro de los archivos importados. Asi volver a
 * ejecutar importar-uiverse.mjs no borra este trabajo.
 *
 * Que se tokeniza y que no:
 *
 *   - AUTOMATICO: los cargadores. Son decoracion pura, sin una linea de texto,
 *     asi que cambiarles el color no puede crear un problema de contraste.
 *     Se les mapea el color dominante al acento y el segundo al acento 2.
 *
 *   - A MANO: unos pocos con texto, revisados uno a uno. Aqui el mapeo no se
 *     puede adivinar: hay que saber si un blanco es el texto sobre la pagina o
 *     el texto sobre el acento, y eso cambia a que token va.
 *
 * Lo demas se queda con los colores de su autor, que para eso los eligio.
 *
 *   node servicios/sistemas/generar-tokenizados.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const UIVERSE = join(AQUI, 'uiverse');

/* ============================================================
   A MANO — revisados uno a uno
   ============================================================ */
const A_MANO = {
  // Casilla: el color es el filo y el relleno de la marca; el blanco es la
  // etiqueta, que va sobre el fondo de la pagina.
  'adamgiebl_curly-lizard-40.html': {
    '#30cfd0': 'var(--sd-accent)',
    '#fff': 'var(--sd-ink)'
  },
  // Interruptor: gris = carril apagado, verde = carril encendido.
  'AbanoubMagdy1_pink-panda-32.html': {
    '#ccc': 'var(--sd-line)',
    '#3bd826': 'var(--sd-accent)'
  },
  // Campo: verde = foco y etiqueta activa, gris = filo en reposo.
  'absoluteSTrange_smart-turtle-82.html': {
    '#1fbc00': 'var(--sd-accent)',
    '#b4b4b4': 'var(--sd-muted)'
  },
  // Opcion: verde = marcada, blanco = el punto interior sobre el relleno.
  'ahmed150up_warm-zebra-29.html': {
    '#2ed573': 'var(--sd-accent)',
    '#fff': 'var(--sd-on-accent)'
  },
  // Interruptor de dos estados con sus propios rojo y verde: son semanticos,
  // asi que van a los tokens de estado, no al acento.
  'AbanoubMagdy1_fluffy-octopus-90.html': {
    '#dc3535': 'var(--sd-danger)',
    '#379237': 'var(--sd-ok)',
    '#f5aeae': 'color-mix(in srgb, var(--sd-danger) 35%, var(--sd-surface))',
    '#9ed99c': 'color-mix(in srgb, var(--sd-ok) 35%, var(--sd-surface))'
  }
};

/* ============================================================
   AUTOMATICO — cargadores
   ============================================================ */
// Un cargador con texto deja de ser decoracion pura: se descarta, porque el
// contraste de ese texto ya no seria predecible.
function tieneTexto(markup) {
  const sinEtiquetas = markup.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '').trim();
  return sinEtiquetas.length > 0;
}

const mapa = Object.assign({}, A_MANO);
let auto = 0;

for (const archivo of readdirSync(join(UIVERSE, 'cargadores'))) {
  if (!archivo.endsWith('.html')) continue;
  const t = readFileSync(join(UIVERSE, 'cargadores', archivo), 'utf8');
  const i = t.indexOf('<style>');
  const markup = (i === -1 ? t : t.slice(0, i)).trim();
  const css = i === -1 ? '' : t.slice(i + 7, t.lastIndexOf('</style>')).trim();

  if (tieneTexto(markup) || mapa[archivo]) continue;

  // Cuenta cuantas veces sale cada color: el mas repetido es el dominante.
  const usos = {};
  for (const c of (css.match(/#[0-9a-fA-F]{3,8}\b/g) || [])) {
    const k = c.toLowerCase();
    usos[k] = (usos[k] || 0) + 1;
  }
  const cols = Object.keys(usos).sort((a, b) => usos[b] - usos[a]);
  if (cols.length === 0 || cols.length > 2) continue;

  const m = {};
  m[cols[0]] = 'var(--sd-accent)';
  if (cols[1]) m[cols[1]] = 'var(--sd-accent-2)';
  mapa[archivo] = m;
  auto++;
}

writeFileSync(join(UIVERSE, 'tokenizados.js'),
  '/* Generado por generar-tokenizados.mjs — no editar a mano.\n'
  + '   Mapea colores fijos de UIverse a variables --sd-*, para que esos\n'
  + '   elementos sigan la paleta elegida. Vive fuera de los archivos\n'
  + '   importados para que reimportar no lo borre. */\n'
  + 'window.SD_TOKENIZADOS = ' + JSON.stringify(mapa, null, 1) + ';\n', 'utf8');

console.log(`${Object.keys(mapa).length} elementos retokenizados`);
console.log(`  ${auto} cargadores automaticos (decoracion sin texto)`);
console.log(`  ${Object.keys(A_MANO).length} revisados a mano`);
