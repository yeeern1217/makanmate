"use client";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Stars, Environment } from "@react-three/drei";
import * as THREE from "three";
import { DishEntry } from "@/types/heritage";
import IngredientModel from "./IngredientModel";
import BlueprintNode from "@/components/blueprint/BlueprintNode";
import type { NodeCategory } from "@/components/blueprint/BlueprintNode";

function OrbitalRing({
  radius,
  speed,
  color,
  children,
}: {
  radius: number;
  speed: number;
  color: string;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );
}

function distributeOnRing(count: number, radius: number, ySpread: number = 0.3): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const y = (Math.random() - 0.5) * ySpread * 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number];
  });
}

export default function DishCanvas({
  dish,
  onNodeTap,
  activeNodeId,
  exploredNodeIds,
}: {
  dish: DishEntry;
  onNodeTap: (id: string, category: NodeCategory) => void;
  activeNodeId: string | null;
  exploredNodeIds: string[];
}) {
  const ingredientPositions = distributeOnRing(dish.ingredients.length, 2.0);
  const techniquePositions = distributeOnRing(dish.techniques?.length ?? 0, 3.2, 0.4);
  const dialectPositions = distributeOnRing(dish.dialectPhrases?.length ?? 0, 4.4, 0.5);

  return (
    <div style={{ width: "100%", height: "60vh" }}>
      <Canvas
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
        <Stars radius={50} count={600} factor={2} fade speed={0.5} />
        <fog attach="fog" args={["#faf3e0", 10, 25]} />

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={4}
          maxDistance={12}
        />

        {/* Center dish emoji */}
        <Float speed={1} floatIntensity={0.3}>
          <BlueprintNode
            id="center"
            emoji={dish.emoji}
            label={dish.name}
            category="ingredient"
            position={[0, 0, 0]}
            isActive={false}
            isExplored={true}
            onClick={() => {}}
          />
        </Float>

        {/* Ring 1: Ingredients */}
        <OrbitalRing radius={2.0} speed={0.08} color="#4a7c59">
          {dish.ingredients.map((ing, i) => (
            <Float key={ing.id} speed={1.5} floatIntensity={0.4}>
              <BlueprintNode
                id={ing.id}
                emoji={ing.emoji}
                label={ing.name}
                category="ingredient"
                position={ingredientPositions[i]}
                isActive={activeNodeId === ing.id}
                isExplored={exploredNodeIds.includes(ing.id)}
                onClick={() => onNodeTap(ing.id, "ingredient")}
              />
            </Float>
          ))}
        </OrbitalRing>

        {/* Ring 2: Techniques */}
        {dish.techniques && dish.techniques.length > 0 && (
          <OrbitalRing radius={3.2} speed={-0.05} color="#c4553a">
            {dish.techniques.map((tech, i) => (
              <Float key={tech.id} speed={1.2} floatIntensity={0.3}>
                <BlueprintNode
                  id={tech.id}
                  emoji={tech.emoji}
                  label={tech.name}
                  category="technique"
                  position={techniquePositions[i]}
                  isActive={activeNodeId === tech.id}
                  isExplored={exploredNodeIds.includes(tech.id)}
                  onClick={() => onNodeTap(tech.id, "technique")}
                />
              </Float>
            ))}
          </OrbitalRing>
        )}

        {/* Ring 3: Migration Story */}
        <OrbitalRing radius={3.8} speed={0.03} color="#d4a947">
          <Float speed={0.8} floatIntensity={0.2}>
            <BlueprintNode
              id={`${dish.id}-migration`}
              emoji="🧭"
              label="Migration Story"
              category="migration"
              position={[3.8, 0, 0]}
              isActive={activeNodeId === `${dish.id}-migration`}
              isExplored={exploredNodeIds.includes(`${dish.id}-migration`)}
              onClick={() => onNodeTap(`${dish.id}-migration`, "migration")}
            />
          </Float>
        </OrbitalRing>

        {/* Ring 4: Dialect Deck */}
        {dish.dialectPhrases && dish.dialectPhrases.length > 0 && (
          <OrbitalRing radius={4.4} speed={-0.04} color="#6b5ce7">
            {dish.dialectPhrases.map((dp, i) => (
              <Float key={`dialect-${i}`} speed={1} floatIntensity={0.3}>
                <BlueprintNode
                  id={`${dish.id}-dialect-${i}`}
                  emoji="💬"
                  label={dp.phrase}
                  category="dialect"
                  position={dialectPositions[i]}
                  isActive={activeNodeId === `${dish.id}-dialect-${i}`}
                  isExplored={exploredNodeIds.includes(`${dish.id}-dialect-${i}`)}
                  onClick={() => onNodeTap(`${dish.id}-dialect-${i}`, "dialect")}
                />
              </Float>
            ))}
          </OrbitalRing>
        )}
      </Canvas>
    </div>
  );
}
