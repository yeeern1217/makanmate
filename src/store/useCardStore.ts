import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CapturedCard, CardTier, HeritageTrail } from "@/types/card";

interface CardState {
  cards: CapturedCard[];
  trails: HeritageTrail[];
  exploredNodes: Record<string, string[]>;

  addCard: (card: CapturedCard) => void;
  evolveCard: (cardId: string) => void;
  updateAkarScore: (cardId: string, delta: number) => void;
  addExploredNode: (dishId: string, nodeId: string) => void;
  addTrail: (trail: HeritageTrail) => void;
  updateTrail: (trailId: string, patch: Partial<HeritageTrail>) => void;

  getAkarScoreTotal: () => number;
  getHeritageUnlockedTotal: () => number;
}

const NEXT_TIER: Record<CardTier, CardTier | null> = {
  bronze: "silver",
  silver: "gold",
  gold: null,
};

function uniqueCards(cards: CapturedCard[]): CapturedCard[] {
  const byDish = new Map<string, CapturedCard>();
  for (const card of cards) byDish.set(card.dishId, card);
  return [...byDish.values()];
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: [],
      trails: [],
      exploredNodes: {},

      addCard: (card) =>
        set((s) => ({ cards: uniqueCards([...s.cards, card]) })),

      evolveCard: (cardId) =>
        set((s) => ({
          cards: s.cards.map((c) => {
            if (c.id !== cardId) return c;
            const next = NEXT_TIER[c.tier];
            return next ? { ...c, tier: next } : c;
          }),
        })),

      updateAkarScore: (cardId, delta) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId ? { ...c, akarScore: c.akarScore + delta } : c
          ),
        })),

      addExploredNode: (dishId, nodeId) =>
        set((s) => {
          const existing = s.exploredNodes[dishId] ?? [];
          if (existing.includes(nodeId)) return s;
          return {
            exploredNodes: {
              ...s.exploredNodes,
              [dishId]: [...existing, nodeId],
            },
          };
        }),

      addTrail: (trail) =>
        set((s) => ({ trails: [...s.trails, trail] })),

      updateTrail: (trailId, patch) =>
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, ...patch } : t
          ),
        })),

      getAkarScoreTotal: () =>
        get().cards.reduce((sum, c) => sum + c.akarScore, 0),

      getHeritageUnlockedTotal: () =>
        Object.values(get().exploredNodes).reduce(
          (sum, nodes) => sum + nodes.length,
          0
        ),
    }),
    {
      name: "makanmate-cards",
      partialize: (s) => ({
        cards: s.cards,
        trails: s.trails,
        exploredNodes: s.exploredNodes,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<CardState>;
        return {
          ...current,
          ...saved,
          cards: uniqueCards(saved.cards ?? current.cards),
        };
      },
    }
  )
);
