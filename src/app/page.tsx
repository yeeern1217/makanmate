"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCardStore } from "@/store/useCardStore";

function AnimatedCounter({ value, label, icon }: { value: number; label: string; icon: string }) {
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
    <div className="flex min-w-[6.5rem] flex-col items-center gap-0.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 px-5 py-3 shadow-sm">
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-2xl font-black tabular-nums text-[var(--accent-primary)]">{display}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export default function Home() {
  const akarTotal = useCardStore((s) => s.getAkarScoreTotal());
  const heritageTotal = useCardStore((s) => s.getHeritageUnlockedTotal());

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Soft aged-paper vignette */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--surface)_0%,var(--background)_72%)]" />
      {/* Warm saffron tint glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 22%, color-mix(in srgb, var(--accent-secondary) 16%, transparent), transparent 58%)",
        }}
      />
      {/* Subtle topographic background: nested elevation contours */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          opacity: 0.45,
          maskImage: "radial-gradient(ellipse at center, transparent 14%, black 84%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, transparent 14%, black 84%)",
        }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 500 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* elevation contours */}
          <g stroke="var(--border)" strokeWidth="1.2" fill="none">
            {/* peak top-left */}
            <ellipse cx="55" cy="105" rx="16" ry="13" transform="rotate(-18 55 105)" />
            <ellipse cx="55" cy="105" rx="36" ry="29" transform="rotate(-18 55 105)" />
            <ellipse cx="55" cy="105" rx="58" ry="47" transform="rotate(-18 55 105)" />
            <ellipse cx="55" cy="105" rx="82" ry="67" transform="rotate(-18 55 105)" />
            {/* ridge top-right */}
            <ellipse cx="445" cy="120" rx="18" ry="14" transform="rotate(24 445 120)" />
            <ellipse cx="445" cy="120" rx="40" ry="31" transform="rotate(24 445 120)" />
            <ellipse cx="445" cy="120" rx="66" ry="50" transform="rotate(24 445 120)" />
            <ellipse cx="445" cy="120" rx="94" ry="72" transform="rotate(24 445 120)" />
            <ellipse cx="445" cy="120" rx="124" ry="95" transform="rotate(24 445 120)" />
            {/* saddle mid */}
            <ellipse cx="250" cy="330" rx="15" ry="12" transform="rotate(-10 250 330)" />
            <ellipse cx="250" cy="330" rx="34" ry="27" transform="rotate(-10 250 330)" />
            <ellipse cx="250" cy="330" rx="56" ry="45" transform="rotate(-10 250 330)" />
            <ellipse cx="250" cy="330" rx="80" ry="65" transform="rotate(-10 250 330)" />
            {/* valley left */}
            <ellipse cx="80" cy="580" rx="18" ry="15" transform="rotate(14 80 580)" />
            <ellipse cx="80" cy="580" rx="42" ry="34" transform="rotate(14 80 580)" />
            <ellipse cx="80" cy="580" rx="70" ry="56" transform="rotate(14 80 580)" />
            <ellipse cx="80" cy="580" rx="100" ry="80" transform="rotate(14 80 580)" />
            {/* peak lower-right */}
            <ellipse cx="430" cy="650" rx="16" ry="13" transform="rotate(-22 430 650)" />
            <ellipse cx="430" cy="650" rx="38" ry="30" transform="rotate(-22 430 650)" />
            <ellipse cx="430" cy="650" rx="62" ry="50" transform="rotate(-22 430 650)" />
            <ellipse cx="430" cy="650" rx="90" ry="72" transform="rotate(-22 430 650)" />
            {/* peak bottom */}
            <ellipse cx="270" cy="850" rx="16" ry="13" transform="rotate(8 270 850)" />
            <ellipse cx="270" cy="850" rx="38" ry="31" transform="rotate(8 270 850)" />
            <ellipse cx="270" cy="850" rx="64" ry="52" transform="rotate(8 270 850)" />
            <ellipse cx="270" cy="850" rx="92" ry="74" transform="rotate(8 270 850)" />
          </g>
          {/* faint hiking trail */}
          <path
            d="M-20 720 Q160 600 250 520 T500 240"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeDasharray="7 8"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Eyebrow */}
      <p
        className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent-primary)]/70 animate-fade-in"
        style={{ animationDelay: "0s" }}
      >
        Pokédex for Malaysian street food
      </p>

      {/* Wordmark */}
      <h1
        className="retro-heading text-6xl font-black tracking-tight animate-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        MakanMate
      </h1>

      {/* Divider with a gold node */}
      <div
        className="my-5 flex items-center gap-2 animate-fade-in"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="h-px w-10 bg-[var(--border)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)]" />
        <span className="h-px w-10 bg-[var(--border)]" />
      </div>

      {/* Value prop */}
      <p
        className="max-w-[17rem] text-base leading-relaxed text-[var(--text-muted)] animate-fade-in"
        style={{ animationDelay: "0.3s" }}
      >
        Discover, scan &amp; collect Malaysia&apos;s living food heritage — one legendary stall at a time.
      </p>

      {/* Progress stats */}
      <div
        className="my-8 flex gap-3 animate-fade-in"
        style={{ animationDelay: "0.4s" }}
      >
        <AnimatedCounter value={akarTotal} label="Akar Score" icon="⭐" />
        <AnimatedCounter value={heritageTotal} label="Heritage" icon="🏛️" />
      </div>

      {/* Tempting CTA */}
      <div
        className="relative inline-flex animate-fade-in"
        style={{ animationDelay: "0.5s" }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-lg animate-glow-pulse"
        />
        <Link
          href="/radar"
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-white shadow-[0_4px_0_var(--border),0_8px_24px_rgba(196,85,58,0.35)] transition-all hover:translate-y-[1px] hover:shadow-[0_3px_0_var(--border),0_5px_16px_rgba(196,85,58,0.45)] active:translate-y-[4px] active:shadow-none"
          style={{ background: "linear-gradient(135deg, var(--accent-primary), #e07a52)" }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-badge-shine"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animationDuration: "3s",
            }}
          />
          <span className="font-display relative text-base font-bold tracking-wide">Begin the Trail</span>
          <span className="relative text-base transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
