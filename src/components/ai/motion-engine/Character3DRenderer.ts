import * as THREE from 'three';
import { AgentWorkState } from './types';

export interface CharacterConfig {
  roleId: string;
  name: string;
  baseColor: string;
  accentColor: string;
  size?: number;
  isApex?: boolean;
}

export interface CharacterMeshBundle {
  group: THREE.Group;
  head: THREE.Mesh;
  body?: THREE.Mesh;
  visor: THREE.Mesh;
  halo?: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  accessories: THREE.Object3D[];
  shadowDisc: THREE.Mesh;
  auraLight: THREE.PointLight;
  state: AgentWorkState;
  config: CharacterConfig;
  update: (
    time: number,
    delta: number,
    audioLevel?: number,
    pointerPos?: { x: number; y: number }
  ) => void;
  dispose: () => void;
}

// Helper to create glossy PBR material
export function createGlossyMaterial(
  colorHex: string,
  roughness = 0.22,
  metalness = 0.15
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
  });
}

// Helper to create glowing emissive eye/visor material
export function createEmissiveMaterial(
  colorHex: string,
  intensity = 2.0
): THREE.MeshStandardMaterial {
  const color = new THREE.Color(colorHex);
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.2,
  });
}

// Create Eye Canvas Texture for expressive dynamic eyes
export function createEyeTexture(
  eyeColor: string,
  state: AgentWorkState = 'idle',
  audioLevel = 0
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Visor background
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Glow filter
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = eyeColor;

  const leftEyeX = 76;
  const rightEyeX = 180;
  const eyeY = 64;

  if (state === 'speaking') {
    // Dynamic open/happy curved eyes reacting to voice
    const eyeH = 22 + Math.min(24, audioLevel * 40);
    const eyeW = 26;

    // Left eye pill
    ctx.beginPath();
    ctx.roundRect(leftEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 12);
    ctx.fill();

    // Right eye pill
    ctx.beginPath();
    ctx.roundRect(rightEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 12);
    ctx.fill();

    // Tiny mouth soundwave line
    const mouthW = 20 + audioLevel * 40;
    const mouthH = 4 + audioLevel * 12;
    ctx.beginPath();
    ctx.roundRect(128 - mouthW / 2, 98 - mouthH / 2, mouthW, mouthH, 3);
    ctx.fill();
  } else if (state === 'thinking' || state === 'analyzing') {
    // Scanning / pulsing horizontal pill eyes
    const width = 34 + Math.sin(Date.now() * 0.008) * 8;
    ctx.beginPath();
    ctx.roundRect(leftEyeX - width / 2, eyeY - 6, width, 12, 6);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(rightEyeX - width / 2, eyeY - 6, width, 12, 6);
    ctx.fill();
  } else if (state === 'waiting_approval') {
    // Concentric alert arcs
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (state === 'completed') {
    // Joyful upward curves (^_^)
    ctx.lineWidth = 7;
    ctx.strokeStyle = eyeColor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY + 6, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY + 6, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    // Friendly rounded capsules
    const eyeH = 28;
    const eyeW = 22;
    ctx.beginPath();
    ctx.roundRect(leftEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 10);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(rightEyeX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 10);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create Soft Shadow Disc Texture
export function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Master 3D Character Builder
export function createCharacter3D(
  config: CharacterConfig
): CharacterMeshBundle {
  const group = new THREE.Group();
  const accessories: THREE.Object3D[] = [];
  const scale = config.size || 1.0;
  const isApex = !!config.isApex;

  // Base materials with high specular shine
  const headColor = isApex ? '#ffffff' : config.baseColor;
  const accentColor = config.accentColor;
  const headMat = createGlossyMaterial(
    headColor,
    isApex ? 0.15 : 0.25,
    isApex ? 0.08 : 0.15
  );
  const accentMat = createGlossyMaterial(accentColor, 0.2, 0.3);
  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0c0e14'),
    roughness: 0.1,
    metalness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.95,
  });

  // 1. Head / Main Body
  const headRadius = isApex ? 1.4 : 1.0;
  const headGeom = new THREE.SphereGeometry(headRadius, 48, 48);
  headGeom.scale(1, 0.95, 0.95); // Slightly cute squashed sphere
  const head = new THREE.Mesh(headGeom, headMat);
  head.position.y = 1.6 * scale;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // 2. Visor Screen
  const visorRadius = headRadius * 0.72;
  const visorGeom = new THREE.CylinderGeometry(
    visorRadius * 0.7,
    visorRadius * 0.7,
    0.6,
    32
  );
  visorGeom.rotateZ(Math.PI / 2);
  visorGeom.scale(1.2, 0.8, 0.65);
  const visor = new THREE.Mesh(visorGeom, darkGlassMat);
  visor.position.set(0, 0.05, headRadius * 0.68);
  head.add(visor);

  // 3. Digital Glowing Eyes (Left & Right)
  const eyeColor = isApex ? '#a855f7' : accentColor;
  const eyeMat = createEmissiveMaterial(eyeColor, 2.5);
  const eyeGeom = new THREE.CapsuleGeometry(0.12, 0.18, 16, 16);

  const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
  leftEye.position.set(-0.35 * headRadius, 0.04, headRadius * 0.75);
  leftEye.scale.set(0.9, 1.1, 0.4);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
  rightEye.position.set(0.35 * headRadius, 0.04, headRadius * 0.75);
  rightEye.scale.set(0.9, 1.1, 0.4);
  head.add(rightEye);

  // 4. Role-specific Accessories & Features
  let halo: THREE.Mesh | undefined;

  if (isApex) {
    // Apex AI Co-Founder: Glowing Orbital Halo & Crown Crystal
    const haloGeom = new THREE.TorusGeometry(headRadius * 1.4, 0.07, 24, 64);
    const haloMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8b5cf6'),
      emissive: new THREE.Color('#a855f7'),
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.8,
    });
    halo = new THREE.Mesh(haloGeom, haloMat);
    halo.rotation.x = Math.PI / 2.3;
    halo.position.y = -0.1;
    head.add(halo);
    accessories.push(halo);

    // Floating Crown Gem
    const gemGeom = new THREE.OctahedronGeometry(0.32, 0);
    const gemMat = createEmissiveMaterial('#c084fc', 2.0);
    const gem = new THREE.Mesh(gemGeom, gemMat);
    gem.position.set(0, headRadius + 0.4, 0);
    head.add(gem);
    accessories.push(gem);

    // Ear Pods
    const earGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 24);
    earGeom.rotateZ(Math.PI / 2);
    const leftEar = new THREE.Mesh(earGeom, accentMat);
    leftEar.position.set(-headRadius * 0.95, 0, 0);
    head.add(leftEar);
    const rightEar = new THREE.Mesh(earGeom, accentMat);
    rightEar.position.set(headRadius * 0.95, 0, 0);
    head.add(rightEar);
  } else {
    // Role Accessories for Workers
    const role = config.roleId;

    if (role.includes('analytics') || role === 'worker_1') {
      // Data Bar Crown / Satellite Rings
      const bar1Geom = new THREE.BoxGeometry(0.12, 0.5, 0.12);
      const bar2Geom = new THREE.BoxGeometry(0.12, 0.7, 0.12);
      const bar3Geom = new THREE.BoxGeometry(0.12, 0.9, 0.12);
      const bar1 = new THREE.Mesh(bar1Geom, accentMat);
      bar1.position.set(-0.25, headRadius + 0.25, 0);
      const bar2 = new THREE.Mesh(bar2Geom, accentMat);
      bar2.position.set(0, headRadius + 0.35, 0);
      const bar3 = new THREE.Mesh(bar3Geom, accentMat);
      bar3.position.set(0.25, headRadius + 0.45, 0);
      head.add(bar1, bar2, bar3);
      accessories.push(bar1, bar2, bar3);
    } else if (role.includes('marketing') || role === 'worker_2') {
      // Megaphone / Dual Horn Flare Antenna
      const hornGeom = new THREE.ConeGeometry(0.28, 0.6, 24);
      const leftHorn = new THREE.Mesh(hornGeom, accentMat);
      leftHorn.position.set(-headRadius * 0.7, headRadius * 0.75, 0);
      leftHorn.rotation.z = Math.PI / 4;
      const rightHorn = new THREE.Mesh(hornGeom, accentMat);
      rightHorn.position.set(headRadius * 0.7, headRadius * 0.75, 0);
      rightHorn.rotation.z = -Math.PI / 4;
      head.add(leftHorn, rightHorn);
      accessories.push(leftHorn, rightHorn);
    } else if (role.includes('seo') || role === 'worker_3') {
      // Sprout / Search Dish Antenna
      const dishGeom = new THREE.SphereGeometry(
        0.35,
        16,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      );
      const dish = new THREE.Mesh(dishGeom, accentMat);
      dish.position.set(0, headRadius + 0.3, 0);
      dish.rotation.x = Math.PI;
      head.add(dish);
      accessories.push(dish);
    } else if (role.includes('product') || role === 'worker_4') {
      // Prism Diamond Crown
      const prismGeom = new THREE.IcosahedronGeometry(0.35, 0);
      const prism = new THREE.Mesh(prismGeom, accentMat);
      prism.position.set(0, headRadius + 0.4, 0);
      head.add(prism);
      accessories.push(prism);
    } else if (role.includes('competitor') || role === 'worker_5') {
      // Radar Dish / Scanner
      const ringGeom = new THREE.TorusGeometry(0.4, 0.06, 16, 32);
      const ring = new THREE.Mesh(ringGeom, accentMat);
      ring.position.set(0, headRadius + 0.35, 0);
      ring.rotation.x = Math.PI / 3;
      head.add(ring);
      accessories.push(ring);
    } else if (role.includes('support') || role === 'worker_7') {
      // Concierge Headset with mic
      const headsetGeom = new THREE.TorusGeometry(
        headRadius * 0.98,
        0.08,
        16,
        32,
        Math.PI
      );
      const headset = new THREE.Mesh(headsetGeom, accentMat);
      headset.position.set(0, 0.1, 0);
      headset.rotation.z = Math.PI;
      head.add(headset);

      const micGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16);
      const mic = new THREE.Mesh(micGeom, accentMat);
      mic.position.set(headRadius * 0.7, -0.3, headRadius * 0.4);
      mic.rotation.x = Math.PI / 4;
      head.add(mic);
      accessories.push(headset, mic);
    } else {
      // Sleek Dual Antenna Pods
      const antGeom = new THREE.CapsuleGeometry(0.08, 0.35, 12, 12);
      const antLeft = new THREE.Mesh(antGeom, accentMat);
      antLeft.position.set(-headRadius * 0.5, headRadius + 0.2, 0);
      antLeft.rotation.z = 0.2;
      const antRight = new THREE.Mesh(antGeom, accentMat);
      antRight.position.set(headRadius * 0.5, headRadius + 0.2, 0);
      antRight.rotation.z = -0.2;
      head.add(antLeft, antRight);
      accessories.push(antLeft, antRight);
    }
  }

  // 5. Soft Floating Drop Shadow on Floor Pedestal
  const shadowGeom = new THREE.PlaneGeometry(2.4 * scale, 2.4 * scale);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createShadowTexture(),
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeom, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  group.add(shadowDisc);

  // 6. Accent Aura Point Light
  const auraLight = new THREE.PointLight(
    new THREE.Color(accentColor),
    isApex ? 2.5 : 1.2,
    4
  );
  auraLight.position.set(0, 0.4, 0.5);
  group.add(auraLight);

  // Initial group scaling
  group.scale.set(scale, scale, scale);

  let blinkTimer = 0;
  let isBlinking = false;

  const bundle: CharacterMeshBundle = {
    group,
    head,
    visor,
    halo,
    leftEye,
    rightEye,
    accessories,
    shadowDisc,
    auraLight,
    state: 'idle',
    config,
    update: (
      time: number,
      delta: number,
      audioLevel = 0,
      pointerPos = { x: 0, y: 0 }
    ) => {
      // 1. Floating bobbing physics
      const floatSpeed = isApex ? 1.6 : 2.0;
      const floatAmp = isApex ? 0.12 : 0.09;
      const hoverY =
        (isApex ? 1.6 : 1.3) + Math.sin(time * floatSpeed) * floatAmp;
      head.position.y = hoverY;

      // Shadow reacts to elevation
      const shadowScale = 1.0 - (hoverY - 1.2) * 0.3;
      shadowDisc.scale.set(shadowScale, shadowScale, 1);
      shadowMat.opacity = Math.max(0.2, 0.65 - (hoverY - 1.2) * 0.35);

      // 2. Head tracking toward pointer
      const targetRotY = pointerPos.x * 0.45;
      const targetRotX = -pointerPos.y * 0.3;
      head.rotation.y += (targetRotY - head.rotation.y) * 0.08;
      head.rotation.x += (targetRotX - head.rotation.x) * 0.08;

      // 3. Halo / Antenna animation
      if (halo) {
        halo.rotation.z += delta * 0.8;
      }

      // 4. Voice reactivity & breathing
      if (bundle.state === 'speaking' || audioLevel > 0.05) {
        const audioScale = 1.0 + audioLevel * 0.18;
        head.scale.set(audioScale, audioScale, audioScale);
        auraLight.intensity = 1.5 + audioLevel * 4.0;
      } else {
        const breath = 1.0 + Math.sin(time * 2.2) * 0.015;
        head.scale.set(breath, breath, breath);
        auraLight.intensity = isApex ? 2.0 : 1.0;
      }

      // 5. Automatic Natural Blinking
      blinkTimer += delta;
      if (blinkTimer > 3.5 + Math.random() * 2) {
        isBlinking = true;
        blinkTimer = 0;
      }
      if (isBlinking) {
        leftEye.scale.y = 0.05;
        rightEye.scale.y = 0.05;
        setTimeout(() => {
          leftEye.scale.y = 1.1;
          rightEye.scale.y = 1.1;
          isBlinking = false;
        }, 120);
      }
    },
    dispose: () => {
      headGeom.dispose();
      headMat.dispose();
      accentMat.dispose();
      darkGlassMat.dispose();
      eyeGeom.dispose();
      eyeMat.dispose();
      shadowGeom.dispose();
      shadowMat.dispose();
    },
  };

  return bundle;
}
