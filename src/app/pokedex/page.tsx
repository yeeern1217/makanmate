"use client";
import Link from "next/link";
import { useCardStore } from "@/store/useCardStore";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { CREATURE_EMOJI, CREATURE_NAME } from "@/lib/data/creatures";

const TIERS: Record<string, { color: string; label: string }> = {
  bronze: { color: "var(--tier-bronze)", label: "Bronze" },
  silver: { color: "var(--tier-silver)", label: "Silver" },
  gold: { color: "var(--tier-gold)", label: "Gold" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "var(--text-muted)",
  uncommon: "var(--accent-grassroots)",
  rare: "var(--accent-secondary)",
  legendary: "var(--accent-primary)",
};

export default function CollectionPage() {
  const cards = useCardStore((s) => s.cards);

  const allDishes = POKEDEX_ENTRIES;
  const pct = Math.round((cards.length / allDishes.length) * 100);

  // Silhouettes of real dishes to tease inside the empty-state card fan.
  const teasers = allDishes.slice(0, 2).map((d) => d.emoji ?? "🍜");

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]/70">
          Heritage Pokédex
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-black text-[var(--foreground)] leading-tight">Collection</h1>
          <span className="text-sm font-bold text-[var(--text-muted)]">
            <span className="font-black text-[var(--accent-primary)]">{cards.length}</span>
            /{allDishes.length}
          </span>
        </div>
        <div className="relative mt-2 h-2.5 w-full rounded-full bg-[var(--surface-dark)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]">
          {/* fill */}
          <div
            className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          >
            {/* moving shine along the fill */}
            <div
              aria-hidden
              className="absolute inset-0 animate-badge-shine"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animationDuration: "2.5s",
              }}
            />
          </div>
          {/* glowing orb riding the leading edge */}
          {pct > 0 && (
            <div
              aria-hidden
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_3px_rgba(212,169,71,0.9)] transition-all duration-700"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
            {/* Fanned card-pack teaser — spreads open on hover */}
            <div className="group relative mb-8 flex h-40 w-full items-center justify-center [perspective:800px]">
              {/* left ghost card */}
              <div className="absolute flex h-28 w-20 -translate-x-14 -rotate-[14deg] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)]/70 bg-[var(--surface)]/50 transition-transform duration-500 ease-out group-hover:-translate-x-[6.5rem] group-hover:-translate-y-1 group-hover:-rotate-[26deg]">
                <span className="text-4xl" style={{ filter: "brightness(0)", opacity: 0.12 }}>
                  {teasers[0]}
                </span>
              </div>
              {/* right ghost card */}
              <div className="absolute flex h-28 w-20 translate-x-14 rotate-[14deg] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)]/70 bg-[var(--surface)]/50 transition-transform duration-500 ease-out group-hover:translate-x-[6.5rem] group-hover:-translate-y-1 group-hover:rotate-[26deg]">
                <span className="text-4xl" style={{ filter: "brightness(0)", opacity: 0.12 }}>
                  {teasers[1]}
                </span>
              </div>
              {/* center floating card */}
              <div className="relative z-10 flex h-36 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--accent-primary)]/50 bg-[var(--surface)] shadow-lg transition-transform duration-500 ease-out animate-pulse-warm group-hover:-translate-y-3 group-hover:scale-105">
                <div
                  className="pointer-events-none absolute inset-0 animate-badge-shine"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 42%, rgba(212,169,71,0.35) 50%, transparent 58%)",
                    backgroundSize: "200% 100%",
                    animationDuration: "3.5s",
                  }}
                />
                <span className="text-5xl animate-float">🎴</span>
              </div>
            </div>

            <h2 className="text-xl font-black text-[var(--foreground)]">Start your collection</h2>
            <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-[var(--text-muted)]">
              Scan a heritage stall on the Radar to catch your first dish card.
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]/70">
              {allDishes.length} legendary dishes to discover
            </p>

            <div className="relative mt-7 inline-flex">
              {/* breathing glow halo behind the button */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-lg animate-glow-pulse"
              />
              <Link
                href="/radar"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-[0_4px_0_var(--border),0_8px_24px_rgba(196,85,58,0.35)] transition-all hover:translate-y-[1px] hover:shadow-[0_3px_0_var(--border),0_5px_16px_rgba(196,85,58,0.45)] active:translate-y-[4px] active:shadow-none"
                style={{ background: "linear-gradient(135deg, var(--accent-primary), #e07a52)" }}
              >
                {/* shimmer sweep */}
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
                <span className="relative text-lg transition-transform duration-300 group-hover:rotate-[20deg]">
                  🧭
                </span>
                <span className="font-display relative text-base font-bold tracking-wide">Open Radar</span>
                <span className="relative text-base transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => {
              const dish = allDishes.find((d) => d.id === card.dishId);
              const tier = TIERS[card.tier] ?? TIERS.bronze;
              const food = dish?.emoji ?? "🍽️";
              const creature = CREATURE_EMOJI[card.dishId] ?? "🎴";
              const creatureName = CREATURE_NAME[card.dishId] ?? dish?.name ?? "Unknown";
              const isGold = card.tier === "gold";

              return (
                <Link
                  key={card.id}
                  href={`/pokedex/${card.dishId}`}
                  className="group relative block overflow-hidden rounded-2xl border-2 bg-[var(--surface)] shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ borderColor: tier.color }}
                >
                  {/* Foil image panel — tinted by tier */}
                  <div
                    className="relative flex h-28 items-center justify-center overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${tier.color} 35%, var(--surface-dark)), var(--surface-dark))`,
                    }}
                  >
                    {/* gold cards get a foil shimmer sweep */}
                    {isGold && (
                      <div
                        className="pointer-events-none absolute inset-0 animate-badge-shine"
                        style={{
                          background:
                            "linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.45) 50%, transparent 58%)",
                          backgroundSize: "200% 100%",
                          animationDuration: "4s",
                        }}
                      />
                    )}
                    <span className="text-5xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.25)] transition-transform duration-200 group-active:scale-90 group-hover:scale-110">
                      {food}
                    </span>

                    {/* Creature mascot badge */}
                    <span
                      title={creatureName}
                      className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface)]/90 text-sm shadow-sm ring-1 ring-[var(--border)]"
                    >
                      {creature}
                    </span>

                    {/* Tier ribbon */}
                    <span
                      className="absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm"
                      style={{ background: tier.color }}
                    >
                      {tier.label}
                    </span>

                    {/* Rarity dot + label */}
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold capitalize text-white backdrop-blur-sm">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: RARITY_COLORS[card.rarity] }}
                      />
                      {card.rarity}
                    </span>
                  </div>

                  {/* Card info */}
                  <div className="p-2.5">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">{creatureName}</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">{dish?.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                        style={{
                          background: "color-mix(in srgb, var(--accent-secondary) 15%, transparent)",
                          color: "var(--accent-secondary)",
                          border: "1px solid color-mix(in srgb, var(--accent-secondary) 33%, transparent)",
                        }}
                      >
                        {card.culturalOrigin}
                      </span>
                      <span className="text-[11px] font-black text-[var(--accent-secondary)]">
                        {card.akarScore}
                        <span className="text-[9px] font-medium text-[var(--text-muted)]"> pts</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Undiscovered — silhouette teasers */}
            {allDishes
              .filter((d) => !cards.some((c) => c.dishId === d.id))
              .map((dish) => {
                const silhouette = dish.emoji ?? "❓";
                return (
                  <div
                    key={dish.id}
                    className="overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)]/70 bg-[var(--surface)]/40"
                  >
                    <div className="relative flex h-28 items-center justify-center bg-[var(--surface-dark)]/50">
                      <span className="text-5xl" style={{ filter: "brightness(0)", opacity: 0.14 }}>
                        {silhouette}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 text-sm opacity-40">🔒</span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-bold text-[var(--text-muted)]">Undiscovered</p>
                      <p className="truncate text-[10px] text-[var(--text-muted)]">{dish.origin_state}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
