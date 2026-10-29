"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "port-command-theme";

export function ThemeSwitch() {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the switch usable when storage is blocked. */ }
      window.dispatchEvent(new Event("port-command-theme-change"));
    };
    if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
    else apply();
  };

  return <button type="button" className="theme-switch" aria-label="Toggle dark and light mode" title="Toggle dark and light mode" onClick={toggle}>
    <Sun className="theme-switch-sun" size={16} aria-hidden="true" />
    <Moon className="theme-switch-moon" size={16} aria-hidden="true" />
    <span className="theme-switch-light">LIGHT</span>
    <span className="theme-switch-dark">DARK</span>
  </button>;
}
