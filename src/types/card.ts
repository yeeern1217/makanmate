export type CulturalOrigin =
  | "Malay"
  | "Chinese"
  | "Indian"
  | "Peranakan"
  | "Mamak"
  | "Portuguese";

export type CardTier = "bronze" | "silver" | "gold";

export type RarityClass = "common" | "uncommon" | "rare" | "legendary";

export interface CapturedCard {
  id: string;
  stallId: string;
  dishId: string;
  capturedAt: string;
  capturedPhoto: string;
  culturalOrigin: CulturalOrigin;
  rarity: RarityClass;
  tier: CardTier;
  akarScore: number;
  heritageNodesUnlocked: number;
  quizPassed: boolean;
  trailId: string | null;
}

export interface DialectPhrase {
  phrase: string;
  pronunciation: string;
  meaning: string;
  dialect: string;
  context: string;
}

export interface TechniqueNode {
  id: string;
  name: string;
  description: string;
  tool: string;
  emoji: string;
}

export interface MigrationStory {
  id: string;
  title: string;
  narrative: string;
  origin: string;
  era: string;
  voiceScript: string;
}

export interface HeritageTrail {
  id: string;
  name: string;
  cardIds: string[];
  completedAt: string | null;
  historicalThread: string;
  culturalDiversity: CulturalOrigin[];
  totalAkarScore: number;
}
