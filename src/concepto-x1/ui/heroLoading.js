/**
 * Indicador de carga dentro del hero.
 *
 * Solo aparece si la introducción terminó (u se omitió) antes de que la
 * vista 3D estuviera lista: así el usuario ya puede leer y navegar, y
 * sigue viendo cuánto falta, con el mismo progreso real de la intro.
 */
export function bindHeroLoading({ element, tracker, after }) {
  if (!element) return () => {};
  const bar = element.querySelector('[data-hero-loading-bar]');
  const text = element.querySelector('[data-hero-loading-text]');
  let visible = false;

  const offProgress = tracker.onChange(({ progress, complete, failed }) => {
    bar.style.transform = `scaleX(${progress})`;
    text.textContent = `Cargando vista 3D · ${Math.round(progress * 100)} %`;
    if ((complete || failed) && visible) {
      element.hidden = true;
      visible = false;
    }
  });

  after.then(() => {
    const { complete, failed } = tracker.snapshot();
    if (!complete && !failed) {
      element.hidden = false;
      visible = true;
    }
  });

  return offProgress;
}
