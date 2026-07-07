"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import * as THREE from "three";
import { IngredientNode } from "@/types/heritage";

export default function VictoryIngredients({ ingredients }: { ingredients: IngredientNode[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.2, 0]}>
      {ingredients.map((ing, i) => {
        const angle = (i / ingredients.length) * Math.PI * 2;
        const radius = 1.8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(angle * 2) * 0.3;

        return (
          <group key={ing.id} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[0.4, 12, 12]} />
              <meshBasicMaterial color={ing.color} transparent opacity={0.12} />
            </mesh>
            <Billboard>
              <Html center style={{ pointerEvents: "none", userSelect: "none" }}>
                <div style={{
                  fontSize: "36px",
                  lineHeight: 1,
                  filter: "drop-shadow(0 0 8px rgba(255,215,0,0.6))",
                }}>
                  {ing.emoji}
                </div>
              </Html>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
