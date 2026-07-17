import type { CapturedCard, HeritageTrail, CulturalOrigin } from "@/types/card";
import type { HeritageNode } from "@/types/heritage";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";

const ALL_ORIGINS: CulturalOrigin[] = ["Malay", "Chinese", "Indian", "Peranakan", "Mamak", "Portuguese"];
const TOTAL_ORIGINS = ALL_ORIGINS.length;

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

export function resolveTrailForCards(
  trail: HeritageTrail,
  cards: CapturedCard[]
): HeritageTrail {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const resolvedCards = trail.cardIds
    .map((cardId) => cardById.get(cardId))
    .filter(Boolean) as CapturedCard[];
  const trailCards = resolvedCards.length > 0 ? resolvedCards : cards.slice(0, Math.min(cards.length, 8));

  return {
    ...trail,
    cardIds: trailCards.map((card) => card.id),
    culturalDiversity: [...new Set(trailCards.map((card) => card.culturalOrigin))] as CulturalOrigin[],
    totalAkarScore: trailCards.reduce((sum, card) => sum + card.akarScore, 0),
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

export interface TrailReflection {
  diversityStatement: string;
  rarityHighlight: string;
  invisibilityNote: string;
  totalDistanceKm: number;
}

export function buildTrailReflection(
  trail: HeritageTrail,
  cards: CapturedCard[]
): TrailReflection {
  const trailCards = trail.cardIds
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as CapturedCard[];

  if (trailCards.length === 0) {
    return {
      diversityStatement: "No cards found for this trail.",
      rarityHighlight: "",
      invisibilityNote: "",
      totalDistanceKm: 0,
    };
  }

  const nodeById = new Map(HERITAGE_NODES.map((n) => [n.id, n]));

  // Diversity
  const uniqueOrigins = [...new Set(trailCards.map((c) => c.culturalOrigin))];
  const diversityStatement =
    uniqueOrigins.length === 0
      ? "No cultural traditions resolved for this trail."
      : uniqueOrigins.length >= 4
      ? `Incredible — you explored ${uniqueOrigins.length} out of ${TOTAL_ORIGINS} cultural traditions: ${uniqueOrigins.join(", ")}`
      : `You explored ${uniqueOrigins.length} cultural tradition${uniqueOrigins.length > 1 ? "s" : ""}: ${uniqueOrigins.join(", ")}`;

  // Rarity
  const rarestCard = trailCards.reduce(
    (best, c) => (c.akarScore > best.akarScore ? c : best),
    trailCards[0]
  );
  const rarestNode = nodeById.get(rarestCard.stallId);
  const rarityHighlight = rarestNode
    ? `Your rarest catch: ${rarestNode.name} (${rarestCard.rarity}, Akar Score ${rarestCard.akarScore})`
    : `Your highest Akar Score: ${rarestCard.akarScore}`;

  // Invisibility — count stalls with < 25 reviews
  const hiddenCount = trailCards.filter((c) => {
    const node = nodeById.get(c.stallId);
    return node && node.reviewCount < 25;
  }).length;
  const invisibilityNote =
    hiddenCount > 0
      ? `${hiddenCount} of your ${trailCards.length} stops had fewer than 25 online reviews — true hidden gems`
      : `Your trail featured well-known heritage stalls`;

  // Total distance using the existing haversine function in this file
  const trailStops = trailCards
    .map((c) => nodeById.get(c.stallId))
    .filter(Boolean) as HeritageNode[];
  let totalDist = 0;
  for (let i = 1; i < trailStops.length; i++) {
    totalDist += haversine(
      trailStops[i - 1].lat,
      trailStops[i - 1].lng,
      trailStops[i].lat,
      trailStops[i].lng
    );
  }
  const totalDistanceKm = Math.round((totalDist / 1000) * 10) / 10;

  return { diversityStatement, rarityHighlight, invisibilityNote, totalDistanceKm };
}
