// Optimiza las personas de data/processed/personas/ (salida de build_personas.py) con
// gltf-transform y las deja en public/assets/personas/ junto con su manifiesto.
// Uso: npm run personas   (antes: conda run -n cabdrive python tools/14_personas.py)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const origen = join(raiz, config.processed_dir ?? 'data/processed', 'personas');
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'personas');
mkdirSync(destino, { recursive: true });

// Sin simplificar ni unir (ya lo hizo Blender; la malla va con su esqueleto) y atlas a 1024
const opciones = ['--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024',
  '--join', 'false', '--palette', 'false', '--instance', 'false', '--simplify', 'false'];

const bruto = JSON.parse(readFileSync(join(origen, 'personas_bruto.json'), 'utf8'));
let total = 0;
for (const p of bruto.personas) {
  const archivo = `${p.id}.glb`;
  const salida = join(destino, archivo);
  execFileSync('npx', ['gltf-transform', 'optimize', join(origen, archivo), salida, ...opciones],
    { cwd: raiz, stdio: 'pipe', shell: true });
  const kb = statSync(salida).size / 1024;
  total += kb;
  p.archivo = archivo;
  console.log(`${archivo.padEnd(16)} ${(statSync(join(origen, archivo)).size / 1024).toFixed(0).padStart(6)} KB → ${kb.toFixed(0).padStart(5)} KB`);
}
writeFileSync(join(destino, 'personas.json'), JSON.stringify({
  fuente: 'MakeHuman / MPFB2 (recursos CC0 de la comunidad MakeHuman); animaciones propias',
  ...bruto,
}, null, 1));
console.log(`Total: ${(total / 1024).toFixed(1)} MB en ${destino}`);
