"use client";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { DishEntry } from "@/types/heritage";
import type { CookingState } from "./IngredientModel";
import CookingOrbitNode from "./CookingOrbitNode";
import SizzleParticles from "./SizzleParticles";
import CookingHUD from "./CookingHUD";

type Phase = "playing" | "assembling" | "done";

function distributeOnRing(
  count: number,
  radius: number,
  ySpread: number = 0.3
): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const y = Math.sin(i * 2.399) * 0.5 * ySpread * 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number];
  });
}

/** The finished-dish emoji at the center. Grows + glows once the recipe is assembled. */
function CenterDish({ emoji, revealed }: { emoji: string; revealed: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!glowRef.current) return;
    const mat = glowRef.current.material as THREE.MeshBasicMaterial;
    const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.06;
    mat.opacity = (revealed ? 0.4 : 0.12) + pulse;
  });

  return (
    <group>
      <mesh ref={glowRef} scale={revealed ? 2.6 : 1.8}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#e7b53a" transparent opacity={0.12} />
      </mesh>
      <Billboard>
        <Html center style={{ pointerEvents: "none", userSelect: "none" }}>
          <div
            style={{
              fontSize: revealed ? "92px" : "54px",
              lineHeight: 1,
              filter: revealed
                ? "drop-shadow(0 0 30px rgba(231,181,58,0.7)) brightness(1.15)"
                : "drop-shadow(0 0 10px rgba(0,0,0,0.3))",
              transition: "font-size 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {emoji}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

export default function DishCanvas({
  dish,
  onCookComplete,
  initiallyCompleted = false,
  paused = false,
}: {
  dish: DishEntry;
  onCookComplete: () => void;
  initiallyCompleted?: boolean;
  paused?: boolean;
}) {
  const order = useMemo(() => dish.cookingOrder ?? [], [dish.cookingOrder]);
  const hasGame = order.length > 0;

  // Memoize so ring positions are computed once per dish (see original note: the
  // sine spread must not recompute on every re-render or nodes teleport).
  const ingredientPositions = useMemo(
    () => distributeOnRing(dish.ingredients.length, 2.2),
    [dish.ingredients.length]
  );

  const [currentStep, setCurrentStep] = useState(initiallyCompleted ? order.length : 0);
  const [states, setStates] = useState<Record<string, CookingState>>(() => {
    if (!initiallyCompleted) return {};
    const s: Record<string, CookingState> = {};
    dish.ingredients.forEach((i) => (s[i.id] = "cooked"));
    return s;
  });
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(initiallyCompleted ? "done" : "playing");

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const currentTargetId = hasGame ? order[currentStep] : undefined;
  const currentTargetIngredient = dish.ingredients.find((i) => i.id === currentTargetId);

  const handleTap = useCallback(
    (id: string) => {
      if (phase !== "playing") return;
      if (states[id] === "cooked") return;

      if (id === currentTargetId) {
        setStates((p) => ({ ...p, [id]: "correct" }));
        setWrongMessage(null);
        setTimeout(() => {
          if (!mounted.current) return;
          setStates((p) => ({ ...p, [id]: "cooked" }));
          const next = currentStep + 1;
          if (next >= order.length) {
            setPhase("assembling");
            setTimeout(() => {
              if (!mounted.current) return;
              setPhase("done");
              onCookComplete();
            }, 850);
          } else {
            setCurrentStep(next);
          }
        }, 800);
      } else {
        const tapped = dish.ingredients.find((i) => i.id === id);
        setWrongMessage(`Not yet! ${tapped?.name ?? "That"} comes later.`);
        setStates((p) => ({ ...p, [id]: "wrong" }));
        setTimeout(() => {
          if (!mounted.current) return;
          setStates((p) => (p[id] === "wrong" ? { ...p, [id]: "idle" } : p));
        }, 600);
      }
    },
    [phase, states, currentTargetId, currentStep, order, dish.ingredients, onCookComplete]
  );

  return (
    <div
      className="relative"
      style={{ width: "100%", height: "100%", visibility: paused ? "hidden" : "visible" }}
    >
      {hasGame && phase === "playing" && (
        <CookingHUD
          currentStep={currentStep}
          totalSteps={order.length}
          hint={currentTargetIngredient?.cookingHint ?? ""}
          wrongMessage={wrongMessage}
          completed={false}
        />
      )}

      <Canvas
        frameloop={paused ? "never" : "always"}
        camera={{ position: [0, 2, 7], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#d4a947" />
        <pointLight position={[-5, -3, 3]} intensity={1} color="#c4553a" />
        <pointLight position={[0, -5, 0]} intensity={0.5} color="#4a7c59" />
        <spotLight position={[0, 8, 0]} intensity={0.8} angle={0.5} penumbra={1} color="#faf3e0" />
        <Environment preset="sunset" />
        <Stars radius={50} count={phase === "done" ? 1200 : 600} factor={2} fade speed={0.5} />
        <fog attach="fog" args={["#faf3e0", 10, 25]} />

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate={phase === "done"}
          autoRotateSpeed={0.6}
          minDistance={4}
          maxDistance={12}
        />

        {/* Faint orbit ring for the "blueprint" feel */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.18, 2.22, 64]} />
          <meshBasicMaterial color="#4a7c59" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>

        <CenterDish emoji={dish.emoji} revealed={phase !== "playing"} />

        {phase === "done" && <SizzleParticles />}

        {dish.ingredients.map((ing, i) => {
          const st = states[ing.id] ?? "idle";
          return (
            <CookingOrbitNode
              key={ing.id}
              id={ing.id}
              emoji={ing.emoji}
              label={ing.name}
              color={ing.color}
              position={ingredientPositions[i]}
              cookingState={st}
              isTarget={
                hasGame && phase === "playing" && ing.id === currentTargetId && st !== "cooked"
              }
              assembling={phase !== "playing"}
              onTap={handleTap}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
