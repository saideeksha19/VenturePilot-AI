"""Structured outputs produced by the AI provider layer.

Every provider (real or fallback) returns these Pydantic models, so route
handlers and the orchestration service never touch raw model output.
"""

from pydantic import BaseModel, Field

AGENT_IDS = ("ceo", "research", "prospecting", "sales", "marketing", "analytics")


class ExecutionStage(BaseModel):
    """One stage of a CEO-generated execution plan."""

    agent_id: str = Field(..., description="One of the six VenturePilot agents")
    title: str
    task: str = Field(..., description="Concrete task assigned to the agent")
    purpose: str = Field(..., description="Why this stage exists for the objective")
    depends_on: list[str] = Field(default_factory=list, description="Agent ids that must finish first")
    expected_output: str


class ExecutionPlan(BaseModel):
    """The CEO agent's structured plan for a global objective."""

    objective: str
    success_criteria: list[str] = Field(default_factory=list)
    priority: str = "high"
    summary: str = Field(..., description="Plain-language description of the plan")
    stages: list[ExecutionStage] = Field(default_factory=list)
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key), not a real model",
    )


class CompetitorRow(BaseModel):
    name: str
    positioning: str | None = None
    notes: str | None = None


class SourceRef(BaseModel):
    label: str
    description: str
    verified: bool = False  # False until real web research with citations exists


class ResearchReport(BaseModel):
    """The Research agent's structured analysis."""

    research_question: str
    findings: list[str] = Field(default_factory=list)
    competitors: list[CompetitorRow] = Field(default_factory=list)
    market_observations: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    summary: str
    recommended_next_action: str
    analysis_basis: str = Field(
        default="ai_analysis",
        description='"ai_analysis" (reasoned from context) or "web_research" (live sources)',
    )
    evidence_verified: bool = Field(
        default=False,
        description="True only when findings are backed by actually-fetched external sources",
    )
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key)",
    )


class TargetSegment(BaseModel):
    """A segment of accounts worth pursuing for the objective."""

    name: str
    description: str
    size_hint: str | None = Field(
        default=None, description="Qualitative size indication — never a verified count"
    )


class IllustrativeTarget(BaseModel):
    """A modeled account profile, never a verified real company or person.

    Always labeled illustrative: without an external data source the agent
    must not pretend it found real leads.
    """

    segment: str
    profile: str
    reason: str
    illustrative: bool = True


class ScoringFactor(BaseModel):
    factor: str
    weight: float = Field(default=0.0, ge=0.0, le=1.0)


class PriorityAction(BaseModel):
    action: str
    rationale: str


class ProspectingResult(BaseModel):
    """The Prospecting agent's structured pipeline intelligence."""

    summary: str
    ideal_customer_profile: str
    target_segments: list[TargetSegment] = Field(default_factory=list)
    qualification_criteria: list[str] = Field(default_factory=list)
    illustrative_targets: list[IllustrativeTarget] = Field(default_factory=list)
    scoring_factors: list[ScoringFactor] = Field(default_factory=list)
    priority_actions: list[PriorityAction] = Field(default_factory=list)
    estimated_opportunity_count: int = Field(default=0, ge=0)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_verified: bool = Field(
        default=False,
        description="True only when targets are backed by actually-fetched verified lead data",
    )
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key)",
    )


class SalesResult(BaseModel):
    """The Sales agent's structured, personalized outreach output.

    Every field is derived from the persisted Prospecting result and business
    context — never from fabricated real leads or external data. `simulated`
    is True when produced by the deterministic fallback (no API key).
    """

    summary: str
    target_profile: str = Field(
        ..., description="The modeled account profile this outreach is written for"
    )
    outreach_objective: str
    personalization_rationale: str = Field(
        ..., description="Why this outreach fits the target and the mission objective"
    )
    recommended_channel: str = Field(default="Email")
    subject_line: str
    outreach_message: str
    follow_up_message: str
    call_to_action: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_verified: bool = Field(
        default=False,
        description="True only when outreach is backed by verified contact/account data",
    )
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key)",
    )


class CampaignVariant(BaseModel):
    """One creative variant of a campaign strategy.

    A structured object — never a claim that the variant was sent, launched,
    or tested. It is a generated draft for review.
    """

    variant_name: str
    headline: str
    supporting_copy: str
    call_to_action: str
    target_segment: str
    rationale: str


class KpiMetric(BaseModel):
    """One business KPI — a modeled estimate unless `source` says otherwise."""

    name: str
    value: float | None = None
    unit: str = ""
    source: str = Field(
        default="modeled",
        description='"modeled" (estimate) | "persisted" (internal mission data) | "verified" (external measurement)',
    )
    note: str | None = None


class FunnelStage(BaseModel):
    """One stage of the modeled pipeline funnel."""

    stage: str
    count: int = 0
    conversion_from_previous: float | None = Field(
        default=None, description="Rate from the previous stage (0..1), when derivable"
    )
    source: str = Field(default="modeled")


class PerformanceSignal(BaseModel):
    """A strong or weak signal derived from the mission's persisted outputs."""

    signal: str
    direction: str = Field(default="positive", description="positive | negative | neutral")
    rationale: str = ""


class AnalyticsResult(BaseModel):
    """The Analytics agent's structured performance intelligence.

    Everything here is derived from the mission's own persisted outputs and
    modeled estimates — never from real production analytics. No traffic,
    revenue, ad, or conversion measurements are ever claimed unless
    `evidence_verified` is true and `data_basis` is "verified".
    """

    summary: str
    kpis: list[KpiMetric] = Field(default_factory=list)
    funnel: list[FunnelStage] = Field(default_factory=list)
    overall_conversion_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    strongest_signals: list[PerformanceSignal] = Field(default_factory=list)
    weak_signals: list[PerformanceSignal] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    priority_actions: list[PriorityAction] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    data_basis: str = Field(
        default="modeled",
        description='"modeled" (derived estimates) or "verified" (external measurements)',
    )
    evidence_verified: bool = Field(
        default=False,
        description="True only when backed by actually-fetched external measurement data",
    )
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key)",
    )


class MarketingResult(BaseModel):
    """The Marketing agent's structured campaign strategy.

    Everything here is a generated draft derived from the persisted Research /
    Prospecting / Sales results and business context. No campaign performance,
    sends, launches, or A/B tests are ever claimed — `simulated` is True when
    produced by the deterministic fallback (no API key).
    """

    summary: str
    campaign_objective: str
    target_audience: str
    positioning: str
    key_message: str
    campaign_angle: str
    recommended_channels: list[str] = Field(default_factory=list)
    campaign_variants: list[CampaignVariant] = Field(default_factory=list)
    call_to_action: str
    content_themes: list[str] = Field(default_factory=list)
    success_metrics: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_verified: bool = Field(
        default=False,
        description="True only when strategy is backed by actually-fetched external data",
    )
    simulated: bool = Field(
        default=False,
        description="True when produced by the deterministic fallback (no API key)",
    )
