import json
import logging
import time

from openai import OpenAI

from app.services.credential_service import CredentialService
from app.services.llm.base import AIModel, BaseLLMProvider, LLMResponse

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


class OpenAIProvider(BaseLLMProvider):
  provider_id = "openai"

  MODELS = [
    AIModel("gpt-4o-mini", "GPT-4o Mini", "openai", "Fast, cost-effective scoring and recommendations", True),
    AIModel("gpt-4o", "GPT-4o", "openai", "Highest quality analysis for complex profiles", True),
    AIModel("gpt-4.1-mini", "GPT-4.1 Mini", "openai", "Balanced speed and reasoning", True),
    AIModel("gpt-4.1", "GPT-4.1", "openai", "Advanced reasoning for enterprise profiles", True),
  ]

  def _api_key(self) -> str:
    return CredentialService.get_api_key(self.provider_id)

  def _client(self) -> OpenAI | None:
    key = self._api_key()
    if not key:
      return None
    return OpenAI(api_key=key)

  def is_available(self) -> bool:
    key = self._api_key()
    if not key:
      return False
    from app.services.ai_config_service import AIConfigService
    cached = AIConfigService._validation_cache.get("openai")
    if cached:
      return cached.valid
    ok, _ = AIConfigService.validate_key_format("openai", key)
    return ok

  def list_models(self) -> list[AIModel]:
    available = self.is_available()
    return [AIModel(m.id, m.name, m.provider, m.description, available) for m in self.MODELS]

  def complete_json(self, model: str, system: str, user: str, temperature: float = 0.3) -> LLMResponse:
    client = self._client()
    if not client:
      raise RuntimeError("OpenAI API key not configured")

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
      try:
        response = client.chat.completions.create(
          model=model,
          temperature=temperature,
          response_format={"type": "json_object"},
          messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
          ],
        )
        content = response.choices[0].message.content or "{}"
        json.loads(content)
        tokens = response.usage.total_tokens if response.usage else 0
        used_model = response.model or model
        return LLMResponse(content=content, tokens_used=tokens, model=used_model, provider=self.provider_id)
      except Exception as exc:
        last_error = exc
        wait = 2 ** attempt
        logger.warning("OpenAI request failed (attempt %s/%s): %s", attempt + 1, MAX_RETRIES, exc)
        if attempt < MAX_RETRIES - 1:
          time.sleep(wait)

    raise RuntimeError(f"OpenAI request failed after {MAX_RETRIES} attempts: {last_error}")
