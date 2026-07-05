import logging

from flask import current_app
from marshmallow import ValidationError

from app.services.llm.anthropic_provider import AnthropicProvider
from app.services.llm.base import AIModel, BaseLLMProvider
from app.services.llm.google_provider import GoogleProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

LIVE_PROVIDER_ORDER = ["openai", "anthropic", "google"]

_PROVIDERS: dict[str, BaseLLMProvider] = {
  "openai": OpenAIProvider(),
  "anthropic": AnthropicProvider(),
  "google": GoogleProvider(),
  "mock": MockLLMProvider(),
}


class AIModelService:
  """Central service for AI model discovery, validation, and provider resolution."""

  @staticmethod
  def get_provider(provider_id: str) -> BaseLLMProvider:
    return _PROVIDERS.get(provider_id, MockLLMProvider())

  @staticmethod
  def list_models() -> list[AIModel]:
    models: list[AIModel] = []
    for provider_id in LIVE_PROVIDER_ORDER + ["mock"]:
      provider = _PROVIDERS.get(provider_id)
      if provider:
        models.extend(provider.list_models())
    return models

  @staticmethod
  def get_status() -> dict:
    from app.services.ai_config_service import AIConfigService

    AIConfigService.validate_all(live=False, use_cache=True)
    payload = AIConfigService.to_api_payload(live=False)
    return payload["summary"]

  @staticmethod
  def get_catalog() -> dict:
    return {
      "models": AIModelService.list_models(),
      "status": AIModelService.get_status(),
    }

  @staticmethod
  def find_model(model_id: str) -> AIModel | None:
    return next((m for m in AIModelService.list_models() if m.id == model_id), None)

  @staticmethod
  def validate_model_id(model_id: str | None) -> str:
    if not model_id:
      return current_app.config.get("DEFAULT_AI_MODEL", "gpt-4o-mini")

    model = AIModelService.find_model(model_id)
    if not model:
      raise ValidationError(f"Unknown model: {model_id}")

    if not model.available:
      from app.services.ai_config_service import AIConfigService

      provider_status = AIConfigService.validate_provider(model.provider, live=False)
      name = provider_status.name
      if not provider_status.configured:
        raise ValidationError(f"{name} API key is not configured. Add your key in Settings → AI Configuration.")
      if not provider_status.valid:
        raise ValidationError(f"{name} API key is invalid: {provider_status.message}")
      raise ValidationError(f"Model '{model_id}' is not available")

    return model_id

  @staticmethod
  def _first_available_live() -> tuple[BaseLLMProvider, str] | None:
    for provider_id in LIVE_PROVIDER_ORDER:
      provider = _PROVIDERS[provider_id]
      if provider.is_available():
        models = [m for m in provider.list_models() if m.available]
        if models:
          return provider, models[0].id
    return None

  @staticmethod
  def resolve_model(model_id: str | None) -> tuple[BaseLLMProvider, str]:
    default_model = current_app.config.get("DEFAULT_AI_MODEL", "gpt-4o-mini")
    chosen = model_id or default_model

    if chosen.startswith("mock"):
      mock_model = chosen if AIModelService.find_model(chosen) else "mock-fast"
      logger.info("Using mock provider model=%s", mock_model)
      return _PROVIDERS["mock"], mock_model

    model = AIModelService.find_model(chosen)
    if model and model.provider != "mock":
      provider = _PROVIDERS.get(model.provider)
      if provider and provider.is_available():
        logger.info("Using %s provider model=%s", model.provider, chosen)
        return provider, chosen

    live = AIModelService._first_available_live()
    if live:
      provider, resolved = live
      logger.warning("Model %s unavailable — using %s/%s", chosen, provider.provider_id, resolved)
      return provider, resolved

    logger.warning("No live provider available — using mock (requested model=%s)", chosen)
    return _PROVIDERS["mock"], "mock-fast"


def get_provider(provider_id: str) -> BaseLLMProvider:
  return AIModelService.get_provider(provider_id)


def list_all_models() -> list[AIModel]:
  return AIModelService.list_models()


def resolve_model(model_id: str | None) -> tuple[BaseLLMProvider, str]:
  return AIModelService.resolve_model(model_id)


def get_ai_status() -> dict:
  return AIModelService.get_status()
