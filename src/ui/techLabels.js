import * as THREE from 'three';

/**
 * Etiquetas técnicas ancladas a las piezas 3D.
 *
 * Son elementos HTML (texto real, nítido y legible), no texturas dentro
 * del canvas. Tras cada fotograma se proyecta un punto 3D de cada pieza
 * a coordenadas de pantalla con `Vector3.project(camera)`:
 *
 *   x_px = (x_ndc + 1) / 2 · ancho      y_px = (1 − y_ndc) / 2 · alto
 *
 * Composición tipo plano técnico: el punto queda sobre la pieza y la ficha
 * se alinea en una columna a cada lado del despiece. Dentro de cada columna
 * las fichas se separan verticalmente para no solaparse nunca, y un
 * conector une cada punto con su ficha.
 *
 * El texto NO se duplica: se lee de la lista "Arquitectura" del HTML
 * (`[data-part]`), que es la fuente única y además es el contenido
 * accesible e indexable.
 */

// Para algunas piezas, el ancla es un hijo concreto (el centro del grupo caería en el vacío).
const ANCHOR_CHILD = { buttons: 'volume', port: 'usb-c' };
const GAP = 8; // separación mínima entre fichas (px)

/**
 * Centro de la caja de una pieza en coordenadas locales de la propia pieza.
 * Se calcula solo con matrices locales (no con las del mundo): así el
 * resultado no depende de la pose ni del momento en que se llame.
 */
function localCenter(anchor) {
  const bounds = new THREE.Box3();
  const meshBox = new THREE.Box3();
  const toAnchor = new THREE.Matrix4();
  anchor.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry.boundingBox ?? obj.geometry.computeBoundingBox();
    toAnchor.identity();
    for (let node = obj; node && node !== anchor; node = node.parent) {
      node.updateMatrix();
      toAnchor.premultiply(node.matrix);
    }
    bounds.union(meshBox.copy(obj.geometry.boundingBox).applyMatrix4(toAnchor));
  });
  return bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
}

export function createTechLabels({ container, phone, sceneManager, source, getBounds }) {
  const items = [...source.querySelectorAll('[data-part]')];
  const labels = new Map();
  const projected = new THREE.Vector3();

  items.forEach((item) => {
    const key = item.dataset.part;
    const piece = phone.parts[key];
    if (!piece) return;

    const anchor = (ANCHOR_CHILD[key] && piece.getObjectByName(ANCHOR_CHILD[key])) || piece;
    const localOffset = localCenter(anchor);

    const el = document.createElement('div');
    el.className = 'tech-label';
    el.innerHTML = `
      <span class="tech-label__dot"></span>
      <span class="tech-label__line"></span>
      <span class="tech-label__box">
        <span class="tech-label__code"></span>
        <span class="tech-label__name"></span>
        <span class="tech-label__spec"></span>
      </span>`;
    // textContent (no innerHTML) para los textos: nunca se interpreta como HTML.
    el.querySelector('.tech-label__code').textContent = item.querySelector('.parts__id')?.textContent ?? '';
    el.querySelector('.tech-label__name').textContent = item.querySelector('h3')?.textContent ?? '';
    el.querySelector('.tech-label__spec').textContent = item.querySelector('.parts__spec')?.textContent ?? '';
    container.append(el);

    labels.set(key, {
      el,
      line: el.querySelector('.tech-label__line'),
      boxEl: el.querySelector('.tech-label__box'),
      anchor,
      localOffset,
      visible: false,
      side: null,
      w: 0, // medidas de la ficha
      h: 0,
      x: 0, // ancla en pantalla
      y: 0,
      by: 0, // centro vertical de la ficha tras separar
    });
  });

  let visibleList = [];
  let lineLength = 48;

  /** Reparte las fichas de una columna: orden por altura del ancla y sin solapes. */
  function stack(column, top, bottom) {
    column.sort((a, b) => a.y - b.y);
    // Pasada hacia abajo: cada ficha empieza donde termina la anterior.
    let cursor = top;
    column.forEach((l) => {
      l.by = Math.max(l.y, cursor + l.h / 2);
      cursor = l.by + l.h / 2 + GAP;
    });
    // Si la columna se sale por abajo, pasada hacia arriba desde el borde inferior.
    cursor = bottom;
    for (let i = column.length - 1; i >= 0; i -= 1) {
      const l = column[i];
      l.by = Math.min(l.by, cursor - l.h / 2);
      cursor = l.by - l.h / 2 - GAP;
    }
  }

  /** Recoloca las etiquetas visibles. Se llama después de cada fotograma. */
  function update() {
    if (!visibleList.length) return;
    const { camera, canvas } = sceneManager;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    // Las etiquetas se posicionan dentro de su contenedor: se descuenta su posición en pantalla
    // (el panel puede no estar fijado todavía, o desplazarse con movimiento reducido).
    const origin = container.getBoundingClientRect();
    const bounds = getBounds();
    // 1. Proyección de cada ancla.
    visibleList.forEach((l) => {
      projected.copy(l.localOffset);
      l.anchor.localToWorld(projected).project(camera);
      l.x = ((projected.x + 1) / 2) * w - origin.left;
      l.y = ((1 - projected.y) / 2) * h - origin.top;
    });
    // Lado de cada ficha. Con pocas, según quede la pieza respecto al centro del conjunto;
    // con muchas, mitad y mitad por orden horizontal para equilibrar las dos columnas.
    let left;
    let right;
    if (visibleList.length <= 3) {
      phone.root.getWorldPosition(projected).project(camera);
      const centerX = ((projected.x + 1) / 2) * w - origin.left;
      left = visibleList.filter((l) => l.x < centerX);
      right = visibleList.filter((l) => l.x >= centerX);
    } else {
      const byX = [...visibleList].sort((a, b) => a.x - b.x);
      left = byX.slice(0, Math.floor(byX.length / 2));
      right = byX.slice(left.length);
    }

    // 2. Una columna por lado, justo fuera del ancla más extrema, sin salir de los límites.
    const columnX = {
      left: Math.max(Math.min(Infinity, ...left.map((l) => l.x)) - lineLength, bounds.left + Math.max(0, ...left.map((l) => l.w))),
      right: Math.min(Math.max(-Infinity, ...right.map((l) => l.x)) + lineLength, bounds.right - Math.max(0, ...right.map((l) => l.w))),
    };
    stack(left, bounds.top, bounds.bottom);
    stack(right, bounds.top, bounds.bottom);

    // 3. Escritura en el DOM: punto en el ancla, ficha en su columna y conector entre ambos.
    [
      ['left', left],
      ['right', right],
    ].forEach(([side, column]) => {
      column.forEach((l) => {
        const dx = columnX[side] - l.x;
        const dy = l.by - l.y;
        l.el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
        l.boxEl.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        l.line.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
        l.line.style.rotate = `${Math.atan2(dy, dx).toFixed(4)}rad`;
        if (side !== l.side) {
          l.side = side;
          l.el.classList.toggle('is-left', side === 'left');
        }
      });
    });
  }

  const offAfterRender = sceneManager.onAfterRender(update);

  return {
    /**
     * @param {Set<string>|'all'} keys  piezas cuya etiqueta se muestra
     * @param {{ compact?: boolean, line?: number }} options  compact: solo identificador; line: largo mínimo del conector
     */
    show(keys, { compact = false, line = 48 } = {}) {
      lineLength = line;
      visibleList = [];
      labels.forEach((label, key) => {
        const visible = keys === 'all' || keys.has(key);
        if (visible !== label.visible) {
          label.visible = visible;
          label.el.classList.toggle('is-visible', visible);
        }
        label.el.classList.toggle('is-compact', compact);
        if (visible) visibleList.push(label);
      });
      // Medidas de las fichas (con visibility: hidden siguen ocupando caja, así que se pueden medir).
      visibleList.forEach((label) => {
        label.w = label.boxEl.offsetWidth;
        label.h = label.boxEl.offsetHeight;
      });
      update();
    },
    dispose() {
      offAfterRender();
      labels.forEach(({ el }) => el.remove());
      labels.clear();
      visibleList = [];
    },
  };
}
