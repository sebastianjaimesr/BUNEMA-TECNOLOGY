/**
 * Movimiento vivo del hero: cursor, flotación y arrastre táctil.
 *
 * Este módulo NO mueve objetos 3D directamente. Calcula un estado
 * (`state`) que heroAnimation.js suma a la pose del teléfono. Así toda
 * la composición final se decide en un solo lugar (`apply()`).
 *
 * Amortiguación exponencial: en cada fotograma el valor recorre una
 * fracción de la distancia a su objetivo,
 *     valor += (objetivo - valor) * (1 - e^(-k·dt))
 * Depende del tiempo transcurrido (dt), no de los FPS: el movimiento se
 * siente igual a 30 que a 120 Hz.
 */

const TAU = Math.PI * 2;
const damp = (current, target, k, dt) => current + (target - current) * (1 - Math.exp(-k * dt));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function createHeroMotion({ sceneManager, heroEl, dragEl, reducedMotion, coarsePointer, onUpdate }) {
  const state = { tiltX: 0, tiltY: 0, floatY: 0, sway: 0, shiftX: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const drag = { active: false, startX: 0, value: 0, target: 0, id: null };
  // En móvil la flotación es más contenida.
  const amplitude = coarsePointer ? 0.65 : 1;
  let elapsed = 0;
  let enabled = false;
  let removeAnimator = null;
  let lastCss = '';

  /* ---------------- Cursor (solo punteros finos: ratón, trackpad) ---------------- */
  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    wake();
  };
  const onPointerLeave = () => {
    pointer.tx = 0;
    pointer.ty = 0;
    wake();
  };

  /* ---------------- Arrastre táctil (móvil) ----------------
     `touch-action: pan-y` en el hueco del teléfono deja el scroll vertical
     al navegador y nos entrega solo los gestos horizontales. */
  const onDragStart = (event) => {
    if (event.pointerType === 'mouse') return;
    drag.active = true;
    drag.id = event.pointerId;
    drag.startX = event.clientX;
    dragEl.setPointerCapture?.(event.pointerId);
    wake();
  };
  const onDragMove = (event) => {
    if (!drag.active || event.pointerId !== drag.id) return;
    drag.target = clamp(((event.clientX - drag.startX) / window.innerWidth) * 2.4, -1.1, 1.1);
    wake();
  };
  const onDragEnd = (event) => {
    if (event.pointerId !== drag.id) return;
    drag.active = false;
    drag.target = 0; // al soltar, vuelve con suavidad a la pose
    wake();
  };

  /* ---------------- Bucle por fotograma ---------------- */
  function tick(dt) {
    elapsed += dt;
    pointer.x = damp(pointer.x, pointer.tx, 4, dt);
    pointer.y = damp(pointer.y, pointer.ty, 4, dt);
    // Al arrastrar responde rápido; al soltar vuelve más despacio, como un resorte blando.
    drag.value = damp(drag.value, drag.target, drag.active ? 14 : 3.5, dt);

    state.tiltY = pointer.x * 0.3 + drag.value;
    state.tiltX = pointer.y * 0.14;
    state.shiftX = pointer.x * 0.25;

    if (!reducedMotion) {
      // Dos periodos distintos (6,5 s y 9 s) evitan que el movimiento se note mecánico.
      state.floatY = Math.sin((elapsed / 6.5) * TAU) * 0.22 * amplitude;
      state.sway = Math.sin((elapsed / 9) * TAU) * 0.06 * amplitude;
    }

    // Parallax del fondo CSS: solo se escribe si cambió de verdad.
    const css = `${pointer.x.toFixed(3)}|${pointer.y.toFixed(3)}`;
    if (css !== lastCss) {
      lastCss = css;
      heroEl.style.setProperty('--pointer-x', pointer.x.toFixed(3));
      heroEl.style.setProperty('--pointer-y', pointer.y.toFixed(3));
    }

    onUpdate(state);

    // Con movimiento reducido, el bucle se detiene en cuanto todo está en reposo.
    const settled =
      Math.abs(pointer.x - pointer.tx) < 0.001 &&
      Math.abs(pointer.y - pointer.ty) < 0.001 &&
      Math.abs(drag.value - drag.target) < 0.001 &&
      !drag.active;
    if (reducedMotion && settled) {
      removeAnimator?.();
      removeAnimator = null;
      return false;
    }
    return true;
  }

  function wake() {
    if (!enabled || removeAnimator) return;
    removeAnimator = sceneManager.addAnimator(tick);
  }

  // Con movimiento reducido no hay inclinación por cursor ni flotación;
  // el arrastre táctil se mantiene porque lo inicia el usuario.
  if (!reducedMotion && !coarsePointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
  }
  if (dragEl && coarsePointer) {
    dragEl.addEventListener('pointerdown', onDragStart);
    dragEl.addEventListener('pointermove', onDragMove, { passive: true });
    dragEl.addEventListener('pointerup', onDragEnd);
    dragEl.addEventListener('pointercancel', onDragEnd);
  }

  return {
    state,
    /** Empieza a moverse (tras la entrada del producto). */
    start() {
      enabled = true;
      wake();
    },
    dispose() {
      enabled = false;
      removeAnimator?.();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      dragEl?.removeEventListener('pointerdown', onDragStart);
      dragEl?.removeEventListener('pointermove', onDragMove);
      dragEl?.removeEventListener('pointerup', onDragEnd);
      dragEl?.removeEventListener('pointercancel', onDragEnd);
      heroEl.style.removeProperty('--pointer-x');
      heroEl.style.removeProperty('--pointer-y');
    },
  };
}
