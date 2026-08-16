# VenturePilot AI

VenturePilot is an AI-native business operating system: one intelligence, six
specialized agents, measurable output. A founder states a high-level objective
and the six-agent team plans, researches, qualifies, sells, markets, and
measures it end-to-end — with every stage genuinely executed, persisted, and
reported truthfully.

This repository contains the complete implementation: a cinematic Next.js
frontend with a Three.js 3D core, a FastAPI backend with SQLAlchemy + Alembic
persistence, and the full six-agent orchestration pipeline.

## The six-agent pipeline

```
CEO → Research → Prospecting → Sales → Marketing → Analytics
```

A mission works like this:

1. **CEO** — interprets the founder's objective and produces a structured
   execution plan (which stages matter, dependencies, success criteria).
2. **Research** — produces structured market/competitive analysis grounded in
   the business context.
3. **Prospecting** — models the ideal customer profile and target segments,
   qualification criteria, scoring factors, and illustrative account profiles.
4. **Sales** — generates personalized outreach (channel, subject, message,
   follow-up, CTA) derived from the Prospecting output.
5. **Marketing** — drafts a campaign strategy with structured creative
   variants, derived from the upstream Research / Prospecting / Sales results.
6. **Analytics** — models performance intelligence (KPIs, funnel, conversion,
   signals, risks, actions) from the mission's persisted outputs.

Each stage executes through the same provider abstraction, persists its
structured result to the database, and records truthful activity events. The
mission reports real progress: `100%` / `completed` only when every planned
stage genuinely completed. Stages without an executor are marked
`unavailable` and never counted toward completion; failures are recorded as
`failed`, never as success.

## What is implemented

**Backend (`apps/api`)**
- FastAPI + SQLAlchemy + Alembic (PostgreSQL-compatible; SQLite for local dev)
- Models: User, Business, Goal, AgentTask, Activity — all persisted
- AI provider abstraction (`services/ai/`): a Gemini provider and a
  deterministic development fallback, both producing the same structured schemas
- All six executors wired into the orchestration service
- API routes: `/health`, `/api/businesses`, `/api/goals` (+ execute), `/api/agents`,
  `/api/activity`
- Database-aware health endpoint
- Backend test suite (pytest) covering the full pipeline and truthfulness

**Frontend (`apps/web`)**
- Cinematic 3D command center (Three.js / React Three Fiber) with the AI core,
  six agent nodes, orbital rings, particles, and animated data streams
- `/` Overview (real mission, KPIs, agent cards, live activity)
- `/team` spatial 3D agent network with inspect panels
- `/goals` mission activation and 3D orchestration choreography
- `/analytics`, `/research`, `/activity`, `/settings`, `/landing`
- Agent detail panels showing the persisted structured result for each agent
- Reduced-motion support and honest empty/error states

## Truthfulness: Development mode

VenturePilot runs the **deterministic fallback** when no `GEMINI_API_KEY` is
set. The fallback makes real decisions from the business context and persisted
upstream outputs — but nothing is ever presented as real AI execution or real
external data:

- All fallback results are marked `simulated: true` and labeled **Development mode** in the UI.
- **Analytics** charts on `/analytics` are explicitly **modeled demo data** (no
  live traffic/revenue/conversion source is connected).
- Account profiles from Prospecting are always labeled **illustrative** — never
  real verified leads.
- Research states plainly that **no external sources were fetched**; competitor
  lists and source counts are never fabricated.
- Campaign strategy is labeled **generated drafts** — never "sent", "launched",
  or "tested".

If `GEMINI_API_KEY` is set, the real Gemini provider runs automatically with
the same structured schemas and the same honesty rules.

## Architecture

```
apps/web      Next.js 14 (App Router) + React 18 + TypeScript + Three.js
apps/api      FastAPI + SQLAlchemy + Alembic + Pydantic
agents/       Reserved agent workspace boundaries (not part of the runtime)
packages/     Reserved shared/AI integration boundaries
docs/         Product and architecture documentation
```

Frontend data flows through `lib/services.ts` → FastAPI → service layer →
database. The frontend degrades to clearly-labeled demo data only when the API
is unreachable, and the shell surfaces that state as "Core offline · demo data".

## Local setup

Requirements: Node.js 20+, Python 3.11+.

Copy `.env.example` to `.env` at the repository root and adjust values as
needed (see below). No API key is required to run the demo — the fallback
provider is the default.

### Backend

```bash
cd apps/api
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1   |  macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"

# Local dev without PostgreSQL (SQLite):
export DATABASE_URL="sqlite:///./dev.db"     # Windows: $env:DATABASE_URL="sqlite:///dev.db"
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API is at http://localhost:8000 — `/health` reports service and database
connectivity.

### Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open the "Local:" URL printed by `next dev` (this environment exports `PORT=0`,
so the port is random each run — never assume 3000). The app entry point is `/`;
on first run it shows business onboarding ("Initialize AI Team"), then the
command center.

## Environment variables (`.env.example`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Frontend → API base URL (default `http://localhost:8000`) |
| `APP_ENV` | `development` by default |
| `DATABASE_URL` | SQLAlchemy URL — PostgreSQL for production, `sqlite:///dev.db` for local dev |
| `CORS_ORIGINS` | API CORS origins (`*` is the dev default; list explicit origins before shipping) |
| `GEMINI_API_KEY` | Optional — activates the real Gemini provider; when absent the deterministic fallback runs (Development mode) |

Secrets are never committed: `.gitignore` excludes `.env*`, and `.env.example`
contains no real keys.

## Demo flow

1. Start the backend and frontend (above).
2. Open the app → complete onboarding if prompted.
3. On the Goals page, enter an objective such as "Launch a campaign to generate
   50 qualified B2B opportunities" and activate the mission.
4. Watch CEO → Research → Prospecting → Sales → Marketing → Analytics execute
   in sequence and reach **100% / Objective completed**.
5. Inspect each agent on the AI Team page, browse Activity, Research, and
   Analytics, then refresh — every result persists.

## Testing and build

```bash
# Backend
cd apps/api && python -m pytest

# Frontend
cd apps/web
npm run typecheck
npm run lint
npm run build
```

## Current limitations

- **No live external data**: web research, lead databases, and analytics
  sources are not connected — everything external is modeled/illustrative and labeled as such.
- **Development mode by default**: without `GEMINI_API_KEY`, execution uses the
  deterministic fallback (honestly labeled).
- **No authentication** — single-user demo model.
- **SQLite is the dev default**; PostgreSQL is configured but production deployment is not set up.
- Analytics charts are modeled demo data, not real measurements.

## Future production features

- Live web research so `evidence_verified` becomes true (real citations)
- External integrations: lead/CRM/analytics data sources
- Live Gemini verification and model tuning
- Authentication and multi-user support
- Production deployment (PostgreSQL, CI/CD, hosting)
