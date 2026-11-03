/**
 * Escena de la demo de cámara: un valle de noche con una torre de
 * comunicaciones, dibujado por código con Canvas 2D.
 *
 * No hay ninguna fotografía: todo son formas vectoriales generadas con una
 * semilla fija (siempre la misma escena). Por ser vectorial, cada nivel de
 * zoom se vuelve a dibujar a su escala y conserva el detalle: a 10× se lee
 * el rótulo de la cabina de la torre, que a 1× mide unos pocos píxeles.
 *
 * Coordenadas "de mundo": 3200 × 2400 unidades, y hacia abajo.
 */

export const WORLD = Object.freeze({ width: 3200, height: 2400 });
/** Punto al que se acerca el zoom: la cabina de la torre. */
export const FOCUS = Object.freeze({ x: 1600, y: 952 });

/** Generador pseudoaleatorio con semilla (mulberry32): la escena es idéntica en cada carga. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Perfil de montaña por desplazamiento del punto medio: devuelve alturas equiespaciadas en todo el ancho. */
function ridge(rand, baseY, amplitude, roughness = 0.55, iterations = 8) {
  let points = [baseY + (rand() - 0.5) * amplitude, baseY + (rand() - 0.5) * amplitude];
  let a = amplitude;
  for (let i = 0; i < iterations; i += 1) {
    const next = [];
    for (let j = 0; j < points.length - 1; j += 1) {
      next.push(points[j], (points[j] + points[j + 1]) / 2 + (rand() - 0.5) * a);
    }
    next.push(points[points.length - 1]);
    points = next;
    a *= roughness;
  }
  return points;
}

const roadY = (x) => 1615 + Math.sin(x / 520) * 30;

export function createCameraScene(seed = 707) {
  const rand = seeded(seed);
  const { width: W, height: H } = WORLD;

  const stars = Array.from({ length: 620 }, () => ({
    x: rand() * W,
    y: rand() * 1250,
    r: 0.5 + rand() ** 3 * 1.4, // en píxeles de pantalla: una estrella siempre es un punto
    a: 0.3 + rand() * 0.7,
  }));

  const clouds = Array.from({ length: 7 }, () => ({
    x: rand() * W,
    y: 420 + rand() * 480,
    rx: 260 + rand() * 360,
    ry: 26 + rand() * 30,
  }));

  const farRidge = ridge(rand, 1250, 230);
  const midRidge = ridge(rand, 1385, 120);
  const frontRidge = ridge(rand, 1760, 140, 0.5);

  // Ciudad del valle: edificios con ventanas encendidas (solo se guardan las encendidas).
  const buildings = [];
  for (let x = -20; x < W + 20; ) {
    const w = 24 + rand() * 46;
    const center = 1 - Math.min(1, Math.abs(x - W / 2) / (W / 2));
    const h = 30 + rand() * (60 + center * 90);
    const windows = [];
    for (let wy = 1560 - h + 8; wy < 1552; wy += 9) {
      for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (rand() < 0.36) windows.push(wx, wy, rand() < 0.78 ? 0 : 1);
      }
    }
    buildings.push({ x, w, top: 1560 - h, windows });
    x += w + 2 + rand() * 6;
  }

  const lamps = Array.from({ length: 44 }, (_, i) => {
    const x = (i + 0.5) * (W / 44);
    return { x, y: roadY(x) - 14 };
  });
  const cars = Array.from({ length: 150 }, () => ({ x: rand() * W, lane: rand() < 0.5 ? -1 : 1, len: 6 + rand() * 10 }));
  const trees = Array.from({ length: 160 }, () => ({ x: rand() * W, h: 26 + rand() * 46 }));

  /** Rellena el área bajo un perfil de montaña. */
  function fillRidge(ctx, points, fill) {
    const step = W / (points.length - 1);
    ctx.beginPath();
    ctx.moveTo(0, H);
    points.forEach((y, i) => ctx.lineTo(i * step, y));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  const ridgeAt = (points, x) => {
    const f = (x / W) * (points.length - 1);
    const i = Math.max(0, Math.min(points.length - 2, Math.floor(f)));
    return points[i] + (points[i + 1] - points[i]) * (f - i);
  };

  function glow(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Torre de comunicaciones sobre la colina central: celosía, cabina con rótulo, antenas y balizas. */
  function drawTower(ctx, px) {
    const cx = FOCUS.x;
    // Grosor mínimo de 1,3 píxeles: en el gran angular la celosía sigue viéndose, como en una foto real.
    const stroke = (w) => Math.max(w, px * 1.3);
    const base = 1240;
    const top = 975;
    ctx.strokeStyle = '#3a4262';
    ctx.lineCap = 'round';
    // Patas y arriostramientos en X.
    const halfAt = (y) => 12 + ((y - top) / (base - top)) * 48;
    ctx.lineWidth = stroke(4);
    ctx.beginPath();
    ctx.moveTo(cx - halfAt(base), base);
    ctx.lineTo(cx - halfAt(top), top);
    ctx.moveTo(cx + halfAt(base), base);
    ctx.lineTo(cx + halfAt(top), top);
    ctx.stroke();
    ctx.lineWidth = stroke(1.6);
    ctx.beginPath();
    for (let y = base; y > top + 1; y -= 33) {
      const y2 = Math.max(top, y - 33);
      ctx.moveTo(cx - halfAt(y), y);
      ctx.lineTo(cx + halfAt(y2), y2);
      ctx.moveTo(cx + halfAt(y), y);
      ctx.lineTo(cx - halfAt(y2), y2);
      ctx.moveTo(cx - halfAt(y2), y2);
      ctx.lineTo(cx + halfAt(y2), y2);
    }
    ctx.stroke();

    // Antenas parabólicas a los lados.
    ctx.fillStyle = '#3a4160';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(cx + side * 30, 1004, 5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mástil con travesaños.
    ctx.strokeStyle = '#424a6c';
    ctx.lineWidth = stroke(5);
    ctx.beginPath();
    ctx.moveTo(cx, 922);
    ctx.lineTo(cx, 706);
    ctx.stroke();
    ctx.lineWidth = stroke(1.2);
    ctx.beginPath();
    for (let y = 900; y > 720; y -= 30) {
      const half = 4 + ((y - 706) / 216) * 10;
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
    }
    ctx.stroke();

    // Cabina: tejado, cuerpo, rótulo y ventanas.
    ctx.fillStyle = '#1b2036';
    ctx.fillRect(cx - 60, 922, 120, 8);
    ctx.fillStyle = '#141829';
    ctx.fillRect(cx - 55, 930, 110, 45);
    ctx.fillStyle = '#0a0c16';
    ctx.fillRect(cx - 28, 936, 56, 14);
    ctx.fillStyle = '#8fb0ff';
    ctx.font = '600 9px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BNM · 07', cx, 943.5);
    ctx.fillStyle = '#2f6bff';
    ctx.fillRect(cx - 28, 950, 56, 1.2);
    [-46, -36, -26, 18, 28, 38].forEach((dx, i) => {
      ctx.fillStyle = i === 2 || i === 4 ? '#3b3420' : '#ffd99a';
      ctx.fillRect(cx + dx, 958, 7, 9);
    });

    // Balizas rojas con halo.
    [
      [cx, 704, 3.2],
      [cx - 55, 924, 2],
      [cx + 55, 924, 2],
      [cx - 40, 1100, 1.8],
      [cx + 40, 1100, 1.8],
    ].forEach(([x, y, r]) => {
      glow(ctx, x, y, r * 7, 'rgba(255,59,78,0.45)');
      ctx.fillStyle = '#ff5466';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(r, px * 1.2), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Dibuja la escena.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ cx: number, cy: number, scale: number, width: number, height: number }} view
   *   centro de la vista (mundo), píxeles de canvas por unidad de mundo y tamaño del canvas.
   */
  function draw(ctx, { cx, cy, scale, width, height }) {
    const px = 1 / scale; // una unidad de mundo por píxel de canvas
    const left = cx - width / 2 / scale;
    const right = cx + width / 2 / scale;
    const topEdge = cy - height / 2 / scale;
    const bottomEdge = cy + height / 2 / scale;
    ctx.setTransform(scale, 0, 0, scale, width / 2 - cx * scale, height / 2 - cy * scale);

    // Cielo.
    const sky = ctx.createLinearGradient(0, 0, 0, 1400);
    sky.addColorStop(0, '#04050c');
    sky.addColorStop(0.55, '#0d1030');
    sky.addColorStop(0.85, '#2a2160');
    sky.addColorStop(1, '#4a2f6e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Estrellas: tamaño constante en pantalla, como una fuente de luz puntual.
    ctx.fillStyle = '#e8ecff';
    stars.forEach((s) => {
      if (s.x < left || s.x > right || s.y < topEdge || s.y > bottomEdge) return;
      const r = s.r * px;
      ctx.globalAlpha = s.a;
      ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    });
    ctx.globalAlpha = 1;

    // Nubes tenues: casi invisibles sin el modo noche.
    ctx.fillStyle = 'rgba(70,58,130,0.16)';
    clouds.forEach((c) => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Luna.
    glow(ctx, 2150, 720, 300, 'rgba(190,200,255,0.16)');
    ctx.fillStyle = '#ece9dd';
    ctx.beginPath();
    ctx.arc(2150, 720, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,160,170,0.35)';
    [
      [-18, -12, 12],
      [16, 8, 9],
      [-4, 22, 7],
      [24, -20, 5],
    ].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(2150 + dx, 720 + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Montañas lejanas con un degradado que solo revela su volumen al subir la exposición.
    const far = ctx.createLinearGradient(0, 1050, 0, 1500);
    far.addColorStop(0, '#232849');
    far.addColorStop(1, '#10132a');
    fillRidge(ctx, farRidge, far);
    // Bruma violeta del horizonte y resplandor cálido de la ciudad.
    const haze = ctx.createLinearGradient(0, 1150, 0, 1600);
    haze.addColorStop(0, 'rgba(139,92,246,0)');
    haze.addColorStop(0.6, 'rgba(139,92,246,0.14)');
    haze.addColorStop(1, 'rgba(255,170,90,0.16)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 1150, W, 450);
    fillRidge(ctx, midRidge, '#0e1127');

    // Colina de la torre.
    ctx.fillStyle = '#0b0d1e';
    ctx.beginPath();
    ctx.moveTo(1020, 1580);
    ctx.quadraticCurveTo(1380, 1250, 1600, 1236);
    ctx.quadraticCurveTo(1820, 1250, 2180, 1580);
    ctx.closePath();
    ctx.fill();
    if (right > 1480 && left < 1720) drawTower(ctx, px);

    // Ciudad.
    const warm = '#ffd08a';
    const cool = '#a9c6ff';
    buildings.forEach((b) => {
      if (b.x + b.w < left || b.x > right) return;
      ctx.fillStyle = '#0a0c1a';
      ctx.fillRect(b.x, b.top, b.w, 1562 - b.top);
      const { windows } = b;
      for (let i = 0; i < windows.length; i += 3) {
        ctx.fillStyle = windows[i + 2] ? cool : warm;
        ctx.fillRect(windows[i], windows[i + 1], 3, 4);
      }
    });

    // Carretera con farolas y estelas de luz de los coches.
    ctx.fillStyle = '#07080f';
    ctx.beginPath();
    ctx.moveTo(0, 1560);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, roadY(x) + 16);
    ctx.lineTo(W, 1560);
    ctx.closePath();
    ctx.fill();
    lamps.forEach((l) => {
      if (l.x < left - 20 || l.x > right + 20) return;
      glow(ctx, l.x, l.y, 16, 'rgba(255,190,110,0.35)');
      ctx.fillStyle = '#ffe2b0';
      ctx.fillRect(l.x - 1.2, l.y - 1.2, 2.4, 2.4);
    });
    cars.forEach((c) => {
      if (c.x < left - 20 || c.x > right + 20) return;
      ctx.fillStyle = c.lane < 0 ? '#fff1d2' : '#ff4a5e';
      ctx.fillRect(c.x, roadY(c.x) + c.lane * 4 - 0.8, c.len, 1.6);
    });

    // Primer plano: lomas y árboles en silueta.
    fillRidge(ctx, frontRidge, '#06070e');
    ctx.fillStyle = '#0b0d18';
    trees.forEach((t) => {
      if (t.x < left - 30 || t.x > right + 30) return;
      const y = ridgeAt(frontRidge, t.x) + 6;
      ctx.beginPath();
      ctx.moveTo(t.x, y - t.h);
      ctx.lineTo(t.x + t.h * 0.28, y);
      ctx.lineTo(t.x - t.h * 0.28, y);
      ctx.closePath();
      ctx.fill();
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
