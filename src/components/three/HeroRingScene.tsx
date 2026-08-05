'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Lightformer, Sparkles } from '@react-three/drei';
import type { Group } from 'three';

function GoldRing() {
  const ringRef = useRef<Group>(null);
  const accentRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.35;
      ringRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.4) * 0.12;
    }
    if (accentRef.current) {
      accentRef.current.rotation.y -= delta * 0.5;
    }
  });

  return (
    <group>
      <group ref={ringRef}>
        <mesh>
          <torusGeometry args={[1.35, 0.24, 48, 96]} />
          <meshPhysicalMaterial
            color="#cfa74b"
            metalness={1}
            roughness={0.18}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshPhysicalMaterial
            color="#fdf8ea"
            metalness={0}
            roughness={0.05}
            emissive="#fff7d6"
            emissiveIntensity={0.35}
            envMapIntensity={1.8}
          />
        </mesh>
        <Sparkles
          count={12}
          scale={[2.2, 2.2, 1]}
          position={[0, 1.35, 0]}
          size={4}
          speed={0.5}
          opacity={0.9}
          color="#fffbe8"
        />
      </group>

      <group ref={accentRef} rotation={[0.35, 0, 0]}>
        <mesh position={[0, -0.1, 0]}>
          <torusGeometry args={[1.7, 0.1, 32, 96]} />
          <meshPhysicalMaterial
            color="#9e7924"
            metalness={1}
            roughness={0.28}
            envMapIntensity={1.2}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function HeroRingScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3, 4, 5]}
          intensity={1.6}
          color="#fff3d6"
        />
        <pointLight position={[-4, -2, 3]} intensity={0.9} color="#cfa74b" />
        <pointLight position={[3, -3, -2]} intensity={0.6} color="#e7d7a3" />

        <Environment resolution={128}>
          <Lightformer
            intensity={2.2}
            position={[0, 5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[10, 1, 1]}
            color="#fff2cc"
          />
          <Lightformer
            intensity={1.6}
            position={[-5, 1, -1]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[6, 1, 1]}
            color="#cfa74b"
          />
          <Lightformer
            intensity={1.6}
            position={[5, 0, 1]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[6, 1, 1]}
            color="#e7d7a3"
          />
        </Environment>

        <Float speed={1.6} rotationIntensity={0.3} floatIntensity={1.1}>
          <GoldRing />
        </Float>

        <Sparkles
          count={70}
          scale={[7, 5, 4]}
          size={2.6}
          speed={0.35}
          opacity={0.55}
          color="#d8bc7a"
        />
      </Suspense>
    </Canvas>
  );
}
