# Plan: Post-Capture Recommendation Card

**Branch:** `feat/recommendation-card` (from latest `origin/main`)
**Batch:** 2 (run AFTER plans 01 and 02 are merged into main)
**Depends on:** Plan 01 (taste-recommender) must be merged first — this plan imports from `src/lib/recommender/`.

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16, React 19, TypeScript, Tailwind v4, Zustand v5. The app flow: user opens Radar map → walks to a stall → taps CATCH → sees a catch animation → transitions to menu scan stage.

After Plan 01 is merged, the codebase has:
- `src/lib/recommender/taste-profile.ts` — `buildTasteProfile(cards, nodes)`
- `src/lib/recommender/recommend.ts` — `getTopRecommendations(profile, nodes, count, lat?, lng?)`
- `src/lib/recommender/types.ts` — `TasteProfile`, `ScoredRecommendation`, `ScoreBreakdown`
- `src/lib/recommender/content-tags.ts` — `NODE_TAGS` map
- `HeritageNode` now has a `tags: string[]` field

**Git setup:** Before starting, ensure plans 01 and 02 are merged, then:
```bash
git fetch origin
git checkout -b feat/recommendation-card origin/main
```

---

## What to Build

A recommendation card that appears immediately after a successful stall catch, suggesting the next stall to visit. The scoring is deterministic (instant); LLM phrasing arrives async.

Two pieces:
1. **RecommendationCard component** — Shows the suggestion with visible score breakdown
2. **Scan page integration** — Triggers the recommendation after catch, fires async LLM phrasing
3. **API endpoint addition** — New `mode: "phrase-recommendation"` for natural-language suggestion

---

## Files to CREATE

### `src/components/catch/RecommendationCard.tsx`

A client component that displays a recommended stall with score breakdown.

Props:
```typescript
interface RecommendationCardProps {
  recommendation: ScoredRecommendation;
  phrasedSuggestion: string | null; // null while loading, template fallback used
  onDismiss: () => void;
  onNavigate: () => void;
}
```

UI structure (use the existing design system — cream bg, terracotta primary, gold secondary):
- Top: Small label "NEXT HIDDEN GEM" in uppercase tracking
- Stall name as heading, heritage score badge beside it
- Phrased suggestion text (or a template fallback while loading): italic, warm tone
- Four mini horizontal progress bars showing the score breakdown:
  - "Content Match" — uses `breakdown.contentSimilarity` — color: terracotta `var(--accent-primary)`
  - "Hidden Gem" — uses `breakdown.invisibilityBoost` — color: grassroots green `#4a7c59`
  - "Proximity" — uses `breakdown.proximity` — color: gold `var(--accent-secondary)`
  - "Diversity" — uses `breakdown.diversityGap` — color: purple `#6b5ce7`
  - Each bar: label on left, percentage on right, thin bar underneath (height 6px, rounded)
- Reasoning tags: render each `reasoning[]` string as a small tag/chip
- Two buttons at bottom:
  - "Navigate" (primary, gold background) → calls `onNavigate`
  - "Dismiss" (text link) → calls `onDismiss`
- Entry animation: slide up from bottom with `animate-slide-up` (already defined in globals.css)
- Wrap the whole card in the existing `retro-card` class

Import `ScoredRecommendation` from `@/lib/recommender/types`.

---

## Files to MODIFY

### `src/app/scan/page.tsx`

Add the recommendation flow after catch completion. Key changes:

1. Add new state variables:
```typescript
const [recommendation, setRecommendation] = useState<ScoredRecommendation | null>(null);
const [phrasedSuggestion, setPhrasedSuggestion] = useState<string | null>(null);
const [showRecommendation, setShowRecommendation] = useState(false);
```

2. Add new imports:
```typescript
import { buildTasteProfile } from "@/lib/recommender/taste-profile";
import { getTopRecommendations } from "@/lib/recommender/recommend";
import type { ScoredRecommendation } from "@/lib/recommender/types";
import RecommendationCard from "@/components/catch/RecommendationCard";
```

3. Modify `handleCatchComplete` — currently just:
```typescript
const handleCatchComplete = () => {
    setShowCatchAnim(false);
    setStage("menu");
  };
```

Change to:
```typescript
const handleCatchComplete = () => {
    setShowCatchAnim(false);

    // Build taste profile with the just-added card
    const cards = useCardStore.getState().cards;
    const profile = buildTasteProfile(cards, HERITAGE_NODES);
    const recs = getTopRecommendations(profile, HERITAGE_NODES, 1);

    if (recs.length > 0) {
      const rec = recs[0];
      setRecommendation(rec);
      setShowRecommendation(true);

      // Async: fire LLM phrasing (non-blocking)
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "phrase-recommendation",
          stallName: rec.node.name,
          dishName: rec.node.signature_dish,
          reasoning: rec.reasoning,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setPhrasedSuggestion(data.result?.suggestion ?? null);
        })
        .catch(() => {
          // Fallback: template string
          setPhrasedSuggestion(null);
        });
    }

    setStage("menu");
  };
```

4. Add the RecommendationCard render below the catch animation overlay (inside the return JSX, after the `showCatchAnim && catchCard &&` block):

```tsx
{showRecommendation && recommendation && (
  <div className="fixed inset-0 z-40 flex items-end justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
    <RecommendationCard
      recommendation={recommendation}
      phrasedSuggestion={phrasedSuggestion}
      onDismiss={() => setShowRecommendation(false)}
      onNavigate={() => {
        setShowRecommendation(false);
        router.push(`/radar?highlight=${recommendation.node.id}`);
      }}
    />
  </div>
)}
```

### `src/app/api/chat/route.ts`

Add a new `mode === "phrase-recommendation"` handler. Insert it BEFORE the default vision mode block (before the `// Default: vision mode` comment).

```typescript
if (mode === "phrase-recommendation") {
    const { stallName, dishName, reasoning } = await req.json().catch(() => ({}));
    const result = await generateText({
      model: google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite"),
      system: SYSTEM_PROMPT_PHRASE_RECOMMENDATION,
      messages: [{
        role: "user",
        content: `Recommend "${stallName}" (signature dish: ${dishName}). Reasoning: ${(reasoning ?? []).join("; ")}`,
      }],
      tools: {
        phraseRecommendation: tool({
          description: "Generate a natural-language recommendation suggestion",
          inputSchema: phraseRecommendationSchema,
        }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({
      toolName: "phraseRecommendation",
      result: extractToolInput(result, "phraseRecommendation"),
    });
  }
```

Note: the request body is already parsed at line 40 (`const { image, lat, lng, mode, ... } = await req.json()`), so add `stallName`, `dishName`, `reasoning` to the destructuring there.

Update the destructuring at line 40:
```typescript
const { image, lat, lng, mode, ingredient, dish, lore_hint, stalls, migrationHint, stallName, dishName, reasoning } = await req.json();
```

Add imports for the new schema and prompt:
```typescript
import { phraseRecommendationSchema } from "@/lib/ai/tools";
import { SYSTEM_PROMPT_PHRASE_RECOMMENDATION } from "@/lib/ai/prompts";
```
(Add these to the existing import lines from those files.)

### `src/lib/ai/tools.ts`

Add the new schema at the end of the file:

```typescript
export const phraseRecommendationSchema = z.object({
  suggestion: z.string(),
});
```

### `src/lib/ai/prompts.ts`

Add the new prompt at the end of the file:

```typescript
export const SYSTEM_PROMPT_PHRASE_RECOMMENDATION = `You are MakanMate, a warm and knowledgeable food guide for Malaysian heritage hawker stalls.

Generate a single compelling sentence recommending the next stall for the user to visit. The sentence should:
1. Feel personal and warm — like a local friend giving a tip
2. Reference the specific reasoning provided (e.g. "hidden gem", "matches your taste", "new culture to explore")
3. Be under 30 words
4. Create curiosity about the stall

Use the phraseRecommendation tool to return your suggestion.

Example outputs:
- "Since you loved that wok-hei, hunt down the hidden Oh Chien stall nearby — only the locals know this one."
- "You've been exploring Chinese flavours — time to try the Mamak scene. This roti canai spot has been flipping since dawn."`;
```

---

## Files to NOT TOUCH (other worktrees own these)

- `src/types/heritage.ts` — already modified by Plan 01
- `src/lib/data/heritage-nodes.ts` — already modified by Plan 01
- `src/lib/recommender/*` — already created by Plan 01
- `src/lib/search/Exa.ts` — created by Plan 02
- `src/lib/trails/trail-builder.ts`
- `src/components/trail/DiversitySummary.tsx`
- `scripts/`

---

## Existing Code to Reuse

- `HERITAGE_NODES` from `src/lib/data/heritage-nodes.ts` — already imported in scan/page.tsx
- `useCardStore` from `src/store/useCardStore.ts` — already imported in scan/page.tsx
- `router` from `next/navigation` — already set up in scan/page.tsx
- `retro-card` CSS class from `globals.css`
- `animate-slide-up`, `animate-fade-in` animations from `globals.css`
- Design tokens: `var(--accent-primary)` (terracotta), `var(--accent-secondary)` (gold), `var(--surface)`, `var(--foreground)`, `var(--text-muted)`

---

## Verification

1. `npm run build` should pass.
2. In the app: catch a stall → after the catch animation completes, a recommendation card should slide up from the bottom.
3. The card should show:
   - The recommended stall name
   - Four score breakdown bars with percentages
   - Reasoning tags
   - A natural-language suggestion sentence (appears after ~1-2 seconds, or a template fallback)
4. Tap "Navigate" → should go to `/radar?highlight={nodeId}`
5. Tap "Dismiss" → card disappears, menu scan stage is visible
6. If there are no uncaptured grassroots stalls left, no recommendation card should appear.
