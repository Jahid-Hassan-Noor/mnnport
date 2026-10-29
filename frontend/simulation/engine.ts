import type {
  Alert,
  AuditEvent,
  AuditEventType,
  PortSnapshot,
  Proposal,
  Role,
} from "@/lib/contracts/domain";
import { pointInPolygon } from "./geometry";
import { createSeed, isoAt } from "./seed";
import { canPerform } from "@/lib/permissions";

function event(
  s: PortSnapshot,
  type: AuditEventType,
  detail: string,
  actor: Role | "simulation_rule" = "simulation_rule",
  ruleTag?: string,
): AuditEvent {
  return {
    id: `EV-${String(s.sequence + 1).padStart(4, "0")}`,
    type,
    detail,
    actor,
    at: isoAt(s.simSeconds),
    ruleTag,
  };
}
function append(
  s: PortSnapshot,
  type: AuditEventType,
  detail: string,
  actor: Role | "simulation_rule" = "simulation_rule",
  ruleTag?: string,
): PortSnapshot {
  return {
    ...s,
    sequence: s.sequence + 1,
    events: [...s.events, event(s, type, detail, actor, ruleTag)],
  };
}
function proposal(s: PortSnapshot, kind: Proposal["kind"]): Proposal {
  return kind === "safe_lane"
    ? {
        id: "PR-SAFE",
        title: "Route contractor via marked safe lane",
        reason:
          "Crane 3 exclusion zone breach requires a route change. The crane hold stays active until cleared by a supervisor.",
        expectedEffect: "Remove pedestrian exposure; crane remains held",
        confidence: "High · rule based",
        evidence: ["W-005 inside EX-3", "QC-03 held by ZONE_BREACH rule"],
        kind,
        status: "pending",
        createdAt: isoAt(s.simSeconds),
      }
    : {
        id: "PR-RECOVER",
        title: "Reallocate two prime movers and swap crane coverage",
        reason:
          "Berth 2 has a Crane 3 hold and two unavailable prime movers. Move PM-01 and PM-02 from Yard C to Berth 2 and use Crane 4 for available work.",
        expectedEffect: "Orient Gale delay 24 → 13 min (illustrative)",
        confidence: "Medium · deterministic scenario",
        evidence: [
          "QC-03 hold event",
          "PM-01 and PM-02 at Yard C",
          "Orient Gale delay 24 min",
        ],
        kind,
        status: "pending",
        createdAt: isoAt(s.simSeconds),
      };
}
export function createProposal(
  s: PortSnapshot,
  kind: Proposal["kind"],
): PortSnapshot {
  if (s.proposals.some((p) => p.kind === kind)) return s;
  const next = { ...s, proposals: [...s.proposals, proposal(s, kind)] };
  return append(next, "PROPOSAL_CREATED", `${kind} proposal created`);
}
export function applySafetyRule(
  s: PortSnapshot,
  workerId: string,
): PortSnapshot {
  const worker = s.workers[workerId];
  if (!worker) return s;
  const breached = Object.values(s.zones).find(
    (z) =>
      z.kind === "exclusion" &&
      z.active &&
      pointInPolygon(worker.position, z.polygon),
  );
  if (
    !breached ||
    s.incidents.some((i) => i.workerId === workerId && i.zoneId === breached.id)
  )
    return s;
  const craneId = breached.craneId!;
  let next: PortSnapshot = {
    ...s,
    workers: { ...s.workers, [workerId]: { ...worker, status: "breach" } },
    cranes: {
      ...s.cranes,
      [craneId]: { ...s.cranes[craneId], status: "hold", movesPerHour: 0 },
    },
    incidents: [
      ...s.incidents,
      {
        id: "INC-001",
        title: "Crane exclusion zone breach",
        severity: "critical",
        at: isoAt(s.simSeconds),
        workerId,
        zoneId: breached.id,
        evidence: [
          `${workerId} position within ${breached.id}`,
          `${craneId} automatically held`,
        ],
        ruleTag: "OSH-ZONE-01",
        status: "open",
      },
    ],
    alerts: [
      ...s.alerts,
      {
        id: "AL-BREACH",
        severity: "critical",
        title: "Worker inside Crane 3 exclusion zone",
        detail: "Crane 3 automatically held. Supervisor response required.",
        entity: { type: "worker", id: workerId },
        position: worker.position,
        at: isoAt(s.simSeconds),
        status: "open",
        ruleTag: "OSH-ZONE-01",
      } as Alert,
    ],
  };
  next = append(
    next,
    "ZONE_BREACH",
    `${workerId} entered ${breached.id}`,
    "simulation_rule",
    "OSH-ZONE-01",
  );
  next = append(
    next,
    "CRANE_HOLD",
    `${craneId} placed on hold`,
    "simulation_rule",
    "OSH-ZONE-01",
  );
  return createProposal(next, "safe_lane");
}
export function enterScene(
  scene: number,
  role: Role = "presenter",
): PortSnapshot {
  let s = {
    ...createSeed(),
    scene,
    role,
    simSeconds: [0, 60, 105, 150, 195, 240][scene - 1] ?? 0,
  };
  if (scene === 2)
    s = { ...s, selected: { type: "vessel" as const, id: "V-OG" } };
  if (scene >= 3) {
    s = {
      ...s,
      vessels: {
        ...s.vessels,
        "V-KP": {
          ...s.vessels["V-KP"],
          status: scene === 3 ? "docking" : "berthed",
          ata: scene === 3 ? undefined : isoAt(s.simSeconds),
          position: { x: 355, y: 145 },
        },
      },
      berths: {
        ...s.berths,
        B2: {
          ...s.berths.B2,
          status: scene === 3 ? "reserved" : "occupied",
          occupantId: scene === 3 ? undefined : "V-KP",
        },
      },
    };
    s = append(s, "VESSEL_ARRIVE", "Kedah Pearl entered pilotage");
    s = append(s, "DOCK_START", "Kedah Pearl docking at B2");
    if (scene > 3) s = append(s, "DOCK_COMPLETE", "Kedah Pearl moored at B2");
  }
  if (scene >= 4) {
    s = {
      ...s,
      workers: {
        ...s.workers,
        "W-005": {
          ...s.workers["W-005"],
          position: { x: 395, y: 268 },
          zoneId: "EX-3",
        },
      },
    };
    s = applySafetyRule(s, "W-005");
  }
  if (scene >= 5) s = createProposal(s, "recover_delay");
  return s;
}
export function advanceStage(s: PortSnapshot): PortSnapshot {
  if (s.scene >= 6) return s;
  const scene = s.scene + 1;
  let next: PortSnapshot = {
    ...s,
    scene,
    simSeconds: [0, 60, 105, 150, 195, 240][scene - 1],
    selected: undefined,
  };
  if (scene === 2) return { ...next, selected: { type: "vessel", id: "V-OG" } };
  if (scene === 3) {
    next = {
      ...next,
      vessels: {
        ...next.vessels,
        "V-KP": { ...next.vessels["V-KP"], status: "docking" },
      },
      berths: { ...next.berths, B2: { ...next.berths.B2, status: "reserved" } },
    };
    next = append(next, "VESSEL_ARRIVE", "Kedah Pearl entered pilotage");
    return append(next, "DOCK_START", "Kedah Pearl docking at B2");
  }
  if (scene === 4) {
    next = {
      ...next,
      workers: {
        ...next.workers,
        "W-005": {
          ...next.workers["W-005"],
          position: { x: 395, y: 268 },
          zoneId: "EX-3",
        },
      },
    };
    return applySafetyRule(next, "W-005");
  }
  if (scene === 5) return createProposal(next, "recover_delay");
  return next;
}
export function tick(s: PortSnapshot, steps = 1): PortSnapshot {
  if (s.paused) return s;
  const seconds = s.simSeconds + (steps * s.speed) / 10;
  const completedMoves =
    Math.floor(seconds / 12) - Math.floor(s.simSeconds / 12);
  const releasedBatches = s.events.filter(
    (e) => e.type === "GATE_UPDATE",
  ).length;
  const queue =
    18 + Math.floor(5 * Math.sin(seconds / 45)) - releasedBatches * 4;
  let next = {
    ...s,
    simSeconds: seconds,
    moves: s.moves + completedMoves,
    gate: { ...s.gate, queue: Math.max(2, queue) },
    energy: {
      ...s.energy,
      kwhToday: s.energy.kwhToday + completedMoves * 1.8,
      electricMoves: s.energy.electricMoves + Math.max(0, completedMoves),
      totalMoves: s.energy.totalMoves + completedMoves,
    },
  };
  if (
    next.scene === 3 &&
    next.simSeconds >= 121 &&
    next.vessels["V-KP"].status === "docking"
  ) {
    next = {
      ...next,
      vessels: {
        ...next.vessels,
        "V-KP": {
          ...next.vessels["V-KP"],
          status: "berthed",
          ata: isoAt(next.simSeconds),
        },
      },
      berths: {
        ...next.berths,
        B2: { ...next.berths.B2, status: "occupied", occupantId: "V-KP" },
      },
    };
    return append(next, "DOCK_COMPLETE", "Kedah Pearl moored at B2");
  }
  return next;
}
export function approveProposal(
  s: PortSnapshot,
  id: string,
  actor: Role,
): PortSnapshot {
  const found = s.proposals.find((p) => p.id === id);
  if (
    !found ||
    found.status !== "pending" ||
    !canPerform(
      actor,
      found.kind === "safe_lane" ? "approve_safe_lane" : "approve_recovery",
    )
  )
    return s;
  let next: PortSnapshot = {
    ...s,
    proposals: s.proposals.map((p) =>
      p.id === id
        ? { ...p, status: "approved", decidedAt: isoAt(s.simSeconds), actor }
        : p,
    ),
  };
  if (found.kind === "safe_lane") {
    next = {
      ...next,
      workers: {
        ...next.workers,
        "W-005": {
          ...next.workers["W-005"],
          position: { x: 395, y: 320 },
          route: [
            { x: 395, y: 320 },
            { x: 435, y: 320 },
            { x: 395, y: 320 },
          ],
          zoneId: "WALK-1",
          status: "safe",
        },
      },
    };
    next = append(
      next,
      "ROUTE_CHANGE",
      "Contractor moved to marked walkway; QC-03 remains held",
      actor,
      "OSH-ZONE-01",
    );
  } else {
    const vehicles = { ...next.vehicles };
    for (const vehicleId of ["PM-01", "PM-02"])
      vehicles[vehicleId] = {
        ...vehicles[vehicleId],
        assignment: "Berth 2",
        task: "Berth 2 recovery cycles",
        route: [
          { x: 636, y: 610 },
          { x: 636, y: 330 },
          { x: 461, y: 330 },
          { x: 461, y: 610 },
          { x: 636, y: 610 },
        ],
      };
    next = {
      ...next,
      vehicles,
      vessels: {
        ...next.vessels,
        "V-OG": { ...next.vessels["V-OG"], delayMinutes: 13 },
      },
      cranes: {
        ...next.cranes,
        "QC-04": {
          ...next.cranes["QC-04"],
          nextJob: "Berth 2 recovery coverage",
        },
      },
      lastRoutePulse: next.simSeconds,
    };
    next = append(
      next,
      "ROUTE_CHANGE",
      "PM-01 and PM-02 reassigned from Yard C to Berth 2; QC-04 covers available work",
      actor,
    );
  }
  return append(
    next,
    "PROPOSAL_APPROVED",
    `${found.title} approved by ${actor}`,
    actor,
  );
}
export function dismissProposal(
  s: PortSnapshot,
  id: string,
  actor: Role,
): PortSnapshot {
  const found = s.proposals.find((p) => p.id === id);
  if (!found || found.status !== "pending") return s;
  return append(
    {
      ...s,
      proposals: s.proposals.map((p) =>
        p.id === id
          ? { ...p, status: "dismissed", decidedAt: isoAt(s.simSeconds), actor }
          : p,
      ),
    },
    "PROPOSAL_DISMISSED",
    `${found.title} dismissed by ${actor}`,
    actor,
  );
}
export function requestModification(
  s: PortSnapshot,
  id: string,
  note: string,
  actor: Role,
): PortSnapshot {
  const found = s.proposals.find((p) => p.id === id);
  if (!found || found.status !== "pending" || !note.trim()) return s;
  return append(
    s,
    "PROPOSAL_MODIFIED",
    `${id} modification requested: ${note.trim().slice(0, 240)}`,
    actor,
  );
}
export function replanBerth(
  s: PortSnapshot,
  vesselId: string,
  berthId: string,
  actor: Role,
): PortSnapshot {
  const vessel = s.vessels[vesselId],
    berth = s.berths[berthId];
  if (
    !vessel ||
    !berth ||
    !canPerform(actor, "replan_berth") ||
    (berth.occupantId && berth.occupantId !== vesselId)
  )
    return s;
  const oldBerth = vessel.berthId;
  const berths = { ...s.berths };
  if (
    oldBerth &&
    oldBerth !== berthId &&
    berths[oldBerth].occupantId === vesselId
  )
    berths[oldBerth] = {
      ...berths[oldBerth],
      occupantId: undefined,
      status: "available",
    };
  berths[berthId] = { ...berth, occupantId: vesselId, status: "occupied" };
  return append(
    {
      ...s,
      berths,
      vessels: {
        ...s.vessels,
        [vesselId]: {
          ...vessel,
          berthId,
          position: { x: berth.position.x, y: 145 },
        },
      },
    },
    "BERTH_REPLAN",
    `${vessel.name} reassigned to ${berthId}`,
    actor,
  );
}
export function resolveAlert(
  s: PortSnapshot,
  id: string,
  actor: Role,
): PortSnapshot {
  const found = s.alerts.find((a) => a.id === id);
  if (!found || found.status === "resolved") return s;
  return append(
    {
      ...s,
      alerts: s.alerts.map((a) =>
        a.id === id ? { ...a, status: "resolved" } : a,
      ),
    },
    "ALERT_RESOLVED",
    `${id} resolved`,
    actor,
    found.ruleTag,
  );
}
export function injectCyberTest(s: PortSnapshot, actor: Role): PortSnapshot {
  if (!canPerform(actor, "inject_cyber_test")) return s;
  if (s.alerts.some((a) => a.id === "AL-CYBER" && a.status !== "resolved"))
    return s;
  const alert: Alert = {
    id: "AL-CYBER",
    severity: "info",
    title: "Controlled OT test event",
    detail: "Fictional gateway heartbeat check injected for demonstration.",
    at: isoAt(s.simSeconds),
    status: "open",
    position: { x: 690, y: 585 },
    ruleTag: "CYBER-TEST-01",
  };
  return append(
    { ...s, alerts: [...s.alerts.filter((a) => a.id !== "AL-CYBER"), alert] },
    "CYBER_TEST",
    "Controlled low-severity OT event injected",
    actor,
    "CYBER-TEST-01",
  );
}
