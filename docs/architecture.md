# Phase 1 architecture

The repository uses a small monorepo layout. The web app calls the FastAPI service through a configurable public API URL. The API owns application configuration and will own database access as the product grows.

`apps/api/app/core/config.py` centralizes environment configuration. Its `DATABASE_URL` setting accepts a SQLAlchemy/PostgreSQL URL, so database models and migrations can be introduced without changing application boundaries.

`apps/api/app/db/` holds the SQLAlchemy engine, session factory, `get_db` dependency, and the declarative `Base`. `apps/api/app/models/` defines the `User` and `Business` models (UUID primary keys, timestamps, unique and check constraints), with Pydantic schemas in `apps/api/app/schemas/`. Schema changes are managed with Alembic migrations under `apps/api/alembic/` (run `alembic upgrade head` from `apps/api`). The `/health` endpoint reports database connectivity through the `get_db` dependency.

`packages/ai` is reserved for provider-neutral AI integration code. A Gemini key is represented in the environment template only; no provider calls are made in Phase 1.

`agents/*` keeps each future domain agent isolated. The orchestration contract and all actual agent logic are deliberately deferred.
