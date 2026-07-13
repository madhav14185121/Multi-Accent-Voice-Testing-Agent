"""
In-memory session manager for ARIA.

Stores per-connection session state including conversation history.
Designed for future compatibility with Supabase persistence and
LLM conversation context.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class SessionManager:
    """Manages in-memory session state for WebSocket connections.

    Each session stores conversation history in a format compatible
    with future LLM and Supabase integrations.
    """

    def __init__(self) -> None:
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self) -> str:
        """Create a new session with structured initial state.

        Returns:
            Unique session ID string.
        """
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "conversation": [],
            "transcript": [],
            "accent": None,
        }
        return session_id

    def get_session(self, session_id: str) -> dict:
        """Retrieve session data by ID.

        Args:
            session_id: The session identifier.

        Returns:
            Session dict, or empty dict if not found.
        """
        return self.sessions.get(session_id, {})

    def add_transcript(
        self,
        session_id: str,
        speaker: str,
        text: str,
        timestamp: Optional[str] = None,
    ) -> Dict[str, str]:
        """Append a transcript entry to the session's conversation history.

        Args:
            session_id: The session identifier.
            speaker: Who spoke — "user" or "aria".
            text: The transcribed/generated text.
            timestamp: ISO-8601 timestamp. Auto-generated if not provided.

        Returns:
            The entry dict that was appended.
        """
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).isoformat()

        entry: Dict[str, str] = {
            "speaker": speaker,
            "text": text,
            "timestamp": timestamp,
        }

        session = self.sessions.get(session_id)
        if session is not None:
            session["conversation"].append(entry)
            session["transcript"].append(entry)

        return entry

    def remove_session(self, session_id: str) -> None:
        """Remove a session and its data.

        Args:
            session_id: The session identifier.
        """
        self.sessions.pop(session_id, None)


# Singleton instance for easy import
session_manager = SessionManager()

