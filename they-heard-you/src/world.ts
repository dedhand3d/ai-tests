import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { canvasTexture, dirtyTexture, lettering, seededRandom } from './textures';
import { Television } from './tv';
import { FIRE_FULL, FIRE_SPOTS, hasStash, isFree, tripLevel, type CabinetId, type FireSpot, type GameState, type HotspotId, type ItemId, type ViewId } from './state';
import { BULB_SECONDS, BULB_TRIP_AT, DALE_HIT_AT, HANGOUT_SECONDS, RADIO_PLACED_AT, TORCH_AT } from './encounters';
import { APPROACH_SECONDS, DANCE_SECONDS, DOUSE_HIT, DOUSE_SECONDS, ENTER_SECONDS, GRAB_HITS, GRAB_SECONDS, INSIDE_Z, KILL_HIT, KILL_SECONDS, LEAVE_SECONDS, RAMPAGE_SECONDS, TV_ON_AT, TVSHOW_SECONDS, VISITOR_IDS, patrolDepth, visitorIndex, type VisitorId } from './encounters';

type Position = [number, number, number];
type Surface = THREE.Material | THREE.Material[];
export interface Hit { id: HotspotId; x: number; y: number; }
interface Target { id: HotspotId; object: THREE.Object3D; }
// A visitor's body: root faces -z at rotation 0; limbs pivot at hip and shoulder.
interface Rig { root: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[]; head: THREE.Group; homeX: number; insideX: number; height: number; }
type Key = [number, number, number, number];
// Smoothly interpolated [time, x, z, facing] keyframes.
function keyframed(keys: Key[], time: number): [number, number, number] {
  if (time <= keys[0][0]) return [keys[0][1], keys[0][2], keys[0][3]];
  for (let index = 1; index < keys.length; index++) {
    const [at, x, z, facing] = keys[index];
    if (time > at) continue;
    const [from, px, pz, pFacing] = keys[index - 1];
    const blend = THREE.MathUtils.smoothstep(time, from, at);
    return [THREE.MathUtils.lerp(px, x, blend), THREE.MathUtils.lerp(pz, z, blend), THREE.MathUtils.lerp(pFacing, facing, blend)];
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2], last[3]];
}
// Where she goes hunting her lighter: upper cabinets, drawer, lower cabinets, your face, on her knees in the
// trash, then right in front of you to find it in her own fist and fling it down, then out.
const RAMPAGE_PATH: Key[] = [
  [0, 0.75, -0.7, 0], [0.45, -0.3, -2.55, Math.PI / 2], [0.9, -0.3, -1.85, Math.PI / 2], [1.3, -0.3, -1.15, Math.PI / 2],
  [2.1, -0.3, -1.7, Math.PI / 2], [2.8, -0.3, -1.3, Math.PI / 2], [3.2, 0.12, -1.49, Math.PI / 2], [4.4, 0.12, -1.49, Math.PI / 2],
  [4.6, 0.02, -2.55, Math.PI / 2], [5.0, 0.02, -1.85, Math.PI / 2], [5.4, 0.02, -1.1, Math.PI / 2], [5.9, 0.02, -1.1, Math.PI / 2],
  [6.4, 0.42, -2.25, 0], [8.4, 0.42, -2.25, 0], [9.2, -0.42, 0.42, 0.44], [11.4, -0.42, 0.42, 0.44],
  [12.0, 0.3, -1.4, 0], [12.9, 0.3, -1.4, 0], [14.5, 0.75, -0.5, -Math.PI / 2],
];
// The lighter's trip from her raised fist to the floor by the couch.
const THROW_FROM = new THREE.Vector3(0.49, 1.97, -1.72);
// On top of the drift of floor papers, never buried under them.
const LIGHTER_FLOOR = new THREE.Vector3(0.22, 0.034, -1.72);
const TRASH_BAG = new THREE.Vector3(-0.61, 0.19, 0.02);

// Dale's visit: in the door, over to set the radio down and hit play, then back onto the couch beside you.
// Ends standing in front of the couch, feet where they will be once he sits.
const DALE_PATH: Key[] = [[0, 0.7, -0.7, 0], [0.8, 0.63, -0.84, 0.3], [2.6, 0.63, -0.84, 0.3], [3.2, 0.52, -1.74, 1.0]];
// The couch seat is high (cushion top 0.65, base front face at x 0.75), so he perches on the front edge, hunched:
// hips just past the edge, thighs angled down off it, shins straight down in front of the base, feet on the floor.
// Every joint angle is absolute from straight down; the root is placed so the hips land on the edge whatever the lean.
const DALE_SEAT = { hip: new THREE.Vector3(0.76, 0.75, -1.6), facing: 1.0, thigh: 0.92, shin: 0.08, hunch: -0.1 };
const RADIO_SPOT = new THREE.Vector3(0.55, 0, -1.08);
// The bulb held up in front of your face when you take your hit, between you and Dale.
const BULB_CAM = new THREE.Vector3(0.51, 1.25, -2.83);
const SEAT_EYE = new THREE.Vector3(0.35, 1.32, -3.3);
// His tallboy: half its height, how far its axis sits off his mitt's centre (the fingers wrap the near side),
// and where it stands on the cushion beside him while he smokes.
const CAN_HALF = 0.077;
const CAN_GRIP = 0.048;
// Base on the cushion top (0.65), so its centre sits half a can higher.
const COUCH_CAN = new THREE.Vector3(0.98, 0.65 + CAN_HALF, -1.9);
// Seconds of each of Dale's drinks, as [start, end].
const SIPS: [number, number][] = [[5.0, 6.4], [9.6, 11.0], [14.2, 15.4]];

// What can burn: where the flames sit, how big they get, where Cletus stands to throw the bucket,
// and the shot you watch it from.
interface FireSite { at: Position; radius: number; height: number; stand: [number, number]; shot: { eye: Position; aim: Position; fov: number }; }
// Each shot keeps his head just under the top banner and the fire in frame below it. The papers burn at
// your feet, so for that one you are up off the couch with a wide, panicked view.
const FIRE_SITES: Record<FireSpot, FireSite> = {
  floorPapers: { at: [0.34, 0, -1.92], radius: 0.34, height: 1.15, stand: [0.52, -1.0], shot: { eye: [0.35, 1.75, -3.3], aim: [0.42, 1.26, -1.0], fov: 90 } },
  trash: { at: [-0.61, 0.3, 0.02], radius: 0.3, height: 1.0, stand: [0.12, -0.5], shot: { eye: [0.35, 1.32, -3.3], aim: [-0.15, 1.42, -0.3], fov: 62 } },
  pizza: { at: [-0.31, 0.95, 1.54], radius: 0.22, height: 0.75, stand: [0.38, 1.05], shot: { eye: [0.36, 1.39, -0.74], aim: [0.0, 1.39, 1.3], fov: 70 } },
  pizzaRear: { at: [0.28, 0.44, 3.55], radius: 0.22, height: 0.75, stand: [0.52, 2.95], shot: { eye: [0.2, 1.62, 1.75], aim: [0.15, 1.15, 3.3], fov: 70 } },
};
// Cletus's TV night: to the set, face it for the smack, then turn to you and the screen, then out.
const TV_SHOW_PATH: Key[] = [
  [0, 0.6, -0.7, 0], [0.4, 0.5, -0.6, -2.4], [1.6, 0.4, 0.12, -2.2], [2.5, 0.4, 0.12, -2.2], [3.1, 0.12, 0.3, -0.45],
  [23.2, 0.12, 0.3, -0.45], [24.2, 0.4, -0.3, -Math.PI / 2], [27, 0.6, -0.7, -Math.PI / 2],
];

const CAMERAS: Record<ViewId, { eye: Position; aim: Position; fov: number }> = {
  seat: { eye: [0.35, 1.32, -3.3], aim: [0.62, 1.03, -0.2], fov: 72 },
  kitchen: { eye: [0.64, 1.24, -2.54], aim: [-1.1, 0.83, -1.4], fov: 63 },
  bracket: { eye: [0.5, 1.02, -2.8], aim: [0.52, 0.16, -1.58], fov: 61 },
  dinette: { eye: [0.36, 1.39, -0.74], aim: [-0.12, 1.11, 1.62], fov: 70 },
  // Standing in the doorway of Ronnie's room, past the dinette, looking down a little: hatch, footlocker,
  // nightstand and Ronnie all in frame and nothing from the dinette in the way.
  rear: { eye: [0.38, 1.62, 1.85], aim: [-0.1, 0.72, 3.4], fov: 72 },
};

// Floor litter stays on open floor: the main aisle, or the strip between the rear bunk and Ronnie's couch.
// Each paper gets its own height so overlapping sheets never z-fight.
const paperHeight = (index: number) => -0.017 + index * 0.0011;
// Cabinet doors hinged on their far edge (toward the dinette), so they open toward the couch and kitchen views.
const FAR_HINGED = new Set(['k2', 'k3', 'u2', 'u3']);
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
  private readonly darleneArms: THREE.Group[] = [];
  // Every visitor's body, keyed by id, so the shared door/grab/kill choreography works for anyone added later.
  private readonly rigs = {} as Record<VisitorId, Rig>;
  private grabClock = -1;
  private readonly darleneHead = new THREE.Group();
  private readonly smoke: THREE.Sprite[] = [];
  private readonly displacedProps: THREE.Object3D[] = [];
  private layout = -1;
  private readonly chain = new THREE.Group();
  private readonly fitting = new THREE.Group();
  private readonly bolt = new THREE.Group();
  private readonly witness = new THREE.Group();
  private readonly ronnieChest = new THREE.Group();
  private readonly ronnieArm = new THREE.Group();
  private readonly ronnieHand = new THREE.Group();
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
  private readonly lighter = new THREE.Group();
  private readonly puddle = new THREE.Group();
  // Fire: flames, smoke and light on whatever is burning; a scorch and char once it has been put out.
  private readonly fire = new THREE.Group();
  private readonly flames: THREE.Sprite[] = [];
  private readonly fireSmoke: THREE.Sprite[] = [];
  private readonly fireLight = new THREE.PointLight(0xff7a2a, 0, 5.5, 2);
  private readonly fireBed = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  private readonly steam: THREE.Sprite[] = [];
  private readonly scorches = {} as Record<FireSpot, THREE.Mesh>;
  private readonly charred = new THREE.MeshStandardMaterial({ color: 0x120e0b, roughness: 1 });
  private readonly unburnt = new Map<THREE.Mesh, Surface>();
  private burntKey = '';
  private douseClock = -1;
  private baseFov = 66;
  private readonly bag: THREE.Mesh[] = [];
  private readonly bucket = new THREE.Group();
  private readonly bucketWater = new THREE.Group();
  private readonly water: THREE.Mesh[] = [];
  private readonly splashes: THREE.Mesh[] = [];
  private readonly garbage: THREE.Mesh[] = [];
  // Darlene's lighter, in her fist the whole time she screams for it; and in the air when she finally flings it.
  private readonly heldLighter = new THREE.Group();
  private readonly cletusKey = new THREE.Group();
  private readonly thrownLighter = new THREE.Group();
  private puffMap: THREE.Texture | null = null;
  // Dale, his radio, his beer, his bulb and his torch.
  private readonly dale = new THREE.Group();
  private readonly daleLegs: THREE.Group[] = [];
  private readonly daleKnees: THREE.Group[] = [];
  private readonly daleArms: THREE.Group[] = [];
  private readonly daleElbows: THREE.Group[] = [];
  private readonly daleHead = new THREE.Group();
  private readonly radio = new THREE.Group();
  private readonly radioCones: THREE.Object3D[] = [];
  private readonly radioDisplay = new THREE.MeshStandardMaterial({ color: 0x1d2a18, emissive: 0x6dff4a, emissiveIntensity: 0, roughness: 0.4 });
  private readonly daleCan = new THREE.Group();
  private readonly bulb = new THREE.Group();
  private readonly bulbSmoke = new THREE.MeshBasicMaterial({ color: 0xd9d9d0, transparent: true, opacity: 0, depthWrite: false });
  private readonly torchFlame = new THREE.Group();
  private readonly exhale: THREE.Sprite[] = [];
  readonly tv = new Television();
  readonly tvSpeaker = new THREE.Vector3();
  private readonly tvScreen = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.27 });
  private readonly ronnieJaw = new THREE.Group();
  private readonly ronnieFlies: THREE.Mesh[] = [];
  private readonly ronniePupils: THREE.Mesh[] = [];
  private readonly composer: EffectComposer;
  private readonly outline: OutlinePass;
  private hovered: HotspotId | null = null;
  private shake = 0;
  private doorState = 0;
  private readonly cabTargets: Record<string, number> = {};
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
    this.buildFire();
    this.buildLighting();
    this.applyState(state);
    for (const id of Object.keys(this.cabDoors)) this.cabDoors[id].rotation.y = this.cabTargets[id] ?? 0;
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
      // The blinds are a hotspot: peek through them, or throw things out past them.
      const blinds = new THREE.Group();
      this.scene.add(blinds);
      this.register('blinds', blinds);
      for (let blind = 0; blind < 11; blind++) {
        const slat = this.box([0.045, 0.036, width - 0.1], [side * 1.556, 1.13 + blind * 0.075, center], blindMaterial, blinds);
        slat.rotation.z = side * (blind === 4 ? 0.62 : 0.14);
        if (blind === 7) slat.rotation.x = 0.04;
      }
      for (const end of [center - width / 2 - 0.12, center + width / 2 + 0.02]) {
        // The curtain at the foot of Ronnie's couch stops above the backrest instead of hanging through it.
        const aboveCouch = side === 1 && end > 1.9;
        for (let pleat = 0; pleat < 4; pleat++) {
          this.cylinder(0.041, aboveCouch ? 0.93 : 1.28, [side * 1.5, aboveCouch ? 1.605 : 1.43, end + pleat * 0.045], this.cloth);
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
    // The nearest door in each row hinges on its near edge; the two farther ones hinge on their far edge, so
    // they swing open toward the couch like a book and you can see inside (FAR_HINGED).
    for (let panel = 0; panel < 3; panel++) {
      const hinge = new THREE.Group();
      const far = FAR_HINGED.has(`k${panel + 1}`) ? -1 : 1;
      hinge.position.set(-0.86, 0.36, -2.59 + panel * 0.75 - 0.32 + (far < 0 ? 0.64 : 0));
      this.scene.add(hinge);
      this.box([0.03, 0.58, 0.64], [0, 0, 0.32 * far], this.wood, hinge);
      this.box([0.075, 0.035, 0.18], [0.057, 0.22, 0.52 * far], this.metal, hinge);
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
      const far = FAR_HINGED.has(`u${panel + 1}`) ? -1 : 1;
      hinge.position.set(-1.04, 2.03, -2.56 + panel * 0.72 - 0.34 + (far < 0 ? 0.68 : 0));
      this.scene.add(hinge);
      this.box([0.055, 0.4, 0.67], [0, 0, 0.34 * far], this.wood, hinge);
      this.box([0.07, 0.13, 0.025], [0.09, -0.04, 0.51 * far], this.metal, hinge);
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
    // The screen shows whatever the Television is doing: dead glass, snow, or a movie clip.
    this.tvScreen.map = this.tv.texture;
    this.tvScreen.emissiveMap = this.tv.texture;
    const screen = this.box([0.62, 0.45, 0.035], [-0.025, 0.034, -0.318], this.tvScreen, tv);
    screen.castShadow = false;
    this.box([0.012, 0.012, 0.007], [0.3, -0.257, -0.318], new THREE.MeshBasicMaterial({ color: 0xd85131 }), tv);
    for (let slot = 0; slot < 5; slot++) this.box([0.046, 0.009, 0.006], [0.295, -0.02 + slot * 0.024, -0.318], this.dark, tv);
    for (const side of [-1, 1]) {
      const antenna = this.cylinder(0.004, 0.41, [side * 0.14, 0.48, 0.02], this.metal, tv, 5);
      antenna.rotation.z = side * 0.6;
    }
    this.register('tv', tv);
    // The speaker grille, beside the screen: where the TV's sound comes from.
    tv.updateMatrixWorld(true);
    this.tvSpeaker.copy(tv.localToWorld(new THREE.Vector3(0.29, 0.0, -0.32)));
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

  // Ronnie's sickroom, laid out to read from the Rear bunk camera with nothing in front of anything:
  //   back wall   the bunk, and the glued, taped-over emergency hatch above it
  //   left        an army footlocker at the foot of the bunk, facing you, padlocked, under a bare bulb
  //   middle      a milk-crate nightstand with the needle pizza box on it
  //   right       Ronnie on his couch
  private buildRear(): void {
    // A header beam and a stub on Ronnie's side say "different room" without blocking the view.
    this.box([0.4, 1.2, 0.12], [1.5, 1.72, 2.55], this.wood);
    this.box([3.3, 0.23, 0.14], [0, 2.22, 2.55], this.wood);
    // The bunk along the back wall: a low platform, a sagging mattress, a stained sheet, a gray pillow.
    this.box([1.42, 0.36, 0.8], [-0.9, 0.18, 3.5], this.wood);
    this.box([1.36, 0.14, 0.76], [-0.9, 0.43, 3.5], this.cloth);
    const sheet = this.box([1.0, 0.04, 0.7], [-0.75, 0.52, 3.48], new THREE.MeshStandardMaterial({ color: 0x9a9479, map: dirtyTexture('ceiling', 97), roughness: 1 }));
    sheet.rotation.z = 0.03;
    this.stain([-0.7, 0.545, 3.45], [0.5, 0.35]);
    this.orb([0.26, 0.08, 0.17], [-1.38, 0.56, 3.55], new THREE.MeshStandardMaterial({ color: 0x8a8578, map: dirtyTexture('ceiling', 777), roughness: 1 }));
    // The emergency hatch over the bunk: glued along every seam, duct tape in a big X. Not an exit.
    const hatch = new THREE.Group();
    hatch.position.set(-0.85, 1.42, 3.9);
    this.scene.add(hatch);
    this.box([1.1, 0.72, 0.05], [0, 0, 0], this.metal, hatch);
    this.box([0.96, 0.58, 0.03], [0, 0, -0.04], this.dark, hatch);
    const tape = new THREE.MeshStandardMaterial({ color: 0xa9aca8, metalness: 0.4, roughness: 0.5 });
    for (const lean of [-0.55, 0.55]) this.box([1.12, 0.08, 0.01], [0, 0, -0.065], tape, hatch).rotation.z = lean;
    const glue = new THREE.MeshStandardMaterial({ color: 0xd8d2a8, roughness: 0.25, metalness: 0.05 });
    for (let drip = 0; drip < 7; drip++) this.orb([0.012, 0.03 + (drip % 3) * 0.015, 0.01], [-0.45 + drip * 0.15, -0.33 - (drip % 3) * 0.015, -0.03], glue, hatch);
    this.register('hatch', hatch);
    this.sign(['EMERGENCY EXIT', 'NOPE'], [0.5, 0.16], [-0.85, 1.9, 3.86], Math.PI);

    // Ronnie's couch: olive, stained through, a pillow gone brown where his head lives.
    const olive = new THREE.MeshStandardMaterial({ color: 0x5c5a30, map: dirtyTexture('cloth', 121), roughness: 1 });
    this.box([0.68, 0.44, 1.92], [1.1, 0.24, 2.94], this.wood);
    this.box([0.71, 0.2, 1.91], [1.1, 0.53, 2.94], olive);
    this.box([0.15, 0.64, 1.96], [1.49, 0.78, 2.94], olive);
    // Arms stop short of the backrest and the rear wall so no faces overlap.
    for (const depth of [1.98, 3.85]) this.box([0.66, 0.35, 0.12], [1.085, 0.68, depth], olive);
    this.orb([0.25, 0.1, 0.19], [1.12, 0.72, 3.66], new THREE.MeshStandardMaterial({ color: 0xb4a57f, map: dirtyTexture('ceiling', 606), roughness: 1, flatShading: true }));
    this.buildRonnie();
    this.register('ronnie', this.witness);

    // The footlocker at the foot of the bunk: army green, brass corners, a cheap padlock on the front.
    // The lid hinges at the back and swings up, so the inside of the lid (and the note) faces you.
    this.rearCab.position.set(-0.2, 0, 2.95);
    this.scene.add(this.rearCab);
    const army = new THREE.MeshStandardMaterial({ color: 0x55603f, map: dirtyTexture('metal', 919), roughness: 0.8, metalness: 0.2 });
    const cabInside = new THREE.MeshStandardMaterial({ color: 0x3d3226, map: dirtyTexture('wood', 919), roughness: 1 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.7, roughness: 0.4 });
    this.box([0.78, 0.03, 0.44], [0, 0.03, 0], cabInside, this.rearCab);
    for (const side of [-1, 1]) this.box([0.03, 0.4, 0.44], [side * 0.375, 0.22, 0], army, this.rearCab);
    for (const side of [-1, 1]) this.box([0.78, 0.4, 0.03], [0, 0.22, side * 0.205], army, this.rearCab);
    for (const x of [-1, 1]) for (const z of [-1, 1]) this.box([0.05, 0.05, 0.05], [x * 0.37, 0.42, z * 0.2], brass, this.rearCab);
    this.box([0.6, 0.012, 0.005], [0, 0.32, -0.222], new THREE.MeshStandardMaterial({ color: 0xd8d2b8, roughness: 1 }), this.rearCab);
    // The axe and the paperback lying in the bottom.
    this.axe.position.set(-0.08, 0.1, 0.02);
    this.axe.rotation.set(0, 0.25, Math.PI / 2);
    this.axeModel(this.axe);
    this.rearCab.add(this.axe);
    this.register('axe', this.axe);
    this.choke.position.set(0.22, 0.07, 0.06);
    this.choke.rotation.set(0, 0.4, 0);
    this.box([0.2, 0.03, 0.14], [0, 0, 0], new THREE.MeshStandardMaterial({ map: lettering(['CHOKE ON', 'MY LOVE'], '#7d4a8c', '#e8c8f0', 128), roughness: 1 }), this.choke);
    this.rearCab.add(this.choke);
    this.register('choke', this.choke);
    // The lid, with the note taped inside it.
    this.rearCabDoor.position.set(0, 0.42, 0.22);
    this.rearCab.add(this.rearCabDoor);
    this.box([0.8, 0.05, 0.46], [0, 0.025, -0.23], army, this.rearCabDoor);
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ map: lettering(['KEY STAYS', 'ON CLETUS.', 'ALWAYS.'], '#ece4c8', '#1c1c1c', 128), roughness: 1 }));
    note.rotation.x = Math.PI / 2;
    note.position.set(0, -0.003, -0.24);
    this.rearCabDoor.add(note);
    // The padlock: oversized and right on the front, so there is no question what is locked.
    this.rearCabLock.position.set(0, 0.33, -0.245);
    this.rearCab.add(this.rearCabLock);
    this.box([0.12, 0.06, 0.02], [0, 0.06, 0.012], this.metal, this.rearCabLock);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 12, Math.PI), this.metal);
    shackle.position.set(0, 0.0, -0.01);
    this.rearCabLock.add(shackle);
    this.box([0.1, 0.11, 0.04], [0, -0.06, -0.01], brass, this.rearCabLock);
    this.register('rearCab', this.rearCab);
    // A bare bulb on a cord over the footlocker.
    this.cylinder(0.004, 0.55, [-0.2, 2.1, 2.95], this.dark);
    this.orb([0.035, 0.045, 0.035], [-0.2, 1.8, 2.95], new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd27a, emissiveIntensity: 2.2 }));
    const bulbLight = new THREE.PointLight(0xffd9a0, 2.4, 2.6, 2);
    bulbLight.position.set(-0.2, 1.72, 2.95);
    this.scene.add(bulbLight);

    // The nightstand: a red milk crate with the needle pizza box on top, under its own light.
    const crate = new THREE.MeshStandardMaterial({ color: 0x8c2a24, roughness: 0.7 });
    const nightstand = new THREE.Group();
    nightstand.position.set(0.28, 0, 3.55);
    this.scene.add(nightstand);
    this.box([0.4, 0.03, 0.34], [0, 0.015, 0], crate, nightstand);
    this.box([0.4, 0.03, 0.34], [0, 0.35, 0], crate, nightstand);
    for (const x of [-1, 1]) for (const z of [-1, 1]) this.box([0.03, 0.36, 0.03], [x * 0.185, 0.18, z * 0.155], crate, nightstand);
    for (const side of [-1, 1]) this.box([0.4, 0.05, 0.02], [0, 0.18, side * 0.16], crate, nightstand);
    const nightLight = new THREE.PointLight(0xffd9a0, 1.2, 1.6, 2);
    nightLight.position.set(0.25, 1.05, 3.35);
    this.scene.add(nightLight);

    // The needle pizza box on top of the crate. Lid open. It is not pizza in there.
    this.pizzaRear.position.set(0.28, 0.37, 3.55);
    this.pizzaRear.rotation.set(0, -0.3, 0);
    this.pizzaRear.scale.setScalar(0.95);
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
    this.buildDale();
    this.cletus.rotation.order = 'YXZ';
    this.rigs.cletus = { root: this.cletus, legs: this.cletusLegs, arms: this.cletusArms, head: this.cletusHead, homeX: 2.25, insideX: 0.6, height: 1.68 };
    this.rigs.darlene = { root: this.darlene, legs: this.darleneLegs, arms: this.darleneArms, head: this.darleneHead, homeX: 2.45, insideX: 0.75, height: 1.66 };
    this.rigs.dale = { root: this.dale, legs: this.daleLegs, arms: this.daleArms, head: this.daleHead, homeX: 2.35, insideX: 0.7, height: 1.62 };
  }

  // Dale, from the reference: short and round, buzzed fade, heavy sad brows, goatee, ear studs, a silver chain,
  // an oversized black ZWINKY ENERGY tee over a big gut, baggy jeans with a wallet chain, chunky dirty white
  // sneakers and mitten hands. Hips and knees bend so he can actually sit on the couch.
  private buildDale(): void {
    const dale = this.dale;
    dale.rotation.order = 'YXZ';
    this.scene.add(dale);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc58e69, roughness: 0.85, flatShading: true });
    const shadeSkin = new THREE.MeshStandardMaterial({ color: 0x9c6c4f, roughness: 0.9, flatShading: true });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, map: dirtyTexture('cloth', 777), roughness: 1 });
    // Faded blue denim: diagonal twill flecks and grime, not the camo-ish cloth texture the couches use.
    const denimCanvas = document.createElement('canvas');
    denimCanvas.width = denimCanvas.height = 64;
    const weave = denimCanvas.getContext('2d')!;
    weave.fillStyle = '#56709c';
    weave.fillRect(0, 0, 64, 64);
    const fleck = seededRandom(4311);
    for (let thread = 0; thread < 900; thread++) {
      const x = Math.floor(fleck() * 64);
      const y = Math.floor(fleck() * 64);
      weave.fillStyle = fleck() > 0.5 ? '#8aa2c8' : '#3b5079';
      weave.fillRect(x, y, 2, 1);
      weave.fillRect(x + 1, y + 1, 1, 1);
    }
    for (let stain = 0; stain < 18; stain++) { weave.fillStyle = '#2a2c2440'; weave.fillRect(fleck() * 64, fleck() * 64, 4 + fleck() * 9, 3 + fleck() * 6); }
    const denimMap = canvasTexture(denimCanvas);
    denimMap.wrapS = denimMap.wrapT = THREE.RepeatWrapping;
    denimMap.repeat.set(2, 3);
    const denim = new THREE.MeshStandardMaterial({ color: 0xffffff, map: denimMap, roughness: 1 });
    const sneaker = new THREE.MeshStandardMaterial({ color: 0xf4eedf, map: dirtyTexture('ceiling', 88), roughness: 0.9 });
    const sole = new THREE.MeshStandardMaterial({ color: 0xbdb5a3, roughness: 1 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x3a281b, roughness: 1, flatShading: true });
    const silver = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 0.9, roughness: 0.25 });
    // The gut, the chest and blocky shoulders, all in the tee; the hem hangs over the jeans.
    this.orb([0.27, 0.3, 0.25], [0, 1.08, 0.01], shirt, dale);
    this.orb([0.25, 0.19, 0.2], [0, 1.3, 0.02], shirt, dale);
    this.box([0.52, 0.12, 0.24], [0, 1.37, 0.02], shirt, dale);
    this.cylinder(0.255, 0.14, [0, 0.86, 0.01], shirt, dale, 12);
    // ZWINKY ENERGY, cracked green lettering with a lightning bolt.
    const printCanvas = document.createElement('canvas');
    printCanvas.width = 256; printCanvas.height = 160;
    const print = printCanvas.getContext('2d')!;
    print.fillStyle = '#9be35a';
    print.font = 'italic bold 66px Impact, sans-serif';
    print.textAlign = 'center';
    print.save(); print.transform(1, 0, -0.18, 1, 14, 0); print.fillText('ZWINKY', 128, 74); print.restore();
    print.beginPath(); print.moveTo(70, 82); print.lineTo(150, 96); print.lineTo(118, 100); print.lineTo(196, 128); print.lineTo(104, 108); print.lineTo(134, 104); print.closePath(); print.fill();
    print.fillStyle = '#c9c9c4';
    print.font = 'bold 30px sans-serif';
    print.fillText('ENERGY', 152, 146);
    // Wash it out: cracked, faded screen print.
    const crack = seededRandom(909);
    print.globalCompositeOperation = 'destination-out';
    for (let flake = 0; flake < 420; flake++) { print.fillStyle = `rgba(0,0,0,${0.3 + crack() * 0.7})`; print.fillRect(crack() * 256, crack() * 160, 1 + crack() * 3, 1 + crack() * 2); }
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.225), new THREE.MeshStandardMaterial({ map: canvasTexture(printCanvas), transparent: true, roughness: 1 }));
    logo.position.set(0, 1.16, -0.247);
    logo.rotation.set(-0.12, Math.PI, 0);
    dale.add(logo);
    // Thick neck and the silver chain.
    this.cylinder(0.075, 0.12, [0, 1.46, 0], skin, dale, 10);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.007, 4, 24), silver);
    chain.position.set(0, 1.4, -0.03);
    chain.rotation.x = Math.PI / 2 + 0.45;
    dale.add(chain);
    // The head.
    const head = this.daleHead;
    head.position.set(0, 1.6, -0.01);
    dale.add(head);
    this.orb([0.15, 0.165, 0.155], [0, 0, 0], skin, head);
    this.orb([0.12, 0.065, 0.1], [0, -0.115, -0.035], skin, head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hair);
    cap.scale.set(0.157, 0.172, 0.162);
    cap.position.y = 0.012;
    head.add(cap);
    for (const side of [-1, 1]) {
      this.orb([0.026, 0.045, 0.03], [side * 0.15, -0.01, 0.01], skin, head);
      this.orb([0.008, 0.008, 0.008], [side * 0.172, -0.042, -0.004], silver, head);
      // Heavy brows, inner ends hitched up: permanently sad.
      this.box([0.064, 0.018, 0.02], [side * 0.052, 0.048, -0.142], hair, head).rotation.z = -side * 0.32;
      this.orb([0.017, 0.012, 0.008], [side * 0.05, 0.012, -0.146], new THREE.MeshStandardMaterial({ color: 0x1b120e, roughness: 0.5 }), head);
      this.box([0.042, 0.013, 0.012], [side * 0.05, 0.024, -0.149], skin, head).rotation.z = -side * 0.22;
      this.orb([0.022, 0.01, 0.01], [side * 0.05, -0.006, -0.144], shadeSkin, head);
      this.orb([0.04, 0.035, 0.03], [side * 0.078, -0.045, -0.12], skin, head);
    }
    this.orb([0.026, 0.034, 0.03], [0, -0.022, -0.162], skin, head);
    // Mouth turned down at the corners, goatee under it.
    for (const side of [-1, 1]) this.box([0.028, 0.008, 0.008], [side * 0.014, -0.074 - (side * 0) - 0.003, -0.15], shadeSkin, head).rotation.z = side * 0.25;
    this.orb([0.032, 0.03, 0.02], [0, -0.118, -0.135], hair, head);
    this.box([0.012, 0.022, 0.01], [0, -0.092, -0.148], hair, head);
    // Short sleeves, thick arms with an elbow (so the beer and the bulb can reach his face), mitten hands.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.27, 1.38, 0.02);
      dale.add(shoulder);
      this.daleArms.push(shoulder);
      this.cylinder(0.078, 0.2, [side * 0.012, -0.09, 0], shirt, shoulder, 10);
      this.cylinder(0.056, 0.24, [side * 0.015, -0.18, 0], skin, shoulder, 8);
      const elbow = new THREE.Group();
      elbow.position.set(side * 0.015, -0.3, 0);
      shoulder.add(elbow);
      this.daleElbows.push(elbow);
      this.orb([0.055, 0.055, 0.055], [0, 0, 0], skin, elbow);
      this.cylinder(0.053, 0.27, [side * 0.005, -0.14, 0], skin, elbow, 8);
      this.orb([0.062, 0.078, 0.058], [side * 0.01, -0.31, 0], skin, elbow);
    }
    // Baggy jeans, a knee joint, and the sneakers.
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.105, 0.88, 0.01);
      dale.add(hip);
      this.daleLegs.push(hip);
      this.cylinder(0.112, 0.4, [0, -0.2, 0], denim, hip, 10);
      const knee = new THREE.Group();
      knee.position.y = -0.38;
      hip.add(knee);
      this.daleKnees.push(knee);
      this.cylinder(0.108, 0.42, [0, -0.21, 0], denim, knee, 10);
      this.box([0.135, 0.095, 0.27], [0, -0.45, -0.05], sneaker, knee);
      this.orb([0.068, 0.05, 0.08], [0, -0.452, -0.16], sneaker, knee);
      this.box([0.145, 0.03, 0.29], [0, -0.49, -0.05], sole, knee);
    }
    // The wallet chain, belt loop to back pocket, swinging off the left hip.
    const loop = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.2, 0.88, -0.08), new THREE.Vector3(-0.235, 0.7, -0.02), new THREE.Vector3(-0.22, 0.72, 0.1), new THREE.Vector3(-0.17, 0.86, 0.17)]);
    dale.add(new THREE.Mesh(new THREE.TubeGeometry(loop, 16, 0.006, 4, false), silver));
    // His beer: a red and white can, in the right hand.
    const red = new THREE.MeshStandardMaterial({ color: 0xc2271f, roughness: 0.4, metalness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.5, metalness: 0.3 });
    this.cylinder(0.034, 0.05, [0, 0.036, 0], red, this.daleCan, 10);
    this.cylinder(0.035, 0.026, [0, 0, 0], white, this.daleCan, 10);
    this.cylinder(0.034, 0.05, [0, -0.036, 0], red, this.daleCan, 10);
    this.cylinder(0.03, 0.006, [0, 0.064, 0], this.metal, this.daleCan, 10);
    // A tallboy: taller than his fist, so it shows above and below it.
    this.daleCan.scale.setScalar(1.2);
    this.scene.add(this.daleCan);
    // The bulb: a hollowed-out light bulb with a glass straw, and the little torch lighter that cooks it.
    const glass = new THREE.MeshStandardMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.2, depthWrite: false });
    this.bulb.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), glass));
    const neck = this.cylinder(0.02, 0.06, [0, 0.06, 0], glass, this.bulb, 10);
    neck.castShadow = false;
    const straw = this.cylinder(0.006, 0.11, [0, 0.13, 0.015], glass, this.bulb, 6);
    straw.rotation.x = -0.25;
    // The cloud inside: a little smaller than the glass so the bulb's outline and shine still read.
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), this.bulbSmoke);
    this.bulb.add(smoke);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    shine.position.set(-0.022, 0.024, -0.03);
    this.bulb.add(shine);
    const torch = new THREE.Group();
    torch.position.set(0, -0.13, 0);
    this.bulb.add(torch);
    this.box([0.034, 0.075, 0.026], [0, -0.03, 0], new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 }), torch);
    this.box([0.03, 0.02, 0.024], [0, 0.015, 0], red, torch);
    this.cylinder(0.006, 0.025, [0, 0.035, 0], this.metal, torch, 6);
    const jet = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 8), new THREE.MeshBasicMaterial({ color: 0x5aa8ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    jet.position.y = 0.075;
    this.torchFlame.add(jet);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 6), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.position.y = 0.062;
    this.torchFlame.add(core);
    const glow = new THREE.PointLight(0x7ab4ff, 0.6, 0.8, 2);
    glow.position.y = 0.08;
    this.torchFlame.add(glow);
    torch.add(this.torchFlame);
    this.bulb.visible = false;
    this.scene.add(this.bulb);
    // His radio: a duct-taped boombox. Lives on the floor by the couch once he leaves it.
    const plastic = new THREE.MeshStandardMaterial({ color: 0x232325, roughness: 0.55 });
    const grille = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.9 });
    this.box([0.44, 0.22, 0.13], [0, 0.11, 0], plastic, this.radio);
    for (const side of [-1, 1]) {
      const ring = this.cylinder(0.072, 0.012, [side * 0.135, 0.11, -0.066], this.metal, this.radio, 16);
      ring.rotation.x = Math.PI / 2;
      const cone = this.cylinder(0.062, 0.016, [side * 0.135, 0.11, -0.068], grille, this.radio, 16);
      cone.rotation.x = Math.PI / 2;
      this.radioCones.push(cone);
    }
    this.box([0.12, 0.075, 0.01], [0, 0.1, -0.066], new THREE.MeshStandardMaterial({ color: 0x3c3c40, roughness: 0.6 }), this.radio);
    this.box([0.08, 0.022, 0.008], [0, 0.16, -0.068], this.radioDisplay, this.radio);
    this.box([0.3, 0.035, 0.135], [0, 0.04, 0], new THREE.MeshStandardMaterial({ color: 0x8a8578, map: dirtyTexture('metal', 41), roughness: 0.8 }), this.radio);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.011, 4, 14, Math.PI), plastic);
    handle.position.set(0, 0.22, 0);
    this.radio.add(handle);
    this.cylinder(0.003, 0.3, [0.18, 0.33, 0], this.metal, this.radio, 4).rotation.z = -0.5;
    this.scene.add(this.radio);
    this.register('radio', this.radio);
    // Smoke he breathes out after a hit (and you, after yours).
    for (let puff = 0; puff < 8; puff++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puff(), color: 0xe6e6e0, transparent: true, opacity: 0, depthWrite: false }));
      sprite.userData.ignoreRay = true;
      sprite.visible = false;
      this.scene.add(sprite);
      this.exhale.push(sprite);
    }
    dale.position.set(2.35, 0, 1.5);
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

  // A blocky limb segment spanning two joints.
  private limb(from: THREE.Vector3, to: THREE.Vector3, width: number, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
    const span = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, span.length() + width * 0.3, width), material);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize());
    mesh.position.copy(from).addScaledVector(span, 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Ronnie: a starved, sick man lying on his back in a stained adult diaper, propped on a filthy pillow,
  // one arm curled up by his face. How the family treats him is the horror; he still watches, and still has his buzzer.
  // Built lying down: +z runs from his feet to his head, +y is up off the cushion.
  private buildRonnie(): void {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.witness.position.set(1.06, 0.63, 2.95);
    this.scene.add(this.witness);
    // Readable from across the trailer: pale sick body, white diaper, dark olive couch, a lamp overhead.
    const skin = new THREE.MeshStandardMaterial({ color: 0xcdb88c, roughness: 0.85, flatShading: true });
    const shade = new THREE.MeshStandardMaterial({ color: 0x7d6a48, roughness: 1, flatShading: true });
    const sore = new THREE.MeshStandardMaterial({ color: 0x7a2a22, roughness: 0.6 });
    const piss = new THREE.MeshStandardMaterial({ color: 0xd9c24a, roughness: 0.7 });
    const bruise = new THREE.MeshStandardMaterial({ color: 0x5d3a58, roughness: 1 });
    const diaper = new THREE.MeshStandardMaterial({ color: 0xf3ecdb, roughness: 0.9, flatShading: true });
    const soil = new THREE.MeshStandardMaterial({ color: 0xa27b3b, roughness: 1 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x7a4424, roughness: 1, flatShading: true });
    const body = this.witness;
    const lamp = new THREE.PointLight(0xffd9a0, 1.8, 2.4, 2);
    lamp.position.set(0.72, 1.55, 3.0);
    this.scene.add(lamp);
    // Ribcage: shallow, every rib showing.
    this.ronnieChest.position.set(0, 0.08, 0.36);
    body.add(this.ronnieChest);
    this.box([0.3, 0.12, 0.28], [0, 0, 0], skin, this.ronnieChest);
    this.box([0.014, 0.01, 0.22], [0, 0.062, 0.02], shade, this.ronnieChest);
    // Every rib, deep enough to hide a pencil in.
    for (let rib = 0; rib < 6; rib++) {
      for (const side of [-1, 1]) {
        const groove = this.box([0.115, 0.01, 0.012], [side * 0.075, 0.062, 0.07 - rib * 0.03], shade, this.ronnieChest);
        groove.rotation.y = side * 0.28;
        const ridge = this.box([0.1, 0.012, 0.012], [side * 0.075, 0.064, 0.055 - rib * 0.03], skin, this.ronnieChest);
        ridge.rotation.y = side * 0.28;
      }
    }
    for (const side of [-1, 1]) {
      this.box([0.014, 0.006, 0.014], [side * 0.08, 0.066, 0.09], new THREE.MeshStandardMaterial({ color: 0x7a4838 }), this.ronnieChest);
      this.box([0.13, 0.016, 0.02], [side * 0.07, 0.07, 0.125], skin, this.ronnieChest).rotation.y = side * -0.15;
      this.box([0.07, 0.09, 0.09], [side * 0.18, -0.005, 0.1], skin, this.ronnieChest);
    }
    // Bruises down his ribs: somebody grabs him to move him, and not gently.
    this.box([0.06, 0.004, 0.05], [0.1, 0.064, -0.04], bruise, this.ronnieChest);
    this.box([0.04, 0.004, 0.035], [-0.12, 0.064, 0.02], bruise, this.ronnieChest);
    // Caved-in belly, hip blades jutting over the waistband, and a sagging, soaked diaper.
    this.box([0.2, 0.07, 0.2], [0, 0.04, 0.14], skin, body);
    for (const side of [-1, 1]) {
      this.box([0.055, 0.045, 0.065], [side * 0.12, 0.11, 0.02], skin, body);
      this.box([0.04, 0.03, 0.004], [side * 0.15, 0.06, 0.02], sore, body).rotation.y = Math.PI / 2;
    }
    this.box([0.3, 0.15, 0.24], [0, 0.075, -0.08], diaper, body);
    this.orb([0.14, 0.07, 0.12], [0, 0.12, -0.16], diaper, body);
    this.box([0.12, 0.005, 0.1], [0.0, 0.195, -0.15], piss, body);
    this.box([0.06, 0.005, 0.05], [0.05, 0.197, -0.08], soil, body);
    this.box([0.04, 0.005, 0.03], [-0.08, 0.152, -0.01], soil, body);
    for (const side of [-1, 1]) this.box([0.02, 0.04, 0.05], [side * 0.155, 0.11, 0.0], new THREE.MeshStandardMaterial({ color: 0x8fb4d4, roughness: 0.6 }), body);
    // Thin legs, knobbly knees, feet pointing up at the end of the couch.
    for (const side of [-1, 1]) {
      const hip = v(side * 0.08, 0.07, -0.18);
      const knee = v(side * 0.085, 0.08, -0.52);
      const ankle = v(side * 0.088, 0.06, -0.82);
      this.limb(hip, knee, 0.062, skin, body);
      this.box([0.09, 0.09, 0.08], [knee.x, knee.y, knee.z], skin, body);
      this.limb(knee, ankle, 0.05, skin, body);
      this.box([0.07, 0.15, 0.05], [ankle.x, 0.12, -0.86], skin, body);
      this.box([0.03, 0.02, 0.004], [ankle.x, 0.06, -0.885], sore, body);
    }
    // One arm up, bent, fist curled by his forehead: the arm the alarm shakes.
    this.ronnieArm.position.set(-0.19, 0.09, 0.47);
    body.add(this.ronnieArm);
    const elbow = v(-0.08, 0.26, -0.02);
    const wrist = v(0.0, 0.34, 0.15);
    this.limb(v(0, 0, 0), elbow, 0.048, skin, this.ronnieArm);
    this.box([0.066, 0.066, 0.066], [elbow.x, elbow.y, elbow.z], skin, this.ronnieArm);
    this.box([0.035, 0.035, 0.004], [elbow.x, elbow.y, elbow.z - 0.035], sore, this.ronnieArm);
    this.limb(elbow, wrist, 0.042, skin, this.ronnieArm);
    this.box([0.05, 0.004, 0.04], [elbow.x * 0.5, elbow.y * 0.5 + 0.02, -0.025], bruise, this.ronnieArm);
    this.ronnieHand.position.copy(wrist);
    this.ronnieArm.add(this.ronnieHand);
    this.box([0.06, 0.07, 0.065], [0, 0.02, 0.01], skin, this.ronnieHand);
    // The other arm along his side, hand limp on his belly, buzzer beside it.
    const shoulder = v(0.19, 0.08, 0.47);
    const otherElbow = v(0.22, 0.06, 0.2);
    const otherHand = v(0.08, 0.13, 0.12);
    this.limb(shoulder, otherElbow, 0.046, skin, body);
    this.limb(otherElbow, otherHand, 0.04, skin, body);
    this.box([0.06, 0.03, 0.08], [otherHand.x - 0.02, otherHand.y + 0.01, otherHand.z - 0.03], skin, body);
    this.box([0.09, 0.03, 0.12], [0.26, 0.015, 0.02], this.dark, body);
    this.cylinder(0.026, 0.018, [0.26, 0.035, 0.02], new THREE.MeshStandardMaterial({ color: 0xc0392b }), body);
    // Neck and a big, gaunt head propped on the pillow, turned toward the aisle so he can watch you.
    this.limb(v(0, 0.12, 0.5), v(0, 0.2, 0.62), 0.055, skin, body);
    for (const side of [-1, 1]) this.limb(v(side * 0.018, 0.14, 0.5), v(side * 0.014, 0.22, 0.61), 0.012, shade, body);
    const turn = new THREE.Group();
    turn.position.set(0, 0.22, 0.7);
    turn.rotation.z = 0.35;
    body.add(turn);
    const head = new THREE.Group();
    head.rotation.x = 1.1;
    turn.add(head);
    this.box([0.15, 0.14, 0.17], [0, 0.04, 0.01], skin, head);
    this.box([0.1, 0.05, 0.12], [0, -0.055, -0.02], skin, head);
    const sclera = new THREE.MeshStandardMaterial({ color: 0xd9cf8f, roughness: 0.4 });
    const blood = new THREE.MeshBasicMaterial({ color: 0xa3141a });
    for (const side of [-1, 1]) {
      // Hollow cheeks, deep sockets, yellowed bloodshot eyes that follow you around the room.
      this.box([0.028, 0.045, 0.01], [side * 0.05, -0.04, -0.083], shade, head);
      this.box([0.052, 0.042, 0.012], [side * 0.035, 0.012, -0.079], bruise, head);
      this.box([0.034, 0.026, 0.01], [side * 0.035, 0.024, -0.084], sclera, head);
      for (let fleck = 0; fleck < 3; fleck++) this.box([0.006, 0.002, 0.004], [side * (0.024 + fleck * 0.008), 0.02 + (fleck % 2) * 0.008, -0.0895], blood, head);
      this.ronniePupils.push(this.box([0.011, 0.013, 0.006], [side * 0.033, 0.023, -0.09], new THREE.MeshBasicMaterial({ color: 0x060606 }), head));
      this.box([0.04, 0.013, 0.012], [side * 0.035, 0.039, -0.083], skin, head);
      const brow = this.box([0.044, 0.012, 0.014], [side * 0.036, 0.058, -0.082], hair, head);
      brow.rotation.z = side * 0.22;
      this.box([0.02, 0.05, 0.03], [side * 0.082, 0.0, 0.0], skin, head);
    }
    const nose = this.box([0.022, 0.05, 0.03], [0, -0.012, -0.092], skin, head);
    nose.rotation.x = 0.25;
    // Slack jaw hanging open, slowly working. Grey cracked lips. A string of drool down to the pillow.
    this.ronnieJaw.position.set(0, -0.075, 0.02);
    head.add(this.ronnieJaw);
    this.box([0.1, 0.035, 0.12], [0, -0.012, -0.04], skin, this.ronnieJaw);
    this.box([0.04, 0.03, 0.012], [0, 0.012, -0.1], new THREE.MeshStandardMaterial({ color: 0x220e0e, roughness: 1 }), this.ronnieJaw);
    this.box([0.046, 0.009, 0.012], [0, -0.006, -0.1], new THREE.MeshStandardMaterial({ color: 0x8c7c78, roughness: 1 }), this.ronnieJaw);
    this.box([0.004, 0.09, 0.004], [0.02, -0.05, -0.098], new THREE.MeshStandardMaterial({ color: 0xdfe9e4, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 }), this.ronnieJaw);
    this.box([0.046, 0.009, 0.012], [0, -0.03, -0.083], new THREE.MeshStandardMaterial({ color: 0x8c7c78, roughness: 1 }), head);
    // Thin, patchy hair: a few greasy spikes and bare, flaking scalp between them.
    const random = seededRandom(1717);
    for (let spike = 0; spike < 11; spike++) {
      const angle = random() * Math.PI * 2;
      const lift = 0.2 + random() * 1.2;
      const direction = new THREE.Vector3(Math.cos(angle) * Math.cos(lift), Math.sin(lift), Math.sin(angle) * Math.cos(lift));
      if (direction.z < -0.35 && direction.y < 0.6) continue;
      this.shard(0.022 + random() * 0.01, 0.05 + random() * 0.05, direction.clone().multiplyScalar(0.07).add(new THREE.Vector3(0, 0.07, 0.02)), direction, hair, head);
    }
    for (const [x, z] of [[0.04, 0.03], [-0.035, -0.02]]) this.box([0.035, 0.004, 0.03], [x, 0.111, z], shade, head);
    // By the couch: a filthy bucket and a scatter of pill bottles.
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.26, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x7c8a6a, map: dirtyTexture('metal', 515), roughness: 0.8, side: THREE.DoubleSide }));
    bucket.position.set(0.5, 0.11, 2.62);
    bucket.castShadow = true;
    this.scene.add(bucket);
    this.cylinder(0.105, 0.01, [0.5, 0.2, 2.62], new THREE.MeshStandardMaterial({ color: 0x6b5a2a, roughness: 0.3 }));
    const orange = new THREE.MeshStandardMaterial({ color: 0xd4702a, roughness: 0.4, transparent: true, opacity: 0.85 });
    for (const [x, z, tipped] of [[0.42, 2.9, 1], [0.55, 3.05, 0], [0.38, 3.2, 1], [0.6, 3.4, 0]]) {
      const bottle = this.cylinder(0.022, 0.06, [x, tipped ? -0.004 : 0.01, z], orange, this.scene, 8);
      if (tipped) bottle.rotation.z = Math.PI / 2;
      this.cylinder(0.024, 0.014, [x + (tipped ? 0.036 : 0), tipped ? -0.004 : 0.047, z], new THREE.MeshStandardMaterial({ color: 0xeeeeee }), this.scene, 8).rotation.z = tipped ? Math.PI / 2 : 0;
    }
    // Flies that never leave him.
    const fly = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    for (let count = 0; count < 5; count++) {
      const speck = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.012), fly);
      this.scene.add(speck);
      this.ronnieFlies.push(speck);
    }
  }

  // A low-poly shard pointing along `direction`, for wild hair, ragged hems and denim fringe.
  private shard(radius: number, length: number, base: THREE.Vector3, direction: THREE.Vector3, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 4), material);
    const unit = direction.clone().normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
    mesh.position.copy(base).addScaledVector(unit, length / 2);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Darlene: a gaunt, jaundiced hag. Wild straw hair, pinprick pupils, stringy limbs, a pot belly
  // hanging out under a filthy tank top, frayed cutoffs, huge dirty shoes. Grotesque, not sexual.
  private buildDarlene(): void {
    this.scene.add(this.darlene);
    this.darlene.rotation.order = 'YXZ';
    const skin = new THREE.MeshStandardMaterial({ color: 0xb4a574, map: dirtyTexture('ceiling', 555), roughness: 1, flatShading: true });
    const sallow = new THREE.MeshStandardMaterial({ color: 0x7c6a44, roughness: 1, flatShading: true });
    const tank = new THREE.MeshStandardMaterial({ color: 0xbdb9a6, map: dirtyTexture('cloth', 313), roughness: 1, flatShading: true });
    const denim = new THREE.MeshStandardMaterial({ color: 0x5d6679, map: dirtyTexture('cloth', 414), roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const hair = new THREE.MeshStandardMaterial({ color: 0xa88a52, map: dirtyTexture('cloth', 909), roughness: 1, flatShading: true });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x3b2d20, map: dirtyTexture('floor', 88), roughness: 1, flatShading: true });
    const random = seededRandom(4242);
    // Frayed cutoffs.
    const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.165, 0.17, 8, 1, true), denim);
    shorts.position.set(0, 0.8, 0);
    this.darlene.add(shorts);
    this.cylinder(0.14, 0.02, [0, 0.885, 0], denim, this.darlene, 8);
    for (let fringe = 0; fringe < 16; fringe++) {
      const angle = fringe / 16 * Math.PI * 2;
      this.shard(0.022, 0.04 + random() * 0.05, new THREE.Vector3(Math.cos(angle) * 0.16, 0.72, Math.sin(angle) * 0.16), new THREE.Vector3(Math.cos(angle) * 0.3, -1, Math.sin(angle) * 0.3), denim, this.darlene);
    }
    // The pot belly, bare, hanging over the waistband. Navel like a cigarette burn.
    this.orb([0.14, 0.125, 0.13], [0, 0.95, -0.05], skin, this.darlene);
    this.orb([0.012, 0.014, 0.006], [0, 0.935, -0.178], this.dark, this.darlene);
    // Tank top, stained and stretched, riding up over the belly.
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.15, 0.36, 8), tank);
    torso.scale.z = 0.72;
    torso.position.set(0, 1.24, 0);
    torso.castShadow = true;
    this.darlene.add(torso);
    for (let rag = 0; rag < 10; rag++) {
      const angle = rag / 10 * Math.PI * 2;
      this.shard(0.03, 0.035 + random() * 0.03, new THREE.Vector3(Math.cos(angle) * 0.145, 1.07, Math.sin(angle) * 0.105), new THREE.Vector3(0, -1, 0), tank, this.darlene);
    }
    // Long, deflated, sagging chest under the tank. Played for grotesque, never for sex.
    for (const side of [-1, 1]) {
      this.orb([0.052, 0.088, 0.045], [side * 0.058, 1.15, -0.1], tank, this.darlene);
      this.box([0.022, 0.1, 0.012], [side * 0.075, 1.47, -0.035], tank, this.darlene);
      const collarbone = this.box([0.08, 0.012, 0.012], [side * 0.06, 1.435, -0.085], skin, this.darlene);
      collarbone.rotation.z = side * -0.25;
    }
    this.orb([0.1, 0.045, 0.06], [0, 1.425, -0.04], skin, this.darlene);
    // Stringy neck, tendons out.
    this.cylinder(0.03, 0.15, [0, 1.52, -0.005], skin, this.darlene, 6);
    for (const side of [-1, 1]) this.box([0.008, 0.13, 0.008], [side * 0.018, 1.51, -0.03], sallow, this.darlene).rotation.z = side * 0.18;
    // Bony shoulders and long, thin arms with big knuckly hands.
    for (const side of [-1, 1]) {
      this.orb([0.042, 0.036, 0.042], [side * 0.15, 1.43, 0], skin, this.darlene);
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.16, 1.43, 0);
      this.darlene.add(shoulder);
      this.darleneArms.push(shoulder);
      this.cylinder(0.026, 0.28, [side * 0.012, -0.15, 0], skin, shoulder, 6).rotation.z = side * 0.06;
      this.orb([0.032, 0.034, 0.032], [side * 0.02, -0.3, 0], skin, shoulder);
      this.cylinder(0.023, 0.27, [side * 0.026, -0.44, 0], skin, shoulder, 6);
      this.box([0.055, 0.085, 0.022], [side * 0.03, -0.625, 0], skin, shoulder);
      for (let finger = 0; finger < 4; finger++) {
        const digit = this.box([0.011, 0.075, 0.011], [side * 0.03 + (finger - 1.5) * 0.014, -0.7, -0.004], skin, shoulder);
        digit.rotation.z = (finger - 1.5) * 0.08;
      }
      this.box([0.012, 0.05, 0.012], [side * 0.058, -0.64, -0.012], skin, shoulder).rotation.z = side * 0.5;
    }
    // Twig legs, knobbly knees, enormous filthy shoes.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.075, 0.76, 0);
      this.darlene.add(leg);
      this.darleneLegs.push(leg);
      this.cylinder(0.036, 0.3, [0, -0.15, 0], skin, leg, 6);
      this.orb([0.042, 0.045, 0.042], [0, -0.31, -0.005], skin, leg);
      this.cylinder(0.03, 0.35, [0, -0.5, 0], skin, leg, 6);
      this.orb([0.072, 0.048, 0.145], [0, -0.72, -0.04], shoe, leg);
      this.box([0.13, 0.02, 0.27], [0, -0.755, -0.035], shoe, leg);
    }
    // The head.
    this.darleneHead.position.set(0, 1.66, -0.01);
    this.darlene.add(this.darleneHead);
    const head = this.darleneHead;
    this.orb([0.092, 0.122, 0.102], [0, 0, 0], skin, head);
    this.orb([0.066, 0.05, 0.068], [0, -0.085, -0.022], skin, head);
    for (const side of [-1, 1]) {
      this.orb([0.03, 0.018, 0.02], [side * 0.055, -0.012, -0.083], skin, head);
      this.box([0.03, 0.04, 0.01], [side * 0.052, -0.05, -0.09], sallow, head);
      this.orb([0.03, 0.021, 0.012], [side * 0.037, 0.025, -0.09], new THREE.MeshStandardMaterial({ color: 0x3a2622, roughness: 1 }), head);
      this.orb([0.019, 0.013, 0.008], [side * 0.037, 0.025, -0.097], new THREE.MeshStandardMaterial({ color: 0xd9c98a, roughness: 0.4 }), head);
      this.orb([0.004, 0.004, 0.003], [side * 0.035, 0.024, -0.105], new THREE.MeshBasicMaterial({ color: 0x050505 }), head);
      const lid = this.box([0.044, 0.014, 0.014], [side * 0.037, side > 0 ? 0.034 : 0.038, -0.099], skin, head);
      lid.rotation.z = side * (side > 0 ? 0.18 : -0.1);
      this.box([0.036, 0.009, 0.006], [side * 0.038, 0.007, -0.1], new THREE.MeshStandardMaterial({ color: 0x4d2f45, roughness: 1 }), head);
      this.box([0.03, 0.005, 0.006], [side * 0.04, -0.001, -0.099], new THREE.MeshStandardMaterial({ color: 0x5a3a3a, roughness: 1 }), head);
      const brow = this.box([0.046, 0.011, 0.012], [side * 0.04, 0.056, -0.1], hair, head);
      brow.rotation.z = side * -0.38;
      this.orb([0.018, 0.03, 0.012], [side * 0.094, 0, 0], skin, head);
      const crease = this.box([0.004, 0.035, 0.004], [side * 0.03, -0.055, -0.101], sallow, head);
      crease.rotation.z = side * 0.3;
    }
    for (let line = 0; line < 3; line++) this.box([0.05 - line * 0.008, 0.003, 0.004], [0, 0.075 + line * 0.012, -0.098 + line * 0.004], sallow, head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.065, 4), skin);
    nose.rotation.x = -Math.PI / 2 - 0.35;
    nose.position.set(0.002, -0.008, -0.118);
    head.add(nose);
    this.box([0.054, 0.012, 0.008], [0, -0.073, -0.098], new THREE.MeshStandardMaterial({ color: 0x1b0f0c, roughness: 1 }), head);
    for (const offset of [-0.066, -0.08]) this.box([0.058, 0.006, 0.008], [0, offset, -0.099], new THREE.MeshStandardMaterial({ color: 0x6b3a33, roughness: 1 }), head);
    for (const x of [-0.016, 0.004, 0.017]) this.box([0.008, 0.012, 0.005], [x, -0.071, -0.103], new THREE.MeshStandardMaterial({ color: 0xc8b06a, roughness: 0.7 }), head);
    // Wild, broken straw hair exploding out in every direction and hanging to the shoulders.
    const centre = new THREE.Vector3(0, 0.02, 0.01);
    for (let strand = 0; strand < 46; strand++) {
      const angle = random() * Math.PI * 2;
      const lift = -0.9 + random() * 2.2;
      const direction = new THREE.Vector3(Math.cos(angle) * Math.cos(lift), Math.sin(lift), Math.sin(angle) * Math.cos(lift));
      if (direction.z < -0.45 && direction.y < 0.35) continue;
      if (direction.y < 0) direction.y -= 0.8;
      this.shard(0.028 + random() * 0.02, 0.12 + random() * 0.14, centre.clone().addScaledVector(direction.clone().normalize(), 0.085), direction, hair, head);
    }
    for (let bang = 0; bang < 5; bang++) this.shard(0.022, 0.09 + random() * 0.04, new THREE.Vector3(-0.05 + bang * 0.025, 0.11, -0.07), new THREE.Vector3((random() - 0.5) * 0.6, -0.7, -0.6), hair, head);
    this.shard(0.012, 0.13, new THREE.Vector3(0.01, 0.12, 0.01), new THREE.Vector3(0.2, 1, 0.1), hair, head);
    // Cigarette permanently in the corner of her mouth, ember lit.
    const cig = new THREE.Group();
    cig.position.set(0.024, -0.074, -0.1);
    cig.rotation.set(0.25, -0.35, 0);
    head.add(cig);
    this.cylinder(0.006, 0.08, [0, 0, -0.04], new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.9 }), cig, 6).rotation.x = Math.PI / 2;
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff5a1e, emissive: 0xff3a00, emissiveIntensity: 2 }));
    ember.position.set(0, 0, -0.082);
    cig.add(ember);
    const emberLight = new THREE.PointLight(0xff6a2a, 0.12, 0.22, 2);
    emberLight.position.set(0, 0, -0.09);
    cig.add(emberLight);
    const puffMap = this.puff();
    for (let puff = 0; puff < 5; puff++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffMap, color: 0x9aa0a0, transparent: true, opacity: 0, depthWrite: false }));
      sprite.scale.set(0.1, 0.1, 0.1);
      head.add(sprite);
      this.smoke.push(sprite);
    }
    this.darlene.position.set(2.45, 0, 0.9);
    // The lighter, clenched in her right fist the entire time.
    this.heldLighter.position.set(0.03, -0.665, -0.03);
    this.heldLighter.rotation.set(0.3, 0, 0);
    this.lighterModel(this.heldLighter);
    this.darleneArms[1].add(this.heldLighter);
  }

  // A soft round puff for smoke and steam, so sprites never show as squares.
  private puff(): THREE.Texture {
    if (this.puffMap) return this.puffMap;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, '#ffffffcc');
    gradient.addColorStop(0.5, '#ffffff44');
    gradient.addColorStop(1, '#ffffff00');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    this.puffMap = canvasTexture(canvas);
    return this.puffMap;
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
      const body = this.orb([0.29, 0.34, 0.3], position, bagMaterial, this.trash);
      const neck = this.orb([0.065, 0.08, 0.05], [position[0], position[1] + 0.29, position[2]], bagMaterial, this.trash);
      this.stain([position[0], 0.004, position[2]], [0.8, 0.8]);
      // The bag in the aisle is the one Darlene tears open and the one that burns.
      if (position[0] === TRASH_BAG.x) {
        for (const mesh of [body, neck]) mesh.userData.size = mesh.scale.toArray();
        this.bag.push(body, neck);
      }
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

  // A big old brass cuff key: a ring, a long shaft, chunky bits. Catches the light.
  private keyModel(parent: THREE.Object3D): void {
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a046, emissive: 0x3a2a08, metalness: 0.8, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 14), brass);
    ring.position.y = 0.035;
    parent.add(ring);
    this.box([0.01, 0.07, 0.008], [0, -0.02, 0], brass, parent);
    this.box([0.026, 0.012, 0.008], [0.012, -0.05, 0], brass, parent);
    this.box([0.018, 0.01, 0.008], [0.008, -0.033, 0], brass, parent);
  }

  // Hot pink with a little glow of its own, so you can always pick it out of the filth on the floor.
  private lighterModel(parent: THREE.Object3D): void {
    const plastic = new THREE.MeshStandardMaterial({ color: 0xff5fae, emissive: 0x5a0f34, roughness: 0.3 });
    const body = new THREE.Group();
    body.scale.setScalar(1.6);
    parent.add(body);
    this.box([0.028, 0.06, 0.014], [0, 0, 0], plastic, body);
    this.orb([0.012, 0.01, 0.008], [0, 0.012, -0.007], plastic, body);
    this.box([0.026, 0.016, 0.014], [0, 0.038, 0], this.metal, body);
    this.cylinder(0.005, 0.012, [0.006, 0.05, 0], this.dark, body, 6).rotation.z = Math.PI / 2;
  }

  private buildInteractives(): void {
    // Your puke, on the floor in front of the couch where you can see it. Evidence if they walk in on it.
    // Sits just above the floor litter so papers never bury it.
    this.puddle.position.set(0.28, 0.026, -1.2);
    const bile = new THREE.MeshStandardMaterial({ color: 0xb8c23a, emissive: 0x2c3008, roughness: 0.2, metalness: 0.1 });
    const chunks = new THREE.MeshStandardMaterial({ color: 0xc08a40, roughness: 0.8 });
    for (const [x, z, w, d] of [[0, 0, 0.3, 0.22], [0.17, 0.1, 0.15, 0.11], [-0.14, 0.12, 0.12, 0.09], [0.06, -0.14, 0.13, 0.08]]) this.orb([w, 0.005, d], [x, 0, z], bile, this.puddle);
    for (let chunk = 0; chunk < 9; chunk++) this.orb([0.016 + this.random() * 0.012, 0.01, 0.016], [(this.random() - 0.5) * 0.36, 0.006, (this.random() - 0.5) * 0.26], chunks, this.puddle);
    this.scene.add(this.puddle);
    this.register('puddle', this.puddle);
    // Darlene's lighter, once she throws it on the floor by the couch.
    this.lighter.position.copy(LIGHTER_FLOOR);
    this.lighter.rotation.set(-Math.PI / 2, 0, 0.8);
    this.lighterModel(this.lighter);
    this.scene.add(this.lighter);
    this.register('lighter', this.lighter);
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
    // The cuff key. Until the dance it hangs on a greasy shoelace around Cletus's neck (added after the outside
    // neighbor was cloned from him, so only Cletus wears it); mid-dance it lands glinting on the floor in front of you.
    const lace = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.006, 4, 18), new THREE.MeshStandardMaterial({ color: 0x3b3226, roughness: 1 }));
    lace.position.set(0, 1.4, -0.03);
    lace.rotation.x = Math.PI / 2 + 0.55;
    this.cletusKey.add(lace);
    const pendant = new THREE.Group();
    pendant.position.set(0, 1.27, -0.15);
    this.keyModel(pendant);
    this.cletusKey.add(pendant);
    this.cletus.add(this.cletusKey);
    // Beside his feet, in plain sight from the couch.
    this.finalKey.position.set(0.82, 0.035, -0.85);
    this.finalKey.rotation.set(-Math.PI / 2, 0, 0.6);
    this.finalKey.scale.setScalar(1.8);
    this.keyModel(this.finalKey);
    const glint = new THREE.PointLight(0xffe08a, 0.8, 0.9, 2);
    glint.position.set(0, 0.05, 0.08);
    this.finalKey.add(glint);
    this.scene.add(this.finalKey);
    this.register('finalKey', this.finalKey);
  }

  private buildFire(): void {
    const ghost = (object: THREE.Object3D) => { object.traverse(child => { child.userData.ignoreRay = true; }); return object; };
    // Flames: additive licks that climb, shrink and redden as they rise.
    const flameCanvas = document.createElement('canvas');
    flameCanvas.width = 32;
    flameCanvas.height = 64;
    const flameContext = flameCanvas.getContext('2d')!;
    // A teardrop lick: fat and hot at the bottom, a ragged orange tongue at the top.
    flameContext.beginPath();
    flameContext.moveTo(16, 2);
    flameContext.bezierCurveTo(22, 20, 31, 34, 29, 48);
    flameContext.bezierCurveTo(27, 60, 5, 60, 3, 48);
    flameContext.bezierCurveTo(1, 34, 10, 20, 16, 2);
    flameContext.closePath();
    const flameGradient = flameContext.createRadialGradient(16, 48, 1, 16, 40, 34);
    flameGradient.addColorStop(0, '#ffe8a0e0');
    flameGradient.addColorStop(0.3, '#ffa030b0');
    flameGradient.addColorStop(0.65, '#e8480f70');
    flameGradient.addColorStop(1, '#a0200000');
    flameContext.fillStyle = flameGradient;
    flameContext.filter = 'blur(2px)';
    flameContext.fill();
    const flameMap = canvasTexture(flameCanvas);
    for (let lick = 0; lick < 26; lick++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameMap, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.fire.add(ghost(sprite));
      this.flames.push(sprite);
    }
    for (let puff = 0; puff < 12; puff++) {
      // Sprites ignore the lights, so the smoke is a mid grey that reads against the dark ceiling.
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puff(), color: 0x5a544e, transparent: true, opacity: 0, depthWrite: false }));
      this.fire.add(ghost(sprite));
      this.fireSmoke.push(sprite);
    }
    this.fireBed.rotation.x = -Math.PI / 2;
    this.fire.add(ghost(this.fireBed));
    // Kept in the scene even while dark, so lighting a fire never changes the light count and stalls a shader rebuild.
    this.scene.add(this.fireLight);
    this.fire.visible = false;
    this.scene.add(this.fire);
    // Steam off the dishwater, and the water itself.
    for (let puff = 0; puff < 12; puff++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puff(), color: 0xd8dcd6, transparent: true, opacity: 0, depthWrite: false }));
      sprite.visible = false;
      this.scene.add(ghost(sprite));
      this.steam.push(sprite);
    }
    const dishwater = new THREE.MeshStandardMaterial({ color: 0xa3ad9c, emissive: 0x1c2019, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1, depthWrite: false });
    for (let blob = 0; blob < 48; blob++) {
      const size = 0.028 + (blob % 5) * 0.011;
      const drop = this.orb([size, size, size], [0, 0, 0], dishwater);
      drop.castShadow = false;
      drop.visible = false;
      ghost(drop);
      this.water.push(drop);
    }
    for (let blob = 0; blob < 22; blob++) {
      const drop = this.orb([0.02, 0.02, 0.02], [0, 0, 0], dishwater);
      drop.castShadow = false;
      drop.visible = false;
      ghost(drop);
      this.splashes.push(drop);
    }
    // Cletus's bucket: dented, mop-grey, full of dishwater until it is not.
    this.bucket.rotation.order = 'YXZ';
    const plastic = new THREE.MeshStandardMaterial({ color: 0x6f7a80, roughness: 0.6, side: THREE.DoubleSide });
    const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.26, 14, 1, true), plastic);
    this.bucket.add(pail);
    this.cylinder(0.1, 0.01, [0, -0.125, 0], plastic, this.bucket, 14);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 4, 14, Math.PI), this.metal);
    handle.position.y = 0.13;
    this.bucket.add(handle);
    const surface = new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), dishwater);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.08;
    this.bucketWater.add(surface);
    this.bucket.add(this.bucketWater);
    this.bucket.visible = false;
    this.scene.add(ghost(this.bucket));
    // Garbage Darlene flings out of the trash bag.
    const scraps = [this.rust, this.dark, new THREE.MeshStandardMaterial({ color: 0xb6ab82, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 1 })];
    for (let scrap = 0; scrap < 14; scrap++) {
      const piece = this.box([0.05 + (scrap % 4) * 0.02, 0.012, 0.07 + (scrap % 3) * 0.02], [0, 0, 0], scraps[scrap % scraps.length]);
      piece.visible = false;
      ghost(piece);
      this.garbage.push(piece);
    }
    // Her lighter in flight.
    this.lighterModel(this.thrownLighter);
    this.thrownLighter.visible = false;
    this.scene.add(ghost(this.thrownLighter));
    // What is left once it is out: a black scorch you can still look at.
    const scorchCanvas = document.createElement('canvas');
    scorchCanvas.width = scorchCanvas.height = 128;
    const scorchContext = scorchCanvas.getContext('2d')!;
    const scorchRandom = seededRandom(4411);
    for (let blot = 0; blot < 26; blot++) {
      const x = 64 + (scorchRandom() - 0.5) * 50;
      const y = 64 + (scorchRandom() - 0.5) * 50;
      const radius = 16 + scorchRandom() * 30;
      const blotGradient = scorchContext.createRadialGradient(x, y, 1, x, y, radius);
      blotGradient.addColorStop(0, '#050403e0');
      blotGradient.addColorStop(0.6, '#1a1108a0');
      blotGradient.addColorStop(1, '#2a180a00');
      scorchContext.fillStyle = blotGradient;
      scorchContext.fillRect(0, 0, 128, 128);
    }
    const scorchMap = canvasTexture(scorchCanvas);
    const scorchSpots: Record<FireSpot, { at: Position; size: number; turn: number }> = {
      // Under the (charred) papers and her lighter, just above the floor.
      floorPapers: { at: [0.34, -0.016, -1.9], size: 1.0, turn: 0 },
      trash: { at: [-0.61, 0.006, 0.02], size: 1.0, turn: 0.6 },
      pizza: { at: [-0.31, 0.889, 1.5], size: 0.7, turn: 0.3 },
      pizzaRear: { at: [0.28, 0.44, 3.55], size: 0.55, turn: -0.3 },
    };
    for (const spot of FIRE_SPOTS) {
      const { at, size, turn } = scorchSpots[spot];
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: scorchMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      mesh.rotation.set(-Math.PI / 2, 0, turn);
      mesh.position.set(...at);
      mesh.visible = false;
      this.scene.add(mesh);
      this.register(spot, mesh);
      this.scorches[spot] = mesh;
    }
  }

  // Burnt things go black; put back the original look if a save from before the fire is loaded.
  private char(object: THREE.Object3D, burnt: boolean, spare?: THREE.Object3D): void {
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      for (let parent: THREE.Object3D | null = child; parent; parent = parent.parent) if (parent === spare) return;
      if (!this.unburnt.has(child)) this.unburnt.set(child, child.material);
      child.material = burnt ? this.charred : this.unburnt.get(child)!;
    });
  }

  private applyBurns(state: GameState): void {
    const key = FIRE_SPOTS.map(spot => state.burnt[spot] ? 1 : 0).join('');
    if (key === this.burntKey) return;
    this.burntKey = key;
    for (const spot of FIRE_SPOTS) this.scorches[spot].visible = state.burnt[spot];
    this.char(this.floorPapers, state.burnt.floorPapers, this.lotto);
    this.char(this.pizza, state.burnt.pizza);
    this.char(this.pizzaRear, state.burnt.pizzaRear, this.rearNeedles);
    for (const mesh of this.bag) this.char(mesh, state.burnt.trash);
  }

  // Everything about a fire that depends on where it is in the story: the bucket, the water, the steam.
  private dousing(state: GameState): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const encounter = state.encounter;
    const phase = encounter.phase;
    const arson = encounter.purpose === 'fire' && (phase === 'entering' || phase === 'douse' || phase === 'grab') && state.fireSpot !== null;
    this.bucket.visible = arson;
    this.water.forEach(drop => { drop.visible = false; });
    this.splashes.forEach(drop => { drop.visible = false; });
    this.steam.forEach(sprite => { sprite.visible = false; });
    if (phase !== 'douse') this.douseClock = -1;
    if (!arson || !state.fireSpot) return;
    const site = FIRE_SITES[state.fireSpot];
    const rig = this.rigs.cletus;
    const [sx, sz] = site.stand;
    const face = Math.atan2(-(site.at[0] - sx), -(site.at[2] - sz));
    const target = new THREE.Vector3(site.at[0], site.at[1] + 0.08, site.at[2]);
    const [left, right] = rig.arms;
    const carry = (local: Position, tilt: number) => {
      rig.root.updateMatrixWorld(true);
      this.bucket.position.copy(rig.root.localToWorld(new THREE.Vector3(...local)));
      this.bucket.rotation.set(tilt, rig.root.rotation.y, 0);
    };
    const dropped = () => {
      this.bucket.position.set(sx - Math.sin(face) * 0.4, 0.1, sz - Math.cos(face) * 0.4);
      this.bucket.rotation.set(0, face, Math.PI / 2);
      this.bucketWater.visible = false;
    };
    if (phase === 'grab') {
      dropped();
    } else if (phase === 'entering') {
      // Through the door and straight at the fire, bucket sloshing out in front of him.
      const t = ENTER_SECONDS - encounter.remaining;
      const inDoor = smoothstep(t, 0.05, 0.35);
      const across = smoothstep(t, 0.35, 1.3);
      const x = across > 0 ? lerp(0.9, sx, across) : lerp(rig.homeX, 0.9, inDoor);
      const z = across > 0 ? lerp(-0.225, sz, across) : -0.225;
      const running = across < 1;
      const heading = across <= 0 ? Math.PI / 2 : running ? Math.atan2(-(sx - 0.9), -(sz + 0.225)) : face;
      rig.root.position.set(x, running ? -Math.abs(Math.sin(t * 16)) * 0.05 : 0, z);
      rig.root.rotation.set(running ? -0.22 : 0, heading, 0);
      rig.legs.forEach((leg, index) => leg.rotation.set(running ? Math.sin(t * 17 + index * Math.PI) * 0.55 : 0, 0, 0));
      left.rotation.set(0.75, 0, -0.3);
      right.rotation.set(0.75, 0, 0.3);
      this.bucketWater.visible = true;
      carry([0, 0.93, -0.38], Math.sin(t * 19) * 0.12);
    } else {
      // Wind up, heave, the dishwater arcs onto the fire; then he drops the bucket and turns on you.
      const t = DOUSE_SECONDS - encounter.remaining;
      if (this.douseClock < DOUSE_HIT && t >= DOUSE_HIT) this.shake = 0.9;
      this.douseClock = t;
      const wind = smoothstep(t, 0.3, 0.72);
      const heave = smoothstep(t, 0.72, 1.0);
      const turn = smoothstep(t, 1.75, 2.3);
      rig.root.position.set(sx, 0, sz);
      rig.root.rotation.set(lerp(0.12 * wind, -0.28, heave), face, 0);
      rig.legs.forEach(leg => leg.rotation.set(0, 0, 0));
      const arms = lerp(lerp(0.75, -0.35, wind), 1.95, heave);
      left.rotation.set(t < 1.8 ? arms : lerp(1.95, 1.2, turn), 0, -0.3);
      right.rotation.set(t < 1.8 ? arms : lerp(1.95, 1.2, turn), 0, 0.3);
      rig.head.rotation.set(-0.15 * heave, 0, 0);
      this.bucketWater.visible = t < 0.8;
      if (t < 1.8) {
        const local: Position = [0, lerp(lerp(0.93, 0.7, wind), 1.38, heave), lerp(lerp(-0.38, -0.12, wind), -0.58, heave)];
        carry(local, lerp(lerp(0, 0.4, wind), -2.1, heave));
      } else dropped();
      // Toward the end he swings round to face you, fists coming up.
      if (turn > 0) {
        const eye = CAMERAS[this.selectedView].eye;
        const toEye = Math.atan2(-(eye[0] - sx), -(eye[2] - sz));
        rig.root.rotation.y = lerp(face, toEye, turn);
        rig.root.rotation.x = -0.15 * turn;
      }
      // The water: a sloppy grey rope from the bucket mouth to the flames.
      if (t > 0.76) {
        const mouth = this.bucket.localToWorld(new THREE.Vector3(0, 0.13, 0));
        const control = mouth.clone().lerp(target, 0.5).setY(Math.max(mouth.y, target.y) + 0.25);
        // A sloppy sheet, not a rope: every blob leaves on its own and fans wider the further it flies.
        this.water.forEach((drop, index) => {
          const s = (t - 0.77 - (index % 16) * 0.012 - Math.floor(index / 16) * 0.035) / 0.32;
          if (s < 0 || s > 1) return;
          const a = (1 - s) * (1 - s);
          const b = 2 * (1 - s) * s;
          const c = s * s;
          const fan = 0.03 + s * 0.22;
          drop.position.set(
            a * mouth.x + b * control.x + c * target.x + Math.sin(index * 12.9) * fan,
            a * mouth.y + b * control.y + c * target.y + Math.sin(index * 5.1) * fan * 0.4,
            a * mouth.z + b * control.z + c * target.z + Math.cos(index * 7.3) * fan,
          );
          drop.visible = true;
        });
      }
      const splash = t - DOUSE_HIT;
      if (splash >= 0 && splash < 0.55) {
        this.splashes.forEach((drop, index) => {
          const angle = index / this.splashes.length * Math.PI * 2;
          const speed = 0.6 + (index % 4) * 0.25;
          drop.position.set(target.x + Math.cos(angle) * speed * splash, Math.max(target.y, target.y + (1.4 + (index % 3) * 0.4) * splash - 4.9 * splash * splash), target.z + Math.sin(angle) * speed * splash);
          drop.visible = true;
        });
      }
    }
    // Steam rolls up off the wet ash for a few seconds after the water hits.
    const age = phase === 'douse' ? DOUSE_SECONDS - encounter.remaining - DOUSE_HIT : phase === 'grab' ? DOUSE_SECONDS - DOUSE_HIT + GRAB_SECONDS - encounter.remaining : -1;
    if (age >= 0 && age < 3.4) {
      this.steam.forEach((sprite, index) => {
        const cycle = (age * 0.55 + index / this.steam.length) % 1;
        sprite.position.set(target.x + Math.sin(index * 2.3) * 0.12 * (1 + cycle), target.y + cycle * 1.5, target.z + Math.cos(index * 1.7) * 0.12 * (1 + cycle));
        const scale = 0.18 + cycle * 0.55;
        sprite.scale.set(scale, scale, scale);
        sprite.material.opacity = 0.55 * (1 - cycle) * (1 - age / 3.4);
        sprite.visible = true;
      });
    }
  }

  // The flames themselves, animated on the render clock so they never freeze.
  private animateFire(time: number): void {
    const fog = this.scene.fog as THREE.FogExp2;
    const burning = this.state.fire > 0 && this.state.fireSpot !== null;
    this.fire.visible = burning;
    if (!burning) { this.fireLight.intensity = 0; fog.density = 0.045; fog.color.set(0x171c19); return; }
    const site = FIRE_SITES[this.state.fireSpot!];
    const grow = THREE.MathUtils.smoothstep(this.state.fire, 0, FIRE_FULL);
    const size = 0.18 + 0.82 * grow;
    const radius = site.radius * size;
    const height = site.height * size;
    this.fire.position.set(...site.at);
    this.flames.forEach((sprite, index) => {
      const cycle = (time * (1.3 + (index % 5) * 0.12) + index * 0.137) % 1;
      const angle = index * 2.39996;
      const reach = radius * Math.sqrt(((index * 0.618) % 1)) * (1 - cycle * 0.6);
      sprite.position.set(Math.cos(angle) * reach + Math.sin(time * 7 + index) * 0.02, cycle * height, Math.sin(angle) * reach);
      const width = (0.1 + radius * 0.7) * (1 - cycle * 0.6) * (0.8 + Math.sin(time * 13 + index * 3) * 0.2);
      sprite.scale.set(width, width * 2.2, width);
      // Additive licks pile up fast: keep each one dim and orange so the core glows instead of blowing out white.
      sprite.material.color.setRGB(0.95, 0.62 - cycle * 0.4, 0.28 - cycle * 0.25);
      sprite.material.opacity = 0.55 * Math.min(1, (1 - cycle) * 1.6);
    });
    this.fireSmoke.forEach((sprite, index) => {
      const cycle = (time * 0.32 + index / this.fireSmoke.length) % 1;
      const rise = height * 0.6 + cycle * (2.3 - site.at[1] - height * 0.6);
      sprite.position.set(Math.sin(index * 1.9 + time * 0.4) * (0.1 + cycle * 0.5), rise, Math.cos(index * 2.7) * (0.1 + cycle * 0.4));
      const scale = (0.3 + cycle * 1.1) * (0.5 + grow);
      sprite.scale.set(scale, scale, scale);
      sprite.material.opacity = 0.75 * Math.sin(Math.PI * cycle) * (0.35 + grow * 0.65);
    });
    this.fireBed.scale.setScalar(radius * 0.9 + 0.04);
    this.fireBed.position.y = 0.012;
    (this.fireBed.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 17) * 0.1;
    // Lifted well clear of whatever is burning, so the things right under it glow orange instead of bleaching white.
    this.fireLight.position.set(site.at[0], site.at[1] + height * 0.6 + 0.25, site.at[2]);
    this.fireLight.intensity = this.reduced ? 3.5 * size : (2.5 + 5 * grow) * (0.85 + Math.sin(time * 23) * 0.08 + Math.sin(time * 37) * 0.07);
    // The whole trailer fills with smoke as it grows.
    fog.density = 0.045 + 0.075 * grow;
    fog.color.setRGB(0.09 + grow * 0.05, 0.085 + grow * 0.03, 0.075);
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
    this.lotto.visible = state.lotto === 'floor' && !state.burnt.floorPapers;
    this.applyBurns(state);
    this.finalKey.visible = state.finalKey === 'floor';
    this.cletusKey.visible = state.finalKey === 'cletus';
    this.choke.visible = state.choke === 'cabinet' && state.cabinetUnlocked;
    this.axe.visible = state.axe === 'cabinet' && state.cabinetUnlocked;
    this.magnet.visible = state.magnet === 'cab-k1' && state.cabinets['k1'];
    this.beenie.visible = state.beenie === 'cab-u2' && state.cabinets.u2;
    this.zwinkysCan.visible = state.zwinkys === 'counter';
    this.lighter.visible = state.lighter === 'floor';
    this.heldLighter.visible = state.lighter === 'darlene';
    this.tv.set(state.tvOn, state.tvChannel, state.tvClock);
    this.puddle.visible = state.puddle;
    this.ashtrayPins.visible = state.bobbyPins === 'ashtray';
    this.rearNeedles.visible = state.usedNeedles === 'pizzaRear';
    this.dildo.visible = state.dildo === 'counter' || state.dildo === 'ronnie';
    if (state.dildo === 'ronnie') {
      // Ronnie's trophy, waved overhead with total commitment.
      const fist = this.ronnieHand.getWorldPosition(new THREE.Vector3());
      this.dildo.position.set(fist.x, fist.y + 0.02, fist.z);
      this.dildo.rotation.set(0, 0, Math.sin(state.elapsed * 9) * 0.7);
    } else {
      this.dildo.position.set(-1.16, 1.05, -1.3);
      this.dildo.rotation.set(0, 0, 0);
    }
    // Doors swing out into the aisle, never into the carcass. Animated toward these in render.
    for (const id of Object.keys(this.cabDoors)) this.cabTargets[id] = state.cabinets[id as CabinetId] ? (FAR_HINGED.has(id) ? -1.1 : 1.1) : 0;
    this.rearCabDoor.rotation.x = state.cabinetUnlocked ? 1.75 : 0;
    this.rearCabLock.visible = !state.cabinetUnlocked;
    this.bolt.rotation.y = state.bracketWork * 0.7;
    this.bolt.position.y = 0.037 + state.bracketWork * 0.005;
    const loose = isFree(state) && !state.bracketConcealed;
    this.fitting.position.set(loose ? 0.63 : 0.49, loose ? 0.044 : 0.05, loose ? -1.68 : -1.44);
    this.fitting.rotation.y = loose ? 0.43 : 0;
    this.chain.position.y = loose ? 0.012 : 0.12;
    const encounter = state.encounter;
    const { smoothstep, lerp } = THREE.MathUtils;
    const phase = encounter.phase;
    const approaching = phase === 'alarm' || phase === 'approach';
    const activeId: VisitorId = approaching ? encounter.nextVisitor ?? 'cletus' : encounter.visitor;
    const rig = this.rigs[activeId];
    const active = rig.root;
    const drag = activeId === 'cletus' && (encounter.purpose === 'dance' && (phase === 'entering' || phase === 'dance' || phase === 'leaving') || encounter.nextPurpose === 'dance');
    // Everyone paces outside the blinds until it is their turn.
    for (const id of VISITOR_IDS) {
      const outside = this.rigs[id];
      const offset = visitorIndex(id);
      outside.root.position.set(outside.homeX, 0, patrolDepth(encounter.patrol, offset));
      outside.root.rotation.set(0, Math.cos((encounter.patrol + offset * 6.5) * 0.48) > 0 ? Math.PI : 0, 0);
      outside.legs.forEach((leg, index) => leg.rotation.set(phase === 'idle' ? Math.sin(state.elapsed * 7 + index * Math.PI) * 0.27 : 0, 0, 0));
      outside.arms.forEach(arm => arm.rotation.set(0, 0, 0));
      outside.head.rotation.set(0, 0, id === 'cletus' ? -0.1 : 0);
    }
    // Entrances are violent: the door bangs open, they charge in, the door slams shut behind them.
    let walk = 0;
    let door = 0;
    let rattle = 0;
    const grabbing = phase === 'grab' || phase === 'kill';
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
    } else if (grabbing) {
      // Already inside after a fire; otherwise the door bangs open as they come for you.
      const t = (phase === 'grab' ? GRAB_SECONDS : KILL_SECONDS) - encounter.remaining;
      door = encounter.purpose === 'fire' ? 0 : Math.min(1, t / 0.1);
    } else if (phase === 'dialogue' || phase === 'search' || phase === 'kiss' || phase === 'dance' || phase === 'tvshow') walk = 1;
    // Leaving starts from wherever they ended up: the couch for Dale, the papers for Darlene, the aisle for the dance.
    const insideZ = drag && phase === 'leaving' ? -1.25 : phase === 'leaving' && encounter.purpose === 'search' ? -0.5 : phase === 'leaving' && encounter.purpose === 'hangout' ? -1.6 : INSIDE_Z;
    if (phase === 'alarm') {
      // Stops dead outside and turns toward the trailer.
      active.position.set(rig.homeX, 0, encounter.origin);
      active.rotation.set(0, Math.PI / 2, 0);
      rig.legs.forEach(leg => leg.rotation.set(0, 0, 0));
    } else if (phase === 'approach') {
      active.position.set(rig.homeX, 0, lerp(encounter.origin, -0.225, smoothstep(1 - encounter.remaining / APPROACH_SECONDS, 0, 0.85)));
      active.rotation.set(0.2, encounter.origin > -0.225 ? 0 : Math.PI, 0);
    } else if (walk > 0) {
      active.position.set(lerp(rig.homeX, rig.insideX, walk), 0, lerp(-0.225, insideZ, smoothstep(walk, 0.5, 1)));
      active.rotation.set(0, phase === 'leaving' ? -Math.PI / 2 : phase === 'dialogue' || (phase === 'entering' && walk > 0.8) ? 0 : Math.PI / 2, 0);
    }
    const doorAngle = -door * 1.8 + rattle;
    if (doorAngle !== 0 && ((door >= 1 && this.doorState < 1) || (door <= 0 && this.doorState > 0.5))) this.shake = 1;
    this.doorState = door;
    this.doorHinge.rotation.y = doorAngle;
    // Charging in or out: bent forward, twitching, legs pumping.
    const rushing = (phase === 'entering' || phase === 'leaving') && walk > 0 && walk < 1;
    if (rushing || phase === 'approach') {
      active.rotation.x = -0.22;
      active.rotation.z = Math.sin(state.elapsed * 31) * 0.07;
      active.position.y = -Math.abs(Math.sin(state.elapsed * 16)) * 0.05;
      rig.legs.forEach((leg, index) => leg.rotation.set(Math.sin(state.elapsed * 17 + index * Math.PI) * 0.55, 0, 0));
      rig.arms.forEach((arm, index) => arm.rotation.set(Math.sin(state.elapsed * 17 + index * Math.PI) * 0.9, 0, 0));
      rig.head.rotation.set(Math.sin(state.elapsed * 23) * 0.2, Math.sin(state.elapsed * 13) * 0.4, 0);
    } else if (walk >= 1) {
      rig.legs.forEach(leg => leg.rotation.set(0, 0, 0));
      if (phase === 'dialogue') rig.head.rotation.set(0, Math.sin(state.elapsed * 1.2) * 0.15, activeId === 'cletus' ? -0.1 : 0);
    }
    this.cletusLips.scale.set(1, 1, 1);
    this.kissLight.intensity = 0;
    this.dragParts.forEach(part => { part.visible = drag; });
    if (phase === 'dance') this.dance(DANCE_SECONDS - encounter.remaining);
    this.garbage.forEach(piece => { piece.visible = false; });
    this.thrownLighter.visible = false;
    this.bag.forEach(mesh => { mesh.scale.set(...mesh.userData.size as Position); });
    if (phase === 'search') this.rampage(rig, RAMPAGE_SECONDS - encounter.remaining);
    if (phase === 'tvshow') this.tvShow(rig, TVSHOW_SECONDS - encounter.remaining);
    if (grabbing) {
      const total = phase === 'grab' ? GRAB_SECONDS : KILL_SECONDS;
      const t = total - encounter.remaining;
      if ((phase === 'grab' ? GRAB_HITS : [KILL_HIT]).some(at => at > this.grabClock && at <= t)) this.shake = phase === 'kill' ? 2.2 : 1.5;
      this.grabClock = t;
      // After a fire he comes at you from where he threw the bucket, not from the door.
      const stand = encounter.purpose === 'fire' && state.fireSpot ? FIRE_SITES[state.fireSpot].stand : null;
      this.grabPose(rig, t, phase === 'kill', stand ? new THREE.Vector3(stand[0], 0, stand[1]) : undefined);
    } else this.grabClock = -1;
    this.dousing(state);
    this.daleScene(state);
    // A burnt bag slumps into a melted lump.
    if (state.burnt.trash) { this.bag[0].scale.y *= 0.5; this.bag[1].visible = false; } else this.bag[1].visible = true;
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
    // Frightened: the whole body shudders and the raised fist jerks toward the buzzer. Holding his trophy: it waves.
    this.witness.rotation.z = encounter.phase === 'alarm' ? Math.sin(state.elapsed * 14) * 0.035 : encounter.agitation / 2000;
    const waving = state.dildo === 'ronnie';
    this.ronnieArm.rotation.set(waving ? Math.sin(state.elapsed * 7) * 0.35 : 0, 0, encounter.phase === 'alarm' ? Math.sin(state.elapsed * 22) * 0.3 : encounter.agitation / 600);
    // Darlene's cigarette smoke, rising from the ember. She is never not smoking.
    this.smoke.forEach((sprite, index) => {
      const cycle = (this.state.elapsed * 0.25 + index / this.smoke.length) % 1;
      sprite.position.set(0.03 + cycle * 0.05, -0.06 + cycle * 0.4, -0.2 - cycle * 0.05);
      const scale = 0.04 + cycle * 0.22;
      sprite.scale.set(scale, scale, scale);
      sprite.material.opacity = 0.3 * (1 - cycle);
    });
  }

  // Darlene's rampage: cabinets, drawer, on her knees in the lower cabinets, in your face, Ronnie, out.
  private rampage(rig: Rig, t: number): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const [x, z, facing] = keyframed(RAMPAGE_PATH, t);
    const [nextX, nextZ] = keyframed(RAMPAGE_PATH, t + 0.05);
    const stride = Math.min(0.75, Math.hypot(nextX - x, nextZ - z) / 0.05 * 0.16);
    rig.root.position.set(x, 0, z);
    rig.root.rotation.set(0, facing, 0);
    rig.legs.forEach((leg, index) => leg.rotation.set(Math.sin(t * 18 + index * Math.PI) * stride, 0, 0));
    const [left, right] = rig.arms;
    const flail = (base: number, amount: number, rate: number) => {
      left.rotation.set(base + Math.sin(t * rate) * amount, 0, -0.15);
      right.rotation.set(base + Math.sin(t * rate + Math.PI) * amount, 0, 0.15);
    };
    // A constant twitch, with sudden head snaps.
    rig.head.rotation.set(Math.sin(t * 17) * 0.08, Math.sin(t * 23) * 0.18 + (Math.sin(t * 3.1) > 0.92 ? 0.55 : 0), Math.sin(t * 11) * 0.06);
    if (t < 2.9) flail(2.3, 0.55, 19);
    else if (t < 4.5) { rig.root.rotation.x = -0.3; flail(0.9, 0.6, 22); }
    else if (t < 6.0) {
      rig.root.position.y = -0.32;
      rig.root.rotation.x = -0.35;
      rig.legs.forEach(leg => leg.rotation.set(0.95, 0, 0));
      flail(1.2, 0.6, 17);
    } else if (t < 8.4) {
      // Right in your face, clawing the air, swaying forward and back.
      const lunge = smoothstep(t, 6.1, 6.5);
      rig.root.rotation.x = -0.2 * lunge;
      rig.root.position.y = -0.08 * lunge;
      rig.root.position.z += Math.sin(t * 5) * 0.05;
      left.rotation.set(0.9 + Math.sin(t * 9) * 0.25, 0, -1.0);
      right.rotation.set(0.9 + Math.sin(t * 9 + 1) * 0.25, 0, 1.0);
      rig.head.rotation.set(Math.sin(t * 29) * 0.12, Math.sin(t * 31) * 0.25, Math.sin(t * 7) * 0.2);
    } else if (t < 9.2 || (t >= 11.4 && t < 12.0)) { rig.root.rotation.x = -0.25; flail(0.2, 1.0, 18); }
    else if (t < 11.4) {
      // On her knees at the trash bag, tearing it open with both hands, head down in it.
      const kneel = smoothstep(t, 9.2, 9.5) * (1 - smoothstep(t, 11.15, 11.4));
      rig.root.position.y = -0.34 * kneel;
      rig.root.rotation.x = -0.42 * kneel;
      rig.legs.forEach(leg => leg.rotation.set(1.0 * kneel, 0, 0));
      left.rotation.set(0.95 + Math.sin(t * 21) * 0.5, 0, -0.25);
      right.rotation.set(0.95 + Math.sin(t * 21 + Math.PI) * 0.5, 0, 0.25);
      rig.head.rotation.set(-0.35 * kneel + Math.sin(t * 25) * 0.08, Math.sin(t * 13) * 0.3, 0);
      // The bag heaves and bulges as she claws at it.
      const [body] = this.bag;
      const size = body.userData.size as Position;
      const heave = 1 + Math.abs(Math.sin(t * 21)) * 0.12;
      body.scale.set(size[0] * heave, size[1] / heave, size[2] * heave);
    } else if (t < 12.35) {
      // Patting every pocket she owns, slapping her hips, looking down at herself.
      rig.root.rotation.x = -0.1;
      left.rotation.set(0.15, 0, -0.3 - Math.abs(Math.sin(t * 26)) * 0.35);
      right.rotation.set(0.15 + Math.abs(Math.sin(t * 26 + 1)) * 0.3, 0, 0.3 + Math.abs(Math.sin(t * 26 + 1)) * 0.3);
      rig.head.rotation.set(-0.45, Math.sin(t * 19) * 0.3, 0);
    } else if (t < 12.9) {
      // The fist comes up in front of her face. There it is. Then she slams it at the floor by your feet.
      rig.root.rotation.x = t < 12.6 ? 0.05 : -0.35 * (1 - smoothstep(t, 12.75, 12.9));
      left.rotation.set(0.3, 0, -0.15);
      right.rotation.set(t < 12.6 ? lerp(0.15, 2.6, smoothstep(t, 12.35, 12.55)) : lerp(2.6, 0.2, smoothstep(t, 12.6, 12.7)), 0, 0.15);
      rig.head.rotation.set(t < 12.6 ? 0.3 : -0.3, 0, 0);
    } else { rig.root.rotation.x = -0.25; flail(0.2, 1.0, 18); }
    // Garbage flung out of the bag with every rip: up, out, and down all over the floor.
    this.garbage.forEach((piece, index) => {
      const launch = (index % 2 === 0 ? 9.8 : 10.9) + (index * 0.37) % 0.4;
      const flight = t - launch;
      if (flight < 0) return;
      const angle = index * 2.4 + 0.6;
      const speed = 0.7 + (index % 5) * 0.18;
      const lift = 1.6 + (index % 3) * 0.45;
      const y = Math.max(0.006, TRASH_BAG.y + 0.2 + lift * flight - 4.9 * flight * flight);
      const landed = y <= 0.006 ? 1 : 0;
      const travel = Math.min(flight, (lift + Math.sqrt(lift * lift + 4 * 4.9 * (TRASH_BAG.y + 0.2))) / 9.8);
      piece.position.set(TRASH_BAG.x + Math.cos(angle) * speed * travel, y, TRASH_BAG.z + Math.sin(angle) * speed * travel);
      piece.rotation.set(landed ? 0 : flight * 9, index, landed ? 0 : flight * 7);
      piece.visible = true;
    });
    // Her lighter leaves her fist and smacks the floor in front of you, bounces once, lies there.
    if (this.state.encounter.haul === 'drop-lighter' && t >= 12.6 && t < 13.0) {
      const flight = smoothstep(t, 12.62, 12.8);
      const fall = flight * flight;
      const hop = t > 12.8 ? Math.sin(Math.PI * Math.min(1, (t - 12.8) / 0.18)) * 0.07 : 0;
      this.thrownLighter.position.set(lerp(THROW_FROM.x, LIGHTER_FLOOR.x, flight), lerp(THROW_FROM.y, LIGHTER_FLOOR.y, fall) + hop, lerp(THROW_FROM.z, LIGHTER_FLOOR.z, flight));
      this.thrownLighter.rotation.set(t < 12.8 ? t * 30 : -Math.PI / 2 + hop * 6, 0, 0.8);
      this.thrownLighter.visible = true;
      this.lighter.visible = false;
    }
  }

  // Dale on the couch, and everything he carries: the radio, the beer, the bulb, the torch, the smoke.
  private daleScene(state: GameState): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const encounter = state.encounter;
    const phase = encounter.phase;
    const rig = this.rigs.dale;
    const [leftElbow, rightElbow] = this.daleElbows;
    const head = this.daleHead;
    this.daleKnees.forEach(knee => knee.rotation.set(0, 0, 0));
    this.daleElbows.forEach(elbow => elbow.rotation.set(0, 0, 0));
    // An arm as shoulder swing forward, swing in toward his chest, and elbow bend. Left is index 0.
    const arm = (index: 0 | 1, forward: number, inward: number, bend: number) => {
      const side = index === 0 ? -1 : 1;
      this.daleArms[index].rotation.set(forward, 0, -side * inward);
      this.daleElbows[index].rotation.set(bend, 0, 0);
    };
    const onCouch = encounter.visitor === 'dale' && (phase === 'hangout' || phase === 'offer' || phase === 'bulb');
    let radioCarried = state.radio === 'none';
    // The beer: dangling in his fist, held in his lap (and drunk from), or set down on the couch beside him.
    let beer: 'hang' | 'held' | 'couch' = 'hang';
    let settle = 0;
    let sip = 0;
    let setDown = 0;
    // When his right mitt is reaching for something instead of posed: the torch under the bulb, his thigh, you.
    let torchHold = 0;
    let slumpRest = 0;
    let reachYou = false;
    let bulbAt: 'hidden' | 'hand' | 'face' = 'hidden';
    let bulbRise = 1;
    let flame = false;
    let smoke = 0;
    let exhaleFrom: THREE.Vector3 | null = null;
    let exhaleDrift = new THREE.Vector3();
    let exhaleAge = -1;
    let fromMouth = false;
    // From standing (wherever the root is now) down onto the front edge of the cushion. `lean` is the torso:
    // negative hunches forward, positive slumps back. The root pivots at his feet, so it is repositioned to keep
    // the hips on the edge, and the legs are counter-rotated so thighs and shins hold their absolute angles.
    const sit = (amount: number, facing = DALE_SEAT.facing, lean = DALE_SEAT.hunch) => {
      const hips = new THREE.Vector3(0, 0.88, 0.01).applyEuler(new THREE.Euler(lean, facing, 0, 'YXZ'));
      const perch = DALE_SEAT.hip.clone().sub(hips);
      rig.root.position.lerp(perch, amount);
      rig.root.rotation.set(lean * amount, facing, 0);
      rig.legs.forEach((leg, index) => leg.rotation.set((DALE_SEAT.thigh - lean) * amount, 0, (index === 0 ? -1 : 1) * 0.08 * amount));
      this.daleKnees.forEach(knee => knee.rotation.set((DALE_SEAT.shin - DALE_SEAT.thigh) * amount, 0, 0));
    };
    const seated = (facing = DALE_SEAT.facing, lean = DALE_SEAT.hunch) => sit(1, facing, lean);
    if (onCouch && phase === 'hangout') {
      const t = HANGOUT_SECONDS - encounter.remaining;
      const [x, z, facing] = keyframed(DALE_PATH, t);
      const [nextX, nextZ] = keyframed(DALE_PATH, t + 0.05);
      const stride = t < 3.2 ? Math.min(0.5, Math.hypot(nextX - x, nextZ - z) / 0.05 * 0.14) : 0;
      rig.root.position.set(x, 0, z);
      rig.root.rotation.set(0, facing, 0);
      rig.legs.forEach((leg, index) => leg.rotation.set(Math.sin(t * 11 + index * Math.PI) * stride, 0, 0));
      arm(0, 0, -0.05, 0.1);
      arm(1, 0.2, -0.1, 0.5);
      head.rotation.set(-0.15, 0, 0);
      radioCarried = state.radio === 'none' && t < RADIO_PLACED_AT;
      if (t >= 0.8 && t < 3.0) {
        // Down on his haunches to set the radio on the floor and push play.
        const crouch = smoothstep(t, 0.8, 1.2) * (1 - smoothstep(t, 2.6, 3.0));
        rig.root.position.y = -0.24 * crouch;
        rig.root.rotation.x = -0.42 * crouch;
        rig.legs.forEach(leg => leg.rotation.set(0.95 * crouch, 0, 0));
        this.daleKnees.forEach(knee => knee.rotation.set(-1.35 * crouch, 0, 0));
        arm(0, 0.75 * crouch, 0.1, 0.2 * crouch);
      }
      if (t >= 3.2) sit(smoothstep(t, 3.2, 3.8));
      // As he sits, the beer comes up into his lap.
      if (t >= 3.4) { beer = 'held'; settle = smoothstep(t, 3.4, 3.9); }
      if (t >= 3.8) {
        // Hunched beside you, beer in his lap, nodding along, sad, to the beat. Every so often, a long pull.
        sip = Math.max(...SIPS.map(([from, to]) => smoothstep(t, from, from + 0.4) * (1 - smoothstep(t, to - 0.4, to))));
        arm(0, 0.3, 0.25, 0.8);
        head.rotation.set(-0.2 + Math.abs(Math.sin(t * Math.PI * 85 / 60)) * 0.09 + sip * 0.38, 0.28 * (1 - sip), 0);
      }
      // Before he lights up, he reaches over and stands the beer on the couch beside him.
      if (t >= TORCH_AT - 0.7) setDown = smoothstep(t, TORCH_AT - 0.7, TORCH_AT - 0.1);
      if (t >= TORCH_AT - 0.3) {
        // Bulb up in front of his chin in the left mitt, torch under it in the right; then the bulb to his lips.
        if (t >= TORCH_AT) { beer = 'couch'; torchHold = smoothstep(t, TORCH_AT, TORCH_AT + 0.5); }
        const up = smoothstep(t, TORCH_AT - 0.3, TORCH_AT + 0.4);
        const toMouth = smoothstep(t, DALE_HIT_AT, DALE_HIT_AT + 0.35) * (1 - smoothstep(t, DALE_HIT_AT + 1.4, DALE_HIT_AT + 2.0));
        arm(0, lerp(0.3, lerp(0.7, 0.78, toMouth), up), lerp(0.25, lerp(0.4, 0.48, toMouth), up), lerp(0.8, lerp(1.5, 2.15, toMouth), up));
        head.rotation.set(lerp(-0.2, -0.32, up) + toMouth * 0.3, 0.05, 0);
        bulbAt = 'hand';
        flame = t > TORCH_AT + 0.6 && t < DALE_HIT_AT + 0.8;
        smoke = smoothstep(t, TORCH_AT + 1, DALE_HIT_AT - 0.2) * 0.85 * (1 - smoothstep(t, DALE_HIT_AT + 0.2, DALE_HIT_AT + 0.8));
        if (t > DALE_HIT_AT + 2.0) {
          // Slumped back, staring at the ceiling, bulb resting on his gut.
          const slump = smoothstep(t, DALE_HIT_AT + 2.0, DALE_HIT_AT + 2.6);
          arm(0, lerp(0.7, 0.35, slump), lerp(0.4, 0.45, slump), lerp(1.5, 1.1, slump));
          slumpRest = slump;
          head.rotation.set(lerp(-0.32, 0.38, slump), 0.05, 0);
          sit(1, DALE_SEAT.facing, DALE_SEAT.hunch + slump * 0.22);
        }
        if (t > DALE_HIT_AT + 0.8) {
          exhaleAge = t - DALE_HIT_AT - 0.8;
          fromMouth = true;
          exhaleDrift = new THREE.Vector3(-Math.sin(DALE_SEAT.facing), 0.55, -Math.cos(DALE_SEAT.facing));
        }
      }
    } else if (onCouch && phase === 'offer') {
      // Leans over and holds the bulb out to you, torch still going under it.
      const t = 10 - encounter.remaining;
      const lean = smoothstep(t, 0, 0.8);
      // Turns toward you only as far as his knees can go without hitting the couch.
      seated(lerp(DALE_SEAT.facing, 0.85, lean), DALE_SEAT.hunch - 0.15 * lean);
      arm(0, lerp(0.35, 1.35, lean), lerp(0.45, 0.12, lean), lerp(1.1, 0.25, lean));
      head.rotation.set(-0.06 + Math.sin(t * 1.3) * 0.03, 0.12, Math.sin(t * 0.9) * 0.05);
      beer = 'couch';
      torchHold = 1;
      bulbAt = 'hand';
      flame = true;
      smoke = 0.35 + Math.sin(t * 2) * 0.1;
    } else if (onCouch && phase === 'bulb') {
      // You have it. It comes up to your face; Dale works the torch and watches you like a proud dad.
      const t = BULB_SECONDS - encounter.remaining;
      seated(0.85, -0.25);
      arm(0, 0.45, 0.3, 0.9);
      head.rotation.set(0.02, 0.12, 0.08);
      beer = 'couch';
      reachYou = true;
      bulbAt = t < BULB_TRIP_AT + 0.6 ? 'face' : 'hidden';
      bulbRise = smoothstep(t, 0, 0.5) * (1 - smoothstep(t, BULB_TRIP_AT, BULB_TRIP_AT + 0.6));
      flame = t > 0.3 && t < BULB_TRIP_AT;
      smoke = smoothstep(t, 0.4, 2.6) * (1 - smoothstep(t, 2.8, BULB_TRIP_AT));
      if (t > BULB_TRIP_AT) {
        // Your own cloud, rolling out in front of your face.
        exhaleAge = t - BULB_TRIP_AT;
        exhaleFrom = SEAT_EYE.clone().add(new THREE.Vector3(0.03, -0.1, 0.25));
        exhaleDrift = BULB_CAM.clone().sub(SEAT_EYE).normalize().setY(0.35);
      }
    }
    if (encounter.visitor === 'dale' && phase === 'leaving') arm(1, 0.25, 0.05, 0.5);
    // The props follow his mitts.
    rig.root.updateMatrixWorld(true);
    if (fromMouth) exhaleFrom = head.localToWorld(new THREE.Vector3(0, -0.07, -0.17));
    const mitt = (elbow: THREE.Group, side: number, out = 0) => elbow.localToWorld(new THREE.Vector3(side * 0.01, -0.31, -out));
    // The bulb rides in his left mitt (or comes up to your face); his right mitt reaches for the torch under it.
    this.bulb.visible = bulbAt !== 'hidden';
    if (bulbAt === 'hand') {
      this.bulb.position.copy(mitt(leftElbow, -1, 0.02)).add(new THREE.Vector3(0, 0.07, 0));
      this.bulb.rotation.set(0, rig.root.rotation.y, 0);
    } else if (bulbAt === 'face') {
      this.bulb.position.copy(BULB_CAM).add(new THREE.Vector3(0, -0.3 * (1 - bulbRise), 0));
      this.bulb.rotation.set(0.2, 0.3, 0);
    }
    // His right mitt goes where it is needed: into his lap with the beer, up to his lips, over to the couch to
    // set the can down, under the bulb with the torch, onto his thigh when he slumps, out toward you.
    const body = rig.root.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(body).setY(0).normalize();
    const inward = new THREE.Vector3(-1, 0, 0).applyQuaternion(body).setY(0).normalize();
    const upright = new THREE.Vector3(0, 1, 0);
    const couchHand = COUCH_CAN.clone().addScaledVector(inward, -CAN_GRIP);
    // Drinking: only the rim touches his lips. The can points out and up from his face, top to his mouth,
    // bottom to the ceiling, tipping with his head; his mitt grips its middle from the side, under his chin.
    const faceTurn = head.getWorldQuaternion(new THREE.Quaternion());
    const lips = head.localToWorld(new THREE.Vector3(0, -0.078, -0.175));
    const chugTop = new THREE.Vector3(0, 0, 1).applyQuaternion(faceTurn).addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(faceTurn), -0.3).normalize();
    const chugCan = lips.clone().addScaledVector(chugTop, -CAN_HALF);
    if (beer === 'held') {
      const lap = rig.root.localToWorld(new THREE.Vector3(0.17, 0.98, -0.33));
      const chugHand = chugCan.clone().addScaledVector(inward, -CAN_GRIP);
      this.reach(1, mitt(rightElbow, 1).lerp(lap, settle).lerp(chugHand, sip).lerp(couchHand, setDown));
    } else if (onCouch && (torchHold > 0 || reachYou)) {
      const torch = this.bulb.position.clone().add(new THREE.Vector3(0, -0.16, 0));
      const target = reachYou ? BULB_CAM.clone().add(new THREE.Vector3(0, -0.16, 0)) : couchHand.lerp(torch, torchHold);
      if (slumpRest > 0) target.lerp(rig.root.localToWorld(new THREE.Vector3(0.17, 0.86, -0.3)), slumpRest);
      this.reach(1, target);
    }
    rig.root.updateMatrixWorld(true);
    // The can: upright with his mitt wrapped round its middle on the palm side, sticking out above and below
    // the fist; tipped back rim-to-lips when he drinks; or standing on the couch cushion beside him.
    const hand = mitt(rightElbow, 1);
    if (beer === 'couch') {
      this.daleCan.position.copy(COUCH_CAN);
      this.daleCan.quaternion.identity();
    } else if (beer === 'held') {
      // Always in the fist; it tips from upright to bottoms-up as the mitt comes up.
      this.daleCan.position.copy(hand).addScaledVector(inward, CAN_GRIP);
      this.daleCan.quaternion.setFromUnitVectors(upright, upright.clone().lerp(chugTop, sip).normalize());
    } else {
      this.daleCan.position.copy(hand).addScaledVector(forward, 0.035).addScaledVector(inward, 0.025);
      this.daleCan.quaternion.identity();
    }
    const radioOnFloor = !radioCarried && state.radio === 'floor';
    this.radio.visible = radioCarried || radioOnFloor;
    this.radio.userData.hotspot = radioOnFloor ? 'radio' : undefined;
    if (radioCarried) {
      this.radio.position.copy(mitt(leftElbow, -1)).add(new THREE.Vector3(0, -0.35, 0));
      this.radio.rotation.set(0, rig.root.rotation.y, 0);
    } else {
      this.radio.position.copy(RADIO_SPOT);
      this.radio.rotation.set(0, 0.07, 0);
    }
    // When it plays, the display glows and the speaker cones thump to the beat.
    const beat = state.radioOn ? Math.pow(Math.max(0, Math.sin(state.radioClock * Math.PI * 2 * 85 / 60)), 6) : 0;
    this.radioDisplay.emissiveIntensity = state.radioOn ? 1.4 : 0;
    this.radioCones.forEach(cone => cone.scale.set(1 + beat * 0.05, 1 + beat * 1.2, 1 + beat * 0.05));
    this.torchFlame.visible = flame;
    this.torchFlame.scale.setScalar(flame ? 0.9 + Math.random() * 0.25 : 1);
    this.bulbSmoke.opacity = smoke * 0.75;
    this.exhale.forEach((sprite, index) => {
      const cycle = exhaleFrom ? (exhaleAge - index * 0.12) / 2.4 : -1;
      sprite.visible = cycle > 0 && cycle < 1;
      if (!sprite.visible || !exhaleFrom) return;
      sprite.position.copy(exhaleFrom).addScaledVector(exhaleDrift, cycle * 0.7).add(new THREE.Vector3(Math.sin(index * 2.3) * 0.12 * cycle, 0, Math.cos(index * 1.9) * 0.12 * cycle));
      const size = 0.1 + cycle * 0.6;
      sprite.scale.set(size, size, size);
      sprite.material.opacity = 0.55 * (1 - cycle) * Math.min(1, cycle * 6);
    });
  }

  // Two-bone reach for one of Dale's arms: places the elbow (out to the side and down, like a person's) and sets the
  // shoulder and elbow so the mitt lands on `target` (world). Out of reach, the arm points straight at it.
  private reach(index: 0 | 1, target: THREE.Vector3): void {
    const side = index === 0 ? -1 : 1;
    const shoulder = this.daleArms[index];
    const upper = 0.3;
    const fore = 0.31;
    this.dale.updateMatrixWorld(true);
    const local = this.dale.worldToLocal(target.clone()).sub(shoulder.position);
    const distance = THREE.MathUtils.clamp(local.length(), Math.abs(upper - fore) + 0.02, upper + fore - 0.001);
    const toward = local.normalize();
    // Elbow out to the side and down: in his lap it hangs by his gut, at his mouth it juts out like a man chugging.
    const across = new THREE.Vector3(side * 1, -0.55, -0.1);
    across.sub(toward.clone().multiplyScalar(across.dot(toward)));
    if (across.lengthSq() < 1e-6) across.set(side, 0, 0);
    across.normalize();
    const open = Math.acos(THREE.MathUtils.clamp((upper * upper + distance * distance - fore * fore) / (2 * upper * distance), -1, 1));
    const upperDir = toward.clone().multiplyScalar(Math.cos(open)).addScaledVector(across, Math.sin(open)).normalize();
    const foreDir = toward.clone().multiplyScalar(distance).addScaledVector(upperDir, -upper).normalize();
    const bend = Math.acos(THREE.MathUtils.clamp(upperDir.dot(foreDir), -1, 1));
    // The shoulder's -y runs down the upper arm; its -z is the way the elbow folds.
    const fold = foreDir.clone().addScaledVector(upperDir, -foreDir.dot(upperDir));
    if (fold.lengthSq() < 1e-6) fold.set(0, 0, -1).addScaledVector(upperDir, upperDir.z);
    fold.normalize();
    const yAxis = upperDir.negate();
    const zAxis = fold.negate();
    shoulder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(yAxis, zAxis), yAxis, zAxis));
    this.daleElbows[index].rotation.set(bend, 0, 0);
  }

  // TV night: over to the set, smack it on, then point, cackle, double over, wipe his eyes, leave.
  private tvShow(rig: Rig, t: number): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const [x, z, facing] = keyframed(TV_SHOW_PATH, t);
    const [nextX, nextZ] = keyframed(TV_SHOW_PATH, t + 0.05);
    const stride = Math.min(0.6, Math.hypot(nextX - x, nextZ - z) / 0.05 * 0.16);
    rig.root.position.set(x, 0, z);
    rig.root.rotation.set(0, facing, 0);
    rig.legs.forEach((leg, index) => leg.rotation.set(Math.sin(t * 16 + index * Math.PI) * stride, 0, 0));
    const [left, right] = rig.arms;
    left.rotation.set(0, 0, 0);
    right.rotation.set(0, 0, 0);
    if (t < TV_ON_AT + 0.4) {
      // Winds up and smacks the dead set until it wakes.
      if (t > 1.6) right.rotation.set(t < 2.1 ? lerp(0.3, 2.6, smoothstep(t, 1.6, 2.05)) : lerp(2.6, 0.9, smoothstep(t, 2.1, 2.3)), 0, 0.15);
      return;
    }
    if (t > 23.2) return;
    // Cackling: bouncing, shaking, head thrown back.
    const cackle = Math.abs(Math.sin(t * 9));
    rig.root.position.y = -cackle * 0.035;
    rig.root.rotation.z = Math.sin(t * 17) * 0.05;
    rig.head.rotation.set(0.3 + Math.sin(t * 18) * 0.1, 0.35, Math.sin(t * 7) * 0.1);
    if (t < 8.6) {
      right.rotation.set(0.3, 0, 1.45 + Math.sin(t * 6) * 0.08);
      left.rotation.set(0.35 + cackle * 0.5, 0, -0.2);
    } else if (t < 13.8) {
      rig.root.rotation.x = 0.15;
      right.rotation.set(1.5 + Math.sin(t * 5) * 0.1, 0, 0.1);
      left.rotation.set(0.35 + cackle * 0.5, 0, -0.2);
      rig.head.rotation.y = 0;
    } else if (t < 18.6) {
      const fold = smoothstep(t, 13.8, 14.3);
      rig.root.rotation.x = -0.45 * fold;
      right.rotation.set(0.9 * fold, 0, 0.4);
      left.rotation.set(0.9 * fold + cackle * 0.2, 0, -0.4);
      rig.head.rotation.set(-0.2 + Math.sin(t * 18) * 0.1, 0, 0);
    } else {
      right.rotation.set(2.4 + Math.sin(t * 11) * 0.08, 0, 0.25);
      left.rotation.set(0.3, 0, -0.15);
      rig.head.rotation.set(0.1, 0.1, 0.15);
    }
  }

  // Caught off the couch. They burst in, cross the trailer in a blink and beat you down, or (the second
  // time) jam their face into yours and end it. Works from whichever camera you were in.
  private grabPose(rig: Rig, t: number, kill: boolean, origin?: THREE.Vector3): void {
    const { smoothstep, lerp } = THREE.MathUtils;
    const eye = new THREE.Vector3(...CAMERAS[this.selectedView].eye);
    const toDoor = (origin ?? new THREE.Vector3(0.9, 0, -0.225)).clone().sub(eye).setY(0).normalize();
    const target = eye.clone().setY(0).addScaledVector(toDoor, kill ? 0.5 : 0.85);
    const rush = smoothstep(t, 0.1, kill ? 0.5 : 0.8);
    const position = (origin ? origin.clone() : new THREE.Vector3(lerp(rig.homeX, 0.9, smoothstep(t, 0, 0.1)), 0, -0.225)).lerp(target, rush);
    const toEye = eye.clone().sub(position).setY(0);
    const running = rush > 0 && rush < 1;
    rig.root.position.copy(position);
    rig.root.rotation.set(running ? -0.3 : 0, Math.atan2(-toEye.x, -toEye.z), 0);
    rig.legs.forEach((leg, index) => leg.rotation.set(running ? Math.sin(t * 22 + index * Math.PI) * 0.7 : 0, 0, 0));
    const [left, right] = rig.arms;
    if (running) {
      left.rotation.set(1.5 + Math.sin(t * 25) * 0.3, 0, -0.2);
      right.rotation.set(1.5 + Math.sin(t * 25 + 2) * 0.3, 0, 0.2);
      rig.head.rotation.set(Math.sin(t * 29) * 0.2, Math.sin(t * 17) * 0.3, 0);
      return;
    }
    if (kill) {
      // Face jammed into yours, shaking, arms up, then the blow.
      const sink = Math.min(0, eye.y + 0.02 - rig.height) * smoothstep(t, 0.3, 0.55);
      rig.root.position.y = sink;
      rig.root.position.x += (Math.random() - 0.5) * 0.02;
      rig.root.position.z += (Math.random() - 0.5) * 0.02;
      const strike = t >= KILL_HIT;
      rig.root.rotation.x = strike ? -0.35 : 0.04;
      const raise = strike ? lerp(2.9, 0.3, smoothstep(t, KILL_HIT, KILL_HIT + 0.1)) : lerp(0, 2.9, smoothstep(t, 0.6, 1.4));
      left.rotation.set(raise, 0, -0.3);
      right.rotation.set(raise, 0, 0.3);
      rig.head.rotation.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.45, (Math.random() - 0.5) * 0.3);
      return;
    }
    // The beating: alternating fists, each wound up overhead and brought down on you.
    GRAB_HITS.forEach((at, index) => {
      const arm = index % 2 === 0 ? right : left;
      if (t > at - 0.4 && t < at) arm.rotation.set(lerp(0.3, 2.8, smoothstep(t, at - 0.4, at - 0.06)), 0, (index % 2 === 0 ? 1 : -1) * 0.25);
      else if (t >= at && t < at + 0.14) arm.rotation.set(lerp(2.8, 0.2, (t - at) / 0.14), 0, 0);
    });
    const recoil = GRAB_HITS.some(at => t >= at && t < at + 0.15);
    const standOver = smoothstep(t, 2.7, 3.2);
    rig.root.rotation.x = recoil ? -0.4 : -0.15 - standOver * 0.35;
    rig.root.position.y = -Math.abs(Math.sin(t * 6)) * 0.03;
    rig.head.rotation.set(-standOver * 0.4 + Math.sin(t * 19) * 0.08, Math.sin(t * 13) * 0.15, 0);
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

  // How far you have collapsed during a beating: 0 standing, 1 on the floor.
  private fall(): number {
    const encounter = this.state.encounter;
    if (encounter.phase !== 'grab') return 0;
    return THREE.MathUtils.smoothstep(GRAB_SECONDS - encounter.remaining, 2.45, 3.3);
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
      zwinkys: this.zwinkysCan, bobbyPins: this.ashtrayPins, usedNeedles: this.rearNeedles, axe: this.axe, lighter: this.lighter,
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

  // Your ears for 3D sound: where the camera is, which way it looks, which way is up.
  ears(): { position: [number, number, number]; forward: [number, number, number]; up: [number, number, number] } {
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    return { position: this.camera.position.toArray(), forward: forward.toArray(), up: up.toArray() };
  }

  private snapCamera(): void {
    const shot = this.currentShot();
    this.camera.position.set(...shot.eye);
    this.aim.set(...shot.aim);
    this.camera.fov = shot.fov;
    this.baseFov = shot.fov;
    this.camera.lookAt(this.aim);
    this.camera.updateProjectionMatrix();
  }

  // Development only: pin the camera anywhere to inspect a pose from the side. Never set in a build.
  debugShot: { eye: Position; aim: Position; fov: number } | null = null;

  private currentShot(): { eye: Position; aim: Position; fov: number } {
    if (this.debugShot) return this.debugShot;
    const encounter = this.state.encounter.phase;
    if (encounter === 'kiss') return { eye: [0.35, 1.32, -3.3], aim: [0.37, 1.4, -0.3], fov: 72 };
    if (encounter === 'dance') return { eye: [0.35, 1.32, -3.3], aim: [this.cletus.position.x, 1.36 + this.cletus.position.y * 0.5, this.cletus.position.z], fov: 66 };
    // TV night: zoomed down the aisle onto the set and Cletus beside it.
    if (encounter === 'tvshow') return { eye: [0.35, 1.32, -3.3], aim: [0.62, 1.3, 0.45], fov: 38 };
    // Dale beside you on the couch: you turn to watch him, then the bulb, then you are holding it.
    if (encounter === 'hangout' || encounter === 'offer' || encounter === 'bulb') {
      const head = this.daleHead.getWorldPosition(new THREE.Vector3());
      const face: Position = [head.x, head.y + 0.06, head.z];
      if (encounter === 'hangout') return { eye: [0.35, 1.32, -3.3], aim: face, fov: 56 };
      const bulb = this.bulb.getWorldPosition(new THREE.Vector3());
      if (encounter === 'offer') {
        // Framed a little to the right so Dale and his bulb sit left of the choice panel.
        const between = head.lerp(bulb, 0.45);
        return { eye: [0.35, 1.32, -3.3], aim: [between.x - 0.28, between.y - 0.02, between.z], fov: 50 };
      }
      const t = BULB_SECONDS - this.state.encounter.remaining;
      const pull = THREE.MathUtils.smoothstep(t, 1.2, 2.8) * (1 - THREE.MathUtils.smoothstep(t, BULB_TRIP_AT, BULB_TRIP_AT + 0.5));
      const eye = SEAT_EYE.clone().lerp(BULB_CAM, 0.18 * pull);
      return { eye: [eye.x, eye.y, eye.z], aim: t < BULB_TRIP_AT + 0.3 ? [BULB_CAM.x, BULB_CAM.y, BULB_CAM.z] : face, fov: 58 };
    }
    // Fire: watch him charge at it with the bucket and put it out.
    const arson = this.state.encounter.purpose === 'fire' && this.state.fireSpot;
    if (arson && (encounter === 'entering' || encounter === 'douse')) return FIRE_SITES[arson].shot;
    if (encounter === 'grab' || encounter === 'kill' || encounter === 'search') {
      // Wherever you were looking, you are wrenched around to face them.
      const base = CAMERAS[this.selectedView];
      const head = this.rigs[this.state.encounter.visitor].head.getWorldPosition(new THREE.Vector3());
      if (encounter === 'search') {
        // Track her from where you sit, a little above her head so the top banner never covers her face.
        // When she finds the lighter in her fist, look down with her to where it lands at your feet.
        const t = RAMPAGE_SECONDS - this.state.encounter.remaining;
        const throwing = t > 12.6 && t < 13.6 && this.state.encounter.haul === 'drop-lighter';
        // Down at the trash she is far off: zoom in on her.
        const digging = t > 9.25 && t < 11.35;
        return { eye: base.eye, aim: throwing ? [LIGHTER_FLOOR.x + 0.03, 0.22, LIGHTER_FLOOR.z + 0.05] : [head.x, head.y + (digging ? 0.3 : 0.14), head.z], fov: digging ? 42 : 72 };
      }
      const t = (encounter === 'grab' ? GRAB_SECONDS : KILL_SECONDS) - this.state.encounter.remaining;
      const fall = this.fall();
      return {
        eye: [base.eye[0], base.eye[1] - fall * 0.75, base.eye[2]],
        aim: t < 0.1 && !arson ? [0.9, 1.4, -0.225] : [head.x, head.y - fall * 0.3, head.z],
        fov: encounter === 'kill' ? 64 : 72,
      };
    }
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
    // Hard cut to the door the instant it bangs open; a violent whip-around when they come for you.
    const whip = phase === 'grab' || phase === 'kill' || phase === 'search';
    const blend = this.reduced || phase === 'dialogue' || phase === 'entering' ? 1 : 1 - Math.exp(-delta * (whip ? 13 : 8));
    this.camera.position.lerp(new THREE.Vector3(...shot.eye), blend);
    this.aim.lerp(new THREE.Vector3(...shot.aim), blend);
    this.baseFov = THREE.MathUtils.lerp(this.baseFov, shot.fov, blend);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.aim);
    this.camera.rotateZ(this.fall() * 0.55);
    // High: the room breathes in and out and the floor lists like a boat.
    const high = tripLevel(this.state);
    if (high > 0 && !this.reduced) {
      this.camera.rotateZ(Math.sin(time * 0.37) * 0.045 * high + Math.sin(time * 1.9) * 0.006 * high);
      this.camera.fov += (Math.sin(time * 0.61) * 4.5 + Math.sin(time * 2.3) * 0.8) * high;
      this.camera.updateProjectionMatrix();
    }
    for (const id of Object.keys(this.cabDoors)) {
      const target = this.cabTargets[id] ?? 0;
      this.cabDoors[id].rotation.y = this.reduced ? target : THREE.MathUtils.lerp(this.cabDoors[id].rotation.y, target, 1 - Math.exp(-delta * 16));
    }
    if (this.shake > 0.01 && !this.reduced) {
      const jolt = this.shake * 0.045;
      this.camera.position.x += (Math.random() - 0.5) * jolt;
      this.camera.position.y += (Math.random() - 0.5) * jolt;
      this.camera.rotation.z += (Math.random() - 0.5) * jolt * 0.8;
    }
    this.shake *= Math.exp(-delta * 5);
    this.drawer.position.x = THREE.MathUtils.lerp(this.drawer.position.x, this.state.drawerOpen ? DRAWER_OPEN : DRAWER_SHUT, blend);
    this.cushion.rotation.z = THREE.MathUtils.lerp(this.cushion.rotation.z, this.state.cushionRaised ? -1.0 : 0, blend);
    // Shallow, quick, sick breathing; the slack jaw working open and shut; flies; eyes that follow you.
    this.ronnieChest.scale.y = this.reduced ? 1 : 1 + Math.sin(time * 2.3) * 0.07;
    this.ronnieJaw.rotation.x = this.reduced ? 0.12 : (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.28;
    const face = this.witness.localToWorld(new THREE.Vector3(0, 0.3, 0.7));
    this.ronnieFlies.forEach((fly, index) => {
      const orbit = time * (1.7 + index * 0.37) + index * 2.1;
      const around = index < 3 ? face : this.witness.localToWorld(new THREE.Vector3(0, 0.24, -0.1));
      fly.position.set(around.x + Math.cos(orbit) * (0.1 + index * 0.02), around.y + Math.sin(orbit * 2.3) * 0.05, around.z + Math.sin(orbit) * (0.12 + index * 0.015));
    });
    for (const [index, pupil] of this.ronniePupils.entries()) {
      const local = pupil.parent!.worldToLocal(this.camera.position.clone()).normalize();
      const side = index === 0 ? -1 : 1;
      pupil.position.set(side * 0.033 + THREE.MathUtils.clamp(local.x * 0.012, -0.007, 0.007), 0.023 + THREE.MathUtils.clamp(local.y * 0.01, -0.005, 0.005), -0.09);
    }
    // The TV: advance the clip with the game, put the right picture on the glass, and let it light the room.
    this.tv.frame(delta, delta > 0);
    const picture = this.tv.texture;
    if (this.tvScreen.map !== picture) {
      this.tvScreen.map = picture;
      this.tvScreen.emissiveMap = picture;
      this.tvScreen.needsUpdate = true;
    }
    this.tvScreen.emissiveIntensity = this.tv.isOn ? 0.95 : 0;
    this.blueLight.intensity = !this.tv.isOn ? 0.25 : this.reduced ? 3 : 3 + Math.sin(time * 8.3) * 0.075 + (this.tv.showingSnow ? Math.random() * 1.2 : 0);
    this.animateFire(time);
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
    this.tv.dispose();
    this.renderer.dispose();
  }
}