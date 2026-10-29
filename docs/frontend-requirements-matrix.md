# Frontend requirements matrix

Source keys: **A** = `doc/system_architecture.md`; **P** = `doc/Port Command Prototype Specification.pdf`; **M** = `doc/Port Command Pitch Document for MMC Ports.pdf`; **I** = `doc/CODEX_PORT_COMMAND_FULL_FRONTEND_DOCKER_MASTER_PROMPT.md`. The four originals are preserved under `doc/`.

Status uses **Implemented** for code that exists, **Verified** only for a check actually observed, **Partial** for a limited implementation, and **Open** for work not yet completed.

| Requirement | Source | Implementation | Verification | Status |
|---|---|---|---|---|
| One isolated seven-service Compose stack, one host port | I §1A; A §4 | `compose.yaml`, `deploy/nginx/default.conf` | `docker compose config --quiet`, `docker compose ps` | Verified |
| Container-only Node/Python dependency installation, locks and volumes | I §1A | Dockerfiles, `package-lock.json`, `backend/requirements.lock`, Compose volumes | Image builds, working tree scan | Verified |
| Health-only Django/DRF with PostgreSQL/Redis/Celery | I §1A; A §6, §11 | `backend/core/` | `manage.py check`, migrations, `/healthz/`, service health | Verified |
| App Router, TypeScript, Tailwind, local fonts and icons | I §2; A §3.2 | `frontend/app/`, `package.json`, `globals.css` | Typecheck, browser assets | Verified |
| Shared portal shell, role switch, clock, badge, rail, status strip | P pp. 5–6; I §6 | `components/layout/AppShell.tsx` | Desktop and phone browser checks; keyboard help focus test | Verified in container browser |
| Ten navigable portal routes over one state | P pp. 5–6; M pp. 3–4; I §5 | `app/(protected)/`, `components/portals/PortalViews.tsx` | Route E2E and manual browser review | Verified |
| Decision-led non-Control portal presentation with state-derived facts | Current user request | `PortalViews.tsx`, `app/portal-presentation.css`, `AppShell.tsx` | Yard/Safety/Audit/Gate interaction and phone-width browser checks; desktop visual review | Verified in simulation; figures are fictional |
| Fictional local circuit-board map with pan/zoom | P pp. 3–4, 6–8; I §7 | `components/map/PortMap.tsx`, local worker | Chrome map render, browser pan/zoom E2E | Verified; geometry is illustrative |
| Visible map when WebGL is unavailable or still starting | Current user screenshot and request | `PortMapPreview.tsx`, `PortMap.tsx`, `PortDiorama.tsx` | Browser test with WebGL disabled verifies vessels, 400 occupied storage slots, 40 vehicles, yard focus and inset preview | Verified in container browser |
| Modeled 3D vehicles and visible container storage yards | Current user request | `components/map/PortMap3DLayer.ts`, `simulation/seed.ts`, yard/overview controls; detailed cabs/trailers, shadows, yard position labels and crane hooks | Four yard blocks and five-tier population unit test; custom layer, close following focus and inspector browser tests; updated visual captures | Verified in container browser; procedural models are illustrative |
| Truck routes avoid container stacks; vehicle and cargo dimensions align | Current user request | `simulation/seed.ts`, `simulation/geometry.ts`, `PortMap3DLayer.ts`, `PortMap.tsx` | Sampled route footprint clearance across base and recovery routes; carried/stored 40-foot boxes use equal world dimensions; updated loaded/empty screenshots | Verified in simulation; real-world CAD fidelity is outside prototype scope |
| Loaded vehicles expose linked container details; empty vehicles omit cargo | Current user request | `Vehicle.containerId`, `Container.status`, `Inspector.tsx`, 3D cargo instances | Unit one-to-one cargo state; browser truck click, loaded/empty inspector test | Verified |
| Moving workers with fictional GPS trackers and privacy scope | Current user request; P p. 7 | `Worker.route`, `gpsTrackerId`, 3D worker figures, inspector | Unit path/breach test; browser supervisor GPS movement and standard redaction | Verified in client demo only |
| Modern 3D terminal model and animated transitions | Current user request | `components/scene/PortDiorama.tsx`, `app/modern-theme.css` | Landing/control screenshots, browser 3D toggle | Verified in container browser |
| One persistent dark/light switch across interface and map | Current user request | `components/theme/ThemeSwitch.tsx`, `app/light-theme.css`, `PortMap.tsx` | Light screenshots, E2E route and reload persistence | Verified in container browser |
| Berths B1–B4, 6 quay and 8 yard cranes | P pp. 1, 11–12; I §7–8 | `simulation/seed.ts` | Unit population test | Verified |
| 3 vessels, 40 vehicles, 60 workers, 2,000 containers | P pp. 1, 8, 11–12; I §8 | `simulation/seed.ts` | Unit population and yard placement tests; 2,000 instanced containers, no 2,000 DOM nodes | Verified |
| Animated coherent routes and full scene motion | P pp. 4, 8–9, 12; I §7–9 | `simulation/geometry.ts`, `PortMap.tsx`, `PortMap3DLayer.ts` | Browser visual review, recovery route and worker movement tests | Partial: vehicle and worker paths are deterministic illustrative routes |
| Zone breach rule and crane safety hold | P pp. 8–9, 12; I §8–9 | `simulation/engine.ts` | Unit point-in-polygon/hold test | Verified |
| Deterministic reset, scene jumps, pause and 1×/2×/5× | P pp. 8–9, 12; I §8–9 | `store/use-port.ts`, `AppShell.tsx` | Unit replay/scaling; browser keyboard | Verified |
| Six stage scenes including group scale | P pp. 8–9; M p. 7; I §9 | `simulation/engine.ts`, `AppShell.tsx` | Browser scene jump and automatic progression E2E | Verified; visual choreography remains illustrative |
| Human approval, dismissal, modification request, idempotent decision | P pp. 9–11; I §8, §10 | `engine.ts`, `Copilot.tsx` | Unit approval test; browser flow | Verified approval; other branches implemented |
| 12 scripted, grounded copilot intents | P pp. 10–11; I §10 | `components/copilot/prompts.ts`, `Copilot.tsx` | Unit and all-prompt browser test | Verified |
| Vessel/vehicle/worker/container/crane/berth inspectors | P pp. 7–8; I §7 | `components/layout/Inspector.tsx` | Six-type search and inspector browser test; loaded/empty and worker GPS checks | Verified |
| Safety incidents, roster, certificate watch | P pp. 5–6; M p. 6; I §5 | `SafetyView` | Scene 4 + portal inspection | Implemented |
| Five named MMC sea ports; Selat kept separate | M pp. 1–2; P p. 9; I §5 | `GroupView` | Group tile browser review | Implemented |
| No invented Penang 2025 TEU figure | M p. 2; I §5 | `GroupView` | Text inspection | Verified |
| Berth timeline replan with confirm/revert | P p. 6; I §5 | `BerthsView`, `replanBerth()` | Browser select-and-confirm test; drag remains available | Verified in container browser |
| Yard heat, dispatch and two mover proposal | P p. 6; I §5, §9 | `YardView`, `approveProposal()` | Unit approval test | Implemented |
| Gate queue and throughput interaction | P p. 6; I §5 | `GateView`, `updateGate()`, `tick()` | Browser role restriction, two-release flow and explanatory message tests; queue unit test | Verified in container browser |
| Mock audit PDF with clear disclaimer | P p. 6; I §5, §11 | `AuditView`, local jsPDF | Browser download filename | Verified |
| Electric fleet energy and battery distribution | P p. 6; M p. 6; I §5 | `EnergyView` | Portal review; distribution derived from vehicle records | Implemented |
| Controlled low-severity cyber test and resolution | P p. 6; I §5 | `CyberView`, `injectCyberTest()` | Browser role restriction and explanatory message test | Verified role restriction; test injection implemented |
| Agent-scoped shipping line records | P p. 6; I §5 | `ShippingView` | Portal review | Implemented, client demo scope only |
| Standard worker zone-level privacy | P p. 7; M pp. 6–7; I §5, §11 | `permissions.ts`, map, inspector | Unit role test; browser role switch | Verified in client demo only |
| Simulation/API split and no fake successful API | I §3, §11–12; A §7–9 | `AppShell.tsx`, `lib/data-sources/`, BFF routes | API mode smoke and snapshot/event contract tests | Partial: API views intentionally unavailable; source contracts absent |
| Secure future BFF cookie/CSRF/refresh seam | A §7–9, §12; I §3 | `app/gateway/`, `lib/api/` | Typecheck; future Django integration tests | Partial: backend endpoints absent |
| Offline browser run, no external runtime assets | P pp. 1, 15–16; I §11, §14 | Local fonts, worker, geometry, fixtures | Browser request inventory across all ten portals | Partial: no external requests observed; physical disconnect unverified |
| 60 FPS on presenting laptop at full population | P pp. 1, 8, 16; I §7, §14 | Canvas renderer, instanced 3D objects, FPS readout and optional 3D inset | Earlier desktop Chrome 59–60 FPS sample predates new 3D map; software-rendered capture 3–18 FPS | Partial: new layer needs a presenting-laptop GPU and projector rehearsal |
| 1920×1080 and 1366×768 control room fit | P pp. 1, 16; I §6, §14 | Responsive CSS | Chromium viewport tests; no page overflow; map height >250px | Verified in container browser |
| Final screen recording backup | M p. 8; P p. 16 | `scripts/record-stage-demo.mjs`, `docs/port-command-stage-backup.webm` | Browser script completed; WebM metadata duration 314.68 s | Existing backup predates new 3D map objects; regenerate before stage use |

This matrix treats the project documents as requirements and reference material. Their implementation directions do not override a later explicit user request.
