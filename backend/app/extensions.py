from flask_sqlalchemy import SQLAlchemy
from marshmallow import ValidationError

db = SQLAlchemy()


def register_error_handlers(app):
  @app.errorhandler(ValidationError)
  def handle_validation_error(err):
    return {"error": "Validation failed", "details": err.messages}, 400

  @app.errorhandler(404)
  def handle_not_found(err):
    return {"error": "Resource not found"}, 404

  @app.errorhandler(409)
  def handle_conflict(err):
    description = getattr(err, "description", "Conflict")
    return {"error": description}, 409
