# Plan: Stall Curation Pipeline — Agentic Data Verification

**Branch:** `feat/curation-pipeline` (from latest `origin/main`)
**Batch:** 1 (can run in parallel with plans 01 and 02)

---

## Project Context

MakanMate is a Malaysian street food heritage app. Next.js 16, TypeScript, Vercel AI SDK v7 with `@ai-sdk/google` (Google Gemini). The app has 16 hardcoded heritage stall nodes in `src/lib/data/heritage-nodes.ts`. This pipeline is a **standalone build-time script** that demonstrates agentic AI for the hackathon pitch — 4 agents with a verification loop that discovers, cross-checks, and enriches heritage stall data.

This script is completely independent of the app. It lives in `scripts/` and is run from the terminal. It does NOT touch any app source code.

**Git setup:** Before starting, run:
```bash
git fetch origin
git checkout -b feat/curation-pipeline origin/main
```

---

## What to Build

A standalone TypeScript script that runs a 4-agent pipeline:

```
Scout ──> Verifier ──> Enricher ──> Quality Gate
              ^            |
              └── conflicts ┘   (re-search if sources disagree)
```

| Agent | Job | Tool |
|---|---|---|
| **Scout** | Search for heritage stall candidates in a city/district | Tavily API |
| **Verifier** | Cross-check claims (founding year, cultural origin, signature dish) via independent searches. Flag conflicts. | Tavily API + Gemini |
| **Enricher** | Assign content tags, compute heritage score inputs, generate cultural context | Gemini structured output |
| **Quality Gate** | Deduplicate against existing DB, validate schema, output final JSON | Deterministic code |

The key agentic feature is the **verification loop**: when the Verifier finds conflicting information across sources, it re-searches with a narrower query and uses Gemini to resolve the conflict.

---

## Files to CREATE

### `scripts/curate-stall.ts`

Single self-contained script. Run via `npx tsx scripts/curate-stall.ts --city "Penang" --type "hawker"`.

**Dependencies it uses** (already in package.json):
- `ai` (Vercel AI SDK) — for `generateText()` with structured output
- `@ai-sdk/google` — for the Gemini model
- `zod` — for output schemas

**Environment variables needed:**
- `TAVILY_API_KEY` — for web search
- `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY` — for Gemini (same key the app uses, loaded from `.env.local`)

The script should load `.env.local` itself. Use:
```typescript
import { config } from "dotenv";
config({ path: ".env.local" });
```
(The `dotenv` package is not in package.json — either add it or inline a simple env file reader. Alternatively, have the user export the vars before running.)

### Script Structure

```typescript
#!/usr/bin/env npx tsx

import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// --- CLI args ---
const args = process.argv.slice(2);
const cityIdx = args.indexOf("--city");
const typeIdx = args.indexOf("--type");
const city = cityIdx >= 0 ? args[cityIdx + 1] : "Penang";
const stallType = typeIdx >= 0 ? args[typeIdx + 1] : "hawker";

// --- Tavily search helper ---
async function searchTavily(query: string, maxResults = 5): Promise<Array<{title: string, url: string, content: string}>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, search_depth: "basic" }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({ title: r.title, url: r.url, content: r.content }));
}

// --- Gemini helper ---
const model = google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite");

// --- Schemas ---
const scoutResultSchema = z.object({
  stalls: z.array(z.object({
    name: z.string(),
    signatureDish: z.string(),
    approximateLocation: z.string(),
    claimedFoundedYear: z.string().optional(),
    claimedCulturalOrigin: z.string().optional(),
  })),
});

const verifyClaimSchema = z.object({
  claim: z.string(),
  supported: z.boolean(),
  evidence: z.string(),
  conflictsWith: z.string().optional(),
});

const enrichStallSchema = z.object({
  description: z.string(),
  culturalOrigin: z.enum(["Malay", "Chinese", "Indian", "Peranakan", "Mamak", "Portuguese"]),
  heritageScoreEstimate: z.number().min(0).max(100),
  tags: z.array(z.string()),
  founded: z.number().optional(),
});

// --- AGENT 1: SCOUT ---
async function scoutAgent(city: string, type: string) {
  console.log(`\n🔍 SCOUT: Searching for hidden ${type} stalls in ${city}...`);
  const searchResults = await searchTavily(`hidden heritage ${type} stalls ${city} Malaysia traditional food`);
  const context = searchResults.map(r => `[${r.title}]\n${r.content}`).join("\n\n");

  const result = await generateText({
    model,
    system: "You are a Malaysian food researcher. Extract heritage food stall names from the search results. Focus on small, traditional, family-run stalls — NOT chains or malls.",
    messages: [{ role: "user", content: `From these search results about ${city} ${type} stalls, extract individual stall names and their details:\n\n${context}` }],
    tools: { extractStalls: tool({ description: "Extract stall candidates", inputSchema: scoutResultSchema }) },
    toolChoice: "required" as const,
  });

  const toolCall = result.steps.flatMap(s => s.toolCalls ?? []).find(t => t.toolName === "extractStalls");
  const stalls = (toolCall?.input as any)?.stalls ?? [];
  console.log(`   Found ${stalls.length} candidates`);
  return stalls;
}

// --- AGENT 2: VERIFIER (with conflict resolution loop) ---
async function verifyAgent(stallName: string, claim: string, claimType: string) {
  const searchResults = await searchTavily(`"${stallName}" ${claim} ${claimType}`, 3);
  if (searchResults.length === 0) return { claim, supported: false, evidence: "No sources found", conflictsWith: undefined };

  const context = searchResults.map(r => `[${r.title}]\n${r.content}`).join("\n\n");
  const result = await generateText({
    model,
    system: "You are a fact-checker. Verify if the claim about this food stall is supported by the search results. Be strict — only mark as supported if there is clear evidence.",
    messages: [{ role: "user", content: `Verify this claim about "${stallName}": "${claim}"\n\nSearch results:\n${context}` }],
    tools: { verifyClaim: tool({ description: "Verify a claim", inputSchema: verifyClaimSchema }) },
    toolChoice: "required" as const,
  });

  const toolCall = result.steps.flatMap(s => s.toolCalls ?? []).find(t => t.toolName === "verifyClaim");
  return toolCall?.input as any ?? { claim, supported: false, evidence: "Verification failed" };
}

async function verifyStall(stall: any) {
  console.log(`\n✅ VERIFIER: Cross-checking ${stall.name}...`);
  const claims = [
    { type: "founding year", value: stall.claimedFoundedYear || "unknown founding year" },
    { type: "cultural origin", value: stall.claimedCulturalOrigin || "unknown cultural origin" },
    { type: "signature dish", value: stall.signatureDish },
  ];

  const checks = await Promise.all(
    claims.map(c => verifyAgent(stall.name, `${c.type}: ${c.value}`, c.type))
  );

  // Find conflicts
  const conflicts = checks.filter(c => !c.supported && c.conflictsWith);
  if (conflicts.length > 0) {
    console.log(`   ⚠️ ${conflicts.length} conflict(s) found — re-searching...`);
    // THE AGENTIC LOOP: re-search with narrower queries
    for (const conflict of conflicts) {
      const resolved = await verifyAgent(
        stall.name,
        conflict.conflictsWith!,
        "resolution"
      );
      console.log(`   → Resolved: ${resolved.evidence}`);
    }
  }

  const verifiedCount = checks.filter(c => c.supported).length;
  console.log(`   ${verifiedCount}/${checks.length} claims verified`);

  return {
    ...stall,
    verificationStatus: verifiedCount === checks.length ? "verified" : verifiedCount > 0 ? "partial" : "unverified",
    sourcesChecked: checks.length * 3, // 3 search results per claim
    conflictsResolved: conflicts.length,
    checks,
  };
}

// --- AGENT 3: ENRICHER ---
async function enrichAgent(stall: any) {
  console.log(`\n🏷️ ENRICHER: Generating metadata for ${stall.name}...`);
  const result = await generateText({
    model,
    system: `You are a Malaysian food data curator. Generate structured metadata for a heritage food stall.

For tags, use ONLY from this closed vocabulary:
Protein: seafood, pork, chicken, duck, egg, vegetarian-ok
Cooking: wok-hei, braised, steamed, deep-fried, grilled
Carb: noodle, rice, flatbread, pastry, dessert
Flavor: spicy, sour, sweet, herbal, savory-umami

Assign 3-5 tags based on the signature dish. For heritage_score: 80-100 for stalls founded before 1980, 60-80 for 1980-2000, 40-60 for after 2000.`,
    messages: [{ role: "user", content: `Enrich this stall: ${stall.name}, signature dish: ${stall.signatureDish}, location: ${stall.approximateLocation}, founded: ${stall.claimedFoundedYear || "unknown"}` }],
    tools: { enrichStall: tool({ description: "Enrich stall metadata", inputSchema: enrichStallSchema }) },
    toolChoice: "required" as const,
  });

  const toolCall = result.steps.flatMap(s => s.toolCalls ?? []).find(t => t.toolName === "enrichStall");
  return { ...stall, enrichment: toolCall?.input ?? null };
}

// --- AGENT 4: QUALITY GATE (deterministic) ---
// Import the existing heritage nodes for dedup
// (Read the file and parse, or hardcode the IDs)
const EXISTING_IDS = [
  "new-lane-ckt", "lorong-selamat-cendol", "gurney-drive-laksa", "oh-chien-heritage",
  "petaling-street-bkt", "bangsar-roti-canai", "village-park-nasi-lemak", "fatty-crab-duck-rice",
  "onn-kee-chicken", "foh-san-hor-fun", "foh-san-dim-sum", "sin-yoon-loong-egg-tart",
  "hyped-pavilion-food-court", "hyped-lot10-hutong", "hyped-gurney-plaza-food", "hyped-ipoh-parade-food",
];

function qualityGate(stall: any) {
  console.log(`\n🚪 QUALITY GATE: Validating ${stall.name}...`);
  const id = stall.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (EXISTING_IDS.includes(id)) {
    console.log(`   ❌ Duplicate — "${stall.name}" already exists as "${id}"`);
    return null;
  }

  if (!stall.enrichment) {
    console.log(`   ❌ Missing enrichment data`);
    return null;
  }

  const heritageNode = {
    id,
    name: stall.name,
    lat: 0, // Would need geocoding in production
    lng: 0,
    city,
    type: stallType,
    heritage_score: stall.enrichment.heritageScoreEstimate,
    signature_dish: stall.signatureDish,
    dish_id: "",
    description: stall.enrichment.description,
    founded: stall.enrichment.founded,
    culturalOrigin: stall.enrichment.culturalOrigin,
    reviewCount: 0, // Unknown for newly discovered stalls = maximum invisibility boost
    isGrassroots: true,
    communityCatchCount: 0,
    tags: stall.enrichment.tags,
    verificationStatus: stall.verificationStatus,
    sourcesChecked: stall.sourcesChecked,
    conflictsResolved: stall.conflictsResolved,
  };

  console.log(`   ✅ Valid — output ready`);
  return heritageNode;
}

// --- MAIN PIPELINE ---
async function main() {
  console.log("=".repeat(60));
  console.log(`MakanMate Stall Curation Pipeline`);
  console.log(`City: ${city} | Type: ${stallType}`);
  console.log("=".repeat(60));

  // Step 1: Scout
  const candidates = await scoutAgent(city, stallType);
  if (candidates.length === 0) {
    console.log("\nNo candidates found. Try a different city or type.");
    process.exit(0);
  }

  // Step 2: Verify (with conflict resolution loop)
  const verified = [];
  for (const candidate of candidates.slice(0, 5)) { // Cap at 5 for demo
    const result = await verifyStall(candidate);
    verified.push(result);
  }

  // Step 3: Enrich
  const enriched = [];
  for (const stall of verified) {
    const result = await enrichAgent(stall);
    enriched.push(result);
  }

  // Step 4: Quality Gate
  const output = [];
  for (const stall of enriched) {
    const result = qualityGate(stall);
    if (result) output.push(result);
  }

  // Final output
  console.log("\n" + "=".repeat(60));
  console.log(`PIPELINE COMPLETE: ${output.length} new stalls curated`);
  console.log("=".repeat(60));
  console.log("\nPaste into heritage-nodes.ts:\n");
  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
```

---

## Files to NOT TOUCH

This plan creates ONLY `scripts/curate-stall.ts`. Do NOT modify any file in `src/`. The script is completely standalone.

---

## Dependencies

May need to add `dotenv` for loading `.env.local`:
```bash
npm install -D dotenv
```

Or alternatively, the user can export env vars manually before running the script.

Also need `tsx` for running TypeScript directly:
```bash
npm install -D tsx
```

Check if these are already in `devDependencies` before installing.

---

## Verification

1. Run with real keys:
   ```bash
   TAVILY_API_KEY=xxx GOOGLE_GENERATIVE_AI_API_KEY=xxx npx tsx scripts/curate-stall.ts --city "Penang" --type "hawker"
   ```
   Should print the 4-agent pipeline progress with emoji headers and output valid JSON.

2. Verify the console shows:
   - `🔍 SCOUT: Searching for hidden hawker stalls in Penang...`
   - `✅ VERIFIER: Cross-checking {name}...` with claim counts
   - `⚠️ conflict(s) found — re-searching...` (if any conflicts arise)
   - `🏷️ ENRICHER: Generating metadata for {name}...`
   - `🚪 QUALITY GATE: Validating {name}...`
   - Final JSON output

3. Verify dedup: if a stall named "New Lane Char Kuey Teow" is found, the quality gate should reject it as a duplicate.

4. Verify the output JSON matches the `HeritageNode` interface shape (has id, name, lat, lng, city, type, heritage_score, etc.).
