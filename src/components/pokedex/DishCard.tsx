"use client";
import Link from "next/link";
import { DishEntry } from "@/types/heritage";

type DishStatus = "locked" | "discovered" | "mastered";

export default function DishCard({ dish, status }: { dish: DishEntry; status: DishStatus }) {
  const content = (
    <div
      className={`relative flex flex-col items-center justify-center rounded-xl p-4 aspect-square transition-all ${
        status === "locked"
          ? "bg-[#1a1a2e]/60 opacity-50"
          : status === "discovered"
            ? "bg-[#1a1a2e] border border-[#39ff14]/30 animate-pulse-glow"
            : "bg-[#1a1a2e] border border-[#ffd700]/50 shadow-[0_0_15px_#ffd70033]"
      }`}
    >
      {status === "locked" && (
        <span className="absolute top-2 right-2 text-xs opacity-60">{"\u{1F512}"}</span>
      )}

      <span
        className={`text-4xl mb-2 ${
          status === "locked"
            ? "grayscale brightness-[0.3] filter"
            : status === "discovered"
              ? "opacity-70"
              : ""
        }`}
        style={
          status === "mastered"
            ? { filter: "drop-shadow(0 0 10px rgba(255,215,0,0.5))" }
            : undefined
        }
      >
        {dish.emoji}
      </span>

      <span
        className={`text-xs text-center font-medium leading-tight ${
          status === "locked"
            ? "text-gray-600"
            : status === "discovered"
              ? "text-gray-300"
              : "text-white font-bold"
        }`}
      >
        {status === "locked" ? "???" : dish.name}
      </span>

      {status === "mastered" && (
        <span className="mt-1.5 rounded-full bg-[#ffd700]/20 px-2 py-0.5 text-[10px] font-bold text-[#ffd700]">
          Mastered
        </span>
      )}
    </div>
  );

  return <Link href={`/pokedex/${dish.id}`}>{content}</Link>;
}
