const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_DEFAULT || "21m00Tcm4TlvDq8ikWAM";

const PERSONA_VOICES: Record<string, string | undefined> = {
  "uncle-lim": process.env.ELEVENLABS_VOICE_UNCLE_LIM,
  "auntie-kamala": process.env.ELEVENLABS_VOICE_AUNTIE_KAMALA,
  "ah-kong": process.env.ELEVENLABS_VOICE_AH_KONG,
};

export function getVoiceId(persona?: string): string {
  if (persona && PERSONA_VOICES[persona]) return PERSONA_VOICES[persona] as string;
  return DEFAULT_VOICE;
}
