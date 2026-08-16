"use client";

import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { AGENT_HEX } from "@/lib/mock-data";
import type { AgentId } from "@/lib/types";

export const AGENT_ORDER: AgentId[] = ["ceo", "research", "prospecting", "sales", "marketing", "analytics"];

/** Agent routes that carry live data between nodes (intelligence flowing forward, insights returning). */
export const FLOW_ROUTES: Array<[AgentId, AgentId]> = [
  ["research", "prospecting"],
  ["prospecting", "sales"],
  ["sales", "analytics"],
  ["analytics", "ceo"],
];

/* ------------------------------------------------------------------ */
/* Node layout — six agents floating at different depths around the core */
/* ------------------------------------------------------------------ */

export function agentPositions(radius = 4): Record<AgentId, THREE.Vector3> {
  const config: Record<AgentId, { a: number; r: number; y: number }> = {
    ceo: { a: -Math.PI / 2, r: radius * 0.98, y: 1.05 },
    research: { a: -Math.PI / 2 + Math.PI / 3, r: radius * 1.14, y: 0.45 },
    prospecting: { a: -Math.PI / 2 + (2 * Math.PI) / 3, r: radius * 0.92, y: -0.5 },
    sales: { a: -Math.PI / 2 + Math.PI, r: radius * 1.2, y: -0.85 },
    marketing: { a: -Math.PI / 2 + (4 * Math.PI) / 3, r: radius * 1.02, y: 0.1 },
    analytics: { a: -Math.PI / 2 + (5 * Math.PI) / 3, r: radius * 1.26, y: 0.7 },
  };
  const out = {} as Record<AgentId, THREE.Vector3>;
  AGENT_ORDER.forEach((id) => {
    const c = config[id];
    out[id] = new THREE.Vector3(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Soft radial glow (additive sprite)                                   */
/* ------------------------------------------------------------------ */

let glowTexture: THREE.Texture | null = null;
export function getGlowTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

export function GlowSprite({
  position,
  color,
  scale = 1,
  opacity = 0.4,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  opacity?: number;
}) {
  const tex = useMemo(() => getGlowTexture(), []);
  if (!tex) return null;
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
/* Particle field (ambient dust)                                        */
/* ------------------------------------------------------------------ */

export function ParticleField({
  count = 450,
  radius = 7,
  color = "#5eb8ff",
}: {
  count?: number;
  radius?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.3 + Math.random() * 0.7);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [count, radius]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.03}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Luminous core                                                        */
/* ------------------------------------------------------------------ */

export function CoreLuminous({ radius = 1, pulse = false }: { radius?: number; pulse?: boolean }) {
  const inner = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const glowTex = useMemo(() => getGlowTexture(), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (inner.current) {
      inner.current.rotation.y += dt * 0.1;
      const s = 1 + (pulse ? Math.sin(t * 5) * 0.06 : 0);
      inner.current.scale.setScalar(s);
    }
    if (wire.current) {
      wire.current.rotation.y -= dt * 0.06;
      wire.current.rotation.x += dt * 0.03;
    }
    if (mat.current) {
      mat.current.emissiveIntensity = 0.7 + (pulse ? Math.sin(t * 5) * 0.3 : Math.sin(t * 0.8) * 0.06);
    }
    if (glow.current) {
      const s = radius * 5.6 * (1 + (pulse ? Math.sin(t * 5) * 0.12 : 0.02));
      glow.current.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <mesh ref={inner}>
        <icosahedronGeometry args={[radius, 3]} />
        <meshStandardMaterial ref={mat} color="#0b1c33" emissive="#1d6fb0" emissiveIntensity={0.7} roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh ref={wire}>
        <icosahedronGeometry args={[radius * 1.22, 1]} />
        <meshBasicMaterial color="#4cc2ff" wireframe transparent opacity={0.16} />
      </mesh>
      {glowTex && (
        <sprite ref={glow} scale={[radius * 5.6, radius * 5.6, 1]}>
          <spriteMaterial map={glowTex} color="#2f9dff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}
      <pointLight position={[0, 0, 0]} intensity={7} distance={7.5} color="#3fa9ff" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Orbital rings — different speeds, some reversed                      */
/* ------------------------------------------------------------------ */

const RING_SPECS = [
  { r: 2.05, tilt: [1.35, 0, 0], speed: 0.14, color: "#2f7fb8" },
  { r: 2.62, tilt: [1.12, 0.42, 0], speed: -0.1, color: "#4cc2ff" },
  { r: 3.2, tilt: [1.48, -0.36, 0.2], speed: 0.08, color: "#2f7fb8" },
  { r: 3.8, tilt: [1.2, 0.16, -0.28], speed: -0.06, color: "#3fa9ff" },
] as const;

export function RingsOrbital({ radius = 1, surge = false }: { radius?: number; surge?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const dots = useRef<Array<THREE.Group | null>>([]);
  useFrame(({ clock }, dt) => {
    if (group.current) group.current.rotation.y += dt * (surge ? 0.1 : 0.035);
    const t = clock.elapsedTime;
    dots.current.forEach((d, i) => {
      if (!d) return;
      const spec = RING_SPECS[i % RING_SPECS.length];
      const a = t * (surge ? 0.9 : 0.45) + i * 1.9;
      d.position.set(Math.cos(a) * spec.r * radius, 0, Math.sin(a) * spec.r * radius);
    });
  });
  return (
    <group ref={group}>
      {RING_SPECS.map((s, i) => (
        <mesh key={i} rotation={[...s.tilt] as [number, number, number]}>
          <torusGeometry args={[s.r * radius, 0.012, 12, 220]} />
          <meshBasicMaterial color={s.color} transparent opacity={surge ? 0.55 : 0.38} />
        </mesh>
      ))}
      {RING_SPECS.map((s, i) => (
        <group
          key={`dot-${i}`}
          ref={(el) => {
            dots.current[i] = el;
          }}
        >
          <mesh position={[s.r * radius, 0, 0]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshBasicMaterial color="#8fd8ff" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Agent nodes — distinct geometry + continuous per-agent life          */
/* ------------------------------------------------------------------ */

const AGENT_LIFE: Record<AgentId, { pulse: number; phase: number }> = {
  ceo: { pulse: 0.9, phase: 0 },
  research: { pulse: 1.4, phase: 1.2 },
  prospecting: { pulse: 2.1, phase: 2.4 },
  sales: { pulse: 1.1, phase: 3.6 },
  marketing: { pulse: 2.7, phase: 4.8 },
  analytics: { pulse: 1.6, phase: 0.6 },
};

const ORBITAL_ROT: Partial<Record<AgentId, number>> = {
  ceo: 0.55,
  prospecting: 2.3,
  sales: 1.4,
};

function nodeGeometry(id: AgentId, s: number) {
  switch (id) {
    case "ceo":
      return <octahedronGeometry args={[0.17 * s, 0]} />;
    case "research":
      return <icosahedronGeometry args={[0.18 * s, 0]} />;
    case "prospecting":
      return <torusGeometry args={[0.15 * s, 0.055 * s, 8, 28]} />;
    case "sales":
      return <sphereGeometry args={[0.16 * s, 20, 20]} />;
    case "marketing":
      return <dodecahedronGeometry args={[0.16 * s, 0]} />;
    case "analytics":
      return <boxGeometry args={[0.24 * s, 0.24 * s, 0.24 * s]} />;
  }
}

function ResearchSparkles({ position }: { position: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(16 * 3);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 0.34 + Math.random() * 0.16;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.9;
  });
  return (
    <points ref={ref} position={position} geometry={geometry}>
      <pointsMaterial
        size={0.022}
        color="#9fd4ff"
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function AgentNode3D({
  id,
  position,
  scale = 1,
  selected = false,
  hovered = false,
  allActive = false,
  dimmed = false,
  onSelect,
  onHover,
}: {
  id: AgentId;
  position: THREE.Vector3;
  scale?: number;
  selected?: boolean;
  hovered?: boolean;
  allActive?: boolean;
  dimmed?: boolean;
  onSelect?: (id: AgentId) => void;
  onHover?: (id: AgentId | null) => void;
}) {
  const color = AGENT_HEX[id];
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const orbitals = useRef<Array<THREE.Mesh | null>>([]);
  const lit = (hovered || selected) && !dimmed;
  const life = AGENT_LIFE[id];

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y += dt * (lit ? 1.7 : 0.55);
    if (group.current) {
      const breathe = 1 + Math.sin(t * life.pulse + life.phase) * 0.05;
      const target = (dimmed ? 0.82 : lit ? 1.24 : allActive ? 1.12 : 1) * breathe;
      const s = THREE.MathUtils.lerp(group.current.scale.x, target, Math.min(1, dt * 7));
      group.current.scale.setScalar(s);
    }
    orbitals.current.forEach((o) => {
      if (o) o.rotation.z += dt * (ORBITAL_ROT[id] ?? 0.8);
    });
  });

  const orbitalRings =
    id === "ceo" || id === "sales" || id === "prospecting"
      ? [
          <mesh key="o" rotation={[Math.PI / 2, 0, 0]} ref={(el) => { orbitals.current[0] = el; }}>
            <torusGeometry args={[0.26 * scale, 0.008, 8, 40]} />
            <meshBasicMaterial color={id === "sales" ? "#6ee7b7" : id === "ceo" ? "#f3d183" : "#bdfbf0"} transparent opacity={0.75} />
          </mesh>,
        ]
      : [];

  return (
    <group position={position}>
      <GlowSprite position={[0, 0, 0]} color={color} scale={0.95 * scale} opacity={dimmed ? 0.14 : lit ? 0.8 : allActive ? 0.55 : 0.34} />
      <group
        ref={group}
        onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(id); } : undefined}
        onPointerOver={
          onHover
            ? () => {
                onHover(id);
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          onHover
            ? () => {
                onHover(null);
                document.body.style.cursor = "auto";
              }
            : undefined
        }
      >
        <mesh ref={spin}>
          {nodeGeometry(id, scale)}
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={dimmed ? 0.15 : lit ? 1 : allActive ? 0.75 : 0.45}
            metalness={0.5}
            roughness={0.32}
          />
        </mesh>
        {id === "analytics" && (
          <mesh>
            <icosahedronGeometry args={[0.1 * scale, 0]} />
            <meshBasicMaterial color="#aee3ff" />
          </mesh>
        )}
        {id === "prospecting" && (
          <mesh>
            <sphereGeometry args={[0.055 * scale, 10, 10]} />
            <meshBasicMaterial color="#bdfbf0" />
          </mesh>
        )}
        {orbitalRings}
      </group>
      {id === "research" && <ResearchSparkles position={position} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Core → node beams with traveling pulses                              */
/* ------------------------------------------------------------------ */

export function CoreBeams({
  positions,
  surge = false,
  focus,
}: {
  positions: Record<AgentId, THREE.Vector3>;
  surge?: boolean;
  focus?: AgentId | null;
}) {
  const pulses = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    AGENT_ORDER.forEach((id, i) => {
      const m = pulses.current[i];
      if (!m) return;
      const phase = (t * (surge ? 0.65 : 0.3) + i * 0.19) % 1;
      m.position.copy(positions[id]).multiplyScalar(phase);
    });
  });
  return (
    <group>
      {AGENT_ORDER.map((id, i) => {
        const p = positions[id];
        const focused = focus === id;
        return (
          <group key={id}>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, p.x, p.y, p.z]), 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={AGENT_HEX[id]} transparent opacity={focus ? (focused ? 0.5 : 0.1) : surge ? 0.4 : 0.22} />
            </line>
            <mesh ref={(el) => { pulses.current[i] = el; }}>
              <sphereGeometry args={[surge ? 0.045 : 0.03, 10, 10]} />
              <meshBasicMaterial color={AGENT_HEX[id]} transparent opacity={0.95} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Inter-agent data streams — glowing packets + trails on curves        */
/* ------------------------------------------------------------------ */

export function DataStreams({
  positions,
  packetsPerRoute = 2,
  activeFrom,
  speed = 1,
  focusFrom,
}: {
  positions: Record<AgentId, THREE.Vector3>;
  packetsPerRoute?: number;
  activeFrom?: AgentId | null;
  speed?: number;
  focusFrom?: AgentId | null;
}) {
  const curves = useMemo(
    () =>
      FLOW_ROUTES.map(([a, b]) => {
        const p1 = positions[a];
        const p2 = positions[b];
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        mid.y += 0.7;
        return new THREE.QuadraticBezierCurve3(p1, mid, p2);
      }),
    [positions]
  );
  const pktRefs = useRef<Array<THREE.Mesh | null>>([]);
  const tailRefs = useRef<Array<Array<THREE.Mesh | null>>>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    FLOW_ROUTES.forEach((route, ri) => {
      const running = !activeFrom || route[0] === activeFrom;
      for (let p = 0; p < packetsPerRoute; p++) {
        const mesh = pktRefs.current[ri * packetsPerRoute + p];
        if (!mesh) continue;
        const phase = (t * 0.3 * speed + p / packetsPerRoute + ri * 0.23) % 1;
        mesh.position.copy(curves[ri].getPoint(running ? phase : 0));
        const tail = tailRefs.current[ri * packetsPerRoute + p];
        for (let k = 0; k < 3; k++) {
          const tm = tail?.[k];
          if (!tm) continue;
          tm.position.copy(curves[ri].getPoint(running ? Math.max(0, phase - 0.02 - k * 0.02) : 0));
        }
      }
    });
  });

  return (
    <group>
      {FLOW_ROUTES.map((route, ri) => {
        const color = AGENT_HEX[route[0]];
        const pts = curves[ri].getPoints(26);
        const flat = new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
        const running = !activeFrom || route[0] === activeFrom;
        const focused = focusFrom === route[0];
        const opacity = focusFrom ? (focused ? 0.6 : 0.07) : running ? 0.36 : 0.1;
        return (
          <group key={ri}>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[flat, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color={color} transparent opacity={speed > 1 ? opacity + 0.14 : opacity} />
            </line>
            {Array.from({ length: packetsPerRoute }).map((_, p) => (
              <group key={p}>
                <mesh ref={(el) => { pktRefs.current[ri * packetsPerRoute + p] = el; }}>
                  <sphereGeometry args={[0.068, 10, 10]} />
                  <meshBasicMaterial color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
                <mesh ref={(el) => { (tailRefs.current[ri * packetsPerRoute + p] ??= [])[0] = el; }}>
                  <sphereGeometry args={[0.038, 8, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
                <mesh ref={(el) => { (tailRefs.current[ri * packetsPerRoute + p] ??= [])[1] = el; }}>
                  <sphereGeometry args={[0.027, 8, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
                <mesh ref={(el) => { (tailRefs.current[ri * packetsPerRoute + p] ??= [])[2] = el; }}>
                  <sphereGeometry args={[0.019, 8, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cinematic camera — slow drift + mouse parallax + hero framing + dolly */
/* ------------------------------------------------------------------ */

export function CinematicCamera({
  dolly = 0,
  parallax = true,
  baseDistance = 10.5,
  hero = false,
  enabled = true,
}: {
  dolly?: number;
  parallax?: boolean;
  baseDistance?: number;
  hero?: boolean;
  enabled?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const target = useRef(new THREE.Vector3(0, 1.4, baseDistance));
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, dt) => {
    if (!enabled) return;
    const t = state.clock.elapsedTime;
    const dist = baseDistance - dolly;
    const heroX = hero ? -3.0 : 0;
    const px = parallax ? pointer.x * 0.5 : 0;
    const py = parallax ? pointer.y * 0.28 : 0;
    target.current.set(
      heroX + Math.sin(t * 0.16) * 1.5 + px,
      1.35 + py + Math.sin(t * 0.27) * 0.16,
      Math.cos(t * 0.11) * dist
    );
    camera.position.lerp(target.current, Math.min(1, dt * 1.35));
    camera.lookAt(look.current);
  });

  return null;
}

/* ------------------------------------------------------------------ */
/* Explore mode: gently move the orbit target toward the selected node  */
/* ------------------------------------------------------------------ */

export function FocusTarget({
  selected,
  positions,
}: {
  selected: AgentId | null;
  positions: Record<AgentId, THREE.Vector3>;
}) {
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const dest = useRef(new THREE.Vector3(0, 0, 0));
  useFrame((_, dt) => {
    if (!controls) return;
    if (selected) dest.current.copy(positions[selected]).multiplyScalar(0.5);
    else dest.current.set(0, 0, 0);
    controls.target.lerp(dest.current, Math.min(1, dt * 2.4));
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Full spatial scene                                                   */
/* ------------------------------------------------------------------ */

export function SpatialSceneContent({
  radius = 3.7,
  explore = false,
  hero = false,
  surge = false,
  selected,
  onSelect,
  onHoverChange,
  activeFrom,
  focus,
}: {
  radius?: number;
  explore?: boolean;
  hero?: boolean;
  surge?: boolean;
  selected?: AgentId | null;
  onSelect?: (id: AgentId | null) => void;
  onHoverChange?: (id: AgentId | null) => void;
  activeFrom?: AgentId | null;
  focus?: AgentId | null;
}) {
  const [hovered, setHovered] = useState<AgentId | null>(null);
  const positions = useMemo(() => agentPositions(radius), [radius]);
  const active = selected ?? null;
  const focusActive = explore ? hovered ?? selected ?? null : (focus ?? null);
  const select = (id: AgentId) => onSelect?.(id);
  const hover = (id: AgentId | null) => {
    setHovered(id);
    onHoverChange?.(id);
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.35} color="#9fd4ff" />
      <ParticleField count={explore ? 540 : 450} radius={radius * 2} />
      <CoreLuminous radius={1} pulse={surge} />
      <RingsOrbital radius={1} surge={surge} />
      <CoreBeams positions={positions} surge={surge} focus={focusActive} />
      <DataStreams positions={positions} activeFrom={activeFrom} speed={surge ? 2.2 : 1} focusFrom={focusActive} />
      {AGENT_ORDER.map((id) => (
        <AgentNode3D
          key={id}
          id={id}
          position={positions[id]}
          scale={0.9}
          selected={active === id}
          hovered={focusActive === id}
          allActive={surge}
          dimmed={focusActive !== null && focusActive !== id}
          onSelect={explore ? select : undefined}
          onHover={explore ? hover : undefined}
        />
      ))}
      {explore && hovered && (
        <Html position={positions[hovered]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="node-label">{hovered} agent</div>
        </Html>
      )}
      {explore && (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={4.5}
          maxDistance={16}
          autoRotate
          autoRotateSpeed={0.4}
          enableDamping
          dampingFactor={0.08}
        />
      )}
      {explore && <FocusTarget selected={active} positions={positions} />}
      <CinematicCamera
        enabled={!explore}
        hero={hero}
        dolly={surge ? 2.6 : 0}
        baseDistance={hero ? radius * 2.2 : radius * 2.9}
      />
    </>
  );
}
