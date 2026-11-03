import * as THREE from 'three';
import { shade, frameColor, luminance } from '../components/phoneArt.js';

/**
 * Modelo 3D paramétrico de un iPhone, generado por código.
 *
 * Se construye con las DIMENSIONES OFICIALES del modelo (alto, ancho, grosor
 * en mm; 1 unidad = 10 mm) y la forma general de su módulo de cámaras. Es un
 * modelo ilustrativo: no reproduce cada detalle del producto real ni es un
 * render oficial. Si en el panel se registra un archivo .glb para el modelo
 * (campo `model3d`), el visor carga ese archivo en su lugar.
 */
const MM = 0.1;

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Fondo de pantalla abstracto con los colores de BUNEMA (no es un fondo de Apple). */
function wallpaperTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(70, 120, 10, 128, 256, 420);
  grad.addColorStop(0, '#3d7bff');
  grad.addColorStop(0.3, '#1a2f78');
  grad.addColorStop(0.65, '#0a0e22');
  grad.addColorStop(1, '#030305');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = 'rgba(245,245,247,.92)';
  g.font = '600 64px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('9:41', 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
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
    const R = design.front === 'home' ? W * 0.13 : W * 0.17;
    const metal = design.frame !== 'aluminio';

    // Materiales
    this.frameMat = this.track(
      new THREE.MeshPhysicalMaterial({ metalness: metal ? 1 : 0.85, roughness: metal ? 0.28 : 0.36, clearcoat: metal ? 0.4 : 0.1 }),
    );
    this.backMat = this.track(
      new THREE.MeshPhysicalMaterial({ metalness: 0.1, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.6 }),
    );
    this.plateMat = this.track(
      new THREE.MeshPhysicalMaterial({ metalness: 0.15, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.7 }),
    );
    const glassMat = this.track(
      new THREE.MeshPhysicalMaterial({ color: '#020205', metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.5 }),
    );
    this.screenTex = this.track(wallpaperTexture());
    const screenMat = this.track(
      new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }),
    );
    const lensGlass = this.track(
      new THREE.MeshPhysicalMaterial({ color: '#020308', metalness: 0, roughness: 0.18, clearcoat: 0.5, clearcoatRoughness: 0.1, envMapIntensity: 0.25, iridescence: 0.35, iridescenceIOR: 1.6 }),
    );
    this.ringMat = this.track(new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.25 }));
    const flashMat = this.track(new THREE.MeshStandardMaterial({ color: '#f3e9d2', roughness: 0.4, emissive: '#2a2416' }));

    // Cuerpo (marco): forma redondeada extruida con bisel.
    const bevel = Math.min(D * 0.38, 0.32);
    const bodyGeo = this.track(
      new THREE.ExtrudeGeometry(roundedRectShape(W - bevel * 2, H - bevel * 2, R - bevel), {
        depth: D - bevel * 2,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 5,
        curveSegments: 24,
      }),
    );
    bodyGeo.translate(0, 0, -(D - bevel * 2) / 2);
    const body = new THREE.Mesh(bodyGeo, this.frameMat);
    this.group.add(body);

    // Parte trasera (vidrio de color) y frontal (vidrio negro + pantalla).
    const faceGeo = this.track(new THREE.ShapeGeometry(roundedRectShape(W - 0.1, H - 0.1, R - 0.05), 24));
    const back = new THREE.Mesh(faceGeo, this.backMat);
    back.position.z = -D / 2 - 0.004;
    back.rotation.y = Math.PI;
    this.group.add(back);

    const front = new THREE.Mesh(faceGeo, glassMat);
    front.position.z = D / 2 + 0.004;
    this.group.add(front);

    const homeLayout = design.front === 'home';
    const sw = W - (homeLayout ? 0.5 : 0.36);
    const sh = homeLayout ? H * 0.72 : H - 0.36;
    const screenGeo = this.track(new THREE.ShapeGeometry(roundedRectShape(sw, sh, homeLayout ? 0.02 : R - 0.2), 24));
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = D / 2 + 0.014;
    this.group.add(screen);
    // Coordenadas UV para que el fondo cubra la pantalla.
    const uv = screenGeo.attributes.uv;
    const pos = screenGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sw + 0.5, pos.getY(i) / sh + 0.5);

    if (design.front === 'island') {
      const island = new THREE.Mesh(this.track(new THREE.ShapeGeometry(roundedRectShape(W * 0.3, W * 0.085, W * 0.0425), 12)), glassMat);
      island.position.set(0, H / 2 - W * 0.12, D / 2 + 0.024);
      this.group.add(island);
    } else if (design.front === 'notch') {
      const notch = new THREE.Mesh(this.track(new THREE.ShapeGeometry(roundedRectShape(W * 0.46, W * 0.12, W * 0.05), 12)), glassMat);
      notch.position.set(0, H / 2 - 0.18 - W * 0.04, D / 2 + 0.024);
      this.group.add(notch);
    } else if (homeLayout) {
      const ring = new THREE.Mesh(this.track(new THREE.RingGeometry(W * 0.06, W * 0.07, 40)), this.ringMat);
      ring.position.set(0, -H / 2 + H * 0.07, D / 2 + 0.024);
      this.group.add(ring);
    }

    // Botones laterales.
    const btnGeo = this.track(new THREE.BoxGeometry(0.06, 1, 0.3 * Math.min(1, D / 0.8)));
    const addBtn = (side, y, len) => {
      const b = new THREE.Mesh(btnGeo, this.frameMat);
      b.scale.y = len;
      b.position.set(side * (W / 2 + 0.02), y, 0);
      this.group.add(b);
    };
    addBtn(-1, H * 0.22, 0.32);
    addBtn(-1, H * 0.1, 0.62);
    addBtn(-1, H * 0.0, 0.62);
    addBtn(1, H * 0.12, 0.9);

    this.buildCameras(design.layout, W, H, D, { lensGlass, flashMat, R });
  }

  /** Traduce coordenadas de la ilustración (0–100 de ancho, vista trasera) al espacio 3D. */
  svgToWorld(x, y) {
    const { W, H } = this.size;
    return [W / 2 - (x / 100) * W, H / 2 - (y / 100) * W];
  }

  buildCameras(layout, W, H, D, { lensGlass, flashMat, R }) {
    const z0 = -D / 2 - 0.004;
    const s = W / 100;
    const cam = new THREE.Group();
    cam.name = 'camera-module';
    this.cameraGroup = cam;
    this.group.add(cam);

    const plate = (x, y, w, h, rx, depth = 0.05) => {
      const geo = this.track(
        new THREE.ExtrudeGeometry(roundedRectShape(w * s, h * s, rx * s), { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 20 }),
      );
      const m = new THREE.Mesh(geo, this.plateMat);
      const [wx, wy] = this.svgToWorld(x + w / 2, y + h / 2);
      m.position.set(wx, wy, z0);
      m.rotation.y = Math.PI;
      cam.add(m);
      return depth + 0.02;
    };
    const lens = (x, y, r, base) => {
      const [wx, wy] = this.svgToWorld(x, y);
      const rr = r * s;
      const ring = new THREE.Mesh(this.track(new THREE.CylinderGeometry(rr, rr, 0.09, 40)), this.ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(wx, wy, z0 - base - 0.045);
      const glass = new THREE.Mesh(this.track(new THREE.CircleGeometry(rr * 0.78, 40)), lensGlass);
      glass.position.set(wx, wy, z0 - base - 0.092);
      glass.rotation.y = Math.PI;
      cam.add(ring, glass);
    };
    const flash = (x, y, r, base) => {
      const [wx, wy] = this.svgToWorld(x, y);
      const f = new THREE.Mesh(this.track(new THREE.CircleGeometry(r * s, 24)), flashMat);
      f.position.set(wx, wy, z0 - base - 0.003);
      f.rotation.y = Math.PI;
      cam.add(f);
    };

    const Hs = H / s; // alto en unidades de la ilustración
    let b;
    switch (layout) {
      case 'plateau': {
        const h = Hs * 0.25;
        b = plate(1.2, 1.2, 97.6, h + 3, 14, 0.08);
        lens(17, h * 0.3 + 3, 9.6, b);
        lens(17, h * 0.78 + 1, 9.6, b);
        lens(37, h * 0.54 + 2, 9.6, b);
        flash(56, h * 0.3 + 3, 3.4, b);
        flash(56, h * 0.78 + 1, 3.4, b);
        break;
      }
      case 'triple':
        b = plate(5, 5, 46, 46, 11);
        lens(16.5, 16.5, 9, b);
        lens(16.5, 39.5, 9, b);
        lens(38, 28, 9, b);
        flash(38.5, 11.5, 3, b);
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
    // La ilustración se describe desde la esquina superior izquierda; `plate` centra la placa.
    void R;
  }

  /** Cambia el color de carcasa, marco y placa. Con `immediate: false` interpola en ~0,6 s. */
  setColor(colorId, { immediate = false, gsap } = {}) {
    const color = this.product.colors.find((c) => c.id === colorId) || this.product.colors[0] || { hex: '#3a3b40' };
    this.colorId = color.id;
    const frame = frameColor(color.hex, this.product.design?.frame);
    const targets = [
      [this.backMat.color, color.hex],
      [this.frameMat.color, frame],
      [this.plateMat.color, shade(color.hex, luminance(color.hex) > 0.5 ? -0.03 : -0.01)],
      [this.ringMat.color, shade(frame, -0.05)],
    ];
    targets.forEach(([target, hex]) => {
      const to = new THREE.Color(hex);
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
