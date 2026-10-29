import type { ApiError } from "@/lib/contracts/domain";
export class PortApiError extends Error { constructor(public status:number,public envelope:ApiError){super(envelope.message)} }
export function queryString(params:Record<string,string|number|undefined>){const query=new URLSearchParams();Object.entries(params).forEach(([key,value])=>{if(value!==undefined)query.set(key,String(value))});return query.toString()}
function csrfToken(){if(typeof document==="undefined")return undefined;return document.cookie.split("; ").find(x=>x.startsWith("pc_csrf="))?.split("=")[1]}
export async function apiFetch<T>(path:string,init:RequestInit={}):Promise<T>{
  const clean=path.replace(/^\/+/,"");
  if(!clean||clean.includes("..")||clean.includes("\\"))throw new PortApiError(400,{code:"INVALID_PATH",message:"Invalid API path"});
  const method=(init.method||"GET").toUpperCase();
  const headers=new Headers(init.headers);
  if(!["GET","HEAD","OPTIONS"].includes(method)){const token=csrfToken();if(token)headers.set("X-CSRF-Token",token);}
  const response=await fetch(`/gateway/backend/${clean}`,{...init,method,headers,credentials:"same-origin",cache:"no-store"});
  const contentType=response.headers.get("content-type")||"";
  const body=contentType.includes("application/json")?await response.json():null;
  if(!response.ok){const envelope=(body?.error||{code:"REQUEST_FAILED",message:`Request failed (${response.status})`}) as ApiError;throw new PortApiError(response.status,envelope)}
  return body as T;
}
