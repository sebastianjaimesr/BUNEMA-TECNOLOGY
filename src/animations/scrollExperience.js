import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BunemaPhone } from '../models/BunemaPhone.js';
import { STEPS, PART_MOTION, EXPLODED_CENTER_Z, sequenceAt } from './explodeSequence.js';
import { createTechLabels } from '../ui/techLabels.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Ingeniería en movimiento: el scroll controla el despiece del X1.
 *
 * Flujo de datos (en una sola dirección):
 *   scroll ──ScrollTrigger──▶ progreso objetivo
 *          ──amortiguación──▶ progreso actual (suave, también hacia atrás)
 *          ──sequenceAt()───▶ posición de cada pieza + pose + paso activo
 *          ──▶ objetos 3D, textos y etiquetas
 *
 * Como `sequenceAt` es una función pura, el estado depende solo del
 * progreso: no hay forma de que el despiece quede "a medias" o roto.
 */

const damp = (current, target, k, dt) => current + (target - current) * (1 - Math.exp(-k * dt));
const desktopQuery = window.matchMedia('(min-width: 900px)');

export function createScrollExperience({ sceneManager, phone, hero, sectionEl, sourceList, reducedMotion }) {
  const root = document.documentElement;
  const stepEls = [...sectionEl.querySelectorAll('[data-step]')];
  const countEl = sectionEl.querySelector('[data-step-count]');
  const barEl = sectionEl.querySelector('[data-step-bar]');
  const headEl = sectionEl.querySelector('.engineering__head');
  const labelsEl = sectionEl.querySelector('[data-tech-labels]');
  const bounds = { left: 0, right: 0, top: 0, bottom: 0 };
  const labels = createTechLabels({
    container: labelsEl,
    phone,
    sceneManager,
    source: sourceList,
    getBounds: () => bounds,
  });
  // En el despiece las contras se atenúan: de frente a la carcasa teñirían todo de violeta.
  const { rims } = sceneManager.lighting;
  const rimBase = { blue: rims.blue.intensity, violet: rims.violet.intensity };

  // Con movimiento reducido no hay animación ligada al scroll: se muestra
  // una composición estática del despiece completo con todas las etiquetas.
  const STATIC_PROGRESS = 0.82;
  const progress = { target: 0, current: 0 };
  const blend = { target: 0, current: 0 };
  const layout = { x: 0, y: 0, scale: 1 };
  let removeAnimator = null;
  let lastStep = -1;
  let lastLabelsKey = '';

  root.classList.toggle('has-story', !reducedMotion);
  root.classList.toggle('story-static', reducedMotion);

  /** Dónde y a qué tamaño se compone el despiece en cada formato. */
  function computeLayout() {
    const view = sceneManager.viewSizeAt();
    const { height: phoneH } = phone.dimensions;
    measureBounds();
    if (desktopQuery.matches) {
      // Escritorio: texto a la izquierda, despiece centrado en el espacio derecho.
      layout.x = view.width * 0.16;
      layout.y = -view.height * 0.02;
      layout.scale = (view.height * 0.56) / phoneH;
    } else {
      // Móvil: el despiece ocupa el hueco libre entre el título y el texto del paso.
      // Píxeles → mundo con el alto del lienzo (el panel y el lienzo empiezan arriba del todo).
      const canvasH = sceneManager.canvas.clientHeight;
      const pxToWorld = view.height / canvasH;
      const centerPx = (bounds.top + bounds.bottom) / 2;
      layout.x = 0;
      layout.y = (canvasH / 2 - centerPx) * pxToWorld;
      layout.scale = Math.min(((bounds.bottom - bounds.top) * 0.78 * pxToWorld) / phoneH, (view.width * 0.62) / 9);
    }
    // El halo del fondo se centra donde queda el despiece.
    sectionEl.style.setProperty('--story-x', `${50 + (layout.x / view.width) * 100}%`);
    sectionEl.style.setProperty('--story-y', `${50 - (layout.y / view.height) * 100}%`);
  }

  /**
   * Zona libre para las fichas técnicas, relativa a su contenedor:
   * escritorio → a la derecha del texto; móvil → entre el título y el paso activo.
   */
  function measureBounds() {
    const box = labelsEl.getBoundingClientRect();
    const head = headEl.getBoundingClientRect();
    const pad = 12;
    bounds.right = box.width - pad;
    if (desktopQuery.matches) {
      const steps = sectionEl.querySelector('.engineering__steps').getBoundingClientRect();
      bounds.left = Math.max(head.right, steps.right) - box.left + 24;
      bounds.top = head.top - box.top;
      bounds.bottom = box.height - pad * 2;
    } else {
      const active = stepEls[Math.max(lastStep, 0)].getBoundingClientRect();
      bounds.left = pad;
      bounds.top = head.bottom - box.top + pad;
      bounds.bottom = active.top - box.top - pad;
    }
  }

  /** Lleva el estado del progreso actual a la escena y a la interfaz. */
  function applyState(request) {
    const p = reducedMotion ? STATIC_PROGRESS : progress.current;
    const seq = sequenceAt(p);

    // 1. Piezas: reposo + desplazamiento × avance. Nunca se acumula movimiento.
    BunemaPhone.PART_ORDER.forEach((key) => {
      const piece = phone.parts[key];
      const motion = PART_MOTION[key];
      const t = seq.parts[key];
      const rest = piece.userData.rest.position;
      piece.position.set(rest.x + motion.offset[0] * t, rest.y + motion.offset[1] * t, rest.z + motion.offset[2] * t);
      if (motion.spreadX) {
        piece.children.forEach((child) => {
          child.userData.restX ??= child.position.x;
          child.position.x = child.userData.restX * (1 + motion.spreadX * t);
        });
      }
    });
    // 2. Se compensa el centro del conjunto para que el despiece quede centrado en pantalla.
    phone.root.position.z = -EXPLODED_CENTER_Z * seq.explode;

    // 3. Pose: el hero mezcla su propia pose con esta según `blend`.
    hero.setStory(
      {
        blend: blend.current,
        x: layout.x,
        y: layout.y,
        scale: layout.scale * seq.pose.zoom,
        rx: seq.pose.rx,
        ry: seq.pose.ry,
        rz: seq.pose.rz,
      },
      request,
    );

    // 4. Interfaz: paso activo, contador, barra y etiquetas.
    if (seq.step !== lastStep) {
      lastStep = seq.step;
      stepEls.forEach((el, i) => el.classList.toggle('is-active', i === seq.step));
      countEl.textContent = String(seq.step + 1).padStart(2, '0');
      // En móvil el alto del paso activo cambia: también cambia el hueco para las fichas.
      measureBounds();
    }
    barEl.style.transform = `scaleX(${p.toFixed(4)})`;

    const stepLabels = STEPS[seq.step].labels;
    const showLabels = blend.current > 0.9 ? stepLabels : [];
    const compact = stepLabels === 'all' && !desktopQuery.matches;
    const key = `${showLabels === 'all' ? 'all' : showLabels.join(',')}|${compact}`;
    if (key !== lastLabelsKey) {
      lastLabelsKey = key;
      labels.show(showLabels === 'all' ? 'all' : new Set(showLabels), {
        compact,
        line: desktopQuery.matches ? 48 : 20,
      });
    }

    rims.blue.intensity = rimBase.blue * (1 - blend.current * 0.35);
    rims.violet.intensity = rimBase.violet * (1 - blend.current * 0.8);
  }

  /** Un fotograma: el progreso real persigue al objetivo con amortiguación. */
  function tick(dt) {
    progress.current = damp(progress.current, progress.target, 7, dt);
    blend.current = damp(blend.current, blend.target, 9, dt);
    const settled =
      Math.abs(progress.current - progress.target) < 0.0005 && Math.abs(blend.current - blend.target) < 0.0005;
    if (settled) {
      progress.current = progress.target;
      blend.current = blend.target;
    }
    applyState(false);
    if (settled) {
      removeAnimator?.();
      removeAnimator = null;
      return false;
    }
    return true;
  }

  /** Lleva el estado actual directamente al objetivo, sin transición. */
  function snap(request) {
    progress.current = progress.target;
    blend.current = blend.target;
    applyState(request);
  }

  function wake() {
    // Con el 3D en pausa no se ve nada: el estado se pone al día sin gastar fotogramas.
    if (!sceneManager.active) {
      snap(false);
      return;
    }
    if (reducedMotion) {
      // Sin transiciones: el estado salta directamente al valor final.
      snap(true);
      return;
    }
    if (!removeAnimator) removeAnimator = sceneManager.addAnimator(tick);
  }

  computeLayout();

  // Relevo: mientras la sección entra en pantalla, el teléfono pasa de la pose del hero a la de la historia.
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

  // Recorrido del despiece: desde que la sección llena la pantalla hasta su final.
  const story = ScrollTrigger.create({
    trigger: sectionEl,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      progress.target = self.progress;
      wake();
    },
  });

  // Estado inicial correcto aunque la página se cargue a mitad del scroll.
  progress.target = progress.current = story.progress;
  blend.target = blend.current = reducedMotion ? (handoff.progress > 0.5 ? 1 : 0) : handoff.progress;
  applyState(true);

  const offRegion = sceneManager.observeRegion(sectionEl);
  // Si el 3D se pausa a mitad de una transición (salida rápida de la sección),
  // el animador deja de recibir fotogramas: el estado se completa en ese momento.
  const offActive = sceneManager.onActiveChange((active) => {
    if (active) return;
    removeAnimator?.();
    removeAnimator = null;
    snap(false);
  });
  const offResize = sceneManager.onResize(() => {
    computeLayout();
    lastLabelsKey = ''; // fuerza a medir de nuevo las fichas (cambian con el ancho)
    applyState(true);
  });

  return {
    /** Estado actual (lectura): útil para depurar y para las pruebas automáticas. */
    get state() {
      return { target: progress.target, progress: progress.current, blend: blend.current, step: lastStep };
    },
    dispose() {
      removeAnimator?.();
      handoff.kill();
      story.kill();
      offRegion();
      offActive();
      offResize();
      labels.dispose();
      root.classList.remove('has-story', 'story-static');
      rims.blue.intensity = rimBase.blue;
      rims.violet.intensity = rimBase.violet;
      // Devuelve todas las piezas a su reposo exacto.
      BunemaPhone.PART_ORDER.forEach((key) => {
        const piece = phone.parts[key];
        piece.position.copy(piece.userData.rest.position);
        piece.children.forEach((child) => {
          if (child.userData.restX !== undefined) child.position.x = child.userData.restX;
        });
      });
      phone.root.position.z = 0;
    },
  };
}
