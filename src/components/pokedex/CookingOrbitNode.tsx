"use client";
import { memo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { CookingState } from "./IngredientModel";

const CENTER = new THREE.Vector3(0, 0, 0);

/**
 * An ingredient node for the in-orbit cooking game. Wears the warm BlueprintNode
 * look (emoji billboard + glow orb + label pill) but reacts to cooking state:
 *  - idle       → gentle bob
 *  - target     → gold pulse highlight (it's the current step)
 *  - correct    → fast emoji spin ("spin spin"), then...
 *  - cooked     → settles dim with a ✓, stays put until the finale
 *  - wrong      → horizontal shake
 *  - assembling → flies to the center + shrinks (the "jump together" finale)
 */
function CookingOrbitNode({
  id,
  emoji,
  label,
  color,
  position,
  cookingState,
  isTarget,
  assembling,
  onTap,
}: {
  id: string;
  emoji: string;
  label: string;
  color: string;
  position: [number, number, number];
  cookingState: CookingState;
  isTarget: boolean;
  assembling: boolean;
  onTap: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const shakeStart = useRef(0);
  const spin = useRef(0);
  const original = useRef(new THREE.Vector3(...position));

  useEffect(() => {
    original.current.set(position[0], position[1], position[2]);
  }, [position]);

  const cooked = cookingState === "cooked";

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // ---- position ----
    if (assembling) {
      g.position.lerp(CENTER, Math.min(1, delta * 3));
    } else if (cookingState === "wrong") {
      if (shakeStart.current === 0) shakeStart.current = state.clock.elapsedTime;
      const e = state.clock.elapsedTime - shakeStart.current;
      const shakeX = e < 0.5 ? Math.sin(e * 30) * 0.15 * (1 - e / 0.5) : 0;
      g.position.set(original.current.x + shakeX, original.current.y, original.current.z);
      if (e >= 0.5) shakeStart.current = 0;
    } else {
      shakeStart.current = 0;
      const bob =
        cookingState === "idle"
          ? Math.sin(state.clock.elapsedTime * 1.5 + original.current.x) * 0.06
          : 0;
      g.position.set(original.current.x, original.current.y + bob, original.current.z);
    }

    // ---- scale ----
    let target = 1.0;
    if (assembling) target = 0.001;
    else if (cookingState === "correct") target = 1.25;
    else if (cooked) target = 0.8;
    else if (isTarget || hovered) target = 1.18;
    const s = g.scale.x;
    g.scale.setScalar(Math.max(0.001, THREE.MathUtils.lerp(s, target, delta * 6)));

    // ---- emoji spin (2D transform, since the emoji is billboarded) ----
    if (emojiRef.current) {
      if (cookingState === "correct") {
        spin.current += delta * 720; // deg/sec → ~1 full turn during the 0.8s cook
        emojiRef.current.style.transform = `rotate(${spin.current}deg)`;
      } else if (spin.current !== 0) {
        spin.current = 0;
        emojiRef.current.style.transform = "rotate(0deg)";
      }
    }

    // ---- glow pulse ----
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      const base = isTarget ? 0.28 : cooked ? 0.05 : 0.1;
      mat.opacity = base + pulse;
    }
  });

  const glowColor =
    cookingState === "wrong"
      ? "#e0453a"
      : isTarget
        ? "#e7b53a"
        : cooked
          ? "#4a7c59"
          : color;

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.1} />
      </mesh>

      {/* Invisible hit sphere carries the tap */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Billboard>
        <Html center style={{ pointerEvents: "none", userSelect: "none" }}>
          <div
            ref={emojiRef}
            style={{
              fontSize: "44px",
              lineHeight: 1,
              filter: isTarget
                ? `drop-shadow(0 0 16px ${glowColor}) brightness(1.2)`
                : cooked
                  ? `drop-shadow(0 0 6px ${glowColor}88) saturate(0.85)`
                  : "drop-shadow(0 0 4px rgba(0,0,0,0.3))",
              opacity: cooked ? 0.85 : 1,
            }}
          >
            {emoji}
          </div>
        </Html>
      </Billboard>

      {!assembling && (
        <Billboard position={[0, -0.75, 0]}>
          <Html center style={{ pointerEvents: "none", userSelect: "none" }}>
            <div
              style={{
                color: isTarget ? "#8a6a12" : "var(--foreground)",
                fontSize: "13px",
                fontWeight: isTarget ? 700 : 500,
                textAlign: "center",
                whiteSpace: "nowrap",
                background: isTarget ? "#e7b53a22" : "rgba(250,243,224,0.85)",
                padding: "3px 10px",
                borderRadius: "9999px",
                border: `1px solid ${isTarget ? "#e7b53a" : "var(--border)"}`,
              }}
            >
              {label}
              {cooked && " ✓"}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}

export default memo(CookingOrbitNode);
