"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CheckCircle2, FileText, Globe, Library, Link2, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import API from "@/lib/services";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import AgentIcon from "@/components/agents/AgentIcon";
import { fadeUp, stagger } from "@/lib/animations";
import type { ResearchData } from "@/lib/types";

const SOURCE_ICONS: Record<string, LucideIcon> = {
  LinkedIn: Link2,
  Crunchbase: Library,
  G2: BookOpen,
  "Company websites": Globe,
};

export default function ResearchPage() {
  const reduced = useReducedMotion();
  const [data, setData] = useState<ResearchData | null>(null);

  useEffect(() => {
    API.getResearch().then(setData);
  }, []);

  if (!data) return null;

  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Agent Workspace</p>
          <h1 className="page-title">Research</h1>
          <p className="page-sub">Persisted analysis from the latest mission — AI-generated, with provenance clearly labeled.</p>
        </div>
        <Badge color="var(--blue)" live>
          <AgentIcon agentId="research" size={13} strokeWidth={2} /> Research agent online
        </Badge>
      </div>

      <motion.div className="research-grid" variants={stagger} initial="hidden" animate="show">
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="agent-head">
                <div className="agent-icon" style={{ ["--agent-accent" as string]: "var(--blue)" }}>
                  <AgentIcon agentId="research" size={19} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="agent-name">Research Agent</div>
                  <div className="agent-role">Mission · {data.mission}</div>
                </div>
                <span className="badge">
                  <span className="status-dot live" style={{ ["--status" as string]: "var(--blue)" }} aria-hidden />
                  {data.status}
                </span>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-2)" }}>Mission progress</span>
                  <span style={{ color: "var(--text-2)", fontWeight: 650 }}>{data.progress}%</span>
                </div>
                <Progress value={data.progress} from="var(--blue)" to="var(--accent)" />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="section-title">Strategic summary</div>
              <p className="section-sub" style={{ marginBottom: 12 }}>Persisted Research agent output from the latest mission</p>
              <p className="summary-text">{data.summary}</p>
              {data.evidenceVerified ? (
                <div className="panel-note" style={{ marginTop: 12, ["--agent-accent" as string]: "var(--emerald)" }}>
                  <ShieldCheck size={13} />
                  <span><b>Verified external evidence</b> — findings backed by fetched sources.</span>
                </div>
              ) : data.analysisBasis ? (
                <div className="panel-note" style={{ marginTop: 12, ["--agent-accent" as string]: "var(--blue)" }}>
                  <Sparkles size={13} />
                  <span>
                    <b>AI-generated analysis</b> — reasoned from your business context. No external sources were
                    fetched, so nothing here is presented as verified web evidence.
                  </span>
                </div>
              ) : null}
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="section-head">
                <div>
                  <div className="section-title">Competitor observations</div>
                  <p className="section-sub">External research is not connected yet — no competitor data is fabricated</p>
                </div>
              </div>
              {data.competitors.length === 0 ? (
                <div className="feed-empty">
                  <Globe size={18} aria-hidden />
                  <div>
                    <b>No competitor data</b>
                    <span>
                      The Research agent cannot name real competitors until live web research is connected. Nothing is
                      invented to fill this space.
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th>Competitor</th>
                        <th>Positioning</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.competitors.map((c) => (
                        <tr key={c.name}>
                          <td>{c.name}</td>
                          <td>{c.positioning}</td>
                          <td>{c.strengths}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="section-title">Sources & provenance</div>
              <p className="section-sub">What actually informed this analysis</p>
              {data.sources.length === 0 ? (
                <div className="feed-empty">
                  <FileText size={18} aria-hidden />
                  <div>
                    <b>No sources accessed</b>
                    <span>External retrieval is not connected — this analysis used only your business context.</span>
                  </div>
                </div>
              ) : (
                <div className="source-list">
                  {data.sources.map((s) => {
                    const Icon = SOURCE_ICONS[s.name] ?? FileText;
                    return (
                      <div className="source-item" key={s.name} style={{ ["--agent-accent" as string]: "var(--blue)" }}>
                        <Icon size={15} />
                        <b>{s.name}</b>
                        <span>{s.kind}</span>
                        <span style={{ marginLeft: "auto", color: "var(--text-3)" }}>
                          {s.documents > 0 ? `${s.documents} docs` : "unverified"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {typeof data.confidence === "number" && (
                <div style={{ marginTop: 14 }}>
                  <div className="panel-k">
                    <span>Confidence</span>
                    <span className="panel-pct">{Math.round(data.confidence * 100)}%</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Progress value={data.confidence * 100} from="var(--blue)" to="var(--accent)" />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="section-title">Findings</div>
              <p className="section-sub">Signal extracted from the source set</p>
              {data.findings.map((f, i) => (
                <div className="finding-item" key={i}>
                  <Lightbulb size={15} />
                  <div>
                    <b>{f.title}.</b> {f.detail}
                  </div>
                </div>
              ))}
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="card-pad">
              <div className="section-title">Activity log</div>
              <p className="section-sub">This mission, minute by minute</p>
              <div className="log-list">
                {data.log.map((entry, i) => (
                  <div className="log-item" key={i}>
                    <time>{entry.time}</time>
                    {entry.ok ? <CheckCircle2 size={14} className="ok" /> : null}
                    <span>{entry.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
