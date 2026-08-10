"use client";

import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";

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
  { key: "system", label: "System", icon: "🖥️" },
  { key: "light", label: "Light", icon: "☀️" },
  { key: "dark", label: "Dark", icon: "🌙" },
];

export default function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");
  // Avoid a hydration mismatch: the button labels depend on client-only state,
  // so we only reflect the real choice after mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Choice | null) ?? null;
    setChoice(stored ?? "system");
    setMounted(true);
  }, []);

  // When following the system and no explicit choice is stored, react live to
  // the OS switching light/dark.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  function pick(next: Choice) {
    setChoice(next);
    if (next === "system") {
      localStorage.removeItem("theme");
      apply(window.matchMedia("(prefers-color-scheme: light)").matches);
    } else {
      localStorage.setItem("theme", next);
      apply(next === "light");
    }
  }

  const active = mounted ? choice : "system";

  return (
    <fieldset
      className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-panel/85 p-1 backdrop-blur"
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
          className={`rounded-lg px-2 py-1 text-sm leading-none transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
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
