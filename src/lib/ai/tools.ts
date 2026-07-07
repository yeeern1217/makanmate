import { z } from "zod";

export const parseMenuSchema = z.object({
  dishes: z.array(z.object({
    raw_text: z.string(),
    english_name: z.string(),
    local_name: z.string(),
    price: z.string().optional(),
    decoded_shorthand: z.string().optional(),
    dish_id: z.string().optional(),
    is_signature: z.boolean(),
  })),
  stall_type: z.enum(["kopitiam", "hawker", "warung", "mamak", "unknown"]),
  confidence: z.number().min(0).max(1),
});

export const validateLocationSchema = z.object({
  nearest_node_id: z.string().nullable(),
  nearest_node_name: z.string().nullable(),
  distance_meters: z.number().nullable(),
  is_at_heritage_site: z.boolean(),
  city: z.enum(["KL", "Penang", "Ipoh"]).nullable(),
});

export const getIngredientLoreSchema = z.object({
  ingredient_name: z.string(),
  dish_name: z.string(),
  lore_text: z.string(),
  fun_fact: z.string(),
  origin_region: z.string(),
});
