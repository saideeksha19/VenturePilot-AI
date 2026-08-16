"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity as ActivityIcon, Inbox } from "lucide-react";
import AgentIcon from "@/components/agents/AgentIcon";
import { AGENTS } from "@/lib/mock-data";
import { formatClock, timeAgo } from "@/lib/utils";
import type { ActivityEvent, AgentId } from "@/lib/types";

export default function ActivityFeed({
  initial,
  onActivity,
}: {
  initial: ActivityEvent[];
  onActivity?: (agentId: AgentId) => void;
}) {
  const reduced = useReducedMotion();
  const [events, setEvents] = useState<ActivityEvent[]>(initial);

  useEffect(() => {
    if (initial.length) setEvents(initial);
  }, [initial]);

  if (events.length === 0) {
    return (
      <div className="feed-empty">
        <Inbox size={18} aria-hidden />
        <div>
          <b>No activity yet</b>
          <span>Agents are idle — new actions will stream in here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feed" role="log" aria-live="polite">
      <AnimatePresence initial={false}>
        {events.map((evt) => {
          const agent = AGENTS.find((a) => a.id === evt.agentId);
          const accent = agent?.accent ?? "var(--accent)";
          return (
            <motion.div
              key={evt.id}
              className="feed-item"
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="feed-rail">
                <span className="feed-dot" style={{ ["--agent-accent" as string]: accent }}>
                  <AgentIcon agentId={evt.agentId} size={13} strokeWidth={2} />
                </span>
                <span className="feed-line" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="feed-agent" style={{ color: accent }}>
                  {agent?.name ?? "Agent"}
                </div>
                <div className="feed-msg">{evt.message}</div>
                <div className="feed-time">
                  <ActivityIcon size={11} />
                  <span className="feed-clock">{formatClock(evt.timestamp)}</span>
                  {timeAgo(evt.timestamp)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
