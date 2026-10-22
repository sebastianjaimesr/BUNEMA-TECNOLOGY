import { SceneManager } from './scene/SceneManager.js';
import { detectQuality } from './scene/createRenderer.js';
import { BunemaPhone } from './models/BunemaPhone.js';
import { createHeroPresentation } from './animations/heroAnimation.js';

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
export async function startExperience({ canvas, heroEl, reducedMotion, tracker, onContextLost, onContextRestored }) {
  const quality = detectQuality();

  tracker.start('scene');
  // Si no hay WebGL, el constructor de WebGLRenderer lanza un error: lo captura main.js.
  const sceneManager = new SceneManager({ canvas, quality, onContextLost, onContextRestored });
  let phone = null;
  let hero = null;
  try {
    tracker.completeStep('scene');
    await nextFrame();

    tracker.start('model');
    const anisotropy = Math.min(quality.anisotropy, sceneManager.renderer.capabilities.getMaxAnisotropy());
    phone = new BunemaPhone({ anisotropy });
    hero = createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion, quality });
    tracker.completeStep('model');
    await nextFrame();

    // Compila los shaders antes del primer fotograma visible para evitar un tirón en la entrada.
    // compileAsync usa KHR_parallel_shader_compile cuando la GPU lo ofrece y no bloquea la página.
    await tracker.run('shaders', () => sceneManager.renderer.compileAsync(sceneManager.scene, sceneManager.camera));
  } catch (error) {
    // Si algo falla después de crear el renderer, se libera la GPU antes de propagar el error.
    hero?.dispose();
    phone?.dispose();
    sceneManager.dispose();
    throw error;
  }

  return {
    sceneManager,
    phone,
    reveal: hero.reveal,
    dispose() {
      hero.dispose();
      phone.dispose();
      sceneManager.dispose();
    },
  };
}
