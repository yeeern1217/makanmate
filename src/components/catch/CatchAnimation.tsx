"use client";
import { useEffect, useState } from "react";
import type { RarityClass, CardTier, CulturalOrigin } from "@/types/card";
import StallCard from "./StallCard";
import { RARITY_CARD_STYLE, RARITY_NAME, RARITY_RANK } from "@/lib/rarity";

type Phase = "shrink" | "flip" | "reveal" | "done";

const RARITY_GLOW: Record<RarityClass, string> = {
  common: "shadow-[0_0_40px_#cd7f32]",
  uncommon: "shadow-[0_0_55px_#aab7c4]",
  rare: "shadow-[0_0_70px_#d4a947]",
  legendary: "shadow-[0_0_100px_#d946ef]",
};

export default function CatchAnimation({
  dishId,
  stallName,
  culturalOrigin,
  rarity,
  tier,
  akarScore,
  capturedPhoto,
  onComplete,
}: {
  dishId: string;
  stallName: string;
  culturalOrigin: CulturalOrigin;
  rarity: RarityClass;
  tier: CardTier;
  akarScore: number;
  capturedPhoto?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("shrink");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("flip"), 600),
      setTimeout(() => setPhase("reveal"), 1000),
      setTimeout(() => setPhase("done"), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Rarity burst */}
      {(phase === "reveal" || phase === "done") && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-64 h-64 rounded-full ${RARITY_GLOW[rarity]} animate-[pulse-warm_1s_ease-out]`} style={{ opacity: 0.5 }} />
          {rarity === "legendary" && <div className="absolute h-72 w-72 rounded-full border-2 border-fuchsia-300/70 animate-[rarity-sparkle_1.2s_ease-in-out_infinite]" />}
          {rarity === "rare" && <div className="absolute h-64 w-64 rounded-full border border-amber-300/70 animate-[rarity-sparkle_1.8s_ease-in-out_infinite]" />}
        </div>
      )}

      {/* Card container with animation phases */}
      <div
        className={`transition-all duration-500 ease-out ${
          phase === "shrink"
            ? "scale-[2] opacity-50"
            : phase === "flip"
              ? "scale-100 [transform:rotateY(180deg)] opacity-80"
              : "scale-100 [transform:rotateY(0deg)] opacity-100"
        }`}
        style={{
          perspective: "800px",
          transformStyle: "preserve-3d",
          width: "280px",
        }}
      >
        {phase === "shrink" || phase === "flip" ? (
          <div className="w-full h-64 rounded-2xl bg-[var(--surface)] border-3 border-[var(--border)] flex items-center justify-center">
            <span className="text-6xl animate-pulse">?</span>
          </div>
        ) : (
          <StallCard
            dishId={dishId}
            stallName={stallName}
            culturalOrigin={culturalOrigin}
            rarity={rarity}
            tier={tier}
            akarScore={akarScore}
            capturedPhoto={capturedPhoto}
          />
        )}
      </div>

      {/* Rarity text */}
      {phase === "reveal" && (
        <div className="absolute bottom-32 animate-fade-in">
          <p className="text-2xl font-black text-white text-center">
            <span className="block text-5xl font-black tracking-widest" style={{ color: RARITY_CARD_STYLE[rarity].accent, textShadow: "0 3px 10px #000" }}>
              {RARITY_RANK[rarity]}
            </span>
            <span className="mt-1 block text-lg uppercase tracking-[0.25em]">{RARITY_NAME[rarity]}</span>
          </p>
        </div>
      )}

      {/* Continue button */}
      {phase === "done" && (
        <button
          onClick={onComplete}
          className="absolute bottom-20 px-8 py-3 bg-[var(--accent-primary)] text-white font-bold rounded-full shadow-lg animate-fade-in active:scale-95 transition-transform"
        >
          Continue
        </button>
      )}
    </div>
  );
}
