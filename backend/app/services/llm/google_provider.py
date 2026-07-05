import json
import logging
import time

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError, Unauthenticated

from app.services.credential_service import CredentialService
from app.services.llm.base import AIModel, BaseLLMProvider, LLMResponse
from app.services.llm.json_utils import extract_json_object

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


class GoogleProvider(BaseLLMProvider):
  provider_id = "google"

  MODELS = [
    AIModel("gemini-2.0-flash", "Gemini 2.0 Flash", "google", "Fast multimodal analysis", True),
    AIModel("gemini-1.5-pro", "Gemini 1.5 Pro", "google", "High-quality long-context reasoning", True),
    AIModel("gemini-1.5-flash", "Gemini 1.5 Flash", "google", "Quick responses at lower cost", True),
  ]

  def _api_key(self) -> str:
    return CredentialService.get_api_key(self.provider_id)

  def is_available(self) -> bool:
    key = self._api_key()
    if not key:
      return False
    from app.services.ai_config_service import AIConfigService
    cached = AIConfigService._validation_cache.get("google")
    if cached:
      return cached.valid
    ok, _ = AIConfigService.validate_key_format("google", key)
    return ok

  def list_models(self) -> list[AIModel]:
    available = self.is_available()
    return [AIModel(m.id, m.name, m.provider, m.description, available) for m in self.MODELS]

  def complete_json(self, model: str, system: str, user: str, temperature: float = 0.3) -> LLMResponse:
    key = self._api_key()
    if not key:
      raise RuntimeError("Google API key not configured")

    genai.configure(api_key=key)
    gemini = genai.GenerativeModel(
      model_name=model,
      system_instruction=system,
      generation_config=genai.GenerationConfig(temperature=temperature, response_mime_type="application/json"),
    )

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
      try:
        response = gemini.generate_content(user)
        content = response.text or "{}"
        extract_json_object(content)
        tokens = getattr(response.usage_metadata, "total_token_count", 0) or 0
        return LLMResponse(content=content, tokens_used=int(tokens), model=model, provider=self.provider_id)
      except (Unauthenticated, GoogleAPIError, json.JSONDecodeError, ValueError) as exc:
        last_error = exc
        wait = 2 ** attempt
        logger.warning("Google request failed (attempt %s/%s): %s", attempt + 1, MAX_RETRIES, exc)
        if attempt < MAX_RETRIES - 1:
          time.sleep(wait)

    raise RuntimeError(f"Google request failed after {MAX_RETRIES} attempts: {last_error}")
