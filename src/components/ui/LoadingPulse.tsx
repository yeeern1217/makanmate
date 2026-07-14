"use client";

export default function LoadingPulse({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-[var(--accent-primary)] animate-spin" />
      <p className="text-sm text-[var(--text-muted)] animate-pulse">{text}</p>
    </div>
  );
}
