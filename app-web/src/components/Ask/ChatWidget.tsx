"use client";

// Floating "Ask the data" chat launcher (bottom-left). A small popup chat over
// the SAME hybrid path as the inline Ask box: the router interprets the phrasing
// into {metric, direction, country}, and ask() computes every figure locally
// from the datasets — no number is ever produced by the model. Falls back to the
// local parser whenever the router is unavailable, so it always answers.

import { useEffect, useRef, useState } from "react";
import type { CountryTimeUse, CountryMetrics } from "@/lib/types";
import { ask, SUGGESTIONS, type AskAnswer } from "@/lib/ask";
import { route } from "@/lib/router";

interface Props {
  timeuse: CountryTimeUse[];
  metrics: CountryMetrics[];
}

type Turn =
  | { role: "user"; text: string }
  | { role: "bot"; answer: AskAnswer };

export default function ChatWidget({ timeuse, metrics }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draggable launcher. `pos` is the button's top-left in viewport px; null =
  // use the default bottom-left CSS anchor. Position is `fixed`, so it stays put
  // (sticky) while the page scrolls. We distinguish a click (toggle) from a drag
  // (move) with a small movement threshold.
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);
  const BTN = 48; // launcher size in px (h-12/w-12)

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = btnRef.current!.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, ox: r.left, oy: r.top, moved: false };
    btnRef.current!.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    const x = Math.max(8, Math.min(window.innerWidth - BTN - 8, d.ox + dx));
    const y = Math.max(8, Math.min(window.innerHeight - BTN - 8, d.oy + dy));
    setPos({ x, y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    btnRef.current?.releasePointerCapture(e.pointerId);
    // If the pointer barely moved, treat it as a click → toggle the panel.
    if (drag.current && !drag.current.moved) setOpen((o) => !o);
    drag.current = null;
  };

  // Anchor the panel next to the launcher once it's been moved; prefer above,
  // fall back to below, and clamp to the viewport. window is only read here
  // after a drag (client-only), never during prerender.
  const panelStyle = (): React.CSSProperties | undefined => {
    if (!pos) return undefined;
    const W = 352; // ~22rem
    const H = 448; // 28rem
    const gap = 12;
    const left = Math.max(8, Math.min(window.innerWidth - W - 8, pos.x));
    let top = pos.y - H - gap;
    if (top < 8) top = pos.y + BTN + gap;
    top = Math.max(8, Math.min(window.innerHeight - H - 8, top));
    return { left, top };
  };

  // Keep the newest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading, open]);

  // Focus the input on open; Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const run = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setQ("");
    setTurns((t) => [...t, { role: "user", text: trimmed }]);
    setLoading(true);
    // Router only interprets; ask() computes the numbers. hint===null → local parse.
    const hint = await route(trimmed);
    const answer = ask(trimmed, timeuse, metrics, hint ?? undefined);
    setTurns((t) => [...t, { role: "bot", answer }]);
    setLoading(false);
  };

  return (
    <>
      {/* Launcher — draggable (grab & drop anywhere), fixed so it stays put on scroll */}
      <button
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title="Drag to move · click to open"
        aria-label={open ? "Close the Ask-the-data chat" : "Open the Ask-the-data chat"}
        aria-expanded={open}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
        className={`fixed z-40 flex h-12 w-12 touch-none cursor-grab select-none items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing ${
          pos ? "" : "bottom-4 left-4 md:bottom-6 md:left-6"
        }`}
      >
        {open ? (
          // Close (X)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          // Chat bubble with dots
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.9-.9L3 21l1.9-5.6a8.38 8.38 0 0 1-.9-3.9A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
            <circle cx="8.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="12.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="16.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Ask the data"
          style={panelStyle()}
          className={`fixed z-40 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl ${
            pos ? "" : "bottom-20 left-4 md:bottom-24 md:left-6"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fg">Ask the data</p>
              <p className="text-[10px] text-fg-muted">Every figure computed from the datasets</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md px-1 text-fg-muted transition-colors hover:text-fg"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-fg-muted">
                  Ask about how the world spends its day — in plain English. Try:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => run(s)}
                      className="rounded-full border border-border bg-bg-soft px-2.5 py-1 text-[11px] text-fg-muted transition-colors hover:border-accent hover:text-fg"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) =>
              t.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-white"
                >
                  {t.text}
                </div>
              ) : (
                <div
                  key={i}
                  className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-bg-soft px-3 py-2"
                >
                  {t.answer.writeup && (
                    <p className="mb-1.5 text-sm leading-6 text-fg">{t.answer.writeup}</p>
                  )}
                  <p className={`text-sm leading-6 ${t.answer.writeup ? "text-fg-muted" : "text-fg"}`}>
                    {t.answer.text}
                  </p>
                  {t.answer.rows && (
                    <ul className="mt-2 space-y-1">
                      {t.answer.rows.map((r) => (
                        <li
                          key={r.label}
                          className="flex items-center justify-between border-b border-border/40 pb-0.5 text-xs"
                        >
                          <span className="text-fg-muted">{r.label}</span>
                          <span className="font-medium tabular-nums">{r.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
            )}

            {loading && (
              <div className="mr-auto rounded-2xl rounded-bl-sm border border-border bg-bg-soft px-3 py-2 text-sm text-fg-muted">
                <span className="inline-block animate-pulse">thinking…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(q);
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask a question…"
              aria-label="Ask a question about the data"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-fg placeholder:text-fg-muted/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {loading ? "…" : "Ask"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
