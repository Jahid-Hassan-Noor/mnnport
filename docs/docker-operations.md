# Docker operations

`compose.yaml` declares one project named `port-command`. It creates a private network and five named volumes: PostgreSQL data, Redis data, frontend dependencies, Next.js build cache, and Celery beat state. No service other than Nginx binds a host port. Nginx listens only on `127.0.0.1:8088`.

Nginx resolves `frontend` through Docker's internal DNS so a frontend container recreation does not strand the proxy on an old IP.

## Health and logs

```bash
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 frontend backend postgresql redis celery_worker celery_beat nginx
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py showmigrations
```

PostgreSQL and Redis use native readiness probes. Backend health calls `/healthz/`, including a database `SELECT 1`. Frontend health fetches `/`. Nginx health fetches its local `/healthz`. Celery worker health uses `inspect ping`; Celery beat is expected to be running, with errors visible in logs.

## Lifecycle

```bash
docker compose up --build -d
docker compose restart frontend
docker compose down
docker compose up -d
```

`down` retains project data. `docker compose down -v` is a separate opt-in destructive operation that deletes this project's named volumes. Never use global prune commands to manage this app. The project does not use or modify any other Compose project.

## Rebuild / dependency update

Update pinned versions in `frontend/package.json` or `backend/requirements.txt`, regenerate the corresponding lock **inside containers**, review it, then run:

```bash
docker compose build --pull
docker compose up -d
docker compose exec -T frontend npm ci
```

Frontend source is bind-mounted for hot reload. The named `node_modules` volume can retain prior packages; run the last command after a lock change. The `.next` cache also lives in a Docker volume. For an independent production build check, use `docker compose --profile test run --build --rm --no-deps frontend_build`; this separate service has no source or `.next` volume mount.

## Configuration

Copy `.env.example` to `.env` once and keep `.env` uncommitted. Values are visibly local development placeholders. The private Django origin is `http://backend:8000` within the Compose network. Only `NEXT_PUBLIC_PORT_COMMAND_MODE` may be exposed to client code. `PORT_COMMAND_ALLOW_PRODUCTION_SIMULATION=true` is required for an intentional production-built offline stage simulation.

The default simulation remains usable if backend, PostgreSQL and Redis later stop, provided frontend and Nginx remain available. API mode does not use simulated operational data and reports domain service unavailability until future Django endpoints exist.
