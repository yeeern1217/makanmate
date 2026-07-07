"use client";
import { useRouter } from "next/navigation";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";

export default function ManualDishDropdown() {
  const router = useRouter();

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-400">Or pick a dish manually:</label>
      <select
        onChange={(e) => {
          if (e.target.value) router.push(`/pokedex/${e.target.value}`);
        }}
        defaultValue=""
        className="w-full bg-[#1a1a2e] text-white border border-[#39ff14]/30 rounded-lg px-4 py-3 text-sm focus:border-[#39ff14] focus:outline-none"
      >
        <option value="" disabled>
          Select a dish...
        </option>
        {POKEDEX_ENTRIES.map((dish) => (
          <option key={dish.id} value={dish.id}>
            {dish.name} — {dish.local_script}
          </option>
        ))}
      </select>
    </div>
  );
}
