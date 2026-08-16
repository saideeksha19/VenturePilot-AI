"""Add goals, agent_tasks and activities

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=True),
        sa.Column("success_criteria", sa.JSON(), nullable=True),
        sa.Column("plan_summary", sa.Text(), nullable=True),
        sa.Column("simulated", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("length(objective) > 0", name="objective_not_empty"),
        sa.CheckConstraint("progress >= 0 AND progress <= 100", name="progress_range"),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            name="fk_goals_business_id_businesses",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_goals"),
    )
    op.create_index("ix_goals_business_id", "goals", ["business_id"], unique=False)

    op.create_table(
        "agent_tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goal_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.String(length=20), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("depends_on", sa.JSON(), nullable=True),
        sa.Column("expected_output", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("output", sa.Text(), nullable=True),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("progress >= 0 AND progress <= 100", name="progress_range"),
        sa.ForeignKeyConstraint(
            ["goal_id"],
            ["goals.id"],
            name="fk_agent_tasks_goal_id_goals",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_agent_tasks"),
    )
    op.create_index("ix_agent_tasks_goal_id", "agent_tasks", ["goal_id"], unique=False)

    op.create_table(
        "activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("business_id", sa.Uuid(), nullable=False),
        sa.Column("goal_id", sa.Uuid(), nullable=True),
        sa.Column("task_id", sa.Uuid(), nullable=True),
        sa.Column("agent_id", sa.String(length=20), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["business_id"],
            ["businesses.id"],
            name="fk_activities_business_id_businesses",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["goal_id"],
            ["goals.id"],
            name="fk_activities_goal_id_goals",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["task_id"],
            ["agent_tasks.id"],
            name="fk_activities_task_id_agent_tasks",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_activities"),
    )
    op.create_index(
        "ix_activities_business_created",
        "activities",
        ["business_id", "created_at"],
        unique=False,
    )
    op.create_index("ix_activities_goal_id", "activities", ["goal_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_activities_goal_id", table_name="activities")
    op.drop_index("ix_activities_business_created", table_name="activities")
    op.drop_table("activities")
    op.drop_index("ix_agent_tasks_goal_id", table_name="agent_tasks")
    op.drop_table("agent_tasks")
    op.drop_index("ix_goals_business_id", table_name="goals")
    op.drop_table("goals")
