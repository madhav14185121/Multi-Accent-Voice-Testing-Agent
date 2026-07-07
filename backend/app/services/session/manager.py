import uuid
from typing import Dict, Any

class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "conversation_history": [],
            "timer": 0,
            "accent": "Unknown",
            "transcript": ""
        }
        return session_id

    def get_session(self, session_id: str) -> dict:
        return self.sessions.get(session_id, {})

    def remove_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]

# Singleton instance for easy import
session_manager = SessionManager()
