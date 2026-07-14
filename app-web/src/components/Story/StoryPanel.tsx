"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { StoryParagraph } from "@/lib/story";

interface Props {
  title: string;
  subtitle: string;
  paragraphs: StoryParagraph[];
  isWorld: boolean;
}

export default function StoryPanel({ title, subtitle, paragraphs, isWorld }: Props) {
  return (
    <motion.aside
      className="pointer-events-auto w-[360px] max-w-[88vw] rounded-2xl border border-border bg-panel/90 p-5 shadow-2xl backdrop-blur"
      role="region"
      aria-label={isWorld ? "The world's average day" : `Data story for ${title}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isWorld ? "bg-accent" : "bg-accent-warm"
          }`}
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
          {isWorld ? "The world today" : "Data story"}
        </span>
        <span className="ml-auto text-[9px] uppercase tracking-wide text-fg-muted/60">
          auto-generated
        </span>
      </div>

      <h2 className="display text-3xl">{title}</h2>
      <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-4 space-y-3"
        >
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-6 text-fg/90">
              {p.text}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>

      <p className="mt-4 border-t border-border/50 pt-2 text-[10px] leading-4 text-fg-muted">
        Narrative composed from the underlying data (OECD/OWID time use, World
        Happiness, UN/OWID demographics). Every figure is sourced; no values are
        invented.
      </p>
    </motion.aside>
  );
}
