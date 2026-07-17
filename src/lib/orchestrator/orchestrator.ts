import { generateText, tool, isStepCount } from "ai";
import { google } from "@ai-sdk/google";
import {
  parseMenuSchema,
  livenessCheckSchema,
  getIngredientLoreSchema,
  magicLensSchema,
  migrationStorySchema,
  trailNarrativeSchema,
  phraseRecommendationSchema,
} from "@/lib/ai/tools";
import {
  SYSTEM_PROMPT_MENU_VISION,
  SYSTEM_PROMPT_INGREDIENT_LORE,
  SYSTEM_PROMPT_LIVENESS,
  SYSTEM_PROMPT_MAGIC_LENS,
  SYSTEM_PROMPT_MIGRATION,
  SYSTEM_PROMPT_TRAIL_NARRATIVE,
  SYSTEM_PROMPT_LIVENESS_TEST,
  SYSTEM_PROMPT_PHRASE_RECOMMENDATION,
} from "@/lib/ai/prompts";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { searchTavily } from "@/lib/search/tavily";
import type { AgentResult } from "./types";

const getModel = () =>
  google(process.env.GOOGLE_MODEL_ID || "gemini-3.1-flash-lite");

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ToolCallLike = {
  toolName: string;
  input: unknown;
};

type StepLike = {
  toolCalls?: ToolCallLike[];
};

function extractToolInput(result: { steps: StepLike[] }, toolName: string) {
  const call = result.steps
    .flatMap((step) => step.toolCalls ?? [])
    .find((toolCall) => toolCall.toolName === toolName);
  return call ? call.input : null;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleLivenessTest(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { image } = body;
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_LIVENESS_TEST,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image" as const,
            image: `data:image/jpeg;base64,${image}`,
          },
          { type: "text" as const, text: "Is this a picture of a person?" },
        ],
      },
    ],
    tools: {
      livenessCheck: tool({
        description: "Report person-liveness detection result",
        inputSchema: livenessCheckSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "liveness-test",
    result: extractToolInput(result, "livenessCheck") ?? {
      isReal: true,
      confidence: 0.5,
      reason: "Unable to determine",
    },
    durationMs: Date.now() - start,
  };
}

async function handleLiveness(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { image } = body;
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_LIVENESS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image" as const,
            image: `data:image/jpeg;base64,${image}`,
          },
          {
            type: "text" as const,
            text: "Is this a real in-person photo of a food stall, or a screenshot/photo-of-screen?",
          },
        ],
      },
    ],
    tools: {
      livenessCheck: tool({
        description: "Report liveness detection result",
        inputSchema: livenessCheckSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "liveness",
    result: extractToolInput(result, "livenessCheck") ?? {
      isReal: true,
      confidence: 0.5,
      reason: "Unable to determine",
    },
    durationMs: Date.now() - start,
  };
}

async function handleLore(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { ingredient, dish, lore_hint = "" } = body;

  if (
    !ingredient ||
    typeof ingredient !== "string" ||
    !dish ||
    typeof dish !== "string"
  ) {
    return {
      action: "lore",
      result: { error: "ingredient and dish are required for lore mode" },
      durationMs: Date.now() - start,
    };
  }

  // Step 1: Search for real web context
  const searchResults = await searchTavily(
    `${ingredient} ${dish} Malaysian food culture history origin`
  );

  // Step 2: Build user message with or without search context
  let userMessage = `Tell me the cultural story of "${ingredient}" in "${dish}".${lore_hint ? ` Focus on: ${lore_hint}` : ""}`;
  let fallbackUsed = false;

  if (searchResults.length > 0) {
    const searchContext = searchResults
      .map((r, i) => `[Source ${i + 1}: ${r.title}]\n${r.content}`)
      .join("\n\n");
    userMessage = `Here are web search results about this ingredient:\n\n${searchContext}\n\n---\n\nUsing the search results above as your primary source, tell me the cultural story of "${ingredient}" in "${dish}".${lore_hint ? ` Focus on: ${lore_hint}` : ""}`;
  } else {
    fallbackUsed = true;
  }

  // Step 3: Gemini synthesis
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_INGREDIENT_LORE,
    messages: [{ role: "user", content: userMessage }],
    tools: {
      getIngredientLore: tool({
        description: "Generate cultural storytelling for an ingredient",
        inputSchema: getIngredientLoreSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "lore",
    result: extractToolInput(result, "getIngredientLore"),
    durationMs: Date.now() - start,
    fallbackUsed,
  };
}

async function handleMagicLens(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { image } = body;
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_MAGIC_LENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image" as const,
            image: `data:image/jpeg;base64,${image}`,
          },
          {
            type: "text" as const,
            text: "Analyze this hawker menu. Provide translations, allergens, halal status, and approximate positions for each item.",
          },
        ],
      },
    ],
    tools: {
      magicLens: tool({
        description:
          "Extract positioned menu items with allergen/halal info",
        inputSchema: magicLensSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "magic-lens",
    result: extractToolInput(result, "magicLens"),
    durationMs: Date.now() - start,
  };
}

async function handleMigration(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { migrationHint } = body;
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_MIGRATION,
    messages: [
      {
        role: "user",
        content: `Tell the migration story: ${migrationHint}`,
      },
    ],
    tools: {
      migrationStory: tool({
        description: "Generate migration story",
        inputSchema: migrationStorySchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "migration",
    result: extractToolInput(result, "migrationStory"),
    durationMs: Date.now() - start,
  };
}

async function handleTrailNarrative(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { stalls } = body;
  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_TRAIL_NARRATIVE,
    messages: [
      {
        role: "user",
        content: `Generate a heritage trail narrative for these stalls: ${stalls}`,
      },
    ],
    tools: {
      trailNarrative: tool({
        description: "Generate trail narrative",
        inputSchema: trailNarrativeSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "trail-narrative",
    result: extractToolInput(result, "trailNarrative"),
    durationMs: Date.now() - start,
  };
}

async function handlePhraseRecommendation(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { stallName, dishName, reasoning } = body;

  if (
    typeof stallName !== "string" ||
    stallName.length > 200 ||
    typeof dishName !== "string" ||
    dishName.length > 200 ||
    !Array.isArray(reasoning)
  ) {
    return {
      action: "phrase-recommendation",
      result: { error: "Invalid input" },
      durationMs: Date.now() - start,
    };
  }

  const safeReasoning = (reasoning as unknown[]).filter((r): r is string => typeof r === "string").map(r => r.slice(0, 300));

  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_PHRASE_RECOMMENDATION,
    messages: [
      {
        role: "user",
        content: `Recommend "${stallName}" (signature dish: ${dishName}). Reasoning: ${safeReasoning.join("; ")}`,
      },
    ],
    tools: {
      phraseRecommendation: tool({
        description: "Generate a natural-language recommendation suggestion",
        inputSchema: phraseRecommendationSchema,
      }),
    },
    toolChoice: "required" as const,
    stopWhen: isStepCount(2),
  });

  return {
    action: "phrase-recommendation",
    result: extractToolInput(result, "phraseRecommendation"),
    durationMs: Date.now() - start,
  };
}

async function handleVision(
  body: Record<string, unknown>,
  start: number
): Promise<AgentResult> {
  const { image, lat, lng } = body;

  let locationResult = null;
  if (lat != null && lng != null) {
    let nearestNode = null;
    let minDist = Infinity;
    for (const node of HERITAGE_NODES) {
      const dist = haversineDistance(
        lat as number,
        lng as number,
        node.lat,
        node.lng
      );
      if (dist < minDist) {
        minDist = dist;
        nearestNode = node;
      }
    }
    locationResult = {
      nearest_node_id:
        nearestNode && minDist < 500 ? nearestNode.id : null,
      nearest_node_name:
        nearestNode && minDist < 500 ? nearestNode.name : null,
      distance_meters: nearestNode ? Math.round(minDist) : null,
      is_at_heritage_site: minDist < 200,
      city: nearestNode && minDist < 500 ? nearestNode.city : null,
    };
  }

  const result = await generateText({
    model: getModel(),
    system: SYSTEM_PROMPT_MENU_VISION,
    messages: [
      {
        role: "user",
        content: [
          ...(image
            ? [
                {
                  type: "image" as const,
                  image: `data:image/jpeg;base64,${image}`,
                },
              ]
            : []),
          {
            type: "text" as const,
            text: `Analyze this Malaysian hawker menu.${lat && lng ? ` User GPS: ${lat}, ${lng}` : ""}`,
          },
        ],
      },
    ],
    tools: {
      parseMenu: tool({
        description: "Extract dishes from hawker menu image",
        inputSchema: parseMenuSchema,
      }),
    },
    stopWhen: isStepCount(3),
  });

  return {
    action: "vision",
    result: {
      menu: extractToolInput(result, "parseMenu"),
      location: locationResult,
    },
    durationMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function orchestrate(
  body: Record<string, unknown>
): Promise<AgentResult> {
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
      action: (mode as string) ?? "unknown",
      result: null,
      durationMs: Date.now() - start,
      fallbackUsed: true,
      error: true,
    };
  }
}
