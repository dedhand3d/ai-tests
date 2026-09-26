import * as THREE from 'three';
import { canvasTexture, dirtyTexture, lettering, seededRandom, televisionTexture } from './textures';
import { isFree, type GameState, type HotspotId, type ViewId } from './state';
import { patrolDepth } from './encounters';

type Position = [number, number, number];
type Surface = THREE.Material | THREE.Material[];
export interface Hit { id: HotspotId; x: number; y: number; }
interface Target { id: HotspotId; object: THREE.Object3D; }

const CAMERAS: Record<ViewId, { eye: Position; aim: Position; fov: number }> = {
  seat: { eye: [0.35, 1.32, -3.3], aim: [0.62, 1.03, -0.2], fov: 72 },
  kitchen: { eye: [0.64, 1.24, -2.54], aim: [-1.1, 0.83, -1.4], fov: 63 },
  bracket: { eye: [0.5, 1.02, -2.8], aim: [0.52, 0.16, -1.58], fov: 61 },
  dinette: { eye: [0.36, 1.39, -0.74], aim: [-0.12, 1.11, 1.62], fov: 70 },
  rear: { eye: [0.04, 1.47, 0.66], aim: [0.1, 1.12, 3.35], fov: 66 },
};

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(66, 1, 0.04, 35);
  private readonly raycaster = new THREE.Raycaster();
  private readonly targets: Target[] = [];
  private readonly aim = new THREE.Vector3();
  private readonly drawer = new THREE.Group();
  private readonly cushion = new THREE.Group();
  private readonly spoon = new THREE.Group();
  private readonly rag = new THREE.Group();
  private readonly chain = new THREE.Group();
  private readonly fitting = new THREE.Group();
  private readonly bolt = new THREE.Group();
  private readonly witness = new THREE.Group();
  private readonly doorHinge = new THREE.Group();
  private readonly cletus = new THREE.Group();
  private readonly cletusLegs: THREE.Group[] = [];
  private readonly cletusHead = new THREE.Group();
  private readonly blueLight = new THREE.PointLight(0x81acfc, 3, 4, 2);
  private state: GameState;
  private selectedView: ViewId;
  private reduced = false;
  private lastWidth = 0;
  private lastHeight = 0;
  private readonly observer: ResizeObserver;
  private readonly wood: THREE.MeshStandardMaterial;
  private readonly cloth: THREE.MeshStandardMaterial;
  private readonly metal: THREE.MeshStandardMaterial;
  private readonly dark = new THREE.MeshStandardMaterial({ color: 0x141612, roughness: 0.97 });
  private readonly rust = new THREE.MeshStandardMaterial({ color: 0x614631, roughness: 0.98 });
  private readonly random = seededRandom(731904);

  constructor(private readonly host: HTMLElement, state: GameState) {
    this.state = state;
    this.selectedView = state.view;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.38;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive three-dimensional RV interior');
    this.host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x11171a);
    this.scene.fog = new THREE.FogExp2(0x171c19, 0.045);
    this.wood = new THREE.MeshStandardMaterial({ map: dirtyTexture('wood', 32), roughness: 0.94 });
    this.cloth = new THREE.MeshStandardMaterial({ map: dirtyTexture('cloth', 50), roughness: 1 });
    this.metal = new THREE.MeshStandardMaterial({ map: dirtyTexture('metal', 90), roughness: 0.62, metalness: 0.55 });
    this.buildShell();
    this.buildKitchen();
    this.buildSeat();
    this.buildDinette();
    this.buildRear();
    this.buildVisitor();
    this.buildLitter();
    this.buildLighting();
    this.applyState(state);
    this.snapCamera();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  private box(size: Position, position: Position, material: Surface, parent: THREE.Object3D = this.scene): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private cylinder(radius: number, height: number, position: Position, material: Surface, parent: THREE.Object3D = this.scene, segments = 10): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, height, segments), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private orb(scale: Position, position: Position, material: Surface, parent: THREE.Object3D = this.scene): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), material);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private register(id: HotspotId, object: THREE.Object3D): void {
    object.userData.hotspot = id;
    this.targets.push({ id, object });
  }

  private sign(lines: string[], size: [number, number], position: Position, rotation = 0): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({ map: lettering(lines), roughness: 1, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.y = rotation;
    mesh.rotation.z = (this.random() - 0.5) * 0.1;
    this.scene.add(mesh);
    return mesh;
  }

  private stain(position: Position, size: [number, number]): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 30);
    gradient.addColorStop(0, '#070b09c9');
    gradient.addColorStop(0.6, '#10150879');
    gradient.addColorStop(1, '#10150800');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: canvasTexture(canvas), transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(...position);
    this.scene.add(mesh);
  }

  private buildShell(): void {
    const floorMap = dirtyTexture('floor', 66);
    floorMap.repeat.set(3, 7);
    this.box([3.5, 0.14, 8], [0, -0.09, 0], new THREE.MeshStandardMaterial({ map: floorMap, roughness: 1 }));
    const ceilingMap = dirtyTexture('ceiling', 17);
    ceilingMap.repeat.set(3, 7);
    this.box([3.5, 0.12, 8], [0, 2.42, 0], new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 1 }));
    for (const side of [-1, 1]) {
      const windowStart = side === 1 ? 0.35 : -0.05;
      const frontEnd = side === 1 ? -0.8 : windowStart;
      this.box([0.13, 2.4, frontEnd + 4], [side * 1.76, 1.2, (-4 + frontEnd) / 2], this.wood);
      this.box([0.13, 2.4, 2.05], [side * 1.76, 1.2, 2.975], this.wood);
      this.box([0.13, 1.04, 1.95 - windowStart], [side * 1.76, 0.52, (1.95 + windowStart) / 2], this.wood);
      this.box([0.13, 0.43, 1.95 - windowStart], [side * 1.76, 2.185, (1.95 + windowStart) / 2], this.wood);
    }
    this.box([0.13, 0.28, 1.15], [1.76, 2.26, -0.225], this.wood);
    this.box([0.13, 0.06, 1.15], [1.76, 0.03, -0.225], this.metal);
    this.box([3.5, 2.4, 0.12], [0, 1.2, 4], this.wood);
    this.box([3.5, 2.4, 0.12], [0, 1.2, -4], this.wood);
    for (const side of [-1, 1]) {
      for (let seam = -3.7; seam <= 3.8; seam += 0.48) {
        if (seam > (side === 1 ? -0.85 : -0.1) && seam < 2.05) continue;
        this.box([0.025, 2.32, 0.018], [side * 1.675, 1.2, seam], this.dark);
      }
      this.box([0.07, 0.12, 8], [side * 1.65, 0.075, 0], this.dark);
      this.box([0.08, 0.1, 8], [side * 1.65, 2.3, 0], this.rust);
    }
    for (let seam = -3.5; seam < 4; seam += 1) this.box([3.3, 0.025, 0.04], [0, 2.34, seam], this.dark);

    const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x8dadae, transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.88 });
    for (const side of [-1, 1]) {
      const width = side === 1 ? 1.6 : 2;
      const center = side === 1 ? 1.15 : 0.95;
      for (const height of [1.04, 1.98]) this.box([0.12, 0.06, width], [side * 1.7, height, center], this.dark);
      for (const end of [center - width / 2, center + width / 2]) this.box([0.12, 1.0, 0.06], [side * 1.7, 1.5, end], this.dark);
      const glass = this.box([0.015, 0.86, width - 0.08], [side * 1.72, 1.52, center], windowMaterial);
      glass.castShadow = false;
      glass.userData.ignoreRay = true;
      const blindMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8b73, map: dirtyTexture('ceiling', 71), roughness: 1 });
      for (let blind = 0; blind < 11; blind++) {
        const slat = this.box([0.045, 0.036, width - 0.1], [side * 1.556, 1.13 + blind * 0.075, center], blindMaterial);
        slat.rotation.z = side * (blind === 4 ? 0.62 : 0.14);
        if (blind === 7) slat.rotation.x = 0.04;
      }
      for (const end of [center - width / 2 - 0.12, center + width / 2 + 0.02]) {
        for (let pleat = 0; pleat < 4; pleat++) {
          this.cylinder(0.041, 1.28, [side * 1.5, 1.43, end + pleat * 0.045], this.cloth);
        }
      }
    }

    const door = new THREE.Group();
    this.doorHinge.position.set(1.72, 0, 0.3);
    this.scene.add(this.doorHinge);
    door.position.set(0, 1.1, -0.525);
    this.doorHinge.add(door);
    this.box([0.085, 2.02, 1.03], [0, 0, 0], this.dark, door);
    this.box([0.045, 1.95, 0.94], [-0.055, 0, 0], new THREE.MeshStandardMaterial({ color: 0x81765b, map: dirtyTexture('metal', 102), roughness: 1 }), door);
    this.box([0.04, 0.77, 0.55], [-0.092, 0.43, 0], windowMaterial, door);
    for (let bar = 0; bar < 4; bar++) this.box([0.035, 0.78, 0.012], [-0.12, 0.43, -0.2 + bar * 0.14], this.metal, door);
    this.box([0.08, 0.18, 0.055], [-0.14, -0.25, -0.26], this.metal, door);
    this.register('door', door);
    for (const edge of [-0.8, 0.35]) this.box([0.17, 2.14, 0.055], [1.71, 1.07, edge], this.metal);
    this.box([0.7, 0.08, 1.2], [2.1, -0.08, -0.225], this.dark);
    this.sign(['RENT DUE', 'EVEN IF', 'ARRESTED'], [0.42, 0.5], [1.635, 1.65, -1.86], -Math.PI / 2);
    const notice = this.sign(['HOME SWEET', 'CODE', 'VIOLATION'], [0.95, 0.53], [-0.15, 2.05, 3.85], Math.PI);
    this.register('notice', notice);
    this.sign(['DO NOT TOUCH', 'THE EMERGENCY', 'ASHTRAY'], [0.5, 0.4], [-1.67, 1.48, -2.18], Math.PI / 2);
    this.sign(['SHUT THE', 'FUCKING', 'DRAWER'], [0.4, 0.37], [-1.25, 1.72, -2.43]);
  }

  private buildKitchen(): void {
    this.box([0.78, 0.89, 2.32], [-1.25, 0.46, -1.84], this.wood);
    this.box([0.93, 0.085, 2.42], [-1.2, 0.96, -1.84], new THREE.MeshStandardMaterial({ map: dirtyTexture('ceiling', 48), roughness: 0.95 }));
    for (let panel = 0; panel < 3; panel++) {
      this.box([0.03, 0.58, 0.64], [-0.844, 0.36, -2.59 + panel * 0.75], this.wood);
      this.box([0.075, 0.035, 0.18], [-0.803, 0.58, -2.59 + panel * 0.75], this.metal);
    }
    this.box([0.58, 0.06, 0.61], [-1.24, 1.007, -2.45], this.metal);
    this.box([0.44, 0.013, 0.47], [-1.24, 1.041, -2.45], this.dark);
    for (const side of [-1, 1]) this.box([0.04, 0.06, 0.54], [-1.24 + side * 0.25, 1.06, -2.45], this.metal);
    const faucet = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 12, Math.PI), this.metal);
    faucet.position.set(-1.48, 1.18, -2.43);
    faucet.rotation.y = Math.PI / 2;
    this.scene.add(faucet);
    this.cylinder(0.021, 0.17, [-1.48, 1.09, -2.56], this.metal);
    this.cylinder(0.1, 0.025, [-1.15, 1.04, -2.4], this.rust);
    this.box([0.69, 0.075, 0.57], [-1.24, 1.01, -0.94], this.dark);
    for (const depth of [-1.08, -0.81]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 5, 12), this.metal);
      ring.position.set(-1.21, 1.062, depth);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
    }
    this.box([0.64, 0.49, 2.29], [-1.36, 2.03, -1.84], this.wood);
    for (let panel = 0; panel < 3; panel++) {
      this.box([0.055, 0.4, 0.67], [-1.006, 2.03, -2.56 + panel * 0.72], this.wood);
      this.box([0.07, 0.13, 0.025], [-0.951, 1.99, -2.39 + panel * 0.72], this.metal);
    }
    this.box([0.52, 0.16, 0.65], [-0.855, 0.776, -1.49], this.dark);
    this.drawer.position.set(-1.1, 0.77, -1.49);
    this.scene.add(this.drawer);
    this.box([0.7, 0.045, 0.65], [0, -0.052, 0], this.wood, this.drawer);
    this.box([0.07, 0.2, 0.75], [0.37, 0, 0], this.wood, this.drawer);
    this.box([0.075, 0.038, 0.26], [0.435, 0.008, 0], this.metal, this.drawer);
    for (const side of [-1, 1]) this.box([0.68, 0.14, 0.035], [0, 0, side * 0.31], this.wood, this.drawer);
    this.register('drawer', this.drawer);
    const ragMaterial = new THREE.MeshStandardMaterial({ map: dirtyTexture('ceiling', 149), color: 0x9eaa90, roughness: 1, side: THREE.DoubleSide });
    this.rag.position.set(0.08, 0.002, 0.01);
    for (let fold = 0; fold < 5; fold++) {
      const piece = this.box([0.22, 0.014, 0.065], [Math.sin(fold) * 0.025, fold * 0.004, (fold - 2) * 0.033], ragMaterial, this.rag);
      piece.rotation.z = fold % 2 ? 0.08 : -0.1;
    }
    this.drawer.add(this.rag);
    this.register('rag', this.rag);
    for (let cap = 0; cap < 6; cap++) this.cylinder(0.028, 0.014, [-0.15 + this.random() * 0.22, -0.014, -0.2 + this.random() * 0.4], this.rust, this.drawer);
    this.cup([-1.2, 1.07, -1.16]);
    this.can([-1.09, 1.11, -1.86], 0.11);
    this.can([-1.38, 1.1, -1.57], 0.09);
    this.cylinder(0.13, 0.03, [-1.14, 1.025, -2.08], this.dark);
    this.stain([-1.2, 1.008, -1.88], [0.65, 0.5]);
  }

  private buildSeat(): void {
    this.box([0.82, 0.45, 1.2], [1.16, 0.23, -1.54], this.wood);
    this.box([0.18, 0.66, 1.19], [1.51, 0.72, -1.54], this.cloth);
    this.box([0.72, 0.06, 1.11], [1.09, 0.49, -1.54], this.dark);
    this.cushion.position.set(1.47, 0.57, -1.54);
    this.box([0.74, 0.16, 1.13], [-0.37, 0, 0], this.cloth, this.cushion);
    this.box([0.74, 0.018, 1.14], [-0.37, -0.03, 0], this.rust, this.cushion);
    this.scene.add(this.cushion);
    this.register('cushion', this.cushion);
    this.spoon.position.set(0.95, 0.535, -1.75);
    this.spoon.rotation.y = -0.32;
    const silver = new THREE.MeshStandardMaterial({ color: 0xc0c4b3, metalness: 0.8, roughness: 0.34 });
    this.box([0.025, 0.012, 0.23], [0, 0, 0.07], silver, this.spoon);
    this.orb([0.053, 0.017, 0.073], [0, 0, -0.09], silver, this.spoon);
    this.scene.add(this.spoon);
    this.register('spoon', this.spoon);

    this.fitting.position.set(0.49, 0.05, -1.44);
    this.scene.add(this.fitting);
    this.box([0.28, 0.045, 0.19], [0, 0, 0], this.rust, this.fitting);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI), this.metal);
    loop.position.set(-0.07, 0.033, 0);
    loop.rotation.y = Math.PI / 2;
    this.fitting.add(loop);
    this.bolt.position.set(0.06, 0.037, 0);
    this.fitting.add(this.bolt);
    this.cylinder(0.048, 0.023, [0, 0, 0], silver, this.bolt);
    this.box([0.073, 0.003, 0.012], [0, 0.013, 0], this.dark, this.bolt);
    this.register('bracket', this.fitting);
    this.chain.position.set(0.44, 0.12, -1.47);
    this.scene.add(this.chain);
    for (let link = 0; link < 18; link++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.01, 5, 8), this.metal);
      ring.position.set(link * 0.023, 0.045 + Math.sin(link / 17 * Math.PI) * 0.025, -link * 0.042);
      ring.rotation.set(link % 2 === 0 ? Math.PI / 2 : 0.1, 0, 0.5);
      ring.scale.y = 1.4;
      ring.castShadow = true;
      this.chain.add(ring);
    }
    this.register('bracket', this.chain);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.079, 0.016, 6, 12), this.metal);
    cuff.position.set(0.85, 0.19, -2.24);
    cuff.rotation.set(0.15, 0.35, 0);
    this.scene.add(cuff);
    const denim = new THREE.MeshStandardMaterial({ color: 0x39403b, map: dirtyTexture('cloth', 182), roughness: 1 });
    const leg = this.cylinder(0.075, 0.53, [0.86, 0.24, -2.51], denim);
    leg.rotation.x = Math.PI / 2;
    this.orb([0.093, 0.067, 0.15], [0.86, 0.14, -2.09], this.dark);
    this.register('seat', this.box([0.76, 0.15, 0.12], [1.13, 0.66, -2.14], this.cloth));
    this.stain([0.49, 0.002, -1.44], [0.55, 0.39]);
  }

  private buildDinette(): void {
    this.box([1.03, 0.42, 1.78], [-1.05, 0.24, 1.21], this.wood);
    this.box([0.96, 0.2, 1.72], [-1.05, 0.53, 1.21], this.cloth);
    this.box([0.19, 0.73, 1.8], [-1.5, 0.92, 1.21], this.cloth);
    this.box([1.02, 0.69, 0.18], [-1.06, 0.8, 2.06], this.cloth);
    this.box([0.82, 0.06, 1.33], [-0.33, 0.85, 1.19], this.wood);
    this.cylinder(0.035, 0.82, [-0.32, 0.42, 1.19], this.metal);
    this.stain([-0.33, 0.887, 1.19], [0.78, 1.2]);
    this.box([0.48, 0.075, 0.4], [-0.31, 0.92, 1.54], new THREE.MeshStandardMaterial({ map: lettering(['PIZZA', 'REGRETS'], '#9b8d68', '#672d2a'), roughness: 1 }));
    const pizzaLid = this.box([0.48, 0.025, 0.39], [-0.31, 1.075, 1.73], this.wood);
    pizzaLid.rotation.x = 1.15;
    this.can([-0.52, 0.98, 0.96], 0.085);
    this.cup([-0.13, 0.96, 0.85]);
    const ashtray = this.cylinder(0.12, 0.03, [-0.28, 0.902, 1.13], this.dark);
    this.register('ashtray', ashtray);
    for (let butt = 0; butt < 9; butt++) {
      const cigarette = this.cylinder(0.008, 0.075, [-0.35 + this.random() * 0.14, 0.928, 1.06 + this.random() * 0.14], this.rust);
      cigarette.rotation.z = Math.PI / 2;
      cigarette.rotation.x = this.random() * 3;
    }

    this.box([0.81, 0.68, 0.74], [1.12, 0.35, 0.7], this.wood);
    this.box([0.87, 0.07, 0.82], [1.12, 0.72, 0.7], this.wood);
    const tv = new THREE.Group();
    tv.position.set(1.1, 1.12, 0.61);
    tv.rotation.y = -0.14;
    this.scene.add(tv);
    this.box([0.8, 0.68, 0.54], [0, 0, 0], this.dark, tv);
    this.box([0.72, 0.57, 0.045], [0, 0.023, -0.29], this.metal, tv);
    const screenMap = televisionTexture();
    const screen = this.box([0.62, 0.45, 0.035], [-0.025, 0.034, -0.318], new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: screenMap, emissive: 0xb3caff, emissiveIntensity: 0.8, roughness: 0.27 }), tv);
    screen.castShadow = false;
    this.box([0.012, 0.012, 0.007], [0.3, -0.257, -0.318], new THREE.MeshBasicMaterial({ color: 0xd85131 }), tv);
    for (let slot = 0; slot < 5; slot++) this.box([0.046, 0.009, 0.006], [0.295, -0.02 + slot * 0.024, -0.318], this.dark, tv);
    for (const side of [-1, 1]) {
      const antenna = this.cylinder(0.004, 0.41, [side * 0.14, 0.48, 0.02], this.metal, tv, 5);
      antenna.rotation.z = side * 0.6;
    }
    this.register('tv', tv);
    this.blueLight.position.set(1.06, 1.24, 0.03);
    this.scene.add(this.blueLight);
    this.can([1.23, 1.51, 0.65], 0.08);
    this.sign(['TV KEEPS', 'ME SANE'], [0.35, 0.35], [0.98, 0.43, 0.308], Math.PI);
  }

  private buildRear(): void {
    this.box([0.64, 2.32, 0.12], [-1.39, 1.16, 2.55], this.wood);
    this.box([0.4, 2.32, 0.12], [1.5, 1.16, 2.55], this.wood);
    this.box([3.3, 0.23, 0.14], [0, 2.22, 2.55], this.wood);
    this.box([1.57, 0.48, 1.05], [-0.74, 0.26, 3.36], this.wood);
    this.box([1.52, 0.23, 1.0], [-0.74, 0.61, 3.36], this.cloth);
    this.orb([0.35, 0.105, 0.31], [-1.12, 0.79, 3.46], new THREE.MeshStandardMaterial({ map: dirtyTexture('ceiling', 777), roughness: 1 }));
    const blanket = this.box([0.88, 0.1, 1.08], [-0.24, 0.76, 3.36], new THREE.MeshStandardMaterial({ color: 0x62654a, map: dirtyTexture('cloth', 97), roughness: 1 }));
    blanket.rotation.z = 0.07;
    const hatch = new THREE.Group();
    hatch.position.set(-0.14, 1.51, 3.9);
    this.scene.add(hatch);
    this.box([1.25, 0.86, 0.05], [0, 0, 0], this.metal, hatch);
    this.box([1.09, 0.7, 0.03], [0, 0, -0.05], this.dark, hatch);
    this.box([0.12, 0.07, 0.03], [0, -0.29, -0.08], this.rust, hatch);
    this.register('hatch', hatch);
    this.sign(['EMERGENCY EXIT', 'HANDLE MISSING'], [0.61, 0.18], [-0.14, 1.65, 3.81], Math.PI);
    this.box([0.45, 0.12, 0.29], [-1.27, 0.13, 2.68], this.dark);
    this.box([0.32, 0.06, 0.09], [-1.27, 0.21, 2.68], this.rust);

    this.box([0.68, 0.44, 1.92], [1.1, 0.24, 2.94], this.wood);
    this.box([0.71, 0.2, 1.91], [1.1, 0.53, 2.94], this.cloth);
    this.box([0.15, 0.64, 1.96], [1.49, 0.78, 2.94], this.cloth);
    for (const depth of [1.98, 3.9]) this.box([0.74, 0.35, 0.12], [1.1, 0.68, depth], this.cloth);
    this.orb([0.25, 0.12, 0.22], [1.08, 0.73, 3.64], this.cloth);
    this.witness.position.set(1.09, 0.84, 2.14);
    this.witness.rotation.x = Math.PI / 2;
    this.scene.add(this.witness);
    const shirt = new THREE.MeshStandardMaterial({ color: 0x707469, map: dirtyTexture('cloth', 811), roughness: 1 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xa28b70, roughness: 0.98, flatShading: true });
    const pants = new THREE.MeshStandardMaterial({ color: 0x303c40, roughness: 1 });
    this.orb([0.25, 0.34, 0.17], [0, 0.92, 0], shirt, this.witness);
    for (const side of [-1, 1]) {
      this.cylinder(0.091, 0.42, [side * 0.13, 0.5, 0], pants, this.witness);
      this.cylinder(0.073, 0.36, [side * 0.14, 0.14, -0.015], pants, this.witness);
      this.orb([0.091, 0.067, 0.16], [side * 0.14, -0.05, -0.09], this.dark, this.witness);
      const arm = this.cylinder(0.058, 0.43, [side * 0.26, 0.85, -0.05], shirt, this.witness);
      arm.rotation.z = side * 0.11;
      this.orb([0.047, 0.053, 0.075], [side * 0.26, 0.63, -0.12], skin, this.witness);
    }
    const head = new THREE.Group();
    head.position.set(-0.016, 1.36, -0.046);
    head.rotation.z = -0.09;
    this.witness.add(head);
    this.orb([0.139, 0.191, 0.125], [0, 0, 0], skin, head);
    this.orb([0.036, 0.048, 0.062], [-0.005, -0.006, -0.125], skin, head);
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xbab4a1, roughness: 0.9 });
    for (const side of [-1, 1]) {
      this.orb([0.034, 0.02, 0.02], [side * 0.055, 0.035, -0.111], eyeWhite, head);
      this.orb([0.012, 0.015, 0.009], [side * 0.055 - 0.006, 0.034, -0.13], this.dark, head);
      const brow = this.box([0.058, 0.012, 0.012], [side * 0.058, 0.069, -0.117], this.dark, head);
      brow.rotation.z = side * 0.14;
      this.orb([0.03, 0.047, 0.028], [side * 0.14, 0, 0], skin, head);
      this.orb([0.036, 0.073, 0.082], [side * 0.111, 0.11, 0.026], this.dark, head);
    }
    this.box([0.068, 0.012, 0.011], [0.01, -0.076, -0.109], this.dark, head);
    this.box([0.1, 0.03, 0.06], [0, -0.145, -0.067], this.rust, head);
    this.box([0.12, 0.035, 0.15], [0.33, 0.67, -0.05], this.dark, this.witness);
    this.cylinder(0.031, 0.018, [0.33, 0.699, -0.05], new THREE.MeshStandardMaterial({ color: 0x9c3429 }), this.witness);
  }

  private buildVisitor(): void {
    this.scene.add(this.cletus);
    const skin = new THREE.MeshStandardMaterial({ color: 0x9a8564, map: dirtyTexture('ceiling', 432), roughness: 1, flatShading: true });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xafa478, map: dirtyTexture('ceiling', 634), roughness: 1 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x3f4438, map: dirtyTexture('cloth', 876), roughness: 1 });
    this.orb([0.22, 0.36, 0.14], [0, 1.15, 0], shirt, this.cletus);
    this.cylinder(0.055, 0.15, [0, 1.49, 0], skin, this.cletus);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.11, 0.88, 0);
      this.cletus.add(leg);
      this.cletusLegs.push(leg);
      this.cylinder(0.075, 0.74, [0, -0.38, 0], trousers, leg);
      this.orb([0.092, 0.075, 0.17], [0, -0.8, -0.06], this.dark, leg);
      const arm = this.cylinder(0.045, 0.63, [side * 0.26, 1.05, -0.015], skin, this.cletus);
      arm.rotation.z = side * 0.13;
      this.orb([0.043, 0.08, 0.04], [side * 0.29, 0.72, -0.015], skin, this.cletus);
      for (let finger = 0; finger < 3; finger++) this.box([0.013, 0.025, 0.01], [side * 0.29 + (finger - 1) * 0.018, 0.665, -0.052], this.dark, this.cletus);
    }
    this.cletusHead.position.set(0.018, 1.68, -0.025);
    this.cletusHead.rotation.z = -0.1;
    this.cletus.add(this.cletusHead);
    this.orb([0.13, 0.2, 0.13], [0, 0, 0], skin, this.cletusHead);
    this.orb([0.033, 0.064, 0.062], [0.008, -0.014, -0.13], skin, this.cletusHead);
    for (const side of [-1, 1]) {
      this.box([0.099, 0.049, 0.03], [side * 0.064, 0.044, -0.125], this.dark, this.cletusHead);
      this.orb([0.025, 0.045, 0.025], [side * 0.13, 0, 0], skin, this.cletusHead);
    }
    this.box([0.036, 0.012, 0.022], [0, 0.05, -0.147], this.metal, this.cletusHead);
    this.box([0.082, 0.035, 0.024], [0.014, -0.091, -0.11], this.dark, this.cletusHead);
    const teeth = new THREE.MeshStandardMaterial({ color: 0xa7975b, roughness: 1 });
    for (const offset of [-0.022, 0.009, 0.026]) this.box([0.012, 0.018, 0.01], [offset, -0.082, -0.126], teeth, this.cletusHead);
    for (let strand = 0; strand < 13; strand++) {
      const angle = strand / 13 * Math.PI * 2;
      this.orb([0.025, 0.12, 0.027], [Math.cos(angle) * 0.112, 0.13, Math.sin(angle) * 0.1 + 0.035], this.dark, this.cletusHead);
    }
    const background = new THREE.MeshStandardMaterial({ color: 0x93a5a1, emissive: 0x4b696e, emissiveIntensity: 0.55, roughness: 1 });
    for (const side of [-1, 1]) {
      this.box([0.1, 2.6, 7], [side * 3.8, 1.2, 0.5], background);
      const light = new THREE.PointLight(0xbcd4da, 14, 7, 2);
      light.position.set(side * 3.4, 1.7, 1.1);
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.002;
      this.scene.add(light);
    }
    const other = this.cletus.clone(true);
    other.name = 'outside-neighbor';
    other.scale.set(1.23, 0.91, 1.15);
    this.scene.add(other);
  }

  private can(position: Position, radius: number): void {
    const canMaterial = new THREE.MeshStandardMaterial({ color: this.random() > 0.5 ? 0x49605f : 0x8e5144, metalness: 0.36, roughness: 0.75 });
    this.cylinder(radius * 0.47, radius * 1.5, position, canMaterial);
    this.cylinder(radius * 0.48, 0.008, [position[0], position[1] + radius * 0.76, position[2]], this.metal);
    this.box([radius * 0.53, radius * 0.52, 0.002], [position[0], position[1], position[2] - radius * 0.475], new THREE.MeshStandardMaterial({ color: 0xb6b297, roughness: 0.9 }));
  }

  private cup(position: Position): void {
    this.cylinder(0.048, 0.13, position, new THREE.MeshStandardMaterial({ color: 0xc2b899, map: dirtyTexture('ceiling', 55), roughness: 0.8 }));
    this.cylinder(0.039, 0.005, [position[0], position[1] + 0.067, position[2]], this.dark);
  }

  private buildLitter(): void {
    const paper = new THREE.MeshStandardMaterial({ map: lettering(['FINAL NOTICE', 'PAST DUE', '----------------', 'PAYMENT REQUIRED'], '#b6ab82', '#393c32', 128), roughness: 1 });
    const wrappers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.017, 0.15), this.rust, 100);
    const transform = new THREE.Object3D();
    for (let scrap = 0; scrap < 100; scrap++) {
      transform.position.set((this.random() - 0.5) * 2.95, 0.02 + this.random() * 0.02, -3 + this.random() * 6.8);
      transform.rotation.set(this.random() * 0.2, this.random() * Math.PI, this.random() * 0.2);
      transform.scale.set(0.3 + this.random(), 0.5 + this.random(), 0.3 + this.random());
      transform.updateMatrix();
      wrappers.setMatrixAt(scrap, transform.matrix);
    }
    wrappers.receiveShadow = true;
    this.scene.add(wrappers);
    for (let paperIndex = 0; paperIndex < 28; paperIndex++) {
      const sheet = this.box([0.17 + this.random() * 0.16, 0.004, 0.24], [(this.random() - 0.5) * 2.5, 0.026, -2.8 + this.random() * 6.5], paper);
      sheet.rotation.y = this.random() * 6;
    }
    for (let canIndex = 0; canIndex < 20; canIndex++) {
      this.can([(this.random() - 0.5) * 2.7, 0.07, -2.7 + this.random() * 6], 0.075);
    }
    const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x171c19, roughness: 0.42, flatShading: true });
    for (const position of [[0.55, 0.23, 1.9], [-0.61, 0.19, 0.02], [1.4, 0.23, 2.14]] as Position[]) {
      this.orb([0.29, 0.34, 0.3], position, bagMaterial);
      this.orb([0.065, 0.08, 0.05], [position[0], position[1] + 0.29, position[2]], bagMaterial);
      this.stain([position[0], 0.004, position[2]], [0.8, 0.8]);
    }
    this.box([0.35, 0.29, 0.26], [1.43, 0.15, -3.45], new THREE.MeshStandardMaterial({ color: 0xa7a28a, map: dirtyTexture('ceiling', 77), roughness: 1 }));
    this.cylinder(0.035, 0.038, [1.43, 0.31, -3.45], this.rust);
    const cablePoints = [new THREE.Vector3(1.42, 0.02, 1), new THREE.Vector3(0.52, 0.024, 0.6), new THREE.Vector3(0.11, 0.026, 1.1), new THREE.Vector3(-0.4, 0.02, 0.4), new THREE.Vector3(-1.12, 0.025, -0.3)];
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 30, 0.012, 5, false), this.dark));
    for (let stain = 0; stain < 15; stain++) this.stain([(this.random() - 0.5) * 2.8, 0.006, -3 + this.random() * 6.8], [0.35 + this.random(), 0.3 + this.random()]);
  }

  private buildLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xa7b5ab, 0x393125, 1.0));
    for (const depth of [-1.6, 1.9]) {
      this.cylinder(0.14, 0.06, [0, 2.32, depth], this.dark);
      this.cylinder(0.11, 0.035, [0, 2.275, depth], new THREE.MeshStandardMaterial({ color: 0xddc187, emissive: 0xffb643, emissiveIntensity: 2 }));
      const lamp = new THREE.PointLight(0xffcd80, 13, 5.1, 2);
      lamp.position.set(0, 2.14, depth);
      lamp.castShadow = true;
      lamp.shadow.mapSize.set(512, 512);
      lamp.shadow.bias = -0.003;
      lamp.shadow.normalBias = 0.03;
      lamp.shadow.camera.near = 0.1;
      this.scene.add(lamp);
    }
    const rearLight = new THREE.PointLight(0xb59466, 4.5, 3.5, 2);
    rearLight.position.set(0, 1.95, 3.2);
    this.scene.add(rearLight);
  }

  applyState(state: GameState): void {
    this.state = state;
    this.selectedView = state.view;
    this.spoon.visible = state.spoon === 'cushion' && state.cushionRaised;
    this.rag.visible = state.rag === 'drawer' && state.drawerOpen;
    this.bolt.rotation.y = state.bracketWork * 0.7;
    this.bolt.position.y = 0.037 + state.bracketWork * 0.005;
    const loose = isFree(state) && !state.bracketConcealed;
    this.fitting.position.set(loose ? 0.63 : 0.49, loose ? 0.044 : 0.05, loose ? -1.68 : -1.44);
    this.fitting.rotation.y = loose ? 0.43 : 0;
    this.chain.position.y = loose ? 0.012 : 0.12;
    const encounter = state.encounter;
    const progress = encounter.phase === 'entering' ? (4 - encounter.remaining) / 4 : encounter.phase === 'leaving' ? encounter.remaining / 5 : encounter.phase === 'dialogue' ? 1 : 0;
    const walk = Math.max(0, (progress - 0.25) / 0.75);
    const depth = encounter.phase === 'idle' ? patrolDepth(encounter.patrol) : encounter.phase === 'alarm' ? encounter.origin : encounter.phase === 'approach' ? THREE.MathUtils.lerp(encounter.origin, -0.225, 1 - encounter.remaining / 12) : -0.225;
    this.cletus.position.set(THREE.MathUtils.lerp(2.25, 0.6, walk), 0, depth);
    this.cletus.rotation.y = progress > 0 ? encounter.phase === 'leaving' ? -Math.PI / 2 : Math.PI / 2 : Math.cos(encounter.patrol * 0.48) > 0 ? Math.PI : 0;
    if (encounter.phase === 'dialogue') this.cletus.rotation.y = 0;
    this.doorHinge.rotation.y = -Math.min(1, progress * 4) * 1.65;
    const moving = encounter.phase === 'idle' || encounter.phase === 'approach' || encounter.phase === 'entering' || encounter.phase === 'leaving';
    this.cletusLegs.forEach((leg, index) => { leg.rotation.x = moving ? Math.sin(state.elapsed * 7 + index * Math.PI) * 0.27 : 0; });
    this.cletusHead.rotation.y = encounter.phase === 'dialogue' ? Math.sin(state.elapsed * 1.2) * 0.15 : 0;
    const other = this.scene.getObjectByName('outside-neighbor')!;
    other.position.set(-2.18, 0, patrolDepth(encounter.patrol + 5));
    other.rotation.y = Math.cos((encounter.patrol + 5) * 0.48) > 0 ? Math.PI : 0;
    this.witness.rotation.z = encounter.phase === 'alarm' ? Math.sin(state.elapsed * 14) * 0.035 : encounter.agitation / 2000;
  }

  setReduced(value: boolean): void { this.reduced = value; this.resize(); }

  private snapCamera(): void {
    const shot = this.currentShot();
    this.camera.position.set(...shot.eye);
    this.aim.set(...shot.aim);
    this.camera.fov = shot.fov;
    this.camera.lookAt(this.aim);
    this.camera.updateProjectionMatrix();
  }

  private currentShot(): { eye: Position; aim: Position; fov: number } {
    const encounter = this.state.encounter.phase;
    const view = encounter === 'entering' || encounter === 'dialogue' ? 'seat' : this.selectedView;
    const shot = CAMERAS[view];
    return view === 'seat' && this.camera.aspect < 1 ? { ...shot, aim: [1.02, 1.04, -0.3], fov: 85 } : shot;
  }

  resize(): void {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    this.lastWidth = width;
    this.lastHeight = height;
    const resolution = this.reduced ? 1 : Math.min(1, 850 / width);
    this.renderer.setSize(Math.round(width * resolution), Math.round(height * resolution), false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(delta: number, time: number): void {
    const shot = this.currentShot();
    const blend = this.reduced || this.state.encounter.phase === 'dialogue' ? 1 : 1 - Math.exp(-delta * 8);
    this.camera.position.lerp(new THREE.Vector3(...shot.eye), blend);
    this.aim.lerp(new THREE.Vector3(...shot.aim), blend);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, shot.fov, blend);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.aim);
    this.drawer.position.x = THREE.MathUtils.lerp(this.drawer.position.x, this.state.drawerOpen ? -0.57 : -1.1, blend);
    this.cushion.rotation.z = THREE.MathUtils.lerp(this.cushion.rotation.z, this.state.cushionRaised ? -1.0 : 0, blend);
    this.witness.scale.y = this.reduced ? 1 : 1 + Math.sin(time * 1.4) * 0.003;
    this.blueLight.intensity = this.reduced ? 3 : 3 + Math.sin(time * 8.3) * 0.075;
    this.renderer.render(this.scene, this.camera);
  }

  private visible(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) { if (!current.visible) return false; current = current.parent; }
    return true;
  }

  pick(clientX: number, clientY: number): HotspotId | null {
    const rect = this.host.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    for (const hit of this.raycaster.intersectObjects(this.scene.children, true)) {
      if (!this.visible(hit.object) || hit.object.userData.ignoreRay) continue;
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        if (current.userData.hotspot) return current.userData.hotspot as HotspotId;
        current = current.parent;
      }
      return null;
    }
    return null;
  }

  hotspotPositions(): Hit[] {
    this.scene.updateMatrixWorld(true);
    const seen = new Set<HotspotId>();
    const markers: Hit[] = [];
    for (const target of this.targets) {
      if (seen.has(target.id) || !this.visible(target.object)) continue;
      const center = new THREE.Box3().setFromObject(target.object).getCenter(new THREE.Vector3());
      const projection = center.clone().project(this.camera);
      if (projection.z < -1 || projection.z > 1 || Math.abs(projection.x) > 0.94 || Math.abs(projection.y) > 0.9) continue;
      const rect = this.host.getBoundingClientRect();
      const x = (projection.x + 1) * this.lastWidth / 2;
      const y = (1 - projection.y) * this.lastHeight / 2;
      if (this.pick(rect.left + x, rect.top + y) !== target.id) continue;
      seen.add(target.id);
      markers.push({ id: target.id, x, y });
    }
    return markers;
  }

  dispose(): void {
    this.observer.disconnect();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
      material.dispose();
    }
    this.renderer.dispose();
  }
}