"use client";
import { useEffect, useState } from "react";

export default function CookingHUD({
  currentStep,
  totalSteps,
  hint,
  wrongMessage,
  completed,
}: {
  currentStep: number;
  totalSteps: number;
  hint: string;
  wrongMessage: string | null;
  completed: boolean;
}) {
  const [showWrong, setShowWrong] = useState(false);

  useEffect(() => {
    if (wrongMessage) {
      setShowWrong(true);
      const t = setTimeout(() => setShowWrong(false), 2000);
      return () => clearTimeout(t);
    }
  }, [wrongMessage]);

  if (completed) {
    return (
      <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-6">
        <div className="rounded-xl bg-[#1a1a2e]/90 px-6 py-4 text-center backdrop-blur-md border border-[#ffd700]/30">
          <p className="text-2xl font-black text-[#ffd700] mb-1">Dish Mastered!</p>
          <p className="text-sm text-gray-300">You&apos;ve unlocked the heritage of this dish</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-4 px-4">
      <div className="w-full max-w-sm rounded-xl bg-[#1a1a2e]/90 px-4 py-3 backdrop-blur-md border border-[#39ff14]/20">
        {/* Step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#39ff14]">
            Step {currentStep + 1}/{totalSteps}
          </span>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  i < currentStep
                    ? "bg-[#39ff14] shadow-[0_0_6px_#39ff14]"
                    : i === currentStep
                    ? "bg-[#ffd700] shadow-[0_0_6px_#ffd700] animate-pulse"
                    : "bg-[#333]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current hint */}
        <p className="text-sm text-gray-200">{hint}</p>
      </div>

      {/* Wrong pick feedback */}
      {showWrong && wrongMessage && (
        <div className="mt-2 rounded-lg bg-red-900/80 px-4 py-2 text-center backdrop-blur-sm border border-red-500/30 animate-slide-up">
          <p className="text-sm text-red-200">{wrongMessage}</p>
        </div>
      )}
    </div>
  );
}
