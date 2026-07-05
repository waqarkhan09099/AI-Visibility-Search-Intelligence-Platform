import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from app.config import Config
from app.extensions import db, register_error_handlers


def _configure_logging(app):
  level = getattr(logging, app.config.get("LOG_LEVEL", "INFO").upper(), logging.INFO)
  logging.basicConfig(
    level=level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
  )


def _migrate_schema(app):
  """Lightweight SQLite migrations for new columns."""
  with app.app_context():
    inspector = inspect(db.engine)
    if "profiles" in inspector.get_table_names():
      cols = {c["name"] for c in inspector.get_columns("profiles")}
      if "preferred_model" not in cols:
        db.session.execute(text("ALTER TABLE profiles ADD COLUMN preferred_model VARCHAR(80) DEFAULT 'gpt-4o-mini'"))
      if "preferred_provider" not in cols:
        db.session.execute(text("ALTER TABLE profiles ADD COLUMN preferred_provider VARCHAR(40) DEFAULT 'openai'"))
      db.session.commit()

    if "pipeline_runs" in inspector.get_table_names():
      cols = {c["name"] for c in inspector.get_columns("pipeline_runs")}
      for col, ddl in [
        ("stage", "ALTER TABLE pipeline_runs ADD COLUMN stage VARCHAR(40) DEFAULT 'initializing'"),
        ("model_id", "ALTER TABLE pipeline_runs ADD COLUMN model_id VARCHAR(80) DEFAULT 'gpt-4o-mini'"),
        ("provider", "ALTER TABLE pipeline_runs ADD COLUMN provider VARCHAR(40) DEFAULT 'openai'"),
        ("error_message", "ALTER TABLE pipeline_runs ADD COLUMN error_message TEXT"),
      ]:
        if col not in cols:
          db.session.execute(text(ddl))
      db.session.commit()

    if "queries" in inspector.get_table_names():
      cols = {c["name"] for c in inspector.get_columns("queries")}
      if "rationale" not in cols:
        db.session.execute(text("ALTER TABLE queries ADD COLUMN rationale TEXT"))
        db.session.commit()


def create_app(config_class=Config):
  load_dotenv()
  app = Flask(__name__, instance_relative_config=True)
  app.config.from_object(config_class)

  os.makedirs(app.instance_path, exist_ok=True)

  _configure_logging(app)
  cors_origins = app.config["CORS_ORIGINS"]
  if cors_origins == ["*"]:
    CORS(app, resources={r"/api/*": {"origins": "*"}})
  else:
    CORS(app, origins=cors_origins)

  db.init_app(app)
  register_error_handlers(app)

  from app.routes.config import config_bp
  from app.routes.dashboard import dashboard_bp
  from app.routes.models import models_bp
  from app.routes.profiles import profiles_bp

  app.register_blueprint(dashboard_bp, url_prefix="/api")
  app.register_blueprint(profiles_bp, url_prefix="/api")
  app.register_blueprint(models_bp, url_prefix="/api")
  app.register_blueprint(config_bp, url_prefix="/api")

  @app.route("/api/health")
  def health():
    from app.services.ai_config_service import AIConfigService
    from app.services.llm.model_service import AIModelService
    return {"data": {"status": "ok", "ai": AIModelService.get_status(), "config": AIConfigService.to_api_payload(live=False)["summary"]}}

  with app.app_context():
    db.create_all()
    _migrate_schema(app)
    from app.services.ai_config_service import AIConfigService
    AIConfigService.validate_all(live=True)
    AIConfigService.log_startup_status()
    _auto_seed_demo(app)

  return app


def _auto_seed_demo(app):
  if os.environ.get("AUTO_SEED", "").lower() not in ("1", "true", "yes"):
    return
  from app.models import Profile
  if Profile.query.count() > 0:
    return
  try:
    from seed import seed_if_empty
    seed_if_empty()
    logging.getLogger(__name__).info("Demo data seeded (AUTO_SEED)")
  except Exception:
    logging.getLogger(__name__).exception("AUTO_SEED failed")
