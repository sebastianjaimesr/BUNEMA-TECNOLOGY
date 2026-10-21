import * as THREE from 'three';
import { createPhoneTextures } from './phoneTextures.js';
import { createPhoneMaterials } from './PhoneMaterials.js';
import {
  DIM,
  createFrame,
  createFrontGlass,
  createDisplay,
  createBackCover,
  createCameraModule,
  createLenses,
  createBattery,
  createMainboard,
  createProcessor,
  createButtons,
  createPort,
} from './PhoneParts.js';

/**
 * Bunema X1: ensambla las piezas y expone una API pequeña.
 *
 *   const phone = new BunemaPhone({ anisotropy: 8 });
 *   scene.add(phone.root);
 *   phone.parts.battery.position.z -= 2; // mover una pieza concreta
 *
 * Responsabilidades separadas:
 *  - PhoneParts.js     → geometría de cada pieza.
 *  - PhoneMaterials.js → materiales compartidos.
 *  - BunemaPhone.js    → ensamblaje, registro de piezas y limpieza.
 *  - La animación vive fuera (carpeta animations/).
 */
export class BunemaPhone {
  /** Orden de montaje, de la cara frontal a la trasera. Se usará como guion del despiece. */
  static PART_ORDER = [
    'frontGlass',
    'display',
    'frame',
    'battery',
    'mainboard',
    'processor',
    'cameraModule',
    'lenses',
    'backCover',
    'buttons',
    'port',
  ];

  constructor({ anisotropy = 4 } = {}) {
    this.textures = createPhoneTextures({ anisotropy });
    this.materialLibrary = createPhoneMaterials(this.textures);
    const mat = this.materialLibrary.materials;

    this.root = new THREE.Group();
    this.root.name = 'BunemaX1';

    this.parts = {
      frontGlass: createFrontGlass(mat),
      display: createDisplay(mat),
      frame: createFrame(mat),
      battery: createBattery(mat),
      mainboard: createMainboard(mat),
      processor: createProcessor(mat),
      cameraModule: createCameraModule(mat),
      lenses: createLenses(mat),
      backCover: createBackCover(mat),
      buttons: createButtons(mat),
      port: createPort(mat),
    };

    BunemaPhone.PART_ORDER.forEach((key) => {
      const piece = this.parts[key];
      // Guardamos la pose de reposo: el despiece siempre podrá volver exactamente aquí.
      piece.userData.rest = {
        position: piece.position.clone(),
        quaternion: piece.quaternion.clone(),
      };
      this.root.add(piece);
    });
  }

  get dimensions() {
    return DIM;
  }

  /** Libera geometrías, materiales y texturas de la GPU. */
  dispose() {
    const geometries = new Set();
    this.root.traverse((obj) => {
      if (obj.isMesh) geometries.add(obj.geometry);
    });
    geometries.forEach((g) => g.dispose());
    this.materialLibrary.dispose();
    this.root.removeFromParent();
  }
}
