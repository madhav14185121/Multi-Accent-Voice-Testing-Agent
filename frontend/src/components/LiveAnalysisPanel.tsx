"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, Waves, Loader2, Check } from "lucide-react";
import type {
  PipelineState,
  AccumulatorState,
  AccentDetectionState,
} from "../types";
import { PipelineStage } from "./PipelineStage";

interface LiveAnalysisPanelProps {
  pipeline: PipelineState;
  accumulator: AccumulatorState;
  accent: AccentDetectionState;
}

export const LiveAnalysisPanel = React.memo(function LiveAnalysisPanel({
  pipeline,
  accumulator,
  accent,
}: LiveAnalysisPanelProps) {
  const isDetected = accent.status === "detected";
  const displayAccumulated = isDetected
    ? accumulator.targetSeconds
    : accumulator.accumulatedSeconds;

  const pct = Math.min(
    100,
    (displayAccumulated / Math.max(accumulator.targetSeconds, 0.01)) * 100
  );

  const sortedTop3 = accent.top3
    ? [...accent.top3].sort((a, b) => b.confidence - a.confidence).slice(0, 3)
    : [];

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* ── Turn pipeline ─────────────────────────────────────────── */}
      <section className="bg-white/60 border border-black/5 rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Waves size={14} className="text-accent-purple" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            Turn Pipeline
          </h4>
        </div>
        <div className="divide-y divide-black/5">
          <PipelineStage
            label="Speech-to-Text"
            status={pipeline.stt.status}
            latencyMs={pipeline.stt.latencyMs}
            runningLabel="transcribing…"
          />
          <PipelineStage
            label="Generating Reply"
            status={pipeline.llm.status}
            latencyMs={pipeline.llm.latencyMs}
            runningLabel="thinking…"
          />
          <PipelineStage
            label="Text-to-Speech"
            status={pipeline.tts.status}
            latencyMs={pipeline.tts.latencyMs}
            runningLabel="synthesizing…"
          />
        </div>
      </section>

      {/* ── Accent Detection ──────────────────────────────────────── */}
      <section className="bg-white/60 border border-black/5 rounded-[20px] p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Radar size={14} className="text-accent-coral" />
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
            Accent Detection
          </h4>
        </div>

        {/* Accumulator progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground/60">
              Accumulating speech
            </span>
            <span className="text-xs font-bold text-foreground/80 tabular-nums">
              {displayAccumulated.toFixed(1)} / {accumulator.targetSeconds.toFixed(1)} s
            </span>
          </div>
          <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-coral"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.0, ease: "linear" }}
            />
          </div>
        </div>

        {/* Detection status */}
        <AnimatePresence mode="wait">
          {accent.status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-foreground/40 italic"
            >
              Waiting for enough speech to detect accent…
            </motion.div>
          )}

          {accent.status === "detecting" && (
            <motion.div
              key="detecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm font-semibold text-accent-orange"
            >
              <Loader2 size={14} className="animate-spin" />
              Detecting accent…
            </motion.div>
          )}

          {accent.status === "detected" && (
            <motion.div
              key="detected"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between bg-accent-purple/5 border border-accent-purple/10 rounded-[16px] p-4 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
                    <Check size={16} className="text-accent-purple" strokeWidth={3} />
                  </div>
                  <span className="text-[17px] font-extrabold text-foreground tracking-tight">
                    {accent.label ?? "Unknown"}
                  </span>
                </div>
                {typeof accent.confidence === "number" && (
                  <span className="text-sm font-bold text-accent-purple bg-white shadow-sm border border-accent-purple/10 px-3 py-1 rounded-full">
                    {accent.confidence.toFixed(1)}%
                  </span>
                )}
              </div>

              {sortedTop3.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {sortedTop3.map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium text-foreground/60">
                          {s.label}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground/70 tabular-nums">
                          {s.confidence.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent-purple/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${s.confidence}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
});
