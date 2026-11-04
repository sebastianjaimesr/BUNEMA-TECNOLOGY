import * as THREE from 'three';

/**
 * Iluminación directa del estudio (complementa los reflejos del mapa de entorno):
 *  - Clave (key): luz principal neutra-cálida que define el volumen.
 *  - Contra azul (rim): el azul eléctrico de la marca dibuja el contorno contra el fondo negro.
 *  - Contra fría (cool): un filo blanco azulado al otro lado; sin ella un teléfono
 *    oscuro desaparece sobre el fondo.
 *  - Cenital (top): un foco estrecho que da el brillo de "producto en vitrina".
 *  - Relleno (hemisphere): levanta las sombras sin aplanar.
 *
 * El color de marca aparece como luz reflejada, no como pintura.
 */
export function createLighting(scene) {
  const group = new THREE.Group();
  group.name = 'studio-lights';

  const key = new THREE.DirectionalLight('#fff7ee', 2.4);
  key.position.set(-6, 9, 10);

  const rimBlue = new THREE.DirectionalLight('#2f6bff', 5.5);
  rimBlue.position.set(12, 4, -10);

  const rimCool = new THREE.DirectionalLight('#dfe8ff', 2.2);
  rimCool.position.set(-12, -2, -10);

  const top = new THREE.SpotLight('#ffffff', 380, 60, Math.PI / 8, 0.85, 1.4);
  top.position.set(2, 22, 6);
  top.target.position.set(0, 0, 0);

  const fill = new THREE.HemisphereLight('#c9d4ff', '#05060a', 0.18);

  group.add(key, rimBlue, rimCool, top, top.target, fill);
  scene.add(group);

  return {
    group,
    // Las contras se exponen para que cada sección pueda atenuarlas (ver heroAnimation).
    rims: { blue: rimBlue, cool: rimCool },
    dispose() {
      group.traverse((obj) => obj.dispose?.());
      group.removeFromParent();
    },
  };
}
