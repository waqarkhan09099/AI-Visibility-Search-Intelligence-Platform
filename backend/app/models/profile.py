from datetime import datetime, timezone
import json

from app.extensions import db


def utcnow():
  return datetime.now(timezone.utc)


class Profile(db.Model):
  __tablename__ = "profiles"

  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(120), nullable=False)
  domain = db.Column(db.String(255), nullable=False)
  industry = db.Column(db.String(120), nullable=False)
  description = db.Column(db.Text, nullable=True)
  competitors = db.Column(db.Text, default="[]")
  run_status = db.Column(db.String(20), default="idle")
  preferred_model = db.Column(db.String(80), default="gpt-4o-mini")
  preferred_provider = db.Column(db.String(40), default="openai")
  created_at = db.Column(db.DateTime, default=utcnow)

  queries = db.relationship("Query", backref="profile", lazy=True, cascade="all, delete-orphan")
  recommendations = db.relationship("Recommendation", backref="profile", lazy=True, cascade="all, delete-orphan")
  pipeline_runs = db.relationship("PipelineRun", backref="profile", lazy=True, cascade="all, delete-orphan")

  @property
  def competitors_list(self):
    return json.loads(self.competitors or "[]")

  @competitors_list.setter
  def competitors_list(self, value):
    self.competitors = json.dumps(value or [])

  def avg_opportunity(self):
    scored = [q.opportunity_score for q in self.queries if q.status == "scored"]
    return round(sum(scored) / len(scored), 1) if scored else 0.0


class Query(db.Model):
  __tablename__ = "queries"

  id = db.Column(db.Integer, primary_key=True)
  profile_id = db.Column(db.Integer, db.ForeignKey("profiles.id"), nullable=False)
  query_text = db.Column(db.String(500), nullable=False)
  volume = db.Column(db.Integer, default=0)
  difficulty = db.Column(db.Integer, default=0)
  opportunity_score = db.Column(db.Integer, default=0)
  rationale = db.Column(db.Text, nullable=True)
  status = db.Column(db.String(20), default="pending")


class Recommendation(db.Model):
  __tablename__ = "recommendations"

  id = db.Column(db.Integer, primary_key=True)
  profile_id = db.Column(db.Integer, db.ForeignKey("profiles.id"), nullable=False)
  title = db.Column(db.String(255), nullable=False)
  content_type = db.Column(db.String(80), nullable=False)
  priority = db.Column(db.String(20), nullable=False)
  rationale = db.Column(db.Text, nullable=False)
  keywords = db.Column(db.Text, default="[]")

  @property
  def keywords_list(self):
    return json.loads(self.keywords or "[]")

  @keywords_list.setter
  def keywords_list(self, value):
    self.keywords = json.dumps(value or [])


class PipelineRun(db.Model):
  __tablename__ = "pipeline_runs"

  id = db.Column(db.Integer, primary_key=True)
  profile_id = db.Column(db.Integer, db.ForeignKey("profiles.id"), nullable=False)
  status = db.Column(db.String(20), default="running")
  stage = db.Column(db.String(40), default="initializing")
  model_id = db.Column(db.String(80), default="gpt-4o-mini")
  provider = db.Column(db.String(40), default="openai")
  error_message = db.Column(db.Text, nullable=True)
  started_at = db.Column(db.DateTime, default=utcnow)
  completed_at = db.Column(db.DateTime, nullable=True)
  queries_scored = db.Column(db.Integer, default=0)
  tokens_used = db.Column(db.Integer, default=0)
  total_queries = db.Column(db.Integer, default=0)

  @property
  def progress_pct(self):
    if not self.total_queries:
      return 0
    if self.stage == "generating_recommendations" and self.queries_scored == self.total_queries:
      return 95
    if self.status == "completed":
      return 100
    return min(100, round((self.queries_scored / self.total_queries) * 90))
