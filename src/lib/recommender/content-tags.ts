/**
 * Closed vocabulary of food content tags and per-node tag assignments.
 *
 * Tags are grouped by category for readability but stored as flat strings.
 * NODE_TAGS is keyed by heritage node ID and must stay in sync with the
 * `tags` field on each HeritageNode in heritage-nodes.ts.
 */

// ── Tag vocabulary ──────────────────────────────────────────────────
export const CONTENT_TAGS = [
  // Protein
  "seafood",
  "pork",
  "chicken",
  "duck",
  "egg",
  "vegetarian-ok",
  // Cooking method
  "wok-hei",
  "braised",
  "steamed",
  "deep-fried",
  "grilled",
  // Carb
  "noodle",
  "rice",
  "flatbread",
  "pastry",
  "dessert",
  // Flavor
  "spicy",
  "sour",
  "sweet",
  "herbal",
  "savory-umami",
] as const;

export type ContentTag = (typeof CONTENT_TAGS)[number];

// ── Per-node tag assignments ────────────────────────────────────────
export const NODE_TAGS: Record<string, string[]> = {
  // ── Penang ──
  "new-lane-ckt":            ["noodle", "wok-hei", "seafood", "egg", "savory-umami"],
  "lorong-selamat-cendol":   ["dessert", "sweet", "vegetarian-ok"],
  "gurney-drive-laksa":      ["noodle", "seafood", "sour", "spicy", "savory-umami"],
  "oh-chien-heritage":       ["seafood", "egg", "deep-fried", "savory-umami"],

  // ── KL ──
  "petaling-street-bkt":     ["pork", "herbal", "braised", "savory-umami"],
  "bangsar-roti-canai":      ["flatbread", "deep-fried", "savory-umami", "vegetarian-ok"],
  "village-park-nasi-lemak":  ["rice", "chicken", "deep-fried", "spicy", "savory-umami"],
  "fatty-crab-duck-rice":    ["duck", "rice", "braised", "savory-umami"],

  // ── Ipoh ──
  "onn-kee-chicken":         ["chicken", "steamed", "savory-umami"],
  "foh-san-hor-fun":         ["noodle", "seafood", "chicken", "savory-umami"],
  "foh-san-dim-sum":         ["pork", "seafood", "steamed", "savory-umami"],
  "sin-yoon-loong-egg-tart": ["pastry", "egg", "sweet"],

  // ── Hyped nodes (no tags — never recommended) ──
  "hyped-pavilion-food-court": [],
  "hyped-lot10-hutong":        [],
  "hyped-gurney-plaza-food":   [],
  "hyped-ipoh-parade-food":    [],
};
