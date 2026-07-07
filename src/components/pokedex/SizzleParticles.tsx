"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 12;

export default function SizzleParticles() {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(0);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      angle: (i / PARTICLE_COUNT) * Math.PI * 2,
      speed: 0.5 + (i % 3) * 0.3,
      spread: 0.3 + (i % 4) * 0.15,
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (startTime.current === 0) startTime.current = state.clock.elapsedTime;

    const elapsed = state.clock.elapsedTime - startTime.current;
    const children = groupRef.current.children as THREE.Mesh[];

    children.forEach((mesh, i) => {
      const p = particles[i];
      const t = Math.min(elapsed / 0.6, 1);
      mesh.position.x = Math.cos(p.angle) * p.spread * t * 2;
      mesh.position.y = t * p.speed * 2 + 0.2;
      mesh.position.z = Math.sin(p.angle) * p.spread * t * 2;

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - t);
      mesh.scale.setScalar(Math.max(0.01, (1 - t) * 0.8));
    });
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#ff6600" : "#ffd700"}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
}
