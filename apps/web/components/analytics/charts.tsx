"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AGENT_HEX, AGENTS } from "@/lib/mock-data";
import type { AgentContribution, AgentId, FunnelStage } from "@/lib/types";

const AGENT_ORDER: AgentId[] = ["ceo", "research", "prospecting", "sales", "marketing", "analytics"];

const W = 640;
const PAD_X = 10;
const PAD_Y = 20;

function smoothPath(pts: number[][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function LineChart({
  data,
  height = 180,
  stroke = "var(--accent)",
  fill = "rgba(76, 194, 255, 0.13)",
  formatValue = (v: number) => String(v),
}: {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: string;
  formatValue?: (v: number) => string;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const h = height;
  const { pts } = useMemo(() => {
    const max = Math.max(...data) * 1.06;
    const min = Math.min(...data) * 0.94;
    const range = max - min || 1;
    const points = data.map((v, i) => [
      PAD_X + (i / Math.max(1, data.length - 1)) * (W - PAD_X * 2),
      PAD_Y + (1 - (v - min) / range) * (h - PAD_Y * 2),
    ]);
    return { pts: points };
  }, [data, h]);
  const path = useMemo(() => smoothPath(pts), [pts]);
  const area = `${path} L ${pts[pts.length - 1][0]} ${h - PAD_Y} L ${pts[0][0]} ${h - PAD_Y} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${h}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((x - PAD_X) / (W - PAD_X * 2)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`fill-${stroke.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + g * (h - PAD_Y * 2)} y2={PAD_Y + g * (h - PAD_Y * 2)} stroke="rgba(160,178,205,0.08)" strokeDasharray="3 5" />
        ))}

        <motion.path d={area} fill={`url(#fill-${stroke.replace(/[^a-zA-Z0-9]/g, "")})`} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
        <motion.path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {hover !== null && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={PAD_Y} y2={h - PAD_Y} stroke="rgba(160,178,205,0.25)" strokeDasharray="2 4" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} fill={stroke} />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={8} fill={stroke} opacity={0.2} />
          </>
        )}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(pts[hover][0] / W) * 100}%`,
            transform: "translateX(-50%)",
            background: "rgba(10,13,19,0.92)",
            border: "1px solid var(--border-2)",
            borderRadius: 8,
            padding: "5px 9px",
            fontSize: 12,
            fontWeight: 650,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "var(--shadow-2)",
          }}
        >
          {formatValue(data[hover])}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  values,
  height = 180,
  labels,
  colorFor = (_i: number, _v: number) => "var(--accent)",
}: {
  values: number[];
  height?: number;
  labels?: string[];
  colorFor?: (index: number, value: number) => string;
}) {
  const reduced = useReducedMotion();
  const w = 640;
  const h = height;
  const padX = 26;
  const max = Math.max(...values) * 1.12;
  const slot = (w - padX * 2) / values.length;
  const barW = Math.min(44, slot * 0.52);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {values.map((v, i) => {
        const bh = (v / max) * (h - 42);
        const x = padX + slot * i + (slot - barW) / 2;
        const y = h - 30 - bh;
        const color = colorFor(i, v);
        return (
          <g key={i}>
            <motion.rect
              x={x}
              width={barW}
              rx={7}
              fill={color}
              initial={reduced ? false : { height: 0, y: h - 30 }}
              animate={{ height: bh, y }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize={11} fill="var(--text-2)" fontWeight={650}>
              {v}
            </text>
            <text x={x + barW / 2} y={h - 12} textAnchor="middle" fontSize={10.5} fill="var(--text-3)" fontWeight={550}>
              {labels?.[i] ?? i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MetricRing({
  value,
  size = 170,
  strokeWidth = 10,
  color = "var(--emerald)",
  label = "Efficiency",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;

  return (
    <div className="metric-ring-wrap" style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(160,178,205,0.1)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="metric-ring-center" style={{ inset: 0 }}>
        <div className="metric-ring-val">{value}%</div>
        <div className="metric-ring-lbl">{label}</div>
      </div>
    </div>
  );
}

export function FunnelChart({ stages, color = "var(--accent)" }: { stages: FunnelStage[]; color?: string }) {
  const reduced = useReducedMotion();
  const max = Math.max(...stages.map((s) => s.value));
  return (
    <div className="funnel">
      {stages.map((s, i) => {
        const w = (s.value / max) * 100;
        return (
          <div className="funnel-row" key={s.label}>
            <div className="funnel-meta">
              <span className="funnel-lbl">{s.label}</span>
              <span className="funnel-val">{s.value}</span>
            </div>
            <div className="funnel-track">
              <motion.div
                className="funnel-bar"
                style={{ width: `${w}%`, ["--funnel-c" as string]: color, opacity: 1 - i * 0.13 }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContributionChart({ data }: { data: AgentContribution[] }) {
  const reduced = useReducedMotion();
  const max = Math.max(...data.map((c) => c.pct));
  return (
    <div className="contrib">
      {data.map((c) => {
        const agent = AGENTS.find((a) => a.id === c.agentId);
        return (
          <div className="contrib-row" key={c.agentId}>
            <span className="contrib-name">{agent?.name ?? c.agentId}</span>
            <div className="contrib-track">
              <motion.div
                className="contrib-bar"
                style={{ ["--contrib-c" as string]: AGENT_HEX[c.agentId] }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(c.pct / max) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="contrib-val">{c.pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function barColorFor(index: number, _v: number): string {
  return AGENT_HEX[AGENT_ORDER[index]];
}

export { AGENT_ORDER };
