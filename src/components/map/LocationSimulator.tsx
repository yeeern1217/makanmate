"use client";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { useAppStore } from "@/store/useAppStore";

export default function LocationSimulator() {
  const simulatedPosition = useAppStore((s) => s.simulatedPosition);
  const setSimulatedPosition = useAppStore((s) => s.setSimulatedPosition);

  const selected = simulatedPosition
    ? HERITAGE_NODES.find(
        (n) => Math.abs(n.lat - simulatedPosition.lat) < 1e-6 && Math.abs(n.lng - simulatedPosition.lng) < 1e-6
      )?.id ?? "__custom"
    : "";

  return (
    <div className="bg-[var(--surface)] border-b-2 border-[var(--border)] px-4 py-2 flex items-center gap-2">
      <span className="text-[10px] font-bold text-[var(--accent-secondary)] uppercase tracking-wide whitespace-nowrap">
        Simulate
      </span>
      <select
        value={selected}
        onChange={(e) => {
          if (e.target.value === "") {
            setSimulatedPosition(null);
            return;
          }
          const node = HERITAGE_NODES.find((n) => n.id === e.target.value);
          if (node) {
            setSimulatedPosition({ lat: node.lat, lng: node.lng, accuracy: 10 });
          }
        }}
        className="flex-1 min-w-0 bg-[var(--surface-dark)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
      >
        <option value="">Use real GPS</option>
        {HERITAGE_NODES.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name} ({n.city}) — {n.lat.toFixed(4)}, {n.lng.toFixed(4)}
          </option>
        ))}
      </select>
    </div>
  );
}
