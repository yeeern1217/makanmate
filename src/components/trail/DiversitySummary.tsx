"use client";
import type { CulturalOrigin } from "@/types/card";
import type { TrailReflection } from "@/lib/trails/trail-builder";

const ORIGIN_CONFIG: Record<string, { color: string; emoji: string }> = {
  Malay: { color: "#4a7c59", emoji: "🌙" },
  Chinese: { color: "#c4553a", emoji: "🐉" },
  Indian: { color: "#d4a947", emoji: "🪔" },
  Peranakan: { color: "#6b5ce7", emoji: "🌺" },
  Mamak: { color: "#e67e22", emoji: "🫓" },
  Portuguese: { color: "#3498db", emoji: "⚓" },
};

export default function DiversitySummary({
  origins,
  totalAkar,
  totalCards,
  reflection,
}: {
  origins: CulturalOrigin[];
  totalAkar: number;
  totalCards: number;
  reflection?: TrailReflection;
}) {
  const uniqueOrigins = [...new Set(origins)];
  const diversityPercent = Math.round((uniqueOrigins.length / 6) * 100);

  return (
    <div className="retro-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-[var(--accent-primary)]">Cultural Diversity</h3>

      {/* Origin badges */}
      <div className="flex flex-wrap gap-2">
        {uniqueOrigins.map((origin) => {
          const config = ORIGIN_CONFIG[origin] ?? { color: "#888", emoji: "🍽️" };
          return (
            <span
              key={origin}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `${config.color}15`,
                color: config.color,
                border: `1.5px solid ${config.color}44`,
              }}
            >
              {config.emoji} {origin}
            </span>
          );
        })}
      </div>

      {/* Diversity bar */}
      <div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
          <span>{uniqueOrigins.length}/6 cultures explored</span>
          <span>{diversityPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface-dark)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${diversityPercent}%`,
              background: "linear-gradient(90deg, #4a7c59, #d4a947, #c4553a, #6b5ce7)",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs">
        <div className="text-center">
          <p className="font-bold text-lg text-[var(--accent-secondary)]">{totalCards}</p>
          <p className="text-[var(--text-muted)]">Cards</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-[var(--accent-secondary)]">{totalAkar}</p>
          <p className="text-[var(--text-muted)]">Akar Score</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-lg text-[var(--accent-secondary)]">{uniqueOrigins.length}</p>
          <p className="text-[var(--text-muted)]">Cultures</p>
        </div>
      </div>

      {reflection && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
          <h4 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
            Trail Reflection
          </h4>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {reflection.diversityStatement}
          </p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {reflection.rarityHighlight}
          </p>
          <p
            className="text-xs text-[var(--foreground)] leading-relaxed font-semibold"
            style={{ color: "#4a7c59" }}
          >
            {reflection.invisibilityNote}
          </p>
          {reflection.totalDistanceKm > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Total trail distance: {reflection.totalDistanceKm} km
            </p>
          )}
        </div>
      )}
    </div>
  );
}
