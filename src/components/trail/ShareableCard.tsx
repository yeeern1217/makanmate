"use client";
import { forwardRef } from "react";
import type { HeritageTrail, CulturalOrigin } from "@/types/card";
import type { TrailStop } from "@/lib/trails/trail-builder";
import { CREATURE_EMOJI } from "@/lib/data/creatures";

const ORIGIN_COLORS: Record<string, string> = {
  Malay: "#4a7c59",
  Chinese: "#c4553a",
  Indian: "#d4a947",
  Peranakan: "#6b5ce7",
  Mamak: "#e67e22",
  Portuguese: "#3498db",
};

const ShareableCard = forwardRef<
  HTMLDivElement,
  { trail: HeritageTrail; stops: TrailStop[] }
>(function ShareableCard({ trail, stops }, ref) {
  const uniqueOrigins = [...new Set(trail.culturalDiversity)] as CulturalOrigin[];

  return (
    <div
      ref={ref}
      className="w-[360px] p-5 rounded-2xl border-2 border-[var(--border)] shadow-xl"
      style={{
        background: "linear-gradient(135deg, #faf3e0 0%, #f0e6d0 50%, #e8dcc8 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-black text-[var(--accent-primary)]">MakanMate</h2>
        <p className="text-[10px] text-[var(--text-muted)]">Heritage Food Discovery</p>
      </div>

      {/* Trail name */}
      <h3 className="text-sm font-bold text-center mb-3">{trail.name}</h3>

      {/* Card thumbnails */}
      <div className="flex justify-center gap-2 mb-4">
        {stops.slice(0, 6).map((stop) => {
          const emoji = CREATURE_EMOJI[stop.stallId.replace(/-/g, "")] ??
            CREATURE_EMOJI[stops.indexOf(stop) < 12 ? Object.keys(CREATURE_EMOJI)[stops.indexOf(stop)] : ""] ??
            "🎴";
          const color = ORIGIN_COLORS[stop.culturalOrigin] ?? "#888";
          return (
            <div
              key={stop.cardId}
              className="w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5"
              style={{ borderColor: color, background: `${color}10` }}
            >
              <span className="text-xl">{CREATURE_EMOJI[stop.stallId.split("-").slice(0, -1).join("-")] ?? "🎴"}</span>
              <span className="text-[7px] font-bold" style={{ color }}>{stop.culturalOrigin.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex justify-around text-center mb-3 py-2 rounded-lg bg-white/50">
        <div>
          <p className="text-sm font-bold text-[var(--accent-secondary)]">{trail.totalAkarScore}</p>
          <p className="text-[9px] text-[var(--text-muted)]">Akar Score</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--accent-secondary)]">{stops.length}</p>
          <p className="text-[9px] text-[var(--text-muted)]">Stalls</p>
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--accent-secondary)]">{uniqueOrigins.length}</p>
          <p className="text-[9px] text-[var(--text-muted)]">Cultures</p>
        </div>
      </div>

      {/* Diversity */}
      <div className="flex justify-center gap-1.5 mb-3">
        {uniqueOrigins.map((o) => (
          <span
            key={o}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${ORIGIN_COLORS[o]}20`, color: ORIGIN_COLORS[o] }}
          >
            {o}
          </span>
        ))}
      </div>

      {/* Historical thread */}
      {trail.historicalThread && (
        <p className="text-[10px] text-center text-[var(--text-muted)] italic leading-relaxed mb-3">
          &ldquo;{trail.historicalThread}&rdquo;
        </p>
      )}

      {/* Footer */}
      <div className="text-center">
        <p className="text-[8px] text-[var(--text-muted)]">
          {trail.completedAt
            ? new Date(trail.completedAt).toLocaleDateString("en-MY", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : ""}
        </p>
      </div>
    </div>
  );
});

export default ShareableCard;
