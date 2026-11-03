/**
 * Ilustraciones vectoriales de cada iPhone (frontal, trasera y lateral).
 *
 * NO son fotografías ni renders oficiales: se generan a partir de la forma
 * general del modelo (proporción, módulo de cámaras, Dynamic Island / notch /
 * botón de inicio) y del tono aproximado del color. Se usan mientras no haya
 * fotografía oficial registrada para el modelo (ver docs/RECURSOS-PENDIENTES.md)
 * y siempre van acompañadas de la etiqueta «Ilustración».
 */
let uid = 0;

export function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount * 255);
  const g = clamp(((n >> 8) & 255) + amount * 255);
  const b = clamp((n & 255) + amount * 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const luminance = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Color del marco según material: titanio/acero/aluminio tiñen distinto. */
export function frameColor(hex, frame) {
  const l = luminance(hex);
  if (frame === 'acero') return l > 0.6 ? shade(hex, -0.08) : shade(hex, 0.12);
  if (frame === 'titanio') return l > 0.6 ? shade(hex, -0.12) : shade(hex, 0.16);
  return l > 0.6 ? shade(hex, -0.1) : shade(hex, 0.1);
}

function lens(id, x, y, r) {
  return `<g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#ring${id})"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.74}" fill="url(#glass${id})"/>
    <circle cx="${x}" cy="${y}" r="${r * 0.32}" fill="#0b1230"/>
    <circle cx="${x - r * 0.28}" cy="${y - r * 0.3}" r="${r * 0.14}" fill="#9fb8ff" opacity=".55"/>
  </g>`;
}
const dot = (x, y, r, fill = '#f4ead8') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity=".9"/>`;
const plate = (id, x, y, w, h, rx) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#plate${id})" stroke="rgba(255,255,255,.18)" stroke-width=".5"/>`;

function cameraModule(layout, id, H) {
  switch (layout) {
    case 'plateau': {
      const h = H * 0.25;
      return `<path d="M1.6 ${h} V14 a12.4 12.4 0 0 1 12.4 -12.4 H86 a12.4 12.4 0 0 1 12.4 12.4 V${h} a4 4 0 0 1 -4 4 H5.6 a4 4 0 0 1 -4 -4Z" fill="url(#plate${id})" stroke="rgba(255,255,255,.16)" stroke-width=".5"/>
        ${lens(id, 17, h * 0.3 + 3, 9.6)}${lens(id, 17, h * 0.78 + 1, 9.6)}${lens(id, 37, h * 0.54 + 2, 9.6)}
        ${dot(56, h * 0.3 + 3, 3.4)}${dot(56, h * 0.78 + 1, 3.4, '#1d2130')}`;
    }
    case 'triple':
      return `${plate(id, 5, 5, 46, 46, 11)}${lens(id, 16.5, 16.5, 9)}${lens(id, 16.5, 39.5, 9)}${lens(id, 38, 28, 9)}${dot(38.5, 11.5, 3)}${dot(38.5, 44.5, 3, '#1d2130')}`;
    case 'air':
      return `${plate(id, 4, 6, 92, 19, 9.5)}${lens(id, 14, 15.5, 6.8)}${dot(27, 15.5, 2.4)}${dot(34, 15.5, 1.2, '#1d2130')}`;
    case 'pill2v':
      return `${plate(id, 5, 5, 26, 47, 13)}${lens(id, 18, 17.5, 9)}${lens(id, 18, 39.5, 9)}${dot(37, 12, 3)}`;
    case 'diag2':
      return `${plate(id, 5, 5, 44, 44, 11)}${lens(id, 16.5, 16.5, 8.6)}${lens(id, 37.5, 37.5, 8.6)}${dot(38, 14, 3)}${dot(16, 39, 1.4, '#1d2130')}`;
    case 'square2v':
      return `${plate(id, 5, 5, 42, 44, 11)}${lens(id, 16, 16.5, 8.2)}${lens(id, 16, 37.5, 8.2)}${dot(36, 16, 3)}${dot(36, 30, 1.4, '#1d2130')}`;
    case 'x2v':
      return `${plate(id, 6, 6, 19, 44, 9.5)}${lens(id, 15.5, 15.5, 7)}${dot(15.5, 28, 2.4)}${lens(id, 15.5, 40.5, 7)}`;
    case 'plus2h':
      return `${plate(id, 6, 6, 42, 17, 8.5)}${lens(id, 14.5, 14.5, 6.6)}${lens(id, 34, 14.5, 6.6)}${dot(55, 14.5, 3)}`;
    case 'fold':
      return `${plate(id, 6, 6, 24, 46, 12)}${lens(id, 18, 18, 8.4)}${lens(id, 18, 40, 8.4)}${dot(36, 13, 3)}`;
    case 'single':
    default:
      return `<circle cx="14" cy="14" r="9.5" fill="url(#plate${id})" stroke="rgba(255,255,255,.18)" stroke-width=".5"/>${lens(id, 14, 14, 7.6)}${dot(29, 12, 2.8)}`;
  }
}

function defs(id, hex, frame) {
  const fc = frameColor(hex, frame);
  return `<defs>
    <linearGradient id="body${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(hex, 0.07)}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${shade(hex, -0.12)}"/>
    </linearGradient>
    <linearGradient id="frame${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${shade(fc, 0.12)}"/><stop offset=".5" stop-color="${fc}"/><stop offset="1" stop-color="${shade(fc, -0.14)}"/>
    </linearGradient>
    <linearGradient id="plate${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(hex, 0.1)}"/><stop offset="1" stop-color="${shade(hex, -0.06)}"/>
    </linearGradient>
    <radialGradient id="ring${id}"><stop offset=".7" stop-color="#2a2d36"/><stop offset=".9" stop-color="${shade(fc, 0.1)}"/><stop offset="1" stop-color="#15171d"/></radialGradient>
    <radialGradient id="glass${id}" cx=".4" cy=".35"><stop offset="0" stop-color="#2b3a66"/><stop offset=".6" stop-color="#0d1124"/><stop offset="1" stop-color="#05060b"/></radialGradient>
    <linearGradient id="sheen${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/>
    </linearGradient>
    <radialGradient id="wall${id}" cx=".3" cy=".25" r="1.1">
      <stop offset="0" stop-color="#2463ff"/><stop offset=".38" stop-color="#14245c"/><stop offset=".7" stop-color="#0a0d1c"/><stop offset="1" stop-color="#050507"/>
    </radialGradient>
  </defs>`;
}

/**
 * @param {object} product  modelo de src/data/iphones.js
 * @param {object} opts     { view: 'front'|'back'|'side', colorId, className }
 * @returns {string} SVG
 */
export function phoneSVG(product, { view = 'back', colorId, className = '' } = {}) {
  const id = `p${++uid}`;
  const color = product.colors.find((c) => c.id === colorId) || product.colors[0] || { hex: '#3a3b40', name: '' };
  const design = product.design || { layout: 'single', front: 'island', frame: 'aluminio', ratio: 0.48 };
  const H = Math.round(100 / design.ratio);
  const rx = design.front === 'home' ? 13 : design.layout === 'fold' ? 11 : 15;
  const label = `Ilustración de ${product.name}${color.name ? ` en ${color.name}` : ''}, vista ${view === 'front' ? 'frontal' : view === 'side' ? 'lateral' : 'trasera'}`;

  if (view === 'side') {
    const depth = Math.max(4, ((product.dimensions?.d || 8) / (product.dimensions?.w || 72)) * 100);
    const w = depth + 8;
    return `<svg class="phone-art ${className}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${label}">${defs(id, color.hex, design.frame)}
      <rect x="4" y="0.5" width="${depth}" height="${H - 1}" rx="${depth / 2}" fill="url(#frame${id})"/>
      <rect x="4" y="0.5" width="${depth}" height="${H - 1}" rx="${depth / 2}" fill="url(#sheen${id})"/>
      <rect x="${3}" y="${H * 0.2}" width="1.4" height="${H * 0.1}" rx=".7" fill="url(#frame${id})"/>
      <rect x="${3}" y="${H * 0.33}" width="1.4" height="${H * 0.1}" rx=".7" fill="url(#frame${id})"/>
      <rect x="${4 + depth}" y="${H * 0.25}" width="1.4" height="${H * 0.14}" rx=".7" fill="url(#frame${id})"/>
    </svg>`;
  }

  const shell = `<rect x=".5" y=".5" width="99" height="${H - 1}" rx="${rx}" fill="url(#frame${id})"/>`;

  if (view === 'front') {
    let screen;
    let extra = '';
    if (design.front === 'home') {
      screen = `<rect x="6" y="${H * 0.14}" width="88" height="${H * 0.72}" fill="url(#wall${id})"/>`;
      extra = `<rect x="38" y="${H * 0.065}" width="24" height="2" rx="1" fill="#30323a"/>
        <circle cx="50" cy="${H * 0.93}" r="7" fill="none" stroke="${luminance(color.hex) > 0.5 ? '#b9bcc4' : '#3a3d47'}" stroke-width="1.2"/>`;
      return `<svg class="phone-art ${className}" viewBox="0 0 100 ${H}" role="img" aria-label="${label}">${defs(id, color.hex, design.frame)}${shell}
        <rect x="2" y="2" width="96" height="${H - 4}" rx="${rx - 1.5}" fill="${luminance(color.hex) > 0.5 ? '#f3f3f1' : '#0c0d10'}"/>${screen}${extra}
        <rect x=".5" y=".5" width="99" height="${H - 1}" rx="${rx}" fill="url(#sheen${id})"/></svg>`;
    }
    screen = `<rect x="4.2" y="4.2" width="91.6" height="${H - 8.4}" rx="${rx - 3.6}" fill="url(#wall${id})"/>`;
    if (design.front === 'island') extra = `<rect x="35" y="7.5" width="30" height="8.4" rx="4.2" fill="#000"/>`;
    if (design.front === 'notch')
      extra = `<path d="M27 4.2 h46 v2 a6 6 0 0 1 -6 6 H33 a6 6 0 0 1 -6 -6Z" fill="#000"/><rect x="43" y="6.2" width="14" height="1.4" rx=".7" fill="#1d1f27"/>`;
    return `<svg class="phone-art ${className}" viewBox="0 0 100 ${H}" role="img" aria-label="${label}">${defs(id, color.hex, design.frame)}${shell}
      <rect x="1.8" y="1.8" width="96.4" height="${H - 3.6}" rx="${rx - 1.3}" fill="#050506"/>${screen}${extra}
      <rect x="1.8" y="1.8" width="96.4" height="${H - 3.6}" rx="${rx - 1.3}" fill="url(#sheen${id})"/></svg>`;
  }

  return `<svg class="phone-art ${className}" viewBox="0 0 100 ${H}" role="img" aria-label="${label}">${defs(id, color.hex, design.frame)}${shell}
    <rect x="1.6" y="1.6" width="96.8" height="${H - 3.2}" rx="${rx - 1.1}" fill="url(#body${id})"/>
    ${cameraModule(design.layout, id, H)}
    <rect x="1.6" y="1.6" width="96.8" height="${H - 3.2}" rx="${rx - 1.1}" fill="url(#sheen${id})"/></svg>`;
}

/**
 * Imagen del producto: la fotografía registrada en el panel si existe;
 * si no, la ilustración con su etiqueta.
 */
export function productVisual(product, { view = 'back', colorId, className = '', eager = false } = {}) {
  const photo = product.images?.[view];
  if (photo) {
    return `<img class="phone-photo ${className}" src="${photo}" alt="${product.name}, vista ${view === 'front' ? 'frontal' : view === 'side' ? 'lateral' : 'trasera'}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />`;
  }
  return phoneSVG(product, { view, colorId, className });
}

export const hasPhoto = (product) => Boolean(product.images?.front || product.images?.back);
