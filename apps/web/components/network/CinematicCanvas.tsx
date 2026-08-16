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
  return <div className="webgl-fallback">WebGL unavailable — the intelligence engine requires a WebGL-capable browser</div>;
}

export default function CinematicCanvas({
  hero = false,
  surge = false,
  focus = null,
  className,
  style,
}: {
  hero?: boolean;
  surge?: boolean;
  focus?: AgentId | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [webgl] = useState(supportsWebGL);
  return (
    <div className={className} style={style} aria-hidden>
      {webgl ? (
        <GLBoundary fallback={<Fallback />}>
          <Canvas
            dpr={[1, 1.8]}
            camera={{ position: [0, 1.5, 10.7], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          >
            <SpatialSceneContent radius={3.7} hero={hero} surge={surge} focus={focus} />
          </Canvas>
        </GLBoundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}
