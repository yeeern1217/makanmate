export interface ExaResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchExa(query: string, numResults = 3): Promise<ExaResult[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults,
        contents: { text: { maxCharacters: 600 } },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: { title?: string; url?: string; text?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: (r.text ?? "").slice(0, 600),
    }));
  } catch {
    return [];
  }
}

export function formatExaContext(results: ExaResult[]): string {
  if (results.length === 0) return "";
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
    .join("\n\n");
}
