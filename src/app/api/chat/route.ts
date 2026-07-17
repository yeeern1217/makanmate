import { generateText, tool, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextRequest, NextResponse } from "next/server";
import {
  parseMenuSchema, validateLocationSchema, getIngredientLoreSchema,
 magicLensSchema, migrationStorySchema, trailNarrativeSchema,
} from "@/lib/ai/tools";
import {
  SYSTEM_PROMPT_MENU_VISION, SYSTEM_PROMPT_INGREDIENT_LORE,
  SYSTEM_PROMPT_MAGIC_LENS, SYSTEM_PROMPT_MIGRATION, SYSTEM_PROMPT_TRAIL_NARRATIVE,
} from "@/lib/ai/prompts";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { searchExa, formatExaContext } from "@/lib/ai/exa";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
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

export async function POST(req: NextRequest) {
  const { image, lat, lng, mode, ingredient, dish, lore_hint, stalls, migrationHint } = await req.json();

  if (mode === "lore") {
    const exaResults = await searchExa(`${ingredient} in ${dish} Malaysian food history origin`);
    const grounding = formatExaContext(exaResults);
    const userContent = grounding
      ? `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}\n\nUse these verified web sources to ground your answer (cite by number):\n${grounding}`
      : `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}`;

    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL_ID || "gpt-4o-mini"),
      system: SYSTEM_PROMPT_INGREDIENT_LORE,
      messages: [{ role: "user", content: userContent }],
      tools: {
        getIngredientLore: tool({ description: "Generate cultural storytelling for an ingredient", inputSchema: getIngredientLoreSchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({
      toolName: "getIngredientLore",
      result: extractToolInput(result, "getIngredientLore"),
      sources: exaResults.map((s) => ({ title: s.title, url: s.url })),
    });
  }

  if (mode === "magic-lens") {
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL_ID || "gpt-4o-mini"),
      system: SYSTEM_PROMPT_MAGIC_LENS,
      messages: [{
        role: "user",
        content: [
          { type: "image" as const, image: `data:image/jpeg;base64,${image}` },
          { type: "text" as const, text: "Analyze this hawker menu. Provide translations, allergens, halal status, and approximate positions for each item." },
        ],
      }],
      tools: {
        magicLens: tool({ description: "Extract positioned menu items with allergen/halal info", inputSchema: magicLensSchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({ toolName: "magicLens", result: extractToolInput(result, "magicLens") });
  }

  if (mode === "migration") {
    const exaResults = await searchExa(`${migrationHint} migration history to Malaysia`);
    const grounding = formatExaContext(exaResults);
    const userContent = grounding
      ? `Tell the migration story: ${migrationHint}\n\nUse these verified web sources to ground your narrative (cite by number):\n${grounding}`
      : `Tell the migration story: ${migrationHint}`;

    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL_ID || "gpt-4o-mini"),
      system: SYSTEM_PROMPT_MIGRATION,
      messages: [{ role: "user", content: userContent }],
      tools: {
        migrationStory: tool({ description: "Generate migration story", inputSchema: migrationStorySchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({
      toolName: "migrationStory",
      result: extractToolInput(result, "migrationStory"),
      sources: exaResults.map((s) => ({ title: s.title, url: s.url })),
    });
  }

  if (mode === "trail-narrative") {
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL_ID || "gpt-4o-mini"),
      system: SYSTEM_PROMPT_TRAIL_NARRATIVE,
      messages: [{ role: "user", content: `Generate a heritage trail narrative for these stalls: ${stalls}` }],
      tools: {
        trailNarrative: tool({ description: "Generate trail narrative", inputSchema: trailNarrativeSchema }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });
    return NextResponse.json({ toolName: "trailNarrative", result: extractToolInput(result, "trailNarrative") });
  }

  // Default: vision mode
  const menuTools = {
    parseMenu: tool({ description: "Extract dishes from hawker menu image", inputSchema: parseMenuSchema }),
  };

  let locationResult = null;
  if (lat && lng) {
    let nearestNode = null;
    let minDist = Infinity;
    for (const node of HERITAGE_NODES) {
      const dist = haversineDistance(lat, lng, node.lat, node.lng);
      if (dist < minDist) { minDist = dist; nearestNode = node; }
    }
    locationResult = {
      nearest_node_id: nearestNode && minDist < 500 ? nearestNode.id : null,
      nearest_node_name: nearestNode && minDist < 500 ? nearestNode.name : null,
      distance_meters: nearestNode ? Math.round(minDist) : null,
      is_at_heritage_site: minDist < 200,
      city: nearestNode && minDist < 500 ? nearestNode.city : null,
    };
  }

  const result = await generateText({
    model: openai(process.env.OPENAI_MODEL_ID || "gpt-4o-mini"),
    system: SYSTEM_PROMPT_MENU_VISION,
    messages: [{
      role: "user",
      content: [
        ...(image ? [{ type: "image" as const, image: `data:image/jpeg;base64,${image}` }] : []),
        { type: "text" as const, text: `Analyze this Malaysian hawker menu.${lat && lng ? ` User GPS: ${lat}, ${lng}` : ""}` },
      ],
    }],
    tools: menuTools,
    stopWhen: isStepCount(3),
  });

  return NextResponse.json({
    menu: extractToolInput(result, "parseMenu"),
    location: locationResult,
  });
}
