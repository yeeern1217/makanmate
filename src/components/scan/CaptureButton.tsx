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
      className="w-[72px] h-[72px] rounded-full bg-[var(--accent-primary)] border-4 border-[var(--accent-secondary)] shadow-[0_4px_0_var(--border),0_0_20px_rgba(196,85,58,0.4)] hover:scale-105 active:scale-90 active:shadow-none transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <span className="text-white font-bold text-xs tracking-wider">CATCH</span>
    </button>
  );
}
