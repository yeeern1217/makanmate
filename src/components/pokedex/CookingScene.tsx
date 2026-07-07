"use client";
import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Environment } from "@react-three/drei";
import { DishEntry } from "@/types/heritage";
import IngredientModel, { CookingState } from "./IngredientModel";
import WokModel from "./WokModel";
import CookingHUD from "./CookingHUD";
import SizzleParticles from "./SizzleParticles";
import VictoryIngredients from "./VictoryIngredients";

export default function CookingScene({
  dish,
  onComplete,
}: {
  dish: DishEntry;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredientStates, setIngredientStates] = useState<Record<string, CookingState>>({});
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showSizzle, setShowSizzle] = useState(false);
  const wrongCounter = useRef(0);

  const cookingOrder = dish.cookingOrder;
  const currentTargetId = cookingOrder[currentStep];
  const currentTargetIngredient = dish.ingredients.find((i) => i.id === currentTargetId);

  const handleIngredientTap = useCallback(
    (ingredientId: string) => {
      if (completed) return;
      if (ingredientStates[ingredientId] === "cooked") return;

      if (ingredientId === currentTargetId) {
        setIngredientStates((prev) => ({ ...prev, [ingredientId]: "correct" }));
        setShowSizzle(true);
        setWrongMessage(null);

        setTimeout(() => {
          setIngredientStates((prev) => ({ ...prev, [ingredientId]: "cooked" }));
          setShowSizzle(false);

          const nextStep = currentStep + 1;
          if (nextStep >= cookingOrder.length) {
            setCompleted(true);
          } else {
            setCurrentStep(nextStep);
          }
        }, 800);
      } else {
        wrongCounter.current += 1;
        const tappedIngredient = dish.ingredients.find((i) => i.id === ingredientId);
        setWrongMessage(
          `Not yet! ${tappedIngredient?.name ?? "That"} comes later.`
        );
        setIngredientStates((prev) => ({ ...prev, [ingredientId]: "wrong" }));

        setTimeout(() => {
          setIngredientStates((prev) => ({ ...prev, [ingredientId]: "idle" }));
        }, 600);
      }
    },
    [currentStep, currentTargetId, cookingOrder, completed, ingredientStates, dish.ingredients]
  );

  const arrangeInCircle = (index: number, total: number): [number, number, number] => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = 2.2;
    return [Math.cos(angle) * radius, 0.8 + Math.sin(angle) * 0.3, Math.sin(angle) * radius];
  };

  return (
    <div className="relative" style={{ width: "100%", height: "60vh" }}>
      {!completed && (
        <CookingHUD
          currentStep={currentStep}
          totalSteps={cookingOrder.length}
          hint={currentTargetIngredient?.cookingHint ?? ""}
          wrongMessage={wrongMessage}
          completed={false}
        />
      )}

      {/* Victory overlay */}
      {completed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-6 px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-[#1a1a2e]/95 px-5 py-5 text-center backdrop-blur-lg border border-[#ffd700]/40 shadow-[0_0_40px_#ffd70033] animate-slide-up">
            <p className="text-7xl mb-3" style={{ filter: "drop-shadow(0 0 20px rgba(255,215,0,0.5))" }}>
              {dish.emoji}
            </p>
            <p className="text-xl font-black text-[#ffd700] mb-1">{dish.name} Mastered!</p>
            <p className="text-xs text-gray-400 mb-1">{dish.local_script} · {dish.origin_state}</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs text-gray-400">Heritage Score</span>
              <span className="text-sm font-bold text-[#39ff14]">{dish.heritage_score}/100</span>
            </div>
            <p className="text-xs text-gray-300 italic mb-4">&quot;{dish.fun_fact}&quot;</p>
            <button
              onClick={onComplete}
              className="w-full rounded-lg bg-gradient-to-r from-[#ffd700] to-[#ff8c00] px-4 py-2.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_20px_#ffd70066] active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 3, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={completed ? 0.5 : 0.3} />
        <pointLight position={[3, 5, 3]} intensity={2} color={completed ? "#ffd700" : "#ff6600"} />
        <pointLight position={[-3, 3, -3]} intensity={1} color="#39ff14" />
        <pointLight position={[0, -2, 0]} intensity={completed ? 0.5 : 1.5} color="#ff4500" />
        <spotLight
          position={[0, 8, 0]}
          intensity={completed ? 1.5 : 0.8}
          angle={0.6}
          penumbra={1}
          color={completed ? "#ffd700" : "#ffffff"}
        />
        <Environment preset="night" />
        <Stars radius={50} count={completed ? 1500 : 500} factor={completed ? 4 : 2} fade speed={completed ? 1.5 : 0.5} />
        <fog attach="fog" args={["#0d0d1a", 8, 20]} />

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate={completed}
          autoRotateSpeed={1}
          minDistance={4}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 + 0.3}
          minPolarAngle={0.3}
        />

        <WokModel ingredientsCooked={completed ? cookingOrder.length : currentStep} />

        {showSizzle && <SizzleParticles />}

        {/* Victory: ingredients orbit above the wok */}
        {completed && <VictoryIngredients ingredients={dish.ingredients} />}

        {/* Cooking phase: ingredients in a circle */}
        {!completed && dish.ingredients.map((ing, index) => {
          const state = ingredientStates[ing.id] || "idle";
          const circlePos = arrangeInCircle(index, dish.ingredients.length);
          const positionedIngredient = { ...ing, position: circlePos as [number, number, number] };

          return (
            <IngredientModel
              key={ing.id}
              ingredient={positionedIngredient}
              isActive={ing.id === currentTargetId && state === "idle"}
              onClick={() => handleIngredientTap(ing.id)}
              cookingState={state}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
