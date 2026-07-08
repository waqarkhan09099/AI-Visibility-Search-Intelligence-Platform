from flask import Blueprint, request

from app.models import PipelineRun, Profile, Query
from app.schemas.profile import ProfileSchema
from app.services.visibility_dashboard_service import VisibilityDashboardService

dashboard_bp = Blueprint("dashboard", __name__)
profile_schema = ProfileSchema(many=True)


@dashboard_bp.route("/dashboard", methods=["GET"])
def get_dashboard():
  page = request.args.get("page", 1, type=int)
  limit = request.args.get("limit", 4, type=int)
  search = request.args.get("search", "", type=str)
  engine = request.args.get("engine", "all", type=str)

  profiles = Profile.query.order_by(Profile.created_at.desc()).all()
  total_queries = Query.query.count()
  scored = [q.opportunity_score for q in Query.query.filter_by(status="scored").all()]
  avg_opp = round(sum(scored) / len(scored), 1) if scored else 0.0

  running = PipelineRun.query.filter_by(status="running").count()
  pipeline_status = "running" if running else "idle"

  visibility = VisibilityDashboardService.build(
    engine=engine,
    page=page,
    limit=limit,
    search=search,
  )

  return {
    "data": {
      "total_profiles": len(profiles),
      "average_opportunity": avg_opp,
      "total_queries": total_queries,
      "pipeline_status": pipeline_status,
      "recent_profiles": profile_schema.dump(profiles[:6]),
      **visibility,
    }
  }


@dashboard_bp.route("/charts/opportunity", methods=["GET"])
def global_opportunity_chart():
  buckets = {f"{i}-{i+9}": 0 for i in range(0, 100, 10)}
  queries = Query.query.filter_by(status="scored").all()
  for q in queries:
    bucket_start = min(90, (q.opportunity_score // 10) * 10)
    key = f"{bucket_start}-{bucket_start + 9}"
    buckets[key] += 1
  data = [{"range": k, "count": v} for k, v in buckets.items()]
  return {"data": data}
