"use client";
import { useState, useEffect } from "react";
import type { CardTier, RarityClass, CulturalOrigin } from "@/types/card";
import { speak } from "@/lib/voice/voice-guide";
import StallCard from "@/components/catch/StallCard";

const TIER_CONFIG: Record<CardTier, { label: string; color: string; glow: string; emoji: string }> = {
  bronze: { label: "Bronze", color: "var(--tier-bronze)", glow: "#cd7f3266", emoji: "🥉" },
  silver: { label: "Silver", color: "var(--tier-silver)", glow: "#aab7c466", emoji: "🥈" },
  gold: { label: "Gold", color: "var(--tier-gold)", glow: "#d4a94766", emoji: "🥇" },
};

function particleSpec(i: number) {
  const r = (seed: number) => {
    const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return { distance: 60 + r(1) * 40, duration: 0.5 + r(2) * 0.5 };
}

export default function CardEvolution({
  fromTier,
  toTier,
  dishName,
  dishId,
  stallName,
  culturalOrigin,
  rarity,
  akarScore,
  capturedPhoto,
  onComplete,
}: {
  fromTier: CardTier;
  toTier: CardTier;
  dishName: string;
  dishId: string;
  stallName: string;
  culturalOrigin: CulturalOrigin;
  rarity: RarityClass;
  akarScore: number;
  capturedPhoto?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"shimmer" | "burst" | "reveal">("shimmer");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("burst"), 1200);
    const t2 = setTimeout(() => {
      setPhase("reveal");
      speak(`Congratulations! Your ${dishName} card evolved to ${TIER_CONFIG[toTier].label}!`);
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dishName, toTier]);

  const to = TIER_CONFIG[toTier];
  const from = TIER_CONFIG[fromTier];
  const displayTier = phase === "reveal" ? toTier : fromTier;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Evolution card */}
        <div className="relative inline-block">
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              boxShadow: phase === "burst" || phase === "reveal"
                ? `0 0 60px ${to.glow}, 0 0 120px ${to.glow}`
                : `0 0 20px ${from.glow}`,
              transition: "box-shadow 0.8s ease-in-out",
            }}
          />

          {/* Card */}
          <div
            style={{
              width: 260,
              transform: phase === "shimmer"
                ? "scale(1) rotateY(0deg)"
                : phase === "burst"
                  ? "scale(1.15) rotateY(180deg)"
                  : "scale(1.05) rotateY(360deg)",
              transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <StallCard
              dishId={dishId}
              stallName={stallName}
              culturalOrigin={culturalOrigin}
              rarity={rarity}
              tier={displayTier}
              akarScore={akarScore}
              capturedPhoto={capturedPhoto}
            />
          </div>

          {/* Particles */}
          {(phase === "burst" || phase === "reveal") && (
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {Array.from({ length: 12 }).map((_, i) => {
                const spec = particleSpec(i);
                return (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: to.color,
                      left: "50%",
                      top: "50%",
                      transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-${spec.distance}px)`,
                      opacity: phase === "reveal" ? 0 : 1,
                      transition: `all ${spec.duration}s ease-out`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Text */}
        {phase === "reveal" && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xl font-bold text-white">
              {from.emoji} &rarr; {to.emoji}
            </p>
            <p className="text-sm text-white/80">
              Your card evolved to <span style={{ color: to.color }} className="font-bold">{to.label}</span>!
            </p>
            <button
              onClick={onComplete}
              className="px-8 py-3 rounded-full font-bold text-sm text-white shadow-lg active:scale-95 transition-transform"
              style={{ background: to.color }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
