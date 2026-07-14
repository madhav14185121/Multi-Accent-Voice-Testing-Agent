"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

const voices = [
  "Indian English",
  "American English",
  "British English",
  "Australian English",
  "Canadian English",
];

interface VoiceSelectorProps {
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
}

export const VoiceSelector = React.memo(function VoiceSelector({
  selectedVoice,
  setSelectedVoice,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-accent-purple/10 rounded-[28px] p-6 w-full relative z-40">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-4">
        Voice Settings
      </h3>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white/80 border border-black/5 px-4 py-3.5 rounded-[16px] text-sm font-semibold text-foreground hover:bg-white transition-all shadow-sm active:scale-[0.98]"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedVoice}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronDown size={18} className="text-foreground/50" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-black/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-[16px] overflow-hidden z-50 origin-top p-1"
              role="listbox"
            >
              {voices.map((voice) => (
                <li
                  key={voice}
                  role="option"
                  aria-selected={selectedVoice === voice}
                  onClick={() => {
                    setSelectedVoice(voice);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer rounded-[12px] transition-colors hover:bg-black/5 m-0.5
                    ${selectedVoice === voice ? "text-accent-purple font-semibold bg-accent-purple/10" : "text-foreground font-medium"}
                  `}
                >
                  {voice}
                  {selectedVoice === voice && <Check size={16} />}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
