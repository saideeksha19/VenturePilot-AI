"use client";

import { Canvas } from "@react-three/fiber";
import { Component, useState } from "react";
import { SpatialSceneContent } from "./spatial";
import type { AgentId } from "@/lib/types";

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

function Fallback() {
  return <div className="webgl-fallback">3D network unavailable — WebGL is disabled in this browser</div>;
}

export default function SpatialNetwork({
  selected,
  onSelect,
}: {
  selected: AgentId | null;
  onSelect: (id: AgentId | null) => void;
}) {
  const [webgl] = useState(supportsWebGL);
  return (
    <div className="network-canvas-wrap">
      {webgl ? (
        <GLBoundary fallback={<Fallback />}>
          <Canvas
            dpr={[1, 1.8]}
            camera={{ position: [0, 2.6, 10], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
            onPointerMissed={() => onSelect(null)}
          >
            <SpatialSceneContent radius={3.7} explore selected={selected} onSelect={onSelect} />
          </Canvas>
        </GLBoundary>
      ) : (
        <Fallback />
      )}
      <div className="network-hint">Drag to rotate · scroll to zoom · click an agent to inspect</div>
    </div>
  );
}
