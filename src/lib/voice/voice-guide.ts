"use client";

let currentAudio: HTMLAudioElement | null = null;
let currentText = "";
let currentPersona: string | undefined;

async function playViaElevenLabs(text: string, persona?: string): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    stopSpeaking();
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    await audio.play().catch(() => {});
  } catch {
    // network/decode error — silently drop
  }
}

export function speak(text: string, persona?: string): void {
  if (typeof window === "undefined") return;
  if (text === currentText && persona === currentPersona) return;
  currentText = text;
  currentPersona = persona;
  void playViaElevenLabs(text, persona);
}

export function narrateStory(text: string, persona?: string): void {
  if (typeof window === "undefined") return;
  currentText = text;
  currentPersona = persona;
  void playViaElevenLabs(text, persona);
}

export function stopSpeaking(): void {
  if (typeof window === "undefined") return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  currentText = "";
  currentPersona = undefined;
}
