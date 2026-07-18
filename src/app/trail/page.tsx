"use client";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCardStore } from "@/store/useCardStore";
import {
  canBuildTrail,
  buildTrail,
  getTrailStops,
  getStallNamesForNarrative,
  buildTrailReflection,
  resolveTrailForCards,
} from "@/lib/trails/trail-builder";
import type { HeritageTrail } from "@/types/card";
import DiversitySummary from "@/components/trail/DiversitySummary";
import ShareableCard from "@/components/trail/ShareableCard";
import { shareTrailCard } from "@/lib/share/generate-share-image";
import { narrateStory, stopSpeaking } from "@/lib/voice/voice-guide";
import LoadingPulse from "@/components/ui/LoadingPulse";

const TrailMap = dynamic(() => import("@/components/trail/TrailMap"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading map..." />,
});

function buildFallbackThread(trail: HeritageTrail): string {
  const origins = trail.culturalDiversity.join(", ");
  const stops = trail.cardIds.length;
  return `Your trail links ${stops} heritage stalls, weaving ${origins} food traditions into one journey through Malaysia's living street-food history.`;
}

export default function TrailPage() {
  const cards = useCardStore((s) => s.cards);
  const trails = useCardStore((s) => s.trails);
  const addTrail = useCardStore((s) => s.addTrail);
  const updateTrail = useCardStore((s) => s.updateTrail);
  const heritageUnlocked = useCardStore((s) => s.getHeritageUnlockedTotal());
  const akarTotal = useCardStore((s) => s.getAkarScoreTotal());
  const [mounted, setMounted] = useState(false);

  const [activeTrail, setActiveTrail] = useState<HeritageTrail | null>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [narratingThread, setNarratingThread] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !activeTrail && trails.length > 0) {
      setActiveTrail(trails[trails.length - 1]);
    }
  }, [mounted, activeTrail, trails]);

  const canBuild = mounted ? canBuildTrail(cards, trails) : false;
  const displayCards = mounted ? cards : [];
  const displayAkarTotal = mounted ? akarTotal : 0;
  const displayHeritageUnlocked = mounted ? heritageUnlocked : 0;
  const resolvedActiveTrail = useMemo(
    () => (mounted && activeTrail ? resolveTrailForCards(activeTrail, cards) : null),
    [mounted, activeTrail, cards]
  );

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
      const thread: string =
        data.result?.historical_thread ?? buildFallbackThread(trail);
      updateTrail(trail.id, { historicalThread: thread });
      setActiveTrail({ ...trail, historicalThread: thread });
    } catch (err) {
      console.error("Trail narrative error:", err);
      const thread = buildFallbackThread(trail);
      updateTrail(trail.id, { historicalThread: thread });
      setActiveTrail({ ...trail, historicalThread: thread });
    } finally {
      setLoadingNarrative(false);
    }
  }, [cards, trails, addTrail, updateTrail]);

  const handleShare = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    await shareTrailCard(shareRef.current);
    setSharing(false);
  };

  const toggleNarrateThread = () => {
    if (narratingThread) {
      stopSpeaking();
      setNarratingThread(false);
    } else if (resolvedActiveTrail?.historicalThread) {
      narrateStory(resolvedActiveTrail.historicalThread);
      setNarratingThread(true);
    }
  };

  const stops = useMemo(
    () => (resolvedActiveTrail ? getTrailStops(resolvedActiveTrail, cards) : []),
    [resolvedActiveTrail, cards]
  );
  const reflection = useMemo(
    () => (resolvedActiveTrail ? buildTrailReflection(resolvedActiveTrail, cards) : undefined),
    [resolvedActiveTrail, cards]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm">
        <h1 className="text-lg font-black text-[var(--accent-primary)]">Heritage Trail</h1>
        <div className="flex gap-3 text-xs">
          <span className="font-bold text-[var(--accent-secondary)]">{displayAkarTotal}</span>
          <span className="text-[var(--text-muted)]">Akar</span>
          <span className="text-[var(--text-muted)]">|</span>
          <span className="font-bold text-[var(--accent-secondary)]">{displayHeritageUnlocked}</span>
          <span className="text-[var(--text-muted)]">Unlocked</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* No cards state */}
        {mounted && displayCards.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
            {/* Animated trail on a map — 3 stops along a winding route */}
            <div className="relative mx-auto mb-8 h-56 w-full max-w-[23rem] overflow-hidden rounded-2xl border-2 border-[var(--border)]/60 bg-[var(--surface)]/60 shadow-inner">
              {/* map texture — street grid */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                  backgroundSize: "26px 26px",
                }}
              />
              {/* terrain features */}
              <div aria-hidden className="absolute -left-5 -top-4 h-16 w-24 rounded-full bg-[var(--accent-grassroots)]/15" />
              <div aria-hidden className="absolute -bottom-5 right-8 h-16 w-28 rounded-[45%] bg-[#5b8bc4]/15" />
              {/* map flourishes */}
              <span className="absolute right-2.5 top-2 text-base opacity-40">🧭</span>

              {/* winding route + a traveler moving along it */}
              <svg
                viewBox="0 0 240 130"
                preserveAspectRatio="none"
                fill="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                <path
                  id="trailRoute"
                  d="M30 40 Q120 120 210 40"
                  stroke="var(--accent-primary)"
                  strokeOpacity="0.55"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="6 7"
                  className="animate-trail-dash"
                />
                <circle r="5.5" fill="var(--accent-primary)" style={{ filter: "drop-shadow(0 0 5px var(--accent-primary))" }}>
                  <animateMotion dur="4s" repeatCount="indefinite" calcMode="linear">
                    <mpath href="#trailRoute" />
                  </animateMotion>
                </circle>
              </svg>

              {/* numbered stops: high → low → high */}
              {[
                { left: "12.5%", top: "31%", label: "1" },
                { left: "50%", top: "62%", label: "2" },
                { left: "87.5%", top: "31%", label: "3", end: true },
              ].map((p, i) => (
                <div
                  key={i}
                  className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--accent-primary)]/50 bg-[var(--surface)] text-lg font-black text-[var(--accent-primary)] shadow-md animate-float"
                  style={{ left: p.left, top: p.top, animationDelay: `${i * 0.35}s` }}
                >
                  {p.label}
                  {p.end && <span className="absolute -right-2.5 -top-4 text-xl">🚩</span>}
                </div>
              ))}
            </div>

            <h2 className="text-xl font-black text-[var(--foreground)]">Build your Heritage Trail</h2>
            <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-[var(--text-muted)]">
              Catch at least 3 heritage stalls and we&apos;ll connect them into your own cultural food trail.
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]/70">
              0 of 3 stalls caught
            </p>

            <div className="relative mt-7 inline-flex">
              {/* breathing glow halo */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-lg animate-glow-pulse"
              />
              <Link
                href="/radar"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-[0_4px_0_var(--border),0_8px_24px_rgba(196,85,58,0.35)] transition-all hover:translate-y-[1px] hover:shadow-[0_3px_0_var(--border),0_5px_16px_rgba(196,85,58,0.45)] active:translate-y-[4px] active:shadow-none"
                style={{ background: "linear-gradient(135deg, var(--accent-primary), #e07a52)" }}
              >
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
        )}

        {/* Not enough cards */}
        {mounted && displayCards.length > 0 && displayCards.length < 3 && !activeTrail && (
          <div className="retro-card p-4 text-center space-y-2">
            <p className="text-sm font-bold">Keep catching!</p>
            <p className="text-xs text-[var(--text-muted)]">
              You have {displayCards.length}/3 cards. Catch {3 - displayCards.length} more to build a trail.
            </p>
            <div className="h-1.5 rounded-full bg-[var(--surface-dark)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-secondary)] transition-all"
                style={{ width: `${(displayCards.length / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Build trail button */}
        {mounted && canBuild && !activeTrail && (
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
        {resolvedActiveTrail && (
          <>
            {/* Trail map — fills the screen down to the bottom nav.
                Height = viewport - header (~3.5rem) - bottom nav (72px).
                -mx-4 / -mt-4 break out of the scroll container's padding so it
                sits edge-to-edge starting right under the header. */}
            {stops.length > 0 ? (
              <div className="relative -mx-4 -mt-4 h-64 min-h-[16rem] border-b-2 border-[var(--border)] md:h-72">
                <TrailMap stops={stops} />
                <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-1 shadow-sm backdrop-blur-sm">
                  <span className="text-xs font-bold text-[var(--foreground)]">{resolvedActiveTrail.name}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-sm font-bold text-center">{resolvedActiveTrail.name}</h2>
            )}

            {/* Historical thread */}
            {loadingNarrative && <LoadingPulse text="Weaving the historical thread..." />}
            {resolvedActiveTrail.historicalThread && (
              <div className="retro-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[var(--accent-secondary)]">Historical Thread</h3>
                  <button
                    onClick={toggleNarrateThread}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 active:scale-95 transition-transform"
                  >
                    {narratingThread ? "⏹ Stop" : "🔊 Listen"}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-[var(--foreground)] italic">
                  &ldquo;{resolvedActiveTrail.historicalThread}&rdquo;
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
              origins={resolvedActiveTrail.culturalDiversity}
              totalAkar={resolvedActiveTrail.totalAkarScore}
              totalCards={stops.length}
              reflection={reflection}
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
              <ShareableCard ref={shareRef} trail={resolvedActiveTrail} stops={stops} />
            </div>

            {/* Past trails */}
            {trails.length > 1 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-[var(--text-muted)]">Past Trails</h3>
                {trails
                  .filter((t) => t.id !== resolvedActiveTrail.id)
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
