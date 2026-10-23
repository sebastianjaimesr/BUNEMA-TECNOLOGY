/**
 * Datos centralizados de la marca conceptual BUNEMA.
 *
 * Todo lo que aquí aparece es ficticio y existe solo como parte de un
 * proyecto de portafolio. Centralizar los datos evita que los colores o
 * las medidas del teléfono se repitan en varios archivos: el modelo 3D,
 * la interfaz y el configurador leen de aquí.
 */

/**
 * Combinaciones de color del Bunema X1.
 *  - `body`: carcasa trasera · `frame`: marco metálico · `plate`: placa de cámara.
 *  - `logo`: tono del logotipo grabado (contrasta con la carcasa).
 *  - `swatch`: color de la muestra en la interfaz (en los tonos muy oscuros se aclara un poco para que se distinga del fondo).
 *  - `code`: abreviatura técnica que forma la referencia del modelo (BNM-X1-OB-M).
 */
export const COLORWAYS = [
  {
    id: 'obsidian',
    code: 'OB',
    name: 'Obsidian Black',
    description: 'Negro profundo con marco de grafito.',
    body: '#101218',
    frame: '#4a4e58',
    plate: '#0d0f14',
    logo: '#b4bac8',
    swatch: '#1c1f27',
  },
  {
    id: 'glacier',
    code: 'GS',
    name: 'Glacier Silver',
    description: 'Plata fría con marco de aluminio natural.',
    body: '#c7ccd6',
    frame: '#d6dae2',
    plate: '#aeb4c0',
    logo: '#5d6472',
    swatch: '#c7ccd6',
  },
  {
    id: 'electric',
    code: 'EB',
    name: 'Electric Blue',
    description: 'El azul de la marca, con marco anodizado a juego.',
    body: '#1f3f9c',
    frame: '#6a82c8',
    plate: '#16306f',
    logo: '#b9c7f0',
    swatch: '#2a4fb8',
  },
  {
    id: 'nebula',
    code: 'NV',
    name: 'Nebula Violet',
    description: 'Violeta denso con marco lavanda.',
    body: '#4a2f85',
    frame: '#9a86c0',
    plate: '#33205c',
    logo: '#cbbcef',
    swatch: '#5a3a9e',
  },
];

/**
 * Acabados de la carcasa trasera expresados como parámetros físicos del material.
 * `frameRoughness`: el marco acompaña al acabado (satinado o pulido).
 */
export const FINISHES = [
  {
    id: 'matte',
    code: 'M',
    name: 'Mate',
    description: 'Vidrio grabado al ácido: suave al tacto y sin huellas.',
    roughness: 0.42,
    clearcoat: 0.2,
    clearcoatRoughness: 0.55,
    frameRoughness: 0.34,
  },
  {
    id: 'gloss',
    code: 'B',
    name: 'Brillante',
    description: 'Vidrio pulido con laca: reflejos nítidos como un espejo.',
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    frameRoughness: 0.2,
  },
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

/** Referencia técnica de una configuración, p. ej. `BNM-X1-GS-B`. */
export const configurationCode = (colorway, finish) => `${BUNEMA_X1.serial}-${colorway.code}-${finish.code}`;
