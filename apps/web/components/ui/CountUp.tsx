"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

function parseValue(value: string): { prefix: string; suffix: string; num: number; decimals: number } {
  const m = value.match(/^([^0-9.\-]*)(-?\d+(?:\.\d+)?)(.*)$/);
  if (!m) return { prefix: value, suffix: "", num: 0, decimals: 0 };
  const num = parseFloat(m[2]);
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return { prefix: m[1], suffix: m[3], num, decimals };
}

export default function CountUp({ value, duration = 1.1 }: { value: string; duration?: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const { prefix, suffix, num, decimals } = parseValue(value);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduced) {
      setDisplay(num);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(num * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, num, duration, reduced]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
