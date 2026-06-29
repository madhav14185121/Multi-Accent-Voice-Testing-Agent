import os
import asyncio
import edge_tts
from faster_whisper import WhisperModel
import speech_recognition as sr
import tempfile

# Initialize Whisper model (using small model for speed, will download automatically)
model_size = "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

def listen_and_transcribe():
    """
    Listens to the microphone and transcribes the speech to text using Whisper.
    """
    recognizer = sr.Recognizer()
    
    with sr.Microphone() as source:
        print("Adjusting for ambient noise... Please wait.")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        print("Listening... Speak now!")
        
        try:
            # Listen to the user's voice
            audio_data = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            
            # Save the raw audio to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                temp_wav.write(audio_data.get_wav_data())
                temp_wav_path = temp_wav.name
                
            print("Transcribing...")
            # Transcribe the audio file using faster-whisper
            segments, info = model.transcribe(temp_wav_path, beam_size=5)
            
            transcription = ""
            for segment in segments:
                transcription += segment.text + " "
                
            # Clean up the temporary file
            os.remove(temp_wav_path)
            
            return transcription.strip()
            
        except sr.WaitTimeoutError:
            print("No speech detected.")
            return ""
        except Exception as e:
            print(f"Error recording audio: {e}")
            return ""

async def generate_speech_async(text, voice="en-GB-SoniaNeural"):
    """
    Asynchronously generates speech from text and saves it to a file.
    """
    output_file = "response.mp3"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    return output_file

def speak(text, voice="en-GB-SoniaNeural"):
    """
    Generates and plays speech from text.
    You can change the voice to get different accents.
    Examples:
    - en-GB-SoniaNeural (British)
    - en-IN-NeerjaNeural (Indian English)
    - en-US-AriaNeural (US English)
    - en-AU-NatashaNeural (Australian)
    """
    print(f"Agent speaking (Accent: {voice}): {text}")
    # Run the async edge-tts function
    output_file = asyncio.run(generate_speech_async(text, voice))
    
    # On Windows, we can use os.system to play the MP3 file using the default player
    os.system(f"start {output_file}")
