"use client";
import { X, Bot } from "lucide-react";
import { usePort } from "@/store/use-port";
import { useShallow } from "zustand/react/shallow";
import { canSeeExactWorkerPosition } from "@/lib/permissions";
import { workerPosition } from "@/simulation/geometry";
import { isoAt } from "@/simulation/seed";

function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="inspect-row">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}
export function Inspector({ onAsk }: { onAsk: () => void }) {
  const s = usePort(
      useShallow((state) => ({
        selected: state.selected,
        select: state.select,
        role: state.role,
        vessels: state.vessels,
        vehicles: state.vehicles,
        workers: state.workers,
        containers: state.containers,
        cranes: state.cranes,
        berths: state.berths,
        zones: state.zones,
        simSeconds:
          state.selected?.type === "worker" ? Math.floor(state.simSeconds) : 0,
      })),
    ),
    ref = s.selected;
  if (!ref) return null;
  const close = () => s.select(undefined);
  let title = ref.id,
    body: React.ReactNode = null;
  if (ref.type === "vessel") {
    const x = s.vessels[ref.id];
    if (!x) return null;
    title = x.name;
    body = (
      <>
        <Row label="Type" value={x.type} />
        <Row label="Fictional IMO" value={x.imo} />
        <Row label="Route" value={`${x.origin} → ${x.destination}`} />
        <Row label="ETA" value={x.eta.slice(11, 16) + " UTC"} />
        <Row label="ATA" value={x.ata ? x.ata.slice(11, 16) + " UTC" : "—"} />
        <Row label="Berth" value={x.berthId} />
        <Row label="Status" value={x.status} />
        <Row
          label="Predicted delay"
          value={`${x.delayMinutes} min · simulated`}
        />
        <Row label="Discharge / load" value={`${x.discharge} / ${x.load}`} />
        <Row label="Maritime clearance" value={x.clearance} />
      </>
    );
  }
  if (ref.type === "vehicle") {
    const x = s.vehicles[ref.id];
    if (!x) return null;
    const load = x.containerId ? s.containers[x.containerId] : undefined;
    title = x.id;
    body = (
      <>
        <Row label="Type" value={x.type} />
        <Row
          label="Mode"
          value={x.type === "AGV" ? "Autonomous" : "Human operated"}
        />
        <Row label="Assignment" value={x.assignment} />
        <Row label="Task" value={x.task} />
        <Row
          label="Speed"
          value={`${x.status === "active" ? x.speedKph : 0} km/h`}
        />
        <Row label="Battery" value={x.battery ? `${x.battery}%` : "Diesel"} />
        <Row label="Status" value={x.status} />
        <Row label="Load" value={load ? "Carrying container" : "Empty"} />
        {load && (
          <>
            <div className="inspect-section-title">
              CARRYING CONTAINER · SIMULATED
            </div>
            <Row label="Container ID" value={load.id} />
            <Row label="Size / type" value={`${load.size} / ${load.type}`} />
            <Row label="Vessel" value={s.vessels[load.vesselId]?.name} />
            <Row
              label="Origin yard slot"
              value={`${load.block} / R${load.row} B${load.bay} T${load.tier}`}
            />
            <Row label="Cargo status" value={load.status} />
            <button
              className="button inspect-related"
              onClick={() => s.select({ type: "container", id: load.id })}
            >
              Open container record
            </button>
          </>
        )}
      </>
    );
  }
  if (ref.type === "worker") {
    const x = s.workers[ref.id];
    if (!x) return null;
    const precise = canSeeExactWorkerPosition(s.role),
      position = workerPosition(x, s.simSeconds);
    title = x.name;
    body = (
      <>
        <Row label="Demo ID" value={x.id} />
        <Row label="Role" value={x.role} />
        <Row label="Employer" value={x.employer} />
        <Row label="Contractor" value={x.contractor ? "Yes" : "No"} />
        <Row label="Shift" value={x.shift} />
        <Row label="Task" value={x.task} />
        <Row label="Zone" value={x.zoneId} />
        <Row label="Safety" value={x.status} />
        <Row label="Certificate expiry" value={x.certificateExpiry} />
        <div className="inspect-section-title">GPS TRACKER · SIMULATED</div>
        <Row
          label="Tracker"
          value={precise ? x.gpsTrackerId : "Active · zone-level view"}
        />
        <Row
          label="Last fix"
          value={`${isoAt(s.simSeconds).slice(11, 19)} UTC · simulated`}
        />
        <Row
          label="Position"
          value={
            precise
              ? `${position.x.toFixed(1)}, ${position.y.toFixed(1)} · fictional`
              : "Zone level only · demo privacy"
          }
        />
      </>
    );
  }
  if (ref.type === "container") {
    const x = s.containers[ref.id];
    if (!x) return null;
    const carrier = Object.values(s.vehicles).find(
      (v) => v.containerId === x.id,
    );
    title = x.id;
    body = (
      <>
        <Row label="Size / type" value={`${x.size} / ${x.type}`} />
        <Row label="Vessel" value={s.vessels[x.vesselId]?.name} />
        <Row
          label={carrier ? "Origin yard slot" : "Yard slot"}
          value={`${x.block} / R${x.row} B${x.bay} T${x.tier}`}
        />
        <Row label="Status" value={x.status} />
        {carrier && (
          <>
            <Row label="Current location" value={`On ${carrier.id}`} />
            <button
              className="button inspect-related"
              onClick={() => s.select({ type: "vehicle", id: carrier.id })}
            >
              Open vehicle record
            </button>
          </>
        )}
        <Row
          label="Last move"
          value={x.lastMove.slice(0, 16).replace("T", " ") + " UTC"}
        />
        <Row label="Hold" value={x.hold ? "Yes" : "No"} />
      </>
    );
  }
  if (ref.type === "crane") {
    const x = s.cranes[ref.id];
    if (!x) return null;
    title = x.label;
    body = (
      <>
        <Row label="ID" value={x.id} />
        <Row label="Type" value={x.type} />
        <Row label="Status" value={x.status} />
        <Row label="Moves / hour" value={x.movesPerHour} />
        <Row label="Next job" value={x.nextJob} />
        <Row label="Certificate expiry" value={x.certificateExpiry} />
        <Row
          label="Exclusion rule"
          value={
            x.exclusionZoneId
              ? `${x.exclusionZoneId} · ${s.zones[x.exclusionZoneId].active ? "active" : "inactive"}`
              : "None"
          }
        />
      </>
    );
  }
  if (ref.type === "berth") {
    const x = s.berths[ref.id];
    if (!x) return null;
    title = x.label;
    body = (
      <>
        <Row label="Status" value={x.status} />
        <Row
          label="Occupant"
          value={x.occupantId ? s.vessels[x.occupantId]?.name : "None"}
        />
        <Row label="Cranes" value={x.craneIds.join(", ")} />
      </>
    );
  }
  return (
    <aside className="inspector drawer" aria-label={`${ref.type} inspector`}>
      <div className="drawer-head">
        <div>
          <span className="eyebrow">
            {ref.type.toUpperCase()} INSPECTOR · SIMULATED DATA
          </span>
          <h2>{title}</h2>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close inspector"
        >
          <X size={20} />
        </button>
      </div>
      <div className="inspect-body">
        {body}
        <button className="button teal-button" onClick={onAsk}>
          <Bot size={16} /> Ask copilot
        </button>
      </div>
    </aside>
  );
}
