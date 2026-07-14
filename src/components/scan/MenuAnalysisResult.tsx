"use client";
import Link from "next/link";
import { ParsedDish } from "@/types/ai";

export default function MenuAnalysisResult({ dishes }: { dishes: ParsedDish[] }) {
  if (dishes.length === 0) {
    return <p className="text-[var(--text-muted)] text-sm text-center py-4">No dishes detected</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[var(--accent-primary)]">Dishes Found</h3>
      {dishes.map((dish, i) => (
        <div key={i} className="flex items-center justify-between retro-card px-4 py-3">
          <div>
            <p className="font-medium">
              {dish.english_name}
              {dish.is_signature && (
                <span className="ml-2 text-xs bg-[var(--accent-secondary)] text-[var(--foreground)] px-2 py-0.5 rounded-full">
                  Signature
                </span>
              )}
            </p>
            <p className="text-sm text-[var(--text-muted)]">{dish.local_name}</p>
            {dish.decoded_shorthand && (
              <p className="text-xs text-[var(--text-muted)]">{dish.raw_text} → {dish.decoded_shorthand}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {dish.price && <span className="text-sm text-[var(--text-muted)]">{dish.price}</span>}
            {dish.dish_id && (
              <Link
                href={`/pokedex/${dish.dish_id}`}
                className="text-xs text-[var(--accent-primary)] underline underline-offset-2"
              >
                View →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
