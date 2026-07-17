# Plan: Taste Profile + Inverted-Ranking Recommender

**Branch:** `feat/taste-recommender` (from latest `origin/main`)
**Batch:** 1 (can run in parallel with plans 02 and 03)

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16, React 19, TypeScript, Tailwind v4. State via Zustand v5 with localStorage persistence. The app lets tourists "catch" heritage hawker stalls and collect dish cards. The repo is at the current working directory root.

**Git setup:** Before starting, run:
```bash
git fetch origin
git checkout -b feat/taste-recommender origin/main
```

---

## What to Build

Two tightly coupled pieces:

1. **Taste Profile Builder** — A pure function that computes what a user likes from their captured cards. No AI, no API. It reads the card collection from Zustand and derives affinity counts + tag sets.

2. **Inverted-Ranking Recommender** — A deterministic scoring function that ranks uncaptured stalls. The innovation: stalls with FEWER online reviews score HIGHER (the "invisibility boost"), inverting every standard recommendation system. Content-based matching uses Jaccard similarity on food tags. No LLM is involved in scoring.

Both are client-side library code — no API routes, no UI components.

---

## Files to CREATE

### `src/lib/recommender/types.ts`

```typescript
import type { HeritageNode } from "@/types/heritage";

export interface TasteProfile {
  originAffinity: Record<string, number>;      // e.g. { Chinese: 3, Malay: 1 }
  cityAffinity: Record<string, number>;         // e.g. { Penang: 2, KL: 2 }
  stallTypeAffinity: Record<string, number>;    // e.g. { hawker: 3, kopitiam: 1 }
  dishCategoryTags: Set<string>;                // union of tags from all captured stalls
  capturedStallIds: Set<string>;
  totalCaptures: number;
}

export interface ScoreBreakdown {
  contentSimilarity: number;   // 0-100
  invisibilityBoost: number;   // 0-100
  proximity: number;           // 0-100
  diversityGap: number;        // 0-100
}

export interface ScoredRecommendation {
  node: HeritageNode;
  totalScore: number;          // 0-100 composite
  breakdown: ScoreBreakdown;
  reasoning: string[];         // human-readable lines explaining each factor
}
```

### `src/lib/recommender/content-tags.ts`

A closed vocabulary of ~20 food tags and the tag assignments for all 16 heritage nodes. Export a `CONTENT_TAGS` constant (the vocabulary) and a `NODE_TAGS` map (`Record<string, string[]>`) keyed by heritage node ID.

Tag vocabulary:
- Protein: `seafood`, `pork`, `chicken`, `duck`, `egg`, `vegetarian-ok`
- Cooking: `wok-hei`, `braised`, `steamed`, `deep-fried`, `grilled`
- Carb: `noodle`, `rice`, `flatbread`, `pastry`, `dessert`
- Flavor: `spicy`, `sour`, `sweet`, `herbal`, `savory-umami`

Assign tags to each node based on its signature dish (read `src/lib/data/heritage-nodes.ts` for all 16 nodes). Examples:
- `new-lane-ckt` (Char Kuey Teow): `["noodle", "wok-hei", "seafood", "egg", "savory-umami"]`
- `lorong-selamat-cendol` (Cendol): `["dessert", "sweet", "vegetarian-ok"]`
- `petaling-street-bkt` (Bak Kut Teh): `["pork", "herbal", "braised", "savory-umami"]`
- `bangsar-roti-canai` (Roti Canai): `["flatbread", "deep-fried", "savory-umami", "vegetarian-ok"]`
- Hyped nodes (4 total): assign `[]` empty tags — they never get recommended anyway.

### `src/lib/recommender/taste-profile.ts`

Export `buildTasteProfile(cards: CapturedCard[], nodes: HeritageNode[]): TasteProfile`

Algorithm:
1. Iterate over `cards`
2. For each card, find matching node by `card.stallId === node.id`
3. Increment `originAffinity[node.culturalOrigin]`
4. Increment `cityAffinity[node.city]`
5. Increment `stallTypeAffinity[node.type]`
6. Add all tags for that node (from `NODE_TAGS`) to `dishCategoryTags`
7. Add `card.stallId` to `capturedStallIds`
8. Return the profile

Import `CapturedCard` from `@/types/card`, `HeritageNode` from `@/types/heritage`, `NODE_TAGS` from `./content-tags`.

### `src/lib/recommender/recommend.ts`

Export two functions:

**`computeRecommendationScore(node, tasteProfile, userLat?, userLng?): ScoredRecommendation`**

Four features, each normalized 0-100:

**Content Similarity (weight 0.35):**
```
userTags = tasteProfile.dishCategoryTags
stallTags = new Set(NODE_TAGS[node.id] ?? [])
intersection = size of userTags AND stallTags
union = size of userTags OR stallTags
jaccard = union > 0 ? intersection / union : 0
contentScore = jaccard * 100
```
If `tasteProfile.totalCaptures === 0`, contentScore = 50 (neutral).

**Invisibility Boost (weight 0.30):**
```
REVIEW_CAP = 200
rawInvisibility = 1 - Math.min(node.reviewCount / REVIEW_CAP, 1)
grassrootsBonus = node.isGrassroots ? 15 : 0
invisibilityScore = Math.min(rawInvisibility * 85 + grassrootsBonus, 100)
```

**Proximity (weight 0.15):**
```
if no GPS (userLat/userLng undefined): proximityScore = 50
else:
  distance = haversineDistance(userLat, userLng, node.lat, node.lng)
  if distance <= 500: proximityScore = 100
  else if distance >= 5000: proximityScore = 0
  else: proximityScore = (1 - (distance - 500) / 4500) * 100
```
Import `haversineDistance` from `@/lib/geo`.

**Diversity Gap (weight 0.20):**
```
originGap = tasteProfile.originAffinity[node.culturalOrigin] === undefined ? 1.0 : 0.0
cityGap = tasteProfile.cityAffinity[node.city] === undefined ? 1.0 : 0.0
stallTypeGap = tasteProfile.stallTypeAffinity[node.type] === undefined ? 1.0 : 0.0
diversityScore = originGap * 50 + cityGap * 30 + stallTypeGap * 20
```

**Composite:**
```
totalScore = Math.round(
  contentScore * 0.35 + invisibilityScore * 0.30 + proximityScore * 0.15 + diversityScore * 0.20
)
```

**Reasoning array:** For each feature contributing > 20 points (weighted), emit a line:
- Content: `"Matches your taste for ${topMatchingTags.join(', ')} dishes"` (use the intersection tags)
- Invisibility: `"Hidden gem — only ${node.reviewCount} online reviews"`
- Proximity: `"Just ${Math.round(distance)}m from you"` (or omit if no GPS)
- Diversity: `"You haven't explored ${node.culturalOrigin} cuisine yet"` (or city/type variant)

**`getTopRecommendations(tasteProfile, nodes, count?, userLat?, userLng?): ScoredRecommendation[]`**

1. Filter: exclude nodes where `tasteProfile.capturedStallIds.has(node.id)` OR `!node.isGrassroots`
2. Score each remaining node
3. Sort descending by `totalScore`
4. Return first `count` (default 3)

---

## Files to MODIFY

### `src/types/heritage.ts`

Add `tags: string[]` to the `HeritageNode` interface (after `communityCatchCount`).

### `src/lib/data/heritage-nodes.ts`

Add `tags: [...]` to every node in `HERITAGE_NODES`. Use the tag assignments from `content-tags.ts`. The tags array on each node MUST match what `NODE_TAGS` maps. This duplication is intentional — `NODE_TAGS` provides a lookup map, the node field allows future server-side access.

---

## Files to NOT TOUCH (other worktrees own these)

- `src/app/api/chat/route.ts`
- `src/lib/ai/tools.ts`
- `src/lib/ai/prompts.ts`
- `src/types/ai.ts`
- `src/app/scan/page.tsx`
- `src/lib/trails/trail-builder.ts`
- `src/components/trail/DiversitySummary.tsx`
- Any file in `scripts/`

---

## Existing Code to Reuse

- `haversineDistance` from `src/lib/geo.ts` (already exported)
- `CapturedCard` from `src/types/card.ts` (has `stallId`, `culturalOrigin`)
- `HeritageNode` from `src/types/heritage.ts` (has `reviewCount`, `isGrassroots`, `culturalOrigin`, `city`, `type`)
- `HERITAGE_NODES` from `src/lib/data/heritage-nodes.ts` (16 nodes with all metadata)

---

## Verification

1. The project should build: `npm run build` (or `npx next build`) should pass with no TypeScript errors.
2. Write a quick smoke test or console script: call `buildTasteProfile` with 2-3 mock cards, then `getTopRecommendations` with the result. Verify:
   - A 15-review grassroots stall scores higher than a 310-review grassroots stall (invisibility works)
   - A hyped stall (isGrassroots=false) never appears in results
   - An already-captured stall never appears in results
   - With zero captures, all grassroots stalls get `contentScore = 50`
   - The reasoning array is non-empty for each recommendation
