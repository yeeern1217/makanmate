export interface ChatRequest {
  image?: string;
  lat?: number;
  lng?: number;
  mode: "vision" | "lore" | "magic-lens" | "migration" | "trail-narrative";
  ingredient?: string;
  dish?: string;
  lore_hint?: string;
}

export interface ParsedDish {
  raw_text: string;
  english_name: string;
  local_name: string;
  price?: string;
  decoded_shorthand?: string;
  dish_id?: string;
  is_signature: boolean;
}

export interface MenuResult {
  dishes: ParsedDish[];
  stall_type: string;
  confidence: number;
}

export interface LocationResult {
  nearest_node_id: string | null;
  nearest_node_name: string | null;
  distance_meters: number | null;
  is_at_heritage_site: boolean;
  city: "KL" | "Penang" | "Ipoh" | null;
}

export interface IngredientLore {
  ingredient_name: string;
  dish_name: string;
  lore_text: string;
  fun_fact: string;
  origin_region: string;
  sources?: { title: string; url: string }[];
}

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
}
