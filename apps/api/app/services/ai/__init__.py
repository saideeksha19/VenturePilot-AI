"""AI provider factory.

`get_ai_provider()` returns the configured provider:
- Gemini when GEMINI_API_KEY is set (real AI, structured JSON output).
- The deterministic fallback otherwise, so development works without a key.
  Fallback output is explicitly marked `simulated` and the UI labels it as
  such — nothing is ever presented as real AI execution when it isn't.
"""

from functools import lru_cache

from app.core.config import settings
from app.services.ai.base import AIProvider, AIProviderError
from app.services.ai.fallback import FallbackProvider
from app.services.ai.gemini import GeminiProvider
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

__all__ = [
    "AGENT_IDS",
    "AIProvider",
    "AIProviderError",
    "AnalyticsResult",
    "CampaignVariant",
    "CompetitorRow",
    "ExecutionPlan",
    "ExecutionStage",
    "FallbackProvider",
    "FunnelStage",
    "GeminiProvider",
    "IllustrativeTarget",
    "KpiMetric",
    "MarketingResult",
    "PerformanceSignal",
    "PriorityAction",
    "ProspectingResult",
    "ResearchReport",
    "SalesResult",
    "ScoringFactor",
    "SourceRef",
    "TargetSegment",
    "get_ai_provider",
]


@lru_cache
def get_ai_provider() -> AIProvider:
    """Return the active AI provider for the current settings."""
    if settings.gemini_api_key:
        return GeminiProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
            timeout=settings.ai_timeout_seconds,
        )
    return FallbackProvider()
