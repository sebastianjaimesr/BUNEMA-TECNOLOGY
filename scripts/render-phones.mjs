/**
 * Genera los renders 3D de todos los iPhone del catálogo (todas sus vistas y
 * colores) en public/assets/renders/<modelo>/<color>-<vista>.webp y el índice
 * src/data/renders.json. Necesita Playwright con Chromium.
 *
 *   npm run renders              # todos
 *   npm run renders -- iphone-16 # solo algunos modelos
 */
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IPHONES } from '../src/data/iphones.js';

// Playwright no es dependencia del proyecto: se usa el instalado (npm i -D playwright o PLAYWRIGHT_PATH).
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright'));
}

const root = resolve(import.meta.dirname, '..');
const only = process.argv.slice(2);
const VIEWS = ['back', 'front', 'side'];
const indexPath = resolve(root, 'src/data/renders.json');
let index = {};
try {
  index = JSON.parse(await readFile(indexPath, 'utf8'));
} catch {}

const server = await createServer({ root, server: { port: 5199, strictPort: true, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1500 } });
page.on('pageerror', (e) => console.error(e.message));
await page.goto('http://localhost:5199/tools/render.html');
await page.waitForFunction(() => window.renderReady, null, { timeout: 60000 });

let count = 0;
for (const p of IPHONES) {
  if (only.length && !only.includes(p.id)) continue;
  const dir = resolve(root, 'public/assets/renders', p.id);
  await mkdir(dir, { recursive: true });
  index[p.id] = [];
  for (const c of p.colors) {
    for (const v of VIEWS) {
      const url = await page.evaluate(([id, color, view]) => window.renderPhone(id, color, view, 720), [p.id, c.id, v]);
      await writeFile(resolve(dir, `${c.id}-${v}.webp`), Buffer.from(url.split(',')[1], 'base64'));
      count++;
    }
    index[p.id].push(c.id);
  }
  console.log(`✓ ${p.id} (${p.colors.length} colores)`);
}
await writeFile(indexPath, JSON.stringify(index, null, 0) + '\n');
console.log(`${count} imágenes generadas.`);
await browser.close();
await server.close();
