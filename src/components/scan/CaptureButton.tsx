"use client";

export default function CaptureButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-[72px] h-[72px] rounded-full bg-white border-4 border-[#39ff14] shadow-[0_0_20px_#39ff14] hover:scale-105 active:scale-90 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full h-full rounded-full bg-white/90" />
    </button>
  );
}
