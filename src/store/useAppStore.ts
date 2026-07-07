import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GPSPosition, MenuResult } from "@/types/ai";

interface AppState {
  gpsPosition: GPSPosition | null;
  setGpsPosition: (pos: GPSPosition) => void;
  discoveredNodes: string[];
  addDiscoveredNode: (id: string) => void;
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;
  scanResult: MenuResult | null;
  setScanResult: (r: MenuResult | null) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      gpsPosition: null,
      setGpsPosition: (pos) => set({ gpsPosition: pos }),
      discoveredNodes: [],
      addDiscoveredNode: (id) => {
        const current = get().discoveredNodes;
        if (!current.includes(id)) {
          set({ discoveredNodes: [...current, id] });
        }
      },
      isScanning: false,
      setIsScanning: (v) => set({ isScanning: v }),
      scanResult: null,
      setScanResult: (r) => set({ scanResult: r }),
      activeNodeId: null,
      setActiveNodeId: (id) => set({ activeNodeId: id }),
    }),
    {
      name: "makanmate-app",
      partialize: (state) => ({ discoveredNodes: state.discoveredNodes }),
    }
  )
);
