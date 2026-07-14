"use client";

export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-[72px] left-0 right-0 z-50 bg-[var(--surface)] border-t-2 border-[var(--border)] rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(196,168,130,0.3)] animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4" />
        {children}
      </div>
    </>
  );
}
