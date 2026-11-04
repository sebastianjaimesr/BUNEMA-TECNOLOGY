import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { shade, frameColor, luminance } from '../components/phoneArt.js';

/**
 * Modelo 3D paramétrico de un iPhone, generado por código.
 *
 * Se construye con las DIMENSIONES OFICIALES del modelo (alto, ancho, grosor
 * en mm; 1 unidad = 10 mm) y la forma general de su módulo de cámaras. Es un
 * modelo ilustrativo: no reproduce cada detalle del producto real ni es un
 * render oficial. Si en el panel se registra un archivo .glb para el modelo
 * (campo `model3d`), el visor carga ese archivo en su lugar.
 *
 * Detalle: lentes por capas (bisel metálico, cilindro interior, óptica con
 * anillos y tratamiento antirreflejo, vidrio de zafiro con reflejos), flash,
 * LiDAR y micrófono, botones redondeados, bandas de antena, puerto USB‑C,
 * rejillas de altavoz y un fondo de pantalla teñido con el color del acabado.
 */
const MM = 0.1;

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  // Esquinas de curvatura continua (aproximación «squircle» con Bézier cúbicas).
  const k = r * 0.62;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.bezierCurveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.bezierCurveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.bezierCurveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
  s.lineTo(x, y + r);
  s.bezierCurveTo(x, y + r - k, x + r - k, y, x + r, y);
  return s;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Fondo de pantalla abstracto teñido con el color del acabado (diseño propio
 * de BUNEMA, no es un fondo de Apple): cintas de luz curvas sobre un fondo
 * oscuro del mismo tono, como en una foto de producto.
 */
function hexRGB(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(rgb, to, t) {
  return rgb.map((v, i) => Math.round(v + (to[i] - v) * t));
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function drawWallpaper(g, w, h, hex) {
  let base = hexRGB(hex);
  // Acabados casi blancos o casi negros: se usa el azul de BUNEMA para que la pantalla tenga vida.
  const lum = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) / 255;
  const sat = Math.max(...base) - Math.min(...base);
  if (sat < 22) base = lum > 0.5 ? [70, 120, 255] : [36, 80, 210];
  const deep = mix(base, [0, 0, 0], 0.82);
  const mid = mix(base, [0, 0, 0], 0.45);
  const glow = mix(base, [255, 255, 255], 0.55);
  g.fillStyle = rgba(deep, 1);
  g.fillRect(0, 0, w, h);
  const vg = g.createLinearGradient(0, 0, w, h);
  vg.addColorStop(0, rgba(mid, 0.55));
  vg.addColorStop(0.5, rgba(deep, 0));
  vg.addColorStop(1, rgba(mid, 0.45));
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // Cintas de luz: franjas redondeadas alternadas, con el borde curvo iluminado.
  const bands = 7;
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * bh + bh * 0.06;
    const hh = bh * 0.88;
    const r = hh / 2;
    const left = i % 2 === 0;
    const x0 = left ? -w * 0.4 : w * 0.3;
    const x1 = left ? w * 0.7 : w * 1.4;
    const grad = g.createLinearGradient(0, y, 0, y + hh);
    grad.addColorStop(0, rgba(mid, 0.95));
    grad.addColorStop(0.55, rgba(mix(mid, deep, 0.5), 0.9));
    grad.addColorStop(1, rgba(deep, 0.6));
    g.save();
    g.beginPath();
    g.roundRect(x0, y, x1 - x0, hh, r);
    g.fillStyle = grad;
    g.shadowColor = rgba([0, 0, 0], 0.6);
    g.shadowBlur = 30;
    g.shadowOffsetY = 12;
    g.fill();
    g.restore();
    // Borde iluminado
    g.save();
    g.shadowColor = rgba(glow, 0.95);
    g.shadowBlur = 22;
    g.strokeStyle = rgba(glow, 0.85);
    g.lineWidth = 2.5;
    g.beginPath();
    if (left) {
      g.moveTo(x1 - r - w * 0.25, y);
      g.lineTo(x1 - r, y);
      g.arc(x1 - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    } else {
      g.moveTo(x0 + r + w * 0.25, y);
      g.lineTo(x0 + r, y);
      g.arc(x0 + r, y + r, r, -Math.PI / 2, -Math.PI * 1.5, true);
    }
    g.stroke();
    g.restore();
  }
}

function wallpaperTexture(hex = '#2463ff') {
  const t = canvasTexture(512, 1024, (g, w, h) => drawWallpaper(g, w, h, hex));
  t.redraw = (c) => {
    drawWallpaper(t.image.getContext('2d'), t.image.width, t.image.height, c);
    t.needsUpdate = true;
  };
  return t;
}

/** Óptica interior del lente: anillos concéntricos y tratamiento antirreflejo. */
function lensTexture() {
  return canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    const r = w / 2;
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, w);
    const grad = g.createRadialGradient(c, c, 0, c, c, r);
    grad.addColorStop(0, '#08090d');
    grad.addColorStop(0.32, '#1b1e2a');
    grad.addColorStop(0.55, '#06070f');
    grad.addColorStop(0.8, '#0d0e13');
    grad.addColorStop(1, '#020203');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
    const ring = (rr, color, lw) => {
      g.strokeStyle = color;
      g.lineWidth = lw;
      g.beginPath();
      g.arc(c, c, rr * r, 0, Math.PI * 2);
      g.stroke();
    };
    ring(0.97, 'rgba(70,72,80,.9)', 3);
    ring(0.86, 'rgba(110,114,125,.35)', 1.5);
    ring(0.74, 'rgba(40,42,50,.9)', 5);
    ring(0.62, 'rgba(120,130,160,.22)', 1.2);
    ring(0.47, 'rgba(20,22,30,.9)', 4);
    // Tratamiento antirreflejo: arcos violeta y verde.
    const arc = (rr, a0, a1, color, lw) => {
      g.strokeStyle = color;
      g.lineWidth = lw;
      g.beginPath();
      g.arc(c, c, rr * r, a0, a1);
      g.stroke();
    };
    arc(0.55, Math.PI * 1.05, Math.PI * 1.45, 'rgba(130,110,220,.28)', 8);
    arc(0.38, Math.PI * 0.1, Math.PI * 0.45, 'rgba(90,220,190,.16)', 6);
    arc(0.8, Math.PI * 1.15, Math.PI * 1.3, 'rgba(120,160,255,.35)', 4);
    // Pupila
    const p = g.createRadialGradient(c, c, 0, c, c, r * 0.2);
    p.addColorStop(0, '#000');
    p.addColorStop(0.7, '#03040a');
    p.addColorStop(1, 'rgba(10,14,34,0)');
    g.fillStyle = p;
    g.beginPath();
    g.arc(c, c, r * 0.2, 0, Math.PI * 2);
    g.fill();
  });
}

function flashTexture() {
  return canvasTexture(128, 128, (g, w) => {
    const c = w / 2;
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, '#fbf3df');
    grad.addColorStop(0.75, '#e8dcc0');
    grad.addColorStop(1, '#b9ad93');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(150,135,105,.35)';
    g.lineWidth = 1;
    for (let i = 8; i < w; i += 9) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, w);
      g.moveTo(0, i);
      g.lineTo(w, i);
      g.stroke();
    }
  });
}

/**
 * Curva levemente las normales de las caras planas (efecto «almohada»): así
 * los reflejos del estudio forman un degradado suave en lugar de un color
 * uniforme, como en una fotografía de producto. La geometría no cambia.
 */
function pillow(geo, w, h, k = 0.32) {
  const n = geo.attributes.normal;
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    const nz = n.getZ(i);
    if (Math.abs(nz) < 0.98) continue;
    v.set((p.getX(i) / (w / 2)) * k, (p.getY(i) / (h / 2)) * k, nz).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
  return geo;
}

/** Perfil de revolución: puntos [radio, altura] alrededor del eje Z (hacia fuera). */
function lathe(points, segments = 64) {
  const geo = new THREE.LatheGeometry(
    points.map(([r, h]) => new THREE.Vector2(r, h)),
    segments,
  );
  geo.rotateX(Math.PI / 2);
  return geo;
}

export class PhoneModel {
  constructor(product, colorId) {
    this.product = product;
    this.group = new THREE.Group();
    this.group.name = product.id;
    this.disposables = [];
    this.build();
    this.setColor(colorId || product.colors[0]?.id, { immediate: true });
  }

  track(obj) {
    this.disposables.push(obj);
    return obj;
  }

  build() {
    const p = this.product;
    const dims = p.dimensions || { h: 147, w: 71, d: 7.8 };
    // El Duo se muestra cerrado (medidas cerradas).
    const W = dims.w * MM;
    const H = dims.h * MM;
    const D = dims.d * MM;
    this.size = { W, H, D };
    const design = p.design || { layout: 'single', front: 'island', frame: 'aluminio' };
    this.unibody = design.layout === 'plateau';
    const R = design.front === 'home' ? W * 0.13 : W * 0.17;
    this.R = R;
    const frame = design.frame || 'aluminio';
    const rough = { aluminio: 0.46, acero: 0.16, titanio: 0.38 }[frame] ?? 0.42;
    this.frameKind = frame;

    // Materiales
    const m = (o) => this.track(new THREE.MeshPhysicalMaterial(o));
    // Metal satinado: el color del acabado domina, con reflejos suaves.
    this.frameMat = m({ metalness: frame === 'acero' ? 1 : 0.85, roughness: rough, envMapIntensity: 1.1 });
    // Unibody: la placa de cámaras es del mismo aluminio, un poco más pulida en el borde.
    this.backMat = m(
      this.unibody
        ? { metalness: 0.05, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.55, envMapIntensity: 0.8 }
        : { metalness: 0.05, roughness: 0.58, clearcoat: 0.35, clearcoatRoughness: 0.5, envMapIntensity: 0.85 },
    );
    this.plateMat = this.unibody
      ? m({ metalness: 0.85, roughness: rough * 0.92, envMapIntensity: 1.15 })
      : m({ metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
    this.ringMat = m({ metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2, side: THREE.DoubleSide });
    this.btnMat = m({ metalness: 0.85, roughness: rough * 0.85, envMapIntensity: 1.15 });
    // Frente: negro, o blanco en los modelos con botón de inicio y acabado claro.
    this.frontMat = m({ color: '#030305', metalness: 0, roughness: 0.08, clearcoat: 0.5, clearcoatRoughness: 0.05, envMapIntensity: 0.25 });
    this.mats = {
      glassBlack: m({ color: '#030305', metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 }),
      // Reflejos aditivos: solo suma el brillo especular (vidrio transparente barato).
      reflect: m({
        color: '#000',
        metalness: 0,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.4,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      island: m({ color: '#020203', metalness: 0, roughness: 0.1, envMapIntensity: 0.15 }),
      barrel: m({ color: '#060608', metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide }),
      dark: m({ color: '#0b0b0e', metalness: 0.3, roughness: 0.6 }),
      antenna: m({ color: '#3a3b40', metalness: 0, roughness: 0.55 }),
      sapphire: m({ color: '#121318', metalness: 0.2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }),
    };
    this.lensTex = this.track(lensTexture());
    this.mats.lens = m({ map: this.lensTex, metalness: 0.1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.3, iridescenceIOR: 1.6 });
    this.flashTex = this.track(flashTexture());
    this.mats.flash = m({ map: this.flashTex, roughness: 0.55, emissive: '#2a2416', emissiveIntensity: 0.4 });
    this.screenTex = this.track(wallpaperTexture());
    const screenMat = this.track(new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));

    // Cuerpo: forma redondeada extruida con bisel (en el unibody también es la parte trasera).
    const bevel = Math.min(D * (this.unibody ? 0.33 : 0.38), 0.32);
    const bodyGeo = this.track(
      new THREE.ExtrudeGeometry(roundedRectShape(W - bevel * 2, H - bevel * 2, R - bevel), {
        depth: D - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 10,
        curveSegments: 40,
      }),
    );
    bodyGeo.translate(0, 0, -(D - bevel * 2) / 2);
    bodyGeo.computeVertexNormals();
    pillow(bodyGeo, W, H);
    this.group.add(new THREE.Mesh(bodyGeo, this.frameMat));

    const faceGeo = this.track(pillow(new THREE.ShapeGeometry(roundedRectShape(W - 0.12, H - 0.12, R - 0.06), 40), W, H));
    if (!this.unibody) {
      const back = new THREE.Mesh(faceGeo, this.backMat);
      back.position.z = -D / 2 - 0.004;
      back.rotation.y = Math.PI;
      this.group.add(back);
    }

    // Frente: vidrio negro y pantalla.
    const front = new THREE.Mesh(faceGeo, this.frontMat);
    front.position.z = D / 2 + 0.004;
    this.group.add(front);

    const homeLayout = design.front === 'home';
    const sw = W - (homeLayout ? 0.5 : 0.3);
    const sh = homeLayout ? H * 0.72 : H - 0.3;
    const screenGeo = this.track(new THREE.ShapeGeometry(roundedRectShape(sw, sh, homeLayout ? 0.02 : R - 0.17), 40));
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = D / 2 + 0.014;
    this.group.add(screen);
    const uv = screenGeo.attributes.uv;
    const pos = screenGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);


    if (design.front === 'island') {
      const island = new THREE.Mesh(this.track(new THREE.ShapeGeometry(roundedRectShape(W * 0.3, W * 0.085, W * 0.0425), 16)), this.mats.island);
      island.position.set(0, H / 2 - W * 0.12, D / 2 + 0.022);
      this.group.add(island);
    } else if (design.front === 'notch') {
      const notch = new THREE.Mesh(this.track(new THREE.ShapeGeometry(roundedRectShape(W * 0.46, W * 0.12, W * 0.05), 16)), this.mats.island);
      notch.position.set(0, H / 2 - 0.18 - W * 0.04, D / 2 + 0.022);
      this.group.add(notch);
    } else if (homeLayout) {
      const ring = new THREE.Mesh(this.track(new THREE.RingGeometry(W * 0.06, W * 0.068, 48)), this.ringMat);
      ring.position.set(0, -H / 2 + H * 0.07, D / 2 + 0.022);
      this.group.add(ring);
    }

    this.buildSides(W, H, D, design);
    this.buildCameras(design.layout, W, H, D);
  }

  /** Botones, bandas de antena, puerto USB‑C / Lightning y rejillas de altavoz. */
  buildSides(W, H, D, design) {
    const t = Math.min(0.32, D * 0.36);
    const addBtn = (side, y, len, mat = this.btnMat) => {
      const geo = this.track(new RoundedBoxGeometry(0.1, len, t, 3, 0.045));
      const b = new THREE.Mesh(geo, mat);
      b.position.set(side * (W / 2 + 0.005), y, 0);
      this.group.add(b);
    };
    addBtn(-1, H * 0.22, 0.42);
    addBtn(-1, H * 0.11, 0.85);
    addBtn(-1, H * 0.0, 0.85);
    addBtn(1, H * 0.12, 1.15);
    if (this.product.features?.includes('Control de la Cámara')) addBtn(1, -H * 0.13, 0.9, this.mats.sapphire);

    // Bandas de antena: cortes finos en el marco.
    const bandGeo = this.track(new THREE.BoxGeometry(0.03, 0.07, D * 0.42));
    [-1, 1].forEach((side) =>
      [H / 2 - this.R * 1.25, -H / 2 + this.R * 1.25].forEach((y) => {
        const band = new THREE.Mesh(bandGeo, this.mats.antenna);
        band.position.set(side * (W / 2 - 0.01), y, 0);
        this.group.add(band);
      }),
    );
    const topBand = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.07, 0.03, D * 0.42)), this.mats.antenna);
    topBand.position.set(W * 0.22, H / 2 - 0.012, 0);
    this.group.add(topBand);

    // Puerto inferior y rejillas.
    const bottom = new THREE.Group();
    bottom.position.y = -H / 2 - 0.002;
    bottom.rotation.x = Math.PI / 2;
    this.group.add(bottom);
    const port = new THREE.Mesh(this.track(new THREE.ShapeGeometry(roundedRectShape(0.9, Math.min(0.32, D * 0.4), 0.16), 12)), this.mats.dark);
    bottom.add(port);
    const hole = this.track(new THREE.CircleGeometry(0.045, 12));
    const n = design.front === 'home' ? 6 : 5;
    [-1, 1].forEach((side) => {
      for (let i = 0; i < n; i++) {
        const h = new THREE.Mesh(hole, this.mats.dark);
        h.position.set(side * (0.85 + i * 0.16), 0, 0);
        bottom.add(h);
      }
    });
  }

  /** Traduce coordenadas de la ilustración (0–100 de ancho, vista trasera) al espacio 3D. */
  svgToWorld(x, y) {
    const { W, H } = this.size;
    return [W / 2 - (x / 100) * W, H / 2 - (y / 100) * W];
  }

  /** Grupo local sobre la parte trasera: su eje +Z apunta hacia fuera del teléfono. */
  backAnchor(x, y, base) {
    const [wx, wy] = this.svgToWorld(x, y);
    const g = new THREE.Group();
    g.position.set(wx, wy, -this.size.D / 2 - base);
    g.rotation.y = Math.PI;
    this.cameraGroup.add(g);
    return g;
  }

  buildCameras(layout, W, H, D) {
    const z0 = -D / 2;
    const s = W / 100;
    const cam = new THREE.Group();
    cam.name = 'camera-module';
    this.cameraGroup = cam;
    this.group.add(cam);

    const plate = (x, y, w, h, rx, depth = 0.05, mat = this.plateMat) => {
      const bv = this.unibody ? 0.07 : 0.025;
      const geo = this.track(
        new THREE.ExtrudeGeometry(roundedRectShape(w * s - bv * 2, h * s - bv * 2, rx * s - bv), {
          depth,
          bevelEnabled: true,
          bevelSize: bv,
          bevelThickness: bv,
          bevelSegments: this.unibody ? 8 : 4,
          curveSegments: 32,
        }),
      );
      geo.computeVertexNormals();
      pillow(geo, w * s, h * s, this.unibody ? 0.3 : 0.15);
      const mesh = new THREE.Mesh(geo, mat);
      const [wx, wy] = this.svgToWorld(x + w / 2, y + h / 2);
      mesh.position.set(wx, wy, z0);
      mesh.rotation.y = Math.PI;
      cam.add(mesh);
      return depth + bv;
    };

    const lens = (x, y, r, base) => {
      const g = this.backAnchor(x, y, base);
      const ro = r * s;
      const ri = ro * 0.8;
      const hgt = 0.11;
      // Bisel metálico con chaflán pulido.
      g.add(
        new THREE.Mesh(
          this.track(lathe([[ro, -0.01], [ro, hgt * 0.6], [ro - 0.015, hgt * 0.85], [ro - 0.04, hgt], [ri + 0.03, hgt], [ri, hgt * 0.92]])),
          this.ringMat,
        ),
      );
      // Anillo negro de base sobre la placa.
      const foot = new THREE.Mesh(this.track(new THREE.RingGeometry(ro, ro * 1.06, 64)), this.mats.dark);
      foot.position.z = 0.003;
      g.add(foot);
      // Cilindro interior negro.
      g.add(new THREE.Mesh(this.track(lathe([[ri, hgt * 0.92], [ri, 0.02]], 48)), this.mats.barrel));
      // Óptica.
      const optic = new THREE.Mesh(this.track(new THREE.CircleGeometry(ri, 48)), this.mats.lens);
      optic.position.z = 0.03;
      g.add(optic);
      // Vidrio de zafiro: casquete esférico con reflejos aditivos.
      const cap = new THREE.SphereGeometry(ri * 3, 48, 4, 0, Math.PI * 2, 0, Math.asin(1 / 3));
      cap.rotateX(Math.PI / 2);
      cap.translate(0, 0, hgt * 0.95 - ri * 3);
      const glass = new THREE.Mesh(this.track(cap), this.mats.reflect);
      glass.renderOrder = 2;
      g.add(glass);
    };

    const flash = (x, y, r, base) => {
      const g = this.backAnchor(x, y, base);
      const rr = r * s;
      g.add(new THREE.Mesh(this.track(lathe([[rr * 1.12, 0], [rr * 1.12, 0.02], [rr, 0.025]], 40)), this.ringMat));
      const f = new THREE.Mesh(this.track(new THREE.CircleGeometry(rr, 40)), this.mats.flash);
      f.position.z = 0.02;
      g.add(f);
    };
    const lidar = (x, y, r, base) => {
      const g = this.backAnchor(x, y, base);
      const rr = r * s;
      g.add(new THREE.Mesh(this.track(lathe([[rr * 1.12, 0], [rr * 1.12, 0.02], [rr, 0.025]], 40)), this.ringMat));
      const d = new THREE.Mesh(this.track(new THREE.CircleGeometry(rr, 40)), this.mats.glassBlack);
      d.position.z = 0.022;
      g.add(d);
    };
    const mic = (x, y, base) => {
      const g = this.backAnchor(x, y, base);
      const d = new THREE.Mesh(this.track(new THREE.CircleGeometry(0.05, 16)), this.mats.dark);
      d.position.z = 0.004;
      g.add(d);
    };

    const Hs = H / s; // alto en unidades de la ilustración
    let b;
    switch (layout) {
      case 'plateau': {
        // Meseta de aluminio a todo el ancho + panel de Ceramic Shield abajo.
        const ph = Hs * 0.25 + 4;
        b = plate(1, 1, 98, ph, 15.5, 0.06);
        const cy = 1 + ph / 2;
        lens(17.5, cy - 11.4, 9.4, b);
        lens(17.5, cy + 11.4, 9.4, b);
        lens(37.5, cy, 9.4, b);
        flash(57, cy - 10, 3.6, b);
        lidar(57, cy + 10, 3.6, b);
        mic(57, cy, b);
        const top = 1 + ph + 4.5;
        const bottom = Hs - 4.5;
        const insert = new THREE.Mesh(
          this.track(pillow(new THREE.ShapeGeometry(roundedRectShape(91 * s, (bottom - top) * s, 9 * s), 32), 91 * s, (bottom - top) * s, 0.3)),
          this.backMat,
        );
        const [ix, iy] = this.svgToWorld(50, (top + bottom) / 2);
        insert.position.set(ix, iy, z0 - 0.004);
        insert.rotation.y = Math.PI;
        cam.add(insert);
        break;
      }
      case 'triple':
        b = plate(5, 5, 46, 46, 11);
        lens(16.5, 16.5, 9, b);
        lens(16.5, 39.5, 9, b);
        lens(38, 28, 9, b);
        flash(38.5, 11.5, 3, b);
        lidar(38.5, 44.5, 3, b);
        break;
      case 'air':
        b = plate(4, 6, 92, 19, 9.5, 0.06);
        lens(14, 15.5, 6.8, b);
        flash(27, 15.5, 2.4, b);
        break;
      case 'pill2v':
        b = plate(5, 5, 26, 47, 13);
        lens(18, 17.5, 9, b);
        lens(18, 39.5, 9, b);
        flash(37, 12, 3, 0);
        break;
      case 'diag2':
        b = plate(5, 5, 44, 44, 11);
        lens(16.5, 16.5, 8.6, b);
        lens(37.5, 37.5, 8.6, b);
        flash(38, 14, 3, b);
        break;
      case 'square2v':
        b = plate(5, 5, 42, 44, 11);
        lens(16, 16.5, 8.2, b);
        lens(16, 37.5, 8.2, b);
        flash(36, 16, 3, b);
        break;
      case 'x2v':
        b = plate(6, 6, 19, 44, 9.5);
        lens(15.5, 15.5, 7, b);
        lens(15.5, 40.5, 7, b);
        flash(15.5, 28, 2.4, b);
        break;
      case 'plus2h':
        b = plate(6, 6, 42, 17, 8.5);
        lens(14.5, 14.5, 6.6, b);
        lens(34, 14.5, 6.6, b);
        flash(55, 14.5, 3, 0);
        break;
      case 'fold':
        b = plate(6, 6, 24, 46, 12);
        lens(18, 18, 8.4, b);
        lens(18, 40, 8.4, b);
        flash(36, 13, 3, 0);
        break;
      default:
        b = plate(4.5, 4.5, 19, 19, 9.5, 0.04);
        lens(14, 14, 7.6, b);
        flash(29, 12, 2.8, 0);
    }
  }

  /** Cambia el color de carcasa, marco y placa. Con `immediate: false` interpola en ~0,6 s. */
  setColor(colorId, { immediate = false, gsap } = {}) {
    const color = this.product.colors.find((c) => c.id === colorId) || this.product.colors[0] || { hex: '#3a3b40' };
    this.colorId = color.id;
    const hex = color.hex;
    const light = luminance(hex) > 0.5;
    // En el unibody el aluminio tiene el color del acabado; en los demás, el marco se calcula aparte.
    const frame = this.unibody ? shade(hex, light ? -0.04 : 0.04) : frameColor(hex, this.product.design?.frame);
    const targets = [
      [this.backMat.color, this.unibody ? shade(hex, light ? -0.02 : 0.02) : hex],
      [this.frameMat.color, frame],
      [this.btnMat.color, shade(frame, light ? -0.03 : 0.05)],
      [this.plateMat.color, this.unibody ? frame : shade(hex, light ? -0.03 : -0.01)],
      // Los biseles de las cámaras llevan el color del acabado, como en el equipo real.
      [this.ringMat.color, shade(frame, light ? -0.05 : 0.03)],
      [this.frontMat.color, this.product.design?.front === 'home' && light ? '#ecebe8' : '#030305'],
    ];
    this.screenTex.redraw?.(hex);
    targets.forEach(([target, value]) => {
      const to = new THREE.Color(value);
      if (immediate || !gsap) target.copy(to);
      else gsap.to(target, { r: to.r, g: to.g, b: to.b, duration: 0.6, ease: 'power2.out', onUpdate: this.onChange });
    });
    this.onChange?.();
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose?.());
    this.group.removeFromParent();
  }
}
