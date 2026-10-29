# Resolved dependency versions

Pinned direct JavaScript dependencies and their transitive resolutions are in `frontend/package-lock.json`; resolved Python packages are in `backend/requirements.lock` (40 packages). The lock files were produced with Node and Python **inside Docker containers**.

| Runtime | Pinned version used | Reason |
|---|---|---|
| Node | 24.18.0 Alpine | LTS container; no host Node |
| Next.js | 16.4.3 | Stable App Router release |
| React / React DOM | 19.3.1 | Compatible stable release |
| TypeScript | 5.9.3 | Known Next.js-compatible series |
| MapLibre GL JS | 6.16.0 | Local worker and empty style support |
| Three.js / types | 0.186.1 / 0.186.0 | Locally rendered 3D terminal model and typed scene code |
| Tailwind CSS | 4.3.3 | Stable CSS tooling |
| Django | 6.1.2 | Stable release supporting Python 3.14 |
| Python | 3.14 slim | Conservative supported Django pairing |
| PostgreSQL | 18.6 Alpine | Verified stable patch image |
| Redis | 8.10.3 Alpine | Verified stable patch image |
| Nginx | 1.30.6 Alpine | Verified stable branch image |
| Celery | 5.5.3 | Stable version resolved in backend image |
| DRF | 3.16.1 | Stable version resolved in backend image |
| Playwright | 1.64.1 | Containerized E2E tooling |

The base image patch tags are fixed rather than mutable `latest`. Review published security patches periodically and update the images with `docker compose build --pull` after testing. The initial jsPDF 3.0.3 install showed one critical advisory; it was upgraded to 4.2.1. A full `npm audit --audit-level=critical` after the 3D dependency update reported zero vulnerabilities.
