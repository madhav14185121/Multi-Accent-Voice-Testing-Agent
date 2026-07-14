"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "./Navbar";

interface HomeLayoutProps {
  leftSidebar: React.ReactNode;
  centerColumn: React.ReactNode;
  rightPanel: React.ReactNode;
  historyDrawer: React.ReactNode;
  onOpenHistory: () => void;
}

export const HomeLayout = React.memo(function HomeLayout({
  leftSidebar,
  centerColumn,
  rightPanel,
  historyDrawer,
  onOpenHistory,
}: HomeLayoutProps) {
  return (
    <div className="min-h-screen relative flex flex-col items-center overflow-x-hidden">
      <Navbar onOpenHistory={onOpenHistory} />

      <main className="flex-1 w-full max-w-[1800px] mx-auto flex flex-col items-center justify-start px-8 xl:px-12 pt-28 pb-10 z-10 relative min-h-screen">

        {/* 3-Column Layout */}
        <div className="flex flex-col xl:flex-row items-center xl:items-stretch justify-between gap-8 xl:gap-12 w-full h-full mt-4 pb-12">

          {/* Left Sidebar */}
          <div className="w-full xl:w-[320px] shrink-0 flex flex-col order-2 xl:order-1 h-full overflow-y-auto custom-scrollbar pr-2">
            {leftSidebar}
          </div>

          {/* Center Column: Hero & Orb */}
          <div className="flex-1 w-full max-w-[600px] flex flex-col items-center justify-start order-1 xl:order-2">
            {/* Hero Typography */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center mb-8 w-full"
            >
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4">
                Meet Aria
              </h1>
              <p className="text-base md:text-lg text-foreground/60 font-medium">
                An AI voice assistant that detects your accent, responds naturally, and adapts to how you speak.
              </p>
            </motion.div>

            {centerColumn}
          </div>

          {/* Right Sidebar: Dynamic Panel */}
          <div className="w-full xl:w-[480px] shrink-0 order-3 flex flex-col h-full">
            {rightPanel}
          </div>

        </div>
      </main>

      {historyDrawer}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
});
