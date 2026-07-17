import { NextRequest, NextResponse } from "next/server";
import { getVoiceId } from "@/lib/voice/voices";

export async function POST(req: NextRequest) {
  const { text, persona } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  const voiceId = getVoiceId(persona);
  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.7 },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "TTS upstream failed" }, { status: 502 });
  }

  return new NextResponse(upstream.body as unknown as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
