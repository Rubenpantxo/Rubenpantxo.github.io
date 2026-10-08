// Fase 5 — Variantes ligeras para móvil (calidad «bajo») y alturas compactas para todos.
//
// - public/assets/terrain/terrain.u16 (+ terrain_u16.json): alturas en Uint16 (≈1 mm de paso)
//   en vez de Float32: la mitad de descarga. terrain.f32 se queda para el pipeline (Blender).
// - public/assets/cabanillas_bajo.glb: terreno más simplificado (error ≤ ~10 cm, bordes de chunk
//   fijos para que no se abran grietas) con la ortofoto a 768 px: ~4× menos memoria de vídeo.
// - public/assets/tejados_bajo.jpg: atlas de tejados a la mitad (2048 × 1024).
//
// Requiere: npm run escena (cabanillas_raw.glb) y tools/06_aspecto.py (tejados.jpg).
// Uso: npm run movil
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const raiz = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(raiz, 'config.json'), 'utf8'));
const procesados = join(raiz, config.processed_dir ?? 'data/processed');
const assets = join(raiz, config.assets_dir ?? 'public/assets');
const mb = (ruta) => `${(statSync(ruta).size / 1e6).toFixed(1)} MB`;

// 1. Alturas en Uint16
const meta = JSON.parse(readFileSync(join(assets, 'terrain', 'terrain.json'), 'utf8'));
const bruto = readFileSync(join(assets, 'terrain', 'terrain.f32'));
const f32 = new Float32Array(bruto.buffer, bruto.byteOffset, bruto.byteLength / 4);
let minimo = Infinity;
let maximo = -Infinity;
for (const v of f32) { minimo = Math.min(minimo, v); maximo = Math.max(maximo, v); }
const escala = (maximo - minimo) / 65535;
const u16 = new Uint16Array(f32.length);
let errorMax = 0;
for (let i = 0; i < f32.length; i++) {
  u16[i] = Math.round((f32[i] - minimo) / escala);
  errorMax = Math.max(errorMax, Math.abs(minimo + u16[i] * escala - f32[i]));
}
writeFileSync(join(assets, 'terrain', 'terrain.u16'), Buffer.from(u16.buffer));
writeFileSync(join(assets, 'terrain', 'terrain_u16.json'), JSON.stringify({
  archivo: 'terrain.u16', formato: 'Uint16 little-endian, mismo orden que terrain.f32; altura = minimo + valor × escala',
  minimo, escala, filas: meta.filas, columnas: meta.columnas,
}, null, 1));
console.log(`terrain.u16: ${mb(join(assets, 'terrain', 'terrain.u16'))} (error máx ${(errorMax * 1000).toFixed(2)} mm)`);

// 2. Terreno ligero
const glbBajo = join(assets, 'cabanillas_bajo.glb');
execFileSync('npx', ['gltf-transform', 'optimize', join(procesados, 'cabanillas_raw.glb'), glbBajo,
  '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '768',
  '--join', 'false', '--palette', 'false', '--instance', 'false',
  '--simplify', 'true', '--simplify-ratio', '0', '--simplify-error', '0.0002', '--simplify-lock-border', 'true'],
{ cwd: raiz, stdio: 'pipe', shell: true });
console.log(`cabanillas_bajo.glb: ${mb(glbBajo)} (normal: ${mb(join(assets, 'cabanillas.glb'))})`);

// 3. Atlas de tejados a la mitad
const atlasBajo = join(assets, 'tejados_bajo.jpg');
const info = await sharp(join(assets, 'tejados.jpg')).metadata();
await sharp(join(assets, 'tejados.jpg')).resize(Math.round(info.width / 2), Math.round(info.height / 2))
  .jpeg({ quality: 84, mozjpeg: true }).toFile(atlasBajo);
console.log(`tejados_bajo.jpg: ${mb(atlasBajo)} (${info.width / 2}×${info.height / 2})`);
