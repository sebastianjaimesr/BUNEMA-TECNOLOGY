import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createContactShadow } from '../scene/contactShadow.js';
import { createHeroMotion } from './heroMotion.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Presentación del Bunema X1 en el hero.
 *
 * Jerarquía de objetos:
 *   stage  → posición y escala según el tamaño de pantalla (composición)
 *   └ pivot → pose de exhibición + desplazamientos de animación
 *     └ phone.root
 *   └ sombra de contacto
 *
 * Separar "dónde está" (stage) de "cómo gira" (pivot) evita que el
 * responsive y las animaciones se pisen entre sí.
 */

// Pose de exhibición: tres cuartos trasero, ligeramente inclinado.
const POSE = { x: -0.18, y: Math.PI - 0.62, z: 0.2 };

export function createHeroPresentation({ sceneManager, phone, heroEl, reducedMotion, quality }) {
  const { scene } = sceneManager;
  const stage = new THREE.Group();
  const pivot = new THREE.Group();
  stage.name = 'hero-stage';
  pivot.add(phone.root);
  stage.add(pivot);

  const shadow = createContactShadow();
  stage.add(shadow.mesh);
  scene.add(stage);

  // Valores que animan GSAP y el scroll. `reveal` va de 0 (oculto) a 1 (en reposo).
  const motion = { reveal: reducedMotion ? 1 : 0, exit: 0 };
  const base = { x: 0, y: 0, scale: 1, travel: 0 };
  /**
   * Capas de pose que imponen otras secciones, en orden: ingeniería y luego configurador.
   * Cada capa tiene su `blend` (0 = no influye, 1 = manda por completo) y se mezcla sobre
   * el resultado de la anterior. Así cada sección solo conoce su propia pose.
   */
  const LAYER_ORDER = ['story', 'config'];
  const layers = Object.fromEntries(
    LAYER_ORDER.map((name) => [name, { blend: 0, x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0 }]),
  );
  const pose = { x: 0, y: 0, scale: 1, rx: 0, ry: 0, rz: 0 };
  // Cuánto atenúa cada capa las luces de contorno (azul, violeta). En el despiece la carcasa
  // queda de frente a ellas y se teñiría de violeta; en el configurador el color debe verse fiel.
  const RIM_DIM = { story: { blue: 0.35, violet: 0.8 }, config: { blue: 0.6, violet: 0.7 } };
  const { rims } = sceneManager.lighting;
  const rimBase = { blue: rims.blue.intensity, violet: rims.violet.intensity };
  const TAU = Math.PI * 2;
  // Diferencia angular más corta (−π..π): una capa con varias vueltas acumuladas no hace girar de más al mezclar.
  const shortest = (from, to) => from + ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  const accent = phone.materialLibrary.materials.accent;
  const accentIntensity = accent.emissiveIntensity;

  // Capa de movimiento vivo (cursor, flotación, arrastre). Se suma a la pose en apply().
  const live = createHeroMotion({
    sceneManager,
    heroEl,
    dragEl: heroEl,
    reducedMotion,
    coarsePointer: quality.coarsePointer,
    onUpdate: () => apply(false), // ya estamos dentro de un fotograma: no pedir otro
  });

  /**
   * Aplica TODO el estado (entrada + salida por scroll + movimiento vivo)
   * a los objetos 3D. Es el único lugar que escribe sus transformaciones.
   */
  function apply(request = true) {
    const hidden = 1 - motion.reveal;
    const l = live.state;

    // 1. Pose propia del hero (entrada + salida por scroll).
    pose.rx = POSE.x + motion.exit * 0.25;
    pose.ry = POSE.y - hidden * 0.9 + motion.exit * 0.7;
    pose.rz = POSE.z - hidden * 0.12;
    pose.x = base.x + l.shiftX;
    pose.y = base.y + motion.exit * base.travel;
    pose.scale = base.scale * (0.92 + motion.reveal * 0.08);

    // 2. Capas de las secciones, una sobre otra.
    let presence = 0; // cuánto mandan las secciones en conjunto (0..1)
    let rimBlue = rimBase.blue;
    let rimViolet = rimBase.violet;
    LAYER_ORDER.forEach((name) => {
      const layer = layers[name];
      const t = layer.blend;
      if (t <= 0) return;
      rimBlue *= 1 - RIM_DIM[name].blue * t;
      rimViolet *= 1 - RIM_DIM[name].violet * t;
      pose.rx += (layer.rx - pose.rx) * t;
      pose.ry += (shortest(pose.ry, layer.ry) - pose.ry) * t;
      pose.rz += (layer.rz - pose.rz) * t;
      pose.x += (layer.x - pose.x) * t;
      pose.y += (layer.y - pose.y) * t;
      pose.scale += (layer.scale - pose.scale) * t;
      presence = 1 - (1 - presence) * (1 - t);
    });

    rims.blue.intensity = rimBlue;
    rims.violet.intensity = rimViolet;
    // Con una sección al mando, la flotación no se ve: su bucle deja de pedir fotogramas.
    live.setIdle(presence > 0.999);

    // 3. Movimiento vivo encima: se atenúa en las secciones, que necesitan precisión.
    const liveAmount = 1 - presence * 0.75;
    pivot.rotation.set(pose.rx + l.tiltX * liveAmount, pose.ry + (l.tiltY + l.sway) * liveAmount, pose.rz);
    pivot.position.y = -hidden * 2.4 + l.floatY * (1 - presence);
    stage.position.set(pose.x, pose.y, 0);
    stage.scale.setScalar(pose.scale);
    // La sombra responde a la flotación: más arriba, más pequeña y tenue. En las secciones desaparece.
    shadow.mesh.scale.setScalar(1 - l.floatY * 0.35);
    shadow.mesh.material.opacity = motion.reveal * (1 - motion.exit) * (1 - l.floatY * 0.6) * (1 - presence);
    if (request) sceneManager.requestRender();
  }

  const slot = heroEl.querySelector('[data-stage-slot]');

  /**
   * Composición responsive: decide tamaño y posición del teléfono.
   *  - Móvil/tablet vertical: el teléfono ocupa el hueco `[data-stage-slot]`
   *    del flujo HTML y se desplaza exactamente con el contenido.
   *  - Escritorio: posición fija a la derecha con un parallax moderado.
   * Conversión clave: píxeles CSS → unidades de mundo = px / alto del viewport × alto visible.
   */
  function layout({ width, height, view }) {
    const { height: phoneH } = phone.dimensions;
    const pxToWorld = view.height / height;
    const heroHeight = heroEl.offsetHeight;
    const slotRect = slot?.getBoundingClientRect();
    const useSlot = slotRect && slotRect.height > 0;

    let targetH;
    if (useSlot) {
      // Posición del hueco relativa al hero (no depende del scroll actual).
      const top = slotRect.top - heroEl.getBoundingClientRect().top;
      const centerPx = top + slotRect.height / 2;
      targetH = slotRect.height * 0.9 * pxToWorld;
      base.x = 0;
      base.y = (height / 2 - centerPx) * pxToWorld;
      base.travel = heroHeight * pxToWorld; // acompaña al contenido 1:1
    } else {
      targetH = view.height * (width < 1200 ? 0.64 : 0.7);
      base.x = view.width * (width < 1200 ? 0.17 : 0.13);
      base.y = view.height * 0.01;
      base.travel = heroHeight * pxToWorld * 0.35; // parallax: más lento que el contenido
    }
    base.scale = targetH / phoneH;
    // La sombra se coloca bajo el teléfono, en coordenadas locales del stage.
    shadow.mesh.position.set(0, -phoneH * 0.56, -1);
    // El fondo CSS (halo, monograma, retícula) se centra donde está el teléfono.
    heroEl.style.setProperty('--stage-x', `${50 + (base.x / view.width) * 100}%`);
    heroEl.style.setProperty('--stage-y', `${50 - (base.y / view.height) * 100}%`);
    apply();
  }

  const relayout = () =>
    layout({
      width: sceneManager.canvas.clientWidth,
      height: sceneManager.canvas.clientHeight,
      view: sceneManager.viewSizeAt(),
    });

  const offResize = sceneManager.onResize(layout);
  // El hero puede cambiar de alto sin que cambie la ventana (fuentes, rotación): se recalcula.
  const heroObserver = new ResizeObserver(relayout);
  heroObserver.observe(heroEl);
  relayout();

  // Transición hacia la siguiente sección: el teléfono gira y sube mientras
  // la sección siguiente (con fondo opaco) lo cubre como un telón.
  const exitTween = reducedMotion
    ? null
    : gsap.to(motion, {
        exit: 1,
        ease: 'none',
        onUpdate: apply,
        scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

  // El hero es una de las regiones donde el 3D está activo.
  const offRegion = sceneManager.observeRegion(heroEl);

  let revealTimeline = null;
  if (!reducedMotion) accent.emissiveIntensity = 0;

  /**
   * Entrada del producto: sube girando desde abajo y, al asentarse,
   * la línea de luz y la Pulse Key "se encienden". Después arranca el
   * movimiento vivo. No bloquea la interacción: la página ya es navegable.
   */
  function reveal() {
    if (reducedMotion) {
      apply();
      live.start();
      return;
    }
    revealTimeline = gsap
      .timeline({ onUpdate: apply })
      .to(motion, { reveal: 1, duration: 2.1, ease: 'expo.out' }, 0)
      .to(accent, { emissiveIntensity: accentIntensity, duration: 0.9, ease: 'power2.out' }, 0.8)
      .call(live.start, null, 0.6);
  }

  /** Una sección escribe aquí su pose (`'story'` o `'config'`); apply() la mezcla con la del hero. */
  function setLayer(name, values, request = true) {
    Object.assign(layers[name], values);
    apply(request);
  }

  return {
    stage,
    reveal,
    setLayer,
    get baseScale() {
      return base.scale;
    },
    dispose() {
      revealTimeline?.kill();
      live.dispose();
      accent.emissiveIntensity = accentIntensity;
      rims.blue.intensity = rimBase.blue;
      rims.violet.intensity = rimBase.violet;
      exitTween?.scrollTrigger?.kill();
      exitTween?.kill();
      offRegion();
      heroObserver.disconnect();
      offResize();
      heroEl.style.removeProperty('--stage-x');
      heroEl.style.removeProperty('--stage-y');
      shadow.dispose();
      stage.removeFromParent();
    },
  };
}
