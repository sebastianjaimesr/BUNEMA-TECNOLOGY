import './styles/base.css';
import './styles/layout.css';
import './styles/hero.css';
import './styles/intro.css';
import './styles/engineering.css';
import './styles/configurator.css';
import './styles/camera.css';
import './styles/comparison.css';
import './styles/responsive.css';

import { initNavigation } from './ui/navigation.js';
import { createConfigurator } from './sections/configurator.js';
import { createComparison } from './sections/comparison.js';
import { createCameraDemo } from './sections/cameraDemo.js';
import { bindHeroLoading } from './ui/heroLoading.js';
import { revealInterface } from './animations/transitions.js';
import { playIntro } from './animations/intro.js';
import { LoadTracker } from './loading/LoadTracker.js';

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

  // El configurador funciona desde el primer momento, con o sin 3D: el modelo se suscribe cuando está listo.
  const configurator = createConfigurator({ root: document.querySelector('[data-configurator]') });
  app.configurator = configurator;
  app.disposers.push(configurator.dispose);
  // Lo mismo con el comparador: la tabla funciona sola y la vitrina 3D se suscribe después.
  const comparison = createComparison({ root: document.querySelector('[data-comparison]') });
  app.comparison = comparison;
  app.disposers.push(comparison.dispose);
  // La demo de cámara es 2D (Canvas): no depende de WebGL y funciona también sin 3D.
  const cameraDemo = createCameraDemo({ root: document.querySelector('[data-camera]'), reducedMotion });
  app.cameraDemo = cameraDemo;
  app.disposers.push(cameraDemo.dispose);

  const canvas = document.querySelector('[data-stage]');
  const heroEl = document.querySelector('[data-hero]');

  // Etapas reales de carga y su peso aproximado en el tiempo total.
  // El motor 3D pesa más porque es la descarga más grande (~170 kB gzip).
  const tracker = new LoadTracker([
    { id: 'fonts', label: 'Tipografías', weight: 1 },
    { id: 'engine', label: 'Motor 3D', weight: 4 },
    { id: 'scene', label: 'Estudio de luz', weight: 1.5 },
    { id: 'model', label: 'Ensamblando el X1', weight: 1.5 },
    { id: 'shaders', label: 'Compilando materiales', weight: 2 },
  ]);
  app.tracker = tracker;

  const intro = playIntro({ overlay: document.querySelector('[data-intro]'), tracker, reducedMotion });
  app.intro = intro;
  app.disposers.push(bindHeroLoading({ element: heroEl.querySelector('[data-hero-loading]'), tracker, after: intro.done }));

  // La interfaz se compone en cuanto se abre la cortina (o de inmediato con movimiento reducido).
  intro.done.then(() => revealInterface({ reducedMotion }));

  try {
    const [{ startExperience }] = await Promise.all([
      tracker.run('engine', () => import('./experience.js')),
      tracker.run('fonts', fontsReady),
    ]);
    app.experience = await startExperience({
      canvas,
      heroEl,
      configurator,
      comparison,
      reducedMotion,
      tracker,
      onContextLost: () => showFallback('contexto WebGL perdido'),
      onContextRestored: () => {
        root.classList.remove('no-webgl');
        root.classList.add('is-3d-ready');
      },
    });
    if (import.meta.env.DEV) window.__bunemaDebug = app.experience; // inspección manual en desarrollo

    // El producto entra cuando la intro ya se abrió; si cargó tarde, entra en cuanto está listo.
    await intro.done;
    root.classList.add('is-3d-ready');
    app.experience.reveal();
  } catch (error) {
    tracker.fail(error);
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
