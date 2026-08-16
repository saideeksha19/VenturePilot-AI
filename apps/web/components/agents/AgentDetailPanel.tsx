"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, BarChart3, CheckCircle2, Clock, Database, ListChecks, Megaphone, Radio, Send, ShieldCheck, Sparkles, Target, TrendingUp, X } from "lucide-react";
import AgentIcon from "@/components/agents/AgentIcon";
import Progress from "@/components/ui/Progress";
import API from "@/lib/services";
import { formatClock } from "@/lib/utils";
import { AGENT_DETAILS, AGENTS } from "@/lib/mock-data";
import type { AgentDetailRecord, AgentId } from "@/lib/types";

export default function AgentDetailPanel({
  agentId,
  onClose,
}: {
  agentId: AgentId | null;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [real, setReal] = useState<AgentDetailRecord | null>(null);

  // Pull the agent's live detail from the backend when the panel opens.
  // On connectivity failure the service falls back to the mock detail, so
  // the panel always renders something meaningful.
  useEffect(() => {
    setReal(null);
    if (!agentId) return;
    let cancelled = false;
    API.getAgentDetail(agentId)
      .then((detail) => {
        if (!cancelled) setReal(detail);
      })
      .catch(() => {
        /* mock fallback handled inside the service */
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const agent = AGENTS.find((a) => a.id === agentId);
  const mock = agentId ? AGENT_DETAILS[agentId] : null;

  if (!agent || !mock) return null;

  const status = real?.status ?? mock.status;
  const mission = real?.mission ?? mock.mission;
  const task = real?.current_task ?? mock.task;
  const progress = real?.progress ?? mock.progress;
  const recentActions = real?.recent_actions?.length ? real.recent_actions : mock.recentActions;
  const confidence = real?.confidence ?? mock.confidence;
  const lastSync = real?.last_sync ? `Synced ${formatClock(new Date(real.last_sync).getTime())}` : `Synced ${mock.lastSync}`;
  const result = real?.result ?? null;
  const output = result?.summary ?? mock.output;
  const recommended =
    result && "recommended_next_action" in result ? (result.recommended_next_action ?? null) : null;

  // Real backend detail (not the mock fallback) — used to keep the sources
  // section honest: never show mock chips over real data.
  const hasRealDetail = real !== null && real.result !== null;
  const evidenceVerified = real?.evidence_verified ?? null;
  const realSources = result && "sources" in result && result.sources?.length ? result.sources : null;
  const simulated = result?.simulated ?? false;
  // Prospecting structured intelligence, when present.
  const prospecting =
    agentId === "prospecting" && result && "ideal_customer_profile" in result
      ? (result as { ideal_customer_profile?: string; target_segments?: { name: string; description: string; size_hint: string | null }[]; qualification_criteria?: string[]; priority_actions?: { action: string; rationale: string }[]; estimated_opportunity_count?: number; scoring_factors?: { factor: string; weight: number }[] })
      : null;
  // Sales structured outreach, when present.
  const sales =
    agentId === "sales" && result && "outreach_message" in result
      ? (result as { target_profile?: string; personalization_rationale?: string; recommended_channel?: string; subject_line?: string; outreach_message?: string; follow_up_message?: string; call_to_action?: string })
      : null;
  // Marketing structured campaign strategy, when present.
  const marketing =
    agentId === "marketing" && result && "campaign_variants" in result
      ? (result as { campaign_objective?: string; target_audience?: string; positioning?: string; key_message?: string; campaign_angle?: string; recommended_channels?: string[]; campaign_variants?: { variant_name: string; headline: string; supporting_copy: string; call_to_action: string; target_segment: string; rationale: string }[]; call_to_action?: string; content_themes?: string[]; success_metrics?: string[] })
      : null;
  // Analytics structured performance intelligence, when present.
  const analytics =
    agentId === "analytics" && result && "kpis" in result
      ? (result as { kpis?: { name: string; value: number | null; unit: string; source: string; note: string | null }[]; funnel?: { stage: string; count: number; conversion_from_previous: number | null; source: string }[]; overall_conversion_rate?: number; strongest_signals?: { signal: string; direction: string; rationale: string }[]; weak_signals?: { signal: string; direction: string; rationale: string }[]; risks?: string[]; opportunities?: string[]; recommended_actions?: string[]; data_basis?: string })
      : null;
  // Sources: prefer structured source refs when real data exists; only fall
  // back to the mock presentation chips when no real result is available.
  const sources: string[] = hasRealDetail
    ? (realSources ? realSources.map((s) => s.label) : [])
    : mock.sources;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="panel-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.aside
        key="panel"
        className="agent-panel"
        role="dialog"
        aria-label={`${agent.name} agent details`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
      >
        <div className="panel-head">
          <div className="agent-icon" style={{ width: 44, height: 44 }}>
            <AgentIcon agentId={agent.id} size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="agent-name" style={{ fontSize: 16 }}>{agent.name} Agent</div>
            <div className="agent-role">{real?.role ?? agent.role}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close panel">
            <X size={16} />
          </button>
        </div>

        <div className="divider" />

        <div className="panel-status">
          <span className="badge">
            <span className="status-dot live" style={{ ["--status" as string]: agent.accent }} aria-hidden />
            {status}
          </span>
          <span className="panel-sync">
            <Clock size={12} /> {lastSync}
          </span>
          {simulated && hasRealDetail && (
            <span className="badge" style={{ marginLeft: "auto" }}>Development mode</span>
          )}
        </div>

        <div className="panel-section">
          <div className="panel-k">
            <span>Current mission</span>
            <Radio size={12} />
          </div>
          <p className="panel-v">{mission}</p>
        </div>

        <div className="panel-section">
          <div className="panel-k">
            <span>Current task</span>
            <span className="panel-pct">{progress}%</span>
          </div>
          <p className="panel-v" style={{ fontWeight: 550 }}>{task}</p>
          <div style={{ marginTop: 10 }}>
            <Progress value={progress} from={agent.accent} to={agent.accent} />
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-k">
            <span>Recent actions</span>
            <ListChecks size={12} />
          </div>
          <div className="panel-actions">
            {recentActions.map((a, i) => (
              <div className="panel-action" key={a}>
                <CheckCircle2 size={13} style={{ color: "var(--emerald)", flex: "none" }} />
                <span>{a}</span>
                {i === 0 && <em>latest</em>}
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-k">
            <span>Sources</span>
            <Database size={12} />
          </div>
          {evidenceVerified === false && (
            <div className="panel-note" style={{ ["--agent-accent" as string]: agent.accent }}>
              <Sparkles size={13} />
              <span>
                <b>AI-generated analysis</b> — reasoned from your business context. No external sources were fetched,
                so nothing here is presented as verified web evidence.
              </span>
            </div>
          )}
          {evidenceVerified === true && (
            <div className="panel-note" style={{ ["--agent-accent" as string]: agent.accent }}>
              <ShieldCheck size={13} />
              <span>
                <b>Verified external evidence</b> — findings backed by fetched sources.
              </span>
            </div>
          )}
          {hasRealDetail && sources.length === 0 ? (
            <div className="panel-note" style={{ ["--agent-accent" as string]: agent.accent }}>
              <Database size={13} />
              <span>
                <b>No external data sources accessed</b> — target profiles are illustrative models, not verified
                prospects or fetched records.
              </span>
            </div>
          ) : (
            <div className="panel-chips">
              {sources.map((s) => (
                <span className="core-chip" key={s} style={{ ["--agent-accent" as string]: agent.accent }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {prospecting && (
          <div className="panel-section">
            <div className="panel-k">
              <span>Pipeline strategy</span>
              <Target size={12} />
            </div>
            {prospecting.ideal_customer_profile && (
              <p className="panel-v" style={{ lineHeight: 1.55 }}>
                <b>Ideal customer profile:</b> {prospecting.ideal_customer_profile}
              </p>
            )}
            {!!prospecting.target_segments?.length && (
              <div className="panel-chips">
                {prospecting.target_segments.map((s) => (
                  <span className="core-chip" key={s.name} style={{ ["--agent-accent" as string]: agent.accent }}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
            {!!prospecting.qualification_criteria?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {prospecting.qualification_criteria.map((c) => (
                  <div className="panel-action" key={c}>
                    <CheckCircle2 size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}
            {!!prospecting.priority_actions?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {prospecting.priority_actions.map((a) => (
                  <div className="panel-action" key={a.action}>
                    <ListChecks size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>{a.action}</span>
                  </div>
                ))}
              </div>
            )}
            {typeof prospecting.estimated_opportunity_count === "number" && (
              <p className="panel-v" style={{ marginTop: 10, color: "var(--text-2)", fontSize: 13 }}>
                Modeled opportunity pool: <b style={{ color: "var(--text)" }}>{prospecting.estimated_opportunity_count}</b>{" "}
                (estimate — not a verified lead count)
              </p>
            )}
          </div>
        )}

        {sales && (
          <div className="panel-section">
            <div className="panel-k">
              <span>Generated outreach</span>
              <Send size={12} />
            </div>
            {sales.target_profile && (
              <p className="panel-v" style={{ lineHeight: 1.55 }}>
                <b>Target profile:</b> {sales.target_profile}{" "}
                <em style={{ color: "var(--text-3)", fontSize: 12 }}>(illustrative — modeled, not a verified lead)</em>
              </p>
            )}
            {sales.personalization_rationale && (
              <p className="panel-v" style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.55 }}>
                <b>Why this angle:</b> {sales.personalization_rationale}
              </p>
            )}
            {sales.recommended_channel && (
              <p className="panel-v" style={{ marginTop: 8, fontSize: 13 }}>
                <b>Channel:</b> {sales.recommended_channel}
              </p>
            )}
            {sales.subject_line && (
              <div className="outreach-block" style={{ marginTop: 10 }}>
                <div className="panel-k">
                  <span>Subject</span>
                </div>
                <p className="panel-v" style={{ fontWeight: 600 }}>{sales.subject_line}</p>
              </div>
            )}
            {sales.outreach_message && (
              <div className="outreach-block" style={{ marginTop: 8 }}>
                <div className="panel-k">
                  <span>Message</span>
                </div>
                <p className="panel-v" style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "var(--text-2)" }}>{sales.outreach_message}</p>
              </div>
            )}
            {sales.follow_up_message && (
              <div className="outreach-block" style={{ marginTop: 8 }}>
                <div className="panel-k">
                  <span>Follow-up</span>
                </div>
                <p className="panel-v" style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "var(--text-3)", fontSize: 13 }}>{sales.follow_up_message}</p>
              </div>
            )}
            {sales.call_to_action && (
              <p className="panel-v" style={{ marginTop: 10, fontSize: 13 }}>
                <b>CTA:</b> {sales.call_to_action}
              </p>
            )}
          </div>
        )}

        {marketing && (
          <div className="panel-section">
            <div className="panel-k">
              <span>Campaign strategy</span>
              <Megaphone size={12} />
            </div>
            {marketing.campaign_objective && (
              <p className="panel-v" style={{ lineHeight: 1.55 }}>
                <b>Campaign objective:</b> {marketing.campaign_objective}
              </p>
            )}
            {marketing.target_audience && (
              <p className="panel-v" style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.55 }}>
                <b>Target audience:</b> {marketing.target_audience}
              </p>
            )}
            {marketing.positioning && (
              <p className="panel-v" style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.55 }}>
                <b>Positioning:</b> {marketing.positioning}
              </p>
            )}
            {marketing.key_message && (
              <p className="panel-v" style={{ marginTop: 8, lineHeight: 1.55 }}>
                <b>Key message:</b> {marketing.key_message}
              </p>
            )}
            {marketing.campaign_angle && (
              <p className="panel-v" style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.55 }}>
                <b>Angle:</b> {marketing.campaign_angle}
              </p>
            )}
            {!!marketing.recommended_channels?.length && (
              <div className="panel-chips" style={{ marginTop: 10 }}>
                {marketing.recommended_channels.map((c) => (
                  <span className="core-chip" key={c} style={{ ["--agent-accent" as string]: agent.accent }}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            {!!marketing.campaign_variants?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {marketing.campaign_variants.map((v) => (
                  <div className="outreach-block" key={v.variant_name}>
                    <div className="panel-k">
                      <span>{v.variant_name}</span>
                      <span className="panel-pct" style={{ fontSize: 10, color: "var(--text-3)" }}>{v.target_segment}</span>
                    </div>
                    <p className="panel-v" style={{ fontWeight: 600, marginTop: 4 }}>{v.headline}</p>
                    <p className="panel-v" style={{ marginTop: 5, color: "var(--text-2)", fontSize: 13, lineHeight: 1.55 }}>{v.supporting_copy}</p>
                    <p className="panel-v" style={{ marginTop: 6, fontSize: 12.5 }}>
                      <b>CTA:</b> {v.call_to_action} · <em style={{ color: "var(--text-3)" }}>{v.rationale}</em>
                    </p>
                  </div>
                ))}
              </div>
            )}
            {marketing.call_to_action && (
              <p className="panel-v" style={{ marginTop: 10, fontSize: 13 }}>
                <b>Primary CTA:</b> {marketing.call_to_action}
              </p>
            )}
            {!!marketing.success_metrics?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {marketing.success_metrics.map((m) => (
                  <div className="panel-action" key={m}>
                    <CheckCircle2 size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="panel-note" style={{ marginTop: 10, ["--agent-accent" as string]: agent.accent }}>
              <Sparkles size={13} />
              <span>
                <b>Generated campaign strategy</b> — drafts for review. No campaign was sent, launched, or tested,
                and no performance data exists.
              </span>
            </div>
          </div>
        )}

        {analytics && (
          <div className="panel-section">
            <div className="panel-k">
              <span>Performance intelligence</span>
              <BarChart3 size={12} />
            </div>
            {!!analytics.kpis?.length && (
              <div className="panel-actions" style={{ marginTop: 4 }}>
                {analytics.kpis.map((k) => (
                  <div className="panel-action" key={k.name}>
                    <TrendingUp size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>
                      <b>{k.name}:</b> {k.value !== null ? `${k.value}${k.unit ? ` ${k.unit}` : ""}` : "—"}
                      {k.note ? <em style={{ color: "var(--text-3)", fontSize: 12 }}> · {k.note}</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!!analytics.funnel?.length && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {analytics.funnel.map((f, i) => (
                  <div className="outreach-block" key={f.stage}>
                    <div className="panel-k">
                      <span>{f.stage}</span>
                      <span className="panel-pct" style={{ fontSize: 11, color: "var(--text-2)" }}>
                        {f.count}
                        {f.conversion_from_previous !== null && i > 0
                          ? ` · ${Math.round(f.conversion_from_previous * 100)}% from previous`
                          : ""}
                      </span>
                    </div>
                    <p className="panel-v" style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                      {f.source === "modeled" ? "modeled estimate" : f.source}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {typeof analytics.overall_conversion_rate === "number" && (
              <p className="panel-v" style={{ marginTop: 10, fontSize: 13 }}>
                <b>Modeled conversion:</b> {Math.round(analytics.overall_conversion_rate * 100)}%{" "}
                <em style={{ color: "var(--text-3)", fontSize: 12 }}>(modeled, not measured)</em>
              </p>
            )}
            {!!analytics.strongest_signals?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {analytics.strongest_signals.map((s) => (
                  <div className="panel-action" key={s.signal}>
                    <CheckCircle2 size={13} style={{ color: "var(--emerald)", flex: "none" }} />
                    <span>
                      <b>{s.signal}</b>
                      {s.rationale ? <em style={{ color: "var(--text-3)", fontSize: 12 }}> — {s.rationale}</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!!analytics.weak_signals?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {analytics.weak_signals.map((s) => (
                  <div className="panel-action" key={s.signal}>
                    <ListChecks size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>
                      <b>{s.signal}</b>
                      {s.rationale ? <em style={{ color: "var(--text-3)", fontSize: 12 }}> — {s.rationale}</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!!analytics.risks?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {analytics.risks.map((r) => (
                  <div className="panel-action" key={r}>
                    <ShieldCheck size={13} style={{ color: "var(--danger)", flex: "none" }} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
            {!!analytics.opportunities?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {analytics.opportunities.map((o) => (
                  <div className="panel-action" key={o}>
                    <Target size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            )}
            {!!analytics.recommended_actions?.length && (
              <div className="panel-actions" style={{ marginTop: 10 }}>
                {analytics.recommended_actions.map((a) => (
                  <div className="panel-action" key={a}>
                    <ListChecks size={13} style={{ color: agent.accent, flex: "none" }} />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="panel-note" style={{ marginTop: 10, ["--agent-accent" as string]: agent.accent }}>
              <Database size={13} />
              <span>
                <b>No external analytics data accessed</b> — every KPI and funnel value is a modeled
                projection derived from the mission&apos;s persisted outputs. No real traffic, revenue, ad,
                or conversion measurements were used.
              </span>
            </div>
          </div>
        )}

        <div className="panel-section">
          <div className="panel-k">
            <span>Output</span>
          </div>
          <p className="panel-v" style={{ color: "var(--text-2)", lineHeight: 1.55 }}>{output}</p>
          {recommended && (
            <p className="panel-v" style={{ marginTop: 8, color: "var(--text)", lineHeight: 1.55 }}>
              <b>Next action:</b> {recommended}
            </p>
          )}
        </div>

        <div className="panel-section" style={{ marginTop: "auto" }}>
          <div className="panel-k">
            <span>Confidence</span>
            <span className="panel-pct">{Math.round(confidence * 100)}%</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Progress value={confidence * 100} from={agent.accent} to={agent.accent} />
          </div>
        </div>

        <a className="panel-link" href={agent.id === "research" ? "/research" : "/activity"}>
          Open workspace <ArrowUpRight size={13} />
        </a>
      </motion.aside>
    </AnimatePresence>
  );
}
