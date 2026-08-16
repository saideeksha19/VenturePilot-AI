"""Goals / orchestration API tests.

These run against an in-memory SQLite database and the deterministic fallback
AI provider, so they work on any machine without PostgreSQL or an API key.
"""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.routes import goals as goals_routes
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.ai.base import AIProviderError
from app.services.ai.fallback import FallbackProvider
from app.services.ai.models import (
    AnalyticsResult,
    ExecutionPlan,
    ExecutionStage,
    MarketingResult,
    ProspectingResult,
    ResearchReport,
    SalesResult,
)

VALID_BUSINESS = {
    "name": "Northwind Labs",
    "industry": "B2B SaaS",
    "size": "11-50",
    "description": "AI-native operations for B2B founders.",
    "goals": "Generate 50 qualified B2B opportunities this quarter.",
}

OBJECTIVE = "Generate 50 qualified B2B opportunities for my company."


class FailingProvider(FallbackProvider):
    """Provider that always fails, for failure-path tests."""

    name = "failing"

    def plan_goal(self, *, objective: str, business: dict) -> ExecutionPlan:
        raise AIProviderError("provider down")

    def research(self, *, question: str, objective: str, business: dict) -> ResearchReport:
        raise AIProviderError("provider down")

    def prospect(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
    ) -> ProspectingResult:
        raise AIProviderError("provider down")

    def sales(
        self,
        *,
        business: dict,
        objective: str,
        prospecting: dict | None,
    ) -> SalesResult:
        raise AIProviderError("provider down")

    def marketing(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
    ) -> MarketingResult:
        raise AIProviderError("provider down")


class ProspectingFailingProvider(FallbackProvider):
    """Provider that succeeds on planning/research but fails on prospecting."""

    name = "prospecting-failing"

    def prospect(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
    ) -> ProspectingResult:
        raise AIProviderError("prospecting provider down")


class SalesFailingProvider(FallbackProvider):
    """Provider that succeeds upstream but fails on the Sales step."""

    name = "sales-failing"

    def sales(
        self,
        *,
        business: dict,
        objective: str,
        prospecting: dict | None,
    ) -> SalesResult:
        raise AIProviderError("sales provider down")


class MarketingFailingProvider(FallbackProvider):
    """Provider that succeeds upstream but fails on the Marketing step."""

    name = "marketing-failing"

    def marketing(
        self,
        *,
        business: dict,
        objective: str,
        research: dict | None,
        prospecting: dict | None,
        sales: dict | None,
    ) -> MarketingResult:
        raise AIProviderError("marketing provider down")


class MalformedProvider(FallbackProvider):
    """Provider that raises a schema ValidationError (malformed output).

    Simulates a provider returning structured JSON that fails validation — the
    pipeline must record a truthful failure, never crash with a 500.
    """

    name = "malformed"

    def research(self, *, question: str, objective: str, business: dict) -> ResearchReport:
        raise ValidationError.from_exception_data("ResearchReport", [])


class AnalyticsFailingProvider(FallbackProvider):
    """Provider that succeeds on every stage but fails on Analytics."""

    name = "analytics-failing"

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
        raise AIProviderError("analytics provider down")


class ExtraStageProvider(FallbackProvider):
    """Fallback whose CEO plan includes a stage for an unregistered agent.

    Lets the truthfulness tests exercise the unavailable path even though all
    six real agents now have executors: the extra stage has no executor, so it
    must be marked unavailable and never count toward completion.
    """

    name = "extra-stage"

    def plan_goal(self, *, objective: str, business: dict) -> ExecutionPlan:
        plan = super().plan_goal(objective=objective, business=business)
        plan.stages.append(
            ExecutionStage(
                agent_id="ops",
                title="Manual ops handoff",
                task="Hand off the mission to a human operator.",
                purpose="No automated executor exists for this stage.",
                depends_on=[s.agent_id for s in plan.stages],
                expected_output="A manual handoff record.",
            )
        )
        return plan


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """TestClient over a fresh SQLite DB using the fallback AI provider."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_get_db():
        db = Session(bind=engine)
        try:
            yield db
        finally:
            db.close()

    monkeypatch.setattr(goals_routes, "get_ai_provider", lambda: FallbackProvider())
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def business_id(client: TestClient) -> str:
    return client.post("/api/businesses", json=VALID_BUSINESS).json()["id"]


def _create_goal(client: TestClient, objective: str = OBJECTIVE):
    response = client.post("/api/goals", json={"objective": objective})
    assert response.status_code == 201, response.text
    return response.json()


def test_create_goal_produces_ceo_plan(business_id: str, client: TestClient) -> None:
    goal = _create_goal(client)

    assert goal["objective"] == OBJECTIVE
    assert goal["status"] == "created"
    assert goal["progress"] == 0
    assert goal["priority"] in ("high", "medium", "low")
    assert goal["plan_summary"]
    assert goal["success_criteria"]
    # The CEO decides which agents are necessary — the plan must contain at
    # least the orchestration core (CEO + Research + Analytics).
    agents = [t["agent_id"] for t in goal["tasks"]]
    assert "ceo" in agents and "research" in agents and "analytics" in agents
    # Pipeline objectives should also include prospecting/sales.
    assert "prospecting" in agents and "sales" in agents
    assert all(t["status"] == "queued" for t in goal["tasks"])


def test_goal_retrieval(business_id: str, client: TestClient) -> None:
    goal = _create_goal(client)

    listed = client.get("/api/goals").json()
    assert len(listed) == 1
    assert listed[0]["id"] == goal["id"]

    fetched = client.get(f"/api/goals/{goal['id']}").json()
    assert fetched["objective"] == OBJECTIVE
    assert len(fetched["tasks"]) == len(goal["tasks"])


def test_execute_goal_completes_all_stages(
    business_id: str, client: TestClient
) -> None:
    """Every planned stage executes with structured output and the goal completes."""
    goal = _create_goal(client)

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "completed"
    assert executed["progress"] == 100
    assert executed["completed_at"] is not None  # genuinely fully complete

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    # Real executors run and complete with structured output.
    assert by_agent["ceo"]["status"] == "completed"
    assert by_agent["ceo"]["result"]["summary"]  # the plan brief
    research = by_agent["research"]
    assert research["status"] == "completed"
    assert research["result"]["research_question"]
    assert research["result"]["summary"]
    assert research["result"]["evidence_verified"] is False
    assert research["result"]["simulated"] is True  # fallback provider
    assert research["started_at"] and research["completed_at"]
    prospecting = by_agent["prospecting"]
    assert prospecting["status"] == "completed"
    assert prospecting["progress"] == 100
    assert prospecting["result"]["summary"]
    sales = by_agent["sales"]
    assert sales["status"] == "completed"
    assert sales["progress"] == 100
    assert sales["result"]["outreach_message"]
    assert sales["result"]["subject_line"]
    assert sales["started_at"] and sales["completed_at"]
    # Analytics is now a real executor: it completes with structured output.
    analytics = by_agent["analytics"]
    assert analytics["status"] == "completed"
    assert analytics["progress"] == 100
    assert analytics["result"]["summary"]


def test_no_false_100_when_stage_unavailable(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Progress equals completed/total — never 100 when a stage is unavailable."""
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: ExtraStageProvider()
    )
    goal = _create_goal(client)  # plan includes an executor-less "ops" stage
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    completed = sum(1 for t in executed["tasks"] if t["status"] == "completed")
    total = len(executed["tasks"])
    assert completed < total
    assert executed["progress"] == round((completed / total) * 100)
    assert executed["progress"] != 100
    assert executed["status"] == "partially_completed"
    assert executed["status"] != "completed"


def test_created_goal_is_pending(business_id: str, client: TestClient) -> None:
    """A created (not yet executed) goal reports pending state, not progress."""
    goal = _create_goal(client)

    assert goal["status"] == "created"
    assert goal["progress"] == 0
    assert all(t["status"] == "queued" for t in goal["tasks"])


def test_execution_records_activity(business_id: str, client: TestClient) -> None:
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    activity = client.get("/api/activity").json()
    actions = {f"{a['agent_id']}:{a['action']}:{a['status']}" for a in activity}
    assert "ceo:Objective created:completed" in actions
    # Truthful completion: all stages executed, so the mission IS completed.
    assert "ceo:Objective completed:completed" in actions
    assert "ceo:Mission partially executed:partial" not in actions
    assert any(a["agent_id"] == "research" and a["status"] == "completed" for a in activity)
    assert any(a["agent_id"] == "prospecting" and a["status"] == "completed" for a in activity)
    assert any(a["agent_id"] == "sales" and a["status"] == "completed" for a in activity)
    # Marketing is only in the plan for campaign objectives; Analytics is in
    # every plan and its completion is asserted below.
    assert any(a["agent_id"] == "analytics" and a["status"] == "completed" for a in activity)
    assert any(a["goal_id"] == goal["id"] for a in activity)


def test_agents_reflect_task_state(business_id: str, client: TestClient) -> None:
    _create_goal(client)

    roster = {a["id"]: a for a in client.get("/api/agents").json()}
    assert set(roster) == {"ceo", "research", "prospecting", "sales", "marketing", "analytics"}
    # Queued tasks keep the default status until execution.
    assert roster["research"]["task"]

    detail = client.get("/api/agents/research").json()
    assert detail["mission"]
    assert detail["current_task"]
    assert detail["status"] in {"Working", "Active", "Coordinating", "Idle", "Blocked"}


def test_agent_detail_shows_result_after_execution(business_id: str, client: TestClient) -> None:
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    detail = client.get("/api/agents/research").json()
    assert detail["status"] == "Active"
    assert detail["result"]["summary"]
    assert detail["confidence"] is not None
    assert detail["evidence_verified"] is False
    assert detail["recent_actions"]
    assert detail["last_sync"]


def test_unknown_goal_returns_404(business_id: str, client: TestClient) -> None:
    import uuid

    assert client.get(f"/api/goals/{uuid.uuid4()}").status_code == 404
    assert client.post(f"/api/goals/{uuid.uuid4()}/execute").status_code == 404
    assert client.get(f"/api/goals/{uuid.uuid4()}/tasks").status_code == 404


def test_invalid_goal_input(client: TestClient) -> None:
    client.post("/api/businesses", json=VALID_BUSINESS)

    assert client.post("/api/goals", json={"objective": ""}).status_code == 422
    assert client.post("/api/goals", json={"objective": "x" * 501}).status_code == 422
    assert client.post("/api/goals", json={"objective": "Run", "hacked": True}).status_code == 422
    assert client.post("/api/goals", json={}).status_code == 422


def test_goal_requires_business(client: TestClient) -> None:
    assert client.post("/api/goals", json={"objective": OBJECTIVE}).status_code == 404
    assert client.get("/api/goals").status_code == 404
    assert client.get("/api/activity").status_code == 404


def test_goal_persists_across_requests(business_id: str, client: TestClient) -> None:
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    # A fresh request hits a fresh session on the same database.
    fetched = client.get(f"/api/goals/{goal['id']}").json()
    assert fetched["status"] == "completed"
    assert fetched["progress"] == 100
    assert fetched["tasks"][0]["goal_id"] == goal["id"]


def test_failed_ai_execution_marks_goal_failed(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    goal = _create_goal(client)  # created with the working fallback
    monkeypatch.setattr(goals_routes, "get_ai_provider", lambda: FailingProvider())

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    research = next(t for t in executed["tasks"] if t["agent_id"] == "research")
    assert research["status"] == "failed"
    assert "provider down" in research["error"]
    # The failure is recorded in the activity stream, not hidden.
    activity = client.get("/api/activity").json()
    assert any(a["status"] == "failed" and a["agent_id"] == "research" for a in activity)


def test_failed_ceo_plan_returns_503(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    client.post("/api/businesses", json=VALID_BUSINESS)
    monkeypatch.setattr(goals_routes, "get_ai_provider", lambda: FailingProvider())

    response = client.post("/api/goals", json={"objective": OBJECTIVE})

    assert response.status_code == 503
    assert "AI provider" in response.json()["detail"]


def test_execute_is_idempotent(business_id: str, client: TestClient) -> None:
    """Re-execution never re-runs or mutates a terminal mission."""
    goal = _create_goal(client)
    first = client.post(f"/api/goals/{goal['id']}/execute").json()
    second = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert first["status"] == "completed"
    assert second["status"] == "completed"
    assert second["progress"] == first["progress"] == 100
    assert second["completed_at"] == first["completed_at"]
    assert len(second["tasks"]) == len(first["tasks"])


def test_provider_unavailable_never_produces_fake_success(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A provider failure marks the goal failed — never completed."""
    goal = _create_goal(client)
    monkeypatch.setattr(goals_routes, "get_ai_provider", lambda: FailingProvider())

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    assert executed["progress"] != 100
    assert executed["completed_at"] is None


def test_sales_executes_when_prospecting_succeeds(
    business_id: str, client: TestClient
) -> None:
    """Sales runs after Prospecting and produces structured outreach."""
    goal = _create_goal(client)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    task = next(t for t in executed["tasks"] if t["agent_id"] == "sales")
    assert task["status"] == "completed"
    assert task["progress"] == 100
    assert task["started_at"] and task["completed_at"]
    result = task["result"]
    assert result["summary"]
    assert result["target_profile"]
    assert result["outreach_objective"] == OBJECTIVE
    assert result["personalization_rationale"]
    assert result["recommended_channel"]
    assert result["subject_line"]
    assert result["outreach_message"]
    assert result["follow_up_message"]
    assert result["call_to_action"]
    assert 0 <= result["confidence"] <= 1


def test_sales_consumes_prospecting_result(
    business_id: str, client: TestClient
) -> None:
    """The outreach is derived from the persisted Prospecting segments/targets."""
    goal = _create_goal(client)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    prospecting = by_agent["prospecting"]["result"]
    sales = by_agent["sales"]["result"]

    # The sales task ordering/dependency follows Prospecting.
    assert by_agent["sales"]["order_index"] > by_agent["prospecting"]["order_index"]
    assert "prospecting" in (by_agent["sales"]["depends_on"] or [])

    # Outreach explicitly references the Prospecting-modeled segment profile.
    first_target = prospecting["illustrative_targets"][0]
    assert first_target["segment"] in sales["personalization_rationale"]
    assert first_target["profile"].lower() in sales["target_profile"].lower() or sales["target_profile"]
    # Never fabricated: sales flags stay honest.
    assert sales["evidence_verified"] is False
    assert sales["simulated"] is True


def test_sales_result_persists_across_requests(
    business_id: str, client: TestClient
) -> None:
    """The Sales result survives a fresh request on the same database."""
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    fetched = client.get(f"/api/goals/{goal['id']}").json()
    task = next(t for t in fetched["tasks"] if t["agent_id"] == "sales")
    assert task["status"] == "completed"
    assert task["result"]["outreach_message"]
    assert task["result"]["subject_line"]


def test_sales_failure_marks_goal_failed(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A Sales provider failure fails the task — never fake completion."""
    goal = _create_goal(client)
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: SalesFailingProvider()
    )

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    task = next(t for t in executed["tasks"] if t["agent_id"] == "sales")
    assert task["status"] == "failed"
    assert "sales provider down" in task["error"]
    assert task["result"] is None
    # Upstream stages genuinely completed before the failure.
    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    assert by_agent["ceo"]["status"] == "completed"
    assert by_agent["research"]["status"] == "completed"
    assert by_agent["prospecting"]["status"] == "completed"
    # The failure is visible in the activity stream.
    activity = client.get("/api/activity").json()
    assert any(a["agent_id"] == "sales" and a["status"] == "failed" for a in activity)


def test_partial_mission_when_stage_unavailable(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A stage without an executor keeps the mission partial — never 100%."""
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: ExtraStageProvider()
    )
    goal = _create_goal(client)  # plan includes an executor-less "ops" stage
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "partially_completed"
    assert executed["progress"] < 100
    assert executed["completed_at"] is None
    statuses = [t["status"] for t in executed["tasks"]]
    assert statuses.count("completed") == len(executed["tasks"]) - 1
    assert statuses.count("unavailable") == 1
    assert executed["status"] != "completed"


def test_unavailable_stages_remain_unavailable(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """An executor-less stage stays unavailable — never completed or deferred."""
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: ExtraStageProvider()
    )
    goal = _create_goal(client)  # plan includes an executor-less "ops" stage
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    ops = next(t for t in executed["tasks"] if t["agent_id"] == "ops")
    assert ops["status"] == "unavailable"
    assert ops["progress"] == 0
    assert ops["result"] is None
    assert "No executor is registered" in ops["output"]


def test_prospecting_executes_with_structured_result(
    business_id: str, client: TestClient
) -> None:
    """Prospecting persists structured pipeline intelligence with honest provenance."""
    goal = _create_goal(client)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    task = next(t for t in executed["tasks"] if t["agent_id"] == "prospecting")
    assert task["status"] == "completed"
    assert task["completed_at"]
    result = task["result"]
    assert result["summary"]
    assert result["ideal_customer_profile"]
    assert len(result["target_segments"]) >= 2
    assert result["qualification_criteria"]
    assert result["scoring_factors"]
    assert result["priority_actions"]
    assert isinstance(result["estimated_opportunity_count"], int)
    assert 0 <= result["confidence"] <= 1


def test_prospecting_never_fabricates_verified_leads(
    business_id: str, client: TestClient
) -> None:
    """All modeled accounts are labeled illustrative — never real verified leads."""
    goal = _create_goal(client)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    task = next(t for t in executed["tasks"] if t["agent_id"] == "prospecting")
    result = task["result"]
    assert result["evidence_verified"] is False
    assert result["simulated"] is True  # deterministic fallback, explicitly labeled
    assert result["illustrative_targets"]
    for target in result["illustrative_targets"]:
        assert target["illustrative"] is True
    # No fabricated contact fields anywhere in the result.
    assert all(
        "email" not in key.lower() and "linkedin" not in key.lower()
        for key in result
    )


def test_prospecting_persists_across_requests(
    business_id: str, client: TestClient
) -> None:
    """The Prospecting result survives a fresh request on the same database."""
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    fetched = client.get(f"/api/goals/{goal['id']}").json()
    task = next(t for t in fetched["tasks"] if t["agent_id"] == "prospecting")
    assert task["status"] == "completed"
    assert task["result"]["summary"]
    assert task["result"]["target_segments"]


def test_prospecting_activity_events(business_id: str, client: TestClient) -> None:
    """Prospecting records running + completed activity events."""
    goal = _create_goal(client)
    client.post(f"/api/goals/{goal['id']}/execute")

    activity = client.get("/api/activity").json()
    prospecting = [a for a in activity if a["agent_id"] == "prospecting"]
    assert any(a["status"] == "running" for a in prospecting)
    completed = [a for a in prospecting if a["status"] == "completed"]
    assert len(completed) == 1
    # The summary describes modeled segments, not claimed verified leads.
    assert "illustrative" in completed[0]["summary"] or "modeled" in completed[0]["summary"]


def test_prospecting_provider_failure_marks_goal_failed(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A Prospecting provider failure fails the task — never fake completion."""
    goal = _create_goal(client)
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: ProspectingFailingProvider()
    )

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    task = next(t for t in executed["tasks"] if t["agent_id"] == "prospecting")
    assert task["status"] == "failed"
    assert "prospecting provider down" in task["error"]
    assert task["result"] is None
    assert task["progress"] == 0
    # Sales must NOT run without a valid Prospecting result.
    sales = next(t for t in executed["tasks"] if t["agent_id"] == "sales")
    assert sales["status"] == "queued"
    assert sales["result"] is None
    # The failure is visible in the activity stream.
    activity = client.get("/api/activity").json()
    assert any(
        a["agent_id"] == "prospecting" and a["status"] == "failed" for a in activity
    )


def test_mission_includes_prospecting_after_research(
    business_id: str, client: TestClient
) -> None:
    """Prospecting is sequenced after Research and depends on its output."""
    goal = _create_goal(client)

    tasks = sorted(goal["tasks"], key=lambda t: t["order_index"])
    prospecting = next(t for t in tasks if t["agent_id"] == "prospecting")
    research = next(t for t in tasks if t["agent_id"] == "research")

    assert prospecting["order_index"] > research["order_index"]
    assert "research" in (prospecting["depends_on"] or [])


def test_prospecting_completion_increases_mission_progress(
    business_id: str, client: TestClient
) -> None:
    """Progress truthfully reflects every completed stage of the pipeline."""
    goal = _create_goal(client)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    completed = [
        a for a, t in by_agent.items() if t["status"] == "completed"
    ]
    # All planned stages (CEO, Research, Prospecting, Sales, Analytics)
    # execute and complete — the pipeline objective is fully done.
    assert set(completed) == {"ceo", "research", "prospecting", "sales", "analytics"}
    assert by_agent["analytics"]["status"] == "completed"

    total = len(executed["tasks"])
    assert executed["progress"] == round((len(completed) / total) * 100)
    assert executed["progress"] == 100
    assert executed["status"] == "completed"


CAMPAIGN_OBJECTIVE = "Launch a campaign to generate 50 qualified B2B opportunities"
PRICING_OBJECTIVE = "Launch the new pricing page"


def test_marketing_executes_after_sales(business_id: str, client: TestClient) -> None:
    """Marketing runs after Sales and consumes its persisted output."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    sales = by_agent["sales"]
    marketing = by_agent["marketing"]
    assert marketing["status"] == "completed"
    assert marketing["progress"] == 100
    assert marketing["started_at"] and marketing["completed_at"]
    # Sequenced after Sales and depends on it.
    assert marketing["order_index"] > sales["order_index"]
    assert "sales" in (marketing["depends_on"] or [])
    assert "prospecting" in (marketing["depends_on"] or [])


def test_marketing_consumes_persisted_outputs(business_id: str, client: TestClient) -> None:
    """The campaign references the Prospecting/Sales modeled segment."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    marketing = by_agent["marketing"]["result"]
    assert marketing["campaign_objective"] == CAMPAIGN_OBJECTIVE
    # Derived from the persisted upstream segment, not invented.
    assert "Mid-market operators" in marketing["target_audience"]
    assert marketing["evidence_verified"] is False
    assert marketing["simulated"] is True
    # Explicitly states the campaign was NOT executed — never claims it was.
    assert "no campaign was sent" in marketing["summary"].lower()


def test_marketing_result_is_structured(business_id: str, client: TestClient) -> None:
    """Campaign variants are structured objects, not one text blob."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    marketing = next(
        t for t in executed["tasks"] if t["agent_id"] == "marketing"
    )["result"]
    assert marketing["positioning"]
    assert marketing["key_message"]
    assert marketing["campaign_angle"]
    assert marketing["recommended_channels"]
    assert marketing["call_to_action"]
    assert marketing["content_themes"]
    assert marketing["success_metrics"]
    assert len(marketing["campaign_variants"]) >= 2
    for variant in marketing["campaign_variants"]:
        assert variant["variant_name"]
        assert variant["headline"]
        assert variant["supporting_copy"]
        assert variant["call_to_action"]
        assert variant["target_segment"]
        assert variant["rationale"]
    assert 0 <= marketing["confidence"] <= 1


def test_marketing_result_persists_across_requests(
    business_id: str, client: TestClient
) -> None:
    """The Marketing result survives a fresh request on the same database."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    client.post(f"/api/goals/{goal['id']}/execute")

    fetched = client.get(f"/api/goals/{goal['id']}").json()
    task = next(t for t in fetched["tasks"] if t["agent_id"] == "marketing")
    assert task["status"] == "completed"
    assert task["result"]["campaign_variants"]
    assert task["result"]["key_message"]


def test_marketing_failure_is_truthful(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A Marketing provider failure fails the task — never fake success."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: MarketingFailingProvider()
    )

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    task = next(t for t in executed["tasks"] if t["agent_id"] == "marketing")
    assert task["status"] == "failed"
    assert "marketing provider down" in task["error"]
    assert task["result"] is None
    # Upstream stages genuinely completed before the failure.
    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    for agent in ("ceo", "research", "prospecting", "sales"):
        assert by_agent[agent]["status"] == "completed"
    # The failure is visible in the activity stream.
    activity = client.get("/api/activity").json()
    assert any(
        a["agent_id"] == "marketing" and a["status"] == "failed" for a in activity
    )


def test_pricing_mission_completes_with_marketing_and_analytics(
    business_id: str, client: TestClient
) -> None:
    """Pricing-launch mission: CEO + Research + Marketing + Analytics complete.

    Marketing runs on the plan without Prospecting/Sales (its dependency list
    only references stages the CEO actually included). All four stages
    complete -> 100%, and re-execution is idempotent.
    """
    goal = _create_goal(client, PRICING_OBJECTIVE)
    agents = [t["agent_id"] for t in goal["tasks"]]
    assert set(agents) == {"ceo", "research", "marketing", "analytics"}

    first = client.post(f"/api/goals/{goal['id']}/execute").json()
    second = client.post(f"/api/goals/{goal['id']}/execute").json()

    for executed in (first, second):
        assert executed["status"] == "completed"
        assert executed["progress"] == 100
        assert executed["completed_at"] is not None
        by_agent = {t["agent_id"]: t for t in executed["tasks"]}
        assert by_agent["marketing"]["status"] == "completed"
        assert by_agent["analytics"]["status"] == "completed"


# ---------------------------------------------------------------------------
# M6 — Analytics executor
# ---------------------------------------------------------------------------


def test_analytics_executes_after_marketing(business_id: str, client: TestClient) -> None:
    """Analytics runs last, after Marketing, and consumes its persisted output."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    analytics = by_agent["analytics"]
    marketing = by_agent["marketing"]
    assert analytics["status"] == "completed"
    assert analytics["progress"] == 100
    assert analytics["started_at"] and analytics["completed_at"]
    # Sequenced after Marketing and depends on the full pipeline.
    assert analytics["order_index"] > marketing["order_index"]
    assert "marketing" in (analytics["depends_on"] or [])


def test_six_stage_mission_reaches_100_percent(
    business_id: str, client: TestClient
) -> None:
    """CEO + Research + Prospecting + Sales + Marketing + Analytics -> 100%."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    agents = [t["agent_id"] for t in goal["tasks"]]
    assert set(agents) == {
        "ceo", "research", "prospecting", "sales", "marketing", "analytics"
    }

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "completed"
    assert executed["progress"] == 100
    assert executed["completed_at"] is not None
    statuses = {t["agent_id"]: t["status"] for t in executed["tasks"]}
    assert all(s == "completed" for s in statuses.values())
    # The full-completion activity event is recorded; no partial message.
    activity = client.get("/api/activity").json()
    actions = {f"{a['agent_id']}:{a['action']}:{a['status']}" for a in activity}
    assert "ceo:Objective completed:completed" in actions
    assert "ceo:Mission partially executed:partial" not in actions


def test_analytics_result_is_structured(business_id: str, client: TestClient) -> None:
    """Analytics persists structured performance intelligence."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    task = next(t for t in executed["tasks"] if t["agent_id"] == "analytics")
    result = task["result"]
    assert result["summary"]
    assert result["kpis"]
    assert result["funnel"]
    assert 0 <= result["overall_conversion_rate"] <= 1
    assert result["strongest_signals"]
    assert result["weak_signals"]
    assert result["risks"]
    assert result["opportunities"]
    assert result["recommended_actions"]
    assert result["priority_actions"]
    assert 0 <= result["confidence"] <= 1


def test_analytics_derives_from_persisted_upstream(
    business_id: str, client: TestClient
) -> None:
    """The modeled funnel derives from the persisted Prospecting estimate."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    prospecting = by_agent["prospecting"]["result"]
    analytics = by_agent["analytics"]["result"]
    pool = prospecting["estimated_opportunity_count"]

    kpi = next(k for k in analytics["kpis"] if k["name"] == "Modeled opportunity pool")
    assert kpi["value"] == float(pool)
    assert kpi["source"] == "modeled"
    # The funnel's first stage is the same modeled pipeline.
    assert analytics["funnel"][0]["count"] == pool
    assert analytics["funnel"][0]["source"] == "modeled"


def test_analytics_result_persists_across_requests(
    business_id: str, client: TestClient
) -> None:
    """The Analytics result survives a fresh request on the same database."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    client.post(f"/api/goals/{goal['id']}/execute")

    fetched = client.get(f"/api/goals/{goal['id']}").json()
    task = next(t for t in fetched["tasks"] if t["agent_id"] == "analytics")
    assert task["status"] == "completed"
    assert task["result"]["summary"]
    assert task["result"]["funnel"]


def test_analytics_is_modeled_not_verified(
    business_id: str, client: TestClient
) -> None:
    """Modeled analytics are labeled simulated and never claim external data."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    task = next(t for t in executed["tasks"] if t["agent_id"] == "analytics")
    result = task["result"]
    assert result["simulated"] is True  # deterministic fallback, labeled
    assert result["evidence_verified"] is False
    assert result["data_basis"] == "modeled"
    assert "no external analytics" in result["summary"].lower()


def test_analytics_activity_events(business_id: str, client: TestClient) -> None:
    """Analytics records running + completed activity events."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    client.post(f"/api/goals/{goal['id']}/execute")

    activity = client.get("/api/activity").json()
    analytics = [a for a in activity if a["agent_id"] == "analytics"]
    assert any(a["status"] == "running" for a in analytics)
    completed = [a for a in analytics if a["status"] == "completed"]
    assert len(completed) == 1
    assert "modeled" in completed[0]["summary"].lower()


def test_analytics_failure_marks_goal_failed(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """An Analytics provider failure fails the task — never fake success."""
    goal = _create_goal(client, CAMPAIGN_OBJECTIVE)
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: AnalyticsFailingProvider()
    )

    executed = client.post(f"/api/goals/{goal['id']}/execute").json()

    assert executed["status"] == "failed"
    assert executed["progress"] != 100
    assert executed["completed_at"] is None
    task = next(t for t in executed["tasks"] if t["agent_id"] == "analytics")
    assert task["status"] == "failed"
    assert "analytics provider down" in task["error"]
    assert task["result"] is None
    # Upstream stages genuinely completed before the failure.
    by_agent = {t["agent_id"]: t for t in executed["tasks"]}
    for agent in ("ceo", "research", "prospecting", "sales", "marketing"):
        assert by_agent[agent]["status"] == "completed"
    # The failure is visible in the activity stream — no fake completion.
    activity = client.get("/api/activity").json()
    assert any(
        a["agent_id"] == "analytics" and a["status"] == "failed" for a in activity
    )
    assert "ceo:Objective completed:completed" not in {
        f"{a['agent_id']}:{a['action']}:{a['status']}" for a in activity
    }


def test_malformed_provider_output_marks_goal_failed(
    business_id: str, client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Malformed provider output fails the task truthfully — never a 500 or fake success."""
    goal = _create_goal(client)
    monkeypatch.setattr(
        goals_routes, "get_ai_provider", lambda: MalformedProvider()
    )

    response = client.post(f"/api/goals/{goal['id']}/execute")

    # The API stays healthy; the failure is recorded, not an unhandled crash.
    assert response.status_code == 200
    executed = response.json()
    assert executed["status"] == "failed"
    assert executed["progress"] != 100
    research = next(t for t in executed["tasks"] if t["agent_id"] == "research")
    assert research["status"] == "failed"
    assert research["result"] is None
    activity = client.get("/api/activity").json()
    assert any(
        a["agent_id"] == "research" and a["status"] == "failed" for a in activity
    )


def test_gemini_parse_converts_validation_error() -> None:
    """Gemini's structured-output parser converts schema failures to AIProviderError."""
    from app.services.ai.gemini import GeminiProvider

    provider = GeminiProvider(api_key="test-key")
    try:
        provider._parse(ResearchReport, {"summary": 123})
    except AIProviderError as exc:
        assert "invalid structured output" in str(exc)
    else:
        raise AssertionError("expected AIProviderError for malformed output")
