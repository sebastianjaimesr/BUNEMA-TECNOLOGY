/**
 * Herramienta interna (solo en desarrollo): dibuja cada iPhone con el mismo
 * modelo 3D del sitio y devuelve una imagen WebP recortada con fondo
 * transparente. La usa scripts/render-phones.mjs.
 */
import * as THREE from 'three';
import { IPHONES } from '../src/data/iphones.js';
import { PhoneViewer } from '../src/three/PhoneViewer.js';

const stage = document.getElementById('stage');
const viewer = new PhoneViewer(stage, { interactive: false, shadow: false, preserveDrawingBuffer: true, fov: 12, distance: 100 });
viewer.renderer.setPixelRatio(1);
viewer.renderer.setSize(900, 1500, false);
viewer.visibilityObserver.disconnect();
const ROT = { front: 0, back: Math.PI, side: Math.PI / 2 };

function crop(canvas, targetH) {
  const w = canvas.width;
  const h = canvas.height;
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const g = tmp.getContext('2d');
  g.drawImage(canvas, 0, 0);
  const data = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const pad = 4;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad);
  y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const scale = targetH / ch;
  const out = document.createElement('canvas');
  out.width = Math.round(cw * scale);
  out.height = targetH;
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(tmp, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return out;
}

window.renderPhone = async (id, colorId, view, targetH = 720, quality = 0.84) => {
  await document.fonts.ready;
  const product = IPHONES.find((p) => p.id === id);
  if (viewer.product?.id !== id) viewer.setProduct(product, colorId);
  else viewer.model.setColor(colorId, { immediate: true });
  const { H } = viewer.model.size;
  viewer.camera.position.set(0, 0, (H * 1.12) / (2 * Math.tan(THREE.MathUtils.degToRad(6))));
  viewer.camera.zoom = 1;
  viewer.camera.aspect = 900 / 1500;
  viewer.camera.updateProjectionMatrix();
  viewer.stage.rotation.set(0, 0, 0);
  viewer.stage.scale.setScalar(1);
  viewer.model.group.rotation.set(0, ROT[view], 0);
  viewer.renderer.render(viewer.scene, viewer.camera);
  return crop(viewer.canvas, targetH).toDataURL('image/webp', quality);
};
window.renderReady = true;
