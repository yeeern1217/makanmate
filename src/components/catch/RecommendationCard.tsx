"use client";

import type { ScoredRecommendation } from "@/lib/recommender/types";

interface RecommendationCardProps {
  recommendation: ScoredRecommendation;
  phrasedSuggestion: string | null;
  onDismiss: () => void;
  onNavigate: () => void;
}

const SCORE_BARS = [
  { key: "contentSimilarity" as const, label: "Content Match", color: "var(--accent-primary)" },
  { key: "invisibilityBoost" as const, label: "Hidden Gem", color: "#4a7c59" },
  { key: "proximity" as const, label: "Proximity", color: "var(--accent-secondary)" },
  { key: "diversityGap" as const, label: "Diversity", color: "#6b5ce7" },
];

export default function RecommendationCard({
  recommendation,
  phrasedSuggestion,
  onDismiss,
  onNavigate,
}: RecommendationCardProps) {
  const { node, totalScore, breakdown, reasoning } = recommendation;

  const fallbackSuggestion = `You might love ${node.name} — a hidden gem worth exploring next.`;

  return (
    <div className="retro-card animate-slide-up w-full max-w-sm">
      {/* Top label */}
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]/70 mb-1">
        Next Hidden Gem
      </p>

      {/* Stall name + heritage score */}
      <div className="flex items-center justify-between mb-3">
        <h3 id="rec-card-title" className="text-lg font-black text-[var(--foreground)] leading-tight">
          {node.name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30">
          {Math.round(totalScore)}
        </span>
      </div>

      {/* Phrased suggestion */}
      <p
        aria-live="polite"
        className={`text-sm italic text-[var(--text-muted)] mb-4 leading-relaxed${phrasedSuggestion === null ? " animate-pulse" : ""}`}
      >
        {phrasedSuggestion ?? fallbackSuggestion}
      </p>

      {/* Score breakdown bars */}
      <div className="space-y-2 mb-4">
        {SCORE_BARS.map(({ key, label, color }) => {
          const value = Math.min(100, Math.max(0, Math.round(breakdown[key])));
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold text-[var(--foreground)]/70">
                  {label}
                </span>
                <span className="text-[11px] font-bold text-[var(--foreground)]/50">
                  {value}%
                </span>
              </div>
              <div className="w-full h-[6px] rounded-full bg-[var(--foreground)]/10">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${value}%`, backgroundColor: color }}
                  role="progressbar"
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${label}: ${value}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reasoning tags */}
      {reasoning.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {reasoning.map((reason) => (
            <span
              key={reason}
              className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--foreground)]/5 text-[var(--text-muted)] border border-[var(--foreground)]/10"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNavigate}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[var(--foreground)] bg-[var(--accent-secondary)] hover:brightness-110 transition-all active:scale-95"
        >
          Navigate
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm font-semibold text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
