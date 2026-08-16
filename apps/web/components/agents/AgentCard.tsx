"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import AgentIcon from "@/components/agents/AgentIcon";
import type { Agent } from "@/lib/types";
import { fadeUp } from "@/lib/animations";
import { timeAgo } from "@/lib/utils";
import { setAgentFocus } from "@/lib/agent-hub";

export default function AgentCard({
  agent,
  highlight = false,
  index = 0,
  onOpen,
}: {
  agent: Agent;
  highlight?: boolean;
  index?: number;
  onOpen?: (id: Agent["id"]) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      whileHover={reduced ? undefined : { y: -5, rotateX: 2.5, rotateY: -1.5, scale: 1.015 }}
      style={{ transformPerspective: 900 }}
      animate={highlight ? { boxShadow: `0 0 0 1px ${agent.accent}, 0 0 40px color-mix(in srgb, ${agent.accent} 32%, transparent)` } : undefined}
      transition={{ duration: 0.45 }}
      onMouseEnter={() => setAgentFocus(agent.id)}
      onMouseLeave={() => setAgentFocus(null)}
      onClick={() => onOpen?.(agent.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(agent.id);
        }
      }}
    >
      <Card hover className={`agent-card agent-${agent.id}`} style={{ ["--agent-accent" as string]: agent.accent }}>
        <div className="agent-viz" aria-hidden>
          <span className="viz-dot" />
        </div>

        <div className="agent-head">
          <div className="agent-icon">
            <AgentIcon agentId={agent.id} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="agent-name">{agent.name}</div>
            <div className="agent-role">{agent.role}</div>
          </div>
          <span className="badge">
            <span className="status-dot live" style={{ ["--status" as string]: agent.accent }} aria-hidden />
            {agent.status}
          </span>
        </div>

        <p className="agent-task">{agent.task}</p>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span className="agent-last">
              <Check size={12} style={{ color: agent.accent }} aria-hidden />
              {agent.activity}
            </span>
            <span className="agent-pct">{agent.progress}%</span>
          </div>
          <Progress value={agent.progress} from={agent.accent} to={agent.accent} />
          <div className="agent-stream" aria-hidden />
        </div>

        <div className="agent-foot">
          <span className="agent-time">
            <Clock size={11} /> Last action {timeAgo(agent.lastActive)}
          </span>
          <span className="section-link">
            Inspect <ArrowUpRight size={13} />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
