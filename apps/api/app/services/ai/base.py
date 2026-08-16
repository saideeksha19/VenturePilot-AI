"""AI provider interface.

VenturePilot talks to AI through this abstraction so no route handler or
service ever calls an external provider directly. Providers raise
`AIProviderError` on any failure (missing key, timeout, invalid response) and
the orchestration layer converts that into task/goal failure states.
"""

from typing import Protocol

from app.services.ai.models import (
    AnalyticsResult,
    ExecutionPlan,
    MarketingResult,
    ProspectingResult,
    ResearchReport,
    SalesResult,
)


class AIProviderError(Exception):
    """Raised when the AI provider cannot produce a valid result."""


class AIProvider(Protocol):
    """A provider that can plan goals and produce research analysis."""

    name: str
    simulated: bool

    def plan_goal(self, *, objective: str, business: dict) -> ExecutionPlan:
        """Produce the CEO's structured execution plan for an objective."""

    def research(self, *, question: str, objective: str, business: dict) -> ResearchReport:
        """Produce the Research agent's structured analysis."""

    def prospect(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
    ) -> ProspectingResult:
        """Produce the Prospecting agent's structured pipeline intelligence.

        `research` is the persisted Research result (or None) so qualification
        builds on the Research agent's analysis. Targets are always labeled
        illustrative unless backed by verified external lead data.
        """

    def sales(
        self,
        *,
        business: dict,
        objective: str,
        prospecting: dict | None,
    ) -> SalesResult:
        """Produce the Sales agent's personalized outreach.

        `prospecting` is the persisted Prospecting result the outreach must be
        derived from (ICP, segments, criteria, priority actions, illustrative
        targets). Never fabricate real leads, contacts, or verified accounts.
        """

    def marketing(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
    ) -> MarketingResult:
        """Produce the Marketing agent's structured campaign strategy.

        Consumes the persisted upstream results (Research market context,
        Prospecting ICP/segments, Sales messaging/CTA) and returns generated
        campaign variants — never claims a campaign was sent, launched, or
        tested.
        """

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
        """Produce the Analytics agent's structured performance intelligence.

        Derives modeled funnel/KPI intelligence from the mission's persisted
        upstream outputs. Never claims real production analytics, traffic,
        revenue, or conversion data — `evidence_verified` stays false and
        `data_basis` stays "modeled" unless external measurements exist.
        """
