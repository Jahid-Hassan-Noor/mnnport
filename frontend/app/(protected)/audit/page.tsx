import { Suspense } from "react";
import { AuditView } from "@/components/portals/PortalViews";
export default function Page(){return <Suspense fallback={<p>Loading audit trail…</p>}><AuditView/></Suspense>}
