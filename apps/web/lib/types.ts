export interface Business {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  description: string | null;
  goals: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type AgentId = "ceo" | "research" | "prospecting" | "sales" | "marketing" | "analytics";

export type AgentStatus = "Coordinating" | "Working" | "Active" | "Monitoring" | "Idle";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  task: string;
  progress: number; // 0-100
  activity: string;
  accent: string; // css color token
  blurb: string;
  lastActive: number; // epoch ms of last completed action
}

export interface AgentDetail {
  mission: string;
  status: AgentStatus;
  task: string;
  progress: number;
  recentActions: string[];
  sources: string[];
  output: string;
  confidence: number; // 0-1
  lastSync: string;
}

export interface ActivityEvent {
  id: string;
  agentId: AgentId;
  message: string;
  timestamp: number; // epoch ms
}

export interface Kpi {
  id: string;
  label: string;
  value: string;
  /** Optional change text (hidden when empty — real backend KPIs have no fabricated deltas). */
  delta?: string;
  deltaDir?: "up" | "down";
  hint: string;
  accent: string;
  spark: number[]; // mini trend series
}

export interface FunnelStage {
  label: string;
  value: number;
}

export interface AgentContribution {
  agentId: AgentId;
  pct: number;
}

export interface Goal {
  title: string;
  progress: number; // 0-100
  status: string;
}

export interface PipelineStage {
  agentId: AgentId;
  task: string;
  output: string;
  /** Real lifecycle status from the backend task record. */
  status?: TaskStatus;
  /** Set when the real backend marked this stage failed. */
  failed?: boolean;
  /** Set when this stage has no executor yet (never counted as complete). */
  unavailable?: boolean;
}

export type MissionStatus = "created" | "running" | "completed" | "failed" | "partially_completed" | "unavailable";

export type DateRange = "7D" | "30D" | "90D";

export interface AnalyticsSet {
  revenue: number[];
  opportunities: number[];
  productivity: number[]; // 6 values, one per agent
  efficiency: number; // 0-100
  efficiencyBars: { label: string; value: number }[];
  funnel: FunnelStage[];
  contribution: AgentContribution[];
  goalCompletion: number; // 0-100
  insight: string;
}

export interface Competitor {
  name: string;
  positioning: string;
  pricing: string;
  strengths: string;
  weaknesses: string;
  confidence: number; // 0-1
}

export interface ResearchSource {
  name: string;
  kind: string;
  documents: number;
}

export interface ResearchLogEntry {
  time: string;
  text: string;
  ok?: boolean;
}

export interface ResearchFinding {
  title: string;
  detail: string;
}

export interface ResearchData {
  mission: string;
  status: string;
  progress: number;
  sources: ResearchSource[];
  competitors: Competitor[];
  log: ResearchLogEntry[];
  findings: ResearchFinding[];
  summary: string;
  /** Provenance of the analysis — "ai_analysis" (no external evidence). */
  analysisBasis?: string;
  evidenceVerified?: boolean;
  simulated?: boolean;
  /** Confidence of the persisted research result, when available. */
  confidence?: number;
}

export interface SettingsData {
  companyName: string;
  industry: string;
  size: string;
  email: string;
  timezone: string;
  toggles: { key: string; label: string; hint: string; on: boolean }[];
}

/* ------------------------------------------------------------------ */
/* Backend record shapes (M2) — mirror the FastAPI response schemas.   */
/* These are the REAL data shapes; the mock types above are the        */
/* presentation layer that consumes them through lib/services.ts.      */
/* ------------------------------------------------------------------ */

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "unavailable" | "deferred";

export interface ResearchResult {
  research_question?: string;
  findings?: string[];
  competitors?: { name: string; positioning: string | null; notes: string | null }[];
  market_observations?: string[];
  opportunities?: string[];
  risks?: string[];
  sources?: { label: string; description: string; verified: boolean }[];
  confidence?: number;
  summary?: string;
  recommended_next_action?: string;
  analysis_basis?: "ai_analysis" | "web_research";
  evidence_verified?: boolean;
  simulated?: boolean;
}

export interface ProspectingResult {
  summary?: string;
  ideal_customer_profile?: string;
  target_segments?: { name: string; description: string; size_hint: string | null }[];
  qualification_criteria?: string[];
  illustrative_targets?: { segment: string; profile: string; reason: string; illustrative: boolean }[];
  scoring_factors?: { factor: string; weight: number }[];
  priority_actions?: { action: string; rationale: string }[];
  estimated_opportunity_count?: number;
  confidence?: number;
  evidence_verified?: boolean;
  simulated?: boolean;
}

export interface SalesResult {
  summary?: string;
  target_profile?: string;
  outreach_objective?: string;
  personalization_rationale?: string;
  recommended_channel?: string;
  subject_line?: string;
  outreach_message?: string;
  follow_up_message?: string;
  call_to_action?: string;
  confidence?: number;
  evidence_verified?: boolean;
  simulated?: boolean;
}

export interface CampaignVariant {
  variant_name: string;
  headline: string;
  supporting_copy: string;
  call_to_action: string;
  target_segment: string;
  rationale: string;
}

export interface MarketingResult {
  summary?: string;
  campaign_objective?: string;
  target_audience?: string;
  positioning?: string;
  key_message?: string;
  campaign_angle?: string;
  recommended_channels?: string[];
  campaign_variants?: CampaignVariant[];
  call_to_action?: string;
  content_themes?: string[];
  success_metrics?: string[];
  confidence?: number;
  evidence_verified?: boolean;
  simulated?: boolean;
}

export interface AnalyticsKpi {
  name: string;
  value: number | null;
  unit: string;
  source: string;
  note: string | null;
}

export interface AnalyticsFunnelStage {
  stage: string;
  count: number;
  conversion_from_previous: number | null;
  source: string;
}

export interface PerformanceSignal {
  signal: string;
  direction: string;
  rationale: string;
}

export interface AnalyticsResult {
  summary?: string;
  kpis?: AnalyticsKpi[];
  funnel?: AnalyticsFunnelStage[];
  overall_conversion_rate?: number;
  strongest_signals?: PerformanceSignal[];
  weak_signals?: PerformanceSignal[];
  risks?: string[];
  opportunities?: string[];
  recommended_actions?: string[];
  priority_actions?: { action: string; rationale: string }[];
  confidence?: number;
  data_basis?: "modeled" | "persisted" | "verified";
  evidence_verified?: boolean;
  simulated?: boolean;
}

export type AgentResult = ResearchResult | ProspectingResult | SalesResult | MarketingResult | AnalyticsResult | null;

/** Presentation shape for the Analytics workspace / detail panel. */
export interface AnalyticsData {
  mission: string;
  status: string;
  progress: number;
  summary: string;
  kpis: AnalyticsKpi[];
  funnel: AnalyticsFunnelStage[];
  overallConversionRate: number | null;
  strongestSignals: PerformanceSignal[];
  weakSignals: PerformanceSignal[];
  risks: string[];
  opportunities: string[];
  recommendedActions: string[];
  priorityActions: { action: string; rationale: string }[];
  confidence: number | null;
  dataBasis: string;
  evidenceVerified: boolean;
  simulated: boolean;
  lastSync: string;
}

/** Presentation shape for the Marketing workspace / detail panel. */
export interface MarketingData {
  mission: string;
  status: string;
  progress: number;
  summary: string;
  campaignObjective: string;
  targetAudience: string;
  positioning: string;
  keyMessage: string;
  campaignAngle: string;
  recommendedChannels: string[];
  campaignVariants: CampaignVariant[];
  callToAction: string;
  contentThemes: string[];
  successMetrics: string[];
  confidence: number | null;
  evidenceVerified: boolean;
  simulated: boolean;
  lastSync: string;
}

/** Presentation shape for the Sales workspace / detail panel. */
export interface SalesData {
  mission: string;
  status: string;
  progress: number;
  summary: string;
  targetProfile: string;
  outreachObjective: string;
  personalizationRationale: string;
  recommendedChannel: string;
  subjectLine: string;
  outreachMessage: string;
  followUpMessage: string;
  callToAction: string;
  confidence: number | null;
  evidenceVerified: boolean;
  simulated: boolean;
  lastSync: string;
}

/** Presentation shape for the Prospecting workspace / detail panel. */
export interface ProspectingData {
  mission: string;
  status: string;
  progress: number;
  summary: string;
  icp: string;
  segments: { name: string; description: string; size_hint: string | null }[];
  criteria: string[];
  targets: { segment: string; profile: string; reason: string; illustrative: boolean }[];
  scoringFactors: { factor: string; weight: number }[];
  priorityActions: { action: string; rationale: string }[];
  estimatedOpportunityCount: number;
  confidence: number | null;
  evidenceVerified: boolean;
  simulated: boolean;
  lastSync: string;
}

export interface TaskRecord {
  id: string;
  goal_id: string;
  agent_id: AgentId;
  order_index: number;
  title: string;
  task: string;
  purpose: string | null;
  depends_on: string[] | null;
  expected_output: string | null;
  status: TaskStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  output: string | null;
  result: AgentResult;
  error: string | null;
}

export interface GoalRecord {
  id: string;
  objective: string;
  status: string;
  progress: number;
  priority: string | null;
  success_criteria: string[] | null;
  plan_summary: string | null;
  simulated: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: TaskRecord[];
}

export interface ActivityRecord {
  id: string;
  agent_id: AgentId;
  action: string;
  status: string;
  summary: string | null;
  goal_id: string | null;
  created_at: string;
}

export interface AgentStatusRecord {
  id: AgentId;
  name: string;
  role: string;
  status: string;
  task: string | null;
  progress: number;
}

export interface AgentDetailRecord {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
  status: string;
  current_task: string | null;
  progress: number;
  recent_actions: string[];
  result: AgentResult;
  confidence: number | null;
  sources: { label: string; description: string; verified: boolean }[] | null;
  evidence_verified: boolean | null;
  last_sync: string | null;
}
