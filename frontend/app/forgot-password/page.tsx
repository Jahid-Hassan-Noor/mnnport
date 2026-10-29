import Link from "next/link";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
export default function ForgotPassword() { return <main className="auth-page"><div className="auth-theme-switch"><ThemeSwitch /></div><div className="auth-card"><h1>Password recovery</h1><p>This workflow becomes available when the future Django identity service is connected.</p><Link href="/login">Back to sign in</Link></div></main>; }
