import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Archivos de public/assets que solo usa el pipeline (Blender) y no hacen falta en la web:
// las teselas de ortofoto (el GLB ya lleva su copia) y las alturas en Float32 (el juego lee
// terrain.u16 de tools/variantes_movil.mjs).
const SOLO_PIPELINE = ['assets/orto/orto_*.jpg', 'assets/terrain/terrain.f32'];

function quitaSoloPipeline() {
  let salida = 'dist';
  return {
    name: 'quita-solo-pipeline',
    apply: 'build',
    configResolved(config) { salida = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const { globSync } = await import('node:fs');
      for (const patron of SOLO_PIPELINE) {
        for (const archivo of globSync(patron, { cwd: salida })) rmSync(resolve(salida, archivo));
      }
    },
  };
}

// Rutas relativas para poder copiar dist/ a cualquier subcarpeta de GitHub Pages.
// «npm run dev -- --host» publica el servidor en la red local para probar en el móvil.
export default defineConfig({
  base: './',
  server: { port: 5173 },
  plugins: [quitaSoloPipeline()],
});
