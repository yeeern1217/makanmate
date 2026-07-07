"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function WokModel({ ingredientsCooked }: { ingredientsCooked: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowIntensity = 0.1 + ingredientsCooked * 0.1;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Wok bowl */}
      <mesh rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[1.2, 0.6, 0.5, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#2a2a2a"
          metalness={0.9}
          roughness={0.3}
          side={THREE.DoubleSide}
          emissive="#ff4500"
          emissiveIntensity={glowIntensity}
        />
      </mesh>

      {/* Wok rim */}
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[1.2, 0.06, 16, 64]} />
        <meshPhysicalMaterial
          color="#3a3a3a"
          metalness={0.95}
          roughness={0.2}
          emissive="#ffd700"
          emissiveIntensity={glowIntensity * 0.5}
        />
      </mesh>

      {/* Left handle */}
      <mesh position={[-1.4, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.8} />
      </mesh>

      {/* Right handle */}
      <mesh position={[1.4, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
        <meshStandardMaterial color="#5a3a20" roughness={0.8} />
      </mesh>

      {/* Fire glow under wok */}
      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#ff4500"
          transparent
          opacity={0.05 + glowIntensity * 0.15}
        />
      </mesh>

      {/* Inner glow (cooking surface) */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.03 + glowIntensity * 0.08}
        />
      </mesh>
    </group>
  );
}
