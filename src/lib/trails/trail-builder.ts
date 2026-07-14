import type { CapturedCard, HeritageTrail, CulturalOrigin } from "@/types/card";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";

const MIN_CARDS_FOR_TRAIL = 3;

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

export function canBuildTrail(cards: CapturedCard[], existingTrails: HeritageTrail[]): boolean {
  const untrailed = cards.filter((c) => !c.trailId);
  return untrailed.length >= MIN_CARDS_FOR_TRAIL;
}

export function buildTrail(
  cards: CapturedCard[],
  existingTrails: HeritageTrail[]
): HeritageTrail | null {
  const untrailed = cards.filter((c) => !c.trailId);
  if (untrailed.length < MIN_CARDS_FOR_TRAIL) return null;

  const trailCards = untrailed.slice(0, Math.min(untrailed.length, 8));
  const cardIds = trailCards.map((c) => c.id);

  const origins = [...new Set(trailCards.map((c) => c.culturalOrigin))] as CulturalOrigin[];
  const totalAkar = trailCards.reduce((sum, c) => sum + c.akarScore, 0);

  const trailId = `trail-${Date.now()}`;
  const citySet = new Set<string>();
  trailCards.forEach((c) => {
    const node = HERITAGE_NODES.find((n) => n.id === c.stallId);
    if (node) citySet.add(node.city);
  });
  const cities = [...citySet];
  const name = cities.length > 1
    ? `${cities.join(" → ")} Heritage Trail`
    : `${cities[0] ?? "Heritage"} Trail`;

  return {
    id: trailId,
    name,
    cardIds,
    completedAt: new Date().toISOString(),
    historicalThread: "",
    culturalDiversity: origins,
    totalAkarScore: totalAkar,
  };
}

export interface TrailStop {
  cardId: string;
  stallId: string;
  stallName: string;
  dishName: string;
  lat: number;
  lng: number;
  culturalOrigin: CulturalOrigin;
  akarScore: number;
  communityCatchCount: number;
}

export function getTrailStops(trail: HeritageTrail, cards: CapturedCard[]): TrailStop[] {
  return trail.cardIds
    .map((cardId) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return null;
      const node = HERITAGE_NODES.find((n) => n.id === card.stallId);
      if (!node) return null;
      return {
        cardId: card.id,
        stallId: node.id,
        stallName: node.name,
        dishName: node.signature_dish,
        lat: node.lat,
        lng: node.lng,
        culturalOrigin: card.culturalOrigin,
        akarScore: card.akarScore,
        communityCatchCount: node.communityCatchCount,
      };
    })
    .filter(Boolean) as TrailStop[];
}

export function getStallNamesForNarrative(trail: HeritageTrail, cards: CapturedCard[]): string {
  const stops = getTrailStops(trail, cards);
  return stops.map((s) => `${s.stallName} (${s.dishName}, ${s.culturalOrigin})`).join(", ");
}
