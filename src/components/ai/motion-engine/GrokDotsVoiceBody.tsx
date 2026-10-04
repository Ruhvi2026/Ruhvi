'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface CoWorkerDotInfo {
  id: string;
  name: string;
  shortName: string;
  level: 'apex' | 'worker' | 'coworker';
  color: string;
  accentColor: string;
  parentId?: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitElevation: number;
  state?: 'idle' | 'executing' | 'analyzing' | 'speaking';
}

interface GrokDotsVoiceBodyProps {
  audioLevel?: number; // 0..1
  state?: 'idle' | 'listening' | 'speaking' | 'connecting' | 'error';
  className?: string;
  size?: number; // px width & height
  interactive?: boolean;
  onSelectNode?: (nodeId: string) => void;
}

interface DotParticle {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  size: number;
  phase: number;
  speed: number;
}

// 12 Core Workers + 6 Marketing Co-Workers preset definition
export const CO_WORKER_PRESETS: CoWorkerDotInfo[] = [
  // 12 Core Workers
  {
    id: 'worker_1',
    name: 'Worker 1: Analytics',
    shortName: 'Analytics',
    level: 'worker',
    color: '#38bdf8',
    accentColor: '#7dd3fc',
    orbitRadius: 105,
    orbitSpeed: 0.0035,
    orbitAngle: 0,
    orbitElevation: -18,
    state: 'analyzing',
  },
  {
    id: 'worker_2',
    name: 'Worker 2: Marketing Swarm',
    shortName: 'Marketing',
    level: 'worker',
    color: '#f59e0b',
    accentColor: '#fbbf24',
    orbitRadius: 125,
    orbitSpeed: 0.0028,
    orbitAngle: ((Math.PI * 2) / 12) * 1,
    orbitElevation: 22,
    state: 'executing',
  },
  {
    id: 'worker_3',
    name: 'Worker 3: Inventory & Supply',
    shortName: 'Inventory',
    level: 'worker',
    color: '#10b981',
    accentColor: '#6ee7b7',
    orbitRadius: 110,
    orbitSpeed: 0.0032,
    orbitAngle: ((Math.PI * 2) / 12) * 2,
    orbitElevation: -10,
    state: 'idle',
  },
  {
    id: 'worker_4',
    name: 'Worker 4: Sales & Concierge',
    shortName: 'Sales',
    level: 'worker',
    color: '#ec4899',
    accentColor: '#f472b6',
    orbitRadius: 135,
    orbitSpeed: 0.0024,
    orbitAngle: ((Math.PI * 2) / 12) * 3,
    orbitElevation: 15,
    state: 'executing',
  },
  {
    id: 'worker_5',
    name: 'Worker 5: SEO & Discovery',
    shortName: 'SEO',
    level: 'worker',
    color: '#8b5cf6',
    accentColor: '#a78bfa',
    orbitRadius: 115,
    orbitSpeed: 0.003,
    orbitAngle: ((Math.PI * 2) / 12) * 4,
    orbitElevation: -24,
    state: 'idle',
  },
  {
    id: 'worker_6',
    name: 'Worker 6: Customer Support',
    shortName: 'Support',
    level: 'worker',
    color: '#06b6d4',
    accentColor: '#67e8f9',
    orbitRadius: 130,
    orbitSpeed: 0.0026,
    orbitAngle: ((Math.PI * 2) / 12) * 5,
    orbitElevation: 8,
    state: 'idle',
  },
  {
    id: 'worker_7',
    name: 'Worker 7: Security & Audit',
    shortName: 'Security',
    level: 'worker',
    color: '#6366f1',
    accentColor: '#818cf8',
    orbitRadius: 100,
    orbitSpeed: 0.0038,
    orbitAngle: ((Math.PI * 2) / 12) * 6,
    orbitElevation: -14,
    state: 'idle',
  },
  {
    id: 'worker_8',
    name: 'Worker 8: Strategic Planning',
    shortName: 'Strategy',
    level: 'worker',
    color: '#eab308',
    accentColor: '#facc15',
    orbitRadius: 140,
    orbitSpeed: 0.0022,
    orbitAngle: ((Math.PI * 2) / 12) * 7,
    orbitElevation: 25,
    state: 'executing',
  },
  {
    id: 'worker_9',
    name: 'Worker 9: Catalog & Pricing',
    shortName: 'Catalog',
    level: 'worker',
    color: '#14b8a6',
    accentColor: '#5eead4',
    orbitRadius: 120,
    orbitSpeed: 0.0029,
    orbitAngle: ((Math.PI * 2) / 12) * 8,
    orbitElevation: -8,
    state: 'idle',
  },
  {
    id: 'worker_10',
    name: 'Worker 10: Technical Ops',
    shortName: 'Tech Ops',
    level: 'worker',
    color: '#f97316',
    accentColor: '#fb923c',
    orbitRadius: 132,
    orbitSpeed: 0.0027,
    orbitAngle: ((Math.PI * 2) / 12) * 9,
    orbitElevation: 18,
    state: 'idle',
  },
  {
    id: 'worker_11',
    name: 'Worker 11: Finance & Margins',
    shortName: 'Finance',
    level: 'worker',
    color: '#84cc16',
    accentColor: '#a3e635',
    orbitRadius: 108,
    orbitSpeed: 0.0034,
    orbitAngle: ((Math.PI * 2) / 12) * 10,
    orbitElevation: -20,
    state: 'analyzing',
  },
  {
    id: 'worker_12',
    name: 'Worker 12: VIP Growth Engine',
    shortName: 'VIP Engine',
    level: 'worker',
    color: '#d946ef',
    accentColor: '#e879f9',
    orbitRadius: 128,
    orbitSpeed: 0.0025,
    orbitAngle: ((Math.PI * 2) / 12) * 11,
    orbitElevation: 12,
    state: 'idle',
  },

  // 6 Specialized Marketing Co-Workers (Satellite Cluster orbiting Worker 2)
  {
    id: 'coworker_2_1',
    name: 'Co-Worker: Campaign Strategy',
    shortName: 'Strategy CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#fbbf24',
    accentColor: '#fef08a',
    orbitRadius: 32,
    orbitSpeed: 0.008,
    orbitAngle: 0,
    orbitElevation: 6,
    state: 'executing',
  },
  {
    id: 'coworker_2_2',
    name: 'Co-Worker: Creative Media',
    shortName: 'Creative CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#f43f5e',
    accentColor: '#fda4af',
    orbitRadius: 36,
    orbitSpeed: 0.0075,
    orbitAngle: ((Math.PI * 2) / 6) * 1,
    orbitElevation: -8,
    state: 'executing',
  },
  {
    id: 'coworker_2_3',
    name: 'Co-Worker: Ads Execution',
    shortName: 'Ads CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#38bdf8',
    accentColor: '#bae6fd',
    orbitRadius: 30,
    orbitSpeed: 0.009,
    orbitAngle: ((Math.PI * 2) / 6) * 2,
    orbitElevation: 10,
    state: 'executing',
  },
  {
    id: 'coworker_2_4',
    name: 'Co-Worker: Social Engagement',
    shortName: 'Social CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#a855f7',
    accentColor: '#d8b4fe',
    orbitRadius: 38,
    orbitSpeed: 0.007,
    orbitAngle: ((Math.PI * 2) / 6) * 3,
    orbitElevation: -6,
    state: 'idle',
  },
  {
    id: 'coworker_2_5',
    name: 'Co-Worker: Influencer Collabs',
    shortName: 'Influencer CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#ec4899',
    accentColor: '#fbcfe8',
    orbitRadius: 34,
    orbitSpeed: 0.0085,
    orbitAngle: ((Math.PI * 2) / 6) * 4,
    orbitElevation: 8,
    state: 'idle',
  },
  {
    id: 'coworker_2_6',
    name: 'Co-Worker: Email & WhatsApp CRM',
    shortName: 'CRM CW',
    level: 'coworker',
    parentId: 'worker_2',
    color: '#10b981',
    accentColor: '#a7f3d0',
    orbitRadius: 40,
    orbitSpeed: 0.0065,
    orbitAngle: ((Math.PI * 2) / 6) * 5,
    orbitElevation: -10,
    state: 'executing',
  },
];

export const GrokDotsVoiceBody: React.FC<GrokDotsVoiceBodyProps> = ({
  audioLevel = 0,
  state = 'idle',
  className = '',
  size = 360,
  interactive = true,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D Camera Angles
  const [rotX, setRotX] = useState<number>(0.24);
  const [rotY, setRotY] = useState<number>(0.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoOrbitRef = useRef<boolean>(true);

  // Generate Grok-inspired spherical lattice of dots for Apex Co-Founder
  const generateApexDots = useCallback((): DotParticle[] => {
    const DOT_COUNT = 240;
    const RADIUS = 44;
    const dots: DotParticle[] = [];

    for (let i = 0; i < DOT_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DOT_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = RADIUS * Math.cos(phi);

      dots.push({
        x,
        y,
        z,
        u: phi,
        v: theta,
        size: 1.2 + (i % 3) * 0.45,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 0.5,
      });
    }
    return dots;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const apexDots = generateApexDots();

    // Setup DPR
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Neural traveling packets simulation
    const packetProgress = CO_WORKER_PRESETS.map(() => Math.random());

    const render = () => {
      time += 0.016;

      if (autoOrbitRef.current && !isDragging) {
        setRotY((prev) => prev + 0.003);
      }

      const cx = size / 2;
      const cy = size / 2;
      const fov = 340;

      ctx.clearRect(0, 0, size, size);

      // Status-based colors
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';
      const isError = state === 'error';

      const apexBaseColor = isSpeaking
        ? '#f59e0b'
        : isListening
          ? '#10b981'
          : isError
            ? '#f43f5e'
            : '#eab308';
      const apexAccentColor = isSpeaking
        ? '#fef08a'
        : isListening
          ? '#a7f3d0'
          : isError
            ? '#fecdd3'
            : '#fde047';

      // Camera 3D Trigonometry
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Dynamic Audio Expansion & Breathing
      const dynamicExpansion =
        1 + audioLevel * 0.55 + Math.sin(time * 2.2) * 0.04;

      // 1. Draw Apex Radial Energy Glow
      const glowRadius = 55 * dynamicExpansion;
      const haloGrad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        glowRadius * 1.8
      );
      haloGrad.addColorStop(0, `${apexBaseColor}35`);
      haloGrad.addColorStop(0.5, `${apexBaseColor}10`);
      haloGrad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // 2. Compute Co-Worker 3D World & Screen Positions
      const nodePosMap = new Map<
        string,
        {
          info: CoWorkerDotInfo;
          worldX: number;
          worldY: number;
          worldZ: number;
          screenX: number;
          screenY: number;
          screenScale: number;
          depth: number;
          visible: boolean;
        }
      >();

      CO_WORKER_PRESETS.forEach((cw) => {
        let wx = 0;
        let wy = 0;
        let wz = 0;

        if (cw.level === 'worker') {
          const currentAngle = cw.orbitAngle + time * cw.orbitSpeed * 22;
          wx = Math.cos(currentAngle) * cw.orbitRadius;
          wz = Math.sin(currentAngle) * cw.orbitRadius;
          wy = cw.orbitElevation + Math.sin(time * 1.2 + cw.orbitAngle) * 6;
        } else if (cw.level === 'coworker') {
          const parent = nodePosMap.get(cw.parentId || 'worker_2');
          const px = parent ? parent.worldX : 0;
          const py = parent ? parent.worldY : 0;
          const pz = parent ? parent.worldZ : 0;

          const subAngle = cw.orbitAngle + time * cw.orbitSpeed * 30;
          wx = px + Math.cos(subAngle) * cw.orbitRadius;
          wz = pz + Math.sin(subAngle) * cw.orbitRadius;
          wy =
            py + cw.orbitElevation + Math.sin(time * 1.8 + cw.orbitAngle) * 4;
        }

        // Camera Rotation (Y then X)
        const x1 = wx * cosY - wz * sinY;
        const z1 = wx * sinY + wz * cosY;
        const y1 = wy;

        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective Projection
        const scale = fov / (fov + z2 + 220);
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        nodePosMap.set(cw.id, {
          info: cw,
          worldX: wx,
          worldY: wy,
          worldZ: wz,
          screenX: sx,
          screenY: sy,
          screenScale: scale,
          depth: z2,
          visible: z2 > -fov,
        });
      });

      // 3. Draw Synapses (Laser Arcs & Moving Neural Packets from Apex to Co-Workers)
      CO_WORKER_PRESETS.forEach((cw, idx) => {
        const target = nodePosMap.get(cw.id);
        if (!target || !target.visible) return;

        let startX = cx;
        let startY = cy;
        let startScale = 1;

        if (cw.level === 'coworker' && cw.parentId) {
          const parent = nodePosMap.get(cw.parentId);
          if (parent) {
            startX = parent.screenX;
            startY = parent.screenY;
            startScale = parent.screenScale;
          }
        }

        // Connecting Arc
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(target.screenX, target.screenY);

        const isActive = isSpeaking || isListening || cw.state !== 'idle';
        ctx.strokeStyle = isActive
          ? `${cw.color}35`
          : `rgba(160, 150, 140, 0.08)`;
        ctx.lineWidth = isActive
          ? 1.2 * target.screenScale
          : 0.6 * target.screenScale;
        ctx.setLineDash(isActive ? [3, 4] : [1, 6]);
        ctx.lineDashOffset = -time * 25;
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // Traveling Packet Pulse
        packetProgress[idx] =
          (packetProgress[idx] + 0.012 + (isActive ? 0.015 : 0)) % 1;
        const pProg = packetProgress[idx];
        const packetX = startX + (target.screenX - startX) * pProg;
        const packetY = startY + (target.screenY - startY) * pProg;
        const pScale = startScale + (target.screenScale - startScale) * pProg;

        ctx.beginPath();
        ctx.arc(packetX, packetY, 1.8 * pScale, 0, Math.PI * 2);
        ctx.fillStyle = cw.accentColor;
        ctx.shadowColor = cw.color;
        ctx.shadowBlur = 4 * pScale;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      });

      // 4. Render Apex Co-Founder 3D Grok Dots Lattice
      apexDots.forEach((dot) => {
        const wave =
          Math.sin(time * 3 * dot.speed + dot.phase + audioLevel * 7) *
          (3 + audioLevel * 12);

        const px0 = (dot.x + wave) * dynamicExpansion;
        const py0 = (dot.y + wave) * dynamicExpansion;
        const pz0 = (dot.z + wave) * dynamicExpansion;

        // Rotate Y
        const px1 = px0 * cosY - pz0 * sinY;
        const pz1 = px0 * sinY + pz0 * cosY;
        const py1 = py0;

        // Rotate X
        const py2 = py1 * cosX - pz1 * sinX;
        const pz2 = py1 * sinX + pz1 * cosX;

        // Perspective
        const scale = fov / (fov + pz2 + 200);
        const screenX = cx + px1 * scale;
        const screenY = cy + py2 * scale;
        const dotRadius = Math.max(
          0.6,
          dot.size * scale * (pz2 > 0 ? 1.4 : 0.8)
        );

        ctx.beginPath();
        ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = pz2 > 0 ? apexAccentColor : `${apexBaseColor}77`;
        ctx.fill();
      });

      // 5. Render Co-Worker Dots (Level 1 Workers & Level 2 Marketing Co-Workers)
      Array.from(nodePosMap.values())
        .sort((a, b) => a.depth - b.depth)
        .forEach((sim) => {
          if (!sim.visible) return;
          const cw = sim.info;
          const isNodeActive = isSpeaking || cw.state !== 'idle';
          const dotRadius =
            (cw.level === 'worker' ? 4.2 : 3.0) *
            sim.screenScale *
            (isNodeActive ? 1.25 : 1.0);

          // Outer Glow
          ctx.beginPath();
          ctx.arc(sim.screenX, sim.screenY, dotRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${cw.color}30`;
          ctx.fill();

          // Core Dot
          ctx.beginPath();
          ctx.arc(sim.screenX, sim.screenY, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = isNodeActive ? cw.accentColor : cw.color;
          ctx.shadowColor = cw.color;
          ctx.shadowBlur = 6 * sim.screenScale;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Mini Satellite Orbit Ring around Worker 2
          if (cw.id === 'worker_2') {
            ctx.beginPath();
            ctx.arc(
              sim.screenX,
              sim.screenY,
              34 * sim.screenScale,
              0,
              Math.PI * 2
            );
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Projected Label (Only when active, worker level, or hovered)
          if (cw.level === 'worker' || isNodeActive) {
            ctx.font = `${Math.max(8, Math.floor(9.5 * sim.screenScale))}px monospace`;
            ctx.fillStyle = sim.depth > 0 ? '#e2e8f0' : '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText(
              cw.shortName,
              sim.screenX,
              sim.screenY + dotRadius + 11 * sim.screenScale
            );
          }
        });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [audioLevel, state, size, rotX, rotY, isDragging, generateApexDots]);

  // Touch & Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    autoOrbitRef.current = false;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setRotY((prev) => prev + dx * 0.008);
    setRotX((prev) => Math.max(-0.8, Math.min(0.8, prev + dy * 0.008)));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex select-none items-center justify-center ${
        interactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} className="pointer-events-auto block" />
    </div>
  );
};
