import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl, checkMutation, clearAuthCookies, error, setAuthCookies } from "@/lib/api/server-gateway";

const ALLOWED=new Set(["terminals","vessels","berths","equipment","workers","containers","zones","alerts","proposals","incidents","audits","energy","gate","ports","shipping-line","copilot"]);
async function proxy(request:NextRequest,context:{params:Promise<{path?:string[]}>}){
  if(process.env.NEXT_PUBLIC_PORT_COMMAND_MODE!=="api")return error(409,"SIMULATION_MODE","Backend proxy is disabled in simulation mode");
  const segments=(await context.params).path||[];
  if(!segments.length||!ALLOWED.has(segments[0])||segments.some(x=>!x||x==="."||x===".."||/[%\\/]/.test(x)))return error(404,"PATH_NOT_ALLOWED","Backend path not allowed");
  const method=request.method.toUpperCase();if(!["GET","HEAD","OPTIONS"].includes(method)&&!(await checkMutation(request)))return error(403,"CSRF_REJECTED","CSRF or request origin check failed");
  const cookieStore=await cookies(),access=cookieStore.get(ACCESS_COOKIE)?.value;
  if(!access)return error(401,"UNAUTHENTICATED","No API session is active");
  const path=segments.join("/")+(request.nextUrl.pathname.endsWith("/")?"/":"");
  const body=["GET","HEAD"].includes(method)?undefined:await request.arrayBuffer();
  const send=(token:string)=>fetch(backendUrl(path,request.nextUrl.search),{method,body,headers:{Authorization:`Bearer ${token}`,"Content-Type":request.headers.get("content-type")||"application/json","Idempotency-Key":request.headers.get("idempotency-key")||""},cache:"no-store",signal:AbortSignal.timeout(8000)});
  try{
    let upstream=await send(access);let renewed:{access:string;refresh:string}|undefined;
    if(upstream.status===401){const refresh=cookieStore.get(REFRESH_COOKIE)?.value;if(refresh){const r=await fetch(backendUrl("auth/refresh/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh}),cache:"no-store",signal:AbortSignal.timeout(6000)});if(r.ok){const value=await r.json();if(typeof value.access==="string"&&typeof value.refresh==="string"){renewed=value;upstream=await send(value.access)}}}}
    if(upstream.status===404)return error(503,"API_NOT_IMPLEMENTED","Django domain endpoint is not implemented");
    const contentType=upstream.headers.get("content-type")||"";
    if(!contentType.includes("application/json"))return error(502,"INVALID_BACKEND_REPLY","Backend returned an unsupported response");
    const response=new NextResponse(await upstream.text(),{status:upstream.status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
    if(renewed)setAuthCookies(response,renewed);
    if(upstream.status===401)clearAuthCookies(response);
    return response;
  }catch{return error(503,"BACKEND_UNAVAILABLE","Backend domain service unavailable")}
}
export const GET=proxy,POST=proxy,PUT=proxy,PATCH=proxy,DELETE=proxy;
