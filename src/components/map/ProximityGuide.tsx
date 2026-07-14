"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeritageNode } from "@/types/heritage";
import { GPSPosition } from "@/types/ai";
import { getPersonaForRegion } from "@/lib/voice/personas";
import { speak } from "@/lib/voice/voice-guide";

type ProximityLevel = "far" | "warm" | "hot" | "arrived";

function classifyDistance(meters: number): ProximityLevel {
  if (meters <= 50) return "arrived";
  if (meters <= 200) return "hot";
  if (meters <= 500) return "warm";
  return "far";
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LEVEL_STYLES: Record<ProximityLevel, string> = {
  far: "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]",
  warm: "bg-amber-50 text-amber-800 border-amber-300",
  hot: "bg-orange-50 text-orange-800 border-orange-400",
  arrived: "bg-green-50 text-green-800 border-green-500",
};

export default function ProximityGuide({
  nodes,
  userPosition,
}: {
  nodes: HeritageNode[];
  userPosition: GPSPosition | null;
}) {
  const [phrase, setPhrase] = useState<string | null>(null);
  const [level, setLevel] = useState<ProximityLevel>("far");
  const lastLevel = useRef<ProximityLevel>("far");

  const grassrootsNodes = useMemo(
    () => nodes.filter((n) => n.isGrassroots),
    [nodes]
  );

  useEffect(() => {
    if (!userPosition || grassrootsNodes.length === 0) return;

    let nearest: HeritageNode | null = null;
    let minDist = Infinity;
    for (const node of grassrootsNodes) {
      const d = haversine(userPosition.lat, userPosition.lng, node.lat, node.lng);
      if (d < minDist) {
        minDist = d;
        nearest = node;
      }
    }

    if (!nearest) return;

    const newLevel = classifyDistance(minDist);
    setLevel(newLevel);

    if (newLevel !== lastLevel.current) {
      lastLevel.current = newLevel;
      const persona = getPersonaForRegion(nearest.city);
      const phrases = persona.proximityPhrases[newLevel];
      const picked = phrases[Math.floor(Math.random() * phrases.length)];
      setPhrase(picked);
      speak(picked);
    }
  }, [userPosition, grassrootsNodes]);

  if (!phrase) return null;

  return (
    <div
      className={`absolute top-2 left-2 right-2 z-30 rounded-xl border-2 px-4 py-3 shadow-lg transition-all duration-500 ${LEVEL_STYLES[level]}`}
    >
      <p className="text-sm font-semibold leading-snug">{phrase}</p>
    </div>
  );
}
