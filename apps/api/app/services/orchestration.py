"""Goal orchestration service.

Coordinates the full pipeline:

    Goal -> CEO plan -> queued tasks -> sequential execution
        -> Research analysis -> Prospecting qualification
        -> results -> activity records -> completion

Runs synchronously so the demo and tests see a complete, persisted run.
The AI provider is injected so route handlers never touch it directly.
"""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.agent_task import AgentTask
from app.models.business import Business
from app.models.goal import Goal
from app.services.ai.base import AIProvider


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _business_context(business: Business) -> dict:
    """The business context future agents consume (BusinessContext object)."""
    return {
        "id": str(business.id),
        "name": business.name,
        "industry": business.industry,
        "size": business.size,
        "description": business.description,
        "goals": business.goals,
    }


def _latest_result(goal: Goal, agent_id: str) -> dict | None:
    """The persisted result_json of the most recent completed task for an agent."""
    for t in sorted(goal.tasks, key=lambda t: t.order_index):
        if t.agent_id == agent_id and t.status == "completed" and t.result_json:
            return t.result_json
    return None


class OrchestrationService:
    """Runs goals through the VenturePilot agent team."""

    def __init__(self, db: Session, provider: AIProvider) -> None:
        self._db = db
        self._provider = provider

    # -- planning ---------------------------------------------------------

    def create_goal(self, business: Business, objective: str) -> Goal:
        """Have the CEO produce an execution plan and persist goal + queued tasks."""
        plan = self._provider.plan_goal(
            objective=objective, business=_business_context(business)
        )
        goal = Goal(
            business_id=business.id,
            objective=objective,
            status="created",
            progress=0,
            priority=plan.priority,
            success_criteria=plan.success_criteria,
            plan_summary=plan.summary,
            simulated=plan.simulated,
        )
        self._db.add(goal)
        self._db.flush()

        for index, stage in enumerate(plan.stages):
            self._db.add(
                AgentTask(
                    goal_id=goal.id,
                    agent_id=stage.agent_id,
                    order_index=index,
                    title=stage.title,
                    task=stage.task,
                    purpose=stage.purpose,
                    depends_on=stage.depends_on,
                    expected_output=stage.expected_output,
                    status="queued",
                    progress=0,
                )
            )

        self._db.add(
            Activity(
                business_id=business.id,
                goal_id=goal.id,
                agent_id="ceo",
                action="Objective created",
                status="completed",
                summary=objective,
            )
        )
        self._db.commit()
        self._db.refresh(goal)
        return goal

    # -- execution ---------------------------------------------------------

    def execute_goal(self, goal_id: UUID) -> Goal | None:
        """Run every planned task in order, recording lifecycle + activity.

        Returns None when the goal does not exist, or the goal unchanged when
        it is already in a terminal state (execution is not re-run).

        The final state is TRUTHFUL: progress counts only stages that actually
        completed, and a mission with unexecutable stages reports
        "partially_completed" (never a fake 100%).
        """
        goal = self._db.get(Goal, goal_id)
        if goal is None or goal.status in ("running", "completed", "failed", "partially_completed"):
            return goal

        business = goal.business
        tasks = list(goal.tasks)  # ordered by order_index via the relationship
        goal.status = "running"
        goal.progress = 0
        self._db.flush()

        for task in tasks:
            self._run_task(business, goal, task)
            if goal.status == "failed":
                break

        total = len(tasks)
        done = sum(1 for t in tasks if t.status == "completed")
        unavailable = [t.agent_id for t in tasks if t.status == "unavailable"]

        if goal.status == "failed":
            # Progress reflects only what genuinely completed before the failure.
            goal.progress = int((done / total) * 100) if total else 0
        elif done == total:
            goal.status = "completed"
            goal.progress = 100
            goal.completed_at = _utcnow()
            self._db.add(
                Activity(
                    business_id=business.id,
                    goal_id=goal.id,
                    agent_id="ceo",
                    action="Objective completed",
                    status="completed",
                    summary=goal.objective,
                )
            )
        elif done > 0:
            goal.status = "partially_completed"
            goal.progress = int((done / total) * 100)
            goal.completed_at = None
            self._db.add(
                Activity(
                    business_id=business.id,
                    goal_id=goal.id,
                    agent_id="ceo",
                    action="Mission partially executed",
                    status="partial",
                    summary=(
                        f"{done} of {total} stages completed; "
                        f"no executor registered for: {', '.join(unavailable) or 'none'}"
                    ),
                )
            )
        else:
            goal.status = "unavailable"
            goal.progress = 0
            self._db.add(
                Activity(
                    business_id=business.id,
                    goal_id=goal.id,
                    agent_id="ceo",
                    action="Mission unavailable",
                    status="unavailable",
                    summary="No stage could execute — the AI provider or executors were unavailable.",
                )
            )

        self._db.commit()
        self._db.refresh(goal)
        return goal

    def _run_task(self, business: Business, goal: Goal, task: AgentTask) -> None:
        """Execute one task through its lifecycle (running -> terminal)."""
        task.status = "running"
        task.started_at = _utcnow()
        task.progress = 10
        self._db.add(
            Activity(
                business_id=business.id,
                goal_id=goal.id,
                task_id=task.id,
                agent_id=task.agent_id,
                action=task.title,
                status="running",
            )
        )
        self._db.flush()

        try:
            if task.agent_id == "ceo":
                # The CEO's output is the execution plan, produced at create time.
                task.output = goal.plan_summary
                task.result_json = {
                    "summary": goal.plan_summary,
                    "success_criteria": goal.success_criteria,
                    "simulated": goal.simulated,
                }
            elif task.agent_id == "research":
                report = self._provider.research(
                    question=task.task,
                    objective=goal.objective,
                    business=_business_context(business),
                )
                task.output = report.summary
                task.result_json = report.model_dump()
            elif task.agent_id == "prospecting":
                result = self._provider.prospect(
                    business=_business_context(business),
                    objective=goal.objective,
                    research=_latest_result(goal, "research"),
                )
                task.output = result.summary
                task.result_json = result.model_dump()
            elif task.agent_id == "sales":
                prospecting = _latest_result(goal, "prospecting")
                if not prospecting:
                    # Sales only runs against a qualified pipeline. Without a
                    # persisted Prospecting result it cannot honestly execute.
                    task.status = "unavailable"
                    task.output = (
                        "Sales cannot start — the Prospecting stage did not produce "
                        "a persisted result, so there is no qualified pipeline to "
                        "write outreach for."
                    )
                    task.progress = 0
                    self._db.add(
                        Activity(
                            business_id=business.id,
                            goal_id=goal.id,
                            task_id=task.id,
                            agent_id=task.agent_id,
                            action=task.title,
                            status="unavailable",
                            summary=task.output,
                        )
                    )
                    return
                result = self._provider.sales(
                    business=_business_context(business),
                    objective=goal.objective,
                    prospecting=prospecting,
                )
                task.output = result.summary
                task.result_json = result.model_dump()
            elif task.agent_id == "marketing":
                research = _latest_result(goal, "research")
                if not research:
                    # Marketing needs the Research grounding to honestly draft
                    # campaign strategy — without it the stage stays unavailable.
                    task.status = "unavailable"
                    task.output = (
                        "Marketing cannot start — the Research stage did not produce "
                        "a persisted result, so there is no market context to build "
                        "campaign strategy on."
                    )
                    task.progress = 0
                    self._db.add(
                        Activity(
                            business_id=business.id,
                            goal_id=goal.id,
                            task_id=task.id,
                            agent_id=task.agent_id,
                            action=task.title,
                            status="unavailable",
                            summary=task.output,
                        )
                    )
                    return
                result = self._provider.marketing(
                    business=_business_context(business),
                    objective=goal.objective,
                    research=research,
                    prospecting=_latest_result(goal, "prospecting"),
                    sales=_latest_result(goal, "sales"),
                )
                task.output = result.summary
                task.result_json = result.model_dump()
            elif task.agent_id == "analytics":
                research = _latest_result(goal, "research")
                if not research:
                    # Analytics needs the mission's persisted intelligence to
                    # model outcomes honestly — without it the stage stays
                    # unavailable rather than inventing numbers.
                    task.status = "unavailable"
                    task.output = (
                        "Analytics cannot start — the Research stage did not produce "
                        "a persisted result, so there is no mission intelligence to "
                        "model outcomes from."
                    )
                    task.progress = 0
                    self._db.add(
                        Activity(
                            business_id=business.id,
                            goal_id=goal.id,
                            task_id=task.id,
                            agent_id=task.agent_id,
                            action=task.title,
                            status="unavailable",
                            summary=task.output,
                        )
                    )
                    return
                result = self._provider.analytics(
                    business=_business_context(business),
                    objective=goal.objective,
                    research=research,
                    prospecting=_latest_result(goal, "prospecting"),
                    sales=_latest_result(goal, "sales"),
                    marketing=_latest_result(goal, "marketing"),
                )
                task.output = result.summary
                task.result_json = result.model_dump()
            else:
                # No executor is registered for this agent yet (later milestone).
                # The stage is marked UNAVAILABLE — not completed. Progress stays
                # 0 so the mission can never claim a fake 100%.
                task.status = "unavailable"
                task.output = (
                    f"No executor is registered for the '{task.agent_id}' agent yet — "
                    "this stage is unavailable and scheduled for a later milestone."
                )
                task.progress = 0
                self._db.add(
                    Activity(
                        business_id=business.id,
                        goal_id=goal.id,
                        task_id=task.id,
                        agent_id=task.agent_id,
                        action=task.title,
                        status="unavailable",
                        summary=task.output,
                    )
                )
                return

            task.status = "completed"
            task.progress = 100
            task.completed_at = _utcnow()
            self._db.add(
                Activity(
                    business_id=business.id,
                    goal_id=goal.id,
                    task_id=task.id,
                    agent_id=task.agent_id,
                    action=task.title,
                    status="completed",
                    summary=task.output,
                )
            )
        except Exception as exc:
            # Any executor failure — provider error, malformed structured
            # output, or an unexpected bug — becomes a truthful FAILED task.
            # It never crashes the API and never converts into fake success.
            task.status = "failed"
            task.error = str(exc)[:500]
            task.progress = 0
            task.completed_at = _utcnow()
            goal.status = "failed"
            self._db.add(
                Activity(
                    business_id=business.id,
                    goal_id=goal.id,
                    task_id=task.id,
                    agent_id=task.agent_id,
                    action=task.title,
                    status="failed",
                    summary=str(exc)[:500],
                )
            )
