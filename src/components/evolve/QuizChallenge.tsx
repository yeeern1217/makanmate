"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { QuizQuestion } from "@/lib/quiz/quiz-generator";

const TIMER_SECONDS = 10;

export default function QuizChallenge({
  questions,
  onComplete,
  onClose,
}: {
  questions: QuizQuestion[];
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [phase, setPhase] = useState<"answering" | "feedback" | "done">("answering");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = questions[currentIndex];

  const handleTimeout = useCallback(() => {
    if (phase !== "answering") return;
    setSelected(-1);
    setPhase("feedback");
  }, [phase]);

  useEffect(() => {
    if (phase !== "answering") return;
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, phase, handleTimeout]);

  const handleAnswer = (index: number) => {
    if (phase !== "answering") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(index);
    if (index === question.correctIndex) {
      setScore((s) => s + 1);
    }
    setPhase("feedback");
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      const passed = score + (selected === question.correctIndex ? 0 : 0) >= Math.ceil(questions.length / 2);
      const finalScore = score;
      setPhase("done");
      onComplete(finalScore >= Math.ceil(questions.length / 2), finalScore);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setPhase("answering");
    }
  };

  const isCorrect = selected === question.correctIndex;
  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-dark)] border-b-2 border-[var(--border)]">
          <span className="text-xs font-bold text-[var(--text-muted)]">
            Question {currentIndex + 1}/{questions.length}
          </span>
          <button onClick={onClose} className="text-[var(--text-muted)] text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Timer ring */}
        <div className="flex justify-center py-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="var(--surface-dark)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke={timeLeft <= 3 ? "var(--accent-primary)" : "var(--accent-secondary)"}
                strokeWidth="3"
                strokeDasharray={`${timerPercent} ${100 - timerPercent}`}
                strokeLinecap="round"
                className="transition-all duration-1000 linear"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-lg font-bold"
              style={{ color: timeLeft <= 3 ? "var(--accent-primary)" : "var(--foreground)" }}
            >
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="px-5 pb-3">
          <p className="text-center text-sm font-bold leading-snug">{question.question}</p>
          <span
            className="block text-center text-[10px] mt-1 font-medium"
            style={{
              color:
                question.category === "dialect" ? "#6b5ce7" :
                question.category === "technique" ? "var(--accent-primary)" :
                question.category === "origin" ? "var(--accent-secondary)" :
                "var(--accent-grassroots)",
            }}
          >
            {question.category.toUpperCase()}
          </span>
        </div>

        {/* Options */}
        <div className="px-5 pb-5 space-y-2">
          {question.options.map((opt, i) => {
            let bg = "bg-[var(--background)]";
            let border = "border-[var(--border)]";
            let text = "";

            if (phase === "feedback") {
              if (i === question.correctIndex) {
                bg = "bg-green-100";
                border = "border-green-500";
                text = "text-green-800";
              } else if (i === selected && !isCorrect) {
                bg = "bg-red-100";
                border = "border-red-500";
                text = "text-red-800";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={phase === "feedback"}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-[0.98] ${bg} ${border} ${text} disabled:cursor-default`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Feedback footer */}
        {phase === "feedback" && (
          <div className="px-5 pb-5 animate-fade-in">
            <div className={`text-center text-sm font-bold mb-3 ${isCorrect ? "text-green-600" : "text-[var(--accent-primary)]"}`}>
              {selected === -1
                ? "Time's up!"
                : isCorrect
                  ? "Correct! Well done!"
                  : `Wrong — the answer is "${question.options[question.correctIndex]}"`}
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-xl bg-[var(--accent-primary)] text-white font-bold text-sm shadow-[0_4px_0_var(--border)] hover:translate-y-[2px] hover:shadow-[0_2px_0_var(--border)] active:translate-y-[4px] active:shadow-none transition-all"
            >
              {currentIndex + 1 >= questions.length ? "See Result" : "Next Question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
