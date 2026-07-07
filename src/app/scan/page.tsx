"use client";
import { useCallback, useRef, useState } from "react";
import { captureFrameAsBase64 } from "@/lib/camera";
import { getCurrentPosition } from "@/lib/gps";
import { useAppStore } from "@/store/useAppStore";
import { ParsedDish } from "@/types/ai";
import CameraViewport from "@/components/scan/CameraViewport";
import CaptureButton from "@/components/scan/CaptureButton";
import MenuAnalysisResult from "@/components/scan/MenuAnalysisResult";
import ManualDishDropdown from "@/components/scan/ManualDishDropdown";
import ToastNotification from "@/components/ui/ToastNotification";
import LoadingPulse from "@/components/ui/LoadingPulse";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dishes, setDishes] = useState<ParsedDish[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const addDiscoveredNode = useAppStore((s) => s.addDiscoveredNode);

  const onCameraStream = useCallback(() => setCameraReady(true), []);
  const onCameraError = useCallback(() => setCameraError(true), []);

  const handleCapture = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);
    setDishes([]);

    const image = captureFrameAsBase64(videoRef.current);

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await getCurrentPosition();
      lat = pos.lat;
      lng = pos.lng;
    } catch {
      // GPS unavailable — continue without it
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, lat, lng, mode: "vision" }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.menu?.dishes) {
        setDishes(data.menu.dishes);
      }

      if (data.location?.is_at_heritage_site) {
        addDiscoveredNode(data.location.nearest_node_id!);
        setToast(`Heritage Node Unlocked: ${data.location.nearest_node_name}!`);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-3 bg-[#1a1a2e]/80 backdrop-blur-sm z-10">
        <h1 className="text-sm font-bold text-[#39ff14]">Scan Menu</h1>
      </div>

      {toast && <ToastNotification message={toast} onDismiss={() => setToast(null)} />}

      {/* Camera or fallback */}
      {!cameraError ? (
        <div className="relative flex-1 bg-black">
          <CameraViewport
            videoRef={videoRef}
            onStream={onCameraStream}
            onError={onCameraError}
          />

          {/* Capture button overlay */}
          {cameraReady && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <CaptureButton onClick={handleCapture} disabled={scanning} />
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <LoadingPulse text="Analyzing menu..." />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <p className="text-4xl">📷</p>
            <p className="text-gray-400 text-sm">
              Camera not available. Use the dropdown below to explore dishes.
            </p>
          </div>
        </div>
      )}

      {/* Results area */}
      <div className="bg-[#0d0d1a] px-4 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
        {dishes.length > 0 && <MenuAnalysisResult dishes={dishes} />}
        <ManualDishDropdown />
      </div>
    </div>
  );
}
