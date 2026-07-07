"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Stars, Environment } from "@react-three/drei";
import { DishEntry } from "@/types/heritage";
import IngredientModel from "./IngredientModel";

export default function DishCanvas({
  dish,
  onIngredientTap,
  activeIngredientId,
}: {
  dish: DishEntry;
  onIngredientTap: (id: string) => void;
  activeIngredientId: string | null;
}) {
  return (
    <div style={{ width: "100%", height: "60vh" }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#39ff14" />
        <pointLight position={[-5, -3, 3]} intensity={1} color="#ffd700" />
        <pointLight position={[0, -5, 0]} intensity={0.5} color="#4285f4" />
        <spotLight position={[0, 8, 0]} intensity={0.8} angle={0.5} penumbra={1} color="#ffffff" />
        <Environment preset="night" />
        <Stars radius={50} count={1000} factor={3} fade speed={1} />
        <fog attach="fog" args={["#0d0d1a", 8, 20]} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={3}
          maxDistance={10}
        />
        {dish.ingredients.map((ing) => (
          <Float key={ing.id} speed={1.5} floatIntensity={0.6} rotationIntensity={0.3}>
            <IngredientModel
              ingredient={ing}
              isActive={activeIngredientId === ing.id}
              onClick={() => onIngredientTap(ing.id)}
            />
          </Float>
        ))}
      </Canvas>
    </div>
  );
}
