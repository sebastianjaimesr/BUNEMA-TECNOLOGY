/**
 * Innovaciones destacadas por generación (galería tecnológica e inicio).
 * Cada punto resume una característica anunciada por Apple para esa
 * generación; el detalle técnico está en las fichas (src/data/iphones.js).
 * `hero` es el modelo cuya ilustración / 3D representa a la generación.
 */
export const GENERATION_STORIES = [
  {
    id: '18',
    title: 'iPhone 18 Pro · iPhone Duo',
    year: 2026,
    hero: 'iphone-18-pro-max',
    accent: '#2463ff',
    headline: 'Apertura variable y el primer iPhone plegable.',
    topics: {
      camaras: 'Cámara principal Fusion de 48 MP con apertura variable de ƒ/1.48 a ƒ/4.0 y zoom de 8x de calidad óptica en los modelos Pro.',
      pantallas: 'iPhone Duo: pantalla interior plegable de 7,6″ y exterior de 5,4″, ambas con ProMotion.',
      procesadores: 'Chip A20 Pro con GPU de 7 núcleos y aceleradores neuronales (iPhone 18 Pro) en toda la gama alta.',
      materiales: 'Unibody de aluminio en los Pro; diseño plegable de titanio en el Duo; Ceramic Shield 2 al frente.',
    },
  },
  {
    id: '17',
    title: 'iPhone 17 · iPhone Air',
    year: 2025,
    hero: 'iphone-air',
    accent: '#d96a2b',
    headline: 'El iPhone más delgado y el Pro de aluminio.',
    topics: {
      diseno: 'iPhone Air mide 5,64 mm de grosor. Los Pro estrenan diseño unibody de aluminio.',
      camaras: 'Tres cámaras Fusion de 48 MP en los Pro y cámara frontal Center Stage de 18 MP en toda la línea.',
      pantallas: 'ProMotion de hasta 120 Hz llega al iPhone 17 estándar.',
      procesadores: 'Chips A19 y A19 Pro.',
    },
  },
  {
    id: '16',
    title: 'iPhone 16',
    year: 2024,
    hero: 'iphone-16-pro',
    accent: '#bfa48f',
    headline: 'Control de la Cámara en toda la familia.',
    topics: {
      camaras: 'Control de la Cámara y ultra gran angular de 48 MP en los Pro.',
      pantallas: 'Pantallas de 6,3″ y 6,9″ en los Pro, las más grandes hasta entonces.',
      procesadores: 'Chips A18 y A18 Pro.',
      diseno: 'Botón de Acción en todos los modelos.',
    },
  },
  {
    id: '15',
    title: 'iPhone 15',
    year: 2023,
    hero: 'iphone-15-pro',
    accent: '#3f4a5a',
    headline: 'Titanio y USB‑C.',
    topics: {
      materiales: 'Primer iPhone con estructura de titanio (15 Pro y 15 Pro Max).',
      conectividad: 'Puerto USB‑C en toda la línea; USB 3 en los Pro.',
      camaras: 'Teleobjetivo 5x en el 15 Pro Max. Cámara de 48 MP en los modelos estándar.',
      diseno: 'Botón de Acción en los Pro y Dynamic Island en todos.',
    },
  },
  {
    id: '14',
    title: 'iPhone 14',
    year: 2022,
    hero: 'iphone-14-pro',
    accent: '#4a3f52',
    headline: 'Dynamic Island y 48 MP.',
    topics: {
      pantallas: 'Dynamic Island y pantalla siempre activa en los Pro.',
      camaras: 'Primera cámara principal de 48 MP en un iPhone.',
      seguridad: 'Detección de choques en toda la línea.',
    },
  },
  {
    id: '13',
    title: 'iPhone 13',
    year: 2021,
    hero: 'iphone-13-pro',
    accent: '#9bb5ce',
    headline: 'ProMotion y modo Cine.',
    topics: {
      pantallas: 'ProMotion de hasta 120 Hz por primera vez en un iPhone (13 Pro).',
      camaras: 'Modo Cine en toda la línea y fotografía macro en los Pro.',
    },
  },
  {
    id: '12',
    title: 'iPhone 12',
    year: 2020,
    hero: 'iphone-12-pro',
    accent: '#2f4452',
    headline: '5G, MagSafe y bordes planos.',
    topics: {
      conectividad: 'Primera generación con 5G.',
      diseno: 'Regresa el diseño de bordes planos y llega MagSafe.',
      materiales: 'Frente de Ceramic Shield.',
    },
  },
  {
    id: '11',
    title: 'iPhone 11',
    year: 2019,
    hero: 'iphone-11-pro',
    accent: '#4e5851',
    headline: 'El primer iPhone Pro y el ultra gran angular.',
    topics: {
      camaras: 'Triple cámara en los Pro, ultra gran angular y modo Noche.',
    },
  },
  {
    id: 'X',
    title: 'iPhone X · XS · XR',
    year: 2017,
    hero: 'iphone-x',
    accent: '#c9cdd5',
    headline: 'Face ID y pantalla de borde a borde.',
    topics: {
      pantallas: 'Primera pantalla OLED Super Retina en un iPhone.',
      seguridad: 'Face ID con cámara TrueDepth sustituye a Touch ID.',
    },
  },
  {
    id: '8',
    title: 'iPhone 8 · 7',
    year: 2016,
    hero: 'iphone-8-plus',
    accent: '#f1dcc2',
    headline: 'Carga inalámbrica y la primera doble cámara.',
    topics: {
      camaras: 'iPhone 7 Plus estrena la doble cámara y el modo Retrato.',
      diseno: 'iPhone 8 vuelve al vidrio trasero para la carga inalámbrica.',
    },
  },
];

export const TOPIC_LABELS = {
  camaras: 'Cámaras',
  pantallas: 'Pantallas',
  procesadores: 'Procesadores',
  materiales: 'Materiales',
  diseno: 'Diseño',
  conectividad: 'Conectividad',
  seguridad: 'Seguridad',
};

/** Hitos históricos anteriores al iPhone 7 (sin ficha técnica en el catálogo). */
export const HISTORY = [
  { year: 2007, name: 'iPhone', note: 'El primer iPhone: pantalla multitáctil de 3,5″.' },
  { year: 2008, name: 'iPhone 3G', note: 'Llegan la red 3G y el App Store.' },
  { year: 2010, name: 'iPhone 4', note: 'Pantalla Retina y cámara frontal FaceTime.' },
  { year: 2011, name: 'iPhone 4s', note: 'Debuta Siri.' },
  { year: 2013, name: 'iPhone 5s', note: 'Touch ID y el primer chip de 64 bits en un teléfono.' },
  { year: 2014, name: 'iPhone 6 y 6 Plus', note: 'Pantallas de 4,7″ y 5,5″ y Apple Pay.' },
  { year: 2015, name: 'iPhone 6s y 6s Plus', note: '3D Touch y Live Photos.' },
  { year: 2016, name: 'iPhone SE', note: 'El formato de 4″ con el chip del 6s.' },
];
