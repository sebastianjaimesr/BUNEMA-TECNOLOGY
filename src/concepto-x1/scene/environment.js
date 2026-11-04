import * as THREE from 'three';

/**
 * Estudio de fotografía de producto como mapa de entorno, sin descargar ningún HDRI.
 *
 * Un teléfono es casi todo metal y vidrio: lo que se ve en él son REFLEJOS.
 * Por eso, en lugar de una habitación genérica, se construye un estudio
 * oscuro con pocas fuentes de luz grandes y bien definidas, como en una
 * sesión de producto real:
 *  - una caja de luz superior, amplia y suave (da el brillo largo del vidrio);
 *  - dos tiras verticales a los lados (dibujan los cantos del marco);
 *  - una tira azul de marca detrás a la derecha (el acento de BUNEMA);
 *  - un rebote tenue desde el suelo (evita que la parte inferior sea negra).
 *
 * PMREMGenerator "pre-filtra" la escena en varios niveles de desenfoque: un
 * metal pulido usa el nivel nítido y un vidrio mate uno borroso, que es lo
 * que hace `roughness` en un MeshPhysicalMaterial. Se genera una sola vez
 * (unos milisegundos) y la escena temporal se libera de inmediato.
 *
 * Devuelve el render target: su memoria de GPU se libera con `target.dispose()`.
 */

/** Material emisivo con intensidad > 1: el render target del PMREM es de coma flotante. */
function lightMaterial(color, intensity) {
  const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  material.color.multiplyScalar(intensity);
  return material;
}

function buildStudio() {
  const scene = new THREE.Scene();
  const disposables = [];
  const add = (geometry, material, setup) => {
    const mesh = new THREE.Mesh(geometry, material);
    setup(mesh);
    scene.add(mesh);
    disposables.push(geometry, material);
    return mesh;
  };

  // Paredes: casi negras, con un leve tono azulado (el fondo del sitio es #05060A).
  add(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: '#0b0e16', side: THREE.BackSide }), () => {});

  // Caja de luz superior, inclinada hacia el producto.
  add(new THREE.PlaneGeometry(14, 6), lightMaterial('#ffffff', 5), (m) => {
    m.position.set(0, 9.5, 2);
    m.rotation.x = Math.PI / 2 - 0.25;
  });
  // Tira lateral izquierda (blanco frío) y derecha (blanco neutro, más tenue).
  add(new THREE.PlaneGeometry(1.4, 12), lightMaterial('#eef3ff', 6), (m) => {
    m.position.set(-11, 1, 3);
    m.rotation.y = Math.PI / 2;
  });
  add(new THREE.PlaneGeometry(1, 10), lightMaterial('#ffffff', 3), (m) => {
    m.position.set(11, 0, 5);
    m.rotation.y = -Math.PI / 2;
  });
  // Acento azul de marca, detrás a la derecha: aparece como filo azul en el marco.
  add(new THREE.PlaneGeometry(2, 12), lightMaterial('#2f6bff', 7), (m) => {
    m.position.set(8, 1, -12);
    m.rotation.y = -0.5;
  });
  // Rebote del suelo.
  add(new THREE.PlaneGeometry(20, 20), lightMaterial('#1a2235', 0.6), (m) => {
    m.position.set(0, -9.5, 0);
    m.rotation.x = -Math.PI / 2;
  });

  return {
    scene,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = buildStudio();
  const target = pmrem.fromScene(studio.scene, 0.035);
  studio.dispose();
  pmrem.dispose();
  return target;
}
