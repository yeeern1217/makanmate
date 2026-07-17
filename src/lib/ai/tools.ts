import { z } from "zod";

export const livenessCheckSchema = z.object({
  isReal: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

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
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
  })).optional(),
});

export const magicLensSchema = z.object({
  items: z.array(z.object({
    raw_text: z.string(),
    english_name: z.string(),
    local_name: z.string(),
    price: z.string().optional(),
    allergens: z.array(z.string()),
    halal_status: z.enum(["halal", "non-halal", "unknown"]),
    bounding_box: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      width: z.number().min(0).max(100),
      height: z.number().min(0).max(100),
    }),
  })),
  confidence: z.number().min(0).max(1),
});

export const migrationStorySchema = z.object({
  title: z.string(),
  narrative: z.string(),
  origin: z.string(),
  era: z.string(),
});

export const trailNarrativeSchema = z.object({
  historical_thread: z.string(),
  cultural_connections: z.string(),
});

export const phraseRecommendationSchema = z.object({
  suggestion: z.string(),
});
