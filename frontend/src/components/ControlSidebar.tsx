"use client";

import React from "react";
import { motion } from "framer-motion";
import { VoiceSelector } from "./VoiceSelector";
import { AudioUpload } from "./AudioUpload";

interface ControlSidebarProps {
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  onDetectionComplete: (report: any) => void;
}

/**
 * ControlSidebar — left rail.
 *
 * The parent column already vertically centers this container, so we
 * only need to lay out the two cards with generous internal spacing.
 */
export const ControlSidebar = React.memo(function ControlSidebar({
  selectedVoice,
  setSelectedVoice,
  onDetectionComplete,
}: ControlSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col gap-5 w-full"
    >
      <VoiceSelector selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice} />
      <AudioUpload onDetectionComplete={onDetectionComplete} />
    </motion.div>
  );
});
