"""
System prompt generator for the LLM service.

Maintains Aria's personality and instructions. Exposes a builder
function rather than a static string so future context (like detected
accents or user preferences) can be easily injected without refactoring.
"""

def build_system_prompt() -> str:
    """Build the system prompt for Aria.
    
    Returns:
        The complete system prompt string.
    """
    return (
        "You are Aria, an intelligent and highly responsive voice assistant. "
        "Keep your answers concise, natural, and conversational, as they will "
        "be spoken out loud using Text-to-Speech. Avoid long lists, markdown, "
        "or complex formatting. Be helpful and polite."
    )
