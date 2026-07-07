"use client";

export default function LoadingPulse({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="w-12 h-12 rounded-full border-4 border-[#39ff14]/30 border-t-[#39ff14] animate-spin" />
      <p className="text-sm text-gray-400 animate-pulse">{text}</p>
    </div>
  );
}
