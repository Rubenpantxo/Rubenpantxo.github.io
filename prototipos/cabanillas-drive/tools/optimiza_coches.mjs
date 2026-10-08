// Optimiza los coches de data/processed/coches_raw/ (salida de build_coches.py) con
// gltf-transform y los deja en public/assets/coches/ junto con su manifiesto.
// Uso: npm run coches
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const origen = join(raiz, config.processed_dir ?? 'data/processed', 'coches_raw');
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'coches');
mkdirSync(destino, { recursive: true });

// Sin unir mallas (las ruedas del coche del jugador tienen que seguir separadas), sin
// paleta (la pintura se tiñe por instancia) y sin simplificar (ya lo hizo Blender)
const opciones = ['--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024',
  '--join', 'false', '--palette', 'false', '--instance', 'false', '--simplify', 'false'];

let total = 0;
for (const archivo of readdirSync(origen).filter((f) => f.endsWith('.glb')).sort()) {
  const salida = join(destino, archivo);
  execFileSync('npx', ['gltf-transform', 'optimize', join(origen, archivo), salida, ...opciones],
    { cwd: raiz, stdio: 'pipe', shell: true });
  const kb = statSync(salida).size / 1024;
  total += kb;
  console.log(`${archivo.padEnd(18)} ${(statSync(join(origen, archivo)).size / 1024).toFixed(0).padStart(7)} KB → ${kb.toFixed(0).padStart(6)} KB`);
}
copyFileSync(join(origen, 'coches.json'), join(destino, 'coches.json'));
console.log(`Total: ${(total / 1024).toFixed(1)} MB en ${destino}`);
