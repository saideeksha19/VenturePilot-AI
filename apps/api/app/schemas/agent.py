from pydantic import BaseModel, Field

#: The six VenturePilot agents. Status/role defaults mirror the product's
#: presentation; live task state overrides them via /api/agents.
AGENT_ROSTER: list[dict] = [
    {"id": "ceo", "name": "CEO", "role": "Executive coordination", "status": "Coordinating"},
    {"id": "research", "name": "Research", "role": "Market intelligence", "status": "Working"},
    {"id": "prospecting", "name": "Prospecting", "role": "Lead qualification", "status": "Working"},
    {"id": "sales", "name": "Sales", "role": "Outreach & follow-up", "status": "Active"},
    {"id": "marketing", "name": "Marketing", "role": "Campaign strategy", "status": "Working"},
    {"id": "analytics", "name": "Analytics", "role": "Growth modeling", "status": "Monitoring"},
]


class AgentStatusRead(BaseModel):
    id: str
    name: str
    role: str
    status: str
    task: str | None = None
    progress: int = 0


class AgentDetailRead(BaseModel):
    id: str
    name: str
    role: str
    mission: str
    status: str
    current_task: str | None = None
    progress: int = 0
    recent_actions: list[str] = Field(default_factory=list)
    result: dict | None = None
    confidence: float | None = None
    sources: list[dict] | None = None
    evidence_verified: bool | None = None
    last_sync: str | None = None
