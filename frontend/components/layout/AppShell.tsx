"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { usePort } from "@/store/use-port";
import { useShallow } from "zustand/react/shallow";
import { PORTALS, ROLES, canView } from "@/lib/permissions";
import type { Portal, Role } from "@/lib/contracts/domain";
import { Copilot } from "@/components/copilot/Copilot";
import { Inspector } from "./Inspector";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";

const MODE = process.env.NEXT_PUBLIC_PORT_COMMAND_MODE || "simulation";
const formatter = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
export function AppShell({ children }: { children: React.ReactNode }) {
  const s = usePort(
      useShallow((state) => ({
        role: state.role,
        alerts: state.alerts,
        vessels: state.vessels,
        cranes: state.cranes,
        workers: state.workers,
        gateQueue: state.gate.queue,
        scene: state.scene,
        speed: state.speed,
        paused: state.paused,
        simSeconds: Math.floor(state.simSeconds),
        setRole: state.setRole,
        select: state.select,
        setPaused: state.setPaused,
        setSpeed: state.setSpeed,
        jump: state.jump,
        reset: state.reset,
        acknowledge: state.acknowledge,
        resolve: state.resolve,
      })),
    ),
    router = useRouter(),
    pathname = usePathname();
  const [copilot, setCopilot] = useState(false),
    [rail, setRail] = useState(true),
    [presenter, setPresenter] = useState(false),
    [stageRunning, setStageRunning] = useState(false),
    [alertsOpen, setAlertsOpen] = useState(false),
    [help, setHelp] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [clock, setClock] = useState("--:--:--");
  const helpDialogRef = useRef<HTMLDialogElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const portal = pathname.slice(1) as Portal;
  const scopedPortal = portal === "group" || portal === "shipping-line";
  const changeRole = (role: Role) => {
    s.setRole(role);
    const next = ROLES.find((r) => r.id === role)!;
    if (!next.portals.includes(portal)) router.push(`/${next.portals[0]}`);
    setMobileMenu(false);
  };
  useEffect(() => {
    if (MODE !== "simulation") return;
    let last = performance.now();
    let remainder = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      if (document.hidden) {
        last = now;
        remainder = 0;
        return;
      }
      remainder += Math.min(now - last, 1000);
      last = now;
      const steps = Math.floor(remainder / 100);
      if (steps > 0) {
        remainder -= steps * 100;
        usePort.getState().advance(steps);
      }
    }, 100);
    const clockTimer = setInterval(
      () => setClock(formatter.format(new Date())),
      1000,
    );
    return () => {
      clearInterval(timer);
      clearInterval(clockTimer);
    };
  }, []);
  useEffect(() => {
    if (MODE !== "simulation") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable=true]"))
        return;
      if (help) return;
      if (e.key === "Escape") {
        if (mobileMenu) setMobileMenu(false);
        else if (copilot) setCopilot(false);
        else if (presenter) setPresenter(false);
        else usePort.getState().select(undefined);
      }
      if (e.key === "/") {
        e.preventDefault();
        setCopilot((v) => !v);
      }
      if (e.key.toLowerCase() === "d") setPresenter((v) => !v);
      const digit = e.code.match(/^Digit([1-6])$/)?.[1];
      if (e.shiftKey && digit) {
        e.preventDefault();
        const n = Number(digit);
        setMobileMenu(false);
        setStageRunning(false);
        usePort.getState().jump(n);
        router.push(n === 6 ? "/group" : "/control");
      } else if (!e.shiftKey && digit && Number(digit) <= 4) {
        setMobileMenu(false);
        router.push(
          ["/control", "/berths", "/yard", "/safety"][Number(digit) - 1],
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, copilot, help, mobileMenu, presenter]);
  useEffect(() => {
    const dialog = helpDialogRef.current;
    if (!dialog) return;
    if (help && !dialog.open) dialog.showModal();
    if (!help && dialog.open) dialog.close();
  }, [help]);
  useEffect(() => {
    document
      .querySelector(".app-shell")
      ?.setAttribute("data-interactive", "true");
  }, []);
  useEffect(() => {
    if (!stageRunning || s.paused) return;
    const boundaries = [60, 105, 150, 195, 240, 300];
    if (s.simSeconds < boundaries[s.scene - 1]) return;
    const timer = window.setTimeout(() => {
      if (s.scene === 6) {
        setStageRunning(false);
        usePort.getState().setPaused(true);
        return;
      }
      const next = s.scene + 1;
      usePort.getState().nextStage();
      router.push(next === 6 ? "/group" : "/control");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [stageRunning, s.paused, s.scene, s.simSeconds, router]);
  if (MODE !== "simulation")
    return (
      <div className="app-shell">
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark small">PC</span>
            <span>
              <strong>PORT COMMAND</strong>
              <small>API MODE</small>
            </span>
          </Link>
          <span className="badge warning">Domain API unavailable</span>
          <ThemeSwitch />
          <Link className="button" href="/login">
            Future sign in
          </Link>
        </header>
        <main className="portal-main">
          <div className="unavailable-state">
            <span className="eyebrow">API MODE · NO SIMULATED FALLBACK</span>
            <h1>Operational API unavailable</h1>
            <p>
              The health-only Django service does not yet implement identity or
              port domain endpoints. No simulated port values are displayed as
              live operational data.
            </p>
            <p>
              Future integration requires authenticated snapshot, events, role
              scope and server-validated approval endpoints.
            </p>
          </div>
        </main>
      </div>
    );
  const openAlerts = s.alerts.filter((a) => a.status !== "resolved");
  const toastAlert = openAlerts.findLast(
    (a) =>
      a.severity === "critical" &&
      s.simSeconds -
        (Date.parse(a.at) - Date.parse("2026-10-28T00:00:00Z")) / 1000 <
        8,
  );
  const kpis = [
    {
      label: "Berthed",
      value: Object.values(s.vessels).filter((v) => v.status === "berthed")
        .length,
    },
    {
      label: "Waiting",
      value: Object.values(s.vessels).filter(
        (v) => v.status === "approaching" || v.status === "docking",
      ).length,
    },
    {
      label: "QC moves/h",
      value: Object.values(s.cranes)
        .filter((c) => c.type === "quay" && c.status === "active")
        .reduce((a, c) => a + c.movesPerHour, 0),
    },
    { label: "Gate queue", value: s.gateQueue },
    { label: "On shift", value: Object.keys(s.workers).length },
    { label: "Open alerts", value: openAlerts.length },
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/control" className="brand">
          <span className="brand-mark small">PC</span>
          <span>
            <strong>PORT COMMAND</strong>
            <small>
              {portal === "group"
                ? "FIVE-PORT VIEW"
                : portal === "shipping-line"
                  ? "SELAT DEMO LINE"
                  : "SELAT TERMINAL"}
            </small>
          </span>
        </Link>
        <span className="terminal-tag">
          {portal === "group"
            ? "ILLUSTRATIVE NETWORK"
            : portal === "shipping-line"
              ? "FICTIONAL ACCOUNT"
              : "FICTIONAL TERMINAL"}
        </span>
        <nav className="top-nav" aria-label="Primary portals">
          {PORTALS.map(
            (p) =>
              canView(s.role, p.id) && (
                <Link
                  key={p.id}
                  className={portal === p.id ? "active" : ""}
                  href={`/${p.id}`}
                  aria-current={portal === p.id ? "page" : undefined}
                >
                  {p.short}
                </Link>
              ),
          )}
        </nav>
        <div className="top-controls">
          <button
            type="button"
            className="icon-button mobile-menu-trigger"
            aria-label="Open portals and demo settings"
            aria-expanded={mobileMenu}
            aria-controls="mobile-portals-menu"
            onClick={() => setMobileMenu((value) => !value)}
          >
            <Menu size={19} />
          </button>
          <span className="clock">{clock} MYT</span>
          <span className="badge simulated">Simulated data</span>
          <ThemeSwitch />
          <label className="role-control">
            Demo role{" "}
            <select
              aria-label="Demo role"
              value={s.role}
              onChange={(e) => changeRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button"
            onClick={() => setAlertsOpen((v) => !v)}
            aria-label={`Alerts, ${openAlerts.length} open`}
          >
            <Bell size={18} />
            <b className="alert-count">{openAlerts.length}</b>
          </button>
          <button
            ref={helpTriggerRef}
            className="icon-button"
            onClick={() => setHelp(true)}
            aria-label="Keyboard shortcuts"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </header>
      {mobileMenu && (
        <div id="mobile-portals-menu" className="mobile-portals-menu">
          <nav aria-label="Compact portals">
            {PORTALS.filter((p) => canView(s.role, p.id)).map((p) => (
              <Link
                key={p.id}
                href={`/${p.id}`}
                aria-current={portal === p.id ? "page" : undefined}
                onClick={() => setMobileMenu(false)}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <label>
            Demo role
            <select
              aria-label="Demo role in compact menu"
              value={s.role}
              onChange={(e) => changeRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button"
            onClick={() => {
              setMobileMenu(false);
              setPresenter(true);
            }}
          >
            <Settings2 size={16} /> Demo controls
          </button>
        </div>
      )}
      <div className="app-body">
        {!scopedPortal && (
          <aside className={`overview-rail ${rail ? "" : "collapsed"}`}>
            <div className="rail-heading">
              <span className="eyebrow">LIVE OVERVIEW</span>
              <button
                className="icon-button"
                aria-label={rail ? "Collapse overview" : "Expand overview"}
                onClick={() => setRail((v) => !v)}
              >
                {rail ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              </button>
            </div>
            {rail ? (
              <>
                <div className="kpi-grid">
                  {kpis.map((k) => (
                    <div className="kpi" key={k.label}>
                      <strong>{k.value}</strong>
                      <span>{k.label}</span>
                    </div>
                  ))}
                </div>
                <div className="rail-section">
                  <div className="section-heading">
                    <strong>Active alerts</strong>
                    <span>{openAlerts.length}</span>
                  </div>
                  {openAlerts.length ? (
                    openAlerts
                      .slice(-5)
                      .reverse()
                      .map((a) => (
                        <button
                          className="alert-item"
                          key={a.id}
                          onClick={() => {
                            if (a.entity) s.select(a.entity);
                            router.push("/control");
                          }}
                        >
                          <span className={`severity-dot ${a.severity}`} />
                          <span>
                            <strong>{a.title}</strong>
                            <small>
                              {a.severity.toUpperCase()} · {a.status}
                            </small>
                          </span>
                        </button>
                      ))
                  ) : (
                    <p className="muted">No active alerts.</p>
                  )}
                </div>
                <button
                  className="copilot-trigger"
                  onClick={() => setCopilot(true)}
                >
                  <Bot size={19} />
                  <span>
                    <strong>Ask Port Command</strong>
                    <small>Grounded in simulated state</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="icon-button"
                  onClick={() => setCopilot(true)}
                  aria-label="Open copilot"
                >
                  <Bot size={20} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setAlertsOpen(true)}
                  aria-label="Open alerts"
                >
                  <Bell size={19} />
                </button>
              </>
            )}
          </aside>
        )}
        <main className="portal-main">
          {MODE === "simulation" ? (
            canView(s.role, portal) ? (
              children
            ) : (
              <div className="unavailable-state">
                <h1>Demo role scope</h1>
                <p>
                  This simulated role does not include the {portal} portal. The
                  future Django backend will enforce real permissions.
                </p>
                <button
                  onClick={() =>
                    router.push(
                      `/${ROLES.find((r) => r.id === s.role)!.portals[0]}`,
                    )
                  }
                >
                  Open allowed portal
                </button>
              </div>
            )
          ) : (
            <div className="unavailable-state">
              <h1>Operational API unavailable</h1>
              <p>
                API mode is selected. The Django domain endpoints are not
                implemented yet. No simulated operations will be shown as live
                data.
              </p>
              <p>Backend health is available internally at /healthz/.</p>
            </div>
          )}
        </main>
      </div>
      <footer className="status-strip">
        <span>
          <Activity size={14} /> <strong>SCENE {s.scene} / 6</strong> ·{" "}
          {new Date(
            Date.parse("2026-10-28T00:00:00Z") + s.simSeconds * 1000,
          ).toLocaleTimeString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}{" "}
          MYT
        </span>
        <div className="strip-controls">
          <button
            aria-label={s.paused ? "Play simulation" : "Pause simulation"}
            onClick={() => s.setPaused(!s.paused)}
          >
            {s.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          {([1, 2, 5] as const).map((speed) => (
            <button
              key={speed}
              className={s.speed === speed ? "active" : ""}
              aria-pressed={s.speed === speed}
              onClick={() => s.setSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </div>
        <span className="strip-right">
          FIXED SEED 20261028{" "}
          <button onClick={() => setPresenter((v) => !v)}>
            <Settings2 size={14} /> Demo controls <kbd>D</kbd>
          </button>
        </span>
      </footer>
      {toastAlert && (
        <button
          className="alert-toast"
          aria-live="assertive"
          onClick={() => {
            if (toastAlert.entity) s.select(toastAlert.entity);
            router.push("/control");
          }}
        >
          <strong>CRITICAL · {toastAlert.title}</strong>
          <span>{toastAlert.detail}</span>
          <small>Open incident →</small>
        </button>
      )}
      {presenter && MODE === "simulation" && (
        <div className="presenter-panel">
          <div className="section-heading">
            <strong>Stage demo</strong>
            <button
              className="icon-button"
              aria-label="Close demo controls"
              onClick={() => setPresenter(false)}
            >
              <X size={17} />
            </button>
          </div>
          <p>Jump to a repeatable scene. Shift+1–6 works from any portal.</p>
          <button
            className="stage-run-button"
            onClick={() => {
              if (stageRunning) {
                setStageRunning(false);
              } else {
                usePort.getState().reset();
                usePort.getState().setSpeed(1);
                setStageRunning(true);
                router.push("/control");
                setPresenter(false);
              }
            }}
          >
            {stageRunning ? "Stop Stage Demo" : "Run Stage Demo · 5 minutes"}
          </button>
          {[
            "Calm overview",
            "Inspect",
            "Docking",
            "Safety breach",
            "Decide",
            "Scale",
          ].map((label, i) => (
            <button
              key={label}
              className={s.scene === i + 1 ? "active" : ""}
              onClick={() => {
                setStageRunning(false);
                s.jump(i + 1);
                router.push(i === 5 ? "/group" : "/control");
              }}
            >
              <span>{i + 1}</span>
              {label}
            </button>
          ))}
          <button
            className="reset-button"
            onClick={() => {
              setStageRunning(false);
              s.reset();
              router.push("/control");
            }}
          >
            <RotateCcw size={15} /> Reset full simulation
          </button>
        </div>
      )}
      {alertsOpen && (
        <div className="alerts-popover">
          <div className="section-heading">
            <strong>Notification centre</strong>
            <button
              className="icon-button"
              aria-label="Close notifications"
              onClick={() => setAlertsOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          {s.alerts.length ? (
            s.alerts
              .slice()
              .reverse()
              .map((a) => (
                <div className="notification" key={a.id}>
                  <span className={`badge ${a.severity}`}>{a.severity}</span>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                  <div>
                    <button
                      onClick={() => {
                        if (a.entity) {
                          s.select(a.entity);
                          router.push("/control");
                          setAlertsOpen(false);
                        }
                      }}
                    >
                      Inspect
                    </button>
                    {a.status === "open" && (
                      <button onClick={() => s.acknowledge(a.id)}>
                        Acknowledge
                      </button>
                    )}
                    {a.status !== "resolved" && (
                      <button onClick={() => s.resolve(a.id)}>Resolve</button>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <p>No alerts.</p>
          )}
        </div>
      )}
      <dialog
        ref={helpDialogRef}
        className="help-modal"
        aria-label="Keyboard shortcuts"
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            helpDialogRef.current
              ?.querySelector<HTMLButtonElement>(".close-modal")
              ?.focus();
          }
        }}
        onClose={() => {
          setHelp(false);
          requestAnimationFrame(() => helpTriggerRef.current?.focus());
        }}
      >
        <button
          className="icon-button close-modal"
          aria-label="Close keyboard shortcuts"
          onClick={() => setHelp(false)}
        >
          <X size={18} />
        </button>
        <h2>Keyboard shortcuts</h2>
        <p>
          <kbd>/</kbd> Copilot · <kbd>Esc</kbd> Close top panel · <kbd>D</kbd>{" "}
          Stage controls
        </p>
        <p>
          <kbd>1–4</kbd> Control / Berths / Yard / Safety
        </p>
        <p>
          <kbd>Shift+1–6</kbd> Jump to stage scene
        </p>
      </dialog>
      <Inspector onAsk={() => setCopilot(true)} />
      <Copilot key={s.scene} open={copilot} onClose={() => setCopilot(false)} />
    </div>
  );
}
