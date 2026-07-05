import json
import logging
import threading

from app.extensions import db
from app.models import PipelineRun, Profile, Query, Recommendation
from app.models.profile import utcnow
from app.services.llm.model_service import resolve_model

logger = logging.getLogger(__name__)

QUERY_GEN_SYSTEM = """You are an AI Visibility Intelligence analyst.
Generate realistic search queries users would ask AI assistants (ChatGPT, Perplexity, etc.)
about a brand's industry, products, and competitors.
Return JSON: {"queries": ["query1", "query2", ...]}
Generate 8-12 diverse queries mixing informational, commercial, and comparison intent."""

SCORE_SYSTEM = """You are an AI Visibility scoring engine.
Estimate search volume (100-10000), SEO/AI difficulty (0-100), and opportunity_score (0-100)
for how valuable it is for the brand to rank in AI-generated answers.
Higher opportunity = high volume + lower difficulty + strong brand fit.
Return JSON: {"volume": int, "difficulty": int, "opportunity_score": int, "rationale": string}"""

RECOMMEND_SYSTEM = """You are a content strategy AI for AI Visibility (GEO/LLM SEO).
Given scored queries for a brand profile, produce content recommendations.
Return JSON: {"recommendations": [{"title": str, "content_type": str, "priority": "high"|"medium"|"low", "rationale": str, "keywords": [str]}]}
Produce 3-6 recommendations prioritized by opportunity gaps."""


class AIPipelineService:
  _locks: dict[int, threading.Lock] = {}

  @classmethod
  def start_pipeline(cls, profile_id: int, model_id: str | None = None):
    from werkzeug.exceptions import Conflict

    if profile_id not in cls._locks:
      cls._locks[profile_id] = threading.Lock()

    if not cls._locks[profile_id].acquire(blocking=False):
      raise Conflict("Pipeline is already running")

    try:
      profile = Profile.query.get_or_404(profile_id)
      active = PipelineRun.query.filter_by(profile_id=profile_id, status="running").first()
      if active:
        raise Conflict("Pipeline is already running")

      provider, resolved_model = resolve_model(model_id or profile.preferred_model)
      profile.preferred_model = resolved_model
      profile.preferred_provider = provider.provider_id

      queries = Query.query.filter_by(profile_id=profile_id).all()

      run = PipelineRun(
        profile_id=profile_id,
        status="running",
        stage="initializing",
        model_id=resolved_model,
        provider=provider.provider_id,
        total_queries=max(len(queries), 1),
        queries_scored=0,
        tokens_used=0,
      )
      profile.run_status = "running"
      db.session.add(run)
      db.session.commit()

      thread = threading.Thread(
        target=cls._execute_pipeline,
        args=(profile_id, run.id, resolved_model),
        daemon=True,
      )
      thread.start()
      return run
    finally:
      cls._locks[profile_id].release()

  @classmethod
  def _execute_pipeline(cls, profile_id: int, run_id: int, model_id: str):
    from app import create_app

    app = create_app()
    with app.app_context():
      run = PipelineRun.query.get(run_id)
      profile = Profile.query.get(profile_id)
      provider, model = resolve_model(model_id)
      total_tokens = 0

      try:
        # Stage 1: Generate queries if needed
        run.stage = "generating_queries"
        db.session.commit()

        queries = Query.query.filter_by(profile_id=profile_id).all()
        if not queries or all(q.status == "pending" and q.opportunity_score == 0 for q in queries):
          if queries:
            for q in queries:
              db.session.delete(q)
            db.session.commit()

          user_prompt = cls._profile_context(profile)
          resp = provider.complete_json(model, QUERY_GEN_SYSTEM, user_prompt)
          total_tokens += resp.tokens_used
          run.tokens_used = total_tokens
          db.session.commit()

          data = json.loads(resp.content)
          query_texts = data.get("queries", [])[: app.config.get("PIPELINE_MAX_QUERIES", 12)]
          for text in query_texts:
            db.session.add(Query(profile_id=profile_id, query_text=str(text)[:500], status="pending"))
          db.session.commit()
          queries = Query.query.filter_by(profile_id=profile_id).all()

        run.total_queries = len(queries)
        run.stage = "scoring_queries"
        db.session.commit()

        # Stage 2: Score each query
        for i, query in enumerate(queries):
          query.status = "scoring"
          db.session.commit()

          score_prompt = (
            f"{cls._profile_context(profile)}\n\n"
            f"Score this query for AI visibility opportunity:\n\"{query.query_text}\""
          )
          resp = provider.complete_json(model, SCORE_SYSTEM, score_prompt, temperature=0.2)
          total_tokens += resp.tokens_used
          scores = json.loads(resp.content)

          query.volume = int(scores.get("volume", 0))
          query.difficulty = int(scores.get("difficulty", 0))
          query.opportunity_score = int(scores.get("opportunity_score", 0))
          query.rationale = str(scores.get("rationale", ""))[:1000]
          query.status = "scored"

          run.queries_scored = i + 1
          run.tokens_used = total_tokens
          db.session.commit()

        # Stage 3: Generate recommendations
        run.stage = "generating_recommendations"
        db.session.commit()

        scored = Query.query.filter_by(profile_id=profile_id, status="scored").all()
        summary = "\n".join(
          f"- \"{q.query_text}\" (vol={q.volume}, diff={q.difficulty}, opp={q.opportunity_score})"
          for q in sorted(scored, key=lambda x: x.opportunity_score, reverse=True)[:10]
        )
        rec_prompt = f"{cls._profile_context(profile)}\n\nTop scored queries:\n{summary}"
        resp = provider.complete_json(model, RECOMMEND_SYSTEM, rec_prompt, temperature=0.4)
        total_tokens += resp.tokens_used
        recs_data = json.loads(resp.content).get("recommendations", [])

        Recommendation.query.filter_by(profile_id=profile_id).delete()
        for rec in recs_data:
          item = Recommendation(
            profile_id=profile_id,
            title=str(rec.get("title", "Untitled"))[:255],
            content_type=str(rec.get("content_type", "Blog Post"))[:80],
            priority=str(rec.get("priority", "medium")).lower(),
            rationale=str(rec.get("rationale", "")),
          )
          if item.priority not in ("high", "medium", "low"):
            item.priority = "medium"
          item.keywords_list = rec.get("keywords", [])
          db.session.add(item)

        run.status = "completed"
        run.stage = "completed"
        run.completed_at = utcnow()
        run.tokens_used = total_tokens
        profile.run_status = "completed"
        db.session.commit()
        logger.info("Pipeline %s completed for profile %s (tokens=%s)", run_id, profile_id, total_tokens)

      except Exception as exc:
        logger.exception("Pipeline %s failed for profile %s", run_id, profile_id)
        run.status = "failed"
        run.stage = "failed"
        run.error_message = str(exc)[:500]
        profile.run_status = "failed"
        db.session.commit()

  @classmethod
  def _profile_context(cls, profile: Profile) -> str:
    competitors = ", ".join(profile.competitors_list) or "none listed"
    return (
      f"Brand: {profile.name}\n"
      f"Domain: {profile.domain}\n"
      f"Industry: {profile.industry}\n"
      f"Description: {profile.description or 'N/A'}\n"
      f"Competitors: {competitors}"
    )

  @classmethod
  def recheck_query(cls, profile_id: int, query_id: int, model_id: str | None = None):
    query = Query.query.filter_by(id=query_id, profile_id=profile_id).first_or_404()
    profile = Profile.query.get_or_404(profile_id)
    resolved_model = model_id or profile.preferred_model

    query.status = "rechecking"
    db.session.commit()

    def _recheck():
      from app import create_app

      app = create_app()
      with app.app_context():
        q = Query.query.get(query_id)
        p = Profile.query.get(profile_id)
        provider, model = resolve_model(resolved_model)
        try:
          prompt = (
            f"{cls._profile_context(p)}\n\n"
            f"Re-evaluate AI visibility opportunity for:\n\"{q.query_text}\"\n"
            f"Previous scores: volume={q.volume}, difficulty={q.difficulty}, opportunity={q.opportunity_score}"
          )
          resp = provider.complete_json(model, SCORE_SYSTEM, prompt, temperature=0.2)
          scores = json.loads(resp.content)
          q.volume = int(scores.get("volume", q.volume))
          q.difficulty = int(scores.get("difficulty", q.difficulty))
          q.opportunity_score = int(scores.get("opportunity_score", q.opportunity_score))
          q.rationale = str(scores.get("rationale", q.rationale or ""))[:1000]
          q.status = "scored"
          db.session.commit()
        except Exception:
          q.status = "scored"
          db.session.commit()

    threading.Thread(target=_recheck, daemon=True).start()
    return query

  @classmethod
  def generate_initial_queries(cls, profile: Profile, model_id: str | None = None):
    """Generate seed queries on profile creation using AI."""
    provider, model = resolve_model(model_id)
    try:
      resp = provider.complete_json(model, QUERY_GEN_SYSTEM, cls._profile_context(profile))
      data = json.loads(resp.content)
      texts = data.get("queries", [])[:8]
      if not texts:
        raise ValueError("No queries returned")
      return [str(t)[:500] for t in texts]
    except Exception:
      return [
        f"what is {profile.name}",
        f"{profile.industry} trends 2026",
        f"best {profile.industry} solutions",
        f"{profile.domain} alternatives",
        f"how to improve {profile.industry} visibility in AI search",
      ]
