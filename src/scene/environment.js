import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Mapa de entorno para reflejos físicos, sin descargar ningún HDRI.
 *
 * RoomEnvironment es una habitación generada con cajas y paneles de
 * luz (incluida en Three.js, licencia MIT). PMREMGenerator la "pre-filtra"
 * en varios niveles de desenfoque: así un metal pulido usa el nivel
 * nítido y un vidrio mate usa uno borroso, que es justo lo que hace
 * la `roughness` en un MeshPhysicalMaterial.
 */
export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;

  // La escena temporal ya no hace falta: liberamos su memoria de inmediato.
  room.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      obj.material.dispose();
    }
  });
  pmrem.dispose();

  return texture;
}
