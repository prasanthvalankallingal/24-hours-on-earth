"use client";

import { useEffect, useState } from "react";

type Choice = "light" | "dark";

// Apply a resolved theme to <html>: toggle light/dark classes + color-scheme
// (so native scrollbars / form controls match). Mirrors the pre-paint script
// in layout.tsx so live changes stay consistent with the first paint.
function apply(light: boolean) {
  const c = document.documentElement.classList;
  c.toggle("light", light);
  c.toggle("dark", !light);
  document.documentElement.style.colorScheme = light ? "light" : "dark";
}

const OPTIONS: { key: Choice; label: string; icon: string }[] = [
  { key: "light", label: "Light", icon: "☀️" },
  { key: "dark", label: "Dark", icon: "🌙" },
];

export default function ThemeToggle() {
  // Dark is the default for everyone; light only when the visitor explicitly
  // picked it (persisted in localStorage).
  const [choice, setChoice] = useState<Choice>("dark");
  // Avoid a hydration mismatch: the button labels depend on client-only state,
  // so we only reflect the real choice after mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Anything other than an explicit "light" (missing key, or a legacy
    // "system" value from before) resolves to dark.
    const stored = localStorage.getItem("theme");
    setChoice(stored === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  function pick(next: Choice) {
    setChoice(next);
    localStorage.setItem("theme", next);
    apply(next === "light");
  }

  const active = mounted ? choice : "dark";

  return (
    <fieldset
      className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-panel/85 p-1.5 backdrop-blur"
      aria-label="Colour theme"
    >
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => pick(o.key)}
          aria-pressed={active === o.key}
          title={`${o.label} theme`}
          className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
            active === o.key ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
          }`}
        >
          <span aria-hidden>{o.icon}</span>
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </fieldset>
  );
}
