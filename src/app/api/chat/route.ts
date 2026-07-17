import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/orchestrator/orchestrator";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await orchestrate(body);
  console.log(
    `[api/chat] mode=${result.action} duration=${result.durationMs}ms fallback=${result.fallbackUsed ?? false}`
  );
  return NextResponse.json(result);
}
