/**
 * Datos centralizados de la marca conceptual BUNEMA.
 *
 * Todo lo que aquí aparece es ficticio y existe solo como parte de un
 * proyecto de portafolio. Centralizar los datos evita que los colores o
 * las medidas del teléfono se repitan en varios archivos: el modelo 3D,
 * la interfaz y (en fases siguientes) el configurador leen de aquí.
 */

/** Combinaciones de color del Bunema X1. `body` tiñe la carcasa trasera, `frame` el marco metálico. */
export const COLORWAYS = [
  { id: 'obsidian', name: 'Obsidian Black', body: '#101218', frame: '#4a4e58', plate: '#0d0f14' },
  { id: 'glacier', name: 'Glacier Silver', body: '#c7ccd6', frame: '#d6dae2', plate: '#aeb4c0' },
  { id: 'electric', name: 'Electric Blue', body: '#1f3f9c', frame: '#6a82c8', plate: '#16306f' },
  { id: 'nebula', name: 'Nebula Violet', body: '#4a2f85', frame: '#9a86c0', plate: '#33205c' },
];

/** Acabados de la carcasa trasera expresados como parámetros físicos del material. */
export const FINISHES = [
  { id: 'matte', name: 'Mate', roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.55 },
  { id: 'gloss', name: 'Brillante', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 },
];

export const BUNEMA_X1 = {
  id: 'x1',
  name: 'Bunema X1',
  serial: 'BNM-X1',
  // Medidas en milímetros. El modelo 3D usa 1 unidad = 10 mm.
  dimensions: { height: 154.0, width: 72.0, depth: 8.2 },
  weight: 186,
  defaultColorway: 'obsidian',
  defaultFinish: 'matte',
};

export const findColorway = (id) => COLORWAYS.find((c) => c.id === id) ?? COLORWAYS[0];
export const findFinish = (id) => FINISHES.find((f) => f.id === id) ?? FINISHES[0];
