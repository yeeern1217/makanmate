"use client";
import { IngredientLore } from "@/types/ai";
import { IngredientNode } from "@/types/heritage";

export default function IngredientLoreOverlay({
  ingredient,
  lore,
  loading,
  onClose,
}: {
  ingredient: IngredientNode;
  lore: IngredientLore | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-sm rounded-t-2xl p-5 animate-slide-up z-10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg">{ingredient.name}</h3>
          <p className="text-sm text-gray-400">{ingredient.local_name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="w-4 h-4 rounded-full border-2 border-[#39ff14]/30 border-t-[#39ff14] animate-spin" />
          <span className="text-sm text-gray-400">Discovering lore...</span>
        </div>
      ) : lore ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">{lore.lore_text}</p>
          <div className="bg-[#252540] rounded-lg px-4 py-3">
            <p className="text-sm text-[#ffd700] font-bold mb-1">Fun Fact</p>
            <p className="text-sm text-gray-300">{lore.fun_fact}</p>
          </div>
          <p className="text-xs text-gray-500">Origin: {lore.origin_region}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Could not load lore. Try again.</p>
      )}
    </div>
  );
}
