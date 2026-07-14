"""
LLM Client service.

Handles communication with the Ollama backend. Designed to be completely
decoupled from SessionManager and WebSocket logic so it can be reused
across REST endpoints, CLI tools, or other agents.
"""

import logging
import time
from typing import Dict, List, Optional

import ollama

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Service for generating LLM responses using Ollama.
    
    Expects conversation history in standard OpenAI format:
    [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    """

    def __init__(self) -> None:
        self.model = settings.ollama_model
        logger.info(f"LLMClient initialized with model: {self.model}")

    def chat(self, messages: List[Dict[str, str]], stream: bool = False) -> str:
        """Generate a response from the LLM based on conversation history.

        Args:
            messages: List of message dictionaries containing 'role' and 'content'.
            stream: Whether to stream the response (currently only False is supported).

        Returns:
            The generated assistant text response, or a graceful fallback
            message if the LLM backend is unavailable.
        """
        # Note: Streaming is prepared in the signature but implemented synchronously
        # for this milestone. Future milestones will utilize async generator streaming.
        
        try:
            logger.info(f"Generating LLM reply using {self.model}...")
            
            response = ollama.chat(
                model=self.model,
                messages=messages,
                stream=stream
            )
            
            reply = response.get("message", {}).get("content", "")
            return reply.strip()
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}", exc_info=True)
            # Graceful failure fallback
            return "I'm having trouble responding right now."


# Module-level singleton
llm_client = LLMClient()
