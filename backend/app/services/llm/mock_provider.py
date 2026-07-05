import json
import logging
import random
import re

from app.services.llm.base import AIModel, BaseLLMProvider, LLMResponse

logger = logging.getLogger(__name__)


def _parse_profile_context(user: str) -> dict:
  """Extract brand context from pipeline prompts."""
  ctx = {"brand": "the brand", "industry": "the industry", "domain": "", "competitors": []}
  for line in user.splitlines():
    lower = line.lower().strip()
    if lower.startswith("brand:"):
      ctx["brand"] = line.split(":", 1)[1].strip()
    elif lower.startswith("industry:"):
      ctx["industry"] = line.split(":", 1)[1].strip()
    elif lower.startswith("domain:"):
      ctx["domain"] = line.split(":", 1)[1].strip()
    elif lower.startswith("competitors:"):
      comps = line.split(":", 1)[1].strip()
      ctx["competitors"] = [c.strip() for c in comps.split(",") if c.strip()]
  return ctx


class MockLLMProvider(BaseLLMProvider):
  provider_id = "mock"

  MODELS = [
    AIModel("mock-fast", "Mock Fast (no API key)", "mock", "Deterministic simulation for local dev", True),
    AIModel("mock-quality", "Mock Quality (no API key)", "mock", "Higher-quality simulation heuristics", True),
  ]

  def is_available(self) -> bool:
    return True

  def list_models(self) -> list[AIModel]:
    return self.MODELS

  def complete_json(self, model: str, system: str, user: str, temperature: float = 0.3) -> LLMResponse:
    seed = hash(user + system) % 10000
    rng = random.Random(seed)
    ctx = _parse_profile_context(user)
    brand = ctx["brand"]
    industry = ctx["industry"]

    if "search queries" in system.lower() or ("generate" in system.lower() and "queries" in system.lower()):
      competitors = ctx["competitors"][:2]
      comp_text = f" vs {competitors[0]}" if competitors else ""
      payload = {
        "queries": [
          f"what is {brand}",
          f"best {industry} tools 2026",
          f"{brand} alternatives{comp_text}",
          f"how to improve {industry} visibility in AI search",
          f"{brand} reviews and pricing",
          f"top {industry} solutions for enterprises",
          f"generative engine optimization for {industry}",
          f"is {brand} worth it",
        ][: rng.randint(6, 8)],
      }
    elif "score" in system.lower() or "volume" in system.lower():
      vol = rng.randint(500, 9000)
      diff = rng.randint(15, 85)
      opp = max(0, min(100, 100 - diff + rng.randint(-8, 18)))
      query_match = re.search(r'"([^"]+)"', user)
      query_text = query_match.group(1) if query_match else "query"
      payload = {
        "volume": vol,
        "difficulty": diff,
        "opportunity_score": opp,
        "rationale": f"Moderate AI visibility opportunity for '{query_text}' in {industry}.",
      }
    elif "recommendation" in system.lower():
      payload = {
        "recommendations": [
          {
            "title": f"Build {industry} AI visibility content hub for {brand}",
            "content_type": "Blog Post",
            "priority": "high",
            "rationale": f"High-opportunity informational queries for {brand} indicate content gaps.",
            "keywords": ["ai visibility", industry.lower(), brand.lower()],
          },
          {
            "title": f"Create {brand} competitor comparison page",
            "content_type": "Landing Page",
            "priority": "medium",
            "rationale": "Commercial-intent queries with moderate difficulty.",
            "keywords": ["alternatives", "vs", "comparison"],
          },
          {
            "title": "Add FAQ schema for top AI search queries",
            "content_type": "Technical SEO",
            "priority": "low",
            "rationale": "Quick structured-data wins for long-tail queries.",
            "keywords": ["faq", "schema", "structured data"],
          },
        ]
      }
    else:
      payload = {"result": "ok"}

    tokens = rng.randint(180, 650)
    return LLMResponse(
      content=json.dumps(payload),
      tokens_used=tokens,
      model=model,
      provider=self.provider_id,
    )
