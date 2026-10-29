import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE="pc_access",REFRESH_COOKIE="pc_refresh",CSRF_COOKIE="pc_csrf";
const origin=process.env.BACKEND_API_ORIGIN||"http://backend:8000";
export function error(status:number,code:string,message:string){return NextResponse.json({error:{code,message}},{status})}
export async function checkMutation(request:Request){
  const requestOrigin=request.headers.get("origin"),host=request.headers.get("host");
  if(!requestOrigin||!host)return false;
  try{const parsed=new URL(requestOrigin);if(!["http:","https:"].includes(parsed.protocol)||parsed.host!==host)return false}catch{return false}
  const cookieStore=await cookies(),token=cookieStore.get(CSRF_COOKIE)?.value;
  return !!token&&token===request.headers.get("x-csrf-token");
}
export function backendUrl(path:string,query="") {const clean=path.replace(/^\/+/,"");if(!clean||clean.split("/").some(x=>x===".."||x===".")||/\\|%2f|%5c/i.test(clean))throw new Error("Invalid backend path");return `${origin.replace(/\/$/,"")}/${clean}${query}`}
export function setAuthCookies(response:NextResponse,tokens:{access:string;refresh:string}){
  const secure=process.env.NODE_ENV==="production";
  response.cookies.set(ACCESS_COOKIE,tokens.access,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:15*60});
  response.cookies.set(REFRESH_COOKIE,tokens.refresh,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:7*24*3600});
  response.cookies.set(CSRF_COOKIE,crypto.randomUUID(),{httpOnly:false,secure,sameSite:"lax",path:"/",maxAge:7*24*3600});
}
export function clearAuthCookies(response:NextResponse){for(const name of [ACCESS_COOKIE,REFRESH_COOKIE,CSRF_COOKIE])response.cookies.delete(name)}
export async function rawBackend(path:string,init:RequestInit={}) {return fetch(backendUrl(path),{...init,cache:"no-store",signal:AbortSignal.timeout(6000)})}
export async function currentToken(){return (await cookies()).get(ACCESS_COOKIE)?.value}
export async function requestHost(){return (await headers()).get("host")}
