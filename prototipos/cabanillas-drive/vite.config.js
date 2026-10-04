import { defineConfig } from 'vite';

// Rutas relativas para poder copiar dist/ a cualquier subcarpeta de GitHub Pages.
export default defineConfig({
  base: './',
  server: { port: 5173 },
});
