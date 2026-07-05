import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
DEFAULT_DB_PATH = INSTANCE_DIR / "app.db"


def _resolve_database_uri() -> str:
  """Always use an absolute SQLite path so Flask reloader works on Windows."""
  url = os.environ.get("DATABASE_URL", "").strip()
  if not url:
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

  # Render/Heroku legacy postgres URLs
  if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)

  if url.startswith("sqlite:///"):
    raw = url[len("sqlite:///") :]
    # Already absolute (Windows drive letter or Unix root)
    if raw.startswith("/") or (len(raw) > 1 and raw[1] == ":"):
      return url
    path = (BASE_DIR / raw).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path.as_posix()}"

  return url


class Config:
  SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
  SQLALCHEMY_DATABASE_URI = _resolve_database_uri()
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")
    if o.strip()
  ]

  OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
  ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
  GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
  DEFAULT_AI_MODEL = os.environ.get("DEFAULT_AI_MODEL", "gpt-4o-mini")
  DEFAULT_AI_PROVIDER = os.environ.get("DEFAULT_AI_PROVIDER", "openai")
  PIPELINE_MAX_QUERIES = int(os.environ.get("PIPELINE_MAX_QUERIES", "12"))
  LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")


class ProductionConfig(Config):
  DEBUG = False


class DevelopmentConfig(Config):
  DEBUG = True
