# Stage demo checklist

1. Start the stack with `docker compose up --build -d` while online. Check `docker compose ps` and open `http://localhost:8088` in Chrome or another browser with WebGL and module-worker support. Enter the control room from the animated 3D landing page.
2. Use **D** to show stage controls. Choose **Run Stage Demo · 5 minutes** for automatic 1× scene changes at 1:00, 1:45, 2:30, 3:15 and 4:00; it stops at 5:00. The runner resets first and carries approvals, incidents and audit events forward. Manual **Shift+1–6** jumps deliberately rebuild the chosen scene from the fixed seed. Use **Reset full simulation** before a manual rehearsal.
3. Scene 1 (0:00): demonstrate the 3D twin, fictional tilted map movement, six KPI tiles, pan/zoom, and Langkawi Dawn departure. Hide and restore the 3D inset to show the full map remains available.
4. Scene 2 (1:00): inspect Orient Gale, a worker zone pin, then a container found by ID. Worker identity and locations are fictional; standard roles show zone only. Close vehicle/container inspection hides the optional 3D inset so the selected object stays visible. A selected vehicle uses a close following camera; drag or scroll the map to stop following, or use its Follow button to resume.
5. Scene 3 (1:45): jump to docking; Kedah Pearl approaches Berth 2 and the log contains arrival and dock-start events. Wait about 16 simulated seconds for the berth to become occupied and the dock-complete event to appear. The 3D inset clears automatically during scenes 3–5; its Show control can restore it.
6. Scene 4 (2:30): show the Crane 3 zone breach, hold and incident. In the copilot, review the safe-lane proposal and approve it; the crane stays held.
7. Scene 5 (3:15): ask the copilot why Berth 2 is behind. Review evidence, approve the two-prime-mover recovery proposal, and confirm Orient Gale's illustrative delay changes 24 → 13 minutes.
8. Scene 6 (4:00): show exactly five illustrative MMC sea-port tiles and open a tile detail. Explain that Selat Terminal is separate and fictional.
9. Confirm all reports, charts, copilot messages and proposals say **simulated** or **illustrative**. Never describe the backend as a connected port API.
10. Rehearse at the actual 1920×1080 and 1366×768 display settings with Wi-Fi off after images are built. Check map loading, fonts, no external requests, copilot, PDF download and page fit. The map caption shows a local canvas FPS readout; observe it on the presenting laptop during pan, zoom, docking and the alert scene. A container browser measurement cannot certify a hardware-specific 60 FPS target.
11. Keep the generated `docs/port-command-stage-backup.webm` as a browser-recorded fallback. Record a final full-screen, narrated version on the presenting laptop if the stage needs audio or an exact projector-specific layout.

To regenerate the browser backup in Docker, with the stack already running:

```sh
docker compose --profile test run --build --rm --no-deps -v "$PWD/docs:/output" frontend_e2e node scripts/record-stage-demo.mjs
```

Use `docker compose logs --tail=100 frontend nginx backend` to diagnose startup issues. Keep the already-built images available for offline use.
