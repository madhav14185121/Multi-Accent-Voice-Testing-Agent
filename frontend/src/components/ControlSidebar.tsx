"use client";

import React from "react";
import { motion } from "framer-motion";
import { VoiceSelector } from "./VoiceSelector";
import { AudioUpload } from "./AudioUpload";
import { TelemetryCard } from "./TelemetryCard";

interface ControlSidebarProps {
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  onDetectionComplete: (report: any) => void;
  displayAccent: string;
  displayConfidence: number | null;
  time: number;
  isDetecting: boolean;
}

export const ControlSidebar = React.memo(function ControlSidebar({
  selectedVoice,
  setSelectedVoice,
  onDetectionComplete,
  displayAccent,
  displayConfidence,
  time,
  isDetecting,
}: ControlSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col gap-6 w-full max-w-[300px]"
    >
      <VoiceSelector selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
      <AudioUpload onDetectionComplete={onDetectionComplete} />
      <TelemetryCard
        accent={displayAccent}
        confidence={displayConfidence}
        time={time}
        isDetecting={isDetecting}
      />
    </motion.div>
  );
});
