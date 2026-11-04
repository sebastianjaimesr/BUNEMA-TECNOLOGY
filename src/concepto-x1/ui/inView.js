/**
 * Aparición discreta al entrar en pantalla para los bloques `[data-inview]`.
 *
 * Solo añade la clase `is-inview`; el movimiento lo define el CSS (12 px y
 * opacidad, nada más). Un único IntersectionObserver para toda la página y
 * cada elemento se deja de observar en cuanto aparece: coste casi nulo.
 * Sin JavaScript o con movimiento reducido el contenido se ve desde el inicio.
 */
export function initInView({ reducedMotion }) {
  const items = [...document.querySelectorAll('[data-inview]')];
  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-inview'));
    return () => {};
  }
  document.documentElement.classList.add('has-inview');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  items.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}
