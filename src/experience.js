import { SceneManager } from './scene/SceneManager.js';
import { detectQuality } from './scene/createRenderer.js';
import { BunemaPhone } from './models/BunemaPhone.js';
import { createHeroPresentation } from './animations/heroAnimation.js';

/**
 * Arranca la parte 3D. Se carga con `import()` dinámico desde main.js:
 * Three.js (el archivo más pesado) se descarga en paralelo mientras el
 * texto del hero ya es visible y navegable.
 */
export function startExperience({ canvas, heroEl, reducedMotion, onContextLost, onContextRestored }) {
  const quality = detectQuality();
  // Si no hay WebGL, el constructor de WebGLRenderer lanza un error: lo captura main.js.
  const sceneManager = new SceneManager({ canvas, quality, onContextLost, onContextRestored });
  let phone = null;
  let hero = null;
  try {
    const anisotropy = Math.min(quality.anisotropy, sceneManager.renderer.capabilities.getMaxAnisotropy());
    phone = new BunemaPhone({ anisotropy });
    hero = createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion });
  } catch (error) {
    // Si algo falla después de crear el renderer, se libera la GPU antes de propagar el error.
    hero?.dispose();
    phone?.dispose();
    sceneManager.dispose();
    throw error;
  }

  // Compila los shaders antes del primer fotograma visible para evitar un tirón en la entrada.
  sceneManager.renderer.compile(sceneManager.scene, sceneManager.camera);
  hero.reveal();

  return {
    sceneManager,
    phone,
    dispose() {
      hero.dispose();
      phone.dispose();
      sceneManager.dispose();
    },
  };
}
