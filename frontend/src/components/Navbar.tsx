"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Info, Clock } from "lucide-react";

interface NavbarProps {
  onOpenHistory?: () => void;
}

export const Navbar = React.memo(function Navbar({ onOpenHistory }: NavbarProps) {
  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full flex justify-between items-center px-8 py-6 max-w-[1600px] mx-auto absolute top-0 z-50 left-0 right-0"
    >
      <div className="flex items-center gap-4">
        <a href="/" className="text-4xl font-normal tracking-tight text-foreground hover:text-accent-purple transition-colors">
          ARIA
        </a>
        <div className="hidden sm:block h-6 w-px bg-foreground/10 mx-1"></div>
        <span className="hidden sm:block text-sm font-semibold text-foreground/50 tracking-wide">
          Adaptive Voice Intelligence
        </span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-wide text-foreground/50">
        <a href="https://github.com/madhav14185121/Multi-Accent-Voice-Testing-Agent" target="_blank" rel="noopener noreferrer" className="hover:text-accent-purple transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          GitHub
        </a>
        <button 
          onClick={onOpenHistory}
          className="hover:text-accent-purple transition-colors flex items-center gap-2 focus:outline-none"
        >
          <Clock size={16} /> History
        </button>
        <a href="#" className="hover:text-accent-purple transition-colors flex items-center gap-2"><BookOpen size={16} /> Documentation</a>
        <a href="#" className="hover:text-accent-purple transition-colors flex items-center gap-2"><Info size={16} /> About</a>
      </div>
    </motion.nav>
  );
});
