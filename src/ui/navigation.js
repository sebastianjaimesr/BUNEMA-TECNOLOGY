/**
 * Menú móvil accesible.
 *
 *  - `aria-expanded` comunica el estado a lectores de pantalla.
 *  - Escape cierra el menú y devuelve el foco al botón.
 *  - Elegir un enlace cierra el menú (el usuario ya decidió a dónde ir).
 *  - En escritorio el menú siempre está visible y el botón se oculta con CSS.
 */
export function initNavigation(root = document) {
  const toggle = root.querySelector('[data-menu-toggle]');
  const nav = root.querySelector('[data-nav]');
  const header = root.querySelector('[data-header]');
  if (!toggle || !nav) return { dispose() {} };

  // La cabecera gana un fondo sólido en cuanto el contenido pasa por debajo.
  // Un "centinela" de 1 px en lo alto de la página evita escuchar cada evento de scroll.
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
  document.body.prepend(sentinel);
  const headerObserver = new IntersectionObserver(([entry]) => {
    header?.classList.toggle('is-scrolled', !entry.isIntersecting);
  });
  headerObserver.observe(sentinel);

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? 'Cerrar' : 'Menú';
    document.documentElement.classList.toggle('menu-open', open);
  };

  const onToggle = () => setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  const onKey = (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  };
  const onNavClick = (event) => {
    if (event.target.closest('[data-nav-link]')) setOpen(false);
  };
  // Si la pantalla pasa a escritorio con el menú abierto, se restablece el estado.
  const desktop = window.matchMedia('(min-width: 900px)');
  const onBreakpoint = (e) => e.matches && setOpen(false);

  toggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKey);
  nav.addEventListener('click', onNavClick);
  desktop.addEventListener('change', onBreakpoint);

  return {
    dispose() {
      headerObserver.disconnect();
      sentinel.remove();
      toggle.removeEventListener('click', onToggle);
      document.removeEventListener('keydown', onKey);
      nav.removeEventListener('click', onNavClick);
      desktop.removeEventListener('change', onBreakpoint);
      setOpen(false);
    },
  };
}
