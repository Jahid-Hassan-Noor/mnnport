import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, currentToken, error, rawBackend, setAuthCookies } from "@/lib/api/server-gateway";

const simulation=process.env.NEXT_PUBLIC_PORT_COMMAND_MODE!=="api";
export async function GET(){
  if(simulation)return NextResponse.json({mode:"simulation",user:{id:"demo-only",role:"presenter",label:"Demo presenter"},authenticated:false});
  const token=await currentToken();if(!token)return error(401,"UNAUTHENTICATED","No API session is active");
  try{const r=await rawBackend("auth/me/",{headers:{Authorization:`Bearer ${token}`}});if(r.status===404)return error(503,"API_NOT_IMPLEMENTED","Django identity endpoints are not implemented");if(!r.ok)return error(r.status,"SESSION_INVALID","API session unavailable");const value=await r.json();return NextResponse.json({mode:"api",authenticated:true,user:{id:value.id,role:value.role,label:value.display_name}})}catch{return error(503,"BACKEND_UNAVAILABLE","Backend session service unavailable")}
}
export async function POST(request:NextRequest){
  if(simulation)return error(409,"DEMO_ONLY","Simulation mode has no production authentication");
  const requestOrigin=request.headers.get("origin");try{if(!requestOrigin||new URL(requestOrigin).host!==request.headers.get("host"))return error(403,"ORIGIN_REJECTED","Request origin rejected")}catch{return error(403,"ORIGIN_REJECTED","Request origin rejected")}
  let body:unknown;try{body=await request.json()}catch{return error(400,"INVALID_JSON","Expected JSON credentials")}
  if(!body||typeof body!=="object"||!("email" in body)||!("password" in body)||typeof body.email!=="string"||typeof body.password!=="string")return error(400,"INVALID_CREDENTIALS","Email and password are required");
  try{const r=await rawBackend("auth/login/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:body.email,password:body.password})});if(r.status===404)return error(503,"API_NOT_IMPLEMENTED","Django login endpoint is not implemented");if(!r.ok)return error(r.status,"LOGIN_FAILED","Login was not accepted");const value=await r.json();if(typeof value.access!=="string"||typeof value.refresh!=="string")return error(502,"INVALID_BACKEND_REPLY","Backend returned no usable session tokens");const response=NextResponse.json({mode:"api",authenticated:true,user:{id:value.user?.id,role:value.user?.role,label:value.user?.display_name}});setAuthCookies(response,value);return response}catch{return error(503,"BACKEND_UNAVAILABLE","Backend identity service unavailable")}
}
export async function DELETE(){const response=NextResponse.json({authenticated:false});clearAuthCookies(response);return response}
