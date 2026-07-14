"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-accent-purple/10 rounded-[28px] p-6 w-full"
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-5">
        Live Telemetry
      </h3>
      
      <div className="space-y-5">
        <div>
          <span className="block text-xs font-bold text-foreground/40 uppercase tracking-wider mb-1.5">Accent</span>
          <div className="flex items-center gap-2 h-7">
            <AnimatePresence mode="wait">
              <motion.span 
                key={accent}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-base font-bold text-foreground"
              >
                {accent}
              </motion.span>
            </AnimatePresence>
            {isDetecting && <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />}
          </div>
        </div>
        
        <div>
          <span className="block text-xs font-bold text-foreground/40 uppercase tracking-wider mb-1.5">Confidence</span>
          <div className="h-7 flex items-center">
            <AnimatePresence mode="wait">
              <motion.span 
                key={confidence !== null ? confidence : 'null'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="text-base font-bold text-foreground"
              >
                {confidence !== null ? `${confidence}%` : "—"}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        
        <div>
          <span className="block text-xs font-bold text-foreground/40 uppercase tracking-wider mb-1.5">Duration</span>
          <div className="h-7 flex items-center">
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={time}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="text-base font-bold text-accent-purple font-mono"
              >
                {formatTime(time)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
