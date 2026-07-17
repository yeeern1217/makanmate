"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { haversineDistance, HERITAGE_CATCH_RADIUS_M } from "@/lib/geo";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { HeritageNode } from "@/types/heritage";
import { computeAkarScore } from "@/lib/scoring/akar-score";
import BottomSheet from "@/components/ui/BottomSheet";
import GlowButton from "@/components/ui/GlowButton";
import LoadingPulse from "@/components/ui/LoadingPulse";
import ProximityGuide from "@/components/map/ProximityGuide";
import LocationSimulator from "@/components/map/LocationSimulator";
import ExaStallSearch from "@/components/map/ExaStallSearch";

const RadarMap = dynamic(() => import("@/components/map/RadarMap"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading map..." />,
});

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
  const simulatedPosition = useAppStore((s) => s.simulatedPosition);
  const discoveredNodes = useAppStore((s) => s.discoveredNodes);
  const setActiveNodeId = useAppStore((s) => s.setActiveNodeId);
  const [selectedNode, setSelectedNode] = useState<HeritageNode | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = window.setTimeout(() => {
        setGpsError(true);
        setLocating(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsError(false);
        setLocating(false);
      },
      () => {
        setGpsError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [setGpsPosition]);

  const displayPosition = simulatedPosition ?? gpsPosition;

  const distanceToNode = (node: HeritageNode) => {
    if (!displayPosition) return null;
    return Math.round(haversineDistance(displayPosition.lat, displayPosition.lng, node.lat, node.lng));
  };

  const nearestGrassroots = useMemo(() => {
    if (!displayPosition) return null;
    return HERITAGE_NODES.filter((node) => node.isGrassroots).reduce<{ node: HeritageNode; distance: number } | null>((closest, node) => {
      const distance = Math.round(haversineDistance(displayPosition.lat, displayPosition.lng, node.lat, node.lng));
      return !closest || distance < closest.distance ? { node, distance } : closest;
    }, null);
  }, [displayPosition]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  if (process.env.NEXT_PUBLIC_STALL_SOURCE === "exa") {
    return <ExaStallSearch />;
  }

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

      {process.env.NODE_ENV !== "production" && <LocationSimulator />}

      {locating && !simulatedPosition && (
        <div className="bg-blue-50 text-blue-800 text-xs text-center py-2 border-b border-blue-200">
          Finding your location…
        </div>
      )}

      {gpsError && !simulatedPosition && (
        <div className="bg-amber-50 text-amber-700 text-xs text-center py-2 border-b border-amber-200">
          GPS unavailable — showing all nodes without distance
        </div>
      )}

      {/* Map + Proximity Guide */}
      <div className="relative flex-1 min-h-0">
        <ProximityGuide nodes={HERITAGE_NODES} userPosition={displayPosition} />
        <RadarMap
          nodes={HERITAGE_NODES}
          discoveredNodes={discoveredNodes}
          userPosition={displayPosition}
          targetNodeId={highlightId ?? nearestGrassroots?.node.id}
          focusNodeId={highlightId}
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

        <div className="absolute bottom-3 left-3 z-30 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2 text-[11px] shadow-sm">
          <span className="font-bold text-[var(--foreground)]">Pin key:</span> number = Akar Score · <span className="text-[#4a7c59]">green</span> = uncaught · <span className="text-[#d4a947]">gold</span> = caught
        </div>
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
                {displayPosition && (
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

            {displayPosition && (
              <p className={`text-sm font-medium ${selectedNode.isGrassroots && distanceToNode(selectedNode)! <= HERITAGE_CATCH_RADIUS_M ? "text-green-700" : "text-[var(--text-muted)]"}`}>
                {selectedNode.isGrassroots && distanceToNode(selectedNode)! <= HERITAGE_CATCH_RADIUS_M
                  ? "You are at this stall — ready to catch."
                  : `Move within ${HERITAGE_CATCH_RADIUS_M}m to catch this stall.`}
              </p>
            )}

            <GlowButton
              size="sm"
              disabled={!selectedNode.isGrassroots || !displayPosition || distanceToNode(selectedNode)! > HERITAGE_CATCH_RADIUS_M}
              onClick={() => {
                setActiveNodeId(selectedNode.id);
                router.push("/scan");
              }}
            >
              {selectedNode.isGrassroots ? "Catch This Stall" : "Not a heritage stall"}
            </GlowButton>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
