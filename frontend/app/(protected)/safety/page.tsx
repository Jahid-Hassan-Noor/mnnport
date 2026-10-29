import { Suspense } from "react";
import { SafetyView } from "@/components/portals/PortalViews";
export default function Page(){return <Suspense fallback={<p>Loading safety records…</p>}><SafetyView/></Suspense>}
