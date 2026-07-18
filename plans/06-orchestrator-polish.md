# Plan: Agent Orchestration Layer + Demo Polish

**Branch:** `feat/orchestrator` (from latest `origin/main`)
**Batch:** 3 (run LAST — after ALL other plans are merged)
**Depends on:** Plans 01, 02, 03, 04, 05 all merged into main.

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16, React 19, TypeScript, Vercel AI SDK v7 with `@ai-sdk/google`. After all prior plans are merged, the codebase has:

- **Taste Profile + Recommender** (Plan 01): `src/lib/recommender/` — taste profiling and inverted-ranking scoring
- **Exa Lore** (Plan 02): `src/lib/search/Exa.ts` — web search, lore mode now does search→synthesize chain
- **Curation Pipeline** (Plan 03): `scripts/curate-stall.ts` — standalone build-time script
- **Recommendation Card** (Plan 04): `src/components/catch/RecommendationCard.tsx` — post-catch recommendation UI, `mode: "phrase-recommendation"` added to route
- **Trail Reflection** (Plan 05): reflection section in DiversitySummary

The API route (`src/app/api/chat/route.ts`) currently has ~8 inline `if (mode === "...")` blocks. This plan refactors it into a proper orchestration layer with consistent response envelopes, failsafe wrappers, and logging. It also handles demo polish.

**Git setup:**
```bash
git fetch origin
git checkout -b feat/orchestrator origin/main
```

---

## Part 1: Agent Orchestration Layer

### Files to CREATE

#### `src/lib/orchestrator/types.ts`

```typescript
export interface AgentResult {
  action: string;
  result: unknown;
  durationMs: number;
  fallbackUsed?: boolean;
}
```

#### `src/lib/orchestrator/orchestrator.ts`

The orchestrator is a single async function that:
1. Dispatches to the correct handler based on `mode`
2. Wraps each handler in try/catch with failsafe fallbacks
3. Returns a consistent `AgentResult` envelope
4. Logs timing for each call

**Structure:**

```typescript
import { generateText, tool, isStepCount } from "ai";
import { google } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { /* all schemas */ } from "@/lib/ai/tools";
import { /* all prompts */ } from "@/lib/ai/prompts";
import { searchExa } from "@/lib/search/Exa";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import type { AgentResult } from "./types";

const getModel = () => google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite");

// Helper: extract tool input from generateText result
function extractToolInput(result: any, toolName: string) {
  const call = result.steps
    .flatMap((step: any) => step.toolCalls ?? [])
    .find((tc: any) => tc.toolName === toolName);
  return call ? call.input : null;
}

// Helper: Haversine distance
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function orchestrate(body: any): Promise<AgentResult> {
  const start = Date.now();
  const { mode } = body;

  try {
    switch (mode) {
      case "liveness-test":
        return await handleLivenessTest(body, start);
      case "liveness":
        return await handleLiveness(body, start);
      case "lore":
        return await handleLore(body, start);
      case "magic-lens":
        return await handleMagicLens(body, start);
      case "migration":
        return await handleMigration(body, start);
      case "trail-narrative":
        return await handleTrailNarrative(body, start);
      case "phrase-recommendation":
        return await handlePhraseRecommendation(body, start);
      default:
        return await handleVision(body, start);
    }
  } catch (err) {
    console.error(`[orchestrator] ${mode} failed:`, err);
    return {
      action: mode ?? "unknown",
      result: null,
      durationMs: Date.now() - start,
      fallbackUsed: true,
    };
  }
}
```

Each `handle*` function is extracted from the current inline blocks in `route.ts`. They follow this pattern:

```typescript
async function handleLore(body: any, start: number): Promise<AgentResult> {
  const { ingredient, dish, lore_hint } = body;

  // Step 1: Search (with failsafe)
  const searchResults = await searchExa(
    `${ingredient} ${dish} Malaysian food culture history origin`
  );

  // Step 2: Build message
  let userMessage = `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}`;
  if (searchResults.length > 0) {
    const context = searchResults.map((r, i) => `[Source ${i + 1}: ${r.title}]\n${r.content}`).join("\n\n");
    userMessage = `Here are web search results:\n\n${context}\n\n---\n\n${userMessage}`;
  }

  // Step 3: Gemini synthesis
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_INGREDIENT_LORE,
    messages: [{ role: "user", content: userMessage }],
    tools: {
      getIngredientLore: tool({ description: "Generate cultural storytelling for an ingredient", inputSchema: getIngredientLoreSchema }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "lore",
    result: extractToolInput(result, "getIngredientLore"),
    durationMs: Date.now() - start,
    fallbackUsed: searchResults.length === 0,
  };
}
```

Extract ALL existing mode handlers from `route.ts` into separate `handle*` functions inside this file. The vision handler includes the location calculation logic.

### Refactor `src/app/api/chat/route.ts`

Replace the entire file body with a thin shell:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/orchestrator/orchestrator";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await orchestrate(body);

  console.log(`[api/chat] mode=${result.action} duration=${result.durationMs}ms fallback=${result.fallbackUsed ?? false}`);

  return NextResponse.json(result);
}
```

---

## Part 2: Update Client Call Sites

The response shape changes from ad-hoc per-mode shapes to `{ action, result, durationMs, fallbackUsed }`. All client-side `fetch("/api/chat", ...)` calls need to read `data.result` instead of the current top-level fields.

**Search for all call sites** by running: `grep -rn "api/chat" src/`

Known call sites to update (read each file before modifying to understand exact usage):

1. **`src/app/scan/page.tsx`** — liveness call (`livenessData.result` — already reads `.result`, check if it works), vision call (`data.menu` needs to become `data.result`), phrase-recommendation call (`data.result` — already correct)

2. **`src/components/pokedex/IngredientLoreOverlay.tsx`** or wherever lore is called — the response was `{ toolName, result }`, now it's `{ action, result }`. Update accordingly.

3. **`src/app/trail/page.tsx`** or wherever trail-narrative is called.

4. **`src/app/lens/page.tsx`** — magic lens call.

5. **Any component calling migration mode.**

For each call site:
- Read the file to see how the response is currently consumed
- Update to read from `data.result` instead of whatever the current structure is
- Test that the data shape matches what the component expects

**Important:** The `result` field inside `AgentResult` contains the SAME data that the tool call previously returned. So `data.result.dishes` still works for vision mode, `data.result.lore_text` still works for lore mode, etc. The wrapping is the only change.

Special case for **vision mode**: currently returns `{ menu: ..., location: ... }`. The orchestrator should return `{ action: "vision", result: { menu: ..., location: ... } }` to maintain the same inner shape.

---

## Part 3: Demo Polish

### `src/components/pokedex/IngredientLoreOverlay.tsx`

Read this file first. Find where `lore_text` and `fun_fact` are rendered. Add a small "Sources" section below `fun_fact` when `sources` is present:

```tsx
{lore.sources && lore.sources.length > 0 && (
  <div className="mt-2 pt-2 border-t border-[var(--border)]">
    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sources</p>
    <div className="space-y-0.5">
      {lore.sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-[var(--accent-primary)] hover:underline truncate"
        >
          {s.title}
        </a>
      ))}
    </div>
  </div>
)}
```

### `src/app/radar/page.tsx`

Read this file first. Add handling for `?highlight={nodeId}` query parameter:

1. Import `useSearchParams` from `next/navigation`
2. Read `const highlightId = searchParams.get("highlight")`
3. If `highlightId` exists, auto-center the map on that node's coordinates and open its detail sheet/card

The exact implementation depends on how the radar page currently structures its map and node detail UI — read the file before modifying.

---

## Files to NOT TOUCH

- `src/lib/recommender/*` — already done
- `src/lib/search/Exa.ts` — already done
- `src/lib/trails/trail-builder.ts` — already done by Plan 05
- `src/components/trail/DiversitySummary.tsx` — already done by Plan 05
- `scripts/curate-stall.ts` — already done by Plan 03
- `src/lib/data/heritage-nodes.ts` — already done by Plan 01

---

## Failsafe Table

Implement these in the orchestrator's catch blocks:

| Failure | Fallback |
|---|---|
| Exa API down | Lore handler skips search, uses Gemini-only (`fallbackUsed: true`) |
| Vision parse fails | Return `{ menu: { dishes: [], stall_type: "unknown", confidence: 0 }, location: null }` with `fallbackUsed: true` — client shows ManualDishDropdown |
| Recommendation phrasing fails | Return `{ suggestion: null }` — client uses template string |
| Any handler throws | Top-level catch returns `{ action, result: null, fallbackUsed: true }` |

---

## Verification

1. `npm run build` should pass.
2. Test each mode via curl:
   ```bash
   # Vision
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"mode":"vision","image":"...base64..."}'
   # Should return { action: "vision", result: { menu: {...}, location: {...} }, durationMs: ..., fallbackUsed: false }

   # Lore
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"mode":"lore","ingredient":"flat rice noodles","dish":"Char Kuey Teow","lore_hint":"wok hei"}'
   # Should return { action: "lore", result: { lore_text: "...", sources: [...] }, ... }
   ```
3. Verify console logs show: `[api/chat] mode=lore duration=1234ms fallback=false`
4. Full demo walkthrough in the app:
   - Radar → Catch stall → Recommendation card appears → Tap ingredient → Lore overlay shows sources → Build trail → Reflection section shows
5. Test the radar highlight: navigate to `/radar?highlight=new-lane-ckt` — map should center on that node.
6. Test failsafe: temporarily remove `Exa_API_KEY` — lore should still work (Gemini-only fallback), console shows warning.
