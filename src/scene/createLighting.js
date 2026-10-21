import * as THREE from 'three';

/**
 * Iluminación de estudio en tres capas:
 *  - Clave (key): luz principal cálida-neutra que define volumen.
 *  - Contras (rim) azul y violeta: dibujan el contorno del teléfono
 *    contra el fondo negro. Sin ellas, un teléfono oscuro desaparece.
 *  - Relleno (hemisphere): levanta las sombras sin aplanar.
 *
 * Los colores de marca aparecen como luz reflejada, no como pintura:
 * así "el azul dirige la atención" también dentro de la escena 3D.
 */
export function createLighting(scene) {
  const group = new THREE.Group();
  group.name = 'studio-lights';

  const key = new THREE.DirectionalLight('#fff6ec', 2.8);
  key.position.set(-6, 9, 10);

  const rimBlue = new THREE.DirectionalLight('#2f6bff', 6);
  rimBlue.position.set(12, 4, -10);

  const rimViolet = new THREE.DirectionalLight('#8b5cf6', 4);
  rimViolet.position.set(-12, -2, -10);

  const top = new THREE.SpotLight('#ffffff', 420, 60, Math.PI / 8, 0.85, 1.4);
  top.position.set(2, 22, 6);
  top.target.position.set(0, 0, 0);

  const fill = new THREE.HemisphereLight('#c9d4ff', '#05060a', 0.15);

  group.add(key, rimBlue, rimViolet, top, top.target, fill);
  scene.add(group);

  return {
    group,
    dispose() {
      group.traverse((obj) => obj.dispose?.());
      group.removeFromParent();
    },
  };
}
