import type { Position, Vehicle, Worker, PortSnapshot } from "@/lib/contracts/domain";
export function pointInPolygon(point: Position, polygon: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (((a.y > point.y) !== (b.y > point.y)) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export const toLngLat = (p: Position): [number, number] => [p.x / 50000, (700 - p.y) / 50000];
export const fromLngLat = (lng: number, lat: number): Position => ({ x: lng * 50000, y: 700 - lat * 50000 });
export function pathPosition(path: Position[], progress: number): Position {
  if (path.length < 2) return path[0] ?? { x: 0, y: 0 };
  const lengths = path.slice(1).map((p,i) => Math.hypot(p.x-path[i].x,p.y-path[i].y));
  const total = lengths.reduce((a,b) => a+b,0);
  let distance = ((progress % 1)+1)%1 * total;
  for (let i=0;i<lengths.length;i++) {
    if (distance <= lengths[i]) { const t=lengths[i] ? distance/lengths[i] : 0; return {x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t}; }
    distance -= lengths[i];
  }
  return path[path.length-1];
}

export function vehiclePosition(vehicle: Vehicle, index: number, simSeconds: number): Position {
  const routeLength = vehicle.route.slice(1).reduce((distance,point,i)=>distance+Math.hypot(point.x-vehicle.route[i].x,point.y-vehicle.route[i].y),0);
  const progress = (vehicle.status === "active" && routeLength ? simSeconds * vehicle.speedKph / 3.6 / routeLength : 0) + index * .137;
  return pathPosition(vehicle.route, progress % 1);
}

export function workerPosition(worker: Worker, simSeconds: number): Position {
  if(worker.status === "breach") return worker.position;
  const index = Number(worker.id.slice(2)) || 0;
  return pathPosition(worker.route, (simSeconds / 45 + index * .073) % 1);
}

export function containerDisplayPosition(snapshot: PortSnapshot, containerId: string): Position | undefined {
  const carrier = Object.values(snapshot.vehicles).find(vehicle => vehicle.containerId === containerId);
  if(carrier) return vehiclePosition(carrier, Object.keys(snapshot.vehicles).indexOf(carrier.id), snapshot.simSeconds);
  return snapshot.containers[containerId]?.position;
}
