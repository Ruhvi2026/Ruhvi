---
name: ai-ui-ux-motion-engine
description: AI UI/UX Motion Engine skill for building minimalist 3D particle simulations, Grok-inspired dynamic dot matrix avatar bodies, hierarchical multi-agent neural synapsing, and voice/activity-reactive spatial animations in modern React/TypeScript web apps.
---

# AI UI/UX Motion Engine Skill

This skill provides architectural principles, rendering algorithms, and UX design guidelines for creating high-performance, minimalist 3D motion interfaces for AI agents, workers, and hierarchical multi-agent swarms.

---

## 1. Core Visual Paradigms

### A. Grok Dots Particle Entity Body
- **Concept**: An entity body formed by an array of floating, oscillating dot particles arranged in spherical/toroidal shells or structured lattice shapes.
- **Mathematical Model**:
  - Longitudinal/Latitudinal angles $u \in [0, \pi], v \in [0, 2\pi]$
  - Radius perturbation: $r = R \cdot (1 + A \cdot \sin(\omega t + k \cdot u))$
  - Spatial coordinates:
    $$x = r \cdot \sin(u) \cdot \cos(v + \Omega t)$$
    $$y = r \cdot \sin(u) \cdot \sin(v + \Omega t)$$
    $$z = r \cdot \cos(u)$$
- **Particle Dynamics**:
  - **Idle State**: Gentle harmonic breathing ($\sin(t \cdot 0.8)$), soft orbital drift, subtle chromatic glow.
  - **Thinking / Processing State**: Rapid vortex acceleration, contraction toward center, shimmering luminescence.
  - **Speaking / Action State**: Audio-reactive wave expansion, radial pulses, directional particle emitter streams.

### B. Hierarchical Multi-Agent Neural Synapsing
- **Level 0 (Apex AI Co-Founder)**: Grand central particle orb (400-800 dots), high luminosity, sovereign golden/amber/cyan core.
- **Level 1 (The 12 Core Workers)**: Orbital planetary satellites orbiting the apex node, connected via dynamic bezier neural synapses with pulse packets traveling along the arcs.
- **Level 2 (Co-Worker Sub-Agents)**: Clustered satellite child nodes orbiting their parent Worker node (e.g., Marketing Worker -> Strategy, Creative Media, Ads Execution, Social, Email, Influencer).

---

## 2. Minimalist 3D Canvas Architecture

### High-Performance Render Loop
- Use pure Canvas 2D / WebGL 3D math projections (`x' = x * focalLength / (z + cameraDist)`) for 60-120 FPS ultra-low memory overhead on mobile and desktop without heavy external dependencies.
- Depth sorting ($Z$-buffering) so front particles render crisp, high opacity while background particles blend subtly with depth fog.
- Smooth mouse/touch rotation with inertia damping and spring physics.

```typescript
// 3D Perspective Projection Matrix Helper
export function project3D(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  fov: number = 400
) {
  const scale = fov / (fov + z);
  return {
    px: cx + x * scale,
    py: cy + y * scale,
    scale,
    visible: z > -fov + 10,
  };
}
```

---

## 3. Worker Telemetry & HUD Display Window
Every animated agent must have an associated **Display Window** showcasing:
1. **Current Operation**: Real-time natural language description of current execution step.
2. **Phase / State**: `IDLE`, `INITIALIZING`, `ANALYZING`, `GENERATING`, `SYNTHESIZING`, `DISPATCHING`, `AWAITING_APPROVAL`.
3. **Dynamic Metrics**: Latency (ms), Tokens/sec, Compute Load (%), Model Router ID, Confidence Score.
4. **Live Step Trace**: Terminal-style animated log feed of low-level tool calls and inputs/outputs.

---

## 4. Interaction & Usability Rules
- **Non-blocking**: The 3D motion engine must run on `requestAnimationFrame` with passive event listeners; it must NEVER freeze or lag the main UI thread.
- **Zero Functional Breakage**: Adding motion canvas layers must preserve all buttons, voice RTC connections, inputs, and form controls intact.
- **Aesthetic Excellence**: Minimalist, sleek dark aesthetic (`#050505` to `#0f0f12`), tailored accent colors (Amber `#f59e0b`, Emerald `#10b981`, Indigo `#6366f1`, Rose `#f43f5e`), backdrop glassmorphism (`backdrop-blur-md bg-stone-950/80 border-stone-800`).
