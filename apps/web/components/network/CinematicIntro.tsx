"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight, Network } from "lucide-react";
import { useRef } from "react";

const AGENT_LINE = ["Core online", "Research linked", "Prospecting linked", "Sales linked", "Marketing linked", "Analytics linked"];

function Magnetic({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.22);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} onMouseMove={onMove} onMouseLeave={onLeave} className="magnetic">
      {children}
    </motion.div>
  );
}

export default function CinematicIntro({ entering, onEnter }: { entering: boolean; onEnter: () => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="hero-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        className="hero-copy"
        initial={reduced ? false : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="hero-eyebrow">
          <Network size={13} strokeWidth={2.2} aria-hidden />
          VenturePilot AI · Autonomous intelligence
        </p>

        <h1 className="hero-title">
          Your AI team is
          <br />
          <span className="hero-accent">already working.</span>
        </h1>
        <p className="hero-accent-line">while you focus on what matters.</p>
        <p className="hero-sub">Six specialized agents coordinating research, outreach, sales, marketing and analytics — in real time.</p>

        <div className="hero-cta">
          <Magnetic>
            <button className="btn btn-solid btn-enter" onClick={onEnter} disabled={entering}>
              {entering ? "Synchronizing agent network…" : "Enter Command Center"}
              {!entering && <ArrowRight size={15} aria-hidden />}
            </button>
          </Magnetic>
        </div>

        <div className="intro-status hero-status">
          {AGENT_LINE.map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0 }}
              animate={{ opacity: entering ? 0.35 : 1 }}
              transition={{ delay: 0.7 + i * 0.18, duration: 0.4 }}
            >
              <span className="status-dot live" style={{ ["--status" as string]: "var(--emerald)" }} aria-hidden />
              {line}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
