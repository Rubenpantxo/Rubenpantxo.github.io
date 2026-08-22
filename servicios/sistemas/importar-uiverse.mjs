/**
 * Importa una seleccion de elementos de UIverse a servicios/sistemas/uiverse/.
 *
 * UIverse (https://uiverse.io) publica su archivo en github.com/uiverse-io/galaxy
 * bajo licencia MIT. Aqui NO se copia el repo entero: se elige un subconjunto
 * que funcione en una pagina estatica sin framework, se copia cada archivo tal
 * cual y se anota de quien es.
 *
 * Se descarta lo que no puede funcionar aqui:
 *   - lo que usa Tailwind (no lo cargamos)
 *   - lo que pide una URL de fuera (imagenes, CDNs)
 *   - lo que trae <script> o <img>
 *
 * Uso:
 *   node servicios/sistemas/importar-uiverse.mjs <ruta-al-clon-de-galaxy>
 *
 * El clon no se guarda en el repo: solo entra lo importado.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(AQUI, 'uiverse');

const ORIGEN = process.argv[2];
if (!ORIGEN || !existsSync(ORIGEN)) {
  console.error('Falta la ruta al clon de uiverse-io/galaxy.');
  console.error('  git clone --depth 1 https://github.com/uiverse-io/galaxy.git');
  console.error('  node servicios/sistemas/importar-uiverse.mjs ./galaxy');
  process.exit(1);
}

// Cuantos de cada categoria y como se llaman en castellano.
const CUPOS = [
  ['Buttons', 'botones', 'Botones', 40],
  ['Cards', 'tarjetas', 'Tarjetas', 24],
  ['Checkboxes', 'casillas', 'Casillas', 20],
  ['Toggle-switches', 'interruptores', 'Interruptores', 20],
  ['loaders', 'cargadores', 'Cargadores', 24],
  ['Inputs', 'campos', 'Campos', 16],
  ['Radio-buttons', 'opciones', 'Opciones', 14],
  ['Patterns', 'patrones', 'Patrones y texturas', 14],
  ['Tooltips', 'ayudas', 'Ayudas', 8],
  ['Notifications', 'avisos', 'Avisos', 8],
  ['Forms', 'formularios', 'Formularios', 8]
];

const TAILWIND = /class="[^"]*\b(bg-\w|text-\w+-\d|flex\b|grid\b|p[xytblr]?-\d|m[xytblr]?-\d|w-\d|h-\d|rounded-\w|border-\w|shadow-\w|hover:)/;

function leer(cat, archivo) {
  const bruto = readFileSync(join(ORIGEN, cat, archivo), 'utf8');
  const i = bruto.indexOf('<style>');
  const markup = (i === -1 ? bruto : bruto.slice(0, i)).trim();
  const css = i === -1 ? '' : bruto.slice(i + 7, bruto.lastIndexOf('</style>')).trim();
  const credito = css.match(/\/\*\s*From Uiverse\.io by ([^\s]+)\s*(?:-\s*Tags:\s*([^*]*))?\*\//);
  const colores = [...new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(c => c.toLowerCase()))];

  return {
    archivo, bruto, markup, css, colores,
    autor: credito ? credito[1] : 'anónimo',
    tags: credito && credito[2] ? credito[2].trim().replace(/\s+/g, ' ') : '',
    animado: /@keyframes|transition/.test(css),
    sirve: !TAILWIND.test(markup)
      && !/https?:\/\/(?!fonts\.googleapis|fonts\.gstatic)/.test(bruto)
      && !/<script/i.test(bruto)
      && !/<img\b|url\(["']?https?:/i.test(bruto)
      && css.length > 60
      && bruto.length < 6000
  };
}

// Menos colores es mejor: se retokeniza con menos riesgo. La animacion suma en
// cargadores y resta en nada. El CSS muy largo penaliza.
function puntuar(e, cat) {
  let p = 100;
  p -= e.colores.length * 6;
  p -= Math.floor(e.css / 220);
  if (e.animado) p += cat === 'loaders' ? 14 : 5;
  if (e.tags) p += 4;
  if (e.markup.length > 900) p -= 12;
  return p;
}

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

const indice = [];
const resumen = [];

for (const [cat, slug, titulo, cupo] of CUPOS) {
  const todos = readdirSync(join(ORIGEN, cat))
    .filter(a => a.endsWith('.html'))
    .map(a => leer(cat, a))
    .filter(e => e.sirve);

  todos.sort((a, b) => puntuar(b, cat) - puntuar(a, cat));

  // Como mucho tres por autor y categoria: si no, media seccion es de la misma
  // persona y el muestrario deja de parecer variado.
  const porAutor = {};
  const elegidos = [];
  for (const e of todos) {
    if (elegidos.length >= cupo) break;
    porAutor[e.autor] = (porAutor[e.autor] || 0) + 1;
    if (porAutor[e.autor] > 3) continue;
    elegidos.push(e);
  }

  mkdirSync(join(DESTINO, slug), { recursive: true });
  for (const e of elegidos) {
    writeFileSync(join(DESTINO, slug, e.archivo), e.bruto, 'utf8');
    indice.push({
      cat: slug,
      archivo: e.archivo,
      autor: e.autor,
      tags: e.tags,
      colores: e.colores.length,
      animado: e.animado
    });
  }

  resumen.push({ titulo, slug, elegidos: elegidos.length, de: todos.length });
  console.log(`${titulo.padEnd(20)} ${String(elegidos.length).padStart(3)} de ${todos.length} usables`);
}

/* ---------- indice para el navegador ---------- */
writeFileSync(join(DESTINO, 'indice.js'),
  '/* Generado por importar-uiverse.mjs — no editar a mano. */\n'
  + 'window.SD_UIVERSE = ' + JSON.stringify({
    secciones: resumen.map(r => ({ slug: r.slug, titulo: r.titulo })),
    elementos: indice
  }, null, 1) + ';\n', 'utf8');

/* ---------- licencia y credito ---------- */
writeFileSync(join(DESTINO, 'LICENSE'), readFileSync(join(ORIGEN, 'LICENSE'), 'utf8'), 'utf8');

writeFileSync(join(DESTINO, 'LEEME.md'), `# Elementos de UIverse

Los ${indice.length} elementos de esta carpeta vienen de [UIverse.io](https://uiverse.io),
a traves de su archivo publico [uiverse-io/galaxy](https://github.com/uiverse-io/galaxy).

## Licencia

MIT, copyright 2023 Uiverse.io. El texto completo esta en \`LICENSE\`, junto a
esta nota, tal y como pide la licencia. Cada elemento conserva ademas dentro de
su propio CSS el comentario \`/* From Uiverse.io by <autor> */\` con el nombre de
quien lo hizo.

La atribucion no es obligatoria bajo MIT, pero UIverse la agradece y aqui se
mantiene: la galeria muestra el autor de cada pieza.

## Que hay y que no

De los 3.802 elementos del archivo se importaron ${indice.length}. Se descarto todo lo que
no puede funcionar en una pagina estatica sin framework:

- lo que depende de Tailwind, porque esta web no lo carga
- lo que pide una URL de fuera (imagenes, CDNs)
- lo que trae \`<script>\` o \`<img>\`
- lo muy largo, por peso

## Como se vuelve a generar

    git clone --depth 1 https://github.com/uiverse-io/galaxy.git
    node servicios/sistemas/importar-uiverse.mjs ./galaxy

El clon no se guarda en el repo: solo entra lo importado.

## Como se usan

Cada archivo es markup + \`<style>\`, y las clases se repiten entre archivos
(\`.cta\`, \`.card\`, \`.radio-input\`...). Por eso la galeria los monta en un
**shadow root**: aisla las clases y, aun asi, las variables CSS lo atraviesan,
de modo que un elemento retokenizado sigue la paleta que tengas elegida.
`, 'utf8');

console.log(`\n${indice.length} elementos en servicios/sistemas/uiverse/`);
console.log('licencia MIT y credito por autor incluidos');
