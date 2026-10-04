'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { createCharacter3D, CharacterMeshBundle } from './Character3DRenderer';
import { AgentWorkState } from './types';

interface Cofounder3DCharacterProps {
  roleId?: string;
  name?: string;
  baseColor?: string;
  accentColor?: string;
  isApex?: boolean;
  state?: AgentWorkState;
  audioLevel?: number;
  size?: number; // width/height in px
  interactive?: boolean;
  className?: string;
  showPodium?: boolean;
  onClick?: () => void;
}

export const Cofounder3DCharacter: React.FC<Cofounder3DCharacterProps> = ({
  roleId = 'co_founder',
  name = 'Ruhvi AI Co-Founder',
  baseColor = '#8b5cf6',
  accentColor = '#a855f7',
  isApex = true,
  state = 'idle',
  audioLevel = 0,
  size = 320,
  interactive = true,
  className = '',
  showPodium = true,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bundleRef = useRef<CharacterMeshBundle | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, isApex ? 2.0 : 1.7, isApex ? 5.2 : 4.4);
    camera.lookAt(0, isApex ? 1.4 : 1.2, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // 4. Lighting Rig
    // Soft Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Key Specular Light (Top-Left)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    // Fill Light (Right)
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    // Rim Backlight (Behind)
    const rimLight = new THREE.DirectionalLight(
      new THREE.Color(accentColor),
      2.2
    );
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // 5. Neumorphic Podium Platform (if enabled)
    let podiumGroup: THREE.Group | undefined;
    if (showPodium) {
      podiumGroup = new THREE.Group();

      // Raised Disc Pedestal
      const podiumGeom = new THREE.CylinderGeometry(1.8, 2.0, 0.28, 48);
      const podiumMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#16181d'),
        roughness: 0.4,
        metalness: 0.2,
      });
      const podium = new THREE.Mesh(podiumGeom, podiumMat);
      podium.position.y = -0.14;
      podiumGroup.add(podium);

      // Glowing Rim Ring
      const rimGeom = new THREE.TorusGeometry(1.82, 0.03, 16, 48);
      const rimMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        emissive: new THREE.Color(accentColor),
        emissiveIntensity: 1.8,
      });
      const rim = new THREE.Mesh(rimGeom, rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.01;
      podiumGroup.add(rim);

      scene.add(podiumGroup);
    }

    // 6. Character Mesh Bundle
    const bundle = createCharacter3D({
      roleId,
      name,
      baseColor,
      accentColor,
      isApex,
      size: 1.0,
    });
    scene.add(bundle.group);
    bundleRef.current = bundle;

    // 7. Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const delta = clock.getDelta();

      bundle.state = state;
      bundle.update(time, delta, audioLevel, pointerPosRef.current);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      bundle.dispose();
      renderer.dispose();
    };
  }, [roleId, name, baseColor, accentColor, isApex, showPodium, size]);

  // Update live state in running bundle
  useEffect(() => {
    if (bundleRef.current) {
      bundleRef.current.state = state;
    }
  }, [state]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointerPosRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    pointerPosRef.current = { x: 0, y: 0 };
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative flex cursor-pointer select-none items-center justify-center transition-transform duration-300 ${
        isHovered ? 'scale-105' : 'scale-100'
      } ${className}`}
    >
      {/* Neumorphic Ambient Shadow & Glow Ring */}
      <div
        className="pointer-events-none absolute inset-4 rounded-full opacity-40 blur-2xl transition-opacity duration-300"
        style={{
          backgroundColor: accentColor,
          opacity: state === 'speaking' ? 0.6 : isHovered ? 0.5 : 0.25,
        }}
      />

      <canvas ref={canvasRef} className="relative z-10 block h-full w-full" />
    </div>
  );
};
