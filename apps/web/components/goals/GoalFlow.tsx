"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Component, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AGENT_HEX } from "@/lib/mock-data";
import type { AgentId } from "@/lib/types";

const ORDER: AgentId[] = ["ceo", "research", "prospecting", "sales", "marketing", "analytics"];

function nodePositions(): Record<AgentId, THREE.Vector3> {
  const out = {} as Record<AgentId, THREE.Vector3>;
  ORDER.forEach((id, i) => {
    out[id] = new THREE.Vector3((i - 2.5) * 1.02, Math.sin(i * 1.05) * 0.3, 0);
  });
  return out;
}

function segmentCurve(pos: Record<AgentId, THREE.Vector3>, from: AgentId, to: AgentId): THREE.QuadraticBezierCurve3 {
  const a = pos[from];
  const b = pos[to];
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y += 0.34;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

function FlowNode({
  id,
  position,
  active,
  done,
}: {
  id: AgentId;
  position: THREE.Vector3;
  active: boolean;
  done: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const color = AGENT_HEX[id];
  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 5) * 0.14 : 1;
    mesh.current.scale.setScalar(pulse);
  });
  return (
    <group position={position}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.13, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active || done ? 1 : 0.4} />
      </mesh>
      <sprite scale={[active ? 0.8 : 0.45, active ? 0.8 : 0.45, 1]}>
        <spriteMaterial
          map={useMemo(() => {
            if (typeof document === "undefined") return null;
            const c = document.createElement("canvas");
            c.width = c.height = 64;
            const ctx = c.getContext("2d");
            if (!ctx) return null;
            const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, "rgba(255,255,255,0.8)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 64, 64);
            return new THREE.CanvasTexture(c);
          }, [])}
          color={done ? "#34d399" : color}
          transparent
          opacity={active ? 0.8 : 0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

function FlowScene({ activeIndex, completed }: { activeIndex: number; completed: number[] }) {
  const pos = useMemo(() => nodePositions(), []);
  const packet = useRef<THREE.Mesh | null>(null);
  const curve = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= ORDER.length - 1) return null;
    return segmentCurve(pos, ORDER[activeIndex], ORDER[activeIndex + 1]);
  }, [activeIndex, pos]);

  useFrame(({ clock }) => {
    if (packet.current && curve) {
      packet.current.position.copy(curve.getPoint((clock.elapsedTime * 0.42) % 1));
    }
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[0, 3, 4]} intensity={1.1} color="#9fd4ff" />
      {ORDER.map((id, i) => (
        <FlowNode key={id} id={id} position={pos[id]} active={i === activeIndex} done={completed.includes(i)} />
      ))}
      {ORDER.slice(0, -1).map((id, i) => {
        const c = segmentCurve(pos, ORDER[i], ORDER[i + 1]);
        const pts = c.getPoints(20);
        const flat = new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
        const lit = i < activeIndex || completed.includes(i);
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[flat, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={AGENT_HEX[ORDER[i + 1]]} transparent opacity={lit ? 0.5 : 0.16} />
          </line>
        );
      })}
      {curve && (
        <mesh ref={packet}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color="#aee4ff" />
        </mesh>
      )}
    </>
  );
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

class GLBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function GoalFlow({ activeIndex, completed }: { activeIndex: number; completed: number[] }) {
  const [webgl] = useState(supportsWebGL);
  if (!webgl) return <div className="flow-canvas-wrap" />;
  return (
    <div className="flow-canvas-wrap">
      <GLBoundary fallback={<div className="flow-canvas-wrap" />}>
        <Canvas dpr={[1, 1.8]} camera={{ position: [0, 0.4, 4.7], fov: 40 }} gl={{ antialias: true, alpha: true }}>
          <FlowScene activeIndex={activeIndex} completed={completed} />
        </Canvas>
      </GLBoundary>
    </div>
  );
}
