"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureFrameAsBase64 } from "@/lib/camera";
import { getCurrentPosition } from "@/lib/gps";
import { findNearestHeritageNode, HERITAGE_CATCH_RADIUS_M } from "@/lib/geo";
import { useAppStore } from "@/store/useAppStore";
import { useCardStore } from "@/store/useCardStore";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { computeAkarScore, classifyRarity } from "@/lib/scoring/akar-score";
import { buildTasteProfile } from "@/lib/recommender/taste-profile";
import { getTopRecommendations } from "@/lib/recommender/recommend";
import type { ScoredRecommendation } from "@/lib/recommender/types";
import { ParsedDish } from "@/types/ai";
import CameraViewport from "@/components/scan/CameraViewport";
import CaptureButton from "@/components/scan/CaptureButton";
import MenuAnalysisResult from "@/components/scan/MenuAnalysisResult";
import ManualDishDropdown from "@/components/scan/ManualDishDropdown";
import ToastNotification from "@/components/ui/ToastNotification";
import LoadingPulse from "@/components/ui/LoadingPulse";
import CatchAnimation from "@/components/catch/CatchAnimation";
import RecommendationCard from "@/components/catch/RecommendationCard";
import type { CapturedCard } from "@/types/card";

type Stage = "stall" | "menu";

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
  const [recommendation, setRecommendation] = useState<ScoredRecommendation | null>(null);
  const [phrasedSuggestion, setPhrasedSuggestion] = useState<string | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLng, setUserLng] = useState<number | undefined>(undefined);
  const addDiscoveredNode = useAppStore((s) => s.addDiscoveredNode);
  const addExploredNode = useCardStore((s) => s.addExploredNode);
  const addCard = useCardStore((s) => s.addCard);
  const cards = useCardStore((s) => s.cards);
  const phraseAbortRef = useRef<AbortController | null>(null);

  const onCameraStream = useCallback(() => setCameraReady(true), []);
  const onCameraError = useCallback(() => setCameraError(true), []);

  const dismissRecommendation = () => {
    phraseAbortRef.current?.abort();
    setPhrasedSuggestion(null);
    setShowRecommendation(false);
  };

  useEffect(() => {
    if (!showRecommendation) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissRecommendation();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showRecommendation]);

  const handleStallCapture = async () => {
    if (!videoRef.current || scanning) return;
    setScanning(true);

    const image = captureFrameAsBase64(videoRef.current);

    setStallImage(image);

    let pos;
    try {
      pos = await getCurrentPosition();
      setUserLat(pos.lat);
      setUserLng(pos.lng);
    } catch {
      setToast("Turn on GPS — we need your location to confirm the stall.");
      setScanning(false);
      return;
    }

    try {
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
      if (!node.isGrassroots) {
        setToast(`${node.name} is a hyped spot — node unlocked, but no card.`);
        setStage("menu");
        setScanning(false);
        return;
      }

      addDiscoveredNode(node.id);

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

    try {
      const profile = buildTasteProfile(cards, HERITAGE_NODES);
      const recs = getTopRecommendations(profile, HERITAGE_NODES, 1, userLat, userLng);
      if (recs.length > 0) {
        const rec = recs[0];
        setRecommendation(rec);
        setShowRecommendation(true);
        phraseAbortRef.current?.abort();
        const controller = new AbortController();
        phraseAbortRef.current = controller;
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "phrase-recommendation",
            stallName: rec.node.name,
            dishName: rec.node.signature_dish,
            reasoning: rec.reasoning,
          }),
          signal: controller.signal,
        })
          .then((res) => res.json())
          .then((data) => setPhrasedSuggestion(data.result?.suggestion ?? null))
          .catch((err) => { if (err.name !== "AbortError") setPhrasedSuggestion(null); });
      }
    } catch (err) {
      console.error("Recommendation failed:", err);
    }
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
      const found: ParsedDish[] = data.result?.menu?.dishes ?? [];
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

  const navigateToPokedex = () => {
    const dishId = catchCard?.dishId;
    if (dishId) router.push(`/pokedex/${dishId}`);
    else router.push("/pokedex");
  };

  const handleFinish = () => {
    if (recommendation) {
      setShowRecommendation(true);
    } else {
      navigateToPokedex();
    }
  };

  const capture = stage === "stall" ? handleStallCapture : handleMenuCapture;
  const captureLabel = stage === "stall" ? "CATCH" : "SCAN";
  const hint = stage === "stall" ? "Aim at the stall" : "Aim at the menu";
  const loadingText = stage === "stall" ? "Verifying stall..." : "Reading menu...";

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-[var(--surface)]/80 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]/70">
          Magic Lens
        </p>
        <h1 className="text-2xl font-black text-[var(--foreground)] leading-tight">
          {stage === "stall" ? "Catch a Stall" : "Scan Menu"}
        </h1>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {stage === "stall" ? "Point at a hawker stall, then tap Catch." : "Aim at the menu to scan dishes."}
        </p>
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
          city={HERITAGE_NODES.find((n) => n.id === catchCard.stallId)?.city}
          onComplete={handleCatchComplete}
        />
      )}

      {/* Recommendation card overlay */}
      {showRecommendation && recommendation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rec-card-title"
          className="fixed inset-0 z-40 flex items-end justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
        >
          <RecommendationCard
            recommendation={recommendation}
            phrasedSuggestion={phrasedSuggestion}
            onDismiss={dismissRecommendation}
            onNavigate={() => {
              setShowRecommendation(false);
              router.push(`/radar?highlight=${recommendation.node.id}`);
            }}
          />
        </div>
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
              <div className="absolute top-6 left-6 h-12 w-12 rounded-tl-2xl border-l-4 border-t-4 border-[var(--accent-secondary)]" />
              <div className="absolute top-6 right-6 h-12 w-12 rounded-tr-2xl border-r-4 border-t-4 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 left-6 h-12 w-12 rounded-bl-2xl border-b-4 border-l-4 border-[var(--accent-secondary)]" />
              <div className="absolute bottom-24 right-6 h-12 w-12 rounded-br-2xl border-b-4 border-r-4 border-[var(--accent-secondary)]" />

              {/* Sweeping scan line */}
              {!scanning && (
                <div className="absolute left-8 right-8 h-0.5 rounded-full bg-[var(--accent-secondary)] shadow-[0_0_10px_2px_var(--accent-secondary)] animate-scan-line" />
              )}

              {/* Framing hint */}
              {!scanning && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  📋 Frame the menu board
                </div>
              )}
            </div>
          )}

          {/* Capture button overlay */}
          {(cameraReady || stage === "stall") && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-md animate-glow-pulse pointer-events-none"
                />
                <CaptureButton onClick={capture} disabled={scanning} label={captureLabel} />
              </div>
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
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-in">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent-primary)]/40 bg-[var(--surface)]/60 animate-pulse-warm">
            <span className="text-4xl animate-float">📷</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Camera unavailable</h2>
          <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-[var(--text-muted)]">
            No worries — pick a dish below to explore its heritage instead.
          </p>
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
