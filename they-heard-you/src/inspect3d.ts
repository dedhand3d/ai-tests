import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Resident Evil-style close-up: drag to turn the object over, wheel or pinch to zoom.
// Materials and geometry are shared with the main scene, so only the renderer is disposed.
export function openInspector(host: HTMLElement, model: THREE.Object3D): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute('aria-label', 'Rotatable close-up of the item');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
  camera.position.set(0, 0.35, 2.2);
  scene.add(new THREE.HemisphereLight(0xd8e0c8, 0x2a2118, 1.4));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
  key.position.set(1.5, 2, 2);
  scene.add(key);
  const rim = new THREE.PointLight(0x9fd0ff, 6, 6, 2);
  rim.position.set(-1.6, 0.4, -1.2);
  scene.add(rim);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const pivot = new THREE.Group();
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  pivot.add(model);
  pivot.scale.setScalar(1 / Math.max(size.x, size.y, size.z, 0.001));
  scene.add(pivot);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 0.9;
  controls.maxDistance = 4;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.2;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let frame = 0;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  };
  loop();
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
