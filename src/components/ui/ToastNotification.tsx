"use client";
import { useEffect, useState } from "react";

export default function ToastNotification({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[var(--accent-secondary)] text-[var(--foreground)] font-bold text-sm border-2 border-[var(--border)] shadow-[0_4px_20px_rgba(212,169,71,0.4)] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      {message}
    </div>
  );
}
