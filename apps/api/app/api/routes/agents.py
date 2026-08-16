from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity import Activity
from app.models.agent_task import AgentTask
from app.models.goal import Goal
from app.schemas.agent import AGENT_ROSTER, AgentDetailRead, AgentStatusRead
from app.services.context import require_business

router = APIRouter(prefix="/agents", tags=["agents"])


def _latest_task(db: Session, business_id) -> dict[str, AgentTask]:
    """Most recently created task per agent, across the business's goals."""
    tasks = list(
        db.scalars(
            select(AgentTask)
            .join(Goal, Goal.id == AgentTask.goal_id)
            .where(Goal.business_id == business_id)
            .order_by(AgentTask.created_at.desc())
        )
    )
    latest: dict[str, AgentTask] = {}
    for task in tasks:
        latest.setdefault(task.agent_id, task)
    return latest


def _status_for(default_status: str, task: AgentTask | None) -> str:
    if task is None or task.status == "queued":
        return default_status
    mapping = {
        "running": "Working",
        "completed": "Active",
        "failed": "Blocked",
        "unavailable": "Idle",
        "deferred": "Idle",
    }
    return mapping.get(task.status, default_status)


@router.get("", response_model=list[AgentStatusRead])
def list_agents(db: Session = Depends(get_db)) -> list[AgentStatusRead]:
    """The six agents with live state from their most recent task."""
    business = require_business(db)
    latest = _latest_task(db, business.id)
    roster = []
    for row in AGENT_ROSTER:
        task = latest.get(row["id"])
        roster.append(
            AgentStatusRead(
                id=row["id"],
                name=row["name"],
                role=row["role"],
                status=_status_for(row["status"], task),
                task=task.task if task else None,
                progress=task.progress if task else 0,
            )
        )
    return roster


@router.get("/{agent_id}", response_model=AgentDetailRead)
def get_agent_detail(agent_id: str, db: Session = Depends(get_db)) -> AgentDetailRead:
    """Detail view for one agent: mission, live task, recent actions, latest result."""
    business = require_business(db)
    row = next((r for r in AGENT_ROSTER if r["id"] == agent_id), None)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found"
        )

    task = _latest_task(db, business.id).get(agent_id)
    actions = list(
        db.scalars(
            select(Activity)
            .where(Activity.business_id == business.id, Activity.agent_id == agent_id)
            .order_by(Activity.created_at.desc())
            .limit(5)
        )
    )
    recent = [
        f"{a.action}{' (' + a.status + ')' if a.status != 'completed' else ''}"
        for a in actions
    ]

    result = task.result if task else None
    result_dict = result if isinstance(result, dict) else None
    confidence = result_dict.get("confidence") if result_dict else None
    sources = result_dict.get("sources") if result_dict else None
    evidence_verified = result_dict.get("evidence_verified") if result_dict else None
    last_sync = (
        task.completed_at.isoformat() if task and task.completed_at else None
    )

    return AgentDetailRead(
        id=row["id"],
        name=row["name"],
        role=row["role"],
        mission=task.title if task else row["role"],
        status=_status_for(row["status"], task),
        current_task=task.task if task else None,
        progress=task.progress if task else 0,
        recent_actions=recent,
        result=result_dict,
        confidence=float(confidence) if confidence is not None else None,
        sources=sources,
        evidence_verified=bool(evidence_verified) if evidence_verified is not None else None,
        last_sync=last_sync,
    )
