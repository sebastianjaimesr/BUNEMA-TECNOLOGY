/**
 * Guion del despiece del Bunema X1: datos + funciones puras.
 *
 * "Pura" significa que `sequenceAt(p)` siempre devuelve lo mismo para el
 * mismo progreso `p` (0..1). No guarda estado ni suma movimientos. Por eso
 * el despiece es reversible por construcción: subir, bajar o saltar a
 * cualquier punto produce exactamente la misma pose, sin estados rotos.
 *
 * Orden en el eje Z (negativo = hacia atrás) al final del despiece:
 *   carcasa −6,2 · lentes −5,0 · módulo de cámara −4,0 · batería y
 *   procesador −3,0 · placa −2,2 · marco −1,0 · pantalla +1,8 · vidrio +3,0
 * Cada pieza solo se mueve cuando nada se interpone en su camino: la
 * carcasa sale primero (sus agujeros dejan pasar las lentes), el marco se
 * aparta cuando la batería y la placa ya salieron, y por delante sale
 * primero el vidrio y después la pantalla. En cada pareja apilada, la
 * pieza exterior arranca antes y viaja más lejos, así que la interior
 * nunca la alcanza: ninguna pieza atraviesa a otra.
 */

/** Pasos narrativos. `range` = tramo del progreso total en el que ocurre. */
export const STEPS = [
  { id: 'approach', range: [0.0, 0.1], labels: [] },
  { id: 'back', range: [0.1, 0.2], labels: ['backCover'] },
  { id: 'camera', range: [0.2, 0.3], labels: ['cameraModule', 'lenses'] },
  { id: 'battery', range: [0.3, 0.39], labels: ['battery'] },
  { id: 'board', range: [0.39, 0.49], labels: ['mainboard', 'processor'] },
  { id: 'frame', range: [0.49, 0.58], labels: ['frame', 'buttons', 'port'] },
  { id: 'display', range: [0.58, 0.67], labels: ['display', 'frontGlass'] },
  { id: 'exploded', range: [0.67, 0.77], labels: [] },
  { id: 'specs', range: [0.77, 0.87], labels: 'all' },
  { id: 'rebuild', range: [0.87, 1.0], labels: [] },
];

/**
 * Desplazamiento máximo de cada pieza respecto a su reposo y el tramo
 * del progreso en el que viaja. `spreadX` separa los hijos hacia fuera
 * (botones de cada lado) en lugar de mover el grupo entero.
 */
export const PART_MOTION = {
  backCover: { offset: [0, 0, -6.2], range: [0.1, 0.2] },
  lenses: { offset: [0, 0.35, -5.0], range: [0.2, 0.28] },
  cameraModule: { offset: [0, 0.35, -4.0], range: [0.21, 0.3] },
  battery: { offset: [0, 0, -3.0], range: [0.3, 0.39] },
  processor: { offset: [0, 0, -3.0], range: [0.39, 0.47] },
  mainboard: { offset: [0, 0, -2.2], range: [0.4, 0.49] },
  frame: { offset: [0, 0, -1.0], range: [0.49, 0.57] },
  buttons: { offset: [0, 0, -1.0], range: [0.49, 0.57], spreadX: 0.22 },
  port: { offset: [0, -1.1, -1.0], range: [0.49, 0.58] },
  frontGlass: { offset: [0, 0, 3.0], range: [0.58, 0.66] },
  display: { offset: [0, 0, 1.8], range: [0.59, 0.67] },
};

// Reconstrucción (0,87 → 0,985): vuelve primero la pieza más interior de cada lado y al
// final la más exterior. Cada tramo empieza cuando la pieza de dentro ya va adelantada,
// así ninguna pieza que regresa alcanza a otra que todavía está fuera.
const REBUILD = {
  display: [0.87, 0.92],
  frontGlass: [0.875, 0.925],
  frame: [0.88, 0.93],
  buttons: [0.88, 0.93],
  port: [0.88, 0.93],
  mainboard: [0.89, 0.94],
  processor: [0.895, 0.945],
  battery: [0.9, 0.95],
  cameraModule: [0.905, 0.95],
  lenses: [0.91, 0.955],
  backCover: [0.93, 0.985],
};

/** Centro del conjunto despiezado en Z: se compensa para que la composición quede centrada. */
export const EXPLODED_CENTER_Z = (3.0 + -6.2) / 2;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Curva suave de entrada y salida (sin cambios bruscos de velocidad). */
const smooth = (t) => t * t * (3 - 2 * t);
export const rangeProgress = (p, [a, b]) => smooth(clamp01((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Poses de cámara (rotación del pivote y zoom) a lo largo del recorrido.
 * Entre dos claves se interpola con la curva suave.
 */
const POSE_KEYS = [
  { p: 0.0, rx: -0.18, ry: Math.PI - 0.62, rz: 0.2, zoom: 1.0 },
  { p: 0.1, rx: -0.3, ry: Math.PI - 1.2, rz: 0.06, zoom: 1.1 },
  { p: 0.67, rx: -0.28, ry: Math.PI - 1.32, rz: 0.04, zoom: 1.0 },
  { p: 0.77, rx: -0.22, ry: Math.PI - 1.5, rz: 0.02, zoom: 1.02 },
  { p: 0.87, rx: -0.22, ry: Math.PI - 1.5, rz: 0.02, zoom: 1.02 },
  { p: 1.0, rx: -0.18, ry: Math.PI - 0.62, rz: 0.2, zoom: 1.0 },
];

function poseAt(p) {
  let i = 0;
  while (i < POSE_KEYS.length - 2 && p > POSE_KEYS[i + 1].p) i += 1;
  const a = POSE_KEYS[i];
  const b = POSE_KEYS[i + 1];
  const t = smooth(clamp01((p - a.p) / (b.p - a.p)));
  return { rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t), rz: lerp(a.rz, b.rz, t), zoom: lerp(a.zoom, b.zoom, t) };
}

/** Paso activo para un progreso dado (índice en STEPS). */
export function stepIndexAt(p) {
  const i = STEPS.findIndex((s) => p < s.range[1]);
  return i === -1 ? STEPS.length - 1 : i;
}

/**
 * Estado completo del despiece para el progreso `p`.
 * @returns {{ parts: Record<string, number>, explode: number, pose: object, step: number }}
 *   parts: 0 = en reposo, 1 = totalmente separada.
 */
export function sequenceAt(p) {
  const parts = {};
  Object.keys(PART_MOTION).forEach((key) => {
    const out = rangeProgress(p, PART_MOTION[key].range);
    const back = rangeProgress(p, REBUILD[key]);
    parts[key] = out * (1 - back);
  });
  // Cuánto está "abierto" el conjunto en general (para centrar la composición).
  const explode = Math.max(...Object.values(parts));
  return { parts, explode, pose: poseAt(p), step: stepIndexAt(p) };
}
