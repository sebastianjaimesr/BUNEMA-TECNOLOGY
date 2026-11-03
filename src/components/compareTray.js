import { getCompare, onCompareChange, setCompare, toggleCompare, MAX_COMPARE } from '../services/compareService.js';
import { getProduct } from '../services/catalogService.js';
import { toast } from './toast.js';

/**
 * Bandeja flotante con los modelos elegidos para comparar y delegación de
 * los botones «Comparar» de cualquier contenedor.
 */
export function mountCompareTray(scope) {
  const tray = document.createElement('div');
  tray.className = 'compare-tray';
  tray.setAttribute('role', 'region');
  tray.setAttribute('aria-label', 'Comparación');
  tray.innerHTML = `<p class="compare-tray__text" data-text></p>
    <button type="button" class="compare-tray__clear" data-clear>Limpiar</button>
    <a class="btn btn--primary btn--small" href="#/comparar">Comparar</a>`;
  document.body.appendChild(tray);

  const sync = (ids) => {
    tray.classList.toggle('is-visible', ids.length > 0);
    tray.querySelector('[data-text]').textContent = `${ids.length}/${MAX_COMPARE} · ${ids.map((id) => getProduct(id)?.name).filter(Boolean).join(', ')}`;
    scope.querySelectorAll('[data-compare-toggle]').forEach((b) => {
      const on = ids.includes(b.dataset.compareToggle);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'En comparación' : 'Comparar';
    });
  };

  const onClick = (e) => {
    const btn = e.target.closest('[data-compare-toggle]');
    if (!btn) return;
    e.preventDefault();
    if (!toggleCompare(btn.dataset.compareToggle)) toast(`Puedes comparar hasta ${MAX_COMPARE} modelos. Quita uno para añadir otro.`);
  };
  scope.addEventListener('click', onClick);
  tray.querySelector('[data-clear]').addEventListener('click', () => setCompare([]));
  const off = onCompareChange(sync);
  sync(getCompare());

  return {
    sync: () => sync(getCompare()),
    dispose() {
      off();
      scope.removeEventListener('click', onClick);
      tray.remove();
    },
  };
}
