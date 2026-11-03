import { BUNEMA_X1, COLORWAYS, FINISHES, configurationCode, findColorway, findFinish } from '../data/products.js';

/**
 * Configurador "Personaliza tu Bunema" — la parte de interfaz.
 *
 * No sabe nada de Three.js: construye los controles a partir de
 * `products.js`, guarda la selección y avisa a quien se suscriba. Así
 * funciona igual con 3D, sin WebGL (la ilustración vectorial cambia de
 * color) o antes de que la escena termine de cargar.
 *
 * Los selectores son <input type="radio"> nativos dentro de un <fieldset>:
 * el navegador ya resuelve el teclado (flechas para moverse entre
 * opciones), el foco y el estado "seleccionado" para lectores de pantalla.
 */
export function createConfigurator({ root }) {
  const colorList = root.querySelector('[data-config-colors]');
  const finishList = root.querySelector('[data-config-finishes]');
  const nameEl = root.querySelector('[data-config-name]');
  const finishNameEl = root.querySelector('[data-config-finish-name]');
  const codeEl = root.querySelector('[data-config-code]');
  const descriptionEl = root.querySelector('[data-config-description]');
  const statusEl = root.querySelector('[data-config-status]');
  // Otros lugares de la página que muestran la configuración actual (ficha del hero, texto alternativo).
  const mirrors = {
    summary: document.querySelectorAll('[data-current-finish]'),
    color: document.querySelectorAll('[data-current-color]'),
  };

  const state = {
    colorway: findColorway(BUNEMA_X1.defaultColorway),
    finish: findFinish(BUNEMA_X1.defaultFinish),
  };
  const listeners = new Set();

  /** Crea una opción de radio con su etiqueta visible. */
  function option({ name, value, label, detail, checked, swatch }) {
    const item = document.createElement('label');
    item.className = swatch ? 'swatch' : 'finish';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.className = 'visually-hidden';
    const text = document.createElement('span');
    text.className = `${item.className}__name`;
    text.textContent = label;
    if (swatch) {
      item.style.setProperty('--swatch', swatch);
      const chip = document.createElement('span');
      chip.className = 'swatch__chip';
      chip.setAttribute('aria-hidden', 'true');
      item.append(input, chip, text);
    } else {
      const sub = document.createElement('span');
      sub.className = 'finish__detail';
      sub.textContent = detail;
      item.append(input, text, sub);
    }
    return item;
  }

  colorList.replaceChildren(
    ...COLORWAYS.map((c) =>
      option({ name: 'bunema-color', value: c.id, label: c.name, swatch: c.swatch, checked: c === state.colorway }),
    ),
  );
  finishList.replaceChildren(
    ...FINISHES.map((f) =>
      option({ name: 'bunema-finish', value: f.id, label: f.name, detail: f.description, checked: f === state.finish }),
    ),
  );

  /** Refleja la selección en todos los textos y en las variables CSS de la ilustración. */
  function render() {
    const { colorway, finish } = state;
    nameEl.textContent = colorway.name;
    finishNameEl.textContent = finish.name;
    codeEl.textContent = configurationCode(colorway, finish);
    descriptionEl.textContent = `${colorway.description} ${finish.description}`;
    mirrors.summary.forEach((el) => {
      el.textContent = `${colorway.name} · ${finish.name}`;
    });
    mirrors.color.forEach((el) => {
      el.textContent = colorway.name;
    });
    root.dataset.colorway = colorway.id;
    root.dataset.finish = finish.id;
    root.style.setProperty('--cfg-body', colorway.body);
    root.style.setProperty('--cfg-frame', colorway.frame);
    root.style.setProperty('--cfg-plate', colorway.plate);
  }

  function onInput(event) {
    const input = event.target;
    if (input.name === 'bunema-color') state.colorway = findColorway(input.value);
    else if (input.name === 'bunema-finish') state.finish = findFinish(input.value);
    else return;
    render();
    // Aviso breve para lectores de pantalla (la región es `aria-live="polite"`).
    statusEl.textContent = `Seleccionado: ${state.colorway.name}, acabado ${state.finish.name.toLowerCase()}.`;
    listeners.forEach((listener) => listener(state));
  }

  root.addEventListener('change', onInput);
  render();

  return {
    get state() {
      return state;
    },
    /** Avisa en cada cambio. Devuelve la función que da de baja la suscripción. */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      root.removeEventListener('change', onInput);
      listeners.clear();
    },
  };
}
