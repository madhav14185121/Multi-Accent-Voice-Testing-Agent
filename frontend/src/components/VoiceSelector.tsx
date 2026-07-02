"use client";

import React, { useState } from "react";
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

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl shadow-accent-purple/5 rounded-[24px] p-5 w-full relative z-40">
      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-3">
        Voice Settings
      </h3>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white border border-black/5 px-4 py-3 rounded-[12px] text-sm font-semibold text-foreground hover:bg-black/5 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedVoice}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronDown size={16} className="text-foreground/50" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-[12px] overflow-hidden z-50 origin-top"
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
                  className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-black/5
                    ${selectedVoice === voice ? "text-accent-purple font-semibold bg-accent-purple/5" : "text-foreground font-medium"}
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
