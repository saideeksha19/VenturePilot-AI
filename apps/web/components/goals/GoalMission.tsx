"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, CircleDashed, Loader2, Minus, Rocket, Target } from "lucide-react";
import API from "@/lib/services";
import Progress from "@/components/ui/Progress";
import Button from "@/components/ui/Button";
const GoalFlow = dynamic(() => import("@/components/goals/GoalFlow"), { ssr: false });
import Card from "@/components/ui/Card";
import { AGENTS } from "@/lib/mock-data";
import type { AgentId, PipelineStage } from "@/lib/types";

const STAGE_MS = 2400;
const GAP_MS = 420;

const EXAMPLES = [
  "Generate 50 qualified B2B opportunities",
  "Reach 20 product demos this quarter",
  "Launch the new pricing page",
];

export default function GoalMission() {
  const reduced = useReducedMotion();
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(-1);
  const [settled, setSettled] = useState<number[]>([]); // indices whose reveal finished
  const [plan, setPlan] = useState<PipelineStage[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalId, setGoalId] = useState("");
  const [missionProgress, setMissionProgress] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const activate = async (title: string) => {
    if (!title.trim() || running) return;
    clearTimers();
    setRunning(true);
    setActive(-1);
    setSettled([]);
    setPlanError(null);
    setGoalId("");
    let stages: PipelineStage[];
    let gTitle: string;
    try {
      const result = await API.runGoalPipeline(title.trim());
      stages = result.plan;
      gTitle = result.goal;
      setGoalId(result.goalId);
      setMissionProgress(result.progress);
      setSimulated(result.simulated);
    } catch (err) {
      // Validation/4xx errors surface here (connectivity already falls back to mock).
      setRunning(false);
      setPlanError(err instanceof Error ? err.message : "The mission could not be started.");
      return;
    }
    setPlan(stages);
    setGoalTitle(gTitle);

    stages.forEach((_, i) => {
      const startAt = i === 0 ? 900 : STAGE_MS * i + GAP_MS * i;
      timers.current.push(window.setTimeout(() => setActive(i), startAt));
      timers.current.push(
        window.setTimeout(
          () => setSettled((s) => (s.includes(i) ? s : [...s, i])),
          STAGE_MS * (i + 1) + GAP_MS * i
        )
      );
    });
    timers.current.push(
      window.setTimeout(
        () => {
          setRunning(false);
          setActive(-1);
        },
        STAGE_MS * stages.length + GAP_MS * (stages.length - 1) + 800
      )
    );
  };

  const reset = () => {
    clearTimers();
    setRunning(false);
    setActive(-1);
    setSettled([]);
    setPlanError(null);
    setPlan([]);
    setGoalTitle("");
    setGoalId("");
    setMissionProgress(0);
    setInput("");
  };

  const agentOf = (id: AgentId) => AGENTS.find((a) => a.id === id);

  // Truthful stage state — derived from the persisted backend task status.
  const statusOf = (i: number): PipelineStage["status"] => plan[i]?.status ?? "queued";
  const isFailedStage = (i: number) => statusOf(i) === "failed";
  const isUnavailableStage = (i: number) => statusOf(i) === "unavailable" || statusOf(i) === "deferred";
  const isCompletedStage = (i: number) => statusOf(i) === "completed";

  const doneCount = plan.filter((s) => s.status === "completed").length;
  const failedCount = plan.filter((s) => s.status === "failed").length;
  const unavailableCount = plan.filter((s) => s.status === "unavailable" || s.status === "deferred").length;

  const settledAll = plan.length > 0 && settled.length === plan.length;
  const missionComplete = settledAll && doneCount === plan.length;
  const missionFailed = settledAll && failedCount > 0;
  const missionPartial = settledAll && !missionComplete && !missionFailed && doneCount > 0;

  return (
    <div style={{ maxWidth: 900 }}>
      <Card className="card-pad">
        <div className="section-title">Activate a mission</div>
        <p className="section-sub" style={{ marginTop: 5 }}>
          State the founder-level objective. The CEO briefs the team and Research produces structured analysis; stages
          without an executor are reported honestly as unavailable.
        </p>
        <div className="goal-input-wrap">
          <input
            className="goal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && activate(input)}
            placeholder="e.g. Generate 50 qualified B2B opportunities"
            disabled={running}
            aria-label="Mission objective"
          />
          <Button variant="solid" onClick={() => activate(input)} disabled={running || !input.trim()}>
            {running ? <Loader2 size={15} className="spin" /> : <Rocket size={15} />}
            {running ? "Executing" : "Activate mission"}
          </Button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex) => (
            <button key={ex} className="badge" style={{ cursor: running ? "default" : "pointer" }} onClick={() => setInput(ex)} disabled={running}>
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {(running || settledAll) && (
        <motion.div
          className="goal-active-head"
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ minWidth: 0 }}>
            <span className="goal-label">
              <Target size={12} aria-hidden /> Global objective
            </span>
            <h2 className="goal-text" style={{ fontSize: "clamp(17px, 1.8vw, 22px)", marginTop: 6 }}>{goalTitle}</h2>
          </div>
          <div className="goal-active-meta">
            <div className="goal-progress-num" style={{ fontSize: 30 }}>
              {Math.round((doneCount / Math.max(1, plan.length)) * 100)}%
            </div>
            <div style={{ minWidth: 170 }}>
              <div className="goal-status">
                {missionComplete
                  ? "Objective complete"
                  : missionFailed
                    ? "Execution stopped"
                    : missionPartial
                      ? "Mission partially executed"
                      : "Agents executing in sequence"}{" "}
                · {doneCount}/{plan.length} completed
                {simulated && (
                  <span className="badge" style={{ marginLeft: 8 }}>Development mode</span>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <Progress
                  value={(doneCount / Math.max(1, plan.length)) * 100}
                  from="var(--accent)"
                  to="var(--cyan)"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {running && active === -1 && settled.length === 0 && (
        <div className="pipe-init">
          <span className="status-dot live" style={{ ["--status" as string]: "var(--gold)" }} aria-hidden />
          CEO Agent · Initializing — connecting to intelligence core…
        </div>
      )}

      {(running || settledAll) && (
        <div style={{ marginTop: 22 }}>
          <GoalFlow activeIndex={running ? active : -1} completed={plan.map((s, i) => (s.status === "completed" ? i : -1)).filter((i) => i >= 0)} />
        </div>
      )}

      <div className="pipeline">
        {plan.map((stage, i) => {
          const agent = agentOf(stage.agentId);
          const isFailed = isFailedStage(i);
          const isUnavailable = isUnavailableStage(i);
          const isDone = settled.includes(i) && isCompletedStage(i);
          const isActive = active === i && !settled.includes(i) && !isFailed && !isUnavailable;
          const started = isActive || settled.includes(i);
          const accent = agent?.accent ?? "var(--accent)";
          return (
            <Card
              key={`${stage.agentId}-${i}`}
              className="pipe-stage"
              style={{ ["--agent-accent" as string]: accent, opacity: started ? 1 : 0.55 }}
            >
              <div className="pipe-index">
                {isDone ? (
                  <motion.span initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={15} strokeWidth={2.6} />
                  </motion.span>
                ) : isFailed ? (
                  <AlertCircle size={15} style={{ color: "var(--danger)" }} />
                ) : isUnavailable && settled.includes(i) ? (
                  <Minus size={15} style={{ color: "var(--text-3)" }} />
                ) : (
                  i + 1
                )}
              </div>
              <div className="pipe-body">
                <div className="pipe-title">
                  <span className="pipe-name">{agent?.name} Agent</span>
                  <span className="pipe-status">
                    {isFailed ? (
                      <>
                        <AlertCircle size={12} style={{ color: "var(--danger)" }} /> Failed
                      </>
                    ) : isUnavailable && settled.includes(i) ? (
                      <>
                        <Minus size={12} style={{ color: "var(--text-3)" }} /> Unavailable
                      </>
                    ) : isDone ? (
                      <>
                        <Check size={12} style={{ color: "var(--emerald)" }} /> Complete
                      </>
                    ) : isActive ? (
                      <>
                        <span className="status-dot live" style={{ ["--status" as string]: accent }} aria-hidden /> Working
                      </>
                    ) : (
                      <>
                        <CircleDashed size={12} /> Queued
                      </>
                    )}
                  </span>
                </div>
                <p className="pipe-task">{stage.task}</p>
                {started && (
                  <div className="pipe-progress">
                    <Progress value={isDone ? 100 : isUnavailable || isFailed ? 0 : 96} from={accent} to={accent} />
                  </div>
                )}
                <AnimatePresence>
                  {settled.includes(i) && (isDone || isFailed || isUnavailable) && (
                    <motion.div
                      className={`pipe-output${isFailed ? " is-error" : isUnavailable ? " is-unavailable" : ""}`}
                      initial={reduced ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      {isFailed ? <AlertCircle size={14} /> : isUnavailable ? <Minus size={14} /> : <CheckCircle2 size={14} />}
                      <span>{stage.output || (isFailed ? "This stage could not complete." : "")}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          );
        })}
      </div>

      {planError && (
        <div className="pipe-init" style={{ color: "var(--danger)" }}>
          <AlertCircle size={13} aria-hidden />
          {planError}
        </div>
      )}

      <AnimatePresence>
        {missionComplete && (
          <motion.div
            className="goal-done"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="goal-done-icon">
              <CheckCircle2 strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>Objective completed</h3>
              <p>
                The full orchestration loop finished. “{goalTitle}” was executed by the agent team and persisted
                {goalId ? (
                  <>
                    {" "}as goal <span className="goal-id">{goalId.slice(0, 8)}</span>
                  </>
                ) : null}{" "}
                — results will stream into your command center.
              </p>
            </div>
            <Button variant="ghost" onClick={reset}>
              Run another mission
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionPartial && (
          <motion.div
            className="goal-done is-partial"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="goal-done-icon">
              <Minus strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>Mission partially executed</h3>
              <p>
                “{goalTitle}” is at {missionProgress}% — {doneCount} of {plan.length} stages completed
                {unavailableCount > 0 ? `, ${unavailableCount} unavailable` : ""}.{" "}
                {unavailableCount > 0 ? (
                  <>
                    Executors are not yet registered for{" "}
                    {plan
                      .filter((s) => s.status === "unavailable" || s.status === "deferred")
                      .map((s) => agentOf(s.agentId)?.name ?? s.agentId)
                      .join(", ")}
                    , so those stages are marked unavailable — not complete.
                  </>
                ) : (
                  "All stages executed and persisted real output."
                )}
              </p>
            </div>
            <Button variant="ghost" onClick={reset}>
              Run another mission
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {missionFailed && (
          <motion.div
            className="goal-done is-error"
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="goal-done-icon">
              <AlertCircle strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <h3>Execution stopped</h3>
              <p>
                “{goalTitle}” hit a provider failure mid-pipeline. The goal is marked failed and the error is recorded
                in the activity stream — retry once the intelligence core is healthy.
              </p>
            </div>
            <Button variant="ghost" onClick={reset}>
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
