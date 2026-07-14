"""
LLM Service package for ARIA.

Provides text generation capabilities using Ollama.
Decoupled from WebSocket orchestration and SessionManager.
"""

from app.services.llm.client import llm_client
from app.services.llm.prompt import build_system_prompt

__all__ = [
    "llm_client",
    "build_system_prompt",
]
