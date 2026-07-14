"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelState, Message, ReportDetail } from "../types";
import { ConversationPanel } from "./ConversationPanel";
import { ReportView } from "./ReportView";
import { X, MessageSquare, FileAudio, Clock } from "lucide-react";

interface RightPanelProps {
  panelState: PanelState;
  setPanelState: (state: PanelState) => void;
  messages: Message[];
  conversationState: "Idle" | "Listening" | "Uploading..." | "Thinking" | "Speaking";
}

export const RightPanel = React.memo(function RightPanel({
  panelState,
  setPanelState,
  messages,
  conversationState,
}: RightPanelProps) {
  const getHeaderInfo = () => {
    switch (panelState.view) {
      case "conversation":
        return { title: "Live Conversation", icon: <MessageSquare size={16} /> };
      case "analysis":
        return { title: "Audio Analysis", icon: <FileAudio size={16} /> };
      case "history":
        return { title: "History Report", icon: <Clock size={16} /> };
      default:
        return { title: "Panel", icon: null };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="w-full max-w-[500px] min-h-[600px] xl:h-[700px] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-accent-purple/10 rounded-[32px] overflow-hidden flex flex-col relative z-20">
      {/* Unified Header */}
      <div className="p-5 border-b border-white/30 bg-white/20 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground/50">
          {headerInfo.icon}
          <h3 className="text-xs font-bold uppercase tracking-widest">
            {headerInfo.title}
          </h3>
        </div>
        
        {panelState.view !== "conversation" && (
          <button 
            onClick={() => setPanelState({ view: "conversation" })}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {panelState.view === "conversation" && (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <ConversationPanel 
                messages={messages} 
                conversationState={conversationState} 
              />
            </motion.div>
          )}

          {panelState.view === "analysis" && panelState.payload && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto custom-scrollbar p-6"
            >
              <ReportView report={panelState.payload as ReportDetail} />
            </motion.div>
          )}

          {panelState.view === "history" && panelState.payload && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto custom-scrollbar p-6"
            >
              <ReportView report={panelState.payload as ReportDetail} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
});
