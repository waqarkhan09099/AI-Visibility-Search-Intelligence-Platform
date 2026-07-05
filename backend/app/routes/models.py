from flask import Blueprint

from app.services.llm.model_service import AIModelService

models_bp = Blueprint("models", __name__)


@models_bp.route("/models", methods=["GET"])
def get_models():
  catalog = AIModelService.get_catalog()
  return {
    "data": {
      "models": [
        {
          "id": m.id,
          "name": m.name,
          "provider": m.provider,
          "description": m.description,
          "available": m.available,
        }
        for m in catalog["models"]
      ],
      "status": catalog["status"],
    }
  }
