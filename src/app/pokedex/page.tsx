"use client";
import Link from "next/link";
import { useCardStore } from "@/store/useCardStore";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { CREATURE_EMOJI, CREATURE_NAME } from "@/lib/data/creatures";

const TIER_STYLES: Record<string, { border: string; bg: string; label: string }> = {
  bronze: { border: "border-[var(--tier-bronze)]", bg: "bg-[var(--tier-bronze)]/10", label: "Bronze" },
  silver: { border: "border-[var(--tier-silver)]", bg: "bg-[var(--tier-silver)]/10", label: "Silver" },
  gold: { border: "border-[var(--tier-gold)]", bg: "bg-[var(--tier-gold)]/10", label: "Gold" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "var(--text-muted)",
  uncommon: "var(--accent-grassroots)",
  rare: "var(--accent-secondary)",
  legendary: "var(--accent-primary)",
};

export default function CollectionPage() {
  const cards = useCardStore((s) => s.cards);
  const heritageUnlocked = useCardStore((s) => s.getHeritageUnlockedTotal());
  const akarTotal = useCardStore((s) => s.getAkarScoreTotal());

  const allDishes = POKEDEX_ENTRIES;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-[var(--accent-primary)]">Collection</h1>
          <div className="flex gap-3 text-xs">
            <span>
              <span className="font-bold text-[var(--accent-secondary)]">{cards.length}</span>
              <span className="text-[var(--text-muted)]">/{allDishes.length} caught</span>
            </span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="font-bold text-[var(--accent-secondary)]">{akarTotal}</span>
            <span className="text-[var(--text-muted)]">Akar</span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--surface-dark)]">
          <div
            className="h-full rounded-full bg-[var(--accent-secondary)] transition-all duration-500"
            style={{ width: `${(cards.length / allDishes.length) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Heritage Unlocked: {heritageUnlocked}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {cards.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-4xl">🎴</p>
            <p className="text-sm text-[var(--text-muted)]">No cards yet. Head to the Radar to catch your first stall!</p>
            <Link
              href="/radar"
              className="inline-block px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm shadow-[0_4px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Open Radar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => {
              const dish = allDishes.find((d) => d.id === card.dishId);
              const tier = TIER_STYLES[card.tier] ?? TIER_STYLES.bronze;
              const creature = CREATURE_EMOJI[card.dishId] ?? "🎴";
              const creatureName = CREATURE_NAME[card.dishId] ?? dish?.name ?? "Unknown";

              return (
                <Link
                  key={card.id}
                  href={`/pokedex/${card.dishId}`}
                  className={`block rounded-xl border-2 ${tier.border} ${tier.bg} overflow-hidden shadow-md active:scale-[0.97] transition-transform`}
                >
                  {/* Card image */}
                  <div className="relative h-28 bg-[var(--surface-dark)] flex items-center justify-center">
                    <span className="text-5xl">{creature}</span>
                    {/* Tier badge */}
                    <span
                      className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/80"
                      style={{ color: `var(--tier-${card.tier})` }}
                    >
                      {tier.label}
                    </span>
                    {/* Rarity badge */}
                    <span
                      className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/80"
                      style={{ color: RARITY_COLORS[card.rarity] }}
                    >
                      {card.rarity}
                    </span>
                  </div>

                  {/* Card info */}
                  <div className="p-2.5">
                    <p className="text-xs font-bold truncate">{creatureName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{dish?.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: "var(--accent-secondary)15",
                          color: "var(--accent-secondary)",
                          border: "1px solid var(--accent-secondary)33",
                        }}
                      >
                        {card.culturalOrigin}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--accent-secondary)]">
                        {card.akarScore} pts
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Undiscovered placeholders */}
            {allDishes
              .filter((d) => !cards.some((c) => c.dishId === d.id))
              .map((dish) => (
                <div
                  key={dish.id}
                  className="rounded-xl border-2 border-dashed border-[var(--border)] overflow-hidden opacity-50"
                >
                  <div className="h-28 bg-[var(--surface-dark)] flex items-center justify-center">
                    <span className="text-3xl opacity-30">❓</span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-[var(--text-muted)]">???</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{dish.origin_state}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
