import * as THREE from 'three';

/**
 * Texturas procedurales del Bunema X1.
 *
 * Se dibujan en un <canvas> 2D al iniciar y se convierten en
 * `CanvasTexture`. Ventajas frente a imágenes externas:
 *  - Cero peticiones de red y cero problemas de licencias.
 *  - Pesan solo lo que ocupan en memoria de GPU (no en el bundle).
 *  - Son deterministas: usamos un generador pseudoaleatorio con semilla,
 *    así la placa base se ve igual en cada carga.
 */

const FONT_DISPLAY = '"Space Grotesk", "Inter", system-ui, sans-serif';
const FONT_UI = '"Inter", system-ui, sans-serif';

/** Generador pseudoaleatorio con semilla (mulberry32). */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, anisotropy) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Pantalla de bloqueo: ondas de luz azul-violeta sobre negro profundo. */
function drawDisplay(anisotropy) {
  const W = 540;
  const H = 1208;
  const { canvas, ctx } = createCanvas(W, H);

  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, W, H);

  // Halo inferior: la luz parece nacer desde dentro de la pantalla.
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.78, 10, W * 0.5, H * 0.78, H * 0.6);
  glow.addColorStop(0, 'rgba(47,107,255,0.55)');
  glow.addColorStop(0.45, 'rgba(139,92,246,0.18)');
  glow.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Familia de curvas: cada línea es una sinusoide con fase distinta.
  for (let i = 0; i < 26; i += 1) {
    const t = i / 25;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 6) {
      const y = H * 0.62 + Math.sin(x * 0.0105 + t * 3.1) * (60 + t * 90) + t * 210 - 80;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const r = Math.round(47 + (139 - 47) * t);
    const g = Math.round(107 + (92 - 107) * t);
    ctx.strokeStyle = `rgba(${r},${g},255,${0.16 + (1 - Math.abs(t - 0.5) * 2) * 0.5})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // Cámara frontal perforada.
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(W / 2, 40, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5f7ff';
  ctx.textAlign = 'center';
  ctx.font = `500 22px ${FONT_UI}`;
  ctx.fillText('MIÉ · 21 OCT', W / 2, 180);
  ctx.font = `500 150px ${FONT_DISPLAY}`;
  ctx.fillText('20:26', W / 2, 330);

  ctx.font = `500 18px ${FONT_UI}`;
  ctx.fillStyle = 'rgba(245,247,255,0.6)';
  ctx.fillText('TECNOLOGÍA QUE SE SIENTE', W / 2, H - 96);
  ctx.fillStyle = 'rgba(245,247,255,0.85)';
  ctx.fillRect(W / 2 - 70, H - 46, 140, 5);

  return toTexture(canvas, anisotropy);
}

/** Placa base: sustrato azul marino con pistas de cobre ortogonales. */
function drawCircuit(anisotropy) {
  const S = 512;
  const { canvas, ctx } = createCanvas(S, S);
  const rand = seededRandom(2026);

  ctx.fillStyle = '#0a1222';
  ctx.fillRect(0, 0, S, S);

  ctx.lineCap = 'square';
  for (let i = 0; i < 90; i += 1) {
    let x = Math.round(rand() * 32) * 16;
    let y = Math.round(rand() * 32) * 16;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Cada pista avanza en tramos horizontales/verticales con giros a 45°.
    for (let s = 0; s < 4; s += 1) {
      const len = 16 + Math.round(rand() * 6) * 16;
      const dir = Math.floor(rand() * 4);
      if (dir === 0) x += len;
      if (dir === 1) x -= len;
      if (dir === 2) y += len;
      if (dir === 3) {
        x += len * 0.5;
        y += len * 0.5;
      }
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rand() > 0.82 ? 'rgba(47,107,255,0.75)' : 'rgba(196,150,92,0.55)';
    ctx.lineWidth = rand() > 0.7 ? 3 : 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(214,176,112,0.85)';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  // Serigrafía con identificadores técnicos.
  ctx.fillStyle = 'rgba(245,247,255,0.55)';
  ctx.font = `600 14px ${FONT_UI}`;
  ctx.fillText('BNM-MB-X1 · REV 04', 20, S - 24);
  ctx.fillText('MADE FOR HUMANS', S - 180, 30);

  return toTexture(canvas, anisotropy);
}

/** Etiqueta impresa sobre la batería. */
function drawBatteryLabel(anisotropy) {
  const W = 512;
  const H = 1024;
  const { canvas, ctx } = createCanvas(W, H);

  ctx.fillStyle = '#1b1e26';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#2f6bff';
  ctx.fillRect(0, 0, 14, H);

  ctx.save();
  ctx.translate(W * 0.56, H * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f7ff';
  ctx.font = `600 64px ${FONT_DISPLAY}`;
  ctx.fillText('BUNEMA CELL', 0, -20);
  ctx.fillStyle = '#9298aa';
  ctx.font = `500 30px ${FONT_UI}`;
  ctx.fillText('5200 mAh · 3.88 V · Li-Po', 0, 40);
  ctx.font = `500 20px ${FONT_UI}`;
  ctx.fillText('BNM-BT52 · CONCEPTO · NO COMERCIAL', 0, 90);
  ctx.restore();

  ctx.strokeStyle = 'rgba(146,152,170,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  return toTexture(canvas, anisotropy);
}

/** Serigrafía del procesador BX-1. */
function drawChipLabel(anisotropy) {
  const S = 256;
  const { canvas, ctx } = createCanvas(S, S);

  ctx.fillStyle = '#8d939f';
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = '#20232b';
  ctx.textAlign = 'center';
  ctx.font = `700 76px ${FONT_DISPLAY}`;
  ctx.fillText('BX-1', S / 2, 128);
  ctx.font = `600 18px ${FONT_UI}`;
  ctx.fillText('NEURAL CORE · 3 nm', S / 2, 168);
  ctx.fillText('BUNEMA', S / 2, 200);

  // Marca de orientación del chip (pin 1).
  ctx.beginPath();
  ctx.arc(28, 28, 8, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(canvas, anisotropy);
}

/** Logotipo grabado en la carcasa trasera (fondo transparente). */
function drawBackLogo(anisotropy) {
  const W = 512;
  const H = 128;
  const { canvas, ctx } = createCanvas(W, H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 52px ${FONT_DISPLAY}`;
  // Tracking amplio dibujando letra a letra (canvas no tiene letter-spacing fiable en todos los navegadores).
  const word = 'BUNEMA';
  const spacing = 64;
  const start = W / 2 - ((word.length - 1) * spacing) / 2;
  [...word].forEach((ch, i) => ctx.fillText(ch, start + i * spacing, H / 2));
  return toTexture(canvas, anisotropy);
}

export function createPhoneTextures({ anisotropy = 4 } = {}) {
  return {
    display: drawDisplay(anisotropy),
    circuit: drawCircuit(anisotropy),
    batteryLabel: drawBatteryLabel(anisotropy),
    chipLabel: drawChipLabel(anisotropy),
    backLogo: drawBackLogo(anisotropy),
  };
}
