"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import API from "@/lib/services";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import type { ActivityEvent, AgentId } from "@/lib/types";

export default function ActivityPage() {
  const reduced = useReducedMotion();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [, setFlash] = useState<AgentId | null>(null);

  useEffect(() => {
    API.getActivities(12).then(setActivities);
  }, []);

  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Agent Stream</p>
          <h1 className="page-title">Live Activity</h1>
          <p className="page-sub">Every action your AI team takes, as it happens — research reads, lead verifications, drafts, and decisions.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Badge color="var(--emerald)" live>Streaming</Badge>
          <Badge>6 agents</Badge>
        </div>
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 820 }}
      >
        <Card className="card-pad">
          <div className="section-head">
            <div>
              <div className="section-title">Event timeline</div>
              <p className="section-sub">New events stream in as agents complete work</p>
            </div>
            <span className="badge">
              <span className="status-dot live" style={{ ["--status" as string]: "var(--accent)" }} aria-hidden />
              Real-time
            </span>
          </div>
          <div className="divider" />
          <ActivityFeed initial={activities} onActivity={setFlash} />
        </Card>
      </motion.div>
    </motion.div>
  );
}
