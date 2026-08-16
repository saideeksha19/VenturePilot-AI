"""Google Gemini provider.

Calls the Gemini generateContent API with structured JSON output. The API key
comes from settings (env-driven, never hard-coded). Any failure — timeout,
HTTP error, malformed JSON — is converted to `AIProviderError` with a useful
message; raw provider internals are never exposed to the frontend.
"""

import json
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.services.ai.base import AIProvider, AIProviderError

_ModelT = TypeVar("_ModelT", bound=BaseModel)
from app.services.ai.models import (
    AnalyticsResult,
    ExecutionPlan,
    MarketingResult,
    ProspectingResult,
    ResearchReport,
    SalesResult,
)

_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Inline JSON schemas for Gemini's responseSchema (kept explicit and minimal;
# pydantic's own json-schema includes $defs that Gemini rejects).
_CEO_SCHEMA = {
    "type": "object",
    "properties": {
        "objective": {"type": "string"},
        "success_criteria": {"type": "array", "items": {"type": "string"}},
        "priority": {"type": "string"},
        "summary": {"type": "string"},
        "stages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "agent_id": {"type": "string"},
                    "title": {"type": "string"},
                    "task": {"type": "string"},
                    "purpose": {"type": "string"},
                    "depends_on": {"type": "array", "items": {"type": "string"}},
                    "expected_output": {"type": "string"},
                },
                "required": ["agent_id", "title", "task", "purpose", "depends_on", "expected_output"],
            },
        },
    },
    "required": ["objective", "success_criteria", "priority", "summary", "stages"],
}

_RESEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "research_question": {"type": "string"},
        "findings": {"type": "array", "items": {"type": "string"}},
        "competitors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "positioning": {"type": "string"},
                    "notes": {"type": "string"},
                },
            },
        },
        "market_observations": {"type": "array", "items": {"type": "string"}},
        "opportunities": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "sources": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "description": {"type": "string"},
                    "verified": {"type": "boolean"},
                },
            },
        },
        "confidence": {"type": "number"},
        "summary": {"type": "string"},
        "recommended_next_action": {"type": "string"},
    },
    "required": [
        "research_question",
        "findings",
        "competitors",
        "market_observations",
        "opportunities",
        "risks",
        "sources",
        "confidence",
        "summary",
        "recommended_next_action",
    ],
}

_PROSPECTING_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "ideal_customer_profile": {"type": "string"},
        "target_segments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "size_hint": {"type": "string"},
                },
                "required": ["name", "description"],
            },
        },
        "qualification_criteria": {"type": "array", "items": {"type": "string"}},
        "illustrative_targets": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "segment": {"type": "string"},
                    "profile": {"type": "string"},
                    "reason": {"type": "string"},
                    "illustrative": {"type": "boolean"},
                },
                "required": ["segment", "profile", "reason"],
            },
        },
        "scoring_factors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "factor": {"type": "string"},
                    "weight": {"type": "number"},
                },
            },
        },
        "priority_actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "rationale": {"type": "string"},
                },
            },
        },
        "estimated_opportunity_count": {"type": "integer"},
        "confidence": {"type": "number"},
    },
    "required": [
        "summary",
        "ideal_customer_profile",
        "target_segments",
        "qualification_criteria",
        "illustrative_targets",
        "scoring_factors",
        "priority_actions",
        "estimated_opportunity_count",
        "confidence",
    ],
}

_SALES_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "target_profile": {"type": "string"},
        "outreach_objective": {"type": "string"},
        "personalization_rationale": {"type": "string"},
        "recommended_channel": {"type": "string"},
        "subject_line": {"type": "string"},
        "outreach_message": {"type": "string"},
        "follow_up_message": {"type": "string"},
        "call_to_action": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": [
        "summary",
        "target_profile",
        "outreach_objective",
        "personalization_rationale",
        "recommended_channel",
        "subject_line",
        "outreach_message",
        "follow_up_message",
        "call_to_action",
        "confidence",
    ],
}

_MARKETING_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "campaign_objective": {"type": "string"},
        "target_audience": {"type": "string"},
        "positioning": {"type": "string"},
        "key_message": {"type": "string"},
        "campaign_angle": {"type": "string"},
        "recommended_channels": {"type": "array", "items": {"type": "string"}},
        "campaign_variants": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "variant_name": {"type": "string"},
                    "headline": {"type": "string"},
                    "supporting_copy": {"type": "string"},
                    "call_to_action": {"type": "string"},
                    "target_segment": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": [
                    "variant_name",
                    "headline",
                    "supporting_copy",
                    "call_to_action",
                    "target_segment",
                    "rationale",
                ],
            },
        },
        "call_to_action": {"type": "string"},
        "content_themes": {"type": "array", "items": {"type": "string"}},
        "success_metrics": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number"},
    },
    "required": [
        "summary",
        "campaign_objective",
        "target_audience",
        "positioning",
        "key_message",
        "campaign_angle",
        "recommended_channels",
        "campaign_variants",
        "call_to_action",
        "content_themes",
        "success_metrics",
        "confidence",
    ],
}

_ANALYTICS_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "kpis": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "value": {"type": "number"},
                    "unit": {"type": "string"},
                    "source": {"type": "string"},
                    "note": {"type": "string"},
                },
                "required": ["name"],
            },
        },
        "funnel": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "stage": {"type": "string"},
                    "count": {"type": "integer"},
                    "conversion_from_previous": {"type": "number"},
                    "source": {"type": "string"},
                },
                "required": ["stage", "count"],
            },
        },
        "overall_conversion_rate": {"type": "number"},
        "strongest_signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "signal": {"type": "string"},
                    "direction": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["signal"],
            },
        },
        "weak_signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "signal": {"type": "string"},
                    "direction": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["signal"],
            },
        },
        "risks": {"type": "array", "items": {"type": "string"}},
        "opportunities": {"type": "array", "items": {"type": "string"}},
        "recommended_actions": {"type": "array", "items": {"type": "string"}},
        "priority_actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "rationale": {"type": "string"},
                },
                "required": ["action"],
            },
        },
        "confidence": {"type": "number"},
    },
    "required": [
        "summary",
        "kpis",
        "funnel",
        "overall_conversion_rate",
        "strongest_signals",
        "weak_signals",
        "risks",
        "opportunities",
        "recommended_actions",
        "priority_actions",
        "confidence",
    ],
}

_ANALYTICS_SYSTEM = (
    "You are the Analytics agent inside VenturePilot. You model business-performance intelligence "
    "for a founder's objective using the persisted Research, Prospecting, Sales and Marketing results "
    "of the completed mission. External analytics are NOT connected: never claim real traffic, revenue, "
    "ad spend, customer counts, or production conversion data. Every KPI and funnel count must be an "
    "explicitly MODELED estimate derived from the upstream outputs, with source set to \"modeled\" "
    "(use \"persisted\" only for facts like the number of stages that executed). State clearly in the "
    "summary that no external analytics data was accessed. Return strict JSON matching the schema."
)

_MARKETING_SYSTEM = (
    "You are the Marketing agent inside VenturePilot. You draft campaign strategy and "
    "creative variants for a founder's objective using the persisted Research, Prospecting "
    "and Sales results. This is strategy generation only: never claim a campaign was sent, "
    "launched, A/B tested, or measured, and never fabricate performance numbers or external "
    "market statistics. Reuse the modeled segments and messaging from the upstream results. "
    "Return strict JSON matching the schema."
)

_SALES_SYSTEM = (
    "You are the Sales agent inside VenturePilot. You write personalized outreach for a "
    "founder's objective using the business context and the Prospecting agent's qualified "
    "pipeline. External contact databases are NOT connected: never fabricate real companies, "
    "people, names, emails, phone numbers, or verified accounts. Every target profile you "
    "write for must be the modeled illustrative profile provided by Prospecting, clearly "
    "treated as such. Return strict JSON matching the schema."
)

_PROSPECTING_SYSTEM = (
    "You are the Prospecting agent inside VenturePilot. You qualify accounts for a founder's "
    "objective using the business context and the Research agent's analysis. External lead "
    "databases are NOT connected: never fabricate real companies, people, emails, phone "
    "numbers, LinkedIn profiles, or verified leads. All account examples must be modeled "
    "profiles explicitly labeled as illustrative. Return strict JSON matching the schema."
)

_CEO_SYSTEM = (
    "You are the CEO agent inside VenturePilot, an autonomous AI operating system for founders. "
    "A founder gives you a high-level business objective. You decide which of the six specialized "
    "agents (ceo, research, prospecting, sales, marketing, analytics) are genuinely necessary for "
    "this objective and produce a structured execution plan — you do not blindly include all six. "
    "Every stage must name one agent, a concrete task, why it matters, its dependencies, and its "
    "expected output. Return strict JSON matching the schema."
)

_RESEARCH_SYSTEM = (
    "You are the Research agent inside VenturePilot. You analyze a research question using the "
    "provided business context. External web research is not yet connected: reason from the given "
    "context and say so — never fabricate citations, sources, or competitor data. Mark "
    "analysis_basis as \"ai_analysis\" and evidence_verified false unless real verified evidence "
    "was provided. Return strict JSON matching the schema."
)


class GeminiProvider:
    """Real AI provider backed by Google Gemini."""

    name = "gemini"
    simulated = False

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash", timeout: int = 30) -> None:
        self._key = api_key
        self._model = model
        self._timeout = timeout

    # -- internals -------------------------------------------------------

    def _generate_json(self, *, system: str, prompt: str, schema: dict) -> dict:
        body = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "temperature": 0.3,
            },
        }
        try:
            with httpx.Client(timeout=self._timeout) as client:
                response = client.post(
                    _GENERATE_URL.format(model=self._model),
                    params={"key": self._key},
                    json=body,
                )
        except httpx.TimeoutException:
            raise AIProviderError("The AI provider timed out. Please try again.") from None
        except httpx.HTTPError as exc:  # pragma: no cover - network edge
            raise AIProviderError(f"The AI provider is unreachable ({exc.__class__.__name__}).") from None

        if response.status_code != 200:
            detail = "unknown error"
            try:
                detail = response.json().get("error", {}).get("message", "unknown error")
            except ValueError:
                pass
            raise AIProviderError(
                f"The AI provider returned HTTP {response.status_code}: {detail}"
            )

        try:
            payload = response.json()
            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise AIProviderError("The AI provider returned an invalid response.") from None

    @staticmethod
    def _business_block(business: dict) -> str:
        return "\n".join(
            f"- {key}: {value}"
            for key, value in business.items()
            if value not in (None, "")
        )

    @staticmethod
    def _parse(model: type[_ModelT], raw: dict) -> _ModelT:
        """Validate provider JSON into the structured model.

        A malformed-but-valid-JSON response raises pydantic's ValidationError;
        converting it to AIProviderError means the orchestration layer records
        a truthful task failure instead of crashing with an unhandled 500.
        """
        try:
            return model.model_validate(raw)
        except ValidationError as exc:
            first = exc.errors()[0] if exc.errors() else {}
            raise AIProviderError(
                "The AI provider returned invalid structured output: "
                f"{first.get('msg', 'schema mismatch')}"
            ) from None

    # -- CEO --------------------------------------------------------------

    def plan_goal(self, *, objective: str, business: dict) -> ExecutionPlan:
        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Founder objective: {objective}\n\n"
            "Produce the execution plan."
        )
        raw = self._generate_json(system=_CEO_SYSTEM, prompt=prompt, schema=_CEO_SCHEMA)
        plan = self._parse(ExecutionPlan, raw)
        # The provider is real; keep the honest flag at its default (False).
        return plan.model_copy(update={"objective": objective, "simulated": False})

    # -- Research -----------------------------------------------------------

    def research(self, *, question: str, objective: str, business: dict) -> ResearchReport:
        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Active objective: {objective}\n\n"
            f"Research question: {question}\n\n"
            "Produce the research report."
        )
        raw = self._generate_json(system=_RESEARCH_SYSTEM, prompt=prompt, schema=_RESEARCH_SCHEMA)
        report = self._parse(ResearchReport, raw)
        return report.model_copy(
            update={
                "research_question": question,
                "analysis_basis": "ai_analysis",
                "evidence_verified": False,
                "simulated": False,
            }
        )

    # -- Prospecting -------------------------------------------------------

    def prospect(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
    ) -> ProspectingResult:
        research_block = "\n".join(
            f"- {k}: {v}" for k, v in (research or {}).items() if v not in (None, "")
        ) or "- none provided"
        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Active objective: {objective}\n\n"
            f"Research agent analysis:\n{research_block}\n\n"
            "Produce the prospecting intelligence."
        )
        raw = self._generate_json(
            system=_PROSPECTING_SYSTEM, prompt=prompt, schema=_PROSPECTING_SCHEMA
        )
        result = self._parse(ProspectingResult, raw)
        # Never present generated profiles as verified leads.
        return result.model_copy(
            update={
                "evidence_verified": False,
                "simulated": False,
                "illustrative_targets": [
                    t.model_copy(update={"illustrative": True}) for t in result.illustrative_targets
                ],
            }
        )

    # -- Sales ---------------------------------------------------------------

    def sales(
        self,
        *,
        business: dict,
        objective: str,
        prospecting: dict | None,
    ) -> SalesResult:
        prospecting_block = "\n".join(
            f"- {k}: {v}" for k, v in (prospecting or {}).items() if v not in (None, "")
        ) or "- none provided"
        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Active objective: {objective}\n\n"
            f"Prospecting agent pipeline:\n{prospecting_block}\n\n"
            "Produce the personalized outreach."
        )
        raw = self._generate_json(system=_SALES_SYSTEM, prompt=prompt, schema=_SALES_SCHEMA)
        result = self._parse(SalesResult, raw)
        # Outreach is written for modeled profiles — never presented as verified.
        return result.model_copy(
            update={
                "outreach_objective": objective,
                "evidence_verified": False,
                "simulated": False,
            }
        )

    # -- Marketing ------------------------------------------------------------

    # -- Analytics ------------------------------------------------------------

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
        def _block(label: str, data: dict | None) -> str:
            if not data:
                return f"- {label}: none provided"
            return "\n".join(
                f"- {label} / {k}: {v}" for k, v in data.items() if v not in (None, "")
            )

        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Active objective: {objective}\n\n"
            f"Research agent analysis:\n{_block('research', research)}\n\n"
            f"Prospecting agent pipeline:\n{_block('prospecting', prospecting)}\n\n"
            f"Sales agent outreach:\n{_block('sales', sales)}\n\n"
            f"Marketing agent campaign:\n{_block('marketing', marketing)}\n\n"
            "Produce the performance intelligence."
        )
        raw = self._generate_json(
            system=_ANALYTICS_SYSTEM, prompt=prompt, schema=_ANALYTICS_SCHEMA
        )
        result = self._parse(AnalyticsResult, raw)
        # Intelligence is modeled from the mission — never presented as real
        # production measurements.
        return result.model_copy(
            update={
                "data_basis": "modeled",
                "evidence_verified": False,
                "simulated": False,
            }
        )

    def marketing(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
    ) -> MarketingResult:
        def _block(label: str, data: dict | None) -> str:
            if not data:
                return f"- {label}: none provided"
            return "\n".join(
                f"- {label} / {k}: {v}" for k, v in data.items() if v not in (None, "")
            )

        prompt = (
            f"Business context:\n{self._business_block(business)}\n\n"
            f"Active objective: {objective}\n\n"
            f"Research agent analysis:\n{_block('research', research)}\n\n"
            f"Prospecting agent pipeline:\n{_block('prospecting', prospecting)}\n\n"
            f"Sales agent outreach:\n{_block('sales', sales)}\n\n"
            "Produce the campaign strategy and creative variants."
        )
        raw = self._generate_json(
            system=_MARKETING_SYSTEM, prompt=prompt, schema=_MARKETING_SCHEMA
        )
        result = self._parse(MarketingResult, raw)
        # Strategy is generated — never presented as executed campaign activity.
        return result.model_copy(
            update={
                "campaign_objective": objective,
                "evidence_verified": False,
                "simulated": False,
            }
        )
