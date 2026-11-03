import { gsap } from 'gsap';
import { FOCUS, WORLD, createCameraScene } from './cameraScene.js';

/**
 * Demo de cámara "Explora la imagen" — SIMULACIÓN.
 *
 * Qué hace de verdad:
 *  - Dibuja una ilustración vectorial (cameraScene.js) a la escala del zoom.
 *  - Muestra la MISMA imagen en dos capas con filtros CSS distintos:
 *      Estándar   → subexpuesta, contrastada y con grano.
 *      Modo noche → más luminosa, con sombras abiertas y sin grano.
 *    La capa nocturna se recorta con `clip-path`: así funciona el divisor
 *    de la comparación y el cambio de modo es un barrido.
 *  - Calcula un histograma real… de la ilustración, no de una foto.
 *
 * Qué NO hace: no accede a la cámara del dispositivo ni procesa
 * fotografías. Los valores técnicos (ISO, obturación) son ilustrativos.
 */

// Centro de la composición en el gran angular: algo por encima del centro del mundo (menos primer plano oscuro).
const REST = { x: WORLD.width / 2, y: 1080 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 10;
const LEVELS = [0.5, 1, 2, 5, 10];
// Escala logarítmica: de 0,5× a 1× hay tanto recorrido en el control como de 5× a 10×.
const zoomToT = (z) => Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM);
const tToZoom = (t) => MIN_ZOOM * (MAX_ZOOM / MIN_ZOOM) ** t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const formatZoom = (z) => `${z.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;

/** Filtros de cada estado de iluminación. Una sola fuente: se usan en el CSS y en el histograma. */
const LOOKS = {
  standard: { brightness: 0.72, contrast: 1.3, saturate: 0.72 },
  night: { brightness: 1.26, contrast: 1.05, saturate: 1 },
};
const filterOf = ({ brightness, contrast, saturate }, blur) =>
  `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})${blur > 0 ? ` blur(${blur.toFixed(2)}px)` : ''}`;

/** Lente activa según el zoom (sistema triple del X1, ver products.js). */
function lensFor(zoom) {
  if (zoom < 0.995) return { id: 'ultra', name: 'Gran angular', hud: 'Gran angular', aperture: 'ƒ/2,2', iso: [6400, 1600], shutter: ['1/30 s', '2 s'] };
  if (zoom < 4.995) {
    const crop = zoom >= 1.995;
    return { id: 'main', name: crop ? 'Principal (recorte)' : 'Principal', hud: crop ? 'Principal · recorte 50 MP' : 'Principal', aperture: 'ƒ/1,6', iso: [3200, 800], shutter: ['1/30 s', '1,5 s'] };
  }
  const hybrid = zoom > 5.05;
  return { id: 'tele', name: hybrid ? 'Tele (híbrido)' : 'Teleobjetivo', hud: hybrid ? 'Teleobjetivo · híbrido' : 'Teleobjetivo 5×', aperture: 'ƒ/3,2', iso: [6400, 1600], shutter: ['1/25 s', '1 s'] };
}

/** Tesela de grano (ruido) generada una vez; se usa como fondo CSS animado. */
function grainTile(size = 140) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.random() * 255;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 20 + Math.random() * 60;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function createCameraDemo({ root, reducedMotion }) {
  const frame = root.querySelector('[data-vf-frame]');
  const stdCanvas = root.querySelector('[data-vf-standard]');
  const nightLayer = root.querySelector('[data-vf-night]');
  const nightCanvas = root.querySelector('[data-vf-night-canvas]');
  const grain = root.querySelector('.viewfinder__grain');
  const divider = root.querySelector('[data-vf-divider]');
  const hudLens = root.querySelector('[data-hud-lens]');
  const hudZoom = root.querySelector('[data-hud-zoom]');
  const reticle = root.querySelector('[data-hud-reticle]');
  const levelsEl = root.querySelector('[data-zoom-levels]');
  const zoomRange = root.querySelector('[data-zoom-range]');
  const modes = root.querySelector('[data-light-modes]');
  const compareControl = root.querySelector('[data-compare-control]');
  const compareRange = root.querySelector('[data-compare-range]');
  const histogramCanvas = root.querySelector('[data-histogram]');
  const statusEl = root.querySelector('[data-camera-status]');
  const readout = Object.fromEntries([...root.querySelectorAll('[data-readout]')].map((el) => [el.dataset.readout, el]));

  const scene = createCameraScene();
  const stdCtx = stdCanvas.getContext('2d');
  const nightCtx = nightCanvas.getContext('2d');
  const sample = document.createElement('canvas'); // copia diminuta para el histograma
  sample.width = 96;
  sample.height = 60;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });

  const state = { zoom: 1, target: 1, mode: 'standard', split: 50 };
  const shown = { iso: 3200 }; // valor animado del ISO en la lectura
  let lens = null;
  let visible = false;
  let dirty = true;
  let frameId = 0;
  let zoomTween = null;
  let isoTween = null;
  let settleTimer = 0;
  let statusTimer = 0;
  let dragging = null;

  root.classList.add('has-camera-demo');
  grain.style.backgroundImage = `url(${grainTile()})`;

  /* Niveles de zoom: radios nativos (las flechas del teclado ya se mueven entre ellos) */
  const levelInputs = LEVELS.map((level) => {
    const label = document.createElement('label');
    label.className = 'zoom-level';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'bunema-zoom';
    input.value = String(level);
    input.className = 'visually-hidden';
    const text = document.createElement('span');
    text.textContent = level < 1 ? '0,5×' : `${level}×`;
    label.append(input, text);
    levelsEl.append(label);
    return input;
  });

  /* Dibujo ---------------------------------------------------------------- */

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(frame.clientWidth * dpr);
    const h = Math.round(frame.clientHeight * dpr);
    if (!w || !h) return;
    if (stdCanvas.width !== w || stdCanvas.height !== h) {
      stdCanvas.width = nightCanvas.width = w;
      stdCanvas.height = nightCanvas.height = h;
      dirty = true;
      schedule();
    }
    const hRect = histogramCanvas.getBoundingClientRect();
    histogramCanvas.width = Math.round(hRect.width * dpr) || 160;
    histogramCanvas.height = Math.round(hRect.height * dpr) || 48;
  }

  /** Vista del mundo para un zoom: a 0,5× cabe la escena entera; al acercarse, el centro viaja hacia la torre. */
  function viewFor(zoom, width, height) {
    const aspect = width / height;
    const fullWidth = Math.min(WORLD.width, WORLD.height * aspect);
    const viewW = (fullWidth * MIN_ZOOM) / zoom;
    const viewH = viewW / aspect;
    const k = clamp(zoomToT(zoom) / zoomToT(2), 0, 1);
    const ease = k * k * (3 - 2 * k);
    const cx = clamp(REST.x + (FOCUS.x - REST.x) * ease, viewW / 2, WORLD.width - viewW / 2);
    const cy = clamp(REST.y + (FOCUS.y - REST.y) * ease, viewH / 2, WORLD.height - viewH / 2);
    return { cx, cy, scale: width / viewW, width, height };
  }

  function draw() {
    frameId = 0;
    if (!visible) return;
    const { width, height } = stdCanvas;
    if (!width) return;
    scene.draw(stdCtx, viewFor(state.zoom, width, height));
    nightCtx.drawImage(stdCanvas, 0, 0); // misma imagen; solo cambia el filtro de su capa
    dirty = false;
  }

  function schedule() {
    if (!frameId && visible) frameId = requestAnimationFrame(draw);
  }

  /* Histograma --------------------------------------------------------------- */

  function histogram(look) {
    const { data } = sampleCtx.getImageData(0, 0, sample.width, sample.height);
    const bins = new Array(32).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      // Luminancia (Rec. 709) y el mismo brillo/contraste que aplica el filtro CSS de esa capa.
      const y = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const v = clamp((y * look.brightness - 0.5) * look.contrast + 0.5, 0, 1);
      bins[Math.min(31, Math.floor(v * 32))] += 1;
    }
    return bins;
  }

  function drawHistogram() {
    if (dirty) draw(); // el histograma se calcula siempre sobre la imagen ya dibujada
    if (dirty || !stdCanvas.width) return;
    sampleCtx.drawImage(stdCanvas, 0, 0, sample.width, sample.height);
    const ctx = histogramCanvas.getContext('2d');
    const { width: w, height: h } = histogramCanvas;
    ctx.clearRect(0, 0, w, h);
    const series = state.mode === 'compare' ? ['standard', 'night'] : [state.mode];
    series.forEach((mode) => {
      const bins = histogram(LOOKS[mode]);
      // Raíz cuadrada: los picos de negro no aplastan el resto de la curva.
      const peak = Math.sqrt(Math.max(...bins)) || 1;
      ctx.fillStyle = mode === 'night' ? 'rgba(47,107,255,0.75)' : 'rgba(146,152,170,0.55)';
      const bw = w / bins.length;
      bins.forEach((count, i) => {
        const bh = (Math.sqrt(count) / peak) * h;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      });
    });
  }

  /* Interfaz -------------------------------------------------------------- */

  function updateLook() {
    // A partir de 5× la parte "híbrida" del zoom suaviza un poco la imagen.
    const blur = state.zoom > 5 ? ((state.zoom - 5) / 5) * 0.6 : 0;
    stdCanvas.style.filter = filterOf(LOOKS.standard, blur);
    nightCanvas.style.filter = filterOf(LOOKS.night, blur);
    // El grano crece con el zoom digital.
    grain.style.opacity = (0.22 + clamp((state.zoom - 1) / 9, 0, 1) * 0.28).toFixed(2);
    const reveal = state.mode === 'night' ? 0 : state.mode === 'standard' ? 100 : state.split;
    nightLayer.style.clipPath = `inset(0 0 0 ${reveal}%)`;
    divider.style.left = `${state.split}%`;
  }

  function updateReadout() {
    const next = lensFor(state.zoom);
    const lensChanged = !lens || next.id !== lens.id || next.hud !== lens.hud;
    lens = next;
    hudZoom.textContent = formatZoom(state.zoom);
    readout.focal.textContent = `${Math.round(24 * state.zoom)} mm`;
    if (lensChanged) {
      hudLens.textContent = `${lens.hud}`;
      readout.lens.textContent = lens.name;
      readout.aperture.textContent = lens.aperture;
      hudLens.classList.remove('is-switching');
      void hudLens.offsetWidth; // reinicia la animación del cambio de lente
      hudLens.classList.add('is-switching');
    }
    const night = state.mode === 'night';
    const compare = state.mode === 'compare';
    const [isoStd, isoNight] = lens.iso;
    readout.shutter.textContent = compare ? `${lens.shutter[0]} → ${lens.shutter[1]}` : lens.shutter[night ? 1 : 0];
    readout.noise.textContent = compare ? 'Alto → Bajo' : night ? 'Bajo' : 'Alto';
    if (compare) {
      isoTween?.kill();
      readout.iso.textContent = `${isoStd} → ${isoNight}`;
      shown.iso = isoNight;
      return;
    }
    const isoTarget = night ? isoNight : isoStd;
    if (shown.iso === isoTarget && readout.iso.textContent === String(isoTarget)) return;
    isoTween?.kill();
    if (reducedMotion) {
      shown.iso = isoTarget;
      readout.iso.textContent = String(isoTarget);
      return;
    }
    // El número "cuenta" hasta su nuevo valor: indicador técnico animado.
    isoTween = gsap.to(shown, {
      iso: isoTarget,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        readout.iso.textContent = String(Math.round(shown.iso / 50) * 50);
      },
    });
  }

  function syncControls() {
    const t = zoomToT(state.zoom);
    zoomRange.value = String(Math.round(t * 1000));
    zoomRange.setAttribute('aria-valuetext', formatZoom(state.zoom));
    levelInputs.forEach((input) => {
      input.checked = Math.abs(Number(input.value) - state.zoom) < 0.02;
    });
  }

  function announce() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      const mode = { standard: 'iluminación estándar', night: 'modo noche', compare: 'comparación estándar y modo noche' }[state.mode];
      // Se anuncia el destino (la animación del zoom puede no haber terminado).
      statusEl.textContent = `Zoom ${formatZoom(state.target)}, ${lensFor(state.target).name.toLowerCase()}, ${mode}.`;
    }, 450);
  }

  /** Tras cada cambio: el retículo "enfoca" y el histograma se recalcula sobre la imagen ya dibujada. */
  function settle() {
    clearTimeout(settleTimer);
    reticle.classList.remove('is-locked');
    settleTimer = setTimeout(() => {
      drawHistogram();
      void reticle.offsetWidth;
      reticle.classList.add('is-locked');
    }, 160);
  }

  function setZoom(zoom, { animate = true } = {}) {
    state.target = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    zoomTween?.kill();
    const apply = () => {
      dirty = true;
      updateLook();
      updateReadout();
      schedule();
    };
    if (!animate || reducedMotion) {
      state.zoom = state.target;
      apply();
      syncControls();
    } else {
      zoomTween = gsap.to(state, {
        zoom: state.target,
        duration: 0.65,
        ease: 'power3.out',
        onUpdate: apply,
        onComplete: syncControls,
      });
      // Los radios reflejan el destino ya (respuesta inmediata al pulsar).
      levelInputs.forEach((input) => {
        input.checked = Math.abs(Number(input.value) - state.target) < 0.02;
      });
    }
    settle();
    announce();
  }

  function setMode(mode) {
    state.mode = mode;
    compareControl.hidden = mode !== 'compare';
    root.classList.toggle('is-compare', mode === 'compare');
    updateLook();
    updateReadout();
    drawHistogram();
    announce();
  }

  function setSplit(percent) {
    state.split = clamp(percent, 0, 100);
    compareRange.value = String(Math.round(state.split));
    compareRange.setAttribute('aria-valuetext', `${Math.round(state.split)} % estándar`);
    updateLook();
  }

  /* Eventos ----------------------------------------------------------------- */

  const onLevel = (event) => {
    if (event.target.name === 'bunema-zoom') setZoom(Number(event.target.value));
  };
  const onRange = () => setZoom(tToZoom(Number(zoomRange.value) / 1000), { animate: false });
  const onMode = (event) => {
    if (event.target.name === 'bunema-light') setMode(event.target.value);
  };
  const onCompareRange = () => setSplit(Number(compareRange.value));

  // En modo comparar, arrastrar sobre el visor mueve el divisor (el gesto vertical sigue desplazando la página).
  const splitFromPointer = (event) => {
    const rect = frame.getBoundingClientRect();
    setSplit(((event.clientX - rect.left) / rect.width) * 100);
  };
  const onPointerDown = (event) => {
    if (state.mode !== 'compare' || event.button !== 0) return;
    dragging = event.pointerId;
    frame.setPointerCapture(event.pointerId);
    frame.classList.add('is-dragging');
    splitFromPointer(event);
  };
  const onPointerMove = (event) => {
    if (event.pointerId === dragging) splitFromPointer(event);
  };
  const onPointerUp = (event) => {
    if (event.pointerId !== dragging) return;
    dragging = null;
    frame.classList.remove('is-dragging');
  };

  levelsEl.addEventListener('change', onLevel);
  zoomRange.addEventListener('input', onRange);
  modes.addEventListener('change', onMode);
  compareRange.addEventListener('input', onCompareRange);
  frame.addEventListener('pointerdown', onPointerDown);
  frame.addEventListener('pointermove', onPointerMove);
  frame.addEventListener('pointerup', onPointerUp);
  frame.addEventListener('pointercancel', onPointerUp);

  // Solo se dibuja (y el grano solo se anima) mientras la sección está en pantalla.
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    root.classList.toggle('is-live', visible);
    if (visible && dirty) {
      schedule();
      settle();
    }
  });
  visibility.observe(frame);
  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (visible) settle();
  });
  resizeObserver.observe(frame);

  resize();
  setSplit(50);
  setMode('standard');
  setZoom(1, { animate: false });
  clearTimeout(statusTimer); // sin anuncio para lectores de pantalla al cargar la página

  return {
    get state() {
      const { zoom, target, mode, split } = state;
      return { zoom, target, mode, split, lens: lens.id, dirty, iso: readout.iso.textContent };
    },
    dispose() {
      zoomTween?.kill();
      isoTween?.kill();
      cancelAnimationFrame(frameId);
      clearTimeout(settleTimer);
      clearTimeout(statusTimer);
      visibility.disconnect();
      resizeObserver.disconnect();
      levelsEl.removeEventListener('change', onLevel);
      zoomRange.removeEventListener('input', onRange);
      modes.removeEventListener('change', onMode);
      compareRange.removeEventListener('input', onCompareRange);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', onPointerUp);
      frame.removeEventListener('pointercancel', onPointerUp);
      levelsEl.replaceChildren();
      root.classList.remove('has-camera-demo', 'is-live', 'is-compare');
    },
  };
}
