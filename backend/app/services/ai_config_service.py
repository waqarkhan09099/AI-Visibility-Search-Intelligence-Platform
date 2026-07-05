import json
import logging
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from flask import current_app

logger = logging.getLogger(__name__)

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"
PROVIDERS_CONFIG_PATH = CONFIG_DIR / "ai.providers.json"


class ProviderValidationStatus(str, Enum):
  VALID = "valid"
  MISSING = "missing"
  INVALID_FORMAT = "invalid_format"
  INVALID_CREDENTIALS = "invalid_credentials"
  NETWORK_ERROR = "network_error"
  MOCK = "mock"


@dataclass
class ProviderValidationResult:
  provider_id: str
  name: str
  status: ProviderValidationStatus
  message: str
  configured: bool
  valid: bool
  key_hint: str | None
  stored_in_app: bool
  models_count: int = 0
  description: str = ""
  key_placeholder: str = ""
  docs_url: str = ""


class AIConfigService:
  """Loads provider config and validates API keys from secure storage."""

  _cached_config: dict | None = None
  _validation_cache: dict[str, ProviderValidationResult] = {}

  @classmethod
  def load_providers_config(cls) -> dict:
    if cls._cached_config is not None:
      return cls._cached_config
    if not PROVIDERS_CONFIG_PATH.exists():
      cls._cached_config = {"providers": {}, "credential_providers": []}
      return cls._cached_config
    with open(PROVIDERS_CONFIG_PATH, encoding="utf-8") as f:
      cls._cached_config = json.load(f)
    return cls._cached_config

  @classmethod
  def credential_provider_ids(cls) -> list[str]:
    cfg = cls.load_providers_config()
    return cfg.get("credential_providers") or [
      pid for pid, p in cfg.get("providers", {}).items() if p.get("env_key")
    ]

  @classmethod
  def is_credential_provider(cls, provider_id: str) -> bool:
    return provider_id in cls.credential_provider_ids()

  @classmethod
  def mask_api_key(cls, key: str | None) -> str | None:
    from app.services.credential_vault import CredentialVault
    return CredentialVault.mask_api_key(key)

  @classmethod
  def _get_provider_key(cls, provider_id: str) -> tuple[str, bool]:
    from app.services.credential_service import CredentialService
    stored = CredentialService.has_stored_credential(provider_id)
    key = CredentialService.get_api_key(provider_id)
    return key, stored

  @classmethod
  def validate_key_format(cls, provider_id: str, key: str) -> tuple[bool, str]:
    cfg = cls.load_providers_config()
    provider = cfg.get("providers", {}).get(provider_id)
    if not provider:
      return False, f"Unknown provider: {provider_id}"
    if not key:
      return False, "API key is not set"

    prefixes = provider.get("key_prefixes") or []
    min_len = provider.get("min_key_length", 10)
    provider_name = provider.get("name", provider_id)

    if len(key) < min_len:
      return False, f"Key is too short — expected at least {min_len} characters"

    if prefixes and not any(key.startswith(p) for p in prefixes):
      expected = ", ".join(f"'{p}'" for p in prefixes)
      return False, f"Invalid key format — {provider_name} keys must start with {expected}"

    return True, "Key format looks valid"

  @classmethod
  def validate_openai_credentials(cls, key: str) -> tuple[ProviderValidationStatus, str]:
    from openai import AuthenticationError, OpenAI, OpenAIError

    ok, msg = cls.validate_key_format("openai", key)
    if not ok:
      return ProviderValidationStatus.INVALID_FORMAT, msg
    try:
      client = OpenAI(api_key=key)
      next(iter(client.models.list()), None)
      return ProviderValidationStatus.VALID, "OpenAI API key verified successfully"
    except AuthenticationError:
      return ProviderValidationStatus.INVALID_CREDENTIALS, "Invalid or revoked OpenAI API key"
    except OpenAIError as exc:
      err = str(exc).lower()
      if "connection" in err or "timeout" in err or "network" in err:
        return ProviderValidationStatus.NETWORK_ERROR, f"Could not reach OpenAI: {exc}"
      return ProviderValidationStatus.INVALID_CREDENTIALS, f"OpenAI rejected the key: {exc}"
    except Exception as exc:
      logger.exception("Unexpected error validating OpenAI key")
      return ProviderValidationStatus.NETWORK_ERROR, f"Validation failed: {exc}"

  @classmethod
  def validate_anthropic_credentials(cls, key: str) -> tuple[ProviderValidationStatus, str]:
    from anthropic import Anthropic, AuthenticationError as AnthropicAuthError, APIError as AnthropicAPIError

    ok, msg = cls.validate_key_format("anthropic", key)
    if not ok:
      return ProviderValidationStatus.INVALID_FORMAT, msg
    try:
      client = Anthropic(api_key=key)
      client.messages.create(
        model="claude-3-5-haiku-latest",
        max_tokens=8,
        messages=[{"role": "user", "content": "ping"}],
      )
      return ProviderValidationStatus.VALID, "Anthropic API key verified successfully"
    except AnthropicAuthError:
      return ProviderValidationStatus.INVALID_CREDENTIALS, "Invalid or revoked Anthropic API key"
    except AnthropicAPIError as exc:
      err = str(exc).lower()
      if "connection" in err or "timeout" in err or "network" in err:
        return ProviderValidationStatus.NETWORK_ERROR, f"Could not reach Anthropic: {exc}"
      return ProviderValidationStatus.INVALID_CREDENTIALS, f"Anthropic rejected the key: {exc}"
    except Exception as exc:
      logger.exception("Unexpected error validating Anthropic key")
      return ProviderValidationStatus.NETWORK_ERROR, f"Validation failed: {exc}"

  @classmethod
  def validate_google_credentials(cls, key: str) -> tuple[ProviderValidationStatus, str]:
    import google.generativeai as genai
    from google.api_core.exceptions import GoogleAPIError, Unauthenticated

    ok, msg = cls.validate_key_format("google", key)
    if not ok:
      return ProviderValidationStatus.INVALID_FORMAT, msg
    try:
      genai.configure(api_key=key)
      next(iter(genai.list_models()), None)
      return ProviderValidationStatus.VALID, "Google API key verified successfully"
    except Unauthenticated:
      return ProviderValidationStatus.INVALID_CREDENTIALS, "Invalid or revoked Google API key"
    except GoogleAPIError as exc:
      err = str(exc).lower()
      if "connection" in err or "timeout" in err or "network" in err:
        return ProviderValidationStatus.NETWORK_ERROR, f"Could not reach Google: {exc}"
      return ProviderValidationStatus.INVALID_CREDENTIALS, f"Google rejected the key: {exc}"
    except Exception as exc:
      logger.exception("Unexpected error validating Google key")
      return ProviderValidationStatus.NETWORK_ERROR, f"Validation failed: {exc}"

  @classmethod
  def validate_live_credentials(cls, provider_id: str, key: str) -> tuple[ProviderValidationStatus, str]:
    validators = {
      "openai": cls.validate_openai_credentials,
      "anthropic": cls.validate_anthropic_credentials,
      "google": cls.validate_google_credentials,
    }
    validator = validators.get(provider_id)
    if not validator:
      ok, msg = cls.validate_key_format(provider_id, key)
      status = ProviderValidationStatus.VALID if ok else ProviderValidationStatus.INVALID_FORMAT
      return status, msg
    return validator(key)

  @classmethod
  def validate_provider(cls, provider_id: str, *, live: bool = True) -> ProviderValidationResult:
    cfg = cls.load_providers_config()
    provider_cfg = cfg.get("providers", {}).get(provider_id)

    if not provider_cfg:
      return ProviderValidationResult(
        provider_id=provider_id,
        name=provider_id,
        status=ProviderValidationStatus.MISSING,
        message=f"Provider '{provider_id}' is not supported",
        configured=False,
        valid=False,
        key_hint=None,
        stored_in_app=False,
      )

    name = provider_cfg.get("name", provider_id)
    models_count = len(provider_cfg.get("models", []))
    meta = {
      "description": provider_cfg.get("description", ""),
      "key_placeholder": provider_cfg.get("key_placeholder", ""),
      "docs_url": provider_cfg.get("docs_url", ""),
    }

    if provider_id == "mock":
      return ProviderValidationResult(
        provider_id=provider_id,
        name=name,
        status=ProviderValidationStatus.MOCK,
        message="Available when no live provider is configured",
        configured=True,
        valid=True,
        key_hint=None,
        stored_in_app=False,
        models_count=models_count,
        **meta,
      )

    key, stored_in_app = cls._get_provider_key(provider_id)
    if not key:
      return ProviderValidationResult(
        provider_id=provider_id,
        name=name,
        status=ProviderValidationStatus.MISSING,
        message=f"Add your {name} API key below to enable these models",
        configured=False,
        valid=False,
        key_hint=None,
        stored_in_app=False,
        models_count=0,
        **meta,
      )

    key_hint = cls.mask_api_key(key)

    if not live:
      ok, msg = cls.validate_key_format(provider_id, key)
      status = ProviderValidationStatus.VALID if ok else ProviderValidationStatus.INVALID_FORMAT
      return ProviderValidationResult(
        provider_id=provider_id,
        name=name,
        status=status,
        message=msg,
        configured=True,
        valid=ok,
        key_hint=key_hint,
        stored_in_app=stored_in_app,
        models_count=models_count if ok else 0,
        **meta,
      )

    status, message = cls.validate_live_credentials(provider_id, key)
    return ProviderValidationResult(
      provider_id=provider_id,
      name=name,
      status=status,
      message=message,
      configured=True,
      valid=status == ProviderValidationStatus.VALID,
      key_hint=key_hint,
      stored_in_app=stored_in_app,
      models_count=models_count if status == ProviderValidationStatus.VALID else 0,
      **meta,
    )

  @classmethod
  def validate_all(cls, *, live: bool = True, use_cache: bool = False) -> dict[str, ProviderValidationResult]:
    if use_cache and cls._validation_cache:
      return cls._validation_cache
    cfg = cls.load_providers_config()
    results = {pid: cls.validate_provider(pid, live=live) for pid in cfg.get("providers", {})}
    cls._validation_cache = results
    return results

  @classmethod
  def clear_cache(cls):
    cls._validation_cache = {}

  @classmethod
  def connected_provider_ids(cls, validations: dict[str, ProviderValidationResult] | None = None) -> list[str]:
    vals = validations or cls.validate_all(live=False, use_cache=True)
    order = cls.credential_provider_ids()
    connected = [pid for pid in order if vals.get(pid) and vals[pid].valid]
    for pid, result in vals.items():
      if result.valid and pid not in ("mock",) and pid not in connected:
        connected.append(pid)
    return connected

  @classmethod
  def to_api_payload(cls, *, live: bool = True) -> dict:
    validations = cls.validate_all(live=live)
    mock = validations.get("mock")
    connected = cls.connected_provider_ids(validations)
    any_live = len(connected) > 0
    openai = validations.get("openai")

    providers = []
    for result in validations.values():
      providers.append({
        "id": result.provider_id,
        "name": result.name,
        "description": result.description,
        "status": result.status.value,
        "message": result.message,
        "configured": result.configured,
        "valid": result.valid,
        "key_hint": result.key_hint,
        "stored_in_app": result.stored_in_app,
        "models_count": result.models_count,
        "key_placeholder": result.key_placeholder,
        "docs_url": result.docs_url,
        "requires_api_key": result.provider_id != "mock",
      })

    return {
      "providers": providers,
      "summary": {
        "connected_providers": connected,
        "any_live_provider": any_live,
        "using_mock_fallback": not any_live,
        "active_provider": connected[0] if connected else "mock",
        "default_model": current_app.config.get("DEFAULT_AI_MODEL", "gpt-4o-mini"),
        "default_provider": current_app.config.get("DEFAULT_AI_PROVIDER", "openai"),
        "mock_available": mock.valid if mock else True,
        "openai_configured": openai.configured if openai else False,
        "openai_valid": openai.valid if openai else False,
        "openai_status": openai.status.value if openai else "missing",
        "openai_message": openai.message if openai else "OpenAI not configured",
        "openai_key_hint": openai.key_hint if openai else None,
        "openai_stored_in_app": openai.stored_in_app if openai else False,
      },
    }

  @classmethod
  def log_startup_status(cls):
    try:
      payload = cls.to_api_payload(live=True)
      summary = payload["summary"]
      if summary["any_live_provider"]:
        logger.info(
          "AI config OK — providers=%s default_model=%s",
          ", ".join(summary["connected_providers"]),
          summary["default_model"],
        )
      else:
        logger.info("AI config — no API keys saved; using mock provider until configured in app")
    except Exception:
      logger.exception("Failed to validate AI config on startup")
