"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Crosshair, Target, TrendingUp } from "lucide-react";
import API from "@/lib/services";
import { greeting, timeAgo } from "@/lib/utils";
import { subscribeAgentFocus } from "@/lib/agent-hub";
import { useBusiness } from "@/lib/business-context";
import AgentDetailPanel from "@/components/agents/AgentDetailPanel";
import { fadeUp, stagger } from "@/lib/animations";
import GoalBanner from "@/components/dashboard/GoalBanner";
import KpiCard from "@/components/dashboard/KpiCard";
import AgentCard from "@/components/agents/AgentCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { AGENTS } from "@/lib/mock-data";
import CinematicIntro from "@/components/network/CinematicIntro";
import SectionHead from "@/components/ui/SectionHead";
import Card from "@/components/ui/Card";
import type { ActivityEvent, Agent, AgentId, Goal, Kpi } from "@/lib/types";

const CinematicCanvas = dynamic(() => import("@/components/network/CinematicCanvas"), { ssr: false });

type Phase = "hero" | "transition" | "entered";

const BRIEF_ICONS = { objective: Target, action: Crosshair, team: TrendingUp } as const;

export default function OverviewPage() {
  const reduced = useReducedMotion();
  const { business } = useBusiness();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("hero");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [highlight, setHighlight] = useState<AgentId | null>(null);
  const [focus, setFocus] = useState<AgentId | null>(null);
  const [openAgent, setOpenAgent] = useState<AgentId | null>(null);
  const autoTimer = useRef<number | null>(null);
  const syncTimer = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: contentRef, offset: ["start start", "end start"] });
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);

  const phaseRef = useRef<Phase>("hero");
  phaseRef.current = phase;

  const enter = useCallback(() => {
    if (phaseRef.current !== "hero") return;
    try {
      sessionStorage.setItem("vp-entered", "1");
    } catch {
      /* noop */
    }
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    setPhase("transition");
    syncTimer.current = window.setTimeout(() => setPhase("entered"), 1750);
  }, []);

  useEffect(() => {
    setMounted(true);
    let has = false;
    try {
      has = !!sessionStorage.getItem("vp-entered");
    } catch {
      /* noop */
    }
    if (has || reduced) {
      setPhase("entered");
      return;
    }
    autoTimer.current = window.setTimeout(() => enter(), 9200);
    return () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [reduced, enter]);

  useEffect(() => {
    API.getGoal().then(setGoal);
    API.getKpis().then(setKpis);
    API.getAgents().then(setAgents);
    // Fetch more activity than the feed shows so the hero's action count and
    // the intelligence card can be derived from REAL persisted events.
    API.getActivities(100).then(setActivities);
  }, []);

  useEffect(() => subscribeAgentFocus(setFocus), []);

  const handleActivity = useCallback((agentId: AgentId) => {
    setHighlight(agentId);
    window.setTimeout(() => setHighlight((h) => (h === agentId ? null : h)), 2200);
  }, []);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const inScene = phase !== "entered";
  const lastSync = activities.length ? timeAgo(Math.max(...activities.map((a) => a.timestamp))) : "syncing…";

  // Real, persisted facts for the hero line and the intelligence card — never
  // fabricated counts. When the core is unreachable the service falls back to
  // the labeled demo data set, which the shell surfaces as "demo data".
  const actions24h = activities.length >= 100 ? "100+" : `${activities.length}`;
  const heroActivity =
    activities.length > 0
      ? `${actions24h} agent actions in the last 24h, still working`
      : "six agents coordinated, standing by for your first objective";
  const briefItems = [
    {
      icon: BRIEF_ICONS.objective,
      accent: "var(--teal)",
      title: "Active objective",
      detail: goal ? `${goal.status} · ${goal.progress}% complete` : "No objective set yet — activate a mission",
    },
    {
      icon: BRIEF_ICONS.action,
      accent: "var(--blue)",
      title: "Latest agent action",
      detail: activities[0]
        ? `${AGENTS.find((a) => a.id === activities[0].agentId)?.name ?? "Agent"} · ${activities[0].message}`
        : "No activity yet — run a mission to see the team in action",
    },
    {
      icon: BRIEF_ICONS.team,
      accent: "var(--emerald)",
      title: "Team state",
      detail: agents.length
        ? `${agents.filter((a) => a.progress === 100).length} of ${agents.length} agents completed their latest stage`
        : "Syncing team state…",
    },
  ];
  const feedEvents = activities.slice(0, 8);

  return (
    <div ref={contentRef} style={{ position: "relative" }}>
      <motion.div className="scene-layer" style={{ y: sceneY }}>
        <CinematicCanvas hero={phase === "hero"} surge={phase === "transition"} focus={phase === "entered" ? focus : null} />
      </motion.div>
      <div className={`scene-vignette${inScene ? " hero" : ""}`} />

      <AnimatePresence>
        {mounted && phase === "hero" && !reduced && <CinematicIntro key="hero" entering={false} onEnter={enter} />}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "transition" && (
          <motion.div
            key="sync"
            className="sync-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sync-chip">
              <span className="status-dot live" style={{ ["--status" as string]: "var(--emerald)" }} aria-hidden />
              Core synced · six agents online · orchestrating
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "entered" && (
        <motion.div
          className="overview-content"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div variants={stagger} initial="hidden" animate="show">
            <div className="core-tether" aria-hidden />

            <div className="page-head">
              <div className="greeting">
                <h1>
                  {greeting()}, <span className="hello-accent">Alex</span>.
                </h1>
                <p>
                  Your AI team is operating for <b style={{ color: "var(--accent-2)" }}>{business?.name ?? "your business"}</b> — {heroActivity}.
                </p>
              </div>
              <div className="cmd-strip" role="status">
                <span className="core-pulse" aria-hidden />
                <span className="cmd-chip">
                  <span className="status-dot live" style={{ ["--status" as string]: "var(--emerald)" }} aria-hidden />
                  Live · {agents.length || "6"} agents active
                </span>
                <span className="cmd-chip">Last sync {lastSync}</span>
                {goal && (
                  <span className="cmd-chip cmd-objective" title={goal.title}>
                    <Target size={12} aria-hidden />
                    Objective · {goal.title}
                  </span>
                )}
                <span className="cmd-chip cmd-date">{today}</span>
              </div>
            </div>

            <motion.div variants={fadeUp}>{goal && <GoalBanner goal={goal} />}</motion.div>

            <motion.div className="kpi-grid" variants={stagger}>
              {kpis.map((kpi, i) => (
                <KpiCard key={kpi.id} kpi={kpi} index={i} />
              ))}
            </motion.div>

            <div className="dash-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
                <motion.div variants={fadeUp}>
                  <SectionHead title="AI Team" sub="Six agents, one operating rhythm — linked to the core" linkHref="/team" linkLabel="Open network" />
                  <div className="agent-grid">
                    {agents.map((agent, i) => (
                      <motion.div key={agent.id} variants={fadeUp} custom={i}>
                        <AgentCard agent={agent} index={i} highlight={highlight === agent.id} onOpen={setOpenAgent} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Card className="card-pad">
                    <SectionHead title="Business intelligence" sub="What the team surfaced while you were away" />
                    <div style={{ display: "grid", gap: 12 }}>
                      {briefItems.map((b) => {
                        const Icon = b.icon;
                        return (
                          <div className="feed-item" key={b.title} style={{ padding: 0 }}>
                            <span className="feed-dot" style={{ ["--agent-accent" as string]: b.accent }}>
                              <Icon size={13} />
                            </span>
                            <div>
                              <div className="feed-agent" style={{ color: "var(--text)" }}>{b.title}</div>
                              <div className="feed-msg">{b.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </motion.div>
              </div>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="card-pad">
                  <SectionHead
                    title="Live Activity"
                    sub="Agent actions across your business"
                    linkHref="/activity"
                    linkLabel="Open feed"
                  />
                  <ActivityFeed initial={feedEvents} onActivity={handleActivity} />
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AgentDetailPanel agentId={openAgent} onClose={() => setOpenAgent(null)} />
    </div>
  );
}
