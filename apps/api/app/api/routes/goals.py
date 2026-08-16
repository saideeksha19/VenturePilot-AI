from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalRead
from app.services.ai import AIProviderError, get_ai_provider
from app.services.context import require_business
from app.services.orchestration import OrchestrationService

router = APIRouter(prefix="/goals", tags=["goals"])


def _goal_or_404(db: Session, goal_id: UUID, business_id: UUID) -> Goal:
    goal = db.scalar(
        select(Goal).where(Goal.id == goal_id, Goal.business_id == business_id)
    )
    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return goal


def _service(db: Session) -> OrchestrationService:
    return OrchestrationService(db, get_ai_provider())


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db)) -> Goal:
    """Create a goal: the CEO produces an execution plan and queues agent tasks."""
    business = require_business(db)
    try:
        return _service(db).create_goal(business, payload.objective.strip())
    except AIProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The AI provider is unavailable: {exc}",
        ) from exc


@router.get("", response_model=list[GoalRead])
def list_goals(db: Session = Depends(get_db)) -> list[Goal]:
    """List goals for the current business, newest first."""
    business = require_business(db)
    return list(
        db.scalars(select(Goal).where(Goal.business_id == business.id).order_by(Goal.created_at.desc()))
    )


@router.get("/{goal_id}", response_model=GoalRead)
def get_goal(goal_id: UUID, db: Session = Depends(get_db)) -> Goal:
    business = require_business(db)
    return _goal_or_404(db, goal_id, business.id)


@router.get("/{goal_id}/tasks", response_model=GoalRead)
def get_goal_tasks(goal_id: UUID, db: Session = Depends(get_db)) -> Goal:
    """Return the goal with its full task list (lifecycle + results)."""
    business = require_business(db)
    return _goal_or_404(db, goal_id, business.id)


@router.post("/{goal_id}/execute", response_model=GoalRead)
def execute_goal(goal_id: UUID, db: Session = Depends(get_db)) -> Goal:
    """Run the goal's plan end-to-end and return the updated goal + tasks."""
    business = require_business(db)
    goal = _goal_or_404(db, goal_id, business.id)
    executed = _service(db).execute_goal(goal.id)
    if executed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return executed
