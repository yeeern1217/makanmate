"use client";
import Link from "next/link";
import GlowButton from "@/components/ui/GlowButton";
import { useAppStore } from "@/store/useAppStore";
import { usePokedexStore } from "@/store/usePokedexStore";
import { REGIONS, getDishesByRegion, isDishDiscovered } from "@/lib/data/regions";

const regionDishes = getDishesByRegion();

export default function Home() {
  const discoveredNodes = useAppStore((s) => s.discoveredNodes);
  const cookedDishes = usePokedexStore((s) => s.cookedDishes);
  const totalMastered = cookedDishes.length;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6">
      {/* Animated blob background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#39ff14]/10 blur-3xl" />
        <div className="animate-blob absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#39ff14]/5 blur-3xl [animation-delay:2s]" />
        <div className="animate-blob absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd700]/5 blur-3xl [animation-delay:4s]" />
      </div>

      <h1 className="neon-text mb-4 text-5xl font-black tracking-tight sm:text-7xl">
        MakanMate
      </h1>

      <p className="mb-6 max-w-md text-center text-lg text-gray-400">
        Hunt. Cook. Discover Malaysian Heritage Food.
      </p>

      {/* Overall mastered bar */}
      <div className="mb-4 w-full max-w-xs">
        <div className="mb-2 flex justify-between text-sm text-gray-400">
          <span>Dishes Mastered</span>
          <span className="text-[#ffd700] font-bold">{totalMastered}/12</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#1a1a2e]">
          <div
            className="h-full rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700] transition-all duration-500"
            style={{ width: `${(totalMastered / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* Per-region breakdown */}
      <div className="mb-6 w-full max-w-xs space-y-2">
        {REGIONS.map((region) => {
          const dishes = regionDishes.get(region) ?? [];
          const found = dishes.filter((d) => isDishDiscovered(d.id, discoveredNodes)).length;
          const mastered = dishes.filter((d) => cookedDishes.includes(d.id)).length;
          const total = dishes.length;
          const allMastered = mastered === total;

          return (
            <div key={region.id} className="flex items-center gap-2 text-xs">
              <span className="text-base">{region.emoji}</span>
              <span className="text-gray-400 w-14">{region.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#1a1a2e]">
                <div
                  className="h-full rounded-full bg-[#ffd700] transition-all duration-500"
                  style={{ width: `${(mastered / total) * 100}%` }}
                />
              </div>
              <span className="text-gray-500 w-12 text-right">
                <span className={mastered > 0 ? "text-[#ffd700] font-bold" : ""}>{mastered}</span>/{total}
              </span>
              {allMastered && <span className="text-xs">{"\u{1F3C6}"}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <GlowButton href="/radar">Start the Hunt</GlowButton>
        <Link
          href="/pokedex"
          className="text-sm text-gray-400 hover:text-[#39ff14] transition-colors underline underline-offset-2"
        >
          View Pokedex
        </Link>
      </div>
    </div>
  );
}
