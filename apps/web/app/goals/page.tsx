"use client";

import { motion, useReducedMotion } from "framer-motion";
import GoalMission from "@/components/goals/GoalMission";

export default function GoalsPage() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Orchestration</p>
          <h1 className="page-title">Goals</h1>
          <p className="page-sub">
            One objective in. Six agents coordinated. Measurable output out.
          </p>
        </div>
      </div>
      <GoalMission />
    </motion.div>
  );
}
