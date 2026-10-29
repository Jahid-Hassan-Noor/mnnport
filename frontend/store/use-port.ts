"use client";
import { create } from "zustand";
import type { EntityRef, PortSnapshot, Role } from "@/lib/contracts/domain";
import { advanceStage, approveProposal, createProposal, dismissProposal, enterScene, injectCyberTest, replanBerth, requestModification, resolveAlert, tick } from "@/simulation/engine";
import { canPerform } from "@/lib/permissions";

type PortStore = PortSnapshot & {
  setRole:(role:Role)=>void; select:(entity?:EntityRef)=>void; jump:(scene:number)=>void; reset:()=>void; advance:(steps?:number)=>void; nextStage:()=>void;
  setPaused:(paused:boolean)=>void; setSpeed:(speed:1|2|5)=>void; approve:(id:string)=>void; dismiss:(id:string)=>void; requestModification:(id:string,note:string)=>void;
  replan:(vesselId:string,berthId:string)=>void; resolve:(id:string)=>void; acknowledge:(id:string)=>void; injectCyber:()=>void; updateGate:()=>void; proposeRecovery:()=>void;
};
const initial=enterScene(1);
export const usePort=create<PortStore>((set,get)=>({
  ...initial,
  setRole:role=>set({role,selected:undefined}), select:selected=>set({selected}),
  jump:scene=>set({...enterScene(scene,get().role)}), reset:()=>set({...enterScene(1,get().role)}),
  nextStage:()=>set(s=>advanceStage(s)),
  advance:(steps=1)=>set(s=>tick(s,steps)), setPaused:paused=>set({paused}), setSpeed:speed=>set({speed}),
  approve:id=>set(s=>approveProposal(s,id,s.role)), dismiss:id=>set(s=>dismissProposal(s,id,s.role)),
  requestModification:(id,note)=>set(s=>requestModification(s,id,note,s.role)),
  replan:(vesselId,berthId)=>set(s=>replanBerth(s,vesselId,berthId,s.role)),
  resolve:id=>set(s=>resolveAlert(s,id,s.role)),
  acknowledge:id=>set(s=>({...s,alerts:s.alerts.map(a=>a.id===id&&a.status==="open"?{...a,status:"acknowledged"}:a)})),
  injectCyber:()=>set(s=>injectCyberTest(s,s.role)),
  proposeRecovery:()=>set(s=>createProposal(s,"recover_delay")),
  updateGate:()=>set(s=>canPerform(s.role,"release_gate")?({...s,gate:{...s.gate,queue:Math.max(0,s.gate.queue-4)},sequence:s.sequence+1,events:[...s.events,{id:`EV-${s.sequence+1}`,type:"GATE_UPDATE",at:new Date(Date.parse("2026-10-28T00:00:00Z")+s.simSeconds*1000).toISOString(),actor:s.role,detail:"Four trucks released through available appointment lanes"}]}):s),
}));
