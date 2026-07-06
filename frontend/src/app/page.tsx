"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PhoneOff } from "lucide-react";

// Components
import { Navbar } from "../components/Navbar";
import { Orb } from "../components/Orb";
import { VoiceSelector } from "../components/VoiceSelector";
import { AudioUpload } from "../components/AudioUpload";
import { TelemetryCard } from "../components/TelemetryCard";

type Message = {
  id: number;
  sender: "User" | "Aria";
  text: string;
};

type Status = "Ready" | "Listening..." | "Detecting Accent..." | "Thinking..." | "Speaking..." | "Conversation Complete";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<Status>("Ready");
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState(0);
  const [time, setTime] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("Indian English");
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Timer logic for conversation
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

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

      setIsRecording(true);
      setStatus("Listening...");
      setTime(0);
      setMessages([{ id: Date.now(), sender: "Aria", text: "Hi there! I'm listening. How can I help you today?" }]);

      const animateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        
        setVolume(avg / 255);
        animationFrameRef.current = requestAnimationFrame(animateVolume);
      };
      
      animateVolume();

      // Initialize WebSocket connection
      const ws = new WebSocket("ws://localhost:8000/ws/audio");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        
        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await e.data.arrayBuffer();
            ws.send(arrayBuffer);
          }
        };

        mediaRecorder.start(300); // 300ms chunks
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state" && data.status) {
            // Update status based on backend event, map to frontend expected strings or orb states
            if (data.status === "listening") setStatus("Listening...");
            else if (data.status === "thinking") setStatus("Thinking...");
            else if (data.status === "speaking") setStatus("Speaking...");
            else if (data.status === "error") setStatus("Ready"); // fallback
            else setStatus(data.status);
          } else if (data.type === "message") {
            setMessages(prev => [...prev, { id: Date.now(), sender: data.sender || "Aria", text: data.message }]);
          } else if (data.type === "ack") {
            console.log("Backend Ack:", data.message);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (isRecording) {
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
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
    
    setIsRecording(false);
    setStatus("Conversation Complete");
    setVolume(0);
  }, []);

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
          
          {/* Left Sidebar (Order 2 on mobile, 1 on desktop) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6 w-full max-w-[300px] order-2 xl:order-1"
          >
            <VoiceSelector selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
            <AudioUpload />
          </motion.div>

          {/* Center Column: Orb & Controls (Order 1 on mobile, 2 on desktop) */}
          <div className="flex flex-col items-center flex-1 w-full max-w-[600px] order-1 xl:order-2">
            <Orb 
              state={
                status === "Listening..." ? "listening" :
                (status === "Detecting Accent..." || status === "Thinking...") ? "thinking" :
                status === "Speaking..." ? "speaking" : "idle"
              } 
              audioLevel={volume} 
              hoverStrength={1}
            />
            
            {/* Status Text */}
            <div className="h-8 flex items-center justify-center mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 text-foreground/60 font-medium"
                >
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-accent-coral animate-pulse' : 'bg-accent-purple'}`} />
                  {status}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Controls */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-4 mb-16 w-full"
            >
              {!isRecording ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startConversation}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-[16px] font-semibold text-lg shadow-[0_10px_40px_rgba(23,23,23,0.15)] transition-shadow hover:shadow-[0_10px_40px_rgba(23,23,23,0.25)]"
                >
                  <Mic size={20} />
                  Start Conversation
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={endConversation}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-foreground border border-black/10 px-8 py-4 rounded-[16px] font-semibold text-lg shadow-lg hover:bg-black/5 transition-colors"
                >
                  <PhoneOff size={20} />
                  End Conversation
                </motion.button>
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
                        className={`flex w-full ${msg.sender === "User" ? "justify-end" : "justify-start"}`}
                      >
                        <div 
                          className={`max-w-[85%] px-5 py-3 rounded-2xl text-[15px] font-medium leading-relaxed
                            ${msg.sender === "User" 
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

          {/* Right Sidebar: Telemetry (Order 3 on all) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center xl:items-start w-full max-w-[240px] order-3 xl:order-3"
          >
            <TelemetryCard accent={selectedVoice} confidence={97} time={time} />
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
