import * as THREE from "three";
import { MercatorCoordinate } from "maplibre-gl";
import type { CustomLayerInterface, Map as MapType } from "maplibre-gl";
import type { Position, Vehicle } from "@/lib/contracts/domain";
import { toLngLat, vehiclePosition, workerPosition } from "@/simulation/geometry";
import { CONTAINER_MODEL_SCALE, VEHICLE_MODEL_SCALE } from "@/simulation/map-visuals";
import { canSeeExactWorkerPosition } from "@/lib/permissions";
import { usePort } from "@/store/use-port";

type Visibility = { containers: boolean; vehicles: boolean; workers: boolean };
type Part = { mesh: THREE.InstancedMesh; local: THREE.Matrix4[]; tint: boolean; cargo: boolean };
type Fleet = { vehicleIds: string[]; parts: Part[] };
type VehicleKind = Vehicle["type"];

const CONTAINER_DARK = [0x4bd4bd, 0x63a4cb, 0xf4ad70, 0xa9d1c9, 0xdf7470];
const CONTAINER_LIGHT = [0x1f9b8b, 0x4584a8, 0xd9894d, 0x79aaa1, 0xc35f5e];
const STACK_TIER_PITCH = 2.59 * CONTAINER_MODEL_SCALE + .12;
const CARGO_RATIO = CONTAINER_MODEL_SCALE / VEHICLE_MODEL_SCALE;
const CARGO_LENGTH = 12.2 * CARGO_RATIO;
const CARGO_WIDTH = 2.44 * CARGO_RATIO;
const CARGO_HEIGHT = 2.59 * CARGO_RATIO;
const CARGO_CENTRE_Z = 1.25 + CARGO_HEIGHT / 2;

function corrugationTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#eeeeee"; ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#c4c4c4";
  for (let x = 5; x < 128; x += 9) ctx.fillRect(x, 0, 2, 64);
  ctx.fillStyle = "#fafafa";
  for (let x = 8; x < 128; x += 9) ctx.fillRect(x, 0, 1, 64);
  ctx.fillStyle = "#888888";
  ctx.fillRect(0, 0, 128, 3); ctx.fillRect(0, 61, 128, 3);
  // The corner castings, door seam and small stencil survive the map's close zoom.
  ctx.fillStyle = "#989898";
  ctx.fillRect(2, 3, 3, 58); ctx.fillRect(123, 3, 3, 58);
  ctx.fillRect(62, 3, 2, 58);
  ctx.fillStyle = "#777777";
  for (const x of [3, 122]) for (const y of [5, 53]) ctx.fillRect(x, y, 4, 6);
  ctx.fillStyle = "#666666"; ctx.font = "bold 9px monospace";
  ctx.fillText("SELT 40", 15, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function contactShadowTexture() {
  const canvas=document.createElement("canvas");
  canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext("2d")!;
  const fade=ctx.createRadialGradient(32,32,5,32,32,31);
  fade.addColorStop(0,"rgba(0,0,0,.56)");
  fade.addColorStop(.62,"rgba(0,0,0,.30)");
  fade.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(canvas);
}

function localTransform(x: number, y: number, z: number, rotationY = 0) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY),
    new THREE.Vector3(1, 1, 1),
  );
}

function taperedCabGeometry() {
  // A sloped windshield and roof give the road vehicles a recognizable cab
  // silhouette while sharing one geometry across every instance.
  const outline = new THREE.Shape();
  outline.moveTo(.9, .95);
  outline.lineTo(3.55, .95);
  outline.lineTo(3.55, 1.55);
  outline.lineTo(3.02, 3.08);
  outline.lineTo(1.28, 3.08);
  outline.lineTo(.9, 2.55);
  outline.closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 2.25, bevelEnabled: true, bevelThickness: .08,
    bevelSize: .08, bevelSegments: 1, steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 1.125, 0);
  return geometry;
}

export function createPortMap3DLayer(map: MapType, visibility: () => Visibility) {
  const world = new THREE.Scene();
  const root = new THREE.Group(); world.add(root);
  const stacks = new THREE.Group(), fleetRoot = new THREE.Group(), workerRoot = new THREE.Group();
  root.add(stacks, fleetRoot, workerRoot);
  world.add(new THREE.AmbientLight(0xc4e7e3, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-130, -250, 500); world.add(sun);

  const origin = MercatorCoordinate.fromLngLat(toLngLat({ x: 0, y: 0 }), 0);
  const meterScale = origin.meterInMercatorCoordinateUnits();
  // Fold the tiny Mercator scale into the projection on the CPU. A separate
  // Three.js object transform would lose metre-scale detail at x≈0.5 in GL floats.
  const geoTransform = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(meterScale, meterScale, meterScale));
  const metersAt = (p: Position) => {
    const point = MercatorCoordinate.fromLngLat(toLngLat(p), 0);
    return new THREE.Vector3((point.x - origin.x) / meterScale, (point.y - origin.y) / meterScale, 0);
  };

  const texture = corrugationTexture();
  const containerMaterials = CONTAINER_DARK.map(color => new THREE.MeshStandardMaterial({ color, map: texture, metalness: .15, roughness: .8 }));
  let activePalette = CONTAINER_DARK;
  const containerGeometries = [6.1, 12.2].map(length => new THREE.BoxGeometry(length * CONTAINER_MODEL_SCALE, 2.44 * CONTAINER_MODEL_SCALE, 2.59 * CONTAINER_MODEL_SCALE));
  const bins: THREE.Matrix4[][] = Array.from({length: 10}, () => []);
  const stackShadows: THREE.Matrix4[] = [];
  const containers = Object.values(usePort.getState().containers);
  containers.forEach((container, index) => {
    if(container.status === "moving") return;
    const p = metersAt(container.position);
    const color = container.hold ? 4 : (index + Math.floor(index / 5)) % 4;
    const size = container.size === "20ft" ? 0 : 1;
    bins[size * 5 + color].push(localTransform(p.x, p.y, 5.2 + (container.tier - .5) * STACK_TIER_PITCH));
    if (container.tier === 1) stackShadows.push(
      localTransform(p.x + .75, p.y + .65, 5.23).scale(new THREE.Vector3(
        (container.size === "20ft" ? 6.1 : 12.2) * CONTAINER_MODEL_SCALE + 2,
        2.44 * CONTAINER_MODEL_SCALE + 1.8, 1,
      )),
    );
  });
  const shadowTexture=contactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide});
  const stackShadowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), shadowMaterial, stackShadows.length);
  stackShadows.forEach((shadow, index) => stackShadowMesh.setMatrixAt(index, shadow));
  stackShadowMesh.instanceMatrix.needsUpdate = true;
  stacks.add(stackShadowMesh);
  bins.forEach((matrices, bin) => {
    const instances = new THREE.InstancedMesh(containerGeometries[Math.floor(bin / 5)], containerMaterials[bin % 5], matrices.length);
    matrices.forEach((matrix, index) => instances.setMatrixAt(index, matrix));
    instances.instanceMatrix.needsUpdate = true;
    instances.computeBoundingSphere();
    stacks.add(instances);
  });

  const rubber = new THREE.MeshStandardMaterial({ color: 0x18242c, roughness: .95 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x334b56, metalness: .45, roughness: .55 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xbccdd0, metalness: .55, roughness: .45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a6484, metalness: .25, roughness: .24 });
  const light = new THREE.MeshStandardMaterial({ color: 0xffe2a2, emissive: 0xd89340, emissiveIntensity: .4 });
  const body = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .25, roughness: .48 });
  const cargo = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, metalness: .18, roughness: .75 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xeaa66b, metalness: .3, roughness: .5 });
  const sensor = new THREE.MeshStandardMaterial({ color: 0x64f5d8, emissive: 0x2dc7aa, emissiveIntensity: .35 });
  const amberMarker = new THREE.MeshStandardMaterial({color:0xf6a457,emissive:0x9b4b1d,emissiveIntensity:.22});
  const reflector = new THREE.MeshStandardMaterial({color:0xf2f7e9,roughness:.4});
  const tireGeometry = new THREE.CylinderGeometry(.54, .54, .38, 10);
  const hubGeometry = new THREE.CylinderGeometry(.27, .27, .4, 10);
  const cabGeometry = taperedCabGeometry();
  const fleets: Fleet[] = [];
  const allVehicles = Object.values(usePort.getState().vehicles);
  const vehicleIndex = new Map(allVehicles.map((vehicle, index) => [vehicle.id, index]));
  const kinds: VehicleKind[] = ["prime mover", "AGV", "reach stacker", "truck"];

  for (const kind of kinds) {
    const vehicles = allVehicles.filter(vehicle => vehicle.type === kind);
    const parts: Part[] = [];
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, offsets: [number, number, number, number?][], tint = false, cargoPart = false, stretch?: [number, number, number]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, vehicles.length * offsets.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      fleetRoot.add(mesh);
      parts.push({ mesh, local: offsets.map(([x, y, z, angle]) => {
        const transform = localTransform(x, y, z, angle);
        if (stretch) transform.scale(new THREE.Vector3(...stretch));
        return transform;
      }), tint, cargo: cargoPart });
    };
    const box = (size: [number, number, number], material: THREE.Material, offsets: [number, number, number, number?][], tint = false, cargoPart = false) =>
      add(new THREE.BoxGeometry(...size), material, offsets, tint, cargoPart);
    const wheels = (front: number, rear: number, width: number) => {
      const positions: [number, number, number][] = [[front, -width, .62], [front, width, .62], [rear, -width, .62], [rear, width, .62]];
      add(tireGeometry, rubber, positions);
      add(hubGeometry, steel, positions);
    };

    if (kind === "prime mover" || kind === "truck") {
      add(new THREE.PlaneGeometry(1, 1), shadowMaterial, [[-4.3, .25, .08]], false, false, [18.2, 3.45, 1]);
      box([16.2, 2.3, .48], frame, [[-4.25, 0, .78]]);
      add(cabGeometry, body, [[0, 0, 0]], true);
      box([2.18, 2.18, .18], body, [[2.12, 0, 3.13]]);
      box([.18, 2.03, .65], glass, [[3.17, 0, 2.45, -.32]]);
      box([.1, 1.84, 1.05], glass, [[3.29, 0, 2.36, -.34]]);
      box([1.5, .08, .7], glass, [[1.93, -1.19, 2.32], [1.93, 1.19, 2.32]]);
      box([.12, .09, .52], frame, [[1.58, -1.25, 2.32], [1.58, 1.25, 2.32]]);
      box([.42, .22, .25], steel, [[2.95, -1.45, 2.35], [2.95, 1.45, 2.35]]);
      box([.78, .2, .14], steel, [[1.2, -1.35, 1.12], [1.2, 1.35, 1.12]]);
      box([.12, .14, 2.05], steel, [[-.05, -1.29, 2.27], [-.05, 1.29, 2.27]]);
      box([.12, 1.35, .44], rubber, [[3.67, 0, 1.18]]);
      box([.2, 1.7, .42], frame, [[3.67, 0, 1.2]]);
      box([.05, 1.17, .5], steel, [[3.8, 0, 1.25]]);
      box([.16, .34, .21], light, [[3.72, -.78, 1.4], [3.72, .78, 1.4]]);
      box([12.4, 2.28, .23], steel, [[-6.1, 0, 1.12]]);
      box([12.2, .12, .15], frame, [[-6.1, -1.18, 1.03], [-6.1, 1.18, 1.03]]);
      box([CARGO_LENGTH, CARGO_WIDTH, CARGO_HEIGHT], cargo, [[-6.1, 0, CARGO_CENTRE_Z]], false, true);
      box([.09, CARGO_WIDTH, CARGO_HEIGHT], frame, [[-6.1-CARGO_LENGTH/2, 0, CARGO_CENTRE_Z]], false, true);
      box([.12, .07, CARGO_HEIGHT-.22], steel, [[-6.1-CARGO_LENGTH/2-.08, -.57, CARGO_CENTRE_Z], [-6.1-CARGO_LENGTH/2-.08, .57, CARGO_CENTRE_Z]], false, true);
      box([.12, .23, .13], amberMarker, [[-11.1, -1.17, 1.3], [-11.1, 1.17, 1.3], [-1.1, -1.17, 1.3], [-1.1, 1.17, 1.3]]);
      wheels(2.1, -10.6, 1.25);
      for (const axle of [-8.8, -6.9]) {
        add(tireGeometry, rubber, [[axle, -1.25, .62], [axle, 1.25, .62]]);
        add(hubGeometry, steel, [[axle, -1.25, .62], [axle, 1.25, .62]]);
      }
    } else if (kind === "AGV") {
      add(new THREE.PlaneGeometry(1, 1), shadowMaterial, [[.3, .2, .08]], false, false, [14.8, 3.6, 1]);
      box([13.7, 2.8, .78], frame, [[0, 0, .95]]);
      box([CARGO_LENGTH, CARGO_WIDTH, CARGO_HEIGHT], cargo, [[0, 0, 1.34+CARGO_HEIGHT/2]], false, true);
      box([13.2, .11, .16], steel, [[0, -1.44, 1.12], [0, 1.44, 1.12]]);
      box([.75, 2.1, .28], sensor, [[6.65, 0, 1.75]]);
      box([.18, .32, .2], light, [[6.82, -.92, 1.2], [6.82, .92, 1.2]]);
      box([.12, .25, .16], amberMarker, [[-6.83, -.98, 1.2], [-6.83, .98, 1.2]]);
      wheels(5.1, -5.1, 1.4);
    } else {
      add(new THREE.PlaneGeometry(1, 1), shadowMaterial, [[.3, .2, .08]], false, false, [8.1, 3.5, 1]);
      box([7, 2.8, .7], frame, [[0, 0, .9]]);
      box([2.05, 2.45, 2.2], orange, [[-1.8, 0, 2.24]]);
      box([.12, 1.75, .8], glass, [[-.68, 0, 2.5]]);
      box([1.9, .08, .7], glass, [[-1.8, -1.27, 2.45], [-1.8, 1.27, 2.45]]);
      box([6.4, .65, .64], steel, [[1.18, 0, 3.14, -.32]]);
      box([2.65, 2.9, .32], steel, [[4.12, 0, 4.1]]);
      box([.28, 2.5, .5], frame, [[5.35, 0, 3.7]]);
      box([.3, .3, .4], reflector, [[5.45, -.95, 3.85], [5.45, .95, 3.85]]);
      box([.35, .3, .35], sensor, [[4.1, 0, 4.35]]);
      wheels(2.4, -2.4, 1.45);
    }
    fleets.push({ vehicleIds: vehicles.map(vehicle => vehicle.id), parts });
  }

  const workerIds = Object.keys(usePort.getState().workers);
  const workerParts: {mesh: THREE.InstancedMesh; local: THREE.Matrix4; tint: boolean}[] = [];
  const workerVest = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8 });
  const workerSkin = new THREE.MeshStandardMaterial({ color: 0xc99a79, roughness: .92 });
  const workerHat = new THREE.MeshStandardMaterial({ color: 0xf7c967, roughness: .65 });
  const workerLegs = new THREE.MeshStandardMaterial({ color: 0x233f4a, roughness: .85 });
  const workerGps = new THREE.MeshStandardMaterial({ color: 0x76f4df, emissive: 0x2dc7aa, emissiveIntensity: .6 });
  const addWorker = (geometry: THREE.BufferGeometry, material: THREE.Material, offset: [number, number, number], tint = false) => {
    const mesh = new THREE.InstancedMesh(geometry, material, workerIds.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    workerRoot.add(mesh);
    workerParts.push({mesh, local: localTransform(...offset), tint});
  };
  addWorker(new THREE.BoxGeometry(.54, .3, .76), workerVest, [0, 0, 1.06], true);
  addWorker(new THREE.SphereGeometry(.22, 8, 6), workerSkin, [0, 0, 1.62]);
  const helmetGeometry = new THREE.CylinderGeometry(.27, .27, .12, 10);
  helmetGeometry.rotateX(Math.PI / 2);
  addWorker(helmetGeometry, workerHat, [0, 0, 1.82]);
  addWorker(new THREE.BoxGeometry(.18, .2, .74), workerLegs, [-.16, 0, .39]);
  addWorker(new THREE.BoxGeometry(.18, .2, .74), workerLegs, [.16, 0, .39]);
  addWorker(new THREE.SphereGeometry(.1, 6, 5), workerGps, [0, 0, 2.08]);

  const camera = new THREE.Camera();
  let renderer: THREE.WebGLRenderer | undefined;
  const baseMatrix = new THREE.Matrix4(), matrix = new THREE.Matrix4();
  const axis = new THREE.Vector3(0, 0, 1), quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(VEHICLE_MODEL_SCALE, VEHICLE_MODEL_SCALE, VEHICLE_MODEL_SCALE);
  const workerScale = new THREE.Vector3(1.15, 1.15, 1.15);
  const tintColor = new THREE.Color(), cargoTint = new THREE.Color(), workerTint = new THREE.Color();
  const emptyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  const workerQuaternion = new THREE.Quaternion();

  const layer: CustomLayerInterface = {
    id: "port-objects-3d", type: "custom", renderingMode: "3d",
    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: false });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    },
    render(_gl, options) {
      if (!renderer) return;
      const visible = visibility();
      const state = usePort.getState();
      stacks.visible = visible.containers;
      fleetRoot.visible = visible.vehicles;
      workerRoot.visible = visible.workers && canSeeExactWorkerPosition(state.role);
      if (!stacks.visible && !fleetRoot.visible && !workerRoot.visible) return;
      if (fleetRoot.visible) {
        for (const fleet of fleets) {
          fleet.vehicleIds.forEach((vehicleId, index) => {
            const vehicle = state.vehicles[vehicleId];
            const originalIndex = vehicleIndex.get(vehicleId) ?? 0;
            const p = vehiclePosition(vehicle, originalIndex, state.simSeconds);
            const next = vehiclePosition(vehicle, originalIndex, state.simSeconds + .5);
            const pos = metersAt(p);
            pos.z = .25;
            quaternion.setFromAxisAngle(axis, Math.atan2(next.y - p.y, next.x - p.x));
            baseMatrix.compose(pos, quaternion, scale);
            tintColor.setHex(vehicle.status === "fault" ? 0xf07a5c : vehicle.assignment === "Berth 2" ? 0x54d9c5 : 0xd9e5e0);
            if(vehicle.containerId){
              const containerIndex = Number(vehicle.containerId.slice(4)) - 1000000;
              cargoTint.setHex(activePalette[(containerIndex + Math.floor(containerIndex / 5)) % 4]);
            }
            for (const part of fleet.parts) {
              part.local.forEach((local, partIndex) => {
                const target = index * part.local.length + partIndex;
                if(part.cargo && !vehicle.containerId) matrix.copy(emptyMatrix);
                else matrix.multiplyMatrices(baseMatrix, local);
                part.mesh.setMatrixAt(target, matrix);
                if (part.tint) part.mesh.setColorAt(target, tintColor);
                if (part.cargo && vehicle.containerId) part.mesh.setColorAt(target, cargoTint);
              });
            }
          });
          for (const part of fleet.parts) {
            part.mesh.instanceMatrix.needsUpdate = true;
            if ((part.tint || part.cargo) && part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
          }
        }
      }
      if(workerRoot.visible){
        workerIds.forEach((workerId, index) => {
          const worker = state.workers[workerId];
          const p = workerPosition(worker, state.simSeconds);
          const pos = metersAt(p);
          pos.z = p.y >= 345 && p.y <= 585 ? 5.2 : .15;
          baseMatrix.compose(pos, workerQuaternion, workerScale);
          workerTint.setHex(worker.status === "breach" ? 0xe95a60 : worker.status === "near_zone" ? 0xf4b566 : 0x63d9c4);
          for(const part of workerParts){
            matrix.multiplyMatrices(baseMatrix, part.local);
            part.mesh.setMatrixAt(index, matrix);
            if(part.tint) part.mesh.setColorAt(index, workerTint);
          }
        });
        for(const part of workerParts){
          part.mesh.instanceMatrix.needsUpdate = true;
          if(part.tint && part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
        }
      }
      camera.projectionMatrix.fromArray(options.defaultProjectionData.mainMatrix).multiply(geoTransform);
      renderer.resetState();
      renderer.render(world, camera);
      renderer.resetState();
    },
    onRemove() {
      for (const fleet of fleets) for (const part of fleet.parts) { part.mesh.geometry.dispose(); part.mesh.dispose(); }
      stackShadowMesh.geometry.dispose(); stackShadowMesh.dispose();
      hubGeometry.dispose(); cabGeometry.dispose();
      for(const part of workerParts){part.mesh.geometry.dispose();part.mesh.dispose();}
      containerGeometries.forEach(geometry => geometry.dispose()); texture.dispose(); shadowTexture.dispose();
      for (const material of [...containerMaterials, shadowMaterial, rubber, frame, steel, glass, light, body, cargo, orange, sensor, amberMarker, reflector, workerVest, workerSkin, workerHat, workerLegs, workerGps]) material.dispose();
      renderer?.dispose(); renderer = undefined;
    },
  };

  function setTheme(isLight: boolean) {
    activePalette = isLight ? CONTAINER_LIGHT : CONTAINER_DARK;
    containerMaterials.forEach((material, index) => material.color.setHex(activePalette[index]));
    map.triggerRepaint();
  }
  return { layer, setTheme };
}
