import { gsap } from 'gsap';

/**
 * Composición de entrada de la interfaz: los elementos marcados con
 * `data-reveal` suben y aparecen en cascada (stagger).
 *
 * Con `prefers-reduced-motion` aparecen sin desplazamiento. Si este
 * módulo nunca se ejecuta (JS desactivado), el CSS no los oculta,
 * porque la clase `.js` solo existe cuando hay JavaScript.
 */
export function revealInterface({ reducedMotion }) {
  const items = gsap.utils.toArray('[data-reveal]');
  if (reducedMotion) {
    gsap.set(items, { autoAlpha: 1 });
    return null;
  }
  return gsap.fromTo(
    items,
    { autoAlpha: 0, y: 28 },
    { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.15, clearProps: 'transform' },
  );
}
