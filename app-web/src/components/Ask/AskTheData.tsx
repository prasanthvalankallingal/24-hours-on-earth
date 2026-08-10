"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CountryTimeUse, CountryMetrics } from "@/lib/types";
import { ask, SUGGESTIONS, type AskAnswer } from "@/lib/ask";

interface Props {
  timeuse: CountryTimeUse[];
  metrics: CountryMetrics[];
}

export default function AskTheData({ timeuse, metrics }: Props) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<AskAnswer | null>(null);

  const run = (question: string) => {
    setQ(question);
    setAnswer(ask(question, timeuse, metrics));
  };

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) run(q);
        }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-panel/80 p-2 backdrop-blur focus-within:border-accent"
      >
        <span className="pl-2 text-fg-muted" aria-hidden>
          ✦
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask the data — e.g. “Which country works the most?”"
          aria-label="Ask a question about the data"
          className="flex-1 bg-transparent px-1 py-2 text-sm text-fg placeholder:text-fg-muted/70 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Ask
        </button>
      </form>

      {/* suggestion chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            className="rounded-full border border-border bg-bg-soft px-3 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-fg"
          >
            {s}
          </button>
        ))}
      </div>

      {/* answer */}
      <AnimatePresence mode="wait">
        {answer && (
          <motion.div
            key={answer.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-5 rounded-2xl border border-border bg-panel/60 p-5"
          >
            {answer.writeup && (
              <p className="mb-3 text-sm leading-6 text-fg">{answer.writeup}</p>
            )}
            <p className={`text-sm leading-6 ${answer.writeup ? "text-fg-muted" : "text-fg"}`}>
              {answer.text}
            </p>
            {answer.rows && (
              <ul className="mt-3 space-y-1.5">
                {answer.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between border-b border-border/40 pb-1 text-sm">
                    <span className="text-fg-muted">{r.label}</span>
                    <span className="font-medium tabular-nums">{r.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 text-center text-[10px] leading-4 text-fg-muted">
        Answers are computed live from the underlying datasets — every figure is
        sourced, none invented. Built with the help of Claude (documented for the
        Best Use of GenAI award).
      </p>
    </div>
  );
}
