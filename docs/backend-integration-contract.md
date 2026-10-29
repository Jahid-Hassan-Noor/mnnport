# Future backend integration contract

The current Django service implements **only** `GET /healthz/`. All routes below are proposed. No production auth, port data, AI, external integration or approval persistence is claimed. As of 28 October 2026, no TOS, AIS, equipment or worker badge system contracts have been supplied. The shapes here are internal frontend expectations, subject to reconciliation with actual source schemas and security requirements.

## Identity and policy

Future `auth_app` owns `POST /auth/login/`, `GET /auth/me/`, `POST /auth/refresh/`, logout and JWT rotation. BFF cookies are `httpOnly`, `SameSite=Lax`, `Secure` under HTTPS. Mutations require same-origin checks and a double-submit CSRF header. The BFF strips token fields from browser replies. Django must own role, organization, terminal and object-level permissions. The frontend's demo role switcher is UX only.

Suggested backend app ownership: `auth_app`, `admin_app`, `notifications_package`, `terminal_app`, `vessel_app`, `yard_app`, `workforce_app`, `safety_app`, `gate_app`, `compliance_app`, `energy_app`, `cyber_app`, `shipping_app`, `copilot_app`. None of these port domain apps is implemented in this phase.

## State hydration and event order

`GET /terminals/{terminal_id}/snapshot/` returns `{ "sequence": 1042, "generatedAt": "2026-10-28T00:00:00Z", "snapshot": { ... } }`. IDs are stable strings such as `V-KP`, `QC-03`, and `SLTU1000000`. A snapshot contains normalized records by ID for vessels, berths, cranes, vehicles, workers, containers and zones, plus alerts, proposals, incidents, energy, gate and aggregate counters. All timestamps are UTC ISO-8601; Malaysia time is a display conversion only.

`GET /terminals/{terminal_id}/events/?after=1042` returns `{ "events": [{ "sequence": 1043, ... }], "nextSequence": 1043 }`. Every event carries an increasing sequence, UTC timestamp, actor, entity references and optional rule tag. The frontend adapter now checks sequence continuity and rejects a gap or cursor mismatch before applying any event. A sequence gap, terminal switch, expired session or reconnect requires an authoritative snapshot refresh. A future authenticated SSE/WebSocket feed may replace polling; the sequencing rule stays the same. Incremental domain patches are still unbound because no real backend schema exists. No fake live connection is present now.

## Endpoints and envelopes

Proposed list routes: `/terminals/`, `/vessels/`, `/berths/`, `/equipment/`, `/workers/`, `/containers/`, `/zones/`, `/alerts/`, `/proposals/`, `/incidents/`, `/audits/`, `/energy/`, `/gate/`, `/ports/group-summary/`, and scoped `/shipping-line/...`. List envelopes use `{ "count": 100, "next": "opaque-cursor", "results": [...] }`; query parameters may include `terminal`, `search`, `status`, `sort`, `cursor` and `limit`. Sort keys must be allowlisted server-side.

Errors use `{ "error": { "code": "FORBIDDEN_SCOPE", "message": "Access denied", "requestId": "...", "details": {} } }` with correct HTTP status. `401` means a missing/expired session, `403` means denied role or scope, `409` means invalid state transition or stale sequence, and `503` means unavailable infrastructure. A shipping-line account must never receive other operators' vessels or containers. Worker precise locations must be omitted from DTOs unless the authenticated role and purpose allow them.

`POST /proposals/{id}/approve/` and `/dismiss/` require `Idempotency-Key` and optional `If-Match` sequence. They must transactionally validate status, authorization, safety interlocks and affected entity versions, write approval and audit records, then return an authoritative updated snapshot or event sequence. The frontend must await that response before displaying success. There must be no optimistic safety or equipment action. Other mutations (alerts, berth replan, gate release) follow the same pattern.

The current `ApiPortDataSource` validates a matching terminal and sequence in snapshot and approval replies, requires an idempotency key for approval, and rejects event gaps. API mode remains an unavailable state in the UI until identity, server-side role scope, event application and mutation endpoints can be tested against a real Django domain service. Simulation state is never presented as an API reply.

## Representative JSON fragments

```json
{
  "vessel": {"id":"V-KP","name":"MV Kedah Pearl","status":"berthed","berthId":"B2","eta":"2026-10-28T01:45:00Z","delayMinutes":0},
  "berth": {"id":"B2","status":"occupied","occupantId":"V-KP","craneIds":["QC-03","QC-04"]},
  "equipment": {"id":"QC-03","type":"quay","status":"hold","movesPerHour":0,"certificateExpiry":"2027-08-31"},
  "worker": {"id":"W-005","zoneId":"EX-3","status":"breach"},
  "alert": {"id":"AL-BREACH","severity":"critical","status":"open","ruleTag":"OSH-ZONE-01"},
  "proposal": {"id":"PR-RECOVER","kind":"recover_delay","status":"pending","expectedEffect":"24 to 13 min (illustrative)"},
  "gate": {"queue":18,"laneCapacity":4,"throughputPerHour":74},
  "energy": {"kwhToday":2140,"electricMoves":182,"totalMoves":286}
}
```

The JSON above is a proposed shape using fictional values, not a backend response.

## OpenAPI integration checklist

- Publish protected OpenAPI descriptions for actual auth, snapshot, event and domain routes.
- Validate every frontend DTO against generated backend types and schema tests.
- Verify cursor pagination, sequence gap recovery, 403 scope behavior and idempotent mutation replies.
- Replace simulation store reads in portal components with `PortDataSource` hydration and authoritative event application after source schemas and permission behavior are agreed.
- Test token rotation, logout, CSRF, same-origin BFF behavior and server-side worker redaction over HTTPS.
