import type * as T from "three";
import { drawCover, drawIllustration, drawTextPage, loadFonts, loadImage } from "./bookCanvas";

// Escena del libro 3D (modelo de Blender: public/models/libro.glb, ver
// blender/build_book.py) compartida por el libro para hojear (Book3D) y la
// experiencia inmersiva (BookDive). El libro está de pie: lomo en x = 0,
// páginas en el plano XY y la cubierta mirando a +z.

export interface BookPage {
  imageUrl: string | null;
  text: string;
}

export interface BookSceneOptions {
  /** Ilustración de portada (sin texto); sin ella, la del modelo */
  coverUrl?: string | null;
  title?: string;
  kidName?: string;
  /** Primera ilustración (se ve al abrir la portada si no hay `pages`) */
  pageUrl?: string | null;
  /** Páginas del cuento (sin la portada): crea una hoja por página */
  pages?: BookPage[];
  /** Fondo transparente (por defecto) o de color */
  background?: number;
  shadows?: boolean;
}

export const W = 0.19;
const LEAF_W = 0.1875;
const LEAF_H = 0.1878;
const SEGMENTS = 24;
const LEAF_X0 = 0.0004;
const LEAF_Y0 = 0.0011;
/** La página de la derecha, para acercar la cámara hasta llenar la pantalla */
export const RIGHT_PAGE = { x: LEAF_X0 + LEAF_W / 2, y: LEAF_Y0 + LEAF_H / 2, z: 0.002, height: LEAF_H, width: LEAF_W };

/** Hoja j: delante la ilustración de la página j; detrás el texto de la j+1 (o "Fin") */
export interface Leaf {
  hinge: T.Group;
  geom: T.BufferGeometry;
  front: T.MeshStandardMaterial;
  /** Textura de la ilustración (para volver a ella tras mostrar el vídeo) */
  still: T.Texture | null;
  /** 0 = a la derecha, 1 = pasada */
  t: number;
  target: number;
}

export interface BookScene {
  THREE: typeof T;
  renderer: T.WebGLRenderer;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  /** Gira alrededor del centro del libro cerrado */
  pivot: T.Group;
  cover: T.Object3D | undefined;
  leaves: Leaf[];
  /** Coloca la hoja según su `t`, con la curva al pasarla */
  shapeLeaf: (index: number) => void;
  toTexture: (source: HTMLCanvasElement | HTMLImageElement, mirror?: boolean, gltf?: boolean) => T.Texture;
  /** Ajusta el lienzo al tamaño del contenedor */
  resize: () => void;
  dispose: () => void;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Crea la escena dentro de `el` (null si se desmonta mientras carga) */
export async function createBookScene(el: HTMLElement, opts: BookSceneOptions, isDisposed: () => boolean): Promise<BookScene | null> {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  await loadFonts();
  if (isDisposed()) return null;

  const { coverUrl, title, kidName, pageUrl, pages } = opts;
  const reading = Boolean(pages?.length);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.background === undefined });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (opts.shadows !== false) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  el.prepend(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  if (opts.background !== undefined) scene.background = new THREE.Color(opts.background);
  const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.01, 10);

  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xe9dccb, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-0.4, 0.8, 0.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -0.4;
  sun.shadow.camera.right = sun.shadow.camera.top = 0.4;
  sun.shadow.radius = 6;
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gltf = await new GLTFLoader().loadAsync("/models/libro.glb");
  if (isDisposed()) {
    renderer.dispose();
    renderer.domElement.remove();
    return null;
  }
  const book = gltf.scene;
  const pivot = new THREE.Group();
  book.position.set(-W / 2, 0, 0);
  pivot.position.set(W / 2, 0, 0);
  pivot.add(book);
  scene.add(pivot);
  book.traverse((o) => {
    const mesh = o as T.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  const cover = book.getObjectByName("portada");
  const firstPage = book.getObjectByName("primera_pagina");

  const toTexture = (source: HTMLCanvasElement | HTMLImageElement, mirror = false, fromGltf = true) => {
    const tex = new THREE.Texture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = !fromGltf; // glTF no voltea; las hojas creadas aquí (PlaneGeometry) sí
    tex.anisotropy = maxAniso;
    if (mirror) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.x = -1;
      tex.offset.x = 1;
    }
    tex.needsUpdate = true;
    return tex;
  };
  const setMap = (materialName: string, source: HTMLCanvasElement | HTMLImageElement) => {
    book.traverse((o) => {
      const mesh = o as T.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const mat = m as T.MeshStandardMaterial;
        if (mat.name !== materialName) continue;
        mat.map = toTexture(source);
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      }
    });
  };
  if (coverUrl) drawCover(coverUrl, title, kidName).then((c) => !isDisposed() && setMap("portada", c)).catch(() => undefined);
  if (pageUrl && !reading) loadImage(pageUrl).then((img) => !isDisposed() && setMap("pagina", img)).catch(() => undefined);

  // ── Hojas ─────────────────────────────────────────────────────
  // El interior de la portada lleva el texto de la página 1.
  const leaves: Leaf[] = [];
  const T_HALF = 0.0018; // mitad del bloque de páginas (como en el modelo)
  const EPS = 0.00009;
  // Montón de la derecha: justo bajo la cara interior de la portada (z = T_HALF)
  const RIGHT_TOP = T_HALF - 0.0001;
  const baseX: number[] = [];
  if (reading && pages) {
    if (firstPage) firstPage.visible = false;
    const block = book.getObjectByName("paginas");
    if (block) {
      block.scale.z = 0.3;
      block.position.z = -0.0011;
    }
    setMap("interior_cubierta", drawTextPage(pages[0]?.text ?? "", 1));
    const n = pages.length;
    for (let j = 0; j < n; j++) {
      const geom = new THREE.PlaneGeometry(LEAF_W, LEAF_H, SEGMENTS, 1);
      geom.translate(LEAF_W / 2 + LEAF_X0, LEAF_H / 2 + LEAF_Y0, 0);
      if (!baseX.length) {
        const pos = geom.attributes.position as T.BufferAttribute;
        for (let i = 0; i < pos.count; i++) baseX.push(pos.getX(i));
      }
      const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.FrontSide });
      const back = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.BackSide });
      const hinge = new THREE.Group();
      hinge.position.set(0, 0, RIGHT_TOP - j * EPS);
      const meshF = new THREE.Mesh(geom, front);
      const meshB = new THREE.Mesh(geom, back);
      meshF.castShadow = meshB.castShadow = true;
      hinge.add(meshF, meshB);
      book.add(hinge);
      const leaf: Leaf = { hinge, geom, front, still: null, t: 0, target: 0 };
      leaves.push(leaf);
      drawIllustration(pages[j].imageUrl).then((c) => {
        if (isDisposed()) return;
        leaf.still = toTexture(c, false, false);
        if (!front.map) {
          front.map = leaf.still;
          front.needsUpdate = true;
        }
      });
      const backCanvas = j + 1 < n ? drawTextPage(pages[j + 1].text, j + 2) : drawTextPage("Fin", null);
      back.map = toTexture(backCanvas, true, false);
      back.needsUpdate = true;
    }
  }

  const shapeLeaf = (index: number) => {
    const leaf = leaves[index];
    const t = leaf.t;
    const e = ease(t);
    const base = -Math.PI * e;
    const curl = 0.9 * Math.sin(Math.PI * t);
    const pos = leaf.geom.attributes.position as T.BufferAttribute;
    // Columnas de vértices: x creciente desde el lomo
    const seg = LEAF_W / SEGMENTS;
    let px = LEAF_X0;
    let pz = 0;
    const colX: number[] = [px];
    const colZ: number[] = [pz];
    for (let k = 1; k <= SEGMENTS; k++) {
      const phi = base + curl * (k / SEGMENTS);
      px += seg * Math.cos(phi);
      pz += -seg * Math.sin(phi);
      colX.push(px);
      colZ.push(pz);
    }
    for (let i = 0; i < pos.count; i++) {
      const k = Math.round((baseX[i] - baseX[0]) / seg);
      pos.setX(i, colX[k]);
      pos.setZ(i, colZ[k]);
    }
    pos.needsUpdate = true;
    leaf.geom.computeVertexNormals();
    // Altura en el montón: a la derecha la primera arriba; a la izquierda, la última pasada arriba
    const zRight = RIGHT_TOP - index * EPS;
    const zLeft = T_HALF + 0.0001 + (index + 1) * EPS;
    leaf.hinge.position.z = zRight + (zLeft - zRight) * e;
  };
  leaves.forEach((_, i) => shapeLeaf(i));

  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  return {
    THREE,
    renderer,
    scene,
    camera,
    pivot,
    cover,
    leaves,
    shapeLeaf,
    toTexture,
    resize,
    dispose: () => {
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
