import { gsap } from 'gsap';

/**
 * Introducción cinematográfica.
 *
 * Secuencia (≈1,8 s):
 *   1. Fondo negro; el identificador BUNEMA aparece letra a letra (CSS).
 *   2. Una línea de luz recorre el logotipo (la misma de la placa del X1).
 *   3. La cortina se abre y main.js revela producto e interfaz.
 *
 * Reglas de respeto al usuario:
 *  - Nunca espera más de MAX_WAIT por la carga: si el 3D aún no está, la
 *    cortina se abre igual y el hero muestra el progreso restante.
 *  - "Omitir intro" o Escape la terminan al instante.
 *  - En la misma sesión, la segunda visita usa una versión corta.
 *  - Con `prefers-reduced-motion` no hay secuencia: se retira sin animar.
 */

const SEEN_KEY = 'bunema:intro-seen';
const MAX_WAIT = 1600; // ms extra que se espera a la carga tras la secuencia

function readSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false; // modo privado o almacenamiento bloqueado
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* sin almacenamiento: la próxima visita repetirá la intro completa */
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function playIntro({ overlay, tracker, reducedMotion }) {
  const root = document.documentElement;
  const bar = overlay.querySelector('[data-intro-bar]');
  const meter = overlay.querySelector('[data-intro-meter]');
  const status = overlay.querySelector('[data-intro-status]');
  const skipButton = overlay.querySelector('[data-intro-skip]');
  const sweep = overlay.querySelector('[data-intro-sweep]');

  let finished = false;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  // La barra refleja el LoadTracker: avanza solo cuando una etapa real termina.
  const offProgress = tracker.onChange(({ progress, label }) => {
    const pct = Math.round(progress * 100);
    bar.style.transform = `scaleX(${progress})`;
    meter.setAttribute('aria-valuenow', String(pct));
    status.textContent = `${label} · ${pct} %`;
  });

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    offProgress();
    skipButton.removeEventListener('click', skip);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onSkipLink, true);
    overlay.hidden = true;
    overlay.inert = true;
    root.classList.remove('intro-active');
  }

  /** Abre la cortina. `fast` se usa al omitir. */
  function finish(fast = false) {
    if (finished) return;
    finished = true;
    markSeen();
    timeline?.kill();
    // Avisamos ya a main.js: la interfaz empieza a aparecer mientras la cortina sube.
    resolveDone();
    if (reducedMotion) {
      cleanup();
      return;
    }
    const exitTime = fast ? 0.35 : 1.1;
    // Red de seguridad: en equipos muy lentos GSAP "estira" el tiempo (lagSmoothing);
    // la cortina se retira igualmente poco después de lo previsto.
    const safety = setTimeout(cleanup, exitTime * 1000 + 700);
    gsap
      .timeline({
        onComplete: () => {
          clearTimeout(safety);
          cleanup();
        },
      })
      .to(overlay.querySelector('.intro__center'), { y: -24, autoAlpha: 0, duration: fast ? 0.2 : 0.5, ease: 'power2.in' })
      .to(
        overlay,
        { clipPath: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)', duration: fast ? 0.35 : 0.9, ease: 'expo.inOut' },
        fast ? 0 : 0.2,
      );
  }

  function skip() {
    finish(true);
  }
  const onKey = (event) => {
    if (event.key === 'Escape') skip();
  };
  // Si alguien usa "Saltar al contenido" durante la intro, también la termina.
  const onSkipLink = (event) => {
    if (event.target.closest?.('.skip-link')) skip();
  };

  skipButton.addEventListener('click', skip);
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', onSkipLink, true);

  const loadedOrTimeout = () => Promise.race([tracker.settled, delay(MAX_WAIT)]);

  let timeline = null;

  if (reducedMotion) {
    // Sin secuencia: la página aparece de inmediato y el progreso se ve en el hero.
    finish();
    return { done, skip };
  }

  root.classList.add('intro-active');

  if (readSeen()) {
    // Versión corta para quien ya la vio en esta sesión: sin barrido de luz.
    Promise.race([tracker.settled, delay(700)]).then(() => finish());
    return { done, skip };
  }

  // Las letras y el símbolo aparecen con CSS (intro.css) desde el primer pintado,
  // aunque el JavaScript tarde en llegar. Aquí solo se orquesta la línea de luz
  // y el momento de abrir la cortina.
  timeline = gsap
    .timeline()
    .fromTo(sweep, { xPercent: -120, autoAlpha: 1 }, { xPercent: 120, duration: 0.95, ease: 'power3.inOut' }, 0.6)
    .to(sweep, { autoAlpha: 0, duration: 0.2 }, 1.4)
    .add(() => {
      loadedOrTimeout().then(() => finish());
    }, 1.6);

  return { done, skip };
}
