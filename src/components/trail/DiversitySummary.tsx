"use client";
import type { CulturalOrigin } from "@/types/card";

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
}: {
  origins: CulturalOrigin[];
  totalAkar: number;
  totalCards: number;
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
    </div>
  );
}
