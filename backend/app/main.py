from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import engine, get_session
from app.routers import (
    activities,
    activity_logs,
    capture_stream,
    captures,
    exercises,
    foods,
    history,
    meals,
    profile,
    validation,
    workouts,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="Vox App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(foods.router)
app.include_router(captures.router)
app.include_router(capture_stream.router)
app.include_router(validation.router)
app.include_router(profile.router)
app.include_router(history.router)
app.include_router(meals.router)
app.include_router(workouts.router)
app.include_router(activity_logs.router)
app.include_router(exercises.router)
app.include_router(activities.router)
