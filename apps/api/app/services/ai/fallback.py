"""Deterministic fallback provider.

Used when no AI provider API key is configured so the application stays fully
usable in development. Everything this provider returns is explicitly marked
`simulated=True` so the UI can label it honestly ("development mode") — the
system never pretends a real model ran.

The fallback still makes real decisions: it derives the execution plan from the
objective's content (not hard-coded text) and the research report is framed as
analysis of the provided business context, with no fabricated citations.
"""

import hashlib

from app.services.ai.base import AIProvider
from app.services.ai.models import (
    AGENT_IDS,
    AnalyticsResult,
    CampaignVariant,
    CompetitorRow,
    ExecutionPlan,
    ExecutionStage,
    FunnelStage,
    IllustrativeTarget,
    KpiMetric,
    MarketingResult,
    PerformanceSignal,
    PriorityAction,
    ProspectingResult,
    ResearchReport,
    SalesResult,
    ScoringFactor,
    SourceRef,
    TargetSegment,
)


class FallbackProvider:
    """Development-mode provider with no external dependencies."""

    name = "deterministic-fallback"
    simulated = True

    # -- helpers ---------------------------------------------------------

    @staticmethod
    def _seed(*parts: str) -> int:
        return int(hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:8], 16)

    @staticmethod
    def _business_name(business: dict) -> str:
        return business.get("name") or "your company"

    # -- CEO planning ----------------------------------------------------

    def plan_goal(self, *, objective: str, business: dict) -> ExecutionPlan:
        name = self._business_name(business)
        low = objective.lower()

        stages: list[ExecutionStage] = [
            ExecutionStage(
                agent_id="ceo",
                title="Mission brief",
                task=f"Define the mission and success criteria for: {objective}",
                purpose="Anchor the team on the founder's objective and expected outcomes.",
                depends_on=[],
                expected_output="Mission brief with measurable success criteria.",
            ),
            ExecutionStage(
                agent_id="research",
                title="Opportunity research",
                task=f"Research the market and competitive context for {name} around: {objective}",
                purpose="Give every downstream stage grounded intelligence to act on.",
                depends_on=["ceo"],
                expected_output="Structured analysis of market context, competitors, risks and opportunities.",
            ),
        ]

        # The CEO decides which stages matter based on the objective itself.
        if any(k in low for k in ("opportunit", "lead", "pipeline", "revenue", "demo", "b2b", "client", "prospect", "qualified")):
            stages.append(
                ExecutionStage(
                    agent_id="prospecting",
                    title="Pipeline qualification",
                    task=f"Identify and qualify accounts that fit {name} for: {objective}",
                    purpose="The objective is pipeline-driven, so fit-and-intent scoring is required.",
                    depends_on=["research"],
                    expected_output="Qualified account list with fit and intent scoring.",
                )
            )
        if any(k in low for k in ("opportunit", "outreach", "demo", "sales", "conversation", "follow-up", "prospect")):
            stages.append(
                ExecutionStage(
                    agent_id="sales",
                    title="Outreach preparation",
                    task="Prepare personalized outreach sequences for the qualified list.",
                    purpose="Pipeline only converts when it becomes conversation.",
                    depends_on=["prospecting"],
                    expected_output="Personalized outreach drafts ready for review.",
                )
            )
        if any(k in low for k in ("launch", "brand", "campaign", "pricing", "awareness", "marketing", "messaging")):
            stages.append(
                ExecutionStage(
                    agent_id="marketing",
                    title="Campaign support",
                    task="Draft supporting campaign and messaging variants.",
                    purpose="Reinforce the motion with coordinated campaign content.",
                    # Depends on every stage already in the plan (never a dangling
                    # dependency on a stage the CEO chose not to include).
                    depends_on=[s.agent_id for s in stages if s.agent_id != "marketing"],
                    expected_output="Campaign strategy with structured creative variants.",
                )
            )
        stages.append(
            ExecutionStage(
                agent_id="analytics",
                title="Outcome modeling",
                task="Model expected outcomes and define how progress will be measured.",
                purpose="Close the loop so the founder sees measurable intelligence.",
                depends_on=[s.agent_id for s in stages if s.agent_id != "analytics"],
                expected_output="Outcome projection and measurement plan.",
            )
        )

        return ExecutionPlan(
            objective=objective,
            success_criteria=[
                f"Deliver a clear, structured plan for: {objective}",
                "Identify the highest-leverage stages and their dependencies",
                "Produce intelligence the team can act on without further founder input",
            ],
            priority="high",
            summary=(
                f"A six-agent execution plan for {name}: the CEO defines the mission, "
                "Research grounds it in market intelligence, and downstream stages execute "
                "the motion before Analytics closes the measurement loop."
            ),
            stages=stages,
            simulated=True,
        )

    # -- Research ---------------------------------------------------------

    def research(self, *, question: str, objective: str, business: dict) -> ResearchReport:
        name = self._business_name(business)
        industry = business.get("industry") or "the B2B market"
        low = objective.lower()

        findings = [
            f"{name} operates in {industry}; this analysis is reasoned from the provided business context, not live web research.",
            f"The objective '{objective}' is best served by focusing downstream agents on pipeline and measurement.",
            "No external sources were fetched — treat all observations as development-mode analysis.",
        ]
        if any(k in low for k in ("opportunit", "lead", "pipeline", "qualified")):
            findings.append("Pipeline-oriented objectives benefit most from fit-and-intent qualification before outreach.")

        opportunities = []
        if any(k in low for k in ("revenue", "growth", "opportunit", "qualified", "pipeline")):
            opportunities.append("A repeatable qualification motion compounds into a measurable opportunity flow.")
        opportunities.append("Documenting the current market narrative gives Sales and Marketing shared ground truth.")
        if not opportunities:
            opportunities.append("Refining the value narrative around the stated objective is the fastest lever.")

        risks = [
            "Without live research integration, competitor and pricing signals are not verified.",
            "Broad objectives risk spreading agents thin — the plan focuses on the stages the objective actually requires.",
        ]

        return ResearchReport(
            research_question=question,
            findings=findings,
            competitors=[],  # deliberately empty — no fabricated competitor data
            market_observations=[
                f"{industry} is the operating context provided for {name}.",
                "Verification of market claims requires the future web-research integration.",
            ],
            opportunities=opportunities,
            risks=risks,
            sources=[SourceRef(label="development mode", description="No live sources accessed.", verified=False)],
            confidence=0.5,
            summary=(
                f"Development-mode analysis for {name}: the objective '{objective}' is coherent, "
                "pipeline-focused, and ready for downstream agents — but no external evidence was "
                "fetched, so nothing here is presented as verified fact."
            ),
            recommended_next_action="Proceed with the plan stages; re-run with live research enabled for verified market data.",
            analysis_basis="ai_analysis",
            evidence_verified=False,
            simulated=True,
        )

    # -- Prospecting ------------------------------------------------------

    def prospect(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
    ) -> ProspectingResult:
        name = self._business_name(business)
        industry = business.get("industry") or "the B2B market"
        low = objective.lower()

        # The agent decides which segments matter from the objective itself.
        segments: list[TargetSegment] = [
            TargetSegment(
                name="Mid-market operators",
                description=f"Companies in {industry} with 50-500 employees and an active growth mandate.",
                size_hint="broad addressable band — not a verified count",
            ),
            TargetSegment(
                name="Scaling founders",
                description="Founder-led companies that outsource execution and want an autonomous operating team.",
                size_hint="overlaps the mid-market band; unverified",
            ),
        ]
        if any(k in low for k in ("pricing", "launch", "campaign", "awareness")):
            segments.append(
                TargetSegment(
                    name="Early adopters of the category",
                    description="Accounts already experimenting with AI-native operations tooling.",
                    size_hint="unverified",
                )
            )

        criteria = [
            f"Active need matching: {objective}",
            "Fit with the ICP firmographics above",
            "Signs of intent (hiring for the role, open initiatives, active tooling budget)",
        ]

        targets = [
            IllustrativeTarget(
                segment=segments[0].name,
                profile=f"A {industry} company at 50-500 employees with a named growth owner",
                reason="Matches the core ICP; highest expected conversion for this objective",
            ),
            IllustrativeTarget(
                segment=segments[1].name,
                profile="A founder-led company that has outgrown manual pipeline management",
                reason="Fits the autonomous-operations value proposition",
            ),
        ]

        actions = [
            PriorityAction(
                action="Build the ICP account list from the modeled segments",
                rationale="Converts modeled segments into a concrete list to feed Sales",
            ),
            PriorityAction(
                action="Score every account on fit and intent",
                rationale="Prioritizes outreach toward the accounts most likely to convert",
            ),
            PriorityAction(
                action="Hand the scored list to Sales for personalized outreach",
                rationale="The pipeline only converts when it becomes conversation",
            ),
        ]

        summary = (
            f"Development-mode prospecting for {name}: modeled {len(segments)} priority target "
            "segments for the objective, with qualification criteria and scoring factors. "
            "All account profiles are illustrative — no real leads were fetched, so nothing "
            "here is presented as a verified prospect."
        )

        return ProspectingResult(
            summary=summary,
            ideal_customer_profile=(
                f"A {industry} company with 50-500 employees, an active growth mandate, and a "
                "named owner for pipeline — modeled, not verified."
            ),
            target_segments=segments,
            qualification_criteria=criteria,
            illustrative_targets=targets,
            scoring_factors=[
                ScoringFactor(factor="Firmographic fit", weight=0.45),
                ScoringFactor(factor="Intent signals", weight=0.35),
                ScoringFactor(factor="Buying readiness", weight=0.2),
            ],
            priority_actions=actions,
            estimated_opportunity_count=len(segments) * 25,
            confidence=0.5,
            evidence_verified=False,
            simulated=True,
        )

    # -- Sales ------------------------------------------------------------

    def sales(
        self,
        *,
        business: dict,
        objective: str,
        prospecting: dict | None,
    ) -> SalesResult:
        name = self._business_name(business)
        industry = business.get("industry") or "the B2B market"
        low = objective.lower()

        # Derive the outreach from the persisted Prospecting result when
        # present; otherwise fall back to the ICP modeled from context.
        segments = (prospecting or {}).get("target_segments") or []
        targets = (prospecting or {}).get("illustrative_targets") or []
        segment_name = segments[0]["name"] if segments else "priority accounts"
        if targets:
            target_profile = targets[0]["profile"]
            target_reason = targets[0].get("reason") or "matches the modeled ICP"
            target_segment = targets[0].get("segment") or segment_name
        else:
            target_profile = f"A {industry} company in the {segment_name} band"
            target_reason = "matches the modeled ICP for this objective"
            target_segment = segment_name

        subject = (
            f"A {segment_name} playbook for {objective[:52].rstrip('.')}"
            if any(k in low for k in ("demo", "qualified", "opportunit", "pipeline"))
            else f"{objective[:52].rstrip('.')} — a tailored angle for {segment_name}"
        )

        outreach = (
            f"Hi there,\n\n"
            f"I'm reaching out from {name} with a focused idea for {target_segment} "
            f"teams like yours: {objective.rstrip('.')}. "
            f"We've mapped what this looks like for {industry} companies and built a "
            "repeatable approach around it — happy to walk you through the specific "
            "playbook rather than a generic pitch.\n\n"
            f"Would a short conversation this week be worth your time?"
        )
        follow_up = (
            f"Following up once on my note about {objective.rstrip('.')} — "
            "if the timing isn't right, no problem at all. I'll leave the door open "
            "and you can reply whenever it's useful."
        )

        return SalesResult(
            summary=(
                f"Development-mode outreach for {name}: personalized draft written for "
                f"the '{target_segment}' target profile modeled by Prospecting. The target "
                "is illustrative — no real contact or verified account was used."
            ),
            target_profile=target_profile,
            outreach_objective=objective,
            personalization_rationale=(
                f"Written for the '{target_segment}' profile because it {target_reason}; "
                "the message references the mission objective directly rather than a "
                "generic pitch."
            ),
            recommended_channel="Email",
            subject_line=subject,
            outreach_message=outreach,
            follow_up_message=follow_up,
            call_to_action="Reply to book a short walkthrough of the playbook",
            confidence=0.5,
            evidence_verified=False,
            simulated=True,
        )

    # -- Marketing --------------------------------------------------------

    def marketing(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
    ) -> MarketingResult:
        name = self._business_name(business)
        industry = business.get("industry") or "the B2B market"
        low = objective.lower()

        # Derive the campaign from the persisted upstream results when present:
        # Sales messaging/segment first, then Prospecting ICP/segments, then
        # Research market context. Never invent evidence that isn't there.
        sales_segment = None
        if sales:
            for field in ("personalization_rationale", "subject_line", "outreach_message"):
                for seg in (prospecting or {}).get("target_segments") or []:
                    if seg["name"] in (sales.get(field) or ""):
                        sales_segment = seg["name"]
                        break
                if sales_segment:
                    break
        segments = (prospecting or {}).get("target_segments") or []
        segment_name = sales_segment or (segments[0]["name"] if segments else "priority accounts")
        sales_cta = (sales or {}).get("call_to_action") or "Request the playbook walkthrough"
        sales_subject = (sales or {}).get("subject_line") or objective
        research_summary = (research or {}).get("summary") or ""

        angle = (
            f"Turn '{objective}' into a repeatable motion, not a one-off push"
            if any(k in low for k in ("campaign", "launch", "pricing", "awareness"))
            else f"Make {name} the obvious operating partner for {segment_name}"
        )

        variants = [
            CampaignVariant(
                variant_name="Outcome-led",
                headline=f"{name}: a playbook for {objective[:44].rstrip('.')}",
                supporting_copy=(
                    f"Built around the '{segment_name}' segment and the sales angle "
                    f"'{sales_subject[:60].rstrip('.')}', this variant leads with the "
                    "outcome the founder actually wants."
                ),
                call_to_action=sales_cta,
                target_segment=segment_name,
                rationale="Mirrors the Sales messaging so every touchpoint tells the same story.",
            ),
            CampaignVariant(
                variant_name="Category-mover",
                headline=f"{industry} teams use {name} to ship outcomes",
                supporting_copy=(
                    "Positions the campaign around category leadership rather than feature "
                    "comparison — grounded in the research framing, not fabricated stats."
                ),
                call_to_action="See the playbook",
                target_segment=segment_name,
                rationale="Differentiates on orchestration, the gap the Research stage surfaced.",
            ),
            CampaignVariant(
                variant_name="Segment-specific",
                headline=f"For {segment_name}: a tailored route to {objective[:40].rstrip('.')}",
                supporting_copy=(
                    "A narrow, segment-first variant that reuses the Prospecting ICP "
                    "profile and qualification criteria as the targeting basis."
                ),
                call_to_action=sales_cta,
                target_segment=segment_name,
                rationale="Converts the modeled ICP into a concrete, addressable campaign.",
            ),
        ]

        return MarketingResult(
            summary=(
                f"Development-mode campaign strategy for {name}: {len(variants)} generated "
                "creative variants targeting the modeled segments. This is strategy only — "
                "no campaign was sent, launched, or tested, and no performance data exists."
            ),
            campaign_objective=objective,
            target_audience=(
                f"{segment_name} — modeled from the Prospecting/Sales output; not a verified audience list."
            ),
            positioning=(
                f"{name} as the autonomous operating layer for {industry} companies "
                "pursuing this objective."
            ),
            key_message=(
                f"A coordinated AI team turns '{objective.rstrip('.')}' into measurable output "
                "— the message Sales already opened with."
            ),
            campaign_angle=angle,
            recommended_channels=["LinkedIn", "Email", "Web"],
            campaign_variants=variants,
            call_to_action=sales_cta,
            content_themes=[
                "Mission-level outcomes over feature lists",
                "The six-agent orchestration story",
                "Segment-specific proof patterns from the modeled ICP",
            ],
            success_metrics=[
                "Qualified reply rate on the outreach CTA",
                "Share of the modeled segment reached",
                "Pipeline contribution attributable to the campaign",
            ],
            confidence=0.5,
            evidence_verified=False,
            simulated=True,
        )

    # -- Analytics --------------------------------------------------------

    def analytics(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
        marketing: dict | None,
    ) -> AnalyticsResult:
        name = self._business_name(business)

        # Everything below is DERIVED from the mission's persisted outputs.
        # The opportunity pool is Prospecting's own modeled estimate; the
        # funnel rates are transparent modeling assumptions — never real
        # production measurements.
        pipeline_count = int((prospecting or {}).get("estimated_opportunity_count") or 0)
        segment_count = len((prospecting or {}).get("target_segments") or [])

        # Modeled funnel (each rate is a stated assumption, not measured data).
        engaged = round(pipeline_count * 0.6)
        conversations = round(engaged * 0.35)
        created = round(conversations * 0.5)
        funnel: list[FunnelStage] = [
            FunnelStage(stage="Qualified pipeline", count=pipeline_count, source="modeled"),
            FunnelStage(
                stage="Outreach engaged",
                count=engaged,
                conversion_from_previous=round(0.6, 2),
                source="modeled",
            ),
            FunnelStage(
                stage="Conversations",
                count=conversations,
                conversion_from_previous=round(0.35, 2),
                source="modeled",
            ),
            FunnelStage(
                stage="Opportunities modeled",
                count=created,
                conversion_from_previous=round(0.5, 2),
                source="modeled",
            ),
        ]
        overall = round(created / pipeline_count, 2) if pipeline_count else 0.0

        research_summary = (research or {}).get("summary") or ""
        research_risks = (research or {}).get("risks") or []
        research_opps = (research or {}).get("opportunities") or []
        sales_channel = (sales or {}).get("recommended_channel") or "Email"
        marketing_themes = (marketing or {}).get("content_themes") or []

        kpis = [
            KpiMetric(
                name="Modeled opportunity pool",
                value=float(pipeline_count),
                unit="accounts",
                source="modeled",
                note="Derived from Prospecting's modeled estimate — not a verified count.",
            ),
            KpiMetric(
                name="Modeled pipeline conversion",
                value=overall * 100,
                unit="%",
                source="modeled",
                note="Modeled assumption, not a measured conversion rate.",
            ),
            KpiMetric(
                name="Agent stages completed",
                value=6.0,
                unit="stages",
                source="persisted",
                note="The six-stage orchestration genuinely executed and persisted results.",
            ),
        ]

        strongest = [
            PerformanceSignal(
                signal=f"Modeled pipeline of {pipeline_count} qualified accounts",
                direction="positive",
                rationale="The Prospecting stage produced a concrete modeled pool to act on.",
            ),
            PerformanceSignal(
                signal="Full six-agent orchestration completed",
                direction="positive",
                rationale="Every stage executed and persisted a structured result — the pipeline is genuinely runnable.",
            ),
        ]
        weak = [
            PerformanceSignal(
                signal="No external measurement data",
                direction="neutral",
                rationale="All counts are modeled estimates — no analytics, traffic, revenue, or ad data was accessed.",
            ),
            PerformanceSignal(
                signal="Conversion rates are assumptions",
                direction="neutral",
                rationale="Funnel rates are stated modeling assumptions pending real pipeline data.",
            ),
        ]

        risks = [
            "Modeled opportunity counts are not verified leads or customers.",
            "No external analytics source exists yet — production KPIs cannot be measured.",
            *[r for r in research_risks if isinstance(r, str)][:2],
        ]
        opportunities = [
            "Instrument real pipeline stages to replace modeled rates with measured ones.",
            "Connect an external analytics source so KPI values become verified measurements.",
            *[o for o in research_opps if isinstance(o, str)][:2],
        ]

        actions = [
            "Feed the modeled pipeline into Sales/Marketing execution as already planned.",
            "Instrument each funnel stage to capture real conversion data on the next mission.",
            "Re-run this objective once external analytics is connected for verified KPIs.",
        ]

        return AnalyticsResult(
            summary=(
                f"Development-mode analytics for {name}: modeled funnel intelligence derived from "
                "the mission's persisted outputs. No external analytics, traffic, revenue, or ad "
                "data was accessed — every number is a modeled projection, not a real measurement."
            ),
            kpis=kpis,
            funnel=funnel,
            overall_conversion_rate=overall,
            strongest_signals=strongest,
            weak_signals=weak,
            risks=risks,
            opportunities=opportunities,
            recommended_actions=actions,
            priority_actions=[
                PriorityAction(action=actions[0], rationale="Converts modeled intelligence into execution."),
                PriorityAction(action=actions[1], rationale="Moves the pipeline from modeled to measured."),
            ],
            confidence=0.5,
            data_basis="modeled",
            evidence_verified=False,
            simulated=True,
        )
