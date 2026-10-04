'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AgentNode, NeuralSynapse } from './types';

interface GrokDots3DCanvasProps {
  nodes: AgentNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  audioLevel?: number; // 0..1 from live voice or simulated activity
  isThinking?: boolean;
  className?: string;
  viewMode?: 'galaxy' | 'hierarchy' | 'focused';
}

interface Particle3D {
  baseX: number;
  baseY: number;
  baseZ: number;
  u: number;
  v: number;
  size: number;
  phase: number;
  speed: number;
}

interface NodeSimulation {
  node: AgentNode;
  particles: Particle3D[];
  worldX: number;
  worldY: number;
  worldZ: number;
  screenX: number;
  screenY: number;
  screenRadius: number;
  screenScale: number;
  visible: boolean;
}

export const GrokDots3DCanvas: React.FC<GrokDots3DCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  audioLevel = 0,
  isThinking = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera angles & interaction
  const [rotX, setRotX] = useState<number>(0.28);
  const [rotY, setRotY] = useState<number>(0.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoOrbitRef = useRef<boolean>(true);
  const hoveredNodeIdRef = useRef<string | null>(null);

  // Particles generator for an agent body
  const generateParticlesForNode = useCallback((node: AgentNode): Particle3D[] => {
    const list: Particle3D[] = [];
    const count = node.dotCount;
    const r = node.radius;

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution on a sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      list.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        u: phi,
        v: theta,
        size: 1.2 + (i % 3) * 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.6,
      });
    }
    return list;
  }, []);

  // Neural Synapses
  const synapsesRef = useRef<NeuralSynapse[]>([]);
  useEffect(() => {
    const synList: NeuralSynapse[] = [];
    nodes.forEach((n) => {
      if (n.parentId) {
        synList.push({
          fromId: n.parentId,
          toId: n.id,
          activityLevel: n.state !== 'idle' ? 0.9 : 0.25,
          packets: [
            { progress: 0.1, speed: 0.008 + Math.random() * 0.006, color: n.accentColor },
            { progress: 0.6, speed: 0.007 + Math.random() * 0.005, color: n.color },
          ],
        });
      }
    });
    synapsesRef.push = () => 0; // retain type
    synapsesRef.current = synList;
  }, [nodes]);

  // Main 3D render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;

    // Cache node simulation bodies
    const nodeSims: NodeSimulation[] = nodes.map((n) => ({
      node: n,
      particles: generateParticlesForNode(n),
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      screenX: 0,
      screenY: 0,
      screenRadius: 0,
      screenScale: 0,
      visible: true,
    }));

    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      time += 0.016;

      if (autoOrbitRef.current && !isDragging) {
        setRotY((prev) => prev + 0.002);
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const cx = width / 2;
      const cy = height / 2;
      const fov = 420;

      ctx.clearRect(0, 0, width, height);

      // 1. Calculate World Positions based on Hierarchy & Orbit
      const nodeMap = new Map<string, NodeSimulation>();

      nodeSims.forEach((sim) => {
        const n = sim.node;
        if (n.level === 'apex_co_founder') {
          sim.worldX = 0;
          sim.worldY = 0;
          sim.worldZ = 0;
        } else if (n.level === 'core_worker') {
          const currentAngle = n.orbitAngle + time * n.orbitSpeed * 15;
          sim.worldX = Math.cos(currentAngle) * n.orbitRadius;
          sim.worldZ = Math.sin(currentAngle) * n.orbitRadius;
          sim.worldY = n.orbitElevation + Math.sin(time * 0.8 + n.orbitAngle) * 8;
        } else if (n.level === 'co_worker') {
          const parentSim = nodeMap.get(n.parentId || 'worker_2');
          const px = parentSim ? parentSim.worldX : 0;
          const py = parentSim ? parentSim.worldY : 0;
          const pz = parentSim ? parentSim.worldZ : 0;

          const subAngle = n.orbitAngle + time * n.orbitSpeed * 20;
          sim.worldX = px + Math.cos(subAngle) * n.orbitRadius;
          sim.worldZ = pz + Math.sin(subAngle) * n.orbitRadius;
          sim.worldY = py + n.orbitElevation + Math.sin(time * 1.2 + n.orbitAngle) * 5;
        }

        // Apply camera rotation (Euler Y then X)
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        // Rotate around Y
        const x1 = sim.worldX * cosY - sim.worldZ * sinY;
        const z1 = sim.worldX * sinY + sim.worldZ * cosY;
        const y1 = sim.worldY;

        // Rotate around X
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // 3D Perspective Projection
        const scale = fov / (fov + z2 + 350);
        sim.screenX = cx + x1 * scale;
        sim.screenY = cy + y2 * scale;
        sim.screenScale = scale;
        sim.screenRadius = sim.node.radius * scale;
        sim.visible = z2 > -fov;

        nodeMap.set(n.id, sim);
      });

      // 2. Draw Synapses (Neural Laser Arcs with Moving Energy Packets)
      synapsesRef.current.forEach((syn) => {
        const fromSim = nodeMap.get(syn.fromId);
        const toSim = nodeMap.get(syn.toId);
        if (!fromSim || !toSim || !fromSim.visible || !toSim.visible) return;

        // Draw connecting laser line
        ctx.beginPath();
        ctx.moveTo(fromSim.screenX, fromSim.screenY);
        ctx.lineTo(toSim.screenX, toSim.screenY);

        const isActive = toSim.node.state !== 'idle' || isThinking;
        ctx.strokeStyle = isActive
          ? `rgba(245, 158, 11, ${0.15 + (fromSim.screenScale + toSim.screenScale) * 0.15})`
          : `rgba(120, 113, 108, ${0.08 * fromSim.screenScale})`;
        ctx.lineWidth = isActive ? 1.5 * fromSim.screenScale : 0.8 * fromSim.screenScale;
        ctx.setLineDash(isActive ? [4, 6] : [2, 8]);
        ctx.lineDashOffset = -time * 30;
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Draw traveling neural packets
        syn.packets.forEach((packet) => {
          packet.progress += packet.speed;
          if (packet.progress > 1) packet.progress = 0;

          const px = fromSim.screenX + (toSim.screenX - fromSim.screenX) * packet.progress;
          const py = fromSim.screenY + (toSim.screenY - fromSim.screenY) * packet.progress;
          const pScale = fromSim.screenScale + (toSim.screenScale - fromSim.screenScale) * packet.progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.2 * pScale, 0, Math.PI * 2);
          ctx.fillStyle = packet.color;
          ctx.shadowColor = packet.color;
          ctx.shadowBlur = 6 * pScale;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        });
      });

      // 3. Sort Nodes by Depth for Crisp Z-Buffering
      const sortedSims = [...nodeSims].sort((a, b) => {
        return a.screenScale - b.screenScale;
      });

      // 4. Render Grok Dots Particle Entities
      sortedSims.forEach((sim) => {
        if (!sim.visible) return;
        const n = sim.node;
        const isSelected = n.id === selectedNodeId;
        const isHovered = n.id === hoveredNodeIdRef.current;
        const nodeAudio = n.level === 'apex_co_founder' ? audioLevel : 0;

        // Dynamic breathing & wave frequency
        const breathe = Math.sin(time * 2 * sim.node.orbitSpeed * 100 + time) * 0.08;
        const activityPulse = n.state !== 'idle' ? 1 + Math.sin(time * 6) * 0.12 : 1;
        const totalExpansion = (1 + breathe + nodeAudio * 0.4) * activityPulse;

        // Outer Aura Glow for selected/active nodes
        if (isSelected || isHovered || n.state !== 'idle') {
          const glowRadius = sim.screenRadius * (1.8 + nodeAudio * 0.5);
          const gradient = ctx.createRadialGradient(
            sim.screenX,
            sim.screenY,
            0,
            sim.screenX,
            sim.screenY,
            glowRadius
          );
          gradient.addColorStop(0, `${n.color}40`);
          gradient.addColorStop(0.6, `${n.color}15`);
          gradient.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(sim.screenX, sim.screenY, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Selection Target Ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(sim.screenX, sim.screenY, sim.screenRadius * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = n.accentColor;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([3, 4]);
          ctx.lineDashOffset = -time * 20;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Render Individual Dot Matrix Body (Grok Dots)
        const cosY = Math.cos(rotY + time * 0.3 * (n.level === 'apex_co_founder' ? 1 : 0.5));
        const sinY = Math.sin(rotY + time * 0.3 * (n.level === 'apex_co_founder' ? 1 : 0.5));
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        sim.particles.forEach((p) => {
          // Dynamic harmonic distortion
          const wave =
            Math.sin(time * p.speed + p.phase + (n.state !== 'idle' ? time * 4 : 0)) * 2.5;
          const px0 = (p.baseX + wave) * totalExpansion;
          const py0 = (p.baseY + wave) * totalExpansion;
          const pz0 = (p.baseZ + wave) * totalExpansion;

          // Local rotation
          const px1 = px0 * cosY - pz0 * sinY;
          const pz1 = px0 * sinY + pz0 * cosY;
          const py1 = py0;

          const py2 = py1 * cosX - pz1 * sinX;
          const pz2 = py1 * sinX + pz1 * cosX;

          // Project to 2D
          const screenDotX = sim.screenX + px1 * sim.screenScale;
          const screenDotY = sim.screenY + py2 * sim.screenScale;
          const dotRadius = Math.max(0.6, p.size * sim.screenScale * (pz2 > 0 ? 1.3 : 0.8));

          const dotAlpha = pz2 > 0 ? 0.95 : 0.35;

          ctx.beginPath();
          ctx.arc(screenDotX, screenDotY, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? '#ffffff'
            : pz2 > 0
            ? n.accentColor
            : `${n.color}${Math.floor(dotAlpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
        });

        // 5. Projected 3D HUD Label & Status Badge
        const labelY = sim.screenY + sim.screenRadius + 14 * sim.screenScale;
        ctx.font = `${Math.max(9, Math.floor(11 * sim.screenScale))}px monospace`;
        ctx.textAlign = 'center';

        // Draw Name
        ctx.fillStyle = isSelected ? '#ffffff' : isHovered ? n.accentColor : '#a8a29e';
        ctx.fillText(n.name, sim.screenX, labelY);

        // Draw State Indicator Dot
        const statusColor =
          n.state === 'executing' || n.state === 'generating'
            ? '#10b981'
            : n.state === 'waiting_approval'
            ? '#f97316'
            : n.state === 'analyzing'
            ? '#38bdf8'
            : '#78716c';

        ctx.beginPath();
        ctx.arc(sim.screenX - ctx.measureText(n.name).width / 2 - 7, labelY - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = statusColor;
        ctx.fill();
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [nodes, selectedNodeId, rotX, rotY, isDragging, audioLevel, isThinking, generateParticlesForNode]);

  // Handle Mouse / Touch Interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    autoOrbitRef.current = false;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    if (isDragging) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setRotY((prev) => prev + dx * 0.007);
      setRotX((prev) => Math.max(-0.8, Math.min(0.8, prev + dy * 0.007)));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[480px] bg-stone-950/90 rounded-2xl border border-stone-800 overflow-hidden select-none cursor-grab active:cursor-grabbing ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Starfield Ambient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Minimalist Top HUD Overlay Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-800 backdrop-blur-md px-3 py-1.5 rounded-xl pointer-events-auto shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-stone-200">
            3D AI Swarm Motion Engine
          </span>
          <span className="text-[10px] text-stone-400 font-mono pl-1 border-l border-stone-700">
            60 FPS • Grok Dots Body
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => {
              autoOrbitRef.current = !autoOrbitRef.current;
            }}
            className="px-2.5 py-1 bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-[11px] font-mono text-stone-300 rounded-lg backdrop-blur-md transition shadow"
          >
            Orbit: {autoOrbitRef.current ? 'ON' : 'PAUSED'}
          </button>
          <button
            onClick={() => {
              setRotX(0.28);
              setRotY(0.0);
            }}
            className="px-2.5 py-1 bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-[11px] font-mono text-stone-300 rounded-lg backdrop-blur-md transition shadow"
          >
            Reset Camera
          </button>
        </div>
      </div>

      {/* Bottom Node Quick Selector Bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center gap-1.5 overflow-x-auto pb-1 pointer-events-auto no-scrollbar">
        {nodes.map((n) => {
          const isSel = n.id === selectedNodeId;
          return (
            <button
              key={n.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(n.id);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition border ${
                isSel
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-lg'
                  : 'bg-stone-900/70 border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: n.color }}
              />
              <span>{n.name.split(':')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
