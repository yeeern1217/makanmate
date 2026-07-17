export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function searchTavily(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, skipping web search");
    return [];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: "basic",
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`Tavily API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return (data.results ?? []).map((r: { title: string; url: string; content: string; score: number }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }));
  } catch (err) {
    clearTimeout(timer);
    console.warn("Tavily search error:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
