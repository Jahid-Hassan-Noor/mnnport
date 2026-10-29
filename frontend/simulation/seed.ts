import type { PortSnapshot, Position, Container, Vehicle, Worker, Zone, Crane, Berth, Vessel } from "@/lib/contracts/domain";
import { YARD_BAYS_PER_ROW, YARD_BAY_PITCH, YARD_FIRST_BAY_X, YARD_ROW_Y } from "@/simulation/map-visuals";

const START = "2026-10-28T00:00:00.000Z";
export function isoAt(seconds: number) { return new Date(Date.parse(START) + seconds * 1000).toISOString(); }
function rng(seed: number) { let value=seed; return () => { value=(value*1664525+1013904223)>>>0; return value/4294967296; }; }
const rectangle = (x: number,y: number,w: number,h: number): Position[] => [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
export function createSeed(): PortSnapshot {
  const random=rng(20261028);
  const berths: Record<string,Berth>={};
  for(let i=1;i<=4;i++) berths[`B${i}`]={id:`B${i}`,label:`Berth ${i}`,status:i===1||i===4?"occupied":i===2?"reserved":"available",occupantId:i===1?"V-OG":i===4?"V-LD":undefined,craneIds:i===1?["QC-01","QC-02"]:i===2?["QC-03","QC-04"]:i===3?["QC-05"]:["QC-06"],position:{x:165+(i-1)*190,y:205}};
  const vessels: Record<string,Vessel>={
    "V-KP":{id:"V-KP",name:"MV Kedah Pearl",type:"Container ship",imo:"IMO 9001001 (fictional)",origin:"Shanghai",destination:"Colombo via Selat",eta:isoAt(6300),berthId:"B2",status:"approaching",delayMinutes:0,discharge:740,load:520,clearance:"Illustrative pre-arrival check",operator:"Selat Demo Line",position:{x:500,y:95}},
    "V-OG":{id:"V-OG",name:"MV Orient Gale",type:"Container ship",imo:"IMO 9001002 (fictional)",origin:"Singapore",destination:"Selat Terminal",eta:isoAt(7200),berthId:"B1",status:"berthed",delayMinutes:24,discharge:610,load:480,clearance:"Illustrative cleared",operator:"Selat Demo Line",position:{x:170,y:145}},
    "V-LD":{id:"V-LD",name:"MV Langkawi Dawn",type:"Feeder",imo:"IMO 9001003 (fictional)",origin:"Selat Terminal",destination:"Penang",eta:isoAt(0),berthId:"B4",status:"departing",delayMinutes:0,discharge:200,load:180,clearance:"Illustrative cleared",operator:"Coastal Demo Line",position:{x:745,y:155}},
  };
  const cranes: Record<string,Crane>={};
  for(let i=1;i<=6;i++) { const id=`QC-${String(i).padStart(2,"0")}`; cranes[id]={id,label:`Quay Crane ${i}`,type:"quay",status:i===3?"active":i===6?"idle":"active",movesPerHour:i===3?22:24+i%3,position:{x:125+(i-1)*130,y:258},certificateExpiry:"2027-08-31",nextJob:`Move batch ${i+12}`,exclusionZoneId:`EX-${i}`}; }
  for(let i=1;i<=8;i++) { const id=`YC-${String(i).padStart(2,"0")}`; cranes[id]={id,label:`Yard Crane ${i}`,type:"yard",status:i===8?"idle":"active",movesPerHour:15+i%4,position:{x:180+(i%4)*170,y:390+Math.floor((i-1)/4)*125},certificateExpiry:"2027-10-15",nextJob:`Stack ${i*7}`}; }
  const zones: Record<string,Zone>={};
  for(let i=1;i<=6;i++) zones[`EX-${i}`]={id:`EX-${i}`,label:`Crane ${i} exclusion`,kind:"exclusion",polygon:rectangle(100+(i-1)*130,244,75,57),active:i!==6,craneId:`QC-${String(i).padStart(2,"0")}`};
  for(let i=1;i<=3;i++) zones[`WALK-${i}`]={id:`WALK-${i}`,label:`Walkway ${i}`,kind:"walkway",polygon:rectangle(95,312+(i-1)*112,700,12),active:true};
  for(let i=1;i<=3;i++) zones[`RES-${i}`]={id:`RES-${i}`,label:`Restricted yard ${i}`,kind:"restricted",polygon:rectangle(140+(i-1)*220,575,100,48),active:true};
  const vehicles: Record<string,Vehicle>={};
  for(let i=1;i<=40;i++) { const id=`PM-${String(i).padStart(2,"0")}`, type=i<=24?"prime mover":i<=32?"AGV":i<=36?"reach stacker":"truck"; const electric=i<=20; const lane=[286,461,636,815][(i-1)%4]; vehicles[id]={id,type,electric,battery:electric?45+Math.floor(random()*50):undefined,status:i===8?"fault":i===16?"charging":"active",task:i<=2?"Yard C dispatch standby":`Container cycle ${i}`,assignment:i<=2?"Yard C":i%3===0?"Berth 2":"Yard A",route:[{x:lane,y:330},{x:815,y:330},{x:815,y:610},{x:lane,y:610},{x:lane,y:330}],speedKph:18+i%11}; }
  const workers: Record<string,Worker>={};
  const names=["Aida","Haris","Mira","Faris","Nadia","Irfan","Lina","Rafiq","Sara","Danial"];
  for(let i=1;i<=60;i++) { const id=`W-${String(i).padStart(3,"0")}`, index=i-1,block=Math.floor(index/15),walk=index%3+1,x=145+block*175+(index%5)*18,y=[318,430,542][walk-1]; const route=[{x,y},{x:x+18,y},{x,y}]; workers[id]={id,name:`${names[index%names.length]} Demo ${i}`,role:i%5===0?"Contractor":"Terminal operator",employer:i%5===0?"Fictional contractor Co.":"Selat Terminal Demo",contractor:i%5===0,shift:"08:00–16:00 MYT",task:walk===1?"Quay observation":"Yard check",zoneId:`WALK-${walk}`,status:"safe",position:route[0],route,gpsTrackerId:`GPS-${id}`,certificateExpiry:"2027-04-30"}; }
  const containers: Record<string,Container>={};
  for(let i=0;i<2000;i++) { const blockIndex=Math.floor(i/500),block=["A","B","C","D"][blockIndex],local=i%500,slot=Math.floor(local/5),row=Math.floor(slot/YARD_BAYS_PER_ROW)+1,bay=slot%YARD_BAYS_PER_ROW+1,tier=local%5+1; const id=`SLTU${String(1000000+i).padStart(7,"0")}`; containers[id]={id,size:slot%3===0?"40ft":"20ft",type:i%11===0?"reefer":"dry",vesselId:i%4===0?"V-OG":"V-KP",block,row,bay,tier,status:i%137===0?"hold":"stacked",lastMove:isoAt(-3600-(i%20)*60),hold:i%137===0,position:{x:YARD_FIRST_BAY_X+blockIndex*175+(bay-1)*YARD_BAY_PITCH,y:YARD_ROW_Y[row-1]}}; }
  for(let i=1;i<=40;i++) {
    const vehicle=vehicles[`PM-${String(i).padStart(2,"0")}`];
    if(vehicle.type==="reach stacker"||i%3!==1) continue;
    let containerIndex=100+i*43;
    while(containers[`SLTU${1000000+containerIndex}`].hold||containers[`SLTU${1000000+containerIndex}`].size!=="40ft"||containers[`SLTU${1000000+containerIndex}`].tier!==5) containerIndex++;
    const container=containers[`SLTU${1000000+containerIndex}`];
    vehicle.containerId=container.id;
    container.status="moving";
    container.lastMove=isoAt(0);
  }
  return {terminalId:"selat-terminal",sequence:0,simSeconds:0,scene:1,speed:1,paused:false,role:"presenter",vessels,berths,cranes,vehicles,workers,containers,zones,alerts:[{id:"AL-BASE",severity:"advisory",title:"Berth 2 arrival watch",detail:"Kedah Pearl is approaching the pilotage zone.",entity:{type:"vessel",id:"V-KP"},position:{x:500,y:95},at:isoAt(0),status:"open"}],proposals:[],incidents:[],events:[],gate:{queue:18,laneCapacity:4,appointments:64,throughputPerHour:74},energy:{kwhToday:2140,electricMoves:182,totalMoves:286,chargingBaysUsed:2},moves:286,cyberAssets:[{id:"OT-01",name:"Quay telemetry gateway",status:"Healthy"},{id:"OT-02",name:"Gate access network",status:"Healthy"},{id:"OT-03",name:"Yard dispatcher",status:"Healthy"}]};
}
