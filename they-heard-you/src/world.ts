import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { canvasTexture, dirtyTexture, lettering, seededRandom, televisionTexture } from './textures';
import { hasStash, isFree, type CabinetId, type GameState, type HotspotId, type ItemId, type ViewId } from './state';
import { APPROACH_SECONDS, DANCE_SECONDS, ENTER_SECONDS, INSIDE_Z, LEAVE_SECONDS, patrolDepth } from './encounters';

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

// Floor litter stays on open floor: the main aisle, or the strip between the rear bunk and Ronnie's couch.
// Each paper gets its own height so overlapping sheets never z-fight.
const paperHeight = (index: number) => -0.017 + index * 0.0011;
const DRAWER_SHUT = -1.25;
const DRAWER_OPEN = -0.72;

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
  private readonly screwdriver = new THREE.Group();
  private readonly belongings = new THREE.Group();
  private readonly scuffs = new THREE.Group();
  private readonly pizza = new THREE.Group();
  private readonly trash = new THREE.Group();
  private readonly floorPapers = new THREE.Group();
  private readonly counterCans = new THREE.Group();
  private readonly rearCab = new THREE.Group();
  private readonly needles = new THREE.Group();
  private readonly dildo = new THREE.Group();
  private readonly brassKey = new THREE.Group();
  private readonly finalKey = new THREE.Group();
  private readonly magnet = new THREE.Group();
  private readonly beenie = new THREE.Group();
  private readonly lotto = new THREE.Group();
  private readonly choke = new THREE.Group();
  private readonly cabDoors: Record<string, THREE.Group> = {};
  private readonly rearCabDoor = new THREE.Group();
  private readonly rearCabLock = new THREE.Group();
  private readonly darlene = new THREE.Group();
  private readonly darleneLegs: THREE.Group[] = [];
  private readonly darleneHead = new THREE.Group();
  private readonly smoke: THREE.Sprite[] = [];
  private readonly displacedProps: THREE.Object3D[] = [];
  private layout = -1;
  private readonly chain = new THREE.Group();
  private readonly fitting = new THREE.Group();
  private readonly bolt = new THREE.Group();
  private readonly witness = new THREE.Group();
  private readonly doorHinge = new THREE.Group();
  private readonly cletus = new THREE.Group();
  private readonly cletusLegs: THREE.Group[] = [];
  private readonly cletusHead = new THREE.Group();
  private readonly cletusLips = new THREE.Group();
  private readonly cletusArms: THREE.Group[] = [];
  private readonly dragParts: THREE.Object3D[] = [];
  private readonly zwinkysCan = new THREE.Group();
  private readonly ashtray = new THREE.Group();
  private readonly ashtrayPins = new THREE.Group();
  private readonly pizzaRear = new THREE.Group();
  private readonly rearNeedles = new THREE.Group();
  private readonly axe = new THREE.Group();
  private readonly butt = new THREE.Group();
  private readonly composer: EffectComposer;
  private readonly outline: OutlinePass;
  private hovered: HotspotId | null = null;
  private shake = 0;
  private doorState = 0;
  private readonly kissLight = new THREE.PointLight(0xd8b78d, 0, 2, 2);
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
    // Hover glow: an acid-green outline around whatever the cursor is on.
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(1);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.outline = new OutlinePass(new THREE.Vector2(256, 256), this.scene, this.camera);
    this.outline.visibleEdgeColor.set(0xc6ff3a);
    this.outline.hiddenEdgeColor.set(0x5b7a14);
    this.outline.edgeStrength = 6;
    this.outline.edgeGlow = 0.7;
    this.outline.edgeThickness = 1.6;
    this.outline.pulsePeriod = 1.7;
    this.composer.addPass(this.outline);
    this.composer.addPass(new OutputPass());
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
    this.buildInteractives();
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
    this.register('wall1', this.sign(['RENT DUE', 'EVEN IF', 'ARRESTED'], [0.42, 0.5], [1.635, 1.65, -1.86], -Math.PI / 2));
    const notice = this.sign(['HOUSE RULES', 'NO TOUCHING', 'NO DILDO 4 RONNIE', 'NOT TOO LOUD', 'DONT TOUCH AMP', 'NO ESCAPING'], [0.95, 0.53], [-0.15, 2.05, 3.85], Math.PI);
    this.register('notice', notice);
    this.register('wall2', this.sign(['DO NOT TOUCH', 'THE EMERGENCY', 'ASHTRAY'], [0.5, 0.4], [-1.67, 1.48, -2.18], Math.PI / 2));
    this.sign(['SHUT THE', 'FUCKING', 'DRAWER'], [0.4, 0.37], [-1.25, 1.72, -2.43]);
    this.register('wall3', this.sign(['1. FEED RONNIE', '2. HIDE THE', 'GOOD SPOONS', '3. NO COPS'], [0.5, 0.56], [-1.68, 1.62, -0.72], Math.PI / 2));
  }

  private buildKitchen(): void {
    // Lower carcass: hollow, so the doors open onto real space.
    const inside = new THREE.MeshStandardMaterial({ color: 0x5d4c38, map: dirtyTexture('wood', 61), roughness: 1 });
    this.box([0.04, 0.89, 2.32], [-1.62, 0.46, -1.84], inside);
    this.box([0.74, 0.04, 2.32], [-1.25, 0.035, -1.84], inside);
    this.box([0.74, 0.04, 2.32], [-1.25, 0.67, -1.84], inside);
    for (const depth of [-2.98, -0.7]) this.box([0.78, 0.89, 0.04], [-1.25, 0.46, depth], this.wood);
    for (const depth of [-2.215, -1.465]) this.box([0.74, 0.62, 0.03], [-1.25, 0.36, depth], inside);
    for (const [from, to] of [[-3, -2.91], [-2.27, -2.16], [-1.52, -1.41], [-0.77, -0.68]]) this.box([0.04, 0.89, to - from], [-0.88, 0.46, (from + to) / 2], this.wood);
    this.box([0.04, 0.07, 2.32], [-0.88, 0.035, -1.84], this.wood);
    for (const [from, to] of [[-3, -1.87], [-1.11, -0.68]]) this.box([0.04, 0.26, to - from], [-0.88, 0.79, (from + to) / 2], this.wood);
    this.box([0.04, 0.045, 0.76], [-0.88, 0.895, -1.49], this.wood);
    this.box([0.93, 0.085, 2.42], [-1.2, 0.96, -1.84], new THREE.MeshStandardMaterial({ map: dirtyTexture('ceiling', 48), roughness: 0.95 }));
    for (let panel = 0; panel < 3; panel++) {
      const hinge = new THREE.Group();
      hinge.position.set(-0.86, 0.36, -2.59 + panel * 0.75 - 0.32);
      this.scene.add(hinge);
      this.box([0.03, 0.58, 0.64], [0, 0, 0.32], this.wood, hinge);
      this.box([0.075, 0.035, 0.18], [0.057, 0.22, 0.52], this.metal, hinge);
      this.cabDoors[`k${panel + 1}`] = hinge;
      this.register(`cab-k${panel + 1}` as HotspotId, hinge);
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
    // Upper carcass, hollow as well.
    this.box([0.04, 0.49, 2.29], [-1.66, 2.03, -1.84], inside);
    for (const height of [1.805, 2.255]) this.box([0.64, 0.04, 2.29], [-1.36, height, -1.84], this.wood);
    for (const depth of [-2.965, -0.715]) this.box([0.64, 0.49, 0.04], [-1.36, 2.03, depth], this.wood);
    for (const depth of [-2.205, -1.485]) this.box([0.6, 0.45, 0.03], [-1.36, 2.03, depth], inside);
    for (const [from, to] of [[-2.985, -2.9], [-2.23, -2.18], [-1.51, -1.46], [-0.79, -0.695]]) this.box([0.03, 0.49, to - from], [-1.055, 2.03, (from + to) / 2], this.wood);
    for (const height of [1.807, 2.252]) this.box([0.03, 0.045, 2.29], [-1.055, height, -1.84], this.wood);
    for (let panel = 0; panel < 3; panel++) {
      const hinge = new THREE.Group();
      hinge.position.set(-1.04, 2.03, -2.56 + panel * 0.72 - 0.34);
      this.scene.add(hinge);
      this.box([0.055, 0.4, 0.67], [0, 0, 0.34], this.wood, hinge);
      this.box([0.07, 0.13, 0.025], [0.09, -0.04, 0.51], this.metal, hinge);
      this.cabDoors[`u${panel + 1}`] = hinge;
      this.register(`cab-u${panel + 1}` as HotspotId, hinge);
    }
    // The drawer slides in a real slot in the hollow carcass; closed, its front sits flush with the cabinets.
    this.drawer.position.set(DRAWER_SHUT, 0.77, -1.49);
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
    this.screwdriver.position.set(0.06, 0.06, -0.2);
    this.box([0.13, 0.052, 0.065], [-0.045, 0, 0], this.rust, this.screwdriver);
    this.box([0.21, 0.014, 0.022], [0.115, 0, 0], this.metal, this.screwdriver);
    this.drawer.add(this.screwdriver);
    this.register('screwdriver', this.screwdriver);
    this.belongings.position.set(0.1, 0.05, 0.15);
    this.orb([0.13, 0.06, 0.09], [0, 0, 0], ragMaterial, this.belongings);
    this.box([0.16, 0.013, 0.015], [0, 0.052, 0], this.dark, this.belongings);
    this.drawer.add(this.belongings);
    this.register('belongings', this.belongings);
    for (let cap = 0; cap < 6; cap++) this.cylinder(0.028, 0.014, [-0.15 + this.random() * 0.22, -0.014, -0.2 + this.random() * 0.4], this.rust, this.drawer);
    this.cup([-1.2, 1.07, -1.16]);
    this.counterCans.position.set(0, 0, 0);
    this.scene.add(this.counterCans);
    this.zwinkysCan.position.set(-1.09, 1.1, -1.86);
    this.zwinkysModel(this.zwinkysCan);
    this.counterCans.add(this.zwinkysCan);
    this.can([-1.38, 1.1, -1.57], 0.09, this.counterCans);
    this.can([-1.24, 1.1, -1.7], 0.08, this.counterCans);
    this.register('cans', this.counterCans);
    // The awful thing on the counter. Crude set dressing. Non-explicit.
    this.dildo.position.set(-1.16, 1.05, -1.3);
    const awful = new THREE.MeshStandardMaterial({ color: 0x7d4a8c, roughness: 0.5 });
    const shaft = this.cylinder(0.03, 0.2, [0, 0.1, 0], awful, this.dildo);
    shaft.rotation.z = 0.12;
    this.orb([0.055, 0.04, 0.055], [0, 0.01, 0], awful, this.dildo);
    this.orb([0.035, 0.05, 0.035], [0.004, 0.21, 0], awful, this.dildo);
    this.scene.add(this.dildo);
    this.register('dildo', this.dildo);
    this.cylinder(0.13, 0.03, [-1.14, 1.025, -2.08], this.dark);
    this.stain([-1.2, 1.008, -1.88], [0.65, 0.5]);
  }

  private buildSeat(): void {
    this.box([0.82, 0.45, 1.2], [1.16, 0.23, -1.54], this.wood);
    this.register('seat', this.box([0.18, 0.66, 1.19], [1.51, 0.72, -1.54], this.cloth));
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
    this.register('cuff', cuff);
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
    this.pizza.position.set(-0.31, 0.92, 1.54);
    this.scene.add(this.pizza);
    this.box([0.48, 0.075, 0.4], [0, 0.037, 0], new THREE.MeshStandardMaterial({ map: lettering(['PIZZA', 'REGRETS'], '#9b8d68', '#672d2a'), roughness: 1 }), this.pizza);
    const pizzaLid = this.box([0.48, 0.025, 0.39], [0, 0.155, 0.19], this.wood, this.pizza);
    pizzaLid.rotation.x = 1.15;
    // Brass key taped under the lid, revealed by digging through the box.
    this.brassKey.position.set(0.05, 0.145, 0.1);
    this.box([0.012, 0.006, 0.075], [0, 0, 0.02], this.metal, this.brassKey);
    const keyLoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 5, 10), this.metal);
    keyLoop.position.set(0, 0, -0.035);
    this.brassKey.add(keyLoop);
    this.pizza.add(this.brassKey);
    this.register('brassKey', this.brassKey);
    this.register('pizza', this.pizza);
    this.can([-0.52, 0.98, 0.96], 0.085);
    this.cup([-0.13, 0.96, 0.85]);
    // Discarded needles, points up, under the bench. Set dressing, not instructions.
    this.needles.position.set(-0.62, 0.46, 1.75);
    const foil = new THREE.MeshStandardMaterial({ color: 0x9aa0a3, metalness: 0.8, roughness: 0.35 });
    this.cylinder(0.09, 0.012, [0, 0, 0], foil, this.needles);
    for (let pin = 0; pin < 5; pin++) {
      const needle = this.cylinder(0.0035, 0.1, [(this.random() - 0.5) * 0.08, 0.05, (this.random() - 0.5) * 0.08], this.metal, this.needles, 4);
      needle.rotation.set(this.random() * 0.5, 0, this.random() * 0.5);
      this.box([0.008, 0.025, 0.008], [needle.position.x, -0.005, needle.position.z], new THREE.MeshStandardMaterial({ color: 0xc8b07a, roughness: 0.6 }), this.needles);
    }
    this.scene.add(this.needles);
    this.register('needles', this.needles);
    this.scene.add(this.ashtray);
    this.cylinder(0.12, 0.03, [-0.28, 0.902, 1.13], this.dark, this.ashtray);
    for (let butt = 0; butt < 9; butt++) {
      const cigarette = this.cylinder(0.008, 0.075, [-0.35 + this.random() * 0.14, 0.928, 1.06 + this.random() * 0.14], this.rust, this.ashtray);
      cigarette.rotation.z = Math.PI / 2;
      cigarette.rotation.x = this.random() * 3;
    }
    this.ashtrayPins.position.set(-0.24, 0.925, 1.16);
    this.pinsModel(this.ashtrayPins);
    this.ashtray.add(this.ashtrayPins);
    this.register('ashtray', this.ashtray);

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
    const tvCan = new THREE.Group();
    tvCan.position.set(1.23, 1.5, 0.65);
    tvCan.scale.setScalar(0.75);
    this.scene.add(tvCan);
    this.zwinkysModel(tvCan);
    this.register('cans', tvCan);
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
    this.register('ronnie', this.witness);

    // Padlocked cabinet by the bunk: holds the final key and the smutty paperback.
    this.rearCab.position.set(-1.28, 1.05, 2.66);
    this.scene.add(this.rearCab);
    const cabInside = new THREE.MeshStandardMaterial({ color: 0x4d3f30, map: dirtyTexture('wood', 919), roughness: 1 });
    this.box([0.34, 0.5, 0.03], [0, 0, 0.165], cabInside, this.rearCab);
    for (const side of [-1, 1]) this.box([0.03, 0.5, 0.36], [side * 0.155, 0, 0], this.wood, this.rearCab);
    for (const side of [-1, 1]) this.box([0.34, 0.03, 0.36], [0, side * 0.235, 0], this.wood, this.rearCab);
    // The axe, handle-down, leaning inside.
    this.axe.position.set(0.05, -0.02, 0.06);
    this.axe.rotation.z = 0.5;
    this.axeModel(this.axe);
    this.rearCab.add(this.axe);
    this.register('axe', this.axe);
    this.rearCabDoor.position.set(-0.17, 0, -0.18);
    this.rearCab.add(this.rearCabDoor);
    this.box([0.32, 0.46, 0.03], [0.16, 0, 0], this.wood, this.rearCabDoor);
    this.box([0.05, 0.02, 0.04], [0.3, 0, 0.02], this.metal, this.rearCabDoor);
    this.rearCabLock.position.set(0.02, -0.05, -0.2);
    this.rearCab.add(this.rearCabLock);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 5, 10, Math.PI), this.metal);
    shackle.position.set(0, 0.03, 0);
    this.rearCabLock.add(shackle);
    this.box([0.06, 0.08, 0.03], [0, -0.03, 0], this.metal, this.rearCabLock);
    // Final key on a twine loop inside.
    this.finalKey.position.set(0.04, 0.1, -0.02);
    const bigLoop = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 5, 10), this.rust);
    this.finalKey.add(bigLoop);
    this.box([0.016, 0.09, 0.008], [0, -0.06, 0], this.metal, this.finalKey);
    this.box([0.04, 0.02, 0.008], [0.012, -0.1, 0], this.metal, this.finalKey);
    this.rearCab.add(this.finalKey);
    this.register('finalKey', this.finalKey);
    // The purple paperback, CHOKE ON MY LOVE.
    this.choke.position.set(-0.05, -0.12, 0.02);
    this.choke.rotation.z = 0.3;
    this.box([0.2, 0.03, 0.14], [0, 0, 0], new THREE.MeshStandardMaterial({ map: lettering(['CHOKE ON', 'MY LOVE'], '#7d4a8c', '#e8c8f0', 128), roughness: 1 }), this.choke);
    this.rearCab.add(this.choke);
    this.register('choke', this.choke);
    this.register('rearCab', this.rearCab);

    // A second pizza box on the floor by the bunk. Lid open. It is not pizza in there.
    this.pizzaRear.position.set(-0.55, 0.73, 3.12);
    this.pizzaRear.rotation.set(0.12, -0.3, 0);
    this.pizzaRear.scale.setScalar(1.35);
    this.scene.add(this.pizzaRear);
    this.box([0.46, 0.06, 0.42], [0, 0.03, 0], new THREE.MeshStandardMaterial({ map: lettering(['PIZZA', 'REGRETS'], '#8f7f5c', '#5a2826'), roughness: 1 }), this.pizzaRear);
    const rearLid = this.box([0.46, 0.02, 0.42], [0, 0.2, 0.3], this.wood, this.pizzaRear);
    rearLid.rotation.x = 1.25;
    this.box([0.42, 0.004, 0.38], [0, 0.062, 0], new THREE.MeshStandardMaterial({ color: 0x6d5a3b, map: dirtyTexture('ceiling', 313), roughness: 1 }), this.pizzaRear);
    this.rearNeedles.position.set(0, 0.075, 0);
    this.needlesModel(this.rearNeedles);
    this.pizzaRear.add(this.rearNeedles);
    this.register('pizzaRear', this.pizzaRear);
  }

  private zwinkysModel(parent: THREE.Object3D): void {
    const label = new THREE.MeshStandardMaterial({ map: lettering(['ZWINKYS', 'MALT', 'LIQUOR'], '#c89b2c', '#3a170c', 128), metalness: 0.35, roughness: 0.6 });
    this.cylinder(0.052, 0.165, [0, 0, 0], [label, this.metal, this.metal], parent, 14);
    this.cylinder(0.05, 0.01, [0, 0.087, 0], this.metal, parent, 14);
    this.box([0.02, 0.004, 0.012], [0.012, 0.094, 0], this.metal, parent);
    this.orb([0.018, 0.004, 0.018], [-0.01, 0.093, 0.01], this.dark, parent);
  }

  private pinsModel(parent: THREE.Object3D): void {
    const pin = new THREE.MeshStandardMaterial({ color: 0x2c2a2a, metalness: 0.7, roughness: 0.4 });
    for (const [x, turn] of [[0, 0.3], [0.025, -0.5]] as const) {
      const clip = new THREE.Group();
      clip.position.set(x, 0, 0);
      clip.rotation.y = turn;
      parent.add(clip);
      this.box([0.006, 0.004, 0.065], [0, 0, 0], pin, clip);
      const bend = this.box([0.006, 0.004, 0.062], [0.007, 0.001, 0.002], pin, clip);
      bend.rotation.y = 0.12;
      for (let wave = 0; wave < 3; wave++) this.orb([0.004, 0.003, 0.004], [0.009, 0.002, -0.02 + wave * 0.012], pin, clip);
    }
  }

  private needlesModel(parent: THREE.Object3D): void {
    const barrel = new THREE.MeshStandardMaterial({ color: 0xd8e2d8, transparent: true, opacity: 0.7, roughness: 0.25 });
    const plunger = new THREE.MeshStandardMaterial({ color: 0xc86a3c, roughness: 0.7 });
    for (let index = 0; index < 3; index++) {
      const syringe = new THREE.Group();
      syringe.position.set(-0.1 + index * 0.09, 0.012, (index - 1) * 0.05);
      syringe.rotation.set(Math.PI / 2, 0, index * 0.7 - 0.6);
      parent.add(syringe);
      this.cylinder(0.011, 0.11, [0, 0, 0], barrel, syringe, 8);
      this.cylinder(0.005, 0.05, [0, -0.075, 0], plunger, syringe, 6);
      this.box([0.03, 0.004, 0.012], [0, -0.1, 0], plunger, syringe);
      this.cylinder(0.0018, 0.06, [0, 0.085, 0], this.metal, syringe, 4);
    }
  }

  private axeModel(parent: THREE.Object3D): void {
    const handle = new THREE.MeshStandardMaterial({ color: 0x7a5530, map: dirtyTexture('wood', 404), roughness: 0.9 });
    this.cylinder(0.014, 0.4, [0, 0, 0], handle, parent, 8);
    this.box([0.12, 0.07, 0.018], [0.045, 0.17, 0], this.metal, parent);
    this.box([0.022, 0.09, 0.02], [0.105, 0.17, 0], new THREE.MeshStandardMaterial({ color: 0xb8b8ae, metalness: 0.9, roughness: 0.25 }), parent);
    this.box([0.03, 0.04, 0.03], [-0.02, 0.17, 0], this.rust, parent);
    for (let strand = 0; strand < 4; strand++) this.box([0.002, 0.03, 0.002], [0.11, 0.14 + strand * 0.012, 0.011], this.dark, parent).rotation.z = 0.4;
  }

  private buttModel(parent: THREE.Object3D): void {
    this.cylinder(0.009, 0.035, [0, 0.012, 0], new THREE.MeshStandardMaterial({ color: 0xc87c3a, roughness: 1 }), parent, 8);
    this.cylinder(0.009, 0.02, [0, -0.015, 0], new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 1 }), parent, 8);
    this.orb([0.009, 0.004, 0.009], [0, -0.026, 0], this.dark, parent);
  }

  private buildVisitor(): void {
    this.scene.add(this.cletus);
    this.kissLight.position.set(0.1, 1.65, -3.2);
    this.scene.add(this.kissLight);
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
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.24, 1.36, -0.015);
      this.cletus.add(shoulder);
      this.cletusArms.push(shoulder);
      const arm = this.cylinder(0.045, 0.63, [side * 0.02, -0.31, 0], skin, shoulder);
      arm.rotation.z = side * 0.13;
      this.orb([0.043, 0.08, 0.04], [side * 0.05, -0.64, 0], skin, shoulder);
      for (let finger = 0; finger < 3; finger++) this.box([0.013, 0.025, 0.01], [side * 0.05 + (finger - 1) * 0.018, -0.695, -0.037], this.dark, shoulder);
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
    this.cletusLips.position.set(0.014, -0.091, -0.141);
    this.cletusHead.add(this.cletusLips);
    const lipMaterial = new THREE.MeshStandardMaterial({ color: 0x886259, roughness: 0.93 });
    for (const offset of [-0.009, 0.009]) this.orb([0.04, 0.009, 0.014], [0, offset, 0], lipMaterial, this.cletusLips);
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
    this.buildDrag();
    this.buildDarlene();
  }

  // Cletus's one-night-only look: Darlene's nightgown, a mop-head wig, a boa and a lipstick crime scene.
  private buildDrag(): void {
    const satin = new THREE.MeshStandardMaterial({ color: 0xe79ac0, roughness: 0.38, metalness: 0.08 });
    const lace = new THREE.MeshStandardMaterial({ color: 0xf1e3d4, roughness: 0.9 });
    const boa = new THREE.MeshStandardMaterial({ color: 0xff4fa8, roughness: 1, flatShading: true });
    const mop = new THREE.MeshStandardMaterial({ color: 0xcdbb73, map: dirtyTexture('cloth', 616), roughness: 1 });
    const lipstick = new THREE.MeshStandardMaterial({ color: 0xd11a2e, roughness: 0.35 });
    const shadow = new THREE.MeshStandardMaterial({ color: 0x2fa7d8, roughness: 0.6 });
    const blush = new THREE.MeshStandardMaterial({ color: 0xe0527a, roughness: 1, transparent: true, opacity: 0.8 });
    const pearl = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.2, metalness: 0.1 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x1d1a14, roughness: 1 });
    const body = new THREE.Group();
    this.cletus.add(body);
    this.dragParts.push(body);
    this.orb([0.235, 0.34, 0.155], [0, 1.13, 0], satin, body);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.52, 12, 1, true), satin);
    skirt.material.side = THREE.DoubleSide;
    skirt.position.set(0, 0.68, 0);
    body.add(skirt);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 5, 16), lace);
    hem.rotation.x = Math.PI / 2;
    hem.position.set(0, 0.42, 0);
    body.add(hem);
    for (const side of [-1, 1]) this.box([0.02, 0.2, 0.02], [side * 0.12, 1.4, -0.06], satin, body);
    // Chest hair escaping the neckline.
    for (let tuft = 0; tuft < 7; tuft++) this.orb([0.014, 0.022, 0.01], [(tuft - 3) * 0.022, 1.36 + Math.abs(tuft - 3) * 0.008, -0.145], hair, body);
    for (let bead = 0; bead < 11; bead++) {
      const angle = Math.PI * (0.15 + bead / 10 * 0.7);
      this.orb([0.013, 0.013, 0.013], [Math.cos(angle) * 0.11, 1.33 - Math.sin(angle) * 0.07, -0.13 - Math.sin(angle) * 0.02], pearl, body);
    }
    for (let feather = 0; feather < 18; feather++) {
      const angle = feather / 18 * Math.PI * 2;
      this.orb([0.045, 0.04, 0.045], [Math.cos(angle) * 0.15, 1.46 + Math.sin(angle * 3) * 0.01, Math.sin(angle) * 0.1], boa, body);
    }
    for (const side of [-1, 1]) for (let feather = 0; feather < 5; feather++) this.orb([0.04, 0.045, 0.04], [side * (0.14 + feather * 0.012), 1.38 - feather * 0.09, -0.08], boa, body);
    for (const leg of this.cletusLegs) {
      const heel = new THREE.Group();
      leg.add(heel);
      this.dragParts.push(heel);
      this.box([0.1, 0.07, 0.2], [0, -0.79, -0.07], new THREE.MeshStandardMaterial({ color: 0xc2185b, roughness: 0.25 }), heel);
      this.box([0.02, 0.09, 0.02], [0, -0.84, 0.04], this.dark, heel);
    }
    const face = new THREE.Group();
    this.cletusHead.add(face);
    this.dragParts.push(face);
    for (let strand = 0; strand < 22; strand++) {
      const angle = strand / 22 * Math.PI * 2;
      const behind = Math.sin(angle) > -0.4;
      const piece = this.orb([0.03, behind ? 0.24 : 0.13, 0.03], [Math.cos(angle) * 0.14, behind ? -0.02 : 0.08, Math.sin(angle) * 0.12 + 0.03], mop, face);
      piece.rotation.z = Math.cos(angle) * 0.25;
    }
    this.orb([0.15, 0.07, 0.14], [0, 0.17, 0.02], mop, face);
    // Lipstick: on the lips, past the lips, on one tooth.
    this.orb([0.05, 0.016, 0.016], [0.014, -0.091, -0.148], lipstick, face);
    const smear = this.box([0.06, 0.012, 0.006], [0.05, -0.075, -0.142], lipstick, face);
    smear.rotation.z = 0.5;
    this.box([0.013, 0.012, 0.004], [0.009, -0.075, -0.133], lipstick, face);
    for (const side of [-1, 1]) {
      this.box([0.1, 0.022, 0.012], [side * 0.064, 0.082, -0.128], shadow, face);
      this.orb([0.03, 0.022, 0.006], [side * 0.08, -0.03, -0.122], blush, face);
      for (let lash = 0; lash < 3; lash++) this.box([0.004, 0.02, 0.004], [side * (0.03 + lash * 0.03), 0.075, -0.142], this.dark, face).rotation.z = side * 0.3;
    }
  }

  private buildDarlene(): void {
    this.scene.add(this.darlene);
    const skin = new THREE.MeshStandardMaterial({ color: 0x8f7a5e, map: dirtyTexture('ceiling', 555), roughness: 1, flatShading: true });
    const cardigan = new THREE.MeshStandardMaterial({ color: 0x4a3d52, map: dirtyTexture('cloth', 313), roughness: 1 });
    const housedress = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, map: dirtyTexture('cloth', 414), roughness: 1 });
    // Heavy, sagging torso — an old woman who has given up on everything but cigarettes.
    this.orb([0.27, 0.32, 0.19], [0, 1.08, 0], housedress, this.darlene);
    // Grotesque sagging chest under the stained housedress. Crude humor, non-sexualized.
    for (const side of [-1, 1]) {
      this.orb([0.11, 0.15, 0.09], [side * 0.13, 1.02, -0.13], housedress, this.darlene);
      this.orb([0.09, 0.11, 0.07], [side * 0.12, 0.88, -0.15], housedress, this.darlene);
    }
    // Cardigan hanging open off the shoulders.
    this.orb([0.3, 0.18, 0.21], [0, 1.28, 0.01], cardigan, this.darlene);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.86, 0);
      this.darlene.add(leg);
      this.darleneLegs.push(leg);
      this.cylinder(0.085, 0.7, [0, -0.36, 0], housedress, leg);
      this.orb([0.1, 0.07, 0.16], [0, -0.76, -0.06], this.dark, leg);
      const arm = this.cylinder(0.052, 0.56, [side * 0.3, 1.0, -0.02], cardigan, this.darlene);
      arm.rotation.z = side * 0.1;
      this.orb([0.05, 0.09, 0.05], [side * 0.32, 0.7, -0.02], skin, this.darlene);
    }
    // Head: thin gray hair, hard face.
    this.darleneHead.position.set(0, 1.52, -0.02);
    this.darleneHead.rotation.x = 0.06;
    this.darlene.add(this.darleneHead);
    this.orb([0.14, 0.19, 0.13], [0, 0, 0], skin, this.darleneHead);
    this.orb([0.03, 0.05, 0.05], [0, -0.01, -0.13], skin, this.darleneHead);
    const hair = new THREE.MeshStandardMaterial({ color: 0x8a8578, map: dirtyTexture('ceiling', 909), roughness: 1 });
    for (let strand = 0; strand < 10; strand++) {
      const angle = strand / 10 * Math.PI * 2;
      this.orb([0.03, 0.14, 0.03], [Math.cos(angle) * 0.12, 0.1, Math.sin(angle) * 0.1 + 0.03], hair, this.darleneHead);
    }
    for (const side of [-1, 1]) {
      this.orb([0.02, 0.04, 0.02], [side * 0.13, 0.0, 0], skin, this.darleneHead);
      const glass = this.box([0.07, 0.05, 0.02], [side * 0.06, 0.03, -0.125], new THREE.MeshStandardMaterial({ color: 0x2a2a20, roughness: 0.4 }), this.darleneHead);
      glass.rotation.z = side * 0.05;
    }
    this.box([0.05, 0.015, 0.02], [0, -0.09, -0.12], new THREE.MeshStandardMaterial({ color: 0x6b3a3a, roughness: 1 }), this.darleneHead);
    // Cigarette permanently in her mouth, ember lit.
    const cig = new THREE.Group();
    cig.position.set(0.05, -0.075, -0.14);
    cig.rotation.z = 0.15;
    this.darleneHead.add(cig);
    this.cylinder(0.008, 0.09, [0, 0, 0.03], new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.9 }), cig).rotation.x = Math.PI / 2;
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff5a1e, emissive: 0xff3a00, emissiveIntensity: 2 }));
    ember.position.set(0, 0, 0.08);
    cig.add(ember);
    const emberLight = new THREE.PointLight(0xff6a2a, 0.5, 0.5, 2);
    emberLight.position.set(0, 0, 0.09);
    cig.add(emberLight);
    // Cigarette smoke sprites rising from the tip.
    for (let puff = 0; puff < 5; puff++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x9aa0a0, transparent: true, opacity: 0, depthWrite: false }));
      sprite.scale.set(0.1, 0.1, 0.1);
      this.darleneHead.add(sprite);
      this.smoke.push(sprite);
    }
    this.darlene.position.set(2.2, 0, 0.9);
  }

  private can(position: Position, radius: number, parent: THREE.Object3D = this.scene): void {
    const canMaterial = new THREE.MeshStandardMaterial({ color: this.random() > 0.5 ? 0x49605f : 0x8e5144, metalness: 0.36, roughness: 0.75 });
    this.cylinder(radius * 0.47, radius * 1.5, position, canMaterial, parent);
    this.cylinder(radius * 0.48, 0.008, [position[0], position[1] + radius * 0.76, position[2]], this.metal, parent);
    this.box([radius * 0.53, radius * 0.52, 0.002], [position[0], position[1], position[2] - radius * 0.475], new THREE.MeshStandardMaterial({ color: 0xb6b297, roughness: 0.9 }), parent);
  }

  private cup(position: Position): void {
    this.cylinder(0.048, 0.13, position, new THREE.MeshStandardMaterial({ color: 0xc2b899, map: dirtyTexture('ceiling', 55), roughness: 0.8 }));
    this.cylinder(0.039, 0.005, [position[0], position[1] + 0.067, position[2]], this.dark);
  }

  private buildLitter(): void {
    this.scene.add(this.scuffs);
    for (let mark = 0; mark < 6; mark++) {
      const scrape = this.box([0.012, 0.002, 0.29], [-0.64 + mark * 0.05, 0.007, -1.7 + mark * 0.06], this.rust, this.scuffs);
      scrape.rotation.y = 0.4;
    }
    const paper = new THREE.MeshStandardMaterial({ map: lettering(['FINAL NOTICE', 'PAST DUE', '----------------', 'PAYMENT REQUIRED'], '#b6ab82', '#393c32', 128), roughness: 1 });
    const wrappers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.017, 0.15), this.rust, 100);
    const transform = new THREE.Object3D();
    for (let scrap = 0; scrap < 100; scrap++) {
      const [x, z] = this.aisleSpot(this.random);
      transform.position.set(x, 0.0 + this.random() * 0.012, z);
      transform.rotation.set(this.random() * 0.2, this.random() * Math.PI, this.random() * 0.2);
      transform.scale.set(0.3 + this.random(), 0.5 + this.random(), 0.3 + this.random());
      transform.updateMatrix();
      wrappers.setMatrixAt(scrap, transform.matrix);
    }
    wrappers.receiveShadow = true;
    this.scene.add(wrappers);
    for (let paperIndex = 0; paperIndex < 28; paperIndex++) {
      const [x, z] = this.aisleSpot(this.random);
      const sheet = this.box([0.17 + this.random() * 0.16, 0.003, 0.24], [x, paperHeight(paperIndex), z], paper);
      sheet.rotation.y = this.random() * 6;
      sheet.castShadow = false;
      this.displacedProps.push(sheet);
    }
    // Rummageable drift of papers near the seat: overdue notices and one losing scratch ticket.
    this.floorPapers.position.set(0, 0, 0);
    this.scene.add(this.floorPapers);
    for (let sheet = 0; sheet < 7; sheet++) {
      const page = this.box([0.18 + this.random() * 0.12, 0.003, 0.25], [0.1 + this.random() * 0.45, paperHeight(28 + sheet), -2.3 + this.random() * 0.75], paper, this.floorPapers);
      page.rotation.y = this.random() * 6;
      page.castShadow = false;
    }
    this.lotto.position.set(0.35, paperHeight(36), -1.95);
    this.lotto.rotation.y = 0.7;
    this.box([0.1, 0.004, 0.14], [0, 0, 0], new THREE.MeshStandardMaterial({ map: lettering(['SCRATCH', 'HERE'], '#8c2f2f', '#e8d8b0', 96), roughness: 1 }), this.lotto);
    this.floorPapers.add(this.lotto);
    this.register('lotto', this.lotto);
    this.register('floorPapers', this.floorPapers);
    for (let canIndex = 0; canIndex < 20; canIndex++) {
      const [x, z] = this.aisleSpot(this.random);
      this.can([x, 0.036, z], 0.075);
    }
    const bagMaterial = new THREE.MeshStandardMaterial({ color: 0x171c19, roughness: 0.42, flatShading: true });
    this.trash.position.set(0, 0, 0);
    this.scene.add(this.trash);
    for (const position of [[0.55, 0.23, 1.9], [-0.61, 0.19, 0.02], [1.4, 0.23, 2.14]] as Position[]) {
      this.orb([0.29, 0.34, 0.3], position, bagMaterial, this.trash);
      this.orb([0.065, 0.08, 0.05], [position[0], position[1] + 0.29, position[2]], bagMaterial, this.trash);
      this.stain([position[0], 0.004, position[2]], [0.8, 0.8]);
    }
    this.register('trash', this.trash);
    this.box([0.35, 0.29, 0.26], [1.43, 0.15, -3.45], new THREE.MeshStandardMaterial({ color: 0xa7a28a, map: dirtyTexture('ceiling', 77), roughness: 1 }));
    this.cylinder(0.035, 0.038, [1.43, 0.31, -3.45], this.rust);
    const cablePoints = [new THREE.Vector3(1.42, 0.02, 1), new THREE.Vector3(0.52, 0.024, 0.6), new THREE.Vector3(0.11, 0.026, 1.1), new THREE.Vector3(-0.4, 0.02, 0.4), new THREE.Vector3(-1.12, 0.025, -0.3)];
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 30, 0.012, 5, false), this.dark));
    for (let stain = 0; stain < 15; stain++) this.stain([(this.random() - 0.5) * 2.8, 0.006, -3 + this.random() * 6.8], [0.35 + this.random(), 0.3 + this.random()]);
  }

  private aisleSpot(random: () => number): [number, number] {
    if (random() < 0.15) return [0.15 + random() * 0.45, 2.7 + random() * 1.05];
    const z = -2.85 + random() * 5.25;
    // Beside the couch the aisle narrows; keep clear of the fitting and chain.
    const right = z > -2.2 && z < -0.9 ? 0.2 : 0.55;
    return [-0.5 + random() * (0.5 + right), z];
  }

  private buildInteractives(): void {
    // Fridge magnet inside lower cabinet k1.
    this.magnet.position.set(-0.95, 0.42, -2.59);
    this.box([0.09, 0.06, 0.015], [0, 0, 0], new THREE.MeshStandardMaterial({ map: lettering(['MELT-IN-', 'MABEL\'S'], '#c8b070', '#4a3828', 96), roughness: 1 }), this.magnet);
    this.scene.add(this.magnet);
    this.register('magnet', this.magnet);
    // Baby shoe inside upper cabinet u2.
    this.beenie.position.set(-1.28, 1.99, -1.84 + 0.72 * 0);
    this.orb([0.045, 0.035, 0.075], [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0xd8c8d8, map: dirtyTexture('cloth', 233), roughness: 1 }), this.beenie);
    this.box([0.05, 0.03, 0.03], [0, 0.025, -0.02], new THREE.MeshStandardMaterial({ color: 0xd8c8d8, roughness: 1 }), this.beenie);
    this.scene.add(this.beenie);
    this.register('beenie', this.beenie);
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
    this.scuffs.visible = state.layout > 0;
    if (this.layout !== state.layout) {
      this.layout = state.layout;
      const random = seededRandom(state.seed + state.layout);
      this.displacedProps.forEach((prop, index) => {
        const [x, z] = this.aisleSpot(random);
        prop.position.set(x, paperHeight(index), z);
        prop.rotation.y = random() * Math.PI * 2;
      });
    }
    this.screwdriver.visible = state.screwdriver === 'drawer' && state.drawerOpen;
    this.belongings.visible = state.drawerOpen && hasStash(state);
    this.selectedView = state.view;
    this.spoon.visible = state.spoon === 'cushion' && state.cushionRaised;
    this.rag.visible = state.rag === 'drawer' && state.drawerOpen;
    this.brassKey.visible = false;
    this.lotto.visible = state.lotto === 'floor';
    this.finalKey.visible = state.finalKey === 'cabinet' && state.cabinetUnlocked;
    this.choke.visible = state.choke === 'cabinet' && state.cabinetUnlocked;
    this.axe.visible = state.axe === 'cabinet' && state.cabinetUnlocked;
    this.magnet.visible = state.magnet === 'cab-k1' && state.cabinets['k1'];
    this.beenie.visible = state.beenie === 'cab-u2' && state.cabinets.u2;
    this.zwinkysCan.visible = state.zwinkys === 'counter';
    this.ashtrayPins.visible = state.bobbyPins === 'ashtray';
    this.rearNeedles.visible = state.usedNeedles === 'pizzaRear';
    this.dildo.visible = state.dildo === 'counter' || state.dildo === 'ronnie';
    if (state.dildo === 'ronnie') {
      // Ronnie's trophy, waved overhead with total commitment.
      this.dildo.position.set(1.28 + Math.sin(state.elapsed * 5) * 0.06, 1.12 + Math.abs(Math.sin(state.elapsed * 7)) * 0.1, 2.7);
      this.dildo.rotation.set(0, 0, Math.sin(state.elapsed * 9) * 0.7);
    } else {
      this.dildo.position.set(-1.16, 1.05, -1.3);
      this.dildo.rotation.set(0, 0, 0);
    }
    // Doors swing out into the aisle, never into the carcass.
    for (const id of Object.keys(this.cabDoors)) this.cabDoors[id].rotation.y = state.cabinets[id as CabinetId] ? 1.1 : 0;
    this.rearCabDoor.rotation.y = state.cabinetUnlocked ? 1.2 : 0;
    this.rearCabLock.visible = !state.cabinetUnlocked;
    this.bolt.rotation.y = state.bracketWork * 0.7;
    this.bolt.position.y = 0.037 + state.bracketWork * 0.005;
    const loose = isFree(state) && !state.bracketConcealed;
    this.fitting.position.set(loose ? 0.63 : 0.49, loose ? 0.044 : 0.05, loose ? -1.68 : -1.44);
    this.fitting.rotation.y = loose ? 0.43 : 0;
    this.chain.position.y = loose ? 0.012 : 0.12;
    const encounter = state.encounter;
    const isDarlene = encounter.visitor === 'darlene';
    const { smoothstep, lerp } = THREE.MathUtils;
    const phase = encounter.phase;
    const drag = !isDarlene && (encounter.purpose === 'dance' && (phase === 'entering' || phase === 'dance' || phase === 'leaving') || encounter.nextPurpose === 'dance');
    // Entrances are violent: the door bangs open, they charge in, the door slams shut behind them.
    let walk = 0;
    let door = 0;
    let rattle = 0;
    if (phase === 'entering') {
      const t = ENTER_SECONDS - encounter.remaining;
      walk = smoothstep(t, 0.06, 0.8);
      door = t < 0.1 ? t / 0.1 : t < 0.9 ? 1 : Math.max(0, 1 - (t - 0.9) / 0.07);
      rattle = t > 0.97 ? Math.sin((t - 0.97) * 55) * 0.06 * Math.max(0, 1 - (t - 0.97) / 0.6) : 0;
    } else if (phase === 'leaving') {
      const t = LEAVE_SECONDS - encounter.remaining;
      walk = 1 - smoothstep(t, 0.1, 0.75);
      door = t < 0.08 ? t / 0.08 : t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.07);
      rattle = t > 0.92 ? Math.sin((t - 0.92) * 55) * 0.06 * Math.max(0, 1 - (t - 0.92) / 0.6) : 0;
    } else if (phase === 'dialogue' || phase === 'search' || phase === 'kiss' || phase === 'dance') walk = 1;
    const inside = walk > 0;
    const insideZ = drag && phase === 'leaving' ? -1.25 : INSIDE_Z;
    const depth = phase === 'idle' ? patrolDepth(encounter.patrol) : phase === 'alarm' ? encounter.origin : phase === 'approach' ? lerp(encounter.origin, -0.225, smoothstep(1 - encounter.remaining / APPROACH_SECONDS, 0, 0.85)) : lerp(-0.225, insideZ, smoothstep(walk, 0.5, 1));
    this.cletus.visible = !isDarlene || !inside;
    this.darlene.visible = isDarlene && inside;
    const active = isDarlene ? this.darlene : this.cletus;
    const activeLegs = isDarlene ? this.darleneLegs : this.cletusLegs;
    active.position.set(lerp(2.25, isDarlene ? 0.75 : 0.6, walk), 0, depth);
    active.rotation.set(0, inside ? phase === 'leaving' ? -Math.PI / 2 : Math.PI / 2 : Math.cos(encounter.patrol * 0.48) > 0 ? Math.PI : 0, 0);
    if (phase === 'dialogue' || phase === 'search' || (phase === 'entering' && walk > 0.8)) active.rotation.y = 0;
    if (phase === 'search') active.position.x = lerp(0.75, 0.2, Math.abs(Math.sin(state.elapsed * 1.5)) * 0.6);
    const doorAngle = -door * 1.8 + rattle;
    if (doorAngle !== 0 && ((door >= 1 && this.doorState < 1) || (door <= 0 && this.doorState > 0.5))) this.shake = 1;
    this.doorState = door;
    this.doorHinge.rotation.y = doorAngle;
    // Charging in or out: bent forward, twitching, legs pumping.
    const rushing = (phase === 'entering' || phase === 'leaving') && walk > 0 && walk < 1;
    const running = phase === 'approach' || rushing;
    if (rushing) {
      active.rotation.x = 0.22;
      active.rotation.z = Math.sin(state.elapsed * 31) * 0.07;
      active.position.y = -Math.abs(Math.sin(state.elapsed * 16)) * 0.05;
    }
    const moving = phase === 'idle' || phase === 'approach' || phase === 'entering' || phase === 'leaving' || phase === 'search';
    activeLegs.forEach((leg, index) => { leg.rotation.x = moving ? Math.sin(state.elapsed * (running ? 17 : 7) + index * Math.PI) * (running ? 0.55 : 0.27) : 0; });
    this.cletusHead.rotation.set(0, phase === 'dialogue' && !isDarlene ? Math.sin(state.elapsed * 1.2) * 0.15 : 0, -0.1);
    this.darleneHead.rotation.y = (phase === 'dialogue' || phase === 'search') && isDarlene ? Math.sin(state.elapsed * 1.1) * 0.14 : 0;
    if (rushing && !isDarlene) this.cletusHead.rotation.set(Math.sin(state.elapsed * 23) * 0.2, Math.sin(state.elapsed * 13) * 0.4, -0.1);
    if (rushing && isDarlene) this.darleneHead.rotation.y = Math.sin(state.elapsed * 19) * 0.35;
    this.cletusLips.scale.set(1, 1, 1);
    this.cletusArms.forEach((arm, index) => arm.rotation.set(rushing ? Math.sin(state.elapsed * 17 + index * Math.PI) * 0.9 : 0, 0, 0));
    this.kissLight.intensity = 0;
    this.dragParts.forEach(part => { part.visible = drag; });
    if (phase === 'dance') this.dance(DANCE_SECONDS - encounter.remaining);
    if (encounter.phase === 'kiss') {
      const elapsed = 6 - encounter.remaining;
      const approach = elapsed < 3 ? THREE.MathUtils.smoothstep(elapsed, 0.5, 3) : 1 - THREE.MathUtils.smoothstep(elapsed, 4, 6);
      const lean = THREE.MathUtils.smoothstep(approach, 0.65, 1);
      this.cletus.position.set(THREE.MathUtils.lerp(0.6, 0.37, approach), -lean * 0.24, THREE.MathUtils.lerp(INSIDE_Z, -2.72, approach));
      this.kissLight.intensity = lean * 0.8;
      this.cletus.rotation.y = -0.09;
      this.cletusHead.rotation.x = -lean * 0.22;
      this.cletusHead.rotation.y = 0;
      this.cletusLips.scale.set(1 - lean * 0.5, 1 + lean * 0.5, 1 + lean * 1.8);
      this.cletusLegs.forEach((leg, index) => { leg.rotation.x = approach < 0.96 ? Math.sin(elapsed * 8 + index * Math.PI) * 0.2 : 0; });
    }
    const other = this.scene.getObjectByName('outside-neighbor')!;
    other.position.set(-2.18, 0, patrolDepth(encounter.patrol + 5));
    other.rotation.y = Math.cos((encounter.patrol + 5) * 0.48) > 0 ? Math.PI : 0;
    this.witness.rotation.z = encounter.phase === 'alarm' ? Math.sin(state.elapsed * 14) * 0.035 : encounter.agitation / 2000;
    // Darlene's cigarette smoke, rising from the ember. Only when she is inside.
    this.smoke.forEach((sprite, index) => {
      const isDarlene = this.state.encounter.visitor === 'darlene';
      if (!isDarlene) { sprite.material.opacity = 0; return; }
      const cycle = (this.state.elapsed * 0.25 + index / this.smoke.length) % 1;
      sprite.position.set(0.05 + cycle * 0.05, -0.075 + cycle * 0.4, -0.22 - cycle * 0.05);
      const scale = 0.04 + cycle * 0.22;
      sprite.scale.set(scale, scale, scale);
      sprite.material.opacity = 0.3 * (1 - cycle);
    });
  }

  // Twenty seconds, four movements, 125 BPM. Faces the seat camera at rotation 0.
  private dance(t: number): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const beat = t * 125 / 60;
    const sway = Math.sin(beat * Math.PI);
    const enter = smoothstep(t, 0, 1.2);
    const close = t < 17.5 ? smoothstep(t, 15, 17.2) : 1 - smoothstep(t, 18.2, 19.8);
    this.cletus.position.set(lerp(0.6, 0.55, enter) + sway * 0.1 * (1 - close), -Math.abs(sway) * 0.035 - close * 0.18, lerp(lerp(INSIDE_Z, -1.25, enter), -2.5, close));
    this.cletus.rotation.set(0, 0, sway * (t > 10 && t < 15 ? 0.15 : 0.08));
    const [left, right] = this.cletusArms;
    const arms = (z: number, x: number, flutter = 0) => {
      left.rotation.set(x, 0, -z - flutter);
      right.rotation.set(x, 0, z + flutter);
    };
    if (t < 5) {
      // "Do you like my body?" Hands sliding up and down his own sides.
      const stroke = (Math.sin(beat * Math.PI / 2) + 1) / 2;
      arms(0.25 + stroke * 0.2, 0.35 + stroke * 0.5);
      this.cletusHead.rotation.set(-0.15, sway * 0.25, 0.25);
    } else if (t < 10) {
      // Arms up, slow spin.
      this.cletus.rotation.y = smoothstep(t, 5.5, 9.5) * Math.PI * 2;
      arms(2.7, 0, Math.sin(beat * Math.PI * 2) * 0.2);
      this.cletusHead.rotation.set(0.1, 0, sway * 0.3);
    } else if (t < 15) {
      // Hands on hips, rolling them at you. Tongue business implied.
      arms(0.55 + Math.abs(sway) * 0.15, -0.25);
      this.cletusHead.rotation.set(-0.1, Math.sin(beat * Math.PI * 0.5) * 0.3, -sway * 0.2);
    } else {
      // Shuffles in close, arms out like he is offering a hug nobody asked for.
      arms(lerp(0.9, 1.35, close), lerp(0, 1.0, close));
      this.cletusHead.rotation.set(-close * 0.28, 0, 0.12);
      this.cletusLips.scale.set(1 - close * 0.5, 1 + close * 0.5, 1 + close * 1.8);
      this.kissLight.intensity = close * 0.9;
    }
    this.cletusLegs.forEach((leg, index) => { leg.rotation.x = Math.sin(beat * Math.PI + index * Math.PI) * (close > 0 && close < 1 ? 0.22 : 0.16); });
  }

  setHover(id: HotspotId | null): void {
    if (this.hovered === id) return;
    this.hovered = id;
    this.outline.selectedObjects = id ? this.targets.filter(target => target.id === id).map(target => target.object) : [];
  }

  // A fresh copy of an item's model for the close-up inspection view.
  itemModel(item: ItemId): THREE.Object3D {
    const sources: Partial<Record<ItemId, THREE.Object3D>> = {
      spoon: this.spoon, rag: this.rag, screwdriver: this.screwdriver, brassKey: this.brassKey, finalKey: this.finalKey,
      magnet: this.magnet, beenie: this.beenie, lotto: this.lotto, choke: this.choke, dildo: this.dildo,
      zwinkys: this.zwinkysCan, bobbyPins: this.ashtrayPins, usedNeedles: this.rearNeedles, axe: this.axe,
    };
    let source = sources[item];
    if (!source) {
      if (!this.butt.children.length) this.buttModel(this.butt);
      source = this.butt;
    }
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.scale.set(1, 1, 1);
    copy.traverse(object => { object.visible = true; });
    return copy;
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
    if (encounter === 'kiss') return { eye: [0.35, 1.32, -3.3], aim: [0.37, 1.4, -0.3], fov: 72 };
    if (encounter === 'dance') return { eye: [0.35, 1.32, -3.3], aim: [this.cletus.position.x, 1.36 + this.cletus.position.y * 0.5, this.cletus.position.z], fov: 66 };
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
    this.composer.setSize(Math.round(width * resolution), Math.round(height * resolution));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(delta: number, time: number): void {
    const shot = this.currentShot();
    const phase = this.state.encounter.phase;
    // Hard cut to the door the instant it bangs open.
    const blend = this.reduced || phase === 'dialogue' || phase === 'entering' ? 1 : 1 - Math.exp(-delta * 8);
    this.camera.position.lerp(new THREE.Vector3(...shot.eye), blend);
    this.aim.lerp(new THREE.Vector3(...shot.aim), blend);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, shot.fov, blend);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.aim);
    if (this.shake > 0.01 && !this.reduced) {
      const jolt = this.shake * 0.045;
      this.camera.position.x += (Math.random() - 0.5) * jolt;
      this.camera.position.y += (Math.random() - 0.5) * jolt;
      this.camera.rotation.z += (Math.random() - 0.5) * jolt * 0.8;
    }
    this.shake *= Math.exp(-delta * 5);
    this.drawer.position.x = THREE.MathUtils.lerp(this.drawer.position.x, this.state.drawerOpen ? DRAWER_OPEN : DRAWER_SHUT, blend);
    this.cushion.rotation.z = THREE.MathUtils.lerp(this.cushion.rotation.z, this.state.cushionRaised ? -1.0 : 0, blend);
    this.witness.scale.y = this.reduced ? 1 : 1 + Math.sin(time * 1.4) * 0.003;
    this.blueLight.intensity = this.reduced ? 3 : 3 + Math.sin(time * 8.3) * 0.075;
    if (this.hovered) this.composer.render(delta);
    else this.renderer.render(this.scene, this.camera);
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
    this.composer.dispose();
    this.renderer.dispose();
  }
}