"use client";
import { Region } from "@/lib/data/regions";
import { DishEntry } from "@/types/heritage";
import { isDishDiscovered } from "@/lib/data/regions";

export default function RegionBadge({
  region,
  dishes,
  discoveredNodes,
  cookedDishes,
}: {
  region: Region;
  dishes: DishEntry[];
  discoveredNodes: string[];
  cookedDishes: string[];
}) {
  const discoveredCount = dishes.filter((d) =>
    isDishDiscovered(d.id, discoveredNodes)
  ).length;
  const masteredCount = dishes.filter((d) =>
    cookedDishes.includes(d.id)
  ).length;
  const total = dishes.length;
  const allMastered = masteredCount === total;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{region.emoji}</span>
          <span className="text-sm font-bold text-white">{region.name}</span>
          {allMastered && (
            <span className="animate-badge-shine rounded-full bg-gradient-to-r from-[#ffd700] via-[#fff4b0] to-[#ffd700] bg-[length:200%_100%] px-2 py-0.5 text-[10px] font-black text-black">
              {"\u{1F3C6}"} Master
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-gray-400">
            <span className="text-[#39ff14] font-bold">{discoveredCount}</span>/{total} found
          </span>
          <span className="text-gray-400">
            <span className="text-[#ffd700] font-bold">{masteredCount}</span>/{total} mastered
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-[#0d0d1a]">
        <div
          className="h-full rounded-full bg-[#ffd700] shadow-[0_0_6px_#ffd700] transition-all duration-500"
          style={{ width: `${(masteredCount / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
