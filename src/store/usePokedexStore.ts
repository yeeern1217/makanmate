import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IngredientLore } from "@/types/ai";

interface PokedexState {
  cookedDishes: string[];
  cookDish: (id: string) => void;
  loreCache: Record<string, IngredientLore>;
  cacheLore: (key: string, lore: IngredientLore) => void;
  getLore: (key: string) => IngredientLore | undefined;
}

export const usePokedexStore = create<PokedexState>()(
  persist(
    (set, get) => ({
      cookedDishes: [],
      cookDish: (id) => {
        const current = get().cookedDishes;
        if (!current.includes(id)) {
          set({ cookedDishes: [...current, id] });
        }
      },
      loreCache: {},
      cacheLore: (key, lore) =>
        set((state) => ({ loreCache: { ...state.loreCache, [key]: lore } })),
      getLore: (key) => get().loreCache[key],
    }),
    {
      name: "makanmate-pokedex",
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        delete state.unlockedDishes;
        return state as unknown as PokedexState;
      },
    }
  )
);
