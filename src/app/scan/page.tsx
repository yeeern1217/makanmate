"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureFrameAsBase64 } from "@/lib/camera";
import { getCurrentPosition } from "@/lib/gps";
import { useAppStore } from "@/store/useAppStore";
import { useCardStore } from "@/store/useCardStore";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { computeAkarScore, classifyRarity } from "@/lib/scoring/akar-score";
import { ParsedDish } from "@/types/ai";
import CameraViewport from "@/components/scan/CameraViewport";
import CaptureButton from "@/components/scan/CaptureButton";
import MenuAnalysisResult from "@/components/scan/MenuAnalysisResult";
import ManualDishDropdown from "@/components/scan/ManualDishDropdown";
import ToastNotification from "@/components/ui/ToastNotification";
import LoadingPulse from "@/components/ui/LoadingPulse";
import CatchAnimation from "@/components/catch/CatchAnimation";
import type { CapturedCard } from "@/types/card";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dishes, setDishes] = useState<ParsedDish[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [catchCard, setCatchCard] = useState<CapturedCard | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const addDiscoveredNode = useAppStore((s) => s.addDiscoveredNode);
  const addCard = useCardStore((s) => s.addCard);

  const onCameraStream = useCallback(() => setCameraReady(true), []);
  const onCameraError = useCallback(() => setCameraError(true), []);

  const handleCapture = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);
    setDishes([]);

    const image = captureFrameAsBase64(videoRef.current);
    setCapturedImage(image);

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await getCurrentPosition();
      lat = pos.lat;
      lng = pos.lng;
    } catch {
      // GPS unavailable
    }

    try {
      // Step 1: Liveness check
      const livenessRes = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, mode: "liveness" }),
        headers: { "Content-Type": "application/json" },
      });
      const livenessData = await livenessRes.json();

      if (livenessData.result && !livenessData.result.isReal && livenessData.result.confidence > 0.7) {
        setToast("That looks like a screen — find the real stall!");
        setScanning(false);
        return;
      }

      // Step 2: Menu analysis
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, lat, lng, mode: "vision" }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      if (data.menu?.dishes) {
        setDishes(data.menu.dishes);
      }

      // Step 3: Heritage node unlock + card creation
      if (data.location?.is_at_heritage_site && data.location.nearest_node_id) {
        const nodeId = data.location.nearest_node_id;
        const node = HERITAGE_NODES.find((n) => n.id === nodeId);
        if (node && node.isGrassroots) {
          addDiscoveredNode(nodeId);
          const akarScore = computeAkarScore(node);
          const rarity = classifyRarity(akarScore);
          const card: CapturedCard = {
            id: `${nodeId}-${Date.now()}`,
            stallId: nodeId,
            dishId: node.dish_id,
            capturedAt: new Date().toISOString(),
            capturedPhoto: image,
            culturalOrigin: node.culturalOrigin,
            rarity,
            tier: "bronze",
            akarScore,
            heritageNodesUnlocked: 0,
            quizPassed: false,
            trailId: null,
          };
          addCard(card);
          setCatchCard(card);
        } else {
          setToast(`Heritage Node Unlocked: ${data.location.nearest_node_name}!`);
        }
      }
    } catch (err) {
      console.error("Catch error:", err);
      setToast("Something went wrong — try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleCatchComplete = () => {
    setCatchCard(null);
    if (catchCard) {
      router.push(`/pokedex/${catchCard.dishId}`);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <h1 className="text-sm font-bold text-[var(--accent-primary)]">Catch</h1>
      </div>

      {toast && <ToastNotification message={toast} onDismiss={() => setToast(null)} />}

      {/* Catch animation overlay */}
      {catchCard && (
        <CatchAnimation
          dishId={catchCard.dishId}
          stallName={HERITAGE_NODES.find((n) => n.id === catchCard.stallId)?.name ?? "Unknown Stall"}
          culturalOrigin={catchCard.culturalOrigin}
          rarity={catchCard.rarity}
          tier={catchCard.tier}
          akarScore={catchCard.akarScore}
          capturedPhoto={capturedImage ?? undefined}
          onComplete={handleCatchComplete}
        />
      )}

      {/* Camera or fallback */}
      {!cameraError ? (
        <div className="relative flex-1 bg-[var(--surface-dark)]">
          <CameraViewport
            videoRef={videoRef}
            onStream={onCameraStream}
            onError={onCameraError}
          />

          {/* Retro viewfinder overlay */}
          {cameraReady && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-6 left-6 w-12 h-12 border-t-3 border-l-3 border-[var(--accent-secondary)]" />
              <div className="absolute top-6 right-6 w-12 h-12 border-t-3 border-r-3 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 left-6 w-12 h-12 border-b-3 border-l-3 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 right-6 w-12 h-12 border-b-3 border-r-3 border-[var(--accent-secondary)]" />
            </div>
          )}

          {/* Capture button overlay */}
          {cameraReady && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <CaptureButton onClick={handleCapture} disabled={scanning} />
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <LoadingPulse text="Checking stall..." />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <p className="text-4xl">📷</p>
            <p className="text-[var(--text-muted)] text-sm">
              Camera not available. Use the dropdown below to explore dishes.
            </p>
          </div>
        </div>
      )}

      {/* Results area */}
      <div className="bg-[var(--background)] border-t-2 border-[var(--border)] px-4 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
        {dishes.length > 0 && <MenuAnalysisResult dishes={dishes} />}
        <ManualDishDropdown />
      </div>
    </div>
  );
}
