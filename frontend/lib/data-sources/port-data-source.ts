import type { EventBatch, PortSnapshot, SnapshotEnvelope } from "@/lib/contracts/domain";
import { createSeed } from "@/simulation/seed";
import { apiFetch } from "@/lib/api/api-fetch";

export class PortContractError extends Error {}

export interface PortDataSource {
  getSnapshot(terminalId: string): Promise<SnapshotEnvelope>;
  approveProposal(terminalId: string, proposalId: string, idempotencyKey: string): Promise<SnapshotEnvelope>;
}

export function isPortSnapshot(value: unknown): value is PortSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.terminalId !== "string" || !Number.isSafeInteger(snapshot.sequence)) return false;
  for (const key of ["vessels", "berths", "cranes", "vehicles", "workers", "containers", "zones"])
    if (!snapshot[key] || typeof snapshot[key] !== "object" || Array.isArray(snapshot[key])) return false;
  for (const key of ["alerts", "proposals", "incidents", "events"])
    if (!Array.isArray(snapshot[key])) return false;
  return true;
}

export function assertSnapshotEnvelope(value: unknown, terminalId: string): SnapshotEnvelope {
  if (!value || typeof value !== "object") throw new PortContractError("Invalid snapshot envelope");
  const envelope = value as Record<string, unknown>;
  if (!Number.isSafeInteger(envelope.sequence) || Number(envelope.sequence) < 0 ||
      typeof envelope.generatedAt !== "string" || !Number.isFinite(Date.parse(envelope.generatedAt)) ||
      !isPortSnapshot(envelope.snapshot) || envelope.snapshot.terminalId !== terminalId ||
      envelope.snapshot.sequence !== envelope.sequence)
    throw new PortContractError("Snapshot sequence or terminal does not match the requested contract");
  return envelope as SnapshotEnvelope;
}

export function assertEventBatch(value: unknown, after: number): EventBatch {
  if (!Number.isSafeInteger(after) || after < 0 || !value || typeof value !== "object")
    throw new PortContractError("Invalid event cursor or response");
  const batch = value as Record<string, unknown>;
  if (!Array.isArray(batch.events) || !Number.isSafeInteger(batch.nextSequence))
    throw new PortContractError("Invalid event batch");
  let expected = after;
  for (const event of batch.events) {
    expected += 1;
    if (!event || typeof event !== "object" || event.sequence !== expected)
      throw new PortContractError(`Event sequence gap after ${expected - 1}; refresh the snapshot`);
  }
  if (batch.nextSequence !== expected)
    throw new PortContractError("Event cursor does not match the delivered events; refresh the snapshot");
  return batch as EventBatch;
}

export class SimulationPortDataSource implements PortDataSource {
  async getSnapshot(terminalId: string): Promise<SnapshotEnvelope> {
    const snapshot = createSeed();
    if (terminalId !== snapshot.terminalId) throw new PortContractError("Unknown fictional terminal");
    return { sequence: snapshot.sequence, snapshot, generatedAt: new Date().toISOString() };
  }
  async approveProposal(): Promise<SnapshotEnvelope> {
    throw new Error("Use the simulation store's human approval action in demo mode");
  }
}

export class ApiPortDataSource implements PortDataSource {
  async getSnapshot(terminalId: string) {
    const reply = await apiFetch<unknown>(`terminals/${encodeURIComponent(terminalId)}/snapshot/`);
    return assertSnapshotEnvelope(reply, terminalId);
  }
  async getEvents(terminalId: string, after: number) {
    const reply = await apiFetch<unknown>(`terminals/${encodeURIComponent(terminalId)}/events/?after=${after}`);
    return assertEventBatch(reply, after);
  }
  async approveProposal(terminalId: string, proposalId: string, idempotencyKey: string) {
    if (!idempotencyKey.trim()) throw new PortContractError("An idempotency key is required for approval");
    const reply = await apiFetch<unknown>(`terminals/${encodeURIComponent(terminalId)}/proposals/${encodeURIComponent(proposalId)}/approve/`, {
      method: "POST", headers: { "Idempotency-Key": idempotencyKey },
    });
    return assertSnapshotEnvelope(reply, terminalId);
  }
}

export const portDataSource: PortDataSource = process.env.NEXT_PUBLIC_PORT_COMMAND_MODE === "api"
  ? new ApiPortDataSource() : new SimulationPortDataSource();
