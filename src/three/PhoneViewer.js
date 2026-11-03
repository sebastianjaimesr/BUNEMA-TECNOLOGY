import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { PhoneModel } from './PhoneModel.js';

/**
 * Visor 3D reutilizable (hero, ficha y configurador).
 *
 *  - Un solo renderer por visor, fondo transparente para componer con el CSS.
 *  - Renderizado bajo demanda: solo dibuja mientras algo se mueve
 *    (controles con inercia, rotación automática, transiciones GSAP).
 *  - Se pausa fuera de pantalla y con la pestaña oculta.
 *  - Controles táctiles y de ratón con OrbitControls (girar, acercar).
 *  - Recupera la pérdida de contexto WebGL.
 */
export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

const lowPower = () =>
  window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 768;

export class PhoneViewer {
  constructor(container, { product, colorId, interactive = true, autoRotate = false, distance = 34, fov = 26, onReady } = {}) {
    this.container = container;
    this.interactive = interactive;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'viewer-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(this.canvas);

    const low = lowPower();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !low || devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.75 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tono neutro (Khronos PBR Neutral): conserva los colores reales de los acabados.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene = new THREE.Scene();
    this.buildEnvironment();
    this.buildLights();

    this.camera = new THREE.PerspectiveCamera(fov, 1, 1, 160);
    this.camera.position.set(0, 0, distance);
    this.baseDistance = distance;

    this.stage = new THREE.Group(); // la escena mueve `stage`; el modelo vive dentro
    this.scene.add(this.stage);
    this.buildShadow();

    this.needsRender = true;
    this.running = false;
    this.visible = true;
    this.tick = this.tick.bind(this);

    if (interactive) {
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.minDistance = distance * 0.45;
      this.controls.maxDistance = distance * 1.5;
      this.controls.rotateSpeed = 0.8;
      this.controls.autoRotate = autoRotate && !this.reduced;
      this.controls.autoRotateSpeed = 1.6;
      this.controls.addEventListener('change', () => this.invalidate());
      this.controls.addEventListener('start', () => container.classList.add('is-grabbing'));
      this.controls.addEventListener('end', () => container.classList.remove('is-grabbing'));
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.start();
    });
    this.visibilityObserver.observe(container);
    this.onVisibility = () => document.visibilityState === 'visible' && this.start();
    document.addEventListener('visibilitychange', this.onVisibility);

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      container.classList.add('is-context-lost');
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      container.classList.remove('is-context-lost');
      this.buildEnvironment();
      this.invalidate();
    });

    if (product) this.setProduct(product, colorId);
    this.resize();
    this.start();
    onReady?.(this);
  }

  /**
   * Estudio fotográfico virtual para los reflejos: fondo oscuro, una caja de
   * luz cenital, tiras verticales a los lados y un panel con degradado frente
   * al teléfono. El metal y el vidrio reflejan estas formas, como en una foto
   * de producto.
   */
  buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const studio = new THREE.Scene();
    const disposables = [];
    const add = (geo, mat) => {
      disposables.push(geo, mat);
      const mesh = new THREE.Mesh(geo, mat);
      studio.add(mesh);
      return mesh;
    };
    const glow = (hex, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide });
    add(new THREE.BoxGeometry(60, 40, 60), new THREE.MeshBasicMaterial({ color: '#0a0b10', side: THREE.BackSide }));
    // Degradado vertical para las caras planas (frente y espalda).
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#8a8d96');
    grad.addColorStop(0.7, '#34363e');
    grad.addColorStop(1, '#121318');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const gradTex = new THREE.CanvasTexture(c);
    gradTex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(gradTex);
    const front = add(new THREE.PlaneGeometry(30, 22), new THREE.MeshBasicMaterial({ map: gradTex, color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.DoubleSide }));
    front.position.set(0, 2, 22);
    const back = add(new THREE.PlaneGeometry(30, 22), new THREE.MeshBasicMaterial({ map: gradTex, color: new THREE.Color(1.1, 1.1, 1.2), side: THREE.DoubleSide }));
    back.position.set(0, 2, -22);
    const top = add(new THREE.PlaneGeometry(18, 10), glow('#ffffff', 5));
    top.position.set(0, 18, 4);
    top.rotation.x = Math.PI / 2;
    const left = add(new THREE.PlaneGeometry(3, 26), glow('#fff6ec', 9));
    left.position.set(-18, 0, 8);
    left.rotation.y = Math.PI / 2;
    const left2 = add(new THREE.PlaneGeometry(1.2, 26), glow('#ffffff', 6));
    left2.position.set(-14, 0, -12);
    left2.rotation.y = Math.PI / 3;
    const right = add(new THREE.PlaneGeometry(3, 26), glow('#5b8bff', 6));
    right.position.set(18, 0, 2);
    right.rotation.y = -Math.PI / 2;
    const right2 = add(new THREE.PlaneGeometry(1.4, 26), glow('#ffffff', 4));
    right2.position.set(14, 0, 14);
    right2.rotation.y = -Math.PI / 4;

    this.envTarget?.dispose();
    this.envTarget = pmrem.fromScene(studio, 0.02);
    disposables.forEach((d) => d.dispose());
    pmrem.dispose();
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 1;
  }

  buildLights() {
    this.lights = new THREE.Group();
    const key = new THREE.DirectionalLight('#fff4e8', 0.9);
    key.position.set(-6, 10, 10);
    const rim = new THREE.DirectionalLight('#2463ff', 4);
    rim.position.set(12, 3, -10);
    const rim2 = new THREE.DirectionalLight('#c9cdd5', 2.2);
    rim2.position.set(-12, -3, -8);
    this.sweep = new THREE.PointLight('#9fb8ff', 0, 40, 1.6);
    this.sweep.position.set(-14, 4, 8);
    const fill = new THREE.HemisphereLight('#dbe3ff', '#050507', 0.2);
    this.lights.add(key, rim, rim2, this.sweep, fill);
    this.scene.add(this.lights);
  }

  buildShadow() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,.75)');
    grad.addColorStop(0.5, 'rgba(0,0,0,.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this.shadowTex = new THREE.CanvasTexture(c);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.6),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = -1;
    // Dentro de `stage`: crece y se mueve con el teléfono, así nunca lo atraviesa.
    this.stage.add(this.shadow);
  }

  setProduct(product, colorId) {
    this.model?.dispose();
    this.product = product;
    this.model = new PhoneModel(product, colorId);
    this.model.onChange = () => this.invalidate();
    this.stage.add(this.model.group);
    const { H, W } = this.model.size;
    this.shadow.position.y = -H / 2 - 1.4;
    this.shadow.scale.set(W / 7, 1, 1);
    this.invalidate();
    if (product.model3d) this.loadGLB(product.model3d);
    return this.model;
  }

  /**
   * Sustituye el modelo paramétrico por un archivo .glb registrado en el panel
   * (p. ej. assets/models-3d/iphone-18-pro-max.glb). Se escala a las medidas
   * oficiales del modelo. Si falla, se mantiene el modelo paramétrico.
   */
  async loadGLB(url) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      if (this.disposed || !this.model) return;
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      wrapper.scale.setScalar(this.model.size.H / Math.max(size.x, size.y, size.z));
      this.model.group.children.forEach((c) => (c.visible = false));
      this.model.group.add(wrapper);
      this.invalidate();
    } catch (error) {
      console.warn('[BUNEMA] No se pudo cargar el modelo 3D; se usa el modelo generado por código.', error);
    }
  }

  setColor(colorId) {
    this.model?.setColor(colorId, { gsap: this.reduced ? null : gsap });
    this.invalidate();
  }

  /** Vistas predefinidas. Gira el modelo (no la cámara) para que funcione con y sin controles. */
  setView(view) {
    const rot = { front: [0, 0], back: [0, Math.PI], side: [0, Math.PI / 2], camera: [0.1, Math.PI * 0.93] }[view] || [0, 0];
    const target = this.model.group.rotation;
    const zoom = view === 'camera' ? 0.52 : 1;
    if (this.controls) {
      this.controls.autoRotate = false;
      this.camera.position.set(0, 0, this.baseDistance * zoom);
      this.controls.target.set(0, 0, 0);
      if (view === 'camera') {
        const { H, W } = this.model.size;
        this.controls.target.set(W * 0.25, H * 0.32, 0);
        this.camera.position.set(W * 0.25, H * 0.32, this.baseDistance * zoom);
      }
      this.controls.update();
    }
    const dur = this.reduced ? 0 : 1.1;
    gsap.to(target, { x: rot[0], y: rot[1], z: 0, duration: dur, ease: 'power3.inOut', onUpdate: () => this.invalidate() });
    this.invalidate();
  }

  setAutoRotate(on) {
    if (!this.controls) return;
    this.controls.autoRotate = on && !this.reduced;
    this.start();
  }

  zoom(factor) {
    if (!this.controls) return;
    const dir = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(dir.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    dir.setLength(len);
    this.camera.position.copy(this.controls.target).add(dir);
    this.controls.update();
  }

  /** Inspección de materiales: una luz recorre el teléfono para mostrar reflejos y acabados. */
  setMaterialSweep(on) {
    gsap.killTweensOf(this.sweep.position);
    gsap.killTweensOf(this.sweep);
    if (!on) {
      gsap.to(this.sweep, { intensity: 0, duration: 0.4, onUpdate: () => this.invalidate() });
      return;
    }
    gsap.to(this.sweep, { intensity: 900, duration: 0.4 });
    this.sweep.position.x = -14;
    gsap.to(this.sweep.position, {
      x: 14,
      duration: this.reduced ? 0 : 3.2,
      ease: 'sine.inOut',
      repeat: this.reduced ? 0 : -1,
      yoyo: true,
      onUpdate: () => this.invalidate(),
    });
  }

  invalidate() {
    this.needsRender = true;
    this.start();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  tick() {
    if (this.disposed) return;
    const active = this.visible && document.visibilityState === 'visible';
    let moving = false;
    if (this.controls && active) moving = this.controls.update() || this.controls.autoRotate;
    if (active && (this.needsRender || moving)) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
    // Sigue el bucle solo si hay algo animándose; si no, se detiene hasta el próximo invalidate().
    if (active && (moving || this.continuous || gsap.isTweening(this.model?.group.rotation) || gsap.isTweening(this.sweep.position))) {
      requestAnimationFrame(this.tick);
    } else {
      this.running = false;
    }
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // En pantallas estrechas se aleja la cámara para que el teléfono quepa a lo ancho.
    this.camera.zoom = Math.min(1, (w / h) * 1.25);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  dispose() {
    this.disposed = true;
    gsap.killTweensOf(this.sweep?.position);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.controls?.dispose();
    this.model?.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.shadowTex.dispose();
    this.envTarget?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
