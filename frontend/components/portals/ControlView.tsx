"use client";
import { useState } from "react";
import { ShieldAlert, Ship, Truck } from "lucide-react";
import { usePort } from "@/store/use-port";
import { useShallow } from "zustand/react/shallow";
import { PortMap } from "@/components/map/PortMap";
import { PortDiorama } from "@/components/scene/PortDiorama";

export function ControlView() {
  const s = usePort(
      useShallow((state) => ({
        alerts: state.alerts,
        events: state.events,
        scene: state.scene,
        selected: state.selected,
        vehicles: state.vehicles,
        vessels: state.vessels,
      })),
    ),
    [twinOverride, setTwinOverride] = useState<{
      context: string;
      visible: boolean;
    } | null>(null);
  const twinContext = `${s.scene}:${s.selected?.type ?? "none"}:${s.selected?.id ?? "none"}`;
  const autoVisible =
    !(s.scene >= 3 && s.scene <= 5) &&
    s.selected?.type !== "vehicle" &&
    s.selected?.type !== "container";
  const showTwin =
    twinOverride?.context === twinContext ? twinOverride.visible : autoVisible;
  return (
    <div className="control-view">
      <div className="control-head">
        <div className="control-title">
          <span className="eyebrow">
            <i className="live-pin" /> TERMINAL CONTROL / SIMULATED DATA
          </span>
          <h1>
            One operating picture<span className="title-accent">.</span>
          </h1>
          <p>A living view of every vessel, lane and decision.</p>
        </div>
        <div className="control-metrics">
          <span>
            <Ship size={15} />{" "}
            {
              Object.values(s.vessels).filter((v) => v.status === "berthed")
                .length
            }{" "}
            berthed
          </span>
          <span>
            <Truck size={15} />{" "}
            {
              Object.values(s.vehicles).filter((v) => v.status === "active")
                .length
            }{" "}
            active vehicles
          </span>
          <span>
            <ShieldAlert size={15} />{" "}
            {s.alerts.filter((a) => a.status !== "resolved").length} alerts
          </span>
        </div>
      </div>
      <div className="control-canvas">
        <PortMap />
        <button
          className="twin-toggle"
          aria-pressed={showTwin}
          onClick={() =>
            setTwinOverride({ context: twinContext, visible: !showTwin })
          }
        >
          {showTwin ? "Hide" : "Show"} 3D twin <span>↗</span>
        </button>
        {showTwin && <PortDiorama variant="inset" scene={s.scene} />}
      </div>
      <div className="control-history">
        <span className="eyebrow">OPERATIONAL HISTORY</span>
        {s.events.length ? (
          s.events
            .slice(-3)
            .reverse()
            .map((e) => (
              <span key={e.id}>
                <b>{e.type.replaceAll("_", " ")}</b> {e.detail}
              </span>
            ))
        ) : (
          <span>
            Simulation ready · vessel and equipment positions are fictional.
          </span>
        )}
      </div>
    </div>
  );
}
