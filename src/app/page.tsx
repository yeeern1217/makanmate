"use client";
import { useEffect, useRef, useState } from "react";
import GlowButton from "@/components/ui/GlowButton";
import { useCardStore } from "@/store/useCardStore";

const HOOK_TEXT =
  "Somewhere near you, a 3rd-generation stall is about to disappear from the map — and its story is buried in a PDF nobody reads.";

function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = ref.current;
    const diff = value - start;
    const duration = 1200;
    const t0 = performance.now();

    function tick(now: number) {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    }

    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-4xl font-black tabular-nums text-[var(--accent-primary)]">
        {display}
      </span>
      <span className="text-xs font-semibold tracking-wide uppercase text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (charCount >= text.length) return;
    const delay = charCount === 0 ? 600 : 35;
    const timer = setTimeout(() => setCharCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [charCount, text.length]);

  return (
    <p className="max-w-sm text-center text-lg leading-relaxed text-[var(--foreground)] font-serif min-h-[6rem]">
      {text.slice(0, charCount)}
      <span className="inline-block w-[2px] h-[1.1em] bg-[var(--accent-primary)] align-text-bottom animate-[blink-caret_0.8s_step-end_infinite] ml-0.5" />
    </p>
  );
}

export default function Home() {
  const akarTotal = useCardStore((s) => s.getAkarScoreTotal());
  const heritageTotal = useCardStore((s) => s.getHeritageUnlockedTotal());

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
      {/* Subtle aged-paper texture */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--surface)_0%,var(--background)_70%)]" />

      <h1 className="retro-heading mb-6 text-5xl font-black tracking-tight sm:text-6xl">
        MakanMate
      </h1>

      <TypewriterText text={HOOK_TEXT} />

      <div className="my-8 flex gap-12">
        <AnimatedCounter value={akarTotal} label="Akar Score" />
        <div className="w-px bg-[var(--border)]" />
        <AnimatedCounter value={heritageTotal} label="Heritage Unlocked" />
      </div>

      <GlowButton href="/radar">Begin the Trail</GlowButton>
    </div>
  );
}
