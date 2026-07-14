"use client";

interface LensItem {
  raw_text: string;
  english_name: string;
  local_name: string;
  price?: string;
  allergens: string[];
  halal_status: "halal" | "non-halal" | "unknown";
  bounding_box: { x: number; y: number; width: number; height: number };
}

const ALLERGEN_EMOJI: Record<string, string> = {
  shellfish: "🦐",
  peanut: "🥜",
  gluten: "🌾",
  dairy: "🥛",
  egg: "🥚",
  soy: "🫘",
  fish: "🐟",
  sesame: "🌰",
};

export default function MagicLensOverlay({ items }: { items: LensItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {items.map((item, i) => (
        <div
          key={i}
          className="absolute pointer-events-auto"
          style={{
            left: `${item.bounding_box.x}%`,
            top: `${item.bounding_box.y}%`,
            maxWidth: "60%",
          }}
        >
          <div className="bg-[var(--surface)]/90 backdrop-blur-sm border-2 border-[var(--border)] rounded-lg px-3 py-2 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--foreground)]">
                {item.english_name}
              </span>
              {item.halal_status === "halal" && (
                <span className="text-green-600 text-xs font-bold">HALAL</span>
              )}
              {item.halal_status === "non-halal" && (
                <span className="text-red-500 text-xs font-bold">NON-HALAL</span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{item.local_name}</p>
            {item.price && (
              <p className="text-xs font-semibold text-[var(--accent-secondary)]">{item.price}</p>
            )}
            {item.allergens.length > 0 && (
              <div className="flex gap-1 mt-1">
                {item.allergens.map((a) => (
                  <span key={a} className="text-xs" title={a}>
                    {ALLERGEN_EMOJI[a] ?? "⚠️"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
