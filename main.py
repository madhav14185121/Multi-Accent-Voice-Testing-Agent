import time
from src.audio import listen_and_transcribe, speak
from src.llm import get_llm_response

def run_agent():
    print("==================================================")
    print("Welcome to the Multi-Accent Voice Testing Agent!")
    print("==================================================")
    
    # You can change the accent here!
    agent_accent = "en-IN-NeerjaNeural" # Indian English
    
    speak("Hello! I am ready. You can start speaking now.", voice=agent_accent)
    time.sleep(3) # Wait for the intro speech to finish
    
    while True:
        # 1. Listen (The Ears)
        user_text = listen_and_transcribe()
        
        if not user_text:
            continue
            
        print(f"You said: {user_text}")
        
        if "goodbye" in user_text.lower() or "stop" in user_text.lower():
            speak("Goodbye! Have a great day.", voice=agent_accent)
            time.sleep(2)
            break
            
        # 2. Think (The Brain)
        response_text = get_llm_response(user_text)
        print(f"\nAgent response text: {response_text}\n")
        
        # 3. Speak (The Mouth)
        speak(response_text, voice=agent_accent)
        
        print("\n--- Waiting for next input ---")
        time.sleep(3) # Give user a moment before listening again

if __name__ == "__main__":
    run_agent()
