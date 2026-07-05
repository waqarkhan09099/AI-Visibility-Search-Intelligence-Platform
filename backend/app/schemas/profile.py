import re

from marshmallow import Schema, ValidationError, fields, validate


DOMAIN_RE = re.compile(
  r"^(?:https?://)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)


def _validate_domain(value: str):
  if not DOMAIN_RE.match(value.strip()):
    raise ValidationError("Invalid domain format")


class ProfileCreateSchema(Schema):
  name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
  domain = fields.Str(required=True, validate=_validate_domain)
  industry = fields.Str(required=True, validate=validate.Length(min=1, max=120))
  description = fields.Str(load_default="", validate=validate.Length(max=500))
  competitors = fields.List(
    fields.Str(validate=validate.Length(min=1, max=100)),
    load_default=list,
    validate=validate.Length(max=10),
  )
  preferred_model = fields.Str(load_default="gpt-4o-mini", validate=validate.Length(max=80))


class ProfileSchema(Schema):
  id = fields.Int(dump_only=True)
  name = fields.Str()
  domain = fields.Str()
  industry = fields.Str()
  description = fields.Str()
  competitors = fields.Method("get_competitors")
  run_status = fields.Str()
  avg_opportunity = fields.Method("get_avg_opportunity")
  preferred_model = fields.Str()
  preferred_provider = fields.Str()
  created_at = fields.DateTime()

  def get_competitors(self, obj):
    return obj.competitors_list

  def get_avg_opportunity(self, obj):
    return obj.avg_opportunity()


class ProfileDetailSchema(ProfileSchema):
  stats = fields.Method("get_stats")

  def get_stats(self, obj):
    runs = sorted(obj.pipeline_runs, key=lambda r: r.started_at, reverse=True)
    last_run = runs[0] if runs else None
    return {
      "total_queries": len(obj.queries),
      "avg_opportunity": obj.avg_opportunity(),
      "last_run_at": last_run.started_at.isoformat() if last_run else None,
      "tokens_used": last_run.tokens_used if last_run and last_run.status == "completed" else 0,
    }


class QuerySchema(Schema):
  id = fields.Int()
  query_text = fields.Str(attribute="query_text")
  volume = fields.Int()
  difficulty = fields.Int()
  opportunity_score = fields.Int()
  rationale = fields.Str(allow_none=True)
  status = fields.Str()


class RecommendationSchema(Schema):
  id = fields.Int()
  title = fields.Str()
  content_type = fields.Str()
  priority = fields.Str()
  rationale = fields.Str()
  keywords = fields.Method("get_keywords")

  def get_keywords(self, obj):
    return obj.keywords_list


class ProfileUpdateSchema(Schema):
  preferred_model = fields.Str(validate=validate.Length(min=1, max=80))
  preferred_provider = fields.Str(validate=validate.Length(min=1, max=40))


class PipelineRunSchema(Schema):
  id = fields.Int()
  status = fields.Str()
  stage = fields.Str()
  model_id = fields.Str()
  provider = fields.Str()
  error_message = fields.Str(allow_none=True)
  started_at = fields.DateTime()
  completed_at = fields.DateTime(allow_none=True)
  queries_scored = fields.Int()
  tokens_used = fields.Int()
  progress_pct = fields.Method("get_progress")

  def get_progress(self, obj):
    return obj.progress_pct


class PipelineRunRequestSchema(Schema):
  model_id = fields.Str(load_default=None, allow_none=True)


class PipelineStatusSchema(Schema):
  status = fields.Str()
  stage = fields.Str(allow_none=True)
  model_id = fields.Str(allow_none=True)
  provider = fields.Str(allow_none=True)
  error_message = fields.Str(allow_none=True)
  queries_scored = fields.Int()
  tokens_used = fields.Int()
  progress_pct = fields.Int()
  run_id = fields.Int(allow_none=True)
