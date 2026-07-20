"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import type { StageStatus } from "../types";

interface PipelineStageProps {
  label: string;
  status: StageStatus;
  latencyMs?: number;
  runningLabel?: string; // optional "generating...", "synthesizing..." etc.
}

export const PipelineStage = React.memo(function PipelineStage({
  label,
  status,
  latencyMs,
  runningLabel,
}: PipelineStageProps) {
  const icon =
    status === "done" ? (
      <div className="w-5 h-5 rounded-full bg-accent-purple/15 flex items-center justify-center">
        <Check size={12} className="text-accent-purple" strokeWidth={3} />
      </div>
    ) : status === "running" ? (
      <div className="w-5 h-5 rounded-full bg-accent-orange/15 flex items-center justify-center">
        <Loader2 size={12} className="text-accent-orange animate-spin" />
      </div>
    ) : (
      <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center">
        <Circle size={8} className="text-foreground/30" />
      </div>
    );

  const trailing =
    status === "done" && typeof latencyMs === "number" ? (
      <span className="text-[10px] font-semibold text-foreground/40 tabular-nums">
        {latencyMs} ms
      </span>
    ) : status === "running" ? (
      <span className="text-[10px] font-medium text-accent-orange">
        {runningLabel ?? "running…"}
      </span>
    ) : null;

  const labelClasses =
    status === "pending"
      ? "text-foreground/40"
      : status === "running"
      ? "text-foreground"
      : "text-foreground/80";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 py-2"
    >
      {icon}
      <span className={`text-sm font-semibold flex-1 ${labelClasses}`}>{label}</span>
      {trailing}
    </motion.div>
  );
});
