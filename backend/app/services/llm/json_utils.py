"""Shared helpers for LLM JSON responses."""

import json
import re


def extract_json_object(text: str) -> dict:
  text = text.strip()
  if text.startswith("```"):
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
  return json.loads(text)
