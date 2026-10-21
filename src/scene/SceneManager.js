import * as THREE from 'three';
import { createRenderer } from './createRenderer.js';
import { createEnvironment } from './environment.js';
import { createLighting } from './createLighting.js';

/**
 * SceneManager: dueño único del renderer, la escena y la cámara.
 *
 * Idea clave — RENDERIZADO BAJO DEMANDA:
 * en lugar de dibujar 60 veces por segundo aunque nada cambie, cualquier
 * módulo que modifique algo visible llama a `requestRender()`. Varias
 * peticiones en el mismo fotograma se agrupan en un solo dibujo.
 * Con la escena quieta, el coste de GPU es cero.
 */
export class SceneManager {
  constructor({ canvas, quality, onContextLost, onContextRestored }) {
    this.canvas = canvas;
    this.quality = quality;
    this.active = true; // false cuando el canvas no es visible
    this.frameRequested = false;
    this.resizeListeners = new Set();

    this.renderer = createRenderer(canvas, quality);
    this.scene = new THREE.Scene();
    this.scene.environment = createEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.38;
    this.lighting = createLighting(this.scene);

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
    this.camera.position.set(0, 0, 40);

    this.render = this.render.bind(this);

    // Un ResizeObserver detecta cambios del tamaño CSS del canvas
    // (ventana, rotación del móvil, zoom) sin crear nunca otro renderer.
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);

    this.handleContextLost = (event) => {
      event.preventDefault(); // permite que el navegador intente restaurarlo
      onContextLost?.();
    };
    this.handleContextRestored = () => {
      onContextRestored?.();
      this.requestRender();
    };
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    // Al volver a la pestaña se redibuja el último estado (mientras está oculta no se dibuja).
    this.handleVisibility = () => {
      if (!document.hidden) this.requestRender();
    };
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.resize();
  }

  /** Tamaño visible (en unidades de mundo) del plano situado a `distance` de la cámara. */
  viewSizeAt(distance = this.camera.position.z) {
    const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return { width: height * this.camera.aspect, height };
  }

  onResize(listener) {
    this.resizeListeners.add(listener);
    return () => this.resizeListeners.delete(listener);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); // false: el CSS controla el tamaño visual
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.resizeListeners.forEach((fn) => fn({ width, height, view: this.viewSizeAt() }));
    this.requestRender();
  }

  /** Pausa/reanuda el trabajo 3D (p. ej. cuando el hero sale de pantalla). */
  setActive(active) {
    this.active = active;
    if (active) this.requestRender();
  }

  requestRender() {
    if (this.frameRequested || !this.active) return;
    this.frameRequested = true;
    requestAnimationFrame(this.render);
  }

  render() {
    this.frameRequested = false;
    if (!this.active || document.hidden) return;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.resizeListeners.clear();
    this.lighting.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
