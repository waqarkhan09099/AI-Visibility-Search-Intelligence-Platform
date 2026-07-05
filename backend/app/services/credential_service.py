import logging

from app.extensions import db
from app.models.credential import ProviderCredential
from app.services.ai_config_service import AIConfigService, ProviderValidationStatus
from app.services.credential_vault import CredentialVault

logger = logging.getLogger(__name__)


class CredentialService:
  """Secure storage and retrieval of provider API keys."""

  @staticmethod
  def get_api_key(provider_id: str) -> str:
    row = ProviderCredential.query.filter_by(provider_id=provider_id).first()
    if row:
      decrypted = CredentialVault.decrypt(row.encrypted_api_key)
      if decrypted:
        return decrypted.strip()

    cfg = AIConfigService.load_providers_config()
    env_var = cfg.get("providers", {}).get(provider_id, {}).get("env_key")
    if env_var:
      from flask import current_app
      return (current_app.config.get(env_var) or "").strip()

    return ""

  @staticmethod
  def has_stored_credential(provider_id: str) -> bool:
    return ProviderCredential.query.filter_by(provider_id=provider_id).first() is not None

  @staticmethod
  def save_credential(provider_id: str, api_key: str) -> ProviderCredential:
    if not AIConfigService.is_credential_provider(provider_id):
      raise ValueError(f"Unsupported provider: {provider_id}")

    key = api_key.strip()
    status, message = AIConfigService.validate_live_credentials(provider_id, key)
    if status != ProviderValidationStatus.VALID:
      raise ValueError(message)

    hint = CredentialVault.mask_api_key(key) or "****"
    encrypted = CredentialVault.encrypt(key)

    row = ProviderCredential.query.filter_by(provider_id=provider_id).first()
    if row:
      row.encrypted_api_key = encrypted
      row.key_hint = hint
    else:
      row = ProviderCredential(
        provider_id=provider_id,
        encrypted_api_key=encrypted,
        key_hint=hint,
      )
      db.session.add(row)

    db.session.commit()
    AIConfigService.clear_cache()
    logger.info("Saved encrypted credential for provider=%s hint=%s", provider_id, hint)
    return row

  @staticmethod
  def delete_credential(provider_id: str) -> bool:
    if not AIConfigService.is_credential_provider(provider_id):
      return False
    row = ProviderCredential.query.filter_by(provider_id=provider_id).first()
    if not row:
      return False
    db.session.delete(row)
    db.session.commit()
    AIConfigService.clear_cache()
    logger.info("Removed stored credential for provider=%s", provider_id)
    return True
