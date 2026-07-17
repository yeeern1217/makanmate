"use client";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getCurrentPosition } from "@/lib/gps";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { HeritageNode } from "@/types/heritage";
import { computeAkarScore } from "@/lib/scoring/akar-score";
import BottomSheet from "@/components/ui/BottomSheet";
import GlowButton from "@/components/ui/GlowButton";
import LoadingPulse from "@/components/ui/LoadingPulse";
import ProximityGuide from "@/components/map/ProximityGuide";

const RadarMap = dynamic(() => import("@/components/map/RadarMap"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading map..." />,
});

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RadarPageWrapper() {
  return (
    <Suspense>
      <RadarPage />
    </Suspense>
  );
}

function RadarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const gpsPosition = useAppStore((s) => s.gpsPosition);
  const setGpsPosition = useAppStore((s) => s.setGpsPosition);
  const discoveredNodes = useAppStore((s) => s.discoveredNodes);
  const setActiveNodeId = useAppStore((s) => s.setActiveNodeId);
  const [selectedNode, setSelectedNode] = useState<HeritageNode | null>(null);
  const [gpsError, setGpsError] = useState(false);

  useEffect(() => {
    getCurrentPosition()
      .then(setGpsPosition)
      .catch(() => setGpsError(true));
  }, [setGpsPosition]);

  // Auto-select and center on highlighted node from query param
  useEffect(() => {
    if (!highlightId) return;
    const node = HERITAGE_NODES.find((n) => n.id === highlightId);
    if (node) {
      setSelectedNode(node);
    }
  }, [highlightId]);

  const distanceToNode = (node: HeritageNode) => {
    if (!gpsPosition) return null;
    return Math.round(haversineDistance(gpsPosition.lat, gpsPosition.lng, node.lat, node.lng));
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 bg-[var(--surface)] border-b-2 border-[var(--border)] z-20 relative">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]/70">
            Live Map
          </p>
          <h1 className="text-2xl font-black leading-tight text-[var(--foreground)]">Heritage Radar</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Hunt down legendary street-food stalls near you.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-dark)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
          <span className="text-[var(--accent-primary)]">{discoveredNodes.length}</span>
          /{HERITAGE_NODES.filter((n) => n.isGrassroots).length} discovered
        </span>
      </div>

      {gpsError && (
        <div className="bg-amber-50 text-amber-700 text-xs text-center py-2 border-b border-amber-200">
          GPS unavailable — showing all nodes without distance
        </div>
      )}

      {/* Map + Proximity Guide */}
      <div className="relative flex-1 min-h-0">
        <ProximityGuide nodes={HERITAGE_NODES} userPosition={gpsPosition} />
        <RadarMap
          nodes={HERITAGE_NODES}
          discoveredNodes={discoveredNodes}
          userPosition={gpsPosition}
          onNodeClick={setSelectedNode}
          initialCenter={
            highlightId
              ? (() => {
                  const hn = HERITAGE_NODES.find((n) => n.id === highlightId);
                  return hn ? [hn.lng, hn.lat] as [number, number] : undefined;
                })()
              : undefined
          }
          initialZoom={highlightId ? 15 : undefined}
        />
      </div>

      {/* Bottom Sheet */}
      <BottomSheet open={!!selectedNode} onClose={() => setSelectedNode(null)}>
        {selectedNode && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedNode.name}</h2>
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--text-muted)]">
                  <span>{selectedNode.city} · {selectedNode.type}</span>
                  <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface-dark)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {selectedNode.culturalOrigin}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[var(--accent-primary)]">
                  {computeAkarScore(selectedNode)}
                </div>
                <div className="text-xs text-[var(--text-muted)]">Akar Score</div>
              </div>
            </div>

            <p className="text-sm text-[var(--foreground)]">{selectedNode.description}</p>

            <div className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-[var(--accent-secondary)]/40 bg-[var(--surface-dark)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              {/* shimmer sweep — light catching a collectible seal */}
              <div
                className="pointer-events-none absolute inset-0 animate-badge-shine"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(212,169,71,0.28) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animationDuration: "6s",
                }}
              />
              {/* oversized watermark bleeding off the right — collectible-card motif */}
              <div className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 rotate-12 select-none text-[7rem] leading-none opacity-[0.07]">
                {POKEDEX_ENTRIES.find((d) => d.id === selectedNode.dish_id)?.emoji ?? "🍽️"}
              </div>
              {/* emoji medallion — a stamped seal of authenticity */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-secondary)]/30 to-[var(--accent-primary)]/20 text-3xl ring-2 ring-[var(--accent-secondary)]/60 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.15),0_2px_6px_rgba(196,85,58,0.25)]">
                {POKEDEX_ENTRIES.find((d) => d.id === selectedNode.dish_id)?.emoji ?? "🍽️"}
              </div>
              <div className="relative min-w-0 flex-1">
                <p className="text-base font-bold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
                  Signature Dish ⭐
                </p>
                <p className="truncate text-base font-bold leading-tight text-[var(--foreground)]">
                  {selectedNode.signature_dish}
                </p>
                {gpsPosition && (
                  <p className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">
                    📍 {formatDistance(distanceToNode(selectedNode)!)} away
                  </p>
                )}
              </div>
            </div>

            {selectedNode.founded && (
              <p className="text-sm text-[var(--text-muted)]">Founded {selectedNode.founded}</p>
            )}

            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span>{selectedNode.communityCatchCount} explorers caught this stall</span>
            </div>

            <GlowButton
              size="sm"
              onClick={() => {
                setActiveNodeId(selectedNode.id);
                router.push("/scan");
              }}
            >
              Catch This Stall
            </GlowButton>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
