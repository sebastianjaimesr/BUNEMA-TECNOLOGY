import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Constructores de cada pieza del Bunema X1.
 *
 * Sistema de coordenadas del teléfono (en reposo):
 *  - X: ancho, Y: alto, Z: grosor.
 *  - La pantalla mira hacia +Z y la carcasa trasera hacia -Z.
 *  - 1 unidad = 10 mm, así 15.4 unidades = 154 mm de alto.
 *
 * Cada función devuelve un `THREE.Group` independiente. En la Fase 3
 * el despiece solo tendrá que mover/rotar estos grupos: ninguna pieza
 * depende de la geometría de otra.
 */

export const DIM = Object.freeze({
  width: 7.2,
  height: 15.4,
  depth: 0.82,
  radius: 0.95, // radio de las esquinas en planta
  wall: 0.12, // grosor de la pared del marco
  frameBevel: 0.05,
});

const HALF_DEPTH = DIM.depth / 2;

/* ------------------------------------------------------------------ */
/* Utilidades de trazado 2D                                            */
/* ------------------------------------------------------------------ */

/** Dibuja un rectángulo redondeado centrado en (cx, cy) dentro de un Shape o Path. */
export function traceRoundedRect(path, w, h, r, cx = 0, cy = 0) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - r);
  path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y1);
  path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + r);
  path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/**
 * Rectángulo redondeado con UNA esquina cortada a 45°: el "Corte X",
 * firma visual de BUNEMA que se repite en la interfaz (botones, etiquetas).
 */
export function traceChamferedRect(path, w, h, r, chamfer, cx = 0, cy = 0) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  path.moveTo(x0 + chamfer, y0);
  path.lineTo(x1 - r, y0);
  path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x1, y1 - r);
  path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  path.lineTo(x0 + r, y1);
  path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x0, y0 + chamfer);
  path.lineTo(x0 + chamfer, y0);
  return path;
}

function circlePath(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

/** Las UV de ShapeGeometry vienen en unidades de mundo; las llevamos a 0..1 para poder texturizar. */
export function normalizeUVs(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const uv = geometry.attributes.uv;
  const pos = geometry.attributes.position;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, (pos.getX(i) - min.x) / (max.x - min.x), (pos.getY(i) - min.y) / (max.y - min.y));
  }
  uv.needsUpdate = true;
  return geometry;
}

function mesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  return m;
}

function part(name, ...children) {
  const group = new THREE.Group();
  group.name = name;
  children.forEach((c) => group.add(c));
  return group;
}

/* ------------------------------------------------------------------ */
/* Distribución del sistema de cámara (compartida por varias piezas)   */
/* ------------------------------------------------------------------ */

// Vista desde atrás: +X aparece a la IZQUIERDA del observador, así que
// la placa queda arriba a la izquierda cuando miramos la carcasa.
const PLATE = { w: 2.9, h: 3.25, r: 0.62, chamfer: 1.0 };
PLATE.cx = DIM.width / 2 - 0.34 - PLATE.w / 2;
PLATE.cy = DIM.height / 2 - 0.34 - PLATE.h / 2;

const LENSES = [
  { id: 'main', r: 0.62, x: PLATE.cx + 0.55, y: PLATE.cy + 0.75 },
  { id: 'ultra', r: 0.44, x: PLATE.cx - 0.72, y: PLATE.cy + 0.75 },
  { id: 'tele', r: 0.44, x: PLATE.cx + 0.55, y: PLATE.cy - 0.85 },
];
const BARREL_RING = 0.07; // anillo metálico alrededor de cada lente
const FLASH = { x: PLATE.cx - 0.72, y: PLATE.cy - 0.2, r: 0.17 };

// Profundidades (Z) clave. Negativo = hacia la parte trasera.
const BACK_GLASS = { depth: 0.04, bevel: 0.015 };
const PLATE_DEPTH = { depth: 0.05, bevel: 0.03 };
const Z_BACK_OUTER = -HALF_DEPTH + 0.005; // cara exterior del vidrio trasero
const Z_PLATE_OUTER = -HALF_DEPTH - PLATE_DEPTH.depth - PLATE_DEPTH.bevel * 2; // cara exterior de la placa
const Z_LENS_TIP = Z_PLATE_OUTER - 0.05;

/** Contorno interior del marco a mitad de altura: el hueco libre para el resto de piezas. */
function innerOutline() {
  const inset = DIM.wall + DIM.frameBevel + 0.01;
  return { w: DIM.width - inset * 2, h: DIM.height - inset * 2, r: DIM.radius - inset };
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

/** Marco metálico: un anillo extruido con bisel suave en ambos cantos. */
export function createFrame(mat) {
  const { width: W, height: H, depth: T, radius: R, wall, frameBevel: bs } = DIM;
  const bevelThickness = 0.08;

  const shape = traceRoundedRect(new THREE.Shape(), W - bs * 2, H - bs * 2, R - bs);
  shape.holes.push(traceRoundedRect(new THREE.Path(), W - wall * 2, H - wall * 2, R - wall));

  const depth = T - bevelThickness * 2;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize: bs,
    bevelSegments: 6,
    curveSegments: 28,
  });
  geometry.translate(0, 0, -depth / 2);

  return part('frame', mesh(geometry, mat.frame, 'frame-body'));
}

/** Vidrio frontal: losa fina que cubre casi todo el frente. */
export function createFrontGlass(mat) {
  const o = innerOutline();
  const bevel = 0.012;
  const depth = 0.035;
  const shape = traceRoundedRect(new THREE.Shape(), o.w - bevel * 2, o.h - bevel * 2, o.r - bevel);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 24,
  });
  // Cara superior a 5 milésimas del canto del marco.
  geometry.translate(0, 0, HALF_DEPTH - 0.005 - depth - bevel);
  const glass = mesh(geometry, mat.frontGlass, 'front-glass');
  glass.renderOrder = 2; // transparente: se dibuja después de la pantalla
  return part('frontGlass', glass);
}

/** Pantalla: panel base oscuro + superficie emisiva con la interfaz de bloqueo. */
export function createDisplay(mat) {
  const o = innerOutline();
  const panelDepth = 0.05;
  // El panel sigue el radio de las esquinas del marco: así cabe en su hueco
  // y puede salir por delante durante el despiece sin rozarlo.
  const panelShape = traceRoundedRect(new THREE.Shape(), o.w - 0.04, o.h - 0.04, o.r - 0.02);
  const panelGeo = new THREE.ExtrudeGeometry(panelShape, { depth: panelDepth, bevelEnabled: false, curveSegments: 24 });
  panelGeo.translate(0, 0, -panelDepth / 2);
  const panel = mesh(panelGeo, mat.displayPanel, 'display-panel');
  const zPanel = HALF_DEPTH - 0.075 - panelDepth / 2;
  panel.position.z = zPanel;

  const bezel = 0.1;
  const screenShape = traceRoundedRect(new THREE.Shape(), o.w - bezel * 2, o.h - bezel * 2, o.r - bezel);
  const screen = mesh(normalizeUVs(new THREE.ShapeGeometry(screenShape, 24)), mat.display, 'display-screen');
  screen.position.z = zPanel + panelDepth / 2 + 0.002;

  return part('display', panel, screen);
}

/** Carcasa trasera: vidrio con perforaciones + placa de cámara con el "Corte X" y su línea de luz. */
export function createBackCover(mat) {
  const o = innerOutline();

  // Las perforaciones dejan pasar los cilindros de las lentes sin intersecciones.
  const holeFor = (l, extra) => circlePath(l.x, l.y, l.r + BARREL_RING + extra);

  const glassShape = traceRoundedRect(new THREE.Shape(), o.w - BACK_GLASS.bevel * 2, o.h - BACK_GLASS.bevel * 2, o.r);
  LENSES.forEach((l) => glassShape.holes.push(holeFor(l, 0.04)));
  const glassGeo = new THREE.ExtrudeGeometry(glassShape, {
    depth: BACK_GLASS.depth,
    bevelEnabled: true,
    bevelThickness: BACK_GLASS.bevel,
    bevelSize: BACK_GLASS.bevel,
    bevelSegments: 3,
    curveSegments: 24,
  });
  glassGeo.translate(0, 0, Z_BACK_OUTER + BACK_GLASS.bevel);
  const glass = mesh(glassGeo, mat.back, 'back-glass');

  const plateShape = traceChamferedRect(new THREE.Shape(), PLATE.w, PLATE.h, PLATE.r, PLATE.chamfer, PLATE.cx, PLATE.cy);
  LENSES.forEach((l) => plateShape.holes.push(holeFor(l, 0.05)));
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: PLATE_DEPTH.depth,
    bevelEnabled: true,
    bevelThickness: PLATE_DEPTH.bevel,
    bevelSize: PLATE_DEPTH.bevel,
    bevelSegments: 4,
    curveSegments: 32,
  });
  plateGeo.translate(0, 0, Z_PLATE_OUTER + PLATE_DEPTH.bevel);
  const plate = mesh(plateGeo, mat.plate, 'camera-plate');

  // Línea de luz paralela al corte de 45°.
  const x0 = PLATE.cx - PLATE.w / 2;
  const y0 = PLATE.cy - PLATE.h / 2;
  const lineLen = PLATE.chamfer * Math.SQRT2 * 0.62;
  const line = mesh(new THREE.BoxGeometry(lineLen, 0.035, 0.012), mat.accent, 'light-line');
  line.position.set(x0 + PLATE.chamfer / 2 + 0.2, y0 + PLATE.chamfer / 2 + 0.2, Z_PLATE_OUTER - 0.004);
  line.rotation.z = -Math.PI / 4;

  const flash = mesh(new THREE.CylinderGeometry(FLASH.r, FLASH.r, 0.02, 32), mat.flash, 'flash');
  flash.rotation.x = Math.PI / 2;
  flash.position.set(FLASH.x, FLASH.y, Z_PLATE_OUTER - 0.008);

  const logo = mesh(new THREE.PlaneGeometry(2.2, 0.55), mat.logo, 'back-logo');
  logo.rotation.y = Math.PI; // mira hacia atrás y se lee sin espejo desde ese lado
  logo.position.set(0, -5.6, Z_BACK_OUTER - 0.003);

  return part('backCover', glass, plate, line, flash, logo);
}

/** Módulo de cámara: sensores internos + cilindros metálicos que atraviesan la carcasa. */
export function createCameraModule(mat) {
  const group = part('cameraModule');
  const zInner = -HALF_DEPTH + 0.075; // justo por dentro del vidrio trasero
  const barrelLen = zInner - Z_LENS_TIP;

  LENSES.forEach((l) => {
    const size = (l.r + BARREL_RING) * 2 + 0.16;
    const housing = mesh(new RoundedBoxGeometry(size, size, 0.18, 2, 0.04), mat.housing, `sensor-${l.id}`);
    housing.position.set(l.x, l.y, zInner + 0.09 + 0.005);

    const radius = l.r + BARREL_RING;
    const barrel = mesh(new THREE.CylinderGeometry(radius, radius, barrelLen, 48), mat.metalDark, `barrel-${l.id}`);
    barrel.rotation.x = Math.PI / 2; // eje del cilindro: de Y a Z
    barrel.position.set(l.x, l.y, zInner - barrelLen / 2);

    group.add(housing, barrel);
  });

  return group;
}

/** Lentes: casquetes esféricos (no discos planos) para que el reflejo se curve como en una óptica real. */
export function createLenses(mat) {
  const group = part('lenses');
  const theta = 0.55; // apertura del casquete en radianes

  LENSES.forEach((l) => {
    const sphereR = l.r / Math.sin(theta);
    const geometry = new THREE.SphereGeometry(sphereR, 48, 12, 0, Math.PI * 2, 0, theta);
    // El polo +Y pasa a mirar hacia -Z y la base del casquete queda en z = 0.
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, sphereR * Math.cos(theta));
    const lens = mesh(geometry, mat.lens, `lens-${l.id}`);
    lens.position.set(l.x, l.y, Z_LENS_TIP - 0.001);
    group.add(lens);
  });

  return group;
}

/** Batería: celda con esquinas suaves y etiqueta impresa en su cara trasera. */
export function createBattery(mat) {
  const o = innerOutline();
  const size = { w: o.w - 0.6, h: 8.4, d: 0.32 };
  const body = mesh(new RoundedBoxGeometry(size.w, size.h, size.d, 3, 0.08), mat.battery, 'battery-cell');

  const label = mesh(new THREE.PlaneGeometry(size.w - 0.5, size.h - 0.6), mat.batteryLabel, 'battery-label');
  label.rotation.y = Math.PI; // la etiqueta mira hacia la parte trasera
  label.position.z = -size.d / 2 - 0.002;

  const group = part('battery', body, label);
  group.position.set(0, -2.85, -0.1);
  return group;
}

/** Placa base: sustrato con pistas + componentes SMD que comparten una sola geometría. */
export function createMainboard(mat) {
  const o = innerOutline();
  const size = { w: o.w - 0.5, h: 5.0, d: 0.05 };
  const board = mesh(new RoundedBoxGeometry(size.w, size.h, size.d, 2, 0.02), mat.pcbEdge, 'board');

  const traces = mesh(new THREE.PlaneGeometry(size.w - 0.1, size.h - 0.1), mat.circuit, 'board-traces');
  traces.rotation.y = Math.PI;
  traces.position.z = -size.d / 2 - 0.002;

  const group = part('mainboard', board, traces);

  // Geometría reutilizada: 6 mallas, 1 sola geometría en memoria.
  const componentGeo = new RoundedBoxGeometry(0.5, 0.32, 0.08, 1, 0.02);
  [
    [-2.2, 1.6], [-2.2, 0.9], [-0.6, -1.8], [-1.7, -1.8], [0.3, -0.6], [-2.4, -1.2],
  ].forEach(([x, y], i) => {
    const c = mesh(componentGeo, mat.component, `smd-${i}`);
    c.position.set(x, y, -size.d / 2 - 0.04);
    group.add(c);
  });

  group.position.set(0, 4.7, -0.12);
  return group;
}

/** Procesador BX-1: encapsulado metálico con serigrafía. */
export function createProcessor(mat) {
  const lid = mesh(new RoundedBoxGeometry(1.3, 1.3, 0.08, 2, 0.02), mat.chip, 'chip-lid');
  const label = mesh(new THREE.PlaneGeometry(1.18, 1.18), mat.chipLabel, 'chip-label');
  label.rotation.y = Math.PI;
  label.position.z = -0.041;

  const group = part('processor', lid, label);
  // Sobre la cara trasera de la placa base, lejos del sistema de cámara.
  group.position.set(-1.05, 4.6, -0.185);
  return group;
}

/** Botones laterales: volumen + encendido a la derecha, "Pulse Key" azul a la izquierda. */
export function createButtons(mat) {
  const group = part('buttons');
  const x = DIM.width / 2 + 0.025;
  const make = (len, material, name, side, y) => {
    const b = mesh(new RoundedBoxGeometry(0.1, len, 0.3, 2, 0.045), material, name);
    b.position.set(side * x, y, 0);
    group.add(b);
  };
  make(2.0, mat.frame, 'volume', 1, 4.3);
  make(1.15, mat.frame, 'power', 1, 2.2);
  make(0.75, mat.accent, 'pulse-key', -1, 4.6);
  return group;
}

/** Puerto USB-C + rejillas de altavoz en el canto inferior. */
export function createPort(mat) {
  const group = part('port');
  const yEdge = -DIM.height / 2;

  const slot = mesh(new RoundedBoxGeometry(0.95, 0.14, 0.3, 4, 0.06), mat.port, 'usb-c');
  slot.position.set(0, yEdge + 0.06, 0);
  const tongue = mesh(new THREE.BoxGeometry(0.6, 0.02, 0.08), mat.metalDark, 'usb-c-tongue');
  tongue.position.set(0, yEdge - 0.002, 0);
  group.add(slot, tongue);

  const holeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 16);
  [-1.9, -1.65, -1.4, -1.15, 1.15, 1.4, 1.65, 1.9].forEach((hx, i) => {
    const h = mesh(holeGeo, mat.port, `speaker-${i}`);
    h.position.set(hx, yEdge + 0.03, 0);
    group.add(h);
  });

  return group;
}
