import type { HeritageNode } from "@/types/heritage";
import type { TasteProfile, ScoredRecommendation, ScoreBreakdown } from "./types";
import { haversineDistance } from "@/lib/geo";

// ── Constants ───────────────────────────────────────────────────────
const WEIGHT_CONTENT = 0.35;
const WEIGHT_INVISIBILITY = 0.30;
const WEIGHT_PROXIMITY = 0.15;
const WEIGHT_DIVERSITY = 0.20;

const REVIEW_CAP = 200;
const PROXIMITY_CLOSE_M = 500;
const PROXIMITY_FAR_M = 5000;

// ── Scoring ─────────────────────────────────────────────────────────

/**
 * Score a single heritage node against the user's taste profile.
 *
 * Four features, each normalized 0-100, combined with fixed weights.
 * Stalls with fewer online reviews score HIGHER (the "invisibility boost"),
 * deliberately inverting standard recommendation systems.
 */
export function computeRecommendationScore(
  node: HeritageNode,
  tasteProfile: TasteProfile,
  userLat?: number,
  userLng?: number,
): ScoredRecommendation {
  const reasoning: string[] = [];

  // ── 1. Content Similarity (Jaccard on food tags) ──────────────
  let contentScore: number;
  let matchingTags: string[] = [];

  if (tasteProfile.totalCaptures === 0) {
    contentScore = 50;
  } else {
    const userTags = tasteProfile.dishCategoryTags;
    const stallTags = new Set(node.tags);

    matchingTags = [...stallTags].filter((t) => userTags.has(t));
    const intersectionSize = matchingTags.length;
    const unionSize = userTags.size + stallTags.size - intersectionSize;
    const jaccard = unionSize > 0 ? intersectionSize / unionSize : 0;
    contentScore = jaccard * 100;
  }

  // ── 2. Invisibility Boost ─────────────────────────────────────
  const rawInvisibility = 1 - Math.min(node.reviewCount / REVIEW_CAP, 1);
  const grassrootsBonus = node.isGrassroots ? 15 : 0;
  const invisibilityScore = Math.min(
    rawInvisibility * 85 + grassrootsBonus,
    100,
  );

  // ── 3. Proximity ──────────────────────────────────────────────
  let proximityScore: number;
  let distanceM: number | undefined;

  if (userLat === undefined || userLng === undefined) {
    proximityScore = 50;
  } else {
    distanceM = haversineDistance(userLat, userLng, node.lat, node.lng);
    if (distanceM <= PROXIMITY_CLOSE_M) {
      proximityScore = 100;
    } else if (distanceM >= PROXIMITY_FAR_M) {
      proximityScore = 0;
    } else {
      proximityScore =
        (1 - (distanceM - PROXIMITY_CLOSE_M) / (PROXIMITY_FAR_M - PROXIMITY_CLOSE_M)) * 100;
    }
  }

  // ── 4. Diversity Gap ──────────────────────────────────────────
  const originGap =
    tasteProfile.originAffinity[node.culturalOrigin] === undefined ? 1.0 : 0.0;
  const cityGap =
    tasteProfile.cityAffinity[node.city] === undefined ? 1.0 : 0.0;
  const stallTypeGap =
    tasteProfile.stallTypeAffinity[node.type] === undefined ? 1.0 : 0.0;
  const diversityScore = originGap * 50 + cityGap * 30 + stallTypeGap * 20;

  // ── Composite ─────────────────────────────────────────────────
  const totalScore = Math.round(
    contentScore * WEIGHT_CONTENT +
      invisibilityScore * WEIGHT_INVISIBILITY +
      proximityScore * WEIGHT_PROXIMITY +
      diversityScore * WEIGHT_DIVERSITY,
  );

  // ── Reasoning (only for features contributing > 20 weighted pts) ──
  if (contentScore * WEIGHT_CONTENT > 20 && matchingTags.length > 0) {
    reasoning.push(
      `Matches your taste for ${matchingTags.join(", ")} dishes`,
    );
  }

  if (invisibilityScore * WEIGHT_INVISIBILITY > 20) {
    reasoning.push(
      `Hidden gem — only ${node.reviewCount} online reviews`,
    );
  }

  if (proximityScore > 60 && userLat !== undefined && userLng !== undefined) {
    reasoning.push(`Just ${Math.round(distanceM!)}m from you`);
  }

  if (diversityScore * WEIGHT_DIVERSITY >= 20) {
    if (originGap) {
      reasoning.push(
        `You haven't explored ${node.culturalOrigin} cuisine yet`,
      );
    } else if (cityGap) {
      reasoning.push(
        `You haven't explored stalls in ${node.city} yet`,
      );
    } else if (stallTypeGap) {
      reasoning.push(
        `You haven't tried a ${node.type} stall yet`,
      );
    }
  }

  const breakdown: ScoreBreakdown = {
    contentSimilarity: Math.round(contentScore),
    invisibilityBoost: Math.round(invisibilityScore),
    proximity: Math.round(proximityScore),
    diversityGap: Math.round(diversityScore),
  };

  return { node, totalScore, breakdown, reasoning };
}

// ── Top-N Recommendations ───────────────────────────────────────────

/**
 * Return the top-N uncaptured grassroots stalls, ranked by composite score.
 *
 * Filters out already-captured stalls and non-grassroots (hyped) venues.
 */
export function getTopRecommendations(
  tasteProfile: TasteProfile,
  nodes: HeritageNode[],
  count: number = 3,
  userLat?: number,
  userLng?: number,
): ScoredRecommendation[] {
  return nodes
    .filter(
      (n) => !tasteProfile.capturedStallIds.has(n.id) && n.isGrassroots,
    )
    .map((n) =>
      computeRecommendationScore(n, tasteProfile, userLat, userLng),
    )
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, count);
}
