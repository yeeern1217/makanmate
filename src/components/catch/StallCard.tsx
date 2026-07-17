"use client";
import type { RarityClass, CardTier, CulturalOrigin } from "@/types/card";
import { CREATURE_EMOJI, CREATURE_NAME } from "@/lib/data/creatures";
import { RARITY_CARD_STYLE, RARITY_NAME, RARITY_RANK } from "@/lib/rarity";

const RARITY_BORDER: Record<RarityClass, string> = {
  common: "border-[var(--tier-bronze)]",
  uncommon: "border-[var(--tier-silver)]",
  rare: "border-[var(--tier-gold)]",
  legendary: "border-transparent bg-gradient-to-br from-amber-400 via-rose-400 to-violet-400",
};

const TIER_BADGE_BG: Record<CardTier, string> = {
  bronze: "bg-[var(--tier-bronze)]",
  silver: "bg-[var(--tier-silver)]",
  gold: "bg-[var(--tier-gold)]",
};

export default function StallCard({
  dishId,
  stallName,
  culturalOrigin,
  rarity,
  tier,
  akarScore,
  capturedPhoto,
  compact,
}: {
  dishId: string;
  stallName: string;
  culturalOrigin: CulturalOrigin;
  rarity: RarityClass;
  tier: CardTier;
  akarScore: number;
  capturedPhoto?: string;
  compact?: boolean;
}) {
  const emoji = CREATURE_EMOJI[dishId] ?? "🍽️";
  const creatureName = CREATURE_NAME[dishId] ?? "Unknown";

  if (compact) {
    return (
      <div className={`retro-card p-3 flex items-center gap-3 ${RARITY_BORDER[rarity]} border-2`}>
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{creatureName}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{stallName}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: RARITY_CARD_STYLE[rarity].accent }}>
            {RARITY_RANK[rarity]}
          </span>
          <span className={`${TIER_BADGE_BG[tier]} rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white`}>
            {tier}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-3 ${RARITY_BORDER[rarity]} shadow-lg`}
      style={{ boxShadow: RARITY_CARD_STYLE[rarity].glow }}
    >
      {/* Photo background */}
      <div className="relative h-48 bg-[var(--surface-dark)]">
        {capturedPhoto ? (
          <img
            src={`data:image/jpeg;base64,${capturedPhoto}`}
            alt={stallName}
            className="w-full h-full object-cover opacity-60 blur-[1px]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--surface)] to-[var(--surface-dark)]" />
        )}

        {/* Creature overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl drop-shadow-lg" style={{ filter: "contrast(1.2)" }}>
            {emoji}
          </span>
        </div>

        <div
          className={`pointer-events-none absolute inset-0 ${rarity === "legendary" ? "animate-[rarity-rainbow_2.2s_ease-in-out_infinite]" : "animate-badge-shine"}`}
          style={{
            background:
              rarity === "legendary"
                ? "linear-gradient(120deg, transparent 20%, #fff8 38%, #ff8 45%, #f0f 52%, #7df 60%, transparent 78%)"
                : `linear-gradient(115deg, transparent 38%, ${RARITY_CARD_STYLE[rarity].accent}66 50%, transparent 62%)`,
            backgroundSize: rarity === "legendary" ? "220% 220%" : "200% 100%",
          }}
        />

        <div className="absolute left-3 bottom-3 flex items-end gap-2">
          <div
            className="rounded-xl border-2 border-white/70 px-3 py-1 text-2xl font-black leading-none text-white shadow-lg"
            style={{ background: RARITY_CARD_STYLE[rarity].accent, textShadow: "0 2px 3px #0008" }}
          >
            {RARITY_RANK[rarity]}
          </div>
          <span className="mb-0.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            {RARITY_NAME[rarity]}
          </span>
        </div>

        {/* Rarity badge */}
        <div className={`absolute top-3 right-3 ${TIER_BADGE_BG[tier]} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase shadow`}>
          {tier}
        </div>

        {/* Cultural origin badge */}
        <div className="absolute top-3 left-3 bg-[var(--foreground)]/70 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
          {culturalOrigin}
        </div>
      </div>

      {/* Card info */}
      <div className="bg-[var(--surface)] p-4 space-y-1">
        <h3 className="font-bold text-base">{creatureName}</h3>
        <p className="text-xs text-[var(--text-muted)]">{stallName}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {RARITY_NAME[rarity]} · {RARITY_RANK[rarity]}
          </span>
          <span className="text-lg font-black text-[var(--accent-primary)]">{akarScore}</span>
        </div>
      </div>
    </div>
  );
}
