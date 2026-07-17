#!/usr/bin/env npx tsx
/**
 * MakanMate Heritage Stall Curation Pipeline
 *
 * A 4-agent pipeline that discovers, verifies, enriches, and validates
 * heritage food stalls for inclusion in the MakanMate database.
 *
 * Agents:
 *   1. Scout     - Tavily search to find heritage stall candidates
 *   2. Verifier  - Cross-checks 3 claims per stall via independent searches;
 *                  re-searches with narrower queries when sources conflict
 *   3. Enricher  - Gemini assigns tags, heritage score, cultural context
 *   4. Quality Gate - Deterministic dedup + schema validation
 *
 * Usage:
 *   npx tsx scripts/curate-stall.ts --city "Penang" --type "hawker"
 *
 * Environment variables required:
 *   TAVILY_API_KEY   - API key for Tavily search
 *   GOOGLE_GENERATIVE_AI_API_KEY - API key for Google Gemini
 */

import "dotenv/config";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const city = getArg("city") ?? "Penang";
const stallType = getArg("type") ?? "hawker";

// ---------------------------------------------------------------------------
// Environment checks
// ---------------------------------------------------------------------------

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!TAVILY_API_KEY) {
  console.error(
    "ERROR: TAVILY_API_KEY is not set. Export it or add it to a .env file."
  );
  process.exit(1);
}
if (!GOOGLE_API_KEY) {
  console.error(
    "ERROR: GOOGLE_GENERATIVE_AI_API_KEY is not set. Export it or add it to a .env file."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Existing node IDs for dedup (copied from src/lib/data/heritage-nodes.ts)
// We intentionally duplicate these IDs here so this script stays standalone
// and never imports from src/.
// ---------------------------------------------------------------------------

const EXISTING_NODE_IDS = new Set([
  "new-lane-ckt",
  "lorong-selamat-cendol",
  "gurney-drive-laksa",
  "oh-chien-heritage",
  "petaling-street-bkt",
  "bangsar-roti-canai",
  "village-park-nasi-lemak",
  "fatty-crab-duck-rice",
  "onn-kee-chicken",
  "foh-san-hor-fun",
  "foh-san-dim-sum",
  "sin-yoon-loong-egg-tart",
  "hyped-pavilion-food-court",
  "hyped-lot10-hutong",
  "hyped-gurney-plaza-food",
  "hyped-ipoh-parade-food",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CulturalOrigin =
  | "Malay"
  | "Chinese"
  | "Indian"
  | "Peranakan"
  | "Mamak"
  | "Portuguese";

type StallType = "kopitiam" | "hawker" | "warung" | "mamak";

type CityName = "KL" | "Penang" | "Ipoh";

interface HeritageNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: CityName;
  type: StallType;
  heritage_score: number;
  signature_dish: string;
  dish_id: string;
  description: string;
  founded?: number;
  culturalOrigin: CulturalOrigin;
  reviewCount: number;
  isGrassroots: boolean;
  communityCatchCount: number;
}

/** Raw candidate from the Scout agent before verification */
interface ScoutCandidate {
  name: string;
  signatureDish: string;
  foundedYear: number | null;
  location: string;
  culturalOrigin: string;
  snippet: string;
  sourceUrl: string;
}

/** Claim to verify */
interface Claim {
  field: string;
  value: string;
  sourceUrl: string;
}

/** Verification result */
interface VerificationResult {
  field: string;
  originalValue: string;
  verifiedValue: string;
  confidence: "high" | "medium" | "low";
  sources: string[];
  conflictResolved: boolean;
}

// ---------------------------------------------------------------------------
// Tavily search helper
// ---------------------------------------------------------------------------

async function tavilySearch(
  query: string,
  maxResults = 5
): Promise<{ title: string; url: string; content: string }[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return (data.results ?? []).map(
    (r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })
  );
}

// ---------------------------------------------------------------------------
// Utility: slugify name to ID
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// AGENT 1: Scout
// ---------------------------------------------------------------------------

async function scoutAgent(
  city: string,
  stallType: string
): Promise<ScoutCandidate[]> {
  console.log("\n========================================");
  console.log("  AGENT 1: SCOUT");
  console.log("========================================");
  console.log(`Searching for heritage ${stallType} stalls in ${city}...`);

  const queries = [
    `best heritage ${stallType} stalls ${city} Malaysia traditional`,
    `oldest ${stallType} food ${city} Malaysia generational family recipe`,
    `famous traditional ${stallType} ${city} Malaysia history founded year`,
  ];

  const allResults: { title: string; url: string; content: string }[] = [];

  for (const query of queries) {
    console.log(`  [Scout] Searching: "${query}"`);
    try {
      const results = await tavilySearch(query, 5);
      console.log(`  [Scout] Found ${results.length} results`);
      allResults.push(...results);
    } catch (err) {
      console.error(
        `  [Scout] Search failed for query: ${query}`,
        (err as Error).message
      );
    }
  }

  if (allResults.length === 0) {
    console.log("  [Scout] No search results found. Aborting.");
    return [];
  }

  // Use Gemini to extract structured candidates from search results
  console.log(
    `  [Scout] Extracting candidates from ${allResults.length} search results using Gemini...`
  );

  const searchContext = allResults
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}\n---`
    )
    .join("\n");

  const { object: candidates } = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: z.object({
      candidates: z.array(
        z.object({
          name: z.string().describe("Full stall name"),
          signatureDish: z
            .string()
            .describe("The most famous dish served here"),
          foundedYear: z
            .number()
            .nullable()
            .describe("Year founded, or null if unknown"),
          location: z
            .string()
            .describe("Specific location/address within the city"),
          culturalOrigin: z
            .string()
            .describe(
              "Cultural origin: Malay, Chinese, Indian, Peranakan, Mamak, or Portuguese"
            ),
          snippet: z
            .string()
            .describe(
              "Brief heritage description from the search results"
            ),
          sourceUrl: z.string().describe("Primary source URL"),
        })
      ),
    }),
    prompt: `You are a heritage food researcher for ${city}, Malaysia. Extract heritage ${stallType} stall candidates from these search results.

IMPORTANT RULES:
- Only include stalls that are clearly heritage/traditional (multi-generational, decades old, or culturally significant)
- Do NOT include chain restaurants, mall food courts, or modern franchises
- Each candidate must have a specific name (not generic like "hawker stalls")
- Include the founding year if mentioned, otherwise null
- Cultural origin must be one of: Malay, Chinese, Indian, Peranakan, Mamak, Portuguese
- Aim for 3-6 high-quality candidates

Search results:
${searchContext}`,
  });

  console.log(
    `  [Scout] Extracted ${candidates.candidates.length} candidates:`
  );
  for (const c of candidates.candidates) {
    console.log(
      `    - ${c.name} (${c.signatureDish}, est. ${c.foundedYear ?? "unknown"})`
    );
  }

  return candidates.candidates;
}

// ---------------------------------------------------------------------------
// AGENT 2: Verifier (with conflict resolution loop)
// ---------------------------------------------------------------------------

async function verifierAgent(
  candidates: ScoutCandidate[],
  city: string
): Promise<(ScoutCandidate & { verifications: VerificationResult[] })[]> {
  console.log("\n========================================");
  console.log("  AGENT 2: VERIFIER");
  console.log("========================================");
  console.log(`Verifying ${candidates.length} candidates...`);

  const verified: (ScoutCandidate & {
    verifications: VerificationResult[];
  })[] = [];

  for (const candidate of candidates) {
    console.log(`\n  [Verifier] Checking: ${candidate.name}`);
    const verifications: VerificationResult[] = [];

    // Define 3 claims to verify for each stall
    const claims: Claim[] = [
      {
        field: "foundedYear",
        value: candidate.foundedYear?.toString() ?? "unknown",
        sourceUrl: candidate.sourceUrl,
      },
      {
        field: "signatureDish",
        value: candidate.signatureDish,
        sourceUrl: candidate.sourceUrl,
      },
      {
        field: "culturalOrigin",
        value: candidate.culturalOrigin,
        sourceUrl: candidate.sourceUrl,
      },
    ];

    for (const claim of claims) {
      console.log(
        `    [Verifier] Verifying ${claim.field}: "${claim.value}"`
      );

      // Step 1: Search for independent sources about this claim
      const verifyQuery = `"${candidate.name}" ${city} Malaysia ${claim.field === "foundedYear" ? "founded year history" : claim.field === "signatureDish" ? "famous dish specialty" : "cultural origin heritage"}`;

      console.log(`    [Verifier] Search: "${verifyQuery}"`);

      let searchResults: { title: string; url: string; content: string }[] =
        [];
      try {
        searchResults = await tavilySearch(verifyQuery, 3);
      } catch (err) {
        console.error(
          `    [Verifier] Search failed: ${(err as Error).message}`
        );
      }

      if (searchResults.length === 0) {
        console.log(
          `    [Verifier] No independent sources found for ${claim.field}. Keeping original.`
        );
        verifications.push({
          field: claim.field,
          originalValue: claim.value,
          verifiedValue: claim.value,
          confidence: "low",
          sources: [claim.sourceUrl],
          conflictResolved: false,
        });
        continue;
      }

      // Step 2: Use Gemini to check if sources agree
      const sourceTexts = searchResults
        .map(
          (r, i) =>
            `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
        )
        .join("\n---\n");

      const { object: verifyResult } = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({
          sourcesAgree: z
            .boolean()
            .describe("Do the sources agree with the original claim?"),
          foundValues: z
            .array(z.string())
            .describe("All distinct values found across sources"),
          bestValue: z
            .string()
            .describe(
              "The most credible value based on all sources"
            ),
          confidence: z
            .enum(["high", "medium", "low"])
            .describe("Confidence in the verified value"),
        }),
        prompt: `You are verifying a claim about "${candidate.name}" in ${city}, Malaysia.

Claim: ${claim.field} = "${claim.value}"
Original source: ${claim.sourceUrl}

Independent sources found:
${sourceTexts}

Check whether the independent sources agree with the original claim.
- If they agree, mark sourcesAgree=true and use the same value.
- If they conflict, list all distinct values found and pick the most credible one.
- For founding years, prefer the earliest credible year from official sources.
- For cultural origin, it must be one of: Malay, Chinese, Indian, Peranakan, Mamak, Portuguese.`,
      });

      if (!verifyResult.sourcesAgree) {
        // --------------------------------------------------------
        // CONFLICT DETECTED: Re-search with narrower query
        // --------------------------------------------------------
        console.log(
          `    [Verifier] CONFLICT DETECTED for ${claim.field}!`
        );
        console.log(
          `    [Verifier] Original: "${claim.value}" vs Found: ${JSON.stringify(verifyResult.foundValues)}`
        );

        // Narrower re-search
        const narrowQuery = `"${candidate.name}" ${city} ${claim.field === "foundedYear" ? `"established" OR "since" OR "founded in"` : claim.field === "signatureDish" ? `"famous for" OR "known for" OR "signature"` : `"${candidate.culturalOrigin}" heritage origin`}`;

        console.log(
          `    [Verifier] Re-searching with narrower query: "${narrowQuery}"`
        );

        let narrowResults: {
          title: string;
          url: string;
          content: string;
        }[] = [];
        try {
          narrowResults = await tavilySearch(narrowQuery, 3);
        } catch (err) {
          console.error(
            `    [Verifier] Narrow search failed: ${(err as Error).message}`
          );
        }

        if (narrowResults.length > 0) {
          // Use Gemini to compare and resolve the conflict
          const narrowSourceTexts = narrowResults
            .map(
              (r, i) =>
                `[Narrow Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
            )
            .join("\n---\n");

          const { object: resolved } = await generateObject({
            model: google("gemini-2.0-flash"),
            schema: z.object({
              resolvedValue: z
                .string()
                .describe("The final resolved value after comparing all sources"),
              confidence: z
                .enum(["high", "medium", "low"])
                .describe("Confidence in the resolution"),
              reasoning: z
                .string()
                .describe("Brief explanation of how the conflict was resolved"),
            }),
            prompt: `You need to resolve a conflicting claim about "${candidate.name}" in ${city}, Malaysia.

Claim field: ${claim.field}
Original value: "${claim.value}"
Other values found: ${JSON.stringify(verifyResult.foundValues)}

Here are additional narrow-search sources:
${narrowSourceTexts}

Previous broad-search sources:
${sourceTexts}

Resolve the conflict by considering:
1. Source credibility (official sites > blogs > forums)
2. Recency of information
3. Consistency across multiple sources
4. For founding years: prefer the earliest credible mention
5. For cultural origin: must be one of Malay, Chinese, Indian, Peranakan, Mamak, Portuguese

Provide the resolved value and explain your reasoning.`,
          });

          console.log(
            `    [Verifier] RESOLVED: ${claim.field} = "${resolved.resolvedValue}" (${resolved.confidence})`
          );
          console.log(
            `    [Verifier] Reasoning: ${resolved.reasoning}`
          );

          verifications.push({
            field: claim.field,
            originalValue: claim.value,
            verifiedValue: resolved.resolvedValue,
            confidence: resolved.confidence,
            sources: [
              ...searchResults.map((r) => r.url),
              ...narrowResults.map((r) => r.url),
            ],
            conflictResolved: true,
          });
        } else {
          // No narrow results found, use the best value from the broad search
          console.log(
            `    [Verifier] No narrow results. Using broad search best: "${verifyResult.bestValue}"`
          );
          verifications.push({
            field: claim.field,
            originalValue: claim.value,
            verifiedValue: verifyResult.bestValue,
            confidence: verifyResult.confidence,
            sources: searchResults.map((r) => r.url),
            conflictResolved: true,
          });
        }
      } else {
        // Sources agree
        console.log(
          `    [Verifier] CONFIRMED: ${claim.field} = "${verifyResult.bestValue}" (${verifyResult.confidence})`
        );
        verifications.push({
          field: claim.field,
          originalValue: claim.value,
          verifiedValue: verifyResult.bestValue,
          confidence: verifyResult.confidence,
          sources: searchResults.map((r) => r.url),
          conflictResolved: false,
        });
      }
    }

    // Apply verified values back to the candidate
    const verifiedCandidate = { ...candidate, verifications };
    for (const v of verifications) {
      if (v.field === "foundedYear" && v.verifiedValue !== "unknown") {
        const parsed = parseInt(v.verifiedValue, 10);
        if (!isNaN(parsed)) {
          verifiedCandidate.foundedYear = parsed;
        }
      } else if (v.field === "signatureDish") {
        verifiedCandidate.signatureDish = v.verifiedValue;
      } else if (v.field === "culturalOrigin") {
        verifiedCandidate.culturalOrigin = v.verifiedValue;
      }
    }

    verified.push(verifiedCandidate);
  }

  console.log(
    `\n  [Verifier] Verified ${verified.length} candidates.`
  );
  return verified;
}

// ---------------------------------------------------------------------------
// AGENT 3: Enricher
// ---------------------------------------------------------------------------

async function enricherAgent(
  candidates: (ScoutCandidate & { verifications: VerificationResult[] })[],
  city: string,
  stallType: string
): Promise<HeritageNode[]> {
  console.log("\n========================================");
  console.log("  AGENT 3: ENRICHER");
  console.log("========================================");
  console.log(`Enriching ${candidates.length} verified candidates...`);

  const validCulturalOrigins = [
    "Malay",
    "Chinese",
    "Indian",
    "Peranakan",
    "Mamak",
    "Portuguese",
  ] as const;

  const validCities = ["KL", "Penang", "Ipoh"] as const;
  const validStallTypes = ["kopitiam", "hawker", "warung", "mamak"] as const;

  const enriched: HeritageNode[] = [];

  for (const candidate of candidates) {
    console.log(`\n  [Enricher] Enriching: ${candidate.name}`);

    const confidenceSummary = candidate.verifications
      .map(
        (v) =>
          `${v.field}: ${v.verifiedValue} (${v.confidence}${v.conflictResolved ? ", conflict resolved" : ""})`
      )
      .join("; ");

    const { object: enrichment } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: z.object({
        heritageScore: z
          .number()
          .min(0)
          .max(100)
          .describe(
            "Heritage score 0-100 based on age, cultural significance, and authenticity"
          ),
        description: z
          .string()
          .describe(
            "One or two sentence heritage description emphasizing cultural significance"
          ),
        dishId: z
          .string()
          .describe(
            "Slug ID for the signature dish, e.g. 'char-kuey-teow'"
          ),
        lat: z.number().describe("Latitude coordinate"),
        lng: z.number().describe("Longitude coordinate"),
        culturalOrigin: z
          .enum(validCulturalOrigins)
          .describe("Cultural origin category"),
        suggestedType: z
          .enum(validStallTypes)
          .describe("Stall type classification"),
      }),
      prompt: `You are enriching a heritage food stall entry for ${city}, Malaysia.

Stall: ${candidate.name}
Location: ${candidate.location}
Signature Dish: ${candidate.signatureDish}
Founded: ${candidate.foundedYear ?? "unknown"}
Original Cultural Origin: ${candidate.culturalOrigin}
Heritage snippet: ${candidate.snippet}

Verification results: ${confidenceSummary}

Please provide:
1. A heritage score (0-100) based on:
   - Age (older = higher, 50+ years is significant)
   - Cultural significance (unique cooking techniques, generational recipes)
   - Authenticity (family-run, original location, unchanged recipes)
   - Community importance (local institution, landmark status)
2. A compelling 1-2 sentence description highlighting cultural heritage
3. A dish ID slug for the signature dish (lowercase, hyphenated)
4. Accurate latitude/longitude for this stall in ${city}
5. The correct cultural origin from: Malay, Chinese, Indian, Peranakan, Mamak, Portuguese
6. The stall type from: kopitiam, hawker, warung, mamak`,
    });

    // Map city name to the union type
    const cityMap: Record<string, CityName> = {
      penang: "Penang",
      kl: "KL",
      "kuala lumpur": "KL",
      ipoh: "Ipoh",
    };
    const mappedCity: CityName =
      cityMap[city.toLowerCase()] ?? "Penang";

    const node: HeritageNode = {
      id: slugify(candidate.name),
      name: candidate.name,
      lat: enrichment.lat,
      lng: enrichment.lng,
      city: mappedCity,
      type: enrichment.suggestedType,
      heritage_score: enrichment.heritageScore,
      signature_dish: candidate.signatureDish,
      dish_id: enrichment.dishId,
      description: enrichment.description,
      culturalOrigin: enrichment.culturalOrigin,
      reviewCount: 0,
      isGrassroots: true,
      communityCatchCount: 0,
    };

    // Add founded year if known
    if (candidate.foundedYear) {
      node.founded = candidate.foundedYear;
    }

    console.log(
      `  [Enricher] Score: ${node.heritage_score}, Origin: ${node.culturalOrigin}, Type: ${node.type}`
    );
    console.log(`  [Enricher] Desc: ${node.description}`);
    enriched.push(node);
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// AGENT 4: Quality Gate (deterministic)
// ---------------------------------------------------------------------------

function qualityGateAgent(nodes: HeritageNode[]): HeritageNode[] {
  console.log("\n========================================");
  console.log("  AGENT 4: QUALITY GATE");
  console.log("========================================");
  console.log(`Validating ${nodes.length} enriched nodes...`);

  const validCulturalOrigins = new Set([
    "Malay",
    "Chinese",
    "Indian",
    "Peranakan",
    "Mamak",
    "Portuguese",
  ]);
  const validCities = new Set(["KL", "Penang", "Ipoh"]);
  const validStallTypes = new Set(["kopitiam", "hawker", "warung", "mamak"]);

  const passed: HeritageNode[] = [];
  const seenIds = new Set<string>();

  for (const node of nodes) {
    const issues: string[] = [];

    // 1. Dedup against existing HERITAGE_NODES
    if (EXISTING_NODE_IDS.has(node.id)) {
      issues.push(`Duplicate: ID "${node.id}" already exists in HERITAGE_NODES`);
    }

    // 2. Dedup within this batch
    if (seenIds.has(node.id)) {
      issues.push(`Duplicate: ID "${node.id}" already in this batch`);
    }

    // 3. Schema validation
    if (!node.id || node.id.length === 0) {
      issues.push("Missing ID");
    }
    if (!node.name || node.name.length === 0) {
      issues.push("Missing name");
    }
    if (typeof node.lat !== "number" || node.lat < -90 || node.lat > 90) {
      issues.push(`Invalid latitude: ${node.lat}`);
    }
    if (
      typeof node.lng !== "number" ||
      node.lng < -180 ||
      node.lng > 180
    ) {
      issues.push(`Invalid longitude: ${node.lng}`);
    }
    if (!validCities.has(node.city)) {
      issues.push(`Invalid city: ${node.city}`);
    }
    if (!validStallTypes.has(node.type)) {
      issues.push(`Invalid stall type: ${node.type}`);
    }
    if (
      typeof node.heritage_score !== "number" ||
      node.heritage_score < 0 ||
      node.heritage_score > 100
    ) {
      issues.push(`Invalid heritage score: ${node.heritage_score}`);
    }
    if (!node.signature_dish || node.signature_dish.length === 0) {
      issues.push("Missing signature dish");
    }
    if (!node.dish_id || node.dish_id.length === 0) {
      issues.push("Missing dish ID");
    }
    if (!node.description || node.description.length === 0) {
      issues.push("Missing description");
    }
    if (!validCulturalOrigins.has(node.culturalOrigin)) {
      issues.push(`Invalid cultural origin: ${node.culturalOrigin}`);
    }
    if (node.founded !== undefined) {
      if (
        typeof node.founded !== "number" ||
        node.founded < 1800 ||
        node.founded > new Date().getFullYear()
      ) {
        issues.push(`Invalid founded year: ${node.founded}`);
      }
    }
    if (typeof node.reviewCount !== "number" || node.reviewCount < 0) {
      issues.push(`Invalid review count: ${node.reviewCount}`);
    }
    if (typeof node.isGrassroots !== "boolean") {
      issues.push(`Invalid isGrassroots: ${node.isGrassroots}`);
    }
    if (
      typeof node.communityCatchCount !== "number" ||
      node.communityCatchCount < 0
    ) {
      issues.push(
        `Invalid communityCatchCount: ${node.communityCatchCount}`
      );
    }

    // Malaysia-specific coordinate sanity check
    // Malaysia roughly: lat 1-7, lng 100-119
    if (node.lat < 1 || node.lat > 7 || node.lng < 100 || node.lng > 120) {
      issues.push(
        `Coordinates outside Malaysia: (${node.lat}, ${node.lng})`
      );
    }

    if (issues.length > 0) {
      console.log(`  [QualityGate] REJECTED: ${node.name}`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    } else {
      console.log(`  [QualityGate] PASSED: ${node.name} (ID: ${node.id})`);
      passed.push(node);
      seenIds.add(node.id);
    }
  }

  console.log(
    `\n  [QualityGate] ${passed.length}/${nodes.length} nodes passed quality gate.`
  );
  return passed;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log("==============================================");
  console.log("  MakanMate Heritage Stall Curation Pipeline");
  console.log("==============================================");
  console.log(`City: ${city}`);
  console.log(`Stall Type: ${stallType}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Agent 1: Scout
  const candidates = await scoutAgent(city, stallType);
  if (candidates.length === 0) {
    console.error("\nPipeline aborted: Scout found no candidates.");
    process.exit(1);
  }

  // Agent 2: Verifier (with conflict resolution loop)
  const verified = await verifierAgent(candidates, city);

  // Agent 3: Enricher
  const enriched = await enricherAgent(verified, city, stallType);

  // Agent 4: Quality Gate
  const validated = qualityGateAgent(enriched);

  // Output final results as JSON to stdout
  console.log("\n========================================");
  console.log("  PIPELINE COMPLETE");
  console.log("========================================");
  console.log(`Curated ${validated.length} heritage nodes.\n`);

  // Print the valid HeritageNode JSON to stdout
  // Use a marker so it can be piped/parsed separately from logs
  console.log("--- BEGIN HERITAGE_NODES JSON ---");
  console.log(JSON.stringify(validated, null, 2));
  console.log("--- END HERITAGE_NODES JSON ---");
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
