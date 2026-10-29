import { describe, expect, it } from "vitest";
import { createSeed } from "@/simulation/seed";
import {
  pointInPolygon,
  pathPosition,
  vehiclePosition,
  workerPosition,
  containerDisplayPosition,
} from "@/simulation/geometry";
import {
  advanceStage,
  applySafetyRule,
  approveProposal,
  enterScene,
  tick,
} from "@/simulation/engine";
import { answerPrompt, PROMPTS } from "@/components/copilot/prompts";
import { canSeeExactWorkerPosition } from "@/lib/permissions";
import {
  CONTAINER_MODEL_SCALE,
  YARD_BAY_PITCH,
} from "@/simulation/map-visuals";

describe("deterministic terminal simulation", () => {
  it("starts with the same normalized population and IDs", () => {
    const a = createSeed(),
      b = createSeed();
    expect(a).toEqual(b);
    expect(Object.keys(a.containers)).toHaveLength(2000);
    expect(Object.keys(a.vehicles)).toHaveLength(40);
    expect(Object.keys(a.workers)).toHaveLength(60);
    expect(Object.keys(a.cranes)).toHaveLength(14);
  });
  it("stores every container in its labeled yard block with five tiers", () => {
    const containers = Object.values(createSeed().containers);
    for (const [index, block] of ["A", "B", "C", "D"].entries()) {
      const group = containers.filter((container) => container.block === block);
      expect(group).toHaveLength(500);
      expect(new Set(group.map((container) => container.tier))).toEqual(
        new Set([1, 2, 3, 4, 5]),
      );
      for (const container of group) {
        expect(container.position.x).toBeGreaterThanOrEqual(125 + index * 175);
        expect(container.position.x).toBeLessThanOrEqual(273 + index * 175);
        expect(container.position.y).toBeGreaterThanOrEqual(345);
        expect(container.position.y).toBeLessThanOrEqual(585);
      }
    }
  });
  it("keeps loaded containers linked to one vehicle and leaves empty trailers unloaded", () => {
    const s = createSeed(),
      loaded = Object.values(s.vehicles).filter(
        (vehicle) => vehicle.containerId,
      );
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded.length).toBeLessThan(40);
    expect(new Set(loaded.map((vehicle) => vehicle.containerId)).size).toBe(
      loaded.length,
    );
    for (const vehicle of loaded) {
      const container = s.containers[vehicle.containerId!];
      expect(container.status).toBe("moving");
      expect(container.size).toBe("40ft");
      expect(container.tier).toBe(5);
      expect(container.hold).toBe(false);
      expect(containerDisplayPosition(s, container.id)).toEqual(
        vehiclePosition(
          vehicle,
          Object.keys(s.vehicles).indexOf(vehicle.id),
          s.simSeconds,
        ),
      );
    }
    expect(s.vehicles["PM-01"].containerId).toBeTruthy();
    expect(s.vehicles["PM-02"].containerId).toBeUndefined();
    const stackSizes = new Map<string, Set<string>>();
    for (const container of Object.values(s.containers)) {
      const slot = `${container.block}-${container.row}-${container.bay}`;
      const sizes = stackSizes.get(slot) ?? new Set<string>();
      sizes.add(container.size);
      stackSizes.set(slot, sizes);
    }
    expect([...stackSizes.values()].every((sizes) => sizes.size === 1)).toBe(
      true,
    );
  });
  it("spaces the enlarged five-tier container stacks without overlap", () => {
    const slots = Object.values(createSeed().containers).filter(
      (container) => container.tier === 1,
    );
    expect(YARD_BAY_PITCH).toBeGreaterThan(12.2 * CONTAINER_MODEL_SCALE);
    for (const [index, a] of slots.entries())
      for (const b of slots.slice(index + 1)) {
        if (a.block !== b.block) continue;
        const halfLength =
          ((a.size === "40ft" ? 12.2 : 6.1) * CONTAINER_MODEL_SCALE) / 2 +
          ((b.size === "40ft" ? 12.2 : 6.1) * CONTAINER_MODEL_SCALE) / 2;
        const overlap =
          Math.abs(a.position.x - b.position.x) < halfLength &&
          Math.abs(a.position.y - b.position.y) < 2.44 * CONTAINER_MODEL_SCALE;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
  });
  it("keeps every vehicle route clear of stored containers, including the recovery route", () => {
    const initial = createSeed(),
      recovery = approveProposal(enterScene(5), "PR-RECOVER", "presenter");
    const routes = [
      ...new Map(
        [
          ...Object.values(initial.vehicles),
          ...Object.values(recovery.vehicles),
        ].map((vehicle) => [JSON.stringify(vehicle.route), vehicle.route]),
      ).values(),
    ];
    const stored = Object.values(initial.containers).filter(
      (container) => container.status !== "moving",
    );
    for (const route of routes)
      for (let step = 0; step <= 500; step++) {
        const p = pathPosition(route, step / 500);
        const collision = stored.find(
          (container) =>
            Math.abs(p.x - container.position.x) <
              (container.size === "40ft" ? 6.1 : 3.05) * CONTAINER_MODEL_SCALE +
                5.5 &&
            Math.abs(p.y - container.position.y) <
              1.22 * CONTAINER_MODEL_SCALE + 5.5,
        );
        expect(
          collision?.id,
          `Route crosses ${collision?.id} near ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`,
        ).toBeUndefined();
      }
  });
  it("moves fictional GPS worker fixes along walkways while keeping scripted breaches stationary", () => {
    const s = createSeed(),
      worker = s.workers["W-001"];
    expect(worker.gpsTrackerId).toBe("GPS-W-001");
    expect(workerPosition(worker, 0)).not.toEqual(workerPosition(worker, 12));
    expect(worker.route.every((point) => point.y === 318)).toBe(true);
    const breach = enterScene(4).workers["W-005"];
    expect(workerPosition(breach, 180)).toEqual({ x: 395, y: 268 });
  });
  it("detects a point inside an active exclusion and holds the crane", () => {
    const a = createSeed();
    a.workers["W-005"].position = { x: 395, y: 268 };
    const b = applySafetyRule(a, "W-005");
    expect(pointInPolygon({ x: 395, y: 268 }, a.zones["EX-3"].polygon)).toBe(
      true,
    );
    expect(b.cranes["QC-03"].status).toBe("hold");
    expect(b.alerts.some((x) => x.severity === "critical")).toBe(true);
    expect(b.incidents).toHaveLength(1);
    expect(b.events.map((x) => x.type)).toContain("ZONE_BREACH");
  });
  it("requires a pending proposal and makes approval idempotent", () => {
    const a = enterScene(5),
      b = approveProposal(a, "PR-RECOVER", "presenter"),
      c = approveProposal(b, "PR-RECOVER", "presenter");
    expect(a.vessels["V-OG"].delayMinutes).toBe(24);
    expect(b.vessels["V-OG"].delayMinutes).toBe(13);
    expect(b.vehicles["PM-01"].assignment).toBe("Berth 2");
    expect(b.cranes["QC-03"].status).toBe("hold");
    expect(c).toEqual(b);
  });
  it("replays scene entry and scales fixed steps", () => {
    expect(enterScene(4)).toEqual(enterScene(4));
    const a = createSeed();
    expect(tick({ ...a, speed: 5 }, 10).simSeconds).toBe(5);
    expect(tick({ ...a, paused: true }, 10)).toEqual({ ...a, paused: true });
  });
  it("keeps energy move totals aligned with the control move counter", () => {
    const a = createSeed(),
      b = tick(a, 240);
    expect(b.energy.totalMoves).toBe(b.moves);
    expect(b.energy.electricMoves).toBeLessThanOrEqual(b.energy.totalMoves);
  });
  it("keeps the queue effect of each gate release across simulation ticks", () => {
    const initial = createSeed();
    const release = {
      id: "GATE-1",
      type: "GATE_UPDATE" as const,
      at: "2026-10-28T00:00:00Z",
      actor: "presenter" as const,
      detail: "Four trucks released",
    };
    const once = tick({ ...initial, events: [release] }, 10);
    const twice = tick(
      { ...initial, events: [release, { ...release, id: "GATE-2" }] },
      10,
    );
    expect(twice.gate.queue).toBe(once.gate.queue - 4);
  });
  it("completes docking only after the scene reaches the berth", () => {
    const a = enterScene(3),
      b = tick(a, 150),
      c = tick(b, 20);
    expect(a.vessels["V-KP"].status).toBe("docking");
    expect(b.berths.B2.status).toBe("reserved");
    expect(c.vessels["V-KP"].status).toBe("berthed");
    expect(c.events.filter((e) => e.type === "DOCK_COMPLETE")).toHaveLength(1);
  });
  it("enforces demo action scope in state transitions", () => {
    const a = enterScene(5, "shipping_agent");
    expect(approveProposal(a, "PR-RECOVER", "shipping_agent")).toEqual(a);
    expect(
      approveProposal(a, "PR-RECOVER", "duty_manager").vessels["V-OG"]
        .delayMinutes,
    ).toBe(13);
  });
  it("redacts precise worker position in standard demo roles", () => {
    expect(canSeeExactWorkerPosition("presenter")).toBe(false);
    expect(canSeeExactWorkerPosition("hse_officer")).toBe(false);
    expect(canSeeExactWorkerPosition("supervisor")).toBe(true);
  });
  it("answers twelve supported intentions from current state", () => {
    const s = enterScene(5);
    for (const prompt of PROMPTS) {
      const answer = answerPrompt(prompt, s);
      expect(answer.text).not.toContain("I don't have that information");
      expect(answer.confidence).toBeTruthy();
    }
    expect(answerPrompt("What is the weather tomorrow?", s).text).toContain(
      "don't have",
    );
  });
  it("keeps approvals and audit events through a continuous six-scene run", () => {
    let s = advanceStage(advanceStage(enterScene(1)));
    expect(s.scene).toBe(3);
    s = tick(s, 170);
    s = advanceStage(s);
    expect(s.cranes["QC-03"].status).toBe("hold");
    s = approveProposal(s, "PR-SAFE", "presenter");
    s = advanceStage(s);
    s = approveProposal(s, "PR-RECOVER", "presenter");
    s = advanceStage(s);
    expect(s.scene).toBe(6);
    expect(s.vessels["V-OG"].delayMinutes).toBe(13);
    expect(s.events.filter((e) => e.type === "PROPOSAL_APPROVED")).toHaveLength(
      2,
    );
    expect(s.incidents).toHaveLength(1);
  });
});
