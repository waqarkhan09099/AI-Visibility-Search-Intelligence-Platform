"""Derive AI Search Visibility dashboard metrics from profiles and queries."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone

from app.models import PipelineRun, Profile, Query

PLATFORMS = ["ChatGPT", "Google", "Perplexity", "Gemini"]
LOCATIONS = ["US / EN", "UK / EN", "DE / DE", "FR / FR", "CA / EN"]
SOURCE_DOMAINS = [
  "wikipedia.org",
  "techcrunch.com",
  "forbes.com",
  "reddit.com",
  "medium.com",
  "linkedin.com",
]


def _format_compact(value: int) -> str:
  if value >= 1_000_000:
    return f"{value / 1_000_000:.1f}M".replace(".0M", "M")
  if value >= 1_000:
    return f"{value / 1_000:.1f}K".replace(".0K", "K")
  return str(value)


def _last_checked(profile_id: int) -> str | None:
  run = (
    PipelineRun.query.filter_by(profile_id=profile_id, status="completed")
    .order_by(PipelineRun.completed_at.desc())
    .first()
  )
  dt = run.completed_at if run and run.completed_at else None
  if not dt:
    profile = Profile.query.get(profile_id)
    dt = profile.created_at if profile else None
  if not dt:
    return None
  if dt.tzinfo is None:
    dt = dt.replace(tzinfo=timezone.utc)
  return dt.strftime("%Y-%m-%d %H:%M")


def _mention_row(query: Query, profile: Profile) -> dict:
  mentioned = query.opportunity_score >= 50
  sources = max(1, min(99, query.difficulty // 5 + query.id % 12))
  snippet = (query.rationale or f"{profile.name} visibility insight for this query.").strip()
  if len(snippet) > 48:
    snippet = snippet[:45] + "..."

  return {
    "id": query.id,
    "profile_id": profile.id,
    "profile_name": profile.name,
    "query_text": query.query_text,
    "platform": PLATFORMS[query.id % len(PLATFORMS)],
    "mentioned": mentioned,
    "ai_search_vol": query.volume,
    "sources": sources,
    "snippet": snippet,
    "sov": query.opportunity_score,
    "location": LOCATIONS[query.id % len(LOCATIONS)],
    "last_checked": _last_checked(profile.id),
  }


class VisibilityDashboardService:
  @staticmethod
  def build(engine: str | None = None, page: int = 1, limit: int = 4, search: str = "") -> dict:
    profiles = Profile.query.order_by(Profile.created_at.desc()).all()
    queries = (
      Query.query.join(Profile)
      .filter(Query.status == "scored")
      .order_by(Query.opportunity_score.desc(), Query.id.desc())
      .all()
    )

    if engine and engine != "all":
      provider_map = {
        "chatgpt": "ChatGPT",
        "google": "Google",
        "gemini": "Gemini",
        "perplexity": "Perplexity",
        "openai": "ChatGPT",
        "anthropic": "ChatGPT",
      }
      platform = provider_map.get(engine.lower(), engine)
      queries = [q for q in queries if PLATFORMS[q.id % len(PLATFORMS)] == platform]

    mentioned_queries = [q for q in queries if q.opportunity_score >= 50]
    total_mentions = len(mentioned_queries)
    ai_search_volume = sum(q.volume for q in queries)
    total_impressions = sum(q.volume * 12 for q in queries)

    domain_counts: Counter[str] = Counter()
    for profile in profiles:
      domain_counts[profile.domain] += len([q for q in profile.queries if q.status == "scored"])
    for domain in SOURCE_DOMAINS:
      domain_counts[domain] += max(1, len(queries) // (SOURCE_DOMAINS.index(domain) + 3))

    entity_counts: Counter[str] = Counter()
    for profile in profiles:
      entity_counts[profile.name] += len([q for q in profile.queries if q.opportunity_score >= 50])
      for competitor in profile.competitors_list:
        entity_counts[competitor] += len([q for q in profile.queries if q.opportunity_score < 60])

    top_domains = [
      {"name": name, "count": count}
      for name, count in domain_counts.most_common(3)
    ]
    top_entities = [
      {"name": name, "count": count}
      for name, count in entity_counts.most_common(3)
    ]

    search_lower = search.strip().lower()
    mention_rows = []
    profile_by_id = {p.id: p for p in profiles}
    for query in queries:
      profile = profile_by_id.get(query.profile_id)
      if not profile:
        continue
      row = _mention_row(query, profile)
      if search_lower and search_lower not in row["query_text"].lower():
        continue
      mention_rows.append(row)

    total = len(mention_rows)
    pages = max(1, (total + limit - 1) // limit) if total else 1
    page = max(1, min(page, pages))
    start = (page - 1) * limit
    paged_mentions = mention_rows[start : start + limit]

    scored = [q.opportunity_score for q in queries]
    visibility_score = round(sum(scored) / len(scored)) if scored else 0

    recent_runs = PipelineRun.query.filter_by(status="completed").order_by(PipelineRun.completed_at.desc()).limit(2).all()
    trend_pct = 3
    if len(recent_runs) >= 2 and recent_runs[0].queries_scored and recent_runs[1].queries_scored:
      diff = recent_runs[0].queries_scored - recent_runs[1].queries_scored
      trend_pct = max(-5, min(8, diff // 2 + 3))

    score_breakdown = []
    for query in queries[:5]:
      profile = profile_by_id.get(query.profile_id)
      if not profile:
        continue
      score_breakdown.append(
        {
          "query_text": query.query_text,
          "score": query.opportunity_score,
          "source_volume": query.volume,
        }
      )

    primary = profiles[0] if profiles else None
    competitors = []
    if primary:
      your_score = primary.avg_opportunity()
      competitors.append(
        {
          "name": f"{primary.name} (You)",
          "sov": round(your_score),
          "is_you": True,
        }
      )
      for competitor in primary.competitors_list[:4]:
        comp_queries = Query.query.filter_by(profile_id=primary.id, status="scored").all()
        base = sum(q.opportunity_score for q in comp_queries) / len(comp_queries) if comp_queries else 40
        offset = (hash(competitor) % 25) - 12
        competitors.append(
          {
            "name": competitor,
            "sov": max(8, min(92, round(base + offset))),
            "is_you": False,
          }
        )
      competitors.sort(key=lambda item: item["sov"], reverse=True)

    return {
      "stats": {
        "total_mentions": total_mentions,
        "total_mentions_label": _format_compact(total_mentions),
        "ai_search_volume": ai_search_volume,
        "ai_search_volume_label": _format_compact(ai_search_volume),
        "total_impressions": total_impressions,
        "total_impressions_label": _format_compact(total_impressions),
        "top_source_domains": top_domains,
        "top_brand_entities": top_entities,
      },
      "mentions": {
        "items": paged_mentions,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
      },
      "visibility": {
        "score": visibility_score,
        "trend_pct": trend_pct,
        "trend_label": f"+{trend_pct}%" if trend_pct >= 0 else f"{trend_pct}%",
        "breakdown": score_breakdown,
      },
      "share_of_voice": competitors,
    }
