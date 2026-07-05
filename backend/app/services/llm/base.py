from dataclasses import dataclass
from typing import Any


@dataclass
class LLMResponse:
  content: str
  tokens_used: int
  model: str
  provider: str


@dataclass
class AIModel:
  id: str
  name: str
  provider: str
  description: str
  available: bool


class BaseLLMProvider:
  provider_id: str = "base"

  def is_available(self) -> bool:
    return False

  def list_models(self) -> list[AIModel]:
    return []

  def complete_json(self, model: str, system: str, user: str, temperature: float = 0.3) -> LLMResponse:
    raise NotImplementedError
