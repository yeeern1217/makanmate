import type { RarityClass } from "@/types/card";
import type { HeritageNode } from "@/types/heritage";

const CURRENT_YEAR = 2026;

export function computeAkarScore(node: HeritageNode): number {
  const age = node.founded ? CURRENT_YEAR - node.founded : 30;
  const ageFactor = Math.min(age / 80, 1) * 30;
  const scarcityFactor = Math.min(100 / Math.max(node.reviewCount, 1), 1) * 30;
  const baseFactor = (node.heritage_score / 100) * 40;
  return Math.round(ageFactor + scarcityFactor + baseFactor);
}

export function classifyRarity(akarScore: number): RarityClass {
  if (akarScore >= 90) return "legendary";
  if (akarScore >= 75) return "rare";
  if (akarScore >= 55) return "uncommon";
  return "common";
}
