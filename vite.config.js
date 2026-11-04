import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// `base: './'` genera rutas relativas: el mismo `dist/` funciona en local
// (`npm run preview`) y en GitHub Pages (https://usuario.github.io/<repo>/).
// Entradas HTML: Bunema X1 (index, experiencia principal), el archivo de la tienda
// (tienda), su panel (admin) y una redirección de la URL antigua del concepto.
export default defineConfig({
  base: './',
  server: { open: false },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        tienda: resolve(import.meta.dirname, 'tienda.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        conceptoX1: resolve(import.meta.dirname, 'concepto-x1.html'),
      },
    },
  },
});
