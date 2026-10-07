'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { AgentNode, AgentWorkState } from './types';
import { createCharacter3D, CharacterMeshBundle } from './Character3DRenderer';

interface WorkforceSwarm3DProps {
  nodes: AgentNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  audioLevel?: number;
  isThinking?: boolean;
  className?: string;
  filterLevel?: 'all' | 'apex' | 'core' | 'coworker';
}

interface NodeMeshEntry {
  node: AgentNode;
  bundle: CharacterMeshBundle;
  podium: THREE.Group;
  worldX: number;
  worldY: number;
  worldZ: number;
  screenPos: { x: number; y: number; visible: boolean };
}

export const WorkforceSwarm3D: React.FC<WorkforceSwarm3DProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  audioLevel = 0,
  isThinking = false,
  className = '',
  filterLevel = 'all',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Camera & Orbit state
  const cameraAngleRef = useRef<{ rotX: number; rotY: number; zoom: number }>({
    rotX: 0.42,
    rotY: 0.0,
    zoom: 18.0,
  });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nodeEntriesRef = useRef<NodeMeshEntry[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 200);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.6);
    keyLight.position.set(10, 16, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 1.2);
    fillLight.position.set(-10, 8, 8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x9333ea, 2.0);
    rimLight.position.set(0, 10, -14);
    scene.add(rimLight);

    // 5. Main Central Dark Neumorphic Platform Base
    const mainPodiumGroup = new THREE.Group();

    // Large main platform
    const baseGeom = new THREE.CylinderGeometry(8.5, 9.2, 0.45, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141519'),
      roughness: 0.35,
      metalness: 0.15,
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = -0.25;
    mainPodiumGroup.add(baseMesh);

    // Outer glow ring
    const baseRingGeom = new THREE.TorusGeometry(8.8, 0.05, 16, 64);
    const baseRingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8b5cf6'),
      emissive: new THREE.Color('#7c3aed'),
      emissiveIntensity: 1.4,
    });
    const baseRing = new THREE.Mesh(baseRingGeom, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.01;
    mainPodiumGroup.add(baseRing);

    scene.add(mainPodiumGroup);

    // 6. Spawn Character Nodes
    const entries: NodeMeshEntry[] = [];
    const coreWorkers = nodes.filter((n) => n.level === 'core_worker');
    const totalCore = coreWorkers.length || 12;

    nodes.forEach((node) => {
      const isApex = node.level === 'apex_co_founder';
      const isCore = node.level === 'core_worker';
      const isCoworker = node.level === 'co_worker';

      // Visibility filter
      let isVisible = true;
      if (filterLevel === 'apex' && !isApex) isVisible = false;
      if (filterLevel === 'core' && !isCore) isVisible = false;
      if (filterLevel === 'coworker' && !isCoworker) isVisible = false;

      // Position Calculation
      let posX = 0;
      let posZ = 0;
      let posY = 0;

      if (isApex) {
        posX = 0;
        posZ = 0;
        posY = 0.6;
      } else if (isCore) {
        // Arrange core workers in a smooth circular formation around Co-Founder
        const index = coreWorkers.findIndex((w) => w.id === node.id);
        const angle = (index / totalCore) * Math.PI * 2 - Math.PI / 2;
        const radius = 6.0;
        posX = Math.cos(angle) * radius;
        posZ = Math.sin(angle) * radius;
        posY = 0.15 + Math.sin(index) * 0.1;
      } else {
        // Specialized Co-Workers orbit slightly outside Worker 2 Marketing
        const parent =
          nodes.find((n) => n.id === node.parentId) || coreWorkers[1];
        const parentIdx =
          coreWorkers.findIndex((w) => w.id === parent?.id) || 1;
        const parentAngle = (parentIdx / totalCore) * Math.PI * 2 - Math.PI / 2;
        const subIndex = parseInt(node.id.replace(/\D/g, '') || '1', 10) || 1;
        const subAngle = parentAngle + (subIndex - 2) * 0.28;
        posX = Math.cos(subAngle) * 7.8;
        posZ = Math.sin(subAngle) * 7.8;
        posY = 0.4;
      }

      // Small character pedestal disc
      const podGroup = new THREE.Group();
      const podGeom = new THREE.CylinderGeometry(
        isApex ? 1.6 : 0.85,
        isApex ? 1.8 : 0.95,
        0.22,
        32
      );
      const podMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isApex ? '#1f2128' : '#18191f'),
        roughness: 0.3,
        metalness: 0.2,
      });
      const podMesh = new THREE.Mesh(podGeom, podMat);
      podMesh.position.y = -0.11;
      podGroup.add(podMesh);

      // Glowing rim on pedestal
      const podRimGeom = new THREE.TorusGeometry(
        isApex ? 1.62 : 0.86,
        0.025,
        12,
        32
      );
      const podRimMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.accentColor),
        emissive: new THREE.Color(node.accentColor),
        emissiveIntensity: isApex ? 2.2 : 1.5,
      });
      const podRim = new THREE.Mesh(podRimGeom, podRimMat);
      podRim.rotation.x = Math.PI / 2;
      podRim.position.y = 0.01;
      podGroup.add(podRim);

      podGroup.position.set(posX, posY, posZ);
      scene.add(podGroup);

      // 3D Character
      const bundle = createCharacter3D({
        roleId: node.id,
        name: node.name,
        baseColor: node.color,
        accentColor: node.accentColor,
        isApex,
        size: isApex ? 0.9 : 0.58,
      });
      bundle.group.position.set(posX, posY, posZ);
      scene.add(bundle.group);

      if (!isVisible) {
        bundle.group.visible = false;
        podGroup.visible = false;
      }

      entries.push({
        node,
        bundle,
        podium: podGroup,
        worldX: posX,
        worldY: posY,
        worldZ: posZ,
        screenPos: { x: 0, y: 0, visible: true },
      });
    });

    nodeEntriesRef.current = entries;

    // 7. Synapses / Neural Lines between Co-Founder and Core Workers
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.35,
    });
    const lineGeom = new THREE.BufferGeometry();
    const linePositions: number[] = [];

    entries.forEach((e) => {
      if (e.node.level !== 'apex_co_founder') {
        // from center to worker
        linePositions.push(0, 0.6, 0);
        linePositions.push(e.worldX, e.worldY + 0.5, e.worldZ);
      }
    });

    lineGeom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3)
    );
    const linesMesh = new THREE.LineSegments(lineGeom, lineMat);
    scene.add(linesMesh);

    // 8. Animation & Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Smooth camera orbit
      const { rotX, rotY, zoom } = cameraAngleRef.current;
      const camDist = zoom;
      camera.position.x = camDist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = camDist * Math.sin(rotX);
      camera.position.z = camDist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 0.6, 0);

      // Update all characters
      entries.forEach((entry) => {
        const isSelected = entry.node.id === selectedNodeId;
        const isHovered = entry.node.id === hoveredNodeIdRef.current;

        // Dynamic state mapping
        entry.bundle.state = entry.node.state;

        // If Co-Founder, pass live audioLevel
        const charAudio =
          entry.node.level === 'apex_co_founder' ? audioLevel : 0;
        entry.bundle.update(time, delta, charAudio);

        // Highlight selected node
        if (isSelected || isHovered) {
          entry.bundle.group.scale.set(
            (entry.node.level === 'apex_co_founder' ? 0.95 : 0.65) * 1.1,
            (entry.node.level === 'apex_co_founder' ? 0.95 : 0.65) * 1.1,
            (entry.node.level === 'apex_co_founder' ? 0.95 : 0.65) * 1.1
          );
        } else {
          entry.bundle.group.scale.set(
            entry.node.level === 'apex_co_founder' ? 0.9 : 0.58,
            entry.node.level === 'apex_co_founder' ? 0.9 : 0.58,
            entry.node.level === 'apex_co_founder' ? 0.9 : 0.58
          );
        }
      });

      // Subtle slow auto rotation if not dragging
      if (!isDraggingRef.current) {
        cameraAngleRef.current.rotY += 0.0008;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      entries.forEach((e) => e.bundle.dispose());
      renderer.dispose();
    };
  }, [nodes, filterLevel, selectedNodeId, audioLevel]);

  // Mouse drag to orbit camera
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    cameraAngleRef.current.rotY -= deltaX * 0.007;
    cameraAngleRef.current.rotX = Math.max(
      0.15,
      Math.min(1.2, cameraAngleRef.current.rotX + deltaY * 0.007)
    );
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.zoom = Math.max(
      10,
      Math.min(26, cameraAngleRef.current.zoom + e.deltaY * 0.015)
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative h-[380px] w-full cursor-grab select-none overflow-hidden rounded-3xl border border-neutral-800/80 bg-midnight-bg shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] active:cursor-grabbing md:h-[520px] ${className}`}
    >
      {/* Background Radial Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)]" />

      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Interactive Quick-Select HUD Strip at Bottom */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/90 p-2 shadow-2xl backdrop-blur-xl">
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto py-0.5">
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const isApex = node.level === 'apex_co_founder';

            return (
              <button
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border border-neutral-700 bg-neutral-800 text-white shadow-md'
                    : 'text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200'
                }`}
                style={{
                  borderLeft: isSelected
                    ? `3px solid ${node.accentColor}`
                    : undefined,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: node.accentColor }}
                />
                <span className="font-semibold">
                  {node.name.replace('Worker ', 'W')}
                </span>
                {node.state === 'executing' && (
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Camera Tip Badge */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 font-mono text-[10px] text-neutral-400 backdrop-blur-md">
        <span>🖱️ Drag to orbit • Scroll to zoom</span>
      </div>
    </div>
  );
};
