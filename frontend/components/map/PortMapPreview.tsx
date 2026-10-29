"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePort } from "@/store/use-port";
import { canSeeExactWorkerPosition } from "@/lib/permissions";
import { vehiclePosition, workerPosition } from "@/simulation/geometry";

type Props = {
  focus: "overview" | "yard";
  layers: {
    vessels: boolean;
    vehicles: boolean;
    workers: boolean;
    containers: boolean;
    zones: boolean;
    heat: boolean;
    routes: boolean;
  };
};

export function PortMapPreview({ focus, layers }: Props) {
  const s = usePort(
    useShallow((state) => ({
      containers: state.containers,
      cranes: state.cranes,
      role: state.role,
      select: state.select,
      simSeconds: Math.floor(state.simSeconds),
      vehicles: state.vehicles,
      vessels: state.vessels,
      workers: state.workers,
      zones: state.zones,
    })),
  );
  const containers = s.containers;
  const stacks = useMemo(() => {
    const slots = new Map<string, (typeof containers)[string]>();
    for (const container of Object.values(containers)) {
      if (container.status === "moving") continue;
      const key = `${container.block}-${container.row}-${container.bay}`;
      if (!slots.has(key)) slots.set(key, container);
    }
    return [...slots.values()];
  }, [containers]);
  const vehicles = Object.values(s.vehicles);

  return (
    <div className="map-preview" data-testid="map-preview">
      <svg
        viewBox={focus === "yard" ? "95 300 760 330" : "0 0 1000 700"}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Two-dimensional preview of Selat Terminal with vessels, cranes, container yards and vehicles"
      >
        <rect width="1000" height="700" fill="#092b3c" />
        <path
          d="M0 230H1000V700H0Z"
          fill="#193c47"
          stroke="#5d8990"
          strokeWidth="3"
        />
        <path
          d="M0 308H1000M0 620H1000M105 330H825M105 610H825"
          className="preview-road"
        />
        {[0, 1, 2, 3].map((index) => (
          <g key={index}>
            <rect
              x={85 + index * 190}
              y="182"
              width="155"
              height="72"
              className="preview-berth"
            />
            <text x={95 + index * 190} y="218" className="preview-label">
              B{index + 1}
            </text>
            <rect
              x={125 + index * 175}
              y="345"
              width="148"
              height="240"
              className="preview-yard"
            />
            <text x={133 + index * 175} y="365" className="preview-label">
              YARD {"ABCD"[index]}
            </text>
          </g>
        ))}
        <rect
          x="845"
          y="365"
          width="120"
          height="115"
          className="preview-building"
        />
        <rect
          x="845"
          y="535"
          width="120"
          height="82"
          className="preview-building"
        />
        {layers.routes &&
          vehicles
            .slice(0, 4)
            .map((vehicle) => (
              <polyline
                key={vehicle.id}
                points={vehicle.route.map((p) => `${p.x},${p.y}`).join(" ")}
                className="preview-route"
              />
            ))}
        {layers.zones &&
          Object.values(s.zones)
            .filter((zone) => zone.kind === "exclusion" && zone.active)
            .map((zone) => (
              <polygon
                key={zone.id}
                points={zone.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                className="preview-zone"
              />
            ))}
        {layers.containers &&
          stacks.map((container) => (
            <rect
              key={`${container.block}-${container.row}-${container.bay}`}
              x={container.position.x - 6}
              y={container.position.y - 3}
              width={container.size === "40ft" ? 12 : 8}
              height="6"
              rx="1"
              className={
                container.hold ? "preview-stack hold" : "preview-stack"
              }
            />
          ))}
        {Object.values(s.cranes).map((crane) => (
          <g
            key={crane.id}
            className="preview-crane"
            transform={`translate(${crane.position.x} ${crane.position.y})`}
          >
            <path d="M-9 0L-6 -19H6L9 0M-13 -15H15M1 -19V7" />
            <circle cy="7" r="2" />
          </g>
        ))}
        {layers.workers &&
          canSeeExactWorkerPosition(s.role) &&
          Object.values(s.workers).map((worker) => {
            const p = workerPosition(worker, s.simSeconds);
            return (
              <circle
                key={worker.id}
                cx={p.x}
                cy={p.y}
                r="2"
                className="preview-worker"
              />
            );
          })}
        {layers.vehicles &&
          vehicles.map((vehicle, index) => {
            const p = vehiclePosition(vehicle, index, s.simSeconds);
            return (
              <g
                key={vehicle.id}
                className="preview-vehicle"
                transform={`translate(${p.x} ${p.y})`}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${vehicle.id}`}
                onClick={() => s.select({ type: "vehicle", id: vehicle.id })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    s.select({ type: "vehicle", id: vehicle.id });
                }}
              >
                <rect x="-5" y="-3" width="10" height="6" rx="1" />
                <circle cx="-3" cy="4" r="1.2" />
                <circle cx="3" cy="4" r="1.2" />
                <title>
                  {vehicle.id} · {vehicle.status}
                </title>
              </g>
            );
          })}
        {layers.vessels &&
          Object.values(s.vessels).map((vessel) => (
            <g
              key={vessel.id}
              className="preview-vessel"
              transform={`translate(${vessel.position.x} ${vessel.position.y})`}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${vessel.name}`}
              onClick={() => s.select({ type: "vessel", id: vessel.id })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  s.select({ type: "vessel", id: vessel.id });
              }}
            >
              <path d="M-25 -9H17L27 0L17 9H-25Z" />
              <rect x="-9" y="-5" width="15" height="10" />
              <title>
                {vessel.name} · {vessel.status}
              </title>
            </g>
          ))}
      </svg>
      <span className="map-preview-badge">2D PORT PREVIEW</span>
    </div>
  );
}
