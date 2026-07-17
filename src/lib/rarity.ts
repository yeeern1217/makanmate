import type { RarityClass } from "@/types/card";

export const RARITY_RANK: Record<RarityClass, string> = {
  common: "C",
  uncommon: "R",
  rare: "S",
  legendary: "SSR",
};

export const RARITY_NAME: Record<RarityClass, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export const RARITY_CARD_STYLE: Record<RarityClass, { accent: string; glow: string }> = {
  common: { accent: "#cd7f32", glow: "0 0 16px #cd7f3266" },
  uncommon: { accent: "#aab7c4", glow: "0 0 24px #aab7c488" },
  rare: { accent: "#d4a947", glow: "0 0 34px #d4a947aa" },
  legendary: { accent: "#f0b4ff", glow: "0 0 54px #d946efcc" },
};
