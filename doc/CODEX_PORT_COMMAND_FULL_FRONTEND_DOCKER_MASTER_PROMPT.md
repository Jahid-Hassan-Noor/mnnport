# CODEX MASTER IMPLEMENTATION PROMPT — PORT COMMAND FULL FRONTEND + SINGLE DOCKER COMPOSE STACK

**Execution goal:** Implement the **entire**, functioning Port Command frontend and the minimal, runnable backend/infrastructure scaffold, entirely containerized. This is an implementation job, not a proposal. The full frontend must work independently in deterministic simulation mode now, and be designed for a future Django/DRF production backend. **Never install Node.js, npm packages, Python, pip packages, Postgres, Redis, browsers or development modules into the host macOS environment.** Only the Docker Engine/Desktop, Docker Compose and the Codex tool/extension are assumed on the host.

You are acting as the lead frontend architect, senior Next.js/TypeScript engineer, geospatial UI developer, motion/simulation engineer, UX designer, and QA engineer. IMPLEMENT THE APPLICATION IN THE WORKING REPOSITORY. Do not merely propose a design, generate a directory tree, or deliver a plan. Write the code, run it, test it, fix errors, and document the result.

## 0. READ THE PROJECT SOURCES BEFORE EDITING

The repository root must contain:
- `docs/system_architecture.md` — **primary technology, architecture, security, and repository contract**.
- `docs/Port Command Prototype Specification.pdf` — **primary functional, interactive, visual, scene, and offline-demo contract**.
- `docs/Port Command Pitch Document for MMC Ports.pdf` — **product positioning, operational terminology, five-port context, stage sequence, and claims boundaries**.

Read ALL THREE documents carefully and create `docs/frontend-requirements-matrix.md` showing every important requirement, source document/page or section, implementation location, verification method, and status. Where documents differ: use `system_architecture.md` for the Next.js/Django system design; use the prototype specification for product visuals, simulation, behaviors, and priorities; use the pitch for product wording and the stage narrative. **Additional explicit user constraint overrides all local-dev suggestions: use Docker-only dependencies and ONE isolated Compose stack.** In particular, **use Next.js App Router, NOT Vite**, even though Vite is mentioned as an acceptable prototype option. This phase permits only a minimal, healthy Django/DRF project scaffold and its Docker dependencies; **do not implement port domain databases, operational endpoints, AI backend, or production authentication yet**.

Inspect the existing repository and `AGENTS.md` if present; preserve useful work. If files are missing, clearly record the missing source and proceed using the requirements given here. Do not invent unseen specifications. Do not overwrite non-generated user files without reason.

## 1. MISSION AND DEFINITION OF DONE

Build a fully runnable, polished, high-fidelity **Port Command** frontend: an AI-assisted, multi-role port-operations decision layer for a fictional demonstration terminal, **Selat Terminal**, with an illustrative MMC five-port group view. It is NOT a terminal operating system, crane controller, real port deployment, or verified compliance platform.

The result must be:
1. A COMPLETE, interactive Next.js site and protected-app-style interface, not static mockup screens or a landing page alone.
2. A compelling OFFLINE 1920x1080 browser demo, also usable at 1366x768, with a deterministic running port, real zoom/pan/inspect interactions, six replayable demo scenes, simulated incidents, AI answers, approvals and log entries.
3. An architecture-compatible frontend for a LATER Django REST Framework operational backend: swap a data-source adapter and configure environment variables rather than rewrite React pages. A minimal Django service must already be available in Compose but must NOT be misrepresented as a finished API.
4. Ten working navigable portals sharing one authoritative simulated state, plus the cross-portal AI copilot.
5. Well-structured, typed, tested, accessible, secure-by-design code with no hardcoded secrets, no invented production connections, and no unimplemented buttons masquerading as features.

Create the Docker Compose foundation and minimum backend health scaffold first, then focus all product implementation work on the frontend. If complex, implement in milestones but CONTINUE through all milestones unless a real blocker occurs. Do not end after scaffolding.


## 1A. ABSOLUTE DOCKER-ONLY DEVELOPMENT REQUIREMENTS

The developer's Mac already has a SEPARATE Docker Compose group named `ums` (containing containers such as `ums_frontend`, `ums_backend`, `ums_nginx`, `ums_postgresql`, `ums_redis` and Celery services). **NEVER modify, restart, stop, remove, prune, inspect secrets from, or reuse volumes/networks/configs/ports of that UMS project.** This is a NEW, isolated Port Command application. Do not reuse the `ums` name.

Build all runtime services under **one** `compose.yaml`, with `name: port-command` (or an equivalent explicit `COMPOSE_PROJECT_NAME=port-command`). These SEVEN services must be present and start with a single `docker compose up --build -d`:

| Compose service | Responsibility | Required |
| --- | --- | --- |
| `frontend` | Node.js + Next.js App Router + React + TS, all frontend dependencies | Yes |
| `backend` | Python + minimal Django + DRF + JWT/DRF-related packages installed, health endpoint only for now | Yes |
| `postgresql` | PostgreSQL durable relational database for future Django features | Yes |
| `redis` | Redis for Django/Celery, cache and broker | Yes |
| `celery_worker` | Celery worker using the backend image | Yes |
| `celery_beat` | Celery beat scheduler using the backend image | Yes |
| `nginx` | ONE development entry point, reverse proxy for frontend and future API | Yes |

An extra service under `profiles: [test]` for Playwright/E2E or migration maintenance is ALLOWED, but every service remains in this **same compose project**, not a second stack.

**Host Mac policy (strict):**
- Do not execute host `npm`, `npx`, `pnpm`, `yarn`, `node`, `pip`, `pip3`, `python`, `django-admin`, `celery`, `pytest`, `playwright`, `apt`, `brew` or other language dependency installers. Do not instruct the user to install those on macOS.
- Every dependency install/upgrade occurs during Docker builds or via `docker compose run --rm ...` **inside** the appropriate container. Docker Desktop/Engine, Docker Compose, a text editor, and Codex itself may be present on the host.
- All documented instructions must be commands of the form `docker compose ...`, `docker ...`, or ordinary filesystem/git commands (`mkdir`, `cp`, `git`, `cat`). The user must never need `cd frontend && npm install` on macOS.
- Keep `node_modules`, `.next`, venv/site packages, Celery schedule files, PostgreSQL data and Redis persistence **inside image layers or Docker-managed volumes**, not on the Mac's project working tree.
- Build with multi-stage or clean Dockerfiles as appropriate, maintain `.dockerignore`, and use an npm lockfile plus pinned/resolved backend requirements. Do not use uncontrolled `npm install` on each frontend startup.
- Source code MAY bind mount into the container for hot reload. Exclude/override `node_modules` and `.next` with Docker managed volumes; avoid host native module binary mismatch. Make hot reload reliable on Docker Desktop (use polling only if needed).
- One host port: `127.0.0.1:8088:80` on **Nginx only**. `frontend:3000`, `backend:8000`, PostgreSQL `5432` and Redis `6379` are **internal container ports**, not bound to the Mac by default. Do NOT steal existing UMS host ports 80 or 3001. The browser URL is `http://localhost:8088`.
- Give the Compose project its own non-external, isolated default network and named persistent volumes (e.g., `port_command_pgdata`, `port_command_redisdata`, `port_command_frontend_node_modules`, `port_command_frontend_next`, and Celery beat state if needed). Never share UMS volumes.
- Use service names for internal URLs, e.g. `http://backend:8000`, `postgresql:5432`, `redis:6379`, **not** `localhost` inside inter-container connection strings.
- Never commit `.env`, real secrets or database files. Create `.env.example` and any required dev `.env` locally from template (with visibly non-production placeholder credentials). Ensure Django secret key, database credentials and secrets are injected from environment and are never in frontend-public vars. Expose only `NEXT_PUBLIC_...` nonsecret settings.
- Configure container restarts, sensible resource usage and truthful per-service health checks. Use `depends_on: condition: service_healthy` where supported for PostgreSQL, Redis and dependency readiness. Avoid relying on start order alone.
- Use `init: true`, graceful signal handling, correct nonroot users where feasible, logs via `docker compose logs`, and a documented restart/down lifecycle.
- `docker compose down` must not remove data by default; only an explicitly documented opt-in `docker compose down -v` may delete this project's volumes. Never call `docker system prune -a` or other global cleanup.
- Produce Dockerfiles for frontend and backend plus a secure minimal Nginx configuration, a Compose validation check, `.dockerignore`, and host-free commands in README.

### Recommended version policy — stable AND compatible

Choose **current stable releases that are mutually compatible at implementation time, excluding alpha, beta, RC, canary and nightly releases**. As of 2026-10-28, use the following as *verified starting families/versions*, but verify image availability and dependency compatibility **from inside containers** and record final resolved versions in `docs/dependency-versions.md`:

- Next.js 16.4.3 stable and its compatible stable React, React DOM, TypeScript, Tailwind and MapLibre versions. No `next@canary`; lock exact versions in `package-lock.json`, then use `npm ci` in Docker.
- Node 24 LTS container as the compatibility-first baseline; Node 26 may be selected instead only when all installed dependencies, Next.js build and E2E tests pass. Never use Node 27 alpha.
- Django 6.1.2 stable (or a newer GA patch published at execution time); Python 3.14 slim as the conservative fully supported pairing. Python 3.15 may be chosen only if the installed Django patch and all essential packages officially support it. No Django development snapshots.
- PostgreSQL 18 (latest stable patch, e.g. 18.6 on this date). PostgreSQL 19 is an RC on this date, not GA: DO NOT use a prerelease image.
- Redis 8.10 stable patch (8.10.3 current on this date), or newer GA supported at execution. Use official supported image tags, preferably Alpine/slim when appropriate and verified available.
- Nginx **stable branch** 1.30 (e.g. 1.30.6 stable security patch on this date), not its mainline branch just to increase the number.
- Celery, Django REST Framework, SimpleJWT, drf-spectacular, psycopg, django-cors-headers, django-cleanup, Pillow, ReportLab and Python libraries: choose latest *compatible stable* releases; lock and note exceptions rather than blindly use `latest`.

**Reproducibility beats novelty:** pin image patch tags or digests once verified, lock JavaScript and Python package dependencies, include a reproducible `docker compose build --pull` update procedure in docs, and explain any compatibility pin. Do not pull mutable, automatically upgrading runtime images for every stage demonstration.

### Docker networking and startup behavior

Expected topology:

```text
Browser on Mac -> http://localhost:8088 -> nginx container
                                        -> frontend:3000 (Next.js pages, assets, /gateway/session, /gateway/backend)
frontend Next.js server --only in API mode--> backend:8000 (private DRF HTTP)
backend -> postgresql:5432
backend / celery_worker / celery_beat -> redis:6379
```

- Nginx must correctly proxy Next.js assets, WebSocket upgrade needed for dev hot refresh and same-origin `/gateway/*` back to Next.js. If `/api/*` is exposed for future Django endpoints, explicitly document it and keep it protected; the simulated frontend should not depend on it.
- Django baseline must boot cleanly, connect to PostgreSQL, configure Redis/Celery, expose a minimal internal `GET /healthz/` readiness route and optionally serve a protected or disabled API schema stub. No fake data pretending to be persisted in Django. Do not implement real product endpoints, sessions, approvals, business logic, port records, or JWT issuers in this first frontend stage.
- The default mode is simulation. It must function even if `backend`, PostgreSQL or Redis are stopped **after** the frontend and reverse proxy are running; demonstrate that no runtime HTTP requests to Django are required. The 7-service stack still builds and starts by default for consistency.
- Use a safe `/gateway` BFF contract for FUTURE API mode but return informative 503/unavailable behavior if backend auth/domain endpoints do not exist. No successful dummy auth replies in API mode.
- The stage demonstration must work with **internet disconnected after image build**: containers already downloaded, all fonts/tiles/scripts locally served, no remote images or third-party JS. Make an explicit offline smoke test and document conditions (Docker images must already be present).

### Exact documented commands (these and no host language tool commands)

```bash
# Run from project root after source files and .env are ready
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 -f frontend nginx
# Open http://localhost:8088

# Verify FRONTEND entirely inside the container
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run typecheck
docker compose exec -T frontend npm run test -- --run
# Build should be performed within an appropriate build/test container stage;
# avoid corrupting a live Next.js development .next directory.
docker compose run --rm --no-deps frontend npm run build

# Verify Django is available (no product backend features expected yet)
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py showmigrations

# Inspect status and stop only THIS project
docker compose ps
docker compose down
```

If a test command needs a special Docker build stage or Playwright browser image, create it within this same Compose file (`profiles: [test]`) and document the accurate invocation. **Test these commands** rather than copying them without verification. Prefer `docker compose run --rm ...` for independent build/test jobs that should not interfere with hot-reload.

### Strict acceptance criteria for Docker

1. From a Mac with Docker + Compose (and no Node/Python/npm/pip installed), `docker compose up --build -d` starts seven named Port Command services and exposes `http://localhost:8088`.
2. All seven services are healthy/running or, if health checks intentionally differ, logs truthfully explain status.
3. The UMS stack remains unchanged and accessible on its own configured ports.
4. No host `node_modules`, `.next`, `.venv` or `__pycache__` is required for startup; no host language-install commands.
5. Database state persists after `docker compose down` + `up`; frontend source hot-reloads; offline stage works with built images.
6. Container-only frontend lint, TypeScript check, tests and build pass; Django `manage.py check` and migrations check pass.
7. Docker Compose config validates; Nginx correctly serves all frontend routes and `/gateway` paths.
8. API mode clearly reports that the domain API is not implemented; simulation mode remains fully functional.

---

## 2. TECHNOLOGY AND TOOLING CONTRACT

Required:
- Next.js **App Router**, React, TypeScript strict mode; use stable, mutually compatible versions present in or appropriate for the repository.
- Tailwind CSS, shadcn-style accessible primitives/Radix where useful, lucide-react; `class-variance-authority`, `clsx`, `tailwind-merge`, `next-themes` only where appropriate.
- Inter and JetBrains Mono or local equivalents served from the repository, never remotely fetched at stage runtime.
- TanStack Query for asynchronous API/query lifecycle; Zustand (or a similarly thin typed store) for synchronized scenario state, presentation state and local UI state.
- MapLibre GL JS with a completely **empty/local style and locally defined GeoJSON/vector layers**, NO cloud maps, online tiles, external styles or access tokens. Use custom canvas/WebGL layers if necessary for 60fps movement, and a local fallback if WebGL is unavailable. Turf.js or a tested point-in-polygon utility for safety-zone logic.
- Recharts or equivalent for charts; a local PDF generation library if needed for the simulated audit export.
- Zod (or equivalent) for parsing and validating external/fixture payloads at trust boundaries.
- ESLint, Prettier, a TypeScript typecheck script; Vitest + React Testing Library and Playwright (or comparable) for critical integration/E2E flows.
- A Next.js server that works locally without external networks once dependencies are installed. Do not rely on remote CDN fonts, icon URLs, tiles, images, APIs, tracking scripts or runtime asset downloads.

Follow these frontend scripts (or document a compatible alternative): `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`.

IMPORTANT SCOPE: Unlike a frontend-only prototype, this project MUST include the minimal **containerized Django service and PostgreSQL/Redis/Celery/Nginx infrastructure** in Section 1A. Do NOT implement the real Django domain models, auth token issuance, operational APIs, live AI integration, maritime integrations, or cloud infrastructure yet. Build the frontend completely using the simulation and future-facing BFF contracts.

## 3. NON-NEGOTIABLE BACKEND-READY DESIGN

Build two explicit runtime modes:
- `NEXT_PUBLIC_PORT_COMMAND_MODE=simulation` (default for LOCAL DEVELOPMENT; require an explicit opt-in for production-built stage demos): all site functions use local deterministic simulated data with no Django/database/internet. Clearly show **“Simulated data”** on EVERY portal and on copilot responses, demo reports, comparison figures and proposals.
- `NEXT_PUBLIC_PORT_COMMAND_MODE=api`: domain hooks use typed services that call the Next.js BFF and future Django endpoints. In API mode, show truthful loading, offline, unauthorized and backend-unavailable states; **never silently fall back to simulated operations** and portray them as real.

Create a domain model with stable IDs, normalized entities and DTOs, clean `PortDataSource`/repository interfaces, `SimulationPortDataSource` and `ApiPortDataSource`, selectable in ONE place. Screens must consume domain selectors/hooks and actions instead of importing mock fixture files or issuing raw `fetch` themselves. A future Django API must be able to supply a snapshot + events while the existing map and portals remain intact.

Prepare `frontend/lib/api/api-fetch.ts`, domain API modules, URL/query helpers, consistent typed error envelopes, contracts in `frontend/lib/contracts/`, and an explicit `docs/backend-integration-contract.md`. Prefer same-origin browser paths; NEVER make authenticated browser code call a private Django origin directly.

Create a Next.js backend-for-frontend structure compatible with the supplied architecture:
- `app/gateway/session/route.ts`: GET sanitized current session, POST login via future Django auth API, DELETE logout; in simulation mode use a visibly demo-only role/session experience and DO NOT mint fake production JWTs.
- `app/gateway/backend/[[...path]]/route.ts`: forwarding adapter for future Django, with server-only `BACKEND_API_ORIGIN`, safe path handling/allowlist, preserved query strings and body, bearer token injection from httpOnly cookies, sanitized responses, selected-401 refresh-and-retry ONCE, invalid-session clearing, no token leakage and safe header handling. Structure properly even though Django is unavailable today.
- Use secure/sameSite cookie policies in real API mode, rotating refresh tokens according to the architecture, and CSRF verification (double submit plus origin checks) for mutating routes. Implement these rules meaningfully, not as TODO comments; record any backend-dependent limitations precisely.
- Middleware / `proxy.ts` (if required by the installed Next.js version) for quick route redirects only; this is UX, NOT authorization. Never store JWTs in localStorage, sessionStorage or client Zustand. Do not treat a role switcher, route guard or mock roles as real permission enforcement.
- The future Django backend, NOT React, must ultimately enforce role, organization, terminal, object scope, all approval business rules, and audit transactions. Label demo access controls honestly.
- API mode operations such as proposal approval must await a validated server success and authoritative updated state before showing the operation as completed. No optimistic UI for safety-critical approvals or equipment actions.

Document proposed stable REST endpoints and request/response JSON, e.g. `/auth/login/`, `/auth/me/`, `/auth/refresh/`, `/terminals/`, `/terminals/{id}/snapshot/`, `/terminals/{id}/events/`, `/vessels/`, `/berths/`, `/equipment/`, `/workers/`, `/containers/`, `/zones/`, `/alerts/`, `/proposals/`, `/proposals/{id}/approve/`, `/proposals/{id}/dismiss/`, `/incidents/`, `/audits/`, `/energy/`, `/ports/group-summary/` and the appropriately scoped shipping-line routes. These are **proposed contracts**, NOT claims that Django already implements them. Define cursor/sequence, timestamps, pagination, enums, error formats and idempotency keys for mutation requests. Keep the live feed abstraction transport-agnostic (future authenticated SSE or WebSocket, reconnect/backoff/resync, snapshot replay), without faking a connected production backend.

## 4. ORGANIZATION AND ROUTES

Use a repo layout following the attached architecture. If starting empty:
```
project-root/
  frontend/
    app/
      (public)/page.tsx
      (auth)/login/page.tsx
      (auth)/forgot-password/page.tsx
      (protected)/layout.tsx
      (protected)/(operations)/control/page.tsx
      (protected)/(planning)/berths/page.tsx
      (protected)/(operations)/yard/page.tsx
      (protected)/(safety)/safety/page.tsx
      (protected)/(operations)/gate/page.tsx
      (protected)/(compliance)/audit/page.tsx
      (protected)/(operations)/energy/page.tsx
      (protected)/(security)/cyber/page.tsx
      (protected)/(external)/shipping-line/page.tsx
      (protected)/(executive)/group/page.tsx
      gateway/session/route.ts
      gateway/backend/[[...path]]/route.ts
    components/{ui,layout,map,copilot,simulation,charts,portals,notifications}/
    features/{control,berths,yard,safety,gate,audit,energy,cyber,shipping,group}/
    lib/{api,auth,contracts,data-sources,geometry,permissions,formatters}/
    simulation/{fixtures,engine,rules,scenarios,selectors,events}/
    hooks/  store/  public/assets/  tests/
    middleware.ts (or version-supported proxy.ts)
    .env.example
  docs/
    system_architecture.md
    Port Command Prototype Specification.pdf
    Port Command Pitch Document for MMC Ports.pdf
    frontend-requirements-matrix.md
    backend-integration-contract.md
    frontend-decisions.md
  README.md
```
Adjust the structure intelligently for existing code and installed Next version; keep domain ownership clear and routes clean. Place thin route pages above feature components and typed service functions. DRY: centralize repeated status/role badges, sorting/filtering/table state, error/loading shells, time formatting, chart wrappers, search, export/download and notifications BEFORE copy-pasting.

The public homepage can be a compact professional explanation and a “Launch Demo” action; the OPERATIONS APPLICATION is the hero. Include a professional login UI for future API use; in simulation mode use an explicit “Enter simulated control room” path, never implying actual authentication.

## 5. ROLE-AWARE PORTALS — BUILD ALL TEN

Use one common application shell and state. Support group executive, terminal duty manager, berth planner, yard/equipment planner, HSE officer, gate controller, compliance officer, energy/operations lead, OT/cyber analyst, shipping-line agent, supervisor/privacy-authorized role, and demo presenter as appropriate. Make `role -> allowed portal/actions -> terminal/org scope` a centralized typed configuration. These permissions are UX/DEMO ONLY until Django enforces them. Standard roles see workers at **zone level**, never exact worker position; only demo supervisor can inspect precise fictional pins. Do not expose customer vessels across shipping-line demo accounts.

Ten portals with real widgets and interactions:
1. **Terminal Control** (`/control`, critical): full-screen interactive 2D port map, overlays, KPIs, live alerts, layer toggles, entity search, inspect drawer, camera transitions, scenario toolbar and short operational history.
2. **Group Dashboard** (`/group`): exactly FIVE named illustrative MMC sea-port tiles (PTP, Northport, Johor Port, Penang Port, Tanjung Bruas Port); simulated comparison KPIs and illustrative badges; drill-down to an explicitly illustrative terminal view. Selat Terminal remains the fictional fully modeled demo terminal and is NOT represented as a real MMC port. Public historical figures are allowed ONLY when exact and cited by the pitch document: PTP 14,028,375 TEU; Northport ~3.80m TEU; Johor Port ~1.08m TEU; Tanjung Bruas 31,032 TEU; DO NOT INVENT a 2025 Penang TEU value. Distinguish TEU from Penang ferry passengers.
3. **Vessel and Berth Planning** (`/berths`): berth Gantt/timeline, ETA/ATA drift, predicted delays, 4 berth statuses, vessel inspector, tentative drag-to-replan with confirm/revert and unified state updates, not a fake chart.
4. **Yard and Equipment** (`/yard`): yard-block slot/utilization heat map, 6 quay cranes + 8 yard cranes, ~40 vehicles, active tasks, idle/faults, dispatch list and the actual two-prime-mover scenario action.
5. **Safety and Workforce** (`/safety`): exclusion/walkway/restricted zone visualization, rule-based safety alerts, certificate expiries, shift/contractor rosters by employer, incident register with searchable filters and evidence details, masked worker location by role.
6. **Gate and Landside** (`/gate`): simulated truck queues, appointment slots, lane capacity, throughput chart and synchronized queue changes.
7. **Compliance and Audit** (`/audit`): rule-category evidence cards (OSH, cyber, privacy/data protection, Maritime Single Window), human approvals and incident trail, filtering and an actual locally generated illustrative PDF export with date in filename. Never state a mock PDF constitutes legal compliance.
8. **Energy and Sustainability** (`/energy`): electric prime-mover battery and charging state, charging bays, simulated kWh/usage/emissions trends.
9. **Cyber and OT Security** (`/cyber`): fictional OT assets, severity-labelled alerts, incidents, notification clock, a controlled low-severity test event and traceable resolution.
10. **Shipping Line Portal** (`/shipping-line`): simulated agent-specific vessels, berth allocations, vessel schedule and container-ID search/details scoped to that simulated account.

The **AI Copilot is a global right-side drawer**, not an eleventh disconnected data dashboard. It must be accessible from every operational portal.

Each portal must have realistic empty/loading/error states, sorting/search where relevant, meaningful buttons, appropriate navigability, and consistent data from the SAME simulation store. No “Coming soon” screens or permanently inert controls for required features.

## 6. VISUAL SYSTEM — MATCH SPECIFICATION

Create a restrained, enterprise control-room interface; technical-drawing / printed-circuit-board map, not a game or neon-blue SaaS template. Default LIGHT theme, optimized for projector readability. Use CSS variables/design tokens:
- board `#F2F3EF`; land `#E4E6DF`; water `#C8D1D6`; road/trace `#15171A`; secondary ink `#5B6068`.
- workers only: `#2563EB`; AI/proposals `#0F766E`; warning `#B45309`; critical `#B91C1C`; normal/resolved `#15803D`.
- Colors are never the sole status signal. Use icons/text/shapes as well.
- Radii: 4px chips/inputs, 8px cards/panels, 12px drawers/modals. Grid-based layout, restrained borders, ample hierarchy, no illegible tiny type; Inter UI, JetBrains Mono for IDs/timestamps/coordinates, tabular numerals for KPIs.
- No gradients, glows, scanlines, 3D tilt, game HUD, unnecessary particle effects, emoji sprites, fake live-network indicators or stock-photo hero dashboards.
- Ship/vehicle silhouettes are clean local vector assets; subtle fixed-direction flat extrusion (3–6px) for crane/ship/container depth and consistent restrained shadows.

Shared app shell:
- Top: product/terminal selector, role switcher explicitly marked demo where appropriate, live **Asia/Kuala_Lumpur** clock, always-visible “Simulated data”, bell/alerts and settings.
- Collapsible LEFT overview rail: six KPI tiles (vessels berthed, waiting, quay-crane moves/hour, gate queue, workers on shift, open alerts), alert list and copilot trigger; collapsed icon-only state.
- CENTER main view, map-dominant on `/control`.
- Slide-in RIGHT inspector for selected entity, accessible close button and Escape support.
- BOTTOM slim simulation time/status/speed strip: paused/live, 1x, 2x, 5x. Advanced demo controls hidden until **D** key and disabled in real API mode.
- At 1920x1080 and 1366x768, fit without page-level horizontal/vertical scrolling in the control room; scroll internally in drawers/tables. At smaller tablet sizes, degrade gracefully without breaking critical controls.

## 7. REAL INTERACTIVE 2D MAP

Draw a completely fictional local terminal. Do NOT show a real port map or imply real positions. Use a static, checked-in local terminal geometry definition with a stable world-coordinate system transformed to MapLibre geometry. Use no remote basemap or tiles. Construct:
- Water/approach channel, land, quay edge, gates, lanes, yard blocks and port buildings.
- 4 clearly labelled berths **B1–B4** with pin ticks and chip-footprint geometry.
- 6 quay cranes and 8 yard cranes, zones and selected geometry.
- Main road traces 4px, secondary 2.5px, yard 1.5px; only 90°/45° turns and chamfered corners, junction ring pads, 8px subtle board dot grid.
- ~2,000 container SLOT representations with simple stack tint/extrusion; keep only a small subset individually moving; avoid 2,000 React DOM elements.
- 3 animated vessels, ~40 mixed animated vehicles, ~60 fictional worker pins clustered by zoom. Correct rotation/easing when following routes. Worker halo subtle, worker position/zone indicators meaningful.
- Active crane exclusion polygons hatched, walkway/restricted lanes distinct, flashing/pulsing ONLY for a critical alert or one short AI route pulse.
- Zoom layers: overview (channel/berths/clusters), berth (equipment, individual pins), yard (container slots, stack and labels). Native-feeling pan, smooth eased zoom ~300–400ms, hover tooltips, keyboard-compatible selection, layer card toggling vessels/vehicles/workers/containers/zones/heat/routes.
- Search by vessel/vehicle/fictional container ID, click alert to fly-to, select and inspect. Ensure pointer interactions and map drag/zoom work in actual browser.

Inspector types MUST be complete:
- vessel: name/type, fictional IMO, route/ETA/ATA, berth, load/discharge, status, predicted delay, mock maritime-clearance state, Ask AI;
- vehicle: ID/type, human/autonomous, task/route/load/speed/battery/status;
- worker: fictional identity/role/employer/shift/task/zone/safety/certificate, exact position only in supervisor DEMO view;
- container: fictional ISO-style ID/size/type/vessel/yard row-bay-tier/status/last move/hold;
- berth/crane: ID/status/task/moves per hour/next job/certificate/exclusion rule.

Use a canvas/WebGL-oriented renderer, memoized selectors, efficient updates and requestAnimationFrame interpolation to TARGET 60fps with the full seed population. Do not repeatedly re-render the entire React tree on every simulation tick. Handle hidden tabs and cleanup of map/worker/subscriptions to prevent leaks.

## 8. ONE DETERMINISTIC SIMULATION + EVENT/SAFETY ENGINE

Central canonical types: `Port`, `Terminal`, `Vessel`, `Berth`, `Crane`, `Vehicle`, `Worker`, `Container`, `Zone`, `Alert`, `Proposal`, `Incident`, `Approval`, `AuditEvent`, `EnergyState`, `GateState`, `ScenarioEvent`, `CurrentSession` and stable role/scope enums. No real personal data.

Seed ALL data reproducibly. Fictional Selat Terminal: 4 berths; vessels **MV Kedah Pearl**, **MV Orient Gale**, **MV Langkawi Dawn**; ~40 vehicles; ~60 worker pins; ~2,000 containers; 6 quay/8 yard cranes; ~12 zones. Use consistent seeded RNG and an explicitly resettable initial snapshot.

Engine requirements:
- Deterministic fixed-step state changes (e.g. 10 ticks/sec) plus `requestAnimationFrame` interpolated visual motion (up to 60fps); a Web Worker is preferred when appropriate, but only if its maintenance/communication overhead is justified.
- Single canonical source feeds map, charts, inspectors, AI grounding functions, alerts and logs. Avoid independent timers making contradictory numbers.
- Routes are coherent paths, not random jumps. Vessel approach/dock/depart, AGVs/trucks travel, workers move only within permitted walkable areas except scripted breach.
- Worker entering an ACTIVE crane exclusion polygon must fire point-in-polygon safety rule, emit a critical `ZONE_BREACH` event, hold the relevant crane, add alert and incident evidence, and propose appropriate response. A crane hold is a simulated **rule-driven safety interlock**; AI must NOT bypass it.
- Support event types at least `VESSEL_ARRIVE`, `DOCK_START`, `DOCK_COMPLETE`, `CRANE_MOVE`, `ZONE_BREACH`, `CRANE_HOLD`, `PROPOSAL_CREATED`, `PROPOSAL_APPROVED`, `ROUTE_CHANGE`, `ALERT_RESOLVED`; store immutable/history-friendly event data with timestamps, actor role, entity references and rule tags.
- Derived KPIs, berth predicted delay, yard utilization, gate queue and energy values must be consistent with state and scenario events. Formulae may be simplified but must be deterministic and documented.
- Human approval is required before proposal application; prevent double approval, reject invalid state transitions, record approval/dismissal/modified requests and associated timestamps. In API mode only Django may finalize such actions.
- Reset/scene jump restores ALL relevant entities, counters, events, alerts, copilot scenario state and seed so repeated runs are IDENTICAL. Adjustable pause/play and 1x/2x/5x.
- Add unit tests for same-seed determinism, point-in-polygon breach, approval gating/idempotency, event replay, time scaling, privacy redaction and consistency of portal KPIs.

## 9. ALL SIX FIVE-MINUTE STAGE SCENES (FULLY WORKING)

Provide a visible scene runner behind `D`, deep-linkable/debuggable scenario state if practical, controls to reset/replay/jump, and keyboard **Shift+1** through **Shift+6**:
- **Scene 1, Calm overview (0:00)**: active map, vessel/vehicle/pin motion, KPI counters, left rail open, **Langkawi Dawn** departs B4.
- **Scene 2, Inspect (1:00)**: select **Orient Gale**, then a worker and a container; correct three distinct inspector experiences, camera fly-to and overlays.
- **Scene 3, Docking (1:45)**: **Kedah Pearl** approaches/docks at B2; tug assist, brackets/mooring, cranes swing, moves counter and prime mover cycles operate visually.
- **Scene 4, Safety (2:30)**: fictional contractor crosses **Crane 3** exclusion zone; worker turns critical red; rule raises critical alert, puts Crane 3 on hold, creates incident; supervisor sees a response proposal and approves a safe lane/routing change; record actor/time/rule tag; no unsafe auto-reset.
- **Scene 5, Decide (3:15)**: ask “Why is Berth 2 behind schedule?”; answer from actual recorded Crane 3 hold and 2 unavailable prime movers. Copilot proposes reallocating TWO prime movers from Yard C and a crane swap; human approval changes assignments/routes, produces a single subtle route pulse, logs the decision and reduces **Orient Gale** projected delay from an illustrative 24 to 13 minutes (or coherent state-derived equivalent); display clearly that these are simulated values.
- **Scene 6, Scale (4:00)**: group dashboard with exactly five MMC port tiles, all live KPIs illustrative, interactive comparison and drill-down to visibly fictional/illustrative data.

Scenes may define scripted event-time triggers but should still use shared engine/actions rather than secretly replacing visual KPI numbers. Scene entry must set a reliable baseline so demo clicks and approvals always work; create one-click **Run Stage Demo** navigation in presenter controls.

## 10. STATE-GROUNDED AI COPILOT — FULL FEATURE, NO LLM REQUIRED

Global right drawer toggled by `/` or the teal AI button. Include a thread, timestamped messages, keyboard input, 12 suggested prompt chips, inline clickable entity chips (hover map-highlight, click fly-to), cited internal simulated entities/events, clear confidence and a “Why?” expansion showing state evidence. The default deterministic scripted engine MUST work offline with no API key. Unexpected queries must answer “I don't have that information in this simulation” rather than hallucinate.

Implement EXACTLY these 12 intentions with real, synchronized behavior:
1. “What is happening at Berth 2?” — occupant, active crane, moves/h and status.
2. “Why is Berth 2 behind schedule?” — Crane 3 hold + missing prime movers when relevant; evidence and a proposal.
3. “Which vessel will be late?” — Orient Gale predicted delay, consistent with scenario.
4. “Who is in a crane exclusion zone?” — current breach entities or none, obey role privacy.
5. “Show last night's safety incidents” — navigates to Safety filtered to last shift.
6. “What should we change to recover the delay?” — scene 5 proposal card.
7. “What if Orient Gale arrives 20 minutes late?” — explicit preview/what-if calculation and revised berth timeline, no irreversible state update without confirmation.
8. “Summarise this shift” — current moves, alerts, approvals.
9. “Is Crane 3's certificate valid?” — expiry from current fictional record.
10. “How much energy have electric prime movers used today?” — simulated kWh and percent of moves.
11. “Prepare this week's audit report” — opens/prepares a clearly mock audit export.
12. “Compare all five ports” — route to Group with a short illustrative ranking.

Proposals display title, reason, estimated effect, confidence, Why/evidence, **Approve / Modify / Dismiss** with real interactions and a confirmation step. Three-position autonomy control `Advisory | Approve to act | Auto for low-risk` is demonstrative; ONLY “Approve to act” performs demo actions. The other modes explain that execution is not enabled. Never describe the scripted decision layer as a trained AI model or pretend a live model has been connected. Define a future `CopilotProvider` interface for calling an actual Django-managed AI service safely, but implement the deterministic provider now.

## 11. INTERACTION, PRIVACY, SAFETY, OFFLINE

- Shortcuts: `/` copilot (ignore inside editable inputs), `Escape` closes top overlay/inspector, `1`–`4` switch key portals with clear mapping, `D` shows presenter controls, `Shift+1`–`Shift+6` scene jump. Include a discoverable shortcuts menu.
- Alerts at four severities: info/advisory/warning/critical. Top-right toast, persistent feed entry and map marker; only critical can pulse. Acknowledge / resolve flows affect event log.
- Show privacy explanation: illustrative worker names only; zone-level location by default; precise fictional demo tracking only in supervisor demo role. In future auth mode, per-role redaction is server enforced and the UI must not display an API field unavailable to that role.
- Status/claims: always-visible `Simulated data` and group `Illustrative data` labels; reports watermark mock/test; no invented live metrics, regulatory certification, TOS integration, third-party endorsement or impossible labor reduction claims.
- Offline means no external network requests from the application at runtime, after local installation/build. All fonts/assets, drawings, maps, package code and icons local. Add a documented stage checklist and optional preflight page/control that reports mode, local assets, client capabilities and backend status truthfully.
- Accessibility: semantic landmarks, focus management for dialogs/drawers, ARIA labels, legible contrast, accessible tables/forms, keyboard use and reduced-motion handling. Do not let decorative motion compromise the demo.
- Error handling: meaningful fallback UI for unsupported WebGL, missing local assets, invalid fixtures, client errors and API-unavailable mode. Do not conceal exceptions or use broad `any` typing.

## 12. BACKEND INTEGRATION PLAN TO DELIVER NOW (WITHOUT BUILDING PORT BUSINESS LOGIC)

The integration document must specify:
- All typed entities/DTOs, normalized ID strategy, filtering/sorting/pagination, UTC timestamps serialized in ISO-8601 (Malaysia time DISPLAY only), mock seed and status enums.
- Suggested Django role/domain app ownership such as `auth_app`, `admin_app`, `notifications_package`, `terminal_app`, `vessel_app`, `yard_app`, `workforce_app`, `safety_app`, `gate_app`, `compliance_app`, `energy_app`, `cyber_app`, `shipping_app`, `copilot_app` (suggestions for **future** apps; only a minimal Django project scaffold is created now).
- Frontend `GET snapshot + sequence` hydration, incremental sequenced event application, reconnection gap detection, authoritative resync, idempotent approval POST, optimistic display restrictions, 403 scope failures and terminal switch behavior.
- BFF cookie/session/CSRF and safe auth lifecycle, how `NEXT_PUBLIC_PORT_COMMAND_MODE` changes data source, required future DRF endpoints, expected response/error envelopes, proposed example JSON for each major domain, and an `openapi` integration checklist.
- Role/scope matrix and policy ownership. Production must never rely on client-only privacy protection or simulated approval logic.
- Demo mode must not be accidentally enabled on a REAL production deployment; require an explicit deploy-time acknowledgement for intentionally built offline stage demos (e.g. a separate `PORT_COMMAND_ALLOW_PRODUCTION_SIMULATION=true` server-only configuration), with safe default/error handling. An offline stage build using `next build && next start` must still be supported when that opt-in is set.

## 13. IMPLEMENTATION ORDER — IMPLEMENT, DO NOT STOP AT A PLAN

Work in this order, reporting files completed and commands executed at the end:
1. Inspect sources/repo and `AGENTS.md`; extract requirements matrix; implement the **single Docker Compose stack** and minimum healthy Django service; install/lock all dependencies inside containers; verify `docker compose up --build -d` and Nginx `http://localhost:8088`; THEN set up frontend scripts, environment example, tokens, UI library and responsive app shell.
2. Define domain contracts, schemas and repository interfaces; build a fully seeded fixture + canonical store + fixed-step simulation + event log and safety rule engine; write core unit tests.
3. Create the blank/local MapLibre port geometry and canvas/WebGL moving entity layers; implement zoom, pan, layer toggles, selection, inspect, map searches; verify in a real browser.
4. Implement scenes 1–5 and approval transitions; make deterministic reset/replay/shortcuts and stage controls work.
5. Implement copilot with all 12 scripted prompts, evidence and cards; integrate it with real state and scene effects.
6. Build Safety, Group and scene 6; then Berth, Yard, Compliance; then Gate, Energy, Cyber, Shipping portals with functional widgets/actions.
7. Add BFF API/session integration scaffolding with robust API mode behavior; auth/login placeholder UI marked accurately, transport adapters and backend contract documentation; keep simulation completely usable if Django is unavailable (after the seven-service setup was verified).
8. Polish visual assets, motion, accessibility, viewport behavior and offline asset integrity; add real audit PDF export.
9. Run lint/typecheck/unit/E2E/build; fix all failures; test with no internet at 1920x1080 and 1366x768; update README and requirement matrix with actual results.

## 14. QUALITY GATES — VERIFY BEFORE DECLARING COMPLETE

Run and fix **inside Docker containers only**:
- `docker compose exec -T frontend npm run lint`
- `docker compose exec -T frontend npm run typecheck`
- `docker compose exec -T frontend npm run test -- --run` (or the matching configured nonwatch invocation)
- `docker compose run --rm --no-deps frontend npm run build` (or dedicated build profile)
- `docker compose --profile test run --rm frontend_e2e` or equivalent containerized Playwright test profile; install browser binaries into container images, NEVER into host macOS.
- `docker compose exec -T backend python manage.py check`; validate database migrations and Celery starts.
- `docker compose config --quiet`; `docker compose ps`; check Nginx served pages and health routes.
If actual test execution is blocked, provide an honest note with exact Docker-only commands, never claim success without observing it.

Playwright/browser scenarios: load offline-ready simulation, navigate all 10 portals, map zoom/pan and clicking vessel/vehicle/worker/container/crane; all 12 copilot prompts; all six scene shortcuts and full reset; safety breach and subsequent audit entry; attempt to approve twice; approve scene 5 and verify altered vehicle routes and delay; role switch privacy masking; generated mock audit PDF; group drill-down; viewport tests. Inspect browser console for errors. Verify ZERO external runtime fetches. Verify only 1 data source feeds all portals, and no 2000 DOM nodes are built for containers.

Document actual test outcomes and known limitations rather than claiming results not observed. FPS target: 60fps on stage laptop; add a local diagnostics overlay or performance measurement and report measured numbers where possible, otherwise label **unverified on target hardware**.

## 15. DELIVERABLES AND FINAL REPORT

Provide in the repository:
- One `compose.yaml` / `docker-compose.yml` defining all seven services, frontend/backend Dockerfiles, internal health checks, Nginx config, named volumes, separate `port-command` network, complete `.dockerignore` files and example env files.
- Minimal runnable `backend/` Django + DRF scaffold with PostgreSQL/Redis/Celery configuration, health route and installed requirements/lock; NO port-specific business implementation now.
- Complete runnable `frontend/`, implemented portals, animations, scene runner, fixture/data source, copilot, inspectors, alerts, approvals, shared shell, responsive layout, local assets and tests.
- `README.md` with EXACT **Docker-only Mac/Linux** build/start/stop/upgrade/lint/typecheck/test/E2E commands (never host npm/pip), one-stack topology, data persistence notes, offline demo procedure, stage keyboard cheatsheet, configuration and troubleshooting.
- `frontend/.env.example`, without credentials: e.g. `NEXT_PUBLIC_PORT_COMMAND_MODE=simulation`, `BACKEND_API_ORIGIN=http://backend:8000` as the Compose PRIVATE development origin only; never expose the server-only origin as NEXT_PUBLIC.
- `docs/frontend-requirements-matrix.md`, `docs/backend-integration-contract.md`, `docs/frontend-decisions.md`, `docs/dependency-versions.md`, `docs/stage-demo-checklist.md`, `docs/docker-operations.md`, and an honest `docs/implementation-status.md`.
- Document that the 5 MMC port group view is illustrative, and the one fully modeled terminal is fictional.

At completion, respond with: (1) what was implemented and important folders, (2) exact **Docker Compose-only** startup and test commands and `http://localhost:8088`, (3) portal/scenes/AI functionality verified, (4) lint/typecheck/test/build results, (5) backend endpoints the future Django implementation must supply, (6) honest limitations. If any milestone is incomplete, report it specifically; don't represent placeholders as finished.

**START IMPLEMENTATION NOW. Do not respond with architecture suggestions alone. Create the single seven-service Docker Compose stack and a minimum health-only Django scaffold, then IMPLEMENT THE COMPLETE FRONTEND with working simulation, all ten portals, map, six scenes, copilot and tests. Finish, build and test from containers only. Do not install language dependencies on macOS. Do not implement Django port business logic until the future backend phase.**
