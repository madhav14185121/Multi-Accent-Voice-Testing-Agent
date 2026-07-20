"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelState, Message } from "../types";
import type {
  PipelineState,
  AccumulatorState,
  AccentDetectionState,
} from "../types";
import { ConversationPanel } from "./ConversationPanel";
import { ReportView } from "./ReportView";
import { LiveAnalysisPanel } from "./LiveAnalysisPanel";
import {
  X,
  MessageSquare,
  FileAudio,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RightPanelProps {
  panelState: PanelState;
  setPanelState: (state: PanelState) => void;
  messages: Message[];
  conversationState: "Idle" | "Listening" | "Uploading..." | "Thinking" | "Speaking";
  pipeline: PipelineState;
  accumulator: AccumulatorState;
  accent: AccentDetectionState;
}

/**
 * RightPanel — hosts one of three views:
 *   1. "conversation"  → TWO stacked, INDEPENDENT cards:
 *        - Live Conversation (fills majority of column)
 *        - Live Analysis (defaults to MINIMIZED; only header visible)
 *   2. "analysis"      → ReportView for an uploaded audio file (unchanged)
 *   3. "history"       → ReportView for a saved history report (unchanged)
 */
export const RightPanel = React.memo(function RightPanel({
  panelState,
  setPanelState,
  messages,
  conversationState,
  pipeline,
  accumulator,
  accent,
}: RightPanelProps) {
  const [isAnalysisMinimized, setIsAnalysisMinimized] = useState(true);

  const isConversationView = panelState.view === "conversation";

  // ── Shared glass card style ────────────────────────────────────
  const cardClass =
    "bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-accent-purple/10 rounded-[28px] flex flex-col overflow-hidden";

  // ── Non-conversation views (analysis / history) ────────────────
  if (!isConversationView) {
    const headerInfo =
      panelState.view === "analysis"
        ? { title: "Audio Analysis", icon: <FileAudio size={16} /> }
        : { title: "History Report", icon: <Clock size={16} /> };

    return (
      <motion.div
        key={panelState.view}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className={`${cardClass} h-full w-full`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 shrink-0">
          <div className="flex items-center gap-2 text-foreground/70">
            {headerInfo.icon}
            <h3 className="text-[13px] font-bold uppercase tracking-wider">
              {headerInfo.title}
            </h3>
          </div>
          <button
            aria-label="Close panel"
            onClick={() => setPanelState({ view: "conversation" })}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {panelState.payload && <ReportView report={panelState.payload} />}
        </div>
      </motion.div>
    );
  }

  // ── Conversation view: TWO independent cards, stacked ──────────
  return (
    <div className="h-full w-full flex flex-col gap-4 min-h-0">
      {/* ── Card 1: Live Conversation (majority of vertical space) ── */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`${cardClass} flex-1 min-h-0`}
      >
        <motion.div layout="position" className="flex items-center justify-between px-6 py-4 border-b border-black/5 shrink-0">
          <div className="flex items-center gap-2 text-foreground/70">
            <MessageSquare size={16} />
            <h3 className="text-[13px] font-bold uppercase tracking-wider">
              Live Conversation
            </h3>
          </div>
        </motion.div>
        <motion.div layout="position" className="flex-1 min-h-0 overflow-hidden">
          <ConversationPanel
            messages={messages}
            conversationState={conversationState}
          />
        </motion.div>
      </motion.div>

      {/* ── Card 2: Live Analysis (minimized by default) ─────────── */}
      <motion.div
        layout
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`${cardClass} ${
          isAnalysisMinimized ? "shrink-0" : "flex-[0_0_60%] min-h-0"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsAnalysisMinimized((v) => !v)}
          className="flex items-center justify-between w-full px-6 py-4 shrink-0 hover:bg-black/[0.02] transition-colors"
          aria-label={isAnalysisMinimized ? "Expand live analysis" : "Minimize live analysis"}
        >
          <div className="flex items-center gap-2 text-foreground/70">
            <Activity size={16} className="text-accent-coral" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider">
              Live Analysis
            </h3>

            {/* Compact status badges when minimized */}
            {isAnalysisMinimized && (
              <div className="ml-3 flex items-center gap-2">
                {accent.status === "detecting" && (
                  <span className="text-[10px] font-semibold text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-full">
                    Detecting…
                  </span>
                )}
                {accent.status === "detected" && accent.label && (
                  <span className="text-[10px] font-semibold text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full">
                    {accent.label}
                    {typeof accent.confidence === "number"
                      ? ` · ${accent.confidence.toFixed(0)}%`
                      : ""}
                  </span>
                )}
                {accumulator.accumulatedSeconds > 0 &&
                  accent.status !== "detected" && (
                    <span className="text-[10px] font-medium text-foreground/50 tabular-nums">
                      {accumulator.accumulatedSeconds.toFixed(1)}/
                      {accumulator.targetSeconds.toFixed(0)}s
                    </span>
                  )}
              </div>
            )}
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/40">
            {isAnalysisMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expandable body */}
        <AnimatePresence initial={false}>
          {!isAnalysisMinimized && (
            <motion.div
              key="analysis-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border-t border-black/5"
            >
              <LiveAnalysisPanel
                pipeline={pipeline}
                accumulator={accumulator}
                accent={accent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});
