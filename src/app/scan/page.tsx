"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureFrameAsBase64 } from "@/lib/camera";
import { getCurrentPosition } from "@/lib/gps";
import { findNearestHeritageNode, HERITAGE_CATCH_RADIUS_M } from "@/lib/geo";
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

type Stage = "stall" | "menu";

async function loadAssetImageAsBase64(filename: string): Promise<string> {
  const response = await fetch(`/assets/${filename}`);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1]);
      } else {
        reject(new Error("Failed to read image asset"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image asset"));
    reader.readAsDataURL(blob);
  });
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stage, setStage] = useState<Stage>("stall");
  const [dishes, setDishes] = useState<ParsedDish[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [catchCard, setCatchCard] = useState<CapturedCard | null>(null);
  const [showCatchAnim, setShowCatchAnim] = useState(false);
  const [stallImage, setStallImage] = useState<string | null>(null);
  const addDiscoveredNode = useAppStore((s) => s.addDiscoveredNode);
  const addExploredNode = useCardStore((s) => s.addExploredNode);
  const addCard = useCardStore((s) => s.addCard);

  const onCameraStream = useCallback(() => setCameraReady(true), []);
  const onCameraError = useCallback(() => setCameraError(true), []);

  const handleStallCapture = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);

    const image = await loadAssetImageAsBase64("fatty_crab_duck_rice.jpg");

    setStallImage(image);

    let pos;
    try {
      pos = await getCurrentPosition();
    } catch {
      setToast("Turn on GPS — we need your location to confirm the stall.");
      setScanning(false);
      return;
    }

    try {
      const livenessRes = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, mode: "liveness" }),
        headers: { "Content-Type": "application/json" },
      });
      const livenessData = await livenessRes.json();
      const liv = livenessData.result;
      if (liv && !liv.isReal && liv.confidence > 0.7) {
        setToast("That looks like a screen — find the real stall!");
        setScanning(false);
        return;
      }

      const nearest = findNearestHeritageNode(HERITAGE_NODES, pos.lat, pos.lng);
      if (!nearest || nearest.distanceMeters > HERITAGE_CATCH_RADIUS_M) {
        const where = nearest
          ? ` (${nearest.distanceMeters}m from ${nearest.node.name})`
          : "";
        setToast(`No heritage stall within ${HERITAGE_CATCH_RADIUS_M}m${where}.`);
        setScanning(false);
        return;
      }

      const node = nearest.node;
      addDiscoveredNode(node.id);

      if (!node.isGrassroots) {
        setToast(`${node.name} is a hyped spot — node unlocked, but no card.`);
        setStage("menu");
        setScanning(false);
        return;
      }

      const akarScore = computeAkarScore(node);
      const rarity = classifyRarity(akarScore);
      const card: CapturedCard = {
        id: `${node.id}-${Date.now()}`,
        stallId: node.id,
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
      setShowCatchAnim(true);
    } catch (err) {
      console.error("Catch error:", err);
      setToast("Something went wrong — try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleCatchComplete = () => {
    setShowCatchAnim(false);
    setStage("menu");
  };

  const handleMenuCapture = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);
    setDishes([]);

    const image = captureFrameAsBase64(videoRef.current);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ image, mode: "vision" }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      const found: ParsedDish[] = data.menu?.dishes ?? [];
      setDishes(found);

      const stallId = catchCard?.stallId;
      if (stallId) {
        for (const dish of found) {
          if (dish.dish_id) addExploredNode(dish.dish_id, stallId);
        }
      }
    } catch (err) {
      console.error("Menu scan error:", err);
      setToast("Couldn't read the menu — try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleFinish = () => {
    const dishId = catchCard?.dishId;
    if (dishId) router.push(`/pokedex/${dishId}`);
    else router.push("/pokedex");
  };

  const capture = stage === "stall" ? handleStallCapture : handleMenuCapture;
  const captureLabel = stage === "stall" ? "CATCH" : "SCAN";
  const hint = stage === "stall" ? "Aim at the stall" : "Aim at the menu";
  const loadingText = stage === "stall" ? "Verifying stall..." : "Reading menu...";

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <h1 className="text-sm font-bold text-[var(--accent-primary)]">
          {stage === "stall" ? "Catch" : "Scan Menu"}
        </h1>
      </div>

      {toast && <ToastNotification message={toast} onDismiss={() => setToast(null)} />}

      {/* Catch animation overlay */}
      {showCatchAnim && catchCard && (
        <CatchAnimation
          dishId={catchCard.dishId}
          stallName={HERITAGE_NODES.find((n) => n.id === catchCard.stallId)?.name ?? "Unknown Stall"}
          culturalOrigin={catchCard.culturalOrigin}
          rarity={catchCard.rarity}
          tier={catchCard.tier}
          akarScore={catchCard.akarScore}
          capturedPhoto={stallImage ?? undefined}
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
              {/* Stage hint */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
                <span className="text-xs font-semibold text-[var(--accent-secondary)] tracking-wide">
                  {hint}
                </span>
              </div>
              {/* Corner brackets */}
              <div className="absolute top-6 left-6 w-12 h-12 border-t-3 border-l-3 border-[var(--accent-secondary)]" />
              <div className="absolute top-6 right-6 w-12 h-12 border-t-3 border-r-3 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 left-6 w-12 h-12 border-b-3 border-l-3 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 right-6 w-12 h-12 border-b-3 border-r-3 border-[var(--accent-secondary)]" />
            </div>
          )}

          {/* Capture button overlay */}
          {cameraReady && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <CaptureButton onClick={capture} disabled={scanning} label={captureLabel} />
              {stage === "menu" && (
                <button
                  onClick={handleFinish}
                  className="text-xs font-semibold text-[var(--text-muted)] underline underline-offset-2"
                >
                  Done
                </button>
              )}
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <LoadingPulse text={loadingText} />
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
        {stage === "menu" && dishes.length > 0 && <MenuAnalysisResult dishes={dishes} />}
        {cameraError && <ManualDishDropdown />}
      </div>
    </div>
  );
}
