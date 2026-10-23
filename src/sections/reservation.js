import { MODELS, findModel, formatCOP } from '../data/products.js';

/**
 * Reserva conceptual "Tu próxima forma de ver el mundo".
 *
 * No hay backend ni pagos: al enviar, los datos se guardan solo en el
 * estado de esta página (`state.reservations`) y se muestra una
 * confirmación de DEMOSTRACIÓN. Nada se envía a ningún servidor y la
 * interfaz no lo simula (no hay "enviando…" falso).
 *
 * Validación accesible:
 *  - `novalidate` en el <form>: los mensajes son nuestros, en español y
 *    siempre visibles junto al campo (las burbujas nativas desaparecen).
 *  - Cada campo con error recibe `aria-invalid="true"` y su mensaje está
 *    enlazado con `aria-describedby`; el lector de pantalla lo lee al enfocar.
 *  - Al enviar con errores, un resumen (`role="alert"`) lista los campos con
 *    enlaces a cada uno y el foco va al primer campo inválido.
 *  - Los errores se validan al salir del campo (blur) y se limpian al
 *    corregir, no mientras el usuario todavía está escribiendo.
 */

// Correo razonable: algo@algo.dominio (la validación definitiva siempre sería del servidor).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RULES = {
  name: (v) => {
    const value = v.trim();
    if (!value) return 'Escribe tu nombre.';
    if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    return '';
  },
  email: (v) => {
    const value = v.trim();
    if (!value) return 'Escribe tu correo electrónico.';
    if (!EMAIL.test(value)) return 'Revisa el correo: debe tener la forma nombre@dominio.com.';
    return '';
  },
  model: (v) => (v ? '' : 'Elige un modelo.'),
  color: (v) => (v ? '' : 'Elige un color.'),
};

const LABELS = { name: 'Nombre', email: 'Correo electrónico', model: 'Modelo de interés', color: 'Color preferido' };

export function createReservation({ root, configurator, comparison }) {
  const form = root.querySelector('[data-reservation-form]');
  const summary = root.querySelector('[data-form-summary]');
  const modelSelect = root.querySelector('[data-res-model]');
  const colorSelect = root.querySelector('[data-res-color]');
  const done = root.querySelector('[data-reservation-done]');
  const resetBtn = root.querySelector('[data-reservation-reset]');
  const cta = root.querySelector('[data-reservation-cta]');
  const fields = Object.fromEntries(
    Object.keys(RULES).map((name) => [name, { input: form.elements[name], error: root.querySelector(`#res-${name}-error`) }]),
  );

  const state = { reservations: [], touched: new Set(), userPickedModel: false, userPickedColor: false };

  /* Opciones desde products.js ----------------------------------------- */
  modelSelect.append(
    ...MODELS.map((m) => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = `${m.name} · ${formatCOP(m.price)}`;
      return option;
    }),
  );

  /** Los colores dependen del modelo: cada uno tiene su propia gama. */
  function fillColors(modelId, preferred) {
    const model = modelId ? findModel(modelId) : null;
    colorSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = model ? 'Elige un color' : 'Primero elige un modelo';
    colorSelect.append(placeholder);
    if (!model) {
      colorSelect.disabled = true;
      return;
    }
    model.colors.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      colorSelect.append(option);
    });
    colorSelect.disabled = false;
    if (preferred && model.colors.includes(preferred)) colorSelect.value = preferred;
  }

  /* Validación ----------------------------------------------------------- */
  function check(name) {
    const { input, error } = fields[name];
    const message = RULES[name](input.value);
    error.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    input.closest('.field').classList.toggle('has-error', Boolean(message));
    return message;
  }

  function onBlur(event) {
    const { name } = event.target;
    if (!RULES[name]) return;
    state.touched.add(name);
    check(name);
  }

  function onInput(event) {
    const { name } = event.target;
    if (!RULES[name]) return;
    // Mientras escribe solo se QUITA el error (si ya lo había); no se le regaña a mitad de palabra.
    if (state.touched.has(name) && fields[name].input.getAttribute('aria-invalid') === 'true') check(name);
  }

  function onChange(event) {
    if (event.target === modelSelect) {
      state.userPickedModel = true;
      const keep = colorSelect.value;
      fillColors(modelSelect.value, keep || defaultColorFor(modelSelect.value));
      if (state.touched.has('model')) check('model');
      if (state.touched.has('color')) check('color');
    } else if (event.target === colorSelect) {
      state.userPickedColor = true;
      if (state.touched.has('color')) check('color');
    }
  }

  /** Color sugerido: para el X1, el que el usuario eligió en el configurador. */
  function defaultColorFor(modelId) {
    if (modelId === 'x1' && configurator) return configurator.state.colorway.name;
    return '';
  }

  function onSubmit(event) {
    event.preventDefault();
    const errors = Object.keys(RULES)
      .map((name) => {
        state.touched.add(name);
        return [name, check(name)];
      })
      .filter(([, message]) => message);

    if (errors.length) {
      // Resumen con enlaces a cada campo; el foco va al primer campo con error.
      summary.replaceChildren();
      const title = document.createElement('p');
      title.textContent = errors.length === 1 ? 'Falta corregir 1 campo:' : `Faltan corregir ${errors.length} campos:`;
      const list = document.createElement('ul');
      errors.forEach(([name, message]) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#res-${name}`;
        link.textContent = `${LABELS[name]}: ${message}`;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          fields[name].input.focus();
        });
        li.append(link);
        list.append(li);
      });
      summary.append(title, list);
      summary.hidden = false;
      fields[errors[0][0]].input.focus();
      return;
    }

    summary.hidden = true;
    const model = findModel(modelSelect.value);
    const entry = {
      name: fields.name.input.value.trim(),
      email: fields.email.input.value.trim(),
      model: model.id,
      color: colorSelect.value,
      // Código de demostración: número de reserva en esta sesión, sin significado comercial.
      code: `BNM-RSV-${String(state.reservations.length + 1).padStart(4, '0')}`,
    };
    state.reservations.push(entry);
    showDone(entry, model);
  }

  function showDone(entry, model) {
    done.querySelector('[data-done-code]').textContent = entry.code;
    done.querySelector('[data-done-title]').textContent = `${entry.name.split(' ')[0]}, tu ${model.name} está apartado.`;
    done.querySelector('[data-done-text]').textContent =
      `${model.name} en ${entry.color}, precio conceptual ${formatCOP(model.price)}. ` +
      `Si esto fuera real, te escribiríamos a ${entry.email}.`;
    form.hidden = true;
    done.hidden = false;
    done.focus(); // el lector de pantalla lee la confirmación completa
  }

  function onReset() {
    form.reset();
    state.touched.clear();
    state.userPickedModel = false;
    state.userPickedColor = false;
    Object.keys(RULES).forEach((name) => {
      fields[name].error.textContent = '';
      fields[name].input.removeAttribute('aria-invalid');
      fields[name].input.closest('.field').classList.remove('has-error');
    });
    fillColors('');
    summary.hidden = true;
    done.hidden = true;
    form.hidden = false;
    fields.name.input.focus();
  }

  // El botón "Reservar ahora" de la cabecera de la sección lleva al primer campo.
  function onCta(event) {
    event.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    fields.name.input.focus({ preventScroll: true });
  }

  /* Conexión con el resto de la página ------------------------------------ */
  // Si el usuario destacó un modelo en el comparador (y aún no eligió aquí), se propone ese.
  const offComparison = comparison?.subscribe(({ highlight }) => {
    if (state.userPickedModel || !highlight || form.hidden) return;
    modelSelect.value = highlight;
    fillColors(highlight, defaultColorFor(highlight));
  });
  // Si el X1 está elegido y el usuario no tocó el color, sigue al configurador.
  const offConfig = configurator?.subscribe(({ colorway }) => {
    if (modelSelect.value === 'x1' && !state.userPickedColor) colorSelect.value = colorway.name;
  });

  form.addEventListener('focusout', onBlur);
  form.addEventListener('input', onInput);
  form.addEventListener('change', onChange);
  form.addEventListener('submit', onSubmit);
  resetBtn.addEventListener('click', onReset);
  cta.addEventListener('click', onCta);

  return {
    get state() {
      return { reservations: state.reservations.map((r) => ({ ...r })) };
    },
    dispose() {
      offComparison?.();
      offConfig?.();
      form.removeEventListener('focusout', onBlur);
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onChange);
      form.removeEventListener('submit', onSubmit);
      resetBtn.removeEventListener('click', onReset);
      cta.removeEventListener('click', onCta);
    },
  };
}
