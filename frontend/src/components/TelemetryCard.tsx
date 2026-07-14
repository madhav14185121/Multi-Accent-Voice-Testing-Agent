"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface TelemetryCardProps {
  accent: string;
  confidence: number | null;
  time: number;
  isDetecting?: boolean;
}

export const TelemetryCard = React.memo(function TelemetryCard({
  accent,
  confidence,
  time,
  isDetecting = false,
}: TelemetryCardProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-5 w-full max-w-[240px]"
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
        Live Telemetry
      </h3>
      
      <div className="space-y-4">
        <div>
          <span className="block text-xs font-semibold text-foreground/50 uppercase mb-1">Accent</span>
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            {accent}
            {isDetecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground/50" />}
          </span>
        </div>
        
        <div>
          <span className="block text-xs font-semibold text-foreground/50 uppercase mb-1">Confidence</span>
          <span className="block text-sm font-bold text-foreground">
            {confidence !== null ? `${confidence}%` : "null"}
          </span>
        </div>
        
        <div>
          <span className="block text-xs font-semibold text-foreground/50 uppercase mb-1">Duration</span>
          <span className="block text-sm font-bold text-foreground">{formatTime(time)}</span>
        </div>
      </div>
    </motion.div>
  );
});
