"use client";
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import * as THREE from "three";

export type NodeCategory = "ingredient" | "technique" | "migration" | "dialect";

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  ingredient: "#4a7c59",
  technique: "#c4553a",
  migration: "#d4a947",
  dialect: "#6b5ce7",
};

const CATEGORY_GLOW_OPACITY: Record<NodeCategory, number> = {
  ingredient: 0.08,
  technique: 0.12,
  migration: 0.15,
  dialect: 0.1,
};

function BlueprintNode({
  id,
  emoji,
  label,
  category,
  position,
  isActive,
  isExplored,
  onSelect,
}: {
  id: string;
  emoji: string;
  label: string;
  category: NodeCategory;
  position: [number, number, number];
  isActive: boolean;
  isExplored: boolean;
  onSelect?: (id: string, category: NodeCategory) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const color = CATEGORY_COLORS[category];

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const targetScale = isActive ? 1.3 : 1.0;
    const s = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(s, targetScale, delta * 5));

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05;
      mat.opacity = (isActive ? 0.25 : CATEGORY_GLOW_OPACITY[category]) + pulse;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      <Billboard>
        <Html center style={{ pointerEvents: onSelect ? "auto" : "none", userSelect: "none" }}>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelect?.(id, category); }}
            style={{
              cursor: onSelect ? "pointer" : "default",
              fontSize: "44px",
              lineHeight: 1,
              filter: isActive
                ? `drop-shadow(0 0 16px ${color}) brightness(1.2)`
                : isExplored
                  ? `drop-shadow(0 0 8px ${color}88) brightness(1.1)`
                  : "drop-shadow(0 0 4px rgba(0,0,0,0.3))",
              opacity: isExplored || isActive ? 1 : 0.7,
              transform: isActive ? "scale(1.15)" : "scale(1)",
              transition: "all 0.3s",
            }}
          >
            {emoji}
          </div>
        </Html>
      </Billboard>

      <Billboard position={[0, -0.75, 0]}>
        <Html center style={{ pointerEvents: onSelect ? "auto" : "none", userSelect: "none" }}>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSelect?.(id, category); }}
            style={{
              cursor: onSelect ? "pointer" : "default",
              color: isActive ? color : "var(--foreground)",
              fontSize: "14px",
              fontWeight: isActive ? 700 : 500,
              textAlign: "center",
              whiteSpace: "nowrap",
              background: isActive ? `${color}22` : "rgba(250,243,224,0.85)",
              padding: "4px 12px",
              borderRadius: "9999px",
              border: `1px solid ${isActive ? color : "var(--border)"}`,
              transition: "all 0.3s",
            }}
          >
            {label}
            {isExplored && " ✓"}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

export default memo(BlueprintNode);
