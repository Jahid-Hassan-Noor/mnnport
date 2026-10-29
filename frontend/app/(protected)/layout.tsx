import { AppShell } from "@/components/layout/AppShell";
export const dynamic="force-dynamic";
export default function ProtectedLayout({children}:{children:React.ReactNode}) {
  if(process.env.NODE_ENV==="production"&&process.env.NEXT_PUBLIC_PORT_COMMAND_MODE!=="api"&&process.env.PORT_COMMAND_ALLOW_PRODUCTION_SIMULATION!=="true")return <main className="unavailable-state"><h1>Simulation disabled for this production build</h1><p>Set the server-only PORT_COMMAND_ALLOW_PRODUCTION_SIMULATION=true explicitly for an offline stage deployment.</p></main>;
  return <AppShell>{children}</AppShell>;
}
