import ollama

def get_llm_response(prompt, model_name="llama3"):
    """
    Sends a prompt to the local Ollama LLM and gets a response.
    Make sure you have Ollama installed and the model pulled (e.g., `ollama run llama3`).
    """
    print(f"Thinking (using {model_name})...")
    
    # A simple system prompt to give the agent a persona
    system_message = "You are a helpful conversational AI assistant. Please keep your responses concise, conversational, and under 3 sentences."
    
    try:
        response = ollama.chat(model=model_name, messages=[
            {
                'role': 'system',
                'content': system_message
            },
            {
                'role': 'user',
                'content': prompt
            }
        ])
        
        return response['message']['content']
    
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")
        print(f"Please ensure Ollama is running and you have downloaded the '{model_name}' model.")
        return "I'm sorry, I cannot connect to my brain right now."
