"use client";
import { useRouter } from "next/navigation";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";

export default function ManualDishDropdown() {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        Or pick a dish manually
        <span className="h-px flex-1 bg-[var(--border)]" />
      </label>
      <div className="relative">
        {/* leading icon */}
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍽️</span>
        <select
          onChange={(e) => {
            if (e.target.value) router.push(`/pokedex/${e.target.value}`);
          }}
          defaultValue=""
          className="w-full appearance-none cursor-pointer rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] py-4 pl-12 pr-11 text-base font-medium text-[var(--foreground)] shadow-sm transition-all hover:border-[var(--accent-primary)]/60 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
        >
          <option value="" disabled>
            Select a dish…
          </option>
          {POKEDEX_ENTRIES.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {dish.name} — {dish.local_script}
            </option>
          ))}
        </select>
        {/* custom chevron */}
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--accent-primary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
