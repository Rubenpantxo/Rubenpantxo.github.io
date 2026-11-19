// Texturas del editor de personaje: convierte a WebP las que lista tools/40_editor_personaje.py
// (pieles, iris, pelo, ropa, cejas, pestañas y miniaturas) en public/assets/personaje/tex/.
// Re-ejecutable: salta las que ya existen y son más nuevas que su origen.
// Uso: npm run personaje   (antes: python tools/40_editor_personaje.py)
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const lista = JSON.parse(readFileSync(join(raiz, config.processed_dir ?? 'data/processed', 'personaje_texturas.json'), 'utf8'));
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'personaje', 'tex');
mkdirSync(destino, { recursive: true });

let hechas = 0;
let total = 0;
for (const t of lista) {
  const salida = join(destino, t.destino);
  if (existsSync(salida) && statSync(salida).mtimeMs > statSync(t.origen).mtimeMs) {
    total += statSync(salida).size;
    continue;
  }
  // Los mapas normales sin pérdidas visibles (calidad alta); el color, con canal alfa si lo trae
  const calidad = t.tipo === 'normal' ? 92 : t.tipo === 'mini' ? 80 : 86;
  await sharp(t.origen).resize(t.lado, t.lado, { fit: 'fill' })
    .webp({ quality: calidad, alphaQuality: 90, effort: 5 }).toFile(salida);
  total += statSync(salida).size;
  hechas++;
}
console.log(`${hechas} texturas nuevas de ${lista.length}; ${(total / 1048576).toFixed(1)} MB en ${destino}`);
