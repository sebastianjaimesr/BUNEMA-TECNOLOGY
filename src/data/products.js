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

/* -------------------------------------------------------------------------- */
/* Comparador "Encuentra tu modelo"                                           */
/* -------------------------------------------------------------------------- */

/**
 * La familia X Series: tres modelos ficticios con el mismo lenguaje de
 * diseño (marco redondeado, "Corte X", Pulse Key azul) y diferencias reales
 * de tamaño, cámara y materiales. El X1 reutiliza los datos de arriba.
 *
 * `body`: lo que necesitan el modelo 3D de la comparación y su ilustración
 * SVG. Medidas en mm; la cámara se describe vista DESDE ATRÁS, con el origen
 * en la esquina superior izquierda de la carcasa (x hacia la derecha, y hacia abajo).
 *  - `island`: placa de cámara; el Corte X (chamfer = tamaño del corte) va en su esquina inferior derecha.
 *  - `lenses`: centro y radio de cada lente; `flash`: el destello.
 *  - `material`: 'glass' (vidrio con clearcoat) o 'polymer' (policarbonato mate).
 *  - `look`: color con el que se muestra en la comparación. El X1 no lo
 *    necesita: usa la combinación elegida en el configurador.
 */
export const MODELS = [
  {
    id: 'x1',
    name: 'Bunema X1',
    short: 'X1',
    tier: 'Gama alta',
    tagline: 'El sistema completo: tres cámaras, 144 Hz y carga de 65 W.',
    price: 4899000,
    colors: ['Obsidian Black', 'Glacier Silver', 'Electric Blue', 'Nebula Violet'],
    body: {
      width: 72,
      height: 154,
      depth: 8.2,
      radius: 9.5,
      bezel: 1.6,
      material: 'glass',
      island: { x: 3.4, y: 3.4, w: 29, h: 32.5, r: 6.2, chamfer: 10 },
      lenses: [
        { x: 12.4, y: 12.1, r: 6.2 },
        { x: 25.1, y: 12.1, r: 4.4 },
        { x: 12.4, y: 28.1, r: 4.4 },
      ],
      flash: { x: 25.1, y: 21.6, r: 1.7 },
    },
  },
  {
    id: 'pro',
    name: 'Bunema Pro',
    short: 'Pro',
    tier: 'Gama media-alta',
    tagline: 'Casi todo el X1 en un cuerpo más ligero y delgado.',
    price: 3499000,
    colors: ['Lunar Gray', 'Obsidian Black', 'Arctic White'],
    body: {
      width: 71,
      height: 151,
      depth: 7.9,
      radius: 9,
      bezel: 1.9,
      material: 'glass',
      island: { x: 3.4, y: 3.4, w: 19.5, h: 33, r: 5.4, chamfer: 7.5 },
      lenses: [
        { x: 13.15, y: 13.4, r: 5.6 },
        { x: 13.15, y: 27.4, r: 4.2 },
      ],
      flash: { x: 19.2, y: 21.5, r: 1.5 },
      look: { body: '#646a78', frame: '#a8aebb', plate: '#4c515d', logo: '#d4d8e0', roughness: 0.3, clearcoat: 0.6 },
    },
  },
  {
    id: 'lite',
    name: 'Bunema Lite',
    short: 'Lite',
    tier: 'Gama media',
    tagline: 'La experiencia BUNEMA esencial, con la batería para todo el día.',
    price: 1899000,
    colors: ['Polar White', 'Lunar Gray', 'Signal Blue'],
    body: {
      width: 70,
      height: 147,
      depth: 8.6,
      radius: 8.5,
      bezel: 2.6,
      material: 'polymer',
      island: { x: 4, y: 4, w: 14, h: 27, r: 7, chamfer: 5 },
      lenses: [
        { x: 11, y: 11.5, r: 4.6 },
        { x: 11, y: 23, r: 3.6 },
      ],
      flash: { x: 22.5, y: 8, r: 1.4 },
      look: { body: '#dfe2e9', frame: '#c3c7d0', plate: '#cfd3db', logo: '#7a8090', roughness: 0.62, clearcoat: 0 },
    },
  },
];

/**
 * Filas de la comparación. Cada valor tiene:
 *  - `value`: texto corto, visible siempre.
 *  - `detail`: ampliación que aparece con "Ver detalles" (no satura la tabla).
 *  - `metric` (opcional): número comparable. La fila dibuja una barra
 *    proporcional y marca el valor más alto (`higherIsBetter`).
 * Si los tres `value` coinciden, la fila se considera "igual" y se oculta
 * con el filtro "Solo diferencias".
 */
export const SPEC_ROWS = [
  {
    id: 'display',
    label: 'Pantalla',
    unit: 'Hz',
    values: {
      x1: { value: '6,5″ LumaFlow OLED · 1–144 Hz', detail: '2800 × 1260 px, LTPO, 3000 nits de pico.', metric: 144 },
      pro: { value: '6,3″ LumaFlow OLED · 1–120 Hz', detail: '2640 × 1200 px, LTPO, 2200 nits de pico.', metric: 120 },
      lite: { value: '6,1″ OLED · 60–90 Hz', detail: '2340 × 1080 px, 1400 nits de pico.', metric: 90 },
    },
  },
  {
    id: 'processor',
    label: 'Procesador',
    unit: 'TOPS',
    values: {
      x1: { value: 'BX-1 · 3 nm', detail: '8 núcleos y núcleo neuronal de 45 TOPS.', metric: 45 },
      pro: { value: 'BP-2 · 4 nm', detail: '8 núcleos y núcleo neuronal de 28 TOPS.', metric: 28 },
      lite: { value: 'BL-3 · 6 nm', detail: '8 núcleos y núcleo neuronal de 12 TOPS.', metric: 12 },
    },
  },
  {
    id: 'ram',
    label: 'Memoria RAM',
    unit: 'GB',
    values: {
      x1: { value: '16 GB', detail: 'LPDDR5X.', metric: 16 },
      pro: { value: '12 GB', detail: 'LPDDR5X.', metric: 12 },
      lite: { value: '8 GB', detail: 'LPDDR4X.', metric: 8 },
    },
  },
  {
    id: 'storage',
    label: 'Almacenamiento',
    unit: 'GB',
    values: {
      x1: { value: '512 GB · 1 TB', detail: 'UFS 4.0.', metric: 1024 },
      pro: { value: '256 GB · 512 GB', detail: 'UFS 4.0.', metric: 512 },
      lite: { value: '128 GB · 256 GB', detail: 'UFS 3.1.', metric: 256 },
    },
  },
  {
    id: 'camera',
    label: 'Cámara',
    values: {
      x1: {
        value: 'Triple · 50 + 50 + 12 MP',
        detail: 'Principal ƒ/1,6, gran angular ƒ/2,2 y teleobjetivo 5× ƒ/3,2. Frontal de 32 MP.',
      },
      pro: { value: 'Doble · 50 + 12 MP', detail: 'Principal ƒ/1,8 y gran angular ƒ/2,2. Frontal de 16 MP.' },
      lite: { value: 'Doble · 48 + 8 MP', detail: 'Principal ƒ/1,9 y gran angular ƒ/2,4. Frontal de 12 MP.' },
    },
  },
  {
    id: 'zoom',
    label: 'Zoom',
    unit: '×',
    values: {
      x1: { value: '5× óptico · 10× híbrido', detail: 'Teleobjetivo de 120 mm equivalentes.', metric: 10 },
      pro: { value: '2× recorte del sensor', detail: 'Recorte de los 50 MP del sensor principal.', metric: 2 },
      lite: { value: '2× digital', detail: 'Ampliación digital del sensor principal.', metric: 2 },
    },
  },
  {
    id: 'battery',
    label: 'Batería',
    unit: 'mAh',
    values: {
      x1: { value: '5200 mAh', detail: 'Celda de silicio-carbono.', metric: 5200 },
      pro: { value: '4800 mAh', detail: 'Celda de silicio-carbono.', metric: 4800 },
      lite: { value: '4500 mAh', detail: 'Celda de ion de litio.', metric: 4500 },
    },
  },
  {
    id: 'charging',
    label: 'Carga',
    unit: 'W',
    values: {
      x1: { value: '65 W · inalámbrica 30 W', detail: '0 a 50 % en unos 15 minutos (estimación conceptual).', metric: 65 },
      pro: { value: '45 W · inalámbrica 15 W', detail: '0 a 50 % en unos 22 minutos (estimación conceptual).', metric: 45 },
      lite: { value: '25 W', detail: 'Sin carga inalámbrica.', metric: 25 },
    },
  },
  {
    id: 'connectivity',
    label: 'Conectividad',
    values: {
      x1: { value: '5G · Wi-Fi 7 · UWB', detail: 'Bluetooth 5.4, NFC y USB-C 3.2.' },
      pro: { value: '5G · Wi-Fi 6E', detail: 'Bluetooth 5.3, NFC y USB-C 3.2.' },
      lite: { value: '5G · Wi-Fi 6', detail: 'Bluetooth 5.3, NFC y USB-C 2.0.' },
    },
  },
  {
    id: 'build',
    label: 'Diseño',
    values: {
      x1: { value: 'Aluminio 7000 · vidrio', detail: '154 × 72 × 8,2 mm · 186 g · IP68.' },
      pro: { value: 'Aluminio 6000 · vidrio', detail: '151 × 71 × 7,9 mm · 172 g · IP68.' },
      lite: { value: 'Aluminio · policarbonato', detail: '147 × 70 × 8,6 mm · 168 g · IP54.' },
    },
  },
  {
    id: 'pulse',
    label: 'Pulse Key',
    values: {
      x1: { value: 'Programable', detail: 'Botón lateral azul para cualquier atajo.' },
      pro: { value: 'Programable', detail: 'Botón lateral azul para cualquier atajo.' },
      lite: { value: 'Programable', detail: 'Botón lateral azul para cualquier atajo.' },
    },
  },
  {
    id: 'os',
    label: 'Sistema',
    values: {
      x1: { value: 'BunemaOS 3', detail: '7 años de actualizaciones (compromiso conceptual).' },
      pro: { value: 'BunemaOS 3', detail: '6 años de actualizaciones (compromiso conceptual).' },
      lite: { value: 'BunemaOS 3', detail: '4 años de actualizaciones (compromiso conceptual).' },
    },
  },
];

export const findModel = (id) => MODELS.find((m) => m.id === id) ?? MODELS[0];

const copFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
/** Precio conceptual en pesos colombianos, p. ej. `$ 4.899.000`. */
export const formatCOP = (value) => copFormat.format(value);
