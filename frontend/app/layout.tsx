import type { Metadata } from "next";
import "./globals.css";
import "./modern-theme.css";
import "./light-theme.css";
import "./portal-presentation.css";

export const metadata: Metadata = {
  title: "Port Command | Selat Terminal",
  description: "Fictional port operations decision layer demo",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{document.documentElement.dataset.theme=localStorage.getItem("port-command-theme")==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}',
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
