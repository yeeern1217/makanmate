import { HERITAGE_NODES } from "./heritage-nodes";
import { POKEDEX_ENTRIES } from "./pokedex-entries";
import { DishEntry } from "@/types/heritage";

export interface Region {
  id: string;
  name: string;
  emoji: string;
  city: "KL" | "Penang" | "Ipoh";
}

export const REGIONS: Region[] = [
  { id: "penang", name: "Penang", emoji: "\u{1F3DD}️", city: "Penang" },
  { id: "kl", name: "KL", emoji: "\u{1F3D9}️", city: "KL" },
  { id: "ipoh", name: "Ipoh", emoji: "⛰️", city: "Ipoh" },
];

export function getDishesByRegion(): Map<Region, DishEntry[]> {
  const result = new Map<Region, DishEntry[]>();

  for (const region of REGIONS) {
    const stalls = HERITAGE_NODES.filter((n) => n.city === region.city);
    const dishes = stalls
      .map((s) => POKEDEX_ENTRIES.find((d) => d.id === s.dish_id))
      .filter((d): d is DishEntry => d !== undefined);
    result.set(region, dishes);
  }

  return result;
}

export function isDishDiscovered(dishId: string, discoveredNodes: string[]): boolean {
  const stall = HERITAGE_NODES.find((n) => n.dish_id === dishId);
  if (!stall) return false;
  return discoveredNodes.includes(stall.id);
}

export function getDishStatus(
  dishId: string,
  discoveredNodes: string[],
  cookedDishes: string[]
): "locked" | "discovered" | "mastered" {
  if (cookedDishes.includes(dishId)) return "mastered";
  if (isDishDiscovered(dishId, discoveredNodes)) return "discovered";
  return "locked";
}
