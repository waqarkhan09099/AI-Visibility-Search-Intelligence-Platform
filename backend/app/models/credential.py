from datetime import datetime, timezone

from app.extensions import db


def utcnow():
  return datetime.now(timezone.utc)


class ProviderCredential(db.Model):
  """Encrypted API credentials stored per provider."""

  __tablename__ = "provider_credentials"

  id = db.Column(db.Integer, primary_key=True)
  provider_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
  encrypted_api_key = db.Column(db.Text, nullable=False)
  key_hint = db.Column(db.String(32), nullable=False)
  updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
