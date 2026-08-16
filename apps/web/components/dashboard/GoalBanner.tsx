"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Target } from "lucide-react";
import Button from "@/components/ui/Button";
import CountUp from "@/components/ui/CountUp";
import Progress from "@/components/ui/Progress";
import type { Goal } from "@/lib/types";

export default function GoalBanner({ goal }: { goal: Goal }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="goal-banner"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{ minWidth: 0 }}>
        <span className="goal-label">
          <Target size={13} /> Global objective
        </span>
        <h2 className="goal-text">{goal.title}</h2>
        <div className="goal-meta">
          <div className="goal-progress-num">
            <CountUp value={`${goal.progress}%`} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="goal-status">
              <span className="status-dot live" style={{ ["--status" as string]: "var(--accent)" }} aria-hidden />
              {goal.status}
            </div>
            <div className="goal-progress-track" style={{ marginTop: 10 }}>
              <Progress value={goal.progress} from="var(--accent)" to="var(--cyan)" />
            </div>
          </div>
        </div>
      </div>
      <Button href="/goals" variant="solid">
        View mission <ArrowRight size={15} />
      </Button>
    </motion.div>
  );
}
