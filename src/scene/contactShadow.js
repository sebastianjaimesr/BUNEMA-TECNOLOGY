import * as THREE from 'three';

/**
 * Sombra de contacto falsa: un plano con un degradado radial.
 *
 * Un shadow map real exigiría renderizar la escena una vez más desde la
 * luz en cada fotograma. Para un objeto que flota sobre un "suelo"
 * invisible, un degradado suave es indistinguible y casi gratis.
 */
export function createContactShadow({ width = 9, depth = 3.2 } = {}) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  plane.name = 'contact-shadow';
  plane.rotation.x = -Math.PI / 2;

  return {
    mesh: plane,
    dispose() {
      plane.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
