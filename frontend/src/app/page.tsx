"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PhoneOff, Radio } from "lucide-react";

// Components
import { Navbar } from "../components/Navbar";
import { Orb, VoiceState } from "../components/Orb";
import { VoiceSelector } from "../components/VoiceSelector";
import { AudioUpload } from "../components/AudioUpload";
import { TelemetryCard } from "../components/TelemetryCard";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type ConnectionState = "Disconnected" | "Connecting" | "Connected";
type ConversationState = "Idle" | "Listening" | "Uploading..." | "Thinking" | "Speaking";

export default function Home() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("Disconnected");
  const [conversationState, setConversationState] = useState<ConversationState>("Idle");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState(0);
  const [time, setTime] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("Indian English");
  const [detectedAccent, setDetectedAccent] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Timer logic for conversation duration (only when connected)
  useEffect(() => {
    if (connectionState === "Connected") {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connectionState]);

  const startConversation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      setConnectionState("Connecting");
      setConversationState("Idle");
      setTime(0);
      setDetectedAccent(null);
      setDetectedConfidence(null);
      setMessages([{ id: Date.now(), role: "assistant", text: "Hi there! Connecting to server..." }]);

      const animateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        
        // Only show volume when actually listening
        setVolume(mediaRecorderRef.current?.state === "recording" ? avg / 255 : 0);
        animationFrameRef.current = requestAnimationFrame(animateVolume);
      };
      
      animateVolume();

      // Initialize WebSocket connection
      const ws = new WebSocket("ws://localhost:8000/ws/audio");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        
        // Create MediaRecorder once per session
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await e.data.arrayBuffer();
            ws.send(arrayBuffer);
            console.log(`Sent complete WebM blob: ${arrayBuffer.byteLength} bytes`);
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === "connected") {
            setConnectionState("Connected");
            setConversationState("Idle");
            setMessages([{ id: Date.now(), role: "assistant", text: "I'm connected. Hold the button to talk." }]);
          } else if (data.event === "listening") {
            setConversationState("Listening");
          } else if (data.event === "thinking") {
            setConversationState("Thinking");
          } else if (data.event === "speaking") {
            setConversationState("Speaking");
          } else if (data.event === "idle") {
            setConversationState("Idle");
          } else if (data.event === "error") {
            console.error("Backend error:", data.message);
          } else if (data.event === "assistant_message") {
            setMessages(prev => [...prev, { id: Date.now(), role: "assistant", text: data.text }]);
          } else if (data.event === "transcript") {
            if (data.text) {
              setMessages(prev => [...prev, { id: Date.now(), role: "user", text: data.text }]);
            }
          } else if (data.event === "telemetry") {
            setDetectedAccent(data.accent);
            setDetectedConfidence(data.confidence);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (wsRef.current) {
          endConversation();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error", error);
      };

    } catch (err) {
      console.error("Microphone error:", err);
      alert("Please allow microphone access to start.");
    }
  }, []);

  const endConversation = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setConnectionState("Disconnected");
    setConversationState("Idle");
    setVolume(0);
  }, []);

  const handlePressStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (conversationState === "Uploading..." || conversationState === "Thinking") {
      return; // Disabled during processing
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && mediaRecorderRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ action: "start_listening" }));
        mediaRecorderRef.current.start();
        setConversationState("Listening"); // Optimistic update, backend also emits it
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    }
  };

  const handlePressEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
        setConversationState("Uploading...");
      } catch (err) {
        console.error("Failed to stop recording:", err);
      }
    }
  };

  // Determine Orb State
  let orbState: VoiceState = "idle";
  if (connectionState === "Connecting") {
    orbState = "connecting";
  } else if (connectionState === "Connected") {
    if (conversationState === "Listening") orbState = "listening";
    else if (conversationState === "Uploading..." || conversationState === "Thinking") orbState = "thinking";
    else if (conversationState === "Speaking") orbState = "speaking";
  }

  // Determine Telemetry Props
  let displayAccent = "N/A";
  let displayConfidence: number | null = null;
  let isDetecting = false;

  if (connectionState === "Disconnected") {
    if (time === 0 && !detectedAccent) {
      displayAccent = "N/A";
    } else if (detectedAccent) {
      displayAccent = detectedAccent;
      displayConfidence = detectedConfidence;
    } else {
      displayAccent = "Insufficient conversation";
    }
  } else {
    if (detectedAccent) {
      displayAccent = detectedAccent;
      displayConfidence = detectedConfidence;
    } else {
      displayAccent = "Detecting...";
      isDetecting = true;
    }
  }

  // Determine Button Text & Props
  let buttonText = "Connect to Aria";
  let buttonDisabled = false;
  let buttonIcon = <Radio size={20} />;

  if (connectionState === "Connecting") {
    buttonText = "Connecting...";
    buttonDisabled = true;
  } else if (connectionState === "Connected") {
    if (conversationState === "Uploading...") {
      buttonText = "Sending...";
      buttonDisabled = true;
    } else if (conversationState === "Thinking") {
      buttonText = "ARIA is thinking...";
      buttonDisabled = true;
    } else if (conversationState === "Listening") {
      buttonText = "Release to Send";
      buttonIcon = <Mic size={20} className="animate-pulse" />;
    } else {
      // Idle or Speaking (Speaking allows interrupt, so button is active)
      buttonText = "Hold to Talk";
      buttonIcon = <Mic size={20} />;
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-x-hidden">
      
      <Navbar />

      <main className="flex-1 w-full max-w-[1400px] mx-auto flex flex-col items-center justify-start px-6 pt-32 pb-12 z-10 relative">
        
        {/* Hero Typography */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center mb-16 max-w-2xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
            Meet Aria
          </h1>
          <p className="text-lg md:text-xl text-foreground/60 font-light leading-relaxed">
            An AI voice assistant that understands your accent, responds naturally, and adapts to how you speak.
          </p>
        </motion.div>

        {/* 3-Column Layout */}
        <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-12 xl:gap-16 w-full">
          
          {/* Left Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6 w-full max-w-[300px] order-2 xl:order-1"
          >
            <VoiceSelector selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
            <AudioUpload onDetected={(accent, confidence, duration) => {
              setDetectedAccent(accent);
              setDetectedConfidence(confidence);
              setTime(duration);
            }} />
          </motion.div>

          {/* Center Column: Orb & Controls */}
          <div className="flex flex-col items-center flex-1 w-full max-w-[600px] order-1 xl:order-2">
            <Orb 
              state={orbState} 
              audioLevel={volume} 
              hoverStrength={1}
            />
            
            {/* Status Text */}
            <div className="h-8 flex items-center justify-center mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={conversationState === "Idle" ? connectionState : conversationState}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 text-foreground/60 font-medium"
                >
                  <div className={`w-2 h-2 rounded-full ${conversationState === "Listening" ? 'bg-accent-coral animate-pulse' : 'bg-accent-purple'}`} />
                  {connectionState === "Connected" ? conversationState : connectionState}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col items-center justify-center gap-4 mb-16 w-full select-none"
            >
              {connectionState === "Disconnected" ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startConversation}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-[16px] font-semibold text-lg shadow-[0_10px_40px_rgba(23,23,23,0.15)] transition-shadow hover:shadow-[0_10px_40px_rgba(23,23,23,0.25)]"
                >
                  <Radio size={20} />
                  Connect to Aria
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={buttonDisabled ? {} : { scale: 1.05 }}
                    whileTap={buttonDisabled ? {} : { scale: 0.95 }}
                    onMouseDown={buttonDisabled ? undefined : handlePressStart}
                    onMouseUp={buttonDisabled ? undefined : handlePressEnd}
                    onMouseLeave={buttonDisabled ? undefined : handlePressEnd}
                    onTouchStart={buttonDisabled ? undefined : handlePressStart}
                    onTouchEnd={buttonDisabled ? undefined : handlePressEnd}
                    disabled={buttonDisabled}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-[16px] font-semibold text-lg shadow-[0_10px_40px_rgba(23,23,23,0.15)] transition-all
                      ${buttonDisabled 
                        ? 'bg-foreground/10 text-foreground/40 cursor-not-allowed shadow-none' 
                        : conversationState === "Listening"
                          ? 'bg-accent-coral text-white'
                          : 'bg-foreground text-background hover:shadow-[0_10px_40px_rgba(23,23,23,0.25)]'
                      }`}
                  >
                    {buttonIcon}
                    {buttonText}
                  </motion.button>

                  <button
                    onClick={endConversation}
                    className="mt-2 flex items-center justify-center gap-2 text-foreground/50 border border-foreground/10 px-4 py-2 rounded-full font-medium text-sm hover:bg-black/5 hover:text-foreground/80 transition-colors"
                  >
                    <PhoneOff size={14} />
                    End Conversation
                  </button>
                </>
              )}
            </motion.div>

            {/* Transcript Panel */}
            {messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-6 overflow-hidden"
              >
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div 
                          className={`max-w-[85%] px-5 py-3 rounded-2xl text-[15px] font-medium leading-relaxed
                            ${msg.role === "user" 
                              ? "bg-black/5 text-foreground rounded-br-sm" 
                              : "bg-accent-purple/10 text-accent-purple rounded-bl-sm"
                            }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Sidebar: Telemetry */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center xl:items-start w-full max-w-[240px] order-3 xl:order-3"
          >
            <TelemetryCard 
              accent={displayAccent} 
              confidence={displayConfidence} 
              time={time} 
              isDetecting={isDetecting}
            />
          </motion.div>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
