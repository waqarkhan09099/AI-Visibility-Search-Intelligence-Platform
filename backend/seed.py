"""Seed demo data for the AI Visibility Intelligence Platform."""

import argparse
import random
import sys

from app import create_app
from app.extensions import db
from app.models import PipelineRun, Profile, Query, Recommendation
from app.services.ai_pipeline_service import AIPipelineService

SAMPLE_QUERIES = [
  "best ai visibility tools",
  "how to rank in ai search",
  "generative engine optimization guide",
  "ai seo strategy 2026",
  "brand visibility in chatgpt",
  "llm citation optimization",
  "ai content discovery tips",
  "semantic search optimization",
]


def _seed_profiles(use_ai: bool = False):
  profiles_data = [
    {
      "name": "Acme SaaS",
      "domain": "acme-saas.com",
      "industry": "B2B Software",
      "description": "Enterprise workflow automation platform",
      "competitors": ["Zapier", "Make", "n8n"],
    },
    {
      "name": "GreenLeaf Health",
      "domain": "greenleaf.health",
      "industry": "Healthcare",
      "description": "Digital health and wellness solutions",
      "competitors": ["Headspace", "Calm"],
    },
    {
      "name": "NovaRetail",
      "domain": "novaretail.io",
      "industry": "E-commerce",
      "description": "AI-powered retail analytics",
      "competitors": ["Shopify", "BigCommerce"],
    },
  ]

  for pdata in profiles_data:
    profile = Profile(
      name=pdata["name"],
      domain=pdata["domain"],
      industry=pdata["industry"],
      description=pdata["description"],
      run_status="idle",
      preferred_model="gpt-4o-mini",
      preferred_provider="openai",
    )
    profile.competitors_list = pdata["competitors"]
    db.session.add(profile)
    db.session.flush()

    if use_ai:
      for text in AIPipelineService.generate_initial_queries(profile):
        db.session.add(Query(profile_id=profile.id, query_text=text, status="pending"))
      db.session.commit()
      print(f"Running AI pipeline for {profile.name}...")
      AIPipelineService.start_pipeline(profile.id)
      continue

    for text in SAMPLE_QUERIES:
      db.session.add(Query(profile_id=profile.id, query_text=text, status="pending"))

    db.session.flush()
    queries = Query.query.filter_by(profile_id=profile.id).all()
    for q in queries:
      q.volume = random.randint(500, 8000)
      q.difficulty = random.randint(20, 80)
      q.opportunity_score = max(0, min(100, 100 - q.difficulty + random.randint(-5, 15)))
      q.rationale = "Demo seed score — run pipeline for real AI analysis."
      q.status = "scored"

    run = PipelineRun(
      profile_id=profile.id,
      status="completed",
      stage="completed",
      model_id="gpt-4o-mini",
      provider="openai",
      queries_scored=len(queries),
      tokens_used=random.randint(3000, 8000),
      total_queries=len(queries),
    )
    profile.run_status = "completed"
    db.session.add(run)

    for tmpl in [
      {
        "title": f"Optimize {pdata['industry']} content hub",
        "content_type": "Blog Post",
        "priority": "high",
        "rationale": "Strong opportunity in informational queries.",
        "keywords": ["guide", "strategy", pdata["industry"].lower()],
      },
      {
        "title": "Build competitor comparison page",
        "content_type": "Landing Page",
        "priority": "medium",
        "rationale": "Commercial intent with moderate difficulty.",
        "keywords": ["vs", "alternatives"],
      },
      {
        "title": "Add structured FAQ content",
        "content_type": "Technical SEO",
        "priority": "low",
        "rationale": "Quick wins via schema markup.",
        "keywords": ["faq", "schema"],
      },
    ]:
      rec = Recommendation(
        profile_id=profile.id,
        title=tmpl["title"],
        content_type=tmpl["content_type"],
        priority=tmpl["priority"],
        rationale=tmpl["rationale"],
      )
      rec.keywords_list = tmpl["keywords"]
      db.session.add(rec)

  db.session.commit()


def seed_if_empty(use_ai: bool = False):
  """Seed demo data only when the database has no profiles (safe for cloud deploy)."""
  if Profile.query.count() > 0:
    return
  _seed_profiles(use_ai=use_ai)


def seed_demo(use_ai: bool = False):
  app = create_app()
  with app.app_context():
    db.drop_all()
    db.create_all()
    _seed_profiles(use_ai=use_ai)

    if use_ai:
      print("Seed complete: 3 profiles created — AI pipelines started in background.")
      print("Wait ~30-60s per profile for pipelines to complete.")
    else:
      print("Seed complete: 3 profiles with demo queries and recommendations.")
      print("Use --use-ai flag to seed with real LLM pipeline (requires API key in Settings).")


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Seed the AI Visibility database")
  parser.add_argument("--use-ai", action="store_true", help="Run real AI pipeline for each profile")
  args = parser.parse_args()
  seed_demo(use_ai=args.use_ai)
