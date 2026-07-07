export type StallType = "kopitiam" | "hawker" | "warung" | "mamak";

export interface HeritageNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: "KL" | "Penang" | "Ipoh";
  type: StallType;
  heritage_score: number;
  signature_dish: string;
  dish_id: string;
  description: string;
  founded?: number;
}

export interface IngredientNode {
  id: string;
  name: string;
  local_name: string;
  category: "starch" | "protein" | "vegetable" | "sauce" | "condiment" | "fat";
  color: string;
  emoji: string;
  geometry: "sphere" | "box" | "torus" | "cylinder" | "cone" | "octahedron";
  position: [number, number, number];
  lore_hint: string;
  cookingHint: string;
}

export interface DishEntry {
  id: string;
  name: string;
  emoji: string;
  local_script: string;
  origin_state: string;
  heritage_score: number;
  fun_fact: string;
  ingredients: IngredientNode[];
  cookingOrder: string[];
}
