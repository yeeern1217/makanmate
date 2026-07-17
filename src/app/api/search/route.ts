import { NextRequest, NextResponse } from "next/server";
import { searchExa } from "@/lib/ai/exa";

export interface ExaStall {
  title: string;
  url: string;
  snippet: string;
  mapsUrl: string;
}

export async function POST(req: NextRequest) {
  const { query, city } = await req.json();
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return NextResponse.json({ stalls: [] });

  const place = city || "Malaysia";
  const results = await searchExa(`best ${q} hawker street food stalls in ${place} Malaysia`, 8);

  const stalls: ExaStall[] = results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.title} ${place}`)}`,
  }));

  return NextResponse.json({ stalls });
}
