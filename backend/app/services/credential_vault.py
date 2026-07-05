import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken
from flask import current_app

logger = logging.getLogger(__name__)


class CredentialVault:
  """Encrypt and decrypt API keys at rest using the app secret."""

  @staticmethod
  def _fernet() -> Fernet:
    secret = current_app.config.get("SECRET_KEY", "dev-secret-key")
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)

  @staticmethod
  def encrypt(plaintext: str) -> str:
    token = CredentialVault._fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")

  @staticmethod
  def decrypt(ciphertext: str) -> str | None:
    try:
      return CredentialVault._fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
      logger.error("Failed to decrypt credential — SECRET_KEY may have changed")
      return None

  @staticmethod
  def mask_api_key(key: str | None) -> str | None:
    if not key or not key.strip():
      return None
    k = key.strip()
    if len(k) <= 8:
      return "****"
    return f"{k[:3]}...{k[-4:]}"
