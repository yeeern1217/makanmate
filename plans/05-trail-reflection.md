# Plan: Trail Narrator Reflection

**Branch:** `feat/trail-reflection` (from latest `origin/main`)
**Batch:** 2 (run AFTER plan 01 is merged — uses content tags from HeritageNode)
**Can run in parallel with Plan 04.**

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16, React 19, TypeScript, Tailwind v4, Zustand v5. Users collect stall cards and build "Heritage Trails" (routes connecting 3+ captured stalls). The trail page shows a map, a narrative, and a `DiversitySummary` component.

This feature adds a **reflection section** below the existing DiversitySummary. It uses pure template strings (no LLM) to reinforce the anti-popularity narrative: highlighting how many "hidden" stalls the user found and what cultures they explored.

**Git setup:**
```bash
git fetch origin
git checkout -b feat/trail-reflection origin/main
```

---

## What to Build

A `buildTrailReflection()` pure function that produces 3-4 reflection statements, and a UI section in the DiversitySummary component to display them.

---

## Files to MODIFY

### `src/lib/trails/trail-builder.ts`

Add a new exported function at the bottom of the file. Import `HERITAGE_NODES` (already imported) and use it alongside the existing `CapturedCard` and `HeritageTrail` types.

```typescript
export interface TrailReflection {
  diversityStatement: string;
  rarityHighlight: string;
  invisibilityNote: string;
  totalDistanceKm: number;
}

export function buildTrailReflection(
  trail: HeritageTrail,
  cards: CapturedCard[]
): TrailReflection {
  const trailCards = trail.cardIds
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean) as CapturedCard[];

  // Diversity
  const uniqueOrigins = [...new Set(trailCards.map((c) => c.culturalOrigin))];
  const diversityStatement =
    uniqueOrigins.length >= 4
      ? `Incredible — you explored ${uniqueOrigins.length} out of 6 cultural traditions: ${uniqueOrigins.join(", ")}`
      : `You explored ${uniqueOrigins.length} cultural tradition${uniqueOrigins.length > 1 ? "s" : ""}: ${uniqueOrigins.join(", ")}`;

  // Rarity
  const rarestCard = trailCards.reduce((best, c) =>
    c.akarScore > best.akarScore ? c : best
  , trailCards[0]);
  const rarestNode = HERITAGE_NODES.find((n) => n.id === rarestCard.stallId);
  const rarityHighlight = rarestNode
    ? `Your rarest catch: ${rarestNode.name} (${rarestCard.rarity}, Akar Score ${rarestCard.akarScore})`
    : `Your highest Akar Score: ${rarestCard.akarScore}`;

  // Invisibility — count stalls with < 25 reviews
  const hiddenCount = trailCards.filter((c) => {
    const node = HERITAGE_NODES.find((n) => n.id === c.stallId);
    return node && node.reviewCount < 25;
  }).length;
  const invisibilityNote =
    hiddenCount > 0
      ? `${hiddenCount} of your ${trailCards.length} stops had fewer than 25 online reviews — true hidden gems`
      : `Your trail featured well-known heritage stalls`;

  // Total distance
  const stops = trailCards
    .map((c) => HERITAGE_NODES.find((n) => n.id === c.stallId))
    .filter(Boolean) as typeof HERITAGE_NODES;
  let totalDist = 0;
  for (let i = 1; i < stops.length; i++) {
    totalDist += haversine(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  const totalDistanceKm = Math.round(totalDist / 100) / 10; // 1 decimal place

  return { diversityStatement, rarityHighlight, invisibilityNote, totalDistanceKm };
}
```

Note: `haversine` is already defined as a local function in this file (line 6-13). Use it directly.

### `src/components/trail/DiversitySummary.tsx`

Add a new optional `reflection` prop and render it below the existing stats section.

Update the props type:
```typescript
import type { TrailReflection } from "@/lib/trails/trail-builder";

export default function DiversitySummary({
  origins,
  totalAkar,
  totalCards,
  reflection,
}: {
  origins: CulturalOrigin[];
  totalAkar: number;
  totalCards: number;
  reflection?: TrailReflection;
}) {
```

Add the reflection section at the bottom of the `retro-card` div, after the stats flex container:

```tsx
{/* Reflection */}
{reflection && (
  <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
    <h4 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
      Trail Reflection
    </h4>
    <p className="text-xs text-[var(--foreground)] leading-relaxed">
      {reflection.diversityStatement}
    </p>
    <p className="text-xs text-[var(--foreground)] leading-relaxed">
      {reflection.rarityHighlight}
    </p>
    <p className="text-xs text-[var(--foreground)] leading-relaxed font-semibold" style={{ color: "#4a7c59" }}>
      {reflection.invisibilityNote}
    </p>
    {reflection.totalDistanceKm > 0 && (
      <p className="text-[10px] text-[var(--text-muted)]">
        Total trail distance: {reflection.totalDistanceKm} km
      </p>
    )}
  </div>
)}
```

### `src/app/trail/page.tsx`

Read this file first to understand the current structure. Find where `DiversitySummary` is rendered and add the `reflection` prop.

You'll need to:
1. Import `buildTrailReflection` from `@/lib/trails/trail-builder`
2. Where the trail data is available, call `buildTrailReflection(trail, cards)` to get the reflection
3. Pass `reflection={reflection}` to the `<DiversitySummary>` component

---

## Files to NOT TOUCH

- `src/app/api/chat/route.ts`
- `src/lib/ai/tools.ts`
- `src/lib/ai/prompts.ts`
- `src/types/ai.ts`
- `src/types/heritage.ts`
- `src/lib/data/heritage-nodes.ts`
- `src/lib/recommender/*`
- `src/app/scan/page.tsx`
- `src/components/catch/*`
- `scripts/`

---

## Verification

1. `npm run build` should pass.
2. In the app: build a trail with 3+ cards → the trail page's DiversitySummary should now show a "Trail Reflection" section below the stats.
3. Verify the reflection shows:
   - Cultural diversity count: "You explored N cultural traditions: ..."
   - Rarest catch with name and score
   - Hidden gem count: "N of your M stops had fewer than 25 online reviews"
   - Total distance in km (if multiple stops)
4. If reflection data is missing (e.g., trail with no valid cards), the section should not render (the `reflection &&` guard handles this).
