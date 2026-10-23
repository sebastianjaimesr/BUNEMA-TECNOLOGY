import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { normalizeUVs, traceChamferedRect, traceRoundedRect } from './PhoneParts.js';

/**
 * Versión "de vitrina" de un teléfono de la familia X Series para el comparador.
 *
 * El Bunema X1 del hero tiene once piezas internas porque se desmonta. En la
 * comparación solo se ve el exterior, así que cada modelo se construye con
 * unas quince mallas: cuerpo, vidrios, placa de cámara, lentes y botones.
 * Las medidas salen de `MODELS[].body` (products.js): la misma fuente que
 * dibuja la ilustración SVG cuando no hay WebGL.
 *
 * Materiales:
 *  - Lentes, metal oscuro, destello, acento y pantalla se COMPARTEN con el
 *    X1 del hero (mismo lenguaje de diseño, cero materiales extra).
 *  - El X1 de la vitrina usa también la carcasa, el marco y la placa del
 *    hero: lo que el usuario elige en el configurador se ve aquí.
 *  - Pro y Lite clonan esos materiales y les aplican su propio color.
 */

const MM = 0.1; // 1 unidad de mundo = 10 mm, igual que el modelo del hero
const BEVEL = 0.05; // canto redondeado del cuerpo
const BEVEL_DEPTH = 0.08;
const RING = 0.07; // aro metálico alrededor de cada lente

export function createLineupPhone(model, shared) {
  const spec = model.body;
  const W = spec.width * MM;
  const H = spec.height * MM;
  const T = spec.depth * MM;
  const R = spec.radius * MM;
  const geometries = [];
  const ownMaterials = [];

  const geo = (g) => {
    geometries.push(g);
    return g;
  };
  const mesh = (geometry, material, name) => {
    const m = new THREE.Mesh(geo(geometry), material);
    m.name = name;
    return m;
  };

  /* Materiales --------------------------------------------------------- */
  let mat;
  if (!spec.look) {
    mat = { frame: shared.frame, back: shared.back, plate: shared.plate, logo: shared.logo };
  } else {
    const { look } = spec;
    const clone = (source, color) => {
      const m = source.clone(); // comparte la textura (logo) en lugar de copiarla
      m.color.set(color);
      ownMaterials.push(m);
      return m;
    };
    mat = {
      frame: clone(shared.frame, look.frame),
      back: clone(shared.back, look.body),
      plate: clone(shared.plate, look.plate),
      logo: clone(shared.logo, look.logo),
    };
    mat.back.roughness = look.roughness;
    mat.back.clearcoat = look.clearcoat;
    if (spec.material === 'polymer') {
      // Policarbonato: sin reflejo metálico y con un satinado más abierto.
      mat.back.metalness = 0;
      mat.plate.metalness = 0.1;
      mat.plate.roughness = 0.5;
      mat.plate.clearcoat = 0;
      mat.frame.roughness = 0.42;
    }
  }

  /* Coordenadas --------------------------------------------------------- */
  // Los datos describen la trasera vista desde atrás (origen arriba a la izquierda, en mm).
  // Visto desde atrás, el +X local del teléfono queda a la izquierda del observador.
  const toLocal = (x, y) => ({ x: W / 2 - x * MM, y: H / 2 - y * MM });

  const group = new THREE.Group();
  group.name = `lineup-${model.id}`;

  /* Cuerpo: un bloque extruido con cantos suaves, en el material del marco */
  const bodyShape = traceRoundedRect(new THREE.Shape(), W - BEVEL * 2, H - BEVEL * 2, R - BEVEL);
  const bodyDepth = T - BEVEL_DEPTH * 2;
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: bodyDepth,
    bevelEnabled: true,
    bevelThickness: BEVEL_DEPTH,
    bevelSize: BEVEL,
    bevelSegments: 5,
    curveSegments: 24,
  });
  bodyGeo.translate(0, 0, -bodyDepth / 2);
  group.add(mesh(bodyGeo, mat.frame, 'body'));

  /** Losa fina con la planta del teléfono, retranqueada `inset` desde el borde. */
  const slab = (inset, depth, bevel) => {
    const shape = traceRoundedRect(new THREE.Shape(), W - inset * 2, H - inset * 2, Math.max(R - inset, 0.05));
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 24,
    });
  };

  /* Trasera ------------------------------------------------------------- */
  const zBack = -T / 2;
  const backGeo = slab(0.2, 0.03, 0.012);
  // La cara exterior queda 0,3 mm por fuera del cuerpo; la interior, escondida dentro.
  const zBackOuter = zBack - 0.03;
  backGeo.translate(0, 0, zBackOuter + 0.012);
  group.add(mesh(backGeo, mat.back, 'back-glass'));

  // Placa de cámara con el Corte X en su esquina inferior derecha (vista desde atrás).
  const island = spec.island;
  const islandCenter = toLocal(island.x + island.w / 2, island.y + island.h / 2);
  const islandShape = traceChamferedRect(
    new THREE.Shape(),
    island.w * MM,
    island.h * MM,
    island.r * MM,
    island.chamfer * MM,
    islandCenter.x,
    islandCenter.y,
  );
  const islandGeo = new THREE.ExtrudeGeometry(islandShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 28,
  });
  const zIsland = zBackOuter - 0.08; // cara exterior de la placa
  islandGeo.translate(0, 0, zIsland + 0.03);
  group.add(mesh(islandGeo, mat.plate, 'camera-island'));

  // Línea de luz paralela al Corte X: la firma que comparten los tres modelos.
  const chamfer = island.chamfer * MM;
  const cornerX = islandCenter.x - (island.w * MM) / 2;
  const cornerY = islandCenter.y - (island.h * MM) / 2;
  const line = mesh(new THREE.BoxGeometry(chamfer * Math.SQRT2 * 0.62, 0.035, 0.012), shared.accent, 'light-line');
  line.position.set(cornerX + chamfer * 0.7, cornerY + chamfer * 0.7, zIsland - 0.004);
  line.rotation.z = -Math.PI / 4;
  group.add(line);

  // Lentes: aro metálico + casquete esférico (igual que en el X1 del hero).
  const zRingOuter = zIsland - 0.1;
  spec.lenses.forEach((lens, i) => {
    const p = toLocal(lens.x, lens.y);
    const r = lens.r * MM;
    const ring = mesh(new THREE.CylinderGeometry(r + RING, r + RING, 0.12, 40), shared.metalDark, `lens-ring-${i}`);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(p.x, p.y, zRingOuter + 0.06);
    const theta = 0.55;
    const sphereR = r / Math.sin(theta);
    const capGeo = new THREE.SphereGeometry(sphereR, 40, 10, 0, Math.PI * 2, 0, theta);
    capGeo.rotateX(-Math.PI / 2);
    capGeo.translate(0, 0, sphereR * Math.cos(theta));
    const cap = mesh(capGeo, shared.lens, `lens-${i}`);
    cap.position.set(p.x, p.y, zRingOuter + 0.004);
    group.add(ring, cap);
  });

  // El destello va sobre la placa o directamente sobre la trasera (Lite).
  const { flash } = spec;
  const onIsland =
    flash.x > island.x && flash.x < island.x + island.w && flash.y > island.y && flash.y < island.y + island.h;
  const flashPos = toLocal(flash.x, flash.y);
  const flashMesh = mesh(new THREE.CylinderGeometry(flash.r * MM, flash.r * MM, 0.02, 24), shared.flash, 'flash');
  flashMesh.rotation.x = Math.PI / 2;
  flashMesh.position.set(flashPos.x, flashPos.y, (onIsland ? zIsland : zBackOuter) - 0.008);
  group.add(flashMesh);

  const logo = mesh(new THREE.PlaneGeometry(2.2, 0.55), mat.logo, 'back-logo');
  logo.rotation.y = Math.PI;
  logo.position.set(0, -H / 2 + 2.1, zBackOuter - 0.003);
  group.add(logo);

  /* Frente: panel negro + pantalla encendida (la misma textura del X1) */
  const panelGeo = slab(0.12, 0.03, 0);
  panelGeo.translate(0, 0, T / 2 - 0.026);
  group.add(mesh(panelGeo, shared.displayPanel, 'front-panel'));

  const inset = 0.12 + spec.bezel * MM;
  const screenShape = traceRoundedRect(new THREE.Shape(), W - inset * 2, H - inset * 2, Math.max(R - inset, 0.1));
  const screen = mesh(normalizeUVs(new THREE.ShapeGeometry(screenShape, 24)), shared.display, 'screen');
  screen.position.z = T / 2 + 0.006;
  group.add(screen);

  /* Botones: volumen y encendido a un lado, Pulse Key azul al otro ------ */
  const bx = W / 2 + 0.025;
  [
    [2.0, mat.frame, 1, H / 2 - 3.4],
    [1.15, mat.frame, 1, H / 2 - 5.5],
    [0.75, shared.accent, -1, H / 2 - 3.1],
  ].forEach(([len, material, side, y], i) => {
    const b = mesh(new RoundedBoxGeometry(0.1, len, 0.3, 2, 0.045), material, `button-${i}`);
    b.position.set(side * bx, y, 0);
    group.add(b);
  });

  return {
    group,
    /** Alto real en unidades de mundo (para alinear los tres sobre el mismo suelo). */
    height: H,
    dispose() {
      geometries.forEach((g) => g.dispose());
      ownMaterials.forEach((m) => m.dispose()); // los compartidos los libera el X1 del hero
      group.removeFromParent();
    },
  };
}
