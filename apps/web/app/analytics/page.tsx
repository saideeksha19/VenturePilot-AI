"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import API from "@/lib/services";
import Card from "@/components/ui/Card";
import {
  AGENT_ORDER,
  BarChart,
  ContributionChart,
  FunnelChart,
  LineChart,
  MetricRing,
  barColorFor,
} from "@/components/analytics/charts";
import { AGENTS, GOAL } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsSet, DateRange } from "@/lib/types";

const RANGES: DateRange[] = ["7D", "30D", "90D"];

export default function AnalyticsPage() {
  const reduced = useReducedMotion();
  const [range, setRange] = useState<DateRange>("7D");
  const [data, setData] = useState<AnalyticsSet | null>(null);

  useEffect(() => {
    API.getAnalyticsCharts(range).then(setData);
  }, [range]);

  const agentNames = AGENT_ORDER.map((id) => AGENTS.find((a) => a.id === id)?.name ?? id);

  return (
    <motion.div
      className="page-enter"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Intelligence</p>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">How the business and the AI team are trending — modeled continuously by the Analytics agent.</p>
        </div>
        <div className="date-filter" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-note" style={{ marginBottom: 18, ["--agent-accent" as string]: "var(--accent)" }}>
        <Sparkles size={13} />
        <span>
          <b>Development mode — modeled demo data.</b> These charts are generated projections, not real
          measurements. No live analytics, traffic, revenue, or conversion source is connected yet.
        </span>
      </div>

      {data && (
        <>
          <div className="analytics-grid">
            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Revenue Trajectory</h2>
                  <p className="chart-sub">Modeled projection — no external data source · {range}</p>
                </div>
                <span className="badge">
                  <span className="status-dot live" style={{ ["--status" as string]: "var(--accent)" }} aria-hidden />
                  Modeled
                </span>
              </div>
              <div className="chart-value">{formatCurrency(data.revenue[data.revenue.length - 1])}</div>
              <div style={{ marginTop: 14 }}>
                <LineChart data={data.revenue} stroke="var(--accent)" formatValue={formatCurrency} />
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Operational Efficiency</h2>
                  <p className="chart-sub">Weighted throughput of the agent team · {range}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
                <MetricRing value={data.efficiency} color="var(--emerald)" label="Team efficiency" />
                <div className="radar-bars" style={{ flex: 1, minWidth: 180 }}>
                  {data.efficiencyBars.map((b) => (
                    <div className="radar-row" key={b.label}>
                      <span className="radar-lbl">{b.label}</span>
                      <div className="progress">
                        <motion.div
                          className="progress-fill"
                          style={{ ["--progress-from" as string]: "var(--teal)", ["--progress-to" as string]: "var(--accent)" }}
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${b.value}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="radar-val">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="analytics-grid" style={{ marginTop: 20 }}>
            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Qualified Opportunities</h2>
                  <p className="chart-sub">ICP-qualified pipeline added · {range}</p>
                </div>
              </div>
              <div className="chart-value">+{data.opportunities[data.opportunities.length - 1]}</div>
              <div style={{ marginTop: 14 }}>
                <LineChart data={data.opportunities} stroke="var(--teal)" fill="rgba(45,212,191,0.13)" />
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Agent Productivity</h2>
                  <p className="chart-sub">Actions completed per agent · {range}</p>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <BarChart values={data.productivity} labels={agentNames} colorFor={barColorFor} />
              </div>
            </Card>
          </div>

          <div className="analytics-grid" style={{ marginTop: 20 }}>
            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Opportunity Funnel</h2>
                  <p className="chart-sub">ICP → conversation, live pipeline · {range}</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <FunnelChart stages={data.funnel} />
              </div>
            </Card>

            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Agent Contribution</h2>
                  <p className="chart-sub">Share of goal-relevant actions · {range}</p>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <ContributionChart data={data.contribution} />
              </div>
            </Card>
          </div>

          <div className="analytics-grid" style={{ marginTop: 20 }}>
            <Card className="chart-card">
              <div className="section-head">
                <div>
                  <h2 className="chart-title">Goal Completion Rate</h2>
                  <p className="chart-sub">Progress on the active global objective · {range}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap", marginTop: 6 }}>
                <MetricRing value={data.goalCompletion} size={150} color="var(--accent)" label="Completion" />
                <div style={{ flex: 1, minWidth: 200, color: "var(--text-2)", fontSize: 13.5, lineHeight: 1.55 }}>
                  <b style={{ color: "var(--text)" }}>“{GOAL.title}”</b>
                  <br />
                  Tracked continuously by the Analytics agent and supervised by the CEO.
                </div>
              </div>
            </Card>

            <Card className="chart-card insight-card">
              <div className="section-head">
                <div>
                  <p className="page-eyebrow" style={{ marginBottom: 6 }}>AI Insight</p>
                  <h2 className="chart-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={15} style={{ color: "var(--accent)" }} aria-hidden />
                    What the system sees
                  </h2>
                </div>
                <span className="badge">
                  <span className="status-dot live" style={{ ["--status" as string]: "var(--accent)" }} aria-hidden />
                  Modeled by Analytics
                </span>
              </div>
              <p className="insight-text">“{data.insight}”</p>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  );
}
