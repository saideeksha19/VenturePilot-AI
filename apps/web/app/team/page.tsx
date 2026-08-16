"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Clock, MousePointerClick } from "lucide-react";
import API from "@/lib/services";
import AgentCard from "@/components/agents/AgentCard";
import AgentDetailPanel from "@/components/agents/AgentDetailPanel";
import AgentIcon from "@/components/agents/AgentIcon";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import SectionHead from "@/components/ui/SectionHead";
import { fadeUp, stagger } from "@/lib/animations";
import type { Agent, AgentId } from "@/lib/types";

const SpatialNetwork = dynamic(() => import("@/components/network/SpatialNetwork"), { ssr: false });

export default function TeamPage() {
  const reduced = useReducedMotion();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [openAgent, setOpenAgent] = useState<AgentId | null>(null);

  useEffect(() => {
    API.getAgents().then((list) => {
      setAgents(list);
      setSelected(list[0]?.id ?? null);
    });
  }, []);

  const current = agents.find((a) => a.id === selected) ?? null;

  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Agent Network</p>
          <h1 className="page-title">AI Team</h1>
          <p className="page-sub">
            A spatial view of the operating system — one core, six specialists, connected by live data streams.
          </p>
        </div>
        <div className="network-legend">
          {agents.map((a) => (
            <span key={a.id} className="core-chip" style={{ ["--agent-accent" as string]: a.accent }}>
              {a.name}
            </span>
          ))}
        </div>
      </div>

      <div className="network-shell">
        <div style={{ minWidth: 0 }}>
          <SpatialNetwork selected={selected} onSelect={setSelected} />
        </div>

        <Card className="card-pad" style={{ minHeight: "min(660px, 74vh)", display: "flex", flexDirection: "column" }}>
          {current ? (
            <motion.div
              key={current.id}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
              initial={reduced ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="agent-head" style={{ marginBottom: 16 }}>
                <div className="agent-icon" style={{ width: 46, height: 46 }}>
                  <AgentIcon agentId={current.id} size={21} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="agent-name" style={{ fontSize: 17 }}>{current.name} Agent</div>
                  <div className="agent-role">{current.role}</div>
                </div>
                <span className="badge">
                  <span className="status-dot live" style={{ ["--status" as string]: current.accent }} aria-hidden />
                  {current.status}
                </span>
              </div>

              <p style={{ color: "var(--text-2)", lineHeight: 1.55, margin: "0 0 18px", fontSize: 13.5 }}>{current.blurb}</p>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-2)", fontWeight: 600 }}>Current task</span>
                  <span style={{ color: "var(--text-2)", fontWeight: 650 }}>{current.progress}%</span>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 550 }}>{current.task}</p>
                <Progress value={current.progress} from={current.accent} to={current.accent} />
              </div>

              <div className="agent-activity" style={{ fontSize: 12.5, marginBottom: 22 }}>
                <Clock size={13} /> Last action · {current.activity}
              </div>

              <div style={{ marginTop: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button
                  href={current.id === "research" ? "/research" : "/activity"}
                  variant={current.id === "research" ? "primary" : "ghost"}
                >
                  Open workspace <ArrowUpRight size={14} />
                </Button>
                <Button href="/goals" variant="ghost">Assign objective</Button>
              </div>
            </motion.div>
          ) : (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Select an agent node to inspect it.</div>
          )}
          <div className="divider" />
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 12 }}>
            <MousePointerClick size={14} /> Click any node in the network to inspect its agent.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 28 }}>
        <motion.div variants={stagger} initial="hidden" animate="show">
          <SectionHead title="Agent roster" sub="Every specialist on the team, with live status" />
          <div className="agent-grid">
            {agents.map((agent, i) => (
              <motion.div key={agent.id} variants={fadeUp} custom={i}>
                <AgentCard agent={agent} index={i} onOpen={setOpenAgent} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <AgentDetailPanel agentId={openAgent} onClose={() => setOpenAgent(null)} />
    </motion.div>
  );
}
