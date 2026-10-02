import * as THREE from 'three';
import type { ViewId } from './state';

// Shadow people. With Dale's bulb in you they fade in somewhere down the trailer, tall and thin and wrong,
// and creep toward wherever you are looking from, skipping closer when you blink. Click one to stare it
// down and it comes apart. Let one reach you and it is in your face, and you scream.

// Where they appear for each camera: open floor, in view, a good few steps away.
const SPAWNS: Record<ViewId, [number, number][]> = {
  seat: [[0.15, 1.5], [0.3, 0.3], [0.72, -0.25], [-0.42, -0.45]],
  kitchen: [[-0.45, -0.6], [0.1, 0.35], [-0.3, 0.2]],
  bracket: [[0.2, -0.55], [-0.25, -0.85], [0.35, -0.2]],
  dinette: [[0.2, 2.7], [0.45, 2.0], [-0.05, 3.0]],
  rear: [[0.45, 2.5], [0.42, 3.2], [-0.55, 2.55]],
};
const REACH = 0.75;
const LUNGE_SECONDS = 0.35;
const BANISH_SECONDS = 0.45;

interface Shade {
  body: THREE.Group;
  parts: THREE.Material[];
  haze: THREE.Sprite[];
  x: number;
  z: number;
  age: number;
  mode: 'creep' | 'lunge' | 'banished';
  clock: number;
  speed: number;
  skipIn: number;
  flicker: number;
}

export type ShadowEvent = { kind: 'spawn'; pan: number } | { kind: 'reached' } | { kind: 'banished' };

export class ShadowPeople {
  private readonly idle: Shade[] = [];
  private readonly active: Shade[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private spawnIn = 2.5;
  private lastSpot = -1;

  constructor(private readonly scene: THREE.Scene) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, '#ffffffff');
    gradient.addColorStop(0.55, '#ffffff66');
    gradient.addColorStop(1, '#ffffff00');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const haze = new THREE.CanvasTexture(canvas);
    for (let index = 0; index < 3; index++) this.idle.push(this.build(haze));
  }

  // A tall, thin, faceless figure: arms too long, legs too thin, two pinpricks for eyes, edges smoking off.
  private build(hazeMap: THREE.Texture): Shade {
    const body = new THREE.Group();
    const parts: THREE.Material[] = [];
    const black = () => { const material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, fog: false, depthWrite: false }); parts.push(material); return material; };
    const add = (geometry: THREE.BufferGeometry, position: [number, number, number], material = black(), rotation: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      body.add(mesh);
      return mesh;
    };
    add(new THREE.SphereGeometry(0.12, 12, 10), [0, 1.82, 0]).scale.set(0.9, 1.2, 0.95);
    add(new THREE.CylinderGeometry(0.035, 0.045, 0.16, 6), [0, 1.64, 0]);
    add(new THREE.CylinderGeometry(0.17, 0.1, 0.72, 8), [0, 1.22, 0]);
    add(new THREE.CylinderGeometry(0.11, 0.1, 0.16, 8), [0, 0.82, 0]);
    for (const side of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.045, 0.025, 0.9, 6), [side * 0.07, 0.42, 0]);
      // Arms that hang well past the knees, fingers like twigs.
      add(new THREE.CylinderGeometry(0.035, 0.022, 1.05, 6), [side * 0.23, 1.04, 0], black(), [0, 0, side * 0.06]);
      for (let finger = 0; finger < 3; finger++) add(new THREE.CylinderGeometry(0.007, 0.002, 0.16, 4), [side * (0.27 + finger * 0.012), 0.44, (finger - 1) * 0.02], black(), [0, 0, side * 0.1]);
    }
    const eye = new THREE.MeshBasicMaterial({ color: 0xff2a14, transparent: true, opacity: 0, fog: false, depthWrite: false });
    parts.push(eye);
    for (const side of [-1, 1]) add(new THREE.SphereGeometry(0.009, 6, 6), [side * 0.04, 1.84, -0.11], eye);
    // Smoke coming off the edges so it never looks like a solid statue.
    const haze: THREE.Sprite[] = [];
    for (let puff = 0; puff < 7; puff++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeMap, color: 0x000000, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      body.add(sprite);
      haze.push(sprite);
    }
    body.traverse(child => { child.userData.ignoreRay = true; child.renderOrder = 2; });
    body.visible = false;
    this.scene.add(body);
    return { body, parts, haze, x: 0, z: 0, age: 0, mode: 'creep', clock: 0, speed: 0.3, skipIn: 2, flicker: 0 };
  }

  get count(): number { return this.active.length; }

  // One frame. `eye` is where the camera is looking from. Returns what happened, for sound and game state.
  update(delta: number, time: number, active: boolean, paranoia: number, view: ViewId, camera: THREE.Camera): ShadowEvent[] {
    const events: ShadowEvent[] = [];
    if (!active) { this.clear(); this.spawnIn = 2.5; return events; }
    const eye = camera.position;
    // New ones come faster and in bigger numbers the more paranoid you are.
    this.spawnIn -= delta;
    const limit = 1 + Math.floor(paranoia / 40);
    if (this.spawnIn <= 0 && this.active.length < limit && this.idle.length) {
      const spots = SPAWNS[view];
      let index = Math.floor(Math.random() * spots.length);
      if (index === this.lastSpot && spots.length > 1) index = (index + 1) % spots.length;
      this.lastSpot = index;
      const shade = this.idle.pop()!;
      Object.assign(shade, { x: spots[index][0], z: spots[index][1], age: 0, mode: 'creep', clock: 0, speed: 0.26 + paranoia / 320 + Math.random() * 0.08, skipIn: 1.4 + Math.random() * 1.6, flicker: 0 });
      shade.body.visible = true;
      shade.body.scale.setScalar(0.95 + Math.random() * 0.12);
      this.active.push(shade);
      const local = new THREE.Vector3(shade.x, 1.5, shade.z).project(camera);
      events.push({ kind: 'spawn', pan: THREE.MathUtils.clamp(local.x, -1, 1) });
      this.spawnIn = (5 + Math.random() * 4) * (1 - paranoia / 220);
    }
    for (const shade of [...this.active]) {
      shade.age += delta;
      shade.clock += delta;
      const toEye = new THREE.Vector2(eye.x - shade.x, eye.z - shade.z);
      const distance = toEye.length();
      if (shade.mode === 'creep') {
        // Glides, then skips a step closer in a flicker when you are not quite looking.
        shade.skipIn -= delta;
        let step = shade.speed * delta;
        if (shade.skipIn <= 0) { step += 0.38; shade.skipIn = 1.4 + Math.random() * 1.8; shade.flicker = 0.12; }
        const move = Math.min(step, Math.max(0, distance - REACH));
        toEye.normalize();
        shade.x += toEye.x * move;
        shade.z += toEye.y * move;
        if (distance - move <= REACH + 0.001) { shade.mode = 'lunge'; shade.clock = 0; }
      }
      shade.flicker = Math.max(0, shade.flicker - delta);
      const facing = Math.atan2(-(eye.x - shade.x), -(eye.z - shade.z));
      const body = shade.body;
      const fadeIn = THREE.MathUtils.smoothstep(shade.age, 0, 0.9);
      let opacity = fadeIn * (shade.flicker > 0 ? 0.25 : 0.97);
      body.position.set(shade.x, 0, shade.z);
      body.rotation.set(0, facing, Math.sin(time * 1.3 + shade.age) * 0.03);
      if (shade.mode === 'creep') {
        // A twitch in the head now and then, like it is listening for you.
        body.children[0].rotation.z = Math.sin(time * 3 + shade.age * 7) > 0.85 ? 0.5 : Math.sin(time * 0.7) * 0.1;
      } else if (shade.mode === 'lunge') {
        // It is in your face.
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const reach = THREE.MathUtils.smoothstep(shade.clock, 0, LUNGE_SECONDS);
        const head = eye.clone().addScaledVector(forward, THREE.MathUtils.lerp(0.9, 0.22, reach));
        const scale = THREE.MathUtils.lerp(body.scale.y, 1.25, reach);
        body.scale.setScalar(scale);
        body.position.set(head.x, head.y - 1.82 * scale, head.z);
        body.rotation.y = Math.atan2(forward.x, forward.z);
        opacity = 1;
        if (shade.clock >= LUNGE_SECONDS) { this.retire(shade); events.push({ kind: 'reached' }); continue; }
      } else {
        // Stared down: it shudders, swells and blows apart.
        const out = shade.clock / BANISH_SECONDS;
        body.position.x += (Math.random() - 0.5) * 0.06;
        body.position.z += (Math.random() - 0.5) * 0.06;
        body.scale.set(1 + out * 0.8, 1 - out * 0.15, 1 + out * 0.8);
        opacity = Math.max(0, 1 - out) * 0.9;
        if (shade.clock >= BANISH_SECONDS) { this.retire(shade); continue; }
      }
      for (const material of shade.parts) material.opacity = opacity;
      shade.haze.forEach((sprite, index) => {
        const drift = (time * 0.4 + index / shade.haze.length) % 1;
        sprite.position.set(Math.sin(index * 2.1 + time) * 0.18, 0.6 + index * 0.2 + drift * 0.15, Math.cos(index * 1.7) * 0.08);
        const size = 0.35 + drift * 0.3;
        sprite.scale.set(size, size, size);
        sprite.material.opacity = opacity * 0.45 * Math.sin(Math.PI * drift);
      });
    }
    return events;
  }

  // Clicked: if the pointer is on one of them, stare it down. Returns whether you did.
  banish(clientX: number, clientY: number, element: HTMLElement, camera: THREE.Camera): boolean {
    const shade = this.under(clientX, clientY, element, camera);
    if (!shade) return false;
    shade.mode = 'banished';
    shade.clock = 0;
    return true;
  }

  // Is the pointer on one that is still coming?
  hovering(clientX: number, clientY: number, element: HTMLElement, camera: THREE.Camera): boolean {
    return this.under(clientX, clientY, element, camera) !== null;
  }

  private under(clientX: number, clientY: number, element: HTMLElement, camera: THREE.Camera): Shade | null {
    const creeping = this.active.filter(shade => shade.mode === 'creep');
    if (!creeping.length) return null;
    const rect = element.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
    // Generous: a click anywhere on the figure or the smoke around it counts.
    for (const shade of creeping) {
      shade.body.updateMatrixWorld(true);
      const box = new THREE.Box3();
      shade.body.traverse(child => { if (child instanceof THREE.Mesh) box.expandByObject(child); });
      if (this.raycaster.ray.intersectsBox(box.expandByScalar(0.08))) return shade;
    }
    return null;
  }

  private retire(shade: Shade): void {
    shade.body.visible = false;
    this.active.splice(this.active.indexOf(shade), 1);
    this.idle.push(shade);
  }

  clear(): void { for (const shade of [...this.active]) this.retire(shade); }
}
