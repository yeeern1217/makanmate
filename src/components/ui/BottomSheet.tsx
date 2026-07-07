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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-[72px] left-0 right-0 z-50 bg-[#1a1a2e] rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_30px_#39ff1433] animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-gray-600 mx-auto mb-4" />
        {children}
      </div>
    </>
  );
}
