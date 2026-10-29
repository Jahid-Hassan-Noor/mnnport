import { Suspense } from "react";
import { BerthsView } from "@/components/portals/PortalViews";
export default function Page(){return <Suspense fallback={<p>Loading berth plan…</p>}><BerthsView/></Suspense>}
