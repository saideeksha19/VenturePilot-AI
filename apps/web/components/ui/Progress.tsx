"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Progress({
  value,
  from,
  to,
  className,
}: {
  value: number;
  from?: string;
  to?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={`progress ${className ?? ""}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="progress-fill"
        style={{ ["--progress-from" as string]: from ?? "var(--accent)", ["--progress-to" as string]: to ?? "var(--accent-2)" }}
        initial={{ width: reduced ? `${value}%` : 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
