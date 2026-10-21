import { defineConfig } from 'vite';

// `base: './'` genera rutas relativas en el build.
// Así el mismo `dist/` funciona en local (`npm run preview`) y en
// GitHub Pages (https://usuario.github.io/<repo>/) sin escribir el
// nombre del repositorio en el código.
export default defineConfig({
  base: './',
  server: {
    open: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // Three.js minificado ronda 640 kB (≈170 kB gzip) y se carga de forma diferida;
    // subimos el umbral del aviso para que solo salte si algo crece de verdad.
    chunkSizeWarningLimit: 700,
  },
});
