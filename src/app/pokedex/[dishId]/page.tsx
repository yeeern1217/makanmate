"use client";
import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { usePokedexStore } from "@/store/usePokedexStore";
import { useAppStore } from "@/store/useAppStore";
import { isDishDiscovered } from "@/lib/data/regions";
import { IngredientLore } from "@/types/ai";
import DishMetaCard from "@/components/pokedex/DishMetaCard";
import IngredientLoreOverlay from "@/components/pokedex/IngredientLoreOverlay";
import LoadingPulse from "@/components/ui/LoadingPulse";
import GlowButton from "@/components/ui/GlowButton";

const DishCanvas = dynamic(() => import("@/components/pokedex/DishCanvas"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading 3D scene..." />,
});

const CookingScene = dynamic(() => import("@/components/pokedex/CookingScene"), {
  ssr: false,
  loading: () => <LoadingPulse text="Firing up the wok..." />,
});

export default function PokedexPage() {
  const params = useParams();
  const dishId = params.dishId as string;
  const dish = POKEDEX_ENTRIES.find((d) => d.id === dishId);

  const cookDish = usePokedexStore((s) => s.cookDish);
  const cookedDishes = usePokedexStore((s) => s.cookedDishes);
  const getLore = usePokedexStore((s) => s.getLore);
  const cacheLore = usePokedexStore((s) => s.cacheLore);
  const discoveredNodes = useAppStore((s) => s.discoveredNodes);

  const isCooked = dish ? cookedDishes.includes(dish.id) : false;
  const isDiscovered = dish ? isDishDiscovered(dish.id, discoveredNodes) : false;

  const [mode, setMode] = useState<"browse" | "cook">("browse");
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);
  const [lore, setLore] = useState<IngredientLore | null>(null);
  const [loadingLore, setLoadingLore] = useState(false);

  const handleCookingComplete = useCallback(() => {
    if (dish) {
      cookDish(dish.id);
      setMode("browse");
    }
  }, [dish, cookDish]);

  if (!dish) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">Dish not found</p>
      </div>
    );
  }


  const activeIngredient = dish.ingredients.find((i) => i.id === activeIngredientId) || null;

  const handleIngredientTap = async (ingredientId: string) => {
    if (activeIngredientId === ingredientId) {
      setActiveIngredientId(null);
      setLore(null);
      return;
    }

    setActiveIngredientId(ingredientId);
    setLore(null);

    const cacheKey = `${dishId}:${ingredientId}`;
    const cached = getLore(cacheKey);
    if (cached) {
      setLore(cached);
      return;
    }

    const ingredient = dish.ingredients.find((i) => i.id === ingredientId)!;
    setLoadingLore(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          mode: "lore",
          ingredient: ingredient.name,
          dish: dish.name,
          lore_hint: ingredient.lore_hint,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (data.result) {
        const loreData = data.result as IngredientLore;
        setLore(loreData);
        cacheLore(cacheKey, loreData);
      }
    } catch (err) {
      console.error("Lore fetch error:", err);
    } finally {
      setLoadingLore(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e]/80 backdrop-blur-sm z-10">
        <Link href="/pokedex" className="text-gray-400 hover:text-white">
          ← Pokedex
        </Link>
        <h1 className="text-sm font-bold text-[#39ff14]">
          {mode === "cook" ? "Cooking Mode" : "Pokedex"}
        </h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-3">
        <DishMetaCard dish={dish} />
      </div>

      {/* Mode toggle */}
      {mode === "browse" && (
        <div className="flex items-center justify-center gap-3 px-4 pb-3">
          <button
            onClick={() => setMode("cook")}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#ff6600] to-[#ff4500] px-4 py-2 text-sm font-bold text-white shadow-[0_0_15px_#ff660044] transition-all hover:shadow-[0_0_25px_#ff660088] active:scale-95"
          >
            🔥 {isCooked ? "Cook Again" : "Cook This Dish"}
          </button>
          {isCooked && (
            <span className="text-xs text-[#ffd700] font-bold">✓ Mastered</span>
          )}
        </div>
      )}

      {mode === "cook" && (
        <div className="flex items-center justify-center px-4 pb-2">
          <button
            onClick={() => setMode("browse")}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            ← Back to browse
          </button>
        </div>
      )}

      {mode === "browse" && (
        <p className="text-center text-xs text-gray-500 mb-2">
          Tap an ingredient to discover its story
        </p>
      )}

      {/* 3D Canvas */}
      <div className="relative flex-1">
        {mode === "cook" ? (
          <CookingScene dish={dish} onComplete={handleCookingComplete} />
        ) : (
          <DishCanvas
            dish={dish}
            onIngredientTap={handleIngredientTap}
            activeIngredientId={activeIngredientId}
          />
        )}

        {mode === "browse" && activeIngredient && (
          <IngredientLoreOverlay
            ingredient={activeIngredient}
            lore={lore}
            loading={loadingLore}
            onClose={() => {
              setActiveIngredientId(null);
              setLore(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
