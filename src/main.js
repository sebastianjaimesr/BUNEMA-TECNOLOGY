import './styles/base.css';
import './styles/layout.css';
import './styles/hero.css';
import './styles/responsive.css';

import { initNavigation } from './ui/navigation.js';
import { revealInterface } from './animations/transitions.js';

/**
 * Punto de entrada. Orquesta, no implementa: cada responsabilidad vive
 * en su módulo y aquí solo se conectan.
 */

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showFallback(reason) {
  root.classList.add('no-webgl');
  root.classList.remove('is-3d-ready');
  console.warn('[BUNEMA] Vista 3D no disponible:', reason);
}

/** Espera las fuentes (las texturas de la pantalla las usan), sin bloquear más de 1,5 s. */
function fontsReady() {
  if (!document.fonts) return Promise.resolve();
  const wanted = Promise.all([
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('500 20px "Inter"'),
  ]);
  return Promise.race([wanted, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
}

async function boot() {
  // Evita una segunda inicialización (p. ej. si el módulo se evalúa dos veces).
  if (window.__bunemaApp) return window.__bunemaApp;
  const app = { experience: null, disposers: [] };
  window.__bunemaApp = app;

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  app.disposers.push(initNavigation().dispose);
  revealInterface({ reducedMotion });

  const canvas = document.querySelector('[data-stage]');
  const heroEl = document.querySelector('[data-hero]');

  try {
    const [{ startExperience }] = await Promise.all([import('./experience.js'), fontsReady()]);
    app.experience = startExperience({
      canvas,
      heroEl,
      reducedMotion,
      onContextLost: () => showFallback('contexto WebGL perdido'),
      onContextRestored: () => {
        root.classList.remove('no-webgl');
        root.classList.add('is-3d-ready');
      },
    });
    root.classList.add('is-3d-ready');
    if (import.meta.env.DEV) window.__bunemaDebug = app.experience; // inspección manual en desarrollo
  } catch (error) {
    showFallback(error);
  }

  app.dispose = () => {
    app.experience?.dispose();
    app.disposers.forEach((fn) => fn());
    delete window.__bunemaApp;
  };
  return app;
}

boot();

// Recarga en caliente de Vite: limpia la instancia anterior antes de crear otra.
if (import.meta.hot) {
  import.meta.hot.dispose(() => window.__bunemaApp?.dispose?.());
}
