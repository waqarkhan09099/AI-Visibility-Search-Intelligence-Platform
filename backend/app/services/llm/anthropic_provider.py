import json
import logging
import time

from anthropic import Anthropic, AuthenticationError as AnthropicAuthError, APIError as AnthropicAPIError

from app.services.credential_service import CredentialService
from app.services.llm.base import AIModel, BaseLLMProvider, LLMResponse
from app.services.llm.json_utils import extract_json_object

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


class AnthropicProvider(BaseLLMProvider):
  provider_id = "anthropic"

  MODELS = [
    AIModel("claude-3-5-haiku-latest", "Claude 3.5 Haiku", "anthropic", "Fast and affordable", True),
    AIModel("claude-3-5-sonnet-latest", "Claude 3.5 Sonnet", "anthropic", "Best balance of speed and quality", True),
    AIModel("claude-3-opus-latest", "Claude 3 Opus", "anthropic", "Maximum capability", True),
  ]

  def _api_key(self) -> str:
    return CredentialService.get_api_key(self.provider_id)

  def _client(self) -> Anthropic | None:
    key = self._api_key()
    if not key:
      return None
    return Anthropic(api_key=key)

  def is_available(self) -> bool:
    key = self._api_key()
    if not key:
      return False
    from app.services.ai_config_service import AIConfigService
    cached = AIConfigService._validation_cache.get("anthropic")
    if cached:
      return cached.valid
    ok, _ = AIConfigService.validate_key_format("anthropic", key)
    return ok

  def list_models(self) -> list[AIModel]:
    available = self.is_available()
    return [AIModel(m.id, m.name, m.provider, m.description, available) for m in self.MODELS]

  def complete_json(self, model: str, system: str, user: str, temperature: float = 0.3) -> LLMResponse:
    client = self._client()
    if not client:
      raise RuntimeError("Anthropic API key not configured")

    prompt = f"{user}\n\nRespond with valid JSON only — no markdown or extra text."
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
      try:
        response = client.messages.create(
          model=model,
          max_tokens=4096,
          temperature=temperature,
          system=system,
          messages=[{"role": "user", "content": prompt}],
        )
        content = "".join(block.text for block in response.content if hasattr(block, "text"))
        extract_json_object(content)
        tokens = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)
        return LLMResponse(content=content, tokens_used=tokens, model=model, provider=self.provider_id)
      except (AnthropicAuthError, AnthropicAPIError, json.JSONDecodeError) as exc:
        last_error = exc
        wait = 2 ** attempt
        logger.warning("Anthropic request failed (attempt %s/%s): %s", attempt + 1, MAX_RETRIES, exc)
        if attempt < MAX_RETRIES - 1:
          time.sleep(wait)

    raise RuntimeError(f"Anthropic request failed after {MAX_RETRIES} attempts: {last_error}")
