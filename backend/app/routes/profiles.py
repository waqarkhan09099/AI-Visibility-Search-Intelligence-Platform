from flask import Blueprint, request
from marshmallow import ValidationError

from app.extensions import db
from app.models import PipelineRun, Profile, Query, Recommendation
from app.schemas.profile import (
  PipelineRunRequestSchema,
  PipelineRunSchema,
  ProfileCreateSchema,
  ProfileDetailSchema,
  ProfileSchema,
  ProfileUpdateSchema,
  QuerySchema,
  RecommendationSchema,
)
from app.services.ai_pipeline_service import AIPipelineService
from app.services.llm.model_service import AIModelService

profiles_bp = Blueprint("profiles", __name__)

SORTABLE_QUERY_COLUMNS = {"query_text", "volume", "difficulty", "opportunity_score", "status"}

profile_schema = ProfileSchema()
profiles_schema = ProfileSchema(many=True)
profile_detail_schema = ProfileDetailSchema()
profile_create_schema = ProfileCreateSchema()
profile_update_schema = ProfileUpdateSchema()
pipeline_run_request_schema = PipelineRunRequestSchema()
query_schema = QuerySchema(many=True)
recommendation_schema = RecommendationSchema(many=True)
pipeline_run_schema = PipelineRunSchema(many=True)


@profiles_bp.route("/profiles", methods=["GET"])
def list_profiles():
  profiles = Profile.query.order_by(Profile.created_at.desc()).all()
  return {"data": profiles_schema.dump(profiles)}


@profiles_bp.route("/profiles", methods=["POST"])
def create_profile():
  try:
    data = profile_create_schema.load(request.get_json() or {})
  except ValidationError as err:
    return {"error": "Validation failed", "details": err.messages}, 400

  provider, resolved = AIModelService.resolve_model(data.get("preferred_model"))

  profile = Profile(
    name=data["name"],
    domain=data["domain"],
    industry=data["industry"],
    description=data.get("description", ""),
    preferred_model=resolved,
    preferred_provider=provider.provider_id,
  )
  profile.competitors_list = data.get("competitors", [])
  db.session.add(profile)
  db.session.flush()

  for text in AIPipelineService.generate_initial_queries(profile):
    db.session.add(Query(profile_id=profile.id, query_text=text, status="pending"))

  db.session.commit()
  return {"data": profile_schema.dump(profile)}, 201


@profiles_bp.route("/profiles/<int:profile_id>", methods=["GET"])
def get_profile(profile_id):
  profile = Profile.query.get_or_404(profile_id)
  return {"data": profile_detail_schema.dump(profile)}


@profiles_bp.route("/profiles/<int:profile_id>", methods=["PATCH"])
def update_profile(profile_id):
  profile = Profile.query.get_or_404(profile_id)
  try:
    data = profile_update_schema.load(request.get_json() or {}, partial=True)
  except ValidationError as err:
    return {"error": "Validation failed", "details": err.messages}, 400

  if "preferred_model" in data:
    try:
      AIModelService.validate_model_id(data["preferred_model"])
      provider, resolved = AIModelService.resolve_model(data["preferred_model"])
      profile.preferred_model = resolved
      profile.preferred_provider = provider.provider_id
    except ValidationError as err:
      msg = err.messages if isinstance(err.messages, str) else str(err.messages)
      return {"error": msg}, 400
  if "preferred_provider" in data and "preferred_model" not in data:
    profile.preferred_provider = data["preferred_provider"]

  db.session.commit()
  return {"data": profile_schema.dump(profile)}


@profiles_bp.route("/profiles/<int:profile_id>/pipeline/run", methods=["POST"])
def run_pipeline(profile_id):
  Profile.query.get_or_404(profile_id)
  body = request.get_json(silent=True) or {}
  try:
    payload = pipeline_run_request_schema.load(body)
    if payload.get("model_id"):
      AIModelService.validate_model_id(payload["model_id"])
    run = AIPipelineService.start_pipeline(profile_id, model_id=payload.get("model_id"))
  except ValidationError as err:
    msg = err.messages if isinstance(err.messages, str) else str(err.messages)
    return {"error": msg}, 400

  return {"data": PipelineRunSchema().dump(run)}, 201


@profiles_bp.route("/profiles/<int:profile_id>/pipeline/status", methods=["GET"])
def pipeline_status(profile_id):
  Profile.query.get_or_404(profile_id)
  run = (
    PipelineRun.query.filter_by(profile_id=profile_id)
    .order_by(PipelineRun.started_at.desc())
    .first()
  )
  if not run:
    return {
      "data": {
        "status": "idle",
        "stage": None,
        "model_id": None,
        "provider": None,
        "error_message": None,
        "queries_scored": 0,
        "tokens_used": 0,
        "progress_pct": 0,
        "run_id": None,
      }
    }

  return {
    "data": {
      "status": run.status,
      "stage": run.stage,
      "model_id": run.model_id,
      "provider": run.provider,
      "error_message": run.error_message,
      "queries_scored": run.queries_scored,
      "tokens_used": run.tokens_used,
      "progress_pct": run.progress_pct,
      "run_id": run.id,
    }
  }


@profiles_bp.route("/profiles/<int:profile_id>/pipeline/runs", methods=["GET"])
def pipeline_runs(profile_id):
  Profile.query.get_or_404(profile_id)
  runs = (
    PipelineRun.query.filter_by(profile_id=profile_id)
    .order_by(PipelineRun.started_at.desc())
    .all()
  )
  return {"data": pipeline_run_schema.dump(runs)}


@profiles_bp.route("/profiles/<int:profile_id>/queries", methods=["GET"])
def get_queries(profile_id):
  Profile.query.get_or_404(profile_id)
  min_score = request.args.get("min_score", 0, type=int)
  status = request.args.get("status", "")
  page = request.args.get("page", 1, type=int)
  limit = request.args.get("limit", 10, type=int)
  sort_by = request.args.get("sort_by", "opportunity_score")
  sort_dir = request.args.get("sort_dir", "desc")

  query = Query.query.filter_by(profile_id=profile_id)
  if min_score:
    query = query.filter(Query.opportunity_score >= min_score)
  if status:
    query = query.filter(Query.status == status)

  sort_col = getattr(Query, sort_by, None) if sort_by in SORTABLE_QUERY_COLUMNS else Query.opportunity_score
  if sort_dir == "asc":
    query = query.order_by(sort_col.asc())
  else:
    query = query.order_by(sort_col.desc())

  total = query.count()
  items = query.offset((page - 1) * limit).limit(limit).all()

  return {
    "data": {
      "items": query_schema.dump(items),
      "total": total,
      "page": page,
      "limit": limit,
      "pages": max(1, (total + limit - 1) // limit),
    }
  }


@profiles_bp.route("/profiles/<int:profile_id>/queries/<int:query_id>/recheck", methods=["POST"])
def recheck_query(profile_id, query_id):
  body = request.get_json(silent=True) or {}
  model_id = body.get("model_id")
  query = AIPipelineService.recheck_query(profile_id, query_id, model_id=model_id)
  return {"data": QuerySchema().dump(query)}


@profiles_bp.route("/profiles/<int:profile_id>/recommendations", methods=["GET"])
def get_recommendations(profile_id):
  Profile.query.get_or_404(profile_id)
  recs = Recommendation.query.filter_by(profile_id=profile_id).all()
  grouped = {"high": [], "medium": [], "low": []}
  for rec in recommendation_schema.dump(recs):
    grouped.get(rec["priority"], grouped["low"]).append(rec)
  return {"data": grouped}


@profiles_bp.route("/profiles/<int:profile_id>/charts/opportunity", methods=["GET"])
def opportunity_chart(profile_id):
  Profile.query.get_or_404(profile_id)
  buckets = {f"{i}-{i+9}": 0 for i in range(0, 100, 10)}
  queries = Query.query.filter_by(profile_id=profile_id, status="scored").all()
  for q in queries:
    bucket_start = min(90, (q.opportunity_score // 10) * 10)
    key = f"{bucket_start}-{bucket_start + 9}"
    buckets[key] += 1
  data = [{"range": k, "count": v} for k, v in buckets.items()]
  return {"data": data}


@profiles_bp.route("/profiles/<int:profile_id>/charts/scatter", methods=["GET"])
def scatter_chart(profile_id):
  Profile.query.get_or_404(profile_id)
  queries = Query.query.filter_by(profile_id=profile_id, status="scored").all()
  data = [
    {"volume": q.volume, "difficulty": q.difficulty, "query": q.query_text, "score": q.opportunity_score}
    for q in queries
  ]
  return {"data": data}


@profiles_bp.route("/profiles/<int:profile_id>/charts/pipeline-trend", methods=["GET"])
def pipeline_trend(profile_id):
  Profile.query.get_or_404(profile_id)
  runs = (
    PipelineRun.query.filter_by(profile_id=profile_id, status="completed")
    .order_by(PipelineRun.started_at.asc())
    .all()
  )
  data = [
    {
      "run_id": r.id,
      "date": r.started_at.isoformat() if r.started_at else None,
      "tokens_used": r.tokens_used,
      "queries_scored": r.queries_scored,
      "model_id": r.model_id,
    }
    for r in runs
  ]
  return {"data": data}
