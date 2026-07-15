"use client";
import { DishEntry } from "@/types/heritage";

export default function DishMetaCard({ dish }: { dish: DishEntry }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-dark)] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* dish emoji medallion */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-3xl ring-1 ring-[var(--accent-primary)]/25">
          {dish.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black leading-tight text-[var(--foreground)]">{dish.name}</h1>
          <p className="text-base font-semibold text-[var(--accent-primary)]">{dish.local_script}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
            📍 {dish.origin_state}
          </p>
        </div>

        {/* heritage score */}
        <div className="flex shrink-0 flex-col items-center rounded-xl bg-[var(--accent-primary)]/10 px-3 py-1.5 ring-1 ring-[var(--accent-primary)]/20">
          <div className="text-2xl font-black leading-none text-[var(--accent-primary)]">{dish.heritage_score}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Heritage</div>
        </div>
      </div>

      {/* fun fact */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/70 px-3 py-2.5">
        <span className="text-base leading-none">💡</span>
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{dish.fun_fact}</p>
      </div>
    </div>
  );
}
