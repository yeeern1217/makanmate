"use client";
import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Float, Stars, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { DishEntry } from "@/types/heritage";
import BlueprintNode from "@/components/blueprint/BlueprintNode";
import type { NodeCategory } from "@/components/blueprint/BlueprintNode";

function OrbitalRing({
  radius,
  speed,
  color,
  frozen = false,
  children,
}: {
  radius: number;
  speed: number;
  color: string;
  frozen?: boolean;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !frozen) {
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
    const y = (Math.sin(i * 2.399) * 0.5) * ySpread * 2;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number];
  });
}

const DEFAULT_CAM = new THREE.Vector3(0, 2, 7);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const _nodePos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _dir = new THREE.Vector3();

function CameraFocus({
  activeNodeId,
  nodeObjects,
  controlsRef,
}: {
  activeNodeId: string | null;
  nodeObjects: React.RefObject<Map<string, THREE.Object3D>>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const t = Math.min(1, delta * 3);

    const obj = activeNodeId ? nodeObjects.current?.get(activeNodeId) : null;
    if (obj) {
      obj.getWorldPosition(_nodePos);
      // Aim slightly below the node so it renders in the upper ~60% of the view.
      _target.copy(_nodePos).add(new THREE.Vector3(0, -0.8, 0));
      // Pull the camera in along the node's outward direction, lifted a little.
      _dir.copy(_nodePos).setY(0).normalize();
      _camGoal
        .copy(_nodePos)
        .add(_dir.multiplyScalar(3))
        .add(new THREE.Vector3(0, 1.2, 0));
    } else {
      _target.copy(DEFAULT_TARGET);
      _camGoal.copy(DEFAULT_CAM);
    }

    controls.target.lerp(_target, t);
    camera.position.lerp(_camGoal, t);
    controls.update();
  });

  return null;
}

export default function DishCanvas({
  dish,
  onNodeTap,
  activeNodeId,
  exploredNodeIds,
  paused = false,
}: {
  dish: DishEntry;
  onNodeTap: (id: string, category: NodeCategory) => void;
  activeNodeId: string | null;
  exploredNodeIds: string[];
  paused?: boolean;
}) {
  // Memoize so ring positions are computed once per dish — otherwise the
  // Math.random() inside distributeOnRing re-runs on every re-render (e.g. each
  // node tap), making all nodes teleport to new positions.
  const ingredientPositions = useMemo(
    () => distributeOnRing(dish.ingredients.length, 2.2),
    [dish.ingredients.length]
  );
  const techniquePositions = useMemo(
    () => distributeOnRing(dish.techniques?.length ?? 0, 3.4, 0.4),
    [dish.techniques?.length]
  );
  const dialectPositions = useMemo(
    () => distributeOnRing(dish.dialectPhrases?.length ?? 0, 4.4, 0.5),
    [dish.dialectPhrases?.length]
  );

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const nodeObjects = useRef<Map<string, THREE.Object3D>>(new Map());
  const registerObject = useCallback(
    (id: string, obj: THREE.Object3D | null) => {
      if (obj) nodeObjects.current.set(id, obj);
      else nodeObjects.current.delete(id);
    },
    []
  );

  return (
    <div style={{ width: "100%", height: "100%", visibility: paused ? "hidden" : "visible" }}>
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
        <Stars radius={50} count={600} factor={2} fade speed={0.5} />
        <fog attach="fog" args={["#faf3e0", 10, 25]} />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          autoRotate={activeNodeId === null}
          autoRotateSpeed={0.3}
          minDistance={4}
          maxDistance={12}
        />
        <CameraFocus
          activeNodeId={activeNodeId}
          nodeObjects={nodeObjects}
          controlsRef={controlsRef}
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
          />
        </Float>

        {/* Ring 1: Ingredients */}
        <OrbitalRing radius={2.2} speed={0.08} color="#4a7c59" frozen={activeNodeId !== null}>
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
                onSelect={onNodeTap}
                registerObject={registerObject}
              />
            </Float>
          ))}
        </OrbitalRing>

        {/* Ring 2: Techniques */}
        {dish.techniques && dish.techniques.length > 0 && (
          <OrbitalRing radius={3.4} speed={-0.05} color="#c4553a" frozen={activeNodeId !== null}>
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
                  onSelect={onNodeTap}
                  registerObject={registerObject}
                />
              </Float>
            ))}
          </OrbitalRing>
        )}

        {/* Ring 3: Migration Story (outermost — a special "story" node) */}
        <OrbitalRing radius={5.4} speed={0.03} color="#d4a947" frozen={activeNodeId !== null}>
          <Float speed={0.8} floatIntensity={0.2}>
            <BlueprintNode
              id={`${dish.id}-migration`}
              emoji="🧭"
              label="Migration Story"
              category="migration"
              position={[5.4, 0, 0]}
              isActive={activeNodeId === `${dish.id}-migration`}
              isExplored={exploredNodeIds.includes(`${dish.id}-migration`)}
              onSelect={onNodeTap}
              registerObject={registerObject}
            />
          </Float>
        </OrbitalRing>

        {/* Ring 4: Dialect Deck */}
        {dish.dialectPhrases && dish.dialectPhrases.length > 0 && (
          <OrbitalRing radius={4.4} speed={-0.04} color="#6b5ce7" frozen={activeNodeId !== null}>
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
                  onSelect={onNodeTap}
                  registerObject={registerObject}
                />
              </Float>
            ))}
          </OrbitalRing>
        )}
      </Canvas>
    </div>
  );
}
