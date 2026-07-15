"use client";
import { DishEntry } from "@/types/heritage";

export default function DishMetaCard({ dish }: { dish: DishEntry }) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{dish.name}</h1>
          <p className="text-lg text-gray-400">{dish.local_script}</p>
          <p className="text-sm text-gray-500 mt-1">{dish.origin_state}</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black text-[#39ff14]">{dish.heritage_score}</div>
          <div className="text-xs text-gray-500">Heritage</div>
        </div>
      </div>
      <p className="text-sm text-gray-400 mt-3 italic">{dish.fun_fact}</p>
    </div>
  );
}
