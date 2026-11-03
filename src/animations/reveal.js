import { gsap, ScrollTrigger, prefersReduced } from './gsap.js';

/**
 * Animaciones de entrada al desplazarse. Cada página crea un contexto y lo
 * revierte al salir, así no quedan ScrollTriggers huérfanos entre rutas.
 *  [data-reveal]          → aparece con un leve desplazamiento
 *  [data-reveal-stagger]  → sus hijos aparecen escalonados
 *  [data-count]           → cuenta hasta el número indicado
 */
export function createReveals(root) {
  const ctx = gsap.context(() => {
    if (prefersReduced()) return;
    root.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 36,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    root.querySelectorAll('[data-reveal-stagger]').forEach((el) => {
      gsap.from(el.children, {
        autoAlpha: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    root.querySelectorAll('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const decimals = Number(el.dataset.decimals || 0);
      const state = { v: 0 };
      el.textContent = (0).toFixed(decimals).replace('.', ',');
      gsap.to(state, {
        v: end,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => (el.textContent = state.v.toFixed(decimals).replace('.', ',')),
      });
    });
  }, root);
  // Las imágenes y fuentes pueden cambiar alturas: recalcular tras el primer pintado.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  return ctx;
}
