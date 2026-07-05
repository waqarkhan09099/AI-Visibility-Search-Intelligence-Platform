"""Backward-compatible re-exports. Prefer app.services.llm.model_service."""

from app.services.llm.model_service import (
  AIModelService,
  get_ai_status,
  get_provider,
  list_all_models,
  resolve_model,
)

__all__ = ["AIModelService", "get_ai_status", "get_provider", "list_all_models", "resolve_model"]
