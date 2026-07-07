import { generateText, tool, isStepCount } from "ai";
import { google } from "@ai-sdk/google";
import { NextRequest, NextResponse } from "next/server";
import { parseMenuSchema, validateLocationSchema, getIngredientLoreSchema } from "@/lib/ai/tools";
import { SYSTEM_PROMPT_MENU_VISION, SYSTEM_PROMPT_INGREDIENT_LORE } from "@/lib/ai/prompts";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const { image, lat, lng, mode, ingredient, dish, lore_hint } = await req.json();

  if (mode === "lore") {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      system: SYSTEM_PROMPT_INGREDIENT_LORE,
      messages: [{ role: "user", content: `Tell me the cultural story of "${ingredient}" in "${dish}". Focus on: ${lore_hint}` }],
      tools: {
        getIngredientLore: tool({
          description: "Generate cultural storytelling for an ingredient",
          inputSchema: getIngredientLoreSchema,
        }),
      },
      toolChoice: "required" as const,
      stopWhen: isStepCount(2),
    });

    const loreCall = result.steps
      .flatMap((s) => s.toolCalls)
      .find((tc) => tc.toolName === "getIngredientLore");

    return NextResponse.json({
      toolName: "getIngredientLore",
      result: loreCall ? (loreCall as unknown as { input: Record<string, unknown> }).input : null,
    });
  }

  const menuTools = {
    parseMenu: tool({
      description: "Extract dishes from hawker menu image",
      inputSchema: parseMenuSchema,
    }),
  };

  let locationResult = null;
  if (lat && lng) {
    let nearestNode = null;
    let minDist = Infinity;
    for (const node of HERITAGE_NODES) {
      const dist = haversineDistance(lat, lng, node.lat, node.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestNode = node;
      }
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
    model: google("gemini-2.5-flash"),
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

  const menuCall = result.steps
    .flatMap((s) => s.toolCalls)
    .find((tc) => tc.toolName === "parseMenu");

  return NextResponse.json({
    menu: menuCall ? (menuCall as unknown as { input: Record<string, unknown> }).input : null,
    location: locationResult,
  });
}
