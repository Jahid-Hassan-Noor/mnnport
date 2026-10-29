import { describe, expect, it } from "vitest";
import { createSeed } from "@/simulation/seed";
import { assertEventBatch, assertSnapshotEnvelope, PortContractError } from "@/lib/data-sources/port-data-source";

describe("future backend reply boundary", () => {
  it("accepts only a matching authoritative snapshot", () => {
    const snapshot = createSeed();
    const reply = { sequence: snapshot.sequence, generatedAt: "2026-10-28T00:00:00Z", snapshot };
    expect(assertSnapshotEnvelope(reply, "selat-terminal")).toBe(reply);
    expect(() => assertSnapshotEnvelope(reply, "another-terminal")).toThrow(PortContractError);
    expect(() => assertSnapshotEnvelope({ ...reply, sequence: 5 }, "selat-terminal")).toThrow(PortContractError);
    expect(() => assertSnapshotEnvelope({ ...reply, snapshot: { ...snapshot, workers: [] } }, "selat-terminal")).toThrow(PortContractError);
  });

  it("rejects gaps and cursor mismatches before event application", () => {
    const event = { id: "EV-8", sequence: 8, type: "VESSEL_ARRIVE", at: "2026-10-28T00:00:00Z", actor: "simulation_rule", detail: "Demo" };
    expect(assertEventBatch({ events: [event], nextSequence: 8 }, 7).nextSequence).toBe(8);
    expect(() => assertEventBatch({ events: [{ ...event, sequence: 9 }], nextSequence: 9 }, 7)).toThrow(/gap/);
    expect(() => assertEventBatch({ events: [event], nextSequence: 10 }, 7)).toThrow(/cursor/);
  });
});
