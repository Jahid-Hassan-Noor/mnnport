"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Map as MapType, MapMouseEvent } from "maplibre-gl";
import type { EntityRef, Position, PortSnapshot } from "@/lib/contracts/domain";
import { usePort } from "@/store/use-port";
import {
  toLngLat,
  fromLngLat,
  vehiclePosition,
  workerPosition,
  containerDisplayPosition,
} from "@/simulation/geometry";
import { canSeeExactWorkerPosition } from "@/lib/permissions";
import { webgl2Available } from "@/lib/webgl";
import {
  YARD_BAY_PITCH,
  YARD_FIRST_BAY_X,
  YARD_ROW_Y,
} from "@/simulation/map-visuals";
import { PortMapPreview } from "./PortMapPreview";

type LayerKey =
  | "vessels"
  | "vehicles"
  | "workers"
  | "containers"
  | "zones"
  | "heat"
  | "routes";
const LAYERS: LayerKey[] = [
  "vessels",
  "vehicles",
  "workers",
  "containers",
  "zones",
  "heat",
  "routes",
];
const noSubscribe = () => () => {};
const ll = (p: Position) => toLngLat(p);
const line = (points: Position[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: points.map(ll) },
});
const poly = (
  points: Position[],
  properties: Record<string, unknown> = {},
) => ({
  type: "Feature" as const,
  properties,
  geometry: {
    type: "Polygon" as const,
    coordinates: [[...points, points[0]].map(ll)],
  },
});
const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const lightTheme = () => document.documentElement.dataset.theme === "light";
const focusOffset = (map: MapType): [number, number] => [
  -Math.min(165, map.getContainer().clientWidth * 0.23),
  0,
];
function applyMapTheme(map: MapType) {
  const light = lightTheme();
  map.setPaintProperty(
    "board",
    "background-color",
    light ? "#c7e6e4" : "#071b29",
  );
  if (!map.getLayer("ground")) return;
  map.setPaintProperty("ground", "fill-color", [
    "match",
    ["get", "kind"],
    "land",
    light ? "#e4f2e8" : "#102a35",
    "berth",
    light ? "#b6d9d0" : "#1c4550",
    "yard",
    light ? "#cce6d9" : "#173540",
    "building",
    light ? "#91b7ad" : "#28525d",
    light ? "#e4f2e8" : "#102a35",
  ]);
  map.setPaintProperty(
    "ground",
    "fill-outline-color",
    light ? "#8ab8b0" : "#376371",
  );
  map.setPaintProperty("structures", "fill-extrusion-color", [
    "match",
    ["get", "kind"],
    "berth",
    light ? "#98c8bd" : "#1a4b57",
    "yard",
    light ? "#acd7c8" : "#1a3e48",
    "building",
    light ? "#729f9a" : "#2d6974",
    light ? "#dceee4" : "#102a35",
  ]);
  map.setPaintProperty("road-bed", "line-color", light ? "#a8cbc6" : "#0b2935");
  map.setPaintProperty("roads", "line-color", light ? "#568d88" : "#6c9da3");
  map.setPaintProperty("zones", "fill-color", [
    "match",
    ["get", "kind"],
    "exclusion",
    light ? "#e88355" : "#ff9d68",
    "walkway",
    light ? "#2aab89" : "#4fe2c6",
    light ? "#6ea59e" : "#678997",
  ]);
  map.setPaintProperty(
    "zones",
    "fill-outline-color",
    light ? "#ce704d" : "#ff9d68",
  );
}
function geometry(s: PortSnapshot) {
  const features = [poly(rect(0, 230, 1000, 470), { kind: "land" })];
  for (let i = 0; i < 4; i++)
    features.push(poly(rect(85 + i * 190, 182, 155, 72), { kind: "berth" }));
  for (let i = 0; i < 4; i++)
    features.push(poly(rect(125 + i * 175, 345, 148, 240), { kind: "yard" }));
  features.push(
    poly(rect(845, 365, 120, 115), { kind: "building" }),
    poly(rect(845, 535, 120, 82), { kind: "building" }),
  );
  // The road centerlines occupy the perimeter and the gaps between storage
  // blocks. No vehicle route crosses a container stack footprint.
  const roadFeatures = [
    line([
      { x: 105, y: 330 },
      { x: 830, y: 330 },
    ]),
    line([
      { x: 105, y: 610 },
      { x: 830, y: 610 },
    ]),
  ];
  for (const lane of [286, 461, 636, 815])
    roadFeatures.push(
      line([
        { x: lane, y: 330 },
        { x: lane, y: 610 },
      ]),
    );
  const zoneFeatures = Object.values(s.zones).map((z) =>
    poly(z.polygon, { kind: z.kind, id: z.id }),
  );
  return { features, roadFeatures, zoneFeatures };
}
function addSource(map: MapType, id: string, features: GeoJSON.Feature[]) {
  map.addSource(id, {
    type: "geojson",
    data: { type: "FeatureCollection", features },
  });
}
function projected(map: MapType, p: Position) {
  const q = map.project(ll(p));
  return { x: q.x, y: q.y };
}
function distanceToSegment(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
function drawingPosition(
  v: PortSnapshot["vehicles"][string],
  index: number,
  time: number,
) {
  return vehiclePosition(v, index, time);
}
function vesselDisplayPositionAt(
  s: PortSnapshot,
  id: string,
  time: number,
): Position | undefined {
  const v = s.vessels[id];
  if (!v) return undefined;
  if (id === "V-LD" && s.scene === 1) {
    const t = Math.min(1, time / 45);
    return { x: 745 + 195 * t, y: 155 - 85 * t };
  }
  if (id === "V-KP" && s.scene === 3) {
    const t = Math.min(1, Math.max(0, (time - 105) / 16));
    return { x: 500 - 145 * t, y: 95 + 50 * t };
  }
  return v.position;
}
function vesselDisplayPosition(
  s: PortSnapshot,
  id: string,
): Position | undefined {
  return vesselDisplayPositionAt(s, id, s.simSeconds);
}
function movingWorkerPosition(s: PortSnapshot, id: string): Position {
  return workerPosition(s.workers[id], s.simSeconds);
}
function workerDisplayPosition(
  s: PortSnapshot,
  id: string,
): Position | undefined {
  const worker = s.workers[id];
  if (!worker) return undefined;
  if (canSeeExactWorkerPosition(s.role)) return movingWorkerPosition(s, id);
  const zone = s.zones[worker.zoneId];
  if (zone)
    return {
      x: zone.polygon.reduce((n, p) => n + p.x, 0) / zone.polygon.length,
      y: zone.polygon.reduce((n, p) => n + p.y, 0) / zone.polygon.length,
    };
  const group = Object.values(s.workers).filter(
    (w) => w.zoneId === worker.zoneId,
  );
  return {
    x:
      group.reduce((n, w) => n + movingWorkerPosition(s, w.id).x, 0) /
      group.length,
    y:
      group.reduce((n, w) => n + movingWorkerPosition(s, w.id).y, 0) /
      group.length,
  };
}
function alertDisplayPosition(
  s: PortSnapshot,
  a: { entity?: EntityRef; position: Position },
) {
  if (a.entity?.type === "worker")
    return workerDisplayPosition(s, a.entity.id) ?? a.position;
  if (a.entity?.type === "vessel")
    return vesselDisplayPosition(s, a.entity.id) ?? a.position;
  return a.position;
}
function hoverCandidates(s: PortSnapshot) {
  const candidates: { label: string; ref: EntityRef; p: Position }[] = [];
  for (const a of s.alerts)
    if (a.status !== "resolved" && a.entity)
      candidates.push({
        label: `${a.severity.toUpperCase()} · ${a.title}`,
        ref: a.entity,
        p: alertDisplayPosition(s, a),
      });
  for (const v of Object.values(s.vessels))
    candidates.push({
      label: `${v.name} · ${v.status}`,
      ref: { type: "vessel", id: v.id },
      p: vesselDisplayPosition(s, v.id)!,
    });
  Object.values(s.vehicles).forEach((v, i) =>
    candidates.push({
      label: `${v.id} · ${v.assignment}`,
      ref: { type: "vehicle", id: v.id },
      p: drawingPosition(v, i, s.simSeconds),
    }),
  );
  for (const c of Object.values(s.cranes))
    candidates.push({
      label: `${c.id} · ${c.status}`,
      ref: { type: "crane", id: c.id },
      p: c.position,
    });
  for (const b of Object.values(s.berths))
    candidates.push({
      label: `${b.id} · ${b.status}`,
      ref: { type: "berth", id: b.id },
      p: b.position,
    });
  if (canSeeExactWorkerPosition(s.role))
    for (const w of Object.values(s.workers))
      candidates.push({
        label: `${w.id} · GPS active · ${w.status}`,
        ref: { type: "worker", id: w.id },
        p: workerDisplayPosition(s, w.id)!,
      });
  return candidates;
}

export function PortMap() {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    tooltip = useRef<HTMLDivElement>(null),
    fps = useRef<HTMLOutputElement>(null),
    mapRef = useRef<MapType | null>(null);
  const objects3D = useRef<{ setTheme: (light: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null),
    [previewFocus, setPreviewFocus] = useState<"overview" | "yard">("overview"),
    [query, setQuery] = useState(""),
    [followingVehicle, setFollowingVehicle] = useState(false),
    [yardLocation, setYardLocation] = useState(""),
    [layersOpen, setLayersOpen] = useState(false),
    [layers, setLayers] = useState<Record<LayerKey, boolean>>({
      vessels: true,
      vehicles: true,
      workers: true,
      containers: true,
      zones: true,
      heat: false,
      routes: false,
    });
  const selected = usePort((s) => s.selected),
    scene = usePort((s) => s.scene),
    role = usePort((s) => s.role),
    select = usePort((s) => s.select);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const layerRef = useRef(layers);
  useEffect(() => {
    layerRef.current = layers;
  }, [layers]);
  useEffect(() => {
    if (!root.current) return;
    let alive = true;
    if (!webgl2Available()) {
      queueMicrotask(() => {
        if (alive)
          setError("Interactive map unavailable. Showing the 2D port preview.");
      });
      return () => {
        alive = false;
      };
    }
    let map: MapType;
    let loadTimer = 0;
    let mapCanvas: HTMLCanvasElement | null = null;
    const onContextLost = () =>
      setError(
        "The graphics context stopped. The 2D port preview remains available.",
      );
    import("maplibre-gl")
      .then(({ Map: MapLibreMap, setWorkerUrl }) => {
        if (!alive || !root.current) return;
        setWorkerUrl("/maplibre-gl-worker.mjs");
        // A compact control-room window cannot show all four yards and legible
        // individual boxes at once. Open it on the storage detail instead.
        const compact = root.current.clientWidth < 760;
        try {
          map = new MapLibreMap({
            container: root.current,
            style: {
              version: 8,
              sources: {},
              layers: [
                {
                  id: "board",
                  type: "background",
                  paint: {
                    "background-color": lightTheme() ? "#c7e6e4" : "#071b29",
                  },
                },
              ],
            },
            center: toLngLat(compact ? { x: 480, y: 490 } : { x: 500, y: 350 }),
            zoom: compact ? 18.2 : 15.25,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
            minZoom: 13,
            maxZoom: 20,
            pitch: 28,
            bearing: -9,
            attributionControl: false,
            pitchWithRotate: false,
            dragRotate: false,
          });
        } catch {
          setError("Interactive map unavailable. Showing the 2D port preview.");
          return;
        }
        mapRef.current = map;
        mapCanvas = map.getCanvas();
        mapCanvas.addEventListener("webglcontextlost", onContextLost);
        loadTimer = window.setTimeout(() => {
          if (alive && !map.loaded())
            setError(
              "The interactive renderer did not start. The 2D port preview remains available.",
            );
        }, 8000);
        const publishView = () => {
          const panel = root.current?.parentElement;
          if (panel) {
            panel.dataset.zoom = map.getZoom().toFixed(2);
            panel.dataset.center = map
              .getCenter()
              .toArray()
              .map((v) => v.toFixed(5))
              .join(",");
          }
          const center = map.getCenter(),
            world = fromLngLat(center.lng, center.lat);
          const yard = Math.floor((world.x - 125) / 175);
          if (
            map.getZoom() < 17.4 ||
            yard < 0 ||
            yard > 3 ||
            world.x > 125 + yard * 175 + 148 ||
            world.y < 345 ||
            world.y > 585
          ) {
            setYardLocation("");
            return;
          }
          const first = YARD_FIRST_BAY_X + yard * 175;
          const bay = Math.max(
            1,
            Math.min(5, Math.round((world.x - first) / YARD_BAY_PITCH) + 1),
          );
          const row =
            YARD_ROW_Y.reduce(
              (nearest, value, index) =>
                Math.abs(value - world.y) <
                Math.abs(YARD_ROW_Y[nearest] - world.y)
                  ? index
                  : nearest,
              0,
            ) + 1;
          setYardLocation(
            `YARD ${"ABCD"[yard]} · ROW ${String(row).padStart(2, "0")} · BAY ${String(bay).padStart(2, "0")}`,
          );
        };
        map.on("moveend", publishView);
        map.on("load", () => {
          window.clearTimeout(loadTimer);
          const g = geometry(usePort.getState());
          addSource(map, "ground", g.features as GeoJSON.Feature[]);
          map.addLayer({
            id: "ground",
            type: "fill",
            source: "ground",
            paint: {
              "fill-color": [
                "match",
                ["get", "kind"],
                "land",
                "#102a35",
                "berth",
                "#1c4550",
                "yard",
                "#173540",
                "building",
                "#28525d",
                "#102a35",
              ],
              "fill-outline-color": "#376371",
            },
          });
          map.addLayer({
            id: "structures",
            type: "fill-extrusion",
            source: "ground",
            paint: {
              "fill-extrusion-color": [
                "match",
                ["get", "kind"],
                "berth",
                "#1a4b57",
                "yard",
                "#1a3e48",
                "building",
                "#2d6974",
                "#102a35",
              ],
              "fill-extrusion-height": [
                "match",
                ["get", "kind"],
                "berth",
                7,
                "yard",
                5,
                "building",
                32,
                0,
              ],
              "fill-extrusion-opacity": 0.82,
            },
          });
          addSource(map, "roads", g.roadFeatures as GeoJSON.Feature[]);
          map.addLayer({
            id: "road-bed",
            type: "line",
            source: "roads",
            paint: {
              "line-color": "#0b2935",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                4,
                18,
                42,
                20,
                78,
              ],
              "line-opacity": 0.85,
            },
          });
          map.addLayer({
            id: "roads",
            type: "line",
            source: "roads",
            paint: {
              "line-color": "#6c9da3",
              "line-width": 2.5,
              "line-opacity": 0.7,
            },
          });
          addSource(map, "zones", g.zoneFeatures as GeoJSON.Feature[]);
          map.addLayer({
            id: "zones",
            type: "fill",
            source: "zones",
            paint: {
              "fill-color": [
                "match",
                ["get", "kind"],
                "exclusion",
                "#ff9d68",
                "walkway",
                "#4fe2c6",
                "#678997",
              ],
              "fill-opacity": 0.19,
              "fill-outline-color": "#ff9d68",
            },
          });
          applyMapTheme(map);
          publishView();
          map.once("render", () => {
            if (alive) setReady(true);
          });
          map.triggerRepaint();
          import("./PortMap3DLayer")
            .then(({ createPortMap3DLayer }) => {
              if (!alive || mapRef.current !== map) return;
              const objects = createPortMap3DLayer(map, () => layerRef.current);
              map.addLayer(objects.layer);
              objects.setTheme(lightTheme());
              objects3D.current = objects;
              if (root.current?.parentElement)
                root.current.parentElement.dataset.objects3d = "ready";
              map.triggerRepaint();
            })
            .catch((error) => {
              if (root.current?.parentElement)
                root.current.parentElement.dataset.objects3d = "fallback";
              console.warn(
                "3D map objects unavailable; using 2D markers",
                error,
              );
            });
        });
        map.on("error", () => {
          if (!map.loaded()) {
            setError(
              "Interactive map unavailable. Showing the 2D port preview.",
            );
          }
        });
        map.on("mousemove", (e) => {
          const node = tooltip.current;
          if (!node) return;
          const s = usePort.getState();
          let nearest: { label: string; d: number } | undefined;
          for (const c of hoverCandidates(s)) {
            const p = projected(map, c.p),
              d = Math.hypot(p.x - e.point.x, p.y - e.point.y);
            if (d < 16 && (!nearest || d < nearest.d))
              nearest = { label: c.label, d };
          }
          node.hidden = !nearest;
          if (nearest) {
            node.textContent = nearest.label;
            node.style.left = `${Math.min(e.point.x + 14, map.getCanvas().clientWidth - 180)}px`;
            node.style.top = `${Math.max(8, e.point.y - 38)}px`;
          }
          map.getCanvas().style.cursor = nearest ? "pointer" : "grab";
        });
        map.on("mouseout", () => {
          if (tooltip.current) tooltip.current.hidden = true;
        });
        map.on("click", (e: MapMouseEvent) => {
          const s = usePort.getState(),
            candidates: { ref: EntityRef; p: Position }[] = [];
          let truckHit: { id: string; p: Position; d: number } | undefined;
          Object.values(s.vehicles).forEach((vehicle, index) => {
            if (!layerRef.current.vehicles) return;
            const p = drawingPosition(vehicle, index, s.simSeconds),
              next = drawingPosition(vehicle, index, s.simSeconds + 0.2);
            const heading = Math.atan2(next.y - p.y, next.x - p.x),
              dx = Math.cos(heading),
              dy = Math.sin(heading);
            const roadVehicle =
              vehicle.type === "prime mover" || vehicle.type === "truck";
            const rear = roadVehicle ? 34 : vehicle.type === "AGV" ? 18 : 14,
              front = roadVehicle ? 11 : vehicle.type === "AGV" ? 18 : 17;
            const a = projected(map, {
                x: p.x - dx * rear,
                y: p.y - dy * rear,
              }),
              b = projected(map, { x: p.x + dx * front, y: p.y + dy * front });
            const d = distanceToSegment(e.point, a, b);
            const side = projected(map, {
                x: p.x - dy * 3.5,
                y: p.y + dx * 3.5,
              }),
              center = projected(map, p);
            const hitWidth = Math.max(
              22,
              Math.hypot(side.x - center.x, side.y - center.y) + 8,
            );
            if (d < hitWidth && (!truckHit || d < truckHit.d))
              truckHit = { id: vehicle.id, p, d };
          });
          if (truckHit) {
            usePort.getState().select({ type: "vehicle", id: truckHit.id });
            return;
          }
          for (const a of s.alerts)
            if (a.status !== "resolved" && a.entity)
              candidates.push({ ref: a.entity, p: alertDisplayPosition(s, a) });
          for (const v of Object.values(s.vessels))
            candidates.push({
              ref: { type: "vessel", id: v.id },
              p: vesselDisplayPosition(s, v.id)!,
            });
          Object.values(s.vehicles).forEach((v, i) =>
            candidates.push({
              ref: { type: "vehicle", id: v.id },
              p: drawingPosition(v, i, s.simSeconds),
            }),
          );
          if (canSeeExactWorkerPosition(s.role))
            Object.values(s.workers).forEach((w) =>
              candidates.push({
                ref: { type: "worker", id: w.id },
                p: workerDisplayPosition(s, w.id)!,
              }),
            );
          else {
            const seen = new Set<string>();
            Object.values(s.workers).forEach((w) => {
              if (!seen.has(w.zoneId)) {
                seen.add(w.zoneId);
                candidates.push({
                  ref: { type: "worker", id: w.id },
                  p: workerDisplayPosition(s, w.id)!,
                });
              }
            });
          }
          if (map.getZoom() > 16)
            Object.values(s.containers)
              .filter((c) => c.status !== "moving")
              .forEach((c) =>
                candidates.push({
                  ref: { type: "container", id: c.id },
                  p: c.position,
                }),
              );
          Object.values(s.cranes).forEach((c) =>
            candidates.push({
              ref: { type: "crane", id: c.id },
              p: c.position,
            }),
          );
          Object.values(s.berths).forEach((b) =>
            candidates.push({
              ref: { type: "berth", id: b.id },
              p: b.position,
            }),
          );
          let nearest:
            | { ref: EntityRef; distance: number; p: Position }
            | undefined;
          for (const item of candidates) {
            const q = projected(map, item.p),
              d = Math.hypot(q.x - e.point.x, q.y - e.point.y);
            if (d < 18 && (!nearest || d < nearest.distance))
              nearest = { ...item, distance: d };
          }
          if (nearest) usePort.getState().select(nearest.ref);
        });
      })
      .catch(() => {
        setError("Interactive map unavailable. Showing the 2D port preview.");
      });
    return () => {
      alive = false;
      window.clearTimeout(loadTimer);
      mapCanvas?.removeEventListener("webglcontextlost", onContextLost);
      mapRef.current?.remove();
      mapRef.current = null;
      objects3D.current = null;
    };
  }, []);
  useEffect(() => {
    const onThemeChange = () => {
      const map = mapRef.current;
      if (map && map.loaded()) applyMapTheme(map);
      objects3D.current?.setTheme(lightTheme());
    };
    window.addEventListener("port-command-theme-change", onThemeChange);
    return () =>
      window.removeEventListener("port-command-theme-change", onThemeChange);
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(
      "zones",
      "visibility",
      layers.zones ? "visible" : "none",
    );
    map.triggerRepaint();
  }, [layers, ready]);
  useEffect(() => {
    if (!ready || !mapRef.current || !canvas.current) return;
    const map = mapRef.current,
      surface = canvas.current;
    let frame = 0;
    let last = 0,
      last3D = 0,
      sampleStart = 0,
      sampleFrames = 0;
    const containerCache = document.createElement("canvas");
    const storedByBlock = Object.values(usePort.getState().containers).reduce<
      Record<string, number>
    >((counts, c) => {
      if (c.status !== "moving") counts[c.block] = (counts[c.block] ?? 0) + 1;
      return counts;
    }, {});
    let cacheDirty = true,
      lastCacheLight = false;
    const invalidate = () => {
      cacheDirty = true;
    };
    map.on("move", invalidate);
    const draw = (stamp: number) => {
      frame = requestAnimationFrame(draw);
      if (stamp - last < 16) return;
      last = stamp;
      if (objects3D.current && stamp - last3D > 85) {
        map.triggerRepaint();
        last3D = stamp;
      }
      if (sampleStart === 0) sampleStart = stamp;
      sampleFrames++;
      if (stamp - sampleStart >= 1000) {
        if (fps.current)
          fps.current.textContent = `MAP ${Math.round((sampleFrames * 1000) / (stamp - sampleStart))} FPS`;
        sampleStart = stamp;
        sampleFrames = 0;
      }
      const bounds = surface.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        surface.width !== Math.round(bounds.width * dpr) ||
        surface.height !== Math.round(bounds.height * dpr)
      ) {
        surface.width = Math.round(bounds.width * dpr);
        surface.height = Math.round(bounds.height * dpr);
        cacheDirty = true;
      }
      const ctx = surface.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bounds.width, bounds.height);
      const s = usePort.getState(),
        layer = layerRef.current,
        z = map.getZoom(),
        light = lightTheme();
      if (layer.zones)
        for (const zone of Object.values(s.zones)) {
          if (zone.kind !== "exclusion" || !zone.active) continue;
          const corners = zone.polygon.map((p) => projected(map, p));
          const minX = Math.min(...corners.map((p) => p.x)),
            maxX = Math.max(...corners.map((p) => p.x));
          const minY = Math.min(...corners.map((p) => p.y)),
            maxY = Math.max(...corners.map((p) => p.y));
          const held = zone.craneId
            ? s.cranes[zone.craneId]?.status === "hold"
            : false;
          ctx.save();
          ctx.beginPath();
          corners.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.closePath();
          ctx.clip();
          ctx.strokeStyle = held
            ? "rgba(255,95,105,.58)"
            : light
              ? "rgba(174,99,44,.34)"
              : "rgba(255,175,113,.27)";
          ctx.lineWidth = 1;
          for (
            let x = minX - (maxY - minY);
            x < maxX + (maxY - minY);
            x += 11
          ) {
            ctx.beginPath();
            ctx.moveTo(x, minY);
            ctx.lineTo(x + maxY - minY, maxY);
            ctx.stroke();
          }
          ctx.restore();
        }
      if (layer.containers && !objects3D.current && z > 15.3) {
        if (
          cacheDirty ||
          containerCache.width !== surface.width ||
          containerCache.height !== surface.height ||
          lastCacheLight !== light
        ) {
          containerCache.width = surface.width;
          containerCache.height = surface.height;
          const cached = containerCache.getContext("2d");
          if (cached) {
            cached.setTransform(dpr, 0, 0, dpr, 0, 0);
            cached.fillStyle = light ? "#438b86" : "#5f9da4";
            for (const c of Object.values(s.containers)) {
              if (c.status === "moving") continue;
              const p = projected(map, c.position);
              if (
                p.x > -5 &&
                p.x < bounds.width + 5 &&
                p.y > -5 &&
                p.y < bounds.height + 5
              )
                cached.fillRect(
                  p.x,
                  p.y,
                  Math.max(2, (z - 14) * 1.9),
                  Math.max(2, (z - 14) * 1.2),
                );
            }
          }
          cacheDirty = false;
          lastCacheLight = light;
        }
        ctx.drawImage(containerCache, 0, 0, bounds.width, bounds.height);
      }
      if (layer.containers && z >= 14.4) {
        ctx.save();
        ctx.font = "bold 10px JetBrains Mono, monospace";
        for (let i = 0; i < 4; i++) {
          const p = projected(map, { x: 143 + i * 175, y: 344 });
          const label = `YARD ${"ABCD"[i]} · ${storedByBlock["ABCD"[i]] ?? 0} STORED`;
          const width = ctx.measureText(label).width + 14;
          ctx.fillStyle = light ? "rgba(241,251,247,.92)" : "rgba(8,32,42,.9)";
          ctx.fillRect(p.x - 3, p.y - 20, width, 17);
          ctx.strokeStyle = light ? "#73aca1" : "#4e9c9c";
          ctx.strokeRect(p.x - 3, p.y - 20, width, 17);
          ctx.fillStyle = light ? "#175d5b" : "#a7eee0";
          ctx.fillText(label, p.x + 4, p.y - 8);
        }
        ctx.restore();
      }
      if (layer.containers && z >= 18.1) {
        ctx.save();
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        for (let yard = 0; yard < 4; yard++) {
          const first = YARD_FIRST_BAY_X + yard * 175;
          for (let bay = 0; bay < 5; bay++) {
            const p = projected(map, {
              x: first + bay * YARD_BAY_PITCH,
              y: 339,
            });
            if (
              p.x < -30 ||
              p.x > bounds.width + 30 ||
              p.y < -20 ||
              p.y > bounds.height + 20
            )
              continue;
            const label = `B${String(bay + 1).padStart(2, "0")}`;
            ctx.fillStyle = light ? "#e9f9efdf" : "#0a2733e8";
            ctx.fillRect(p.x - 18, p.y - 15, 36, 17);
            ctx.fillStyle = light ? "#1a6664" : "#b8efe3";
            ctx.fillText(label, p.x, p.y - 3);
          }
          for (const row of [1, 5, 10, 15, 20]) {
            const p = projected(map, { x: first - 18, y: YARD_ROW_Y[row - 1] });
            if (
              p.x < -32 ||
              p.x > bounds.width + 32 ||
              p.y < -20 ||
              p.y > bounds.height + 20
            )
              continue;
            const label = `R${String(row).padStart(2, "0")}`;
            ctx.fillStyle = light ? "#e9f9efdf" : "#0a2733e8";
            ctx.fillRect(p.x - 19, p.y - 9, 38, 17);
            ctx.fillStyle = light ? "#1a6664" : "#b8efe3";
            ctx.fillText(label, p.x, p.y + 3);
          }
        }
        ctx.restore();
      }
      if (layer.heat) {
        for (const [i, x] of [130, 305, 480, 655].entries()) {
          const p = projected(map, { x, y: 360 });
          ctx.fillStyle = `rgba(180,83,9,${0.08 + i * 0.035})`;
          ctx.fillRect(
            p.x,
            p.y,
            Math.max(10, (z - 13) * 28),
            Math.max(20, (z - 13) * 42),
          );
        }
      }
      if (layer.routes) {
        ctx.strokeStyle = "rgba(15,118,110,.34)";
        ctx.lineWidth = 1.5;
        for (const v of Object.values(s.vehicles).slice(0, 8)) {
          ctx.beginPath();
          v.route.forEach((point, i) => {
            const p = projected(map, point);
            if (i) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
          });
          ctx.stroke();
        }
      }
      if (
        s.lastRoutePulse !== undefined &&
        s.simSeconds - s.lastRoutePulse < 4
      ) {
        const age = Math.max(0, s.simSeconds - s.lastRoutePulse),
          route = s.vehicles["PM-01"].route;
        ctx.save();
        ctx.strokeStyle = `rgba(15,118,110,${Math.max(0, 0.7 - age * 0.15)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -age * 25;
        ctx.beginPath();
        route.forEach((point, i) => {
          const p = projected(map, point);
          if (i) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.restore();
      }
      if (s.scene === 3 && s.vessels["V-KP"].status === "docking") {
        const berth = projected(map, { x: 355, y: 205 }),
          ship = projected(map, vesselDisplayPosition(s, "V-KP")!);
        ctx.save();
        ctx.strokeStyle = light ? "#16887e" : "#70e8d6";
        ctx.lineWidth = 1.7;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y + 12);
        ctx.lineTo(berth.x, berth.y - 18);
        ctx.stroke();
        ctx.setLineDash([]);
        for (const side of [-1, 1]) {
          const x = berth.x + side * 35;
          ctx.beginPath();
          ctx.moveTo(x - side * 12, berth.y - 24);
          ctx.lineTo(x, berth.y - 24);
          ctx.lineTo(x, berth.y - 7);
          ctx.stroke();
        }
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = light ? "#096d67" : "#a8fff0";
        ctx.fillText("DOCKING GUIDANCE", berth.x - 50, berth.y - 30);
        ctx.restore();
      }
      if (layer.vessels)
        Object.values(s.vessels).forEach((v) => {
          const p = projected(map, vesselDisplayPosition(s, v.id)!),
            next = projected(
              map,
              vesselDisplayPositionAt(s, v.id, s.simSeconds + 0.3)!,
            );
          const moving = Math.hypot(next.x - p.x, next.y - p.y) > 0.05;
          ctx.save();
          ctx.translate(p.x, p.y);
          if (moving) ctx.rotate(Math.atan2(next.y - p.y, next.x - p.x));
          ctx.fillStyle = light ? "#236d78" : "#205669";
          ctx.strokeStyle = light ? "#eafff4" : "#8de7dc";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-23, -6);
          ctx.lineTo(18, -6);
          ctx.lineTo(26, 0);
          ctx.lineTo(18, 6);
          ctx.lineTo(-23, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#c6f8ef";
          ctx.fillRect(-13, -3, 15, 6);
          ctx.restore();
          if (v.id === "V-KP" && s.scene === 3 && s.simSeconds < 121) {
            const tugOffset = 14 + Math.sin(s.simSeconds * 0.8) * 2;
            ctx.save();
            ctx.translate(p.x + 28, p.y + tugOffset);
            ctx.fillStyle = "#e2a25f";
            ctx.fillRect(-7, -4, 14, 8);
            ctx.fillStyle = "#eafff4";
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
            ctx.strokeStyle = light ? "#b07a3e" : "#f4c78a";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(p.x + 8, p.y + 5);
            ctx.lineTo(p.x + 25, p.y + tugOffset);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          if (v.id === "V-KP" && v.status === "berthed") {
            const edge = projected(map, { x: 355, y: 190 });
            ctx.strokeStyle = light ? "#658b82" : "#b2d1bd";
            ctx.lineWidth = 1.2;
            for (const dx of [-14, 14]) {
              ctx.beginPath();
              ctx.moveTo(p.x + dx, p.y + 5);
              ctx.lineTo(edge.x + dx, edge.y);
              ctx.stroke();
            }
          }
          if (z > 14.5) {
            ctx.fillStyle = light ? "#16515a" : "#e4fbf4";
            ctx.font = "12px sans-serif";
            ctx.fillText(v.name, p.x - 32, p.y - 13);
          }
        });
      if (layer.vehicles && !objects3D.current)
        Object.values(s.vehicles).forEach((v, i) => {
          const p = projected(map, drawingPosition(v, i, s.simSeconds)),
            p2 = projected(map, drawingPosition(v, i, s.simSeconds + 0.5));
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p2.y - p.y, p2.x - p.x));
          ctx.fillStyle =
            v.status === "fault"
              ? "#ffaf72"
              : v.assignment === "Berth 2"
                ? "#5ff0d6"
                : "#76c8cd";
          ctx.fillRect(-5, -3, 10, 6);
          ctx.fillStyle = "#F5F6F2";
          ctx.fillRect(1, -2, 2, 4);
          ctx.restore();
        });
      if (layer.workers) {
        const workers = Object.values(s.workers);
        if (z < 15.2 || !canSeeExactWorkerPosition(s.role)) {
          const groups = new Map<
            string,
            { x: number; y: number; n: number; breach: boolean }
          >();
          workers.forEach((w) => {
            const key = w.status === "breach" ? "breach" : w.zoneId;
            const g = groups.get(key) || { x: 0, y: 0, n: 0, breach: false };
            const p = canSeeExactWorkerPosition(s.role)
              ? movingWorkerPosition(s, w.id)
              : workerDisplayPosition(s, w.id)!;
            g.x += p.x;
            g.y += p.y;
            g.n++;
            g.breach ||= w.status === "breach";
            groups.set(key, g);
          });
          for (const g of groups.values()) {
            const p = projected(map, { x: g.x / g.n, y: g.y / g.n });
            ctx.fillStyle = g.breach ? "#ff6f72" : "#51b8ff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(g.n), p.x, p.y + 4);
            ctx.textAlign = "start";
          }
        } else
          workers.forEach((w) => {
            const p = projected(map, movingWorkerPosition(s, w.id)),
              pulse = 7 + Math.sin(stamp / 300 + Number(w.id.slice(2))) * 1.5;
            ctx.strokeStyle = w.status === "breach" ? "#ff6f72" : "#55e2d7";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = w.status === "breach" ? "#ff6f72" : "#5dd7ec";
            ctx.beginPath();
            ctx.arc(p.x, p.y, objects3D.current ? 2.5 : 4.5, 0, Math.PI * 2);
            ctx.fill();
            if (
              z > 18.2 &&
              s.selected?.type === "worker" &&
              s.selected.id === w.id
            ) {
              ctx.font = "bold 11px JetBrains Mono, monospace";
              ctx.fillStyle = light ? "#135d60" : "#c4fff4";
              ctx.fillText(`${w.id} · GPS`, p.x + 11, p.y - 10);
            }
          });
      }
      Object.values(s.cranes).forEach((c) => {
        const p = projected(map, c.position),
          working =
            s.scene === 3 &&
            ["QC-03", "QC-04"].includes(c.id) &&
            c.status === "active";
        const reach = working
          ? 14 + Math.sin(s.simSeconds * 0.65 + (c.id === "QC-04" ? 2 : 0)) * 6
          : 14;
        const size = Math.min(2.1, Math.max(1, (z - 14) * 0.32 + 1));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(size, size);
        ctx.fillStyle = light ? "#396b6b33" : "#020d183d";
        ctx.beginPath();
        ctx.ellipse(2, 11, 23, 4, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle =
          c.status === "hold" ? "#dd5364" : light ? "#247a77" : "#9bd9d5";
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.lineTo(-7, -11);
        ctx.lineTo(reach + 6, -11);
        ctx.lineTo(reach + 6, 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, -11);
        ctx.lineTo(0, -5);
        ctx.lineTo(8, -11);
        ctx.stroke();
        ctx.fillStyle =
          c.status === "hold" ? "#d9515c" : light ? "#487d7d" : "#8dcecb";
        ctx.fillRect(reach - 3, -13, 6, 4);
        const cable = working ? 8 + Math.sin(s.simSeconds * 0.48) * 3 : 7;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(reach, -9);
        ctx.lineTo(reach, cable);
        ctx.stroke();
        ctx.fillStyle = "#e4b77f";
        ctx.fillRect(reach - 4, cable, 8, 4);
        ctx.strokeStyle = light ? "#7f582f" : "#f3c383";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(reach, cable + 4);
        ctx.lineTo(reach, cable + 7);
        ctx.arc(reach - 2, cable + 8, 2.4, 0, Math.PI * 0.9);
        ctx.stroke();
        ctx.restore();
        if (z > 15) {
          ctx.fillStyle = light ? "#1d6565" : "#9bd9d5";
          ctx.font = "11px monospace";
          ctx.fillText(c.id, p.x - 14, p.y + 20);
        }
      });
      Object.values(s.berths).forEach((b) => {
        const p = projected(map, b.position);
        ctx.fillStyle = light ? "#185e63" : "#d8f7f0";
        ctx.font = "bold 13px monospace";
        ctx.fillText(b.id, p.x - 9, p.y + 4);
      });
      for (const alert of s.alerts.filter((a) => a.status !== "resolved")) {
        const p = projected(map, alertDisplayPosition(s, alert)),
          critical = alert.severity === "critical",
          radius = critical ? 12 + Math.sin(stamp / 240) * 2 : 10;
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = critical
          ? "#d94b58"
          : alert.severity === "warning"
            ? "#d98b45"
            : alert.severity === "advisory"
              ? "#b46d34"
              : "#397d9d";
        ctx.fill();
        ctx.strokeStyle = light ? "#fff" : "#0d2831";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", p.x, p.y + 4);
        ctx.restore();
      }
      if (s.selected) {
        const { type, id } = s.selected;
        const p: Position | undefined =
          type === "vessel"
            ? vesselDisplayPosition(s, id)
            : type === "vehicle"
              ? drawingPosition(
                  s.vehicles[id],
                  Object.keys(s.vehicles).indexOf(id),
                  s.simSeconds,
                )
              : type === "worker"
                ? workerDisplayPosition(s, id)
                : type === "container"
                  ? containerDisplayPosition(s, id)
                  : type === "crane"
                    ? s.cranes[id]?.position
                    : s.berths[id]?.position;
        if (p) {
          const q = projected(map, p);
          ctx.strokeStyle = "#5ff0d6";
          ctx.lineWidth = 2;
          ctx.strokeRect(q.x - 14, q.y - 14, 28, 28);
        }
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      map.off("move", invalidate);
    };
  }, [ready]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) {
      setFollowingVehicle(false);
      return;
    }
    const s = usePort.getState();
    const p =
      selected.type === "vessel"
        ? vesselDisplayPosition(s, selected.id)
        : selected.type === "vehicle"
          ? drawingPosition(
              s.vehicles[selected.id],
              Object.keys(s.vehicles).indexOf(selected.id),
              s.simSeconds,
            )
          : selected.type === "worker"
            ? workerDisplayPosition(s, selected.id)
            : selected.type === "container"
              ? containerDisplayPosition(s, selected.id)
              : selected.type === "crane"
                ? s.cranes[selected.id]?.position
                : selected.type === "berth"
                  ? s.berths[selected.id]?.position
                  : undefined;
    if (p)
      map.easeTo({
        center: ll(p),
        offset:
          selected.type === "vehicle" || selected.type === "container"
            ? focusOffset(map)
            : [0, 0],
        zoom:
          selected.type === "vehicle"
            ? Math.max(map.getZoom(), 19.7)
            : selected.type === "container"
              ? Math.max(map.getZoom(), 19.4)
              : selected.type === "worker" && canSeeExactWorkerPosition(s.role)
                ? Math.max(map.getZoom(), 18.6)
                : map.getZoom(),
        duration: 650,
      });
    setFollowingVehicle(selected.type === "vehicle");
  }, [selected, role]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !followingVehicle || selected?.type !== "vehicle")
      return;
    const stop = () => setFollowingVehicle(false);
    const canvas = map.getCanvas();
    map.on("dragstart", stop);
    canvas.addEventListener("wheel", stop, { passive: true });
    const timer = window.setInterval(() => {
      const s = usePort.getState(),
        vehicle = s.vehicles[selected.id];
      if (!vehicle) return;
      const index = Object.keys(s.vehicles).indexOf(selected.id);
      map.easeTo({
        center: ll(drawingPosition(vehicle, index, s.simSeconds)),
        offset: focusOffset(map),
        duration: 550,
      });
    }, 700);
    return () => {
      window.clearInterval(timer);
      map.off("dragstart", stop);
      canvas.removeEventListener("wheel", stop);
    };
  }, [ready, followingVehicle, selected]);
  const matches = query.trim()
    ? (() => {
        const s = usePort.getState(),
          q = query.toLowerCase();
        const all: { label: string; ref: EntityRef }[] = [
          ...Object.values(s.vessels).map((v) => ({
            label: v.name,
            ref: { type: "vessel" as const, id: v.id },
          })),
          ...Object.values(s.vehicles).map((v) => ({
            label: v.id,
            ref: { type: "vehicle" as const, id: v.id },
          })),
          ...Object.values(s.cranes).map((c) => ({
            label: c.id,
            ref: { type: "crane" as const, id: c.id },
          })),
          ...Object.values(s.berths).map((b) => ({
            label: b.id,
            ref: { type: "berth" as const, id: b.id },
          })),
          ...Object.values(s.workers).map((w) => ({
            label: w.id,
            ref: { type: "worker" as const, id: w.id },
          })),
          ...Object.values(s.containers)
            .filter((c) => c.id.toLowerCase().includes(q))
            .slice(0, 5)
            .map((c) => ({
              label: c.id,
              ref: { type: "container" as const, id: c.id },
            })),
        ];
        return all.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 6);
      })()
    : [];
  return (
    <section
      className="map-panel"
      aria-label="Fictional Selat Terminal interactive map"
    >
      <div ref={root} className="map-root" />
      <canvas ref={canvas} className="map-canvas" aria-hidden="true" />
      {mounted && (!ready || error) && (
        <PortMapPreview focus={previewFocus} layers={layers} />
      )}
      <div ref={tooltip} className="map-tooltip" role="status" hidden />
      {yardLocation && (
        <div className="map-location-label" aria-label="Current yard map focus">
          {yardLocation}
        </div>
      )}
      {error && (
        <div className="map-preview-note" role="status">
          {error}{" "}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      <div className="map-toolbar">
        <input
          aria-label="Search map entities"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ID or name"
        />
        {matches.length > 0 && (
          <div className="search-results">
            {matches.map((m) => (
              <button
                key={m.ref.id}
                onClick={() => {
                  select(m.ref);
                  setQuery("");
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        <div className="map-quick-actions">
          <button
            onClick={() => {
              setPreviewFocus("yard");
              mapRef.current?.easeTo({
                center: ll({ x: 540, y: 465 }),
                zoom: 18.5,
                duration: 750,
              });
            }}
          >
            View container yard
          </button>
          <button
            onClick={() => {
              setPreviewFocus("overview");
              mapRef.current?.easeTo({
                center: ll({ x: 500, y: 350 }),
                zoom: 15.25,
                pitch: 28,
                bearing: -9,
                duration: 750,
              });
            }}
          >
            Overview
          </button>
        </div>
        {selected?.type === "vehicle" && (
          <button
            className="map-follow-button"
            aria-pressed={followingVehicle}
            onClick={() => {
              setFollowingVehicle((v) => !v);
              if (!followingVehicle) {
                const map = mapRef.current,
                  s = usePort.getState(),
                  vehicle = s.vehicles[selected.id];
                if (map && vehicle) {
                  const index = Object.keys(s.vehicles).indexOf(selected.id);
                  map.easeTo({
                    center: ll(drawingPosition(vehicle, index, s.simSeconds)),
                    offset: focusOffset(map),
                    zoom: Math.max(map.getZoom(), 19.7),
                    duration: 600,
                  });
                }
              }
            }}
          >
            {followingVehicle
              ? "Following vehicle · click to stop"
              : "Follow selected vehicle"}
          </button>
        )}
      </div>
      <button
        className="map-layers-toggle"
        type="button"
        aria-expanded={layersOpen}
        aria-controls="map-layer-options"
        onClick={() => setLayersOpen((open) => !open)}
      >
        Layers
      </button>
      {layersOpen && (
        <div id="map-layer-options" className="map-layers">
          <strong>MAP LAYERS</strong>
          {LAYERS.map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={layers[k]}
                onChange={(e) =>
                  setLayers((l) => ({ ...l, [k]: e.target.checked }))
                }
              />
              {k}
            </label>
          ))}
        </div>
      )}
      <div className="map-caption">
        <span>SELAT TERMINAL · FICTIONAL GEOMETRY</span>
        <span>SCENE {scene} / 6</span>
        <span>
          {ready && !error ? (
            <>
              <output ref={fps} aria-label="Map canvas frame rate">
                MAP — FPS
              </output>{" "}
              · SCROLL TO ZOOM · DRAG TO PAN
            </>
          ) : error ? (
            "2D PREVIEW · INTERACTIVE GRAPHICS UNAVAILABLE"
          ) : (
            "2D PREVIEW · LOADING INTERACTIVE MAP"
          )}
        </span>
      </div>
    </section>
  );
}
