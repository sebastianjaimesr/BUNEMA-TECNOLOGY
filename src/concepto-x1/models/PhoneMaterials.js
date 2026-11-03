import * as THREE from 'three';
import { BUNEMA_X1, findColorway, findFinish } from '../data/products.js';

/**
 * Biblioteca de materiales del Bunema X1.
 *
 * Todas las piezas comparten estas instancias. Compartir materiales
 * reduce cambios de estado en la GPU y, sobre todo, permite que el
 * configurador cambie color o acabado modificando unas pocas
 * propiedades (p. ej. `materials.back.color`) sin reconstruir la escena:
 * cada pieza que usa ese material cambia a la vez.
 *
 * Regla de diseño: `MeshPhysicalMaterial` solo donde aporta algo
 * (clearcoat del vidrio, iridiscencia de las lentes). Para piezas
 * internas basta `MeshStandardMaterial`, que es más barato.
 */
export function createPhoneMaterials(textures) {
  const colorway = findColorway(BUNEMA_X1.defaultColorway);
  const finish = findFinish(BUNEMA_X1.defaultFinish);

  const materials = {
    // Marco: aluminio anodizado. metalness 1 + roughness media = reflejo satinado.
    frame: new THREE.MeshPhysicalMaterial({
      name: 'frame',
      color: colorway.frame,
      metalness: 1,
      roughness: finish.frameRoughness,
      clearcoat: 0.25,
      clearcoatRoughness: 0.2,
    }),
    // Carcasa trasera de vidrio: el acabado mate/brillante vive en roughness + clearcoat.
    back: new THREE.MeshPhysicalMaterial({
      name: 'back',
      color: colorway.body,
      metalness: 0.15,
      roughness: finish.roughness,
      clearcoat: finish.clearcoat,
      clearcoatRoughness: finish.clearcoatRoughness,
    }),
    // Placa de la cámara: un tono más profundo que la carcasa, siempre satinada.
    plate: new THREE.MeshPhysicalMaterial({
      name: 'plate',
      color: colorway.plate,
      metalness: 0.6,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
    // Vidrio frontal: transparente para que se vea la pantalla, con clearcoat para el brillo.
    frontGlass: new THREE.MeshPhysicalMaterial({
      name: 'frontGlass',
      color: '#0a0c12',
      metalness: 0,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
    // La pantalla es "emisiva": MeshBasicMaterial no reacciona a la luz, como un panel encendido.
    display: new THREE.MeshBasicMaterial({ name: 'display', map: textures.display }),
    displayPanel: new THREE.MeshStandardMaterial({ name: 'displayPanel', color: '#050608', roughness: 0.5 }),
    // Lentes: la iridiscencia imita el recubrimiento antirreflejo de una óptica real.
    lens: new THREE.MeshPhysicalMaterial({
      name: 'lens',
      color: '#05070d',
      metalness: 0.2,
      roughness: 0.02,
      clearcoat: 1,
      clearcoatRoughness: 0,
      iridescence: 1,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [260, 620],
    }),
    // Logotipo: metálico y semitransparente, como un grabado sobre el vidrio.
    logo: new THREE.MeshStandardMaterial({
      name: 'logo',
      map: textures.backLogo,
      color: colorway.logo,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
    metalDark: new THREE.MeshStandardMaterial({ name: 'metalDark', color: '#2a2d35', metalness: 1, roughness: 0.28 }),
    housing: new THREE.MeshStandardMaterial({ name: 'housing', color: '#14161b', metalness: 0.5, roughness: 0.5 }),
    battery: new THREE.MeshStandardMaterial({ name: 'battery', color: '#22252d', metalness: 0.55, roughness: 0.42 }),
    batteryLabel: new THREE.MeshStandardMaterial({ name: 'batteryLabel', map: textures.batteryLabel, roughness: 0.6 }),
    circuit: new THREE.MeshStandardMaterial({ name: 'circuit', map: textures.circuit, metalness: 0.3, roughness: 0.55 }),
    pcbEdge: new THREE.MeshStandardMaterial({ name: 'pcbEdge', color: '#0a1222', roughness: 0.6 }),
    chip: new THREE.MeshStandardMaterial({ name: 'chip', color: '#8d939f', metalness: 1, roughness: 0.32 }),
    chipLabel: new THREE.MeshStandardMaterial({ name: 'chipLabel', map: textures.chipLabel, metalness: 0.8, roughness: 0.35 }),
    component: new THREE.MeshStandardMaterial({ name: 'component', color: '#1a1d24', metalness: 0.7, roughness: 0.35 }),
    // Acento de marca: la "Pulse Key" y la línea de luz de la placa de cámara.
    accent: new THREE.MeshStandardMaterial({
      name: 'accent',
      color: '#2f6bff',
      emissive: '#2f6bff',
      emissiveIntensity: 1.4,
      metalness: 0.3,
      roughness: 0.3,
    }),
    flash: new THREE.MeshStandardMaterial({
      name: 'flash',
      color: '#e9e4d6',
      emissive: '#fff4dc',
      emissiveIntensity: 0.25,
      roughness: 0.35,
    }),
    port: new THREE.MeshStandardMaterial({ name: 'port', color: '#030405', metalness: 0.4, roughness: 0.4 }),
  };

  return {
    materials,
    colorway,
    finish,
    dispose() {
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(textures).forEach((t) => t.dispose());
    },
  };
}
