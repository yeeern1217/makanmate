"use client";
import { useState } from "react";
import type { IngredientNode } from "@/types/heritage";
import type { TechniqueNode, DialectPhrase, MigrationStory } from "@/types/card";
import type { IngredientLore } from "@/types/ai";
import { narrateStory, stopSpeaking } from "@/lib/voice/voice-guide";
import LoadingPulse from "@/components/ui/LoadingPulse";

type NodeType =
  | { kind: "ingredient"; data: IngredientNode; lore: IngredientLore | null; loading: boolean }
  | { kind: "technique"; data: TechniqueNode }
  | { kind: "migration"; data: MigrationStory | null; hint: string; loading: boolean }
  | { kind: "dialect"; data: DialectPhrase };

export default function NodeDetailOverlay({
  node,
  onClose,
}: {
  node: NodeType;
  onClose: () => void;
}) {
  const [narrating, setNarrating] = useState(false);

  const handleNarrate = (text: string) => {
    if (narrating) {
      stopSpeaking();
      setNarrating(false);
    } else {
      narrateStory(text);
      setNarrating(true);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 animate-slide-up">
      <div className="mx-3 mb-3 rounded-xl bg-[var(--surface)]/95 border-2 border-[var(--border)] backdrop-blur-md shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <CategoryBadge kind={node.kind} />
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className="text-[var(--text-muted)] text-lg leading-none hover:text-[var(--foreground)]"
          >
            &times;
          </button>
        </div>

        <div className="px-4 pb-4 max-h-[42vh] overflow-y-auto">
          {node.kind === "ingredient" && <IngredientDetail node={node} />}
          {node.kind === "technique" && <TechniqueDetail data={node.data} />}
          {node.kind === "migration" && (
            <MigrationDetail
              data={node.data}
              hint={node.hint}
              loading={node.loading}
              narrating={narrating}
              onNarrate={handleNarrate}
            />
          )}
          {node.kind === "dialect" && <DialectDetail data={node.data} />}
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ kind }: { kind: string }) {
  const config: Record<string, { label: string; color: string; emoji: string }> = {
    ingredient: { label: "Ingredient", color: "var(--accent-grassroots)", emoji: "🧂" },
    technique: { label: "Technique", color: "var(--accent-primary)", emoji: "🔧" },
    migration: { label: "Migration Story", color: "var(--accent-secondary)", emoji: "🧭" },
    dialect: { label: "Dialect", color: "#6b5ce7", emoji: "💬" },
  };
  const c = config[kind] ?? config.ingredient;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
    >
      {c.emoji} {c.label}
    </span>
  );
}

function IngredientDetail({ node }: { node: { data: IngredientNode; lore: IngredientLore | null; loading: boolean } }) {
  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{node.data.emoji}</span>
        <div>
          <h3 className="font-bold text-sm">{node.data.name}</h3>
          <p className="text-xs text-[var(--text-muted)]">{node.data.local_name}</p>
        </div>
      </div>
      {node.loading && <LoadingPulse text="Discovering lore..." />}
      {node.lore && (
        <div className="space-y-1.5">
          <p className="text-xs leading-relaxed">{node.lore.lore_text}</p>
          {node.lore.origin_region && (
            <p className="text-xs text-[var(--text-muted)] italic">Origin: {node.lore.origin_region}</p>
          )}
          {node.lore.fun_fact && (
            <p className="text-xs font-medium text-[var(--accent-secondary)]">
              Fun fact: {node.lore.fun_fact}
            </p>
          )}
          {node.lore.sources && node.lore.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)]">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sources</p>
              <div className="space-y-0.5">
                {node.lore.sources.map((s: { title: string; url: string }, i: number) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                     className="block text-[10px] text-[var(--accent-primary)] hover:underline truncate">
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TechniqueDetail({ data }: { data: TechniqueNode }) {
  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.emoji}</span>
        <h3 className="font-bold text-sm">{data.name}</h3>
      </div>
      <p className="text-xs leading-relaxed">{data.description}</p>
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <span>Tool:</span>
        <span className="font-medium text-[var(--accent-primary)]">{data.tool}</span>
      </div>
    </div>
  );
}

function MigrationDetail({
  data,
  hint,
  loading,
  narrating,
  onNarrate,
}: {
  data: MigrationStory | null;
  hint: string;
  loading: boolean;
  narrating: boolean;
  onNarrate: (text: string) => void;
}) {
  return (
    <div className="space-y-2 mt-2">
      {loading && <LoadingPulse text="Tracing the migration route..." />}
      {!data && !loading && (
        <p className="text-xs text-[var(--text-muted)] italic">{hint}</p>
      )}
      {data && (
        <>
          <h3 className="font-bold text-sm text-[var(--accent-secondary)]">{data.title}</h3>
          <p className="text-xs leading-relaxed">{data.narrative}</p>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>Origin: <strong>{data.origin}</strong></span>
            <span>Era: <strong>{data.era}</strong></span>
          </div>
          <button
            onClick={() => onNarrate(data.narrative)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 active:scale-95 transition-transform"
          >
            {narrating ? "⏹ Stop" : "🔊 Listen"}
          </button>
        </>
      )}
    </div>
  );
}

function DialectDetail({ data }: { data: DialectPhrase }) {
  const handleSpeak = () => {
    narrateStory(data.phrase);
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: "#6b5ce7" }}>
          &ldquo;{data.phrase}&rdquo;
        </h3>
        <button
          onClick={handleSpeak}
          className="text-sm px-2 py-1 rounded-lg bg-[#6b5ce7]/10 text-[#6b5ce7] border border-[#6b5ce7]/20 active:scale-95 transition-transform"
        >
          🔊
        </button>
      </div>
      <p className="text-xs font-mono text-[var(--text-muted)]">/{data.pronunciation}/</p>
      <p className="text-sm font-medium">{data.meaning}</p>
      <p className="text-xs text-[var(--text-muted)]">{data.context}</p>
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "#6b5ce722", color: "#6b5ce7", border: "1px solid #6b5ce744" }}
      >
        {data.dialect}
      </span>
    </div>
  );
}
