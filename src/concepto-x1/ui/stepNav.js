/**
 * Control manual del despiece: anterior / siguiente y un botón por paso.
 *
 * El scroll sigue siendo la única fuente de verdad: cada botón solo lleva
 * la página al punto del recorrido que corresponde a ese paso (`onSelect`).
 * Así teclado, ratón, rueda y gestos producen exactamente el mismo estado,
 * y el despiece no puede quedar en una pose que el scroll no conozca.
 */
export function createStepNav({ nav, titles, onSelect }) {
  if (!nav) return { setActive() {}, dispose() {} };
  const list = nav.querySelector('[data-step-list]');
  const prev = nav.querySelector('[data-step-prev]');
  const next = nav.querySelector('[data-step-next]');
  let current = 0;
  // Último paso pedido con los botones. Mientras el scroll suave viaja hacia él, "siguiente"
  // parte de ese paso y no del que el scroll va cruzando (dos clics rápidos = dos pasos).
  // Caduca a los 1,5 s por si el usuario interrumpe el viaje con la rueda o el dedo.
  let requested = null;
  let requestedAt = 0;

  const buttons = titles.map((title, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'step-nav__dot';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Paso ${index + 1}: ${title}`);
    // Texto visible solo en el paso activo (CSS): en el resto, una marca discreta.
    const label = document.createElement('span');
    label.className = 'step-nav__label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = title;
    button.append(label);
    item.append(button);
    return button;
  });
  list.replaceChildren(...buttons.map((b) => b.parentElement));

  function setActive(index) {
    current = index;
    if (index === requested) requested = null;
    buttons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    prev.disabled = index === 0;
    next.disabled = index === titles.length - 1;
  }

  function select(index) {
    requested = index;
    requestedAt = performance.now();
    onSelect(index);
  }
  const base = () => (requested !== null && performance.now() - requestedAt < 1500 ? requested : current);
  const onList = (event) => {
    const button = event.target.closest('[data-index]');
    if (button) select(Number(button.dataset.index));
  };
  const onPrev = () => select(Math.max(0, base() - 1));
  const onNext = () => select(Math.min(titles.length - 1, base() + 1));

  list.addEventListener('click', onList);
  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);
  nav.hidden = false;
  setActive(0);

  return {
    setActive,
    dispose() {
      list.removeEventListener('click', onList);
      prev.removeEventListener('click', onPrev);
      next.removeEventListener('click', onNext);
      list.replaceChildren();
      nav.hidden = true;
    },
  };
}
