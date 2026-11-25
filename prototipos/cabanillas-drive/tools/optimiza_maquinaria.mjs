// Prepara la maquinaria del modo agricultura (PLAN_AGRICULTURA.md §5.6) para el juego:
//   modelos/maquinaria/*.glb y maquinaria.json (de tools/build_maquinaria.py) → public/assets/maquinaria/
// Comprime con gltf-transform (meshopt) sin unir mallas ni aplanar la jerarquía: las ruedas
// (rueda_di, rueda_dd, rueda_ti, rueda_td), el tripuntal y las luces tienen que seguir siendo nodos
// con su nombre.
// Uso: npm run maquinaria
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const origen = join(raiz, 'modelos', 'maquinaria');
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'maquinaria');
mkdirSync(destino, { recursive: true });
const opciones = ['--compress', 'meshopt', '--join', 'false', '--flatten', 'false', '--instance', 'false',
  '--palette', 'false', '--simplify', 'false'];
const kb = (f) => (statSync(f).size / 1024).toFixed(0).padStart(5);
for (const archivo of readdirSync(origen).filter((f) => f.endsWith('.glb')).sort()) {
  const salida = join(destino, archivo);
  execFileSync('npx', ['gltf-transform', 'optimize', join(origen, archivo), salida, ...opciones], { cwd: raiz, stdio: 'pipe', shell: true });
  console.log(`${archivo.padEnd(20)} ${kb(join(origen, archivo))} KB → ${kb(salida)} KB`);
}
copyFileSync(join(origen, 'maquinaria.json'), join(destino, 'maquinaria.json'));
console.log(`Listo en ${destino}`);
