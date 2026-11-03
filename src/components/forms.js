/**
 * Validación de formularios con mensajes en español, sin depender de los
 * globos nativos del navegador (que varían entre sistemas).
 */
function messageFor(input) {
  const v = input.validity;
  if (v.valueMissing) return input.type === 'checkbox' ? 'Debes aceptar para continuar.' : 'Este campo es obligatorio.';
  if (v.typeMismatch && input.type === 'email') return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (v.patternMismatch && input.type === 'tel') return 'Escribe un número de 10 a 15 dígitos.';
  if (v.tooShort) return `Escribe al menos ${input.minLength} caracteres.`;
  if (v.rangeUnderflow) return `El valor mínimo es ${input.min}.`;
  return input.validationMessage;
}

function showError(input) {
  const field = input.closest('.field');
  const msg = input.checkValidity() ? '' : messageFor(input);
  if (field) {
    field.toggleAttribute('data-invalid', Boolean(msg));
    const err = field.querySelector('.field__error');
    if (err) err.textContent = msg;
  } else if (input.type === 'checkbox') {
    const err = input.form.querySelector('[data-accept-error]');
    if (err) err.textContent = msg;
  }
  input.setAttribute('aria-invalid', String(Boolean(msg)));
  return !msg;
}

export function validateForm(form) {
  const inputs = [...form.querySelectorAll('input, textarea, select')].filter((i) => i.willValidate);
  const results = inputs.map(showError);
  const firstInvalid = inputs[results.indexOf(false)];
  firstInvalid?.focus();
  return !firstInvalid;
}

/** Valida al salir de cada campo y corrige el mensaje mientras se escribe. */
export function bindLiveValidation(form) {
  form.addEventListener('focusout', (e) => {
    if (e.target.matches('input, textarea, select') && e.target.value) showError(e.target);
  });
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') showError(e.target);
  });
  form.addEventListener('change', (e) => e.target.type === 'checkbox' && showError(e.target));
}
