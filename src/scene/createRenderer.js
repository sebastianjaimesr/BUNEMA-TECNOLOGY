import * as THREE from 'three';

/**
 * Perfil de calidad según el dispositivo.
 *
 * No intentamos adivinar la GPU exacta (no es fiable); usamos señales
 * baratas: puntero táctil, ancho de pantalla y número de núcleos.
 * El objetivo es limitar el pixel ratio, que es el factor que más
 * multiplica el coste por fotograma (DPR 3 = 9 veces más píxeles que DPR 1).
 */
export function detectQuality() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency || 4;
  const low = coarse || small || cores <= 4;
  return {
    tier: low ? 'low' : 'high',
    maxPixelRatio: low ? 1.75 : 2,
    antialias: !low || window.devicePixelRatio < 2,
    anisotropy: low ? 4 : 8,
  };
}

/**
 * Crea el único WebGLRenderer de la aplicación.
 * Lanza un error si el navegador no puede crear un contexto WebGL;
 * quien lo llama decide mostrar la alternativa sin 3D.
 */
export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    alpha: true, // fondo transparente: el CSS compone la escena con la interfaz
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // ACES comprime las luces intensas como una película: reflejos brillantes sin "quemar" el blanco.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}
