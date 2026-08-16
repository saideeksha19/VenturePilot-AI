import {
  ACTIVITIES,
  AGENTS,
  AGENT_DETAILS,
  getAnalyticsMock,
  GOAL,
  KPIS,
  PIPELINE,
  RESEARCH,
  SETTINGS,
} from "./mock-data";
import { formatClock } from "./utils";
import type {
  ActivityEvent,
  ActivityRecord,
  Agent,
  AgentDetailRecord,
  AgentDetail,
  AgentId,
  AgentStatusRecord,
  AnalyticsData,
  AnalyticsResult,
  AnalyticsSet,
  Business,
  DateRange,
  Goal,
  GoalRecord,
  Kpi,
  MissionStatus,
  PipelineStage,
  MarketingData,
  MarketingResult,
  ProspectingData,
  ProspectingResult,
  ResearchData,
  ResearchResult,
  SalesData,
  SalesResult,
  SettingsData,
} from "./types";

/* ------------------------------------------------------------------ */
/* Mock / real data boundary (M1 + M2)                                 */
/*                                                                     */
/* REAL DATA                                                           */
/*   - business profile   : getBusiness / createBusiness / updateBusiness */
/*   - goals & execution  : createGoal / executeGoal / getGoal(s)      */
/*   - agent roster state : getAgents / getAgentDetail                 */
/*   - activity stream    : getActivities                              */
/*                                                                     */
/* MOCK DATA (until later milestones)                                  */
/*   - KPI metrics, analytics charts, research workspace, settings     */
/*     toggles, and the live-feed simulation pool.                     */
/*                                                                     */
/* Every real endpoint degrades to its mock equivalent when the core   */
/* is unreachable, so the cinematic UI keeps working during demos.     */
/* ------------------------------------------------------------------ */

// Default dev API base. Override with NEXT_PUBLIC_API_URL when deploying.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Unable to connect to VenturePilot Core.");
  }
  if (!response.ok) {
    let detail = "The request failed.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body — keep the default message */
    }
    if (response.status === 404) throw new ApiError("Not found.", 404);
    if (response.status >= 500) throw new ApiError("VenturePilot Core is unavailable right now.", response.status);
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

const delay = (ms = 180) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Tracks whether the last real backend call degraded to mock data, so the UI
 * can surface an honest "demo data" indicator instead of silently presenting
 * simulated values as real.
 */
let degraded = false;
function noteDegraded() {
  degraded = true;
}

/** Concise, truthful activity line for an agent with a real backend task. */
function liveAgentActivity(r: AgentStatusRecord): string {
  if (r.status === "Active" && r.progress === 100) return "Completed latest mission stage";
  if (r.status === "Working") return "Executing current mission stage";
  if (r.status === "Blocked") return "Blocked — review the activity stream";
  if (r.status === "Idle") return "No executor registered for this agent yet";
  return "Queued for the next mission";
}

/** Human-readable mission status for the dashboard's objective card. */
function displayMissionStatus(goal: GoalRecord): string {
  switch (goal.status) {
    case "completed":
      return "Objective completed";
    case "partially_completed":
      return `Mission partially executed · ${goal.progress}% of stages complete`;
    case "failed":
      return "Execution failed — review activity stream";
    case "running":
      return "AI team actively executing";
    case "unavailable":
      return "Mission unavailable";
    default:
      return "Mission pending — awaiting execution";
  }
}

/** Run a real API call, falling back to the mock equivalent on failure. */
async function withMockFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (err) {
    if (err instanceof ApiError) {
      // Only degrade on connectivity/provider errors, never on 4xx validation.
      if (err.status >= 400 && err.status < 500) throw err;
    }
    noteDegraded();
    console.warn("[services] Core unreachable, using mock data:", err);
    return mock();
  }
}

const API = {
  /* ---------------- REAL: business profile (FastAPI) ---------------- */

  /**
   * Fetch the single active business, or null when onboarding has not run.
   */
  async getBusiness(): Promise<Business | null> {
    const list = await apiFetch<Business[]>("/api/businesses");
    return list[0] ?? null;
  },
  /**
   * Create the business from the onboarding flow.
   */
  async createBusiness(input: {
    name: string;
    industry: string | null;
    size: string | null;
    description: string | null;
    goals: string | null;
  }): Promise<Business> {
    return apiFetch<Business>("/api/businesses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  /**
   * Update the business profile (partial update supported).
   */
  async updateBusiness(
    id: string,
    patch: Partial<{
      name: string;
      industry: string | null;
      size: string | null;
      description: string | null;
      goals: string | null;
    }>
  ): Promise<Business> {
    return apiFetch<Business>(`/api/businesses/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },

  /* ---------------- REAL: goals & orchestration (FastAPI) ---------------- */

  /** POST /api/goals — the CEO produces an execution plan and queues tasks. */
  async createGoal(objective: string): Promise<GoalRecord> {
    return apiFetch<GoalRecord>("/api/goals", {
      method: "POST",
      body: JSON.stringify({ objective }),
    });
  },
  /** GET /api/goals — most recent goals for the business, newest first. */
  async getGoals(): Promise<GoalRecord[]> {
    return apiFetch<GoalRecord[]>("/api/goals");
  },
  /** POST /api/goals/{id}/execute — run the plan end-to-end, persisted. */
  async executeGoal(id: string): Promise<GoalRecord> {
    return apiFetch<GoalRecord>(`/api/goals/${id}/execute`, { method: "POST" });
  },
  /** GET /api/goals/{id}/tasks — goal with full task lifecycle + results. */
  async getGoalTasks(id: string): Promise<GoalRecord> {
    return apiFetch<GoalRecord>(`/api/goals/${id}/tasks`);
  },
  /**
   * The single most recent goal for the dashboard's "Global objective" card.
   * Falls back to the mock GOAL when the core is unreachable.
   */
  async getGoal(): Promise<Goal> {
    return withMockFallback(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        const latest = goals[0];
        if (!latest) return { title: "No objective set", progress: 0, status: "Mission pending" };
        return { title: latest.objective, progress: latest.progress, status: displayMissionStatus(latest) };
      },
      async () => {
        await delay(120);
        return GOAL;
      }
    );
  },
  /**
   * Kick off a real goal run: create (CEO plan) then execute end-to-end.
   * Returns the persisted tasks mapped to the pipeline shape the Goals UI
   * drives, plus the goal's TRUTHFUL status/progress. Falls back to the
   * mock choreography when the core is down.
   */
  async runGoalPipeline(
    goalTitle: string
  ): Promise<{ goal: string; plan: PipelineStage[]; goalId: string; status: MissionStatus; progress: number; simulated: boolean }> {
    return withMockFallback(
      async () => {
        const goal = await this.createGoal(goalTitle);
        const executed = await this.executeGoal(goal.id);
        const plan: PipelineStage[] = executed.tasks.map((t) => ({
          agentId: t.agent_id,
          task: t.task,
          output: t.output ?? (t.error ? `Failed: ${t.error}` : ""),
          status: t.status,
          failed: t.status === "failed",
          unavailable: t.status === "unavailable" || t.status === "deferred",
        }));
        return {
          goal: executed.objective,
          plan,
          goalId: executed.id,
          status: executed.status as MissionStatus,
          progress: executed.progress,
          simulated: executed.simulated,
        };
      },
      async () => {
        await delay(400);
        const plan = PIPELINE.map((stage) =>
          stage.agentId === "research"
            ? { ...stage, task: `Framing research around "${goalTitle}"` }
            : stage
        );
        return { goal: goalTitle, plan, goalId: "", status: "completed", progress: 100, simulated: true };
      }
    );
  },

  /* ---------------- REAL: agent roster & detail (FastAPI) ---------------- */

  /**
   * Live agent state from /api/agents, merged with the mock presentation
   * fields (accent, blurb). Falls back to mock AGENTS.
   */
  async getAgents(): Promise<Agent[]> {
    return withMockFallback(
      async () => {
        const roster = await apiFetch<AgentStatusRecord[]>("/api/agents");
        return roster.map((r) => {
          const mock = AGENTS.find((a) => a.id === r.id);
          return {
            id: r.id,
            name: r.name,
            role: r.role,
            status: (r.status as Agent["status"]) || mock?.status || "Idle",
            task: r.task ?? mock?.task ?? "Standing by",
            progress: r.progress,
            // Honest one-liner derived from the real task state — never a
            // fabricated "verified 12 leads" claim over live data.
            activity: r.task ? liveAgentActivity(r) : (mock?.activity ?? ""),
            accent: mock?.accent ?? "var(--accent)",
            blurb: mock?.blurb ?? "",
            lastActive: Date.now(),
          };
        });
      },
      async () => {
        await delay();
        return AGENTS;
      }
    );
  },
  /**
   * Detail view for one agent from /api/agents/{id} — mission, live task,
   * recent actions, latest structured result. Falls back to the mock
   * AGENT_DETAILS when the core is unreachable.
   */
  async getAgentDetail(id: AgentId): Promise<AgentDetailRecord> {
    return withMockFallback(
      () => apiFetch<AgentDetailRecord>(`/api/agents/${id}`),
      async () => {
        await delay(120);
        const mock: AgentDetail = AGENT_DETAILS[id];
        return {
          id,
          name: AGENTS.find((a) => a.id === id)?.name ?? id,
          role: AGENTS.find((a) => a.id === id)?.role ?? "",
          mission: mock.mission,
          status: mock.status,
          current_task: mock.task,
          progress: mock.progress,
          recent_actions: mock.recentActions,
          result: null,
          confidence: mock.confidence,
          sources: null,
          evidence_verified: null,
          last_sync: mock.lastSync,
        };
      }
    );
  },

  /* ---------------- REAL: activity stream (FastAPI) ---------------- */

  /**
   * Recent agent operations from /api/activity, mapped to the feed shape.
   * Falls back to the mock ACTIVITIES when the core is unreachable.
   */
  async getActivities(limit = 8): Promise<ActivityEvent[]> {
    return withMockFallback(
      async () => {
        const records = await apiFetch<ActivityRecord[]>(`/api/activity?limit=${limit}`);
        return records.map((r) => ({
          id: r.id,
          agentId: r.agent_id,
          message: r.action,
          timestamp: new Date(r.created_at).getTime(),
        }));
      },
      async () => {
        await delay(160);
        return [...ACTIVITIES].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
      }
    );
  },
  /**
   * True once any real API call has degraded to mock data this session.
   * Lets the shell show an honest "demo data" indicator instead of implying
   * the displayed numbers came from the live core.
   */
  isDegraded(): boolean {
    return degraded;
  },

  /* ---------------- MOCK: everything below this line ---------------- */

  /**
   * Dashboard KPI cards built from REAL persisted backend state (latest goal
   * progress, completed stages, active agents, activity recorded in the last
   * 24h). No fabricated revenue/opportunity counts. Falls back to the demo
   * KPIS only when the core is unreachable.
   */
  async getKpis(): Promise<Kpi[]> {
    return withMockFallback(
      async () => {
        const [goals, agents, activities] = await Promise.all([
          apiFetch<GoalRecord[]>("/api/goals"),
          apiFetch<AgentStatusRecord[]>("/api/agents"),
          apiFetch<ActivityRecord[]>("/api/activity?limit=100"),
        ]);
        const latest = goals[0];
        const progress = latest?.progress ?? 0;
        const done = latest ? latest.tasks.filter((t) => t.status === "completed").length : 0;
        const total = latest?.tasks.length ?? 0;
        const active = agents.filter((a) => a.status === "Working" || a.status === "Active").length;
        const dayAgo = Date.now() - 24 * 3600 * 1000;
        const recentActions = activities.filter(
          (a) => new Date(a.created_at).getTime() >= dayAgo
        ).length;
        const flat = (v: number) => [v, v, v, v, v];
        return [
          {
            id: "progress",
            label: "Objective progress",
            value: `${progress}%`,
            delta: "",
            deltaDir: "up",
            hint: latest ? "latest mission" : "no objective yet",
            accent: "var(--accent)",
            spark: flat(progress),
          },
          {
            id: "stages",
            label: "Stages completed",
            value: total ? `${done}/${total}` : "—",
            delta: "",
            deltaDir: "up",
            hint: latest ? "last mission" : "no missions yet",
            accent: "var(--blue)",
            spark: total ? flat(done) : [0, 0, 0, 0, 0],
          },
          {
            id: "agents",
            label: "Agents active",
            value: `${active}`,
            delta: "",
            deltaDir: "up",
            hint: "right now",
            accent: "var(--emerald)",
            spark: flat(active),
          },
          {
            id: "actions",
            label: "Actions recorded",
            value: `${recentActions}`,
            delta: "",
            deltaDir: "up",
            hint: "last 24h",
            accent: "var(--teal)",
            spark: flat(recentActions),
          },
        ];
      },
      async () => {
        await delay(120);
        return KPIS;
      }
    );
  },
  // TODO(M3): GET `${API_BASE}/api/analytics?range=7D`
  async getAnalyticsCharts(range: DateRange): Promise<AnalyticsSet> {
    await delay(200);
    return getAnalyticsMock(range);
  },
  /**
   * The persisted Research result from the most recent executed goal.
   * When no research has run, returns an honest empty state — never
   * fabricated sources, competitors, document counts or citations.
   * Falls back to the mock workspace only when the core is unreachable.
   */
  async getResearch(): Promise<ResearchData> {
    return withMockFallback(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        for (const g of goals) {
          const task = g.tasks.find((t) => t.agent_id === "research" && t.status === "completed" && t.result);
          if (!task) continue;
          // The task is a research task, so its result is a ResearchResult.
          const r = task.result as ResearchResult;
          const createdMs = new Date(g.created_at).getTime();
          const doneMs = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
          return {
            mission: task.title,
            status: "Completed",
            progress: task.progress,
            sources: (r.sources ?? []).map((s) => ({ name: s.label, kind: s.description, documents: 0 })),
            competitors: (r.competitors ?? []).map((c) => ({
              name: c.name,
              positioning: c.positioning ?? "",
              pricing: "",
              strengths: "",
              weaknesses: "",
              confidence: 0,
            })),
            log: [
              { time: formatClock(createdMs), text: `Research briefed from CEO plan: ${task.title}` },
              { time: formatClock(doneMs), text: "Structured analysis completed", ok: true },
              {
                time: formatClock(Date.now()),
                text: r.simulated
                  ? "Development mode — deterministic fallback analysis (no Gemini key)"
                  : "Live Gemini AI provider",
              },
            ],
            findings: (r.findings ?? []).map((f) => ({ title: f, detail: "" })),
            summary: r.summary ?? "No summary recorded.",
            analysisBasis: r.analysis_basis,
            evidenceVerified: r.evidence_verified ?? false,
            simulated: r.simulated ?? false,
            confidence: r.confidence,
          };
        }
        // No research mission has executed yet — honest empty state.
        return {
          mission: "No analysis yet",
          status: "Idle",
          progress: 0,
          sources: [],
          competitors: [],
          log: [],
          findings: [],
          summary:
            "No research mission has run yet. Activate a mission on the Goals page — the Research agent will persist its analysis here.",
          analysisBasis: "none",
          evidenceVerified: false,
          simulated: false,
        };
      },
      async () => {
        await delay(240);
        return RESEARCH;
      }
    );
  },
  /**
   * The persisted Prospecting result from the most recent executed goal.
   * When no prospecting stage has run, returns an honest empty state — never
   * fabricated accounts, contacts or verified lead counts. Falls back to the
   * mock pipeline only when the core is unreachable.
   */
  async getProspecting(): Promise<ProspectingData> {
    return withMockFallback(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        for (const g of goals) {
          const task = g.tasks.find((t) => t.agent_id === "prospecting" && t.status === "completed" && t.result);
          if (!task) continue;
          const r = task.result as ProspectingResult;
          const doneMs = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
          return {
            mission: task.title,
            status: "Completed",
            progress: task.progress,
            summary: r.summary ?? "No summary recorded.",
            icp: r.ideal_customer_profile ?? "",
            segments: r.target_segments ?? [],
            criteria: r.qualification_criteria ?? [],
            targets: r.illustrative_targets ?? [],
            scoringFactors: r.scoring_factors ?? [],
            priorityActions: r.priority_actions ?? [],
            estimatedOpportunityCount: r.estimated_opportunity_count ?? 0,
            confidence: r.confidence ?? null,
            evidenceVerified: r.evidence_verified ?? false,
            simulated: r.simulated ?? false,
            lastSync: formatClock(doneMs),
          };
        }
        // No prospecting mission has executed yet — honest empty state.
        return {
          mission: "No pipeline model yet",
          status: "Idle",
          progress: 0,
          summary:
            "No prospecting mission has run yet. Activate a pipeline objective on the Goals page — the Prospecting agent will persist its target segments here.",
          icp: "",
          segments: [],
          criteria: [],
          targets: [],
          scoringFactors: [],
          priorityActions: [],
          estimatedOpportunityCount: 0,
          confidence: null,
          evidenceVerified: false,
          simulated: false,
          lastSync: "",
        };
      },
      async () => {
        await delay(240);
        const stage = PIPELINE.find((s) => s.agentId === "prospecting");
        return {
          mission: stage?.task ?? "Pipeline qualification",
          status: "Completed",
          progress: 100,
          summary: stage?.output ?? "",
          icp: "",
          segments: [],
          criteria: [],
          targets: [],
          scoringFactors: [],
          priorityActions: [],
          estimatedOpportunityCount: 0,
          confidence: 0.5,
          evidenceVerified: false,
          simulated: true,
          lastSync: "just now",
        };
      }
    );
  },
  /**
   * The persisted Sales result from the most recent executed goal.
   * When no sales stage has run, returns an honest empty state — never
   * fabricated contacts, replies or verified outreach. Falls back to the
   * mock pipeline only when the core is unreachable.
   */
  async getSales(): Promise<SalesData> {
    return withMockFallback(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        for (const g of goals) {
          const task = g.tasks.find((t) => t.agent_id === "sales" && t.status === "completed" && t.result);
          if (!task) continue;
          const r = task.result as SalesResult;
          const doneMs = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
          return {
            mission: task.title,
            status: "Completed",
            progress: task.progress,
            summary: r.summary ?? "No summary recorded.",
            targetProfile: r.target_profile ?? "",
            outreachObjective: r.outreach_objective ?? "",
            personalizationRationale: r.personalization_rationale ?? "",
            recommendedChannel: r.recommended_channel ?? "",
            subjectLine: r.subject_line ?? "",
            outreachMessage: r.outreach_message ?? "",
            followUpMessage: r.follow_up_message ?? "",
            callToAction: r.call_to_action ?? "",
            confidence: r.confidence ?? null,
            evidenceVerified: r.evidence_verified ?? false,
            simulated: r.simulated ?? false,
            lastSync: formatClock(doneMs),
          };
        }
        // No sales mission has executed yet — honest empty state.
        return {
          mission: "No outreach yet",
          status: "Idle",
          progress: 0,
          summary:
            "No sales mission has run yet. Activate a pipeline objective on the Goals page — the Sales agent will persist its personalized outreach here.",
          targetProfile: "",
          outreachObjective: "",
          personalizationRationale: "",
          recommendedChannel: "",
          subjectLine: "",
          outreachMessage: "",
          followUpMessage: "",
          callToAction: "",
          confidence: null,
          evidenceVerified: false,
          simulated: false,
          lastSync: "",
        };
      },
      async () => {
        await delay(240);
        const stage = PIPELINE.find((s) => s.agentId === "sales");
        return {
          mission: stage?.task ?? "Outreach preparation",
          status: "Completed",
          progress: 100,
          summary: stage?.output ?? "",
          targetProfile: "",
          outreachObjective: "",
          personalizationRationale: "",
          recommendedChannel: "Email",
          subjectLine: "",
          outreachMessage: "",
          followUpMessage: "",
          callToAction: "",
          confidence: 0.5,
          evidenceVerified: false,
          simulated: true,
          lastSync: "just now",
        };
      }
    );
  },
  /**
   * The persisted Marketing result from the most recent executed goal.
   * When no marketing stage has run, returns an honest empty state — never
   * fabricated campaign performance or claims of launched/sent campaigns.
   * Falls back to the mock pipeline only when the core is unreachable.
   */
  async getMarketing(): Promise<MarketingData> {
    return withMockFallback(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        for (const g of goals) {
          const task = g.tasks.find((t) => t.agent_id === "marketing" && t.status === "completed" && t.result);
          if (!task) continue;
          const r = task.result as MarketingResult;
          const doneMs = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
          return {
            mission: task.title,
            status: "Completed",
            progress: task.progress,
            summary: r.summary ?? "No summary recorded.",
            campaignObjective: r.campaign_objective ?? "",
            targetAudience: r.target_audience ?? "",
            positioning: r.positioning ?? "",
            keyMessage: r.key_message ?? "",
            campaignAngle: r.campaign_angle ?? "",
            recommendedChannels: r.recommended_channels ?? [],
            campaignVariants: r.campaign_variants ?? [],
            callToAction: r.call_to_action ?? "",
            contentThemes: r.content_themes ?? [],
            successMetrics: r.success_metrics ?? [],
            confidence: r.confidence ?? null,
            evidenceVerified: r.evidence_verified ?? false,
            simulated: r.simulated ?? false,
            lastSync: formatClock(doneMs),
          };
        }
        // No marketing mission has executed yet — honest empty state.
        return {
          mission: "No campaign strategy yet",
          status: "Idle",
          progress: 0,
          summary:
            "No marketing mission has run yet. Activate a campaign objective on the Goals page — the Marketing agent will persist its strategy here.",
          campaignObjective: "",
          targetAudience: "",
          positioning: "",
          keyMessage: "",
          campaignAngle: "",
          recommendedChannels: [],
          campaignVariants: [],
          callToAction: "",
          contentThemes: [],
          successMetrics: [],
          confidence: null,
          evidenceVerified: false,
          simulated: false,
          lastSync: "",
        };
      },
      async () => {
        await delay(240);
        const stage = PIPELINE.find((s) => s.agentId === "marketing");
        return {
          mission: stage?.task ?? "Campaign support",
          status: "Completed",
          progress: 100,
          summary: stage?.output ?? "",
          campaignObjective: "",
          targetAudience: "",
          positioning: "",
          keyMessage: "",
          campaignAngle: "",
          recommendedChannels: [],
          campaignVariants: [],
          callToAction: "",
          contentThemes: [],
          successMetrics: [],
          confidence: 0.5,
          evidenceVerified: false,
          simulated: true,
          lastSync: "just now",
        };
      }
    );
  },
  /**
   * The persisted Analytics result from the most recent executed goal.
   * When no analytics stage has run, returns an honest empty state — never
   * fabricated production KPIs, traffic, revenue, or conversion data.
   * Falls back to the mock pipeline only when the core is unreachable.
   */
  async getAnalytics(): Promise<AnalyticsData> {
    return withMockFallback<AnalyticsData>(
      async () => {
        const goals = await apiFetch<GoalRecord[]>("/api/goals");
        for (const g of goals) {
          const task = g.tasks.find((t) => t.agent_id === "analytics" && t.status === "completed" && t.result);
          if (!task) continue;
          const r = task.result as AnalyticsResult;
          const doneMs = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
          return {
            mission: task.title,
            status: "Completed",
            progress: task.progress,
            summary: r.summary ?? "No summary recorded.",
            kpis: r.kpis ?? [],
            funnel: r.funnel ?? [],
            overallConversionRate: r.overall_conversion_rate ?? null,
            strongestSignals: r.strongest_signals ?? [],
            weakSignals: r.weak_signals ?? [],
            risks: r.risks ?? [],
            opportunities: r.opportunities ?? [],
            recommendedActions: r.recommended_actions ?? [],
            priorityActions: r.priority_actions ?? [],
            confidence: r.confidence ?? null,
            dataBasis: r.data_basis ?? "modeled",
            evidenceVerified: r.evidence_verified ?? false,
            simulated: r.simulated ?? false,
            lastSync: formatClock(doneMs),
          };
        }
        // No analytics mission has executed yet — honest empty state.
        return {
          mission: "No outcome model yet",
          status: "Idle",
          progress: 0,
          summary:
            "No analytics mission has run yet. Activate a mission on the Goals page — the Analytics agent will persist its modeled performance intelligence here.",
          kpis: [],
          funnel: [],
          overallConversionRate: null,
          strongestSignals: [],
          weakSignals: [],
          risks: [],
          opportunities: [],
          recommendedActions: [],
          priorityActions: [],
          confidence: null,
          dataBasis: "modeled",
          evidenceVerified: false,
          simulated: false,
          lastSync: "",
        };
      },
      async () => {
        await delay(240);
        const stage = PIPELINE.find((s) => s.agentId === "analytics");
        return {
          mission: stage?.task ?? "Outcome modeling",
          status: "Completed",
          progress: 100,
          summary: stage?.output ?? "",
          kpis: [],
          funnel: [],
          overallConversionRate: null,
          strongestSignals: [],
          weakSignals: [],
          risks: [],
          opportunities: [],
          recommendedActions: [],
          priorityActions: [],
          confidence: 0.5,
          dataBasis: "modeled",
          evidenceVerified: false,
          simulated: true,
          lastSync: "just now",
        };
      }
    );
  },
  // MOCK: business fields are real via the business context; the remaining
  // settings (email, timezone, toggles) are still mock.
  async getSettings(): Promise<SettingsData> {
    await delay(120);
    return SETTINGS;
  },
};

export default API;
