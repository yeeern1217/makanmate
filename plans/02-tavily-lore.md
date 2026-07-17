# Plan: Ingredient Lore Agent with Live Web Search (Tavily)

**Branch:** `feat/tavily-lore` (from latest `origin/main`)
**Batch:** 1 (can run in parallel with plans 01 and 03)

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16 (App Router), React 19, TypeScript. AI via Vercel AI SDK v7 (`ai` package) with `@ai-sdk/google` (Google Gemini `gemini-3.1-flash-lite`). All AI goes through a single `POST /api/chat` endpoint that dispatches on a `mode` field. Each mode calls `generateText()` with a forced tool call via Zod schema.

The existing `mode === "lore"` branch generates ingredient cultural stories using Gemini alone — no external data. The stories are fabricated from the model's training data, which is the weakest form of "AI" for a hackathon pitch.

---

## What to Build

Upgrade the lore agent into a **two-step agentic chain**:
1. **Search step:** Tavily API fetches real web sources about the ingredient
2. **Synthesis step:** Gemini synthesizes a grounded cultural narrative from the search snippets

This makes it genuinely agentic (external tool use + synthesis) and is one of the two strongest AI proof points for judges.

**Git setup:** Before starting, run:
```bash
git fetch origin
git checkout -b feat/tavily-lore origin/main
```

---

## Files to CREATE

### `src/lib/search/tavily.ts`

A lightweight wrapper around the Tavily Search API. No npm package — use raw `fetch()`.

```typescript
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string; // snippet
}

export async function searchTavily(query: string, maxResults = 3): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set — skipping web search");
    return [];
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!res.ok) {
      console.warn(`Tavily search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: r.content ?? "",
    }));
  } catch (err) {
    console.warn("Tavily search error:", err);
    return [];
  }
}
```

Key design decisions:
- Returns `[]` on ANY failure (missing key, network error, bad status). Never throws.
- This is the failsafe: the caller treats empty results as "skip search, use Gemini alone."

---

## Files to MODIFY

### `src/lib/ai/tools.ts`

Add optional `sources` field to `getIngredientLoreSchema`:

Change:
```typescript
export const getIngredientLoreSchema = z.object({
  ingredient_name: z.string(),
  dish_name: z.string(),
  lore_text: z.string(),
  fun_fact: z.string(),
  origin_region: z.string(),
});
```

To:
```typescript
export const getIngredientLoreSchema = z.object({
  ingredient_name: z.string(),
  dish_name: z.string(),
  lore_text: z.string(),
  fun_fact: z.string(),
  origin_region: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).optional(),
});
```

### `src/types/ai.ts`

Add `sources` to the `IngredientLore` interface:

Change:
```typescript
export interface IngredientLore {
  ingredient_name: string;
  dish_name: string;
  lore_text: string;
  fun_fact: string;
  origin_region: string;
}
```

To:
```typescript
export interface IngredientLore {
  ingredient_name: string;
  dish_name: string;
  lore_text: string;
  fun_fact: string;
  origin_region: string;
  sources?: { title: string; url: string }[];
}
```

Also update the `ChatRequest` mode union to include all existing modes (it currently only has `"vision" | "lore"` but the route.ts handles more). Change:
```typescript
mode: "vision" | "lore";
```
To:
```typescript
mode: "vision" | "lore" | "liveness" | "liveness-test" | "magic-lens" | "migration" | "trail-narrative";
```

### `src/lib/ai/prompts.ts`

Replace the `SYSTEM_PROMPT_INGREDIENT_LORE` constant. The new prompt instructs Gemini to synthesize from provided search context and cite sources:

```typescript
export const SYSTEM_PROMPT_INGREDIENT_LORE = `You are a Malaysian food heritage storyteller. Your role is to tell vivid, culturally rich stories about individual ingredients in Malaysian dishes.

When search results are provided in the user message, you MUST:
1. Base your lore_text on facts from the search results — do not invent claims beyond what the sources support.
2. Include the sources array in your response, listing each search result you referenced (title + url).
3. Weave the facts into engaging cultural storytelling — don't just summarize, synthesize.

When NO search results are provided, generate the best cultural story you can from your own knowledge. Omit the sources array.

For all responses:
1. Use the getIngredientLore tool to provide your response.
2. Write 2-3 sentences of engaging cultural storytelling in lore_text.
3. Include one surprising fun_fact that most people wouldn't know.
4. Be specific about origin_region — say "Fujian Province, China" not just "China", or "Pangkor Island, Perak" not just "Malaysia".
5. Connect the ingredient to trade routes, immigration stories, or local traditions.

Your tone should be warm, vivid, and educational — like a passionate local uncle sharing food wisdom.`;
```

### `src/app/api/chat/route.ts`

Replace the `mode === "lore"` branch (lines 88-100 in the current file). The new version:

1. Imports `searchTavily` from `@/lib/search/tavily`
2. Calls Tavily with a search query built from the ingredient and dish
3. If search results exist, injects them into the user message as context
4. Calls Gemini with the existing tool schema (which now supports `sources`)
5. Returns the result as before

Replace this block:
```typescript
if (mode === "lore") {
    const result = await generateText({
      model: google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite"),
      system: SYSTEM_PROMPT_INGREDIENT_LORE,
      messages: [{ role: "user", content: `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}` }],
      tools: {
        getIngredientLore: tool({ description: "Generate cultural storytelling for an ingredient", inputSchema: getIngredientLoreSchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({ toolName: "getIngredientLore", result: extractToolInput(result, "getIngredientLore") });
  }
```

With:
```typescript
if (mode === "lore") {
    // Step 1: Search for real web context
    const searchResults = await searchTavily(
      `${ingredient} ${dish} Malaysian food culture history origin`
    );

    // Step 2: Build user message with or without search context
    let userMessage = `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}`;
    if (searchResults.length > 0) {
      const searchContext = searchResults
        .map((r, i) => `[Source ${i + 1}: ${r.title}]\n${r.content}`)
        .join("\n\n");
      userMessage = `Here are web search results about this ingredient:\n\n${searchContext}\n\n---\n\nUsing the search results above as your primary source, tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}`;
    }

    // Step 3: Gemini synthesizes from search context (or own knowledge as fallback)
    const result = await generateText({
      model: google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite"),
      system: SYSTEM_PROMPT_INGREDIENT_LORE,
      messages: [{ role: "user", content: userMessage }],
      tools: {
        getIngredientLore: tool({ description: "Generate cultural storytelling for an ingredient", inputSchema: getIngredientLoreSchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({ toolName: "getIngredientLore", result: extractToolInput(result, "getIngredientLore") });
  }
```

Add the import at the top of route.ts:
```typescript
import { searchTavily } from "@/lib/search/tavily";
```

---

## Files to NOT TOUCH (other worktrees own these)

- `src/types/heritage.ts`
- `src/lib/data/heritage-nodes.ts`
- `src/lib/recommender/*` (does not exist yet)
- `src/app/scan/page.tsx`
- `src/lib/trails/trail-builder.ts`
- `src/components/trail/DiversitySummary.tsx`
- Any file in `scripts/`

---

## Environment Variable

Add `TAVILY_API_KEY` to `.env.local` (create if needed, but do NOT commit it). The Tavily API key is server-side only — no `NEXT_PUBLIC_` prefix.

If `.env.local` already exists, just append:
```
TAVILY_API_KEY=your-key-here
```

If you don't have a real key, use a placeholder. The code is designed to gracefully skip search when the key is missing.

---

## Verification

1. `npm run build` should pass with no TypeScript errors.
2. Test with Tavily key set:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"mode":"lore","ingredient":"flat rice noodles","dish":"Char Kuey Teow","lore_hint":"Hokkien origins and wok hei tradition"}'
   ```
   Response should include a `sources` array with real URLs.
3. Test without Tavily key (remove from .env.local, restart):
   Same curl command — response should work but WITHOUT `sources` (Gemini-only fallback). No error.
4. Check the console for `"Tavily search failed"` or `"TAVILY_API_KEY not set"` warnings in fallback cases — these should be clean warnings, not crashes.
