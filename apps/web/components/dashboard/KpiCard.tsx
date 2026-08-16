"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "@/components/ui/Card";
import CountUp from "@/components/ui/CountUp";
import type { Kpi } from "@/lib/types";
import { fadeUp } from "@/lib/animations";

function Spark({ data, accent }: { data: number[]; accent: string }) {
  const w = 84;
  const h = 26;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="kpi-spark">
      <path d={path} fill="none" stroke={accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={accent} />
    </svg>
  );
}

export default function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={reduced ? undefined : { y: -4, scale: 1.01 }}
      style={{ transformPerspective: 900 }}
    >
      <Card hover className="kpi" style={{ ["--kpi-accent" as string]: kpi.accent }}>
        <div className="kpi-top">
          <span className="kpi-label">{kpi.label}</span>
          <Spark data={kpi.spark} accent={kpi.accent} />
        </div>
        <div className="kpi-value">
          <CountUp value={kpi.value} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {kpi.delta ? (
            <span className={`kpi-delta ${kpi.deltaDir === "up" ? "up" : "down"}`}>
              {kpi.deltaDir === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {kpi.delta}
            </span>
          ) : null}
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{kpi.hint}</span>
        </div>
      </Card>
    </motion.div>
  );
}
