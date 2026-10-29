"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bot, Download, Filter, Search } from "lucide-react";
import { usePort } from "@/store/use-port";
import { useShallow } from "zustand/react/shallow";
import { canPerform, canSeeExactWorkerPosition } from "@/lib/permissions";
import { workerPosition } from "@/simulation/geometry";
import type { Severity } from "@/lib/contracts/domain";

function Header({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="portal-heading">
      <div>
        <span className="eyebrow">{eyebrow} · SIMULATED DATA</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
function StoryPanel({
  label,
  title,
  description,
  children,
  action,
  tone = "teal",
}: {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "teal" | "amber" | "red";
}) {
  return (
    <section className={`story-panel ${tone}`} aria-label={label}>
      <div className="story-copy">
        <span className="eyebrow">{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
        {action && <div className="story-action">{action}</div>}
      </div>
      {children && <div className="story-facts">{children}</div>}
    </section>
  );
}
function StoryFact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="story-fact">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
const myTime = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({ message }: { message: string }) {
  return <p className="empty-state">{message}</p>;
}
function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const severityTone = (severity: Severity) => severity;

const GROUP = [
  {
    name: "Port of Tanjung Pelepas",
    short: "PTP",
    teu: "14,028,375 TEU",
    kpi: 92,
    wait: 18,
    region: "Johor",
  },
  {
    name: "Northport",
    short: "NORTHPORT",
    teu: "~3.80m TEU",
    kpi: 87,
    wait: 24,
    region: "Port Klang",
  },
  {
    name: "Johor Port",
    short: "JOHOR PORT",
    teu: "~1.08m TEU",
    kpi: 84,
    wait: 28,
    region: "Johor",
  },
  {
    name: "Penang Port",
    short: "PENANG PORT",
    teu: "2025 TEU not cited",
    kpi: 80,
    wait: 32,
    region: "Penang",
  },
  {
    name: "Tanjung Bruas Port",
    short: "TANJUNG BRUAS",
    teu: "31,032 TEU",
    kpi: 76,
    wait: 36,
    region: "Melaka",
  },
];
export function GroupView() {
  const [selected, setSelected] = useState(GROUP[0].short),
    router = useRouter(),
    item = GROUP.find((x) => x.short === selected)!;
  return (
    <div className="portal-page">
      <Header
        eyebrow="GROUP EXECUTIVE"
        title="Five sea ports. One view."
        description="Illustrative comparison for the five named MMC sea ports. Selat Terminal is a separate fictional demonstration terminal."
      />
      <div className="group-grid">
        {GROUP.map((port, i) => (
          <button
            className={`port-tile ${selected === port.short ? "selected" : ""}`}
            key={port.short}
            onClick={() => setSelected(port.short)}
          >
            <div className="port-tile-top">
              <span className="eyebrow">
                0{i + 1} / {port.region}
              </span>
              <Badge tone="amber">Illustrative data</Badge>
            </div>
            <h2>{port.name}</h2>
            <div className="port-tile-metric">
              <strong>{port.kpi}%</strong>
              <span>simulated berth availability</span>
            </div>
            <div className="tile-foot">
              <span>2025 reference: {port.teu}</span>
              <ArrowRight size={17} />
            </div>
          </button>
        ))}
      </div>
      <div className="two-column">
        <Card title={`${item.name} · illustrative drill-down`}>
          <div className="stats-row">
            <Stat
              label="Berth availability"
              value={`${item.kpi}%`}
              detail="Simulated"
            />
            <Stat
              label="Average wait"
              value={`${item.wait} min`}
              detail="Simulated"
            />
            <Stat
              label="Open advisories"
              value={Math.max(
                1,
                6 - GROUP.findIndex((x) => x.short === item.short),
              )}
              detail="Simulated"
            />
          </div>
          <p className="muted">
            This tile is an illustrative network comparison. It does not
            represent a connected system at {item.name}.
          </p>
          <button className="button" onClick={() => router.push("/control")}>
            Explore fictional Selat Terminal demo <ArrowRight size={15} />
          </button>
        </Card>
        <Card title="Reference boundary">
          <p>
            The TEU references are historical figures quoted on pages 1–2 of the
            supplied MMC pitch. Penang Port has no cited 2025 TEU figure there;
            its ferry passengers are a separate measure.
          </p>
          <p className="muted">
            All operational comparisons, statuses and rankings shown here are
            simulated.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function BerthsView() {
  const s = usePort(
      useShallow((state) => ({
        berths: state.berths,
        replan: state.replan,
        role: state.role,
        select: state.select,
        vessels: state.vessels,
      })),
    ),
    params = useSearchParams(),
    [pending, setPending] = useState<{
      vesselId: string;
      berthId: string;
    } | null>(null),
    [selected, setSelected] = useState("V-KP"),
    [targetBerth, setTargetBerth] = useState(""),
    [replanNotice, setReplanNotice] = useState("");
  const vessels = Object.values(s.vessels),
    preview = params.get("preview") === "20";
  const canReplan = canPerform(s.role, "replan_berth");
  const selectedVessel = s.vessels[selected];
  const availableBerths = Object.values(s.berths).filter(
    (berth) => !berth.occupantId && berth.status === "available",
  ).length;
  const proposeReplan = (vesselId: string, berthId: string) => {
    const berth = s.berths[berthId];
    if (!canReplan) {
      setReplanNotice(
        "This demo role can inspect the plan but cannot replan a berth.",
      );
      return;
    }
    if (!berth || (berth.occupantId && berth.occupantId !== vesselId)) {
      setReplanNotice(`${berthId} is occupied. Choose an available berth.`);
      return;
    }
    if (s.vessels[vesselId]?.berthId === berthId) {
      setReplanNotice(
        `${s.vessels[vesselId].name} is already assigned to ${berthId}.`,
      );
      return;
    }
    setReplanNotice("");
    setPending({ vesselId, berthId });
  };
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="PLANNING"
        title="Vessel & berth planning"
        description="Review the arrival, compare berth options and confirm an assignment in the shared simulation."
      />
      <StoryPanel
        label="BERTH DECISION"
        title={`${selectedVessel.name} · ${selectedVessel.status} for ${selectedVessel.berthId || "an open berth"}`}
        description="The berth timeline is the working plan. Select a vessel and an available alternative below to review a change before it is applied."
      >
        <StoryFact
          label="Assigned berth"
          value={selectedVessel.berthId || "—"}
        />
        <StoryFact label="Open alternatives" value={availableBerths} />
        <StoryFact
          label="Projected delay"
          value={`${selectedVessel.delayMinutes} min`}
          detail="Illustrative"
        />
      </StoryPanel>
      {preview && (
        <div className="inline-note">
          What-if preview: Orient Gale arrives 20 minutes later. Projected delay
          becomes {s.vessels["V-OG"].delayMinutes + 20} min. No live assignment
          has changed.
        </div>
      )}
      <div className="berth-focus">
        <Card title="Berth timeline">
          <div className="berth-replan-form">
            <label>
              Vessel
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setTargetBerth("");
                  setPending(null);
                  setReplanNotice("");
                }}
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target berth
              <select
                value={targetBerth}
                onChange={(e) => setTargetBerth(e.target.value)}
              >
                <option value="">Choose a berth</option>
                {Object.values(s.berths).map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={
                      b.id === s.vessels[selected]?.berthId ||
                      Boolean(b.occupantId && b.occupantId !== selected)
                    }
                  >
                    {b.id} ·{" "}
                    {b.id === s.vessels[selected]?.berthId
                      ? "current berth"
                      : b.occupantId && b.occupantId !== selected
                        ? "occupied"
                        : "available"}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={
                !canReplan ||
                !targetBerth ||
                s.vessels[selected]?.berthId === targetBerth ||
                Boolean(
                  s.berths[targetBerth]?.occupantId &&
                    s.berths[targetBerth].occupantId !== selected,
                )
              }
              onClick={() => proposeReplan(selected, targetBerth)}
            >
              Review replan
            </button>
          </div>
          {!canReplan && (
            <p className="inline-note">
              This demo role can inspect the berth plan but cannot change it.
            </p>
          )}
          {replanNotice && (
            <p className="inline-note" role="status">
              {replanNotice}
            </p>
          )}
          <div className="timeline-scale">
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
          </div>
          {Object.values(s.berths).map((b) => (
            <div
              className="berth-row"
              key={b.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const vesselId = e.dataTransfer.getData("text/vessel-id");
                if (vesselId) proposeReplan(vesselId, b.id);
              }}
            >
              <button onClick={() => s.select({ type: "berth", id: b.id })}>
                {b.id}
              </button>
              <div className="berth-track">
                {b.occupantId ? (
                  <button
                    className="vessel-bar"
                    draggable={canReplan}
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/vessel-id", b.occupantId!)
                    }
                    onClick={() => {
                      setSelected(b.occupantId!);
                      s.select({ type: "vessel", id: b.occupantId! });
                    }}
                  >
                    {s.vessels[b.occupantId].name}
                    <small>{b.status}</small>
                  </button>
                ) : (
                  <span className="drop-hint">
                    Drop vessel here · {b.status}
                  </span>
                )}
              </div>
            </div>
          ))}
          {pending && (
            <div className="confirmation inline">
              <p>
                Move {s.vessels[pending.vesselId]?.name} to {pending.berthId}?
                This changes the shared simulated berth plan.
              </p>
              <button
                onClick={() => {
                  s.replan(pending.vesselId, pending.berthId);
                  if (
                    usePort.getState().vessels[pending.vesselId]?.berthId ===
                    pending.berthId
                  ) {
                    setReplanNotice(
                      `${s.vessels[pending.vesselId].name} is now assigned to ${pending.berthId}.`,
                    );
                    setPending(null);
                  } else {
                    setReplanNotice(
                      "The berth plan did not change. Check role and berth availability.",
                    );
                  }
                }}
              >
                Confirm replan
              </button>
              <button onClick={() => setPending(null)}>Revert</button>
            </div>
          )}
        </Card>
      </div>
      <div className="supporting-grid berth-supporting">
        <Card title="Vessel details">
          <div className="select-row">
            <label>
              Vessel{" "}
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {vessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(() => {
            const v = s.vessels[selected];
            return (
              <div className="detail-list">
                <div>
                  <span>Status</span>
                  <strong>{v.status}</strong>
                </div>
                <div>
                  <span>Berth</span>
                  <strong>{v.berthId}</strong>
                </div>
                <div>
                  <span>ETA drift</span>
                  <strong>{v.delayMinutes} min</strong>
                </div>
                <div>
                  <span>Discharge / load</span>
                  <strong>
                    {v.discharge} / {v.load}
                  </strong>
                </div>
                <div>
                  <span>Clearance</span>
                  <strong>{v.clearance}</strong>
                </div>
              </div>
            );
          })()}
        </Card>
        <Card title="Arrival board">
          <MiniTable
            headers={["Vessel", "Route", "Berth", "Status", "Predicted delay"]}
            rows={vessels.map((v) => [
              <button
                className="table-link"
                onClick={() => s.select({ type: "vessel", id: v.id })}
                key={v.id}
              >
                {v.name}
              </button>,
              `${v.origin} → ${v.destination}`,
              v.berthId,
              v.status,
              `${v.delayMinutes} min · simulated`,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}

export function YardView() {
  const s = usePort(
      useShallow((state) => ({
        containers: state.containers,
        cranes: state.cranes,
        proposals: state.proposals,
        proposeRecovery: state.proposeRecovery,
        jump: state.jump,
        select: state.select,
        vehicles: state.vehicles,
        vessels: state.vessels,
      })),
    ),
    [filter, setFilter] = useState("");
  const vehicles = Object.values(s.vehicles).filter((v) =>
    `${v.id} ${v.type} ${v.assignment} ${v.status}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const blocks = ["A", "B", "C", "D"].map((block) => ({
    id: block,
    onGround: Object.values(s.containers).filter(
      (container) => container.block === block && container.status !== "moving",
    ).length,
  }));
  const craneHeld = s.cranes["QC-03"].status === "hold";
  const recovery = s.proposals.find(
    (proposal) => proposal.kind === "recover_delay",
  );
  const moversReassigned = ["PM-01", "PM-02"].filter(
    (id) => s.vehicles[id].assignment === "Berth 2",
  ).length;
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="YARD OPERATIONS"
        title="Yard & equipment"
        description="See the equipment constraint, proposed recovery and resulting dispatch in one place."
      />
      <StoryPanel
        label="RECOVERY DECISION"
        tone={craneHeld ? "amber" : "teal"}
        title={
          recovery?.status === "approved"
            ? "Recovery approved; dispatch has changed"
            : craneHeld
              ? "Crane 3 is on a safety hold"
              : "Yard equipment is operating normally"
        }
        description={
          craneHeld
            ? "Review the two-mover recovery proposal before changing the shared dispatch. The crane hold remains visible."
            : "Open the Crane 3 disruption scene to demonstrate how safety, dispatch and projected delay connect."
        }
        action={
          !craneHeld ? (
            <button className="button" onClick={() => s.jump(4)}>
              Open disruption scenario
            </button>
          ) : !recovery ? (
            <button
              className="button primary"
              onClick={() => s.proposeRecovery()}
            >
              <Bot size={16} /> Create recovery proposal
            </button>
          ) : (
            <span className="data-note">
              Proposal {recovery.status}. Open Port Command to review its
              evidence.
            </span>
          )
        }
      >
        <StoryFact label="Crane 3" value={s.cranes["QC-03"].status} />
        <StoryFact
          label="Projected vessel delay"
          value={`${s.vessels["V-OG"].delayMinutes} min`}
          detail="Illustrative"
        />
        <StoryFact
          label="Movers reassigned"
          value={`${moversReassigned} / 2`}
        />
      </StoryPanel>
      <div className="two-column">
        <Card title="Containers on ground by yard block">
          <div className="yard-block-grid">
            {blocks.map((block) => (
              <button
                key={block.id}
                className="yard-block"
                onClick={() => setFilter(`Yard ${block.id}`)}
              >
                <strong>YARD {block.id}</strong>
                <span>{block.onGround} / 500</span>
                <div className="stack-grid">
                  {Array.from({ length: 50 }, (_, j) => (
                    <i
                      key={j}
                      className={
                        j < Math.round(block.onGround / 10) ? "filled" : ""
                      }
                    />
                  ))}
                </div>
                <small>Seeded positions · click to filter dispatch</small>
              </button>
            ))}
          </div>
          <p className="data-note">
            Counts come from container records in this scene; moving containers
            are excluded.
          </p>
        </Card>
        <Card title="Crane status">
          <MiniTable
            headers={["ID", "Type", "Status", "Moves/h"]}
            rows={Object.values(s.cranes).map((c) => [
              <button
                key={c.id}
                className="table-link"
                onClick={() => s.select({ type: "crane", id: c.id })}
              >
                {c.id}
              </button>,
              c.type,
              <Badge
                key={c.id + "status"}
                tone={
                  c.status === "hold"
                    ? "critical"
                    : c.status === "fault"
                      ? "amber"
                      : "green"
                }
              >
                {c.status}
              </Badge>,
              c.movesPerHour,
            ])}
          />
        </Card>
      </div>
      <Card title="Vehicle dispatch">
        <div className="toolbar">
          <Search size={16} />
          <input
            aria-label="Filter dispatch"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search ID, assignment or status"
          />
          <button onClick={() => setFilter("")}>Clear</button>
        </div>
        {vehicles.length ? (
          <MiniTable
            headers={["Vehicle", "Type", "Assignment", "Task", "Status"]}
            rows={vehicles.slice(0, 40).map((v) => [
              <button
                className="table-link"
                key={v.id}
                onClick={() => s.select({ type: "vehicle", id: v.id })}
              >
                {v.id}
              </button>,
              v.type,
              v.assignment,
              v.task,
              <Badge
                key={v.id + "s"}
                tone={v.status === "fault" ? "amber" : "green"}
              >
                {v.status}
              </Badge>,
            ])}
          />
        ) : (
          <Empty message="No vehicles match the filter." />
        )}
      </Card>
      {s.proposals
        .filter((p) => p.kind === "recover_delay")
        .map((p) => (
          <div key={p.id} className="inline-note">
            <strong>{p.title}</strong> · {p.status}. Open the copilot to review
            or approve this simulated proposal.
          </div>
        ))}
    </div>
  );
}

export function SafetyView() {
  const s = usePort(
      useShallow((state) => ({
        cranes: state.cranes,
        incidents: state.incidents,
        jump: state.jump,
        proposals: state.proposals,
        role: state.role,
        select: state.select,
        simSeconds: Math.floor(state.simSeconds),
        workers: state.workers,
        zones: state.zones,
      })),
    ),
    params = useSearchParams(),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(params.get("filter") || "all");
  const incidents = s.incidents.filter(
    (i) =>
      (filter === "all" || filter === "last-shift") &&
      `${i.title} ${i.ruleTag} ${i.workerId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const employers = [
    ...new Set(Object.values(s.workers).map((w) => w.employer)),
  ];
  const incident = s.incidents[0];
  const safeLane = s.proposals.find(
    (proposal) => proposal.kind === "safe_lane",
  );
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="HSE"
        title="Safety & workforce"
        description="Follow the rule, equipment hold and human route decision. Worker locations remain scoped to the demo role."
      />
      <StoryPanel
        label="SAFETY RESPONSE"
        tone={incident ? "red" : "teal"}
        title={
          incident
            ? "Crane 3 held after an exclusion breach"
            : "Exclusion zones are being monitored"
        }
        description={
          incident
            ? `${incident.ruleTag} detected a zone breach. The crane was held automatically; a person must review the safe-lane route.`
            : "Open the safety scenario to show how a zone rule stops equipment and creates a reviewable response."
        }
        action={
          !incident ? (
            <button className="button" onClick={() => s.jump(4)}>
              Open safety scenario
            </button>
          ) : (
            <span className="data-note">
              Safe-lane proposal {safeLane?.status || "unavailable"}. Review it
              in Port Command.
            </span>
          )
        }
      >
        <StoryFact
          label="People on shift"
          value={Object.keys(s.workers).length}
        />
        <StoryFact
          label="Active exclusions"
          value={
            Object.values(s.zones).filter(
              (z) => z.kind === "exclusion" && z.active,
            ).length
          }
        />
        <StoryFact label="Crane 3" value={s.cranes["QC-03"].status} />
      </StoryPanel>
      <div className="flow-track" aria-label="Safety response sequence">
        <div className={`flow-step ${incident ? "active" : ""}`}>
          <strong>01</strong>
          <span>Zone rule {incident ? "detected a breach" : "monitoring"}</span>
        </div>
        <div className={`flow-step ${incident ? "active" : ""}`}>
          <strong>02</strong>
          <span>Crane 3 {incident ? "automatically held" : "ready"}</span>
        </div>
        <div
          className={`flow-step ${safeLane?.status === "approved" ? "active" : ""}`}
        >
          <strong>03</strong>
          <span>Safe route {safeLane?.status || "awaiting review"}</span>
        </div>
      </div>
      <div className="two-column">
        <Card title="Zone overview">
          <div className="zone-grid">
            {Object.values(s.zones).map((z) => (
              <div className={`zone-tile ${z.kind}`} key={z.id}>
                <strong>{z.label}</strong>
                <span>
                  {z.active ? "ACTIVE" : "INACTIVE"} · {z.kind}
                </span>
                {z.craneId && <small>{s.cranes[z.craneId]?.status}</small>}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Shift roster by employer">
          {employers.map((employer) => (
            <div className="employer" key={employer}>
              <strong>{employer}</strong>
              <span>
                {
                  Object.values(s.workers).filter(
                    (w) => w.employer === employer,
                  ).length
                }{" "}
                fictional people
              </span>
            </div>
          ))}
          <p className="muted">
            Exact fictional pins are available only to the demo supervisor role.
            Production scope would be server enforced.
          </p>
          <div className="worker-list">
            {Object.values(s.workers)
              .slice(0, 10)
              .map((w) => (
                <button
                  key={w.id}
                  onClick={() => s.select({ type: "worker", id: w.id })}
                >
                  {w.id} · {w.name}
                  <span>
                    {canSeeExactWorkerPosition(s.role)
                      ? `${workerPosition(w, s.simSeconds).x.toFixed(0)},${workerPosition(w, s.simSeconds).y.toFixed(0)}`
                      : w.zoneId}
                  </span>
                </button>
              ))}
          </div>
        </Card>
      </div>
      <Card title="Incident register">
        <div className="toolbar">
          <Filter size={16} />
          <select
            aria-label="Incident filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All incidents</option>
            <option value="last-shift">Last shift</option>
          </select>
          <input
            aria-label="Search incidents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rule or worker"
          />
        </div>
        {incidents.length ? (
          <MiniTable
            headers={["ID", "Incident", "Rule tag", "Evidence", "Status"]}
            rows={incidents.map((i) => [
              i.id,
              i.title,
              i.ruleTag,
              i.evidence.join(" · "),
              <Badge key={i.id} tone="critical">
                {i.status}
              </Badge>,
            ])}
          />
        ) : (
          <Empty message="No incidents match this filter in the current simulation." />
        )}
      </Card>
      <Card title="Certificate watch">
        <MiniTable
          headers={["Asset / person", "Expiry", "Status"]}
          rows={[
            ...Object.values(s.cranes)
              .slice(0, 6)
              .map((c) => [
                c.label,
                c.certificateExpiry,
                <Badge key={c.id} tone="green">
                  Valid · fictional
                </Badge>,
              ]),
            ...Object.values(s.workers)
              .slice(0, 3)
              .map((w) => [
                w.name,
                w.certificateExpiry,
                <Badge key={w.id} tone="green">
                  Valid · fictional
                </Badge>,
              ]),
          ]}
        />
      </Card>
    </div>
  );
}

export function GateView() {
  const s = usePort(
    useShallow((state) => ({
      queue: state.gate.queue,
      laneCapacity: state.gate.laneCapacity,
      appointments: state.gate.appointments,
      throughputPerHour: state.gate.throughputPerHour,
      events: state.events,
      role: state.role,
      updateGate: state.updateGate,
    })),
  );
  const releases = s.events.filter((event) => event.type === "GATE_UPDATE");
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="LANDSIDE"
        title="Gate & landside"
        description="See the appointment load, active lanes and the effect of each simulated batch release."
        action={
          <button
            className="button primary"
            disabled={!canPerform(s.role, "release_gate")}
            title={
              !canPerform(s.role, "release_gate")
                ? "This demo role cannot release a gate batch"
                : undefined
            }
            onClick={() => s.updateGate()}
          >
            Release next appointment batch
          </button>
        }
      />
      <StoryPanel
        label="GATE DECISION"
        title={
          releases.length
            ? `${releases.length} appointment batch${releases.length === 1 ? "" : "es"} released`
            : `${s.queue} trucks in the simulated queue`
        }
        description={
          releases.length
            ? "The release is recorded in the shared audit trail. Queue movement continues with the simulation clock."
            : "Release a controlled batch to demonstrate how the queue and evidence trail respond."
        }
      >
        <StoryFact label="Current queue" value={s.queue} />
        <StoryFact label="Open lanes" value={s.laneCapacity} />
        <StoryFact label="Appointments" value={s.appointments} />
        <StoryFact label="Throughput / h" value={s.throughputPerHour} />
      </StoryPanel>
      {!canPerform(s.role, "release_gate") && (
        <p className="inline-note">
          This demo role can view gate operations but cannot release a batch.
        </p>
      )}
      <div className="two-column">
        <Card title="Queue and appointment flow">
          <div className="flow-track" aria-label="Gate flow">
            <div className="flow-step active">
              <strong>{s.appointments}</strong>
              <span>Appointments scheduled</span>
            </div>
            <div className="flow-step active">
              <strong>{s.queue}</strong>
              <span>Trucks waiting</span>
            </div>
            <div className="flow-step">
              <strong>{releases.length * 4}</strong>
              <span>Trucks released by demo actions</span>
            </div>
          </div>
          <p className="data-note">
            Four trucks are released per action. Queue movement also follows the
            deterministic simulation clock.
          </p>
        </Card>
        <Card title="Lane status">
          <MiniTable
            headers={["Lane", "Status", "Next window"]}
            rows={[1, 2, 3, 4].map((i) => [
              `G${i}`,
              <Badge key={i} tone="green">
                Open
              </Badge>,
              `${8 + i}:00 MYT`,
            ])}
          />
          <p className="muted">
            Releasing a batch updates the queue and writes a shared event.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function AuditView() {
  const s = usePort(
      useShallow((state) => ({
        alerts: state.alerts,
        events: state.events,
        incidents: state.incidents,
        jump: state.jump,
        proposals: state.proposals,
        role: state.role,
        scene: state.scene,
      })),
    ),
    params = useSearchParams(),
    [filter, setFilter] = useState("all"),
    [exporting, setExporting] = useState(false);
  const events = s.events.filter(
    (e) => filter === "all" || e.type.includes(filter),
  );
  async function exportReport() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PORT COMMAND | MOCK AUDIT REPORT", 16, 22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("SIMULATED DATA - NOT A LEGAL COMPLIANCE CERTIFICATE", 16, 31);
      doc.text(
        `Fictional terminal: Selat Terminal | Scene ${s.scene} | ${new Date().toISOString().slice(0, 10)}`,
        16,
        40,
      );
      doc.text(
        `Incidents: ${s.incidents.length} | Approvals: ${s.proposals.filter((p) => p.status === "approved").length} | Events: ${s.events.length}`,
        16,
        48,
      );
      let y = 61;
      for (const e of s.events.slice(-24)) {
        const lines = doc.splitTextToSize(
          `${e.type} | ${e.at} | ${e.actor} | ${e.detail}`,
          175,
        );
        if (y + lines.length * 5 > 280) {
          doc.addPage();
          y = 22;
        }
        doc.text(lines, 16, y);
        y += lines.length * 5 + 4;
      }
      doc.save(
        `port-command-mock-audit-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="EVIDENCE"
        title="Compliance & audit"
        description="Trace the simulated decision, actor and rule behind each event. The local export is a mock report."
        action={
          <button
            className="button primary"
            onClick={exportReport}
            disabled={exporting}
          >
            <Download size={16} />
            {exporting ? "Preparing…" : "Export mock PDF"}
          </button>
        }
      />
      {params.get("prepare") === "1" && (
        <div className="inline-note">
          Mock report is ready to export from the current simulation state.
        </div>
      )}
      <StoryPanel
        label="EVIDENCE TRAIL"
        title={
          s.events.length
            ? `${s.events.length} events recorded in this scenario`
            : "Open a scenario to create an evidence trail"
        }
        description={
          s.events.length
            ? "Inspect the sequence below before exporting a mock record. Each entry links an action to its actor and rule where available."
            : "The safety scene creates a zone breach, crane hold and human proposal that can be inspected here."
        }
        action={
          !s.events.length ? (
            <button className="button" onClick={() => s.jump(4)}>
              Open safety evidence scenario
            </button>
          ) : undefined
        }
      >
        <StoryFact label="Audit events" value={s.events.length} />
        <StoryFact label="Incidents" value={s.incidents.length} />
        <StoryFact
          label="Approvals"
          value={
            s.proposals.filter((proposal) => proposal.status === "approved")
              .length
          }
        />
      </StoryPanel>
      <Card title="Approval and incident trail">
        <div className="toolbar">
          <Filter size={16} />
          <select
            aria-label="Filter audit events"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All events</option>
            <option value="PROPOSAL">Proposals</option>
            <option value="ZONE">Safety</option>
            <option value="CYBER">Cyber</option>
          </select>
        </div>
        {events.length ? (
          <MiniTable
            headers={["Time (UTC)", "Event", "Actor", "Detail", "Rule"]}
            rows={events
              .slice()
              .reverse()
              .map((e) => [
                e.at.slice(11, 19),
                e.type.replaceAll("_", " "),
                e.actor,
                e.detail,
                e.ruleTag || "—",
              ])}
          />
        ) : (
          <Empty message="No audit events match this filter. Run a stage scene or action to generate a trail." />
        )}
      </Card>
      <details className="evidence-categories">
        <summary>Evidence categories and prototype scope</summary>
        <div className="compliance-grid">
          {[
            {
              name: "Occupational safety",
              rule: "OSH zone and equipment records",
              value: `${s.incidents.length} incident records`,
            },
            {
              name: "Cyber security",
              rule: "Controlled OT event trail",
              value: `${s.alerts.filter((a) => a.ruleTag?.startsWith("CYBER")).length} test events`,
            },
            {
              name: "Privacy / data protection",
              rule: "Demo worker view scope",
              value: canSeeExactWorkerPosition(s.role)
                ? "Supervisor view"
                : "Zone-only view",
            },
            {
              name: "Maritime Single Window",
              rule: "Illustrative vessel clearance",
              value: "Illustrative only",
            },
          ].map((x) => (
            <Card key={x.name} title={x.name}>
              <p>{x.rule}</p>
              <strong className="card-number">{x.value}</strong>
              <span className="muted">Prototype scope</span>
            </Card>
          ))}
        </div>
      </details>
    </div>
  );
}

export function EnergyView() {
  const s = usePort(
    useShallow((state) => ({
      kwhToday: state.energy.kwhToday,
      electricMoves: state.energy.electricMoves,
      totalMoves: state.energy.totalMoves,
      chargingBaysUsed: state.energy.chargingBaysUsed,
      select: state.select,
      vehicles: state.vehicles,
    })),
  );
  const electric = Object.values(s.vehicles).filter((v) => v.electric);
  const batteryBands = [
    { label: "Below 25%", min: 0, max: 24 },
    { label: "25–49%", min: 25, max: 49 },
    { label: "50–74%", min: 50, max: 74 },
    { label: "75% and up", min: 75, max: 100 },
  ].map((band) => ({
    ...band,
    count: electric.filter(
      (vehicle) =>
        typeof vehicle.battery === "number" &&
        vehicle.battery >= band.min &&
        vehicle.battery <= band.max,
    ).length,
  }));
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="SUSTAINABILITY"
        title="Energy & sustainability"
        description="Inspect fleet charge and simulated energy use without implying measured emissions savings."
      />
      <StoryPanel
        label="FLEET READINESS"
        title={`${electric.length} electric vehicles in the simulated fleet`}
        description="Battery bands below are calculated from vehicle records. Energy and move totals come from the current simulation state."
      >
        <StoryFact
          label="Energy today"
          value={`${Math.round(s.kwhToday).toLocaleString()} kWh`}
        />
        <StoryFact label="Electric moves" value={s.electricMoves} />
        <StoryFact
          label="Share of moves"
          value={`${Math.round((s.electricMoves / s.totalMoves) * 100)}%`}
        />
        <StoryFact label="Charging bays" value={`${s.chargingBaysUsed} / 4`} />
      </StoryPanel>
      <div className="two-column">
        <Card title="Fleet battery distribution">
          <div className="battery-bars">
            {batteryBands.map((band) => (
              <div
                className={`battery-row ${band.min === 0 ? "low" : ""}`}
                key={band.label}
              >
                <span>{band.label}</span>
                <div className="battery-track">
                  <span
                    className="battery-fill"
                    style={{
                      width: `${electric.length ? (band.count / electric.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{band.count}</strong>
              </div>
            ))}
          </div>
          <p className="data-note">
            The distribution reflects current fictional vehicle battery values;
            it is not a forecast.
          </p>
        </Card>
        <Card title="Electric fleet">
          <MiniTable
            headers={["Vehicle", "Battery", "Status", "Assignment"]}
            rows={electric.map((v) => [
              <button
                key={v.id}
                className="table-link"
                onClick={() => s.select({ type: "vehicle", id: v.id })}
              >
                {v.id}
              </button>,
              `${v.battery}%`,
              v.status,
              v.assignment,
            ])}
          />
        </Card>
      </div>
      <div className="inline-note">
        Emissions comparisons would require validated energy source and
        equipment factors. No real savings are claimed.
      </div>
    </div>
  );
}

export function CyberView() {
  const s = usePort(
    useShallow((state) => ({
      alerts: state.alerts,
      cyberAssets: state.cyberAssets,
      events: state.events,
      injectCyber: state.injectCyber,
      resolve: state.resolve,
      role: state.role,
    })),
  );
  const alerts = s.alerts.filter((a) => a.ruleTag?.startsWith("CYBER"));
  const canInject = canPerform(s.role, "inject_cyber_test");
  const hasOpenTest = alerts.some((a) => a.status !== "resolved");
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="OT SECURITY"
        title="Cyber & OT security"
        description="Fictional assets and controlled test events demonstrate a traceable response workflow."
        action={
          <button
            className="button primary"
            disabled={!canInject || hasOpenTest}
            title={
              !canInject
                ? "This demo role cannot inject a cyber test"
                : hasOpenTest
                  ? "Resolve the open test event first"
                  : undefined
            }
            onClick={() => s.injectCyber()}
          >
            Inject low-severity test event
          </button>
        }
      />
      {!canInject && (
        <p className="inline-note">
          This demo role can inspect OT events but cannot inject a test event.
        </p>
      )}
      {canInject && hasOpenTest && (
        <p className="inline-note">
          Resolve the open test event before injecting another.
        </p>
      )}
      <StoryPanel
        label="CONTROLLED TEST WORKFLOW"
        tone={hasOpenTest ? "amber" : "teal"}
        title={
          hasOpenTest
            ? "A low-severity OT test event is open"
            : alerts.length
              ? "OT test event resolved and recorded"
              : "OT assets are ready for a controlled test"
        }
        description={
          hasOpenTest
            ? "Resolve the event below to add the final action to the audit trail."
            : "Inject a fictional gateway heartbeat event to demonstrate detection, response and traceability."
        }
      >
        <StoryFact label="Fictional assets" value={s.cyberAssets.length} />
        <StoryFact
          label="Open test alerts"
          value={alerts.filter((a) => a.status !== "resolved").length}
        />
        <StoryFact
          label="Audit events"
          value={
            s.events.filter((event) => event.ruleTag?.startsWith("CYBER"))
              .length
          }
        />
      </StoryPanel>
      <div className="two-column">
        <Card title="OT event stream">
          {alerts.length ? (
            alerts.map((a) => (
              <div className="cyber-alert" key={a.id}>
                <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
                <strong>{a.title}</strong>
                <p>{a.detail}</p>
                <span>{a.status}</span>
                {a.status !== "resolved" && (
                  <button className="button" onClick={() => s.resolve(a.id)}>
                    Resolve and log
                  </button>
                )}
              </div>
            ))
          ) : (
            <Empty message="No OT alerts in this simulation. Inject a controlled test event to inspect the workflow." />
          )}
        </Card>
        <Card title="Asset inventory">
          <MiniTable
            headers={["ID", "Asset", "Status"]}
            rows={s.cyberAssets.map((a) => [
              a.id,
              a.name,
              <Badge key={a.id} tone="green">
                {a.status}
              </Badge>,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}

export function ShippingView() {
  const s = usePort(
      useShallow((state) => ({
        containers: state.containers,
        select: state.select,
        vessels: state.vessels,
      })),
    ),
    [query, setQuery] = useState("");
  const vessels = Object.values(s.vessels).filter(
    (v) => v.operator === "Selat Demo Line",
  );
  const accountContainers = Object.values(s.containers).filter((container) =>
    vessels.some((vessel) => vessel.id === container.vesselId),
  );
  const matching = accountContainers
    .filter((container) =>
      container.id.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 10);
  const nextVessel =
    vessels.find(
      (vessel) =>
        vessel.status === "approaching" || vessel.status === "docking",
    ) || vessels[0];
  return (
    <div className="portal-page story-led">
      <Header
        eyebrow="CUSTOMER VIEW"
        title="Shipping line portal"
        description="A role-scoped schedule and container lookup for the fictional Selat Demo Line account."
      />
      <StoryPanel
        label="CUSTOMER JOURNEY"
        title={`${nextVessel.name} · ${nextVessel.status} for ${nextVessel.berthId || "assignment"}`}
        description="Only this fictional line's records are shown. Vessel times below use Malaysia time to match the terminal clock."
      >
        <StoryFact label="Account vessels" value={vessels.length} />
        <StoryFact
          label="Allocated berths"
          value={vessels.filter((vessel) => vessel.berthId).length}
        />
        <StoryFact
          label="Container records"
          value={accountContainers.length.toLocaleString()}
        />
      </StoryPanel>
      <Card title="My vessel schedule">
        <MiniTable
          headers={["Vessel", "Route", "Berth", "Status", "ETA (MYT)"]}
          rows={vessels.map((v) => [
            <button
              className="table-link"
              key={v.id}
              onClick={() => s.select({ type: "vessel", id: v.id })}
            >
              {v.name}
            </button>,
            `${v.origin} → ${v.destination}`,
            v.berthId,
            v.status,
            `${myTime.format(new Date(v.eta))} MYT`,
          ])}
        />
      </Card>
      <Card title="Container lookup">
        <div className="toolbar">
          <Search size={16} />
          <input
            aria-label="Search my containers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter fictional container ID"
          />
        </div>
        {query ? (
          matching.length ? (
            <MiniTable
              headers={["Container", "Vessel", "Yard slot", "Status"]}
              rows={matching.map((c) => [
                <button
                  className="table-link"
                  key={c.id}
                  onClick={() => s.select({ type: "container", id: c.id })}
                >
                  {c.id}
                </button>,
                s.vessels[c.vesselId].name,
                `${c.block}-R${c.row}-B${c.bay}-T${c.tier}`,
                c.status,
              ])}
            />
          ) : (
            <Empty message="No container found in this simulated shipping-line account." />
          )
        ) : (
          <Empty message="Search by container ID to view account-scoped fictional records." />
        )}
      </Card>
    </div>
  );
}
