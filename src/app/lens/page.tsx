"use client";
import { useCallback, useRef, useState } from "react";
import { captureFrameAsBase64 } from "@/lib/camera";
import CameraViewport from "@/components/scan/CameraViewport";
import MagicLensOverlay from "@/components/lens/MagicLensOverlay";
import LoadingPulse from "@/components/ui/LoadingPulse";

interface LensItem {
  raw_text: string;
  english_name: string;
  local_name: string;
  price?: string;
  allergens: string[];
  halal_status: "halal" | "non-halal" | "unknown";
  bounding_box: { x: number; y: number; width: number; height: number };
}

export default function LensPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<LensItem[]>([]);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);

  const onCameraStream = useCallback(() => setCameraReady(true), []);
  const onCameraError = useCallback(() => setCameraError(true), []);

  const handleScan = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);

    const image = captureFrameAsBase64(videoRef.current);
    setFrozenFrame(`data:image/jpeg;base64,${image}`);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, mode: "magic-lens" }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.result?.items) {
        setItems(data.result.items);
      }
    } catch (err) {
      console.error("Magic Lens error:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleClear = () => {
    setItems([]);
    setFrozenFrame(null);
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <h1 className="text-sm font-bold text-[var(--accent-primary)]">Magic Lens</h1>
        <span className="text-xs text-[var(--text-muted)]">Point at a menu</span>
      </div>

      {!cameraError ? (
        <div className="relative flex-1 bg-[var(--surface-dark)]">
          {/* Show frozen frame when analyzing, live feed otherwise */}
          {frozenFrame ? (
            <img src={frozenFrame} alt="Captured menu" className="w-full h-full object-cover" />
          ) : (
            <CameraViewport
              videoRef={videoRef}
              onStream={onCameraStream}
              onError={onCameraError}
            />
          )}

          {/* AR overlay */}
          <MagicLensOverlay items={items} />

          {/* Scan line effect */}
          {scanning && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute left-0 right-0 h-1 bg-[var(--accent-secondary)]/60 shadow-[0_0_20px_var(--accent-secondary)]"
                style={{ animation: "scan-line 2s linear infinite" }}
              />
            </div>
          )}

          {scanning && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <LoadingPulse text="Translating menu..." />
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            {items.length > 0 ? (
              <button
                onClick={handleClear}
                className="px-6 py-3 bg-[var(--surface)] border-2 border-[var(--border)] rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform"
              >
                Re-scan
              </button>
            ) : (
              cameraReady && (
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="px-8 py-3 bg-[var(--accent-primary)] text-white font-bold rounded-full shadow-[0_4px_0_var(--border)] hover:translate-y-[2px] hover:shadow-[0_2px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40"
                >
                  Scan Menu
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <p className="text-4xl">🔍</p>
            <p className="text-[var(--text-muted)] text-sm">
              Camera not available. Magic Lens requires camera access.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
