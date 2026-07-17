import type { HeritageNode } from "@/types/heritage";

export interface TasteProfile {
  originAffinity: Record<string, number>;      // e.g. { Chinese: 3, Malay: 1 }
  cityAffinity: Record<string, number>;         // e.g. { Penang: 2, KL: 2 }
  stallTypeAffinity: Record<string, number>;    // e.g. { hawker: 3, kopitiam: 1 }
  dishCategoryTags: Set<string>;                // union of tags from all captured stalls
  capturedStallIds: Set<string>;
  totalCaptures: number;
}

export interface ScoreBreakdown {
  contentSimilarity: number;   // 0-100
  invisibilityBoost: number;   // 0-100
  proximity: number;           // 0-100
  diversityGap: number;        // 0-100
}

export interface ScoredRecommendation {
  node: HeritageNode;
  totalScore: number;          // 0-100 composite
  breakdown: ScoreBreakdown;
  reasoning: string[];         // human-readable lines explaining each factor
}
