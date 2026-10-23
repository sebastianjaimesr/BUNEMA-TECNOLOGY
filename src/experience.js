import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SceneManager } from './scene/SceneManager.js';
import { detectQuality } from './scene/createRenderer.js';
import { BunemaPhone } from './models/BunemaPhone.js';
import { createHeroPresentation } from './animations/heroAnimation.js';
import { createScrollExperience } from './animations/scrollExperience.js';
import { createConfiguratorPresentation } from './animations/configuratorPresentation.js';

/** Cede un fotograma al navegador: así la barra de carga se pinta entre etapas. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Arranca la parte 3D. Se carga con `import()` dinámico desde main.js:
 * Three.js (el archivo más pesado) se descarga en paralelo mientras el
 * texto del hero ya es visible y navegable.
 *
 * Cada etapa informa a `tracker` cuando termina de verdad. No revela el
 * teléfono: devuelve `reveal()` para que la introducción decida cuándo.
 */
export async function startExperience({ canvas, heroEl, configurator, reducedMotion, tracker, onContextLost, onContextRestored }) {
  const quality = detectQuality();

  tracker.start('scene');
  // Si no hay WebGL, el constructor de WebGLRenderer lanza un error: lo captura main.js.
  const sceneManager = new SceneManager({ canvas, quality, onContextLost, onContextRestored });
  let phone = null;
  let hero = null;
  let story = null;
  let config = null;
  try {
    tracker.completeStep('scene');
    await nextFrame();

    tracker.start('model');
    const anisotropy = Math.min(quality.anisotropy, sceneManager.renderer.capabilities.getMaxAnisotropy());
    phone = new BunemaPhone({ anisotropy });
    hero = createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion, quality });
    // Ingeniería en movimiento: el scroll de su sección controla el despiece.
    const sectionEl = document.querySelector('[data-engineering]');
    const sourceList = document.querySelector('#arquitectura');
    if (sectionEl && sourceList) {
      story = createScrollExperience({ sceneManager, phone, hero, sectionEl, sourceList, reducedMotion });
    }
    // Configurador: el mismo modelo cambia de material y de pose; no se crea otra escena.
    const configEl = document.querySelector('[data-configurator]');
    if (configEl && configurator) {
      config = createConfiguratorPresentation({ sceneManager, phone, hero, sectionEl: configEl, configurator, reducedMotion });
    }
    // Cada sección cambia su altura al activarse (clases has-story, has-config-3d...). Se recalculan
    // todas las posiciones de scroll de una vez, ya con el diseño definitivo.
    ScrollTrigger.refresh();
    tracker.completeStep('model');
    await nextFrame();

    // Compila los shaders antes del primer fotograma visible para evitar un tirón en la entrada.
    // compileAsync usa KHR_parallel_shader_compile cuando la GPU lo ofrece y no bloquea la página.
    await tracker.run('shaders', () => sceneManager.renderer.compileAsync(sceneManager.scene, sceneManager.camera));
  } catch (error) {
    // Si algo falla después de crear el renderer, se libera la GPU antes de propagar el error.
    config?.dispose();
    story?.dispose();
    hero?.dispose();
    phone?.dispose();
    sceneManager.dispose();
    throw error;
  }

  return {
    sceneManager,
    phone,
    reveal: hero.reveal,
    story,
    config,
    dispose() {
      config?.dispose();
      story?.dispose();
      hero.dispose();
      phone.dispose();
      sceneManager.dispose();
    },
  };
}
