"use client";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCardStore } from "@/store/useCardStore";
import {
  canBuildTrail,
  buildTrail,
  getTrailStops,
  getStallNamesForNarrative,
} from "@/lib/trails/trail-builder";
import type { HeritageTrail } from "@/types/card";
import DiversitySummary from "@/components/trail/DiversitySummary";
import ShareableCard from "@/components/trail/ShareableCard";
import { shareTrailCard } from "@/lib/share/generate-share-image";
import LoadingPulse from "@/components/ui/LoadingPulse";

const TrailMap = dynamic(() => import("@/components/trail/TrailMap"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading map..." />,
});

export default function TrailPage() {
  const cards = useCardStore((s) => s.cards);
  const trails = useCardStore((s) => s.trails);
  const addTrail = useCardStore((s) => s.addTrail);
  const heritageUnlocked = useCardStore((s) => s.getHeritageUnlockedTotal());
  const akarTotal = useCardStore((s) => s.getAkarScoreTotal());

  const [activeTrail, setActiveTrail] = useState<HeritageTrail | null>(
    trails.length > 0 ? trails[trails.length - 1] : null
  );
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const canBuild = canBuildTrail(cards, trails);

  const handleBuildTrail = useCallback(async () => {
    const trail = buildTrail(cards, trails);
    if (!trail) return;

    setLoadingNarrative(true);

    // Mark cards as part of this trail
    // (In a full app, we'd update card.trailId in the store)
    addTrail(trail);
    setActiveTrail(trail);

    // Fetch narrative from Gemini
    try {
      const stallNames = getStallNamesForNarrative(trail, cards);
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ mode: "trail-narrative", stalls: stallNames }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.result?.historical_thread) {
        const updatedTrail = {
          ...trail,
          historicalThread: data.result.historical_thread,
        };
        setActiveTrail(updatedTrail);
      }
    } catch (err) {
      console.error("Trail narrative error:", err);
    } finally {
      setLoadingNarrative(false);
    }
  }, [cards, trails, addTrail]);

  const handleShare = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    await shareTrailCard(shareRef.current);
    setSharing(false);
  };

  const stops = activeTrail ? getTrailStops(activeTrail, cards) : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm">
        <h1 className="text-lg font-black text-[var(--accent-primary)]">Heritage Trail</h1>
        <div className="flex gap-3 text-xs">
          <span className="font-bold text-[var(--accent-secondary)]">{akarTotal}</span>
          <span className="text-[var(--text-muted)]">Akar</span>
          <span className="text-[var(--text-muted)]">|</span>
          <span className="font-bold text-[var(--accent-secondary)]">{heritageUnlocked}</span>
          <span className="text-[var(--text-muted)]">Unlocked</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* No cards state */}
        {cards.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-4xl">🗺️</p>
            <p className="text-sm text-[var(--text-muted)]">
              Catch at least 3 stalls to build your first Heritage Trail!
            </p>
            <Link
              href="/radar"
              className="inline-block px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm shadow-[0_4px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Open Radar
            </Link>
          </div>
        )}

        {/* Not enough cards */}
        {cards.length > 0 && cards.length < 3 && !activeTrail && (
          <div className="retro-card p-4 text-center space-y-2">
            <p className="text-sm font-bold">Keep catching!</p>
            <p className="text-xs text-[var(--text-muted)]">
              You have {cards.length}/3 cards. Catch {3 - cards.length} more to build a trail.
            </p>
            <div className="h-1.5 rounded-full bg-[var(--surface-dark)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-secondary)] transition-all"
                style={{ width: `${(cards.length / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Build trail button */}
        {canBuild && !activeTrail && (
          <div className="text-center">
            <button
              onClick={handleBuildTrail}
              disabled={loadingNarrative}
              className="px-8 py-3 rounded-full bg-[var(--accent-secondary)] text-white font-bold text-sm shadow-[0_4px_0_var(--border)] hover:translate-y-[2px] hover:shadow-[0_2px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all animate-pulse-warm disabled:opacity-50"
            >
              🗺️ Build Heritage Trail
            </button>
          </div>
        )}

        {/* Active trail display */}
        {activeTrail && (
          <>
            <h2 className="text-sm font-bold text-center">{activeTrail.name}</h2>

            {/* Trail map */}
            {stops.length > 0 && <TrailMap stops={stops} />}

            {/* Historical thread */}
            {loadingNarrative && <LoadingPulse text="Weaving the historical thread..." />}
            {activeTrail.historicalThread && (
              <div className="retro-card p-4">
                <h3 className="text-xs font-bold text-[var(--accent-secondary)] mb-1">Historical Thread</h3>
                <p className="text-xs leading-relaxed text-[var(--foreground)] italic">
                  &ldquo;{activeTrail.historicalThread}&rdquo;
                </p>
              </div>
            )}

            {/* Stop list with community layer */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-muted)]">Trail Stops</h3>
              {stops.map((stop, i) => (
                <div
                  key={stop.cardId}
                  className="retro-card p-3 flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{
                      background:
                        stop.culturalOrigin === "Malay" ? "#4a7c59" :
                        stop.culturalOrigin === "Chinese" ? "#c4553a" :
                        stop.culturalOrigin === "Indian" ? "#d4a947" :
                        stop.culturalOrigin === "Peranakan" ? "#6b5ce7" :
                        stop.culturalOrigin === "Mamak" ? "#e67e22" :
                        "#3498db",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{stop.stallName}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{stop.dishName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-[var(--accent-secondary)]">{stop.akarScore} pts</p>
                    <p className="text-[9px] text-[var(--text-muted)]">{stop.communityCatchCount} catches</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Diversity summary */}
            <DiversitySummary
              origins={activeTrail.culturalDiversity}
              totalAkar={activeTrail.totalAkarScore}
              totalCards={stops.length}
            />

            {/* Share button */}
            <div className="text-center">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="px-8 py-3 rounded-full bg-[var(--accent-primary)] text-white font-bold text-sm shadow-[0_4px_0_var(--border)] hover:translate-y-[2px] hover:shadow-[0_2px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
              >
                {sharing ? "Generating..." : "📤 Share Trail Card"}
              </button>
            </div>

            {/* Shareable card (hidden, used for screenshot) */}
            <div className="overflow-hidden" style={{ height: 0 }}>
              <ShareableCard ref={shareRef} trail={activeTrail} stops={stops} />
            </div>

            {/* Past trails */}
            {trails.length > 1 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-[var(--text-muted)]">Past Trails</h3>
                {trails
                  .filter((t) => t.id !== activeTrail.id)
                  .reverse()
                  .map((trail) => (
                    <button
                      key={trail.id}
                      onClick={() => setActiveTrail(trail)}
                      className="w-full retro-card p-3 text-left flex items-center justify-between active:scale-[0.98] transition-transform"
                    >
                      <div>
                        <p className="text-xs font-bold">{trail.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {trail.cardIds.length} stops &middot; {trail.culturalDiversity.length} cultures
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[var(--accent-secondary)]">
                        {trail.totalAkarScore} pts
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
