"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { IngredientNode } from "@/types/heritage";

export type CookingState = "idle" | "correct" | "wrong" | "cooked";

export default function IngredientModel({
  ingredient,
  isActive,
  onClick,
  cookingState = "idle",
}: {
  ingredient: IngredientNode;
  isActive: boolean;
  onClick: () => void;
  cookingState?: CookingState;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const shakeStartRef = useRef<number>(0);
  const flyProgressRef = useRef<number>(0);
  const originalPos = useRef(new THREE.Vector3(...ingredient.position));

  const targetScale = cookingState === "cooked" ? 0 : cookingState === "correct" ? 0.3 : isActive ? 1.3 : 1.0;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (cookingState === "wrong") {
      if (shakeStartRef.current === 0) shakeStartRef.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - shakeStartRef.current;
      if (elapsed < 0.5) {
        const shakeX = Math.sin(elapsed * 30) * 0.15 * (1 - elapsed / 0.5);
        groupRef.current.position.x = originalPos.current.x + shakeX;
      } else {
        groupRef.current.position.x = originalPos.current.x;
        shakeStartRef.current = 0;
      }
    } else if (cookingState === "correct") {
      flyProgressRef.current = Math.min(flyProgressRef.current + delta * 1.5, 1);
      const t = flyProgressRef.current;
      const eased = t * t * (3 - 2 * t);
      groupRef.current.position.x = THREE.MathUtils.lerp(originalPos.current.x, 0, eased);
      groupRef.current.position.y = THREE.MathUtils.lerp(originalPos.current.y, 0.5, eased) + Math.sin(t * Math.PI) * 0.5;
      groupRef.current.position.z = THREE.MathUtils.lerp(originalPos.current.z, 0, eased);
    } else if (cookingState !== "cooked") {
      groupRef.current.position.set(originalPos.current.x, originalPos.current.y, originalPos.current.z);
      flyProgressRef.current = 0;
      shakeStartRef.current = 0;
    }

    const s = groupRef.current.scale.x;
    const next = THREE.MathUtils.lerp(s, targetScale, delta * 5);
    groupRef.current.scale.setScalar(Math.max(next, 0.001));

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1;
      mat.opacity = isActive ? 0.25 + pulse : 0.08 + pulse * 0.3;
    }
  });

  if (cookingState === "cooked") return null;

  const glowColor = cookingState === "wrong" ? "#ff0000" : isActive ? "#39ff14" : ingredient.color;

  return (
    <group ref={groupRef} position={ingredient.position}>
      {/* Glow orb behind emoji */}
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.08} />
      </mesh>

      {/* Clickable invisible sphere for hit detection */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.55, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Big emoji billboard */}
      <Billboard>
        <Html
          center
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              fontSize: "52px",
              lineHeight: 1,
              filter: cookingState === "wrong"
                ? "drop-shadow(0 0 12px #ff0000) saturate(0.5)"
                : isActive
                ? "drop-shadow(0 0 16px #39ff14) drop-shadow(0 0 30px #39ff1466) brightness(1.2)"
                : "drop-shadow(0 0 6px rgba(255,255,255,0.3))",
              transform: isActive ? "scale(1.15)" : "scale(1)",
              transition: "filter 0.3s, transform 0.3s",
            }}
          >
            {ingredient.emoji}
          </div>
        </Html>
      </Billboard>

      {/* Name label below */}
      {cookingState !== "correct" && (
        <Billboard position={[0, -0.8, 0]}>
          <Html
            center
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div
              style={{
                color: cookingState === "wrong" ? "#ff4444" : isActive ? "#39ff14" : "#ffffffcc",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                textAlign: "center",
                whiteSpace: "nowrap",
                textShadow: isActive
                  ? "0 0 10px #39ff14, 0 0 20px #39ff1466"
                  : cookingState === "wrong"
                  ? "0 0 10px #ff0000"
                  : "0 0 6px #000, 0 0 12px #00000088",
                background: isActive ? "rgba(57,255,20,0.1)" : "rgba(0,0,0,0.4)",
                padding: "2px 8px",
                borderRadius: "6px",
                border: isActive ? "1px solid rgba(57,255,20,0.3)" : "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(4px)",
                transition: "all 0.3s",
              }}
            >
              {ingredient.name}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}
