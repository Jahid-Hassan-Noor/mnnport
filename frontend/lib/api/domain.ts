import type { Alert, Berth, Container, Crane, EnergyState, EventBatch, GateState, Incident, Proposal, Vehicle, Vessel, Worker, Zone } from "@/lib/contracts/domain";
import { apiFetch, queryString } from "./api-fetch";
type Page<T>={results:T[];next:string|null;count:number};
export const domainApi={
  vessels:(terminalId:string,search?:string)=>apiFetch<Page<Vessel>>(`vessels/?${queryString({terminal:terminalId,search})}`),
  berths:(terminalId:string)=>apiFetch<Page<Berth>>(`berths/?${queryString({terminal:terminalId})}`),
  equipment:(terminalId:string)=>apiFetch<Page<Crane|Vehicle>>(`equipment/?${queryString({terminal:terminalId})}`),
  workers:(terminalId:string)=>apiFetch<Page<Worker>>(`workers/?${queryString({terminal:terminalId})}`),
  containers:(terminalId:string,search?:string)=>apiFetch<Page<Container>>(`containers/?${queryString({terminal:terminalId,search})}`),
  zones:(terminalId:string)=>apiFetch<Page<Zone>>(`zones/?${queryString({terminal:terminalId})}`),
  alerts:(terminalId:string)=>apiFetch<Page<Alert>>(`alerts/?${queryString({terminal:terminalId})}`),
  proposals:(terminalId:string)=>apiFetch<Page<Proposal>>(`proposals/?${queryString({terminal:terminalId})}`),
  incidents:(terminalId:string)=>apiFetch<Page<Incident>>(`incidents/?${queryString({terminal:terminalId})}`),
  events:(terminalId:string,after:number)=>apiFetch<EventBatch>(`terminals/${encodeURIComponent(terminalId)}/events/?${queryString({after})}`),
  gate:(terminalId:string)=>apiFetch<GateState>(`gate/?${queryString({terminal:terminalId})}`),
  energy:(terminalId:string)=>apiFetch<EnergyState>(`energy/?${queryString({terminal:terminalId})}`),
};
