/**
 * Indicador de carga dentro del hero.
 *
 * Solo aparece si la vista 3D no estuvo lista en el primer instante
 * (`after`): en una carga rápida no hay ningún indicador que parpadee; en
 * una lenta, el usuario ya puede leer y navegar y ve el progreso real.
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
