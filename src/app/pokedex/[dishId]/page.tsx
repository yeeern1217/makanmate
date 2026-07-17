"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { POKEDEX_ENTRIES } from "@/lib/data/pokedex-entries";
import { HERITAGE_NODES } from "@/lib/data/heritage-nodes";
import { usePokedexStore } from "@/store/usePokedexStore";
import { useCardStore } from "@/store/useCardStore";
import { IngredientLore } from "@/types/ai";
import type { MigrationStory, CardTier } from "@/types/card";
import type { NodeCategory } from "@/components/blueprint/BlueprintNode";
import { generateQuiz } from "@/lib/quiz/quiz-generator";
import NodeDetailOverlay from "@/components/blueprint/NodeDetailOverlay";
import QuizChallenge from "@/components/evolve/QuizChallenge";
import CardEvolution from "@/components/evolve/CardEvolution";
import LoadingPulse from "@/components/ui/LoadingPulse";

const DishCanvas = dynamic(() => import("@/components/pokedex/DishCanvas"), {
  ssr: false,
  loading: () => <LoadingPulse text="Loading blueprint..." />,
});

export default function PokedexPage() {
  const params = useParams();
  const dishId = params.dishId as string;
  const dish = POKEDEX_ENTRIES.find((d) => d.id === dishId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const getLore = usePokedexStore((s) => s.getLore);
  const cacheLore = usePokedexStore((s) => s.cacheLore);

  const addExploredNode = useCardStore((s) => s.addExploredNode);
  const exploredNodes = useCardStore((s) => s.exploredNodes);
  const cards = useCardStore((s) => s.cards);
  const evolveCard = useCardStore((s) => s.evolveCard);
  const updateAkarScore = useCardStore((s) => s.updateAkarScore);

  const card = mounted ? cards.find((c) => c.dishId === dishId) : undefined;
  const canEvolve = card && card.tier !== "gold";

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NodeCategory | null>(null);
  const [lore, setLore] = useState<IngredientLore | null>(null);
  const [loadingLore, setLoadingLore] = useState(false);
  const [migrationStory, setMigrationStory] = useState<MigrationStory | null>(null);
  const [loadingMigration, setLoadingMigration] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [pillsOpen, setPillsOpen] = useState(false);
  const [evolutionFrom, setEvolutionFrom] = useState<CardTier>("bronze");
  const [evolutionTo, setEvolutionTo] = useState<CardTier>("silver");

  const exploredNodeIds = mounted && dish ? (exploredNodes[dish.id] ?? []) : [];

  const activeNodeIdRef = useRef<string | null>(null);
  const lastTapTime = useRef(0);
  useEffect(() => {
    activeNodeIdRef.current = activeNodeId;
  }, [activeNodeId]);

  const handleNodeTap = useCallback(
    async (nodeId: string, category: NodeCategory) => {
      if (!dish) return;

      const now = Date.now();
      if (now - lastTapTime.current < 200) return;
      lastTapTime.current = now;

      if (activeNodeIdRef.current === nodeId) {
        setActiveNodeId(null);
        setActiveCategory(null);
        setLore(null);
        return;
      }

      setActiveNodeId(nodeId);
      setActiveCategory(category);
      setLore(null);
      setMigrationStory(null);

      addExploredNode(dish.id, nodeId);

      if (category === "ingredient") {
        const ingredient = dish.ingredients.find((i) => i.id === nodeId);
        if (!ingredient) return;

        const cacheKey = `${dishId}:${nodeId}`;
        const cached = getLore(cacheKey);
        if (cached) {
          setLore(cached);
          return;
        }

        setLoadingLore(true);
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              mode: "lore",
              ingredient: ingredient.name,
              dish: dish.name,
              lore_hint: ingredient.lore_hint,
            }),
            headers: { "Content-Type": "application/json" },
          });
          const data = await response.json();
          if (data.result) {
            const loreWithSources: IngredientLore = {
              ...(data.result as IngredientLore),
              sources: data.sources ?? [],
            };
            setLore(loreWithSources);
            cacheLore(cacheKey, loreWithSources);
          }
        } catch (err) {
          console.error("Lore fetch error:", err);
        } finally {
          setLoadingLore(false);
        }
      }

      if (category === "migration") {
        setLoadingMigration(true);
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            body: JSON.stringify({
              mode: "migration",
              migrationHint: dish.migrationStoryHint,
            }),
            headers: { "Content-Type": "application/json" },
          });
          const data = await response.json();
          if (data.result) {
            setMigrationStory(data.result as MigrationStory);
          }
        } catch (err) {
          console.error("Migration fetch error:", err);
        } finally {
          setLoadingMigration(false);
        }
      }
    },
    [dish, dishId, addExploredNode, getLore, cacheLore]
  );

  if (!dish) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Dish not found</p>
      </div>
    );
  }

  const activeIngredient = activeCategory === "ingredient"
    ? dish.ingredients.find((i) => i.id === activeNodeId) ?? null
    : null;

  const activeTechnique = activeCategory === "technique"
    ? dish.techniques?.find((t) => t.id === activeNodeId) ?? null
    : null;

  const activeDialectIndex = activeCategory === "dialect" && activeNodeId
    ? parseInt(activeNodeId.split("-").pop() ?? "-1", 10)
    : -1;
  const activeDialect = activeCategory === "dialect" && activeDialectIndex >= 0
    ? dish.dialectPhrases?.[activeDialectIndex] ?? null
    : null;

  const totalNodes =
    dish.ingredients.length +
    (dish.techniques?.length ?? 0) +
    1 + // migration
    (dish.dialectPhrases?.length ?? 0);
  const exploredCount = exploredNodeIds.length;

  return (
    <div className="flex flex-1 flex-col">
      {/* Compact top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[var(--surface)]/85 border-b-2 border-[var(--border)] backdrop-blur-sm z-10">
        <Link href="/pokedex" className="text-[var(--text-muted)] hover:text-[var(--foreground)] text-lg shrink-0">
          &larr;
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-sm font-black text-[var(--accent-primary)] truncate">{dish.name}</h1>
          <p className="text-[10px] text-[var(--text-muted)]">{exploredCount}/{totalNodes} explored</p>
        </div>
        {canEvolve ? (
          <button
            onClick={() => setShowQuiz(true)}
            className="shrink-0 px-3 py-1.5 rounded-full font-bold text-xs text-white shadow-[0_3px_0_var(--border)] active:translate-y-[3px] active:shadow-none transition-all animate-pulse-warm"
            style={{ background: card && card.tier === "bronze" ? "var(--tier-silver)" : "var(--tier-gold)" }}
          >
            ⚡ Evolve
          </button>
        ) : (
          <span className="shrink-0 text-sm font-bold text-[var(--tier-gold)]">
            {card && card.tier === "gold" ? "🥇" : ""}
          </span>
        )}
      </div>

      {/* 3D Blueprint Canvas */}
      <div className="relative flex-1">
        <DishCanvas
          dish={dish}
          onNodeTap={handleNodeTap}
          activeNodeId={activeNodeId}
          exploredNodeIds={exploredNodeIds}
          paused={showQuiz || showEvolution}
        />

        {/* Node detail overlays */}
        {activeNodeId && activeCategory === "ingredient" && activeIngredient && (
          <NodeDetailOverlay
            node={{ kind: "ingredient", data: activeIngredient, lore, loading: loadingLore }}
            onClose={() => {
              setActiveNodeId(null);
              setActiveCategory(null);
              setLore(null);
            }}
          />
        )}

        {activeNodeId && activeCategory === "technique" && activeTechnique && (
          <NodeDetailOverlay
            node={{ kind: "technique", data: activeTechnique }}
            onClose={() => {
              setActiveNodeId(null);
              setActiveCategory(null);
            }}
          />
        )}

        {activeNodeId && activeCategory === "migration" && (
          <NodeDetailOverlay
            node={{
              kind: "migration",
              data: migrationStory,
              hint: dish.migrationStoryHint ?? "",
              loading: loadingMigration,
            }}
            onClose={() => {
              setActiveNodeId(null);
              setActiveCategory(null);
              setMigrationStory(null);
            }}
          />
        )}

        {activeNodeId && activeCategory === "dialect" && activeDialect && (
          <NodeDetailOverlay
            node={{ kind: "dialect", data: activeDialect }}
            onClose={() => {
              setActiveNodeId(null);
              setActiveCategory(null);
            }}
          />
        )}

        {/* Pill index toggle (failsafe interaction) */}
        <button
          onClick={() => setPillsOpen((v) => !v)}
          className="absolute top-2 right-2 z-30 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-sm active:scale-95"
        >
          {pillsOpen ? "✕" : "≡ Index"}
        </button>
        {pillsOpen && (
          <div className="absolute top-12 left-2 right-2 z-30 flex gap-1.5 overflow-x-auto whitespace-nowrap rounded-xl bg-[var(--surface)]/90 border border-[var(--border)] backdrop-blur-sm p-2">
            {dish.ingredients.map((ing) => (
              <button
                key={ing.id}
                onClick={() => handleNodeTap(ing.id, "ingredient")}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                  activeNodeId === ing.id
                    ? "bg-[#4a7c59]/20 border-[#4a7c59] text-[#4a7c59] font-bold scale-105"
                    : exploredNodeIds.includes(ing.id)
                      ? "bg-[var(--surface)] border-[#4a7c59]/30 text-[var(--foreground)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {ing.emoji} {ing.name} {exploredNodeIds.includes(ing.id) && "✓"}
              </button>
            ))}
            {dish.techniques?.map((tech) => (
              <button
                key={tech.id}
                onClick={() => handleNodeTap(tech.id, "technique")}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                  activeNodeId === tech.id
                    ? "bg-[#c4553a]/20 border-[#c4553a] text-[#c4553a] font-bold scale-105"
                    : exploredNodeIds.includes(tech.id)
                      ? "bg-[var(--surface)] border-[#c4553a]/30 text-[var(--foreground)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {tech.emoji} {tech.name} {exploredNodeIds.includes(tech.id) && "✓"}
              </button>
            ))}
            <button
              onClick={() => handleNodeTap(`${dish.id}-migration`, "migration")}
              className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                activeNodeId === `${dish.id}-migration`
                  ? "bg-[#d4a947]/20 border-[#d4a947] text-[#d4a947] font-bold scale-105"
                  : exploredNodeIds.includes(`${dish.id}-migration`)
                    ? "bg-[var(--surface)] border-[#d4a947]/30 text-[var(--foreground)]"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              🧭 Migration {exploredNodeIds.includes(`${dish.id}-migration`) && "✓"}
            </button>
            {dish.dialectPhrases?.map((dp, i) => (
              <button
                key={`dialect-${i}`}
                onClick={() => handleNodeTap(`${dish.id}-dialect-${i}`, "dialect")}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                  activeNodeId === `${dish.id}-dialect-${i}`
                    ? "bg-[#6b5ce7]/20 border-[#6b5ce7] text-[#6b5ce7] font-bold scale-105"
                    : exploredNodeIds.includes(`${dish.id}-dialect-${i}`)
                      ? "bg-[var(--surface)] border-[#6b5ce7]/30 text-[var(--foreground)]"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                💬 {dp.phrase} {exploredNodeIds.includes(`${dish.id}-dialect-${i}`) && "✓"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quiz overlay */}
      {showQuiz && dish && (
        <QuizChallenge
          questions={generateQuiz(dish, 3)}
          onComplete={(passed, _score) => {
            setShowQuiz(false);
            if (passed && card) {
              const fromTier = card.tier;
              const toTier = fromTier === "bronze" ? "silver" : "gold";
              setEvolutionFrom(fromTier);
              setEvolutionTo(toTier as CardTier);
              evolveCard(card.id);
              updateAkarScore(card.id, 10);
              setShowEvolution(true);
            }
          }}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* Evolution animation */}
      {showEvolution && dish && card && (
        <CardEvolution
          fromTier={evolutionFrom}
          toTier={evolutionTo}
          dishName={dish.name}
          dishId={dish.id}
          stallName={HERITAGE_NODES.find((n) => n.id === card.stallId)?.name ?? dish.name}
          culturalOrigin={card.culturalOrigin}
          rarity={card.rarity}
          akarScore={card.akarScore}
          capturedPhoto={card.capturedPhoto}
          onComplete={() => setShowEvolution(false)}
        />
      )}
    </div>
  );
}
