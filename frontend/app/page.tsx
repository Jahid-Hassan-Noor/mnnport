import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { PortDiorama } from "@/components/scene/PortDiorama";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";

export default function Home() {
  return <main className="landing landing-v2">
    <header className="landing-top"><div className="landing-logo"><span className="brand-mark">PC</span><span><strong>PORT COMMAND</strong><small>OPERATIONS, REIMAGINED</small></span></div><div className="landing-header-actions"><span className="landing-mode"><i className="live-pin"/> SIMULATION MODE</span><ThemeSwitch /></div></header>
    <div className="landing-layout">
      <div className="landing-copy"><span className="eyebrow">A NEW PERSPECTIVE ON PORT OPERATIONS</span><h1>The port,<br/><em>in motion.</em></h1><p>One vivid operating picture for every vessel, yard move and decision. Explore a fictional terminal built to show what human-led, AI-assisted operations could feel like.</p><div className="landing-actions"><Link className="button primary" href="/control">Enter simulated control room <ArrowUpRight size={19}/></Link><Link className="button secondary" href="/login"><Play size={15}/> Future API sign in</Link></div><div className="landing-proof"><div><strong>04</strong><span>BERTHS</span></div><div><strong>40</strong><span>VEHICLES</span></div><div><strong>2K</strong><span>CONTAINERS</span></div><div><strong>10</strong><span>PORTALS</span></div></div></div>
      <PortDiorama variant="hero" scene={1}/>
    </div>
    <footer className="landing-bottom"><span>SELAT TERMINAL / FICTIONAL DIGITAL TWIN</span><span>ALL OPERATIONAL DATA IS SIMULATED</span><span>EXPLORE THE 3D MODEL ↗</span></footer>
  </main>;
}
