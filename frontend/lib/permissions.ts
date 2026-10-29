import type { Portal, Role } from "./contracts/domain";

export const PORTALS: { id: Portal; label: string; short: string }[] = [
  { id: "control", label: "Terminal Control", short: "Control" },
  { id: "berths", label: "Vessel & Berth", short: "Berths" },
  { id: "yard", label: "Yard & Equipment", short: "Yard" },
  { id: "safety", label: "Safety & Workforce", short: "Safety" },
  { id: "gate", label: "Gate & Landside", short: "Gate" },
  { id: "audit", label: "Compliance & Audit", short: "Audit" },
  { id: "energy", label: "Energy & Sustainability", short: "Energy" },
  { id: "cyber", label: "Cyber & OT", short: "Cyber" },
  { id: "shipping-line", label: "Shipping Line", short: "Shipping" },
  { id: "group", label: "Group Dashboard", short: "Group" },
];
export const ROLES: { id: Role; label: string; portals: Portal[]; exactWorkerPosition: boolean }[] = [
  { id: "presenter", label: "Demo presenter", portals: PORTALS.map(p => p.id), exactWorkerPosition: false },
  { id: "duty_manager", label: "Duty manager", portals: ["control","berths","yard","safety","gate","energy"], exactWorkerPosition: false },
  { id: "berth_planner", label: "Berth planner", portals: ["control","berths","yard"], exactWorkerPosition: false },
  { id: "yard_planner", label: "Yard planner", portals: ["control","yard","berths"], exactWorkerPosition: false },
  { id: "hse_officer", label: "HSE officer", portals: ["control","safety","audit"], exactWorkerPosition: false },
  { id: "gate_controller", label: "Gate controller", portals: ["control","gate"], exactWorkerPosition: false },
  { id: "compliance_officer", label: "Compliance officer", portals: ["audit","safety","cyber","control"], exactWorkerPosition: false },
  { id: "energy_lead", label: "Energy lead", portals: ["energy","yard","control"], exactWorkerPosition: false },
  { id: "cyber_analyst", label: "Cyber analyst", portals: ["cyber","audit","control"], exactWorkerPosition: false },
  { id: "shipping_agent", label: "Shipping line agent", portals: ["shipping-line"], exactWorkerPosition: false },
  { id: "group_executive", label: "Group executive", portals: ["group","control","berths","yard","safety","gate","audit","energy","cyber"], exactWorkerPosition: false },
  { id: "supervisor", label: "Demo supervisor", portals: PORTALS.map(p => p.id), exactWorkerPosition: true },
];
export function canView(role: Role, portal: Portal) { return ROLES.find(r => r.id === role)?.portals.includes(portal) ?? false; }
export function canSeeExactWorkerPosition(role: Role) { return ROLES.find(r => r.id === role)?.exactWorkerPosition ?? false; }
export type DemoAction = "approve_safe_lane" | "approve_recovery" | "replan_berth" | "release_gate" | "inject_cyber_test";
const ROLE_ACTIONS: Record<Role,DemoAction[]> = {
  presenter:["approve_safe_lane","approve_recovery","replan_berth","release_gate","inject_cyber_test"],
  supervisor:["approve_safe_lane","approve_recovery","replan_berth","release_gate","inject_cyber_test"],
  duty_manager:["approve_recovery","replan_berth","release_gate"],
  berth_planner:["replan_berth"],yard_planner:["approve_recovery"],hse_officer:["approve_safe_lane"],
  gate_controller:["release_gate"],compliance_officer:[],energy_lead:[],cyber_analyst:["inject_cyber_test"],shipping_agent:[],group_executive:[],
};
export function canPerform(role:Role,action:DemoAction){return ROLE_ACTIONS[role].includes(action)}
