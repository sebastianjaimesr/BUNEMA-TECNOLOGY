import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MODELS } from '../data/products.js';
import { createLineupPhone } from '../models/LineupPhone.js';
import { createContactShadow } from '../scene/contactShadow.js';

/**
 * Comparador — la vitrina 3D.
 *
 * Tres teléfonos en el MISMO renderer y la misma escena que el resto de la
 * página (no se crea otro canvas). Cada uno se coloca sobre su hueco HTML
 * (`[data-lineup-slot]`) y los tres comparten un único ángulo de giro:
 * arrastrar cualquiera, pulsar una vista o activar la rotación automática
 * los gira a la vez, sincronizados.
 *
 * Escala real: los tres usan la misma relación milímetros → píxeles y se
 * apoyan sobre la misma línea de suelo, así la diferencia de tamaño entre
 * X1, Pro y Lite es la verdadera.
 *
 * Mientras la vitrina está en pantalla, el X1 del hero se oculta (sus
 * secciones están lejos y cubiertas por fondos opacos): nunca hay dos X1.
 */

const damp = (current, target, k, dt) => current + (target - current) * (1 - Math.exp(-k * dt));
const VIEWS = { back: Math.PI - 0.5, side: Math.PI / 2 + 0.25, front: 0.4 };
const SPIN_SPEED = 0.45;
const DRAG_SPEED = 0.011;
const MM = 0.1;

export function createComparisonPresentation({ sceneManager, phone, hero, sectionEl, comparison, reducedMotion }) {
  const root = document.documentElement;
  const stageEl = sectionEl.querySelector('[data-lineup]');
  const angleEl = sectionEl.querySelector('[data-lineup-angle]');
  const viewButtons = [...sectionEl.querySelectorAll('[data-lineup-view]')];
  const spinButton = sectionEl.querySelector('[data-lineup-spin]');
  root.classList.add('has-lineup-3d');

  const group = new THREE.Group();
  group.name = 'lineup';
  group.visible = false;
  sceneManager.scene.add(group);

  const shared = phone.materialLibrary.materials;
  const items = MODELS.map((model) => {
    const built = createLineupPhone(model, shared);
    const holder = new THREE.Group(); // posición y escala (sigue al hueco HTML)
    const pivot = new THREE.Group(); // giro sincronizado
    pivot.add(built.group);
    const shadow = createContactShadow({ width: 9, depth: 2.6 });
    shadow.mesh.position.set(0, -built.height / 2 - 0.25, -1);
    shadow.mesh.material.opacity = 0.8;
    holder.add(pivot, shadow.mesh);
    group.add(holder);
    return {
      model,
      built,
      holder,
      pivot,
      shadow,
      slotEl: stageEl.querySelector(`[data-lineup-slot="${model.id}"] .lineup__stage`),
      offset: { x: 0, y: 0 }, // centro del teléfono respecto a la vitrina, en px
      lift: 0, // 0..1: cuánto destaca (escala) este modelo
    };
  });

  const turn = { heading: VIEWS.back, headingTarget: VIEWS.back };
  let unitScale = 1; // escala común a los tres (misma relación mm → px)
  let spinning = false;
  let dragging = null;
  let removeAnimator = null;
  let shown = false;

  /* Composición ------------------------------------------------------- */

  /** Mide los huecos una vez (por cambio de tamaño); al hacer scroll solo se lee la posición de la vitrina. */
  function measure() {
    const stageRect = stageEl.getBoundingClientRect();
    const rects = items.map((item) => item.slotEl.getBoundingClientRect());
    // La mayor escala que deja caber a los tres (alto y ancho) en su hueco.
    let pxPerMm = Infinity;
    items.forEach((item, i) => {
      const { width, height } = item.model.body;
      pxPerMm = Math.min(pxPerMm, (rects[i].height * 0.86) / height, (rects[i].width * 0.74) / width);
    });
    items.forEach((item, i) => {
      const rect = rects[i];
      const phonePx = item.model.body.height * pxPerMm;
      const floor = rect.bottom - rect.height * 0.06; // suelo común
      item.offset.x = rect.left + rect.width / 2 - stageRect.left;
      item.offset.y = floor - phonePx / 2 - stageRect.top;
    });
    // La línea de suelo del fondo CSS coincide con la base de los teléfonos.
    const floorPx = rects[0].bottom - rects[0].height * 0.06 - stageRect.top;
    stageEl.style.setProperty('--floor', `${((floorPx / stageRect.height) * 100).toFixed(2)}%`);
    const pxToWorld = sceneManager.viewSizeAt().height / sceneManager.canvas.clientHeight;
    unitScale = (pxPerMm * pxToWorld) / MM;
    place();
  }

  /** Coloca los tres teléfonos sobre sus huecos según la posición actual de la vitrina en pantalla. */
  function place() {
    const canvas = sceneManager.canvas;
    const pxToWorld = sceneManager.viewSizeAt().height / canvas.clientHeight;
    const top = stageEl.getBoundingClientRect().top;
    const left = stageEl.getBoundingClientRect().left;
    items.forEach((item) => {
      const x = left + item.offset.x;
      const y = top + item.offset.y;
      item.holder.position.set((x - canvas.clientWidth / 2) * pxToWorld, (canvas.clientHeight / 2 - y) * pxToWorld, 0);
      item.holder.scale.setScalar(unitScale * (1 + item.lift * 0.06));
    });
    applyRotation();
  }

  /**
   * Mismo ángulo para los tres, corregido por perspectiva: un teléfono a la izquierda
   * de la cámara se ve "desde su derecha". Se suma el ángulo de la línea de visión
   * (atan2(x, distancia)) para que los tres muestren exactamente la misma cara.
   */
  function applyRotation() {
    const distance = sceneManager.camera.position.z;
    items.forEach((item) => {
      const sight = Math.atan2(sceneManager.camera.position.x - item.holder.position.x, distance);
      item.pivot.rotation.set(-0.08, turn.heading + sight, 0);
    });
    const deg = ((((turn.heading * 180) / Math.PI) % 360) + 360) % 360;
    angleEl.textContent = `${String(Math.round(deg)).padStart(3, '0')}°`;
  }

  /* Bucle --------------------------------------------------------------- */

  function liftTarget(item) {
    return comparison.state.highlight === item.model.id ? 1 : 0;
  }

  function tick(dt) {
    if (spinning && !dragging) turn.headingTarget += SPIN_SPEED * dt;
    turn.heading = dragging ? turn.headingTarget : damp(turn.heading, turn.headingTarget, 6, dt);
    let settled = !spinning && !dragging && Math.abs(turn.heading - turn.headingTarget) < 0.0005;
    items.forEach((item) => {
      const target = liftTarget(item);
      item.lift = damp(item.lift, target, 8, dt);
      if (Math.abs(item.lift - target) < 0.001) item.lift = target;
      else settled = false;
    });
    if (settled) turn.heading = turn.headingTarget;
    place();
    if (settled) {
      removeAnimator = null;
      return false;
    }
    return true;
  }

  function wake() {
    if (!shown || reducedMotion || !sceneManager.active) {
      // Sin animación (o fuera de pantalla): todo salta a su valor final.
      turn.heading = turn.headingTarget;
      items.forEach((item) => {
        item.lift = liftTarget(item);
      });
      place();
      sceneManager.requestRender();
      return;
    }
    if (!removeAnimator) removeAnimator = sceneManager.addAnimator(tick);
  }

  /* Visibilidad ---------------------------------------------------------- */

  function setShown(value) {
    if (value === shown) return;
    shown = value;
    group.visible = value;
    hero.stage.visible = !value;
    if (value) {
      measure();
      wake();
    } else if (spinning) {
      setSpinning(false); // la rotación automática no sigue gastando batería fuera de pantalla
    }
    sceneManager.requestRender();
  }

  const visibility = ScrollTrigger.create({
    trigger: stageEl,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => setShown(self.isActive),
  });

  // Mientras la vitrina está en pantalla, los teléfonos acompañan al scroll.
  const onScroll = () => {
    if (!shown) return;
    place();
    sceneManager.requestRender();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Controles ------------------------------------------------------------ */

  function setPressedView(id) {
    viewButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.lineupView === id)));
  }

  function setSpinning(on) {
    spinning = on;
    spinButton.setAttribute('aria-pressed', String(on));
    if (on) setPressedView(null);
    wake();
  }

  function onViewClick(event) {
    const id = event.currentTarget.dataset.lineupView;
    if (spinning) setSpinning(false);
    const target = VIEWS[id];
    const delta = ((((target - turn.heading + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    turn.headingTarget = turn.heading + delta;
    setPressedView(id);
    wake();
  }

  function onPointerDown(event) {
    if (event.button !== 0 || event.target.closest('button') || !root.classList.contains('is-3d-ready')) return;
    dragging = { id: event.pointerId, x: event.clientX };
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

  const onSpinClick = () => setSpinning(!spinning);
  viewButtons.forEach((btn) => btn.addEventListener('click', onViewClick));
  spinButton.addEventListener('click', onSpinClick);
  spinButton.hidden = reducedMotion;
  stageEl.addEventListener('pointerdown', onPointerDown);
  stageEl.addEventListener('pointermove', onPointerMove);
  stageEl.addEventListener('pointerup', onPointerUp);
  stageEl.addEventListener('pointercancel', onPointerUp);

  // Destacar un modelo en la tabla también lo adelanta en la vitrina.
  const offComparison = comparison.subscribe(wake);

  const offRegion = sceneManager.observeRegion(stageEl);
  const offResize = sceneManager.onResize(() => {
    measure();
    sceneManager.requestRender();
  });
  const slotObserver = new ResizeObserver(() => shown && measure());
  slotObserver.observe(stageEl);
  const offActive = sceneManager.onActiveChange((active) => {
    if (active) return;
    removeAnimator?.();
    removeAnimator = null;
  });

  applyRotation();
  setShown(visibility.isActive);

  return {
    group,
    get state() {
      return {
        shown,
        heading: turn.heading,
        target: turn.headingTarget,
        spinning,
        lifts: Object.fromEntries(items.map((item) => [item.model.id, item.lift])),
      };
    },
    dispose() {
      removeAnimator?.();
      visibility.kill();
      window.removeEventListener('scroll', onScroll);
      offComparison();
      offRegion();
      offResize();
      offActive();
      slotObserver.disconnect();
      viewButtons.forEach((btn) => btn.removeEventListener('click', onViewClick));
      spinButton.removeEventListener('click', onSpinClick);
      stageEl.removeEventListener('pointerdown', onPointerDown);
      stageEl.removeEventListener('pointermove', onPointerMove);
      stageEl.removeEventListener('pointerup', onPointerUp);
      stageEl.removeEventListener('pointercancel', onPointerUp);
      hero.stage.visible = true;
      stageEl.style.removeProperty('--floor');
      items.forEach((item) => {
        item.built.dispose();
        item.shadow.dispose();
      });
      group.removeFromParent();
      root.classList.remove('has-lineup-3d');
    },
  };
}
