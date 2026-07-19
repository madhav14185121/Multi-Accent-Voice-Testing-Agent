"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PhoneOff, Radio } from "lucide-react";

import { HomeLayout } from "../components/HomeLayout";
import { ControlSidebar } from "../components/ControlSidebar";
import { RightPanel } from "../components/RightPanel";
import { HistoryDrawer } from "../components/HistoryDrawer";

import { Orb, VoiceState } from "../components/Orb";
import { Message, PanelState, ReportDetail } from "../types";
import { WS_BASE } from "../lib/api";
import { playBase64Wav } from "../lib/audio";

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
  
  const [panelState, setPanelState] = useState<PanelState>({ view: "conversation" });
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
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
      setPanelState({ view: "conversation" });

      const animateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        
        setVolume(mediaRecorderRef.current?.state === "recording" ? avg / 255 : 0);
        animationFrameRef.current = requestAnimationFrame(animateVolume);
      };
      
      animateVolume();

      // Initialize WebSocket connection
      const ws = new WebSocket(`${WS_BASE}/ws/audio`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        
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
          } else if (data.event === "aria_speech") {
            setConversationState("Speaking");
            playBase64Wav(data.audio_base64, data.mime_type).then(audio => {
              audio.addEventListener("ended", () => {
                wsRef.current?.send(JSON.stringify({ action: "playback_done" }));
              }, { once: true });
              audio.addEventListener("error", () => {
                wsRef.current?.send(JSON.stringify({ action: "playback_done" }));
              }, { once: true });
            }).catch(err => {
              console.error("Audio playback failed:", err);
              wsRef.current?.send(JSON.stringify({ action: "playback_done" }));
            });
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
      return; 
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && mediaRecorderRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ action: "start_listening", voice: selectedVoice }));
        mediaRecorderRef.current.start();
        setConversationState("Listening"); 
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

  const handleDetectionComplete = (report: ReportDetail) => {
    setDetectedAccent(report.predicted_accent);
    setDetectedConfidence(report.confidence);
    setTime(report.file_duration || 0);
    setPanelState({ view: "analysis", payload: report });
  };

  const handleSelectHistoryReport = (report: ReportDetail) => {
    setPanelState({ view: "history", payload: report });
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
      buttonText = "Hold to Talk";
      buttonIcon = <Mic size={20} />;
    }
  }

  const leftSidebar = (
    <ControlSidebar 
      selectedVoice={selectedVoice}
      setSelectedVoice={setSelectedVoice}
      onDetectionComplete={handleDetectionComplete}
      displayAccent={displayAccent}
      displayConfidence={displayConfidence}
      time={time}
      isDetecting={isDetecting}
    />
  );

  const centerColumn = (
    <>
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <Orb 
          state={orbState} 
          audioLevel={volume} 
          hoverStrength={1}
        />
        
        {/* Status Text */}
        <div className="h-8 flex items-center justify-center mt-6 mb-8">
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
      </div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="flex flex-col items-center justify-center gap-4 mb-20 w-full select-none mt-auto"
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
    </>
  );

  const rightPanel = (
    <RightPanel 
      panelState={panelState}
      setPanelState={setPanelState}
      messages={messages}
      conversationState={conversationState}
    />
  );

  const historyDrawer = (
    <HistoryDrawer 
      isOpen={isHistoryDrawerOpen}
      onClose={() => setIsHistoryDrawerOpen(false)}
      onSelectReport={handleSelectHistoryReport}
    />
  );

  return (
    <HomeLayout 
      leftSidebar={leftSidebar}
      centerColumn={centerColumn}
      rightPanel={rightPanel}
      historyDrawer={historyDrawer}
      onOpenHistory={() => setIsHistoryDrawerOpen(true)}
    />
  );
}
