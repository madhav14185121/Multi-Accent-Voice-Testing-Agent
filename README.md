# 🎙️ Multi-Accent Voice Testing Agent

A voice-first conversational system designed to test how a language model responds when speech input and spoken output are shaped by different accents.

![Architecture Overview](architecture%20diagram.png)

## 🧭 Architecture Summary

This repository implements the architecture shown in the diagram as a full feedback loop:

1. **Audio Capture Layer**  
   The user speaks into a microphone, and the system captures the raw audio signal.

2. **Speech-to-Text Layer**  
   The captured speech is converted into text using a transcription engine.

3. **Intelligence / Reasoning Layer**  
   The transcribed user prompt is sent to a local language model for response generation.

4. **Text-to-Speech Layer**  
   The generated reply is converted into spoken audio using an accent-aware voice engine.

5. **Playback Layer**  
   The synthesized audio is played back to the user, completing the conversational loop.

## 🔄 End-to-End Flow

```text
User Voice Input
    ↓
Audio Capture
    ↓
Speech Recognition / Transcription
    ↓
LLM Reasoning / Response Generation
    ↓
Text-to-Speech Synthesis
    ↓
Audio Playback
```

## 🧩 Core Architectural Components

| Component | Role in the System |
|-----------|--------------------|
| Input Voice Stream | Receives spoken user input from the microphone |
| Transcription Engine | Converts speech into readable text |
| Language Model | Produces the assistant’s answer or action |
| Voice Synthesis Engine | Converts text replies into speech |
| Output Audio Player | Delivers the spoken response to the user |

## 🎯 Purpose of the System

This project is built to evaluate and demonstrate:

- Real-time conversational voice interaction
- Accent-sensitive response quality
- Local-first AI voice experiences
- A modular architecture where each stage can be improved independently

## 🚀 What Makes This Architecture Useful

- **Modular design**: Each stage can be replaced without changing the overall workflow
- **Accent-focused testing**: Useful for comparing how responses sound across different voices
- **Local-friendly workflow**: Built around local inference and local speech processing where possible
- **Practical experimentation**: Suitable for demos, prototyping, and voice UX evaluation

## 🧪 Expected Workflow During Use

1. The user says something into the microphone.
2. The system transcribes the spoken input.
3. The language model generates a contextual response.
4. The response is converted to speech using a selected accent.
5. The user hears the answer through the playback system.

## 🌐 Design Philosophy

The architecture follows a simple principle:

> Capture human speech, understand it, reason over it, convert the result back into speech, and return it to the user in a natural and testable form.

This makes the system ideal for exploring accent variation, speaking clarity, and voice-based interaction quality.

## 📌 Key Takeaway

The repository is not just a collection of scripts; it is an implementation of a voice interaction pipeline inspired directly by the architecture diagram shown above.

---

If you want, I can also turn this into a more polished, badge-rich GitHub landing page with a custom hero section and architecture callouts.
