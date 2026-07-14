"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getCurrentPosition } from "@/lib/gps";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
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

export default function RadarPage() {
  const router = useRouter();
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

  const distanceToNode = (node: HeritageNode) => {
    if (!gpsPosition) return null;
    return Math.round(haversineDistance(gpsPosition.lat, gpsPosition.lng, node.lat, node.lng));
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b-2 border-[var(--border)] z-20 relative">
        <h1 className="text-sm font-bold text-[var(--accent-primary)]">Heritage Radar</h1>
        <span className="text-xs text-[var(--text-muted)]">
          {discoveredNodes.length}/{HERITAGE_NODES.filter((n) => n.isGrassroots).length} discovered
        </span>
      </div>

      {gpsError && (
        <div className="bg-amber-50 text-amber-700 text-xs text-center py-2 border-b border-amber-200">
          GPS unavailable — showing all nodes without distance
        </div>
      )}

      {/* Map + Proximity Guide */}
      <div className="relative" style={{ width: "100%", height: "calc(100dvh - 48px - 72px)" }}>
        <ProximityGuide nodes={HERITAGE_NODES} userPosition={gpsPosition} />
        <RadarMap
          nodes={HERITAGE_NODES}
          discoveredNodes={discoveredNodes}
          userPosition={gpsPosition}
          onNodeClick={setSelectedNode}
        />
      </div>

      {/* Bottom Sheet */}
      <BottomSheet open={!!selectedNode} onClose={() => setSelectedNode(null)}>
        {selectedNode && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">{selectedNode.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {selectedNode.city} · {selectedNode.type}
                  <span className="ml-2 inline-block rounded-full bg-[var(--surface-dark)] px-2 py-0.5 text-xs">
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

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">
                Signature:{" "}
                <span className="text-[var(--foreground)] font-medium">
                  {selectedNode.signature_dish}
                </span>
              </span>
              {gpsPosition && (
                <span className="text-[var(--text-muted)]">
                  {formatDistance(distanceToNode(selectedNode)!)}
                </span>
              )}
            </div>

            {selectedNode.founded && (
              <p className="text-xs text-[var(--text-muted)]">Founded {selectedNode.founded}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>{selectedNode.communityCatchCount} explorers caught this stall</span>
            </div>

            <GlowButton
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
