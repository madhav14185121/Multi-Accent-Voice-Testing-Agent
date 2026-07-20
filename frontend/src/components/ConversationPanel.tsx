"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Message } from "../types";
import { Bot, User, Mic } from "lucide-react";

interface ConversationPanelProps {
  messages: Message[];
  conversationState: "Idle" | "Listening" | "Uploading..." | "Thinking" | "Speaking";
}

const TypewriterText = ({ msg, onType, animate }: { msg: Message & { _animated?: boolean }; onType?: () => void; animate: boolean }) => {
  const shouldAnimate = animate && !msg._animated;
  const [displayedText, setDisplayedText] = React.useState(shouldAnimate ? "" : msg.text);
  const [finished, setFinished] = React.useState(!shouldAnimate);

  React.useEffect(() => {
    if (finished || !shouldAnimate) {
      setDisplayedText(msg.text);
      msg._animated = true;
      return;
    }
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(msg.text.slice(0, i + 1));
      i++;
      if (onType) onType();
      if (i >= msg.text.length) {
        clearInterval(interval);
        setFinished(true);
        msg._animated = true;
      }
    }, 15);
    return () => clearInterval(interval);
  }, [msg, onType, finished, shouldAnimate]);

  return <>{finished || !shouldAnimate ? msg.text : displayedText}</>;
};

export const ConversationPanel = React.memo(function ConversationPanel({
  messages,
  conversationState,
}: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // Auto-scroll to bottom like ChatGPT
  useEffect(() => {
    scrollToBottom();
  }, [messages, conversationState, scrollToBottom]);

  const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";
  
  const isUserTyping = 
    conversationState === "Listening" || 
    conversationState === "Uploading..." || 
    (conversationState === "Thinking" && !lastMessageIsUser);

  const isAriaThinking = 
    (conversationState === "Thinking" && lastMessageIsUser) || 
    (conversationState === "Speaking" && lastMessageIsUser);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {messages.length === 0 && conversationState === "Idle" && (
          <div className="h-full flex flex-col items-center justify-center text-foreground/30">
            <Bot size={40} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs mt-1">Connect to Aria to start talking.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center mb-1">
                    <Bot size={12} className="text-accent-purple" />
                  </div>
                )}
                
                <div 
                  className={`px-5 py-3.5 rounded-2xl text-[15px] font-medium leading-relaxed
                    ${msg.role === "user" 
                      ? "bg-foreground text-background rounded-br-sm shadow-md" 
                      : "bg-white/60 text-foreground rounded-bl-sm border border-white/40 shadow-sm"
                    }`}
                >
                  {msg.role === "assistant" ? <TypewriterText msg={msg} onType={scrollToBottom} animate={index === messages.length - 1} /> : msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* User Dictation/Typing Indicator */}
          {isUserTyping && (
            <motion.div
              key="user-typing-indicator"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex w-full justify-end"
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="px-5 py-3.5 rounded-2xl bg-foreground text-background rounded-br-sm shadow-md flex items-center h-[48px]">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                    className="flex gap-1.5 items-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-background/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-background/60" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-background/60" style={{ animationDelay: '0.4s' }} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Typing Indicator */}
          {isAriaThinking && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex w-full justify-start"
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center mb-1">
                  <Bot size={12} className="text-accent-purple" />
                </div>
                
                <div className="px-5 py-3.5 rounded-2xl bg-white/60 text-foreground/50 rounded-bl-sm border border-white/40 shadow-sm flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-accent-purple">Thinking</span>
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                    className="flex gap-1 items-center h-full pt-1"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/60" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/60" style={{ animationDelay: '0.4s' }} />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
