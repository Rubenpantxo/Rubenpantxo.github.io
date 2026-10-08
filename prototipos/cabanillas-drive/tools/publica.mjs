// Copia dist/ a juegos/cabanillas-drive/ del sitio (mismo repo) para jugarlo desde la web.
// Uso: npm run publica (compila antes). Avisa si algún archivo pasa del límite práctico de GitHub.
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const proyecto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(proyecto, 'dist');
const destino = resolve(proyecto, '../../juegos/cabanillas-drive');
const LIMITE_MB = 50;

if (!existsSync(join(origen, 'index.html'))) {
  console.error('No hay dist/index.html: ejecuta antes «npm run build».');
  process.exit(1);
}

function archivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : [join(dir, e.name)]);
}

const lista = archivos(origen);
const grandes = lista.filter((a) => statSync(a).size > LIMITE_MB * 1024 * 1024);
if (grandes.length) {
  console.error(`Archivos de más de ${LIMITE_MB} MB:\n${grandes.map((a) => relative(origen, a)).join('\n')}`);
  process.exit(1);
}
// Jekyll (GitHub Pages) no publica lo que empieza por _ o por .
const ocultos = lista.filter((a) => relative(origen, a).split(/[\\/]/).some((p) => /^[_.]/.test(p)));
if (ocultos.length) {
  console.error(`GitHub Pages ignoraría estos archivos:\n${ocultos.map((a) => relative(origen, a)).join('\n')}`);
  process.exit(1);
}

rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, { recursive: true });
const total = lista.reduce((s, a) => s + statSync(a).size, 0);
console.log(`${lista.length} archivos (${(total / 1024 / 1024).toFixed(1)} MB) → ${relative(resolve(proyecto, '../..'), destino)}`);
