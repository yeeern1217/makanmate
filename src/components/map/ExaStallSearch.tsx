"use client";
import { useState } from "react";
import type { ExaStall } from "@/app/api/search/route";
import LoadingPulse from "@/components/ui/LoadingPulse";

export default function ExaStallSearch() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Penang");
  const [stalls, setStalls] = useState<ExaStall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setStalls([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, city }),
      });
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      setStalls(data.stalls ?? []);
    } catch {
      setError("Search failed — check that EXA_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 bg-[var(--surface)] border-b-2 border-[var(--border)]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]/70">
            Live Web Search
          </p>
          <h1 className="text-2xl font-black leading-tight text-[var(--foreground)]">Discover Stalls</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Powered by Exa — find real hawker stalls from across the web.
          </p>
        </div>
      </div>

      <form onSubmit={runSearch} className="flex gap-2 px-4 py-3 bg-[var(--surface)] border-b-2 border-[var(--border)]">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="bg-[var(--surface-dark)] border border-[var(--border)] rounded-lg px-2 py-2 text-sm focus:outline-none"
        >
          <option>Penang</option>
          <option>KL</option>
          <option>Ipoh</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. char kuey teow, assam laksa..."
          className="flex-1 min-w-0 bg-[var(--surface-dark)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-bold disabled:opacity-40"
        >
          Search
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && <LoadingPulse text="Searching the web..." />}
        {error && <p className="text-sm text-[var(--accent-primary)] text-center">{error}</p>}
        {!loading && !error && stalls.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center pt-8">
            Search for a dish or stall to discover real spots.
          </p>
        )}
        {stalls.map((s, i) => (
          <div key={i} className="retro-card p-4 space-y-2">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-bold text-sm text-[var(--accent-primary)] underline underline-offset-2"
            >
              {s.title}
            </a>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">{s.snippet}</p>
            <a
              href={s.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30"
            >
              🧭 Navigate in Google Maps
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
