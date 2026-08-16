import type {
  Agent,
  AgentDetail,
  ActivityEvent,
  AnalyticsSet,
  Competitor,
  DateRange,
  Goal,
  Kpi,
  PipelineStage,
  ResearchData,
  SettingsData,
} from "./types";

/** Concrete hex colors for the WebGL canvas (CSS vars don't work in Three.js). */
export const AGENT_HEX: Record<string, string> = {
  ceo: "#e3b341",
  research: "#4c7dff",
  prospecting: "#2dd4bf",
  sales: "#34d399",
  marketing: "#e879a9",
  analytics: "#4cc2ff",
};

export const ACCENTS: Record<string, string> = {
  ceo: "var(--gold)",
  research: "var(--blue)",
  prospecting: "var(--teal)",
  sales: "var(--emerald)",
  marketing: "var(--magenta)",
  analytics: "var(--accent)",
};

const NOW = Date.now();
const minsAgo = (m: number) => NOW - m * 60_000;

export const AGENTS: Agent[] = [
  { id: "ceo", name: "CEO", role: "Executive coordination", status: "Coordinating", task: "Reviewing team priorities", progress: 68, activity: "Approved weekly priorities", accent: ACCENTS.ceo, blurb: "Sets the mission, arbitrates priorities, and keeps every agent pointed at the highest-leverage next move.", lastActive: minsAgo(2) },
  { id: "research", name: "Research", role: "Market intelligence", status: "Working", task: "Analyzing competitor positioning", progress: 74, activity: "Completed competitor analysis", accent: ACCENTS.research, blurb: "Maps markets and competitors into structured intelligence the rest of the team can act on.", lastActive: minsAgo(2) },
  { id: "prospecting", name: "Prospecting", role: "Lead qualification", status: "Working", task: "Verifying qualified B2B leads", progress: 81, activity: "Verified 12 qualified leads", accent: ACCENTS.prospecting, blurb: "Builds and verifies the qualified pipeline, scoring fit and intent continuously.", lastActive: minsAgo(4) },
  { id: "sales", name: "Sales", role: "Outreach & follow-up", status: "Active", task: "Preparing personalized outreach", progress: 57, activity: "Generated 8 outreach drafts", accent: ACCENTS.sales, blurb: "Turns pipeline into conversation — personalized outreach, follow-up, and momentum.", lastActive: minsAgo(7) },
  { id: "marketing", name: "Marketing", role: "Campaign strategy", status: "Working", task: "Drafting campaign variants", progress: 42, activity: "Drafted 3 campaign variants", accent: ACCENTS.marketing, blurb: "Drafts and tests campaign variants that reinforce the outbound motion.", lastActive: minsAgo(19) },
  { id: "analytics", name: "Analytics", role: "Growth modeling", status: "Monitoring", task: "Updating growth projections", progress: 63, activity: "Updated revenue trajectory", accent: ACCENTS.analytics, blurb: "Tracks every signal and models how today's actions move the revenue trajectory.", lastActive: minsAgo(11) },
];

export const AGENT_DETAILS: Record<Agent["id"], AgentDetail> = {
  ceo: {
    mission: "Executive coordination",
    status: "Coordinating",
    task: "Reviewing team priorities",
    progress: 68,
    recentActions: ["Approved weekly priorities", "Re-balanced agent allocation", "Signed off Q3 objective brief"],
    sources: ["Weekly agent reports", "Mission pipeline", "Cross-agent summaries"],
    output: "Weekly priorities locked; Research and Prospecting re-balanced toward the qualified-opportunity objective.",
    confidence: 0.97,
    lastSync: "2 min ago",
  },
  research: {
    mission: "Competitive intelligence",
    status: "Working",
    task: "Analyzing competitor positioning",
    progress: 74,
    recentActions: ["Completed competitor analysis", "Published market-sizing note", "Flagged AcmeOps pricing shift"],
    sources: ["LinkedIn", "Crunchbase", "G2", "Company websites"],
    output: "Positioning matrix drafted across 4 competitors with confidence scoring — no rival ships autonomous orchestration.",
    confidence: 0.94,
    lastSync: "2 min ago",
  },
  prospecting: {
    mission: "Qualified pipeline growth",
    status: "Working",
    task: "Verifying qualified B2B leads",
    progress: 81,
    recentActions: ["Verified 12 qualified leads", "Enriched 46 accounts from Crunchbase", "Scored 5 new ICP accounts"],
    sources: ["Crunchbase", "LinkedIn Sales Navigator", "ICP fit model"],
    output: "12 accounts scored above the qualification threshold; 46 enriched with firmographic signals.",
    confidence: 0.91,
    lastSync: "4 min ago",
  },
  sales: {
    mission: "Personalized outreach",
    status: "Active",
    task: "Preparing personalized outreach",
    progress: 57,
    recentActions: ["Generated 8 outreach drafts", "Sent 6 personalized follow-ups", "Queued 5 sequence variants"],
    sources: ["Prospecting pipeline", "Research positioning notes", "Reply-rate model"],
    output: "8 tailored outreach drafts generated and queued for review against the qualified list.",
    confidence: 0.88,
    lastSync: "7 min ago",
  },
  marketing: {
    mission: "Campaign support",
    status: "Working",
    task: "Drafting campaign variants",
    progress: 42,
    recentActions: ["Drafted 3 campaign variants", "A/B variant approved for send", "Refreshed landing page copy angles"],
    sources: ["Research findings", "Sales drafts", "Brand voice model"],
    output: "3 campaign variants ready for the outbound blend, matched to the qualified segments.",
    confidence: 0.84,
    lastSync: "19 min ago",
  },
  analytics: {
    mission: "Growth modeling",
    status: "Monitoring",
    task: "Updating growth projections",
    progress: 63,
    recentActions: ["Updated revenue trajectory", "Refreshed conversion funnel", "Re-scored opportunity pipeline"],
    sources: ["Live signals feed", "Sales activity log", "Revenue model"],
    output: "Projected +18.6% pipeline impact on the current trajectory if outreach velocity holds.",
    confidence: 0.93,
    lastSync: "11 min ago",
  },
};

export const KPIS: Kpi[] = [
  { id: "opps", label: "Qualified Opportunities", value: "+34", delta: "+12.4%", deltaDir: "up", hint: "this week", accent: "var(--accent)", spark: [18, 21, 19, 26, 28, 31, 34] },
  { id: "actions", label: "Agent Actions", value: "128", delta: "+8%", deltaDir: "up", hint: "last 24h", accent: "var(--blue)", spark: [96, 104, 101, 112, 118, 122, 128] },
  { id: "tasks", label: "Tasks Completed", value: "94%", delta: "+3.1%", deltaDir: "up", hint: "on schedule", accent: "var(--emerald)", spark: [88, 90, 89, 92, 93, 93, 94] },
  { id: "pipeline", label: "Pipeline Impact", value: "+18.6%", delta: "+2.2%", deltaDir: "up", hint: "month over month", accent: "var(--teal)", spark: [12.2, 13.1, 14.0, 14.8, 16.1, 17.2, 18.6] },
];

export const GOAL: Goal = {
  title: "Generate 50 qualified B2B opportunities",
  progress: 72,
  status: "AI team actively executing",
};

const now = Date.now();
const mins = (m: number) => now - m * 60_000;

export const ACTIVITIES: ActivityEvent[] = [
  { id: "a1", agentId: "research", message: "Completed competitor analysis", timestamp: mins(2) },
  { id: "a2", agentId: "prospecting", message: "Verified 12 qualified leads", timestamp: mins(4) },
  { id: "a3", agentId: "sales", message: "Generated 8 personalized outreach drafts", timestamp: mins(7) },
  { id: "a4", agentId: "analytics", message: "Updated revenue trajectory", timestamp: mins(11) },
  { id: "a5", agentId: "ceo", message: "Approved weekly priorities", timestamp: mins(15) },
  { id: "a6", agentId: "marketing", message: "Drafted 3 campaign variants", timestamp: mins(19) },
  { id: "a7", agentId: "prospecting", message: "Enriched 46 new accounts from Crunchbase", timestamp: mins(24) },
  { id: "a8", agentId: "research", message: "Published market-sizing note for Q3", timestamp: mins(31) },
];

export const PIPELINE: PipelineStage[] = [
  { agentId: "ceo", task: "Defining the mission brief and delegating the objective", output: "Mission brief set — objective delegated to the six-agent team" },
  { agentId: "research", task: "Mapping the opportunity landscape for this objective", output: "Identified 3 high-intent segments and 42 addressable accounts" },
  { agentId: "prospecting", task: "Verifying fit and intent across the addressable list", output: "12 accounts scored above qualification threshold" },
  { agentId: "sales", task: "Preparing personalized outreach sequences", output: "8 tailored drafts generated and queued for review" },
  { agentId: "marketing", task: "Drafting supporting campaign variants", output: "3 campaign variants ready for the outbound blend" },
  { agentId: "analytics", task: "Modeling expected pipeline contribution", output: "Projected +18.6% pipeline impact on current trajectory" },
];

function seededSeries(seed: number, n: number, base: number, vol: number, trend: number): number[] {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = v * (1 + trend / n) + (rand() - 0.48) * vol;
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

const ANALYTICS: Record<DateRange, AnalyticsSet> = {
  "7D": {
    revenue: seededSeries(11, 7, 12800, 900, 0.09),
    opportunities: seededSeries(21, 7, 24, 6, 0.16),
    productivity: [68, 74, 81, 57, 42, 63],
    efficiency: 86,
    efficiencyBars: [
      { label: "Research", value: 92 },
      { label: "Prospecting", value: 88 },
      { label: "Sales", value: 79 },
      { label: "Marketing", value: 74 },
      { label: "Analytics", value: 90 },
      { label: "CEO", value: 96 },
    ],
    funnel: [
      { label: "ICP identified", value: 126 },
      { label: "Enriched", value: 88 },
      { label: "Verified", value: 54 },
      { label: "Qualified", value: 34 },
      { label: "In conversation", value: 12 },
    ],
    contribution: [
      { agentId: "prospecting", pct: 31 },
      { agentId: "research", pct: 24 },
      { agentId: "sales", pct: 19 },
      { agentId: "analytics", pct: 14 },
      { agentId: "marketing", pct: 8 },
      { agentId: "ceo", pct: 4 },
    ],
    goalCompletion: 72,
    insight:
      "Prospecting activity increased 18% this week and contributed to a 12.4% increase in qualified opportunities. Sales follow-up velocity is the current constraint on the next tier.",
  },
  "30D": {
    revenue: seededSeries(31, 30, 11800, 1400, 0.16),
    opportunities: seededSeries(41, 30, 18, 7, 0.22),
    productivity: [71, 76, 84, 61, 48, 66],
    efficiency: 88,
    efficiencyBars: [
      { label: "Research", value: 90 },
      { label: "Prospecting", value: 91 },
      { label: "Sales", value: 81 },
      { label: "Marketing", value: 76 },
      { label: "Analytics", value: 93 },
      { label: "CEO", value: 97 },
    ],
    funnel: [
      { label: "ICP identified", value: 402 },
      { label: "Enriched", value: 296 },
      { label: "Verified", value: 171 },
      { label: "Qualified", value: 108 },
      { label: "In conversation", value: 41 },
    ],
    contribution: [
      { agentId: "prospecting", pct: 29 },
      { agentId: "research", pct: 26 },
      { agentId: "sales", pct: 21 },
      { agentId: "analytics", pct: 13 },
      { agentId: "marketing", pct: 7 },
      { agentId: "ceo", pct: 4 },
    ],
    goalCompletion: 68,
    insight:
      "Over 30 days the team converted 41% of verified leads into qualified opportunities. Research flagged a pricing shift by AcmeOps that opens a wedge on enterprise deals.",
  },
  "90D": {
    revenue: seededSeries(51, 90, 10200, 1500, 0.24),
    opportunities: seededSeries(61, 90, 12, 6, 0.3),
    productivity: [74, 79, 86, 65, 52, 70],
    efficiency: 91,
    efficiencyBars: [
      { label: "Research", value: 94 },
      { label: "Prospecting", value: 93 },
      { label: "Sales", value: 84 },
      { label: "Marketing", value: 79 },
      { label: "Analytics", value: 95 },
      { label: "CEO", value: 98 },
    ],
    funnel: [
      { label: "ICP identified", value: 1140 },
      { label: "Enriched", value: 862 },
      { label: "Verified", value: 503 },
      { label: "Qualified", value: 317 },
      { label: "In conversation", value: 122 },
    ],
    contribution: [
      { agentId: "prospecting", pct: 30 },
      { agentId: "research", pct: 25 },
      { agentId: "sales", pct: 22 },
      { agentId: "analytics", pct: 12 },
      { agentId: "marketing", pct: 7 },
      { agentId: "ceo", pct: 4 },
    ],
    goalCompletion: 61,
    insight:
      "The 90-day trajectory shows compounding pipeline growth at 2.4x the pre-team baseline. Analytics models +18.6% MoM impact if outreach velocity holds.",
  },
};

export function getAnalyticsMock(range: DateRange): AnalyticsSet {
  return ANALYTICS[range];
}

export const COMPETITORS: Competitor[] = [
  { name: "AcmeOps", positioning: "Enterprise workflow automation", pricing: "$99/user/mo", strengths: "Deep CRM integrations", weaknesses: "No AI-native planning layer", confidence: 0.94 },
  { name: "StrataHQ", positioning: "Mid-market dashboard suite", pricing: "Custom quotes", strengths: "Strong analytics", weaknesses: "Manual setup, no agent orchestration", confidence: 0.88 },
  { name: "ForgeStack", positioning: "SMB sales toolkit", pricing: "$49/user/mo", strengths: "Fast onboarding", weaknesses: "Narrow scope, weak research", confidence: 0.9 },
  { name: "Novafleet", positioning: "AI copilot add-on", pricing: "$29/user/mo", strengths: "Conversational UX", weaknesses: "No autonomous execution", confidence: 0.84 },
];

export const RESEARCH: ResearchData = {
  mission: "Competitive intelligence",
  status: "Working",
  progress: 74,
  sources: [
    { name: "LinkedIn", kind: "Company intelligence", documents: 312 },
    { name: "Crunchbase", kind: "Funding & firmographics", documents: 148 },
    { name: "G2", kind: "Reviews & positioning", documents: 96 },
    { name: "Company websites", kind: "Product & pricing pages", documents: 57 },
  ],
  competitors: COMPETITORS,
  log: [
    { time: "09:41", text: "Pulled 312 LinkedIn signals across 4 competitors" },
    { time: "09:47", text: "Crunchbase funding history enriched" },
    { time: "09:52", text: "G2 review themes extracted", ok: true },
    { time: "10:03", text: "Pricing pages captured and normalized", ok: true },
    { time: "10:11", text: "Positioning matrix drafted", ok: true },
    { time: "10:18", text: "Confidence scoring applied to all rows" },
  ],
  findings: [
    { title: "No competitor ships an autonomous orchestration layer", detail: "All four players assist humans; none coordinate a full agent team toward a goal." },
    { title: "Pricing is uniformly seat-based", detail: "Opportunity to anchor on outcomes rather than seats." },
    { title: "Analytics is the common wedge", detail: "Every competitor leads with dashboards — venture on orchestration instead." },
  ],
  summary:
    "The competitive field clusters around point solutions. AcmeOps owns enterprise workflow, StrataHQ owns reporting, and ForgeStack owns lightweight SMB sales tooling — but none operate as an autonomous team that plans, executes, and reports on a founder's objective. VenturePilot's differentiation is coordination: one intelligence, six specialized agents, measurable output. Recommended: lead the narrative with mission-level outcomes and the 72% progress toward the current objective.",
};

export const SETTINGS: SettingsData = {
  companyName: "Northwind Labs",
  industry: "B2B SaaS",
  size: "11-50",
  email: "alex@northwindlabs.io",
  timezone: "America/New_York",
  toggles: [
    { key: "auto-approve", label: "Auto-approve low-risk agent actions", hint: "Research reads and routine updates skip review", on: true },
    { key: "digest", label: "Daily executive digest", hint: "A 7:00 AM summary of what your AI team did", on: true },
    { key: "live", label: "Live activity streaming", hint: "Surface agent actions as they complete", on: true },
    { key: "sharing", label: "Share analytics with your board", hint: "Generate a read-only board link", on: false },
  ],
};
