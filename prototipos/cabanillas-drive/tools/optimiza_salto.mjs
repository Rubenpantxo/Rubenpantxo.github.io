// Prepara los modelos del salto en paracaídas (PLAN_SALTO.md) para el juego:
//   modelos/salto/*.glb (los de Rubén: avión de carga y mochila-paracaídas) → public/assets/salto/
// 1. Quita los «extras» de los nodos: el programa que exportó los GLB guardó ahí copias en JSON de
//    objetos (139 KB en la mochila) que el juego no usa.
// 2. Recupera las mallas exportadas como líneas: el exportador de three.js guarda como LINES las
//    mallas cuyo material tenía «wireframe», pero deja su índice de triángulos tal cual (en estos
//    GLB, todas). Se distinguen de las líneas de verdad (cuerdas) porque tienen normales y un
//    índice múltiplo de 3; a esas se les devuelve el modo TRIANGLES, sin perder nada.
// 3. Pone nombre a los materiales sin nombre (el de la primera malla que lo usa).
// 4. Comprime con gltf-transform (meshopt), sin unir mallas ni aplanar la jerarquía: las hélices,
//    la rampa, las solapas, el pilotillo y la cúpula tienen que seguir siendo nodos con su pivote.
// Uso: npm run salto
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NodeIO, Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const origen = join(raiz, 'modelos', 'salto');
const intermedio = join(raiz, config.processed_dir ?? 'data/processed', 'salto_limpio');
const destino = join(raiz, config.assets_dir ?? 'public/assets', 'salto');
mkdirSync(intermedio, { recursive: true });
mkdirSync(destino, { recursive: true });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const opciones = ['--compress', 'meshopt', '--join', 'false', '--flatten', 'false', '--instance', 'false',
  '--palette', 'false', '--simplify', 'false'];

for (const archivo of readdirSync(origen).filter((f) => f.endsWith('.glb')).sort()) {
  const doc = await io.read(join(origen, archivo));
  const r = doc.getRoot();
  let extras = 0;
  for (const n of r.listNodes()) {
    if (Object.keys(n.getExtras()).length) { n.setExtras({}); extras++; }
  }
  for (const s of r.listScenes()) s.setExtras({});
  let recuperadas = 0;
  let lineas = 0;
  for (const malla of r.listMeshes()) {
    for (const p of malla.listPrimitives()) {
      if (p.getMode() !== Primitive.Mode.LINES) continue;
      const indices = p.getIndices();
      if (p.getAttribute('NORMAL') && indices && indices.getCount() % 3 === 0) {
        p.setMode(Primitive.Mode.TRIANGLES);
        recuperadas++;
      } else {
        lineas++;
      }
    }
  }
  let nombrados = 0;
  for (const m of r.listMaterials()) {
    if (m.getName()) continue;
    const malla = r.listMeshes().find((me) => me.listPrimitives().some((p) => p.getMaterial() === m));
    const nodo = malla && r.listNodes().find((n) => n.getMesh() === malla && n.getName());
    m.setName(`${archivo.replace('.glb', '')}_${nodo?.getName() ?? malla?.getName() ?? 'material'}`);
    nombrados++;
  }
  const limpio = join(intermedio, archivo);
  await io.write(limpio, doc);
  const salida = join(destino, archivo);
  execFileSync('npx', ['gltf-transform', 'optimize', limpio, salida, ...opciones], { cwd: raiz, stdio: 'pipe', shell: true });
  const kb = (f) => (statSync(f).size / 1024).toFixed(0).padStart(5);
  console.log(`${archivo.padEnd(24)} ${kb(join(origen, archivo))} KB → limpio ${kb(limpio)} KB → ${kb(salida)} KB`
    + ` (${recuperadas} mallas recuperadas de líneas, ${lineas} líneas de verdad, ${extras} nodos sin extras,`
    + ` ${nombrados} materiales con nombre)`);
}
rmSync(intermedio, { recursive: true, force: true });
console.log(`Listo en ${destino}`);
