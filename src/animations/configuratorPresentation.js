import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Configurador — la parte 3D.
 *
 * 1. Materiales: al cambiar color o acabado se interpolan las propiedades
 *    de los materiales COMPARTIDOS (color, rugosidad, clearcoat). Todas las
 *    piezas que los usan cambian a la vez y la escena no se reconstruye:
 *    no se crea ni una geometría ni un material nuevo.
 * 2. Pose: escribe la capa `'config'` del hero (posición, escala y giro)
 *    mientras la sección está en pantalla.
 * 3. Giro: vistas predefinidas (botones), arrastre con el dedo o el ratón
 *    y una rotación automática que el usuario puede detener.
 */

const damp = (current, target, k, dt) => current + (target - current) * (1 - Math.exp(-k * dt));
const desktopQuery = window.matchMedia('(min-width: 900px)');

// Giro (eje Y) de cada vista. π = trasera de frente a la cámara.
const VIEWS = {
  back: Math.PI - 0.45,
  side: Math.PI / 2 + 0.2,
  front: 0.42,
};
const SPIN_SPEED = 0.45; // rad/s de la rotación automática (una vuelta cada ~14 s)
const DRAG_SPEED = 0.011; // rad por píxel arrastrado
const TRANSITION = 0.9; // s del cambio de material

export function createConfiguratorPresentation({ sceneManager, phone, hero, sectionEl, configurator, reducedMotion }) {
  const root = document.documentElement;
  const stageEl = sectionEl.querySelector('[data-config-stage]');
  const angleEl = sectionEl.querySelector('[data-config-angle]');
  const sweepEl = sectionEl.querySelector('[data-config-sweep]');
  const viewButtons = [...sectionEl.querySelectorAll('[data-view]')];
  const spinButton = sectionEl.querySelector('[data-config-spin]');
  const { materials } = phone.materialLibrary;
  // Primero la clase: cambia la altura de la sección y los ScrollTrigger deben medirla ya cambiada.
  root.classList.add('has-config-3d');

  /* ------------------------------------------------------------------ */
  /* 1. Materiales                                                       */
  /* ------------------------------------------------------------------ */

  // Qué propiedad de qué material sigue a qué dato de la configuración.
  const colorTracks = [
    { color: materials.back.color, from: new THREE.Color(), to: new THREE.Color(), key: 'body' },
    { color: materials.frame.color, from: new THREE.Color(), to: new THREE.Color(), key: 'frame' },
    { color: materials.plate.color, from: new THREE.Color(), to: new THREE.Color(), key: 'plate' },
    { color: materials.logo.color, from: new THREE.Color(), to: new THREE.Color(), key: 'logo' },
  ];
  const scalarTracks = [
    { material: materials.back, prop: 'roughness', key: 'roughness' },
    { material: materials.back, prop: 'clearcoat', key: 'clearcoat' },
    { material: materials.back, prop: 'clearcoatRoughness', key: 'clearcoatRoughness' },
    { material: materials.frame, prop: 'roughness', key: 'frameRoughness' },
  ].map((track) => ({ ...track, from: 0, to: 0 }));

  const mixState = { t: 1 };
  let materialTween = null;

  function writeMaterials() {
    const t = mixState.t;
    colorTracks.forEach((track) => track.color.lerpColors(track.from, track.to, t));
    scalarTracks.forEach((track) => {
      track.material[track.prop] = track.from + (track.to - track.from) * t;
    });
    sceneManager.requestRender();
  }

  /**
   * Interpola desde el estado ACTUAL (aunque una transición anterior esté a
   * medias) hacia la nueva selección. Cambiar rápido de opción nunca salta.
   */
  function transitionTo({ colorway, finish }, instant = false) {
    materialTween?.kill();
    colorTracks.forEach((track) => {
      track.from.copy(track.color);
      track.to.set(colorway[track.key]);
    });
    scalarTracks.forEach((track) => {
      track.from = track.material[track.prop];
      track.to = finish[track.key];
    });
    if (instant || reducedMotion) {
      mixState.t = 1;
      writeMaterials();
      return;
    }
    mixState.t = 0;
    materialTween = gsap.to(mixState, { t: 1, duration: TRANSITION, ease: 'power2.inOut', onUpdate: writeMaterials });
    // Barrido de luz sobre la zona del teléfono: marca visualmente el cambio.
    sweepEl.classList.remove('is-active');
    void sweepEl.offsetWidth; // reinicia la animación CSS
    sweepEl.classList.add('is-active');
  }

  // Estado inicial coherente: los materiales parten exactamente de la selección inicial.
  transitionTo(configurator.state, true);
  const offConfig = configurator.subscribe((state) => transitionTo(state));

  /* ------------------------------------------------------------------ */
  /* 2. Pose y composición                                               */
  /* ------------------------------------------------------------------ */

  const layout = { x: 0, y: 0, scale: 1 };
  const blend = { target: 0, current: 0 };
  // `heading` = giro actual; `headingTarget` = adonde va (vista elegida + arrastre + rotación automática).
  const turn = { heading: VIEWS.back, headingTarget: VIEWS.back };
  let spinning = false;
  let dragging = null;
  let removeAnimator = null;

  /** El teléfono ocupa el centro de `[data-config-stage]`, medido en píxeles y pasado a unidades de mundo. */
  function computeLayout() {
    const view = sceneManager.viewSizeAt();
    const canvasH = sceneManager.canvas.clientHeight;
    const pxToWorld = view.height / canvasH;
    const { height: phoneH, width: phoneW } = phone.dimensions;
    // Posición del hueco relativa al panel fijo (que, en su sitio, empieza arriba del todo).
    const panel = stageEl.offsetParent.getBoundingClientRect();
    const rect = stageEl.getBoundingClientRect();
    const cx = rect.left - panel.left + rect.width / 2;
    const cy = rect.top - panel.top + rect.height / 2;
    layout.x = (cx - sceneManager.canvas.clientWidth / 2) * pxToWorld;
    layout.y = (canvasH / 2 - cy) * pxToWorld;
    const fitH = (rect.height * (desktopQuery.matches ? 0.78 : 0.8) * pxToWorld) / phoneH;
    const fitW = (rect.width * 0.62 * pxToWorld) / phoneW;
    layout.scale = Math.min(fitH, fitW);
    // El halo y la línea de suelo del fondo se alinean con el teléfono.
    const phonePx = (phoneH * layout.scale) / pxToWorld;
    sectionEl.style.setProperty('--cfg-x', `${((cx / panel.width) * 100).toFixed(2)}%`);
    sectionEl.style.setProperty('--cfg-y', `${((cy / panel.height) * 100).toFixed(2)}%`);
    sectionEl.style.setProperty('--cfg-floor', `${(((cy + phonePx * 0.52) / panel.height) * 100).toFixed(2)}%`);
  }

  const toDegrees = (rad) => ((((rad * 180) / Math.PI) % 360) + 360) % 360;

  function applyState(request) {
    hero.setLayer(
      'config',
      {
        blend: blend.current,
        x: layout.x,
        y: layout.y,
        scale: layout.scale,
        rx: -0.1,
        ry: turn.heading,
        rz: 0.04,
      },
      request,
    );
    angleEl.textContent = `${String(Math.round(toDegrees(turn.heading))).padStart(3, '0')}°`;
  }

  function tick(dt) {
    if (spinning && !dragging) turn.headingTarget += SPIN_SPEED * dt;
    blend.current = damp(blend.current, blend.target, 9, dt);
    turn.heading = dragging ? turn.headingTarget : damp(turn.heading, turn.headingTarget, 6, dt);
    const settled =
      !spinning &&
      !dragging &&
      Math.abs(blend.current - blend.target) < 0.0005 &&
      Math.abs(turn.heading - turn.headingTarget) < 0.0005;
    if (settled) {
      blend.current = blend.target;
      turn.heading = turn.headingTarget;
    }
    applyState(false);
    if (settled) {
      removeAnimator = null;
      return false;
    }
    return true;
  }

  function wake() {
    if (!sceneManager.active || reducedMotion) {
      // Sin animación (o sin nada en pantalla): el estado salta a su valor final.
      blend.current = blend.target;
      turn.heading = turn.headingTarget;
      applyState(sceneManager.active);
      return;
    }
    if (!removeAnimator) removeAnimator = sceneManager.addAnimator(tick);
  }

  // Relevo: mientras la sección entra, el teléfono pasa de la pose anterior a la del configurador.
  const handoff = ScrollTrigger.create({
    trigger: sectionEl,
    start: 'top bottom',
    end: reducedMotion ? 'top center' : 'top top',
    onUpdate: (self) => {
      blend.target = reducedMotion ? (self.progress > 0.5 ? 1 : 0) : self.progress;
      wake();
    },
    onLeaveBack: () => {
      blend.target = 0;
      wake();
    },
  });

  /* ------------------------------------------------------------------ */
  /* 3. Giro: vistas, arrastre y rotación automática                     */
  /* ------------------------------------------------------------------ */

  function setPressedView(id) {
    viewButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.view === id)));
  }

  function setSpinning(on) {
    spinning = on;
    spinButton.setAttribute('aria-pressed', String(on));
    if (on) setPressedView(null);
    wake();
  }

  function onViewClick(event) {
    const id = event.currentTarget.dataset.view;
    if (spinning) setSpinning(false);
    // Desde el giro actual, por el camino más corto hasta la vista elegida.
    const target = VIEWS[id];
    const delta = ((((target - turn.heading + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    turn.headingTarget = turn.heading + delta;
    setPressedView(id);
    wake();
  }

  function onPointerDown(event) {
    if (event.button !== 0 || !root.classList.contains('is-3d-ready')) return;
    dragging = { id: event.pointerId, x: event.clientX };
    // Durante el arrastre la pose sigue al dedo 1:1, partiendo de donde está ahora.
    turn.headingTarget = turn.heading;
    stageEl.setPointerCapture(event.pointerId);
    stageEl.classList.add('is-dragging');
    setPressedView(null);
    wake();
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    turn.headingTarget += (event.clientX - dragging.x) * DRAG_SPEED;
    dragging.x = event.clientX;
    wake();
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== dragging.id) return;
    dragging = null;
    stageEl.classList.remove('is-dragging');
    wake();
  }

  viewButtons.forEach((btn) => btn.addEventListener('click', onViewClick));
  const onSpinClick = () => setSpinning(!spinning);
  spinButton.addEventListener('click', onSpinClick);
  // Con movimiento reducido no se ofrece la rotación automática.
  spinButton.hidden = reducedMotion;
  stageEl.addEventListener('pointerdown', onPointerDown);
  stageEl.addEventListener('pointermove', onPointerMove);
  stageEl.addEventListener('pointerup', onPointerUp);
  stageEl.addEventListener('pointercancel', onPointerUp);

  // La rotación automática se detiene sola al salir de la sección: no gasta batería fuera de pantalla.
  const visibility = ScrollTrigger.create({
    trigger: sectionEl,
    start: 'top bottom',
    end: 'bottom top',
    onLeave: () => spinning && setSpinning(false),
    onLeaveBack: () => spinning && setSpinning(false),
  });

  computeLayout();
  blend.target = blend.current = reducedMotion ? (handoff.progress > 0.5 ? 1 : 0) : handoff.progress;
  applyState(true);

  const offRegion = sceneManager.observeRegion(sectionEl);
  const offResize = sceneManager.onResize(() => {
    computeLayout();
    applyState(true);
  });
  const offActive = sceneManager.onActiveChange((active) => {
    if (active) return;
    removeAnimator?.();
    removeAnimator = null;
    wake();
  });

  return {
    get state() {
      return { blend: blend.current, heading: turn.heading, target: turn.headingTarget, spinning, mix: mixState.t };
    },
    dispose() {
      materialTween?.kill();
      removeAnimator?.();
      offConfig();
      handoff.kill();
      visibility.kill();
      offRegion();
      offResize();
      offActive();
      viewButtons.forEach((btn) => btn.removeEventListener('click', onViewClick));
      spinButton.removeEventListener('click', onSpinClick);
      stageEl.removeEventListener('pointerdown', onPointerDown);
      stageEl.removeEventListener('pointermove', onPointerMove);
      stageEl.removeEventListener('pointerup', onPointerUp);
      stageEl.removeEventListener('pointercancel', onPointerUp);
      root.classList.remove('has-config-3d');
    },
  };
}
