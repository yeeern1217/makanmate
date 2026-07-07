"use client";
import { useAppStore } from "@/store/useAppStore";
import { usePokedexStore } from "@/store/usePokedexStore";
import { getDishesByRegion, getDishStatus } from "@/lib/data/regions";
import DishCard from "@/components/pokedex/DishCard";
import RegionBadge from "@/components/pokedex/RegionBadge";

const regionDishes = getDishesByRegion();

export default function PokedexGridPage() {
  const discoveredNodes = useAppStore((s) => s.discoveredNodes);
  const cookedDishes = usePokedexStore((s) => s.cookedDishes);

  const totalMastered = cookedDishes.length;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-[#1a1a2e]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-[#39ff14]">{"\u{1F4D6}"} Pokedex</h1>
          <span className="text-sm text-gray-400">
            <span className="text-[#ffd700] font-bold">{totalMastered}</span>/12 Mastered
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#0d0d1a]">
          <div
            className="h-full rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700] transition-all duration-500"
            style={{ width: `${(totalMastered / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* Region sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-8">
        {Array.from(regionDishes.entries()).map(([region, dishes]) => (
          <section key={region.id}>
            <RegionBadge
              region={region}
              dishes={dishes}
              discoveredNodes={discoveredNodes}
              cookedDishes={cookedDishes}
            />
            <div className="grid grid-cols-2 gap-3 mt-3">
              {dishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  status={getDishStatus(dish.id, discoveredNodes, cookedDishes)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
