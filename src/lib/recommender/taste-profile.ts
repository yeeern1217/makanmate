import type { CapturedCard } from "@/types/card";
import type { HeritageNode } from "@/types/heritage";
import type { TasteProfile } from "./types";
import { NODE_TAGS } from "./content-tags";

/**
 * Build a taste profile from captured cards and the full node list.
 *
 * Pure function — no side effects, no API calls. Derives what the user
 * likes from their card collection by counting cultural-origin, city,
 * and stall-type affinities and collecting dish-category tags.
 */
export function buildTasteProfile(
  cards: CapturedCard[],
  nodes: HeritageNode[],
): TasteProfile {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const originAffinity: Record<string, number> = {};
  const cityAffinity: Record<string, number> = {};
  const stallTypeAffinity: Record<string, number> = {};
  const dishCategoryTags = new Set<string>();
  const capturedStallIds = new Set<string>();

  for (const card of cards) {
    const node = nodeById.get(card.stallId);
    if (!node) continue;

    // Increment affinities
    originAffinity[node.culturalOrigin] =
      (originAffinity[node.culturalOrigin] ?? 0) + 1;
    cityAffinity[node.city] = (cityAffinity[node.city] ?? 0) + 1;
    stallTypeAffinity[node.type] =
      (stallTypeAffinity[node.type] ?? 0) + 1;

    // Collect tags
    const tags = NODE_TAGS[node.id] ?? [];
    for (const tag of tags) {
      dishCategoryTags.add(tag);
    }

    capturedStallIds.add(card.stallId);
  }

  return {
    originAffinity,
    cityAffinity,
    stallTypeAffinity,
    dishCategoryTags,
    capturedStallIds,
    totalCaptures: cards.length,
  };
}
