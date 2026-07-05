from flask import Blueprint, request
from marshmallow import ValidationError

from app.schemas.credential import SaveCredentialSchema
from app.services.ai_config_service import AIConfigService
from app.services.credential_service import CredentialService

config_bp = Blueprint("config", __name__)
save_credential_schema = SaveCredentialSchema()


@config_bp.route("/config/ai", methods=["GET"])
def get_ai_config():
  return {"data": AIConfigService.to_api_payload(live=True)}


@config_bp.route("/config/ai/validate", methods=["POST"])
def validate_ai_config():
  AIConfigService.clear_cache()
  return {"data": AIConfigService.to_api_payload(live=True)}


@config_bp.route("/config/ai/credentials", methods=["POST"])
def save_credential():
  try:
    data = save_credential_schema.load(request.get_json() or {})
  except ValidationError as err:
    return {"error": "Validation failed", "details": err.messages}, 400

  try:
    CredentialService.save_credential(data["provider"], data["api_key"])
  except ValueError as exc:
    return {"error": str(exc)}, 400

  return {"data": AIConfigService.to_api_payload(live=True)}, 201


@config_bp.route("/config/ai/credentials/<provider_id>", methods=["DELETE"])
def delete_credential(provider_id):
  if not AIConfigService.is_credential_provider(provider_id):
    return {"error": "Unsupported provider"}, 400

  removed = CredentialService.delete_credential(provider_id)
  if not removed:
    return {"error": "No stored credential for this provider"}, 404

  return {"data": AIConfigService.to_api_payload(live=True)}
